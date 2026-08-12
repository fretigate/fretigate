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
 * aqui porque o Postgres não concede nada a `PUBLIC` em tabela nova. Função
 * é diferente: o Postgres concede `EXECUTE` a `PUBLIC` por padrão em toda
 * função nova, e isso só fecha com `REVOKE EXECUTE` direto, na própria
 * função, na mesma migration que a cria — nunca por `ALTER DEFAULT
 * PRIVILEGES` (`CLAUDE.md` §3, medido na tarefa 1 do item 3).
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

/**
 * Tabela futura: prova de VERDADE, não de registro.
 *
 * A versão anterior lia `pg_default_acl` — o registro de que um comando
 * `ALTER DEFAULT PRIVILEGES` foi dado. Isso mede a INTENÇÃO, não o efeito.
 * Por isso aqui se cria uma tabela de verdade — do mesmo jeito que qualquer
 * migration cria — logo no início do arquivo, antes de qualquer outra
 * consulta, para a consulta de "concessão direta" abaixo saber excluí-la (é
 * fixture de teste, não tabela do produto). Mede se `anon`/`authenticated`
 * alcançam.
 *
 * NÃO EXISTE EQUIVALENTE PARA FUNÇÃO, E A AUSÊNCIA É DE PROPÓSITO — não
 * esquecimento. A tarefa 1 do item 3 (11/08/2026) tentou o mesmo probe para
 * função e mediu, em seis variações de `ALTER DEFAULT PRIVILEGES`, que o
 * Postgres concede `EXECUTE` a `PUBLIC` em TODA função nova, sem exceção,
 * até no banco de desenvolvimento real — não é regressão, é o comportamento
 * padrão dele. Um teste "função nova nasce fechada" reprovaria SEMPRE,
 * disciplina nenhuma mudaria isso, e teste que reprova sempre ensina a
 * ignorar vermelho tanto quanto um que nunca reprova (`CLAUDE.md` §3, item
 * 4). A garantia real para função é outra: `REVOKE EXECUTE` direto, na
 * própria função, na migration que a cria — e quem mede se isso foi
 * lembrado é a verificação abaixo, sobre as funções que EXISTEM, não uma
 * hipotética. `CLAUDE.md` §3 tem o mecanismo medido.
 */
const PROBE_TABELA = "privilegios_probe_tabela";

await cliente.query(`DROP TABLE IF EXISTS "${PROBE_TABELA}"`);
await cliente.query(`CREATE TABLE "${PROBE_TABELA}" (id int)`);

/**
 * O contraste do §3, item 1, aplicado a `has_table_privilege`: sem ele, nada
 * prova que a consulta abaixo conseguiria acusar um vazamento se ele
 * existisse — só que ela devolveu `false` desta vez. Concede de propósito,
 * mede que a concessão aparece, revoga, e só então mede o estado real.
 */
await cliente.query(`GRANT SELECT ON "${PROBE_TABELA}" TO "anon"`);
const contrasteTabelaFutura = await cliente.query<{ acesso: boolean }>(
  `SELECT has_table_privilege('anon', $1, 'SELECT') AS acesso`,
  [PROBE_TABELA],
);
await cliente.query(`REVOKE SELECT ON "${PROBE_TABELA}" FROM "anon"`);

const acessoTabelaFutura = await cliente.query<{ papel: string; acesso: boolean }>(
  `SELECT papel, has_table_privilege(papel, $1, 'SELECT') AS acesso
     FROM unnest($2::text[]) AS papel`,
  [PROBE_TABELA, PAPEIS_DA_API_PUBLICA],
);

/**
 * Concessões diretas, tabela por tabela — só das tabelas do PRODUTO.
 * `PROBE_TABELA` é criada de propósito com acesso aberto, para medir o
 * padrão de tabela futura acima — incluí-la aqui a acusaria pelo motivo
 * errado.
 */
const concessoes = await cliente.query<{
  grantee: string;
  table_name: string;
  privilege_type: string;
}>(
  `SELECT grantee, table_name, privilege_type
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = ANY($1)
      AND table_name != $2
    ORDER BY table_name, grantee`,
  [PAPEIS_DA_API_PUBLICA, PROBE_TABELA],
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

/** Quantas tabelas existem, para nenhuma verificação passar sobre lista vazia. */
const tabelas = await cliente.query<{ total: string }>(
  `SELECT count(*)::text AS total
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'`,
);

/** O mesmo bloco de consultas acima, espelhado para função (tarefa 9c). */

/**
 * Concessões diretas de EXECUTE, função por função — de TODA função que
 * existe. Esta é a garantia real para função (ver o comentário de
 * `PROBE_TABELA` acima): se uma migration futura criar função e esquecer o
 * `REVOKE EXECUTE` direto, a função aparece aqui, com `PUBLIC` ou os papéis
 * da API pública na lista — e a verificação reprova.
 */
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

/** Quantas funções existem, para nenhuma verificação passar sobre lista vazia. */
const funcoes = await cliente.query<{ total: string }>(
  `SELECT count(*)::text AS total
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'`,
);

afterAll(async () => {
  await cliente.query(`DROP TABLE IF EXISTS "${PROBE_TABELA}"`);
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

  it("a medição de acesso enxerga concessão quando ela existe (contraste)", () => {
    // Sem isto, nada prova que a verificação seguinte (`has_table_privilege`
    // sobre `PROBE_TABELA`) conseguiria acusar um vazamento se ele
    // existisse — só que ela devolveu `false` desta vez.
    expect(contrasteTabelaFutura.rows[0]?.acesso).toBe(true);
    conferencias++;
  });

  it("tabela futura não nasce aberta para a API pública", () => {
    // GUARDA CONTRA LAÇO VAZIO — a mesma proteção do §3, item 4, aplicada
    // aqui à lista de papéis, não à lista de tabelas: se `PAPEIS_DA_API_PUBLICA`
    // um dia ficasse vazia, o laço abaixo não rodaria e a verificação
    // passaria sem ter medido nada.
    expect(acessoTabelaFutura.rowCount).toBe(PAPEIS_DA_API_PUBLICA.length);

    // Uma tabela de verdade foi criada agora mesmo (`PROBE_TABELA`), do
    // jeito que qualquer migration cria uma. Se `anon`/`authenticated`
    // alcançarem ELA, alcançariam a próxima tabela do produto também — e
    // nada no schema, no Prisma ou na revisão avisaria.
    for (const { papel, acesso } of acessoTabelaFutura.rows) {
      expect(acesso, `${papel} não pode alcançar tabela nova`).toBe(false);
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
    // Esta é a garantia real de função — não existe "função futura não nasce
    // aberta" separada (ver o comentário de `PROBE_TABELA`, acima no
    // arquivo): função nova SEMPRE nasce aberta no Postgres, e a única
    // proteção é o `REVOKE EXECUTE` direto na migration que a cria. Esta
    // verificação, sobre toda função que existe, é o que pega quem
    // esquecer.
    const encontradas = concessoesFuncoes.rows.map(
      (r) => `${r.grantee} → ${r.routine_name} (${r.privilege_type})`,
    );
    expect(encontradas).toEqual([]);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
