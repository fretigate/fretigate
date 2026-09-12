"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoDono } from "@/lib/auth/acao";
import { atualizarConfiguracoes, type DadosConfiguracoes } from "@/lib/servicos/empresas";

/**
 * "Salvar" da tela Configurações (item 10, Tarefa 3). `comoDono` — mesmo
 * critério da Conta da empresa: pátio, prazo padrão e numeração mexem em
 * regra financeira da empresa, não cadastro do dia a dia.
 */

export type EstadoConfiguracoes = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoConfiguracoes {
  return { erros: { [campo]: mensagem } };
}

const schema = z.object({
  patioEndereco: z.string().trim(),
  prazoPadraoDias: z.string().trim(),
  proximoNumeroRelatorio: z.string().trim(),
});

export const atualizarConfiguracoesAction = comoDono(async (
  sessao,
  _estadoAnterior: EstadoConfiguracoes,
  formData: FormData,
): Promise<EstadoConfiguracoes> => {
  const bruto = {
    patioEndereco: String(formData.get("patioEndereco") ?? ""),
    prazoPadraoDias: String(formData.get("prazoPadraoDias") ?? ""),
    proximoNumeroRelatorio: String(formData.get("proximoNumeroRelatorio") ?? ""),
  };
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) return { erroGeral: "Não deu para salvar agora." };
  const dados = resultado.data;

  // `dados.prazoPadraoDias === ""` checado À PARTE de `Number.isFinite` —
  // `Number("")` é `0`, um valor válido de verdade (à vista, decisão do
  // fundador). Sem esta checagem, campo deixado em branco por engano
  // salvaria silenciosamente como "à vista" em vez de pedir para preencher.
  if (dados.prazoPadraoDias === "") {
    return erroDeCampo("prazoPadraoDias", "Diga o prazo padrão, em dias.");
  }
  const prazoPadraoDias = Number(dados.prazoPadraoDias);
  if (!Number.isFinite(prazoPadraoDias)) {
    return erroDeCampo("prazoPadraoDias", "Diga o prazo padrão, em dias.");
  }

  const proximoNumeroRelatorio = Number(dados.proximoNumeroRelatorio);
  if (!Number.isInteger(proximoNumeroRelatorio) || proximoNumeroRelatorio < 1) {
    return erroDeCampo("proximoNumeroRelatorio", "Diga o número do próximo relatório.");
  }

  const payload: DadosConfiguracoes = {
    patioEndereco: dados.patioEndereco,
    prazoPadraoDias,
    proximoNumeroRelatorio,
  };

  try {
    await atualizarConfiguracoes(sessao.empresaId, payload);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não deu para salvar agora.";
    // As duas mensagens que `atualizarConfiguracoes` escreve fazem sentido
    // presas a um campo específico — o resto (erro de conexão, etc.) vira
    // erro geral.
    if (mensagem.startsWith("O prazo padrão precisa estar")) {
      return erroDeCampo("prazoPadraoDias", mensagem);
    }
    if (mensagem.startsWith("O próximo número não pode ser menor")) {
      return erroDeCampo("proximoNumeroRelatorio", mensagem);
    }
    return { erroGeral: mensagem };
  }

  redirect("/configuracoes?salvo=1");
});
