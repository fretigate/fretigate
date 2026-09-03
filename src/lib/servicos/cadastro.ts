"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { auth } from "@/lib/auth";
import { OPCOES_ORIGEM, OUTRO_ORIGEM as OUTRO } from "./cadastro-opcoes";
import { travaDeCadastro } from "./trava-de-cadastro";
import { criarEmpresaEDono } from "./criar-empresa-e-dono";

/**
 * O cadastro: cria a Empresa e o Usuário dono na mesma operação — tarefa 8.
 *
 * NÃO é `auth.api.signUpEmail`: `disableSignUp: true` recusa essa rota
 * incondicionalmente (`src/lib/auth/index.ts`), e mesmo se não recusasse,
 * `empresa_id`/`papel` têm `input: false` e seriam descartados na entrada.
 * O caminho é `auth.$context` — a mesma peça interna que a rota usaria — para
 * hashear a senha e criar Usuário/Account sem passar pela filtragem da rota
 * HTTP. Ver o plano da tarefa 8 para o raciocínio completo.
 */

// `VERSAO_TERMOS_PUBLICADA` mudou de casa no item 13 (`docs/planos/
// item-13-assinatura.md`, Tarefa 1): agora mora em `criar-empresa-e-dono.ts`,
// junto da função que grava `termos_versao` — um arquivo `"use server"` só
// pode exportar função assíncrona (Next.js), então não podia continuar aqui
// como export.

const schema = z.object({
  nomeEmpresa: z.string().trim().min(1),
  email: z.email(),
  senha: z.string().min(1),
  seuNome: z.string().trim().min(1),
  seuTelefone: z.string().trim(),
  origem: z.string().min(1),
  origemOutro: z.string().trim(),
});

export type EstadoCadastro = {
  erroGeral?: string;
  erros?: Record<string, string>;
};

function erroDeCampo(campo: string, mensagem: string): EstadoCadastro {
  return { erros: { [campo]: mensagem } };
}

/**
 * "Como falar comigo" na mensagem de trava — o mesmo endereço de contato do
 * e-mail transacional (`src/lib/auth/email.ts`), nunca um novo. Quem trava
 * no cadastro acabou de pagar, não criou a conta ainda e não tem "esqueci a
 * senha" como saída — é o único caso do produto em que o contato É a saída
 * (decisão do fundador, 07/08/2026).
 *
 * O `!` é seguro, não otimista: `src/lib/auth/email.ts` já valida
 * `EMAIL_RESPOSTA` na carga do módulo e lança erro se faltar — e este
 * arquivo importa `@/lib/auth`, que importa `email.ts`. Se a variável não
 * existisse, o processo já teria parado antes de chegar aqui.
 */
const CONTATO = process.env.EMAIL_RESPOSTA!;

function formatarHorarioFortaleza(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

/**
 * ⛔ EXCEÇÃO DECLARADA ao envelope `comoUsuario`/`comoDono`
 * (`docs/planos/auditoria-3-mecanismo-de-sessao.md`,
 * `tests/protecao-de-acoes.test.ts`): esta ação CRIA a empresa e o usuário —
 * não existe sessão para exigir nesse instante, por definição.
 */
export async function criarConta(
  _estadoAnterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const ctx = await auth.$context;

  const trava = await travaDeCadastro(ctx);
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return {
      erroGeral:
        `Muitas tentativas de criar conta por aqui. Você pode tentar de novo ` +
        `às ${horario}. Se precisar antes disso, fala com a gente: ${CONTATO}.`,
    };
  }

  const bruto = {
    nomeEmpresa: String(formData.get("nomeEmpresa") ?? ""),
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    seuNome: String(formData.get("seuNome") ?? ""),
    seuTelefone: String(formData.get("seuTelefone") ?? ""),
    origem: String(formData.get("origem") ?? ""),
    origemOutro: String(formData.get("origemOutro") ?? ""),
  };

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    const campo = String(resultado.error.issues[0]?.path[0] ?? "");
    if (campo === "email") return erroDeCampo("email", "E-mail inválido.");
    return erroDeCampo(campo || "nomeEmpresa", "Preencha este campo.");
  }
  const dados = resultado.data;

  if (!dados.nomeEmpresa) {
    return erroDeCampo("nomeEmpresa", "Diga o nome da empresa.");
  }
  if (!dados.seuNome) {
    return erroDeCampo("seuNome", "Diga seu nome.");
  }
  const origemValida =
    (OPCOES_ORIGEM as readonly string[]).includes(dados.origem) ||
    dados.origem === OUTRO;
  if (!origemValida) {
    return erroDeCampo("origem", "Escolha uma opção.");
  }
  if (dados.origem === OUTRO && !dados.origemOutro) {
    return erroDeCampo("origemOutro", "Conta com suas palavras.");
  }

  const emailNormalizado = dados.email.toLowerCase();

  const { minPasswordLength, maxPasswordLength } = ctx.password.config;
  if (dados.senha.length < minPasswordLength) {
    return erroDeCampo(
      "senha",
      `A senha precisa de pelo menos ${minPasswordLength} caracteres.`,
    );
  }
  if (dados.senha.length > maxPasswordLength) {
    return erroDeCampo(
      "senha",
      `A senha pode ter no máximo ${maxPasswordLength} caracteres.`,
    );
  }

  const existente = await ctx.internalAdapter.findUserByEmail(emailNormalizado);
  if (existente) {
    return erroDeCampo("email", "Já existe uma conta com esse e-mail.");
  }

  const origemDeclarada =
    dados.origem === OUTRO ? dados.origemOutro : dados.origem;
  const empresaId = uuidv7();

  // `origem_cadastro` (atribuição por primeiro toque, exigida junto com a
  // pergunta declarada — CLAUDE.md §11, docs/especificacao.md linha 322-324)
  // fica de fora desta fatia DE PROPÓSITO, não por esquecimento: é um
  // mecanismo à parte (capturar UTM/referrer num cookie de primeira visita),
  // que ninguém pediu ainda. O campo já existe no schema, nulo até alguém
  // construir a captura. PRAZO (CLAUDE.md §14): precisa existir antes de
  // ligar os anúncios — é o mesmo marco já usado para o reteste de e-mail.

  const resultadoConta = await criarEmpresaEDono({
    empresaId,
    nomeEmpresa: dados.nomeEmpresa,
    telefone: dados.seuTelefone || null,
    origemDeclarada,
    plano: "gratuito",
    periodicidade: null,
    statusAssinatura: "ativa",
    gatewayAssinanteId: null,
    email: emailNormalizado,
    nomeDono: dados.seuNome,
    senha: dados.senha,
  });
  if ("erro" in resultadoConta) {
    return { erroGeral: resultadoConta.erro };
  }

  // Melhor esforço: a conta já existe mesmo que o e-mail de verificação
  // falhe — e-mail não confirmado não impede entrar (§4.12).
  await auth.api
    .sendVerificationEmail({ body: { email: emailNormalizado } })
    .catch((erroEmail) => {
      console.error(
        "[cadastro] falha ao mandar e-mail de verificacao",
        empresaId,
        erroEmail instanceof Error ? erroEmail.name : "erro desconhecido",
      );
    });

  try {
    await auth.api.signInEmail({
      body: { email: emailNormalizado, password: dados.senha },
    });
  } catch (erroLogin) {
    console.error(
      "[cadastro] conta criada mas login automatico falhou",
      empresaId,
      erroLogin instanceof Error ? erroLogin.name : "erro desconhecido",
    );
    redirect("/entrar");
  }

  // "Primeiro acesso" ainda não existe (próxima fatia da tarefa 8) — destino
  // provisório.
  redirect("/");
}
