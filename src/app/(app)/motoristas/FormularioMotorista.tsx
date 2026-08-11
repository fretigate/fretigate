"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { ChipEscolha } from "@/components/ui/ChipEscolha";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { BotaoArquivarMotorista } from "./BotaoArquivarMotorista";
import { criarMotoristaAction, editarMotoristaAction, type EstadoMotorista } from "./acoes";

const ESTADO_INICIAL: EstadoMotorista = {};

/**
 * Cadastro / edição de motorista — `docs/componentes.md` linha 376: principal
 * desabilitada até ter nome, texto destrutiva "Arquivar motorista" no fim.
 *
 * Montado com as peças da tarefa 5 — mesma técnica de `FormularioCliente.tsx`
 * e `FormularioCaminhao.tsx` (`docs/planos/item-2-cadastros.md`, tarefa 7).
 *
 * "Caminhão habitual" reusa `ChipEscolha` (mesma técnica do chip de Tipo do
 * Caminhão): um chip por caminhão ativo da empresa, campo opcional com
 * des-seleção por toque. **Limite do formato** (`docs/planos/
 * item-2-cadastros.md`, tarefa 7): um chip por caminhão funciona para a
 * faixa de 5 a 10 veículos do segmento do produto (`CLAUDE.md` §1) — acima
 * disso o formato vira lista de seleção, não chip.
 */

type Caminhao = {
  id: string;
  apelido: string | null;
  placa: string | null;
  arquivado_em: Date | null;
};

type Motorista = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  veiculo_habitual_id: string | null;
};

type Props = {
  motorista?: Motorista;
  caminhoes: Caminhao[];
  nomeInicial?: string;
};

export function FormularioMotorista({ motorista, caminhoes, nomeInicial }: Props) {
  const ehEdicao = motorista !== undefined;
  const acao = ehEdicao ? editarMotoristaAction.bind(null, motorista.id) : criarMotoristaAction;
  const [estado, formAction, pending] = useActionState(acao, ESTADO_INICIAL);

  const [nome, setNome] = useState(motorista?.nome ?? nomeInicial ?? "");
  const [telefone, setTelefone] = useState(motorista?.telefone ?? "");
  const [documento, setDocumento] = useState(motorista?.documento ?? "");
  const [veiculoHabitualId, setVeiculoHabitualId] = useState(
    motorista?.veiculo_habitual_id ?? "",
  );

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <span className="px-4 pb-8 text-apoio font-medium text-tinta-apoio-forte">
        Só o nome é obrigatório. O resto você preenche quando precisar.
      </span>

      <span className="px-4 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Identificação
      </span>
      <div className="flex flex-col gap-6">
        <CampoTexto
          rotulo="Nome"
          name="nome"
          placeholder="Como você chama esse motorista"
          value={nome}
          onChange={alterar(setNome)}
          erro={estado.erros?.nome}
        />
        <CampoTexto
          rotulo="Telefone"
          name="telefone"
          type="tel"
          placeholder="Pra mandar a ordem de serviço"
          value={telefone}
          onChange={alterar(setTelefone)}
          erro={estado.erros?.telefone}
        />
        <CampoTexto
          rotulo="Documento"
          name="documento"
          placeholder="CPF"
          value={documento}
          onChange={alterar(setDocumento)}
          erro={estado.erros?.documento}
        />
      </div>

      <span className="px-4 pt-14 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Caminhão habitual
      </span>
      {caminhoes.length > 0 ? (
        <div role="radiogroup" aria-label="Caminhão habitual" className="flex flex-wrap gap-8 px-4">
          <input type="hidden" name="veiculoHabitualId" value={veiculoHabitualId} />
          {caminhoes.map((caminhao) => {
            const arquivado = caminhao.arquivado_em !== null;
            return (
              <ChipEscolha
                key={caminhao.id}
                selecionado={veiculoHabitualId === caminhao.id}
                onClick={() =>
                  setVeiculoHabitualId((atual) => (atual === caminhao.id ? "" : caminhao.id))
                }
              >
                {nomeCaminhao(caminhao)}
                {arquivado ? " (arquivado)" : ""}
              </ChipEscolha>
            );
          })}
        </div>
      ) : (
        <span className="px-4 text-apoio font-medium text-tinta-apoio">
          Cadastre um caminhão para vincular aqui.
        </span>
      )}
      {estado.erros?.veiculoHabitualId ? (
        <span className="px-4 text-apoio font-medium text-vencido">
          {estado.erros.veiculoHabitualId}
        </span>
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
        disabled={nome.trim().length === 0}
        className="mt-16"
      >
        {ehEdicao ? "Salvar alterações" : "Salvar motorista"}
      </Botao>

      {ehEdicao ? <BotaoArquivarMotorista id={motorista.id} /> : null}
    </form>
  );
}
