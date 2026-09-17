import { ItemMenu } from "@/components/ui/ItemMenu";

/**
 * Financeiro — hub com duas entradas, Opção A de `docs/planos/
 * financeiro-unifica-cobrancas-e-despesas.md` (decisão do fundador,
 * 12/09/2026). Substitui "Cobranças" como destino direto da barra —
 * Cobranças e Despesas continuam sendo as mesmas telas de sempre, em
 * `/cobrancas` e `/despesas`, sem nenhuma mudança nelas; só o caminho até
 * chegar ganhou um passo a mais (barra → hub → tela). Nasce **sem** resumo
 * próprio — pergunta 3 do plano, resposta do fundador: "se fizer falta, o
 * Design decide depois."
 *
 * **Sem `exigirSessao()` própria** — `layout.tsx` já garante que nenhuma
 * tela deste grupo renderiza sem sessão (comentário de `LayoutApp`); chamar
 * de novo aqui seria uma ida a mais ao banco por carregamento, sem uso —
 * esta tela não lê `empresaId` nem nenhum outro dado da sessão.
 *
 * As duas linhas reaproveitam o ícone de `barra-cobrancas.svg` — mesmo
 * precedente já usado para "Despesas" em Mais (`docs/planos/
 * item-11-despesas.md`: nenhum ícone próprio existe para nenhuma das duas,
 * decisão do fundador de 01/09/2026 de não travar tarefa em decisão visual
 * pequena — o precedente em Mais foi removido nesta mesma tarefa, quando
 * "Despesas" saiu de lá). Pedido ao Design, ainda sem resposta: ícone
 * próprio para "Financeiro" na barra e, se fizer sentido, ícones distintos
 * para as duas linhas aqui.
 */
export default function Pagina() {
  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="px-20 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <span
          className="text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Financeiro
        </span>
      </div>

      <div className="flex flex-col gap-6 px-16">
        <ItemMenu href="/cobrancas" nome="Cobranças">
          <path d="M5.16 6.24h13.68v9.18a0.9 0.9 0 0 1 -0.9 0.9H6.06a0.9 0.9 0 0 1 -0.9 -0.9V6.24ZM8.04 9.3h7.92M8.04 12.36h4.5" />
        </ItemMenu>
        <ItemMenu href="/despesas" nome="Despesas">
          <path d="M5.16 6.24h13.68v9.18a0.9 0.9 0 0 1 -0.9 0.9H6.06a0.9 0.9 0 0 1 -0.9 -0.9V6.24ZM8.04 9.3h7.92M8.04 12.36h4.5" />
        </ItemMenu>
      </div>
    </main>
  );
}
