"use client";

import { FolhaInferior } from "./FolhaInferior";

/**
 * Folha do chip "Ordenar por" — item 4, Tarefa 5. Genérico sobre a lista de
 * critérios: recebe os critérios já rotulados, sem conhecer o domínio
 * (cliente, caminhão, motorista) — quem decide os critérios é a lista que a
 * usa. Mesmo layout de `FolhaDeSituacao.tsx` (`min-h-64`/`rounded-campo`,
 * fundo `bg-pilula`/`text-acao` quando selecionado), mas sem hardcodar os
 * quatro estados financeiros: generalizar `FolhaDeSituacao` por cima
 * misturaria dois domínios sem necessidade — mais barato um componente
 * pequeno novo, genérico desde o nascimento porque já tem os três usos reais
 * (Clientes, Caminhões, Motoristas) no mesmo commit.
 */

export type CriterioDeOrdenacao<T extends string> = {
  valor: T;
  rotulo: string;
};

type Props<T extends string> = {
  criterios: CriterioDeOrdenacao<T>[];
  atual: T;
  onEscolher: (criterio: T) => void;
  onFechar: () => void;
  /**
   * "Ordenar por" nas três listas de cadastro (o primeiro uso, item 4 Tarefa
   * 5), "Situação" no chip de Cobranças (item 6, Tarefa 2). Mesma forma —
   * lista de opções rotuladas, uma marcada —, então mesma folha: copiar os
   * botões para uma folha nova é o que `CLAUDE.md` §8 proíbe.
   *
   * **O nome do arquivo ficou preso ao primeiro uso**, e isso é lacuna
   * conhecida, não descuido: renomear para `FolhaDeOpcoes` tocaria as três
   * telas de cadastro, fora do escopo desta tarefa (`CLAUDE.md` §2, item 4).
   * Fica para quem for mexer nelas.
   */
  titulo?: string;
};

export function FolhaDeOrdenacao<T extends string>({
  criterios,
  atual,
  onEscolher,
  onFechar,
  titulo = "Ordenar por",
}: Props<T>) {
  return (
    <FolhaInferior titulo={titulo} onFechar={onFechar}>
      <div className="flex flex-col gap-6">
        {criterios.map((criterio) => (
          <button
            key={criterio.valor}
            type="button"
            onClick={() => onEscolher(criterio.valor)}
            className={[
              "flex min-h-64 items-center rounded-campo px-16 text-nome-recolhida font-semibold",
              criterio.valor === atual ? "bg-pilula text-acao" : "bg-separacao text-tinta",
            ].join(" ")}
          >
            {criterio.rotulo}
          </button>
        ))}
      </div>
    </FolhaInferior>
  );
}
