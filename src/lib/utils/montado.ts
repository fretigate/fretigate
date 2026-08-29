"use client";

import { useSyncExternalStore } from "react";

/**
 * `true` só depois da primeira renderização no navegador — `false` durante
 * o HTML gerado pelo servidor e durante a hidratação, para os dois
 * baterem. Extraída de `AcaoCobrarNoWhatsApp.tsx` (item 6, Tarefa 5) no
 * segundo uso real (`TelaMontagemRelatorio.tsx`, item 7, segundo commit) —
 * mesmo critério de `Etiqueta`/`LinhaRecolhida` (`CLAUDE.md` §6, "extraída
 * no primeiro segundo uso real").
 *
 * `useSyncExternalStore`, não `useEffect` + `setState`: o lint
 * `react-hooks/set-state-in-effect` (achado do `/revisar`) recusa o
 * segundo padrão — cascata de re-render a partir de um efeito. Isto não é
 * assinatura de nada de verdade, só o jeito correto de perguntar "isto já
 * hidratou?" sem disparar essa cascata.
 */
function inscreverNoop() {
  return () => {};
}
function estaNoCliente() {
  return true;
}
function estaNoServidor() {
  return false;
}

export function useMontadoNoCliente(): boolean {
  return useSyncExternalStore(inscreverNoop, estaNoCliente, estaNoServidor);
}
