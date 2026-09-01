import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Prova estrutural do envelope (`docs/planos/auditoria-3-mecanismo-de-sessao.md`,
 * §6): toda ação de servidor (arquivo com `"use server"` na primeira linha)
 * só exporta coisa envolvida por `comoUsuario`/`comoDono` — ou está na lista
 * de exceções, conferida por igualdade exata nos dois sentidos.
 *
 * Não há lista de ARQUIVO à mão: a varredura acha sozinha qualquer arquivo
 * com a diretiva, em qualquer lugar de `src/`. Só a lista de EXPORTAÇÃO é
 * escrita à mão, e cada entrada tem o motivo ao lado.
 *
 * ⚠️ LIMITAÇÃO CONHECIDA, ACEITA (`CLAUDE.md` §9) — igual às duas de
 * `sem-filtro-de-empresa` (tarefa 2): só alcança arquivo com a diretiva na
 * PRIMEIRA LINHA. Ação de servidor "inline" (`"use server"` dentro do corpo
 * de uma função) não é vista aqui nem pelo `eslint.config.mjs` — passa
 * despercebida pelas duas travas. Hoje não existe nenhuma no produto.
 */

const RAIZ_SRC = join(process.cwd(), "src");
const IGNORADOS = [join(RAIZ_SRC, "lib", "generated")];

const EXCECOES: Record<string, string> = {
  sairDaConta: "sessão pode já ter vencido; auth.api.signOut trata isso",
  criarConta: "cria a empresa; sessão não existe nesse momento",
  aceitarConviteAction:
    "cria o usuário a partir de um convite público, por token; sessão não existe nesse momento — mesmo motivo de criarConta (item 10, Tarefa 4)",
};

type Classificacao = "comoUsuario" | "comoDono" | "sem-envelope";

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

function nomeDoEnvelope(expressao: ts.Expression): "comoUsuario" | "comoDono" | null {
  if (!ts.isCallExpression(expressao) || !ts.isIdentifier(expressao.expression)) return null;
  const nome = expressao.expression.text;
  return nome === "comoUsuario" || nome === "comoDono" ? nome : null;
}

/**
 * Classifica toda exportação de VALOR — tipo/interface ficam de fora por não
 * existirem em tempo de execução (nó sintático próprio, nunca confundível com
 * `ts.isVariableStatement`/`ts.isFunctionDeclaration`).
 *
 * Recusa por não reconhecer, nunca aprova por não achar (mesmo princípio de
 * `tests/guarda-de-banco.ts`): toda forma de exportação de valor — função,
 * `const`, `export default`, `export { nome }`, `export * from` ou qualquer
 * outra — vira uma entrada no mapa, classificada `comoUsuario`/`comoDono` só
 * quando literalmente envolvida por um dos dois; qualquer outra forma cai em
 * `"sem-envelope"`. Nada passa em silêncio por a função não ter previsto o
 * formato.
 */
function classificarExports(fonte: ts.SourceFile): Map<string, Classificacao> {
  const resultado = new Map<string, Classificacao>();

  function registrar(nome: string, expressao: ts.Expression | undefined) {
    const envelope = expressao ? nomeDoEnvelope(expressao) : null;
    resultado.set(nome, envelope ?? "sem-envelope");
  }

  for (const stmt of fonte.statements) {
    // `export { nome }` e `export default expr` SÃO a exportação — não têm
    // modificador `export` na lista de modificadores (`ts.getModifiers`
    // devolve vazio para os dois), então precisam ser conferidos antes do
    // gate de `exportado` abaixo, que é só para declaração modificada por
    // `export` (função, `const`, classe).
    if (ts.isExportAssignment(stmt)) {
      registrar("default", stmt.expression);
      continue;
    }

    if (ts.isExportDeclaration(stmt)) {
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const elemento of stmt.exportClause.elements) {
          registrar(elemento.name.text, undefined);
        }
      } else {
        registrar(`export-desconhecido:${stmt.getText(fonte).slice(0, 60)}`, undefined);
      }
      continue;
    }

    const exportado = ts.canHaveModifiers(stmt)
      ? (ts.getModifiers(stmt) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      : false;
    if (!exportado) continue;

    if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) continue;

    if (ts.isFunctionDeclaration(stmt)) {
      registrar(stmt.name?.text ?? "default", undefined);
      continue;
    }

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const nome = ts.isIdentifier(decl.name) ? decl.name.text : decl.name.getText(fonte);
        registrar(nome, decl.initializer);
      }
      continue;
    }

    // Classe, enum, ou qualquer outra forma futura — desconhecida de
    // propósito, para reprovar em vez de passar em silêncio.
    registrar(`forma-desconhecida:${stmt.getText(fonte).slice(0, 60)}`, undefined);
  }
  return resultado;
}

const resultados = arquivosTs(RAIZ_SRC)
  .map((caminho) => {
    const texto = readFileSync(caminho, "utf8");
    const fonte = ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return { caminho, fonte };
  })
  .filter(({ fonte }) => ehArquivoUseServer(fonte))
  .map(({ caminho, fonte }) => ({ caminho, classificacao: classificarExports(fonte) }));

const excecoesVistas = new Set<string>();
for (const { classificacao } of resultados) {
  for (const [nome, tipo] of classificacao) {
    if (nome in EXCECOES && tipo === "sem-envelope") excecoesVistas.add(nome);
  }
}

describe("toda ação de servidor usa o envelope comoUsuario/comoDono", () => {
  it("achou arquivos de ação de servidor de verdade (contraste: a varredura não está vazia por engano)", () => {
    expect(resultados.length).toBeGreaterThan(0);
  });

  for (const { caminho, classificacao } of resultados) {
    const relativo = relative(process.cwd(), caminho);

    it(`${relativo} — toda exportação usa o envelope, ou está na exceção aprovada`, () => {
      expect(classificacao.size).toBeGreaterThan(0);

      for (const [nome, tipo] of classificacao) {
        if (nome in EXCECOES) {
          expect(
            tipo,
            `${nome} está na lista de exceção mas já usa ${tipo} — tire da lista (motivo registrado: "${EXCECOES[nome]}")`,
          ).toBe("sem-envelope");
        } else {
          expect(
            tipo,
            `${nome} em ${relativo} não usa comoUsuario/comoDono e não está na lista de exceção`,
          ).not.toBe("sem-envelope");
        }
      }
    });
  }

  it("as exceções foram realmente encontradas — igualdade exata nos dois sentidos", () => {
    expect([...excecoesVistas].sort()).toEqual(Object.keys(EXCECOES).sort());
  });
});
