import { headers } from "next/headers";
import {
  exigirDonoPorCabecalho,
  exigirSessaoPorCabecalho,
  sessaoPorCabecalho,
  SemPermissao,
  SemSessao,
  type Autenticado,
} from "./sessao-por-cabecalho";

/**
 * Quem está falando com o servidor, e de que empresa.
 *
 * É daqui que sai o `empresa_id` de toda consulta do produto. O §3 diz a
 * frase inteira: *"`empresa_id` vem sempre da sessão autenticada no servidor.
 * **Nunca** de URL, formulário, header ou body."* Este arquivo é o lado
 * "sessão autenticada no servidor" dessa frase — e é por isso que nenhuma
 * função aqui recebe `empresa_id` como argumento. Não dá para passar o errado
 * porque não dá para passar nada.
 *
 * ⚠️ AS TRÊS FUNÇÕES ABAIXO FICAM EM UMA LINHA DE VERDADE CADA — SÓ
 * `headers()` DO NEXT.JS, DELEGANDO PARA `sessao-por-cabecalho.ts`. Se algum
 * dia alguém acrescentar lógica aqui (uma checagem a mais, um `if`), este
 * arquivo volta a ser o lugar onde o problema se esconde: é exatamente o
 * motivo de a lógica de verdade ter saído daqui na tarefa 3 da auditoria
 * (`docs/planos/auditoria-3-mecanismo-de-sessao.md`) — para o `Headers` do
 * pedido real virar a única coisa que muda entre isto e o que
 * `tests/sessao-e-papel.test.ts` exercita. Lógica nova entra em
 * `sessao-por-cabecalho.ts`, nunca aqui.
 */

export type { Autenticado };
export { SemSessao, SemPermissao };

/**
 * A sessão, ou `null`. Use quando a ausência é um caso normal — a tela de
 * entrada precisa saber se já tem alguém logado para não pedir login de novo.
 *
 * Quando a ausência é erro, use `exigirSessao`.
 */
export async function sessaoAtual(): Promise<Autenticado | null> {
  return sessaoPorCabecalho(await headers());
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
  return exigirSessaoPorCabecalho(await headers());
}

/**
 * Exige que seja o dono da empresa.
 *
 * `Usuario.papel` tem dois valores (§6 da especificação): `dono` e `operador`.
 * O que cada um pode fazer é decidido por tela, não aqui — esta função é o
 * mecanismo, e quem a chama é quem sabe se a ação é do dono.
 */
export async function exigirDono(): Promise<Autenticado> {
  return exigirDonoPorCabecalho(await headers());
}
