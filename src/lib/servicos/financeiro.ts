import { despesasDoMes } from "@/lib/servicos/despesas";
import { recebidoNoMes } from "@/lib/servicos/cobrancas";

/**
 * Financeiro (hub) — montagem, não fundação, mesmo espírito de
 * `src/lib/servicos/dashboard.ts`: os dois números de base já existem em
 * outro lugar do produto (`recebidoNoMes`, `despesasDoMes`), cada um com a
 * própria fonte de verdade. O que este arquivo soma é o terceiro número —
 * "Saldo do mês" —, calculado na hora, nunca gravado (`CLAUDE.md` §9,
 * "situação financeira é derivada").
 *
 * Decisão do fundador, 17/09/2026 (`docs/planos/
 * financeiro-resumo-com-numeros.md`, Proposta 2): os três números são
 * **caixa** — dinheiro que já entrou ou já saiu de verdade —, nunca
 * competência. Por isso nunca reaproveita `resumoDoMes`/`resumoDeLucroDoMes`
 * (Faturamento/Lucro da dashboard, que contam o frete no mês em que rodou,
 * recebido ou não) — são números parecidos por fora e diferentes por dentro,
 * e este resumo existe ao lado deles, não em cima.
 */
export type ResumoDoFinanceiro = {
  recebidoCentavos: number;
  pagoCentavos: number;
  /**
   * `recebidoCentavos - pagoCentavos` — pode ser negativo. `null` quando
   * nenhuma despesa foi lançada no mês: mesma ambiguidade que já vale para
   * o Lucro da dashboard (`CLAUDE.md` §8, "Número incompleto não é
   * exibido" — o gatilho é a **contagem** de despesas lançadas, nunca a
   * conta, `resumoDeLucroDoMes`). "Pago" zero pode ser "não gastou nada" ou
   * "ainda não lançou"; um Saldo calculado em cima disso herdaria a mesma
   * dúvida, e mostraria "sobrou tudo que entrou" sem ter certeza.
   * "Recebido"/"Pago" continuam números reais mesmo quando zero — são somas
   * diretas, não uma combinação dos dois lados.
   */
  saldoCentavos: number | null;
};

export async function resumoDoFinanceiro(
  empresaId: string,
  hoje: string,
  idPedido?: string,
): Promise<ResumoDoFinanceiro> {
  const [recebido, despesas] = await Promise.all([
    recebidoNoMes(empresaId, hoje, idPedido),
    despesasDoMes(empresaId, hoje, idPedido),
  ]);

  return {
    recebidoCentavos: recebido,
    pagoCentavos: despesas.totalCentavos,
    saldoCentavos: despesas.quantidade > 0 ? recebido - despesas.totalCentavos : null,
  };
}
