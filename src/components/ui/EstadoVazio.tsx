import type { ReactNode } from "react";

/**
 * Estado vazio — `docs/estilo.md` (título 22/800/1.25, `ls -.01em`) e a
 * regra reescrita do `CLAUDE.md` §8: oferece a ação que destrava a tela
 * quando ela existe (`acao`); quando não existe, o texto de apoio diz o que
 * falta — nunca um botão sem destino, nunca ilustração decorativa.
 */

type Props = {
  titulo: string;
  texto: string;
  acao?: ReactNode;
};

export function EstadoVazio({ titulo, texto, acao }: Props) {
  return (
    <div className="flex flex-col gap-12 px-4 pt-30">
      <span className="text-titulo-vazio font-extrabold tracking-[-0.01em] text-tinta">
        {titulo}
      </span>
      {/* "Corpo de apoio", docs/estilo.md § Tipografia: 13–15/1.2–1.5/400–500
          — a mesma faixa que fretes/cobrancas (tarefa 4) já usa em
          `text-apoio font-medium text-tinta-apoio`, aqui reaproveitada. */}
      <span className="text-apoio font-medium text-tinta-apoio">{texto}</span>
      {acao ? <div className="mt-8">{acao}</div> : null}
    </div>
  );
}
