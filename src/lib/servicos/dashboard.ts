import { db } from "@/lib/db";
import { deslocarMes, instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";

/**
 * Dashboard (item 8) — montagem, não fundação: quase todo número aqui já é
 * calculado em outro lugar do produto (`docs/planos/item-8-dashboard.md`,
 * "Contexto"). O que falta é a agregação **por empresa e por mês**, que só
 * existe hoje por cliente/caminhão/motorista.
 *
 * `A receber`/`Vencido` (`resumoDeCobrancas`) e `Fretes a faturar`
 * (`contarFretesAFaturar`) não são repetidos aqui — a tela importa os dois
 * direto de `cobrancas.ts`.
 */

const CENTAVOS = 100;

/** Limite dos meses de referência — janela `[gte, lt)`, mesmo padrão de `resumoDeCobrancas`. */
function limitesDoMes(primeiroDiaDoMes: string) {
  return {
    inicio: instanteDoDiaEmFortaleza(primeiroDiaDoMes),
    fimExclusivo: instanteDoDiaEmFortaleza(deslocarMes(primeiroDiaDoMes, 1)),
  };
}

/**
 * Soma de `Servico.valor` num mês — **somar é diferente de cobrar**
 * (`CLAUDE.md` §9, decidido no item 7): `em_andamento` entra, `cancelado`
 * nunca. Mesmo filtro-base de `resumoDoCaminhao`/`resumoDoMotorista`,
 * adaptado para janela de mês fechada (`[gte, lt)`) em vez de `Periodo`
 * arbitrário.
 */
async function somaDoMes(empresaId: string, primeiroDiaDoMes: string) {
  const { inicio, fimExclusivo } = limitesDoMes(primeiroDiaDoMes);
  const agregado = await db(empresaId).servico.aggregate({
    where: {
      arquivado_em: null,
      status_operacional: { not: "cancelado" },
      data_servico: { gte: inicio, lt: fimExclusivo },
    },
    _sum: { valor: true },
    _count: true,
  });
  return { faturamentoCentavos: agregado._sum.valor ?? 0, qtdFretes: agregado._count };
}

export type ResumoDoMes = {
  faturamentoCentavos: number;
  qtdFretes: number;
  /** Reais, não centavos — métrica calculada na exibição, nunca gravada (mesma exceção de `rsPorKm`, `CLAUDE.md` §7). `null` sem frete no mês. */
  mediaPorFrete: number | null;
  /** `null` quando o mês anterior não tem faturamento para comparar (divisão por zero não é "queda de 100%", é ausência de base). */
  variacaoPercentual: number | null;
};

/** Faturamento do cartão escuro: mês corrente, comparação com o mês anterior, quantidade e média. */
export async function resumoDoMes(empresaId: string, hoje: string): Promise<ResumoDoMes> {
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const primeiroDiaDoMesAnterior = deslocarMes(primeiroDiaDoMesAtual, -1);

  const [atual, anterior] = await Promise.all([
    somaDoMes(empresaId, primeiroDiaDoMesAtual),
    somaDoMes(empresaId, primeiroDiaDoMesAnterior),
  ]);

  return {
    faturamentoCentavos: atual.faturamentoCentavos,
    qtdFretes: atual.qtdFretes,
    mediaPorFrete: atual.qtdFretes > 0 ? atual.faturamentoCentavos / CENTAVOS / atual.qtdFretes : null,
    variacaoPercentual:
      anterior.faturamentoCentavos > 0
        ? ((atual.faturamentoCentavos - anterior.faturamentoCentavos) / anterior.faturamentoCentavos) * 100
        : null,
  };
}

export type ResumoDeRodagem = {
  /** `null` quando nenhum frete do mês tem km preenchido — convite, não zero (`CLAUDE.md` §8). */
  kmMesMetros: number | null;
  /** Reais por km, float — mesma exceção de `rsPorKm` em `resumoDoCaminhao`. */
  rsPorKm: number | null;
};

/**
 * Km e R$/km do mês, para a empresa inteira — mesma forma de
 * `resumoDoCaminhao` (`src/lib/servicos/servicos.ts`), inclusive o filtro
 * `km: { gt: 0 }` (nunca `not: null`, pelo mesmo motivo lá: um frete com
 * `km = 0` não pode inflar a contagem sem contribuir distância nenhuma).
 *
 * **Mostra dado real, não convite fixo** — decisão do fundador, 29/08/2026
 * (`docs/planos/item-8-dashboard.md`): `Servico.km` existe desde o item 3,
 * manual; o item 12 é só o cálculo automático, não um pré-requisito para o
 * campo existir. Convite só quando a cobertura é zero.
 */
export async function resumoDeRodagemDoMes(empresaId: string, hoje: string): Promise<ResumoDeRodagem> {
  const primeiroDiaDoMes = `${hoje.slice(0, 7)}-01`;
  const { inicio, fimExclusivo } = limitesDoMes(primeiroDiaDoMes);

  const comKm = await db(empresaId).servico.aggregate({
    where: {
      arquivado_em: null,
      status_operacional: { not: "cancelado" },
      data_servico: { gte: inicio, lt: fimExclusivo },
      km: { gt: 0 },
    },
    _sum: { valor: true, km: true },
  });

  const kmMesMetros = comKm._sum.km ?? 0;
  if (kmMesMetros <= 0) return { kmMesMetros: null, rsPorKm: null };

  const valorComKm = comKm._sum.valor ?? 0;
  return { kmMesMetros, rsPorKm: valorComKm / CENTAVOS / (kmMesMetros / 1000) };
}

export type ContagemEmAndamento = { total: number; semOrdemEnviada: number };

/** "Fretes em andamento (indicando quantos sem ordem enviada)" — `docs/especificacao.md` §4.6. */
export async function contarFretesEmAndamento(empresaId: string): Promise<ContagemEmAndamento> {
  const [total, semOrdemEnviada] = await Promise.all([
    db(empresaId).servico.count({
      where: { arquivado_em: null, status_operacional: "em_andamento" },
    }),
    db(empresaId).servico.count({
      where: { arquivado_em: null, status_operacional: "em_andamento", ordem_enviada_em: null },
    }),
  ]);
  return { total, semOrdemEnviada };
}

/**
 * "Cobranças vencidas", na mesma unidade que a lista de Cobranças mostra
 * (`docs/especificacao.md` §4.5: "uma cobrança gerada por relatório é uma
 * linha só") — nunca conta título cru, que infla o número de uma cobrança
 * agrupada em N. Mesmo filtro-base de `resumoDeCobrancas`
 * (`src/lib/servicos/cobrancas.ts`), sem repetir a soma de valor: aqui só a
 * contagem de linhas importa.
 *
 * Não reaproveita `agruparPorRelatorio` (`cobrancas-situacao.ts`) — aquela
 * função opera sobre a lista inteira já montada para a tela (cliente,
 * telefone, marca de cobrado…), pesada demais só para contar. Um título sem
 * `relatorio_id` é uma linha; títulos com o mesmo `relatorio_id` são uma
 * linha só, qualquer que seja a quantidade — **se o critério de agrupamento
 * mudar depois, este contador precisa mudar junto**, não é uma segunda
 * verdade.
 */
export async function contarCobrancasVencidasAgrupadas(empresaId: string, hoje: string): Promise<number> {
  const inicioDeHoje = instanteDoDiaEmFortaleza(hoje);
  const vencidas = await db(empresaId).tituloReceber.findMany({
    where: {
      arquivado_em: null,
      status: "aberto",
      servico: { arquivado_em: null },
      vencimento: { lt: inicioDeHoje },
    },
    select: { relatorio_id: true },
  });

  const semRelatorio = vencidas.filter((t) => !t.relatorio_id).length;
  const relatoriosDistintos = new Set(
    vencidas.filter((t) => t.relatorio_id).map((t) => t.relatorio_id),
  ).size;
  return semRelatorio + relatoriosDistintos;
}

export type SugestaoDeRelatorio = { clienteId: string; quantidade: number };

/**
 * "Sugestão de relatório quando um cliente acumula fretes não faturados de
 * um mês fechado" (`docs/especificacao.md` §4.6). **3 ou mais fretes**,
 * decisão do fundador, 29/08/2026 — um ou dois esquecidos é normal, três é
 * acúmulo de verdade. **Heurística, ajustável**: não é regra de negócio
 * travada; se gerar ruído, sobe, se deixar passar cobrança, desce.
 *
 * "Mês fechado" = qualquer mês civil já encerrado, sempre em fuso de
 * Fortaleza (`hoje` já chega como `"AAAA-MM-DD"` de lá) — não só o mês
 * passado: um cliente esquecido há três meses continua qualificando.
 *
 * Mesmo filtro de "a faturar" de `contarFretesAFaturar`
 * (`src/lib/servicos/cobrancas.ts`) — nenhum título ativo — **mais** a
 * exclusão de `status_operacional: "cancelado"`, que aquela função não tem
 * (ver o comentário dentro da consulta, abaixo). Devolve o cliente de maior
 * contagem quando mais de um qualificar — prioriza o acúmulo maior, não o
 * mais antigo. `null` quando nenhum cliente atinge o limiar.
 */
export async function sugerirRelatorio(
  empresaId: string,
  hoje: string,
): Promise<SugestaoDeRelatorio | null> {
  const LIMIAR = 3;
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const inicioDoMesAtual = instanteDoDiaEmFortaleza(primeiroDiaDoMesAtual);

  const fretes = await db(empresaId).servico.findMany({
    where: {
      arquivado_em: null,
      // **Diverge de propósito de `contarFretesAFaturar`**, que não filtra
      // `status_operacional`: aqui o número alimenta uma sugestão de
      // relatório — dinheiro — e um frete cancelado "não vai acontecer"
      // (`CLAUDE.md` §7, "nunca entra em nenhuma soma derivada"). Sugerir
      // relatório por causa de um frete cancelado sugeriria cobrar dinheiro
      // que ninguém vai receber.
      status_operacional: { not: "cancelado" },
      data_servico: { lt: inicioDoMesAtual },
      titulos_receber: { none: { arquivado_em: null, status: { not: "cancelado" } } },
    },
    select: { cliente_id: true },
  });

  const contagemPorCliente = new Map<string, number>();
  for (const f of fretes) {
    contagemPorCliente.set(f.cliente_id, (contagemPorCliente.get(f.cliente_id) ?? 0) + 1);
  }

  let melhor: SugestaoDeRelatorio | null = null;
  for (const [clienteId, quantidade] of contagemPorCliente) {
    if (quantidade >= LIMIAR && (!melhor || quantidade > melhor.quantidade)) {
      melhor = { clienteId, quantidade };
    }
  }
  return melhor;
}

export type FaturamentoDoMes = { mes: string; faturamentoCentavos: number };

/**
 * Barras dos últimos `meses` (padrão 6, incluindo o atual) — mesmo
 * filtro-base de `resumoDoMes`. Ordem cronológica, mais antigo primeiro,
 * para o gráfico desenhar da esquerda pra direita.
 */
export async function faturamentoPorMes(
  empresaId: string,
  hoje: string,
  meses = 6,
): Promise<FaturamentoDoMes[]> {
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const janelas = Array.from({ length: meses }, (_, i) =>
    deslocarMes(primeiroDiaDoMesAtual, -(meses - 1 - i)),
  );

  const somas = await Promise.all(janelas.map((mes) => somaDoMes(empresaId, mes)));
  return janelas.map((mes, i) => ({ mes: mes.slice(0, 7), faturamentoCentavos: somas[i].faturamentoCentavos }));
}
