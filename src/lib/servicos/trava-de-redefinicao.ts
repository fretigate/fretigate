import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava da consulta ao código de recuperação em `/redefinir-senha` —
 * CLAUDE.md §4: "rate limit em... toda rota que gere custo".
 *
 * O motivo aqui **não é adivinhação de código**: o código tem 24 caracteres
 * aleatórios (`generateId(24)` do Better Auth), inviável de adivinhar por
 * tentativa. O motivo é custo — cada carregamento da página consulta o
 * banco (`buscarEmailPorCodigo`), e uma rota sem limite nenhum que consulta
 * o banco a cada carregamento é vetor de carga, travar ou não o código
 * específico. Por isso o limite é **folgado** (bem acima do que qualquer
 * pessoa recarregando a própria página bateria), não apertado como o de
 * login.
 *
 * Não existe rota Better Auth registrada para isto (esta consulta roda num
 * Server Component, não em `/api/auth/*`), então o `customRules` de
 * `src/lib/auth/index.ts` não alcança — mesmo motivo de
 * `trava-de-cadastro.ts`, e o mesmo mecanismo: reaproveita a tabela
 * `rate_limit` e o primitivo atômico (`incrementOne`, guardado por `where`)
 * que o Better Auth já usa internamente, só a chave e os números mudam.
 *
 * Arquivo à parte de `redefinicao-de-senha.ts` pela mesma razão de
 * `trava-de-cadastro.ts` estar à parte de `cadastro.ts` (CLAUDE.md §6):
 * contar consulta e resolver e-mail por código são coisas sem relação entre
 * si, que só coincidem de servir a mesma tela.
 */

const JANELA_MS = 60 * 1000;
const MAX_CONSULTAS = 20;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeConsultaDoCodigo(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `redefinir-senha-consulta:${ip || "sem-ip"}`;

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
      // Mesma leitura de `trava-de-cadastro.ts`: corrida real e falha de
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
          "[trava-de-redefinicao] indisponível ao criar linha",
          erroCriacao instanceof Error ? erroCriacao.name : "erro desconhecido",
        );
        return { permitido: false, tentarNovoEm: new Date(agora + JANELA_MS) };
      }
      return { permitido: true };
    }
  }

  const ultimaConsulta =
    typeof linha.lastRequest === "bigint" ? Number(linha.lastRequest) : linha.lastRequest;

  if (agora - ultimaConsulta > JANELA_MS) {
    const atualizado = await ctx.adapter.incrementOne({
      model: "rateLimit",
      where: [
        { field: "key", value: chave },
        { field: "lastRequest", operator: "lte", value: ultimaConsulta },
      ],
      increment: {},
      set: { count: 1, lastRequest: agora },
    });
    return atualizado !== null
      ? { permitido: true }
      : { permitido: false, tentarNovoEm: new Date(ultimaConsulta + JANELA_MS) };
  }

  const atualizado = await ctx.adapter.incrementOne({
    model: "rateLimit",
    where: [
      { field: "key", value: chave },
      { field: "lastRequest", operator: "gt", value: agora - JANELA_MS },
      { field: "count", operator: "lt", value: MAX_CONSULTAS },
    ],
    increment: { count: 1 },
    set: { lastRequest: agora },
  });
  return atualizado !== null
    ? { permitido: true }
    : { permitido: false, tentarNovoEm: new Date(ultimaConsulta + JANELA_MS) };
}
