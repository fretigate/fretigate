"use client";

import { useState } from "react";
import { FolhaInferior } from "./FolhaInferior";
import { FolhaDeCalendario } from "./FolhaDeCalendario";

/**
 * Folha do chip "Período" — "Meus fretes" (item 4, Tarefa 2). Decisão do
 * fundador, 21/08/2026: janelas prontas (Este mês · Mês passado · Todos os
 * fretes) mais "Personalizado", que escolhe um intervalo em duas etapas
 * (data inicial, depois final) reaproveitando `FolhaDeCalendario` —
 * `fecharAoEscolher={false}` na primeira etapa para não fechar a folha
 * inteira ao escolher só a data inicial.
 *
 * Opções em `min-h-64`/`rounded-campo` — achado do `/revisar`: "item de
 * folha (lista de escolha)" tem espec própria em `docs/estilo.md` (mín.
 * 64px, raio 18px), diferente da linha de lista (78px, raio 20px) que eu
 * tinha usado por engano.
 */

export type JanelaEscolhida =
  | { tipo: "mes-atual" | "mes-passado" | "todos" }
  | { tipo: "personalizado"; de: string; ate: string };

type Props = {
  hoje: string;
  janelaAtual: string | undefined;
  onEscolher: (janela: JanelaEscolhida) => void;
  onFechar: () => void;
};

const OPCOES: { valor: "mes-atual" | "mes-passado" | "todos"; rotulo: string }[] = [
  { valor: "mes-atual", rotulo: "Este mês" },
  { valor: "mes-passado", rotulo: "Mês passado" },
  { valor: "todos", rotulo: "Todos os fretes" },
];

export function FolhaDePeriodo({ hoje, janelaAtual, onEscolher, onFechar }: Props) {
  const [passo, setPasso] = useState<"opcoes" | "inicio" | "fim">("opcoes");
  const [dataInicio, setDataInicio] = useState<string | null>(null);

  if (passo === "inicio") {
    return (
      <FolhaDeCalendario
        hoje={hoje}
        escolhida={hoje}
        titulo="Data inicial"
        fecharAoEscolher={false}
        onEscolher={(dia) => {
          setDataInicio(dia);
          setPasso("fim");
        }}
        onFechar={onFechar}
      />
    );
  }

  if (passo === "fim" && dataInicio) {
    return (
      <FolhaDeCalendario
        hoje={hoje}
        escolhida={dataInicio}
        titulo="Data final"
        onEscolher={(dia) => {
          // Se a pessoa tocar uma data antes da inicial, os dois papéis
          // trocam — nunca um intervalo invertido.
          const [de, ate] = dia < dataInicio ? [dia, dataInicio] : [dataInicio, dia];
          onEscolher({ tipo: "personalizado", de, ate });
        }}
        onFechar={onFechar}
      />
    );
  }

  return (
    <FolhaInferior titulo="Período" onFechar={onFechar}>
      <div className="flex flex-col gap-6">
        {OPCOES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => onEscolher({ tipo: opcao.valor })}
            className={[
              "flex min-h-64 items-center rounded-campo px-16 text-nome-recolhida font-semibold",
              janelaAtual === opcao.valor ? "bg-pilula text-acao" : "bg-separacao text-tinta",
            ].join(" ")}
          >
            {opcao.rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPasso("inicio")}
          className={[
            "flex min-h-64 items-center rounded-campo px-16 text-nome-recolhida font-semibold",
            janelaAtual === "personalizado" ? "bg-pilula text-acao" : "bg-separacao text-tinta",
          ].join(" ")}
        >
          Personalizado
        </button>
      </div>
    </FolhaInferior>
  );
}
