/**
 * Link público de ativação de assinatura (item 13, Tarefa 1 — `docs/planos/
 * item-13-assinatura.md`) — mesmo padrão de `linkDeAceiteDoConvite`
 * (`src/lib/utils/convite.ts`). Sem `"server-only"` — importado só do
 * servidor hoje (rota do webhook, Server Actions), mas nada aqui impede
 * importar de código cliente **exceto** que a maioria dos valores lidos
 * abaixo não é `NEXT_PUBLIC_*` (correção de estado, achado do `/revisar`,
 * 18/09/2026: a versão anterior deste comentário dizia "potencialmente, de
 * código cliente no futuro", o que já era impreciso mesmo antes desta
 * tarefa). **Não é sobre segredo** — `EMAIL_RESPOSTA` é só um endereço de
 * contato, e `KIWIFY_CHECKOUT_URL_*` não são segredo nenhum (qualquer um vê
 * ao clicar em "Assinar" no site de verdade); é sobre bundling — sem o
 * prefixo `NEXT_PUBLIC_`, o Next.js nunca embute o valor no bundle do
 * navegador, então `process.env.EMAIL_RESPOSTA` etc. viram `undefined` ali,
 * e o `throw` dispara no carregamento.
 *
 * **Falha alto no carregamento** — mesmo padrão de `convite.ts` e de
 * `src/lib/auth/index.ts` para a mesma variável (`CLAUDE.md` §5): sem
 * `NEXT_PUBLIC_APP_URL`, o link de ativação — o único caminho de entrega
 * confirmado do Fluxo B — sairia quebrado no e-mail sem ninguém perceber.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!APP_URL) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL não está definida. É dela que sai o link de ativação " +
      "dentro do e-mail de pagamento aprovado.",
  );
}

export function linkDeAtivacaoDaAssinatura(token: string): string {
  return `${APP_URL}/ativar-assinatura?token=${token}`;
}

/**
 * Os dois links de checkout reais da Kiwify (tela `/planos`, item 13,
 * Tarefa 3 — `docs/planos/item-13-tarefa-3-tela-de-planos.md`). Falha alto
 * no carregamento, mesmo motivo de `APP_URL`/`CONTATO` acima — sem eles a
 * tela de Planos não tem para onde levar.
 */
const CHECKOUT_MENSAL = process.env.KIWIFY_CHECKOUT_URL_MENSAL;
const CHECKOUT_ANUAL = process.env.KIWIFY_CHECKOUT_URL_ANUAL;

if (!CHECKOUT_MENSAL || !CHECKOUT_ANUAL) {
  throw new Error(
    "KIWIFY_CHECKOUT_URL_MENSAL/KIWIFY_CHECKOUT_URL_ANUAL não estão " +
      "definidas. São os links de checkout da Kiwify para os dois planos " +
      "— sem eles, a tela de Planos não tem para onde levar.",
  );
}

/**
 * Monta o link de checkout de um plano, com o **token opaco** de um
 * `SolicitacaoUpgrade` já criado embutido no parâmetro de rastreio `s1` —
 * nunca o `empresa_id`, cru ou assinado (achado do `/revisar`, 18/09/2026,
 * sobre `CLAUDE.md` §3: "`empresa_id` vem sempre da sessão autenticada...
 * nunca de URL, formulário, header ou body". O webhook resolve o token no
 * banco — `reivindicarSolicitacaoUpgrade`, `src/lib/db` — nunca recebe o
 * `empresa_id` em lugar nenhum do pedido; ver "Upgrade de dentro do
 * produto", `docs/planos/item-13-assinatura.md`).
 *
 * Quem cria o `SolicitacaoUpgrade` e chama esta função é
 * `gerarLinkDeCheckoutAction` (`src/app/(app)/planos/acoes.ts`) — esta
 * função fica pura (só concatena strings), o toque em banco mora na Server
 * Action, que já tem `"use server"`/`comoDonoSemPortao` cuidando da sessão.
 */
export function linkDeCheckout(plano: "mensal" | "anual", token: string): string {
  const base = plano === "anual" ? CHECKOUT_ANUAL : CHECKOUT_MENSAL;
  // `URL`/`searchParams`, não concatenação de string — achado do
  // `/revisar`: se o valor configurado algum dia já vier com querystring
  // própria, `${base}?s1=...` nasceria quebrado (dois `?`); `URL` sempre
  // monta certo, com ou sem query prévia.
  const url = new URL(base!);
  url.searchParams.set("s1", token);
  return url.toString();
}

/**
 * Mesmo endereço de contato de `cadastro.ts` (`CONTATO`) — achado do
 * `/revisar`: a mensagem abaixo dizia "fala com a gente" sem dizer por
 * onde, e este é o único canal de contato que o produto já expõe ao
 * usuário fora de sessão (mensagem de trava do cadastro).
 *
 * Checado aqui, explícito — diferente de `cadastro.ts`, que se apoia na
 * carga de `@/lib/auth` já ter validado a variável antes. Este arquivo não
 * importa `@/lib/auth`, então não há garantia de ordem de carregamento
 * para confiar num `!` sem checagem.
 */
const CONTATO = process.env.EMAIL_RESPOSTA;

if (!CONTATO) {
  throw new Error(
    "EMAIL_RESPOSTA não está definida. É o endereço mostrado a quem não " +
      "consegue reivindicar o pagamento — sem ele, a mensagem de contato " +
      "fica quebrada.",
  );
}

/**
 * Mensagem para token ausente, inexistente ou estornado — caso 2 do plano:
 * distinguir revelaria informação (por exemplo, que um pagamento específico
 * foi estornado), mesmo motivo de `MENSAGEM_CONVITE_INDISPONIVEL`
 * (`convite.ts`). **Não é a mesma frase do convite** — "peça a quem te
 * convidou para mandar um novo" não faz sentido aqui: não existe quem
 * convidou, é a Kiwify, e "mandar um novo" não é uma ação que a pessoa
 * consegue pedir.
 */
export const MENSAGEM_PAGAMENTO_INDISPONIVEL =
  `Este link não está mais disponível. Se você pagou e está com dúvida, fala com a gente: ${CONTATO}.`;

/**
 * Mensagem para token já reivindicado — segundo caso do "dois casos com
 * textos diferentes" (caso 2 do plano). Diferente do convite (que tem UMA
 * mensagem genérica para os quatro motivos): aqui a pessoa provavelmente já
 * tem conta e senha, então a saída é acionável — leva para `/entrar`, não
 * para "peça de novo".
 */
export const MENSAGEM_PAGAMENTO_JA_ATIVADO = "Esta conta já foi criada. Entre normalmente.";
