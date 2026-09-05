import { NextResponse } from "next/server";
import {
  registrarPagamento,
  mandarEmailDeAtivacao,
  estornarPagamento,
  atualizarStatusAssinaturaPorAssinanteGateway,
} from "@/lib/servicos/pagamentos";
import { travaDeWebhookKiwify } from "@/lib/servicos/trava-de-webhook";
import {
  schemaWebhook,
  assinaturaValida,
  extrairEvento,
  mapearPeriodicidade,
  EVENTOS_COMPRA_APROVADA,
  EVENTOS_RENOVACAO,
  EVENTOS_ATRASO,
  EVENTOS_CANCELAMENTO,
  EVENTOS_ESTORNO,
  type CorpoWebhook,
} from "@/lib/servicos/verificacao-kiwify";

/**
 * Webhook da Kiwify (item 13, Tarefa 1 — `docs/planos/
 * item-13-assinatura.md` — e a correção de formato em
 * `docs/planos/corrige-webhook-kiwify.md`). Rota de API, não Server
 * Action: quem chama é a Kiwify, não um usuário logado — mesma categoria
 * de `api/fretes/[id]/comprovante`, fora do alcance de
 * `comoUsuario`/`comoDono` e de `tests/protecao-de-acoes.test.ts` (que só
 * varre arquivo com `"use server"`). É a SEGUNDA rota do produto que
 * grava estado sem passar por esse envelope — `CLAUDE.md` §9 já previa
 * revisitar essa nota "depois da segunda ou terceira rota". A checagem
 * que substitui a sessão aqui não é "quem está logado" — é "isto veio
 * mesmo da Kiwify" (`assinaturaValida`, `verificacao-kiwify.ts`).
 *
 * A leitura do formato do payload e a verificação de assinatura moram em
 * `src/lib/servicos/verificacao-kiwify.ts` — testável sem servidor HTTP,
 * e porque `route.ts` só pode exportar o que o Next.js reconhece.
 *
 * O que ainda falta bloqueando "pronto para produção" (`CLAUDE.md` §14):
 * a fórmula da assinatura (`assinaturaValida`, `verificacao-kiwify.ts`),
 * nunca medida contra a URL/querystring de uma entrega real — só o corpo
 * foi capturado até agora. Só uma compra real (com os cabeçalhos/
 * querystring capturados) revela isso.
 *
 * Os valores de `Subscription.plan.frequency` dos dois planos reais
 * (Mensal/Anual) **já foram confirmados** (05/09/2026,
 * `PERIODICIDADE_POR_FREQUENCIA_KIWIFY` em `verificacao-kiwify.ts`) — não
 * por uma venda de verdade, mas pela API de produtos da própria Kiwify,
 * lendo a configuração real dos dois planos. Ainda não confirmado: que um
 * webhook de compra de verdade carregue esse mesmo valor no mesmo campo —
 * só uma compra real fecha essa dúvida por completo.
 */

const KIWIFY_WEBHOOK_TOKEN = process.env.KIWIFY_WEBHOOK_TOKEN;

if (!KIWIFY_WEBHOOK_TOKEN) {
  throw new Error(
    "KIWIFY_WEBHOOK_TOKEN não está definida. É o token de segurança configurado " +
      "no painel da Kiwify (Apps > Webhooks) — sem ele, a rota não tem como " +
      "conferir que uma entrega veio mesmo da Kiwify.",
  );
}

function extrairComprador(corpo: CorpoWebhook) {
  return corpo.Customer ?? null;
}

/**
 * Eventos de assinatura DEPOIS do primeiro pagamento (renovação, atraso,
 * cancelamento) — achado do `/revisar` na Tarefa 1: a primeira versão
 * silenciava tanto a falta de `comprador` quanto
 * `atualizarStatusAssinaturaPorAssinanteGateway` devolvendo `false`
 * (empresa não encontrada), sempre respondendo `ok: true`. Isso é
 * dinheiro — uma empresa cujo `subscription_canceled` some em silêncio
 * fica `ativa` para sempre, de graça, sem ninguém saber. Falha alta:
 * devolve 500 (a Kiwify reentrega) e loga, em vez de fingir sucesso.
 */
async function atualizarStatusOuFalhar(
  corpo: CorpoWebhook,
  novoStatus: "ativa" | "inadimplente" | "vencida" | "encerrada",
) {
  if (!corpo.subscription_id) {
    console.error("[webhook kiwify] evento de assinatura sem subscription_id");
    return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
  }

  const achou = await atualizarStatusAssinaturaPorAssinanteGateway(
    corpo.subscription_id,
    novoStatus,
  );
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

  const textoBruto = await request.text().catch(() => null);
  if (!textoBruto) {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(textoBruto);
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const assinaturaRecebida = new URL(request.url).searchParams.get("signature");
  if (!assinaturaValida(bruto, assinaturaRecebida, KIWIFY_WEBHOOK_TOKEN!)) {
    console.error("[webhook kiwify] assinatura não confere");
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
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

  const evento = extrairEvento(corpo);
  if (!evento || !corpo.order_id) {
    console.error("[webhook kiwify] evento ou id da transação ausente no corpo");
    return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
  }
  const transacaoExterna = corpo.order_id;

  if (EVENTOS_COMPRA_APROVADA.has(evento)) {
    const comprador = extrairComprador(corpo);
    if (!comprador) {
      console.error("[webhook kiwify] compra aprovada sem dados do comprador");
      return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
    }

    // ⚠️ `s1`/tracking (empresa_id do upgrade de dentro do produto — ver
    // "Upgrade de dentro do produto" no plano) ainda não tem campo
    // confirmado no corpo. Por ora, todo `order_approved` vira
    // `PagamentoPendente` (caminho do Fluxo B) — o caminho de upgrade com
    // `s1` fica para quando a Tarefa 2 confirmar o campo de rastreio.
    if (
      !corpo.Product ||
      !corpo.Commissions ||
      !corpo.Subscription?.plan ||
      !corpo.subscription_id
    ) {
      console.error("[webhook kiwify] compra aprovada sem produto, valor ou assinatura");
      return NextResponse.json({ erro: "Formato inesperado." }, { status: 400 });
    }

    const periodicidade = mapearPeriodicidade(corpo.Subscription.plan.frequency);
    if (!periodicidade) {
      // Falha alta de propósito (§9 — "falha fechada"), nunca grava um
      // palpite de periodicidade. `PERIODICIDADE_POR_FREQUENCIA_KIWIFY` já
      // tem os dois planos reais (Mensal/Anual) — este caminho só é
      // alcançado se a Kiwify mandar uma frequência diferente das duas
      // configuradas hoje (produto novo, plano novo, ou o campo do webhook
      // de compra de verdade divergir do que a API de produtos informou).
      // A reentrega da Kiwify não resolve sozinha um mapa que segue sem
      // aquela entrada — ela reentrega só "até 5 vezes" (doc oficial), não
      // para sempre.
      // ⚠️ Lacuna: nenhuma linha de PagamentoPendente é criada aqui — o
      // único rastro deste pagamento é este log (nunca o corpo, dado
      // pessoal — CLAUDE.md §4).
      console.error(
        "[webhook kiwify] frequência sem periodicidade mapeada",
        corpo.Subscription.plan.frequency,
      );
      return NextResponse.json({ erro: "Frequência não mapeada." }, { status: 500 });
    }

    const pagamento = await registrarPagamento({
      gateway: "kiwify",
      transacaoExterna,
      emailComprador: comprador.email,
      nomeComprador: comprador.full_name,
      gatewayAssinanteId: corpo.subscription_id,
      documentoComprador: comprador.CPF ?? null,
      periodicidade,
      valorCentavos: corpo.Commissions.charge_amount,
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
  // (boleto_gerado, pix_gerado — a rota não está inscrita nesses
  // gatilhos, mas responde ok se algum chegar) — confirma recebimento
  // sem fazer nada, para a Kiwify não reenviar à toa.
  return NextResponse.json({ ok: true });
}
