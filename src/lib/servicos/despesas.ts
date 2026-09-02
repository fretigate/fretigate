import { db } from "@/lib/db";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import type { Periodo } from "@/lib/servicos/servicos";

/**
 * Despesa: listar, buscar, criar, editar e arquivar — tudo por
 * `db(empresaId)`, a única porta de acesso a dados (`CLAUDE.md` §3).
 *
 * `docs/especificacao.md` §4.8, §6; `docs/planos/item-11-despesas.md`.
 */

export type DadosDespesa = {
  data: Date;
  categoria?: string | null;
  valor: number;
  descricao?: string | null;
  /** Vínculo informativo a um caminhão desta empresa (ver `normalizarEntrada`). */
  veiculo_id?: string | null;
};

const CAMPOS = {
  id: true,
  data: true,
  categoria: true,
  valor: true,
  descricao: true,
  veiculo_id: true,
  veiculo: { select: { id: true, apelido: true, placa: true, arquivado_em: true } },
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Só `data` e `valor` são obrigatórios (`docs/especificacao.md` §4.8).
 *
 * `veiculo_id`, quando informado, precisa apontar para um caminhão **desta
 * empresa**. O Postgres não aplica RLS ao verificar a chave estrangeira
 * (`CLAUDE.md` §3) — sem esta conferência, o `INSERT`/`UPDATE` gravaria sem
 * erro o identificador de um caminhão de outra empresa. `buscarCaminhao` já
 * é `db(empresaId)`, então devolve nulo para qualquer caminhão de outra
 * empresa — mas **não** filtra arquivado, de propósito: um caminhão
 * arquivado depois de virar vínculo continua sendo um caminhão desta
 * empresa, e precisa continuar aceito para o vínculo existente não sumir na
 * edição (mesmo padrão de `Motorista.veiculo_habitual_id`,
 * `src/lib/servicos/motoristas.ts`).
 */
async function normalizarEntrada(empresaId: string, dados: DadosDespesa) {
  if (!(dados.valor > 0)) throw new Error("Diga o valor da despesa.");
  if (!dados.data) throw new Error("Diga a data da despesa.");
  // Despesa é registro de um fato que já aconteceu — nunca no futuro,
  // mesmo padrão de `Recebimento.data` (`registrarRecebimento`,
  // `src/lib/servicos/titulos.ts`). Diferente do frete, que pode ser
  // lançado para amanhã porque a ordem nasce antes da execução
  // (`CLAUDE.md` §1). Decisão do fundador, 01/09/2026 (`docs/planos/
  // item-11-despesas.md`).
  if (dados.data.getTime() > Date.now()) {
    throw new Error("Não dá para lançar uma despesa no futuro.");
  }

  let veiculoId: string | null = null;
  if (dados.veiculo_id?.trim()) {
    const caminhao = await buscarCaminhao(empresaId, dados.veiculo_id);
    if (!caminhao) throw new Error("Selecione um caminhão válido.");
    veiculoId = caminhao.id;
  }

  return {
    data: dados.data,
    categoria: dados.categoria?.trim() || null,
    valor: dados.valor,
    descricao: dados.descricao?.trim() || null,
    veiculo_id: veiculoId,
  };
}

/** Mais recente primeiro — mesma ordenação de `listarCaminhoes`. */
export function listarDespesas(
  empresaId: string,
  filtros?: { periodo?: Periodo; categoria?: string; limite?: number },
) {
  return db(empresaId).despesa.findMany({
    where: {
      arquivado_em: null,
      ...(filtros?.periodo
        ? { data: { gte: filtros.periodo.inicio, lte: filtros.periodo.fim } }
        : {}),
      ...(filtros?.categoria ? { categoria: filtros.categoria } : {}),
    },
    select: CAMPOS,
    orderBy: { data: "desc" },
    take: filtros?.limite,
  });
}

export function buscarDespesa(empresaId: string, id: string) {
  return db(empresaId).despesa.findUnique({ where: { id }, select: CAMPOS });
}

export async function criarDespesa(empresaId: string, dados: DadosDespesa) {
  const entrada = await normalizarEntrada(empresaId, dados);
  return db(empresaId).despesa.create({
    data: { ...entrada, empresa_id: empresaId },
    select: CAMPOS,
  });
}

export async function editarDespesa(empresaId: string, id: string, dados: DadosDespesa) {
  const entrada = await normalizarEntrada(empresaId, dados);
  return db(empresaId).despesa.update({
    where: { id },
    data: entrada,
    select: CAMPOS,
  });
}

/** §7 — nada é apagado. */
export function arquivarDespesa(empresaId: string, id: string) {
  return db(empresaId).despesa.update({
    where: { id },
    data: { arquivado_em: new Date() },
    select: CAMPOS,
  });
}
