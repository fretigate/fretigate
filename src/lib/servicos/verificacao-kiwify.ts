import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Leitura e verificação do payload da Kiwify — extraído da rota
 * (`api/webhooks/kiwify/route.ts`) para ficar testável: um arquivo de
 * rota (`route.ts`) só pode exportar os nomes que o Next.js reconhece
 * (`GET`/`POST`/config de segmento) — qualquer outro export não é
 * garantido de funcionar, e regra de negócio mora em `src/lib/servicos`
 * de qualquer forma (`CLAUDE.md` §6).
 *
 * **Formato do corpo CONFIRMADO contra entrega real** (03/09/2026,
 * `docs/planos/corrige-webhook-kiwify.md`) — a doc oficial da Kiwify
 * (Notion, linkada por `ajuda.kiwify.com.br` → "Como funcionam os
 * webhooks?") e um payload real capturado via "Testar Webhook" contra a
 * conta de verdade do fundador. A primeira versão desta rota (Tarefa 1 do
 * item 13) assumia um formato nunca medido — corrigido aqui.
 *
 * A entrega capturada é o **exemplo genérico fixo** que a Kiwify manda
 * para qualquer clique em "Testar Webhook" (produto "Example product",
 * plano "Example plan") — não uma venda real dos planos Mensal/Anual. Não
 * confirmado: se uma venda de verdade desses planos tem exatamente os
 * mesmos campos presentes (`Subscription.plan`, `Customer.CPF`) que as
 * quatro checagens em `route.ts` exigem para `order_approved`.
 *
 * **A FÓRMULA DA ASSINATURA (`assinaturaValida`) NÃO ESTÁ CONFIRMADA.** O
 * que foi capturado é só o CORPO (colado na conversa) — nunca a URL/
 * querystring nem os cabeçalhos da entrega real, que é onde o parâmetro
 * `signature` chegaria. A fórmula abaixo (HMAC-SHA1 sobre
 * `JSON.stringify` do corpo reserializado) é a que o exemplo de
 * referência da doc oficial mostra, não uma medição própria. Se estiver
 * errada, TODA entrega real cai em 401 e nunca cria conta — `CLAUDE.md`
 * §14, "CONFERIR ANTES DE PUBLICAR", registra isso como bloqueio.
 */

/**
 * A Kiwify manda a assinatura como `signature`, na querystring da URL de
 * entrega — nunca no corpo. A fórmula é a do próprio exemplo de referência
 * da doc oficial: HMAC-SHA1 sobre `JSON.stringify` do corpo **já
 * reserializado**, não os bytes crus da requisição (é o que a Kiwify
 * documenta como a verificação correta, e é o que esta função replica).
 *
 * Comprimento comparado antes de `timingSafeEqual` — buffers de tamanho
 * diferente fariam a função lançar exceção em vez de devolver `false`.
 */
export function assinaturaValida(
  corpo: unknown,
  assinaturaRecebida: string | null,
  segredo: string,
): boolean {
  if (!assinaturaRecebida) return false;

  const calculada = createHmac("sha1", segredo).update(JSON.stringify(corpo)).digest("hex");

  const bufferCalculado = Buffer.from(calculada, "hex");
  const bufferRecebido = Buffer.from(assinaturaRecebida, "hex");
  if (bufferCalculado.length !== bufferRecebido.length) return false;

  return timingSafeEqual(bufferCalculado, bufferRecebido);
}

const schemaComprador = z.object({
  full_name: z.string(),
  email: z.email(),
  CPF: z.string().nullish(),
});

const schemaProduto = z.object({
  product_id: z.string(),
});

const schemaComissoes = z.object({
  /** Confirmado no payload real: valor em centavos. QUAL valor — não
   * confirmado: `charge_amount`/`product_base_price` são iguais no
   * exemplo capturado, e é a leitura mais provável do bruto (o que o
   * cliente pagou), mas isso não foi medido contra uma venda real dos
   * planos Mensal/Anual — só contra o payload de teste genérico. Também
   * não confirmado: se o plano anual (12x) manda o total (R$ 1.164) ou a
   * parcela (R$ 97) — lacuna registrada no plano. `.int()` recusa
   * qualquer valor não inteiro em vez de arredondar em silêncio —
   * dinheiro nunca aceita decimal flutuante (`CLAUDE.md` §7). */
  charge_amount: z.number().int(),
});

const schemaPlano = z.object({
  /** Semanal/Mensal/Bimestral/Trimestral/Semestral/Anual da Kiwify, num
   * valor em inglês (confirmado: `"monthly"` na doc oficial, `"weekly"`
   * no payload de teste capturado) — o valor exato dos planos Mensal/
   * Anual do FretiGate ainda não foi medido, ver
   * `PERIODICIDADE_POR_FREQUENCIA_KIWIFY` abaixo. */
  frequency: z.string(),
});

const schemaAssinatura = z.object({
  plan: schemaPlano.optional(),
});

/**
 * Melhor leitura do formato real da Kiwify — payload plano, sem envelope,
 * campos em maiúscula por objeto aninhado (`Customer`, `Product`,
 * `Commissions`, `Subscription`). Confirmado contra a doc oficial e um
 * payload real capturado (ver o comentário no topo do arquivo).
 */
export const schemaWebhook = z.object({
  /** Ausente só no evento `carrinho_abandonado` (doc oficial) — que esta
   * rota nunca recebe, porque o webhook não está inscrito nesse gatilho. */
  webhook_event_type: z.string().optional(),
  order_id: z.string().optional(),
  Customer: schemaComprador.optional(),
  Product: schemaProduto.optional(),
  Commissions: schemaComissoes.optional(),
  Subscription: schemaAssinatura.optional(),
  /** Identifica a assinatura nos eventos futuros (renovação/atraso/
   * cancelamento) — `Customer` não tem `id` nenhum no payload real, então
   * é este campo, não o comprador, que localiza a empresa depois. */
  subscription_id: z.string().optional(),
});

export type CorpoWebhook = z.infer<typeof schemaWebhook>;

export function extrairEvento(corpo: CorpoWebhook): string | null {
  return corpo.webhook_event_type ?? null;
}

/**
 * Kiwify `Subscription.plan.frequency` → periodicidade do plano. Vazio de
 * propósito até o fundador confirmar os dois valores reais (Mensal/Anual)
 * contra uma compra de verdade — sem entrada aqui, `mapearPeriodicidade`
 * recusa, nunca grava um palpite (`CLAUDE.md` §9, "falha fechada").
 */
export const PERIODICIDADE_POR_FREQUENCIA_KIWIFY: Record<string, "mensal" | "anual"> = {};

export function mapearPeriodicidade(frequencia: string): "mensal" | "anual" | null {
  return PERIODICIDADE_POR_FREQUENCIA_KIWIFY[frequencia] ?? null;
}

export const EVENTOS_COMPRA_APROVADA = new Set(["order_approved"]);
export const EVENTOS_RENOVACAO = new Set(["subscription_renewed"]);
export const EVENTOS_ATRASO = new Set(["subscription_late"]);
export const EVENTOS_CANCELAMENTO = new Set(["subscription_canceled"]);
export const EVENTOS_ESTORNO = new Set(["order_refunded", "chargeback"]);
