"use client";

import { useMemo, useState } from "react";
import { Botao } from "./Botao";
import { CampoBusca } from "./CampoBusca";
import { LinhaDeLista } from "./LinhaDeLista";
import { PilulaCabecalho } from "./PilulaCabecalho";
import { normalizarParaBusca } from "@/lib/utils/texto";

/**
 * Folha de busca — serve cliente, caminhão e motorista dentro do
 * Lançamento de frete (`docs/planos/item-3-lancamento-frete.md`, Tarefa 2;
 * origem, destino e carga usam outro mecanismo, sem folha), e o chip
 * "Cliente" de "Meus fretes" (item 4, Tarefa 2), que só filtra — não
 * cadastra. **Tela cheia**, não folha inferior (`docs/especificacao.md`
 * §4.1: "abre folha de busca em tela cheia") — sem alça, sem overlay.
 *
 * Botões conforme `docs/componentes.md`, "Onde cada tela usa o quê": pílula
 * de cabeçalho **+ Novo** / **+ Cadastrar** (06) e texto neutra **Fechar**
 * (03) — "é a neutra que fecha folha, nunca verde". `onNovo` é opcional: sem
 * ele (uso como filtro), a pílula de cabeçalho some — nenhum botão sem
 * destino (`CLAUDE.md` §8).
 */

export type ItemFolhaDeBusca = {
  id: string;
  nome: string;
  apoio?: string;
  /** Pré-computado por quem chama — só cliente e motorista têm (ver `LinhaDeLista`). */
  iniciais?: string;
};

type Props = {
  titulo: string;
  placeholder: string;
  itens: ItemFolhaDeBusca[];
  onSelecionar: (id: string) => void;
  onNovo?: (nomeDigitado: string) => void;
  onFechar: () => void;
};

export function FolhaDeBusca({ titulo, placeholder, itens, onSelecionar, onNovo, onFechar }: Props) {
  const [busca, setBusca] = useState("");

  const termo = normalizarParaBusca(busca);
  const filtrados = useMemo(
    () => (termo ? itens.filter((item) => normalizarParaBusca(item.nome).includes(termo)) : itens),
    [itens, termo],
  );
  const existeExato = itens.some((item) => normalizarParaBusca(item.nome) === termo);
  const rotuloNovo = termo && !existeExato ? "+ Cadastrar" : "+ Novo";

  return (
    <div
      className="absolute inset-0 z-[70] flex flex-col bg-papel"
      style={{ paddingTop: "var(--area-segura-topo)" }}
    >
      <div className="flex flex-none items-center gap-8 px-16 pb-14">
        <Botao variante="texto" onClick={onFechar} className="flex-none">
          Fechar
        </Botao>
        <span className="min-w-0 flex-1 truncate text-titulo-folha font-extrabold leading-[1.1] text-tinta">
          {titulo}
        </span>
        {onNovo ? (
          <PilulaCabecalho onClick={() => onNovo(busca.trim())} className="flex-none">
            {rotuloNovo}
          </PilulaCabecalho>
        ) : null}
      </div>

      <div className="flex-none px-16 pb-14">
        <CampoBusca
          placeholder={placeholder}
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </div>

      <div
        className="flex flex-1 flex-col gap-6 overflow-auto px-16"
        style={{ paddingBottom: "var(--folga-rolagem)" }}
      >
        {filtrados.map((item) => (
          <LinhaDeLista
            key={item.id}
            iniciais={item.iniciais}
            nome={item.nome}
            apoio={item.apoio}
            onClick={() => onSelecionar(item.id)}
          />
        ))}

        {filtrados.length === 0 ? (
          <div className="px-4 pt-30 text-apoio font-medium text-tinta-apoio-forte">
            {onNovo ? `Nenhum resultado. Toque em ${rotuloNovo} para cadastrar agora.` : "Nenhum resultado."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
