import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { documentoValido, normalizarDocumento } from "@/lib/utils/documento";

/**
 * Cliente: listar, buscar, criar, editar e arquivar — tudo por `db(empresaId)`,
 * a única porta de acesso a dados (`CLAUDE.md` §3).
 */

export type DadosCliente = {
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  municipio_id?: number | null;
  prazo_pagamento_dias?: number | null;
  observacao?: string | null;
};

const CAMPOS = {
  id: true,
  nome: true,
  documento: true,
  telefone: true,
  email: true,
  endereco: true,
  municipio_id: true,
  prazo_pagamento_dias: true,
  observacao: true,
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Só `nome` é obrigatório (`docs/especificacao.md`, entidade Cliente). Um
 * cadastro rápido no meio do lançamento de frete não pode travar em campo
 * que ninguém tem à mão.
 *
 * `documento`: string vazia vira `null`, nunca `''` — vazio colide com
 * vazio no índice único, nulo não colide com nulo. Quando preenchido, passa
 * pela mesma validação de formato e dígito verificador do CPF/CNPJ da
 * Empresa.
 */
function normalizarEntrada(dados: DadosCliente) {
  const nome = dados.nome.trim();
  if (!nome) throw new Error("Diga o nome do cliente.");

  let documento: string | null = null;
  if (dados.documento?.trim()) {
    documento = normalizarDocumento(dados.documento);
    if (!documentoValido(documento)) {
      throw new Error("Documento inválido. Confira o CPF ou CNPJ.");
    }
  }

  return {
    nome,
    documento,
    telefone: dados.telefone?.trim() || null,
    email: dados.email?.trim() || null,
    endereco: dados.endereco?.trim() || null,
    municipio_id: dados.municipio_id ?? null,
    prazo_pagamento_dias: dados.prazo_pagamento_dias ?? null,
    observacao: dados.observacao?.trim() || null,
  };
}

/** `cliente_empresa_id_documento_key` — o índice parcial da migration. */
function ehDocumentoDuplicado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/**
 * Mais recente primeiro — a única das três ordenações da especificação
 * (§4.7) com fonte hoje. "Maior valor em aberto" e "maior valor total"
 * dependem de `Servico`/`TituloReceber`, que só nascem no item 3.
 *
 * Decisão do fundador, 09/08/2026 (revisão da tarefa 3): o chip de
 * ordenação da tela (tarefa 5) não nasce com uma alternativa só — ele
 * chega junto do item 3, com a segunda ordenação. Até lá a lista não tem
 * ordenação para escolher, só esta.
 */
export function listarClientes(empresaId: string) {
  return db(empresaId).cliente.findMany({
    where: { arquivado_em: null },
    select: CAMPOS,
    orderBy: { criado_em: "desc" },
  });
}

export function buscarCliente(empresaId: string, id: string) {
  return db(empresaId).cliente.findUnique({ where: { id }, select: CAMPOS });
}

export async function criarCliente(empresaId: string, dados: DadosCliente) {
  const entrada = normalizarEntrada(dados);
  try {
    return await db(empresaId).cliente.create({
      data: { ...entrada, empresa_id: empresaId },
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehDocumentoDuplicado(erro)) {
      throw new Error("Já existe um cliente com esse documento.");
    }
    throw erro;
  }
}

export async function editarCliente(
  empresaId: string,
  id: string,
  dados: DadosCliente,
) {
  const entrada = normalizarEntrada(dados);
  try {
    return await db(empresaId).cliente.update({
      where: { id },
      data: entrada,
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehDocumentoDuplicado(erro)) {
      throw new Error("Já existe um cliente com esse documento.");
    }
    throw erro;
  }
}

/** §7 — nada é apagado. Arquivar libera o `documento` para outro cadastro. */
export function arquivarCliente(empresaId: string, id: string) {
  return db(empresaId).cliente.update({
    where: { id },
    data: { arquivado_em: new Date() },
    select: CAMPOS,
  });
}
