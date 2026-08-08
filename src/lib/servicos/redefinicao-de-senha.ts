import { auth } from "@/lib/auth";

/**
 * A ponte entre o código de recuperação (na URL, na tela `/redefinir-senha`)
 * e a conta a que ele pertence — sem que o e-mail nunca passe por ali.
 *
 * O código fica na tabela `verification` do Better Auth, com o id do usuário
 * dentro (`ctx.internalAdapter`, o mesmo caminho que `cadastro.ts` já usa
 * para o que a rota HTTP não cobre). Consultar por aqui NÃO consome o
 * código — só a redefinição de verdade (`auth.api resetPassword`, pelo
 * navegador) faz isso.
 *
 * Por que o código vencido ainda costuma ser encontrável: a biblioteca não
 * apaga um código no instante em que ele vence — ela varre e apaga os
 * vencidos como efeito colateral de QUALQUER consulta a QUALQUER código
 * (de qualquer pessoa). Então, na volta do e-mail, o código desta pessoa
 * geralmente ainda está lá — mas não é garantido: se o código de outra
 * pessoa foi consultado antes, o dela pode já ter sido varrido junto. É por
 * isso que `email` pode voltar nulo mesmo com o código tendo existido —
 * quem chama trata isso pedindo o e-mail de novo, não como erro.
 */
export async function buscarEmailPorCodigo(
  codigo: string,
): Promise<{ valido: boolean; email: string | null }> {
  const ctx = await auth.$context;
  const verificacao = await ctx.internalAdapter.findVerificationValue(
    `reset-password:${codigo}`,
  );
  if (!verificacao) return { valido: false, email: null };

  const usuario = await ctx.internalAdapter.findUserById(verificacao.value);
  const email = usuario?.email ?? null;
  const valido = new Date(verificacao.expiresAt).getTime() > Date.now();

  return { valido, email };
}
