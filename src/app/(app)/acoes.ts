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
 * Destino após sair: `/entrar` ainda não existe (próxima fatia da tarefa 8)
 * — vai para `/criar-conta`, a única porta pública que já existe.
 */
export async function sairDaConta() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/criar-conta");
}
