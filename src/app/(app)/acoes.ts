"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Sair da conta — nome do botão fixado em `docs/componentes.md` ("texto
 * destrutiva Sair da conta", nas telas Mais e Conta da empresa).
 *
 * `requireHeaders: true` no Better Auth: sem `headers()`, a rota não sabe
 * qual sessão apagar.
 *
 * Destino após sair: `/entrar` — docs/navegacao.md linha 51 (Entrar "Chega
 * de: Abrir o app sem sessão · Sair da conta").
 *
 * ⛔ EXCEÇÃO DECLARADA ao envelope `comoUsuario`/`comoDono`
 * (`docs/planos/auditoria-3-mecanismo-de-sessao.md`,
 * `tests/protecao-de-acoes.test.ts`): a sessão pode já ter vencido quando
 * esta ação roda — é o próprio `auth.api.signOut` quem trata sessão ausente.
 * Exigir sessão para poder sair dela seria a única ação que trava justamente
 * quem já perdeu acesso.
 */
export async function sairDaConta() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/entrar");
}
