"use client";

import type { ReactNode } from "react";
import { Botao } from "./Botao";
import { PilulaEmLinha } from "./PilulaEmLinha";
import { estaEmModoStandalone } from "@/lib/utils/link-externo";

/**
 * O segundo toque: o link só ficou pronto depois de o servidor responder, e
 * não havia janela para navegar (`prepararJanelaExterna` devolveu
 * `"precisa-de-toque"`, `src/lib/utils/link-externo.ts` — app instalado, aba
 * bloqueada, ou navegador que não respeitou o corte do vínculo). Um toque
 * real, com o endereço já no `href`, é o que o iOS aceita entregar.
 *
 * **Provisório, sem confirmação do Design** (`docs/planos/
 * corrige-link-externo-segundo-toque.md`, "O que vai ao Design"): é o
 * `Botao` principal com `href` (formato `"botao"`) ou a `PilulaEmLinha` com
 * `href` (formato `"pilula"`) que o inventário já tem, sem valor novo de
 * `docs/estilo.md`. O nome do botão e onde ele entra no inventário de
 * `docs/componentes.md` são pergunta aberta.
 *
 * `formato` segue o lugar onde o segundo toque nasce: numa tela de ação
 * (convite novo, `/planos`), o botão principal; numa linha de lista (reenviar
 * convite), a pílula em linha — mesmo padrão das outras ações daquela linha.
 *
 * `destino` decide **onde** abre, e a diferença é de propósito:
 * - `"navegador"` (checkout): `_blank` — no app instalado, o iOS abre o
 *   Safari de verdade, com barra de endereço, o que numa tela de pagar é o
 *   desejável e não perde nada (não há estado do app a preservar).
 * - `"whatsapp"`: no app instalado, **mesma janela** — o sistema entrega o
 *   link `wa.me` ao aplicativo do WhatsApp e o app do FretiGate continua onde
 *   estava (decisão de 12/09/2026, `abrirLinkExterno`). Fora do app
 *   instalado, `_blank`.
 *
 * Sem `onClick` que mude estado: o clique segue o `href` depois do
 * manipulador, e desmontar o botão no meio dele arriscaria perder a
 * navegação. Quem usa deixa o botão na tela.
 */
export function BotaoContinuarExterno({
  href,
  destino,
  formato = "botao",
  children,
}: {
  href: string;
  destino: "navegador" | "whatsapp";
  formato?: "botao" | "pilula";
  children: ReactNode;
}) {
  const mesmaJanela = destino === "whatsapp" && estaEmModoStandalone();
  const abertura = mesmaJanela ? {} : { target: "_blank", rel: "noopener noreferrer" };

  if (formato === "pilula") {
    return (
      <PilulaEmLinha href={href} {...abertura}>
        {children}
      </PilulaEmLinha>
    );
  }

  return (
    <Botao variante="principal" href={href} {...abertura}>
      {children}
    </Botao>
  );
}
