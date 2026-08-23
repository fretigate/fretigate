import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  buscarServico,
  CAMPOS_SERVICO,
  CHIPS_DE_HISTORICO,
  CondicaoDeGravacaoFalhouError,
  editarServico,
  type DadosServico,
  type Periodo,
} from "@/lib/servicos/servicos";

/**
 * TituloReceber: criar (via "Já recebi") e buscar por serviço — tudo por
 * `db(empresaId)`, a única porta de acesso a dados (`CLAUDE.md` §3).
 *
 * Sem primitivo genérico "criar título com qualquer status/data": a versão
 * anterior tinha um `criarTituloReceber` exportado, para "o item 6 também
 * usar" — achado do `/revisar`, `CLAUDE.md` §6 ("nada de arquivo para
 * depois... sem abstração especulativa"), já que o único chamador real era
 * `criarTituloJaRecebi`. Quando o item 6 (título automático via relatório)
 * existir, ele ganha a própria função — com as regras que aquele caso pedir,
 * não as que este adivinhou.
 */

const CAMPOS = {
  id: true,
  servico_id: true,
  cliente_id: true,
  valor: true,
  valor_recebido: true,
  vencimento: true,
  forma_pagamento_prevista: true,
  status: true,
  data_pagamento: true,
  forma_pagamento: true,
  relatorio_id: true,
  integral: true,
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Um título por frete — não existe hoje caminho de estorno, então um segundo
 * título para o mesmo `servico_id` só pode ser engano (toque duplicado que
 * escapou do `carregando`, ou o aviso reaberto por navegação/recarga antes
 * do parâmetro sumir da URL). Cobre qualquer status, não só `pago`.
 */
export function buscarTituloPorServico(empresaId: string, servicoId: string) {
  return db(empresaId).tituloReceber.findFirst({
    where: { servico_id: servicoId, arquivado_em: null },
    select: CAMPOS,
  });
}

/** `titulo_receber_um_integral_por_servico` — o índice único parcial da migration. */
function ehTituloIntegralDuplicado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/**
 * "Já recebi" (`docs/planos/item-3-lancamento-frete.md`, Tarefa 3): cria um
 * `TituloReceber` já pago e **integral** (cobre o frete inteiro —
 * `docs/especificacao.md`, entidade TituloReceber), com `cliente_id` e
 * `valor` derivados do próprio `Servico` — nunca de input do usuário, pela
 * mesma razão de `criado_por_usuario_id` nunca vir do formulário.
 *
 * **Só uma conferência de FK aqui, não duas** (`CLAUDE.md` §3): `servico_id`
 * é o único identificador que chega de fora, então é o único que precisa de
 * `buscarServico` escopado por empresa. `cliente_id` nunca é escolhido —
 * vem de `servico.cliente_id`, que já foi conferido contra a empresa quando
 * o próprio `Servico` foi criado (`criarServico`, `src/lib/servicos/
 * servicos.ts`) e não muda por fora de `editarServico` (que confere de
 * novo). Conferir de novo aqui checaria uma invariante que já é garantida
 * em outro lugar, não uma entrada nova.
 *
 * **A recusa de um segundo título tem duas camadas.** `buscarTituloPorServico`
 * é o caminho rápido — cobre o caso comum e dá o erro certo sem round-trip
 * extra. Quem garante de verdade é o índice único parcial
 * (`titulo_receber_um_integral_por_servico`, migration
 * `20260814150000_titulo_integral_unico_por_frete`): sob concorrência real
 * (duas abas, ou o aviso reaberto exatamente na janela de corrida), os dois
 * pedidos podem passar pela checagem acima antes de qualquer `INSERT`
 * terminar — é o banco, não este `if`, que recusa o segundo, e
 * `ehTituloIntegralDuplicado` traduz esse erro para a mesma mensagem.
 *
 * `data_pagamento` é o instante do toque (`new Date()`), não um dia
 * escolhido em calendário — não passa por `instanteDoDiaEmFortaleza`, que é
 * só para "AAAA-MM-DD" digitado. `vencimento`, `forma_pagamento_prevista`,
 * `forma_pagamento` e `relatorio_id` ficam nulos: ninguém pergunta isso
 * nesta tela.
 */
export async function criarTituloJaRecebi(empresaId: string, servicoId: string) {
  const servico = await buscarServico(empresaId, servicoId);
  if (!servico || servico.arquivado_em) throw new Error("Selecione um frete válido.");

  const existente = await buscarTituloPorServico(empresaId, servicoId);
  if (existente) throw new Error("Este frete já tem título lançado.");

  try {
    return await db(empresaId).tituloReceber.create({
      data: {
        servico_id: servico.id,
        cliente_id: servico.cliente_id,
        valor: servico.valor,
        valor_recebido: servico.valor,
        status: "pago",
        integral: true,
        data_pagamento: new Date(),
        empresa_id: empresaId,
      },
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehTituloIntegralDuplicado(erro)) {
      throw new Error("Este frete já tem título lançado.");
    }
    throw erro;
  }
}

/**
 * Frete com título ativo trava `valor` e `cliente_id` na edição
 * (`docs/especificacao.md` §8, item 12) — os dois campos que o título
 * copiou do frete ao nascer (`criarTituloJaRecebi`, acima) e nunca mais
 * sincroniza. Deixar os dois livres permitiria o frete mostrar um valor e
 * o título registrar outro, sem nada acusar a diferença.
 *
 * **A trava é do `UPDATE`, não de uma consulta antes dele** — achado do
 * `/revisar` na Tarefa 4: uma primeira versão fazia `buscarTituloPorServico`
 * e só DEPOIS chamava `editarServico`; um "Já recebi" concorrente entre as
 * duas chamadas criava o título com o valor antigo e a edição em andamento
 * trocava o valor por cima, sem nada acusar — a mesma corrida que a trava
 * existe para fechar, só que um nível abaixo. Agora a condição
 * (`condicaoDeGravacao`, `editarServico`, `src/lib/servicos/servicos.ts`) vai
 * dentro do próprio `UPDATE`: OU o frete não muda `cliente_id`/`valor`, OU
 * não existe título ativo NO INSTANTE da gravação — o banco resolve as duas
 * coisas na mesma instrução, sem janela entre "checar" e "gravar".
 *
 * **A janela que sobra, por escrito — para quem investigar um dia saber
 * onde olhar, não como "risco aceito" genérico.** `criarTituloJaRecebi` lê
 * `servico.valor` (`buscarServico`) ANTES de gravar o título. Sequência
 * exata que produz a divergência: (1) "Já recebi" lê `servico.valor` = 100;
 * (2) esta função grava `valor` = 200 nesta mesma janela — passa, porque
 * ainda não existe título nenhum no banco; (3) o `INSERT` de
 * `criarTituloJaRecebi` completa, gravando `valor: 100` — o que foi lido no
 * passo 1, não o que está no banco agora. Fechar isso por completo exigiria
 * travar a MESMA linha do frete também dentro de `criarTituloJaRecebi`
 * (item 3, já em produção) — fora do escopo desta tarefa. Decisão do
 * fundador, 22/08/2026 (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
 * Tarefa 4): fecha só o lado da edição agora; item 3 fica para quando essa
 * janela justificar o custo de mexer em código já em produção.
 *
 * **"Ativo" é o mesmo critério do §7 — verificado sobre TODOS os títulos do
 * frete, não o primeiro que aparecer.** `titulos_receber: { none: {...} } }`
 * é "nenhum título, na relação inteira, está ativo" — não arquivado e
 * `status !== "cancelado"`. Achado do `/revisar`: a primeira versão usava
 * `buscarTituloPorServico` (devolve só um título) para decidir "ativo", e um
 * frete com dois títulos (um cancelado, um ativo) podia destravar por
 * examinar o cancelado — a regra escrita já dizia "todos"; o código olhava
 * um só. Mesma classe do achado que corrigiu o `/onde-paramos`
 * (`.claude/commands/onde-paramos.md`, "Por que 20, e não 1." — checar só
 * um item de uma coleção quando a regra vale para todos ela): recorrente o
 * bastante, em dinheiro ou confiabilidade de operação, para valer nomear e
 * procurar de propósito na próxima vez (`CLAUDE.md` §2).
 *
 * **Só os dois campos que o título copiou entram na condição.** Os outros
 * sete (caminhão, motorista, data, origem, destino, carga, km) não têm
 * reflexo em `TituloReceber` — a condição só se aplica quando `cliente_id`/
 * `valor` estão mudando; os demais continuam livres mesmo com título ativo.
 *
 * **Não substitui a trava da tela.** A tela desabilita os dois campos
 * quando há título ativo, mas essa é só a primeira camada — sem esta
 * função, um pedido formado por fora do formulário passaria do mesmo jeito.
 */
export async function editarServicoComProtecaoDeTitulo(
  empresaId: string,
  servicoId: string,
  dados: DadosServico,
) {
  const semTituloAtivo: Prisma.ServicoWhereInput = {
    titulos_receber: { none: { arquivado_em: null, status: { not: "cancelado" } } },
  };
  const condicaoDeGravacao: Prisma.ServicoWhereInput = {
    OR: [{ cliente_id: dados.cliente_id, valor: dados.valor }, semTituloAtivo],
  };

  try {
    return await editarServico(empresaId, servicoId, dados, condicaoDeGravacao);
  } catch (erro) {
    if (!(erro instanceof CondicaoDeGravacaoFalhouError)) throw erro;

    // A garantia já aconteceu no UPDATE, dentro de editarServico — esta
    // leitura só escolhe a mensagem certa para mostrar, depois que a trava
    // já bloqueou a gravação (nunca antes dela).
    const atual = await buscarServico(empresaId, servicoId);
    if (!atual) throw new Error("Frete não encontrado.");
    if (dados.cliente_id !== atual.cliente_id) {
      throw new Error(
        "Frete já recebido: não é possível trocar o cliente. Estorne o título para corrigir.",
      );
    }
    throw new Error(
      "Frete já recebido: não é possível alterar o valor. Estorne o título para corrigir.",
    );
  }
}

/**
 * Situação financeira — DERIVADA, nunca armazenada (`docs/especificacao.md`
 * §7, `CLAUDE.md` §9). Função pura, sem acesso a banco: testada isoladamente
 * é mais barato e mais preciso que montar cenário no Postgres para cada
 * combinação (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 1).
 */
export type TituloParaSituacao = {
  status: "aberto" | "pago" | "cancelado";
  valor_recebido: number | null;
  arquivado_em: Date | null;
};

export type SituacaoFinanceira = "a_faturar" | "faturado" | "parcial" | "quitado";

/**
 * **A ordem importa** — achado do `/revisar` em 20/08/2026: a primeira
 * redação checava "existe título não pago" antes de "algum dinheiro entrou",
 * e por isso "parcial" nunca era alcançado. Título ativo = não arquivado e
 * `status !== "cancelado"` — um cancelado não conta para nada, mesmo
 * raciocínio de um arquivado.
 */
export function situacaoFinanceira(titulos: TituloParaSituacao[]): SituacaoFinanceira {
  const ativos = titulos.filter((t) => t.arquivado_em === null && t.status !== "cancelado");

  if (ativos.length === 0) return "a_faturar";
  if (ativos.every((t) => t.status === "pago")) return "quitado";

  const algumDinheiroEntrou = ativos.some(
    (t) => t.status === "pago" || (t.valor_recebido ?? 0) > 0,
  );
  return algumDinheiroEntrou ? "parcial" : "faturado";
}

const CAMPOS_PARA_SITUACAO = {
  servico_id: true,
  status: true,
  valor_recebido: true,
  arquivado_em: true,
} as const;

/**
 * Anexa `situacao_financeira` a uma lista de serviços já carregada —
 * **uma consulta só**, não uma por frete: todos os títulos daqueles serviços
 * de uma vez (`servico_id IN (...)`), agrupados em memória. Uma lista de 50
 * fretes buscando título um a um seria 50 idas ao banco — a esteira já
 * mostrou o que pressão de conexão faz aqui (`docs/diario.md`, 18-20/08/2026).
 *
 * Compartilhado por `listarServicosComSituacao` e pelos históricos dos
 * perfis (`historicoPorEntidade`, abaixo) — os dois precisam da mesma coisa,
 * só a origem da lista de serviços muda.
 */
async function comSituacaoEmLote<T extends { id: string }>(
  empresaId: string,
  servicos: T[],
): Promise<(T & { situacao_financeira: SituacaoFinanceira })[]> {
  if (servicos.length === 0) return [];

  const titulos = await db(empresaId).tituloReceber.findMany({
    where: { servico_id: { in: servicos.map((s) => s.id) } },
    select: CAMPOS_PARA_SITUACAO,
  });

  const porServico = new Map<string, TituloParaSituacao[]>();
  for (const t of titulos) {
    const lista = porServico.get(t.servico_id) ?? [];
    lista.push(t);
    porServico.set(t.servico_id, lista);
  }

  return servicos.map((s) => ({
    ...s,
    situacao_financeira: situacaoFinanceira(porServico.get(s.id) ?? []),
  }));
}

/**
 * Substitui `listarServicos` na tela "Meus fretes" (Tarefa 2).
 *
 * **`periodo` é o único filtro que vira consulta nova ao servidor.**
 * Cliente e situação são filtrados no cliente, sobre o que já está
 * carregado — decisão do fundador registrada no plano do item 4, Tarefa 2:
 * "trocar Período dispara nova consulta ao servidor, não um filtro em cima
 * do que já veio". Por isso só `periodo` (e `limite`, para o teto de 50 por
 * padrão) chegam aqui; cliente/situação ficam por conta da tela.
 *
 * **Ordena por `data_servico`, não por `criado_em`** — mesmo critério de
 * `historicoPorEntidade` (abaixo), pela mesma razão: "Meus fretes" agrupa
 * por dia do frete (quando aconteceu), não por quando foi lançado no
 * sistema. Achado do terceiro `/revisar`: a primeira versão desta função
 * ficou com `criado_em desc`, e só `historicoPorEntidade` foi corrigida —
 * a própria docstring dela já afirmava (incorretamente) que as duas
 * concordavam. `criado_em desc` desempata no mesmo dia.
 */
export async function listarServicosComSituacao(
  empresaId: string,
  filtros?: { periodo?: Periodo; limite?: number },
) {
  const servicos = await db(empresaId).servico.findMany({
    where: {
      arquivado_em: null,
      ...(filtros?.periodo
        ? { data_servico: { gte: filtros.periodo.inicio, lte: filtros.periodo.fim } }
        : {}),
    },
    select: CAMPOS_SERVICO,
    orderBy: [{ data_servico: "desc" }, { criado_em: "desc" }],
    take: filtros?.limite,
  });
  return comSituacaoEmLote(empresaId, servicos);
}

/** O `Servico` do detalhe (Tarefa 3) mais os títulos associados (hoje, no máximo um). */
export async function buscarServicoComTitulos(empresaId: string, id: string) {
  const [servico, titulos] = await Promise.all([
    buscarServico(empresaId, id),
    db(empresaId).tituloReceber.findMany({
      where: { servico_id: id, arquivado_em: null },
      select: CAMPOS,
      orderBy: { criado_em: "asc" },
    }),
  ]);
  if (!servico) return null;

  return { ...servico, titulos, situacao_financeira: situacaoFinanceira(titulos) };
}

/**
 * Resumo do cliente (Tarefa 6) — **dois números, não quatro**: já rodado
 * (soma de `Servico.valor` no período) e recebido no período (soma de
 * `valor_recebido` com `data_pagamento` no período). Sem "a receber" nem
 * "vencido" nesta fatia: os dois dependem de título em aberto, e até o item 6
 * existir o único jeito de um título nascer é "Já recebi", que já cria pago —
 * um número que só pode ser zero é dado incompleto disfarçado de completo
 * (`CLAUDE.md` §8, `docs/especificacao.md` §4.7).
 *
 * Título cancelado não conta para "recebido" — mesmo raciocínio de
 * `situacaoFinanceira`. Frete cancelado (`status_operacional`) não conta
 * para "já rodado" — decisão do fundador, 20/08/2026, `docs/especificacao.md`
 * §7: ele não vai acontecer (`em_andamento` conta — a tese do produto é o
 * frete nascer na ordem), e continua na lista/histórico do perfil, só não
 * entra na soma.
 *
 * **`recebidoNoPeriodo` NÃO exclui título de frete cancelado** (só título
 * com `status = "cancelado"` — regra já existente, acima) — e isto é
 * intencional, não lacuna: cancelamento afeta o que foi **operado**, não o
 * que foi **recebido**. Se o cliente pagou antes do frete ser cancelado,
 * esse dinheiro entrou de verdade — é fato, independente do frete depois
 * virar cancelado. Decisão do fundador, 20/08/2026, confirmada no segundo
 * `/revisar` (o achado perguntava se as duas somas deveriam ser
 * simétricas; a resposta é que não, por natureza — uma é sobre operação,
 * a outra é sobre caixa).
 */
export async function resumoFinanceiroDoCliente(
  empresaId: string,
  clienteId: string,
  periodo: Periodo,
) {
  const [jaRodado, recebido] = await Promise.all([
    db(empresaId).servico.aggregate({
      where: {
        cliente_id: clienteId,
        arquivado_em: null,
        status_operacional: { not: "cancelado" },
        data_servico: { gte: periodo.inicio, lte: periodo.fim },
      },
      _sum: { valor: true },
    }),
    db(empresaId).tituloReceber.aggregate({
      where: {
        cliente_id: clienteId,
        arquivado_em: null,
        status: { not: "cancelado" },
        data_pagamento: { gte: periodo.inicio, lte: periodo.fim },
      },
      _sum: { valor_recebido: true },
    }),
  ]);

  return {
    jaRodado: jaRodado._sum.valor ?? 0,
    recebidoNoPeriodo: recebido._sum.valor_recebido ?? 0,
  };
}

/**
 * Histórico de um perfil (Tarefa 6): os `CHIPS_DE_HISTORICO` (5) mais
 * recentes **dentro do período** do resumo, com a situação financeira de
 * cada um. Toda linha de frete no produto mostra a etiqueta de situação
 * (lista, detalhe); o histórico do perfil não seria exceção — decisão do
 * fundador, 20/08/2026, registrada em
 * `docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 1.
 *
 * **Segue o período do resumo** — decisão do fundador, achado do segundo
 * `/revisar` da Tarefa 6 (22/08/2026): chip dizendo "Mês passado" com o
 * histórico mostrando frete de hoje é contradição dentro da MESMA tela
 * (diferente do risco lista-contra-perfil, que são duas telas — mitigado
 * com um qualificador no `apoio` da lista). "Filtrou, a tela responde." O
 * rótulo "Ver todos os N" (ainda não construído nesta fatia) também passa
 * a valer sobre o período, não a vida inteira do cadastro.
 *
 * **`totalGeral`** — contagem **sem** o filtro de período, só para os dois
 * estados vazios distinguirem "nunca lançou frete nenhum" de "não tem frete
 * neste período" (decisão do fundador: são textos diferentes). Uma
 * consulta a mais, sempre O(1), nunca por linha.
 *
 * **Ordena por `data_servico`, não por `criado_em`** — achado do segundo
 * `/revisar` da Tarefa 2: a lista "Meus fretes" agrupa por `data_servico`, e
 * um histórico ordenado por outro critério divergiria dela para qualquer
 * frete lançado como ordem futura ou dias depois de acontecer. Decisão do
 * fundador, 20/08/2026: "o que interessa é quando o frete aconteceu, não
 * quando foi digitado". `criado_em desc` desempata no mesmo dia, para ordem
 * estável.
 *
 * Três consultas fixas (serviços · contagem no período · contagem geral),
 * nunca uma por linha.
 */
async function historicoPorEntidade(
  empresaId: string,
  whereBase: Prisma.ServicoWhereInput,
  periodo: Periodo,
) {
  const where: Prisma.ServicoWhereInput = {
    ...whereBase,
    data_servico: { gte: periodo.inicio, lte: periodo.fim },
  };
  const [servicos, total, totalGeral] = await Promise.all([
    db(empresaId).servico.findMany({
      where,
      select: CAMPOS_SERVICO,
      orderBy: [{ data_servico: "desc" }, { criado_em: "desc" }],
      take: CHIPS_DE_HISTORICO,
    }),
    db(empresaId).servico.count({ where }),
    db(empresaId).servico.count({ where: whereBase }),
  ]);
  return { servicos: await comSituacaoEmLote(empresaId, servicos), total, totalGeral };
}

export function listarServicosDoCliente(empresaId: string, clienteId: string, periodo: Periodo) {
  return historicoPorEntidade(empresaId, { cliente_id: clienteId, arquivado_em: null }, periodo);
}

export function listarServicosDoCaminhao(empresaId: string, veiculoId: string, periodo: Periodo) {
  return historicoPorEntidade(empresaId, { veiculo_id: veiculoId, arquivado_em: null }, periodo);
}

export function listarServicosDoMotorista(
  empresaId: string,
  motoristaId: string,
  periodo: Periodo,
) {
  return historicoPorEntidade(
    empresaId,
    { motorista_id: motoristaId, arquivado_em: null },
    periodo,
  );
}
