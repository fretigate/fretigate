import { db } from "@/lib/db";
import type { TipoVeiculo } from "@/lib/generated/prisma/client";

/**
 * Caminhão: listar, buscar, criar, editar e arquivar — tudo por `db(empresaId)`,
 * a única porta de acesso a dados (`CLAUDE.md` §3).
 */

export type DadosCaminhao = {
  placa?: string | null;
  apelido?: string | null;
  tipo?: TipoVeiculo | null;
};

const CAMPOS = {
  id: true,
  placa: true,
  apelido: true,
  tipo: true,
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Só `apelido` **ou** `placa` é obrigatório (`docs/especificacao.md`,
 * entidade Veiculo) — os dois identificam o caminhão, e quem só sabe a placa
 * cadastra pela placa. Esta é a primeira das duas garantias; a segunda é o
 * `CHECK veiculo_apelido_ou_placa` da migration, para quem gravar por fora
 * deste serviço.
 */
function normalizarEntrada(dados: DadosCaminhao) {
  const placa = dados.placa?.trim() || null;
  const apelido = dados.apelido?.trim() || null;
  if (!placa && !apelido) {
    throw new Error("Diga a placa ou o apelido do caminhão.");
  }

  return {
    placa,
    apelido,
    tipo: dados.tipo ?? null,
  };
}

/** Mais recente primeiro — mesma ordenação de `listarClientes`, mesmo motivo. */
export function listarCaminhoes(empresaId: string) {
  return db(empresaId).veiculo.findMany({
    where: { arquivado_em: null },
    select: CAMPOS,
    orderBy: { criado_em: "desc" },
  });
}

export function buscarCaminhao(empresaId: string, id: string) {
  return db(empresaId).veiculo.findUnique({ where: { id }, select: CAMPOS });
}

export async function criarCaminhao(empresaId: string, dados: DadosCaminhao) {
  const entrada = normalizarEntrada(dados);
  return db(empresaId).veiculo.create({
    data: { ...entrada, empresa_id: empresaId },
    select: CAMPOS,
  });
}

export async function editarCaminhao(
  empresaId: string,
  id: string,
  dados: DadosCaminhao,
) {
  const entrada = normalizarEntrada(dados);
  return db(empresaId).veiculo.update({
    where: { id },
    data: entrada,
    select: CAMPOS,
  });
}

/** §7 — nada é apagado. */
export function arquivarCaminhao(empresaId: string, id: string) {
  return db(empresaId).veiculo.update({
    where: { id },
    data: { arquivado_em: new Date() },
    select: CAMPOS,
  });
}
