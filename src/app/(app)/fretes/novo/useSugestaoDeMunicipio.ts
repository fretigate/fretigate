"use client";

import { useEffect, useState } from "react";
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
 */
export function useSugestaoDeMunicipio(texto: string): Municipio[] {
  const [sugestoes, setSugestoes] = useState<Municipio[]>([]);

  useEffect(() => {
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
