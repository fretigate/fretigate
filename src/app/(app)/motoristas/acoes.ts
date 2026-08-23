"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { comoUsuario } from "@/lib/auth/acao";
import {
  arquivarMotorista as arquivarMotoristaServico,
  buscarMotorista,
  criarMotorista,
  editarMotorista,
  type DadosMotorista,
} from "@/lib/servicos/motoristas";
import { normalizarTelefone, type ResultadoSalvarTelefone } from "@/lib/utils/telefone";

/**
 * Cadastro / edição de motorista — `docs/navegacao.md` linha 42: volta ao
 * perfil na edição, para a lista no cadastro (mesmo padrão de Cliente).
 *
 * Documento inválido ou duplicado, e caminhão habitual inválido, aparecem
 * abaixo do próprio campo (`estado.erros`) — não como aviso genérico —
 * porque `normalizarEntrada`/`criarMotorista`/`editarMotorista`
 * (`src/lib/servicos/motoristas.ts`) lançam mensagens reconhecíveis que este
 * arquivo roteia para o campo certo.
 */

export type EstadoMotorista = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoMotorista {
  return { erros: { [campo]: mensagem } };
}

const schema = z.object({
  nome: z.string().trim(),
  documento: z.string().trim(),
  telefone: z.string().trim(),
  veiculoHabitualId: z.string().trim(),
});

/**
 * Lê e valida o `FormData` comum aos dois formulários (novo e editar).
 * Retorna o erro pronto para devolver ao formulário, ou os dados prontos
 * para `criarMotorista`/`editarMotorista`.
 */
function lerFormulario(
  formData: FormData,
): { erro: EstadoMotorista } | { dados: DadosMotorista } {
  const bruto = {
    nome: String(formData.get("nome") ?? ""),
    documento: String(formData.get("documento") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    veiculoHabitualId: String(formData.get("veiculoHabitualId") ?? ""),
  };

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    return { erro: erroDeCampo("nome", "Diga o nome do motorista.") };
  }
  const dados = resultado.data;

  if (!dados.nome) {
    return { erro: erroDeCampo("nome", "Diga o nome do motorista.") };
  }

  return {
    dados: {
      nome: dados.nome,
      documento: dados.documento || null,
      telefone: dados.telefone || null,
      veiculo_habitual_id: dados.veiculoHabitualId || null,
    },
  };
}

/**
 * Roteia o erro do serviço para o campo certo — documento (inválido ou
 * duplicado) e caminhão habitual (fora da empresa) têm mensagem própria e
 * reconhecível; qualquer outra vira aviso genérico.
 */
function erroDoServico(erro: unknown): EstadoMotorista {
  const mensagem = erro instanceof Error ? erro.message : "Não deu para salvar agora.";
  if (mensagem.includes("ocumento")) return erroDeCampo("documento", mensagem);
  if (mensagem === "Selecione um caminhão válido.") {
    return erroDeCampo("veiculoHabitualId", mensagem);
  }
  return { erroGeral: mensagem };
}

export const criarMotoristaAction = comoUsuario(async (
  sessao,
  _estadoAnterior: EstadoMotorista,
  formData: FormData,
): Promise<EstadoMotorista> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await criarMotorista(sessao.empresaId, lido.dados);
  } catch (erro) {
    return erroDoServico(erro);
  }

  redirect("/motoristas");
});

export const editarMotoristaAction = comoUsuario(async (
  sessao,
  id: string,
  _estadoAnterior: EstadoMotorista,
  formData: FormData,
): Promise<EstadoMotorista> => {
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  try {
    await editarMotorista(sessao.empresaId, id, lido.dados);
  } catch (erro) {
    return erroDoServico(erro);
  }

  redirect(`/motoristas/${id}`);
});

export const arquivarMotoristaAction = comoUsuario(async (sessao, id: string) => {
  await arquivarMotoristaServico(sessao.empresaId, id);
  redirect("/motoristas");
});

/** Mesmo raciocínio de `salvarTelefoneClienteAction` (`clientes/acoes.ts`). */
export const salvarTelefoneMotoristaAction = comoUsuario(async (
  sessao,
  id: string,
  telefone: string,
): Promise<ResultadoSalvarTelefone> => {
  const validado = normalizarTelefone(telefone);
  if (!validado.ok) return { ok: false, erro: validado.erro };

  const motorista = await buscarMotorista(sessao.empresaId, id);
  if (!motorista) return { ok: false, erro: "Motorista não encontrado." };

  try {
    await editarMotorista(sessao.empresaId, id, {
      nome: motorista.nome,
      documento: motorista.documento,
      telefone: telefone.trim(),
      veiculo_habitual_id: motorista.veiculo_habitual_id,
    });
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para salvar agora." };
  }

  return { ok: true };
});
