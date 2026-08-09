import { describe, expect, it, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { normalizarParaBusca } from "@/lib/utils/texto";
import { buscarMunicipios, resolverMunicipio } from "@/lib/servicos/municipios";

/**
 * A tabela de referência: a carga está certa, e a aplicação LÊ E NÃO GRAVA.
 *
 * `municipio` é a primeira tabela do projeto **sem** `empresa_id`, por ser dado
 * oficial igual para todas as empresas. Não ter escopo de empresa não a deixa
 * sem proteção: ela troca "cada um vê o seu" por "todo mundo lê, ninguém
 * grava", e é isso que este arquivo mede.
 *
 * Os quatro requisitos do `CLAUDE.md` §3 estão aqui:
 *   1. o contraste — a mesma escrita PASSANDO pela conexão das migrations
 *   2. os papéis de verdade, no banco de verdade
 *   3. as duas cláusulas do §9 conferidas no catálogo, não no arquivo da migration
 *   4. contagem de verificações — o `expect` de cobertura no fim
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 17;

/**
 * Um identificador qualquer, e **nenhuma empresa semeada de propósito**.
 *
 * `db()` exige contexto de empresa porque é a mesma porta de todo o resto do
 * produto (§3) — mas `municipio` é global, e a política é `USING (true)`. Que a
 * leitura funcione com um contexto que não aponta para empresa nenhuma É a
 * afirmação sendo testada, não um atalho de teste.
 */
const QUALQUER_EMPRESA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** Fora da faixa do IBGE (7 dígitos), então nunca colide com município real. */
const CODIGO_DE_TESTE = 9999999;

type Arquivo = {
  procedencia: { registros: number };
  municipios: { codigo_ibge: number; nome: string; uf: string }[];
};

const arquivo: Arquivo = JSON.parse(
  readFileSync(new URL("../prisma/seed/municipios.json", import.meta.url), "utf8"),
);

/** A conexão das migrations. É ela quem semeia, e é ela o contraste. */
const raiz = new Client({ connectionString: process.env.DIRECT_URL });
await raiz.connect();

/** A conexão da aplicação, com o papel `fretigate_app`. É esta que está em julgamento. */
const app = new Client({ connectionString: process.env.DATABASE_URL });
await app.connect();

afterAll(async () => {
  await raiz.query(`DELETE FROM "municipio" WHERE codigo_ibge = $1`, [CODIGO_DE_TESTE]);
  await raiz.end();
  await app.end();
});

/** Insere a linha de teste com todas as colunas obrigatórias preenchidas. */
const INSERT_DE_TESTE = `
  INSERT INTO "municipio" (codigo_ibge, nome, uf, nome_normalizado, latitude, longitude)
  VALUES ($1, 'Municipio De Teste', 'CE', 'municipio de teste', -3.7, -38.5)`;

describe("1. a carga confere com o arquivo", () => {
  it("o banco tem a quantidade que o arquivo declara", async () => {
    // Contra o número declarado no arquivo, NUNCA contra 5.570 cravado aqui:
    // município novo é criado por lei estadual, e um número fixo faria este
    // teste reprovar no dia em que o IBGE mudasse a conta.
    const { rows } = await raiz.query(`SELECT count(*)::int n FROM "municipio"`);
    expect(rows[0].n).toBe(arquivo.procedencia.registros);
    conferencias++;
  });

  it("nenhuma coordenada nula, zerada ou fora do Brasil", async () => {
    const { rows } = await raiz.query(`
      SELECT count(*)::int n FROM "municipio"
       WHERE latitude IS NULL OR longitude IS NULL
          OR latitude = 0 OR longitude = 0
          OR latitude NOT BETWEEN -34 AND 6
          OR longitude NOT BETWEEN -74 AND -32`);
    expect(rows[0].n).toBe(0);
    conferencias++;
  });

  it("as 27 unidades da federação", async () => {
    const { rows } = await raiz.query(`SELECT count(DISTINCT uf)::int n FROM "municipio"`);
    expect(rows[0].n).toBe(27);
    conferencias++;
  });

  it("o nome normalizado casa com a função que a busca usa", async () => {
    // ESTA É A VERIFICAÇÃO QUE JUSTIFICA A COLUNA EXISTIR. A seed escreve
    // `nome_normalizado` com `normalizarParaBusca`, e a busca trata o que o
    // usuário digita com a MESMA função. Se as duas se separarem, o sintoma é
    // "o município existe e não aparece na busca" — e ninguém desconfia da
    // coluna, todo mundo desconfia da consulta.
    const { rows } = await raiz.query<{ nome: string; nome_normalizado: string }>(
      `SELECT nome, nome_normalizado FROM "municipio"`,
    );

    // Guarda contra laço vazio (§3, item 4): zero linhas faria o `filter`
    // abaixo devolver lista vazia e a verificação passar sem ter comparado nada.
    expect(rows.length).toBe(arquivo.procedencia.registros);

    const divergentes = rows
      .filter((r) => r.nome_normalizado !== normalizarParaBusca(r.nome))
      .map((r) => r.nome);
    expect(divergentes).toEqual([]);
    conferencias++;
  });
});

describe("2. a aplicação lê", () => {
  it("`fretigate_app` enxerga os municípios", async () => {
    // Sem contexto de empresa nenhum: `USING (true)` não depende dele. Se isto
    // vier zero, a política está negando o que devia liberar — e o campo de
    // município nasceria vazio para todo cliente.
    const { rows } = await app.query(`SELECT count(*)::int n FROM "municipio"`);
    expect(rows[0].n).toBe(arquivo.procedencia.registros);
    conferencias++;
  });

  it("`fretigate_app` tem SELECT, e só SELECT", async () => {
    const { rows } = await raiz.query<{ privilege_type: string }>(
      `SELECT privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'municipio'
          AND grantee = 'fretigate_app'
        ORDER BY privilege_type`,
    );
    // Igualdade exata, não "contém SELECT": um GRANT amplo acrescentaria
    // INSERT e UPDATE sem tirar o SELECT, e "contém" aprovaria isso.
    expect(rows.map((r) => r.privilege_type)).toEqual(["SELECT"]);
    conferencias++;
  });
});

describe("3. a aplicação não grava", () => {
  it("o contraste: pela conexão das migrations, a mesma escrita PASSA", async () => {
    // ISTO É O CONTROLE DO EXPERIMENTO, NÃO O JEITO CERTO DE GRAVAR.
    //
    // A conexão das migrations é o papel `postgres`, que ignora RLS por
    // atributo. Ele aparece aqui para provar que o SQL das três recusas abaixo
    // está correto: sem este caso, um erro de digitação faria todas falharem e
    // o teste passaria aprovando o nada.
    //
    // Quem grava de verdade nesta tabela é a seed, por esta mesma conexão, e
    // isso é desenho (`CLAUDE.md` §9: nenhuma conexão que atende pedido de
    // usuário ignora RLS — comando de operação roda como `postgres`). O que
    // está em julgamento neste arquivo é `fretigate_app`, não este papel.
    await expect(raiz.query(INSERT_DE_TESTE, [CODIGO_DE_TESTE])).resolves.toBeTruthy();

    const { rows } = await raiz.query(
      `SELECT count(*)::int n FROM "municipio" WHERE codigo_ibge = $1`,
      [CODIGO_DE_TESTE],
    );
    expect(rows[0].n).toBe(1);
    conferencias++;
  });

  it("`fretigate_app` não insere", async () => {
    await expect(app.query(INSERT_DE_TESTE, [CODIGO_DE_TESTE + 1])).rejects.toThrow();
    conferencias++;
  });

  it("`fretigate_app` não atualiza", async () => {
    await expect(
      app.query(`UPDATE "municipio" SET nome = 'Invadida' WHERE codigo_ibge = $1`, [
        CODIGO_DE_TESTE,
      ]),
    ).rejects.toThrow();

    // E a linha continua como estava. Se o UPDATE tivesse passado por outro
    // caminho, o estrago apareceria aqui e não na exceção acima.
    const { rows } = await raiz.query(
      `SELECT nome FROM "municipio" WHERE codigo_ibge = $1`,
      [CODIGO_DE_TESTE],
    );
    expect(rows[0].nome).toBe("Municipio De Teste");
    conferencias++;
  });

  it("`fretigate_app` não apaga", async () => {
    await expect(
      app.query(`DELETE FROM "municipio" WHERE codigo_ibge = $1`, [CODIGO_DE_TESTE]),
    ).rejects.toThrow();
    conferencias++;
  });

  it("a política tem as DUAS cláusulas do §9, e a de escrita é `false`", async () => {
    // As recusas acima param no privilégio, que é a camada de fora. Esta
    // verificação é a de dentro: mesmo que alguém rode um GRANT amplo amanhã, a
    // política ainda recusa a escrita.
    //
    // É também o que impede a "correção" tentadora de trocar isto por
    // `FOR SELECT USING (true)` — que pareceria equivalente, e deixaria a
    // escrita sem cláusula nenhuma governando.
    const { rows } = await raiz.query<{ cmd: string; qual: string; with_check: string }>(
      `SELECT cmd, qual, with_check
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'municipio'
          AND policyname = 'municipio_leitura'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].cmd).toBe("ALL");
    expect(rows[0].qual).toBe("true");
    expect(rows[0].with_check).toBe("false");
    conferencias++;
  });
});

describe("4. a porta única por onde texto vira município", () => {
  it("busca pelo começo do nome", async () => {
    const achados = await buscarMunicipios(QUALQUER_EMPRESA, "forta");
    expect(achados.map((m) => m.codigo_ibge)).toContain(2304400);
    conferencias++;
  });

  it("busca com acento e caixa diferentes acha o mesmo", async () => {
    // "JUAZEIRO DO NORTE" digitado com acento e em maiúsculas tem que cair na
    // mesma linha que a seed gravou — é a função única provando que serve aos
    // dois lados.
    const achados = await buscarMunicipios(QUALQUER_EMPRESA, "Juázeiro do Nórte");
    expect(achados.map((m) => m.codigo_ibge)).toContain(2307304);
    conferencias++;
  });

  it("uma letra só não vai ao banco", async () => {
    expect(await buscarMunicipios(QUALQUER_EMPRESA, "f")).toEqual([]);
    conferencias++;
  });

  it("resolve com a UF colada, como vem numa ordem de frete", async () => {
    for (const texto of ["Fortaleza/CE", "Fortaleza - CE", "fortaleza ce", "Fortaleza"]) {
      const r = await resolverMunicipio(QUALQUER_EMPRESA, texto);
      expect(r).toEqual({
        situacao: "resolvido",
        municipio: { codigo_ibge: 2304400, nome: "Fortaleza", uf: "CE" },
      });
    }
    conferencias++;
  });

  it("nome ambíguo devolve `ambiguo`, e não chuta", async () => {
    // "Bom Jesus" existe em PI, RN, PB, SC e RS. Gravar um deles seria frete
    // com origem errada, que é pior que frete sem origem: o primeiro mente.
    expect(await resolverMunicipio(QUALQUER_EMPRESA, "Bom Jesus")).toEqual({
      situacao: "ambiguo",
    });

    // Com a UF, deixa de ser ambíguo — que é o que a lista de sugestões faz no
    // fluxo normal, porque ela mostra a UF de cada opção.
    const comUf = await resolverMunicipio(QUALQUER_EMPRESA, "Bom Jesus/PI");
    expect(comUf).toMatchObject({ situacao: "resolvido" });
    expect(comUf).toHaveProperty("municipio.codigo_ibge", 2201903);
    conferencias++;
  });

  it("texto que não é município devolve `nao_encontrado`", async () => {
    // Os dois motivos são separados de propósito: `ambiguo` é conserto de tela
    // (a sugestão não chamou atenção), `nao_encontrado` é conserto de dado ou
    // da normalização. A medição do item 3 precisa dos dois em separado.
    for (const texto of ["Pátio da fábrica", "", "f"]) {
      expect(await resolverMunicipio(QUALQUER_EMPRESA, texto)).toEqual({
        situacao: "nao_encontrado",
      });
    }
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    // §3, item 4: não basta nenhuma ter falhado. Se uma exceção pulou
    // verificações, o número não bate e o arquivo reprova.
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
