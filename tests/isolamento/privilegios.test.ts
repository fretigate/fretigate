import { describe, expect, it, afterAll } from "vitest";
import { Client } from "pg";

/**
 * O privilégio, que é a camada ANTES do RLS.
 *
 * RLS decide quais LINHAS um papel enxerga. Privilégio decide se ele alcança a
 * TABELA. São coisas diferentes, e `schema.test.ts` só conferia a primeira.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O Supabase concede, por privilégio padrão, todos os privilégios em toda
 * tabela nova de `public` aos papéis `anon`, `authenticated` e `service_role`.
 * `anon` é o papel da API REST pública, usada com a chave que POR DESENHO fica
 * no navegador. Isso já foi um buraco real neste projeto — `session`, `account`
 * e `verification`, ou seja, token de sessão e hash de senha, estiveram
 * alcançáveis por quem tivesse a chave pública. A migration
 * `20260806223138_fecha_acesso_pela_api_publica` fechou.
 *
 * Fechar uma vez não é garantia. O privilégio volta sozinho na próxima tabela
 * se os privilégios padrão forem mexidos, e volta em silêncio: nada falha, nada
 * avisa, e a tabela nova nasce aberta. É por isso que isto é teste, e não
 * confiança na memória de quem leu a migration uma vez.
 */

/** Os papéis da API pública do Supabase. Nenhum deles tem o que fazer aqui. */
const PAPEIS_DA_API_PUBLICA = ["anon", "authenticated"];

/**
 * O mesmo, para função — mais `PUBLIC`. Tabela nunca precisou de `PUBLIC`
 * aqui porque a migration que fecha tabela já revogava dele desde o início.
 * Função não: o Postgres concede `EXECUTE` a `PUBLIC` por padrão, e é
 * exatamente isso que a migration `20260808052831_fecha_execucao_de_funcao_para_public`
 * fecha (tarefa 9c).
 */
const GRANTEES_FUNCAO = [...PAPEIS_DA_API_PUBLICA, "PUBLIC"];

/**
 * Contagem de verificações — §3, item 4.
 *
 * Teste que não distingue "passou" de "não rodou" é pior que teste nenhum. Se
 * uma exceção pular verificações, o número não bate e o arquivo reprova, mesmo
 * que nenhuma verificação tenha falhado.
 */
let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 8;

const cliente = new Client({ connectionString: process.env.DIRECT_URL });
await cliente.connect();

/** Concessões diretas, tabela por tabela. */
const concessoes = await cliente.query<{
  grantee: string;
  table_name: string;
  privilege_type: string;
}>(
  `SELECT grantee, table_name, privilege_type
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = ANY($1)
    ORDER BY table_name, grantee`,
  [PAPEIS_DA_API_PUBLICA],
);

/**
 * O mesmo formato de consulta, apontado para um papel que TEM privilégio.
 *
 * Este é o contraste do §3, item 1, aplicado a privilégio: sem ele, um erro de
 * digitação no nome do papel devolveria zero linhas e o teste passaria
 * aprovando o nada. Aqui zero linhas REPROVA — é a prova de que a consulta
 * enxerga concessão quando ela existe.
 */
const contraste = await cliente.query<{ grantee: string }>(
  `SELECT grantee
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = 'fretigate_auth'
      AND table_name = 'session'`,
);

/**
 * Privilégios padrão: o que TABELA QUE AINDA NÃO EXISTE vai receber ao nascer.
 *
 * Filtrado por `postgres` de propósito — é ele quem roda as migrations, então é
 * o padrão dele que decide como a próxima tabela nasce.
 *
 * `'r'` é tabela comum no catálogo do Postgres.
 */
const padraoFuturo = await cliente.query<{ acl: string }>(
  `SELECT COALESCE(d.defaclacl::text, '') AS acl
     FROM pg_default_acl d
     JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE n.nspname = 'public'
      AND d.defaclobjtype = 'r'
      AND pg_get_userbyid(d.defaclrole) = 'postgres'`,
);

/** Quantas tabelas existem, para nenhuma verificação passar sobre lista vazia. */
const tabelas = await cliente.query<{ total: string }>(
  `SELECT count(*)::text AS total
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'`,
);

/** O mesmo bloco de consultas acima, espelhado para função (tarefa 9c). */

/** Concessões diretas de EXECUTE, função por função. */
const concessoesFuncoes = await cliente.query<{
  grantee: string;
  routine_name: string;
  privilege_type: string;
}>(
  `SELECT grantee, routine_name, privilege_type
     FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND grantee = ANY($1)
    ORDER BY routine_name, grantee`,
  [GRANTEES_FUNCAO],
);

/**
 * Contraste: `fretigate_app` TEM `EXECUTE` em `reverter_cadastro_incompleto`
 * (a migration da tarefa 8 concedeu). Sem isto, um erro de digitação no nome
 * da função ou do papel devolveria zero linhas acima e a verificação
 * seguinte passaria aprovando o nada.
 */
const contrasteFuncao = await cliente.query<{ grantee: string }>(
  `SELECT grantee
     FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND grantee = 'fretigate_app'
      AND routine_name = 'reverter_cadastro_incompleto'`,
);

/**
 * Privilégio padrão de função: o que FUNÇÃO QUE AINDA NÃO EXISTE vai receber
 * ao nascer. `'f'` é função no catálogo do Postgres (`'r'` acima é tabela).
 */
const padraoFuturoFuncao = await cliente.query<{ acl: string }>(
  `SELECT COALESCE(d.defaclacl::text, '') AS acl
     FROM pg_default_acl d
     JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE n.nspname = 'public'
      AND d.defaclobjtype = 'f'
      AND pg_get_userbyid(d.defaclrole) = 'postgres'`,
);

/** Quantas funções existem, para nenhuma verificação passar sobre lista vazia. */
const funcoes = await cliente.query<{ total: string }>(
  `SELECT count(*)::text AS total
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'`,
);

afterAll(async () => {
  await cliente?.end();
});

describe("a API pública do Supabase não alcança nada nosso", () => {
  it("existe tabela para conferir", () => {
    // Sem isto, um banco vazio faria as verificações abaixo passarem sem ter
    // olhado tabela nenhuma.
    expect(Number(tabelas.rows[0].total)).toBeGreaterThan(0);
    conferencias++;
  });

  it("a consulta enxerga concessão quando ela existe (contraste)", () => {
    // `fretigate_auth` TEM privilégio em `session` — a migration do papel da
    // autenticação concedeu. Se isto vier vazio, a consulta está quebrada e a
    // verificação seguinte não vale nada.
    expect(contraste.rowCount).toBeGreaterThan(0);
    conferencias++;
  });

  it("`anon` e `authenticated` não têm privilégio em nenhuma tabela", () => {
    const encontradas = concessoes.rows.map(
      (r) => `${r.grantee} → ${r.table_name} (${r.privilege_type})`,
    );
    expect(encontradas).toEqual([]);
    conferencias++;
  });

  it("tabela futura não nasce aberta para a API pública", () => {
    // GUARDA CONTRA LAÇO VAZIO. Sem ela, zero linhas em `pg_default_acl` faria
    // o laço abaixo não rodar, o contador incrementar e a verificação passar
    // sem ter comparado nada — o defeito que este arquivo inteiro existe para
    // impedir (§3, item 4).
    //
    // Zero linhas aqui não é "está tudo bem": é o padrão de privilégio do
    // `postgres` tendo sumido, e sem ele a próxima tabela volta a herdar o
    // padrão aberto do Supabase.
    expect(padraoFuturo.rowCount).toBeGreaterThan(0);

    // O privilégio padrão de `postgres` não pode mencionar os papéis da API
    // pública. Se mencionar, a PRÓXIMA tabela nasce alcançável pela chave que
    // fica no navegador — e nada no schema, no Prisma ou na revisão avisaria.
    for (const { acl } of padraoFuturo.rows) {
      for (const papel of PAPEIS_DA_API_PUBLICA) {
        expect(acl).not.toContain(`${papel}=`);
      }
    }
    conferencias++;
  });
});

describe("a API pública do Supabase não alcança nenhuma função", () => {
  it("existe função para conferir", () => {
    // Sem isto, um banco sem função nenhuma faria as verificações abaixo
    // passarem sem ter olhado função nenhuma.
    expect(Number(funcoes.rows[0].total)).toBeGreaterThan(0);
    conferencias++;
  });

  it("a consulta enxerga concessão quando ela existe (contraste)", () => {
    // `fretigate_app` TEM `EXECUTE` em `reverter_cadastro_incompleto` — a
    // migration da tarefa 8 concedeu. Se isto vier vazio, a consulta está
    // quebrada e a verificação seguinte não vale nada.
    expect(contrasteFuncao.rowCount).toBeGreaterThan(0);
    conferencias++;
  });

  it("`anon`, `authenticated` e `PUBLIC` não têm EXECUTE em nenhuma função", () => {
    const encontradas = concessoesFuncoes.rows.map(
      (r) => `${r.grantee} → ${r.routine_name} (${r.privilege_type})`,
    );
    expect(encontradas).toEqual([]);
    conferencias++;
  });

  it("função futura não nasce aberta para a API pública", () => {
    // Mesma guarda contra laço vazio da verificação equivalente de tabela.
    expect(padraoFuturoFuncao.rowCount).toBeGreaterThan(0);

    // O privilégio padrão de `postgres` para função não pode mencionar os
    // papéis nomeados da API pública, nem conceder a `PUBLIC` — que é como
    // este buraco foi encontrado na tarefa 8: revogar só de `anon` e
    // `authenticated`, por nome, não fecha nada, porque os dois herdam de
    // `PUBLIC` de qualquer forma. Na representação de ACL do Postgres,
    // `PUBLIC` aparece como um item sem nome de papel antes do `=`
    // (ex.: `=X/postgres`) — daí o regex, em vez de `.toContain("PUBLIC=")`.
    for (const { acl } of padraoFuturoFuncao.rows) {
      for (const papel of PAPEIS_DA_API_PUBLICA) {
        expect(acl).not.toContain(`${papel}=`);
      }
      expect(acl).not.toMatch(/(^|[{,])=/);
    }
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
