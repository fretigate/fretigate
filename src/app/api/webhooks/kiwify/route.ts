import { NextResponse } from "next/server";
import { z } from "zod";
import {
  registrarPagamento,
  mandarEmailDeAtivacao,
  estornarPagamento,
  atualizarStatusAssinaturaPorAssinanteGateway,
} from "@/lib/servicos/pagamentos";
import { travaDeWebhookKiwify } from "@/lib/servicos/trava-de-webhook";

/**
 * Webhook da Kiwify (item 13, Tarefa 1 — `docs/planos/
 * item-13-assinatura.md`). Rota de API, não Server Action: quem chama é a
 * Kiwify, não um usuário logado — mesma categoria de
 * `api/fretes/[id]/comprovante`, fora do alcance de `comoUsuario`/
 * `comoDono` e de `tests/protecao-de-acoes.test.ts` (que só varre arquivo
 * com `"use server"`). É a SEGUNDA rota do produto que grava estado sem
 * passar por esse envelope — `CLAUDE.md` §9 já previa revisitar essa nota
 * "depois da segunda ou terceira rota". A checagem que substitui a sessão
 * aqui não é "quem está logado" — é "isto veio mesmo da Kiwify", abaixo.
 *
 * ⚠️ **FORMATO DO PAYLOAD NÃO CONFIRMADO CONTRA ENTREGA REAL.** A pesquisa
 * que fundamentou o plano confirmou o formato do objeto de venda pela API
 * REST da Kiwify (`docs.kiwify.com.br/api-reference/sales/single`) — nunca
 * um payload de webhook de verdade, porque isso exige uma conta Kiwify de
 * verdade disparando um evento de teste. O corpo abaixo (`SchemaWebhook`)
 * é a melhor leitura possível a partir da documentação oficial disponível,
 * não uma medição. **Antes de considerar esta rota pronta para produção**:
 * configurar o webhook na Kiwify, usar "Testar Webhook" no painel deles, e
 * conferir contra o que chega de verdade — campo a campo, principalmente o
 * nome do campo que identifica QUAL evento disparou (`compra_aprovada` vs.
 * `subscription_renewed` etc.) e o mecanismo de autenticidade (abaixo).
 *
 * ⚠️ **AUTENTICIDADE DO WEBHOOK, MESMA RESSALVA.** A Kiwify gera um "token
 * de segurança" por webhook configurado (`docs.kiwify.com.br/api-reference/
 * webhooks/create`, campo `token`), descrito pela documentação de
 * terceiros como enviado em toda entrega para o receptor comparar — mas o
 * mecanismo exato (corpo, cabeçalho, ou os dois) não foi confirmado nesta
 * pesquisa. Este arquivo assume que o valor chega em `token`, no corpo —
 * CONFERIR contra entrega real antes de confiar nisto em produção. Sem
 * essa confirmação, um endpoint público que cria dado a partir do que
 * recebe (`registrarPagamento`, que pode terminar criando uma Empresa
 * inteira) é exatamente o formato que mais precisa dessa checagem — pedido
 * explícito do fundador ao aprovar a construção desta tarefa.
 */

const KIWIFY_WEBHOOK_TOKEN = process.env.KIWIFY_WEBHOOK_TOKEN;

if (!KIWIFY_WEBHOOK_TOKEN) {
  throw new Error(
    "KIWIFY_WEBHOOK_TOKEN não está definida. É o token de segurança configurado " +
      "no painel da Kiwify (Apps > Webhooks) — sem ele, a rota não tem como " +
      "conferir que uma entrega veio mesmo da Kiwify.",
  );
}

const schemaComprador = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  cpf: z.string().nullish(),
});

const schemaProduto = z.object({ id: z.string() });

/**
 * Kiwify `product.id` → periodicidade do plano — a Kiwify precisa de um
 * produto/oferta configurado por periodicidade (Tarefa 2 do plano, "as
 * telas dentro do produto"). Vazio de propósito até essa configuração
 * existir: sem entrada aqui, `mapearPeriodicidade` recusa — nunca grava um
 * palpite. Preencher com os ids reais assim que a Tarefa 2 criar as duas
 * ofertas na Kiwify.
 */
const PERIODICIDADE_POR_PRODUTO_KIWIFY: Record<string, "mensal" | "anual"> = {};

function mapearPeriodicidade(produtoId: string): "mensal" | "anual" | null {
  return PERIODICIDADE_POR_PRODUTO_KIWIFY[produtoId] ?? null;
}

/**
 * Melhor leitura possível do objeto de venda da Kiwify — ver a ressalva no
 * topo do arquivo. `event` é o campo mais incerto de todos: nenhuma fonte
 * consultada confirmou o nome exato do campo que a Kiwify usa para dizer
 * qual gatilho disparou dentro do corpo entregue.
 */
const schemaWebhook = z.object({
  token: z.string(),
  event: z.string().optional(),
  order_status: z.string().optional(),
  status: z.string().optional(),
  order_id: z.string().optional(),
  id: z.string().optional(),
  payment_method: z.string().optional(),
  customer: schemaComprador.optional(),
  Customer: schemaComprador.optional(),
  product: schemaProduto.optional(),
  /** Confirmado no objeto de venda da API REST — presumidamente em
   * centavos, como todo valor monetário do FretiGate (`CLAUDE.md` §7), mas
   * não confirmado que o webhook usa o mesmo campo/unidade, NEM que é o
   * valor bruto (o que o cliente pagou) e não líquido (o que a Kiwify
   * repassa, já descontada a taxa) — ver a lacuna no plano. `.int()`
   * recusa qualquer valor não inteiro em vez de arredondar em silêncio no
   * `::integer` que gravaria — dinheiro nunca aceita decimal flutuante
   * (`CLAUDE.md` §7). */
  net_amount: z.number().int().optional(),
});

type CorpoWebhook = z.infer<typeof schemaWebhook>;

/** Qual dos campos possíveis carrega o identificador do evento — ver a ressalva acima. */
function extrairEvento(corpo: CorpoWebhook): string | null {
  return corpo.event ?? corpo.order_status ?? corpo.status ?? null;
}

function extrairComprador(corpo: CorpoWebhook) {
  return corpo.customer ?? corpo.Customer ?? null;
}

function extrairTransacaoExterna(corpo: CorpoWebhook): string | null {
  return corpo.order_id ?? corpo.id ?? null;
}

const EVENTOS_COMPRA_APROVADA = new Set(["compra_aprovada", "paid", "PURCHASE_APPROVED"]);
const EVENTOS_RENOVACAO = new Set(["subscription_renewed"]);
const EVENTOS_ATRASO = new Set(["subscription_late"]);
const EVENTOS_CANCELAMENTO = new Set(["subscription_canceled"]);
const EVENTOS_ESTORNO = new Set(["compra_reembolsada", "chargeback", "refunded"]);

/**
 * Eventos de assinatura DEPOIS do primeiro pagamento (renovação, atraso,
 * cancelamento) — achado do `/revisar`: a primeira versão silenciava tanto
 * a falta de `comprador` quanto `atualizarStatusAssinaturaPorAssinanteGateway`
 * devolvendo `false` (empresa não encontrada), sempre respondendo `ok:
 * true`. Isso é dinheiro — uma empresa cujo `subscription_canceled` some em
 * silêncio fica `ativa` para sempre, de graça, sem ninguém saber. Falha
 * alta: devolve 500 (a Kiwify reentrega) e loga, em vez de fingir sucesso.
 */
async function atualizarStatusOuFalhar(
  corpo: CorpoWebhook,
  novoStatus: "ativa" | "inadimplente" | "vencida" | "encerrada",
) {
  const comprador = extrairComprador(corpo);
  if (!comprador) {
    console.error("[webhook kiwify] evento de assinatura sem dados do comprador");
    return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
  }

  const achou = await atualizarStatusAssinaturaPorAssinanteGateway(comprador.id, novoStatus);
  if (!achou) {
    console.error(
      "[webhook kiwify] nenhuma empresa com este gateway_assinante_id — status não atualizado",
      novoStatus,
    );
    return NextResponse.json({ erro: "Empresa não encontrada." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const trava = await travaDeWebhookKiwify();
  if (!trava.permitido) {
    return NextResponse.json({ erro: "Muitas entregas em pouco tempo." }, { status: 429 });
  }

  const bruto = await request.json().catch(() => null);
  if (!bruto) {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const resultado = schemaWebhook.safeParse(bruto);
  if (!resultado.success) {
    // Não loga o corpo cru — pode conter e-mail/nome/documento do
    // comprador (CLAUDE.md §4: "log nunca contém dado pessoal"). Só as
    // chaves de primeiro nível, para ajudar a diagnosticar um formato
    // diferente do esperado sem vazar dado de ninguém.
    console.error(
      "[webhook kiwify] corpo não bate com o formato esperado, chaves recebidas:",
      Object.keys(bruto as object),
    );
    return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
  }
  const corpo = resultado.data;

  // Comparação simples, não `timingSafeEqual`: o valor comparado não é uma
  // senha de usuário nem uma chave criptográfica nossa — é um segredo
  // compartilhado configurado uma vez no painel da Kiwify, de baixa
  // sensibilidade a ataque de tempo (a única coisa que vazaria por timing
  // seria "quantos caracteres bateram", e o token não protege nada além
  // desta própria checagem).
  if (corpo.token !== KIWIFY_WEBHOOK_TOKEN) {
    console.error("[webhook kiwify] token de segurança não confere");
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const evento = extrairEvento(corpo);
  const transacaoExterna = extrairTransacaoExterna(corpo);
  if (!evento || !transacaoExterna) {
    console.error("[webhook kiwify] evento ou id da transação ausente no corpo");
    return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
  }

  if (EVENTOS_COMPRA_APROVADA.has(evento)) {
    const comprador = extrairComprador(corpo);
    if (!comprador) {
      console.error("[webhook kiwify] compra aprovada sem dados do comprador");
      return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
    }

    // ⚠️ `s1`/tracking (empresa_id do upgrade de dentro do produto — ver
    // "Upgrade de dentro do produto" no plano) ainda não tem campo
    // confirmado no corpo. Por ora, todo `compra_aprovada` vira
    // `PagamentoPendente` (caminho do Fluxo B) — o caminho de upgrade com
    // `s1` fica para quando a Tarefa 2 configurar as ofertas na Kiwify e
    // confirmar o campo de rastreio na entrega real.
    if (!corpo.product || corpo.net_amount == null) {
      console.error("[webhook kiwify] compra aprovada sem produto ou valor");
      return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
    }

    const periodicidade = mapearPeriodicidade(corpo.product.id);
    if (!periodicidade) {
      // Falha alta de propósito (§9 — "falha fechada"), nunca grava um
      // palpite de periodicidade: a Kiwify reenvia em caso de erro, então
      // assim que `PERIODICIDADE_POR_PRODUTO_KIWIFY` for preenchida
      // (Tarefa 2), a reentrega passa a funcionar sozinha.
      console.error(
        "[webhook kiwify] produto sem periodicidade mapeada — falta configurar a Tarefa 2",
      );
      return NextResponse.json({ erro: "Produto não mapeado." }, { status: 500 });
    }

    const pagamento = await registrarPagamento({
      gateway: "kiwify",
      transacaoExterna,
      emailComprador: comprador.email,
      nomeComprador: comprador.name,
      gatewayAssinanteId: comprador.id,
      documentoComprador: comprador.cpf ?? null,
      periodicidade,
      valorCentavos: corpo.net_amount,
      recebidoEm: new Date(),
    });

    // Só manda o e-mail se o token ainda estiver 'pendente' — achado do
    // `/revisar`: sem esta checagem, a reentrega de um evento já processado
    // (aceito ou estornado desde a primeira chegada) reenviaria um link
    // morto ao comprador. `registrarPagamento` é deduplicado por
    // `transacaoExterna` e devolve o status ATUAL, não o do momento em que
    // o token nasceu.
    if (pagamento.status === "pendente") {
      // O e-mail é o ÚNICO caminho de entrega confirmado (ver o comentário
      // de `mandarEmailDeAtivacao`) — por isso a falha NÃO é engolida:
      // devolve erro para a Kiwify reentregar o evento mais tarde, tentando
      // de novo.
      try {
        await mandarEmailDeAtivacao({
          id: pagamento.id,
          token: pagamento.token,
          emailComprador: comprador.email,
        });
      } catch (erroEmail) {
        console.error(
          "[webhook kiwify] falha ao mandar e-mail de ativação — Kiwify vai reentregar",
          pagamento.id,
          erroEmail instanceof Error ? erroEmail.message : "erro desconhecido",
        );
        return NextResponse.json({ erro: "Falha ao enviar e-mail." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (EVENTOS_RENOVACAO.has(evento)) {
    return atualizarStatusOuFalhar(corpo, "ativa");
  }

  if (EVENTOS_ATRASO.has(evento)) {
    return atualizarStatusOuFalhar(corpo, "inadimplente");
  }

  if (EVENTOS_CANCELAMENTO.has(evento)) {
    return atualizarStatusOuFalhar(corpo, "vencida");
  }

  if (EVENTOS_ESTORNO.has(evento)) {
    // Caso 4 do plano: se ainda pendente, o token morre. Se já foi
    // aceito, a empresa já existe — muda de estado como cancelamento.
    const { estornou } = await estornarPagamento(transacaoExterna);
    if (!estornou) {
      return atualizarStatusOuFalhar(corpo, "vencida");
    }
    return NextResponse.json({ ok: true });
  }

  // Evento reconhecido pelo schema mas fora do mapa desta tarefa
  // (boleto_gerado, pix_gerado, carrinho_abandonado, compra_recusada) —
  // confirma recebimento sem fazer nada, para a Kiwify não reenviar à toa.
  return NextResponse.json({ ok: true });
}
