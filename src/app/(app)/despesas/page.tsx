import { exigirSessao } from "@/lib/auth/sessao";
import { listarDespesas } from "@/lib/servicos/despesas";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { resolverLimiteDaLista, resolverPeriodoDaUrl, rotuloDoPeriodo } from "@/lib/utils/periodo";
import { ListaDespesas, type DespesaParaLista } from "./ListaDespesas";

/**
 * Despesas — lista (item 11). Substitui a tela provisória do item 8
 * (`docs/planos/item-8-dashboard.md`), que só mostrava o estado vazio
 * explicando por que o Lucro não tinha número.
 *
 * `docs/navegacao.md` linha 59: chega do hub "Financeiro" e do card de Lucro
 * da dashboard em estado de convite. **Voltar → `/financeiro`** — mudou em
 * 13/09/2026 (`docs/planos/financeiro-unifica-cobrancas-e-despesas.md`,
 * Opção A): a linha em Mais que trazia para cá foi removida, então voltar
 * para "/mais" levaria a um lugar de onde não dá mais para chegar aqui. Até
 * 13/09/2026 chegava de "Mais" (linha nova no item 11) e voltava para lá; a
 * versão provisória, antes disso, usava `/` porque "Mais" ainda não tinha
 * linha própria para cá.
 *
 * Só `periodo` (e `de`/`ate`) vira parâmetro de URL — mesma decisão de
 * "Meus fretes" (item 4, Tarefa 2): trocar Período dispara nova consulta ao
 * servidor; Categoria filtra no cliente (`ListaDespesas`), com itens
 * derivados do que já foi carregado (decisão do fundador, `docs/planos/
 * item-11-despesas.md`, decisão 2).
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const sessao = await exigirSessao();
  const { periodo: janela, de, ate } = await searchParams;

  const periodo = resolverPeriodoDaUrl(janela, de, ate);
  const limite = resolverLimiteDaLista(janela, periodo);

  const despesas = await listarDespesas(sessao.empresaId, {
    periodo: periodo ?? undefined,
    limite,
  });

  const paraLista: DespesaParaLista[] = despesas.map((d) => ({
    id: d.id,
    dia: diaEmFortaleza(d.data),
    categoria: d.categoria,
    valorCentavos: d.valor,
    descricao: d.descricao,
    veiculoNome: d.veiculo ? nomeCaminhao(d.veiculo) : null,
  }));

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <BotaoVoltar href="/financeiro" />
        <span
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Despesas
        </span>
        {/* Some só quando o estado vazio de primeira vez está na tela — ele já
            tem o próprio principal "Lançar a primeira despesa" (mesma regra
            de `clientes/page.tsx`: duas ações com o mesmo destino repete
            "uma ação, um nome", `CLAUDE.md` §8). Zero despesas com um
            período escolhido é "nenhuma despesa **neste período**", não o
            estado vazio de primeira vez — a pílula continua. */}
        {despesas.length > 0 || periodo !== null ? (
          <PilulaCabecalho href="/despesas/nova">+ Nova</PilulaCabecalho>
        ) : null}
      </div>

      <div className="px-16">
        <ListaDespesas
          despesas={paraLista}
          hoje={diaEmFortaleza(new Date())}
          janelaAtual={janela}
          filtroDePeriodoAtivo={periodo !== null}
          limitadoA50={limite === 50 && despesas.length === 50}
          rotuloPeriodo={rotuloDoPeriodo(janela, de, ate, "Todas as despesas")}
        />
      </div>
    </main>
  );
}
