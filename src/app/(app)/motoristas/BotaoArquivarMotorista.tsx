"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";
import { arquivarMotoristaAction } from "./acoes";

/** Mesmo padrão de `BotaoArquivarCliente.tsx` — ver o comentário lá. */
export function BotaoArquivarMotorista({ id }: { id: string }) {
  const { pending } = useFormStatus();

  return (
    <Botao
      variante="texto"
      destrutiva
      type="submit"
      disabled={pending}
      className="self-stretch"
      formAction={arquivarMotoristaAction.bind(null, id)}
    >
      Arquivar motorista
    </Botao>
  );
}
