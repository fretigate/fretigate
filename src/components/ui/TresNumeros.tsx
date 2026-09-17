import { formatarCentavos } from "@/lib/utils/dinheiro";

/**
 * Grade de três pastilhas — extraída em 17/09/2026
 * (`docs/planos/financeiro-resumo-com-numeros.md`) de dentro de
 * `cobrancas/page.tsx`, quando o hub Financeiro virou o segundo lugar a
 * precisar do mesmo desenho (`CLAUDE.md` §8: "Componente existe uma vez...
 * Proibido copiar componente"). Cada chamador decide os rótulos, os valores
 * e o tom de cada item; este componente só monta a grade.
 *
 * A tipografia do rótulo (9px/`.09em`) é a exceção registrada em
 * `docs/estilo.md`, "Conflitos resolvidos" 3 — decisão do Design só para
 * grades de três números, nunca o rótulo de seção geral (11px).
 */

export type ItemDeTresNumeros = {
  rotulo: string;
  valor?: number;
  /**
   * Texto curto no lugar do valor, quando o número seria incompleto ou
   * enganoso (`CLAUDE.md` §8, "Número incompleto não é exibido"). Mesmo
   * padrão do `convite` da pastilha da dashboard (`src/app/(app)/page.tsx`).
   */
  convite?: string;
  tom?: "neutro" | "vencido" | "acao";
};

const TONS: Record<NonNullable<ItemDeTresNumeros["tom"]>, { fundo: string; classe: string; classeRotulo: string }> = {
  neutro: { fundo: "bg-separacao", classe: "text-tinta", classeRotulo: "text-tinta-apoio" },
  vencido: { fundo: "bg-vencido-fundo", classe: "text-vencido", classeRotulo: "text-vencido" },
  acao: { fundo: "bg-separacao", classe: "text-acao", classeRotulo: "text-tinta-apoio" },
};

export function TresNumeros({ itens }: { itens: ItemDeTresNumeros[] }) {
  return (
    <div className="flex gap-7">
      {itens.map((item) => {
        const tom = TONS[item.tom ?? "neutro"];
        return (
          <div
            key={item.rotulo}
            className={`flex min-w-0 flex-1 flex-col gap-10 rounded-linha px-11 py-13 ${tom.fundo}`}
          >
            <span
              className={`text-eyebrow-topo-cobrancas font-bold uppercase leading-[1.25] tracking-[.09em] ${tom.classeRotulo}`}
            >
              {item.rotulo}
            </span>
            {item.convite ? (
              <span className="text-total-contextual font-medium text-tinta-apoio-forte">{item.convite}</span>
            ) : (
              <span className={`text-valor-lista font-extrabold leading-[1] tabular-nums ${tom.classe}`}>
                R$ {formatarCentavos(item.valor ?? 0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
