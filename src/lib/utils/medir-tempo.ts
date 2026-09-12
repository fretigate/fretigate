/**
 * Diagnóstico temporário (a pedido do fundador, 12/09/2026): medir quanto
 * cada ida ao banco custa nas três ações mais usadas — abrir a dashboard,
 * abrir a lista de fretes, salvar um frete —, depois da mudança de região
 * (commit `e7d602b`) e do upgrade para Pro. A pergunta que motiva isto:
 * "o app continua lento no uso real, e a medição anterior era numa rota que
 * não toca banco — onde o tempo está indo?"
 *
 * Sai do código (ou vira permanente, decisão do fundador) depois que os
 * números confirmarem ou descartarem os achados de consulta repetida já
 * registrados (tipo de operação buscado duas vezes ao salvar, faturamento
 * somado três vezes na dashboard).
 *
 * Só rótulo e milissegundos no log — nunca dado de cliente ou de empresa
 * (`CLAUDE.md` §4, "log nunca contém dado pessoal").
 */
export async function medir<T>(rotulo: string, fn: () => Promise<T>): Promise<T> {
  const inicio = performance.now();
  try {
    return await fn();
  } finally {
    const duracaoMs = Math.round(performance.now() - inicio);
    console.log(`[medir] ${rotulo} ${duracaoMs}ms`);
  }
}
