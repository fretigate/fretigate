import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import ts from "typescript";
import { auth } from "@/lib/auth";
import { emTransacao } from "@/lib/db";
import { uuidv7 } from "uuidv7";
import {
  sessaoPorCabecalho,
  exigirSessaoPorCabecalho,
  exigirDonoPorCabecalho,
  SemSessao,
  SemPermissao,
} from "@/lib/auth/sessao-por-cabecalho";
import { criarTiposDeOperacaoIniciais } from "@/lib/servicos/tipos-de-operacao";
import { cancelarConviteAction } from "@/app/(app)/conta/usuarios/acoes";

/**
 * Suporte para o describe "comoDono numa Server Action de produto real",
 * abaixo — `next/headers` só funciona dentro de um pedido real (mesmo
 * motivo do comentário do topo do arquivo), então é a única forma de
 * exercitar uma ação `comoDono` de verdade fora de um pedido HTTP: trocar
 * `headers()` por uma versão que devolve o `Headers` que o teste já tem à
 * mão (`cabecalhosDono`/`cabecalhosOperador`, login real, mais abaixo).
 * `vi.hoisted` porque `vi.mock` é hasteado para o topo do arquivo — sem
 * isso, o holder seria acessado antes de existir.
 */
const headersControlados = vi.hoisted(() => ({ atual: new Headers() as Headers }));
vi.mock("next/headers", () => ({
  headers: async () => headersControlados.atual,
}));

/**
 * Sessão e papel de verdade (`docs/planos/auditoria-3-mecanismo-de-sessao.md`,
 * §6) — login real contra o banco de teste, cookie real, sem simulação.
 *
 * **Corrigido, achados do `/revisar` na Tarefa 4 do item 10 — em dois
 * passes.** A frase anterior ("`exigirDono()` nunca rodou em produção —
 * nenhuma tela de dono existe ainda") ficou falsa a partir da Tarefa 2 do
 * mesmo item (`atualizarContaDaEmpresaAction`, primeira ação de servidor a
 * usar `comoDono` de verdade), sem ninguém notar. **A primeira correção
 * (primeiro passe) errou**: tratou o pedido do plano da Tarefa 4 — "este
 * arquivo ganha o primeiro caso real de `comoDono` barrando operador numa
 * ação de produto" — como já atendido pela Tarefa 2, sem checar se algum
 * teste chamava a ação de verdade. Não chamava: a Tarefa 2 criou a *ação*
 * `comoDono`, nenhum teste a exercitava — o pedido do plano continuava em
 * aberto, e a frase de correção teria virado uma segunda afirmação errada
 * se o segundo passe não tivesse conferido de novo. O describe "comoDono
 * numa Server Action de produto real", abaixo, fecha o pedido de verdade.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];
const usuariosParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 12;

async function criarEmpresa(nome: string) {
  const empresaId = uuidv7();
  await emTransacao(empresaId, async (tx) => {
    await tx.empresa.create({
      data: {
        id: empresaId,
        nome_fantasia: nome,
        origem_declarada: "Alguém me indicou",
        termos_aceitos_em: new Date(),
        termos_versao: "teste",
      },
    });
    await criarTiposDeOperacaoIniciais(tx, empresaId);
  });
  empresasParaLimpar.push(empresaId);
  return empresaId;
}

async function criarUsuario(
  empresaId: string,
  email: string,
  nome: string,
  papel: "dono" | "operador",
  senha: string,
) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(senha);
  const usuario = await ctx.internalAdapter.createUser({
    email,
    name: nome,
    emailVerified: false,
    empresa_id: empresaId,
    papel,
  });
  await ctx.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: hash,
  });
  usuariosParaLimpar.push(usuario.id);
  return usuario;
}

/** Loga de verdade e devolve um `Headers` com o cookie de sessão genuíno. */
async function logarDeVerdade(email: string, senha: string): Promise<Headers> {
  const resposta = await auth.api.signInEmail({
    body: { email, password: senha },
    asResponse: true,
  });
  const cookies = resposta.headers.getSetCookie();
  const parNomeValor = cookies.map((c) => c.split(";")[0]);
  return new Headers({ cookie: parNomeValor.join("; ") });
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (usuariosParaLimpar.length) {
    await raiz.query(`DELETE FROM "account" WHERE "userId" = ANY($1)`, [usuariosParaLimpar]);
    await raiz.query(`DELETE FROM "session" WHERE "userId" = ANY($1)`, [usuariosParaLimpar]);
    await raiz.query(`DELETE FROM "usuario" WHERE id = ANY($1)`, [usuariosParaLimpar]);
  }
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("sessão e papel, com login real", () => {
  const senha = "senha-de-teste-123";
  let cabecalhosDono: Headers;
  let cabecalhosOperador: Headers;

  beforeAll(async () => {
    const empresaId = await criarEmpresa("Empresa do teste de sessão e papel");
    const emailDono = `dono-${marca}@teste.invalido`;
    const emailOperador = `operador-${marca}@teste.invalido`;

    await criarUsuario(empresaId, emailDono, "Dono de Teste", "dono", senha);
    await criarUsuario(empresaId, emailOperador, "Operador de Teste", "operador", senha);

    cabecalhosDono = await logarDeVerdade(emailDono, senha);
    cabecalhosOperador = await logarDeVerdade(emailOperador, senha);
  });

  it("dono e operador, os dois, conseguem sessão comum", async () => {
    const sessaoDono = await exigirSessaoPorCabecalho(cabecalhosDono);
    expect(sessaoDono.papel).toBe("dono");
    conferencias++;

    const sessaoOperador = await exigirSessaoPorCabecalho(cabecalhosOperador);
    expect(sessaoOperador.papel).toBe("operador");
    conferencias++;
  });

  it("só dono passa em exigirDonoPorCabecalho", async () => {
    const sessaoDono = await exigirDonoPorCabecalho(cabecalhosDono);
    expect(sessaoDono.papel).toBe("dono");
    conferencias++;
  });

  it("operador recebe SemPermissao em exigirDonoPorCabecalho — o contraste", async () => {
    await expect(exigirDonoPorCabecalho(cabecalhosOperador)).rejects.toThrow(SemPermissao);
    conferencias++;
  });

  it("sem cookie nenhum, sessaoPorCabecalho devolve null", async () => {
    const sessao = await sessaoPorCabecalho(new Headers());
    expect(sessao).toBeNull();
    conferencias++;
  });

  it("sem cookie nenhum, exigirSessaoPorCabecalho recebe SemSessao", async () => {
    await expect(exigirSessaoPorCabecalho(new Headers())).rejects.toThrow(SemSessao);
    conferencias++;
  });

  it("sem cookie nenhum, exigirDonoPorCabecalho recebe SemSessao — não SemPermissao", async () => {
    // A ausência de sessão vem antes da checagem de papel: sem sessão, não há
    // papel nenhum para checar.
    await expect(exigirDonoPorCabecalho(new Headers())).rejects.toThrow(SemSessao);
    conferencias++;
  });

  /**
   * O pedido do plano da Tarefa 4 (`docs/planos/
   * item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 4"): "o primeiro
   * caso real de `comoDono` barrando operador numa ação de produto, não só
   * na função de auth isolada". `cancelarConviteAction`
   * (`conta/usuarios/acoes.ts`) serve de exemplo — qualquer ação `comoDono`
   * provaria o mesmo, porque a barreira acontece antes de qualquer uma
   * delas tocar o próprio serviço.
   *
   * `headersControlados.atual` (topo do arquivo) troca o `next/headers`
   * real pelo `Headers` do login de verdade feito acima
   * (`cabecalhosDono`/`cabecalhosOperador`) — é o único jeito de a ação
   * rodar fora de um pedido HTTP de verdade.
   */
  it("comoDono numa Server Action de produto real: operador recebe SemPermissao — a barreira roda antes do serviço", async () => {
    headersControlados.atual = cabecalhosOperador;
    await expect(cancelarConviteAction("id-qualquer")).rejects.toThrow(SemPermissao);
    conferencias++;
  });

  it("comoDono numa Server Action de produto real: dono passa da barreira e chega ao serviço — devolve erro de negócio, não SemPermissao", async () => {
    headersControlados.atual = cabecalhosDono;
    // Sem convite nenhum criado com este id: o serviço recusa por não achar
    // o convite, não por permissão — é exatamente a prova de que o dono
    // atravessou `comoDono` e chegou em `cancelarConvite` de verdade.
    const resultado = await cancelarConviteAction("00000000-0000-0000-0000-000000000000");
    expect(resultado).toEqual({ ok: false, erro: "Convite não encontrado." });
    conferencias++;
  });
});

describe("sessao.ts é casca fina — a lógica de verdade mora em sessao-por-cabecalho.ts", () => {
  /**
   * `next/headers` só funciona dentro de um pedido real, nunca dentro do
   * Vitest — por isso `exigirSessao`/`exigirDono` (a API pública) não podem
   * ser chamadas aqui. Esta é a prova de que elas não escondem lógica além
   * de "pegar o cabeçalho do pedido e delegar": lê o código-fonte de
   * `sessao.ts` e confere, função por função, que o corpo é só uma chamada
   * para a versão `PorCabecalho` correspondente, com `await headers()` como
   * único argumento — nada mais.
   */
  const caminho = join(process.cwd(), "src", "lib", "auth", "sessao.ts");
  const texto = readFileSync(caminho, "utf8");
  const fonte = ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  function corpoDeUmaLinha(nomeFuncao: string, nomeEsperado: string): boolean {
    for (const stmt of fonte.statements) {
      if (!ts.isFunctionDeclaration(stmt) || stmt.name?.text !== nomeFuncao) continue;
      const corpo = stmt.body;
      if (!corpo || corpo.statements.length !== 1) return false;
      const unica = corpo.statements[0];
      if (!ts.isReturnStatement(unica) || !unica.expression) return false;
      if (!ts.isCallExpression(unica.expression)) return false;
      const chamada = unica.expression;
      if (!ts.isIdentifier(chamada.expression) || chamada.expression.text !== nomeEsperado) return false;
      // único argumento precisa ser `await headers()` — um AwaitExpression
      // envolvendo uma chamada ao identificador `headers`, sem mais nada.
      if (chamada.arguments.length !== 1) return false;
      const argumento = chamada.arguments[0];
      if (!ts.isAwaitExpression(argumento)) return false;
      if (!ts.isCallExpression(argumento.expression)) return false;
      if (!ts.isIdentifier(argumento.expression.expression)) return false;
      return argumento.expression.expression.text === "headers";
    }
    return false;
  }

  it("sessaoAtual delega para sessaoPorCabecalho(await headers()) e nada mais", () => {
    expect(corpoDeUmaLinha("sessaoAtual", "sessaoPorCabecalho")).toBe(true);
    conferencias++;
  });

  it("exigirSessao delega para exigirSessaoPorCabecalho(await headers()) e nada mais", () => {
    expect(corpoDeUmaLinha("exigirSessao", "exigirSessaoPorCabecalho")).toBe(true);
    conferencias++;
  });

  it("exigirDono delega para exigirDonoPorCabecalho(await headers()) e nada mais", () => {
    expect(corpoDeUmaLinha("exigirDono", "exigirDonoPorCabecalho")).toBe(true);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
