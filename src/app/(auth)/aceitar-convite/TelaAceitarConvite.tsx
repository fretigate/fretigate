"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { iniciais } from "@/lib/utils/iniciais";
import { aceitarConviteAction, type EstadoAceitarConvite } from "./acoes";

const ESTADO_INICIAL: EstadoAceitarConvite = {};

/**
 * Formulário de "Aceitar convite" (item 10, Tarefa 4). `docs/componentes.md`:
 * "principal Entrar na conta · texto neutra Não conheço essa empresa".
 *
 * **Bloco de identidade + campo de e-mail — sem lastro em nenhum documento
 * (`docs/componentes.md`/`docs/navegacao.md` descrevem a tela sem eles)** —
 * mesma categoria de pendência-do-Design já registrada nas tarefas
 * anteriores deste item. O e-mail entra porque `aceitarConvite`
 * (`src/lib/servicos/usuarios.ts`) passou a exigi-lo desde a Tarefa 1: o
 * convite guarda só telefone, e é a própria pessoa quem digita o e-mail da
 * conta dela aqui, junto da senha.
 *
 * Todo campo é controlado, mesmo motivo de `FormularioCriarConta.tsx`: o
 * React reseta `<input>` não controlado depois que o Server Action termina
 * com erro, e a regra do produto é "o que já foi digitado continua ali".
 */
export function TelaAceitarConvite({
  token,
  nomeConvidado,
  nomeEmpresa,
  urlLogo,
}: {
  token: string;
  nomeConvidado: string;
  nomeEmpresa: string;
  urlLogo: string | null;
}) {
  const [estado, formAction, pending] = useActionState(aceitarConviteAction, ESTADO_INICIAL);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [tentativas, setTentativas] = useState(0);
  const pendingAnterior = useRef(pending);
  useEffect(() => {
    if (pendingAnterior.current && !pending && estado.erroGeral) {
      setTentativas((t) => t + 1);
    }
    pendingAnterior.current = pending;
  }, [pending, estado]);

  return (
    <>
      <div className="mt-40 flex flex-col items-center gap-14 text-center">
        {urlLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlLogo}
            alt=""
            className="h-56 w-56 flex-none rounded-pilula bg-separacao object-cover"
          />
        ) : (
          <div className="flex h-56 w-56 flex-none items-center justify-center rounded-pilula bg-acao text-[16px] font-bold tracking-[.02em] text-white">
            {iniciais(nomeEmpresa)}
          </div>
        )}
        <h1
          className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          {nomeEmpresa} te convidou
        </h1>
        <p className="text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-tinta-apoio-forte">
          Oi, {nomeConvidado}. Crie sua senha para lançar e ver os fretes da {nomeEmpresa} no
          FretiGate.
        </p>
      </div>

      <form action={formAction} className="mt-24 flex flex-col gap-16">
        <input type="hidden" name="token" value={token} />
        <CampoTexto
          rotulo="E-mail da conta"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento: ChangeEvent<HTMLInputElement>) => setEmail(evento.target.value)}
        />
        <CampoTexto
          key={tentativas}
          rotulo="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          revelavel
          value={senha}
          onChange={(evento: ChangeEvent<HTMLInputElement>) => setSenha(evento.target.value)}
        />

        {estado.erroGeral ? (
          <span className="text-apoio font-medium text-vencido">{estado.erroGeral}</span>
        ) : null}

        <Botao variante="principal" type="submit" carregando={pending}>
          Entrar na conta
        </Botao>
        <Botao variante="texto" href="/entrar">
          Não conheço essa empresa
        </Botao>
      </form>
    </>
  );
}
