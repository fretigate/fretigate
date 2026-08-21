import { deslocarDias, deslocarMes, diaEmFortaleza, instanteDoDiaEmFortaleza } from "./data-fortaleza";
import type { Periodo } from "@/lib/servicos/servicos";

/**
 * Resolve o chip de Período da lista "Meus fretes"
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 2) para um
 * `Periodo` (instantes já resolvidos) — nunca um `Date` local, mesma regra
 * de `src/lib/utils/data-fortaleza.ts`. Decisão do fundador, 21/08/2026:
 * janelas prontas (Este mês, Mês passado, Todos os fretes) mais
 * "Personalizado" abrindo um intervalo de datas.
 *
 * `janela` é o valor de `?periodo=` na URL — decisão do plano (Tarefa 2):
 * "o filtro de Período precisa funcionar por parâmetro de URL", porque o
 * item 8 (dashboard) vai linkar direto para uma janela específica.
 */
export type JanelaDePeriodo = "mes-atual" | "mes-passado" | "todos" | "personalizado";

/**
 * `de`/`ate` chegam da URL, texto arbitrário — mesma validação de formato já
 * usada antes de `instanteDoDiaEmFortaleza` em `fretes/acoes.ts`
 * (`CLAUDE.md` §4, "toda entrada validada no servidor, com schema"). Achado
 * do segundo `/revisar`: sem isso, `?periodo=personalizado&de=x&ate=y`
 * produzia `Invalid Date` nos dois lados de um `Periodo` **não-nulo** — e
 * `resolverLimiteDaLista` lê "não-nulo" como "tira o teto", reabrindo por
 * outra porta o mesmo risco de consulta sem limite que este arquivo já
 * fechou para janela desconhecida.
 */
const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;

function finalDoDia(diaSeguinte: string): Date {
  // Instante exclusivo do dia seguinte, menos 1ms — cobre 23:59:59.999 do
  // dia anterior sem precisar de outro cálculo de fuso.
  return new Date(instanteDoDiaEmFortaleza(diaSeguinte).getTime() - 1);
}

function periodoDoMes(primeiroDiaDoMes: string): Periodo {
  return {
    inicio: instanteDoDiaEmFortaleza(primeiroDiaDoMes),
    fim: finalDoDia(deslocarMes(primeiroDiaDoMes, 1)),
  };
}

/**
 * `null` = sem filtro de data — ainda sujeito ao teto de 50 do padrão,
 * aplicado por quem chama (`resolverLimiteDaLista`, abaixo), nunca aqui.
 */
export function resolverPeriodoDaUrl(
  janela: string | undefined,
  de: string | undefined,
  ate: string | undefined,
): Periodo | null {
  const hoje = diaEmFortaleza(new Date());
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;

  switch (janela) {
    case "mes-atual":
      return periodoDoMes(primeiroDiaDoMesAtual);
    case "mes-passado":
      return periodoDoMes(deslocarMes(primeiroDiaDoMesAtual, -1));
    case "personalizado":
      if (de && ate && REGEX_DIA.test(de) && REGEX_DIA.test(ate)) {
        return { inicio: instanteDoDiaEmFortaleza(de), fim: finalDoDia(deslocarDias(ate, 1)) };
      }
      return null;
    case "todos":
    default:
      return null;
  }
}

/**
 * 50 mais recentes é só o padrão (nenhuma janela escolhida ainda) — qualquer
 * escolha explícita, incluindo "Todos os fretes", tira o teto: quem pediu
 * uma janela quer o que está nela, não uma amostra dela.
 *
 * Recebe o `Periodo` já resolvido (`resolverPeriodoDaUrl`), não a string
 * bruta — achado do `/revisar` (Tarefa 2, 21/08/2026): decidir pela string
 * sozinha deixava um `?periodo=` desconhecido (ou um "personalizado" sem
 * `de`/`ate` válidos) cair em "sem filtro de data" nos dois lados, mas com
 * lógicas que discordavam entre si — `resolverPeriodoDaUrl` tratava como
 * "sem filtro" (`null`), enquanto esta função tirava o teto por qualquer
 * `janela` truthy, o que juntos liam a tabela inteira sem filtro nenhum. Um
 * endereço editado à mão vira carga sem limite — não é vazamento entre
 * empresas (o filtro de `empresa_id` continua), mas é o mesmo formato de
 * risco de qualquer parâmetro de URL que vira consulta direta, e vai
 * aparecer de novo nos próximos itens que expuserem filtro por URL.
 */
export function resolverLimiteDaLista(
  janela: string | undefined,
  periodoResolvido: Periodo | null,
): number | undefined {
  if (janela === "todos") return undefined;
  return periodoResolvido ? undefined : 50;
}

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatarDataCurta(dia: string): string {
  const [, mes, diaDoMes] = dia.split("-").map(Number);
  return `${diaDoMes} ${MESES_ABREV[mes - 1]}`;
}

/** O texto do chip de Período quando uma janela está ativa — `null` = chip neutro ("Período"). */
export function rotuloDoPeriodo(
  janela: string | undefined,
  de: string | undefined,
  ate: string | undefined,
): string | null {
  switch (janela) {
    case "mes-atual":
      return "Este mês";
    case "mes-passado":
      return "Mês passado";
    case "todos":
      return "Todos os fretes";
    case "personalizado":
      return de && ate && REGEX_DIA.test(de) && REGEX_DIA.test(ate)
        ? `${formatarDataCurta(de)} – ${formatarDataCurta(ate)}`
        : null;
    default:
      return null;
  }
}
