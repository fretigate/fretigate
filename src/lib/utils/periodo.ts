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

/**
 * Resolve o período de um resumo de perfil (Tarefa 6) — sempre devolve um
 * `Periodo` completo, nunca `null`: `resumoFinanceiroDoCliente`,
 * `resumoDoCaminhao` e `resumoDoMotorista` exigem `Periodo`, diferente de
 * "Meus fretes" (Tarefa 2), onde ausência de filtro é "sem filtro de data"
 * (`null`).
 *
 * Ausência de `janela` na URL vira `"mes-atual"` — decisão do fundador,
 * planejamento da Tarefa 6: o período padrão dos três resumos é o mês
 * corrente, não "todos". `"todos"` continua uma opção da mesma
 * `FolhaDePeriodo` (Tarefa 2), mas aqui vira um intervalo largo — os
 * resumos não têm modo "sem filtro". Uma janela inválida (ex.:
 * "personalizado" sem `de`/`ate` válidos) cai de volta no mês corrente, pelo
 * mesmo motivo: o resumo do perfil nunca fica sem período nenhum.
 *
 * `janelaEfetiva` no retorno é a janela que **realmente** gerou o `Periodo`
 * — nunca a pedida na URL quando essa falhou. Sem isso, uma "personalizado"
 * com `de`/`ate` inválidos cairia no mês corrente para o número, mas o chip
 * (que usa `janelaEfetiva` para o rótulo) continuaria lendo "personalizado"
 * sem `de`/`ate` válidos — `rotuloDoPeriodo` devolveria `null` para um
 * período que, na verdade, é o mês corrente: o chip e o número
 * discordariam entre si.
 *
 * **`"todos"` não pode usar `new Date()` como `fim`.** Achado do `/revisar`
 * (planejamento da Tarefa 6, 22/08/2026): um frete nasce no momento da
 * ordem (`CLAUDE.md` §1), inclusive para uma data futura — `data_servico`
 * no futuro é o caso normal, não a exceção. `fim: new Date()` cortaria
 * esse frete fora de "Todos os fretes" enquanto "Este mês" (`fim` = fim do
 * mês corrente) o contaria, e o número tocável leva a `/fretes?
 * periodo=todos`, que não filtra data nenhuma — o número somaria menos do
 * que a lista que ele mesmo abre mostra. `PERIODO_SEM_FIM` usa 31/12/9999
 * — sem filtro de verdade, não "até agora".
 *
 * **Não é a data máxima do `Date` do JavaScript.** Primeira tentativa
 * (`new Date(8640000000000000)`, ano 275760) quebrava a consulta em
 * produção: `PrismaClientUnknownRequestError`, "Could not convert argument
 * value... to ArgumentValue" — o driver não aceita o ano de 6 dígitos que
 * essa data produz (`+275760-...`). Achado rodando no navegador, não só
 * lendo o código — o `npm test` local não pega isso, porque nenhum teste
 * de `periodo.ts` chama o banco. `9999-12-31` é bem além de qualquer frete
 * real e permanece um ano de 4 dígitos, que o driver aceita.
 */
const PERIODO_SEM_FIM: Periodo = {
  inicio: new Date(0),
  fim: new Date("9999-12-31T23:59:59.999Z"),
};

export function resolverPeriodoDoPerfil(
  janela: string | undefined,
  de: string | undefined,
  ate: string | undefined,
): { periodo: Periodo; janelaEfetiva: string } {
  const janelaPedida = janela ?? "mes-atual";
  if (janelaPedida === "todos") {
    return { periodo: PERIODO_SEM_FIM, janelaEfetiva: "todos" };
  }
  const periodo = resolverPeriodoDaUrl(janelaPedida, de, ate);
  if (periodo) return { periodo, janelaEfetiva: janelaPedida };
  return {
    periodo: resolverPeriodoDaUrl("mes-atual", undefined, undefined)!,
    janelaEfetiva: "mes-atual",
  };
}

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function formatarDataCurta(dia: string): string {
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
