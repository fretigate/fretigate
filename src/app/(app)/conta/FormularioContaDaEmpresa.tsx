"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { atualizarContaDaEmpresaAction, type EstadoContaDaEmpresa } from "./acoes";

const ESTADO_INICIAL: EstadoContaDaEmpresa = {};

/**
 * "Salvar dados" — Conta da empresa (item 10, Tarefa 2). Mesmo padrão de
 * `FormularioCliente.tsx`: todo campo é controlado, para o que já foi
 * digitado sobreviver a um erro do servidor.
 *
 * Só razão social, CNPJ, endereço, telefone, e-mail e chave Pix —
 * `docs/especificacao.md` §4.9. `dados_bancarios` fica fora (decisão 3 do
 * plano: sem consumidor hoje, lacuna em `CLAUDE.md` §14).
 */

type Empresa = {
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  chave_pix: string | null;
};

type Props = { empresa: Empresa };

export function FormularioContaDaEmpresa({ empresa }: Props) {
  const [estado, formAction, pending] = useActionState(atualizarContaDaEmpresaAction, ESTADO_INICIAL);

  const [razaoSocial, setRazaoSocial] = useState(empresa.razao_social ?? "");
  const [cnpj, setCnpj] = useState(empresa.cnpj ?? "");
  const [endereco, setEndereco] = useState(empresa.endereco ?? "");
  const [telefone, setTelefone] = useState(empresa.telefone ?? "");
  const [email, setEmail] = useState(empresa.email ?? "");
  const [chavePix, setChavePix] = useState(empresa.chave_pix ?? "");

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <CampoTexto
        rotulo="Razão social"
        name="razaoSocial"
        placeholder="Nome que sai nos documentos"
        value={razaoSocial}
        onChange={alterar(setRazaoSocial)}
        erro={estado.erros?.razaoSocial}
      />
      <CampoTexto
        rotulo="CNPJ"
        name="cnpj"
        placeholder="Só números"
        value={cnpj}
        onChange={alterar(setCnpj)}
        erro={estado.erros?.cnpj}
      />
      <CampoTexto
        rotulo="Endereço"
        name="endereco"
        placeholder="Endereço da empresa"
        value={endereco}
        onChange={alterar(setEndereco)}
        erro={estado.erros?.endereco}
      />
      <CampoTexto
        rotulo="Telefone"
        name="telefone"
        type="tel"
        placeholder="Contato da empresa"
        value={telefone}
        onChange={alterar(setTelefone)}
        erro={estado.erros?.telefone}
      />
      <CampoTexto
        rotulo="E-mail"
        name="email"
        type="email"
        placeholder="E-mail de contato"
        value={email}
        onChange={alterar(setEmail)}
        erro={estado.erros?.email}
      />
      <CampoTexto
        rotulo="Chave Pix"
        name="chavePix"
        placeholder="CPF, CNPJ, e-mail, telefone ou aleatória"
        value={chavePix}
        onChange={alterar(setChavePix)}
        erro={estado.erros?.chavePix}
      />

      {estado.erroGeral ? (
        <span className="px-4 pt-8 text-apoio font-medium text-vencido">{estado.erroGeral}</span>
      ) : null}

      <Botao variante="principal" type="submit" carregando={pending} className="mt-16">
        Salvar dados
      </Botao>
    </form>
  );
}
