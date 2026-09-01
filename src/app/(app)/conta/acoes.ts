"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoDono } from "@/lib/auth/acao";
import { atualizarContaDaEmpresa, type DadosContaDaEmpresa } from "@/lib/servicos/empresas";

/**
 * "Salvar dados" da tela Conta da empresa (item 10, Tarefa 2). `comoDono` —
 * decisão 1 do plano: razão social, CNPJ, chave Pix e o resto da identidade
 * da empresa são regra financeira, não cadastro comum. **Primeira ação de
 * servidor que usa `comoDono` de verdade** (`CLAUDE.md` §9: construído na
 * auditoria de segurança, nunca exercitado em tela real até esta tarefa).
 */

export type EstadoContaDaEmpresa = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoContaDaEmpresa {
  return { erros: { [campo]: mensagem } };
}

const schema = z.object({
  razaoSocial: z.string().trim(),
  cnpj: z.string().trim(),
  endereco: z.string().trim(),
  telefone: z.string().trim(),
  email: z.string().trim(),
  chavePix: z.string().trim(),
});

export const atualizarContaDaEmpresaAction = comoDono(async (
  sessao,
  _estadoAnterior: EstadoContaDaEmpresa,
  formData: FormData,
): Promise<EstadoContaDaEmpresa> => {
  const bruto = {
    razaoSocial: String(formData.get("razaoSocial") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    chavePix: String(formData.get("chavePix") ?? ""),
  };
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) return erroDeCampo("razaoSocial", "Não deu para salvar agora.");
  const dados = resultado.data;

  const payload: DadosContaDaEmpresa = {
    razaoSocial: dados.razaoSocial,
    cnpj: dados.cnpj,
    endereco: dados.endereco,
    telefone: dados.telefone,
    email: dados.email,
    chavePix: dados.chavePix,
  };

  try {
    await atualizarContaDaEmpresa(sessao.empresaId, payload);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não deu para salvar agora.";
    // "CNPJ inválido."/"Já existe uma conta com esse CNPJ." (`empresas.ts`)
    // são as duas mensagens escritas por este produto que fazem sentido
    // presas ao campo CNPJ — o resto (erro de conexão, etc.) vira erro geral.
    if (mensagem === "CNPJ inválido." || mensagem === "Já existe uma conta com esse CNPJ.") {
      return erroDeCampo("cnpj", mensagem);
    }
    return { erroGeral: mensagem };
  }

  redirect("/conta");
});
