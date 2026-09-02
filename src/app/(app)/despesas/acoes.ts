"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoUsuario } from "@/lib/auth/acao";
import {
  arquivarDespesa as arquivarDespesaServico,
  criarDespesa,
  editarDespesa,
  type DadosDespesa,
} from "@/lib/servicos/despesas";
import { instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";

/**
 * Cadastro / edição de despesa — `docs/navegacao.md` linha 47: "+ Nova →
 * cadastro (valor e data obrigatórios, vínculo opcional a caminhão)".
 */

export type EstadoDespesa = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoDespesa {
  return { erros: { [campo]: mensagem } };
}

const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  data: z.string().trim(),
  categoria: z.string().trim(),
  valorCentavos: z.string().trim(),
  descricao: z.string().trim(),
  veiculoId: z.string().trim(),
});

/** Lê e valida o `FormData` comum aos dois formulários (novo e editar). */
function lerFormulario(
  formData: FormData,
): { erro: EstadoDespesa } | { dados: DadosDespesa } {
  const bruto = {
    data: String(formData.get("data") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    valorCentavos: String(formData.get("valorCentavos") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    veiculoId: String(formData.get("veiculoId") ?? ""),
  };

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    return { erro: erroDeCampo("valorCentavos", "Diga o valor da despesa.") };
  }
  const dados = resultado.data;

  if (!REGEX_DIA.test(dados.data)) {
    return { erro: erroDeCampo("data", "Escolha a data da despesa.") };
  }

  const valor = Number(dados.valorCentavos);
  if (!Number.isInteger(valor) || valor <= 0) {
    return { erro: erroDeCampo("valorCentavos", "Diga o valor da despesa.") };
  }

  return {
    dados: {
      data: instanteDoDiaEmFortaleza(dados.data),
      categoria: dados.categoria || null,
      valor,
      descricao: dados.descricao || null,
      veiculo_id: dados.veiculoId || null,
    },
  };
}

export const criarDespesaAction = comoUsuario(async (
  sessao,
  _estadoAnterior: EstadoDespesa,
  formData: FormData,
): Promise<EstadoDespesa> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await criarDespesa(sessao.empresaId, lido.dados);
  } catch (erro) {
    return { erroGeral: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  redirect("/despesas");
});

export const editarDespesaAction = comoUsuario(async (
  sessao,
  id: string,
  _estadoAnterior: EstadoDespesa,
  formData: FormData,
): Promise<EstadoDespesa> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await editarDespesa(sessao.empresaId, id, lido.dados);
  } catch (erro) {
    return { erroGeral: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  redirect("/despesas");
});

export const arquivarDespesaAction = comoUsuario(async (sessao, id: string) => {
  await arquivarDespesaServico(sessao.empresaId, id);
  redirect("/despesas");
});
