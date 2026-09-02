import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  arquivarDespesa,
  buscarDespesa,
  criarDespesa,
  editarDespesa,
  listarDespesas,
} from "@/lib/servicos/despesas";
import { arquivarCaminhao, criarCaminhao } from "@/lib/servicos/caminhoes";
import { instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";

/**
 * Despesa (item 11): só `data` e `valor` são obrigatórios
 * (`docs/especificacao.md` §4.8); `categoria` é texto livre; `veiculo_id`,
 * quando informado, precisa apontar para um caminhão desta empresa
 * (`CLAUDE.md` §3 — o Postgres não aplica RLS na checagem de FK).
 *
 * O isolamento entre empresas já é coberto de forma genérica por
 * `tests/isolamento/*` e pela extensão de `vazamento.test.ts` para
 * `despesa`. Este arquivo mede a REGRA DE NEGÓCIO: o que a especificação da
 * entidade promete.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 15;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Despesa Teste ${marca} ${sufixo}`],
  );
  empresasParaLimpar.push(id);
  return id;
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "despesa" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "veiculo" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [
      empresasParaLimpar,
    ]);
  }
  await raiz.end();
});

describe("1. só data e valor são obrigatórios", () => {
  it("cria só com data e valor", async () => {
    const empresaId = await criarEmpresaDeTeste("a");
    const d = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 10_000,
    });
    expect(d.valor).toBe(10_000);
    expect(d.categoria).toBeNull();
    expect(d.descricao).toBeNull();
    expect(d.veiculo_id).toBeNull();
    conferencias++;
  });

  it("recusa valor zero ou negativo", async () => {
    const empresaId = await criarEmpresaDeTeste("b");
    await expect(
      criarDespesa(empresaId, { data: instanteDoDiaEmFortaleza("2026-08-05"), valor: 0 }),
    ).rejects.toThrow();
    await expect(
      criarDespesa(empresaId, { data: instanteDoDiaEmFortaleza("2026-08-05"), valor: -100 }),
    ).rejects.toThrow();
    conferencias++;
  });

  it("o `CHECK` da migration recusa valor não positivo, para quem grava por fora do serviço", async () => {
    // A segunda garantia (`docs/especificacao.md`, entidade Despesa, e o
    // comentário do model Despesa em schema.prisma): mesmo passando por cima
    // de `normalizarEntrada`, o banco recusa. Sem este teste, um `CHECK`
    // removido por engano na migration não quebraria nada visível.
    const empresaId = await criarEmpresaDeTeste("c");
    await expect(
      raiz.query(
        `INSERT INTO "despesa" (id, empresa_id, data, valor) VALUES (gen_random_uuid(), $1, now(), 0)`,
        [empresaId],
      ),
    ).rejects.toThrow();
    conferencias++;
  });
});

describe("2. categoria e descrição — texto livre, opcionais", () => {
  it("grava categoria e descrição quando informados, aparados", async () => {
    const empresaId = await criarEmpresaDeTeste("d");
    const d = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 5_000,
      categoria: "  Diesel  ",
      descricao: "  Posto Bandeira  ",
    });
    expect(d.categoria).toBe("Diesel");
    expect(d.descricao).toBe("Posto Bandeira");
    conferencias++;
  });

  it("aceita categoria fora da lista fechada da interface — texto livre no banco", async () => {
    const empresaId = await criarEmpresaDeTeste("e");
    const d = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 5_000,
      categoria: "Seguro",
    });
    expect(d.categoria).toBe("Seguro");
    conferencias++;
  });
});

describe("3. vínculo a caminhão — conferência de posse contra a empresa", () => {
  it("aceita caminhão desta empresa", async () => {
    const empresaId = await criarEmpresaDeTeste("f");
    const caminhao = await criarCaminhao(empresaId, { apelido: "Volvo azul" });
    const d = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 5_000,
      veiculo_id: caminhao.id,
    });
    expect(d.veiculo_id).toBe(caminhao.id);
    conferencias++;
  });

  it("recusa caminhão de outra empresa", async () => {
    const empresaA = await criarEmpresaDeTeste("g1");
    const empresaB = await criarEmpresaDeTeste("g2");
    const caminhaoDeB = await criarCaminhao(empresaB, { apelido: "Só da B" });

    await expect(
      criarDespesa(empresaA, {
        data: instanteDoDiaEmFortaleza("2026-08-05"),
        valor: 5_000,
        veiculo_id: caminhaoDeB.id,
      }),
    ).rejects.toThrow();
    conferencias++;
  });

  it("continua aceito com o caminhão já arquivado — vínculo existente não pode sumir", async () => {
    const empresaId = await criarEmpresaDeTeste("h");
    const caminhao = await criarCaminhao(empresaId, { apelido: "Vai arquivar" });
    const d = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 5_000,
      veiculo_id: caminhao.id,
    });
    await arquivarCaminhao(empresaId, caminhao.id);

    const editado = await editarDespesa(empresaId, d.id, {
      data: instanteDoDiaEmFortaleza("2026-08-06"),
      valor: 6_000,
      veiculo_id: caminhao.id,
    });
    expect(editado.veiculo_id).toBe(caminhao.id);
    conferencias++;
  });
});

describe("4. listar, buscar, editar e arquivar", () => {
  it("lista só as não arquivadas, mais recente por data primeiro", async () => {
    const empresaId = await criarEmpresaDeTeste("i");
    const antiga = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-01"),
      valor: 1_000,
    });
    const recente = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-10"),
      valor: 2_000,
    });
    const arquivada = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-15"),
      valor: 3_000,
    });
    await arquivarDespesa(empresaId, arquivada.id);

    const lista = await listarDespesas(empresaId);
    expect(lista.map((d) => d.id)).toEqual([recente.id, antiga.id]);
    conferencias++;
  });

  it("editar troca os dados", async () => {
    const empresaId = await criarEmpresaDeTeste("j");
    const criada = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 1_000,
    });
    const editada = await editarDespesa(empresaId, criada.id, {
      data: instanteDoDiaEmFortaleza("2026-08-06"),
      valor: 2_000,
      categoria: "Pedágio",
    });
    expect(editada).toMatchObject({ valor: 2_000, categoria: "Pedágio" });

    const buscada = await buscarDespesa(empresaId, criada.id);
    expect(buscada?.valor).toBe(2_000);
    conferencias++;
  });

  it("arquivar some da lista sem apagar a linha", async () => {
    const empresaId = await criarEmpresaDeTeste("k");
    const criada = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 1_000,
    });
    await arquivarDespesa(empresaId, criada.id);

    expect(await listarDespesas(empresaId)).toEqual([]);
    const buscada = await buscarDespesa(empresaId, criada.id);
    expect(buscada?.arquivado_em).not.toBeNull();
    conferencias++;
  });

  it("isolamento: empresa A não busca nem lista a despesa da empresa B", async () => {
    const empresaA = await criarEmpresaDeTeste("l1");
    const empresaB = await criarEmpresaDeTeste("l2");
    const daB = await criarDespesa(empresaB, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 1_000,
    });

    expect(await buscarDespesa(empresaA, daB.id)).toBeNull();
    expect(await listarDespesas(empresaA)).toEqual([]);
    conferencias++;
  });
});

describe("5. listarDespesas — filtro de período, categoria e limite", () => {
  it("filtra por período", async () => {
    const empresaId = await criarEmpresaDeTeste("m");
    const dentro = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-10"),
      valor: 1_000,
    });
    await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-07-10"),
      valor: 1_000,
    });

    const lista = await listarDespesas(empresaId, {
      periodo: {
        inicio: instanteDoDiaEmFortaleza("2026-08-01"),
        fim: instanteDoDiaEmFortaleza("2026-08-31"),
      },
    });
    expect(lista.map((d) => d.id)).toEqual([dentro.id]);
    conferencias++;
  });

  it("filtra por categoria", async () => {
    const empresaId = await criarEmpresaDeTeste("n");
    const deDiesel = await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-05"),
      valor: 1_000,
      categoria: "Diesel",
    });
    await criarDespesa(empresaId, {
      data: instanteDoDiaEmFortaleza("2026-08-06"),
      valor: 1_000,
      categoria: "Pedágio",
    });

    const lista = await listarDespesas(empresaId, { categoria: "Diesel" });
    expect(lista.map((d) => d.id)).toEqual([deDiesel.id]);
    conferencias++;
  });

  it("limite corta a lista", async () => {
    const empresaId = await criarEmpresaDeTeste("o");
    for (let i = 0; i < 3; i++) {
      await criarDespesa(empresaId, {
        data: instanteDoDiaEmFortaleza("2026-08-0" + (i + 1)),
        valor: 1_000,
      });
    }
    const lista = await listarDespesas(empresaId, { limite: 2 });
    expect(lista).toHaveLength(2);
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
