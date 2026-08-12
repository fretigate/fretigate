import { db, emTransacao } from "@/lib/db";
import { buscarCliente, listarClientes } from "@/lib/servicos/clientes";
import { buscarCaminhao, listarCaminhoes } from "@/lib/servicos/caminhoes";
import { buscarMotorista, listarMotoristas } from "@/lib/servicos/motoristas";
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

/**
 * Leituras para a tela de lançamento (Tarefa 2) — `docs/especificacao.md`
 * §4.1. Ficam aqui, não em `clientes.ts`/`caminhoes.ts`/`motoristas.ts`,
 * porque a fonte é `Servico`, não a entidade em si.
 */

/**
 * Cliente/caminhão/motorista pré-preenchidos com o **último `Servico`
 * lançado pela empresa** — não por usuário (decisão do fundador,
 * `docs/planos/item-3-lancamento-frete.md`, Tarefa 2).
 */
export function buscarUltimoServico(empresaId: string) {
  return db(empresaId).servico.findFirst({
    where: { arquivado_em: null },
    orderBy: { criado_em: "desc" },
    select: {
      cliente_id: true,
      veiculo_id: true,
      motorista_id: true,
      origem_texto: true,
    },
  });
}

/**
 * A folha de busca lista "ordenada por uso mais recente" (`docs/
 * especificacao.md` §4.1), não por data de cadastro. Quem nunca entrou num
 * frete fica no fim, na ordem de `listarClientes` (mais recém-cadastrado
 * primeiro) — `Array.prototype.sort` é estável, então o empate preserva essa
 * ordem sem precisar de critério de desempate escrito à mão.
 */
export async function listarClientesPorUsoRecente(empresaId: string) {
  const [clientes, usos] = await Promise.all([
    listarClientes(empresaId),
    db(empresaId).servico.groupBy({
      by: ["cliente_id"],
      where: { arquivado_em: null },
      _max: { data_servico: true },
    }),
  ]);
  const ultimoUso = new Map(
    usos.map((u) => [u.cliente_id, u._max.data_servico?.getTime() ?? 0]),
  );
  return clientes
    .slice()
    .sort((a, b) => (ultimoUso.get(b.id) ?? 0) - (ultimoUso.get(a.id) ?? 0));
}

/** Mesma regra de `listarClientesPorUsoRecente`, para caminhão. */
export async function listarCaminhoesPorUsoRecente(empresaId: string) {
  const [caminhoes, usos] = await Promise.all([
    listarCaminhoes(empresaId),
    db(empresaId).servico.groupBy({
      by: ["veiculo_id"],
      where: { arquivado_em: null, veiculo_id: { not: null } },
      _max: { data_servico: true },
    }),
  ]);
  const ultimoUso = new Map(
    usos.map((u) => [u.veiculo_id, u._max.data_servico?.getTime() ?? 0]),
  );
  return caminhoes
    .slice()
    .sort((a, b) => (ultimoUso.get(b.id) ?? 0) - (ultimoUso.get(a.id) ?? 0));
}

/** Mesma regra de `listarClientesPorUsoRecente`, para motorista. */
export async function listarMotoristasPorUsoRecente(empresaId: string) {
  const [motoristas, usos] = await Promise.all([
    listarMotoristas(empresaId),
    db(empresaId).servico.groupBy({
      by: ["motorista_id"],
      where: { arquivado_em: null, motorista_id: { not: null } },
      _max: { data_servico: true },
    }),
  ]);
  const ultimoUso = new Map(
    usos.map((u) => [u.motorista_id, u._max.data_servico?.getTime() ?? 0]),
  );
  return motoristas
    .slice()
    .sort((a, b) => (ultimoUso.get(b.id) ?? 0) - (ultimoUso.get(a.id) ?? 0));
}

/**
 * Quantas linhas os chips de destino/carga mostram. Decisão do fundador,
 * revisão da Tarefa 2: cinco, igual `SUGESTOES` em
 * `src/lib/servicos/municipios.ts` — mesmo teto, mesmo motivo (cabe acima do
 * teclado aberto sem rolar).
 */
const CHIPS_DE_HISTORICO = 5;

/**
 * Chips de destino — "os destinos já usados **com aquele cliente**" (§4.1).
 * `distinct` junto de `orderBy` mantém a primeira linha (a mais recente) de
 * cada texto repetido, então o resultado já sai deduplicado por recência.
 */
export async function listarDestinosDoCliente(
  empresaId: string,
  clienteId: string,
): Promise<string[]> {
  const linhas = await db(empresaId).servico.findMany({
    where: { cliente_id: clienteId, arquivado_em: null, destino_texto: { not: null } },
    select: { destino_texto: true },
    distinct: ["destino_texto"],
    orderBy: { criado_em: "desc" },
    take: CHIPS_DE_HISTORICO,
  });
  return linhas.flatMap((l) => (l.destino_texto ? [l.destino_texto] : []));
}

/**
 * Chips de carga — "as cargas que o **próprio usuário** já digitou" (§4.1),
 * ou seja, o histórico da empresa inteira, não de um cliente. Mesma técnica
 * de `distinct` + `orderBy` de `listarDestinosDoCliente`.
 */
export async function listarCargasRecentes(empresaId: string): Promise<string[]> {
  const linhas = await db(empresaId).servico.findMany({
    where: { arquivado_em: null, carga_texto: { not: null } },
    select: { carga_texto: true },
    distinct: ["carga_texto"],
    orderBy: { criado_em: "desc" },
    take: CHIPS_DE_HISTORICO,
  });
  return linhas.flatMap((l) => (l.carga_texto ? [l.carga_texto] : []));
}

/**
 * A sugestão de valor — "Última vez neste trecho: R$ X" (§4.1). Casa por
 * cliente **e** o texto exato do destino; nunca preenche sozinho, só informa
 * o que existe para o toque do usuário confirmar.
 */
export async function buscarUltimoValorDoTrecho(
  empresaId: string,
  clienteId: string,
  destinoTexto: string,
): Promise<number | null> {
  const texto = destinoTexto.trim();
  if (!clienteId || !texto) return null;
  const servico = await db(empresaId).servico.findFirst({
    where: { cliente_id: clienteId, destino_texto: texto, arquivado_em: null },
    orderBy: { criado_em: "desc" },
    select: { valor: true },
  });
  return servico?.valor ?? null;
}
