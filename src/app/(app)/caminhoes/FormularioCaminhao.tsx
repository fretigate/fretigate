"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { ChipEscolha } from "@/components/ui/ChipEscolha";
import type { DadosCaminhao } from "@/lib/servicos/caminhoes";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { BotaoArquivarCaminhao } from "./BotaoArquivarCaminhao";
import { criarCaminhaoAction, editarCaminhaoAction, type EstadoCaminhao } from "./acoes";

const ESTADO_INICIAL: EstadoCaminhao = {};

/**
 * Cadastro / edição de caminhão — `docs/componentes.md` linha 377: principal
 * desabilitada até ter apelido ou placa, chips de escolha para TIPO, texto
 * destrutiva "Arquivar caminhão" no fim. Sem campo de ano
 * (`docs/especificacao.md`, entidade Veiculo).
 *
 * Montado com as peças da tarefa 5 — mesma técnica de `FormularioCliente.tsx`
 * (decisão do fundador, `docs/planos/item-2-cadastros.md`, tarefa 6).
 */

type Caminhao = {
  id: string;
  placa: string | null;
  apelido: string | null;
  tipo: DadosCaminhao["tipo"];
};

type Props = {
  caminhao?: Caminhao;
  apelidoInicial?: string;
};

export function FormularioCaminhao({ caminhao, apelidoInicial }: Props) {
  const ehEdicao = caminhao !== undefined;
  const acao = ehEdicao ? editarCaminhaoAction.bind(null, caminhao.id) : criarCaminhaoAction;
  const [estado, formAction, pending] = useActionState(acao, ESTADO_INICIAL);

  const [apelido, setApelido] = useState(caminhao?.apelido ?? apelidoInicial ?? "");
  const [placa, setPlaca] = useState(caminhao?.placa ?? "");
  const [tipo, setTipo] = useState(caminhao?.tipo ?? "");

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <span className="px-4 pb-8 text-apoio font-medium text-tinta-apoio-forte">
        Apelido ou placa já bastam. O resto você preenche quando precisar.
      </span>

      <span className="px-4 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Identificação
      </span>
      <div className="flex flex-col gap-6">
        <CampoTexto
          rotulo="Apelido"
          name="apelido"
          placeholder="Como você chama esse caminhão"
          value={apelido}
          onChange={alterar(setApelido)}
          erro={estado.erros?.apelido}
        />
        <CampoTexto
          rotulo="Placa"
          name="placa"
          placeholder="ABC-1D23"
          value={placa}
          onChange={alterar(setPlaca)}
          erro={estado.erros?.placa}
        />
      </div>

      <span className="px-4 pt-14 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Tipo
      </span>
      <div role="radiogroup" aria-label="Tipo do caminhão" className="flex flex-wrap gap-8 px-4">
        <input type="hidden" name="tipo" value={tipo} />
        {TIPOS_VEICULO.map((opcao) => (
          <ChipEscolha
            key={opcao.valor}
            selecionado={tipo === opcao.valor}
            onClick={() => setTipo((atual) => (atual === opcao.valor ? "" : opcao.valor))}
          >
            {opcao.rotulo}
          </ChipEscolha>
        ))}
      </div>
      {estado.erros?.tipo ? (
        <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.tipo}</span>
      ) : null}

      {estado.erroGeral ? (
        <span className="px-4 pt-8 text-apoio font-medium text-vencido">
          {estado.erroGeral}
        </span>
      ) : null}

      <Botao
        variante="principal"
        type="submit"
        carregando={pending}
        disabled={apelido.trim().length === 0 && placa.trim().length === 0}
        className="mt-16"
      >
        {ehEdicao ? "Salvar alterações" : "Cadastrar caminhão"}
      </Botao>

      {ehEdicao ? <BotaoArquivarCaminhao id={caminhao.id} /> : null}
    </form>
  );
}
