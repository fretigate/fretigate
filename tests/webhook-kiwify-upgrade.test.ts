import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { Client } from "pg";

/**
 * O contraste que faltava — achado ao responder a pergunta do fundador,
 * 18/09/2026: nem `tests/pagamentos.test.ts` (que chama
 * `resolverUpgradePorToken` direto) nem `tests/verificacao-kiwify.test.ts`
 * (funções puras) exercitam a ROTA de verdade (`api/webhooks/kiwify/
 * route.ts`) — o lugar exato onde a primeira versão do mecanismo (`s1` =
 * `empresa_id` cru) tinha o furo que o `CLAUDE.md` §3 proíbe. Sem este
 * arquivo, nada reprovaria se alguém revertesse `route.ts` para tratar
 * `s1` como identificador direto em vez de token opaco — a suíte inteira
 * continuaria verde, porque nenhum teste chamava a rota.
 *
 * `next/headers` precisa de mock (`travaDeWebhookKiwify` chama `headers()`,
 * que só funciona dentro de um pedido real) — mesmo padrão de
 * `tests/bloqueio-de-escrita.test.ts`/`tests/sessao-e-papel.test.ts`.
 * `mandarEmailDeAtivacao` é mockado para não disparar e-mail de verdade
 * pela Resend (`CLAUDE.md` §5: nenhum teste desta suíte manda e-mail de
 * verdade) — só a chamada é conferida, nunca o envio.
 */

const headersControlados = vi.hoisted(() => ({ atual: new Headers() as Headers }));
vi.mock("next/headers", () => ({
  headers: async () => headersControlados.atual,
}));

const mandarEmailDeAtivacaoMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/servicos/pagamentos", async (importOriginal) => {
  const modulo = await importOriginal<typeof import("@/lib/servicos/pagamentos")>();
  return { ...modulo, mandarEmailDeAtivacao: mandarEmailDeAtivacaoMock };
});

const { POST } = await import("@/app/api/webhooks/kiwify/route");
const { criarSolicitacaoUpgrade } = await import("@/lib/servicos/pagamentos");

const marca = process.hrtime.bigint().toString(16).slice(-8);
const SEGREDO = process.env.KIWIFY_WEBHOOK_TOKEN!;

let raiz: Client;
const empresasParaLimpar: string[] = [];
const pagamentosParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 6;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Webhook Upgrade Teste ${marca} ${sufixo}`],
  );
  empresasParaLimpar.push(id);
  return id;
}

function assinar(corpo: unknown): string {
  return createHmac("sha1", SEGREDO).update(JSON.stringify(corpo)).digest("hex");
}

/**
 * Payload mínimo, mas real no formato — mesmos campos exigidos por
 * `route.ts` para `order_approved` (Subscription, Commissions, Customer,
 * Product). `s1` é preenchido por cada teste.
 */
function payloadCompraAprovada(s1: string, orderId: string) {
  return {
    order_id: orderId,
    webhook_event_type: "order_approved",
    Product: { product_id: "produto-teste", product_name: "Plano Mensal" },
    Customer: {
      full_name: "Fulano de Teste",
      email: `fulano-${marca}@example.com`,
      CPF: "00000000000",
    },
    Commissions: { charge_amount: 19700 },
    TrackingParameters: { s1 },
    Subscription: { plan: { frequency: "monthly" } },
    subscription_id: `assinante-webhook-${marca}-${orderId}`,
  };
}

function requisicao(corpo: unknown): Request {
  const assinatura = assinar(corpo);
  return new Request(`http://localhost/api/webhooks/kiwify?signature=${assinatura}`, {
    method: "POST",
    body: JSON.stringify(corpo),
  });
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (pagamentosParaLimpar.length) {
    await raiz.query(`DELETE FROM "pagamento_pendente" WHERE id = ANY($1)`, [pagamentosParaLimpar]);
  }
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "solicitacao_upgrade" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("Rota do webhook — contraste com a primeira versão do mecanismo de upgrade", () => {
  it("s1 = empresa_id cru (a versão rejeitada) NÃO faz upgrade nenhum — cai no Fluxo B", async () => {
    const empresaId = await criarEmpresaDeTeste("s1-cru-rejeitado");
    const orderId = `s1-cru-${marca}`;

    const resposta = await POST(requisicao(payloadCompraAprovada(empresaId, orderId)));
    expect(resposta.status).toBeLessThan(500);
    conferencias++;

    const { rows } = await raiz.query(
      `SELECT plano, status_assinatura FROM "empresa" WHERE id = $1`,
      [empresaId],
    );
    // A prova central: um `empresa_id` de verdade, mandado cru em `s1` —
    // exatamente a primeira versão do mecanismo, que o CLAUDE.md §3 proíbe
    // — não upgrade a empresa. Se isto voltar a passar como `pago`, a
    // regressão para a versão 1 está de volta e este teste reprova.
    expect(rows[0]!.plano).not.toBe("pago");
    conferencias++;

    // Confirma que caiu mesmo no Fluxo B (e-mail de ativação disparado, não
    // o upgrade direto) — sem isto, um "silenciosamente não fez nada" com o
    // mesmo resultado observável passaria despercebido.
    expect(mandarEmailDeAtivacaoMock).toHaveBeenCalled();
    conferencias++;

    const pendentes = await raiz.query(
      `SELECT id, s1_sem_correspondencia FROM "pagamento_pendente" WHERE gateway_assinante_id = $1`,
      [`assinante-webhook-${marca}-${orderId}`],
    );
    pagamentosParaLimpar.push(...pendentes.rows.map((linha) => linha.id as string));
    expect(pendentes.rows[0]?.s1_sem_correspondencia).toBe(empresaId);
    conferencias++;
  });

  it("s1 = token real de SolicitacaoUpgrade FAZ o upgrade, pela rota de verdade", async () => {
    const empresaId = await criarEmpresaDeTeste("s1-token-aceito");
    const orderId = `s1-token-${marca}`;
    const { token } = await criarSolicitacaoUpgrade(empresaId);

    const resposta = await POST(requisicao(payloadCompraAprovada(token, orderId)));
    const corpoResposta = await resposta.json();
    expect(corpoResposta).toEqual({ ok: true });
    conferencias++;

    const { rows } = await raiz.query(
      `SELECT plano, status_assinatura FROM "empresa" WHERE id = $1`,
      [empresaId],
    );
    expect(rows[0]).toMatchObject({ plano: "pago", status_assinatura: "ativa" });
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
