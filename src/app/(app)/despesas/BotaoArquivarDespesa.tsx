"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";
import { arquivarDespesaAction } from "./acoes";

/** Mesmo padrão de `BotaoArquivarCaminhao.tsx` — ver o comentário lá. */
export function BotaoArquivarDespesa({ id }: { id: string }) {
  const { pending } = useFormStatus();

  return (
    <Botao
      variante="texto"
      destrutiva
      type="submit"
      disabled={pending}
      className="self-stretch"
      formAction={arquivarDespesaAction.bind(null, id)}
    >
      Arquivar despesa
    </Botao>
  );
}
