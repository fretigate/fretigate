"use client";

import { useEffect, useRef, useState } from "react";
import type { Municipio } from "@/lib/servicos/municipios";
import { buscarMunicipiosAction } from "../acoes";

/**
 * Busca ao vivo de município enquanto a pessoa digita — extraído de
 * `TelaLancarFrete.tsx`
 * (`docs/planos/corrige-desambiguacao-origem-municipio.md`, Tarefa 1):
 * Origem e Destino precisam do mesmo debounce de 200ms e da mesma chamada a
 * `buscarMunicipiosAction`, cada um com sua própria lista — os dois campos
 * podem estar sendo digitados/sugeridos ao mesmo tempo, por isso um hook por
 * campo, nunca uma lista compartilhada.
 *
 * Nunca busca no valor que o campo já tinha ao montar — decisão do fundador,
 * registrada em `docs/planos/corrige-desambiguacao-origem-municipio.md`
 * ("Segunda correção", 07/09/2026): campo pré-preenchido (Origem em criação,
 * ou qualquer um dos dois em edição) é um valor que a pessoa não escolheu
 * digitar, e sugerir correção para ele é ruído, com custo medido de empurrar
 * a linha Carga para fora da tela. A busca começa a valer só a partir da
 * primeira mudança feita pela própria pessoa.
 *
 * A guarda compara contra o valor **de montagem**, capturado uma vez
 * (`useRef(texto)`, nunca reatribuído) — não um `useEffect` que muda uma
 * `ref` para "já rodou uma vez". O primeiro jeito foi tentado e falhou sob
 * `React.StrictMode` (ligado por padrão no Next.js em desenvolvimento): o
 * modo duplica montagem+efeito de propósito para achar efeito sem limpeza, e
 * uma `ref` mutada **dentro do efeito** já está "false" na segunda chamada
 * da mesma dupla, deixando a busca disparar de qualquer jeito. Comparar
 * contra o valor fixo de montagem é imune a isso, porque as duas chamadas da
 * dupla carregam o mesmo `texto`.
 */
export function useSugestaoDeMunicipio(texto: string): Municipio[] {
  const [sugestoes, setSugestoes] = useState<Municipio[]>([]);
  const valorDeMontagem = useRef(texto);

  useEffect(() => {
    if (texto === valorDeMontagem.current) return;
    let cancelado = false;
    const termo = texto.trim();
    const temporizador = setTimeout(() => {
      if (termo.length < 2) {
        if (!cancelado) setSugestoes([]);
        return;
      }
      buscarMunicipiosAction(texto).then((lista) => {
        if (!cancelado) setSugestoes(lista);
      });
    }, 200);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [texto]);

  return sugestoes.filter((m) => `${m.nome}/${m.uf}` !== texto.trim());
}
