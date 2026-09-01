import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava de `(auth)/aceitar-convite` — item 10, Tarefa 4, requisito explícito
 * desde a Tarefa 1 (`CLAUDE.md` §4: "rate limit em... toda rota que gere
 * custo"). Mesma família de `trava-de-redefinicao.ts`: o token de convite
 * tem 256 bits de entropia (`gerarTokenDeConvite`, `crypto.randomBytes(32)`),
 * inviável de adivinhar por tentativa — o risco é custo, não força bruta,
 * porque tanto o carregamento da tela pública quanto o envio do formulário
 * consultam o banco (`localizarConvitePorToken`). Por isso o limite é
 * folgado, mesma ordem de grandeza da consulta de código de recuperação de
 * senha, não apertado como o de login.
 *
 * Sem rota Better Auth registrada para nenhum dos dois pontos — o
 * `customRules` de `src/lib/auth/index.ts` não alcança — mesmo mecanismo de
 * `trava-de-redefinicao.ts`: reaproveita a tabela `rate_limit` e o
 * primitivo atômico (`incrementOne`, guardado por `where`) que o Better
 * Auth já usa internamente. **Uma única chave para os dois pontos** — o
 * carregamento da página (que resolve o token pra montar a prévia) e o
 * envio do formulário (`aceitarConviteAction`) contam contra o mesmo balde,
 * porque os dois tocam o mesmo dado pelo mesmo motivo.
 */

const JANELA_MS = 60 * 1000;
const MAX_TENTATIVAS = 20;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeAceiteDeConvite(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `aceitar-convite:${ip || "sem-ip"}`;

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
      // Mesma leitura de `trava-de-redefinicao.ts`: corrida real e falha de
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
          "[trava-de-convite] indisponível ao criar linha",
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
