"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChipFiltro } from "./ChipFiltro";
import { FolhaDePeriodo, type JanelaEscolhida } from "./FolhaDePeriodo";

/**
 * Chip de período dos três perfis (Tarefa 6, item 4) — único componente,
 * reaproveitado por Cliente/Caminhão/Motorista (`CLAUDE.md` §8), em vez de
 * repetir a mesma folha + navegação em cada `page.tsx`. Reaproveita
 * `FolhaDePeriodo`/`ChipFiltro`, já construídos na Tarefa 2.
 *
 * Diferente do chip de período de "Meus fretes": aqui sempre existe um
 * período aplicado (mês corrente por padrão — `resolverPeriodoDoPerfil`),
 * nunca o estado neutro "Período" — por isso `ativo` é sempre `true`, e o
 * chip sozinho na fileira usa 48px (`CLAUDE.md` §8, exceção corrigida na
 * Tarefa 5).
 */

type Props = {
  caminhoBase: string;
  hoje: string;
  janelaAtual: string;
  rotuloPeriodo: string;
};

export function ChipDePeriodoPerfil({ caminhoBase, hoje, janelaAtual, rotuloPeriodo }: Props) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);

  function escolher(janela: JanelaEscolhida) {
    const parametros = new URLSearchParams();
    if (janela.tipo === "personalizado") {
      parametros.set("periodo", "personalizado");
      parametros.set("de", janela.de);
      parametros.set("ate", janela.ate);
    } else {
      parametros.set("periodo", janela.tipo);
    }
    setAberta(false);
    router.push(`${caminhoBase}?${parametros.toString()}`);
  }

  return (
    <>
      <ChipFiltro rotulo={rotuloPeriodo} ativo altura={48} onClick={() => setAberta(true)} />
      {aberta ? (
        <FolhaDePeriodo
          hoje={hoje}
          janelaAtual={janelaAtual}
          onEscolher={escolher}
          onFechar={() => setAberta(false)}
        />
      ) : null}
    </>
  );
}
