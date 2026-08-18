import { auth } from "./index";

/**
 * O núcleo de verdade da sessão — cabeçalho explícito, não `next/headers`.
 *
 * ⛔ SÓ `src/lib/auth` PODE IMPORTAR ESTE ARQUIVO (`eslint.config.mjs`).
 *
 * Existe por um motivo: provar em teste que `exigirDono()` barra operador
 * exige uma sessão de verdade, com cookie de verdade — e `next/headers` só
 * funciona dentro de um pedido real, nunca dentro do Vitest
 * (`docs/planos/auditoria-3-mecanismo-de-sessao.md`, §4).
 *
 * ISTO NÃO FABRICA SESSÃO NENHUMA. `auth.api.getSession` continua exigindo um
 * cookie de sessão genuíno, assinado pelo Better Auth — o único jeito de
 * conseguir um é logar de verdade. A única diferença para `sessao.ts` é de
 * onde o `Headers` vem: lá é sempre o pedido real; aqui é quem chama que
 * entrega.
 *
 * `sessao.ts` é a única chamadora de produção, e sempre com o cabeçalho do
 * pedido — nunca com um cabeçalho construído à mão. A trava de importação
 * garante que nenhuma ação de servidor (`src/app/**`) alcança este arquivo
 * diretamente; só `tests/` tem a segunda exceção, porque `/tests` nunca
 * esteve no escopo da regra (mesmo motivo pelo qual `/tests` já pode SQL cru
 * — `CLAUDE.md` §3).
 */

/** O que o resto do produto precisa saber de quem está logado. E só isso. */
export type Autenticado = {
  usuarioId: string;
  empresaId: string;
  papel: "dono" | "operador";
  nome: string;
  email: string;
};

/** Não há sessão: ninguém entrou, ou a sessão venceu. */
export class SemSessao extends Error {
  constructor() {
    super("Sem sessão. É preciso entrar.");
    this.name = "SemSessao";
  }
}

/** Há sessão, mas a pessoa não tem o papel exigido pela ação. */
export class SemPermissao extends Error {
  constructor(exigido: string) {
    super(`Esta ação é do ${exigido}.`);
    this.name = "SemPermissao";
  }
}

/** A sessão, ou `null`, a partir de um `Headers` explícito. */
export async function sessaoPorCabecalho(
  cabecalhos: Headers,
): Promise<Autenticado | null> {
  const sessao = await auth.api.getSession({ headers: cabecalhos });
  if (!sessao) return null;

  const { user } = sessao;

  /**
   * Usuário arquivado não entra, mesmo com sessão válida no cookie.
   *
   * O §7 diz que nada é apagado: tirar alguém da empresa é preencher
   * `arquivado_em`. Sem esta verificação, quem foi removido continuaria
   * entrando até a sessão vencer sozinha — que é justamente o intervalo em que
   * ele mais tem motivo para entrar.
   */
  if (user.arquivado_em) return null;

  return {
    usuarioId: user.id,
    empresaId: user.empresa_id,
    papel: user.papel === "dono" ? "dono" : "operador",
    nome: user.name,
    email: user.email,
  };
}

/** Exige sessão a partir de um `Headers` explícito. Sem ela, `SemSessao`. */
export async function exigirSessaoPorCabecalho(
  cabecalhos: Headers,
): Promise<Autenticado> {
  const autenticado = await sessaoPorCabecalho(cabecalhos);
  if (!autenticado) throw new SemSessao();
  return autenticado;
}

/** Exige que seja o dono da empresa, a partir de um `Headers` explícito. */
export async function exigirDonoPorCabecalho(
  cabecalhos: Headers,
): Promise<Autenticado> {
  const autenticado = await exigirSessaoPorCabecalho(cabecalhos);
  if (autenticado.papel !== "dono") throw new SemPermissao("dono da empresa");
  return autenticado;
}
