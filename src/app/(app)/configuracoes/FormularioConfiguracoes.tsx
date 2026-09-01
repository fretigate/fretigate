"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { atualizarConfiguracoesAction, type EstadoConfiguracoes } from "./acoes";

const ESTADO_INICIAL: EstadoConfiguracoes = {};

/**
 * "Salvar" — Configurações (item 10, Tarefa 3). Mesmo padrão de
 * `FormularioContaDaEmpresa.tsx`: todo campo é controlado, para o que já
 * foi digitado sobreviver a um erro do servidor.
 */

type Configuracoes = {
  patioEndereco: string | null;
  prazoPadraoDias: number;
  proximoNumeroRelatorio: number;
};

type Props = { configuracoes: Configuracoes };

export function FormularioConfiguracoes({ configuracoes }: Props) {
  const [estado, formAction, pending] = useActionState(atualizarConfiguracoesAction, ESTADO_INICIAL);

  const [patioEndereco, setPatioEndereco] = useState(configuracoes.patioEndereco ?? "");
  const [prazoPadraoDias, setPrazoPadraoDias] = useState(String(configuracoes.prazoPadraoDias));
  const [proximoNumeroRelatorio, setProximoNumeroRelatorio] = useState(
    String(configuracoes.proximoNumeroRelatorio),
  );

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <span className="px-4 pb-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Operação
      </span>

      <CampoTexto
        rotulo="Endereço do pátio"
        name="patioEndereco"
        placeholder="De onde a frota sai"
        value={patioEndereco}
        onChange={alterar(setPatioEndereco)}
        erro={estado.erros?.patioEndereco}
      />
      <span className="px-4 -mt-2 text-apoio font-medium text-tinta-apoio">
        Pré-preenche a origem ao lançar frete, quando não há um frete
        anterior com origem preenchida.
      </span>

      <CampoTexto
        rotulo="Prazo padrão de vencimento (dias)"
        name="prazoPadraoDias"
        type="number"
        inputMode="numeric"
        placeholder="0 a 90 — 0 é à vista"
        value={prazoPadraoDias}
        onChange={alterar(setPrazoPadraoDias)}
        erro={estado.erros?.prazoPadraoDias}
      />
      <span className="px-4 -mt-2 text-apoio font-medium text-tinta-apoio">
        Vale para todo cliente sem prazo próprio — muda o vencimento das
        cobranças futuras deles, não só das novas a partir de hoje.
      </span>

      <CampoTexto
        rotulo="Próximo relatório será Nº"
        name="proximoNumeroRelatorio"
        type="number"
        inputMode="numeric"
        value={proximoNumeroRelatorio}
        onChange={alterar(setProximoNumeroRelatorio)}
        erro={estado.erros?.proximoNumeroRelatorio}
      />
      <span className="px-4 -mt-2 text-apoio font-medium text-tinta-apoio">
        Não pode ser menor que o número já usado.
      </span>

      {estado.erroGeral ? (
        <span className="px-4 pt-8 text-apoio font-medium text-vencido">{estado.erroGeral}</span>
      ) : null}

      <Botao variante="principal" type="submit" carregando={pending} className="mt-16">
        Salvar configurações
      </Botao>
    </form>
  );
}
