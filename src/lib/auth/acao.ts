import { redirect } from "next/navigation";
import { exigirDono, exigirSessao, type Autenticado } from "./sessao";
import { buscarStatusAssinatura } from "@/lib/servicos/empresas";

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
 *
 * **O portão de escrita para assinatura vencida** (item 13, Tarefa 2,
 * `docs/planos/item-13-tarefa-2-portao-de-escrita.md`) — falha fechada,
 * mesma forma do `db()`: `comoUsuario`/`comoDono` bloqueiam por padrão
 * quando `status_assinatura` é `vencida`/`encerrada`, redirecionando para
 * `/assinatura-vencida` ANTES de chamar a ação embrulhada. Uma ação nova
 * nasce bloqueada sem precisar de nada além de usar um dos dois — é o
 * mesmo raciocínio do comentário acima aplicado a assinatura, não só a
 * papel. `inadimplente` **não** bloqueia — a Kiwify ainda está tentando
 * cobrar, e cortar acesso nesse intervalo tira a pessoa bem quando ela
 * ainda vai pagar.
 *
 * `comoUsuarioLeitura` é a exceção nomeada, para as poucas ações que só
 * leem mas existem dentro de um formulário (autocomplete, sugestão) e por
 * isso passam pelo mesmo envelope das de escrita — a lista fechada, por
 * igualdade exata, está em `tests/bloqueio-de-escrita.test.ts`. Não existe
 * `comoDonoLeitura`: nenhuma ação de dono é leitura hoje, e a camada só
 * nasce quando a primeira precisar dela (`CLAUDE.md` §6).
 *
 * `comoDonoSemPortao` (item 13, Tarefa 3, continuação) é a segunda exceção
 * nomeada — mesma ideia de `comoUsuarioLeitura`, mas para uma ação de
 * ESCRITA de dono que precisa funcionar mesmo com a assinatura vencida,
 * porque é o próprio caminho de sair desse estado (gerar o link de
 * checkout em `/planos`). Lista fechada em `tests/
 * bloqueio-de-escrita.test.ts`, mesmo padrão.
 */

async function bloqueadoParaEscrita(empresaId: string): Promise<boolean> {
  const status = await buscarStatusAssinatura(empresaId);
  return status === "vencida" || status === "encerrada";
}

export function comoUsuario<A extends unknown[], R>(
  acao: (sessao: Autenticado, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const sessao = await exigirSessao();
    if (await bloqueadoParaEscrita(sessao.empresaId)) redirect("/assinatura-vencida");
    return acao(sessao, ...args);
  };
}

/**
 * Igual a `comoUsuario`, sem o portão de escrita — exige sessão, nunca
 * bloqueia por assinatura vencida. Só para a lista fechada de ações que são
 * leitura de verdade (ver comentário acima); usar aqui por qualquer outro
 * motivo reabre o vazamento que o portão existe para fechar.
 */
export function comoUsuarioLeitura<A extends unknown[], R>(
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
    if (await bloqueadoParaEscrita(sessao.empresaId)) redirect("/assinatura-vencida");
    return acao(sessao, ...args);
  };
}

/**
 * Igual a `comoDono`, sem o portão de escrita — exige o dono, nunca bloqueia
 * por assinatura vencida. Mesmo raciocínio de `comoUsuarioLeitura` (acima),
 * espelhado para dono: existe uma lista fechada, pequena, de ações que
 * PRECISAM funcionar mesmo com a assinatura vencida, porque são o próprio
 * caminho de sair desse estado — usar `comoDono` aqui trancaria a porta de
 * saída (item 13, Tarefa 3, continuação, achado do `/revisar`, 18/09/2026:
 * a primeira versão de `gerarLinkDeCheckoutAction` chamava `exigirDono()`
 * à mão, contra `CLAUDE.md` §9, "toda ação de servidor usa o envelope...
 * nunca verificação escrita à mão" — corrigido para este envelope nomeado,
 * a mesma solução mais precisa que `comoUsuarioLeitura` já era para o caso
 * de usuário comum).
 *
 * A lista fechada de quem usa isto, por igualdade exata, está em
 * `tests/bloqueio-de-escrita.test.ts` — mesmo padrão de `comoUsuarioLeitura`.
 */
export function comoDonoSemPortao<A extends unknown[], R>(
  acao: (sessao: Autenticado, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const sessao = await exigirDono();
    return acao(sessao, ...args);
  };
}
