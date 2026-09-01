"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";

/**
 * "Remover acesso" — mesmo padrão de `BotaoArquivarCliente.tsx`: a variante
 * `texto` nunca mostra spinner, mas `useFormStatus` trava o segundo toque
 * enquanto o `<form>` está em voo (`CLAUDE.md` §8).
 */
export function BotaoRemoverAcesso() {
  const { pending } = useFormStatus();

  return (
    <Botao variante="texto" destrutiva type="submit" disabled={pending} className="self-stretch">
      Remover acesso
    </Botao>
  );
}
