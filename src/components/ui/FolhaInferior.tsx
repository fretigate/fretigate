"use client";

import type { ReactNode } from "react";

/**
 * Folha inferior — padrão genérico repetido em `docs/componentes.md` §11
 * (Cadastro rápido) e §12 (Folha do campo que falta), sem seção própria.
 * Fundo `#FAF8F4`, alça `38×4` em `#DAD5CA`, overlay `rgba(20,26,23,.42)`.
 * Vira componente-base aqui porque a Tarefa 2 do item 3 (`docs/planos/
 * item-3-lancamento-frete.md`) já tem dois usos reais e simultâneos —
 * Cadastro rápido e a Folha de calendário do campo Data —, não é abstração
 * antecipando uso futuro.
 *
 * **Raio: `22px`, não os `28px 28px 0 0` que `componentes.md` §11/§12
 * escrevem.** Achado do `/revisar` na Tarefa 2: os dois documentos
 * discordam entre si, e quem manda em raio é `docs/estilo.md` § Formas
 * ("22px | Pastilha da dashboard, aviso do sistema, folha inferior
 * (topo)") — mesma resolução já usada para o respiro da barra e a elevação
 * do (+), quando os dois documentos também discordaram (`docs/componentes.md`
 * § Conflitos). `componentes.md` §11/§12 precisam ser corrigidos pelo
 * Design; decisão do fundador, revisão da Tarefa 2.
 *
 * **Não é a Folha de busca.** Essa é tela cheia, sem overlay nem alça
 * (`docs/especificacao.md` §4.1: "abre folha de busca em tela cheia") — tem
 * componente próprio.
 *
 * Toque no overlay fecha, igual ao padrão do protótipo de referência
 * (`referencia/`, evidência corroborante — `CLAUDE.md` §13).
 */

type Props = {
  titulo?: string;
  onFechar: () => void;
  children: ReactNode;
};

export function FolhaInferior({ titulo, onFechar, children }: Props) {
  return (
    <div className="absolute inset-0 z-[80] flex flex-col justify-end bg-tinta/[.42]">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="flex-1"
      />
      <div className="flex flex-none flex-col gap-14 rounded-t-pastilha bg-papel px-20 pt-16 pb-40">
        <span className="h-4 w-38 self-center rounded-pilula bg-alca" />
        {titulo ? (
          <span className="text-titulo-folha font-extrabold leading-[1.1] text-tinta">
            {titulo}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}
