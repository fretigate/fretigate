/**
 * Iniciais para o círculo de identificação — `docs/componentes.md`
 * § "Iniciais da empresa".
 *
 * Regra única, hoje usada no círculo do cartão de identidade (Mais) e na
 * linha de lista de Cliente e Motorista: se a primeira palavra já é uma
 * sigla em caixa alta de até 3 letras, ela **é** a inicial — senão, a
 * primeira letra das duas primeiras palavras. "AP Transportes" → AP, "JBS"
 * → JBS, "José Carlos" → JC.
 *
 * **Decisão do fundador, 10/08/2026: Cliente usa a regra de empresa, não a
 * de pessoa.** Não é cópia do protótipo (que também usa esta regra, mas
 * protótipo é evidência, nunca motivo — §13) — é decisão com razão própria:
 * cliente de transportadora é quase sempre pessoa jurídica, e a regra de
 * empresa também funciona bem para pessoa física (duas letras, uma por
 * nome). **Estendida a Motorista em 11/08/2026 (tarefa 7), mesma razão**: as
 * duas regras coincidem para nome de pessoa digitado normalmente, e divergem
 * só quando o nome vem todo em maiúsculas — caso em que esta regra lê a
 * primeira palavra como sigla ("EVA SOUZA" → "EVA", não "ES"). Consequência
 * aceita, não ausência de caso: motorista cadastrado assim mostra até três
 * letras em vez de duas. Não quebra nada, e não é motivo para criar a regra
 * de "pessoa" (sempre as duas primeiras letras dos dois primeiros nomes,
 * reservada a `Usuario`) agora — ela ainda não tem implementação nenhuma no
 * código, e criá-la para este caso seria código novo quase sempre para o
 * mesmo resultado (`CLAUDE.md` §6). As duas regras não podem ser trocadas
 * uma pela outra quando a de pessoa nascer de verdade (mesma seção do
 * documento).
 *
 * O nome da função é neutro de propósito — não é mais "só de empresa" desde
 * que Cliente passou a usá-la.
 */
export function iniciais(nome: string): string {
  const p = String(nome || "").trim().split(/\s+/);
  const sigla = p[0] && p[0] === p[0].toUpperCase() && p[0].length <= 3;
  return (sigla ? p[0] : p.slice(0, 2).map((w) => w[0]).join("")).toUpperCase();
}

/**
 * Regra de pessoa — item 10, Tarefa 4, primeiro consumidor real (Usuários —
 * lista, badge de cada pessoa nas linhas, ao lado do badge da empresa no
 * topo, que continua usando `iniciais()`). Sempre a primeira letra dos dois
 * primeiros nomes, sem a exceção de sigla que `iniciais()` tem — as duas
 * regras coincidem para nome digitado normalmente e divergem só quando o
 * primeiro nome tem até 3 letras e vem todo em maiúsculas ("ANA PAULA" →
 * `iniciais` lê "ANA" como sigla e devolve "ANA"; esta função devolve "AP").
 * Não podem ser trocadas uma pela outra (`docs/componentes.md`, "Iniciais da
 * empresa").
 */
export function iniciaisPessoa(nome: string): string {
  const p = String(nome || "").trim().split(/\s+/);
  return p
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
