import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assinaturaValida,
  schemaWebhook,
  extrairEvento,
  mapearPeriodicidade,
  PERIODICIDADE_POR_FREQUENCIA_KIWIFY,
  EVENTOS_COMPRA_APROVADA,
  EVENTOS_RENOVACAO,
  EVENTOS_ATRASO,
  EVENTOS_CANCELAMENTO,
  EVENTOS_ESTORNO,
} from "@/lib/servicos/verificacao-kiwify";

/**
 * Leitura do payload da Kiwify e verificação de assinatura — item 13,
 * correção de formato (`docs/planos/corrige-webhook-kiwify.md`, 03/09/2026).
 * A rota nunca teve teste automatizado antes desta tarefa (achado ao
 * planejar) — este arquivo cobre as funções puras, sem servidor HTTP nem
 * banco: assinatura, extração de evento, mapeamento de periodicidade, e o
 * schema contra um payload real capturado (não fabricado).
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 14;

const SEGREDO = "token-de-teste-nao-e-segredo-de-verdade";

/**
 * Payload real, capturado VERBATIM via "Testar Webhook" contra a conta de
 * verdade da Kiwify (03/09/2026, colado pelo fundador na conversa) —
 * exemplo genérico fixo que a Kiwify manda para qualquer clique nesse
 * botão, não uma venda real dos planos Mensal/Anual. Confirma o FORMATO,
 * que é o que este teste mede. Valores de e-mail/nome já são fictícios no
 * próprio exemplo da Kiwify ("John Doe" etc.) — não é dado de cliente de
 * verdade. Nenhum campo removido ou reescrito — achado do `/revisar`: uma
 * versão anterior deste fixture recortava campos à mão e ainda se
 * afirmava "não fabricada", o que não era exato.
 */
const PAYLOAD_REAL_DE_TESTE = {
  order_id: "5ab356f5-0c77-4a4f-8a28-97c354f2595b",
  order_ref: "QVDOnCK",
  order_status: "paid",
  product_type: "membership",
  payment_method: "credit_card",
  store_id: "r0Agn7qINvqt7cF",
  payment_merchant_id: 26533900,
  installments: 1,
  card_type: "mastercard",
  card_last4digits: "7970",
  card_rejection_reason: null,
  boleto_URL: null,
  boleto_barcode: null,
  boleto_expiry_date: null,
  pix_code: null,
  pix_expiration: null,
  sale_type: "producer",
  created_at: "2026-09-03 20:46",
  updated_at: "2026-09-03 20:46",
  approved_date: "2026-09-04 20:46",
  refunded_at: null,
  webhook_event_type: "order_approved",
  Product: {
    product_id: "da157a91-80a4-4458-933c-41e965077f6a",
    product_name: "Example product",
  },
  Customer: {
    full_name: "John Doe",
    first_name: "John",
    email: "johndoe@example.com",
    mobile: "+54098571700",
    CPF: "60862336702",
    ip: "55.100.126.37",
    instagram: "@kiwify",
    street: "Rua 1001",
    number: "315",
    complement: "SL 05",
    neighborhood: "Centro",
    city: "Balneário Camboriú",
    state: "SC",
    zipcode: "88330-756",
    custom_fields: [{ title: "Example field", value: "Example value" }],
  },
  Commissions: {
    charge_amount: 6426,
    product_base_price: 6426,
    product_base_price_currency: "BRL",
    kiwify_fee: 707,
    kiwify_fee_currency: "BRL",
    settlement_amount: 6426,
    settlement_amount_currency: "BRL",
    sale_tax_rate: 0,
    sale_tax_amount: 0,
    commissioned_stores: [
      {
        id: "b0defc10-2f58-463d-a35d-9e002dcc6736",
        type: "producer",
        custom_name: "Example store",
        email: "example@store.domain",
        value: "5719",
      },
      {
        id: "08ba93af-3a71-456f-b3bb-5a9ea77f930b",
        type: "coproducer",
        custom_name: "Example coproducer",
        email: "example@coproducer.domain",
        value: "5719",
      },
      {
        id: "ff636c44-86a8-43d5-9eb5-af444ad305ae",
        type: "affiliate",
        affiliate_id: "PZxOcLW",
        custom_name: "Example affiliate",
        email: "example@affiliate.domain",
        value: "5719",
      },
    ],
    currency: "BRL",
    my_commission: 5719,
    funds_status: null,
    estimated_deposit_date: null,
    deposit_date: null,
  },
  TrackingParameters: {
    src: null,
    sck: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    s1: null,
    s2: null,
    s3: null,
  },
  Subscription: {
    id: "064f6c79-db51-49de-abe4-ef902ed51a41",
    start_date: "2026-08-31T20:46:52.071Z",
    next_payment: "2026-09-07T20:46:52.071Z",
    status: "active",
    plan: {
      id: "c1ac3d9f-0a18-4fc4-916e-bf3b4f91220b",
      name: "Example plan",
      frequency: "weekly",
      qty_charges: 0,
    },
    charges: {
      completed: [
        {
          order_id: "5ab356f5-0c77-4a4f-8a28-97c354f2595b",
          amount: 5719,
          status: "paid",
          installments: 1,
          card_type: "mastercard",
          card_last_digits: "2142",
          card_first_digits: "243670",
          created_at: "2026-08-31T20:46:52.071Z",
        },
      ],
      future: [{ charge_date: "2026-09-07T20:46:52.071Z" }],
    },
  },
  subscription_id: "064f6c79-db51-49de-abe4-ef902ed51a41",
  access_url: null,
};

function assinar(corpo: unknown, segredo: string): string {
  return createHmac("sha1", segredo).update(JSON.stringify(corpo)).digest("hex");
}

describe("assinaturaValida", () => {
  it("1. aceita a assinatura calculada com o segredo certo", () => {
    const assinatura = assinar(PAYLOAD_REAL_DE_TESTE, SEGREDO);
    expect(assinaturaValida(PAYLOAD_REAL_DE_TESTE, assinatura, SEGREDO)).toBe(true);
    conferencias++;
  });

  it("2. recusa assinatura calculada com segredo errado", () => {
    const assinaturaErrada = assinar(PAYLOAD_REAL_DE_TESTE, "outro-segredo-qualquer");
    expect(assinaturaValida(PAYLOAD_REAL_DE_TESTE, assinaturaErrada, SEGREDO)).toBe(false);
    conferencias++;
  });

  it("3. recusa quando não há assinatura nenhuma (null)", () => {
    expect(assinaturaValida(PAYLOAD_REAL_DE_TESTE, null, SEGREDO)).toBe(false);
    conferencias++;
  });

  it("4. recusa assinatura de comprimento diferente sem lançar exceção", () => {
    expect(() => assinaturaValida(PAYLOAD_REAL_DE_TESTE, "abc123", SEGREDO)).not.toThrow();
    expect(assinaturaValida(PAYLOAD_REAL_DE_TESTE, "abc123", SEGREDO)).toBe(false);
    conferencias++;
  });

  it("5. corpo diferente do assinado (mesmo tamanho de assinatura) é recusado", () => {
    const assinatura = assinar(PAYLOAD_REAL_DE_TESTE, SEGREDO);
    const corpoAlterado = { ...PAYLOAD_REAL_DE_TESTE, order_id: "outro-id-qualquer" };
    expect(assinaturaValida(corpoAlterado, assinatura, SEGREDO)).toBe(false);
    conferencias++;
  });
});

describe("schemaWebhook — contra o payload real capturado", () => {
  it("6. o payload real de teste da Kiwify passa no schema", () => {
    const resultado = schemaWebhook.safeParse(PAYLOAD_REAL_DE_TESTE);
    expect(resultado.success).toBe(true);
    conferencias++;
  });

  it("7. recusa valor de dinheiro não inteiro (nunca arredonda em silêncio)", () => {
    const comCentavosFracionados = {
      ...PAYLOAD_REAL_DE_TESTE,
      Commissions: { ...PAYLOAD_REAL_DE_TESTE.Commissions, charge_amount: 6426.5 },
    };
    const resultado = schemaWebhook.safeParse(comCentavosFracionados);
    expect(resultado.success).toBe(false);
    conferencias++;
  });
});

describe("extrairEvento", () => {
  it("8. lê webhook_event_type", () => {
    const corpo = schemaWebhook.parse(PAYLOAD_REAL_DE_TESTE);
    expect(extrairEvento(corpo)).toBe("order_approved");
    conferencias++;
  });

  it("9. devolve null quando o campo não vem (ex.: carrinho_abandonado)", () => {
    const corpo = schemaWebhook.parse({ order_id: "x" });
    expect(extrairEvento(corpo)).toBeNull();
    conferencias++;
  });
});

describe("mapearPeriodicidade — falha fechada", () => {
  it("10. recusa (null) frequência não mapeada — nunca grava um palpite", () => {
    expect(mapearPeriodicidade("weekly")).toBeNull();
    conferencias++;
  });

  it("11. mapeia quando a entrada existir no mapa", () => {
    PERIODICIDADE_POR_FREQUENCIA_KIWIFY["frequencia-de-teste"] = "mensal";
    try {
      expect(mapearPeriodicidade("frequencia-de-teste")).toBe("mensal");
    } finally {
      delete PERIODICIDADE_POR_FREQUENCIA_KIWIFY["frequencia-de-teste"];
    }
    conferencias++;
  });
});

describe("conjuntos de eventos — não mais os valores antigos supostos", () => {
  it("12. cada conjunto usa o valor documentado de webhook_event_type — só order_approved veio de entrega real capturada, os outros quatro vêm da doc oficial", () => {
    expect(EVENTOS_COMPRA_APROVADA.has("order_approved")).toBe(true);
    expect(EVENTOS_COMPRA_APROVADA.has("compra_aprovada")).toBe(false);
    expect(EVENTOS_RENOVACAO.has("subscription_renewed")).toBe(true);
    expect(EVENTOS_ATRASO.has("subscription_late")).toBe(true);
    expect(EVENTOS_CANCELAMENTO.has("subscription_canceled")).toBe(true);
    expect(EVENTOS_ESTORNO.has("order_refunded")).toBe(true);
    expect(EVENTOS_ESTORNO.has("chargeback")).toBe(true);
    expect(EVENTOS_ESTORNO.has("refunded")).toBe(false);
    conferencias++;
  });
});

describe("PERIODICIDADE_POR_FREQUENCIA_KIWIFY — valores reais confirmados", () => {
  it("13. mapeia os dois planos reais do FretiGate, lidos da API de produtos da Kiwify (05/09/2026)", () => {
    expect(mapearPeriodicidade("monthly")).toBe("mensal");
    expect(mapearPeriodicidade("annually")).toBe("anual");
    conferencias++;
  });

  it("14. nome herdado de Object.prototype não escapa pelo `?? null` — recusa mesmo assim", () => {
    expect(mapearPeriodicidade("constructor")).toBeNull();
    expect(mapearPeriodicidade("toString")).toBeNull();
    expect(mapearPeriodicidade("hasOwnProperty")).toBeNull();
    conferencias++;
  });
});

it("conta as verificações — reprova se rodou menos do que o esperado", () => {
  expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
});
