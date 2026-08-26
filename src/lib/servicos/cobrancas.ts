import { db } from "@/lib/db";
import type { Periodo } from "@/lib/servicos/servicos";
import { deslocarMes, instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import type { SituacaoCobranca } from "@/lib/servicos/cobrancas-situacao";

/**
 * Cobranças (item 6, Tarefa 2) — a leitura da tela que substitui a
 * provisória de `/cobrancas`. Só leitura: quem cria título é `titulos.ts`
 * (`faturarServico`, `criarTituloJaRecebi`), e quem registra recebimento é a
 * Tarefa 3.
 *
 * Tudo por `db(empresaId)`, a única porta de acesso a dados (`CLAUDE.md`
 * §3), e **em lote** — nenhuma consulta por linha, mesma regra que
 * `comSituacaoEmLote` já segue pelo motivo medido em 18-20/08/2026
 * (`docs/diario.md`: pressão de conexão no pool do projeto de teste).
 *
 * **O dia de hoje chega de fora, sempre como `"AAAA-MM-DD"` de Fortaleza**,
 * nunca `new Date()` aqui dentro. É o mesmo cuidado de `vencimentoPadrao`
 * (`titulos.ts`) e o motivo de `src/lib/utils/data-fortaleza.ts` existir: num
 * servidor em UTC (a Vercel), às 21h de Fortaleza já é o dia seguinte — e
 * "Vence hoje" viraria "venceu ontem" para toda cobrança que vence hoje.
 */

/**
 * Os três números do topo (`docs/especificacao.md` §4.5) — **não respondem
 * aos filtros**: situação atual e mês corrente, sempre. Por isso são
 * agregações próprias, e não uma soma sobre a lista já carregada, que o teto
 * de 50 cortaria.
 *
 * **Somam o SALDO, não o valor cheio** — decisão do fundador, 26/08/2026
 * (plano do item 6, Tarefa 2): "A receber" e "Vencido" contam o que **falta
 * entrar** (valor menos o já recebido), e o pedaço já recebido de um título
 * parcial entra em "Recebido no mês". Nada é contado duas vezes, nada some.
 * Hoje o resultado é idêntico ao de somar o valor cheio (todo título aberto
 * tem `valor_recebido` nulo, porque recebimento parcial só nasce na Tarefa
 * 3) — a regra está escrita agora porque este é o código que soma, e ele
 * ficaria errado no dia da Tarefa 3 **sem nada avisar**.
 *
 * **"Vencido é um recorte de A receber"** (§4.5) é o que estas duas somas
 * fazem ao pé da letra: o mesmo conjunto, uma delas com o corte de
 * vencimento. Quem diz isso em palavras é a tela.
 *
 * **De onde "Recebido no mês" sai hoje, e de onde vai sair depois:** hoje é
 * `valor_recebido` dos títulos com `data_pagamento` no mês corrente — o único
 * registro de recebimento que existe. A partir da Tarefa 3, cada recebimento
 * vira linha própria na tabela `recebimento` (decisão 6 do plano), e é de lá
 * que esta soma passa a vir: com dois recebimentos parciais em meses
 * diferentes, um `valor_recebido` acumulado com uma só `data_pagamento`
 * colocaria os dois no mesmo mês.
 *
 * Três agregações, nunca uma consulta por título.
 */
export async function resumoDeCobrancas(empresaId: string, hoje: string) {
  const inicioDeHoje = instanteDoDiaEmFortaleza(hoje);
  const primeiroDiaDoMes = `${hoje.slice(0, 7)}-01`;
  const inicioDoMes = instanteDoDiaEmFortaleza(primeiroDiaDoMes);
  const inicioDoMesSeguinte = instanteDoDiaEmFortaleza(deslocarMes(primeiroDiaDoMes, 1));

  const [abertas, vencidas, recebido] = await Promise.all([
    db(empresaId).tituloReceber.aggregate({
      where: { arquivado_em: null, status: "aberto" },
      _sum: { valor: true, valor_recebido: true },
    }),
    db(empresaId).tituloReceber.aggregate({
      where: { arquivado_em: null, status: "aberto", vencimento: { lt: inicioDeHoje } },
      _sum: { valor: true, valor_recebido: true },
    }),
    db(empresaId).tituloReceber.aggregate({
      where: {
        arquivado_em: null,
        status: { not: "cancelado" },
        data_pagamento: { gte: inicioDoMes, lt: inicioDoMesSeguinte },
      },
      _sum: { valor_recebido: true },
    }),
  ]);

  const saldo = (soma: { valor: number | null; valor_recebido: number | null }) =>
    (soma.valor ?? 0) - (soma.valor_recebido ?? 0);

  return {
    aReceber: saldo(abertas._sum),
    vencido: saldo(vencidas._sum),
    recebidoNoMes: recebido._sum.valor_recebido ?? 0,
  };
}

const CAMPOS_DA_LISTA = {
  id: true,
  servico_id: true,
  cliente_id: true,
  valor: true,
  valor_recebido: true,
  vencimento: true,
  data_pagamento: true,
  forma_pagamento_prevista: true,
  status: true,
} as const;

/**
 * A lista, já filtrada pela situação e pelo período.
 *
 * **O período conta pelo vencimento — menos em "Recebidas", que conta pela
 * data do recebimento** (decisão do fundador, 26/08/2026, plano do item 6,
 * Tarefa 2). O motivo da exceção, para não parecer inconsistência: título
 * criado por "Já recebi" (`criarTituloJaRecebi`) nasce `pago` **sem
 * vencimento nenhum**. Contar por vencimento dentro de "Recebidas" faria
 * esses títulos sumirem dos dois lados — não caem em nenhum dos três grupos
 * de vencimento e também não passariam pelo filtro de período.
 *
 * **Ordem:** as três situações em aberto sobem por vencimento (a mais
 * atrasada primeiro, que é a ordem dos grupos da tela); "Recebidas" desce por
 * data do recebimento. Isso também decide o que o teto de 50 corta: nunca a
 * cobrança mais urgente.
 */
export async function listarCobrancas(
  empresaId: string,
  filtros: {
    situacao: SituacaoCobranca;
    periodo: Periodo | null;
    limite?: number;
    hoje: string;
  },
) {
  const { situacao, periodo, limite, hoje } = filtros;
  const dentroDoPeriodo = periodo ? { gte: periodo.inicio, lte: periodo.fim } : undefined;

  if (situacao === "recebidas") {
    return db(empresaId).tituloReceber.findMany({
      where: {
        arquivado_em: null,
        status: "pago",
        ...(dentroDoPeriodo ? { data_pagamento: dentroDoPeriodo } : {}),
      },
      select: CAMPOS_DA_LISTA,
      orderBy: [{ data_pagamento: "desc" }, { criado_em: "desc" }],
      take: limite,
    });
  }

  // O corte de "Vencidas" e o filtro de período pousam os dois em
  // `vencimento`: quando as duas coisas valem, o `AND` explícito mantém as
  // duas (um objeto com a mesma chave duas vezes perderia a primeira).
  const cortes = [
    ...(situacao === "vencidas"
      ? [{ vencimento: { lt: instanteDoDiaEmFortaleza(hoje) } }]
      : []),
    ...(dentroDoPeriodo ? [{ vencimento: dentroDoPeriodo }] : []),
  ];

  return db(empresaId).tituloReceber.findMany({
    where: {
      arquivado_em: null,
      status: "aberto",
      ...(situacao === "boleto" ? { forma_pagamento_prevista: "boleto" } : {}),
      ...(cortes.length ? { AND: cortes } : {}),
    },
    select: CAMPOS_DA_LISTA,
    orderBy: [{ vencimento: { sort: "asc", nulls: "last" } }, { criado_em: "asc" }],
    take: limite,
  });
}

export type CobrancaDoBanco = Awaited<ReturnType<typeof listarCobrancas>>[number];

/**
 * Quantos fretes estão **A faturar** — só para o estado vazio da tela, que
 * precisa dizer o que destrava a ação (`CLAUDE.md` §8) em vez de oferecer
 * "Gerar relatório", que é o item 7 e ainda não existe.
 *
 * **O critério é o mesmo de `situacaoFinanceira`** (`titulos.ts`): não
 * arquivado e **sem nenhum título ativo** — `none` sobre a relação inteira,
 * nunca o primeiro título que o banco devolver (`CLAUDE.md` §2: a regra fala
 * de TODOS os títulos do frete).
 *
 * **Por que não exige `status_operacional: "finalizado"`, mesmo sendo esse o
 * único estado que `faturarServico` aceita** — decisão do fundador,
 * 26/08/2026, achado do `/revisar`: este número acompanha um botão que abre
 * "Meus fretes" filtrado por **A faturar**, e lá a etiqueta sai de
 * `situacaoFinanceira`, que não olha `status_operacional`. Com o corte de
 * "finalizado" aqui, o botão dizia 4 e a lista abria com 7. O princípio é o
 * mesmo já registrado em `PERIODO_SEM_FIM` (`src/lib/utils/periodo.ts`,
 * 22/08/2026): **o número nunca discorda da tela que ele mesmo abre.** Quem
 * garante que os dois continuam iguais é `tests/cobrancas.test.ts`, medindo
 * um contra o outro — não a leitura de que as duas consultas "parecem" a
 * mesma.
 */
export function contarFretesAFaturar(empresaId: string) {
  return db(empresaId).servico.count({
    where: {
      arquivado_em: null,
      titulos_receber: { none: { arquivado_em: null, status: { not: "cancelado" } } },
    },
  });
}
