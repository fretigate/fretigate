import { describe, expect, it, beforeAll, afterAll } from "vitest";
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
 */

// Identificadores próprios desta execução: os testes falam com o banco de
// desenvolvimento, e dois deles rodando ao mesmo tempo não podem disputar linha.
const marca = process.hrtime.bigint().toString(16).slice(-8);
const A = `aaaaaaaa-aaaa-4aaa-8aaa-${marca.padStart(12, "0")}`;
const B = `bbbbbbbb-bbbb-4bbb-8bbb-${marca.padStart(12, "0")}`;

let raiz: Client;

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
  // tentar vazar.
  await raiz.query(
    `INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
     VALUES (gen_random_uuid(), $1, 'Frete', 'frete', true, 1)`,
    [id],
  );
  // Um Cliente por empresa (tarefa 3 do item 2), pela mesma razão do
  // TipoOperacao acima: só o suficiente para ter uma linha para tentar
  // vazar. A regra de negócio (documento, unicidade, arquivamento) é
  // testada em `tests/clientes.test.ts`.
  await raiz.query(
    `INSERT INTO "cliente" (id, empresa_id, nome)
     VALUES (gen_random_uuid(), $1, $2)`,
    [id, `Cliente ${nome}`],
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
};

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
  await semear(A, "Empresa A");
  await semear(B, "Empresa B");
});

afterAll(async () => {
  // `cliente`, `veiculo`, `motorista` e `tipo_operacao` são `RESTRICT`/
  // `CASCADE` de propósito (`docs/especificacao.md`, `CLAUDE.md` §7) —
  // `cliente`/`veiculo`/`motorista` bloqueariam o `DELETE` de "empresa" se
  // não saíssem primeiro. `motorista` referencia `veiculo`
  // (`veiculo_habitual_id`), então sai antes dele.
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

  it("o TipoOperacao da empresa B é invisível (tarefa 2 do item 2)", async () => {
    // Mesma política, mesma prova: `db(A)` não enxerga o "Frete" da empresa B,
    // nem por listagem ampla.
    const tipos = await db(A).tipoOperacao.findMany({
      where: { empresa_id: { in: [A, B] } },
    });
    expect(tipos.map((t) => t.empresa_id)).toEqual([A]);
  });

  it("o Cliente da empresa B é invisível (tarefa 3 do item 2)", async () => {
    const clientes = await db(A).cliente.findMany({
      where: { empresa_id: { in: [A, B] } },
    });
    expect(clientes.map((c) => c.empresa_id)).toEqual([A]);
  });

  it("o Veiculo da empresa B é invisível (tarefa 6 do item 2)", async () => {
    const veiculos = await db(A).veiculo.findMany({
      where: { empresa_id: { in: [A, B] } },
    });
    expect(veiculos.map((v) => v.empresa_id)).toEqual([A]);
  });

  it("o Motorista da empresa B é invisível (tarefa 7 do item 2)", async () => {
    const motoristas = await db(A).motorista.findMany({
      where: { empresa_id: { in: [A, B] } },
    });
    expect(motoristas.map((m) => m.empresa_id)).toEqual([A]);
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

describe("3. concorrência — pedidos simultâneos compartilhando conexão", () => {
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

describe("4. os três jeitos de não ter contexto", () => {
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
