"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { ChipEscolha } from "@/components/ui/ChipEscolha";
import { criarConta, type EstadoCadastro } from "@/lib/servicos/cadastro";
import { OPCOES_ORIGEM, OUTRO_ORIGEM as OUTRO } from "@/lib/servicos/cadastro-opcoes";

const ESTADO_INICIAL: EstadoCadastro = {};

/**
 * Todo campo é controlado, de propósito: por padrão o React reseta os
 * `<input>` não controlados de um formulário depois que o Server Action
 * termina (mesmo com erro) — e a regra combinada com o fundador é o
 * contrário: "o que você já preencheu continua aqui" depois de um erro.
 */
export function FormularioCriarConta() {
  const [estado, formAction, pending] = useActionState(criarConta, ESTADO_INICIAL);

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [seuNome, setSeuNome] = useState("");
  const [seuTelefone, setSeuTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [origemOutro, setOrigemOutro] = useState("");

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  return (
    <form action={formAction} className="mt-24 flex flex-col gap-16">
      {/* docs/especificacao.md §4.12: NOME DA EMPRESA · E-MAIL · SENHA · SEU
          NOME · SEU TELEFONE, nessa ordem. */}
      <CampoTexto
        rotulo="Nome da empresa"
        name="nomeEmpresa"
        autoComplete="organization"
        value={nomeEmpresa}
        onChange={alterar(setNomeEmpresa)}
        erro={estado.erros?.nomeEmpresa}
      />
      <CampoTexto
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={alterar(setEmail)}
        erro={estado.erros?.email}
      />
      <CampoTexto
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={alterar(setSenha)}
        erro={estado.erros?.senha}
      />
      <CampoTexto
        rotulo="Seu nome"
        name="seuNome"
        autoComplete="name"
        value={seuNome}
        onChange={alterar(setSeuNome)}
        erro={estado.erros?.seuNome}
      />
      <CampoTexto
        rotulo="Seu telefone"
        name="seuTelefone"
        type="tel"
        autoComplete="tel"
        value={seuTelefone}
        onChange={alterar(setSeuTelefone)}
        erro={estado.erros?.seuTelefone}
      />

      <div className="flex flex-col gap-[10px]">
        <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Como você conheceu o FretiGate?
        </span>
        <input type="hidden" name="origem" value={origem} />
        <div className="flex flex-wrap gap-[8px]">
          {OPCOES_ORIGEM.map((opcao) => (
            <ChipEscolha
              key={opcao}
              selecionado={origem === opcao}
              onClick={() => setOrigem(opcao)}
            >
              {opcao}
            </ChipEscolha>
          ))}
          <ChipEscolha
            selecionado={origem === OUTRO}
            onClick={() => setOrigem(OUTRO)}
          >
            {OUTRO}
          </ChipEscolha>
        </div>
        {estado.erros?.origem ? (
          <span className="text-apoio font-medium text-vencido">{estado.erros.origem}</span>
        ) : null}
        {origem === OUTRO ? (
          <CampoTexto
            name="origemOutro"
            placeholder="Onde foi?"
            value={origemOutro}
            onChange={alterar(setOrigemOutro)}
            erro={estado.erros?.origemOutro}
          />
        ) : null}
      </div>

      {estado.erroGeral ? (
        <span className="text-apoio font-medium text-vencido">{estado.erroGeral}</span>
      ) : null}

      {/* Sem caixa de marcação, de propósito (decidido em 07/08/2026, depois
          do /auditar-tela): o checkbox não estava em nenhum documento e seu
          alvo de toque (16px) furava o mínimo de 48px do CLAUDE.md §8.
          Aceite passa a ser texto, no momento mais frágil do fluxo — clicar
          em "Criar conta" é o aceite. `termos_aceitos_em`/`termos_versao`
          continuam gravados no cadastro, sem depender de nenhuma marcação.

          Os links abaixo são a exceção do §8 para link em frase corrida —
          três condições:
          1. sublinhado;
          2. entrelinha ampliada — `leading-[1.7]` é maior que o `1.4` do
             token `text-apoio`, mas não existe um valor "ampliado" formal
             em `docs/estilo.md` ainda; registrado como lacuna, igual à
             margem inferior desta mesma tela;
          3. o mesmo documento também alcançável pelos Ajustes — ainda não
             tem onde acontecer (nem Termos nem Ajustes existem como tela —
             próximas fatias); parte da mesma pendência de `/termos` levar a
             404 hoje. */}
      <p className="text-apoio leading-[1.7] text-tinta-apoio">
        Ao criar conta, você aceita os{" "}
        <Link href="/termos" className="font-semibold text-acao underline">
          Termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/termos" className="font-semibold text-acao underline">
          Política de privacidade
        </Link>
        .
      </p>

      <Botao variante="principal" type="submit" carregando={pending}>
        Criar conta
      </Botao>
      <Botao variante="secundaria" href="/entrar">
        Já tenho conta
      </Botao>
    </form>
  );
}
