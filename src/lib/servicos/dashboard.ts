import { db } from "@/lib/db";
import { despesasDoMes } from "@/lib/servicos/despesas";
import { deslocarMes, instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { medir } from "@/lib/utils/medir-tempo";

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

export type SomaDoMes = { faturamentoCentavos: number; qtdFretes: number };

/**
 * Soma de `Servico.valor` num mês — **somar é diferente de cobrar**
 * (`CLAUDE.md` §9, decidido no item 7): `em_andamento` entra, `cancelado`
 * nunca. Mesmo filtro-base de `resumoDoCaminhao`/`resumoDoMotorista`,
 * adaptado para janela de mês fechada (`[gte, lt)`) em vez de `Periodo`
 * arbitrário.
 *
 * **Três chamadores no código, desde 12/09/2026** — confirmado por leitura,
 * não por contagem de execuções: o log da Vercel não dá uma contagem
 * confiável por pedido (`docs/diario.md`, entrada de instrumentação).
 * `resumoDoMes`, `resumoDeLucroDoMes` e `faturamentoPorMes` (abaixo) cada
 * uma chamava esta função para o **mesmo** mês corrente — `page.tsx` agora
 * chama `iniciarSomaDoMesAtual` (abaixo) uma vez só, e as três reaproveitam
 * o resultado quando é da mesma empresa e do mesmo mês
 * (`somaMesAtualValida`). Fora desse caso — chamador diferente, empresa ou
 * mês diferentes —, esta função continua rodando normalmente. Produção
 * mediu o **custo** de duas das três chamadas isoladamente
 * (`resumoDoMes-atual`: 102–469ms, 4 amostras; `resumoDeLucroDoMes-atual`:
 * 418ms, 1 amostra) — a terceira (`faturamentoPorMes`) roda a mesma consulta
 * com os mesmos parâmetros e não foi observada na janela de log puxada, mas
 * não há razão para custar diferente. Ver
 * `docs/planos/remove-consultas-repetidas-tipo-operacao-e-soma-do-mes.md`.
 */
async function somaDoMes(
  empresaId: string,
  primeiroDiaDoMes: string,
  rotulo: string,
  idPedido?: string,
): Promise<SomaDoMes> {
  const { inicio, fimExclusivo } = limitesDoMes(primeiroDiaDoMes);
  const agregado = await medir(
    `dashboard.somaDoMes[${rotulo}]`,
    () =>
      db(empresaId).servico.aggregate({
        where: {
          arquivado_em: null,
          status_operacional: { not: "cancelado" },
          data_servico: { gte: inicio, lt: fimExclusivo },
        },
        _sum: { valor: true },
        _count: true,
      }),
    idPedido,
  );
  return { faturamentoCentavos: agregado._sum.valor ?? 0, qtdFretes: agregado._count };
}

/**
 * Um `somaDoMes` já em andamento, marcado com a empresa e o mês a que
 * pertence — `resumoDoMes`/`resumoDeLucroDoMes`/`faturamentoPorMes` só
 * reaproveitam quando os dois batem (`somaMesAtualValida`, abaixo). Um
 * `Promise<SomaDoMes>` sozinho, sem essa marca, não provaria nada — dinheiro
 * (`CLAUDE.md` §3: "impossível esquecer" a conferência) não pode depender de
 * o chamador ter calculado a coisa certa; achado do `/revisar`, 12/09/2026.
 */
export type SomaDoMesAtual = {
  empresaId: string;
  primeiroDiaDoMes: string;
  promessa: Promise<SomaDoMes>;
};

/** `page.tsx` chama uma vez, no topo, e passa o resultado para as três funções que precisam do mês corrente. */
export function iniciarSomaDoMesAtual(
  empresaId: string,
  primeiroDiaDoMes: string,
  idPedido?: string,
): SomaDoMesAtual {
  return {
    empresaId,
    primeiroDiaDoMes,
    promessa: somaDoMes(empresaId, primeiroDiaDoMes, "mesAtual", idPedido),
  };
}

/** Só reaproveita quando é da mesma empresa e do mesmo mês — qualquer outro caso, cada função calcula a própria soma, do jeito de sempre. */
function somaMesAtualValida(
  candidato: SomaDoMesAtual | undefined,
  empresaId: string,
  primeiroDiaDoMes: string,
): candidato is SomaDoMesAtual {
  return (
    candidato !== undefined &&
    candidato.empresaId === empresaId &&
    candidato.primeiroDiaDoMes === primeiroDiaDoMes
  );
}

export type ResumoDoMes = {
  faturamentoCentavos: number;
  qtdFretes: number;
  /** Reais, não centavos — métrica calculada na exibição, nunca gravada (mesma exceção de `rsPorKm`, `CLAUDE.md` §7). `null` sem frete no mês. */
  mediaPorFrete: number | null;
  /** `null` quando o mês anterior não tem faturamento para comparar (divisão por zero não é "queda de 100%", é ausência de base). */
  variacaoPercentual: number | null;
};

/**
 * Faturamento do cartão escuro: mês corrente, comparação com o mês
 * anterior, quantidade e média.
 *
 * `somaMesAtualJaCalculada` (opcional, desde 12/09/2026) — quando o
 * chamador já somou o mês corrente para a mesma empresa
 * (`iniciarSomaDoMesAtual`, `page.tsx`), pula a própria soma; caso
 * contrário — ausente, ou de outra empresa/mês — calcula sozinha como
 * antes. Nunca confia sem conferir (`somaMesAtualValida`): dinheiro não
 * reaproveita valor de procedência não verificada.
 */
export async function resumoDoMes(
  empresaId: string,
  hoje: string,
  idPedido?: string,
  somaMesAtualJaCalculada?: SomaDoMesAtual,
): Promise<ResumoDoMes> {
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const primeiroDiaDoMesAnterior = deslocarMes(primeiroDiaDoMesAtual, -1);

  const [atual, anterior] = await Promise.all([
    somaMesAtualValida(somaMesAtualJaCalculada, empresaId, primeiroDiaDoMesAtual)
      ? somaMesAtualJaCalculada.promessa
      : somaDoMes(empresaId, primeiroDiaDoMesAtual, "resumoDoMes-atual", idPedido),
    somaDoMes(empresaId, primeiroDiaDoMesAnterior, "resumoDoMes-anterior", idPedido),
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

export type ResumoDeLucro = {
  /**
   * `null` quando nenhuma despesa foi lançada no mês — convite, não a conta
   * "faturamento − 0" tratada como lucro real (`CLAUDE.md` §8, regra 10;
   * mesmo critério de `ResumoDeRodagem.kmMesMetros`: a ausência de
   * lançamento decide o convite, nunca o valor da soma — os dois coincidem
   * hoje porque toda despesa tem `valor > 0`, mas o gatilho é a
   * **contagem**, não a conta). Decisão do fundador, 01/09/2026
   * (`docs/planos/item-11-despesas.md`).
   */
  lucroCentavos: number | null;
  faturamentoCentavos: number;
  despesasCentavos: number;
};

/**
 * Lucro do mês para a pastilha da dashboard (item 11) — faturamento (mesma
 * soma-base de `resumoDoMes`, "somar é diferente de cobrar") menos despesas
 * lançadas no mês (`despesasDoMes`, `src/lib/servicos/despesas.ts` — fonte
 * única desde 17/09/2026, `docs/planos/financeiro-resumo-com-numeros.md`,
 * quando o hub Financeiro virou o segundo chamador).
 *
 * `somaMesAtualJaCalculada` (opcional) — mesmo mecanismo de `resumoDoMes`,
 * acima: pula a soma própria só quando é da mesma empresa e do mesmo mês
 * (`somaMesAtualValida`); qualquer outro caso, calcula a própria.
 */
export async function resumoDeLucroDoMes(
  empresaId: string,
  hoje: string,
  idPedido?: string,
  somaMesAtualJaCalculada?: SomaDoMesAtual,
): Promise<ResumoDeLucro> {
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;

  const [faturamento, despesas] = await Promise.all([
    somaMesAtualValida(somaMesAtualJaCalculada, empresaId, primeiroDiaDoMesAtual)
      ? somaMesAtualJaCalculada.promessa
      : somaDoMes(empresaId, primeiroDiaDoMesAtual, "resumoDeLucroDoMes-atual", idPedido),
    despesasDoMes(empresaId, hoje, idPedido),
  ]);

  return {
    lucroCentavos: despesas.quantidade > 0 ? faturamento.faturamentoCentavos - despesas.totalCentavos : null,
    faturamentoCentavos: faturamento.faturamentoCentavos,
    despesasCentavos: despesas.totalCentavos,
  };
}

export type ResumoDeRodagem = {
  /** `null` quando nenhum frete do mês tem km preenchido — convite, não zero (`CLAUDE.md` §8). */
  kmMesMetros: number | null;
  /** Reais por km, float — mesma exceção de `rsPorKm` em `resumoDoCaminhao`. */
  rsPorKm: number | null;
  /** Quantos fretes do mês têm km preenchido — para a nota de cobertura parcial (`CLAUDE.md` §8, regra 10). */
  fretesComKm: number;
  fretesNoMes: number;
};

/**
 * Km e R$/km do mês, para a empresa inteira — mesma forma de
 * `resumoDoCaminhao` (`src/lib/servicos/servicos.ts`), inclusive o filtro
 * `km: { gt: 0 }` (nunca `not: null`, pelo mesmo motivo lá: um frete com
 * `km = 0` não pode inflar a contagem sem contribuir distância nenhuma) e a
 * contagem `fretesComKm`/`fretesNoMes`, para a tela mostrar a cobertura
 * quando o dado é parcial — mesmo par de campos, mesmo motivo.
 *
 * **Mostra dado real, não convite fixo** — decisão do fundador, 29/08/2026
 * (`docs/planos/item-8-dashboard.md`): `Servico.km` existe desde o item 3,
 * manual; o item 12 é só o cálculo automático, não um pré-requisito para o
 * campo existir. Convite só quando a cobertura é zero.
 */
export async function resumoDeRodagemDoMes(
  empresaId: string,
  hoje: string,
  idPedido?: string,
): Promise<ResumoDeRodagem> {
  const primeiroDiaDoMes = `${hoje.slice(0, 7)}-01`;
  const { inicio, fimExclusivo } = limitesDoMes(primeiroDiaDoMes);
  const baseWhere = {
    arquivado_em: null,
    status_operacional: { not: "cancelado" as const },
    data_servico: { gte: inicio, lt: fimExclusivo },
  };

  const [comKm, fretesNoMes] = await Promise.all([
    medir(
      "dashboard.rodagem.comKm",
      () =>
        db(empresaId).servico.aggregate({
          where: { ...baseWhere, km: { gt: 0 } },
          _sum: { valor: true, km: true },
          _count: true,
        }),
      idPedido,
    ),
    medir(
      "dashboard.rodagem.fretesNoMes",
      () => db(empresaId).servico.count({ where: baseWhere }),
      idPedido,
    ),
  ]);

  const kmMesMetros = comKm._sum.km ?? 0;
  if (kmMesMetros <= 0) return { kmMesMetros: null, rsPorKm: null, fretesComKm: 0, fretesNoMes };

  const valorComKm = comKm._sum.valor ?? 0;
  return {
    kmMesMetros,
    rsPorKm: valorComKm / CENTAVOS / (kmMesMetros / 1000),
    fretesComKm: comKm._count,
    fretesNoMes,
  };
}

export type ContagemEmAndamento = { total: number; semOrdemEnviada: number };

/** "Fretes em andamento (indicando quantos sem ordem enviada)" — `docs/especificacao.md` §4.6. */
export async function contarFretesEmAndamento(
  empresaId: string,
  idPedido?: string,
): Promise<ContagemEmAndamento> {
  const [total, semOrdemEnviada] = await Promise.all([
    medir(
      "dashboard.emAndamento.total",
      () =>
        db(empresaId).servico.count({
          where: { arquivado_em: null, status_operacional: "em_andamento" },
        }),
      idPedido,
    ),
    medir(
      "dashboard.emAndamento.semOrdemEnviada",
      () =>
        db(empresaId).servico.count({
          where: { arquivado_em: null, status_operacional: "em_andamento", ordem_enviada_em: null },
        }),
      idPedido,
    ),
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
export async function contarCobrancasVencidasAgrupadas(
  empresaId: string,
  hoje: string,
  idPedido?: string,
): Promise<number> {
  const inicioDeHoje = instanteDoDiaEmFortaleza(hoje);
  const vencidas = await medir(
    "dashboard.vencidasAgrupadas",
    () =>
      db(empresaId).tituloReceber.findMany({
        where: {
          arquivado_em: null,
          status: "aberto",
          servico: { arquivado_em: null },
          vencimento: { lt: inicioDeHoje },
        },
        select: { relatorio_id: true },
      }),
    idPedido,
  );

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
  idPedido?: string,
): Promise<SugestaoDeRelatorio | null> {
  const LIMIAR = 3;
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const inicioDoMesAtual = instanteDoDiaEmFortaleza(primeiroDiaDoMesAtual);

  const fretes = await medir(
    "dashboard.sugerirRelatorio",
    () =>
      db(empresaId).servico.findMany({
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
      }),
    idPedido,
  );

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
 *
 * `somaMesAtualJaCalculada` (opcional) — o último elemento do array é
 * sempre o mês corrente, o mesmo que `resumoDoMes`/`resumoDeLucroDoMes` já
 * somam; quando é da mesma empresa e do mesmo mês (`somaMesAtualValida`),
 * esse elemento reaproveita em vez de somar de novo (era o rótulo
 * `(3a-vez)`, removido junto — não soma mais nada, então deixou de ser a
 * terceira).
 */
export async function faturamentoPorMes(
  empresaId: string,
  hoje: string,
  meses = 6,
  idPedido?: string,
  somaMesAtualJaCalculada?: SomaDoMesAtual,
): Promise<FaturamentoDoMes[]> {
  const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
  const janelas = Array.from({ length: meses }, (_, i) =>
    deslocarMes(primeiroDiaDoMesAtual, -(meses - 1 - i)),
  );

  const somas = await Promise.all(
    janelas.map((mes, i) => {
      const ehMesAtual = i === meses - 1;
      if (ehMesAtual && somaMesAtualValida(somaMesAtualJaCalculada, empresaId, mes)) {
        return somaMesAtualJaCalculada.promessa;
      }
      return somaDoMes(empresaId, mes, ehMesAtual ? "faturamentoPorMes-atual" : `faturamentoPorMes[${mes}]`, idPedido);
    }),
  );
  return janelas.map((mes, i) => ({ mes: mes.slice(0, 7), faturamentoCentavos: somas[i].faturamentoCentavos }));
}
