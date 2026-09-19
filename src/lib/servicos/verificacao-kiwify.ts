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
   * parcela (o checkout real cobra 12x de R$ 120,38, com acréscimo — nunca
   * R$ 97, que era um cálculo sem juro que a Kiwify não pratica; achado
   * ao construir a tela de Planos, `CLAUDE.md` §10) — lacuna registrada no
   * plano. `.int()` recusa
   * qualquer valor não inteiro em vez de arredondar em silêncio —
   * dinheiro nunca aceita decimal flutuante (`CLAUDE.md` §7). */
  charge_amount: z.number().int(),
});

const schemaPlano = z.object({
  /** Semanal/Mensal/Bimestral/Trimestral/Semestral/Anual da Kiwify, num
   * valor em inglês. Confirmado contra a configuração real dos dois planos
   * do FretiGate (05/09/2026, ver `PERIODICIDADE_POR_FREQUENCIA_KIWIFY`
   * abaixo): `"monthly"` (Mensal) e `"annually"` (Anual) — diferente do
   * `"weekly"` do payload de teste genérico, que é de um plano de exemplo
   * da Kiwify, não de um plano real do FretiGate. */
  frequency: z.string(),
});

const schemaAssinatura = z.object({
  plan: schemaPlano.optional(),
});

/**
 * Rastreio da Kiwify — `s1`/`s2`/`s3`/`sck`/`src`/`utm_*`, pensados
 * originalmente para afiliado (`docs/planos/item-13-assinatura.md`),
 * reaproveitado só `s1` para carregar o **token opaco** do upgrade de
 * dentro do produto (tela `/planos`, `?s1=<token>` na URL de checkout —
 * `SolicitacaoUpgrade`, `prisma/schema.prisma`; nunca um `empresa_id`,
 * cru ou assinado — achado do `/revisar`, 18/09/2026, sobre `CLAUDE.md`
 * §3). **`s1` já está confirmado no FORMATO** — presente no payload real
 * capturado via "Testar Webhook" (03/09/2026, `tests/
 * verificacao-kiwify.test.ts`, `PAYLOAD_REAL_DE_TESTE`), ainda que sempre
 * `null` ali (nenhuma venda de teste carrega rastreio). O que continua sem
 * medir: que uma compra de verdade, feita pelo link de `/planos`, chegue
 * com o mesmo valor no mesmo campo — só o formato foi confirmado até
 * hoje, nunca um `s1` preenchido de verdade. Os outros campos deste bloco
 * (`s2`/`s3`/`sck`/`src`/`utm_source`/`utm_medium`/`utm_campaign`/
 * `utm_content`/`utm_term`, nunca lidos) ficam de fora do schema — não têm
 * uso hoje.
 */
const schemaTracking = z.object({
  s1: z.string().nullish(),
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
  TrackingParameters: schemaTracking.optional(),
});

export type CorpoWebhook = z.infer<typeof schemaWebhook>;

export function extrairEvento(corpo: CorpoWebhook): string | null {
  return corpo.webhook_event_type ?? null;
}

/**
 * Kiwify `Subscription.plan.frequency` → periodicidade do plano.
 *
 * CONFIRMADO EM 05/09/2026 — não por webhook de compra, mas pela própria
 * API pública da Kiwify (`GET /products/{id}`, escopo `products`), lida
 * contra a configuração real dos dois planos do FretiGate: devolve
 * `subscriptions[].frequency` igual a `"monthly"` para o Mensal e
 * `"annually"` para o Anual.
 *
 * O que isto confirma: a string que a Kiwify usa para os DOIS planos reais
 * do produto. O que isto NÃO confirma: que um webhook de compra de verdade
 * carregue esse mesmo valor em `Subscription.plan.frequency` — é a leitura
 * mais provável (mesmo plano, mesmo campo da API), mas só uma compra real
 * fecha essa dúvida por completo. Risco conhecido, registrado no diário —
 * não bloqueia produção: se a compra real divergir, o pagamento cai no
 * mesmo caminho de log de hoje, sem custo a mais (decisão do fundador,
 * 05/09/2026). Qualquer frequência fora destas duas continua recusada —
 * falha fechada, nunca um palpite.
 */
export const PERIODICIDADE_POR_FREQUENCIA_KIWIFY: Record<string, "mensal" | "anual"> = {
  monthly: "mensal",
  annually: "anual",
};

export function mapearPeriodicidade(frequencia: string): "mensal" | "anual" | null {
  // `?? null` sozinho não bastava: `frequencia` vinda de fora podia ser
  // "toString", "constructor" etc. — nomes que `{}[frequencia]` resolve
  // para algo herdado de `Object.prototype`, não `undefined`, escapando do
  // `?? null`. `Object.hasOwn` confere que a chave é uma entrada de
  // verdade do mapa antes de ler o valor.
  return Object.hasOwn(PERIODICIDADE_POR_FREQUENCIA_KIWIFY, frequencia)
    ? PERIODICIDADE_POR_FREQUENCIA_KIWIFY[frequencia]
    : null;
}

export const EVENTOS_COMPRA_APROVADA = new Set(["order_approved"]);
export const EVENTOS_RENOVACAO = new Set(["subscription_renewed"]);
export const EVENTOS_ATRASO = new Set(["subscription_late"]);
export const EVENTOS_CANCELAMENTO = new Set(["subscription_canceled"]);
export const EVENTOS_ESTORNO = new Set(["order_refunded", "chargeback"]);
