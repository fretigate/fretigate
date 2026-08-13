import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { bancoSemFiltroDeEmpresa } from "@/lib/db/sem-filtro-de-empresa";
import { enviarEmail, recuperacaoDeSenha, verificacaoDeEmail } from "./email";

/**
 * A autenticação do FretiGate.
 *
 * Este é o **único** lugar do produto que pode importar
 * `lib/db/sem-filtro-de-empresa`. O motivo está lá dentro, e resumido: no
 * login o Better Auth procura a pessoa pelo e-mail, e nesse instante não
 * existe contexto de empresa por definição — só se sabe de que empresa alguém
 * é depois de achá-lo.
 *
 * Isso NÃO é um cliente com poderes de administrador. Ele conecta com o papel
 * `fretigate_auth`, que não tem `BYPASSRLS` e não enxerga `empresa` nem
 * nenhuma tabela de domínio.
 */

const SEGREDO = process.env.BETTER_AUTH_SECRET;
const ENDERECO_BASE = process.env.NEXT_PUBLIC_APP_URL;

if (!SEGREDO) {
  throw new Error(
    "BETTER_AUTH_SECRET não está definida. Veja o .env.example. É ela que " +
      "assina o cookie de sessão: quem a tiver forja sessão de qualquer " +
      "usuário, de qualquer empresa.",
  );
}

if (!ENDERECO_BASE) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL não está definida. É o endereço base da aplicação, e " +
      "é dele que sai o link dentro do e-mail de recuperação de senha.",
  );
}

export const auth = betterAuth({
  secret: SEGREDO,
  baseURL: ENDERECO_BASE,

  /**
   * Sem isto, o `better-auth` recusa (`INVALID_ORIGIN`, 403) todo login
   * vindo de fora do `baseURL` — inclusive um POST direto de e-mail/senha,
   * mesmo sem cookie de sessão ainda (`validateOrigin`, dentro da
   * biblioteca). É uma checagem separada do `allowedDevOrigins` do
   * `next.config.ts` (aquele só protege recursos `/_next/*`; este protege
   * as rotas do `better-auth`). Achado do fundador, 12/08/2026: login pelo
   * celular era recusado antes mesmo de conferir a senha, porque a origem
   * (`http://192.168.x.x:3000`) não batia com `baseURL`
   * (`http://localhost:3000`).
   *
   * **Função, não um padrão de texto com `*`.** A primeira versão disto
   * usava `["http://192.168.*.*:3000", ...]`, copiando a técnica que
   * funciona em `allowedDevOrigins` (`next.config.ts`) — e não devia:
   * são dois mecanismos de curinga diferentes com a mesma aparência. O do
   * Next.js (`matchWildcardDomain`) compara por segmento de host, então
   * `*` nunca atravessa um ponto. O do `better-auth`
   * (`node_modules/better-auth/dist/auth/trusted-origins.mjs` →
   * `wildcardMatch`) é glob de texto livre — `*` atravessa ponto —, então
   * `"192.168.*.*"` confiava em qualquer origem começando com "192.168."
   * e terminando em ":3000", **inclusive um domínio de verdade**
   * registrado por alguém (`http://192.168.atacante.com:3000` batia).
   * Achado do `/revisar`, 12/08/2026 — corrigido antes de qualquer
   * publicação, mas registrado para não repetir: parecia conferido
   * (funcionava, o padrão parecia certo) e não era — mesma família de
   * "confusão de quem lê é evidência sobre o texto" do `CLAUDE.md` §2, só
   * que aqui quem leu era eu, o código-fonte da biblioteca.
   *
   * A função confere o host de verdade — precisa ser exatamente quatro
   * grupos numéricos nas faixas privadas, nunca um texto parecido.
   *
   * **Só em desenvolvimento.** Ao contrário do `allowedDevOrigins` (que já
   * é mecanismo exclusivo de dev do próprio Next.js), `trustedOrigins` é
   * configuração geral do `better-auth` — sem este `if`, valeria também em
   * produção.
   */
  trustedOrigins:
    process.env.NODE_ENV === "development"
      ? (request?: Request) => {
          const origem = request?.headers.get("origin");
          if (!origem) return [];
          let url: URL;
          try {
            url = new URL(origem);
          } catch {
            return [];
          }
          const REDE_LOCAL = /^(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
          const confiavel =
            url.protocol === "http:" && url.port === "3000" && REDE_LOCAL.test(url.hostname);
          return confiavel ? [origem] : [];
        }
      : undefined,

  database: prismaAdapter(bancoSemFiltroDeEmpresa, {
    provider: "postgresql",
    // Sequencial, não em transação: a conexão da autenticação vai pelo pool de
    // transação do Supabase (porta 6543), que não garante que duas instruções
    // caiam na mesma sessão. Transação interativa por cima disso é a classe de
    // defeito que só aparece sob carga.
    transaction: false,
  }),

  // ---------------------------------------------------------------------------
  // O mapeamento para a nossa tabela `usuario`.
  //
  // A biblioteca chama de `user` e usa nomes em inglês; a nossa tabela é de
  // domínio e está em português (§7). O mapeamento vive aqui, e é por isso que
  // o schema não precisou de coluna nenhuma com nome de biblioteca.
  // ---------------------------------------------------------------------------
  user: {
    modelName: "usuario",
    fields: {
      name: "nome",
      emailVerified: "email_verificado",
      image: "avatar_url",
      createdAt: "criado_em",
      updatedAt: "atualizado_em",
    },

    /**
     * `empresa_id` e `papel` precisam existir aqui para chegarem à sessão — é
     * de `empresa_id` que sai o filtro de toda consulta do produto.
     *
     * ⛔ `input: false` NÃO É DETALHE. Ele diz que o cliente **não pode
     * mandar** esses valores ao criar usuário. Sem isso, um cadastro
     * conseguiria enviar o `empresa_id` de outra empresa no formulário — que é
     * exatamente o que o §3 proíbe em uma linha: `empresa_id` vem sempre da
     * sessão autenticada no servidor, nunca de URL, formulário, cabeçalho ou
     * corpo. É a falha mais barata de criar neste arquivo.
     *
     * Quem grava esses campos é o cadastro, no servidor, dentro da transação
     * que também cria a empresa.
     */
    additionalFields: {
      empresa_id: { type: "string", required: true, input: false },
      papel: { type: "string", required: true, input: false },
      ultimo_acesso_em: { type: "date", required: false, input: false },
      arquivado_em: { type: "date", required: false, input: false },
    },
  },

  session: { modelName: "session" },
  account: { modelName: "account" },
  verification: { modelName: "verification" },

  emailAndPassword: {
    enabled: true,

    /**
     * 6, não o padrão da biblioteca (8) — decidido em 08/08/2026, registrado
     * em `docs/especificacao.md`. Fixado aqui pelo mesmo motivo do prazo do
     * link de recuperação, duas linhas abaixo: uma atualização da biblioteca
     * não pode mudar uma regra de produto sem ninguém tocar em nada.
     */
    minPasswordLength: 6,

    /**
     * O cadastro NÃO passa por aqui, e a rota genérica fica fechada.
     *
     * Criar conta no FretiGate é criar uma **empresa** e o usuário dono dela,
     * na mesma transação — e o papel da autenticação não enxerga `empresa`, de
     * propósito. Então o endpoint genérico de cadastro não teria como
     * funcionar: ele gravaria usuário sem empresa, que o banco recusa.
     *
     * Deixá-lo aberto seria expor uma rota que só sabe dar erro. A tela de
     * criar conta é a tarefa 8, e ela vai usar o caminho documentado no §9 —
     * `set_config` antes do insert, tudo numa transação.
     */
    disableSignUp: true,

    /**
     * E-mail não verificado **não impede entrar** — decisão do fundador em
     * 07/08/2026, registrada em `docs/especificacao.md`.
     *
     * O motivo: quem acabou de pagar sem ter visto o produto não pode esbarrar
     * numa parede, ainda mais com domínio novo, em que a mensagem pode cair em
     * spam. A verificação roda em segundo plano e o lembrete aparece como
     * pendência na dashboard.
     */
    requireEmailVerification: false,

    /**
     * O link de recuperação vale **2 horas**, e o número está aqui de
     * propósito, não herdado do padrão da biblioteca.
     *
     * O texto do e-mail diz "o link vale por 2 horas". Se o prazo viesse do
     * padrão, uma atualização da biblioteca mudaria o comportamento e o e-mail
     * passaria a mentir para o cliente sem ninguém tocar em nada.
     *
     * Duas horas, e não uma: a pessoa pode não abrir o e-mail na hora.
     *
     * O link é de **uso único** — ao redefinir a senha, o token é consumido e a
     * linha some de `verification`. Isso é comportamento da biblioteca,
     * conferido no código dela, não configuração nossa.
     */
    resetPasswordTokenExpiresIn: 2 * 60 * 60,

    /**
     * O `url` que a biblioteca ofereceria aqui aponta para a rota dela
     * própria (`/reset-password/:token`), que faz um redirecionamento antes
     * de chegar à nossa tela — e nesse redirecionamento ela decide sozinha
     * se apaga o código (`docs/especificacao.md` § Trava de tentativas: a
     * limpeza de código vencido roda como efeito colateral dessa consulta).
     * Se o primeiro clique for o que vence o código, a nossa tela de link
     * expirado nunca teria a chance de descobrir a quem ele pertencia.
     *
     * Por isso o link do e-mail vai direto para a nossa tela, com o `token`
     * puro — é ela quem decide o que fazer com ele
     * (`src/lib/servicos/redefinicao-de-senha.ts`), e a rota da biblioteca
     * fica sem uso, de propósito.
     */
    async sendResetPassword({ user, token }) {
      const url = `${ENDERECO_BASE}/redefinir-senha?token=${token}`;
      const { assunto, texto } = recuperacaoDeSenha(url);
      // O endereço vai para o fornecedor, não para o log (§4).
      await enviarEmail({ para: user.email, assunto, texto });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }) {
      const { assunto, texto } = verificacaoDeEmail(url);
      await enviarEmail({ para: user.email, assunto, texto });
    },
  },

  // ---------------------------------------------------------------------------
  // A trava de tentativas — §4: "rate limit em login, recuperação de senha e
  // toda rota que gere custo".
  //
  // `enabled: true` é explícito porque o padrão da biblioteca é ligar só em
  // produção. Trava que nunca roda em desenvolvimento é trava que ninguém sabe
  // se funciona até o dia em que ela precisa funcionar.
  //
  // `storage: "database"` pelo motivo escrito na migration: a Vercel roda
  // várias instâncias, e contagem em memória viraria uma contagem por
  // instância — o limite de 5 valeria 5 vezes o número de instâncias.
  // ---------------------------------------------------------------------------
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",

    customRules: {
      // Adivinhação de senha.
      "/sign-in/email": { window: 60, max: 5 },

      // Cada pedido destes manda uma mensagem de verdade para uma caixa de
      // verdade: além do custo no fornecedor, sem limite isso vira ferramenta
      // de encher a caixa de outra pessoa. Janela larga, teto baixo.
      "/request-password-reset": { window: 300, max: 3 },
      "/forget-password": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },

      // Adivinhação do token que chega no e-mail.
      "/reset-password": { window: 300, max: 5 },
    },
  },

  // Faz o cookie de sessão ser gravado a partir de Server Action e Route
  // Handler. Sem este plugin o login responde certo e não deixa ninguém logado.
  plugins: [nextCookies()],
});

export type Sessao = typeof auth.$Infer.Session;
