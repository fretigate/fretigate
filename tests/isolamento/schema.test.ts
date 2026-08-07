import { describe, expect, it, afterAll } from "vitest";
import { Client } from "pg";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * A prova mecânica: um teste que lê o próprio schema.
 *
 * Revisão de código esquece. O `CLAUDE.md` §3 diz que tabela nova já nasce com
 * isolamento, no mesmo commit — este arquivo é essa frase transformada em
 * máquina. Quem acrescentar tabela sem `empresa_id`, sem RLS ou sem política
 * não passa daqui.
 *
 * Lê o CATÁLOGO DO POSTGRES, não o schema do Prisma. O schema diz o que
 * queríamos; o catálogo diz o que existe. Onde os dois divergirem, quem manda
 * é o banco — foi lá que a política vai ou não recusar.
 */

/**
 * Tabelas sem `empresa_id`, e o motivo de cada uma.
 *
 * Conferida por **igualdade exata**: nome novo aparecendo aqui também falha,
 * porque acrescentar à lista tem que ser um ato consciente, não um reflexo
 * para calar um teste vermelho.
 */
const SEM_EMPRESA_ID = {
  session: "infraestrutura do Better Auth — sessão não pertence a uma empresa",
  account: "infraestrutura do Better Auth — guarda o hash da senha",
  verification: "infraestrutura do Better Auth — token de verificação",
  empresa: "é a própria empresa: o escopo dela é o próprio `id`",
} as const;

/** Gerada e mantida pelo Prisma. Não é tabela de domínio. */
const FORA_DO_ESCOPO = new Set(["_prisma_migrations"]);

type Tabela = {
  nome: string;
  rls_ativo: boolean;
  rls_forcado: boolean;
  politicas: number;
  tem_empresa_id: boolean;
};

// A consulta roda no topo, e não num `beforeAll`, porque o `it.each` precisa da
// lista no momento em que os testes são COLETADOS — depois já é tarde, e o
// arquivo coleta zero testes sem reclamar.
const cliente = new Client({ connectionString: process.env.DIRECT_URL });
await cliente.connect();

const tabelas = await (async () => {
  const { rows } = await cliente.query<Tabela>(`
    SELECT c.relname                AS nome,
           c.relrowsecurity         AS rls_ativo,
           c.relforcerowsecurity    AS rls_forcado,
           (SELECT count(*)::int FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas,
           EXISTS (
             SELECT 1 FROM information_schema.columns col
              WHERE col.table_schema = 'public'
                AND col.table_name = c.relname
                AND col.column_name = 'empresa_id'
           )                        AS tem_empresa_id
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`);
  return rows.filter((t) => !FORA_DO_ESCOPO.has(t.nome));
})();

afterAll(async () => {
  await cliente?.end();
});

describe("o schema se defende sozinho", () => {
  // §3, item 4: um laço sobre lista vazia passa em silêncio e não prova nada.
  // Esta é a verificação que impede o arquivo inteiro de ser teatro.
  it("achou tabelas para conferir", () => {
    expect(tabelas.length).toBeGreaterThan(0);
    expect(tabelas.length).toBe(Object.keys(Prisma.ModelName).length);
  });

  it("toda tabela tem `empresa_id` ou está na lista de exceções", () => {
    const semColuna = tabelas.filter((t) => !t.tem_empresa_id).map((t) => t.nome);
    const previstas = Object.keys(SEM_EMPRESA_ID);

    // Igualdade exata nos dois sentidos: tabela nova sem `empresa_id` falha, e
    // exceção que deixou de existir também.
    expect(semColuna.sort()).toEqual(previstas.sort());
  });

  it.each(tabelas.map((t) => [t.nome, t] as const))(
    "`%s` tem RLS ativado e forçado",
    (_nome, tabela) => {
      expect(tabela.rls_ativo).toBe(true);
      // `FORCE` importa: sem ele o dono da tabela escapa da política, e o dono
      // é quem roda as migrations.
      expect(tabela.rls_forcado).toBe(true);
    },
  );

  it.each(tabelas.map((t) => [t.nome, t] as const))(
    "`%s` tem pelo menos uma política",
    (_nome, tabela) => {
      // RLS ligado sem política nega tudo, o que é seguro mas quebra o produto
      // em silêncio. Exigir política é exigir que alguém tenha pensado no caso.
      expect(tabela.politicas).toBeGreaterThan(0);
    },
  );
});
