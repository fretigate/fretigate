"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { auth } from "@/lib/auth";
import { emTransacao, reverterCadastroIncompleto } from "@/lib/db";
import { OPCOES_ORIGEM, OUTRO_ORIGEM as OUTRO } from "./cadastro-opcoes";
import { travaDeCadastro } from "./trava-de-cadastro";
import { criarUsuarioDono } from "./criar-usuario-dono";
import { criarTiposDeOperacaoIniciais } from "./tipos-de-operacao";

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

/**
 * O valor é a data de publicação da versão do texto dos Termos e da
 * Política de Privacidade (`src/app/(auth)/termos/ConteudoTermos.tsx`) —
 * não um número sequencial. Toda Empresa que aceitar esta versão grava a
 * mesma data aqui; `termos_aceitos_em`, abaixo, é o momento em que aquela
 * Empresa aceitou, e os dois podem divergir. Empresas que já aceitaram esta
 * não são reescritas retroativamente quando a próxima versão nascer.
 *
 * Nem toda mudança no texto muda esta data: só cláusula nova ou alterada
 * exige aceite novo de quem já tinha aceitado (data nova aqui, e um fluxo
 * de reaceite que ainda não existe). Correção de redação que não muda o que
 * o texto autoriza — erro de digitação, clareza de frase — não precisa.
 *
 * Publicado em 18/08/2026 com revisão jurídica pendente, sem bloqueio de
 * lançamento (CLAUDE.md §14) — decisão do fundador.
 */
const VERSAO_TERMOS_PUBLICADA = "2026-08-18";

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

  // Passo 1 — a Empresa e os quatro tipos de operação, na mesma transação
  // (CLAUDE.md §9): uuid gerado aqui, `set_config` (dentro de `emTransacao`),
  // insert da Empresa com esse id, e só então os tipos — que apontam para ela.
  // Os tipos NÃO vão num passo seguinte: se fossem, uma falha no meio deixaria
  // empresa sem tipo nenhum, e o primeiro frete não teria o que escolher num
  // campo obrigatório.
  try {
    await emTransacao(empresaId, async (tx) => {
      await tx.empresa.create({
        data: {
          id: empresaId,
          nome_fantasia: dados.nomeEmpresa,
          telefone: dados.seuTelefone || null,
          origem_declarada: origemDeclarada,
          termos_aceitos_em: new Date(),
          termos_versao: VERSAO_TERMOS_PUBLICADA,
        },
      });
      await criarTiposDeOperacaoIniciais(tx, empresaId);
    });
  } catch (erroEmpresa) {
    // Nunca o objeto de erro cru: o `create` do Prisma pode ecoar de volta os
    // dados enviados (nome_fantasia, telefone) na mensagem de validação —
    // só nome do erro e o id gerado, nunca dado pessoal (§4).
    console.error(
      "[cadastro] falha ao criar empresa",
      empresaId,
      erroEmpresa instanceof Error ? erroEmpresa.name : "erro desconhecido",
    );
    return {
      erroGeral: "Não deu para criar a conta agora. Tenta de novo em instantes.",
    };
  }

  // Passo 2 — Usuário + senha, pela conexão da autenticação (`fretigate_auth`,
  // dentro de `ctx`). Se falhar, passo 3 reverte o passo 1.
  try {
    await criarUsuarioDono(ctx, {
      email: emailNormalizado,
      nome: dados.seuNome,
      empresaId,
      senha: dados.senha,
    });
  } catch (erroUsuario) {
    // Passo 3 — reverter. A empresa nunca teve usuário: nunca existiu de
    // verdade (CLAUDE.md §7). Roda no catch em volta do passo inteiro, não só
    // dos erros esperados — falha de conexão limpa igual.
    await reverterCadastroIncompleto(empresaId).catch((erroLimpeza) => {
      console.error(
        "[cadastro] falha ao reverter empresa orfa",
        empresaId,
        erroLimpeza instanceof Error ? erroLimpeza.name : "erro desconhecido",
      );
    });
    // Nunca o objeto de erro cru — só nome do erro e o id gerado, nunca
    // e-mail/nome/telefone (§4).
    console.error(
      "[cadastro] falha ao criar usuario apos empresa",
      empresaId,
      erroUsuario instanceof Error ? erroUsuario.name : "erro desconhecido",
    );
    return {
      erroGeral:
        "Não deu para criar a conta agora. Tenta de novo — o que você já preencheu continua aqui.",
    };
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
