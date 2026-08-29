import { diaEmFortaleza, instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarDataCurta } from "@/lib/utils/periodo";

/**
 * A parte de Cobranças que **não fala com o banco**: as quatro situações do
 * chip, seus rótulos e a regra de qual grupo cada cobrança ocupa.
 *
 * **Existe separado de `cobrancas.ts` por necessidade medida, não por
 * gosto** (item 6, Tarefa 2): a lista é Client Component e precisa dos
 * rótulos, do padrão e do tipo de grupo. Importar isso de `cobrancas.ts`
 * puxaria `@/lib/db` para o navegador — e o `import "server-only"` que
 * `db/index.ts` ganhou no item 5, Tarefa 6, reprova o `npm run build` na
 * hora, apontando a cadeia inteira. Foi exatamente o que aconteceu ao
 * escrever esta tarefa: a proteção funcionou, e a resposta certa é separar o
 * puro do que toca o banco, não afrouxar a proteção.
 */

export type SituacaoCobranca = "em_aberto" | "vencidas" | "boleto" | "recebidas";

export const SITUACOES: SituacaoCobranca[] = ["em_aberto", "vencidas", "boleto", "recebidas"];

/**
 * "Em aberto" é o que a tela mostra sem ninguém escolher nada — o padrão do
 * protótipo (`referencia/.../TelaCobrancas.dc.html`) e o único que faz
 * sentido: cobrança é o que ainda não entrou.
 */
export const SITUACAO_PADRAO: SituacaoCobranca = "em_aberto";

export const ROTULO_SITUACAO: Record<SituacaoCobranca, string> = {
  em_aberto: "Em aberto",
  vencidas: "Vencidas",
  boleto: "Boleto",
  recebidas: "Recebidas",
};

/**
 * A situação vem da URL (`?situacao=`), diferente de "Meus fretes", onde
 * situação é filtro no cliente sobre o que já veio. Dois motivos, e o
 * primeiro sozinho já bastaria:
 *
 * 1. **Ela muda o conjunto lido do banco**, não um recorte dele: "Recebidas"
 *    lê título `pago`, as outras três leem `aberto`. Filtrar no cliente
 *    exigiria carregar os dois conjuntos sempre — e, com teto de 50, alguém
 *    teria que escolher por qual dos dois o teto corta.
 * 2. **A dashboard (item 8) linka para cá já filtrada** — `docs/navegacao.md`:
 *    "Pastilha Vencido → Cobranças filtrado".
 *
 * Valor desconhecido cai no padrão, nunca em consulta sem filtro — mesmo
 * cuidado de `resolverPeriodoDaUrl` com janela inválida.
 */
export function resolverSituacaoDaUrl(valor: string | undefined): SituacaoCobranca {
  return SITUACOES.includes(valor as SituacaoCobranca)
    ? (valor as SituacaoCobranca)
    : SITUACAO_PADRAO;
}

export type GrupoDeCobranca = "vencidas" | "vence_hoje" | "a_vencer" | "recebidas";

/**
 * O grupo de uma cobrança na lista (`docs/especificacao.md` §4.5: Vencidas ·
 * Vence hoje · A vencer), mais o quarto grupo das recebidas — decisão do
 * fundador, 26/08/2026 (`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 2).
 *
 * Compara **dia com dia** (`"AAAA-MM-DD"` em Fortaleza), nunca instante com
 * instante: é o que faz "vence hoje" continuar sendo hoje até a meia-noite de
 * lá. Num servidor em UTC (a Vercel), às 21h de Fortaleza já é o dia
 * seguinte, e toda cobrança que vence hoje apareceria como vencida.
 *
 * **Título aberto sem vencimento cai em "A vencer"** — não venceu. Hoje esse
 * estado é inalcançável (`faturarServico` sempre grava vencimento;
 * `criarTituloJaRecebi` não grava, mas cria `pago`), e a regra existe para
 * que ele nunca suma da lista contando no número do topo: "A receber" soma
 * todo título aberto, com vencimento ou sem.
 */
export function grupoDaCobranca(
  cobranca: { status: string; vencimento: Date | null },
  hoje: string,
): GrupoDeCobranca {
  if (cobranca.status === "pago") return "recebidas";
  if (!cobranca.vencimento) return "a_vencer";
  const dia = diaEmFortaleza(cobranca.vencimento);
  if (dia < hoje) return "vencidas";
  if (dia === hoje) return "vence_hoje";
  return "a_vencer";
}

/** Exportada — `ultimoEnvioPorTitulo`/`textoCobradoHa`, abaixo, precisam da mesma conta em dias de Fortaleza. */
export function diferencaEmDias(de: string, ate: string): number {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.round(
    (instanteDoDiaEmFortaleza(ate).getTime() - instanteDoDiaEmFortaleza(de).getTime()) / umDia,
  );
}

/** O mínimo que `textoDoPrazo` precisa de uma cobrança — a marca da lista (`ListaCobrancas.tsx`) e o resumo do detalhe (`cobrancas/[id]/page.tsx`) montam isto de formas diferentes. */
export type CobrancaParaMarca = {
  grupo: GrupoDeCobranca;
  dia: string | null;
};

/**
 * O prazo, em palavras — "venceu há 6 dias", "vence hoje", "vence em 12 ago",
 * "recebido em 5 ago". Extraída de `ListaCobrancas.tsx` (item 6, Tarefa 4)
 * para o detalhe da cobrança reaproveitar a mesma frase, em vez de copiá-la
 * (`CLAUDE.md` §8, "componente existe uma vez" — aqui aplicado a uma função
 * pura, não a um componente, mesma razão: duas fontes do mesmo texto
 * divergem, e uma delas seria esquecida na próxima mudança).
 *
 * A conta é entre **dias de Fortaleza**, nunca entre instantes: é o que
 * mantém "vence hoje" sendo hoje até a meia-noite de lá, mesmo com o
 * servidor em UTC.
 */
export function textoDoPrazo(cobranca: CobrancaParaMarca, hoje: string): string {
  const { grupo, dia } = cobranca;
  if (grupo === "recebidas") return dia ? `recebido em ${formatarDataCurta(dia)}` : "recebido";
  if (!dia) return "sem vencimento";
  if (grupo === "vence_hoje") return "vence hoje";
  if (grupo === "vencidas") {
    const dias = diferencaEmDias(dia, hoje);
    return dias === 1 ? "venceu ontem" : `venceu há ${dias} dias`;
  }
  const dias = diferencaEmDias(hoje, dia);
  return dias === 1 ? "vence amanhã" : `vence em ${formatarDataCurta(dia)}`;
}

/**
 * Cor do prazo — `docs/estilo.md`: `#B3401A` ("Vencido"), `#8A6206` ("A
 * faturar / vence hoje"), `--color-acao` para o que já entrou. A vencer fica
 * na tinta de apoio: é o estado normal, não um alerta.
 */
export const CLASSE_DO_PRAZO: Record<GrupoDeCobranca, string> = {
  vencidas: "text-vencido",
  vence_hoje: "text-a-faturar",
  a_vencer: "text-tinta-apoio",
  recebidas: "text-acao",
};

/**
 * "Cobrado há 2 dias por Monalisa" (§4.5) — a marca que acompanha a pílula
 * "Cobrar no WhatsApp" quando já existe um envio confirmado
 * (`UltimoEnvio`, `src/lib/servicos/titulos.ts`). Mesma conta em dias de
 * Fortaleza de `textoDoPrazo`, nunca diferença de instante: o envio
 * confirmado às 23h de Fortaleza de ontem não pode virar "cobrado há 0
 * dias" só porque o servidor, em UTC, já está no dia seguinte.
 */
export function textoCobradoHa(envio: { em: Date; usuarioNome: string }, hoje: string): string {
  const dia = diaEmFortaleza(envio.em);
  const dias = diferencaEmDias(dia, hoje);
  const relativo = dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
  return `cobrado ${relativo} por ${envio.usuarioNome}`;
}

/**
 * Uma linha da lista de Cobranças. Definido aqui, não em `ListaCobrancas.tsx`
 * — `agruparPorRelatorio` (abaixo) precisa do tipo, e mora neste módulo pelo
 * mesmo motivo do resto dele: puro, sem `@/lib/db`, importável tanto pelo
 * Client Component quanto por `cobrancas.ts`/`page.tsx` sem puxar `server-only`
 * para o navegador.
 */
export type CobrancaParaLista = {
  id: string;
  clienteId: string;
  cliente: string;
  /** Rota e dia do frete — `null` quando o frete não tem origem/destino, ou quando a linha é um grupo (`agrupado` presente). */
  referencia: string | null;
  /**
   * Em aberto, o que **falta entrar** (valor menos o já recebido); em
   * Recebidas, o que **entrou**. Numa linha agrupada, a soma dos N títulos.
   */
  valorCentavos: number;
  grupo: GrupoDeCobranca;
  /** Dia (`"AAAA-MM-DD"` em Fortaleza) do vencimento, ou do recebimento nas pagas — igual em todos os títulos de um mesmo relatório (`gerarRelatorio` grava um vencimento só para o lote). */
  dia: string | null;
  boleto: boolean;
  /** `true` se ao menos um título do grupo já recebeu parte (item 6, Tarefa 3). */
  parcial: boolean;
  clienteTelefone: string | null;
  /** `formatarRota` puro, sem o dia — `null` numa linha agrupada (não faz sentido para vários fretes; a mensagem usa `agrupado.periodo` no lugar). */
  rota: string | null;
  vencimentoFormatado: string | null;
  /** "cobrado há 2 dias por Monalisa" — `null` quando ninguém cobrou ainda. */
  marcaCobrado: string | null;
  /**
   * O instante bruto por trás de `marcaCobrado` — só existe para
   * `agruparPorRelatorio` achar o envio mais recente do grupo (`.some()`
   * não serve aqui, precisa do MAIOR, não de "existe algum"). A UI nunca lê
   * este campo direto, só `marcaCobrado` já formatado.
   */
  marcaCobradoEm: Date | null;
  /** `TituloReceber.relatorio_id` — usado só por `agruparPorRelatorio` para achar quem tem 2+ títulos em comum; a UI depois de agrupado lê `agrupado.relatorioId`, nunca este campo. */
  relatorioId: string | null;
  /**
   * Presente só quando 2+ títulos do mesmo relatório viraram uma linha só
   * (`docs/especificacao.md` §4.5, item 7, decisão do fundador 29/08/2026).
   * Sem "Marcar recebido" na linha agrupada — registrar contra "o" título de
   * um grupo receberia uma fração em silêncio; para receber, a linha expande
   * (`itens`) e cada título aparece com o próprio deslizar, que já funciona.
   * "Cobrar no WhatsApp" continua na linha agrupada, e registra em todos os
   * `tituloIds` no mesmo instante (`registrarCobrancaEnviadaEmGrupo`,
   * `src/lib/servicos/titulos.ts`) — nunca um só, que deixaria o grupo com
   * marca inconsistente entre os títulos.
   */
  agrupado?: {
    relatorioId: string;
    tituloIds: string[];
    /** "agosto" ou "20/08 a 10/09" (`formatarPeriodoDeCobranca`) — para `{periodo}` na mensagem de cobrança. */
    periodo: string;
    fretes: number;
    /** As linhas individuais, cada uma uma `CobrancaParaLista` normal (`agrupado` ausente) — reveladas ao expandir. */
    itens: CobrancaParaLista[];
  };
};

/**
 * Junta em uma linha só os títulos que compartilham `relatorioId`
 * (`docs/especificacao.md` §4.5: "uma cobrança gerada por relatório é uma
 * linha só, não uma por frete") — registrado em `docs/planos/
 * item-7-relatorio.md`. Preserva a posição do PRIMEIRO membro do grupo na
 * lista original (já ordenada por vencimento/criado_em em `cobrancas.ts`) —
 * nunca reordena, só substitui os N títulos pela linha combinada no lugar
 * onde o primeiro deles apareceria.
 *
 * Um relatório de um frete só não agrupa — fica como título normal, mesma
 * regra de `montarMensagemCobranca` ("Passando pra lembrar do frete
 * {rota}." nunca vira plural com um item).
 */
export function agruparPorRelatorio(
  cobrancas: CobrancaParaLista[],
  periodoPorRelatorio: Map<string, string>,
): CobrancaParaLista[] {
  const porRelatorio = new Map<string, CobrancaParaLista[]>();
  for (const c of cobrancas) {
    if (!c.relatorioId) continue;
    const lista = porRelatorio.get(c.relatorioId);
    if (lista) lista.push(c);
    else porRelatorio.set(c.relatorioId, [c]);
  }

  const jaEmitido = new Set<string>();
  const resultado: CobrancaParaLista[] = [];

  for (const c of cobrancas) {
    if (!c.relatorioId) {
      resultado.push(c);
      continue;
    }
    if (jaEmitido.has(c.relatorioId)) continue;
    jaEmitido.add(c.relatorioId);

    const itens = porRelatorio.get(c.relatorioId)!;
    if (itens.length === 1) {
      resultado.push(itens[0]);
      continue;
    }

    const relatorioId = c.relatorioId;
    const valorTotal = itens.reduce((soma, i) => soma + i.valorCentavos, 0);
    const algumParcial = itens.some((i) => i.parcial);
    // O envio mais recente do grupo, não o do primeiro item — achado do
    // segundo `/revisar`: `...itens[0]` sozinho herdaria a marca de um
    // membro escolhido por acaso, o mesmo defeito que `CLAUDE.md` §2 já
    // nomeia para regra que fala de uma coleção inteira.
    const maisRecente = itens.reduce((melhor, i) =>
      (i.marcaCobradoEm?.getTime() ?? -Infinity) > (melhor.marcaCobradoEm?.getTime() ?? -Infinity)
        ? i
        : melhor,
    );

    resultado.push({
      ...itens[0],
      referencia: `${itens.length} fretes`,
      rota: null,
      valorCentavos: valorTotal,
      parcial: algumParcial,
      marcaCobrado: maisRecente.marcaCobrado,
      marcaCobradoEm: maisRecente.marcaCobradoEm,
      agrupado: {
        relatorioId,
        tituloIds: itens.map((i) => i.id),
        periodo: periodoPorRelatorio.get(relatorioId) ?? "",
        fretes: itens.length,
        itens: itens.map((i) => ({ ...i, relatorioId: null })),
      },
    });
  }

  return resultado;
}
