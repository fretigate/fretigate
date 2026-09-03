/**
 * Link público de ativação de assinatura (item 13, Tarefa 1 — `docs/planos/
 * item-13-assinatura.md`) — mesmo padrão de `linkDeAceiteDoConvite`
 * (`src/lib/utils/convite.ts`). Sem `"server-only"` de propósito: precisa
 * ser importável tanto do servidor (rota do webhook, `page.tsx`) quanto,
 * potencialmente, de código cliente no futuro.
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
