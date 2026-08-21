"use client";

import { FolhaInferior } from "./FolhaInferior";
import { EtiquetaSituacao } from "./EtiquetaSituacao";
import type { SituacaoFinanceira } from "@/lib/servicos/titulos";

/**
 * Folha do chip "Situação" — "Meus fretes" (item 4, Tarefa 2). Os quatro
 * estados de `situacaoFinanceira` (`src/lib/servicos/titulos.ts`), mais
 * "Todas" para limpar o filtro — filtrado no cliente, sobre o que já está
 * carregado (decisão do fundador, plano do item 4: "cliente e situação são
 * filtrados no cliente").
 *
 * Opções em `min-h-64`/`rounded-campo` — achado do `/revisar`, mesmo motivo
 * de `FolhaDePeriodo.tsx`: espec de "item de folha" em `docs/estilo.md`
 * (mín. 64px, raio 18px), não a de linha de lista.
 */

type Props = {
  situacaoAtual: SituacaoFinanceira | undefined;
  onEscolher: (situacao: SituacaoFinanceira | undefined) => void;
  onFechar: () => void;
};

const ESTADOS: SituacaoFinanceira[] = ["a_faturar", "faturado", "parcial", "quitado"];

export function FolhaDeSituacao({ situacaoAtual, onEscolher, onFechar }: Props) {
  return (
    <FolhaInferior titulo="Situação" onFechar={onFechar}>
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => onEscolher(undefined)}
          className={[
            "flex min-h-64 items-center rounded-campo px-16 text-nome-recolhida font-semibold",
            situacaoAtual === undefined ? "bg-pilula text-acao" : "bg-separacao text-tinta",
          ].join(" ")}
        >
          Todas
        </button>
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            type="button"
            onClick={() => onEscolher(estado)}
            className={[
              "flex min-h-64 items-center justify-between rounded-campo px-16",
              situacaoAtual === estado ? "bg-pilula" : "bg-separacao",
            ].join(" ")}
          >
            <EtiquetaSituacao situacao={estado} />
          </button>
        ))}
      </div>
    </FolhaInferior>
  );
}
