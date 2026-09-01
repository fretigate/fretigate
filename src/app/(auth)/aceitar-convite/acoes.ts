"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { aceitarConvite } from "@/lib/servicos/usuarios";
import { travaDeAceiteDeConvite } from "@/lib/servicos/trava-de-convite";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";
import { MENSAGEM_CONVITE_INDISPONIVEL } from "@/lib/utils/convite";

export type EstadoAceitarConvite = {
  erroGeral?: string;
};

const schema = z.object({
  token: z.string().trim().min(1),
  email: z.string().trim(),
  senha: z.string(),
});

/**
 * `(auth)/aceitar-convite` — item 10, Tarefa 4.
 *
 * ⛔ EXCEÇÃO DECLARADA ao envelope `comoUsuario`/`comoDono`
 * (`tests/protecao-de-acoes.test.ts`): não existe sessão nesse instante —
 * mesmo motivo de `criarConta` (`src/lib/servicos/cadastro.ts`).
 *
 * **`FormData` validado por `zod`, achado do segundo `/revisar`** — as
 * outras ações desta tarefa já ganharam schema no primeiro passe; esta,
 * pública e mais exposta que as outras (qualquer um bate nela, sem
 * sessão), tinha ficado de fora. `email`/`senha` continuam sendo
 * validados de verdade dentro de `aceitarConvite` (formato, tamanho) —
 * o schema aqui só garante que os três campos são string, antes de
 * qualquer coisa tocar o serviço.
 *
 * **As duas mensagens do serviço que significam "convite morto" viram a
 * mesma mensagem genérica aqui** ("Convite inválido." / "Este convite já
 * foi usado ou cancelado.", `aceitarConvite` em `usuarios.ts`) — mesma
 * unificação que a tela pública já aplica no carregamento (`page.tsx`), só
 * que aqui cobre a corrida rara em que o convite muda de estado ENTRE a
 * página carregar e o formulário ser enviado. Erro de e-mail/senha
 * continua específico — é sobre o que a pessoa digitou agora, não sobre o
 * convite.
 *
 * **Manda e-mail de verificação, melhor esforço — achado do segundo
 * `/revisar`.** A primeira versão esqueceu este passo, que `criarConta`
 * sempre faz: sem ele, o operador criado aqui nasce com `emailVerified:
 * false` para sempre, e a dashboard (`(app)/page.tsx`) mostra "Confirme seu
 * e-mail / Pode ter caído na caixa de spam" sobre um e-mail que nunca foi
 * mandado — afirmando um envio que não aconteceu (`CLAUDE.md` §2). A conta
 * já existe mesmo que este envio falhe (§4.12: e-mail não confirmado não
 * impede entrar) — por isso `catch` sem interromper o fluxo, mesmo padrão
 * de `cadastro.ts`.
 */
export async function aceitarConviteAction(
  _estadoAnterior: EstadoAceitarConvite,
  formData: FormData,
): Promise<EstadoAceitarConvite> {
  const trava = await travaDeAceiteDeConvite();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return { erroGeral: `Muitas tentativas por aqui. Tenta de novo às ${horario}.` };
  }

  const validado = schema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!validado.success || !validado.data.token) {
    return { erroGeral: MENSAGEM_CONVITE_INDISPONIVEL };
  }
  const { token, email, senha } = validado.data;

  let resultado;
  try {
    resultado = await aceitarConvite(token, { email, senha });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não deu para criar sua conta agora.";
    const conviteMorto =
      mensagem === "Convite inválido." || mensagem === "Este convite já foi usado ou cancelado.";
    return { erroGeral: conviteMorto ? MENSAGEM_CONVITE_INDISPONIVEL : mensagem };
  }

  await auth.api.sendVerificationEmail({ body: { email: resultado.email } }).catch((erroEmail) => {
    console.error(
      "[aceitar-convite] falha ao mandar e-mail de verificacao",
      resultado.usuarioId,
      erroEmail instanceof Error ? erroEmail.name : "erro desconhecido",
    );
  });

  try {
    await auth.api.signInEmail({ body: { email: resultado.email, password: senha } });
  } catch (erroLogin) {
    console.error(
      "[aceitar-convite] conta criada mas login automatico falhou",
      resultado.usuarioId,
      erroLogin instanceof Error ? erroLogin.name : "erro desconhecido",
    );
    redirect("/entrar");
  }

  redirect("/");
}
