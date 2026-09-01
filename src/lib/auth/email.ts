import { Resend } from "resend";

/**
 * O envio de e-mail transacional.
 *
 * São dois momentos, e só esses dois (`docs/especificacao.md`, "E-mail
 * transacional"): recuperação de senha e verificação de e-mail. **Convite de
 * usuário não manda e-mail** — é sempre por WhatsApp, envio manual (item 10,
 * Tarefa 4). Nenhum dos dois é opcional — quem perde a senha só volta por
 * aqui.
 *
 * POR QUE ISTO VIVE EM `lib/auth` E NÃO NUMA PASTA PRÓPRIA
 * Os dois consumidores são de autenticação. O §6 do `CLAUDE.md` proíbe camada
 * sem dois casos de uso reais, e uma pasta `lib/email` hoje seria uma camada a
 * mais entre o Better Auth e o fornecedor, servindo só a ele. No dia em que
 * existir e-mail que não seja de autenticação, aí ela se paga.
 */

const CHAVE = process.env.RESEND_API_KEY;
const REMETENTE = process.env.EMAIL_REMETENTE;
const RESPOSTA = process.env.EMAIL_RESPOSTA;

if (!CHAVE) {
  throw new Error(
    "RESEND_API_KEY não está definida. Veja o .env.example — sem ela o produto " +
      "sobe sem conseguir mandar recuperação de senha, e quem perde a senha " +
      "não volta.",
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
 * o subdomínio de envio, que não recebe. Quem perdeu a senha, recebeu o link e
 * responde *"não consegui, me ajuda"* é comportamento comum — e resposta que
 * some é pior que e-mail que não chegou, porque a pessoa acha que falou com
 * alguém.
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
  /** Corpo em texto puro. Não existe versão HTML — ver abaixo. */
  texto: string;
};

/**
 * Manda a mensagem e **falha alto** se o fornecedor recusar.
 *
 * O erro sobe em vez de virar `false` silencioso de propósito: uma recuperação
 * de senha que não sai precisa aparecer, não ser engolida. Quem chama decide o
 * que mostrar na tela.
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
