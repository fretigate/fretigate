import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import ts from "typescript";
import { auth } from "@/lib/auth";
import { emTransacao } from "@/lib/db";
import { uuidv7 } from "uuidv7";
import { criarTiposDeOperacaoIniciais } from "@/lib/servicos/tipos-de-operacao";
import { comoUsuario, comoUsuarioLeitura, comoDono, comoDonoSemPortao } from "@/lib/auth/acao";
import {
  buscarSugestaoDeValorAction,
  listarDestinosDoClienteAction,
  buscarMunicipiosAction,
} from "@/app/(app)/fretes/acoes";
import { gerarRelatorioAction } from "@/app/(app)/relatorio/acoes";
import { gerarLinkDeCheckoutAction } from "@/app/(app)/planos/acoes";

/**
 * O portão de escrita para assinatura vencida (item 13, Tarefa 2 —
 * `docs/planos/item-13-tarefa-2-portao-de-escrita.md`). Prova, com login
 * real, que `comoUsuario`/`comoDono` (`src/lib/auth/acao.ts`) invertem o
 * padrão: bloqueiam escrita por padrão sob `vencida`/`encerrada`, e
 * `comoUsuarioLeitura` é a exceção nomeada — mesma exigência de rigor do
 * `CLAUDE.md` §3 (isolamento), porque este mecanismo também protege
 * dinheiro (impede empresa que não paga de continuar produzindo cobrança).
 *
 * Arquivo próprio, não estende `tests/sessao-e-papel.test.ts` — aquele
 * testa PAPEL (dono/operador), este testa ASSINATURA; garantias diferentes,
 * mesmo padrão já usado para separar `tests/protecao-de-acoes.test.ts` de
 * `tests/sessao-e-papel.test.ts`.
 */

const headersControlados = vi.hoisted(() => ({ atual: new Headers() as Headers }));
vi.mock("next/headers", () => ({
  headers: async () => headersControlados.atual,
}));

/**
 * `redirect()` do Next.js lança um `Error` cujo `.digest` tem o formato
 * `NEXT_REDIRECT;<tipo>;<url>;<statusCode>;` — medido direto em
 * `node_modules/next/dist/client/components/redirect.js` (as funções
 * `redirect`/`getRedirectError`), não suposto: fora de um pedido HTTP de
 * verdade não existe resposta para inspecionar, só este erro, e ele não
 * depende de nenhum contexto de pedido para ser lançado (só acessa
 * `actionAsyncStorage?.getStore()` com encadeamento opcional).
 */
function ehRedirectPara(erro: unknown, destino: string): boolean {
  if (!(erro instanceof Error)) return false;
  const digest = (erro as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;") && digest.includes(destino);
}

const marca = process.hrtime.bigint().toString(16).slice(-8);
const empresasParaLimpar: string[] = [];
const usuariosParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 29;

/**
 * `empresa_plano_coerente` (migration `20260806213650_planos_status_e_cnpj_unico`)
 * exige `plano = 'pago'` com `periodicidade` preenchida para qualquer
 * `status_assinatura` diferente de `ativa` — gratuito só existe como
 * `ativa`/sem periodicidade. Os quatro estados aqui são todos plano pago,
 * mensal: é o cenário real que este mecanismo protege (assinante que para
 * de pagar), não o gratuito, que nunca vence.
 */
async function criarEmpresaComStatus(
  status: "ativa" | "inadimplente" | "vencida" | "encerrada",
) {
  const empresaId = uuidv7();
  await emTransacao(empresaId, async (tx) => {
    await tx.empresa.create({
      data: {
        id: empresaId,
        nome_fantasia: `Empresa ${status} ${marca}`,
        origem_declarada: "Alguém me indicou",
        termos_aceitos_em: new Date(),
        termos_versao: "teste",
        plano: "pago",
        periodicidade: "mensal",
        status_assinatura: status,
      },
    });
    await criarTiposDeOperacaoIniciais(tx, empresaId);
  });
  empresasParaLimpar.push(empresaId);
  return empresaId;
}

async function criarUsuarioDono(empresaId: string, email: string, senha: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(senha);
  const usuario = await ctx.internalAdapter.createUser({
    email,
    name: "Dono de Teste",
    emailVerified: false,
    empresa_id: empresaId,
    papel: "dono",
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

let raiz: Client;

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
    // `solicitacao_upgrade` referencia `empresa` (RESTRICT) — sai antes
    // dela; `gerarLinkDeCheckoutAction` (comoDonoSemPortao) cria uma linha
    // de verdade no teste abaixo.
    await raiz.query(`DELETE FROM "solicitacao_upgrade" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("o portão de escrita: comoUsuario/comoDono bloqueiam por padrão, comoUsuarioLeitura nunca bloqueia", () => {
  const senha = "senha-de-teste-123";
  const cabecalhosPorEstado = {} as Record<
    "ativa" | "inadimplente" | "vencida" | "encerrada",
    Headers
  >;

  beforeAll(async () => {
    for (const estado of ["ativa", "inadimplente", "vencida", "encerrada"] as const) {
      const empresaId = await criarEmpresaComStatus(estado);
      const email = `dono-${estado}-${marca}@teste.invalido`;
      await criarUsuarioDono(empresaId, email, senha);
      cabecalhosPorEstado[estado] = await logarDeVerdade(email, senha);
    }
  });

  it("ativa: comoUsuario chega ao serviço — o caminho comum não regride", async () => {
    let chamadas = 0;
    const acaoNova = comoUsuario(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.ativa;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  it("inadimplente: comoUsuario também chega ao serviço — atraso não bloqueia, é justamente quando a pessoa ainda vai pagar (retentativa do cartão)", async () => {
    let chamadas = 0;
    const acaoNova = comoUsuario(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.inadimplente;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  it("vencida: uma ação NOVA, nunca registrada em lista de exceção nenhuma, bloqueia por padrão e redireciona para /assinatura-vencida, sem chegar ao serviço — o padrão é bloquear, não a exceção; e o contraste com ativa, acima", async () => {
    let chamadas = 0;
    const acaoNova = comoUsuario(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const erro = await acaoNova().catch((e: unknown) => e);
    expect(ehRedirectPara(erro, "/assinatura-vencida")).toBe(true);
    conferencias++;
    expect(chamadas).toBe(0);
    conferencias++;
  });

  it("encerrada: comoUsuario bloqueia do mesmo jeito que vencida", async () => {
    let chamadas = 0;
    const acaoNova = comoUsuario(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.encerrada;
    const erro = await acaoNova().catch((e: unknown) => e);
    expect(ehRedirectPara(erro, "/assinatura-vencida")).toBe(true);
    conferencias++;
    expect(chamadas).toBe(0);
    conferencias++;
  });

  it("vencida: comoDono também bloqueia — o mesmo portão, dono não tem passe livre", async () => {
    let chamadas = 0;
    const acaoNova = comoDono(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const erro = await acaoNova().catch((e: unknown) => e);
    expect(ehRedirectPara(erro, "/assinatura-vencida")).toBe(true);
    conferencias++;
    expect(chamadas).toBe(0);
    conferencias++;
  });

  it("ativa: comoDono chega ao serviço — o contraste", async () => {
    let chamadas = 0;
    const acaoNova = comoDono(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.ativa;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  it("comoUsuarioLeitura NUNCA bloqueia, mesmo sob vencida — é a exceção nomeada, não o padrão", async () => {
    let chamadas = 0;
    const acaoNova = comoUsuarioLeitura(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  it("comoUsuarioLeitura, sob encerrada, também chega ao serviço", async () => {
    let chamadas = 0;
    const acaoNova = comoUsuarioLeitura(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.encerrada;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  it("comoDonoSemPortao NUNCA bloqueia, mesmo sob vencida — segunda exceção nomeada (item 13, Tarefa 3, continuação)", async () => {
    let chamadas = 0;
    const acaoNova = comoDonoSemPortao(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  it("comoDonoSemPortao, sob encerrada, também chega ao serviço", async () => {
    let chamadas = 0;
    const acaoNova = comoDonoSemPortao(async () => {
      chamadas++;
      return "ok";
    });
    headersControlados.atual = cabecalhosPorEstado.encerrada;
    const resultado = await acaoNova();
    expect(resultado).toBe("ok");
    conferencias++;
    expect(chamadas).toBe(1);
    conferencias++;
  });

  /**
   * As três ações reais que são leitura disfarçada de escrita (`fretes/
   * acoes.ts`) — chamadas de verdade, sob `vencida`, com entrada que nunca
   * toca o banco (early return), só para provar que a Server Action inteira
   * atravessa o envelope sem bloquear.
   */
  it("buscarSugestaoDeValorAction (comoUsuarioLeitura de verdade) funciona sob vencida", async () => {
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const resultado = await buscarSugestaoDeValorAction("", "");
    expect(resultado).toBeNull();
    conferencias++;
  });

  it("listarDestinosDoClienteAction (comoUsuarioLeitura de verdade) funciona sob vencida", async () => {
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const resultado = await listarDestinosDoClienteAction("");
    expect(resultado).toEqual([]);
    conferencias++;
  });

  it("buscarMunicipiosAction (comoUsuarioLeitura de verdade) funciona sob vencida", async () => {
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const resultado = await buscarMunicipiosAction("São Paulo");
    expect(Array.isArray(resultado)).toBe(true);
    conferencias++;
  });

  /**
   * `gerarLinkDeCheckoutAction` (comoDonoSemPortao de verdade) — é ESCRITA
   * (cria um `SolicitacaoUpgrade`), mas precisa funcionar sob `vencida`
   * porque é o próprio caminho de sair desse estado (item 13, Tarefa 3,
   * continuação). Contraste com `gerarRelatorioAction`, logo abaixo: as
   * duas são escrita real, uma bloqueia, a outra não — a diferença é a
   * escolha do envelope, não o que a ação faz.
   */
  it("gerarLinkDeCheckoutAction (comoDonoSemPortao de verdade) funciona sob vencida", async () => {
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const resultado = await gerarLinkDeCheckoutAction("mensal");
    expect(resultado.ok).toBe(true);
    conferencias++;
  });

  /**
   * `gerarRelatorioAction` é escrita, decisão do fundador (plano, decisão 3):
   * produz documento novo, consome numeração, pode criar título — bloqueada
   * sob `vencida` como qualquer outra ação `comoUsuario`. O bloqueio
   * acontece ANTES da validação do `schema`, então uma entrada qualquer já
   * basta para provar isto.
   */
  it("gerarRelatorioAction (escrita real) bloqueia sob vencida", async () => {
    headersControlados.atual = cabecalhosPorEstado.vencida;
    const erro = await gerarRelatorioAction({
      clienteId: "não importa",
      servicoIds: [],
      dataInicial: "não importa",
      dataFinal: "não importa",
      gerarCobranca: false,
    }).catch((e: unknown) => e);
    expect(ehRedirectPara(erro, "/assinatura-vencida")).toBe(true);
    conferencias++;
  });
});

/**
 * A lista de exceções — igualdade exata, nos dois sentidos, mesmo padrão de
 * `EXCECOES` em `tests/protecao-de-acoes.test.ts`. Varredura própria (não
 * reaproveita a daquele arquivo, que classifica `comoUsuario`/`comoDono`
 * /`sem-envelope`, uma pergunta diferente): aqui a pergunta é "quais
 * exportações usam `comoUsuarioLeitura`".
 *
 * **Em todo `src/`, não só `src/app`** — achado do `/revisar`:
 * `comoUsuarioLeitura` é aceito como envelope válido em qualquer arquivo
 * `"use server"` de `src/` por `tests/protecao-de-acoes.test.ts` (que varre
 * `src/` inteiro), e já existe pelo menos um arquivo `"use server"` fora de
 * `src/app` (`src/lib/servicos/cadastro.ts`). Varrer só `src/app` deixaria
 * uma ação `comoUsuarioLeitura` criada ali passar despercebida pelos dois
 * testes — aprovada por `protecao-de-acoes` (é um envelope reconhecido) e
 * invisível para a lista exata daqui, o mesmo defeito que o `CLAUDE.md` §9
 * nomeia: uma trava que aprova o que não enxerga, em vez de recusar o que
 * não está na lista.
 */
describe("a lista de ações comoUsuarioLeitura — igualdade exata, nos dois sentidos", () => {
  const NOMES_ESPERADOS = [
    "buscarSugestaoDeValorAction",
    "listarDestinosDoClienteAction",
    "buscarMunicipiosAction",
  ];

  const RAIZ_SRC = join(process.cwd(), "src");
  const IGNORADOS = [join(RAIZ_SRC, "lib", "generated")];

  function arquivosTs(dir: string): string[] {
    const resultado: string[] = [];
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (IGNORADOS.includes(caminho)) continue;
      const info = statSync(caminho);
      if (info.isDirectory()) resultado.push(...arquivosTs(caminho));
      else if (/\.(ts|tsx)$/.test(nome)) resultado.push(caminho);
    }
    return resultado;
  }

  function ehArquivoUseServer(fonte: ts.SourceFile): boolean {
    const primeira = fonte.statements[0];
    return (
      !!primeira &&
      ts.isExpressionStatement(primeira) &&
      ts.isStringLiteral(primeira.expression) &&
      primeira.expression.text === "use server"
    );
  }

  /** Nome de toda exportação `export const nome = comoUsuarioLeitura(...)`. */
  function exportsComoUsuarioLeitura(fonte: ts.SourceFile): string[] {
    const nomes: string[] = [];
    for (const stmt of fonte.statements) {
      if (!ts.isVariableStatement(stmt)) continue;
      const exportado = (ts.getModifiers(stmt) ?? []).some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (!exportado) continue;
      for (const decl of stmt.declarationList.declarations) {
        if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
        if (!ts.isIdentifier(decl.initializer.expression)) continue;
        if (decl.initializer.expression.text !== "comoUsuarioLeitura") continue;
        if (!ts.isIdentifier(decl.name)) continue;
        nomes.push(decl.name.text);
      }
    }
    return nomes;
  }

  const vistas = new Set<string>();
  for (const caminho of arquivosTs(RAIZ_SRC)) {
    const texto = readFileSync(caminho, "utf8");
    const fonte = ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (!ehArquivoUseServer(fonte)) continue;
    for (const nome of exportsComoUsuarioLeitura(fonte)) vistas.add(nome);
  }

  it("achou pelo menos uma ação comoUsuarioLeitura de verdade (contraste: a varredura não está vazia por engano)", () => {
    expect(vistas.size).toBeGreaterThan(0);
    conferencias++;
  });

  it("as três exceções, e só elas — igualdade exata nos dois sentidos", () => {
    expect([...vistas].sort()).toEqual([...NOMES_ESPERADOS].sort());
    conferencias++;
  });
});

/**
 * Mesma varredura acima, para `comoDonoSemPortao` (item 13, Tarefa 3,
 * continuação) — pergunta própria, lista própria: "quais exportações usam
 * `comoDonoSemPortao`". Duplicada, não parametrizada por cima da anterior
 * — cada uma já é pequena, e uma função genérica só esconderia qual lista
 * fechada está sendo provada em cada describe.
 */
describe("a lista de ações comoDonoSemPortao — igualdade exata, nos dois sentidos", () => {
  const NOMES_ESPERADOS = ["gerarLinkDeCheckoutAction"];

  const RAIZ_SRC = join(process.cwd(), "src");
  const IGNORADOS = [join(RAIZ_SRC, "lib", "generated")];

  function arquivosTs(dir: string): string[] {
    const resultado: string[] = [];
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (IGNORADOS.includes(caminho)) continue;
      const info = statSync(caminho);
      if (info.isDirectory()) resultado.push(...arquivosTs(caminho));
      else if (/\.(ts|tsx)$/.test(nome)) resultado.push(caminho);
    }
    return resultado;
  }

  function ehArquivoUseServer(fonte: ts.SourceFile): boolean {
    const primeira = fonte.statements[0];
    return (
      !!primeira &&
      ts.isExpressionStatement(primeira) &&
      ts.isStringLiteral(primeira.expression) &&
      primeira.expression.text === "use server"
    );
  }

  /** Nome de toda exportação `export const nome = comoDonoSemPortao(...)`. */
  function exportsComoDonoSemPortao(fonte: ts.SourceFile): string[] {
    const nomes: string[] = [];
    for (const stmt of fonte.statements) {
      if (!ts.isVariableStatement(stmt)) continue;
      const exportado = (ts.getModifiers(stmt) ?? []).some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (!exportado) continue;
      for (const decl of stmt.declarationList.declarations) {
        if (!decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
        if (!ts.isIdentifier(decl.initializer.expression)) continue;
        if (decl.initializer.expression.text !== "comoDonoSemPortao") continue;
        if (!ts.isIdentifier(decl.name)) continue;
        nomes.push(decl.name.text);
      }
    }
    return nomes;
  }

  const vistas = new Set<string>();
  for (const caminho of arquivosTs(RAIZ_SRC)) {
    const texto = readFileSync(caminho, "utf8");
    const fonte = ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (!ehArquivoUseServer(fonte)) continue;
    for (const nome of exportsComoDonoSemPortao(fonte)) vistas.add(nome);
  }

  it("achou pelo menos uma ação comoDonoSemPortao de verdade (contraste: a varredura não está vazia por engano)", () => {
    expect(vistas.size).toBeGreaterThan(0);
    conferencias++;
  });

  it("a única exceção, e só ela — igualdade exata nos dois sentidos", () => {
    expect([...vistas].sort()).toEqual([...NOMES_ESPERADOS].sort());
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
