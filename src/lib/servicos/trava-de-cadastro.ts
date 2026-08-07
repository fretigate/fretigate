import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava de tentativas do cadastro — CLAUDE.md §4: "rate limit em login,
 * recuperação de senha e toda rota que gere custo". Cadastro grava linha
 * nova e, no fim, dispara e-mail de verificação — custo real.
 *
 * Números — 5 tentativas a cada 10 minutos, por endereço de rede — também
 * registrados em `docs/especificacao.md`, na mesma tabela dos números do
 * login, para não haver dois lugares divergindo.
 *
 * Não existe rota Better Auth registrada para isto (é Server Action, não
 * `/api/auth/*`), então o `customRules` de `src/lib/auth/index.ts` não
 * alcança. Em vez de reimplementar contagem do zero, reaproveita a mesma
 * tabela `rate_limit` e o mesmo primitivo atômico (`incrementOne`, guardado
 * por `where`) que o próprio Better Auth usa internamente para a trava de
 * login — só a chave muda.
 *
 * Arquivo à parte de `cadastro.ts` — CLAUDE.md §6: são duas coisas sem
 * relação (contar tentativa vs. criar empresa e usuário) que só coincidiam
 * de morar no mesmo lugar.
 */

const JANELA_MS = 10 * 60 * 1000;
const MAX_TENTATIVAS = 5;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeCadastro(
  ctx: Awaited<typeof auth.$context>,
): Promise<ResultadoTrava> {
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `criar-conta:${ip || "sem-ip"}`;

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
      // Corrida real (duas tentativas criando a mesma chave ao mesmo tempo)
      // e falha de verdade (privilégio, conexão) parecem iguais daqui — a
      // diferença é se a linha existe agora. Existe: foi corrida, a
      // vencedora já contou, segue. Não existe: falha de verdade, e falha
      // FECHADA — nunca "não consegui contar, então libero" (§9).
      const existeAgora = await ctx.adapter.findMany({
        model: "rateLimit",
        where: [{ field: "key", value: chave }],
      });
      if (existeAgora.length === 0) {
        console.error(
          "[trava-de-cadastro] indisponível ao criar linha",
          erroCriacao instanceof Error ? erroCriacao.name : "erro desconhecido",
        );
        return { permitido: false, tentarNovoEm: new Date(agora + JANELA_MS) };
      }
      return { permitido: true };
    }
  }

  const ultimaTentativa =
    typeof linha.lastRequest === "bigint"
      ? Number(linha.lastRequest)
      : linha.lastRequest;

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
