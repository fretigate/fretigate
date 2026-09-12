import { db } from "@/lib/db";
import { normalizarParaBusca } from "@/lib/utils/texto";
import { medir } from "@/lib/utils/medir-tempo";

/**
 * Município: busca enquanto se digita, e a porta única por onde texto vira
 * município.
 *
 * POR QUE AS DUAS FUNÇÕES MORAM AQUI, E SÓ AQUI
 * `resolverMunicipio` é **a única porta** por onde um texto livre (origem e
 * destino de um frete, endereço de um cliente) vira uma referência de município
 * de verdade. Ter um lugar só não é organização: é o que torna possível
 * **medir** quantos campos de origem/destino ficam sem município resolvido —
 * o limite de 10% que a especificação §9 cobra no item 3. Espalhada por três
 * telas, essa medição não existiria, e a decisão de trocar a estimativa
 * geodésica por uma API de rotas (`CLAUDE.md` §14) ficaria sem número para se
 * apoiar.
 *
 * A tabela é global: não tem `empresa_id`, e a política de RLS é
 * `USING (true) WITH CHECK (false)` — todo mundo lê, ninguém grava. Mesmo assim
 * as consultas passam por `db(empresaId)`, como todas as outras: a camada de
 * acesso a dados é uma só (`CLAUDE.md` §3), e abrir um caminho paralelo "porque
 * esta tabela é global" é o precedente que a próxima tabela copia.
 */

/** O que as telas precisam de um município. Nunca a linha inteira. */
const CAMPOS = {
  codigo_ibge: true,
  nome: true,
  uf: true,
} as const;

export type Municipio = {
  codigo_ibge: number;
  nome: string;
  uf: string;
};

/**
 * Quantas letras antes de consultar. Decisão do fundador, 09/08/2026.
 *
 * Com uma letra só, "a" traz centenas de municípios e nenhum é o que a pessoa
 * quer — é ida ao banco a cada tecla, dentro dos 30 segundos do §1, para
 * devolver ruído.
 *
 * E não são três, que seria o reflexo: **na maioria das vezes ninguém digita
 * aqui**, porque os destinos já usados com aquele cliente aparecem como chips.
 * Quem chega a digitar é o caso do destino novo — e com três letras existe um
 * instante de "não aparece nada" que confunde justamente quem já está fora do
 * caminho rápido.
 */
const MINIMO_DE_LETRAS = 2;

/**
 * Quantas sugestões aparecem. Decisão do fundador, 09/08/2026.
 *
 * Cinco, e o número vem do teclado aberto: acima dele cabem umas cinco linhas.
 * Oito rolaria ou empurraria conteúdo, e **lista que precisa rolar enquanto a
 * pessoa digita é pior que digitar mais uma letra**.
 *
 * Pendente de formalização no `docs/componentes.md` — é valor de tela, e o
 * dono desse documento é o Design (`CLAUDE.md` §13). Construído com cinco por
 * decisão explícita, não por escolha de quem escreve o código.
 */
const SUGESTOES = 5;

/**
 * Sugestões enquanto a pessoa digita.
 *
 * Casa por **começo do nome**, que é como se procura cidade: quem quer
 * Fortaleza digita "for", não "aleza". É também a única forma que usa o índice
 * — `%termo%` varreria as 5.570 linhas a cada tecla.
 */
export async function buscarMunicipios(
  empresaId: string,
  termo: string,
): Promise<Municipio[]> {
  const inicio = normalizarParaBusca(termo);
  if (inicio.length < MINIMO_DE_LETRAS) return [];

  return db(empresaId).municipio.findMany({
    where: {
      nome_normalizado: { startsWith: inicio },
      arquivado_em: null,
    },
    select: CAMPOS,
    // Nome, e não código: a ordem do IBGE é geográfica, e a lista sairia
    // embaralhada aos olhos de quem lê.
    orderBy: [{ nome: "asc" }, { uf: "asc" }],
    take: SUGESTOES,
  });
}

/** As 27 siglas, para separar "Fortaleza CE" de um município chamado "Ce". */
const UFS = new Set([
  "ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms",
  "mt", "pa", "pb", "pe", "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc",
  "se", "sp", "to",
]);

/**
 * Separa a UF colada no fim do texto, quando ela está lá.
 *
 * O texto real de uma ordem de frete vem assim — "Fortaleza/CE", "Sobral - CE",
 * "Juazeiro do Norte (CE)" —, e a pontuação já virou espaço na normalização.
 * Sem isto, "Bom Jesus PI" não resolveria nunca: procuraria um município
 * chamado "bom jesus pi".
 */
function separarUf(normalizado: string): { nome: string; uf: string | null } {
  const partes = normalizado.split(" ");
  const ultima = partes.at(-1);

  // `partes.length > 1` importa: "sp" sozinho é alguém digitando a sigla, não
  // um município sem nome.
  if (partes.length > 1 && ultima && UFS.has(ultima)) {
    return { nome: partes.slice(0, -1).join(" "), uf: ultima.toUpperCase() };
  }
  return { nome: normalizado, uf: null };
}

/**
 * O resultado da resolução, com o **motivo** quando não resolve.
 *
 * NÃO É `Municipio | null`, e a diferença é a medição do item 3. "12% dos
 * campos sem município resolvido" não diz o que consertar; os dois motivos
 * pedem correções diferentes e opostas:
 *
 *   - **`ambiguo`** — o texto casa com vários municípios. A lista de sugestões
 *     mostra a UF ("Bom Jesus/GO", "Bom Jesus/PI"), então no fluxo normal a
 *     pessoa escolhe e a ambiguidade se resolve sozinha. Sobrar `ambiguo` em
 *     quantidade quer dizer que **a sugestão não chamou atenção** — conserto
 *     de tela.
 *   - **`nao_encontrado`** — o texto não casa com nada: erro de digitação,
 *     apelido local ("Juá"), ou falha da normalização. Conserto de dado ou da
 *     função de busca.
 *
 * Decidido pelo fundador em 09/08/2026, junto da regra de nunca chutar.
 */
export type ResolucaoDeMunicipio =
  | { situacao: "resolvido"; municipio: Municipio }
  | { situacao: "ambiguo" }
  | { situacao: "nao_encontrado" };

/**
 * A porta única: texto livre vira município, ou diz por que não virou.
 *
 * **Nunca chuta.** "Bom Jesus" existe em PI, RN, PB, SC e RS — escolher um
 * gravaria origem errada num frete, e frete com origem errada é pior que frete
 * sem origem resolvida: o primeiro mente, o segundo avisa.
 *
 * **Não resolver NUNCA bloqueia o salvar** (`docs/especificacao.md` §6): o
 * texto que a pessoa digitou é guardado do lado, e é dele que a medição dos 10%
 * se alimenta.
 */
export async function resolverMunicipio(
  empresaId: string,
  texto: string,
  /** Rótulo só para o diagnóstico temporário de medição (`medir-tempo.ts`) — distingue origem de destino no log. */
  rotulo = "resolverMunicipio",
): Promise<ResolucaoDeMunicipio> {
  const normalizado = normalizarParaBusca(texto);
  if (normalizado.length < MINIMO_DE_LETRAS) return { situacao: "nao_encontrado" };

  const { nome, uf } = separarUf(normalizado);
  if (nome.length < MINIMO_DE_LETRAS) return { situacao: "nao_encontrado" };

  const encontrados = await medir(`servico.${rotulo}`, () =>
    db(empresaId).municipio.findMany({
      where: {
        nome_normalizado: nome,
        ...(uf ? { uf } : {}),
        arquivado_em: null,
      },
      select: CAMPOS,
      // Dois bastam para saber que é ambíguo. Pedir todos seria trazer cinco
      // linhas para descartar quatro.
      take: 2,
    }),
  );

  if (encontrados.length === 1) {
    return { situacao: "resolvido", municipio: encontrados[0] };
  }
  return { situacao: encontrados.length === 0 ? "nao_encontrado" : "ambiguo" };
}
