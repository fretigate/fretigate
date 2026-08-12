/**
 * Dinheiro em centavos, inteiro (`CLAUDE.md` §7) — a única porta de conversão
 * para o texto que aparece em tela. `Servico.valor` e todo campo de dinheiro
 * do banco guardam centavos; esta função é o único lugar que decide como isso
 * vira "1.234,56".
 */
export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
