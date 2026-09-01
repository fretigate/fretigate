"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoDono } from "@/lib/auth/acao";
import { cancelarConvite, convidarUsuario, reenviarConvite, removerAcesso } from "@/lib/servicos/usuarios";

/**
 * Usuários — item 10, Tarefa 4 (`docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 4"). Todas exigem
 * dono (decisão 1 do plano) — mesmo envelope de `conta/acoes.ts`.
 *
 * `criarConviteAction`/`reenviarConviteAction`/`cancelarConviteAction`
 * devolvem `{ok, ...}` em vez de usar `redirect`/`useFormState`: são
 * chamadas direto do client (`FormularioConvite.tsx`/`ListaUsuarios.tsx`),
 * nunca por `<form action>` — o mecanismo de abrir o WhatsApp precisa do
 * token de volta antes de decidir o que fazer (ver o comentário de
 * `FormularioConvite.tsx`).
 *
 * **Toda entrada validada por `zod`, achado do `/revisar`** — as quatro
 * ações chegaram sem schema, confiando só na validação interna do serviço
 * (que assume tipo string sem checar). `CLAUDE.md` §4: "toda entrada
 * validada no servidor, com schema" — mesmo padrão já usado em
 * `conta/acoes.ts` (`atualizarContaDaEmpresaAction`). O cliente ser
 * TypeScript não protege nada aqui: a Server Action é um endpoint de
 * verdade, e quem bate direto nele passa por cima do tipo do TypeScript.
 */

const schemaConvite = z.object({
  nome: z.string().trim().min(1, "Diga o nome da pessoa."),
  telefone: z.string().trim().min(1, "Diga o WhatsApp da pessoa."),
});

const schemaId = z.string().trim().min(1);

export type ConviteParaTela = {
  id: string;
  telefone: string;
  nome: string;
};

function paraTela(convite: { id: string; telefone: string; nome: string; token: string }) {
  return { id: convite.id, telefone: convite.telefone, nome: convite.nome, token: convite.token };
}

export const criarConviteAction = comoDono(async (
  sessao,
  dados: { nome: string; telefone: string },
): Promise<{ ok: true; convite: ConviteParaTela & { token: string } } | { ok: false; erro: string }> => {
  const validado = schemaConvite.safeParse(dados);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const convite = await convidarUsuario(sessao.empresaId, validado.data);
    return { ok: true, convite: paraTela(convite) };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para criar o convite agora." };
  }
});

export const reenviarConviteAction = comoDono(async (
  sessao,
  conviteId: string,
): Promise<{ ok: true; convite: ConviteParaTela & { token: string } } | { ok: false; erro: string }> => {
  const validado = schemaId.safeParse(conviteId);
  if (!validado.success) return { ok: false, erro: "Convite inválido." };

  try {
    const convite = await reenviarConvite(sessao.empresaId, validado.data);
    return { ok: true, convite: paraTela(convite) };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para reenviar agora." };
  }
});

export const cancelarConviteAction = comoDono(async (
  sessao,
  conviteId: string,
): Promise<{ ok: true } | { ok: false; erro: string }> => {
  const validado = schemaId.safeParse(conviteId);
  if (!validado.success) return { ok: false, erro: "Convite inválido." };

  try {
    await cancelarConvite(sessao.empresaId, validado.data);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para cancelar agora." };
  }
});

export const removerAcessoAction = comoDono(async (sessao, usuarioId: string) => {
  const validado = schemaId.safeParse(usuarioId);
  if (!validado.success) throw new Error("Usuário inválido.");

  await removerAcesso(sessao.empresaId, validado.data);
  redirect("/conta/usuarios");
});
