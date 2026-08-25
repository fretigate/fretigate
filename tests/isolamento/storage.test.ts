import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

/**
 * Isolamento do balde de storage (item 5, Tarefa 4 —
 * `docs/planos/item-5-ordem-de-servico.md`).
 *
 * A fronteira REAL do balde `comprovantes` não é RLS — é o código do
 * servidor conferindo posse antes de gerar a URL assinada
 * (`src/lib/servicos/comprovantes.ts`, medido em
 * `tests/isolamento/comprovantes.test.ts`, arquivo separado deste porque
 * aquele precisa de `SUPABASE_SERVICE_ROLE_KEY` para rodar e este não). O
 * que ESTE arquivo mede é a camada de baixo: mesmo que o código do servidor
 * tivesse um defeito, `anon`/`authenticated` não alcançam nenhuma linha de
 * `storage.objects`/`storage.buckets` pelo Postgres direto.
 *
 * POR QUE NÃO É `has_table_privilege`/`role_table_grants`, como
 * `tests/isolamento/privilegios.test.ts` faz para tabela de `public`
 *
 * MEDIDO NESTA TAREFA, NÃO SUPOSTO: `storage.objects`/`storage.buckets` são
 * donas de `supabase_storage_admin`, não de `postgres`. `REVOKE ALL ...
 * FROM anon, authenticated` rodado como `postgres` (quem roda migration e
 * teste) não dá erro e não muda NADA — `has_table_privilege` continuou
 * `true` antes e depois (ver o comentário da migration
 * `20260825060000_balde_comprovantes_storage`). `anon`/`authenticated`
 * SEMPRE terão privilégio de tabela aqui, por desenho do Supabase — não é
 * uma regressão para medir, é o estado permanente. A fronteira que este
 * projeto controla e PODE medir é RLS: `postgres` consegue criar/derrubar
 * política nessas duas tabelas (o Supabase concede isso à parte, sem exigir
 * posse) e consegue `SET ROLE anon`/`authenticated` dentro da própria
 * sessão — então é isso que este arquivo mede, de verdade: a linha, não o
 * catálogo.
 */

const OBJETO_PROBE = `probe-teste-${process.hrtime.bigint().toString(16).slice(-8)}.jpg`;

let raiz: Client;
let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 10;

type Papel = "anon" | "authenticated" | "service_role";

/** `SET ROLE` não aceita parâmetro — `papel` é sempre um dos três literais do tipo `Papel`, nunca entrada externa. */
async function contarLinhas(papel: Papel, tabela: "objects" | "buckets"): Promise<number> {
  await raiz.query(`SET ROLE "${papel}"`);
  try {
    const r = await raiz.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM storage.${tabela}`,
    );
    return Number(r.rows[0].n);
  } finally {
    await raiz.query(`RESET ROLE`);
  }
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
  // Linha real em storage.objects, gravada como `postgres` (ignora RLS) — é
  // o que o contraste abaixo tenta enxergar de dentro de `anon`/`authenticated`.
  await raiz.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)`, [
    "comprovantes",
    OBJETO_PROBE,
  ]);
});

afterAll(async () => {
  // `storage.objects` recusa DELETE direto por padrão (gatilho
  // `storage.protect_delete`, "Use the Storage API instead") — escape
  // explícito documentado pelo próprio Supabase, só para limpeza de teste.
  await raiz.query(`SET storage.allow_delete_query = 'true'`);
  await raiz.query(`DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2`, [
    "comprovantes",
    OBJETO_PROBE,
  ]);
  await raiz.end();
});

describe("balde `comprovantes` — RLS nega a API pública", () => {
  it("existe a linha-sonda para medir (senão as verificações abaixo passariam vazias)", async () => {
    const r = await raiz.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM storage.objects WHERE bucket_id = 'comprovantes' AND name = $1`,
      [OBJETO_PROBE],
    );
    expect(Number(r.rows[0].n)).toBe(1);
    conferencias++;
  });

  it("`service_role` enxerga a linha (contraste — prova que a medição funciona)", async () => {
    // Sem isto, nada prova que `contarLinhas` conseguiria acusar um
    // vazamento se ele existisse — só que devolveu 0 desta vez.
    expect(await contarLinhas("service_role", "objects")).toBeGreaterThan(0);
    conferencias++;
  });

  it("`anon` não enxerga nenhuma linha de `storage.objects`", async () => {
    expect(await contarLinhas("anon", "objects")).toBe(0);
    conferencias++;
  });

  it("`authenticated` não enxerga nenhuma linha de `storage.objects`", async () => {
    expect(await contarLinhas("authenticated", "objects")).toBe(0);
    conferencias++;
  });

  it("`anon` não enxerga nenhuma linha de `storage.buckets`", async () => {
    expect(await contarLinhas("anon", "buckets")).toBe(0);
    conferencias++;
  });

  it("o contraste do §3: com uma política permissiva, `anon` enxergaria a linha", async () => {
    // DUAS COISAS MEDIDAS NESTA TAREFA, as duas negativas — e por isso o
    // contraste usa a técnica de `privilegios.test.ts` (PROBE_TABELA:
    // conceder de propósito, medir, revogar), não a de desligar a proteção:
    //   1. Só `DROP POLICY` da política de deny NÃO reproduz o vazamento —
    //      RLS ligado sem política nenhuma já nega por padrão (é por isso
    //      que `storage.objects`/`storage.buckets` já nascem seguras mesmo
    //      antes desta migration: o Supabase já entrega as duas com RLS
    //      ligado).
    //   2. `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` também não roda como
    //      `postgres` aqui ("must be owner of table") — mesma falta de posse
    //      que impede o `REVOKE` (ver a migration
    //      `20260825060000_balde_comprovantes_storage`).
    // O que funciona, e prova a mesma coisa: uma política PERMISSIVA
    // temporária para `anon` — políticas permissivas se combinam por OR, e
    // uma com `USING (true)` faz a linha aparecer mesmo com a política de
    // deny (`USING (false)`) ainda no lugar.
    // `DROP POLICY IF EXISTS` antes de criar, mesmo padrão de
    // `DROP TABLE IF EXISTS` em `PROBE_TABELA` (privilegios.test.ts) — se
    // uma execução anterior morreu entre o `CREATE` e o `finally`, a
    // política de teste não trava a execução seguinte.
    await raiz.query(`DROP POLICY IF EXISTS "teste_probe_permissiva" ON storage.objects`);
    await raiz.query(
      `CREATE POLICY "teste_probe_permissiva" ON storage.objects
         TO "anon" USING (true) WITH CHECK (false)`,
    );
    try {
      expect(await contarLinhas("anon", "objects")).toBeGreaterThan(0);
    } finally {
      // Restaura antes de qualquer outra verificação rodar — nunca deixa a
      // política de teste no lugar, mesmo se a verificação acima falhar.
      await raiz.query(`DROP POLICY "teste_probe_permissiva" ON storage.objects`);
    }
    conferencias++;
  });

  it("sem a política de teste, `anon` volta a não enxergar nada", async () => {
    expect(await contarLinhas("anon", "objects")).toBe(0);
    conferencias++;
  });
});

/**
 * Os testes acima medem o EFEITO (a linha some para `anon`/`authenticated`)
 * — mas RLS ligado sem política nenhuma já produz esse mesmo efeito (ver o
 * teste do contraste, acima). Sem conferir o catálogo, nada aqui distingue
 * "a política da migration está fazendo o trabalho" de "não faria diferença
 * se ela nunca tivesse sido criada". Isto é o mesmo padrão de
 * `tests/isolamento/privilegios.test.ts`: medir o `pg_policies`, não só o
 * comportamento.
 */
describe("as políticas da migration existem, do jeito que a migration escreveu", () => {
  it("`objects_nega_api_publica` nega tudo, para `anon` e `authenticated`", async () => {
    const r = await raiz.query<{
      roles_txt: string;
      qual: string;
      with_check: string;
    }>(
      `SELECT array_to_string(roles, ',') AS roles_txt, qual, with_check
         FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'objects_nega_api_publica'`,
    );
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].roles_txt.split(",").sort()).toEqual(["anon", "authenticated"]);
    expect(r.rows[0].qual).toBe("false");
    expect(r.rows[0].with_check).toBe("false");
    conferencias++;
  });

  it("`buckets_nega_api_publica` nega tudo, para `anon` e `authenticated`", async () => {
    const r = await raiz.query<{
      roles_txt: string;
      qual: string;
      with_check: string;
    }>(
      `SELECT array_to_string(roles, ',') AS roles_txt, qual, with_check
         FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'buckets'
          AND policyname = 'buckets_nega_api_publica'`,
    );
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].roles_txt.split(",").sort()).toEqual(["anon", "authenticated"]);
    expect(r.rows[0].qual).toBe("false");
    expect(r.rows[0].with_check).toBe("false");
    conferencias++;
  });

  it("o contraste: uma política que não existe não aparece no catálogo", async () => {
    // Sem isto, nada prova que a consulta acima conseguiria acusar a
    // AUSÊNCIA da política se ela tivesse sido esquecida — só que achou uma
    // linha desta vez.
    const r = await raiz.query(
      `SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'politica_que_nao_existe'`,
    );
    expect(r.rowCount).toBe(0);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
