import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { exigirSessao, SemSessao } from "@/lib/auth/sessao";
import { BarraDeNavegacao } from "./BarraDeNavegacao";

/**
 * Casca do app — `docs/componentes.md` §10: a barra de navegação é
 * permanente dentro da sessão e não existe fora dela. Por isso a checagem de
 * sessão mora aqui, não em cada tela: nenhuma tela deste grupo renderiza sem
 * sessão, e a barra nunca aparece para quem não entrou.
 *
 * Quem já checou a sessão aqui e redirecionou não sobra para a tela filha
 * relançar o mesmo erro — se `exigirSessao()` falhar dentro de uma página
 * depois deste ponto, é bug, não o caminho esperado de "sem sessão".
 */
export default async function LayoutApp({ children }: { children: ReactNode }) {
  try {
    await exigirSessao();
  } catch (erro) {
    if (erro instanceof SemSessao) redirect("/entrar");
    throw erro;
  }

  return (
    <>
      {children}
      <BarraDeNavegacao />
    </>
  );
}
