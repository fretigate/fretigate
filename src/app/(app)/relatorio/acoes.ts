"use server";

import { z } from "zod";
import { comoUsuario } from "@/lib/auth/acao";
import { gerarRelatorio } from "@/lib/servicos/relatorios";
import { travaDeGerarRelatorio } from "@/lib/servicos/trava-de-relatorio";
import { instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";

/**
 * Server Action da tela "Relatório — montagem" (item 7, Tarefa 3, segundo
 * commit). É aqui que `gerarRelatorio` (`src/lib/servicos/relatorios.ts`) é
 * chamada pela primeira vez de verdade — os dois requisitos que dependiam
 * da rota existir (`CLAUDE.md` §14) entram nesta tarefa: `next.config.ts`
 * ganhou `outputFileTracingIncludes` para `/relatorio`, e esta ação confere
 * `travaDeGerarRelatorio` antes de gastar um Chromium inteiro por chamada
 * (`docs/especificacao.md` § "Trava de tentativas": 10 por 5 minutos).
 */

const REGEX_DIA = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    clienteId: z.string().uuid(),
    servicoIds: z.array(z.string().uuid()).min(1),
    // ISO — a tela já resolveu o período (`resolverPeriodoDoRelatorio`,
    // `src/lib/utils/periodo.ts`) para buscar os fretes; este é o mesmo
    // período, gravado em `Relatorio.data_inicial`/`data_final` (o
    // "período coberto" do documento impresso, `docs/especificacao.md`
    // §4.4) — nunca recalculado aqui, para o documento sempre mostrar
    // exatamente a janela que a pessoa viu na montagem.
    dataInicial: z.string().datetime(),
    dataFinal: z.string().datetime(),
    gerarCobranca: z.boolean(),
    vencimento: z.string().regex(REGEX_DIA).optional(),
    formaPrevista: z.enum(["boleto", "outro"]).optional(),
  })
  .refine((d) => !d.gerarCobranca || (d.vencimento && d.formaPrevista), {
    message: "Informe o vencimento e a forma de cobrança.",
  });

type ResultadoGerarRelatorio = { ok: true; relatorioId: string } | { ok: false; erro: string };

export const gerarRelatorioAction = comoUsuario(async (
  sessao,
  entrada: {
    clienteId: string;
    servicoIds: string[];
    dataInicial: string;
    dataFinal: string;
    gerarCobranca: boolean;
    vencimento?: string;
    formaPrevista?: "boleto" | "outro";
  },
): Promise<ResultadoGerarRelatorio> => {
  const validado = schema.safeParse(entrada);
  if (!validado.success) {
    return { ok: false, erro: validado.error.issues[0]?.message ?? "Não deu para gerar o relatório agora." };
  }

  const trava = await travaDeGerarRelatorio();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return { ok: false, erro: `Muitos relatórios gerados seguidos. Tenta de novo às ${horario}.` };
  }

  const dados = validado.data;

  try {
    const relatorio = await gerarRelatorio(sessao.empresaId, {
      clienteId: dados.clienteId,
      dataInicial: new Date(dados.dataInicial),
      dataFinal: new Date(dados.dataFinal),
      servicoIds: dados.servicoIds,
      gerarCobranca: dados.gerarCobranca,
      vencimento: dados.vencimento ? instanteDoDiaEmFortaleza(dados.vencimento) : undefined,
      formaPrevista: dados.formaPrevista,
    });
    return { ok: true, relatorioId: relatorio.id };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não deu para gerar o relatório agora.",
    };
  }
});
