"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoUsuario } from "@/lib/auth/acao";
import {
  arquivarCaminhao as arquivarCaminhaoServico,
  criarCaminhao,
  editarCaminhao,
  type DadosCaminhao,
} from "@/lib/servicos/caminhoes";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";

/**
 * Cadastro / edição de caminhão — `docs/navegacao.md` linha 51: "Apelido +
 * placa + tipo (chip) → volta ao perfil · Arquivar em texto no fim".
 */

export type EstadoCaminhao = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoCaminhao {
  return { erros: { [campo]: mensagem } };
}

const VALORES_TIPO = TIPOS_VEICULO.map((t) => t.valor);

const schema = z.object({
  placa: z.string().trim(),
  apelido: z.string().trim(),
  tipo: z.string().trim(),
});

/** Lê e valida o `FormData` comum aos dois formulários (novo e editar). */
function lerFormulario(
  formData: FormData,
): { erro: EstadoCaminhao } | { dados: DadosCaminhao } {
  const bruto = {
    placa: String(formData.get("placa") ?? ""),
    apelido: String(formData.get("apelido") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
  };

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    return { erro: erroDeCampo("apelido", "Diga a placa ou o apelido do caminhão.") };
  }
  const dados = resultado.data;

  if (!dados.placa && !dados.apelido) {
    return { erro: erroDeCampo("apelido", "Diga a placa ou o apelido do caminhão.") };
  }

  if (dados.tipo && !VALORES_TIPO.includes(dados.tipo as (typeof VALORES_TIPO)[number])) {
    return { erro: erroDeCampo("tipo", "Tipo inválido.") };
  }

  return {
    dados: {
      placa: dados.placa || null,
      apelido: dados.apelido || null,
      tipo: (dados.tipo || null) as DadosCaminhao["tipo"],
    },
  };
}

export const criarCaminhaoAction = comoUsuario(async (
  sessao,
  _estadoAnterior: EstadoCaminhao,
  formData: FormData,
): Promise<EstadoCaminhao> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  let criado;
  try {
    criado = await criarCaminhao(sessao.empresaId, lido.dados);
  } catch (erro) {
    return { erroGeral: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  redirect(`/caminhoes/${criado.id}`);
});

export const editarCaminhaoAction = comoUsuario(async (
  sessao,
  id: string,
  _estadoAnterior: EstadoCaminhao,
  formData: FormData,
): Promise<EstadoCaminhao> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await editarCaminhao(sessao.empresaId, id, lido.dados);
  } catch (erro) {
    return { erroGeral: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  redirect(`/caminhoes/${id}`);
});

export const arquivarCaminhaoAction = comoUsuario(async (sessao, id: string) => {
  await arquivarCaminhaoServico(sessao.empresaId, id);
  redirect("/caminhoes");
});
