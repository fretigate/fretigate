"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Aviso do sistema — `docs/componentes.md` 07. Um componente só, usado por
 * "Frete salvo" (Tarefa 3 do item 3) e, depois, por outras mensagens do
 * sistema. Mensagem do sistema fica em superfície escura — nunca dado do
 * usuário (`CLAUDE.md` §8, "três superfícies, três significados").
 *
 * Flutua sobre o conteúdo, nunca ocupa lugar no fluxo, some sozinho: `6s`
 * sem botão, `8s` com — quem chama controla o desaparecimento por
 * `onSumir` (chamado tanto pelo timer quanto por uma ação do usuário que já
 * resolve o aviso, ex.: "Já recebi" com sucesso).
 */

type Props = {
  mensagem: string;
  /** Variante `PilulaSobreEscuro` com `dentroDoAviso`, `flex:1`. */
  botoes?: ReactNode;
  onSumir: () => void;
};

const SEM_BOTAO_MS = 6000;
const COM_BOTAO_MS = 8000;

export function AvisoDoSistema({ mensagem, botoes, onSumir }: Props) {
  // Sempre a versão mais recente de `onSumir` — sem o ref, incluir a função
  // nas dependências reiniciaria o timer a cada render do chamador (ela é
  // recriada a cada render), e omiti-la sem o ref chamaria uma versão presa
  // no fechamento do primeiro render. A atualização do ref mora num efeito
  // próprio, nunca durante o render (React recusa mutar ref fora de efeito).
  const onSumirRef = useRef(onSumir);
  useEffect(() => {
    onSumirRef.current = onSumir;
  });

  const temBotoes = Boolean(botoes);
  useEffect(() => {
    const tempo = temBotoes ? COM_BOTAO_MS : SEM_BOTAO_MS;
    const id = setTimeout(() => onSumirRef.current(), tempo);
    return () => clearTimeout(id);
  }, [temBotoes]);

  return (
    <div
      role="status"
      className="fixed z-50 flex flex-col gap-14 rounded-pastilha bg-tinta px-18 py-16 text-[14.5px] font-semibold leading-[1.4] text-white shadow-[0_14px_34px_rgba(20,26,23,.30),0_3px_10px_rgba(20,26,23,.16)]"
      style={{
        left: "var(--margem-lateral-esquerda)",
        right: "var(--margem-lateral-direita)",
        bottom: "var(--ancora-aviso)",
      }}
    >
      <p>{mensagem}</p>
      {botoes ? <div className="flex gap-10">{botoes}</div> : null}
    </div>
  );
}
