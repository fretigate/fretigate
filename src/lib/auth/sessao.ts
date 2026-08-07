import { headers } from "next/headers";
import { auth } from "./index";

/**
 * Quem está falando com o servidor, e de que empresa.
 *
 * É daqui que sai o `empresa_id` de toda consulta do produto. O §3 diz a
 * frase inteira: *"`empresa_id` vem sempre da sessão autenticada no servidor.
 * **Nunca** de URL, formulário, header ou body."* Este arquivo é o lado
 * "sessão autenticada no servidor" dessa frase — e é por isso que nenhuma
 * função aqui recebe `empresa_id` como argumento. Não dá para passar o errado
 * porque não dá para passar nada.
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

/**
 * A sessão, ou `null`. Use quando a ausência é um caso normal — a tela de
 * entrada precisa saber se já tem alguém logado para não pedir login de novo.
 *
 * Quando a ausência é erro, use `exigirSessao`.
 */
export async function sessaoAtual(): Promise<Autenticado | null> {
  const sessao = await auth.api.getSession({ headers: await headers() });
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

/**
 * Exige sessão. Sem ela, levanta `SemSessao`.
 *
 * Quem chama decide o que fazer com o erro: rota de API devolve 401, tela
 * manda para a entrada (`docs/navegacao.md`: abrir o app sem sessão leva a
 * Entrar). Esta função não redireciona sozinha de propósito — redirecionar de
 * dentro de uma rota de API devolveria uma página HTML onde o cliente espera
 * uma resposta.
 */
export async function exigirSessao(): Promise<Autenticado> {
  const autenticado = await sessaoAtual();
  if (!autenticado) throw new SemSessao();
  return autenticado;
}

/**
 * Exige que seja o dono da empresa.
 *
 * `Usuario.papel` tem dois valores (§6 da especificação): `dono` e `operador`.
 * O que cada um pode fazer é decidido por tela, não aqui — esta função é o
 * mecanismo, e quem a chama é quem sabe se a ação é do dono.
 */
export async function exigirDono(): Promise<Autenticado> {
  const autenticado = await exigirSessao();
  if (autenticado.papel !== "dono") throw new SemPermissao("dono da empresa");
  return autenticado;
}
