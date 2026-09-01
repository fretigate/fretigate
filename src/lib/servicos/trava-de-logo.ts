import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava do upload de logo (item 10, Tarefa 2, achado do `/revisar`) —
 * `CLAUDE.md` §4: "rate limit em... toda rota que gere custo". Mesmo perfil
 * de custo por requisição que `trava-de-comprovante.ts` (decodifica,
 * redimensiona, recomprime, grava no storage) — cópia direta do mecanismo,
 * só a chave muda. Ver aquele arquivo para o raciocínio completo (chave por
 * endereço de rede, não por usuário; corrida real vs. falha de verdade;
 * falha fechada).
 */

const JANELA_MS = 5 * 60 * 1000;
/**
 * Reaproveita o número de "Enviar comprovante" (mesmo perfil de custo por
 * requisição) — ainda SEM confirmação própria do fundador. Ver
 * `docs/especificacao.md` § "Trava de tentativas", fora da tabela dos
 * números aprovados de propósito, até essa confirmação chegar.
 */
const MAX_ENVIOS = 20;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeUploadDeLogo(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `logo-upload:${ip || "sem-ip"}`;

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
      const existeAgora = await ctx.adapter.findMany({
        model: "rateLimit",
        where: [{ field: "key", value: chave }],
      });
      if (existeAgora.length === 0) {
        console.error(
          "[trava-de-logo] indisponível ao criar linha",
          erroCriacao instanceof Error ? erroCriacao.name : "erro desconhecido",
        );
        return { permitido: false, tentarNovoEm: new Date(agora + JANELA_MS) };
      }
      return { permitido: true };
    }
  }

  const ultimoEnvio =
    typeof linha.lastRequest === "bigint" ? Number(linha.lastRequest) : linha.lastRequest;

  if (agora - ultimoEnvio > JANELA_MS) {
    const atualizado = await ctx.adapter.incrementOne({
      model: "rateLimit",
      where: [
        { field: "key", value: chave },
        { field: "lastRequest", operator: "lte", value: ultimoEnvio },
      ],
      increment: {},
      set: { count: 1, lastRequest: agora },
    });
    return atualizado !== null
      ? { permitido: true }
      : { permitido: false, tentarNovoEm: new Date(ultimoEnvio + JANELA_MS) };
  }

  const atualizado = await ctx.adapter.incrementOne({
    model: "rateLimit",
    where: [
      { field: "key", value: chave },
      { field: "lastRequest", operator: "gt", value: agora - JANELA_MS },
      { field: "count", operator: "lt", value: MAX_ENVIOS },
    ],
    increment: { count: 1 },
    set: { lastRequest: agora },
  });
  return atualizado !== null
    ? { permitido: true }
    : { permitido: false, tentarNovoEm: new Date(ultimoEnvio + JANELA_MS) };
}
