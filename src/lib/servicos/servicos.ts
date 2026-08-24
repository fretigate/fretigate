import { db, emTransacao } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
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

/**
 * Uma janela de tempo para os resumos dos perfis (Tarefa 6) — quem decide o
 * que "período" significa (mês corrente, últimos 30 dias, etc.) é a tela;
 * aqui é só o intervalo de instantes já resolvido.
 */
export type Periodo = { inicio: Date; fim: Date };

/**
 * Exportado porque `src/lib/servicos/titulos.ts` reusa a mesma seleção em
 * `listarServicosComSituacao`/`buscarServicoComTitulos` — que substituem
 * `listarServicos`/`buscarServico` nas telas do item 4 e precisam do mesmo
 * formato de linha, com a situação financeira derivada por cima.
 */
export const CAMPOS_SERVICO = {
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

/** O que `normalizarEntrada` precisa do frete atual, só na edição — ver o comentário abaixo. */
type ServicoAtualParaEdicao = {
  cliente_id: string;
  veiculo_id: string | null;
  motorista_id: string | null;
};

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
 * **Arquivado é recusado só quando o identificador MUDOU em relação ao que
 * já estava gravado** (`atual`, presente só na edição — item 4, tarefa 4).
 * Na criação (`atual` ausente) toda referência é sempre nova — `dados.X_id
 * !== atual?.X_id` já dá `true` sozinho, sem precisar de um `if` à parte —
 * então toda referência exige uma ativa, comportamento de sempre, sem
 * mudança. Na edição, manter o mesmo cliente/caminhão/motorista que o
 * frete já tinha continua aceito mesmo arquivado depois — mesmo espírito
 * do precedente de `veiculo_habitual_id` (`src/lib/servicos/
 * motoristas.ts`): sem isso, arquivar um cliente travaria a edição de TODO
 * frete antigo dele, mesmo para corrigir outro campo que não tem nada a
 * ver com o cliente. Trocar para uma referência diferente continua
 * exigindo uma ativa, igual à criação. Decisão do fundador, 22/08/2026
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 4).
 *
 * **Tipo de operação inativo é recusado, sempre — sem a exceção acima.**
 * `tipo_operacao_id` nunca é escolha do usuário (vem de
 * `buscarTipoOperacaoAtivo`, não de formulário), então nunca é "o mesmo que
 * já estava gravado" por coincidência — é sempre "o ativo agora". `ativo` é
 * escopo de produto — "quais ramos estão ligados" (`docs/especificacao.md`,
 * entidade TipoOperacao) — e aceitar um inativo criaria frete de um ramo
 * que a empresa não opera. Decisão do fundador, 11/08/2026.
 *
 * **Resolução de município** — roda de novo em toda edição, mesmo que o
 * texto não tenha mudado desde a última vez; decisão do fundador,
 * 22/08/2026 (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 4):
 * `resolverMunicipio` é função pura contra uma tabela fixa (a base do
 * IBGE), então texto igual sempre resolve igual — um desvio "só resolve se
 * o texto mudou" não mudaria nenhum resultado, só acrescentaria
 * complexidade. `resolverMunicipio` roda para `origem_texto`/
 * `destino_texto` quando preenchidos, e só grava `*_municipio_id` quando a
 * situação é `"resolvido"`. Ambíguo ou não encontrado **nunca bloqueia o
 * salvar** (`docs/especificacao.md` §6) — o texto digitado é gravado do
 * mesmo jeito.
 */
async function normalizarEntrada(
  empresaId: string,
  dados: DadosServico,
  atual?: ServicoAtualParaEdicao,
) {
  const cliente = await buscarCliente(empresaId, dados.cliente_id);
  if (!cliente) throw new Error("Selecione um cliente válido.");
  if (cliente.arquivado_em && dados.cliente_id !== atual?.cliente_id) {
    throw new Error("Selecione um cliente válido.");
  }

  const tipoOperacao = await buscarTipoOperacao(empresaId, dados.tipo_operacao_id);
  if (!tipoOperacao || tipoOperacao.arquivado_em || !tipoOperacao.ativo) {
    throw new Error("Selecione um tipo de operação válido.");
  }

  let veiculoId: string | null = null;
  if (dados.veiculo_id?.trim()) {
    const caminhao = await buscarCaminhao(empresaId, dados.veiculo_id);
    if (!caminhao) throw new Error("Selecione um caminhão válido.");
    if (caminhao.arquivado_em && dados.veiculo_id !== atual?.veiculo_id) {
      throw new Error("Selecione um caminhão válido.");
    }
    veiculoId = caminhao.id;
  }

  let motoristaId: string | null = null;
  if (dados.motorista_id?.trim()) {
    const motorista = await buscarMotorista(empresaId, dados.motorista_id);
    if (!motorista) throw new Error("Selecione um motorista válido.");
    if (motorista.arquivado_em && dados.motorista_id !== atual?.motorista_id) {
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
    select: CAMPOS_SERVICO,
    orderBy: { criado_em: "desc" },
  });
}

export function buscarServico(empresaId: string, id: string) {
  return db(empresaId).servico.findUnique({ where: { id }, select: CAMPOS_SERVICO });
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
      select: CAMPOS_SERVICO,
    });
  });
}

/**
 * Lançada quando `condicaoDeGravacao` (abaixo) não bate no exato momento do
 * `UPDATE` — nunca por uma checagem separada de antemão. Quem chama decide o
 * que essa recusa significa (`src/lib/servicos/titulos.ts`,
 * `editarServicoComProtecaoDeTitulo`); este arquivo não sabe.
 */
export class CondicaoDeGravacaoFalhouError extends Error {}

/**
 * `atual` (só `cliente_id`/`veiculo_id`/`motorista_id`, não o frete
 * inteiro) é o que `normalizarEntrada` precisa para aceitar uma referência
 * arquivada que o frete já tinha antes — ver o comentário lá em cima.
 *
 * **Frete arquivado é recusado, mesma mensagem de "não encontrado".**
 * `docs/especificacao.md` §7: arquivar não apaga, mas também não é convite
 * para continuar editando por fora da tela (que já dá 404 —
 * `fretes/[id]/editar/page.tsx`) — achado do `/revisar` na Tarefa 4.
 *
 * **`condicaoDeGravacao` (opcional) é uma condição extra, escrita pelo
 * CHAMADOR, que entra no MESMO `WHERE` do `UPDATE` — nunca numa consulta
 * antes dele.** É a diferença entre travar de verdade e recriar a mesma
 * corrida um nível abaixo: se a condição fosse um `SELECT` separado, algo
 * concorrente entre o `SELECT` e o `UPDATE` passaria batido — dentro do
 * próprio `UPDATE`, o banco resolve as duas coisas (a condição e a
 * gravação) na mesma instrução, sem janela entre "checar" e "gravar".
 * `editarServicoComProtecaoDeTitulo` (`src/lib/servicos/titulos.ts`) é quem
 * usa isto — este arquivo continua sem saber o que é um título
 * (`CLAUDE.md` §6, cada domínio no seu arquivo). Achado do `/revisar` na
 * Tarefa 4, decisão do fundador, 22/08/2026.
 */
export async function editarServico(
  empresaId: string,
  id: string,
  dados: DadosServico,
  condicaoDeGravacao?: Prisma.ServicoWhereInput,
) {
  const atual = await db(empresaId).servico.findUnique({
    where: { id },
    select: { cliente_id: true, veiculo_id: true, motorista_id: true, arquivado_em: true },
  });
  if (!atual || atual.arquivado_em) throw new Error("Frete não encontrado.");

  const entrada = await normalizarEntrada(empresaId, dados, atual);

  if (!condicaoDeGravacao) {
    return db(empresaId).servico.update({
      where: { id },
      data: entrada,
      select: CAMPOS_SERVICO,
    });
  }

  const resultado = await db(empresaId).servico.updateMany({
    where: { id, ...condicaoDeGravacao },
    data: entrada,
  });
  if (resultado.count === 0) throw new CondicaoDeGravacaoFalhouError();

  const atualizado = await buscarServico(empresaId, id);
  if (!atualizado) throw new Error("Frete não encontrado.");
  return atualizado;
}

/** §7 — nada é apagado. */
export function arquivarServico(empresaId: string, id: string) {
  return db(empresaId).servico.update({
    where: { id },
    data: { arquivado_em: new Date() },
    select: CAMPOS_SERVICO,
  });
}

/**
 * "Enviei", no aviso de confirmação de envio da ordem (item 5, Tarefa 2) —
 * grava `ordem_enviada_em = now()`. Confere posse via `buscarServico`, mesmo
 * padrão do resto do arquivo. **Idempotente**: tocar "Enviei" de novo
 * (reabrindo o aviso por engano) só atualiza o mesmo timestamp, não é erro —
 * decisão do fundador (`docs/planos/item-5-ordem-de-servico.md`, Tarefa 2).
 */
export async function marcarOrdemEnviada(empresaId: string, id: string) {
  const servico = await buscarServico(empresaId, id);
  if (!servico || servico.arquivado_em) throw new Error("Frete não encontrado.");

  return db(empresaId).servico.update({
    where: { id },
    data: { ordem_enviada_em: new Date() },
    select: CAMPOS_SERVICO,
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
 * Quantas linhas os chips de destino/carga mostram — e, desde a Tarefa 1 do
 * item 4, o teto de exibição do histórico dos perfis
 * (`src/lib/servicos/titulos.ts`, `historicoPorEntidade`). Decisão do
 * fundador, revisão da Tarefa 2 do item 3: cinco, igual `SUGESTOES` em
 * `src/lib/servicos/municipios.ts` — mesmo teto, mesmo motivo (cabe acima do
 * teclado aberto sem rolar). Exportado para não duplicar o número.
 */
export const CHIPS_DE_HISTORICO = 5;

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

/**
 * Leituras para os perfis de cliente/caminhão/motorista (Tarefa 6,
 * `docs/planos/item-4-lista-e-detalhe-do-frete.md`) — construídas na Tarefa 1
 * porque carregam o risco de cálculo errado, mesmo raciocínio de
 * `situacaoFinanceira` em `src/lib/servicos/titulos.ts`.
 */

/**
 * Km e R$/km do caminhão no período — `docs/especificacao.md` §4.7: "exibidos
 * só quando houver km preenchido".
 *
 * **`kmPeriodoMetros` sai em metros, inteiro — nunca quilômetros.**
 * `CLAUDE.md` §7: "distância em metros, inteiro" vale para toda distância
 * guardada OU somada, não só para o campo `Servico.km` isolado; a exceção
 * de métrica calculada na exibição é só para `rsPorKm`, que é **razão**
 * (não poderia ser inteira sem perder informação) — uma soma de distâncias
 * continua sendo distância. Decisão do fundador, 20/08/2026, depois de eu
 * ter estendido a exceção para cobrir `kmPeriodo` em quilômetros também:
 * float em quilômetros na camada de dados criaria uma segunda unidade
 * convivendo com `Servico.km` em metros — o mesmo problema que motivou
 * `Servico.km` nascer em metros no item 3, para não conviver com
 * `distancia_m`. A tela (Tarefa 6) converte para quilômetros na exibição.
 *
 * **Frete cancelado (`status_operacional`) não conta.** Decisão do fundador,
 * 20/08/2026, registrada em `docs/especificacao.md` §7: ele não vai acontecer, e
 * somar em já rodado/km/R$/km infla o número que decide preço. Continua
 * aparecendo na lista e no histórico (`listarServicosComSituacao`,
 * `historicoPorEntidade`) — sai das somas, não das telas.
 *
 * **Numerador e denominador vêm do MESMO conjunto de fretes** — os que têm
 * km preenchido. Achado do `/revisar` na Tarefa 1 (20/08/2026): a primeira
 * versão somava o valor de TODOS os fretes do período e dividia pelo km só
 * dos que tinham km, inflando o R$/km sempre que algum frete do período
 * ficava sem km — a mesma classe de engano de número incompleto exibido como
 * completo (`CLAUDE.md` §8, `docs/especificacao.md` §8 regra 10). `null`
 * quando nenhum frete do período tem km.
 *
 * **O filtro é `km: { gt: 0 }`, não `km: { not: null }`** — achado do
 * quinto `/revisar`: com `not: null`, um frete com `km = 0` entraria no
 * numerador (`valor`) sem contribuir nada ao denominador, a MESMA inflação
 * que a nota acima já corrige para "sem km preenchido" — só que disfarçada,
 * porque o frete tecnicamente "tem km" (não é nulo). `gt: 0` garante que
 * todo frete contado contribui distância de verdade. Na prática não
 * deveria aparecer (não existe frete real com distância zero), mas o filtro
 * certo não depende disso ser sempre verdade.
 *
 * `fretesComKm`/`fretesNoPeriodo` existem para a Tarefa 6 poder cumprir a
 * mesma regra 10 quando a cobertura for parcial (nem todo frete do período
 * tem km) — achado do segundo `/revisar`: sem esses dois números, a tela não
 * tem como saber que o R$/km não cobre o período inteiro.
 *
 * `rsPorKm` é métrica calculada na exibição, nunca gravada — não é
 * "dinheiro" no sentido do `CLAUDE.md` §7 (que fala de valor *guardado*),
 * por isso sai como float, não como centavos inteiros. **Sai em reais, não
 * centavos** — achado do quarto `/revisar`: `valorComKm` é centavos, e
 * dividir por km sem converter devolveria centavos-por-km (ex.:
 * `133333,33`), não os `R$133,33/km` que todo comentário e teste deste
 * arquivo já esperava. O `/100` é a conversão para reais, feita aqui e só
 * aqui — nunca antes, nunca na tela.
 */
export async function resumoDoCaminhao(
  empresaId: string,
  veiculoId: string,
  periodo: Periodo,
) {
  const baseWhere = {
    veiculo_id: veiculoId,
    arquivado_em: null,
    status_operacional: { not: "cancelado" as const },
    data_servico: { gte: periodo.inicio, lte: periodo.fim },
  };
  const [comKm, fretesNoPeriodo] = await Promise.all([
    db(empresaId).servico.aggregate({
      where: { ...baseWhere, km: { gt: 0 } },
      _sum: { valor: true, km: true },
      _count: true,
    }),
    db(empresaId).servico.count({ where: baseWhere }),
  ]);
  const kmTotalMetros = comKm._sum.km ?? 0;
  if (kmTotalMetros <= 0) {
    return { kmPeriodoMetros: null, rsPorKm: null, fretesComKm: 0, fretesNoPeriodo };
  }
  const valorComKm = comKm._sum.valor ?? 0;
  const kmPeriodoKm = kmTotalMetros / 1000;
  return {
    kmPeriodoMetros: kmTotalMetros,
    rsPorKm: valorComKm / 100 / kmPeriodoKm,
    fretesComKm: comKm._count,
    fretesNoPeriodo,
  };
}

/**
 * Fretes e valor transportado do motorista no período. Rótulo "valor
 * transportado", não "valor rodado" — decisão do fundador no plano: o
 * dinheiro é do dono, não remuneração do motorista.
 *
 * Frete cancelado não conta — mesmo raciocínio de `resumoDoCaminhao`: um
 * frete cancelado não vai acontecer (diferente de `em_andamento`, que
 * conta — a tese do produto é o frete nascer na ordem, `CLAUDE.md` §1), e
 * contá-lo infla a contagem e o valor.
 */
export async function resumoDoMotorista(
  empresaId: string,
  motoristaId: string,
  periodo: Periodo,
) {
  const agregado = await db(empresaId).servico.aggregate({
    where: {
      motorista_id: motoristaId,
      arquivado_em: null,
      status_operacional: { not: "cancelado" },
      data_servico: { gte: periodo.inicio, lte: periodo.fim },
    },
    _sum: { valor: true },
    _count: true,
  });
  return {
    fretesNoPeriodo: agregado._count,
    valorTransportadoNoPeriodo: agregado._sum.valor ?? 0,
  };
}

/**
 * Leituras para o critério de ordenação das listas de cadastro (Tarefa 5,
 * `docs/planos/item-4-lista-e-detalhe-do-frete.md`) — `docs/especificacao.md`
 * §4.7. Mesmo filtro-base das somas acima (`resumoFinanceiroDoCliente.
 * jaRodado`, `resumoDoMotorista`): `arquivado_em: null`,
 * `status_operacional: { not: "cancelado" }` — frete cancelado fora,
 * `em_andamento` dentro. **Sem período** — é o total da vida do cadastro,
 * não do perfil (que tem filtro de período); `docs/especificacao.md` §4.7
 * nunca menciona período para esta ordenação.
 *
 * **O risco central desta tarefa:** o número que ordena a lista e o número
 * que o resumo do perfil (Tarefa 1/6) mostra são o MESMO cálculo visto de
 * dois lugares — `tests/servicos.test.ts` prova que os dois batem
 * exatamente para o mesmo cadastro, não só que cada função roda sem erro.
 *
 * **Cada uma é uma consulta só, para a empresa inteira** — nunca um
 * `groupBy`/resumo chamado por item da lista. O N+1 aqui é estruturalmente
 * impossível, não apenas testado como ausente: não existe laço nenhum entre
 * a leitura e o resultado, a própria consulta já é a leitura completa.
 */
export async function valoresTotaisPorCliente(
  empresaId: string,
): Promise<Map<string, number>> {
  const linhas = await db(empresaId).servico.groupBy({
    by: ["cliente_id"],
    where: { arquivado_em: null, status_operacional: { not: "cancelado" } },
    _sum: { valor: true },
  });
  return new Map(linhas.map((l) => [l.cliente_id, l._sum.valor ?? 0]));
}

type EstatisticasDeFretes = { fretes: number; valorTransportadoCentavos: number };

/**
 * Compartilhado por `estatisticasPorCaminhao`/`estatisticasPorMotorista` —
 * diferem só no campo de agrupamento. Duas cópias quase idênticas do mesmo
 * `groupBy` seriam a mesma duplicação que `ChipFiltro` já evita para o chip
 * de ordenação, só que em serviço em vez de componente.
 */
async function estatisticasDeFretesPor(
  empresaId: string,
  campo: "veiculo_id" | "motorista_id",
): Promise<Map<string, EstatisticasDeFretes>> {
  const linhas = await db(empresaId).servico.groupBy({
    by: [campo],
    where: { arquivado_em: null, status_operacional: { not: "cancelado" } },
    _count: true,
    _sum: { valor: true },
  });
  const mapa = new Map<string, EstatisticasDeFretes>();
  for (const linha of linhas) {
    const id = linha[campo];
    if (!id) continue; // frete sem caminhão/motorista definido
    mapa.set(id, { fretes: linha._count, valorTransportadoCentavos: linha._sum.valor ?? 0 });
  }
  return mapa;
}

export function estatisticasPorCaminhao(empresaId: string) {
  return estatisticasDeFretesPor(empresaId, "veiculo_id");
}

export function estatisticasPorMotorista(empresaId: string) {
  return estatisticasDeFretesPor(empresaId, "motorista_id");
}
