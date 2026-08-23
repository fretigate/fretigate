"use client";

import { useState } from "react";
import { Botao } from "./Botao";
import { CampoTexto } from "./CampoTexto";
import { FolhaInferior } from "./FolhaInferior";
import { normalizarTelefone, type ResultadoSalvarTelefone } from "@/lib/utils/telefone";

/**
 * "Folha do campo que falta" (`docs/componentes.md` §12), primeiro
 * consumidor real do documento — item 5, Tarefa 1. Resolve dois casos com o
 * mesmo componente, diferença só no título e no estado inicial do campo
 * (`docs/planos/item-5-ordem-de-servico.md`, decisão 2):
 *
 * - **Ausente** (`valorAtual` vazio): título "Falta o telefone de {nome}",
 *   campo vazio, sem erro até o primeiro dígito.
 * - **Inválido** (`valorAtual` é o texto salvo, que não passa em
 *   `normalizarTelefone`): título "O telefone de {nome} não parece válido",
 *   campo pré-preenchido com o valor salvo, erro já visível — para corrigir
 *   em vez de digitar do zero.
 *
 * Genérica o bastante para "Salvar e cobrar" (item 6) reaproveitar sem
 * refazer — `rotuloBotao` e `apoio` nomeiam a ação de cada chamador.
 */

type Props = {
  nome: string;
  valorAtual: string;
  rotuloBotao: string;
  apoio: string;
  onSalvar: (telefone: string) => Promise<ResultadoSalvarTelefone>;
  onFechar: () => void;
};

export function FolhaDeTelefone({ nome, valorAtual, rotuloBotao, apoio, onSalvar, onFechar }: Props) {
  const ausente = valorAtual.trim().length === 0;
  const [telefone, setTelefone] = useState(valorAtual);
  const [erroServidor, setErroServidor] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  const normalizado = normalizarTelefone(telefone);
  // Campo vazio nunca é erro — nem no estado inicial nem depois de apagar o
  // que foi digitado (`docs/componentes.md` §12: "campo vazio é o estado
  // inicial esperado, não erro"). O caso "inválido" nasce com o campo já
  // preenchido, então o erro aparece de cara sem precisar de estado próprio
  // para "já digitou alguma coisa".
  const erroValidacao = telefone.trim().length > 0 && !normalizado.ok ? normalizado.erro : undefined;

  async function salvar() {
    if (!normalizado.ok) return;
    setSalvando(true);
    setErroServidor(undefined);
    const resultado = await onSalvar(telefone);
    setSalvando(false);
    if (!resultado.ok) setErroServidor(resultado.erro);
  }

  return (
    <FolhaInferior
      titulo={ausente ? `Falta o telefone de ${nome}` : `O telefone de ${nome} não parece válido`}
      onFechar={onFechar}
    >
      <span className="text-[14px] font-medium leading-[1.45] text-tinta-apoio-forte">{apoio}</span>
      <CampoTexto
        rotulo="Telefone"
        type="tel"
        placeholder="Com DDD"
        value={telefone}
        autoFocus
        onChange={(evento) => setTelefone(evento.target.value)}
        erro={erroValidacao}
      />
      {erroServidor ? (
        <span className="text-apoio font-medium text-vencido">{erroServidor}</span>
      ) : null}
      <Botao variante="principal" carregando={salvando} disabled={!normalizado.ok} onClick={salvar}>
        {rotuloBotao}
      </Botao>
      <Botao variante="texto" onClick={onFechar}>
        Agora não
      </Botao>
    </FolhaInferior>
  );
}
