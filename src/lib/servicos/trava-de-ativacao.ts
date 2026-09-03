import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava de `(auth)/ativar-assinatura` — item 13, Tarefa 1, mesmo requisito
 * de `trava-de-convite.ts` (`CLAUDE.md` §4: "rate limit em... toda rota que
 * gere custo"). O token de pagamento tem a mesma entropia do token de
 * convite (`gerarTokenDePagamento`, `crypto.randomBytes(32)`), inviável de
 * adivinhar por tentativa — o risco é custo, não força bruta: tanto o
 * carregamento da tela pública quanto o envio do formulário consultam o
 * banco (`localizarPagamentoPorToken`/`reivindicarPagamento`).
 *
 * Cópia estrutural de `trava-de-convite.ts`, chave própria — os dois
 * pontos (carregamento da página e envio do formulário) contam contra o
 * mesmo balde, mesmo raciocínio: os dois tocam o mesmo dado pelo mesmo
 * motivo.
 */

const JANELA_MS = 60 * 1000;
const MAX_TENTATIVAS = 20;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeAtivacaoDeAssinatura(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `ativar-assinatura:${ip || "sem-ip"}`;

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
      // Mesma leitura de `trava-de-convite.ts`: corrida real e falha de
      // verdade parecem iguais daqui — a diferença é se a linha existe
      // agora. Existe: foi corrida, a vencedora já contou, segue. Não
      // existe: falha de verdade, e falha FECHADA (§9) — nunca "não
      // consegui contar, então libero".
      const existeAgora = await ctx.adapter.findMany({
        model: "rateLimit",
        where: [{ field: "key", value: chave }],
      });
      if (existeAgora.length === 0) {
        console.error(
          "[trava-de-ativacao] indisponível ao criar linha",
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
