# Corrige o webhook da Kiwify contra o formato real

Tarefa própria, antes da Tarefa 2 do item 13 (`docs/planos/
item-13-assinatura.md`) — decisão do fundador, 03/09/2026: "sem o caminho de
entrada funcionando de verdade, construir a tela de assinatura é construir em
cima do que não foi provado."

## Contexto

A rota `src/app/api/webhooks/kiwify/route.ts` (item 13, Tarefa 1) foi
construída a partir da melhor leitura possível da documentação disponível na
hora — nunca medida contra entrega real, porque a conta Kiwify não existia.
Ela existe agora. Duas fontes novas, ambas desta sessão:

1. A documentação oficial real (Notion, linkada por `ajuda.kiwify.com.br` →
   "Como funcionam os webhooks?"), com um exemplo de payload completo.
2. Uma entrega real capturada em webhook.site, via "Testar Webhook" contra a
   conta de verdade do fundador (payload genérico fixo da Kiwify — não uma
   venda real dos planos Mensal/Anual, mas confirma o formato).

As duas confirmam que a rota, do jeito que está, rejeitaria (ou processaria
errado) toda entrega real. Três defeitos, amarrados entre si — corrigir só um
não deixa o fluxo funcionar:

## O que muda

**Autenticidade.** Hoje: `corpo.token !== KIWIFY_WEBHOOK_TOKEN`, um campo
`token` que não existe no payload real (o schema exige um campo obrigatório
ausente — toda entrega real cairia em 400 antes de checar autenticidade).
Real: a Kiwify manda `signature` **na querystring da URL**, calculada como
`hmac_sha1(JSON.stringify(corpo), token_do_webhook)` — mesma fórmula do
exemplo de referência da própria doc oficial. Novo formato:
- Lê o corpo como texto (`request.text()`), guarda o objeto já
  `JSON.parse`ado.
- Calcula `createHmac('sha1', KIWIFY_WEBHOOK_TOKEN).update(JSON.stringify(objeto)).digest('hex')`
  — mesma re-serialização que o exemplo oficial usa, não os bytes crus da
  requisição.
- Compara contra `new URL(request.url).searchParams.get('signature')`, com
  `crypto.timingSafeEqual` (comprimento igual sempre — hex de 40
  caracteres; ausência ou comprimento diferente já falha, sem chamar
  `timingSafeEqual` com tamanhos diferentes, que lança exceção).

**Formato do corpo.**
- `Customer`: `full_name`, `email`, `CPF` (nullish) — nunca `id` (não
  existe). Remove a tentativa de `customer` minúsculo (nunca vista em
  nenhuma fonte).
- `Product`: `product_id`, `product_name` (maiúsculo, nunca `product.id`).
- Dinheiro: `Commissions.charge_amount` (`.int()`, mesma disciplina atual)
  — nunca `net_amount` (campo que não existe no payload real).
- Nome do evento: `webhook_event_type` — nunca
  `event`/`order_status`/`status`. Valores reais medidos/documentados:
  `order_approved`, `subscription_renewed`, `subscription_late`,
  `subscription_canceled`, `order_refunded`, `chargeback`.
- `gateway_assinante_id`: passa a vir de `subscription_id` (raiz do
  payload) — `Customer` não tem `id`, e é `subscription_id` que identifica
  a assinatura nos eventos futuros (renovação/atraso/cancelamento).
- `PERIODICIDADE_POR_PRODUTO_KIWIFY` → `PERIODICIDADE_POR_FREQUENCIA_KIWIFY`,
  chave por `Subscription.plan.frequency` (string) em vez de id de produto
  — confirmado que existe **um produto só** com vários planos. Continua
  vazio (falha alta, HTTP 500, a Kiwify reentrega) até o fundador confirmar
  os dois valores reais — próximo passo dele é a compra real, que revela
  isso "de quebra".

  **Atualização, 05/09/2026: os dois valores foram confirmados, mas não
  pela compra real prevista acima — pela própria API de produtos da
  Kiwify** (`GET /products/{id}`, escopo `products`), lendo a configuração
  real dos dois planos do FretiGate: `"monthly"` (Mensal) e `"annually"`
  (Anual). `PERIODICIDADE_POR_FREQUENCIA_KIWIFY` já não está mais vazio
  (`src/lib/servicos/verificacao-kiwify.ts`). A compra real continua
  pendente — ela é quem confirmaria que o webhook de compra de verdade
  carrega esse mesmo valor no mesmo campo, e é a única fonte que resolve a
  fórmula da assinatura (item abaixo, ainda em aberto).

## Teste novo

A rota nunca teve teste automatizado — achado ao planejar esta tarefa.
Funções puras exportadas para teste isolado (sem servidor HTTP real):
verificação de assinatura, extração de evento, mapeamento de periodicidade,
e o schema contra o payload real capturado (verbatim, não recortado).
Casos: assinatura correta/incorreta/ausente/comprimento diferente; cada
`webhook_event_type` mapeado para o evento certo; dinheiro fracionado
recusado. **Precisão sobre o que o schema garante**: os campos de negócio
(`Product`, `Commissions`, `Subscription`) são opcionais no schema — quem
recusa um corpo faltando produto/valor/assinatura é a checagem manual
dentro do caso `compra_aprovada` da rota (`if (!corpo.Product || ...)`),
não o `safeParse`. Um corpo mínimo (só `order_id`, por exemplo) passa no
schema e seria tratado como evento não mapeado — comportamento correto
para eventos como `carrinho_abandonado`, que não têm a maioria dos campos.

## O que NÃO muda nesta tarefa

- `registrarPagamento`, `mandarEmailDeAtivacao`, `estornarPagamento`,
  `atualizarStatusAssinaturaPorAssinanteGateway` (`src/lib/servicos/
  pagamentos.ts`) — a interface delas já está certa, só quem as chama
  (a rota) passava dado errado.
- `PERIODICIDADE_POR_FREQUENCIA_KIWIFY` fica vazio — não é lacuna desta
  tarefa, é o próximo passo do fundador (compra real revela os valores).
  **Resolvido em 05/09/2026** — ver a atualização acima, na seção
  "O que muda": os dois valores vieram da API de produtos da Kiwify, não
  de uma compra.

## Lacunas registradas, não corrigidas agora — achados do `/revisar`

- **A fórmula da assinatura nunca foi medida contra uma entrega real.** Só
  o corpo (JSON) foi capturado nesta sessão — nunca a URL/querystring nem
  os cabeçalhos, que é onde o parâmetro `signature` chegaria. A fórmula
  implementada (HMAC-SHA1 sobre `JSON.stringify` do corpo reserializado,
  chave = token do webhook) é a do exemplo de referência da doc oficial,
  não uma medição própria. **Se estiver errada, toda entrega real cai em
  401** — a pessoa paga e nunca recebe o e-mail de ativação, sem nada
  acusar do lado da Kiwify (ela recebe 401 e para de reentregar depois de
  algumas tentativas). Bloqueia "pronto para produção" — somado a
  `CLAUDE.md` §14, "CONFERIR ANTES DE PUBLICAR". Resolve com a compra
  real do fundador (próximo passo), capturando também a querystring/
  cabeçalhos da entrega, não só o corpo.
- **`Commissions.charge_amount` no plano anual: total ou parcela?** O
  plano anual vende "R$ 1.164 em até 12x de R$ 97,00" (`CLAUDE.md` §10).
  Nenhuma fonte diz se o webhook de uma venda parcelada manda o valor
  total ou o valor da parcela cobrada naquele evento — o payload de teste
  genérico não tem parcelamento. `valor_centavos` grava o que vier, sem
  essa distinção decidida. Medir contra a compra real do plano anual.
- **`gateway_assinante_id` como `subscription_id`: o que acontece se a
  mesma pessoa cancelar e assinar de novo?** Achado real do `/revisar`,
  não teórico: `subscription_id` é por ASSINATURA, não por comprador — uma
  nova assinatura da mesma pessoa gera um `subscription_id` novo. Como o
  campo é `@unique` em `Empresa` e já guarda o valor da assinatura antiga,
  os eventos da assinatura nova (renovação, atraso) não achariam
  esta empresa — `atualizarStatusAssinaturaPorAssinanteGateway` devolveria
  `false` para uma renovação legítima, e a rota falharia alto (500) sem
  saber que não é um erro de verdade. Não corrigido agora: não existe
  decisão de produto sobre o que "cancelar e assinar de novo" deveria
  fazer — relacionado à pendência já registrada em `CLAUDE.md` §14,
  "prazo de retenção depois de cancelamento voluntário". Documentado no
  comentário de `Empresa.gateway_assinante_id` (`prisma/schema.prisma`).
