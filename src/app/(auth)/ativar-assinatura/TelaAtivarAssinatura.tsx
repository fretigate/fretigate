"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { ativarAssinaturaAction, type EstadoAtivarAssinatura } from "./acoes";

const ESTADO_INICIAL: EstadoAtivarAssinatura = {};

/**
 * Formulário de "Ativar assinatura" (item 13, Tarefa 1). **Sem lastro em
 * documento do Design** — esta tela não estava desenhada antes deste item;
 * layout e texto seguem o mesmo padrão de `TelaAceitarConvite.tsx` (o
 * parente mais próximo: também é conta nascendo de um link público, fora
 * de sessão), registrado como pedido de confirmação ao Design, não como
 * decisão fechada.
 *
 * **Confirmação de compra (caso 3 do plano): e-mail parcial + data, nunca
 * nome completo nem documento** — achado do fundador ao aprovar o plano:
 * nome e CPF numa tela pública alcançável só por token exporiam dado de
 * quem pagou para quem só tem o link. Não impede um link vazado por
 * criptografia — dá à pessoa certa um jeito de perceber, antes de
 * preencher senha, que a compra é dela.
 */
export function TelaAtivarAssinatura({
  token,
  emailParcial,
  data,
}: {
  token: string;
  emailParcial: string;
  data: Date;
}) {
  const [estado, formAction, pending] = useActionState(ativarAssinaturaAction, ESTADO_INICIAL);

  const [nomeEmpresa, setNomeEmpresa] = useState("");
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

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(data);

  return (
    <>
      <div className="mt-40 flex flex-col items-center gap-14 text-center">
        <h1
          className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Pagamento aprovado
        </h1>
        <p className="text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-tinta-apoio-forte">
          Compra de {emailParcial}, em {dataFormatada}. Crie sua conta para começar a usar o
          FretiGate.
        </p>
      </div>

      <form action={formAction} className="mt-24 flex flex-col gap-16">
        <input type="hidden" name="token" value={token} />
        <CampoTexto
          rotulo="Nome da empresa"
          name="nomeEmpresa"
          autoComplete="organization"
          value={nomeEmpresa}
          onChange={(evento: ChangeEvent<HTMLInputElement>) => setNomeEmpresa(evento.target.value)}
        />
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

        {/* Mesmo texto/mecanismo de FormularioCriarConta.tsx — achado do
            /revisar: criarEmpresaEDono grava termos_aceitos_em/termos_versao
            para toda empresa nova, Fluxo B incluído; sem este parágrafo a
            tela criava conta sem pedir o aceite que o banco registra como
            já dado. */}
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
      </form>
    </>
  );
}
