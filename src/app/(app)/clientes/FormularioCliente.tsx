"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { BotaoArquivarCliente } from "./BotaoArquivarCliente";
import { criarClienteAction, editarClienteAction, type EstadoCliente } from "./acoes";

const ESTADO_INICIAL: EstadoCliente = {};

/**
 * Cadastro / edição de cliente — um formulário só para os dois casos
 * (`docs/navegacao.md` linha 40), montado com os campos do §6 da
 * especificação. `docs/componentes.md` § "Auditoria da regra de posição":
 * salvar no fim do conteúdo rolável, arquivar em texto abaixo dele.
 *
 * Ordem dos campos — Nome, **Telefone**, Documento, E-mail, Endereço:
 * `docs/navegacao.md`, "Dados que hoje não têm onde ser preenchidos": "Telefone
 * do cliente ... entra no cadastro, **segundo campo, antes até do documento**".
 *
 * Sem campo de Observação: existe na entidade (`docs/especificacao.md` §6),
 * mas nenhum desenho desta tela o inclui — nem o protótipo de referência. Ver
 * o mesmo precedente do ano do caminhão e da categoria da CNH em
 * `docs/especificacao.md` §9: campo que só existe na entidade é peso morto
 * até um desenho pedir por ele.
 *
 * Todo campo é controlado, mesma razão de `FormularioCriarConta`: o que a
 * pessoa já digitou continua ali depois de um erro do servidor.
 */

type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  prazo_pagamento_dias: number | null;
};

type Props = {
  cliente?: Cliente;
  prazoPadraoEmpresa: number;
  nomeInicial?: string;
};

export function FormularioCliente({ cliente, prazoPadraoEmpresa, nomeInicial }: Props) {
  const ehEdicao = cliente !== undefined;
  const acao = ehEdicao ? editarClienteAction.bind(null, cliente.id) : criarClienteAction;
  const [estado, formAction, pending] = useActionState(acao, ESTADO_INICIAL);

  const [nome, setNome] = useState(cliente?.nome ?? nomeInicial ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [documento, setDocumento] = useState(cliente?.documento ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [endereco, setEndereco] = useState(cliente?.endereco ?? "");
  const [prazoPagamentoDias, setPrazoPagamentoDias] = useState(
    cliente?.prazo_pagamento_dias != null ? String(cliente.prazo_pagamento_dias) : "",
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
          placeholder="Como você chama esse cliente"
          value={nome}
          onChange={alterar(setNome)}
          erro={estado.erros?.nome}
        />
        <CampoTexto
          rotulo="Telefone"
          name="telefone"
          type="tel"
          placeholder="Pra abrir o WhatsApp da cobrança"
          value={telefone}
          onChange={alterar(setTelefone)}
          erro={estado.erros?.telefone}
        />
        <CampoTexto
          rotulo="Documento"
          name="documento"
          placeholder="CNPJ ou CPF"
          value={documento}
          onChange={alterar(setDocumento)}
          erro={estado.erros?.documento}
        />
        <CampoTexto
          rotulo="E-mail"
          name="email"
          type="email"
          placeholder="Se ele pedir nota por e-mail"
          value={email}
          onChange={alterar(setEmail)}
          erro={estado.erros?.email}
        />
        <CampoTexto
          rotulo="Endereço"
          name="endereco"
          placeholder="Cidade, ou o ponto onde você costuma ir"
          value={endereco}
          onChange={alterar(setEndereco)}
          erro={estado.erros?.endereco}
        />
      </div>

      <span className="px-4 pt-14 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Condição comercial
      </span>
      <CampoTexto
        rotulo="Prazo de pagamento (dias)"
        name="prazoPagamentoDias"
        inputMode="numeric"
        placeholder={`${prazoPadraoEmpresa} (padrão da empresa)`}
        value={prazoPagamentoDias}
        onChange={alterar(setPrazoPagamentoDias)}
        erro={estado.erros?.prazoPagamentoDias}
      />
      <span className="px-4 -mt-2 text-apoio font-medium text-tinta-apoio">
        Usado para calcular o vencimento quando você fatura este cliente. Vazio
        usa o padrão da empresa ({prazoPadraoEmpresa} dias).
      </span>

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
        {ehEdicao ? "Salvar alterações" : "Salvar cliente"}
      </Botao>

      {ehEdicao ? <BotaoArquivarCliente id={cliente.id} /> : null}
    </form>
  );
}
