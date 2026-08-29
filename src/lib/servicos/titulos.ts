import { uuidv7 } from "uuidv7";
import { db, registrarRecebimentoAtomico } from "@/lib/db";
import { Prisma, type FormaPagamentoPrevista } from "@/lib/generated/prisma/client";
import {
  buscarServico,
  CAMPOS_SERVICO,
  CHIPS_DE_HISTORICO,
  CondicaoDeGravacaoFalhouError,
  editarServico,
  type DadosServico,
  type Periodo,
} from "@/lib/servicos/servicos";
import { deslocarDias, instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";

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
  vencimento: true,
  forma_pagamento_prevista: true,
  status: true,
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
 * **O recebimento nasce junto do título, no mesmo `create` aninhado** (item
 * 6, Tarefa 3 — `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 6): não
 * existe mais campo `valor_recebido` em `TituloReceber` para gravar direto.
 * `data` é o instante do toque (`new Date()`), não um dia escolhido em
 * calendário — não passa por `instanteDoDiaEmFortaleza`, que é só para
 * "AAAA-MM-DD" digitado. `vencimento`, `forma_pagamento_prevista` e
 * `relatorio_id` do título, e `forma` do recebimento, ficam nulos: ninguém
 * pergunta isso nesta tela. `usuarioId` vem sempre da sessão, nunca de
 * input — mesma razão de `Servico.criado_por_usuario_id`.
 *
 * **Um único `create` aninhado, não duas gravações separadas** — o Prisma
 * garante que a criação do título e a do recebimento são atômicas (as duas
 * ou nenhuma), sem precisar de `emTransacao` explícito para este caso: ao
 * contrário de `registrarRecebimento` (abaixo), aqui não existe agregado
 * concorrente para proteger — o título acabou de nascer, com zero
 * recebimentos, e o índice único parcial já impede um segundo "Já recebi"
 * simultâneo.
 */
export async function criarTituloJaRecebi(empresaId: string, usuarioId: string, servicoId: string) {
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
        status: "pago",
        integral: true,
        empresa_id: empresaId,
        recebimentos: {
          create: {
            id: uuidv7(),
            valor: servico.valor,
            data: new Date(),
            usuario_id: usuarioId,
            empresa_id: empresaId,
          },
        },
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
 * Vencimento pré-preenchido da folha de faturamento (item 6, Tarefa 1) — o
 * **terceiro** dos três níveis de prazo de `docs/especificacao.md` §4.7
 * (empresa → cliente → edição ao faturar) é a folha em si; esta função
 * resolve os dois primeiros e entrega o dia sugerido.
 *
 * **Função pura, sobre `"AAAA-MM-DD"` no fuso de Fortaleza, nunca `Date`
 * cru.** `hoje` tem que vir de `diaEmFortaleza`, não de `new Date()`: um
 * frete faturado às 22h de Fortaleza é 01h UTC do dia seguinte, e o
 * vencimento sairia um dia adiantado — o mesmo erro que
 * `src/lib/utils/data-fortaleza.ts` existe para eliminar, e que o `/revisar`
 * já achou uma vez na Tarefa 2 do item 3.
 *
 * `prazoDoCliente` nulo herda o da empresa — é o significado declarado do
 * campo (`Cliente.prazo_pagamento_dias`, comentário do model: "Nulo = herda
 * `Empresa.prazo_padrao_dias`"). O cadastro de cliente já recusa zero e
 * negativo (`clientes/acoes.ts`: `Number.isInteger(numero) && numero > 0`),
 * e `prazo_padrao_dias` é `NOT NULL DEFAULT 15` — então esta função não
 * repete essas checagens: elas são garantidas antes, e repeti-las aqui
 * sugeriria que este é o lugar que decide, quando não é.
 */
export function vencimentoPadrao(
  hoje: string,
  prazoDoCliente: number | null,
  prazoDaEmpresa: number,
): string {
  return deslocarDias(hoje, prazoDoCliente ?? prazoDaEmpresa);
}

/**
 * "Faturar frete" (item 6, Tarefa 1) — o frete finalizado vira **cobrança em
 * aberto**. É o primeiro caminho do produto a criar um `TituloReceber` que
 * ainda não foi pago: até aqui, o único jeito de um título nascer era
 * `criarTituloJaRecebi`, que já cria pago.
 *
 * `docs/especificacao.md` §7 ("Como um serviço vira título") lista dois
 * caminhos; este é o **manual**. O automático (relatório com a marcação de
 * cobrança, item 7) reaproveita esta mesma função — `docs/planos/
 * item-7-relatorio.md`, Tarefa 3: "sem alterar sua forma, só passando o
 * `relatorio_id` junto". `dados.relatorioId` é opcional e só quem gera
 * relatório o passa (`gerarRelatorio`, `relatorios.ts`); "Faturar frete"
 * continua chamando sem ele, e `relatorio_id` continua nulo nesse caminho.
 *
 * **`cliente_id` e `valor` vêm do próprio `Servico`, nunca do formulário** —
 * mesma razão de `criarTituloJaRecebi`, e é o que a trava do §8 item 12
 * (`editarServicoComProtecaoDeTitulo`, abaixo) protege depois: o título
 * copia os dois ao nascer e nunca mais sincroniza.
 *
 * **Duas conferências de FK, não uma** (`CLAUDE.md` §3, achado do `/revisar`
 * no item 7): `servico_id` é o primeiro identificador que chega de fora, e
 * `buscarServico` o confere contra a empresa; `dados.relatorioId` (item 7) é
 * o segundo — mesmo vindo só de `gerarRelatorio`, que já confere antes de
 * chamar, a proteção mora aqui dentro, não em quem chama (mesmo raciocínio
 * já registrado três vezes no `CLAUDE.md` §3, para `veiculo_habitual_id`,
 * para a política de RLS, e agora para este campo). `cliente_id` continua
 * sendo o único que nunca precisa de conferência própria — vem de
 * `servico.cliente_id`, já conferido quando o `Servico` nasceu.
 *
 * **Só frete finalizado.** A tela só oferece o botão nesse estado
 * (`docs/componentes.md`: "finalizado e sem cobrança → Faturar frete"), mas
 * a tela é a primeira camada, não a garantia — um pedido formado por fora do
 * formulário passaria sem esta linha.
 *
 * **A recusa do segundo título tem duas camadas**, como em
 * `criarTituloJaRecebi`: a leitura abaixo é o caminho rápido, com a mensagem
 * certa; quem garante sob concorrência é o índice único parcial
 * `titulo_receber_um_integral_por_servico`.
 *
 * **Refaturar depois de um estorno funciona** — resolvido no item 6,
 * Tarefa 6 (`estornarTitulo`, abaixo). O índice único
 * `titulo_receber_um_integral_por_servico` (migration
 * `20260827090000_estorno_indice_exclui_cancelado`) exclui
 * `status = 'cancelado'`, além de `integral = true AND arquivado_em IS
 * NULL` — a mesma leitura que esta função já fazia (procura só título
 * ativo, pelo critério do §7). Antes dessa migration as duas camadas
 * discordavam: esta função deixaria refaturar e o banco recusaria com erro
 * de unicidade, traduzido para "Este frete já foi faturado" — mentira,
 * porque o título anterior estava cancelado. O ciclo faturar → estornar →
 * refaturar é provado em `tests/titulos.test.ts` (bloco 14).
 */
export async function faturarServico(
  empresaId: string,
  servicoId: string,
  dados: {
    vencimento: Date;
    formaPrevista: FormaPagamentoPrevista;
    /**
     * Item 7 — `gerarRelatorio` passa o `Relatorio` que acabou de criar.
     * Ausente = caminho manual ("Faturar frete"), `relatorio_id` fica nulo.
     */
    relatorioId?: string;
  },
) {
  const servico = await buscarServico(empresaId, servicoId);
  if (!servico || servico.arquivado_em) throw new Error("Frete não encontrado.");
  if (servico.status_operacional !== "finalizado") {
    throw new Error("Só dá para faturar um frete finalizado.");
  }

  // Confere `relatorioId` contra a empresa antes de gravar — mesmo quando
  // `gerarRelatorio` já conferiu antes de chamar (`CLAUDE.md` §3). Consulta
  // direta em vez de `buscarRelatorio` (`relatorios.ts`) para não fechar um
  // import circular: `relatorios.ts` já importa `faturarServico` daqui.
  // `db(empresaId)` sozinho já basta — devolve nulo para um `relatorio_id`
  // de outra empresa, mesma garantia que `buscarRelatorio` daria.
  if (dados.relatorioId) {
    const relatorio = await db(empresaId).relatorio.findUnique({
      where: { id: dados.relatorioId },
      select: { id: true },
    });
    if (!relatorio) throw new Error("Relatório não encontrado.");
  }

  const jaFaturado = await db(empresaId).tituloReceber.findFirst({
    where: { servico_id: servicoId, arquivado_em: null, status: { not: "cancelado" } },
    select: { id: true },
  });
  if (jaFaturado) throw new Error("Este frete já foi faturado.");

  try {
    return await db(empresaId).tituloReceber.create({
      data: {
        servico_id: servico.id,
        cliente_id: servico.cliente_id,
        valor: servico.valor,
        status: "aberto",
        integral: true,
        vencimento: dados.vencimento,
        forma_pagamento_prevista: dados.formaPrevista,
        relatorio_id: dados.relatorioId ?? null,
        empresa_id: empresaId,
      },
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehTituloIntegralDuplicado(erro)) {
      throw new Error("Este frete já foi faturado.");
    }
    throw erro;
  }
}

/**
 * Soma dos recebimentos ativos de um título, um só ou vários — em lote,
 * nunca uma consulta por título (`comSituacaoEmLote`, abaixo, é quem chama
 * com vários de uma vez; `registrarRecebimento` chama com um só;
 * `src/lib/servicos/cobrancas.ts` chama com a página inteira da lista).
 */
export async function totalRecebidoPorTitulo(
  empresaId: string,
  tituloIds: string[],
): Promise<Map<string, number>> {
  if (tituloIds.length === 0) return new Map();
  const somas = await db(empresaId).recebimento.groupBy({
    by: ["titulo_id"],
    where: { titulo_id: { in: tituloIds }, arquivado_em: null },
    _sum: { valor: true },
  });
  return new Map(somas.map((s) => [s.titulo_id, s._sum.valor ?? 0]));
}

/**
 * A data do recebimento mais recente de um título — nunca `vencimento`, que
 * é a data prevista, não a que aconteceu (item 6, Tarefa 4, achado do
 * `/revisar`: o resumo do detalhe da cobrança dizia "recebido em X" usando o
 * vencimento para um título que foi faturado com vencimento e só depois
 * recebido, afirmando que o dinheiro entrou num dia em que não entrou).
 * Mesma regra que `listarCobrancas` já aplica para "Recebidas"
 * (`src/lib/servicos/cobrancas.ts`), aqui para um título só — extraída para
 * cá, e não deixada como consulta solta na página, porque regra de negócio
 * mora em `/src/lib/servicos` (`CLAUDE.md` §6), nunca dentro de componente
 * de tela.
 */
export async function ultimoRecebimentoEm(empresaId: string, tituloId: string): Promise<Date | null> {
  const resultado = await db(empresaId).recebimento.aggregate({
    where: { titulo_id: tituloId, arquivado_em: null },
    _max: { data: true },
  });
  return resultado._max.data;
}

/**
 * Um título pela própria id, escopado por empresa — a conferência de FK que
 * `registrarRecebimento` (abaixo) precisa fazer antes de chamar a função de
 * banco (`CLAUDE.md` §3: o Postgres não aplica RLS na checagem de FK). Devolve
 * `null` para título de outra empresa, do mesmo jeito que `buscarServico`.
 */
export function buscarTituloReceber(empresaId: string, tituloId: string) {
  return db(empresaId).tituloReceber.findUnique({ where: { id: tituloId }, select: CAMPOS });
}

/**
 * "Confirmar recebimento" (item 6, Tarefa 3 — folha de recebimento e a
 * secundária "Marcar recebido" no detalhe do frete): grava um `Recebimento`
 * e ajusta `TituloReceber.status`, atomicamente.
 *
 * **Duas camadas, mesmo desenho de `criarTituloJaRecebi`/`faturarServico`.**
 * As três checagens amigáveis abaixo (título existe e é desta empresa, está
 * `aberto`, valor cabe no saldo) dão a mensagem certa no caso comum, sem
 * round-trip extra ao banco. Quem garante de verdade, inclusive sob
 * concorrência real (dois toques simultâneos em "Confirmar recebimento", ou
 * o mesmo em duas abas), é `registrar_recebimento` — a função de banco que
 * `registrarRecebimentoAtomico` (`src/lib/db/index.ts`) chama: ela trava a
 * linha do título (`FOR UPDATE`) pela duração da transação, então nenhum
 * recebimento concorrente para o MESMO título consegue somar além do valor
 * dele. `titulos.ts` não sabe SQL (`CLAUDE.md` §3) — só chama a função
 * exportada de `lib/db`.
 *
 * **Por que não é o mesmo padrão de `editarServicoComProtecaoDeTitulo`
 * (condição embutida no `WHERE` de um `UPDATE`).** Aquele padrão resolve uma
 * comparação simples na PRÓPRIA linha sendo gravada. Aqui a condição é um
 * agregado sobre OUTRA tabela (soma dos recebimentos existentes), que
 * precisa ser lido e comparado sob uma trava explícita — e trava explícita
 * só faz sentido dentro de uma função de banco, não de uma consulta do
 * Prisma.
 *
 * **A falha atômica é traduzida pela mensagem que a função de banco devolve,
 * não presumida.** Achado do `/revisar`: uma primeira versão desta função
 * convertia QUALQUER exceção daqui em "Valor maior que o saldo em aberto" —
 * uma falha de rede, de pool ou de sessão do banco viraria essa mensagem
 * específica, exatamente o defeito que `CLAUDE.md` §2 registra (12/08/2026):
 * rotular com uma causa um sinal que pode ter mais de uma é pior que a
 * mensagem genérica que a correção queria melhorar. `registrar_recebimento`
 * lança `saldo_insuficiente` ou `titulo_invalido` como texto exato da
 * exceção (medido: o erro do Prisma para `$executeRaw` inclui esse texto em
 * `.message`, nunca só o código) — só esses dois casos viram mensagem de
 * produto; qualquer outro erro sobe como está, sem fingir saber a causa.
 *
 * **`titulo_invalido` vira "já foi recebida ou cancelada", não "não
 * encontrada"** — segundo achado do `/revisar`. A função de banco levanta
 * `titulo_invalido` para três estados (id de outra empresa/inexistente,
 * arquivado, ou `status !== 'aberto'`), mas os dois primeiros já foram
 * descartados pela checagem amigável logo abaixo, ANTES de chegar aqui —
 * então, na prática, só a corrida chega a esta função: o único jeito de
 * `titulo_invalido` disparar depois da checagem amigável passar é o status
 * ter mudado NO MEIO-TEMPO (outro recebimento completou o título entre a
 * leitura e a gravação). "Não encontrada" mentiria sobre uma cobrança que
 * existe e foi vista segundos atrás; a mensagem certa é a mesma que a
 * checagem amigável já usa para esse estado, duas linhas abaixo.
 *
 * Exportada só para o teste determinístico da tradução em si — ver
 * `tests/titulos.test.ts`, bloco "10." — sem depender de vencer uma corrida
 * de verdade para exercitar cada ramo.
 */
export function traduzirFalhaDeRecebimento(erro: unknown): never {
  const texto = erro instanceof Error ? erro.message : String(erro);
  if (texto.includes("titulo_invalido")) {
    throw new Error("Esta cobrança já foi recebida ou cancelada.");
  }
  // Sem o valor do saldo aqui, de propósito — diferente da mesma checagem
  // na checagem amigável de `registrarRecebimento` (que diz "R$ X,XX",
  // decisão do fundador, 26/08/2026). Só a corrida chega neste ramo (a
  // checagem amigável já validou o saldo segundos antes), e essa função
  // é pura — buscar o saldo atual de novo, só para uma mensagem mais bonita
  // num caminho quase inatingível, não vale o round-trip a mais.
  if (texto.includes("saldo_insuficiente")) throw new Error("Valor maior que o saldo em aberto.");
  throw erro;
}

export async function registrarRecebimento(
  empresaId: string,
  usuarioId: string,
  tituloId: string,
  dados: { valor: number; data: Date; forma: string | null },
) {
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) {
    throw new Error("Informe um valor válido.");
  }
  // Recebimento é registro de um fato que já aconteceu — nunca no futuro
  // (diferente de vencimento, que pode ser no passado de propósito). Compara
  // instante com instante, não dia com dia: `dados.data` já chega como
  // meia-noite de Fortaleza do dia escolhido (`instanteDoDiaEmFortaleza`,
  // `fretes/acoes.ts`), sempre anterior a "agora" enquanto o dia escolhido
  // for hoje ou antes.
  if (dados.data.getTime() > Date.now()) {
    throw new Error("Não dá para registrar um recebimento no futuro.");
  }

  const titulo = await buscarTituloReceber(empresaId, tituloId);
  if (!titulo || titulo.arquivado_em) throw new Error("Cobrança não encontrada.");
  if (titulo.status !== "aberto") {
    throw new Error("Esta cobrança já foi recebida ou cancelada.");
  }

  // O frete pode ter sido arquivado depois do título nascer —
  // `arquivarServico` não trava nem toca o título (`CLAUDE.md` §3: FK não
  // é conferida pelo Postgres, e aqui nem existe FK entre os dois estados,
  // é regra de negócio pura). Achado do segundo `/revisar`: sem esta
  // checagem AQUI (o único lugar por onde as duas telas passam — a
  // secundária do detalhe do frete e o deslizar de Cobranças), a tela do
  // frete escondia "Marcar recebido" mas Cobranças continuava oferecendo o
  // mesmo gesto para a mesma cobrança — duas regras diferentes para a
  // mesma ação.
  const servico = await buscarServico(empresaId, titulo.servico_id);
  if (!servico || servico.arquivado_em) {
    throw new Error("Este frete foi arquivado — não é possível registrar recebimento.");
  }

  // Decisão do fundador, 26/08/2026: nunca aceitar mais que o saldo — um
  // valor maior criaria um estado sem nome no produto (não é quitado, não é
  // aberto, e nenhuma tela sabe mostrar). A mensagem diz o saldo, para a
  // pessoa corrigir na hora — ver `docs/planos/item-6-titulo-e-cobrancas.md`,
  // Tarefa 3.
  const jaRecebido = (await totalRecebidoPorTitulo(empresaId, [tituloId])).get(tituloId) ?? 0;
  const saldo = titulo.valor - jaRecebido;
  if (dados.valor > saldo) {
    throw new Error(`Valor maior que o saldo em aberto (R$ ${formatarCentavos(saldo)}).`);
  }

  try {
    await registrarRecebimentoAtomico(empresaId, {
      id: uuidv7(),
      tituloId,
      valor: dados.valor,
      data: dados.data,
      forma: dados.forma,
      usuarioId,
    });
  } catch (erro) {
    traduzirFalhaDeRecebimento(erro);
  }

  const atualizado = await buscarTituloReceber(empresaId, tituloId);
  if (!atualizado) throw new Error("Cobrança não encontrada.");
  return atualizado;
}

/**
 * Estorno (item 6, Tarefa 6 —
 * `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 4): cancela o título
 * (`status: "cancelado"`, nunca apagado — `CLAUDE.md` §7) e devolve o frete
 * a **A faturar** sozinho, porque a situação financeira é derivada — nenhum
 * campo do `Servico` muda (`CLAUDE.md` §9).
 *
 * **Título pago também pode ser estornado** (`docs/especificacao.md` §8,
 * item 5: "Título pago não é editado. Para corrigir, estorna e cria
 * outro") — esta função não distingue `aberto` de `pago`, só recusa um
 * título já `cancelado`. Os recebimentos já registrados não são apagados
 * (`CLAUDE.md` §7); eles só deixam de contar porque `situacaoFinanceira` e
 * `totalRecebidoPorTitulo` ignoram título cancelado.
 *
 * **Fecha a promessa de `editarServicoComProtecaoDeTitulo`** — as duas
 * mensagens que dizem "Estorne para corrigir" (`docs/especificacao.md` §8,
 * item 12) passam a ser verdade a partir daqui.
 *
 * **Duas camadas, mesmo desenho do resto do arquivo.** A checagem amigável
 * abaixo dá a mensagem certa no caso comum; quem garante sob concorrência
 * real (dois toques simultâneos em "Estornar") é a condição no próprio
 * `UPDATE` (`status: { not: "cancelado" }`) — só um dos dois pedidos muda
 * alguma linha, e o outro recebe a mesma mensagem de "já estornado". Não
 * precisa de função de banco com trava explícita (diferente de
 * `registrarRecebimento`): não há agregado concorrente para proteger, só a
 * própria linha do título, e o Postgres já serializa dois `UPDATE`
 * simultâneos na mesma linha.
 *
 * **A migration `titulo_receber_um_integral_por_servico` precisa excluir
 * `status = 'cancelado'`** (`20260827090000_estorno_indice_exclui_cancelado`)
 * — sem isso, o `UPDATE` desta função passaria, mas um refaturamento
 * seguinte (`faturarServico`) esbarraria no índice antigo, que ainda
 * contava o título cancelado como "integral" existente.
 *
 * **Recusa frete arquivado** — decisão do fundador, 27/08/2026, achado do
 * `/revisar`: mesmo critério de `registrarRecebimento`/
 * `registrarCobrancaEnviada`, por consistência ("frete arquivado é frete
 * fora de circulação; agir sobre a cobrança dele é caminho que ninguém
 * decidiu abrir" — e errar para o lado de menos ação numa operação
 * destrutiva). A tela já esconde "Estornar cobrança" nesse caso
 * (`cobrancas/[id]/page.tsx`), mas a tela é a primeira camada, não a
 * garantia.
 */
export async function estornarTitulo(empresaId: string, tituloId: string) {
  const titulo = await buscarTituloReceber(empresaId, tituloId);
  if (!titulo || titulo.arquivado_em) throw new Error("Cobrança não encontrada.");
  if (titulo.status === "cancelado") throw new Error("Esta cobrança já foi estornada.");

  const servico = await buscarServico(empresaId, titulo.servico_id);
  if (!servico || servico.arquivado_em) {
    throw new Error("Este frete foi arquivado — não é possível estornar.");
  }

  const resultado = await db(empresaId).tituloReceber.updateMany({
    where: { id: tituloId, status: { not: "cancelado" } },
    data: { status: "cancelado" },
  });
  if (resultado.count === 0) throw new Error("Esta cobrança já foi estornada.");

  const atualizado = await buscarTituloReceber(empresaId, tituloId);
  if (!atualizado) throw new Error("Cobrança não encontrada.");
  return atualizado;
}

/**
 * "Cobrar no WhatsApp" (item 6, Tarefa 5) — grava a confirmação de "Enviei"
 * ao voltar da conversa, mesmo padrão de `marcarOrdemEnviada` (item 5), mas
 * repetível: uma `CobrancaEnviada` por confirmação, nunca um campo único
 * sobrescrito (`docs/planos/item-6-titulo-e-cobrancas.md`, mesmo raciocínio
 * da decisão 6 sobre `Recebimento`).
 *
 * **A conferência de FK é a mesma de `registrarRecebimento`** (`CLAUDE.md`
 * §3): `buscarTituloReceber` confere que `tituloId` pertence à empresa antes
 * de gravar — o Postgres não aplica RLS na checagem de chave estrangeira.
 * `usuarioId` nunca é escolhido, vem sempre da sessão.
 *
 * **Recusa o mesmo que `registrarRecebimento` recusaria** — título de outra
 * empresa/inexistente/arquivado, já pago ou cancelado, ou frete arquivado —
 * pelo mesmo motivo: a tela só oferece "Cobrar no WhatsApp" para título
 * aberto de frete não arquivado, mas a tela é a primeira camada, não a
 * garantia.
 */
export async function registrarCobrancaEnviada(
  empresaId: string,
  usuarioId: string,
  tituloId: string,
): Promise<void> {
  const titulo = await buscarTituloReceber(empresaId, tituloId);
  if (!titulo || titulo.arquivado_em) throw new Error("Cobrança não encontrada.");
  if (titulo.status !== "aberto") {
    throw new Error("Esta cobrança já foi recebida ou cancelada.");
  }
  // Boleto não cobra por WhatsApp — o banco já avisa (`docs/especificacao.md`
  // §4.5 e §8, item 11: "boleto não gera pendência nem ação de cobrar"). A
  // tela nunca oferece o botão nesse caso, mas a tela é a primeira camada,
  // não a garantia — achado do `/revisar`.
  if (titulo.forma_pagamento_prevista === "boleto") {
    throw new Error("Cobrança por boleto — o banco já avisa, sem cobrar por aqui.");
  }

  const servico = await buscarServico(empresaId, titulo.servico_id);
  if (!servico || servico.arquivado_em) {
    throw new Error("Este frete foi arquivado — não é possível registrar o envio.");
  }

  await db(empresaId).cobrancaEnviada.create({
    data: {
      id: uuidv7(),
      titulo_id: tituloId,
      usuario_id: usuarioId,
      enviado_em: new Date(),
      empresa_id: empresaId,
    },
  });
}

/** O último envio de cada título, com quem cobrou — "cobrado há 2 dias por Monalisa" (§4.5). */
export type UltimoEnvio = { em: Date; usuarioNome: string };

/**
 * Em lote, nunca uma consulta por linha — mesmo padrão de
 * `totalRecebidoPorTitulo`. Como `groupBy` não devolve QUEM mandou o envio
 * mais recente (só agrega `titulo_id`), a solução é ler todos os envios já
 * ordenados por data decrescente e ficar com o primeiro de cada título — o
 * conjunto é pequeno (o teto de 50 da lista, vezes os poucos envios de cada
 * cobrança), nunca a tabela inteira da empresa.
 */
export async function ultimoEnvioPorTitulo(
  empresaId: string,
  tituloIds: string[],
): Promise<Map<string, UltimoEnvio>> {
  if (tituloIds.length === 0) return new Map();
  const envios = await db(empresaId).cobrancaEnviada.findMany({
    where: { titulo_id: { in: tituloIds }, arquivado_em: null },
    select: { titulo_id: true, enviado_em: true, usuario: { select: { nome: true } } },
    orderBy: { enviado_em: "desc" },
  });

  const porTitulo = new Map<string, UltimoEnvio>();
  for (const envio of envios) {
    if (!porTitulo.has(envio.titulo_id)) {
      porTitulo.set(envio.titulo_id, { em: envio.enviado_em, usuarioNome: envio.usuario.nome });
    }
  }
  return porTitulo;
}

/** O histórico inteiro de um título — "COBRANÇAS ENVIADAS" no detalhe (item 6, Tarefa 5). */
export function listarEnviosDoTitulo(empresaId: string, tituloId: string) {
  return db(empresaId).cobrancaEnviada.findMany({
    where: { titulo_id: tituloId, arquivado_em: null },
    select: { id: true, enviado_em: true, usuario: { select: { nome: true } } },
    orderBy: { enviado_em: "desc" },
  });
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
 *
 * **A mensagem diz "já tem cobrança", nunca "já recebido" — corrigido na
 * Tarefa 1 do item 6 (26/08/2026), achado do segundo `/revisar`.** As duas
 * mensagens (e a da tela, `fretes/novo/TelaLancarFrete.tsx`) diziam "Frete
 * já recebido", o que era verdade **enquanto** `criarTituloJaRecebi` fosse
 * o único jeito de um título nascer — ele já cria `pago`. `faturarServico`
 * criou o primeiro título `aberto` do produto: a trava passa a disparar
 * para frete **Faturado** (`docs/especificacao.md` §7: "existe título
 * ativo, **nenhum centavo entrou ainda**"), e dizer "já recebido" ali seria
 * afirmar ao usuário que entrou dinheiro que não entrou. A regra escrita
 * sempre falou de **título ativo**, nunca de recebimento (§8 item 12) — a
 * frase é que estava presa ao único caso que existia.
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
        "Este frete já tem cobrança: não é possível trocar o cliente. Estorne para corrigir.",
      );
    }
    throw new Error(
      "Este frete já tem cobrança: não é possível alterar o valor. Estorne para corrigir.",
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
  /** Soma dos recebimentos ativos deste título — nunca `valor_recebido`, que saiu de `TituloReceber` na Tarefa 3. */
  totalRecebido: number;
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

  const algumDinheiroEntrou = ativos.some((t) => t.status === "pago" || t.totalRecebido > 0);
  return algumDinheiroEntrou ? "parcial" : "faturado";
}

const CAMPOS_PARA_SITUACAO = {
  id: true,
  servico_id: true,
  status: true,
  arquivado_em: true,
} as const;

/**
 * Anexa `situacao_financeira` a uma lista de serviços já carregada —
 * **duas consultas, não uma por frete**: todos os títulos daqueles serviços
 * de uma vez (`servico_id IN (...)`), e a soma dos recebimentos deles
 * também de uma vez (`totalRecebidoPorTitulo`, acima) — agrupados em
 * memória. Uma lista de 50 fretes buscando título ou recebimento um a um
 * seria 100 idas ao banco — a esteira já mostrou o que pressão de conexão
 * faz aqui (`docs/diario.md`, 18-20/08/2026).
 *
 * Compartilhado por `listarServicosComSituacao` e pelos históricos dos
 * perfis (`historicoPorEntidade`, abaixo) — os dois precisam da mesma coisa,
 * só a origem da lista de serviços muda.
 */
/** Um título, do jeito que `comSituacaoEmLote` precisa dele — a situação, e o suficiente para "Marcar recebido". */
type TituloDoLote = TituloParaSituacao & { id: string; valor: number };

/** Id e saldo do título aberto de um frete — o que a secundária/o deslizar "Marcar recebido" precisam para abrir a folha já preenchida. `null` sem título aberto (a_faturar, quitado, ou só cancelado). */
export type TituloAbertoResumo = { id: string; saldoCentavos: number };

async function comSituacaoEmLote<T extends { id: string }>(
  empresaId: string,
  servicos: T[],
): Promise<(T & { situacao_financeira: SituacaoFinanceira; tituloAberto: TituloAbertoResumo | null })[]> {
  if (servicos.length === 0) return [];

  const titulos = await db(empresaId).tituloReceber.findMany({
    where: { servico_id: { in: servicos.map((s) => s.id) } },
    select: { ...CAMPOS_PARA_SITUACAO, valor: true },
  });
  const totalPorTitulo = await totalRecebidoPorTitulo(
    empresaId,
    titulos.map((t) => t.id),
  );

  const porServico = new Map<string, TituloDoLote[]>();
  for (const t of titulos) {
    const lista = porServico.get(t.servico_id) ?? [];
    lista.push({
      id: t.id,
      status: t.status,
      valor: t.valor,
      arquivado_em: t.arquivado_em,
      totalRecebido: totalPorTitulo.get(t.id) ?? 0,
    });
    porServico.set(t.servico_id, lista);
  }

  return servicos.map((s) => {
    const titulosDoServico = porServico.get(s.id) ?? [];
    // Um frete tem no máximo um título integral ATIVO (índice único
    // parcial da migration `20260814150000`, ajustado na `20260827090000`
    // para excluir cancelado — item 6, Tarefa 6): pode existir um
    // cancelado ao lado depois de um estorno, mas o `find` abaixo já
    // filtra por status/arquivado, mesmo critério do `find` em
    // `fretes/[id]/page.tsx`. **`arquivado_em === null` entra aqui** —
    // achado do terceiro `/revisar`: `titulos` (acima) não filtra arquivado
    // de propósito (`situacaoFinanceira` precisa da lista inteira para
    // aplicar a própria regra), mas um título arquivado nunca é "título
    // ativo" (`docs/especificacao.md` §7) e não pode virar candidato a
    // receber — mesmo critério que `situacaoFinanceira` já aplica internamente.
    const aberto = titulosDoServico.find((t) => t.status === "aberto" && t.arquivado_em === null);
    return {
      ...s,
      situacao_financeira: situacaoFinanceira(titulosDoServico),
      tituloAberto: aberto ? { id: aberto.id, saldoCentavos: aberto.valor - aberto.totalRecebido } : null,
    };
  });
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

/**
 * O `Servico` do detalhe (Tarefa 3 do item 4) mais os títulos associados
 * — no máximo um **ativo**, mas pode haver também um cancelado ao lado
 * depois de um estorno (item 6, Tarefa 6) — cada um com `totalRecebido` já
 * somado (item 6, Tarefa 3), para a tela decidir o saldo sem uma consulta
 * própria (a secundária "Marcar recebido" precisa dele para pré-preencher
 * a folha).
 */
export async function buscarServicoComTitulos(empresaId: string, id: string) {
  const [servico, titulosCrus] = await Promise.all([
    buscarServico(empresaId, id),
    db(empresaId).tituloReceber.findMany({
      where: { servico_id: id, arquivado_em: null },
      select: CAMPOS,
      orderBy: { criado_em: "asc" },
    }),
  ]);
  if (!servico) return null;

  const totalPorTitulo = await totalRecebidoPorTitulo(
    empresaId,
    titulosCrus.map((t) => t.id),
  );
  const titulos = titulosCrus.map((t) => ({
    ...t,
    totalRecebido: totalPorTitulo.get(t.id) ?? 0,
  }));

  return { ...servico, titulos, situacao_financeira: situacaoFinanceira(titulos) };
}

/**
 * Resumo do cliente (Tarefa 6 do item 4; ganhou "a receber"/"vencido" na
 * Tarefa 7 do item 6) — **quatro números, dois pares diferentes**: já rodado
 * e recebido no período respondem ao chip de período (`periodo`); a receber
 * e vencido são **situação atual, sempre** — mesmo princípio já decidido
 * para Cobranças e a dashboard (`docs/especificacao.md` §4.6: "'a receber' e
 * 'vencido' são situação atual, e um filtro tornaria o significado deles
 * ambíguo"), por isso pedem `hoje` e não `periodo`. Decisão do fundador,
 * 27/08/2026, plano da Tarefa 7 (`docs/planos/item-6-titulo-e-cobrancas.md`).
 *
 * **`jaRodado`/`recebidoNoPeriodo`**: já rodado é soma de `Servico.valor` no
 * período; recebido no período é soma de `Recebimento.valor`, com
 * `Recebimento.data` no período (item 6, Tarefa 3; antes desta tarefa era
 * `valor_recebido`/`data_pagamento` do próprio título).
 *
 * Título cancelado não conta para "recebido" — mesmo raciocínio de
 * `situacaoFinanceira`, aplicado pelo filtro na relação `titulo` abaixo.
 * Frete cancelado (`status_operacional`) não conta para "já rodado" —
 * decisão do fundador, 20/08/2026, `docs/especificacao.md` §7: ele não vai
 * acontecer (`em_andamento` conta — a tese do produto é o frete nascer na
 * ordem), e continua na lista/histórico do perfil, só não entra na soma.
 *
 * **`recebidoNoPeriodo` NÃO exclui recebimento de frete cancelado** (só
 * título com `status = "cancelado"` — regra já existente, acima) — e isto é
 * intencional, não lacuna: cancelamento afeta o que foi **operado**, não o
 * que foi **recebido**. Se o cliente pagou antes do frete ser cancelado,
 * esse dinheiro entrou de verdade — é fato, independente do frete depois
 * virar cancelado. Decisão do fundador, 20/08/2026, confirmada no segundo
 * `/revisar` (o achado perguntava se as duas somas deveriam ser
 * simétricas; a resposta é que não, por natureza — uma é sobre operação,
 * a outra é sobre caixa).
 *
 * **`aReceber`/`vencido`**: mesmo desenho de `resumoDeCobrancas`
 * (`cobrancas.ts`), escopado a um cliente em vez da empresa inteira — somam
 * o SALDO (valor menos já recebido) de títulos `aberto`, nunca o valor
 * cheio; "vencido" é o recorte de "a receber" com `vencimento` antes de
 * hoje; frete arquivado não conta (dinheiro fora de circulação); título
 * cancelado não entra (não é `aberto`). Quatro consultas a mais, nunca uma
 * por título.
 */
export async function resumoFinanceiroDoCliente(
  empresaId: string,
  clienteId: string,
  periodo: Periodo,
  hoje: string,
) {
  const inicioDeHoje = instanteDoDiaEmFortaleza(hoje);
  const whereAbertas = {
    cliente_id: clienteId,
    arquivado_em: null,
    status: "aberto" as const,
    servico: { arquivado_em: null },
  };
  const whereVencidas = { ...whereAbertas, vencimento: { lt: inicioDeHoje } };

  const [jaRodado, recebidoNoPeriodo, totalAbertas, recebidoAbertas, totalVencidas, recebidoVencidas] =
    await Promise.all([
      db(empresaId).servico.aggregate({
        where: {
          cliente_id: clienteId,
          arquivado_em: null,
          status_operacional: { not: "cancelado" },
          data_servico: { gte: periodo.inicio, lte: periodo.fim },
        },
        _sum: { valor: true },
      }),
      db(empresaId).recebimento.aggregate({
        where: {
          arquivado_em: null,
          data: { gte: periodo.inicio, lte: periodo.fim },
          titulo: { cliente_id: clienteId, arquivado_em: null, status: { not: "cancelado" } },
        },
        _sum: { valor: true },
      }),
      db(empresaId).tituloReceber.aggregate({ where: whereAbertas, _sum: { valor: true } }),
      db(empresaId).recebimento.aggregate({
        where: { arquivado_em: null, titulo: whereAbertas },
        _sum: { valor: true },
      }),
      db(empresaId).tituloReceber.aggregate({ where: whereVencidas, _sum: { valor: true } }),
      db(empresaId).recebimento.aggregate({
        where: { arquivado_em: null, titulo: whereVencidas },
        _sum: { valor: true },
      }),
    ]);

  return {
    jaRodado: jaRodado._sum.valor ?? 0,
    recebidoNoPeriodo: recebidoNoPeriodo._sum.valor ?? 0,
    aReceber: (totalAbertas._sum.valor ?? 0) - (recebidoAbertas._sum.valor ?? 0),
    vencido: (totalVencidas._sum.valor ?? 0) - (recebidoVencidas._sum.valor ?? 0),
  };
}

/**
 * Saldo em aberto de **todos** os clientes de uma vez (Tarefa 7 do item 6) —
 * para o critério de ordenação "Maior valor em aberto" (`docs/
 * especificacao.md` §4.7) e para o apoio "R$ X em aberto" da lista de
 * Clientes. Situação atual, sempre — mesmo recorte de `resumoFinanceiroDoCliente.
 * aReceber`, só que para a empresa inteira, agrupado por cliente.
 *
 * **Duas consultas, nunca uma por cliente**: os títulos `aberto` com serviço
 * ativo (id, cliente, valor) — não dá para `groupBy` o saldo direto, porque
 * o valor já recebido mora em `Recebimento`, sem `cliente_id` próprio — e
 * `totalRecebidoPorTitulo` sobre os ids encontrados, reduzidos em memória por
 * `cliente_id`. Mesmo padrão de `comSituacaoEmLote`, acima.
 */
export async function valorEmAbertoPorCliente(empresaId: string): Promise<Map<string, number>> {
  const titulos = await db(empresaId).tituloReceber.findMany({
    where: { arquivado_em: null, status: "aberto", servico: { arquivado_em: null } },
    select: { id: true, cliente_id: true, valor: true },
  });
  const totalPorTitulo = await totalRecebidoPorTitulo(
    empresaId,
    titulos.map((t) => t.id),
  );

  const mapa = new Map<string, number>();
  for (const t of titulos) {
    const saldo = t.valor - (totalPorTitulo.get(t.id) ?? 0);
    mapa.set(t.cliente_id, (mapa.get(t.cliente_id) ?? 0) + saldo);
  }
  return mapa;
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
