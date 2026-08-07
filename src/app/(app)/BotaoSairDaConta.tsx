"use client";

import { useFormStatus } from "react-dom";
import { Botao } from "@/components/ui/Botao";

/**
 * "Sair da conta" chama o servidor — CLAUDE.md §8 exige toque repetido
 * ignorado em todo botão assim, sem exceção pela variante.
 *
 * A variante `texto` do inventário (`docs/componentes.md` 03) nunca mostra
 * spinner ("é sempre rara ou destrutiva, nunca uma chamada de servidor com
 * espera visível") — mas "sem indicador visual" não é o mesmo que "sem
 * travar o segundo toque". Este componente cumpre as duas coisas: usa
 * `useFormStatus` só para desabilitar durante o pedido, sem acrescentar
 * spinner — por isso é um componente à parte, e não uma mudança no `Botao`
 * (que não tem como saber, sozinho, que está dentro de um `<form>`).
 */
export function BotaoSairDaConta() {
  const { pending } = useFormStatus();

  return (
    <Botao variante="texto" destrutiva type="submit" disabled={pending}>
      Sair da conta
    </Botao>
  );
}
