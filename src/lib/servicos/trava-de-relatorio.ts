import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava de "Gerar relatório" (item 7, Tarefa 3) — `CLAUDE.md` §4: "rate
 * limit em... toda rota que gere custo (importação com IA, geração de PDF,
 * cálculo de distância)". Cada geração abre um Chromium inteiro
 * (`src/lib/documentos/navegador.ts`), ≈2,9s frio — custo por chamada maior
 * que o de `trava-de-comprovante.ts` (processar uma imagem), e por isso o
 * teto é metade do dela: **10 por 5 minutos**, decisão do fundador,
 * 29/08/2026 (`docs/especificacao.md` § "Trava de tentativas").
 *
 * Mesmo mecanismo de `trava-de-comprovante.ts`/`trava-de-cadastro.ts`:
 * reaproveita a tabela `rate_limit` e o primitivo atômico do Better Auth,
 * chaveado por endereço de rede (nunca por usuário — mesma regra escrita em
 * `docs/especificacao.md` § "Trava de tentativas" para todas as travas).
 */

const JANELA_MS = 5 * 60 * 1000;
/** Ver docs/especificacao.md § "Trava de tentativas" para o número aprovado. */
const MAX_GERACOES = 10;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeGerarRelatorio(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `relatorio-gerar:${ip || "sem-ip"}`;

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
      // Mesma leitura das outras travas: corrida real e falha de verdade
      // parecem iguais daqui — a diferença é se a linha existe agora. Existe:
      // foi corrida, a vencedora já contou, segue. Não existe: falha de
      // verdade, e falha FECHADA (§9) — nunca "não consegui contar, então
      // libero".
      const existeAgora = await ctx.adapter.findMany({
        model: "rateLimit",
        where: [{ field: "key", value: chave }],
      });
      if (existeAgora.length === 0) {
        console.error(
          "[trava-de-relatorio] indisponível ao criar linha",
          erroCriacao instanceof Error ? erroCriacao.name : "erro desconhecido",
        );
        return { permitido: false, tentarNovoEm: new Date(agora + JANELA_MS) };
      }
      return { permitido: true };
    }
  }

  const ultimaGeracao =
    typeof linha.lastRequest === "bigint" ? Number(linha.lastRequest) : linha.lastRequest;

  if (agora - ultimaGeracao > JANELA_MS) {
    const atualizado = await ctx.adapter.incrementOne({
      model: "rateLimit",
      where: [
        { field: "key", value: chave },
        { field: "lastRequest", operator: "lte", value: ultimaGeracao },
      ],
      increment: {},
      set: { count: 1, lastRequest: agora },
    });
    return atualizado !== null
      ? { permitido: true }
      : { permitido: false, tentarNovoEm: new Date(ultimaGeracao + JANELA_MS) };
  }

  const atualizado = await ctx.adapter.incrementOne({
    model: "rateLimit",
    where: [
      { field: "key", value: chave },
      { field: "lastRequest", operator: "gt", value: agora - JANELA_MS },
      { field: "count", operator: "lt", value: MAX_GERACOES },
    ],
    increment: { count: 1 },
    set: { lastRequest: agora },
  });
  return atualizado !== null
    ? { permitido: true }
    : { permitido: false, tentarNovoEm: new Date(ultimaGeracao + JANELA_MS) };
}
