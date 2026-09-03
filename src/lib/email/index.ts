import { Resend } from "resend";

/**
 * O envio de e-mail transacional — mecanismo genérico, sem o texto de
 * nenhuma mensagem específica.
 *
 * Morava só em `src/lib/auth/email.ts`, com o comentário "no dia em que
 * existir e-mail que não seja de autenticação, aí ela se paga" — item 13
 * (`docs/planos/item-13-assinatura.md`, Tarefa 1) é esse dia: o e-mail de
 * ativação de assinatura precisa do mesmo mecanismo, e não é de
 * autenticação (não passa pelo Better Auth). Extraído para cá; os textos de
 * `recuperacaoDeSenha`/`verificacaoDeEmail` continuam em `lib/auth/email.ts`
 * (são específicos de autenticação), e o de ativação de assinatura mora em
 * `src/lib/servicos/pagamentos.ts` (mesmo padrão de `mensagens.ts` para
 * WhatsApp: template perto do domínio que o usa, mecanismo de envio
 * separado).
 */

const CHAVE = process.env.RESEND_API_KEY;
const REMETENTE = process.env.EMAIL_REMETENTE;
const RESPOSTA = process.env.EMAIL_RESPOSTA;

if (!CHAVE) {
  throw new Error(
    "RESEND_API_KEY não está definida. Veja o .env.example — sem ela o produto " +
      "sobe sem conseguir mandar e-mail transacional nenhum (recuperação de " +
      "senha, verificação de e-mail, ativação de assinatura).",
  );
}

if (!REMETENTE) {
  throw new Error(
    "EMAIL_REMETENTE não está definida. É o endereço de onde a mensagem SAI, " +
      "no subdomínio de envio (contato@envio.fretigate.com).",
  );
}

/**
 * O endereço de resposta sai daqui, **nunca de literal no código**
 * (`docs/especificacao.md`): ele muda — hoje é redirecionamento do
 * registrador, depois vira caixa própria —, e trocar endereço de contato não
 * pode exigir alterar código e publicar de novo.
 *
 * Exigido, não opcional. Sem `Reply-To`, responder à mensagem seria falar com
 * o subdomínio de envio, que não recebe.
 */
if (!RESPOSTA) {
  throw new Error(
    "EMAIL_RESPOSTA não está definida. É o endereço para onde a resposta VAI, " +
      "no domínio raiz (contato@fretigate.com). Sem ele, quem responder pedindo " +
      "ajuda fala com o vazio: o subdomínio de envio não recebe mensagem.",
  );
}

const resend = new Resend(CHAVE);

type Mensagem = {
  para: string;
  assunto: string;
  /** Corpo em texto puro. Não existe versão HTML — ver `recuperacaoDeSenha`
   * em `lib/auth/email.ts` para o motivo (nota de spam, domínio novo). */
  texto: string;
};

/**
 * Manda a mensagem e **falha alto** se o fornecedor recusar.
 *
 * O erro sobe em vez de virar `false` silencioso de propósito: quem chama
 * decide o que fazer com a falha — nos dois momentos de autenticação, vira
 * mensagem na tela; na ativação de assinatura (item 13), vira motivo para a
 * rota do webhook devolver erro e deixar a Kiwify reentregar o evento mais
 * tarde, tentando de novo.
 *
 * O §4 diz que log não contém dado pessoal. Por isso o endereço de destino
 * **não** entra na mensagem de erro — só o motivo devolvido pelo fornecedor.
 */
export async function enviarEmail({ para, assunto, texto }: Mensagem) {
  const { data, error } = await resend.emails.send({
    from: REMETENTE!,
    replyTo: RESPOSTA!,
    to: para,
    subject: assunto,
    text: texto,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.name} — ${error.message}`);
  }

  return data;
}
