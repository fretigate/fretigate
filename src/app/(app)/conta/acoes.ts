"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoDono } from "@/lib/auth/acao";
import {
  atualizarContaEConfiguracoes,
  type DadosConfiguracoes,
  type DadosContaDaEmpresa,
} from "@/lib/servicos/empresas";

/**
 * "Salvar dados" da tela Conta da empresa (item 10, Tarefa 2 — `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`). `comoDono` — decisão 1 do
 * plano: razão social, CNPJ, chave Pix e o resto da identidade da empresa são
 * regra financeira, não cadastro comum. **Primeira ação de servidor que usa
 * `comoDono` de verdade** (`CLAUDE.md` §9: construído na auditoria de
 * segurança, nunca exercitado em tela real até esta tarefa).
 *
 * **Fundida com a antiga "Salvar configurações" em 12/09/2026** (`docs/planos/
 * fusao-configuracoes-e-conta-da-empresa.md`) — um formulário só, um botão
 * só, uma ação só: o fundador apontou que dois botões independentes na mesma
 * tela deixavam alguém salvar metade sem perceber. Os dois grupos de campo
 * continuam validados pelas mesmas regras de antes (CNPJ, faixa do prazo, o
 * "não pode ser menor" da numeração) — só a chamada ao banco virou uma
 * transação só (`atualizarContaEConfiguracoes`, `src/lib/servicos/
 * empresas.ts`): se qualquer um dos dois grupos falhar, o outro não fica
 * gravado sozinho.
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
  patioEndereco: z.string().trim(),
  prazoPadraoDias: z.string().trim(),
  proximoNumeroRelatorio: z.string().trim(),
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

  const payloadConta: DadosContaDaEmpresa = {
    razaoSocial: dados.razaoSocial,
    cnpj: dados.cnpj,
    endereco: dados.endereco,
    telefone: dados.telefone,
    email: dados.email,
    chavePix: dados.chavePix,
  };
  const payloadConfiguracoes: DadosConfiguracoes = {
    patioEndereco: dados.patioEndereco,
    prazoPadraoDias,
    proximoNumeroRelatorio,
  };

  try {
    await atualizarContaEConfiguracoes(sessao.empresaId, payloadConta, payloadConfiguracoes);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não deu para salvar agora.";
    // Mensagens que os dois serviços escrevem presas a um campo específico —
    // o resto (erro de conexão, etc.) vira erro geral. Lista somada da
    // fusão: as duas primeiras já existiam em `atualizarContaDaEmpresaAction`,
    // as duas últimas em `atualizarConfiguracoesAction`.
    if (mensagem === "CNPJ inválido." || mensagem === "Já existe uma conta com esse CNPJ.") {
      return erroDeCampo("cnpj", mensagem);
    }
    if (mensagem.startsWith("O prazo padrão precisa estar")) {
      return erroDeCampo("prazoPadraoDias", mensagem);
    }
    if (mensagem.startsWith("O próximo número não pode ser menor")) {
      return erroDeCampo("proximoNumeroRelatorio", mensagem);
    }
    return { erroGeral: mensagem };
  }

  redirect("/conta?salvo=1");
});
