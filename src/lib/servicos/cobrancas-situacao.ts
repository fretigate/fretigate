import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";

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
