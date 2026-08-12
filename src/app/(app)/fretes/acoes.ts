"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirSessao } from "@/lib/auth/sessao";
import { criarCliente } from "@/lib/servicos/clientes";
import { criarCaminhao } from "@/lib/servicos/caminhoes";
import { criarMotorista } from "@/lib/servicos/motoristas";
import { buscarTipoOperacaoAtivo } from "@/lib/servicos/tipos-de-operacao";
import {
  buscarUltimoValorDoTrecho,
  criarServico,
  listarDestinosDoCliente,
} from "@/lib/servicos/servicos";
import { buscarMunicipios, type Municipio } from "@/lib/servicos/municipios";
import { nomeCaminhao, TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import type { TipoVeiculo } from "@/lib/generated/prisma/client";

const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Server actions da tela de Lançar frete
 * (`docs/planos/item-3-lancamento-frete.md`, Tarefa 2).
 *
 * `criarServicoAction` segue o padrão de `useActionState` + `FormData` do
 * resto do produto (`motoristas/acoes.ts`) — é o salvar principal, com
 * redirecionamento ao final.
 *
 * As outras quatro são chamadas diretas (não ligadas a um `<form>`): o
 * cadastro rápido e a sugestão de valor precisam do **resultado** na hora,
 * dentro da mesma tela, sem navegar — `useActionState` não serve para isso.
 */

export type EstadoServico = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoServico {
  return { erros: { [campo]: mensagem } };
}

const schema = z.object({
  clienteId: z.string().trim(),
  veiculoId: z.string().trim(),
  motoristaId: z.string().trim(),
  dataServico: z.string().trim(),
  origemTexto: z.string().trim(),
  destinoTexto: z.string().trim(),
  cargaTexto: z.string().trim(),
  valorCentavos: z.string().trim(),
  km: z.string().trim(),
});

function lerFormulario(formData: FormData): { erro: EstadoServico } | { dados: Parameters<typeof criarServico>[2] } {
  const bruto = {
    clienteId: String(formData.get("clienteId") ?? ""),
    veiculoId: String(formData.get("veiculoId") ?? ""),
    motoristaId: String(formData.get("motoristaId") ?? ""),
    dataServico: String(formData.get("dataServico") ?? ""),
    origemTexto: String(formData.get("origemTexto") ?? ""),
    destinoTexto: String(formData.get("destinoTexto") ?? ""),
    cargaTexto: String(formData.get("cargaTexto") ?? ""),
    valorCentavos: String(formData.get("valorCentavos") ?? ""),
    km: String(formData.get("km") ?? ""),
  };

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) return { erro: { erroGeral: "Não deu para salvar agora." } };
  const dados = resultado.data;

  if (!dados.clienteId) return { erro: erroDeCampo("clienteId", "Escolha um cliente.") };

  // "AAAA-MM-DD" no fuso de Fortaleza (`src/components/ui/FolhaDeCalendario.tsx`)
  // — nunca `new Date(texto)` direto, que leria o fuso de quem roda o
  // código (`CLAUDE.md` §7; achado do `/revisar` na Tarefa 2, ver
  // `src/lib/utils/data-fortaleza.ts`).
  if (!REGEX_DIA.test(dados.dataServico)) {
    return { erro: erroDeCampo("dataServico", "Diga a data do frete.") };
  }
  const data = instanteDoDiaEmFortaleza(dados.dataServico);

  const valor = Number(dados.valorCentavos);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { erro: erroDeCampo("valorCentavos", "Diga o valor do frete.") };
  }

  // Metros, inteiro (CLAUDE.md §7) — quem digita "850" (km) vê "850"; o
  // banco guarda 850000 (comentário do model `Servico` em
  // `prisma/schema.prisma`). Achado do `/revisar` na Tarefa 2: a versão
  // anterior gravava o número digitado sem converter.
  const kmDigitado = dados.km ? Number(dados.km) : null;
  const km = kmDigitado !== null && Number.isFinite(kmDigitado) ? kmDigitado * 1000 : null;

  return {
    dados: {
      tipo_operacao_id: "", // preenchido em criarServicoAction, depois de saber o ativo
      cliente_id: dados.clienteId,
      veiculo_id: dados.veiculoId || null,
      motorista_id: dados.motoristaId || null,
      data_servico: data,
      origem_texto: dados.origemTexto || null,
      destino_texto: dados.destinoTexto || null,
      carga_texto: dados.cargaTexto || null,
      valor,
      km,
    },
  };
}

/** Roteia a mensagem do serviço para o campo certo — o resto vira aviso geral. */
function erroDoServico(erro: unknown): EstadoServico {
  const mensagem = erro instanceof Error ? erro.message : "Não deu para salvar agora.";
  if (mensagem.includes("cliente")) return erroDeCampo("clienteId", mensagem);
  if (mensagem.includes("caminhão")) return erroDeCampo("veiculoId", mensagem);
  if (mensagem.includes("motorista")) return erroDeCampo("motoristaId", mensagem);
  if (mensagem.includes("valor")) return erroDeCampo("valorCentavos", mensagem);
  if (mensagem.includes("data")) return erroDeCampo("dataServico", mensagem);
  return { erroGeral: mensagem };
}

export async function criarServicoAction(
  _estadoAnterior: EstadoServico,
  formData: FormData,
): Promise<EstadoServico> {
  const sessao = await exigirSessao();
  const lido = lerFormulario(formData);
  if ("erro" in lido) return lido.erro;

  const tipoAtivo = await buscarTipoOperacaoAtivo(sessao.empresaId);
  if (!tipoAtivo) return { erroGeral: "Nenhum tipo de operação ativo. Fale com o suporte." };

  try {
    await criarServico(sessao.empresaId, sessao.usuarioId, {
      ...lido.dados,
      tipo_operacao_id: tipoAtivo.id,
    });
  } catch (erro) {
    return erroDoServico(erro);
  }

  redirect("/fretes");
}

export type ResultadoRapido =
  | { ok: true; item: { id: string; nome: string; apoio?: string } }
  | { ok: false; erro: string };

/**
 * Schemas do cadastro rápido — achado do `/revisar` na Tarefa 2: as três
 * ações abaixo repassavam o argumento do cliente direto ao serviço, sem
 * validar (`CLAUDE.md` §4: "Toda entrada validada no servidor, com
 * schema"). `prazoPagamentoDias` segue a mesma regra de
 * `src/app/(app)/clientes/acoes.ts`; `tipo` só aceita um dos valores do
 * inventário fechado de `TIPOS_VEICULO`.
 */
const TIPOS_VEICULO_VALORES = TIPOS_VEICULO.map((t) => t.valor) as [TipoVeiculo, ...TipoVeiculo[]];

const schemaClienteRapido = z.object({
  nome: z.string().trim().min(1),
  telefone: z.string().trim(),
  prazoPagamentoDias: z.number().int().positive().nullable(),
});

const schemaCaminhaoRapido = z.object({
  apelido: z.string().trim().min(1),
  placa: z.string().trim(),
  tipo: z.union([z.enum(TIPOS_VEICULO_VALORES), z.literal("")]),
});

const schemaMotoristaRapido = z.object({
  nome: z.string().trim().min(1),
  telefone: z.string().trim(),
});

export async function criarClienteRapidoAction(
  nome: string,
  telefone: string,
  prazoPagamentoDias: number | null,
): Promise<ResultadoRapido> {
  const sessao = await exigirSessao();
  const validado = schemaClienteRapido.safeParse({ nome, telefone, prazoPagamentoDias });
  if (!validado.success) return { ok: false, erro: "Diga um número de dias válido." };

  try {
    const cliente = await criarCliente(sessao.empresaId, {
      nome: validado.data.nome,
      telefone: validado.data.telefone || null,
      prazo_pagamento_dias: validado.data.prazoPagamentoDias,
    });
    return { ok: true, item: { id: cliente.id, nome: cliente.nome } };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para cadastrar agora." };
  }
}

export async function criarCaminhaoRapidoAction(
  apelido: string,
  placa: string,
  tipo: TipoVeiculo | "",
): Promise<ResultadoRapido> {
  const sessao = await exigirSessao();
  const validado = schemaCaminhaoRapido.safeParse({ apelido, placa, tipo });
  if (!validado.success) return { ok: false, erro: "Diga o apelido e um tipo válido." };

  try {
    const caminhao = await criarCaminhao(sessao.empresaId, {
      apelido: validado.data.apelido,
      placa: validado.data.placa || null,
      tipo: validado.data.tipo || null,
    });
    return {
      ok: true,
      item: { id: caminhao.id, nome: nomeCaminhao(caminhao), apoio: caminhao.placa ?? undefined },
    };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para cadastrar agora." };
  }
}

export async function criarMotoristaRapidoAction(
  nome: string,
  telefone: string,
): Promise<ResultadoRapido> {
  const sessao = await exigirSessao();
  const validado = schemaMotoristaRapido.safeParse({ nome, telefone });
  if (!validado.success) return { ok: false, erro: "Diga o nome do motorista." };

  try {
    const motorista = await criarMotorista(sessao.empresaId, {
      nome: validado.data.nome,
      telefone: validado.data.telefone || null,
    });
    return { ok: true, item: { id: motorista.id, nome: motorista.nome } };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não deu para cadastrar agora." };
  }
}

/** "Última vez neste trecho" — nunca preenche sozinho, só informa. */
export async function buscarSugestaoDeValorAction(
  clienteId: string,
  destinoTexto: string,
): Promise<number | null> {
  const sessao = await exigirSessao();
  if (!clienteId || !destinoTexto.trim()) return null;
  return buscarUltimoValorDoTrecho(sessao.empresaId, clienteId, destinoTexto);
}

/** Chips de destino — recarrega ao trocar de cliente. */
export async function listarDestinosDoClienteAction(clienteId: string): Promise<string[]> {
  const sessao = await exigirSessao();
  if (!clienteId) return [];
  return listarDestinosDoCliente(sessao.empresaId, clienteId);
}

/**
 * Sugestões de município enquanto digita o destino
 * (`docs/especificacao.md` §4.1) — nunca bloqueia o salvar, só ajuda a
 * escrever o texto de um jeito que `resolverMunicipio` reconhece depois.
 */
export async function buscarMunicipiosAction(termo: string): Promise<Municipio[]> {
  const sessao = await exigirSessao();
  return buscarMunicipios(sessao.empresaId, termo);
}
