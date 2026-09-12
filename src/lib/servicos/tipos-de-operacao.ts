import { db } from "@/lib/db";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { medir } from "@/lib/utils/medir-tempo";

/**
 * Os quatro tipos com que toda empresa nasce.
 *
 * SÓ "FRETE" ATIVO. Os outros existem no modelo desde já, desligados, para
 * comportar guincho e reboque depois sem reescrever nada (`CLAUDE.md` §9,
 * §12) — o MVP entrega só a experiência de transportadora de carga.
 *
 * A ordem do array é a ordem de exibição (chip, seletor): "Frete" primeiro.
 */
export const TIPOS_DE_OPERACAO_INICIAIS = [
  { nome: "Frete", slug: "frete", ativo: true, ordem: 1 },
  { nome: "Reboque", slug: "reboque", ativo: false, ordem: 2 },
  { nome: "Guincho", slug: "guincho", ativo: false, ordem: 3 },
  { nome: "Mudança", slug: "mudanca", ativo: false, ordem: 4 },
] as const;

/**
 * Cria os quatro tipos de uma empresa nova.
 *
 * CHAMADA DE DENTRO DO `emTransacao` QUE JÁ CRIA A `Empresa`, nunca num passo
 * seguinte — se fosse, uma falha no meio deixaria a empresa sem tipo nenhum, e
 * o primeiro frete não teria o que escolher num campo obrigatório
 * (`docs/especificacao.md` §6, `TipoOperacao`).
 *
 * Recebe `tx`, não `db(empresaId)`: é o mesmo cliente escopado que
 * `cadastro.ts` já tem dentro do `emTransacao`, na mesma transação que grava a
 * `Empresa` — abrir uma segunda transação aqui quebraria a atomicidade que a
 * regra exige.
 */
export async function criarTiposDeOperacaoIniciais(
  tx: Omit<PrismaClient, `$${string}`>,
  empresaId: string,
): Promise<void> {
  await tx.tipoOperacao.createMany({
    data: TIPOS_DE_OPERACAO_INICIAIS.map((tipo) => ({
      ...tipo,
      empresa_id: empresaId,
    })),
  });
}

/**
 * Usado por `src/lib/servicos/servicos.ts` para conferir `tipo_operacao_id`
 * contra a empresa antes de gravar um `Servico` — o Postgres não aplica RLS
 * na checagem de chave estrangeira (`CLAUDE.md` §3).
 */
export function buscarTipoOperacao(empresaId: string, id: string) {
  return medir("servico.tipoOperacao.buscarPorId(2a-vez)", () =>
    db(empresaId).tipoOperacao.findUnique({
      where: { id },
      select: { id: true, nome: true, ativo: true, arquivado_em: true },
    }),
  );
}

/**
 * O único tipo ativo do MVP ("Frete") — a tela de lançamento não pergunta o
 * tipo de operação, porque só existe um pra escolher (`CLAUDE.md` §12: "o
 * MVP entrega só a experiência de transportadora de carga"). Toda empresa
 * nasce com exatamente um `TipoOperacao` ativo (`TIPOS_DE_OPERACAO_INICIAIS`
 * acima), então nulo aqui é falha de dado, não caso normal a tratar na tela.
 */
export function buscarTipoOperacaoAtivo(empresaId: string) {
  return medir("servico.tipoOperacao.buscarAtivo(1a-vez)", () =>
    db(empresaId).tipoOperacao.findFirst({
      where: { ativo: true, arquivado_em: null },
      select: { id: true, nome: true },
      orderBy: { ordem: "asc" },
    }),
  );
}
