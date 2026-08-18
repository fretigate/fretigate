"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoUsuario } from "@/lib/auth/acao";
import {
  arquivarCliente as arquivarClienteServico,
  criarCliente,
  editarCliente,
  type DadosCliente,
} from "@/lib/servicos/clientes";

/**
 * Cadastro / edição de cliente — `docs/navegacao.md` linha 40: "Salvar →
 * volta para a lista (ou para o perfil, na edição) · Arquivar cliente".
 *
 * `municipio_id` não é campo de formulário — `endereco` é guardado como
 * texto livre, e `municipio_id` fica sempre nulo por enquanto (pendência
 * registrada em `docs/diario.md`, tarefa 5: `resolverMunicipio` casa por
 * nome exato, e endereço de cliente é texto completo, não nome de cidade).
 */

export type EstadoCliente = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoCliente {
  return { erros: { [campo]: mensagem } };
}

const schema = z.object({
  nome: z.string().trim(),
  documento: z.string().trim(),
  telefone: z.string().trim(),
  email: z.string().trim(),
  endereco: z.string().trim(),
  prazoPagamentoDias: z.string().trim(),
});

/**
 * Lê e valida o `FormData` comum aos dois formulários (novo e editar).
 * Retorna o erro pronto para devolver ao formulário, ou os dados prontos
 * para `criarCliente`/`editarCliente`.
 */
function lerFormulario(
  formData: FormData,
): { erro: EstadoCliente } | { dados: DadosCliente } {
  const bruto = {
    nome: String(formData.get("nome") ?? ""),
    documento: String(formData.get("documento") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    prazoPagamentoDias: String(formData.get("prazoPagamentoDias") ?? ""),
  };

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    return { erro: erroDeCampo("nome", "Diga o nome do cliente.") };
  }
  const dados = resultado.data;

  if (!dados.nome) {
    return { erro: erroDeCampo("nome", "Diga o nome do cliente.") };
  }

  let prazoPagamentoDias: number | null = null;
  if (dados.prazoPagamentoDias) {
    const numero = Number(dados.prazoPagamentoDias);
    if (!Number.isInteger(numero) || numero <= 0) {
      return {
        erro: erroDeCampo("prazoPagamentoDias", "Diga um número de dias válido."),
      };
    }
    prazoPagamentoDias = numero;
  }

  return {
    dados: {
      nome: dados.nome,
      documento: dados.documento || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      endereco: dados.endereco || null,
      prazo_pagamento_dias: prazoPagamentoDias,
    },
  };
}

export const criarClienteAction = comoUsuario(async (
  sessao,
  _estadoAnterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await criarCliente(sessao.empresaId, lido.dados);
  } catch (erro) {
    return { erroGeral: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  redirect("/clientes");
});

export const editarClienteAction = comoUsuario(async (
  sessao,
  id: string,
  _estadoAnterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await editarCliente(sessao.empresaId, id, lido.dados);
  } catch (erro) {
    return { erroGeral: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  redirect(`/clientes/${id}`);
});

export const arquivarClienteAction = comoUsuario(async (sessao, id: string) => {
  await arquivarClienteServico(sessao.empresaId, id);
  redirect("/clientes");
});
