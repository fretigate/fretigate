import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { db } from "@/lib/db";

/**
 * Vazamento ponta a ponta: a empresa A tentando alcançar a empresa B.
 *
 * Roda pelo `lib/db`, com o papel `fretigate_app`, que é como a aplicação fala
 * com o banco. Rodar como `postgres` passaria sempre — esse papel ignora RLS.
 *
 * Os quatro requisitos do `CLAUDE.md` §3 estão aqui:
 *   1. o contraste, que demonstra o vazamento SEM a proteção
 *   2. concorrência real, compartilhando conexão do pool
 *   3. os três jeitos de não ter contexto
 *   4. contagem de verificações — o `expect` de cobertura no fim
 *
 * TABELA NOVA ENTRA NO LAÇO, NÃO NUM BLOCO NOVO (achado da auditoria de
 * 15/08/2026). Até aqui, cada tabela de domínio tinha um bloco escrito à mão
 * — "o Cliente da empresa B é invisível", "o Veiculo da empresa B é
 * invisível" — e tabela nova sem bloco novo não fazia nada falhar: a prova de
 * isolamento dependia de alguém lembrar de escrever mais um `it`. A seção "3."
 * abaixo troca isso por um laço guiado pelo catálogo, com duas travas em
 * série: tabela de domínio com `empresa_id` sem entrada declarada reprova
 * (trava 1), e tabela declarada mas não semeada por `semear` também reprova
 * (trava 2) — sem a segunda, "zero linhas da empresa B" seria indistinguível
 * de "não olhei linha nenhuma".
 */

// Identificadores próprios desta execução: os testes falam com o banco de
// desenvolvimento, e dois deles rodando ao mesmo tempo não podem disputar linha.
const marca = process.hrtime.bigint().toString(16).slice(-8);
const A = `aaaaaaaa-aaaa-4aaa-8aaa-${marca.padStart(12, "0")}`;
const B = `bbbbbbbb-bbbb-4bbb-8bbb-${marca.padStart(12, "0")}`;

let raiz: Client;

/**
 * Tabelas com `empresa_id`, prova de vazamento ESCRITA À MÃO, fora do laço.
 *
 * Só `usuario`: ele TEM a coluna, mas já tem bloco próprio na seção "2."
 * abaixo, testando por e-mail único — o caminho que mais escapa de revisão
 * (`findUnique` por chave única) — o que a prova genérica do laço, por
 * listagem, não cobriria com a mesma precisão.
 *
 * `empresa` NÃO entra aqui, e por um motivo diferente de `usuario`: ela não
 * tem coluna `empresa_id` nenhuma — o escopo dela é o próprio `id` (mesma
 * exceção que `SEM_EMPRESA_ID.empresa` registra em
 * `tests/isolamento/schema.test.ts`). A prova de vazamento dela já existe na
 * seção "2." (listar, buscar por id, `updateMany`), só que por um mecanismo
 * que este laço — construído sobre a coluna `empresa_id` — não enxerga e não
 * precisa enxergar.
 */
const FORA_DO_LACO = new Set(["usuario"]);

/**
 * As tabelas de domínio cobertas pelo laço de vazamento, e como perguntar a
 * cada uma "o que a empresa X enxerga, entre A e B".
 *
 * Conferida por igualdade exata contra o catálogo (seção "3." abaixo): tabela
 * nova com `empresa_id`, fora de `FORA_DO_LACO` e sem entrada aqui, reprova —
 * é a trava 1. Toda função devolve `{ empresa_id }[]`, não os campos próprios
 * de cada modelo: a prova de vazamento não precisa deles, e normalizar a
 * forma é o que permite comparar as seis com o mesmo `it.each`.
 */
const TABELAS_DO_LACO: Record<
  string,
  (empresaId: string) => Promise<{ empresa_id: string }[]>
> = {
  tipo_operacao: (empresaId) =>
    db(empresaId).tipoOperacao.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  cliente: (empresaId) =>
    db(empresaId).cliente.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  veiculo: (empresaId) =>
    db(empresaId).veiculo.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  motorista: (empresaId) =>
    db(empresaId).motorista.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  servico: (empresaId) =>
    db(empresaId).servico.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  titulo_receber: (empresaId) =>
    db(empresaId).tituloReceber.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  recebimento: (empresaId) =>
    db(empresaId).recebimento.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  cobranca_enviada: (empresaId) =>
    db(empresaId).cobrancaEnviada.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  relatorio: (empresaId) =>
    db(empresaId).relatorio.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
  relatorio_servico: (empresaId) =>
    db(empresaId).relatorioServico.findMany({
      where: { empresa_id: { in: [A, B] } },
      select: { empresa_id: true },
    }),
};

const semear = async (id: string, nome: string) => {
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, nome],
  );
  await raiz.query(
    `INSERT INTO "usuario" (id, nome, email, papel, empresa_id)
     VALUES ($1, $2, $3, 'dono', $4)`,
    [`u-${id}`, `Dono ${nome}`, `${id}@teste.invalido`, id],
  );
  // Um TipoOperacao por empresa (tarefa 2 do item 2), só o suficiente para
  // provar que a mesma política de isolamento vale para ele — não é a
  // criação real (`criarTiposDeOperacaoIniciais`), que já é testada em
  // `tests/cadastro.test.ts`; aqui o que importa é ter uma linha para
  // tentar vazar. Id gerado aqui, não `gen_random_uuid()` no SQL, porque o
  // `Servico` semeado abaixo referencia esta linha por `VALUES` — nunca por
  // `INSERT ... SELECT ... JOIN`, que grava zero linhas em silêncio se o
  // `JOIN` vier vazio (§3, item 1: teste que passaria de qualquer jeito não
  // prova nada).
  const tipoOperacaoId = randomUUID();
  await raiz.query(
    `INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
     VALUES ($1, $2, 'Frete', 'frete', true, 1)`,
    [tipoOperacaoId, id],
  );
  // Um Cliente por empresa (tarefa 3 do item 2), pela mesma razão do
  // TipoOperacao acima: só o suficiente para ter uma linha para tentar
  // vazar. A regra de negócio (documento, unicidade, arquivamento) é
  // testada em `tests/clientes.test.ts`. Id gerado aqui, mesmo motivo do
  // `tipoOperacaoId`.
  const clienteId = randomUUID();
  await raiz.query(
    `INSERT INTO "cliente" (id, empresa_id, nome)
     VALUES ($1, $2, $3)`,
    [clienteId, id, `Cliente ${nome}`],
  );
  // Um Veiculo por empresa (tarefa 6 do item 2), mesma razão acima. A regra
  // de negócio (apelido ou placa, tipo) é testada em `tests/caminhoes.test.ts`.
  await raiz.query(
    `INSERT INTO "veiculo" (id, empresa_id, apelido)
     VALUES (gen_random_uuid(), $1, $2)`,
    [id, `Caminhão ${nome}`],
  );
  // Um Motorista por empresa (tarefa 7 do item 2), mesma razão acima. A
  // regra de negócio (documento, unicidade, arquivamento, caminhão habitual
  // restrito à própria empresa) é testada em `tests/motoristas.test.ts`.
  await raiz.query(
    `INSERT INTO "motorista" (id, empresa_id, nome)
     VALUES (gen_random_uuid(), $1, $2)`,
    [id, `Motorista ${nome}`],
  );
  // Um Servico por empresa (tarefa 1 do item 3), mesma razão acima. A regra
  // de negócio (as quatro conferências de FK, o contador de número, a
  // resolução de município) é testada em `tests/servicos.test.ts`. Id gerado
  // aqui, não `gen_random_uuid()` no SQL, porque o TituloReceber semeado
  // abaixo referencia esta linha por `VALUES` — nunca por
  // `SELECT ... JOIN`, ver o motivo no comentário do `tipoOperacaoId`.
  const servicoId = randomUUID();
  await raiz.query(
    `INSERT INTO "servico"
       (id, empresa_id, numero, tipo_operacao_id, cliente_id, data_servico,
        valor, criado_por_usuario_id)
     VALUES ($1, $2, 1, $3, $4, now(), 10000, $5)`,
    [servicoId, id, tipoOperacaoId, clienteId, `u-${id}`],
  );
  // Um TituloReceber por empresa (tarefa 3 do item 3), mesma razão acima. A
  // regra de negócio ("Já recebi", as duas conferências de FK, um título por
  // frete) é testada em `tests/titulos.test.ts`. Id gerado aqui, não
  // `gen_random_uuid()` no SQL, porque o Recebimento semeado abaixo
  // referencia esta linha por `VALUES` — mesmo motivo do `tipoOperacaoId`.
  const tituloId = randomUUID();
  await raiz.query(
    `INSERT INTO "titulo_receber" (id, empresa_id, servico_id, cliente_id, valor)
     VALUES ($1, $2, $3, $4, 10000)`,
    [tituloId, id, servicoId, clienteId],
  );
  // Um Recebimento por empresa (item 6, Tarefa 3), mesma razão acima. A
  // regra de negócio (soma nunca passa do valor, conferência de FK de
  // `titulo_id`) é testada em `tests/titulos.test.ts`, bloco "10.
  // registrarRecebimento".
  await raiz.query(
    `INSERT INTO "recebimento" (id, empresa_id, titulo_id, valor, data, usuario_id)
     VALUES (gen_random_uuid(), $1, $2, 10000, now(), $3)`,
    [id, tituloId, `u-${id}`],
  );
  // Uma CobrancaEnviada por empresa (item 6, Tarefa 5), mesma razão acima. A
  // regra de negócio (conferência de FK de `titulo_id`) é testada em
  // `tests/titulos.test.ts`.
  await raiz.query(
    `INSERT INTO "cobranca_enviada" (id, empresa_id, titulo_id, usuario_id, enviado_em)
     VALUES (gen_random_uuid(), $1, $2, $3, now())`,
    [id, tituloId, `u-${id}`],
  );
  // Um Relatorio + uma linha de RelatorioServico por empresa (item 7, Tarefa
  // 1), mesma razão acima. A regra de negócio (as duas conferências de FK,
  // o contador de número) é testada em `tests/relatorios.test.ts`.
  const relatorioId = randomUUID();
  await raiz.query(
    `INSERT INTO "relatorio"
       (id, empresa_id, numero, cliente_id, data_inicial, data_final, valor_total, gerado_em)
     VALUES ($1, $2, 1, $3, now(), now(), 10000, now())`,
    [relatorioId, id, clienteId],
  );
  await raiz.query(
    `INSERT INTO "relatorio_servico" (id, empresa_id, relatorio_id, servico_id, data_servico, valor)
     VALUES (gen_random_uuid(), $1, $2, $3, now(), 10000)`,
    [id, relatorioId, servicoId],
  );
};

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
  await semear(A, "Empresa A");
  await semear(B, "Empresa B");
});

afterAll(async () => {
  // `cliente`, `veiculo`, `motorista`, `tipo_operacao`, `servico`,
  // `titulo_receber`, `recebimento`, `cobranca_enviada`, `relatorio` e
  // `relatorio_servico` são `RESTRICT`/`CASCADE` de propósito
  // (`docs/especificacao.md`, `CLAUDE.md` §7). `cobranca_enviada` e
  // `recebimento` referenciam `titulo_receber` (item 6, Tarefas 3 e 5),
  // então saem primeiro; `relatorio_servico` referencia `relatorio` e
  // `servico` (item 7, Tarefa 1), então sai antes dos dois;
  // `titulo_receber` referencia `servico` e `cliente` (tarefa 3 do item 3),
  // então sai antes deles; `relatorio` referencia `cliente`, então sai
  // antes dele; `servico` referencia os quatro da tarefa 1, então sai antes
  // deles; `motorista` referencia `veiculo` (`veiculo_habitual_id`), então
  // sai antes dele.
  await raiz.query(`DELETE FROM "cobranca_enviada" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "recebimento" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "relatorio_servico" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "titulo_receber" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "relatorio" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "servico" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "motorista" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "cliente" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "veiculo" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "usuario" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "empresa" WHERE id IN ($1,$2)`, [A, B]);
  await raiz.end();
});

describe("1. o contraste — sem a proteção, vaza mesmo", () => {
  it("`postgres` enxerga as duas empresas", async () => {
    // Sem isto, nada abaixo prova coisa alguma: um teste de isolamento que
    // passaria de qualquer jeito não mede nada. Este é o controle.
    const { rows } = await raiz.query(
      `SELECT id FROM "empresa" WHERE id IN ($1,$2)`,
      [A, B],
    );
    expect(rows).toHaveLength(2);
  });
});

describe("2. a empresa A não alcança a empresa B", () => {
  it("listar devolve só a própria empresa", async () => {
    const encontradas = await db(A).empresa.findMany({
      where: { id: { in: [A, B] } },
    });
    expect(encontradas.map((e) => e.id)).toEqual([A]);
  });

  it("pedir a empresa B pelo id devolve nada", async () => {
    expect(await db(A).empresa.findUnique({ where: { id: B } })).toBeNull();
  });

  it("o usuário da empresa B é invisível, inclusive pelo e-mail", async () => {
    const porEmail = await db(A).usuario.findUnique({
      where: { email: `${B}@teste.invalido` },
    });
    // `findUnique` é o caminho que mais escapa de revisão: quem escreve acha
    // que buscar por chave única não precisa de filtro.
    expect(porEmail).toBeNull();
  });

  it("alterar a empresa B não afeta linha nenhuma", async () => {
    const r = await db(A).empresa.updateMany({
      where: { id: B },
      data: { nome_fantasia: "invadida" },
    });
    expect(r.count).toBe(0);
  });

  it("gravar usuário na empresa B é recusado", async () => {
    await expect(
      db(A).usuario.create({
        data: {
          id: `intruso-${marca}`,
          nome: "Intruso",
          email: `intruso-${marca}@teste.invalido`,
          papel: "dono",
          empresa_id: B,
        },
      }),
    ).rejects.toThrow();
  });

  it("a empresa B continua intacta depois de tudo", async () => {
    // Se algum `updateMany` acima tivesse passado, o estrago apareceria aqui.
    const { rows } = await raiz.query(
      `SELECT nome_fantasia FROM "empresa" WHERE id = $1`,
      [B],
    );
    expect(rows[0].nome_fantasia).toBe("Empresa B");
  });
});

describe("3. toda tabela de domínio com `empresa_id` está no laço", () => {
  it("nenhuma ficou de fora sem ser declarada (trava 1)", async () => {
    // Lê o catálogo, não a lista: tabela nova com `empresa_id`, fora de
    // `FORA_DO_LACO` e sem entrada em `TABELAS_DO_LACO`, faz esta comparação
    // divergir — igualdade exata nos dois sentidos, mesmo padrão de
    // `SEM_EMPRESA_ID` em `tests/isolamento/schema.test.ts`.
    const { rows } = await raiz.query<{ nome: string }>(`
      SELECT c.relname AS nome
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
         AND EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'public'
              AND col.table_name = c.relname
              AND col.column_name = 'empresa_id'
         )`);
    const tabelasComEmpresaId = rows.map((r) => r.nome).sort();
    const declaradas = [...Object.keys(TABELAS_DO_LACO), ...FORA_DO_LACO].sort();
    expect(declaradas).toEqual(tabelasComEmpresaId);
  });
});

describe("4. nenhuma tabela do laço vaza, e todas foram semeadas", () => {
  it.each(Object.entries(TABELAS_DO_LACO))(
    "`%s`: a empresa A enxerga só a própria linha, nunca a de B",
    async (_nomeTabela, buscar) => {
      const vistas = await buscar(A);
      const idsDeEmpresa = vistas.map((l) => l.empresa_id);

      // Trava 2 (a semente): sem isto, uma tabela declarada mas esquecida em
      // `semear` devolveria lista vazia aqui, e "zero linhas da empresa B"
      // pareceria prova de isolamento quando na verdade não olhou linha
      // nenhuma — a mesma armadilha que o §3, item 4, do CLAUDE.md nomeia.
      expect(idsDeEmpresa.length).toBeGreaterThan(0);

      // A prova de vazamento em si: toda linha vista pertence à empresa A.
      expect(idsDeEmpresa.every((id) => id === A)).toBe(true);
    },
  );
});

describe("5. concorrência — pedidos simultâneos compartilhando conexão", () => {
  it("nenhum pedido enxerga a empresa do outro", async () => {
    // Isolamento que só funciona com um pedido por vez não é isolamento: em
    // produção nunca é um por vez.
    // Dez, e não vinte: o pool do driver tem dez conexões, e pedir mais do que
    // isso ao mesmo tempo faz a transação estourar o tempo de espera ANTES de
    // qualquer consulta rodar. O teste falharia por esgotamento de pool e
    // pareceria falha de isolamento — medindo o próprio estrago.
    const pedidos = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? A : B));

    const lidos = await Promise.all(
      pedidos.map(async (empresa) => {
        const encontradas = await db(empresa).empresa.findMany({
          where: { id: { in: [A, B] } },
        });
        return { pediu: empresa, viu: encontradas.map((e) => e.id) };
      }),
    );

    expect(lidos).toHaveLength(10);
    for (const { pediu, viu } of lidos) expect(viu).toEqual([pediu]);
  });
});

describe("6. os três jeitos de não ter contexto", () => {
  // A política falha fechada nos três (§9). Aqui a checagem do `lib/db` recusa
  // antes do banco — e é o banco que garante, não ela.
  it.each([
    ["nulo", ""],
    ["string vazia", " "],
    ["valor inválido", "nao-sou-um-identificador"],
  ])("contexto %s é recusado", (_rotulo, valor) => {
    expect(() => db(valor)).toThrow();
  });

  it("sem contexto, o banco devolve zero linhas", async () => {
    const app = new Client({ connectionString: process.env.DATABASE_URL });
    await app.connect();
    try {
      const { rows } = await app.query(`SELECT count(*)::int n FROM "empresa"`);
      expect(rows[0].n).toBe(0);
    } finally {
      await app.end();
    }
  });
});

describe("cobertura", () => {
  it("o teste de concorrência mediu os dois lados", () => {
    // §3, item 4: uma lista que virasse vazia faria os laços acima passarem em
    // silêncio. Esta verificação existe para isso não acontecer sem barulho.
    // Dez, e não vinte: o pool do driver tem dez conexões, e pedir mais do que
    // isso ao mesmo tempo faz a transação estourar o tempo de espera ANTES de
    // qualquer consulta rodar. O teste falharia por esgotamento de pool e
    // pareceria falha de isolamento — medindo o próprio estrago.
    const pedidos = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? A : B));
    expect(new Set(pedidos).size).toBe(2);
    expect(pedidos).toHaveLength(10);
  });
});
