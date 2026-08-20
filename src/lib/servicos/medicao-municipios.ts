import { db } from "@/lib/db";
import { resolverMunicipio } from "@/lib/servicos/municipios";

/**
 * A medição dos 10% (`docs/especificacao.md` §9, item 3): quantos textos de
 * origem/destino não resolveram para um município real, separado por motivo.
 *
 * Passa por `db(empresaId)` como qualquer leitura de `Servico` — é dado de
 * cliente, e a regra do isolamento entre empresas (`CLAUDE.md` §3) não abre
 * exceção para ferramenta de medição. `resolverMunicipio` já é a porta única
 * por onde texto vira município; esta função só soma o resultado dela, nunca
 * reimplementa a busca.
 */

/** Abaixo disso, um texto não resolvido vira porcentagem alta sem significar
 * nada (`docs/especificacao.md` §9). É contagem de CAMPOS com texto, não de
 * fretes — ver o comentário de `medirResolucaoDeMunicipios` abaixo. */
const PISO_DE_TEXTOS = 20;

export type TextoFalho = { texto: string; ocorrencias: number };

export type ResultadoMedicao =
  | { situacao: "amostra_insuficiente"; totalElegivel: number; piso: number }
  | {
      situacao: "medido";
      totalElegivel: number;
      totalFalho: number;
      percentual: number;
      ambiguos: TextoFalho[];
      naoEncontrados: TextoFalho[];
    };

/** Maior contagem primeiro — quem lê o relatório corrige o texto mais comum
 * antes do raro. */
function ordenarPorFrequencia(contagem: Map<string, number>): TextoFalho[] {
  return [...contagem.entries()]
    .map(([texto, ocorrencias]) => ({ texto, ocorrencias }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

/**
 * **O elegível é o campo, não o frete — decisão do fundador, 14/08/2026,**
 * depois de o `/revisar` apontar que `docs/especificacao.md` ainda dizia
 * "frete" enquanto este código sempre contou por campo. Origem vem
 * pré-preenchida com a do último frete lançado (§4.1); destino é digitado —
 * são problemas diferentes. Um `Servico` com origem resolvida e destino
 * ambíguo conta um acerto e uma falha, não "o frete tem problema": contar
 * por frete esconderia qual dos dois campos precisa de conserto.
 *
 * Campo vazio nunca entra na conta: ausência de texto é ausência de
 * tentativa, não falha (`docs/especificacao.md` §9).
 *
 * **Reclassifica agora, não lê o que foi gravado na criação.** Um texto que
 * não resolveu quando o frete foi lançado pode resolver hoje, se a base do
 * IBGE mudou desde então — por isso quem decide ambíguo/não encontrado é uma
 * nova chamada a `resolverMunicipio`, não o `municipio_id` nulo já salvo.
 */
export async function medirResolucaoDeMunicipios(
  empresaId: string,
): Promise<ResultadoMedicao> {
  const servicos = await db(empresaId).servico.findMany({
    where: { arquivado_em: null },
    select: {
      origem_texto: true,
      origem_municipio_id: true,
      destino_texto: true,
      destino_municipio_id: true,
    },
  });

  const naoResolvidos: string[] = [];
  let totalElegivel = 0;

  for (const s of servicos) {
    if (s.origem_texto) {
      totalElegivel++;
      if (s.origem_municipio_id === null) naoResolvidos.push(s.origem_texto);
    }
    if (s.destino_texto) {
      totalElegivel++;
      if (s.destino_municipio_id === null) naoResolvidos.push(s.destino_texto);
    }
  }

  if (totalElegivel < PISO_DE_TEXTOS) {
    return { situacao: "amostra_insuficiente", totalElegivel, piso: PISO_DE_TEXTOS };
  }

  // Dedup antes de chamar `resolverMunicipio` — o mesmo texto ("São Paulo")
  // costuma se repetir em dezenas de fretes, e cada chamada é uma ida ao
  // banco.
  const contagemPorTexto = new Map<string, number>();
  for (const texto of naoResolvidos) {
    contagemPorTexto.set(texto, (contagemPorTexto.get(texto) ?? 0) + 1);
  }

  const textosUnicos = [...contagemPorTexto.keys()];

  // BLOCOS DE DEZ — o pool do driver (`pg-pool`, padrão) tem dez conexões;
  // `resolverMunicipio` sozinho faz UMA consulta (`db().municipio.
  // findMany`, `src/lib/servicos/municipios.ts:164` — não passa por
  // `normalizarEntrada`, então não tem o fator de duas conexões que
  // `criarServico` tem). Mesmo fator do precedente original
  // (`tests/isolamento/vazamento.test.ts`, dez chamadas de uma conexão
  // cada) — o teto seguro aqui é dez, não cinco. Sem isso, uma empresa real
  // com muitos textos únicos não resolvidos estouraria o pool do banco que
  // esta função apontar, o mesmo defeito que derrubou a esteira em
  // `tests/regressao-resolucao-municipios.test.ts`
  // (`docs/planos/correcao-pool-esteira-vermelha.md`), só que em código de
  // produto, não teste.
  //
  // O TETO DE DEZ PRESSUPÕE QUE ESTA FUNÇÃO RODA SOZINHA NO PROCESSO — hoje
  // só `scripts/medir-municipios.mts` chama, uma ferramenta de operação
  // (`CLAUDE.md` §6), sem outro pedido concorrente no mesmo processo. Se um
  // dia esta medição for exposta numa tela do produto (chamada de dentro de
  // um pedido do app), um bloco de dez tomaria o pool inteiro do processo
  // — o mesmo pool que atende TODOS os outros pedidos simultâneos, não só
  // este. Quem construir esse caminho reexamina este teto antes de
  // reaproveitar — não herda o número de dez por já estar aprovado aqui.
  const TAMANHO_DO_BLOCO = 10;
  const resolucoes: Awaited<ReturnType<typeof resolverMunicipio>>[] = [];
  for (let inicio = 0; inicio < textosUnicos.length; inicio += TAMANHO_DO_BLOCO) {
    const bloco = textosUnicos.slice(inicio, inicio + TAMANHO_DO_BLOCO);
    const lote = await Promise.all(bloco.map((texto) => resolverMunicipio(empresaId, texto)));
    resolucoes.push(...lote);
  }

  const ambiguos = new Map<string, number>();
  const naoEncontrados = new Map<string, number>();
  let totalFalho = 0;

  textosUnicos.forEach((texto, i) => {
    const resolucao = resolucoes[i];
    // Resolveu agora: a base mudou desde a criação do frete. Não é falha —
    // é o texto salvo ficando desatualizado, problema diferente do que esta
    // medição cobre.
    if (resolucao.situacao === "resolvido") return;

    const ocorrencias = contagemPorTexto.get(texto)!;
    totalFalho += ocorrencias;
    (resolucao.situacao === "ambiguo" ? ambiguos : naoEncontrados).set(texto, ocorrencias);
  });

  return {
    situacao: "medido",
    totalElegivel,
    totalFalho,
    percentual: (totalFalho / totalElegivel) * 100,
    ambiguos: ordenarPorFrequencia(ambiguos),
    naoEncontrados: ordenarPorFrequencia(naoEncontrados),
  };
}
