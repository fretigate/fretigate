"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ativarAssinatura } from "@/lib/servicos/pagamentos";
import { travaDeAtivacaoDeAssinatura } from "@/lib/servicos/trava-de-ativacao";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";
import { MENSAGEM_PAGAMENTO_INDISPONIVEL } from "@/lib/utils/pagamento";

export type EstadoAtivarAssinatura = {
  erroGeral?: string;
};

const schema = z.object({
  token: z.string().trim().min(1),
  nomeEmpresa: z.string().trim(),
  email: z.string().trim(),
  senha: z.string(),
});

/**
 * `(auth)/ativar-assinatura` — item 13, Tarefa 1 (`docs/planos/
 * item-13-assinatura.md`). Mesmo esqueleto de `aceitar-convite/acoes.ts`.
 *
 * ⛔ EXCEÇÃO DECLARADA ao envelope `comoUsuario`/`comoDono`
 * (`tests/protecao-de-acoes.test.ts`): não existe sessão nesse instante —
 * mesmo motivo de `criarConta`/`aceitarConviteAction`.
 *
 * **As duas mensagens do serviço que significam "link morto" viram a
 * mesma mensagem genérica aqui** — mesma unificação que a tela pública já
 * aplica no carregamento (`page.tsx`), cobrindo a corrida rara em que o
 * pagamento muda de estado ENTRE a página carregar e o formulário ser
 * enviado. Erro de nome da empresa/e-mail/senha continua específico — é
 * sobre o que a pessoa digitou agora, não sobre o pagamento.
 *
 * **Manda e-mail de verificação, melhor esforço — corrigido no `/revisar`.**
 * A primeira versão não mandava, achando que competiria com o e-mail de
 * ativação (já recebido, é como a pessoa chegou até aqui) — mas os dois
 * não competem: o de ativação já cumpriu o papel dele antes desta ação
 * rodar. Sem este envio, `criarUsuario` (por dentro de `criarEmpresaEDono`)
 * cria com `emailVerified: false` para sempre, e a dashboard mostraria
 * "Confirme seu e-mail / Pode ter caído na caixa de spam" sobre um envio
 * que nunca aconteceu — o mesmo defeito já corrigido uma vez em
 * `aceitarConviteAction` (`CLAUDE.md` §2, "afirmando um envio que não
 * aconteceu"). A conta já existe mesmo que este envio falhe (§4.12: e-mail
 * não confirmado não impede entrar) — por isso `catch` sem interromper o
 * fluxo, mesmo padrão de `cadastro.ts`/`aceitarConviteAction`.
 */
export async function ativarAssinaturaAction(
  _estadoAnterior: EstadoAtivarAssinatura,
  formData: FormData,
): Promise<EstadoAtivarAssinatura> {
  const trava = await travaDeAtivacaoDeAssinatura();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return { erroGeral: `Muitas tentativas por aqui. Tenta de novo às ${horario}.` };
  }

  const validado = schema.safeParse({
    token: formData.get("token"),
    nomeEmpresa: formData.get("nomeEmpresa"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!validado.success || !validado.data.token) {
    return { erroGeral: MENSAGEM_PAGAMENTO_INDISPONIVEL };
  }
  const { token, nomeEmpresa, email, senha } = validado.data;

  const resultado = await ativarAssinatura(token, { nomeEmpresa, email, senha });
  if ("erro" in resultado) {
    const pagamentoMorto = resultado.erro === "Este link já não está disponível.";
    return { erroGeral: pagamentoMorto ? MENSAGEM_PAGAMENTO_INDISPONIVEL : resultado.erro };
  }

  await auth.api.sendVerificationEmail({ body: { email: resultado.email } }).catch((erroEmail) => {
    console.error(
      "[ativar-assinatura] falha ao mandar e-mail de verificacao",
      resultado.usuarioId,
      erroEmail instanceof Error ? erroEmail.name : "erro desconhecido",
    );
  });

  try {
    await auth.api.signInEmail({ body: { email: resultado.email, password: senha } });
  } catch (erroLogin) {
    console.error(
      "[ativar-assinatura] conta criada mas login automatico falhou",
      resultado.usuarioId,
      erroLogin instanceof Error ? erroLogin.name : "erro desconhecido",
    );
    redirect("/entrar");
  }

  redirect("/");
}
