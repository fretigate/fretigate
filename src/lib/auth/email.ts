/**
 * Os textos dos dois momentos de e-mail transacional de autenticação:
 * recuperação de senha e verificação de e-mail. **Convite de usuário não
 * manda e-mail** — é sempre por WhatsApp, envio manual (item 10, Tarefa 4).
 * Nenhum dos dois é opcional — quem perde a senha só volta por aqui.
 *
 * O MECANISMO DE ENVIO MUDOU DE CASA NO ITEM 13 (`docs/planos/
 * item-13-assinatura.md`, Tarefa 1) — `enviarEmail` (a chamada à Resend, as
 * variáveis de ambiente) agora mora em `src/lib/email`, porque deixou de
 * servir só autenticação: o e-mail de ativação de assinatura também
 * precisa dele, e não passa pelo Better Auth. Este arquivo ficou só com os
 * dois textos que são específicos de autenticação de verdade.
 */
export { enviarEmail } from "@/lib/email";

/**
 * O corpo das mensagens. **Texto puro, sem versão HTML.**
 *
 * Decisão do fundador em 07/08/2026, e não é ausência de definição: texto puro
 * tem nota de spam melhor, e com domínio novo — sem histórico de envio — isso
 * pesa mais do que estética. Por isso o `estilo.md` não ganha seção de e-mail:
 * não há o que estilizar.
 *
 * Consequência prática: **nada de cor, fonte ou tamanho aqui.** Valor de estilo
 * neste arquivo é valor fora do sistema (§8), e foi assim que a primeira versão
 * errou — ela trazia dois cinzas e três tamanhos de fonte que não existem em
 * documento nenhum.
 *
 * Vocabulário do §8: "empresa", nunca "transportadora"; "conta", que é como a
 * tela chama em `docs/componentes.md`.
 */
export function recuperacaoDeSenha(url: string) {
  return {
    assunto: "Recuperar a senha do FretiGate",
    texto: [
      "Você pediu para recuperar a senha da sua conta no FretiGate.",
      "",
      "Abra este endereço para escolher uma senha nova:",
      url,
      "",
      "O link vale por 2 horas e só pode ser usado uma vez.",
      "",
      "Se não foi você quem pediu, é só ignorar esta mensagem — sua senha",
      "continua a mesma.",
      "",
      "FretiGate",
    ].join("\n"),
  };
}

export function verificacaoDeEmail(url: string) {
  return {
    assunto: "Confirmar seu e-mail no FretiGate",
    texto: [
      "Confirme que este e-mail é seu para garantir que você consegue",
      "recuperar a senha quando precisar.",
      "",
      "Abra este endereço para confirmar:",
      url,
      "",
      "Você pode continuar usando o FretiGate normalmente enquanto isso.",
      "",
      "FretiGate",
    ].join("\n"),
  };
}
