import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava de `api/webhooks/kiwify` — item 13, Tarefa 1, achado do `/revisar`:
 * o plano já prometia isto ("Rate limit... trava básica contra abuso, no
 * mesmo espírito de `travaDeAceiteDeConvite`", `CLAUDE.md` §4 — "rate
 * limit em... toda rota que gere custo"), mas a rota nasceu sem nenhuma.
 * Diferente das outras travas do produto: não é sobre adivinhar um token
 * (a Kiwify manda o dela pronto, comparado antes de qualquer trava rodar)
 * — é sobre um endpoint público que grava estado e manda e-mail pela
 * Resend a cada entrega aceita, alcançável por qualquer um que ache a URL,
 * mesmo sem o token certo (a checagem do token acontece DEPOIS da trava,
 * então uma enxurrada de tentativas erradas ainda tem custo de banco para
 * a trava contar).
 *
 * Janela mais folgada que login (`60/min` contra os `20/min` de
 * `trava-de-ativacao.ts`): a Kiwify pode entregar rajadas legítimas de
 * vários eventos em sequência (reentregas, picos de venda) — a trava é
 * para conter abuso de terceiro, não para atrapalhar entrega real.
 */

const JANELA_MS = 60 * 1000;
const MAX_TENTATIVAS = 60;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeWebhookKiwify(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `webhook-kiwify:${ip || "sem-ip"}`;

  const linhas = await ctx.adapter.findMany<{
    lastRequest: number | bigint;
  }>({
    model: "rateLimit",
    where: [{ field: "key", value: chave }],
  });
  const linha = linhas[0];

  if (!linha) {
    try {
      await ctx.adapter.create({
        model: "rateLimit",
        data: { key: chave, count: 1, lastRequest: agora },
      });
      return { permitido: true };
    } catch (erroCriacao) {
      // Mesma leitura de `trava-de-ativacao.ts`/`trava-de-convite.ts`:
      // corrida real e falha de verdade parecem iguais daqui — a diferença
      // é se a linha existe agora. Existe: foi corrida, a vencedora já
      // contou, segue. Não existe: falha de verdade, e falha FECHADA (§9)
      // — nunca "não consegui contar, então libero".
      const existeAgora = await ctx.adapter.findMany({
        model: "rateLimit",
        where: [{ field: "key", value: chave }],
      });
      if (existeAgora.length === 0) {
        console.error(
          "[trava-de-webhook] indisponível ao criar linha",
          erroCriacao instanceof Error ? erroCriacao.name : "erro desconhecido",
        );
        return { permitido: false, tentarNovoEm: new Date(agora + JANELA_MS) };
      }
      return { permitido: true };
    }
  }

  const ultimaTentativa =
    typeof linha.lastRequest === "bigint" ? Number(linha.lastRequest) : linha.lastRequest;

  if (agora - ultimaTentativa > JANELA_MS) {
    const atualizado = await ctx.adapter.incrementOne({
      model: "rateLimit",
      where: [
        { field: "key", value: chave },
        { field: "lastRequest", operator: "lte", value: ultimaTentativa },
      ],
      increment: {},
      set: { count: 1, lastRequest: agora },
    });
    return atualizado !== null
      ? { permitido: true }
      : { permitido: false, tentarNovoEm: new Date(ultimaTentativa + JANELA_MS) };
  }

  const atualizado = await ctx.adapter.incrementOne({
    model: "rateLimit",
    where: [
      { field: "key", value: chave },
      { field: "lastRequest", operator: "gt", value: agora - JANELA_MS },
      { field: "count", operator: "lt", value: MAX_TENTATIVAS },
    ],
    increment: { count: 1 },
    set: { lastRequest: agora },
  });
  return atualizado !== null
    ? { permitido: true }
    : { permitido: false, tentarNovoEm: new Date(ultimaTentativa + JANELA_MS) };
}
