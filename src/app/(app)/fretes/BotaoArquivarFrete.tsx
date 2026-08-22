"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";
import { arquivarServicoAction } from "./acoes";

/** Mesmo padrão de `BotaoArquivarCaminhao.tsx` — ver o comentário lá. */
export function BotaoArquivarFrete({ id }: { id: string }) {
  const { pending } = useFormStatus();

  return (
    <Botao
      variante="texto"
      destrutiva
      type="submit"
      disabled={pending}
      className="self-stretch"
      formAction={arquivarServicoAction.bind(null, id)}
    >
      Arquivar frete
    </Botao>
  );
}
