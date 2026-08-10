"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";
import { arquivarCaminhaoAction } from "./acoes";

/** Mesmo padrão de `BotaoArquivarCliente.tsx` — ver o comentário lá. */
export function BotaoArquivarCaminhao({ id }: { id: string }) {
  const { pending } = useFormStatus();

  return (
    <Botao
      variante="texto"
      destrutiva
      type="submit"
      disabled={pending}
      className="self-stretch"
      formAction={arquivarCaminhaoAction.bind(null, id)}
    >
      Arquivar caminhão
    </Botao>
  );
}
