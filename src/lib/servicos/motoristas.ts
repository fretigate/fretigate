import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { documentoValido, normalizarDocumento } from "@/lib/utils/documento";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";

/**
 * Motorista: listar, buscar, criar, editar e arquivar — tudo por
 * `db(empresaId)`, a única porta de acesso a dados (`CLAUDE.md` §3).
 */

export type DadosMotorista = {
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  veiculo_habitual_id?: string | null;
};

const CAMPOS = {
  id: true,
  nome: true,
  documento: true,
  telefone: true,
  veiculo_habitual_id: true,
  veiculo_habitual: { select: { id: true, apelido: true, placa: true, arquivado_em: true } },
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Só `nome` é obrigatório (`docs/especificacao.md`, entidade Motorista).
 * `documento` segue exatamente a mesma validação de `normalizarEntrada` em
 * `src/lib/servicos/clientes.ts` — mesmo formato, mesma normalização.
 *
 * `veiculo_habitual_id`, quando informado, precisa apontar para um caminhão
 * **desta empresa**. O Postgres não aplica RLS ao verificar a chave
 * estrangeira (`CLAUDE.md` §3) — sem esta conferência, o `INSERT`/`UPDATE`
 * gravaria sem erro o identificador de um caminhão de outra empresa.
 * `buscarCaminhao` já é `db(empresaId)`, então devolve nulo para qualquer
 * caminhão de outra empresa — mas **não** filtra arquivado, de propósito: um
 * caminhão arquivado depois de virar habitual continua sendo um caminhão
 * desta empresa, e precisa continuar aceito para o vínculo existente não
 * sumir na edição (`docs/planos/item-2-cadastros.md`, tarefa 7).
 */
async function normalizarEntrada(empresaId: string, dados: DadosMotorista) {
  const nome = dados.nome.trim();
  if (!nome) throw new Error("Diga o nome do motorista.");

  let documento: string | null = null;
  if (dados.documento?.trim()) {
    documento = normalizarDocumento(dados.documento);
    if (!documentoValido(documento)) {
      throw new Error("Documento inválido. Confira o CPF ou CNPJ.");
    }
  }

  let veiculoHabitualId: string | null = null;
  if (dados.veiculo_habitual_id?.trim()) {
    const caminhao = await buscarCaminhao(empresaId, dados.veiculo_habitual_id);
    if (!caminhao) throw new Error("Selecione um caminhão válido.");
    veiculoHabitualId = caminhao.id;
  }

  return {
    nome,
    documento,
    telefone: dados.telefone?.trim() || null,
    veiculo_habitual_id: veiculoHabitualId,
  };
}

/** `motorista_empresa_id_documento_key` — o índice parcial da migration. */
function ehDocumentoDuplicado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/** Mais recente primeiro — mesma ordenação de `listarClientes`, mesmo motivo. */
export function listarMotoristas(empresaId: string) {
  return db(empresaId).motorista.findMany({
    where: { arquivado_em: null },
    select: CAMPOS,
    orderBy: { criado_em: "desc" },
  });
}

export function buscarMotorista(empresaId: string, id: string) {
  return db(empresaId).motorista.findUnique({ where: { id }, select: CAMPOS });
}

/** Mesmo motivo de `buscarClientesPorIds` (`src/lib/servicos/clientes.ts`) — inclui arquivado. */
export function buscarMotoristasPorIds(empresaId: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return db(empresaId).motorista.findMany({
    where: { id: { in: ids } },
    select: { id: true, nome: true },
  });
}

export async function criarMotorista(empresaId: string, dados: DadosMotorista) {
  const entrada = await normalizarEntrada(empresaId, dados);
  try {
    return await db(empresaId).motorista.create({
      data: { ...entrada, empresa_id: empresaId },
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehDocumentoDuplicado(erro)) {
      throw new Error("Já existe um motorista com esse documento.");
    }
    throw erro;
  }
}

export async function editarMotorista(
  empresaId: string,
  id: string,
  dados: DadosMotorista,
) {
  const entrada = await normalizarEntrada(empresaId, dados);
  try {
    return await db(empresaId).motorista.update({
      where: { id },
      data: entrada,
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehDocumentoDuplicado(erro)) {
      throw new Error("Já existe um motorista com esse documento.");
    }
    throw erro;
  }
}

/** §7 — nada é apagado. Arquivar libera o `documento` para outro cadastro. */
export function arquivarMotorista(empresaId: string, id: string) {
  return db(empresaId).motorista.update({
    where: { id },
    data: { arquivado_em: new Date() },
    select: CAMPOS,
  });
}
