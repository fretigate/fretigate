import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Trava do upload de comprovante (item 5, Tarefa 5, achado do `/revisar`) —
 * `CLAUDE.md` §4: "rate limit em... toda rota que gere custo". Cada envio
 * decodifica, redimensiona e recomprime uma imagem, e grava no storage — o
 * mesmo perfil de custo por requisição que motivou a lista de
 * `docs/especificacao.md` § "Trava de tentativas", só que faltando dela até
 * este achado (corrigido: linha acrescentada na mesma tabela).
 *
 * **Chave por endereço de rede, não por usuário** — corrigido no terceiro
 * passe do `/revisar`: a primeira versão chaveava por `usuarioId`, mas
 * `docs/especificacao.md` § "Trava de tentativas" já diz, ao pé da letra,
 * "a contagem é por endereço de rede e por rota" — regra escrita para TODAS
 * as travas, não só as do Better Auth. Mesmo padrão de
 * `trava-de-redefinicao.ts`.
 *
 * `POST /api/fretes/[id]/comprovante` não é rota Better Auth registrada,
 * então `customRules` de `src/lib/auth/index.ts` não alcança — mesmo motivo
 * de `trava-de-cadastro.ts`/`trava-de-redefinicao.ts`: reaproveita a tabela
 * `rate_limit` e o primitivo atômico (`incrementOne`, guardado por `where`)
 * que o Better Auth já usa internamente, só a chave e os números mudam.
 */

const JANELA_MS = 5 * 60 * 1000;
/** Ver docs/especificacao.md § "Trava de tentativas" para o número aprovado. */
const MAX_ENVIOS = 20;

export type ResultadoTrava =
  | { permitido: true }
  | { permitido: false; tentarNovoEm: Date };

export async function travaDeUploadDeComprovante(): Promise<ResultadoTrava> {
  const ctx = await auth.$context;
  const agora = Date.now();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const chave = `comprovante-upload:${ip || "sem-ip"}`;

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
      // Mesma leitura das outras duas travas: corrida real e falha de
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
          "[trava-de-comprovante] indisponível ao criar linha",
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
