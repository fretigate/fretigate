"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { PedidoDeRecuperacao } from "@/components/auth/PedidoDeRecuperacao";
import { authClient } from "@/lib/auth/cliente";
import { mensagemDeTrava } from "@/lib/utils/mensagem-trava";

type Props = {
  codigo: string | null;
  valido: boolean;
  /** Só quando o servidor conseguiu achar a quem o código pertencia — ver
   * `src/lib/servicos/redefinicao-de-senha.ts`. Nunca vem da URL. */
  email: string | null;
};

/**
 * As duas telas do Design — "Redefinir senha" (link válido) e "Redefinir
 * senha — link expirado" — como dois estados de um componente só.
 *
 * `expirou` cobre também a corrida rara em que o código era válido no
 * carregamento da página mas venceu (ou foi usado em outra aba) antes do
 * envio — o mesmo estado dos dois casos, porque a saída é a mesma.
 */
export function TelaRedefinirSenha({ codigo, valido, email }: Props) {
  const router = useRouter();

  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | undefined>();
  const [expirou, setExpirou] = useState(!valido);
  /**
   * `CampoTexto` guarda "mostrar senha" no próprio state interno, sem
   * resetar sozinho quando o formulário ao redor re-renderiza — uma senha
   * revelada continuaria revelada depois de um erro. Trocar a `key` força o
   * React a remontar só o campo (o valor digitado não se perde, porque vem
   * do `value` controlado por este formulário). Achado do fundador,
   * 12/08/2026.
   */
  const [tentativas, setTentativas] = useState(0);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (carregando || !codigo) return;

    setCarregando(true);
    setErroGeral(undefined);

    let retryAfter: string | null = null;
    const { error } = await authClient.resetPassword(
      { newPassword: senha, token: codigo },
      {
        onResponse(contexto) {
          retryAfter = contexto.response.headers.get("X-Retry-After");
        },
      },
    );

    if (!error) {
      // Fecha o ciclo: já entra com a senha nova. Se o login automático
      // falhar por qualquer motivo, a senha já foi trocada — só falta
      // digitar, então cai em Entrar em vez de travar em algum lugar.
      if (email) {
        const { error: erroLogin } = await authClient.signIn.email({
          email,
          password: senha,
        });
        if (!erroLogin) {
          router.push("/");
          return;
        }
      }
      router.push("/entrar");
      return;
    }

    setCarregando(false);
    setTentativas((t) => t + 1);
    if (error.status === 429) {
      setErroGeral(mensagemDeTrava(retryAfter));
    } else if (error.code === "INVALID_TOKEN") {
      setExpirou(true);
    } else if (error.code === "PASSWORD_TOO_SHORT") {
      // docs/especificacao.md § "Senha mínima": 6, não o padrão da
      // biblioteca — fixo aqui pelo mesmo motivo do valor em auth/index.ts.
      setErroGeral("A senha precisa de pelo menos 6 caracteres.");
    } else if (error.code === "PASSWORD_TOO_LONG") {
      setErroGeral("A senha pode ter no máximo 128 caracteres.");
    } else {
      setErroGeral("Não deu para redefinir agora. Tenta de novo em instantes.");
    }
  }

  if (expirou) {
    return (
      <div className="mt-24 flex flex-col gap-16">
        {/* docs/componentes.md, "Redefinir senha — link expirado": bloco de
            corpo sobre #F6E6DD. O texto do e-mail e desta tela precisam
            concordar na duração — 2 horas é a regra de produto (tarefa 7,
            docs/especificacao.md § "O link de recuperação"), não algo que
            docs/componentes.md decide. */}
        <div className="rounded-campo bg-vencido-fundo px-16 py-16">
          <p className="text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-vencido-apoio">
            {email
              ? "Esse link já venceu — ele vale só por 2 horas. Sua conta e seus fretes continuam intactos, é só pedir um link novo."
              : "Esse link já venceu ou não é válido. Sua conta e seus fretes continuam intactos — peça um novo link para redefinir a senha."}
          </p>
        </div>
        {email ? (
          <PedidoDeRecuperacao emailConhecido={email} />
        ) : (
          <div className="flex gap-10">
            <div className="flex-1">
              <Botao variante="secundaria" href="/esqueci-a-senha">
                Pedir um novo link
              </Botao>
            </div>
            <div className="flex-1">
              <Botao variante="secundaria" href="/entrar">
                Voltar pra entrada
              </Botao>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-24 flex flex-col gap-16">
      <CampoTexto
        key={tentativas}
        rotulo="Senha nova"
        name="senha"
        type="password"
        autoComplete="new-password"
        revelavel
        value={senha}
        onChange={(evento: ChangeEvent<HTMLInputElement>) => setSenha(evento.target.value)}
      />

      {erroGeral ? (
        <span className="text-apoio font-medium text-vencido">{erroGeral}</span>
      ) : null}

      {/* docs/componentes.md, "Redefinir senha — link válido": sem voltar e
          sem secundária — quem chegou pelo link não tem tela anterior. */}
      <Botao variante="principal" type="submit" carregando={carregando}>
        Salvar senha e entrar
      </Botao>
    </form>
  );
}
