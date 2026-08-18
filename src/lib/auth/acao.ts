import { exigirDono, exigirSessao, type Autenticado } from "./sessao";

/**
 * O envelope de toda ação de servidor (`docs/planos/auditoria-3-mecanismo-de-sessao.md`).
 *
 * Antes: cada ação escrevia `const sessao = await exigirSessao();` à mão, na
 * primeira linha — e nada garantia que a linha continuasse ali. Com o
 * envelope, a ação nasce recebendo `sessao` como primeiro parâmetro: não tem
 * como esquecer a verificação porque não existe verificação para escrever.
 *
 * A escolha de qual envelope usar É a declaração de "esta ação exige dono" —
 * não existe lista separada dizendo quais ações são de dono.
 * `tests/protecao-de-acoes.test.ts` lê o código-fonte de toda ação de
 * servidor e confere que cada uma usa um dos dois, sem exceção fora da lista
 * aprovada.
 *
 * ⚠️ SÓ PROTEGE AÇÃO COM `"use server"` NO TOPO DO ARQUIVO. Ação com a
 * diretiva dentro do corpo da função (inline) não é vista por
 * `tests/protecao-de-acoes.test.ts` nem pelo `eslint.config.mjs` — passa
 * despercebida pelas duas travas. Se escrever uma assim, aplique
 * `comoUsuario`/`comoDono` por decisão própria; nada aqui vai avisar se
 * esquecer (`CLAUDE.md` §9, limitação conhecida).
 */

export function comoUsuario<A extends unknown[], R>(
  acao: (sessao: Autenticado, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const sessao = await exigirSessao();
    return acao(sessao, ...args);
  };
}

export function comoDono<A extends unknown[], R>(
  acao: (sessao: Autenticado, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const sessao = await exigirDono();
    return acao(sessao, ...args);
  };
}
