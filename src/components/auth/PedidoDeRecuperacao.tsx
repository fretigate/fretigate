"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { authClient } from "@/lib/auth/cliente";
import { mensagemDeTrava } from "@/lib/utils/mensagem-trava";

type Props = {
  /**
   * Quando o e-mail já é conhecido pelo servidor (a tela de link vencido em
   * `/redefinir-senha`, quando dá para achar a quem o código pertencia), o
   * campo começa escondido e o primeiro envio é de um toque só — nunca
   * redigitar. A pílula "Usar outro e-mail" ainda deixa trocar depois.
   */
  emailConhecido?: string;
};

/**
 * O pedido do link de recuperação e a confirmação de que foi mandado —
 * exportação do Design de 07/08/2026 (tarefa 8, fatia 2): telas "Esqueci a
 * senha" e "Recuperação enviada" em `docs/navegacao.md`/`docs/componentes.md`.
 * Duas telas usam este mesmo mecanismo (`/esqueci-a-senha` e o link vencido
 * de `/redefinir-senha`), só mudando se o e-mail precisa ser digitado.
 *
 * O botão é sempre **"Mandar link novo"** — mesmo no primeiro envio.
 * Decisão do fundador, 07/08/2026: mecanismo diferente (e-mail já
 * conhecido ou não) não é ação diferente, e a regra é "uma ação, um nome".
 */
export function PedidoDeRecuperacao({ emailConhecido }: Props) {
  const [email, setEmail] = useState(emailConhecido ?? "");
  const [emailBloqueado, setEmailBloqueado] = useState(Boolean(emailConhecido));
  const [carregando, setCarregando] = useState(false);
  const [erroEmail, setErroEmail] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | undefined>();
  const [enviado, setEnviado] = useState(false);

  async function enviar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault();
    if (carregando) return;

    setCarregando(true);
    setErroEmail(undefined);
    setErroGeral(undefined);

    let retryAfter: string | null = null;
    let error: Awaited<ReturnType<typeof authClient.requestPasswordReset>>["error"];
    try {
      ({ error } = await authClient.requestPasswordReset(
        { email },
        {
          onResponse(contexto) {
            retryAfter = contexto.response.headers.get("X-Retry-After");
          },
        },
      ));
    } catch {
      // `authClient` não tem `catchAllError` (`src/lib/auth/cliente.ts`) —
      // uma falha de rede de verdade lança em vez de devolver `{error}`.
      // Sem este `catch`, isso travava o botão girando pra sempre, sem
      // mensagem nenhuma. Mesma correção de `FormularioEntrar.tsx` e
      // `TelaRedefinirSenha.tsx`, 12/08/2026.
      setCarregando(false);
      setErroGeral("Sem conexão com o servidor. Confere sua internet e tenta de novo.");
      return;
    }

    setCarregando(false);

    if (error) {
      if (error.status === 429) {
        setErroGeral(mensagemDeTrava(retryAfter));
      } else if (error.code === "INVALID_EMAIL") {
        // Erro de campo vai abaixo do PRÓPRIO campo, no lugar do texto de
        // apoio — nunca solto embaixo do botão.
        setErroEmail("E-mail inválido.");
      } else if (error.code === "INVALID_ORIGIN") {
        // Achado do fundador, 12/08/2026 — ver o mesmo caso em
        // `FormularioEntrar.tsx`. Texto continua genérico de propósito.
        console.error(
          "[auth] pedido de recuperação recusado: origem não confiável (INVALID_ORIGIN) — conferir NEXT_PUBLIC_APP_URL/trustedOrigins",
        );
        setErroGeral("Não deu para mandar o link agora. Tenta de novo em instantes.");
      } else {
        setErroGeral("Não deu para mandar o link agora. Tenta de novo em instantes.");
      }
      return;
    }

    setEnviado(true);
  }

  function usarOutroEmail() {
    setEnviado(false);
    setEmailBloqueado(false);
    setErroEmail(undefined);
    setErroGeral(undefined);
  }

  if (enviado) {
    return (
      <div className="mt-24 flex flex-col gap-16">
        {/* docs/componentes.md, "Corpo de texto fora de sessão". */}
        <p className="text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-tinta-apoio-forte">
          Mandamos um link para {email}. Abra o e-mail e toque nele para escolher uma senha
          nova.
        </p>
        {/* docs/especificacao.md § "Confira a caixa de spam": domínio novo,
            sem histórico de envio — cai em spam com frequência. */}
        <p className="text-apoio leading-[1.4] text-tinta-apoio">
          Não achou? Confira a caixa de spam.
        </p>

        {erroGeral ? (
          <span className="text-apoio font-medium text-vencido">{erroGeral}</span>
        ) : null}

        <Botao
          variante="principal"
          type="button"
          carregando={carregando}
          onClick={() => enviar()}
        >
          Mandar link novo
        </Botao>
        <PilulaEmLinha onClick={usarOutroEmail} className="self-start">
          Usar outro e-mail
        </PilulaEmLinha>
        <Botao variante="secundaria" href="/entrar">
          Voltar pra entrada
        </Botao>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-24 flex flex-col gap-16">
      {emailBloqueado ? null : (
        <CampoTexto
          rotulo="E-mail da conta"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento: ChangeEvent<HTMLInputElement>) => setEmail(evento.target.value)}
          erro={erroEmail}
        />
      )}

      {erroGeral ? (
        <span className="text-apoio font-medium text-vencido">{erroGeral}</span>
      ) : null}

      <Botao variante="principal" type="submit" carregando={carregando}>
        Mandar link novo
      </Botao>
      <Botao variante="secundaria" href="/entrar">
        Voltar pra entrada
      </Botao>
    </form>
  );
}
