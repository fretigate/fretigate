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
 *
 * A CONTAGEM DE POLÍTICA NÃO BASTA (achado da auditoria de 15/08/2026). Uma
 * política é `PERMISSIVE` por padrão, e políticas permissivas na mesma tabela
 * se combinam por OU — "passa se qualquer uma deixar". Então "existe pelo
 * menos uma política boa" não prova isolamento: uma política ruim
 * ACRESCENTADA ao lado da boa (`USING (true)`, a cópia de `municipio` fora do
 * contexto certo) abre a tabela inteira sem apagar nada, e um teste que só
 * contasse continuaria vendo "pelo menos uma" e passando. Por isso este
 * arquivo lê os seis campos de cada política — nome, papéis, tipo
 * (permissiva/restritiva), comando, `USING`, `WITH CHECK` — e exige
 * igualdade exata contra o que está declarado. A regra certa é "não existe
 * nenhuma política que não devia estar aí", não "existe uma que devia".
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
  rate_limit:
    "trava de tentativas — a contagem acontece ANTES de existir sessão, " +
    "então não há empresa para filtrar. Quem tenta adivinhar senha não está " +
    "logado",
  municipio:
    "tabela oficial de referência (IBGE), igual para todas as empresas — não " +
    "é dado do usuário. Troca o escopo de empresa por `USING (true) WITH " +
    "CHECK (false)`: todo mundo lê, ninguém grava. Quem confere é " +
    "`tests/municipios.test.ts`",
} as const;

/** Gerada e mantida pelo Prisma. Não é tabela de domínio. */
const FORA_DO_ESCOPO = new Set(["_prisma_migrations"]);

type Tabela = {
  nome: string;
  rls_ativo: boolean;
  rls_forcado: boolean;
  tem_empresa_id: boolean;
};

/** Uma política, nos seis campos que decidem o que ela deixa passar. */
type Politica = {
  nome: string;
  /** `PERMISSIVE` ou `RESTRICTIVE` — texto cru do catálogo, sem conversão. */
  tipo: string;
  papeis: string[];
  comando: string;
  /** `null` quando a política não declara `USING`. */
  usando: string | null;
  /** `null` quando a política não declara `WITH CHECK` — nunca esperado aqui. */
  comCheck: string | null;
};

/**
 * O texto do contexto de empresa, já normalizado pelo Postgres — medido em
 * 15/08/2026 lendo `pg_policies` no banco de desenvolvimento, não deduzido da
 * migration. É contra ESTE texto que o banco vai recusar de verdade.
 */
const CONTEXTO = `(NULLIF(current_setting('app.empresa_id'::text, true), ''::text))::uuid`;

/**
 * A forma de toda política de isolamento de domínio: permissiva, para
 * `public`, `ALL`, comparando a coluna de escopo com o contexto — e o mesmo
 * texto em `USING` e `WITH CHECK`, os dois explícitos (`CLAUDE.md` §9).
 */
function politicaDeIsolamento(tabela: string, coluna: string): Politica {
  const condicao = `(${coluna} = ${CONTEXTO})`;
  return {
    nome: `${tabela}_isolamento`,
    tipo: "PERMISSIVE",
    papeis: ["public"],
    comando: "ALL",
    usando: condicao,
    comCheck: condicao,
  };
}

/** A forma das políticas de `fretigate_auth`: sem filtro, papel próprio. */
function politicaDeAutenticacao(tabela: string): Politica {
  return {
    nome: `${tabela}_autenticacao`,
    tipo: "PERMISSIVE",
    papeis: ["fretigate_auth"],
    comando: "ALL",
    usando: "true",
    comCheck: "true",
  };
}

/**
 * A política de cada tabela, exatamente como ela precisa existir no banco.
 *
 * Conferida por igualdade exata contra o catálogo — tabela nova sem entrada
 * aqui falha (ver "toda tabela tem política declarada"), e entrada aqui sem
 * a migration certa também falha, porque quem manda é o banco, não esta
 * declaração.
 */
const POLITICAS_ESPERADAS: Record<string, Politica[]> = {
  empresa: [politicaDeIsolamento("empresa", "id")],
  usuario: [
    politicaDeIsolamento("usuario", "empresa_id"),
    politicaDeAutenticacao("usuario"),
  ],
  tipo_operacao: [politicaDeIsolamento("tipo_operacao", "empresa_id")],
  cliente: [politicaDeIsolamento("cliente", "empresa_id")],
  veiculo: [politicaDeIsolamento("veiculo", "empresa_id")],
  motorista: [politicaDeIsolamento("motorista", "empresa_id")],
  servico: [politicaDeIsolamento("servico", "empresa_id")],
  titulo_receber: [politicaDeIsolamento("titulo_receber", "empresa_id")],
  // Único caso do produto com `USING` e `WITH CHECK` DIFERENTES de propósito:
  // todo mundo lê (dado oficial, igual para todas as empresas), ninguém
  // grava — ver `SEM_EMPRESA_ID.municipio` acima.
  municipio: [
    {
      nome: "municipio_leitura",
      tipo: "PERMISSIVE",
      papeis: ["public"],
      comando: "ALL",
      usando: "true",
      comCheck: "false",
    },
  ],
  session: [politicaDeAutenticacao("session")],
  account: [politicaDeAutenticacao("account")],
  verification: [politicaDeAutenticacao("verification")],
  rate_limit: [politicaDeAutenticacao("rate_limit")],
};

/** Papéis sem ordem que importe — ordena antes de comparar. */
function normalizar(lista: Politica[]): Politica[] {
  return lista
    .map((p) => ({ ...p, papeis: [...p.papeis].sort() }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

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

/** As políticas de toda tabela do produto, lidas de uma vez, por tabela. */
const politicasPorTabela = await (async () => {
  const { rows } = await cliente.query<{
    tablename: string;
    policyname: string;
    permissive: string;
    roles: string[];
    cmd: string;
    qual: string | null;
    with_check: string | null;
  }>(`
    SELECT tablename, policyname, permissive, roles::text[] AS roles, cmd, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
     ORDER BY tablename, policyname`);

  const mapa = new Map<string, Politica[]>();
  for (const linha of rows) {
    const lista = mapa.get(linha.tablename) ?? [];
    lista.push({
      nome: linha.policyname,
      tipo: linha.permissive,
      papeis: linha.roles,
      comando: linha.cmd,
      usando: linha.qual,
      comCheck: linha.with_check,
    });
    mapa.set(linha.tablename, lista);
  }
  return mapa;
})();

/**
 * O CONTRASTE (§3, item 1): sem ele, nada prova que a comparação acima
 * reprovaria uma política aberta de verdade — só que ela bateu desta vez.
 *
 * Cria uma tabela de verdade, do jeito que uma migration cria, com a mesma
 * política que o achado da auditoria descreve: `USING (true)`, cópia de
 * `municipio` fora do contexto que a torna segura ali (`municipio` tem
 * `WITH CHECK (false)`; esta sondagem não tem `WITH CHECK` nenhum). Medido em
 * 15/08/2026 (`CLAUDE.md` §9): esta forma abre a ESCRITA de verdade, não só a
 * leitura — um `INSERT` com `empresa_id` de outra "empresa" foi aceito.
 *
 * O NOME LEVA MARCA DE EXECUÇÃO, mesma técnica de `A`/`B` em
 * `tests/isolamento/vazamento.test.ts`: sem ela, duas execuções desta suíte
 * ao mesmo tempo contra o mesmo banco derrubariam a sondagem uma da outra, e
 * enquanto ela existe carrega `empresa_id` — o que desalinharia a trava 1 de
 * `vazamento.test.ts` e a contagem de tabelas aqui. Achado do `/revisar`,
 * 15/08/2026: o modo de falha certo é reprovar por motivo errado, não por
 * vazamento de verdade — e é assim que se perde tempo achando que a correção
 * quebrou algo que nunca quebrou.
 */
const TABELA_SONDAGEM = `schema_sondagem_politica_aberta_${process.hrtime.bigint().toString(16).slice(-8)}`;

async function criarEmedirSondagem(): Promise<Politica[]> {
  await cliente.query(`DROP TABLE IF EXISTS "${TABELA_SONDAGEM}"`);
  await cliente.query(`
    CREATE TABLE "${TABELA_SONDAGEM}" (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      empresa_id uuid NOT NULL
    )`);
  await cliente.query(`ALTER TABLE "${TABELA_SONDAGEM}" ENABLE ROW LEVEL SECURITY`);
  await cliente.query(`ALTER TABLE "${TABELA_SONDAGEM}" FORCE ROW LEVEL SECURITY`);
  await cliente.query(
    `CREATE POLICY "sondagem_leitura" ON "${TABELA_SONDAGEM}" USING (true)`,
  );

  const { rows } = await cliente.query<{
    policyname: string;
    permissive: string;
    roles: string[];
    cmd: string;
    qual: string | null;
    with_check: string | null;
  }>(
    `SELECT policyname, permissive, roles::text[] AS roles, cmd, qual, with_check
       FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1`,
    [TABELA_SONDAGEM],
  );

  return rows.map((r) => ({
    nome: r.policyname,
    tipo: r.permissive,
    papeis: r.roles,
    comando: r.cmd,
    usando: r.qual,
    comCheck: r.with_check,
  }));
}

let politicasDaSondagem: Politica[] = [];
try {
  politicasDaSondagem = await criarEmedirSondagem();
} finally {
  // Primeira camada de derrubada — cobre falha durante a criação ou a
  // medição, ANTES de qualquer teste ter rodado e do `afterAll` ter tido a
  // chance de agir (acréscimo do fundador, 15/08/2026). `IF EXISTS` porque o
  // `DROP` de dentro de `criarEmedirSondagem` pode já ter rodado antes do
  // erro.
  await cliente.query(`DROP TABLE IF EXISTS "${TABELA_SONDAGEM}"`).catch(() => {});
}

afterAll(async () => {
  // Segunda camada — cobre o caso comum: criação e medição terminaram bem,
  // mas uma asserção falhou dentro de um `it` depois disso. `IF EXISTS` faz
  // esta chamada não reclamar de a primeira camada já ter derrubado.
  await cliente.query(`DROP TABLE IF EXISTS "${TABELA_SONDAGEM}"`).catch(() => {});
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

  it("toda tabela tem política declarada para conferir", () => {
    // Sem isto, uma tabela ausente de `POLITICAS_ESPERADAS` compararia contra
    // `[]` (via `?? []` abaixo) e um esquecimento de declaração pareceria
    // "a tabela não tem política nenhuma", não "ninguém declarou a
    // expectativa" — o mesmo defeito de igualdade nos dois sentidos que
    // `SEM_EMPRESA_ID` já usa.
    const nomesTabelas = tabelas.map((t) => t.nome).sort();
    const nomesDeclarados = Object.keys(POLITICAS_ESPERADAS).sort();
    expect(nomesDeclarados).toEqual(nomesTabelas);
  });

  it.each(tabelas.map((t) => [t.nome, t] as const))(
    "`%s` tem exatamente as políticas declaradas — nome, papéis, tipo, comando, USING e WITH CHECK",
    (nome) => {
      const observadas = politicasPorTabela.get(nome) ?? [];
      const esperadas = POLITICAS_ESPERADAS[nome] ?? [];
      expect(normalizar(observadas)).toEqual(normalizar(esperadas));
    },
  );
});

describe("contraste — o verificador reprova política aberta de verdade (§3, item 1)", () => {
  it("a sondagem tem exatamente o defeito que este arquivo existe para pegar", () => {
    // Sem isto, um erro na consulta de medição devolveria lista vazia, e a
    // comparação do teste seguinte passaria pelo motivo errado — "vazio não
    // bate com não-vazio" não prova que o verificador reconhece política
    // aberta, só que ele viu duas coisas diferentes.
    expect(politicasDaSondagem).toHaveLength(1);
    expect(politicasDaSondagem[0].usando).toBe("true");
    expect(politicasDaSondagem[0].comCheck).toBeNull();
  });

  it("a mesma comparação usada acima recusaria esta política numa tabela de domínio", () => {
    const comoSeFosseDominio = [politicaDeIsolamento(TABELA_SONDAGEM, "empresa_id")];
    expect(normalizar(politicasDaSondagem)).not.toEqual(normalizar(comoSeFosseDominio));
  });
});
