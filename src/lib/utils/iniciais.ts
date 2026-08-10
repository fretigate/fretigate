/**
 * Iniciais de empresa — `docs/componentes.md` § "Iniciais da empresa".
 *
 * Regra única, hoje usada no círculo do cartão de identidade (Mais) e na
 * linha de lista de Cliente: se a primeira palavra já é uma sigla em caixa
 * alta de até 3 letras, ela **é** a inicial — senão, a primeira letra das
 * duas primeiras palavras. "AP Transportes" → AP, "JBS" → JBS.
 *
 * **Decisão do fundador, 10/08/2026: Cliente usa a regra de empresa, não a
 * de pessoa.** Não é cópia do protótipo (que também usa esta regra, mas
 * protótipo é evidência, nunca motivo — §13) — é decisão com razão própria:
 * cliente de transportadora é quase sempre pessoa jurídica, e a regra de
 * empresa também funciona bem para pessoa física (duas letras, uma por
 * nome). A regra de "pessoa" (sempre as duas primeiras letras dos dois
 * primeiros nomes) é outra, reservada a `Usuario`, e as duas não podem ser
 * trocadas uma pela outra (mesma seção do documento).
 */
export function iniciaisEmpresa(nome: string): string {
  const p = String(nome || "").trim().split(/\s+/);
  const sigla = p[0] && p[0] === p[0].toUpperCase() && p[0].length <= 3;
  return (sigla ? p[0] : p.slice(0, 2).map((w) => w[0]).join("")).toUpperCase();
}
