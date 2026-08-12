"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { authClient } from "@/lib/auth/cliente";
import { mensagemDeTrava } from "@/lib/utils/mensagem-trava";

/**
 * docs/componentes.md linha 408: E-MAIL · SENHA · principal Entrar (com
 * carregando) · secundária Criar conta · texto neutra Esqueci a senha — que
 * já cumpre o "oferece a recuperação ali mesmo" da trava de tentativas
 * (docs/especificacao.md § Trava de tentativas): ela fica na tela sempre,
 * erro ou não.
 */
export function FormularioEntrar() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | undefined>();
  /**
   * `CampoTexto` guarda "mostrar senha" no próprio state interno, sem
   * resetar sozinho quando o formulário ao redor re-renderiza — uma senha
   * revelada continuaria revelada depois de um erro. Trocar a `key` força o
   * React a remontar só o campo (o valor digitado não se perde, porque vem
   * do `value` controlado por este formulário, não do `CampoTexto`).
   * Achado do fundador, 12/08/2026.
   */
  const [tentativas, setTentativas] = useState(0);

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (carregando) return;

    setCarregando(true);
    setErroGeral(undefined);

    let retryAfter: string | null = null;
    const { error } = await authClient.signIn.email(
      { email, password: senha },
      {
        onResponse(contexto) {
          retryAfter = contexto.response.headers.get("X-Retry-After");
        },
      },
    );

    if (!error) {
      router.push("/");
      return;
    }

    setCarregando(false);
    setTentativas((t) => t + 1);
    if (error.status === 429) {
      setErroGeral(mensagemDeTrava(retryAfter));
    } else if (error.code === "INVALID_EMAIL") {
      setErroGeral("E-mail inválido.");
    } else if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
      setErroGeral("E-mail ou senha incorretos.");
    } else {
      setErroGeral("Não deu para entrar agora. Tenta de novo em instantes.");
    }
  }

  return (
    <form onSubmit={enviar} className="mt-24 flex flex-col gap-16">
      <CampoTexto
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={alterar(setEmail)}
      />
      <CampoTexto
        key={tentativas}
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        revelavel
        value={senha}
        onChange={alterar(setSenha)}
      />

      {erroGeral ? (
        <span className="text-apoio font-medium text-vencido">{erroGeral}</span>
      ) : null}

      <Botao variante="principal" type="submit" carregando={carregando}>
        Entrar
      </Botao>
      <Botao variante="secundaria" href="/criar-conta">
        Criar conta
      </Botao>
      <Botao variante="texto" href="/esqueci-a-senha">
        Esqueci a senha
      </Botao>
    </form>
  );
}
