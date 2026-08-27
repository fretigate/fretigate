import { db } from "@/lib/db";
import type { Periodo } from "@/lib/servicos/servicos";
import { totalRecebidoPorTitulo } from "@/lib/servicos/titulos";
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
 *
 * **"Vencido é um recorte de A receber"** (§4.5) é o que estas duas somas
 * fazem ao pé da letra: o mesmo conjunto, uma delas com o corte de
 * vencimento. Quem diz isso em palavras é a tela.
 *
 * **"Recebido no mês" soma `Recebimento.valor` com `Recebimento.data` no
 * mês corrente** (item 6, Tarefa 3) — cada recebimento é uma linha própria
 * na tabela `recebimento` (decisão 6 do plano), então dois recebimentos
 * parciais em meses diferentes contam cada um no seu próprio mês. Antes
 * desta tarefa era `valor_recebido`/`data_pagamento` do próprio título, que
 * não suportava mais de um recebimento por título.
 *
 * Cinco agregações, nunca uma consulta por título: o saldo de "A receber" e
 * "Vencido" precisa de duas cada (o total dos títulos e o total já recebido
 * DESSES títulos), porque a soma de `Recebimento` não sabe, sozinha, se o
 * título dela está aberto ou vencido — só a relação `titulo` no `where`
 * resolve isso, e Prisma agrega uma coisa por vez.
 */
export async function resumoDeCobrancas(empresaId: string, hoje: string) {
  const inicioDeHoje = instanteDoDiaEmFortaleza(hoje);
  const primeiroDiaDoMes = `${hoje.slice(0, 7)}-01`;
  const inicioDoMes = instanteDoDiaEmFortaleza(primeiroDiaDoMes);
  const inicioDoMesSeguinte = instanteDoDiaEmFortaleza(deslocarMes(primeiroDiaDoMes, 1));

  // **`servico: { arquivado_em: null }` entra aqui** — achado do fundador,
  // 26/08/2026: um frete arquivado com título ainda aberto (`arquivarServico`
  // não trava isso, e não toca o título) continuava contando em "A
  // receber"/"Vencido" — dinheiro errado na tela que existe para responder
  // "quanto há a receber". Buraco da Tarefa 2 (a tela nunca olhou o frete),
  // corrigido aqui na Tarefa 3 por já ter o contexto na mão. Não se estende a
  // `recebidoNoMes`, abaixo: dinheiro que já entrou continua tendo entrado,
  // mesmo que o frete seja arquivado depois — arquivar não apaga histórico
  // (`CLAUDE.md` §7).
  const whereAbertas = {
    arquivado_em: null,
    status: "aberto" as const,
    servico: { arquivado_em: null },
  };
  const whereVencidas = { ...whereAbertas, vencimento: { lt: inicioDeHoje } };

  const [totalAbertas, recebidoAbertas, totalVencidas, recebidoVencidas, recebidoNoMes] =
    await Promise.all([
      db(empresaId).tituloReceber.aggregate({ where: whereAbertas, _sum: { valor: true } }),
      db(empresaId).recebimento.aggregate({
        where: { arquivado_em: null, titulo: whereAbertas },
        _sum: { valor: true },
      }),
      db(empresaId).tituloReceber.aggregate({ where: whereVencidas, _sum: { valor: true } }),
      db(empresaId).recebimento.aggregate({
        where: { arquivado_em: null, titulo: whereVencidas },
        _sum: { valor: true },
      }),
      db(empresaId).recebimento.aggregate({
        where: {
          arquivado_em: null,
          data: { gte: inicioDoMes, lt: inicioDoMesSeguinte },
          titulo: { arquivado_em: null, status: { not: "cancelado" } },
        },
        _sum: { valor: true },
      }),
    ]);

  return {
    aReceber: (totalAbertas._sum.valor ?? 0) - (recebidoAbertas._sum.valor ?? 0),
    vencido: (totalVencidas._sum.valor ?? 0) - (recebidoVencidas._sum.valor ?? 0),
    recebidoNoMes: recebidoNoMes._sum.valor ?? 0,
  };
}

const CAMPOS_DA_LISTA = {
  id: true,
  servico_id: true,
  cliente_id: true,
  valor: true,
  vencimento: true,
  forma_pagamento_prevista: true,
  status: true,
} as const;

/**
 * A lista, já filtrada pela situação e pelo período, com `totalRecebido`
 * (item 6, Tarefa 3) somado por cima — em lote, nunca uma consulta por
 * título (`totalRecebidoPorTitulo`, `src/lib/servicos/titulos.ts`).
 *
 * **O período conta pelo vencimento — menos em "Recebidas", que conta pela
 * data do recebimento** (decisão do fundador, 26/08/2026, plano do item 6,
 * Tarefa 2). O motivo da exceção, para não parecer inconsistência: título
 * criado por "Já recebi" (`criarTituloJaRecebi`) nasce `pago` **sem
 * vencimento nenhum**. Contar por vencimento dentro de "Recebidas" faria
 * esses títulos sumirem dos dois lados — não caem em nenhum dos três grupos
 * de vencimento e também não passariam pelo filtro de período.
 *
 * **"Recebidas" busca por `Recebimento`, não por `TituloReceber` — achado do
 * `/revisar` na Tarefa 3.** Uma primeira versão usava `atualizado_em` do
 * título como proxy de "data do recebimento", presumindo que a função de
 * banco grava `now()` no exato instante do último pagamento — verdade só
 * quando a pessoa registra no dia em que recebeu. A folha de recebimento
 * também oferece "Ontem" e "Outra data" (`FolhaDeRecebimento.tsx`), e
 * `registrar_recebimento` sempre grava `atualizado_em = now()` (o instante
 * do toque), não `p_data` (o dia escolhido) — as duas datas divergem
 * exatamente quando alguém backdata um recebimento, e é para backdatar que
 * os chips existem. `resumoDeCobrancas.recebidoNoMes` (acima) já somava por
 * `Recebimento.data`; usar `atualizado_em` aqui fazia o número do topo e a
 * lista discordarem no mês de fronteira — o mesmo defeito que `PERIODO_SEM_FIM`
 * e `contarFretesAFaturar` já registram: "o número nunca discorda da tela
 * que ele mesmo abre".
 *
 * A busca é em duas consultas — `recebimento.groupBy` para achar os títulos
 * `pago` e a data do ÚLTIMO recebimento de cada um (o que fechou o título),
 * filtrar/ordenar/cortar por essa data em memória, e só então buscar os
 * títulos da página resultante. Não dá para pedir isso numa `findMany` de
 * `TituloReceber` só: Prisma não agrega (`MAX`) uma relação dentro de
 * `where`/`orderBy`, só conta (`_count`). O corte de 50 acontece ANTES da
 * segunda consulta, sobre o grupo inteiro de títulos pagos desta empresa —
 * nunca sobre uma página já cortada por outro critério, que cortaria a
 * cobrança errada.
 *
 * **Um título parcialmente recebido continua em aberto, nunca em
 * "Recebidas"** (decisão do fundador, plano da Tarefa 2, confirmada nesta
 * tarefa): "Recebidas" é sempre `status === "pago"`; um `aberto` com algum
 * `Recebimento` já registrado (parcial) aparece nos três grupos abertos,
 * com `valorCentavos` já mostrando o saldo — a marca **Parcial** na linha é
 * quem avisa que já entrou parte.
 *
 * **Ordem:** as três situações em aberto sobem por vencimento (a mais
 * atrasada primeiro, que é a ordem dos grupos da tela); "Recebidas" desce
 * pela data do último recebimento. Isso também decide o que o teto de 50
 * corta: nunca a cobrança mais urgente.
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
    const grupos = await db(empresaId).recebimento.groupBy({
      by: ["titulo_id"],
      where: {
        arquivado_em: null,
        titulo: { status: "pago", arquivado_em: null },
      },
      _max: { data: true },
    });

    const filtrados = dentroDoPeriodo
      ? grupos.filter((g) => {
          const data = g._max.data!;
          return data >= dentroDoPeriodo.gte && data <= dentroDoPeriodo.lte;
        })
      : grupos;
    filtrados.sort((a, b) => b._max.data!.getTime() - a._max.data!.getTime());
    const pagina = limite ? filtrados.slice(0, limite) : filtrados;

    const ultimoRecebimentoPorTitulo = new Map(pagina.map((g) => [g.titulo_id, g._max.data!]));
    const titulosCrus = await db(empresaId).tituloReceber.findMany({
      where: { id: { in: pagina.map((g) => g.titulo_id) } },
      select: CAMPOS_DA_LISTA,
    });
    const porId = new Map(titulosCrus.map((t) => [t.id, t]));
    // `findMany` com `id: { in }` não preserva a ordem da lista — a ordem
    // certa (pela data do último recebimento) é a de `pagina`.
    const titulos = pagina
      .map((g) => porId.get(g.titulo_id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    const totalPorTitulo = await totalRecebidoPorTitulo(
      empresaId,
      titulos.map((t) => t.id),
    );
    return titulos.map((t) => ({
      ...t,
      totalRecebido: totalPorTitulo.get(t.id) ?? 0,
      ultimoRecebimentoEm: ultimoRecebimentoPorTitulo.get(t.id) ?? null,
    }));
  }

  const titulos = await db(empresaId).tituloReceber.findMany({
    where: {
      arquivado_em: null,
      status: "aberto",
      // Mesmo motivo de `resumoDeCobrancas`, acima: frete arquivado não
      // aparece na lista em aberto — nem na soma, nem na linha que ofereceria
      // "Marcar recebido" para uma ação que `registrarRecebimento` já recusa.
      servico: { arquivado_em: null },
      ...(situacao === "boleto" ? { forma_pagamento_prevista: "boleto" } : {}),
      // O corte de "Vencidas" e o filtro de período pousam os dois em
      // `vencimento`: quando as duas coisas valem, o `AND` explícito
      // mantém as duas (a mesma chave duas vezes perderia a primeira).
      ...(situacao === "vencidas" || dentroDoPeriodo
        ? {
            AND: [
              ...(situacao === "vencidas"
                ? [{ vencimento: { lt: instanteDoDiaEmFortaleza(hoje) } }]
                : []),
              ...(dentroDoPeriodo ? [{ vencimento: dentroDoPeriodo }] : []),
            ],
          }
        : {}),
    },
    select: CAMPOS_DA_LISTA,
    orderBy: [{ vencimento: { sort: "asc", nulls: "last" } }, { criado_em: "asc" }],
    take: limite,
  });

  const totalPorTitulo = await totalRecebidoPorTitulo(
    empresaId,
    titulos.map((t) => t.id),
  );
  return titulos.map((t) => ({
    ...t,
    totalRecebido: totalPorTitulo.get(t.id) ?? 0,
    ultimoRecebimentoEm: null as Date | null,
  }));
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
