import type { ServicoParaRelatorio } from "@/lib/servicos/relatorios";

/**
 * Os dois totais da tela de montagem (item 7, Tarefa 3, segundo commit —
 * `docs/planos/item-7-relatorio.md`, "somar é diferente de cobrar", decisão
 * do fundador). Função pura, sem `@/lib/db` — importa só o TIPO de
 * `relatorios.ts` (`import type`, apagado na compilação), nunca uma função
 * de lá, para o Client Component (`TelaMontagemRelatorio.tsx`) poder chamar
 * isto sem puxar `server-only` para o navegador (mesmo cuidado de
 * `cobrancas-situacao.ts`).
 *
 * `totalDocumento` soma tudo que está marcado, `em_andamento` incluído —
 * "Gerar relatório" é neutro, mostra o período inteiro. `totalCobravel` soma
 * só o `finalizado` marcado, e só importa quando "Gerar cobrança" está
 * ativo: um frete `em_andamento` nunca vira título, mesmo marcado.
 * `divergem` é `true` só quando os dois números discordariam de verdade —
 * sem `em_andamento` marcado, ou sem cobrança ativa, os dois já são o mesmo
 * total, e a tela mostra um só (`CLAUDE.md` §8, "número incompleto não é
 * exibido" — dois números iguais lado a lado seria repetição, não
 * informação).
 */
export function calcularTotaisDoRelatorio(
  servicos: ServicoParaRelatorio[],
  incluidos: Set<string>,
  gerarCobranca: boolean,
): { totalDocumento: number; totalCobravel: number; divergem: boolean } {
  const marcados = servicos.filter((s) => incluidos.has(s.id));
  const totalDocumento = marcados.reduce((soma, s) => soma + s.valor, 0);
  const totalCobravel = marcados
    .filter((s) => s.statusOperacional === "finalizado")
    .reduce((soma, s) => soma + s.valor, 0);
  const temEmAndamentoMarcado = marcados.some((s) => s.statusOperacional === "em_andamento");

  return {
    totalDocumento,
    totalCobravel,
    divergem: gerarCobranca && temEmAndamentoMarcado,
  };
}
