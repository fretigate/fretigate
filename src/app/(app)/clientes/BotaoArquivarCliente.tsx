"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";
import { arquivarClienteAction } from "./acoes";

/**
 * "Arquivar cliente" chama o servidor (`formAction`, dentro do mesmo `<form>`
 * de "Salvar alterações") — mesmo caso de `BotaoSairDaConta.tsx`, e mesma
 * solução: a variante `texto` nunca mostra spinner
 * (`docs/componentes.md` 03), mas "sem indicador visual" não é o mesmo que
 * "sem travar o segundo toque" (`CLAUDE.md` §8). `useFormStatus` só
 * desabilita, sem acrescentar spinner — e precisa ser um componente à parte
 * porque só funciona dentro do `<form>`, nunca no componente que o declara.
 */
export function BotaoArquivarCliente({ id }: { id: string }) {
  const { pending } = useFormStatus();

  return (
    <Botao
      variante="texto"
      destrutiva
      type="submit"
      disabled={pending}
      className="self-stretch"
      formAction={arquivarClienteAction.bind(null, id)}
    >
      Arquivar cliente
    </Botao>
  );
}
