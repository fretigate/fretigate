import { db, emTransacao } from "@/lib/db";
import { buscarCliente } from "@/lib/servicos/clientes";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import { buscarTipoOperacao } from "@/lib/servicos/tipos-de-operacao";
import { resolverMunicipio } from "@/lib/servicos/municipios";

/** Só o suficiente para conferir `criado_por_usuario_id` (ver abaixo). */
function buscarUsuario(empresaId: string, id: string) {
  return db(empresaId).usuario.findUnique({
    where: { id },
    select: { id: true },
  });
}

/**
 * Servico (o frete): listar, buscar, criar, editar e arquivar — tudo por
 * `db(empresaId)`/`emTransacao(empresaId)`, a única porta de acesso a dados
 * (`CLAUDE.md` §3).
 */

export type DadosServico = {
  tipo_operacao_id: string;
  cliente_id: string;
  veiculo_id?: string | null;
  motorista_id?: string | null;
  data_servico: Date;
  origem_texto?: string | null;
  destino_texto?: string | null;
  carga_texto?: string | null;
  valor: number;
  /** Metros, não quilômetros — ver o comentário do model `Servico` no schema. */
  km?: number | null;
};

const CAMPOS = {
  id: true,
  numero: true,
  tipo_operacao_id: true,
  cliente_id: true,
  veiculo_id: true,
  motorista_id: true,
  data_servico: true,
  origem_texto: true,
  origem_municipio_id: true,
  destino_texto: true,
  destino_municipio_id: true,
  carga_texto: true,
  carga_categoria: true,
  valor: true,
  km: true,
  status_operacional: true,
  origem_lancamento: true,
  ordem_enviada_em: true,
  comprovante_url: true,
  criado_por_usuario_id: true,
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Obrigatórios: `cliente_id`, `valor`, `data_servico`, `tipo_operacao_id`
 * (`docs/especificacao.md`, entidade Servico). Nada mais trava o
 * lançamento — a meta é lançar em até 30 segundos (§3).
 *
 * **As quatro conferências de FK que o usuário escolhe** (`CLAUDE.md` §3,
 * achado na tarefa 7 do item 2): `cliente_id` e `tipo_operacao_id` sempre,
 * `veiculo_id`/`motorista_id` só quando preenchidos. Cada uma chama o
 * `buscar<Entidade>` já escopado por empresa — nulo = recusa. `usuarioId`
 * (`criado_por_usuario_id`) tem a MESMA regra, mas conferida à parte em
 * `criarServico`, porque não faz parte de `DadosServico` — não é escolha do
 * usuário, vem sempre da sessão, e só existe no caminho de criação.
 *
 * **Diferente do precedente de `veiculo_habitual_id`
 * (`src/lib/servicos/motoristas.ts`), as quatro daqui TAMBÉM recusam
 * arquivado.** Aquele precedente existe para um vínculo que já existia
 * continuar aparecendo na edição; aqui é sempre a criação de uma referência
 * NOVA — decisão do fundador, 11/08/2026.
 *
 * **Tipo de operação inativo é recusado.** `ativo` é escopo de produto —
 * "quais ramos estão ligados" (`docs/especificacao.md`, entidade
 * TipoOperacao) — e aceitar um inativo criaria frete de um ramo que a
 * empresa não opera. Decisão do fundador, 11/08/2026.
 *
 * **Resolução de município** — `resolverMunicipio` roda para
 * `origem_texto`/`destino_texto` quando preenchidos, e só grava
 * `*_municipio_id` quando a situação é `"resolvido"`. Ambíguo ou não
 * encontrado **nunca bloqueia o salvar** (`docs/especificacao.md` §6) — o
 * texto digitado é gravado do mesmo jeito.
 */
async function normalizarEntrada(empresaId: string, dados: DadosServico) {
  const cliente = await buscarCliente(empresaId, dados.cliente_id);
  if (!cliente || cliente.arquivado_em) throw new Error("Selecione um cliente válido.");

  const tipoOperacao = await buscarTipoOperacao(empresaId, dados.tipo_operacao_id);
  if (!tipoOperacao || tipoOperacao.arquivado_em || !tipoOperacao.ativo) {
    throw new Error("Selecione um tipo de operação válido.");
  }

  let veiculoId: string | null = null;
  if (dados.veiculo_id?.trim()) {
    const caminhao = await buscarCaminhao(empresaId, dados.veiculo_id);
    if (!caminhao || caminhao.arquivado_em) throw new Error("Selecione um caminhão válido.");
    veiculoId = caminhao.id;
  }

  let motoristaId: string | null = null;
  if (dados.motorista_id?.trim()) {
    const motorista = await buscarMotorista(empresaId, dados.motorista_id);
    if (!motorista || motorista.arquivado_em) {
      throw new Error("Selecione um motorista válido.");
    }
    motoristaId = motorista.id;
  }

  if (!dados.data_servico) throw new Error("Diga a data do frete.");
  // Recusa zero e negativo — decisão do fundador, 11/08/2026, reversível:
  // frete de cortesia (valor zero de propósito) é hipótese; valor zero por
  // engano de digitação é o caso provável, e viraria relatório com R$ 0
  // indo para o cliente.
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) {
    throw new Error("Diga o valor do frete.");
  }

  const origemTexto = dados.origem_texto?.trim() || null;
  const destinoTexto = dados.destino_texto?.trim() || null;

  const [origem, destino] = await Promise.all([
    origemTexto ? resolverMunicipio(empresaId, origemTexto) : null,
    destinoTexto ? resolverMunicipio(empresaId, destinoTexto) : null,
  ]);

  return {
    tipo_operacao_id: tipoOperacao.id,
    cliente_id: cliente.id,
    veiculo_id: veiculoId,
    motorista_id: motoristaId,
    data_servico: dados.data_servico,
    origem_texto: origemTexto,
    origem_municipio_id: origem?.situacao === "resolvido" ? origem.municipio.codigo_ibge : null,
    destino_texto: destinoTexto,
    destino_municipio_id:
      destino?.situacao === "resolvido" ? destino.municipio.codigo_ibge : null,
    carga_texto: dados.carga_texto?.trim() || null,
    valor: dados.valor,
    km: dados.km ?? null,
  };
}

/** Mais recente primeiro — mesma ordenação de `listarClientes`, mesmo motivo. */
export function listarServicos(empresaId: string) {
  return db(empresaId).servico.findMany({
    where: { arquivado_em: null },
    select: CAMPOS,
    orderBy: { criado_em: "desc" },
  });
}

export function buscarServico(empresaId: string, id: string) {
  return db(empresaId).servico.findUnique({ where: { id }, select: CAMPOS });
}

/**
 * `numero` sequencial por empresa, via o contador atômico
 * `Empresa.proximo_numero_servico` — nunca `MAX(numero)+1`, que teria
 * corrida sob concorrência. `{ increment: 1 }` vira `SET x = x + 1` no
 * Postgres, que serializa por linha: duas criações simultâneas da mesma
 * empresa nunca leem o mesmo valor. Roda dentro do `emTransacao` que também
 * grava o `Servico`, para o número reservado nunca ficar solto se a criação
 * falhar depois.
 *
 * `criado_por_usuario_id` vem de `usuarioId`, sempre da sessão autenticada —
 * nunca de `dados` (`docs/especificacao.md`, entidade Servico). Conferido
 * contra a empresa como as outras quatro referências (`CLAUDE.md` §3): o
 * Postgres não aplica RLS na checagem de chave estrangeira.
 */
export async function criarServico(
  empresaId: string,
  usuarioId: string,
  dados: DadosServico,
) {
  const usuario = await buscarUsuario(empresaId, usuarioId);
  if (!usuario) throw new Error("Sessão inválida.");

  const entrada = await normalizarEntrada(empresaId, dados);

  return emTransacao(empresaId, async (tx) => {
    const empresaAtualizada = await tx.empresa.update({
      where: { id: empresaId },
      data: { proximo_numero_servico: { increment: 1 } },
      select: { proximo_numero_servico: true },
    });
    const numero = empresaAtualizada.proximo_numero_servico - 1;

    return tx.servico.create({
      data: {
        ...entrada,
        numero,
        empresa_id: empresaId,
        criado_por_usuario_id: usuarioId,
      },
      select: CAMPOS,
    });
  });
}

export async function editarServico(
  empresaId: string,
  id: string,
  dados: DadosServico,
) {
  const entrada = await normalizarEntrada(empresaId, dados);
  return db(empresaId).servico.update({
    where: { id },
    data: entrada,
    select: CAMPOS,
  });
}

/** §7 — nada é apagado. */
export function arquivarServico(empresaId: string, id: string) {
  return db(empresaId).servico.update({
    where: { id },
    data: { arquivado_em: new Date() },
    select: CAMPOS,
  });
}
