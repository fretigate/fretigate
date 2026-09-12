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
 * **Fundido com o antigo `FormularioConfiguracoes.tsx` em 12/09/2026**
 * (`docs/planos/fusao-configuracoes-e-conta-da-empresa.md`) — um formulário
 * só, com dois blocos visuais (IDENTIDADE e OPERAÇÃO) e um botão só no fim.
 * Antes eram duas telas com dois botões independentes; o fundador apontou que
 * isso deixava salvar metade sem perceber (mexer nos dois blocos, tocar só um
 * botão). Cabeçalho "Identidade" é texto novo, provisório — igual a outros
 * rótulos/ícones já marcados "provisório" neste produto — pendente de
 * confirmação do Design (`docs/planos/fusao-configuracoes-e-conta-da-empresa.md`,
 * "O que vai ao Design").
 *
 * `dados_bancarios` fica fora — `docs/especificacao.md` §4.9 não lista entre
 * os campos desta tela (decisão 3 do plano original: sem consumidor hoje,
 * lacuna em `CLAUDE.md` §14).
 */

type Empresa = {
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  chave_pix: string | null;
  patio_endereco: string | null;
  prazo_padrao_dias: number;
  proximo_numero_relatorio: number;
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
  const [patioEndereco, setPatioEndereco] = useState(empresa.patio_endereco ?? "");
  const [prazoPadraoDias, setPrazoPadraoDias] = useState(String(empresa.prazo_padrao_dias));
  const [proximoNumeroRelatorio, setProximoNumeroRelatorio] = useState(
    String(empresa.proximo_numero_relatorio),
  );

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <span className="px-4 pb-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Identidade
      </span>

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

      <span className="px-4 pb-2 pt-16 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
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
        Pré-preenche a origem ao lançar frete, quando não há um frete anterior
        com origem preenchida.
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
        Salvar dados
      </Botao>
    </form>
  );
}
