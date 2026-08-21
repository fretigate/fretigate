import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  listarCaminhoes,
  buscarCaminhao,
  buscarCaminhoesPorIds,
  criarCaminhao,
  editarCaminhao,
  arquivarCaminhao,
} from "@/lib/servicos/caminhoes";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";

/**
 * Caminhão (tarefa 6 do item 2): só apelido ou placa é obrigatório, tipo é
 * chip opcional entre cinco valores, sem `ativo` nem `ano`.
 *
 * O isolamento entre empresas já é coberto de forma genérica por
 * `tests/isolamento/*` e pela extensão de `vazamento.test.ts` para `veiculo`.
 * Este arquivo mede a REGRA DE NEGÓCIO: o que a especificação da entidade
 * promete.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 14;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Caminhão Teste ${marca} ${sufixo}`],
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
    await raiz.query(`DELETE FROM "veiculo" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [
      empresasParaLimpar,
    ]);
  }
  await raiz.end();
});

describe("1. só apelido ou placa é obrigatório", () => {
  it("cria só com apelido", async () => {
    const empresaId = await criarEmpresaDeTeste("a");
    const c = await criarCaminhao(empresaId, { apelido: "  Volvo azul  " });
    expect(c.apelido).toBe("Volvo azul");
    expect(c.placa).toBeNull();
    conferencias++;
  });

  it("cria só com placa", async () => {
    const empresaId = await criarEmpresaDeTeste("b");
    const c = await criarCaminhao(empresaId, { placa: "ABC-1D23" });
    expect(c.placa).toBe("ABC-1D23");
    expect(c.apelido).toBeNull();
    conferencias++;
  });

  it("recusa sem nenhum dos dois (só espaço)", async () => {
    const empresaId = await criarEmpresaDeTeste("c");
    await expect(
      criarCaminhao(empresaId, { apelido: "   ", placa: "  " }),
    ).rejects.toThrow();
    conferencias++;
  });

  it("o `CHECK` da migration recusa de novo, para quem grava por fora do serviço", async () => {
    // A segunda garantia (`docs/especificacao.md`, entidade Veiculo, e o
    // comentário do model Veiculo em schema.prisma): mesmo passando por cima
    // de `normalizarEntrada`, o banco recusa. Sem este teste, um `CHECK`
    // removido por engano na migration não quebraria nada visível.
    const empresaId = await criarEmpresaDeTeste("d");
    await expect(
      raiz.query(
        `INSERT INTO "veiculo" (id, empresa_id) VALUES (gen_random_uuid(), $1)`,
        [empresaId],
      ),
    ).rejects.toThrow();
    conferencias++;
  });
});

describe("2. tipo — chip opcional entre cinco valores", () => {
  it("cria sem tipo — fica nulo", async () => {
    const empresaId = await criarEmpresaDeTeste("e");
    const c = await criarCaminhao(empresaId, { apelido: "Sem tipo" });
    expect(c.tipo).toBeNull();
    conferencias++;
  });

  it("a lista tem exatamente os cinco valores decididos", () => {
    expect(TIPOS_VEICULO.map((t) => t.valor).sort()).toEqual(
      ["bitrem", "bitruck", "carreta", "toco", "truck"].sort(),
    );
    conferencias++;
  });

  it("aceita cada um dos cinco valores", async () => {
    for (const { valor } of TIPOS_VEICULO) {
      const empresaId = await criarEmpresaDeTeste(`f-${valor}`);
      const c = await criarCaminhao(empresaId, { apelido: valor, tipo: valor });
      expect(c.tipo).toBe(valor);
    }
    conferencias++;
  });
});

describe("3. listar, buscar, editar e arquivar", () => {
  it("lista só os não arquivados, mais recente primeiro", async () => {
    const empresaId = await criarEmpresaDeTeste("g");
    const antigo = await criarCaminhao(empresaId, { apelido: "Antigo" });
    const recente = await criarCaminhao(empresaId, { apelido: "Recente" });
    const arquivado = await criarCaminhao(empresaId, { apelido: "Arquivado" });
    await arquivarCaminhao(empresaId, arquivado.id);

    const lista = await listarCaminhoes(empresaId);
    expect(lista.map((c) => c.id)).toEqual([recente.id, antigo.id]);
    conferencias++;
  });

  it("editar troca os dados", async () => {
    const empresaId = await criarEmpresaDeTeste("h");
    const criado = await criarCaminhao(empresaId, { apelido: "Nome velho" });
    const editado = await editarCaminhao(empresaId, criado.id, {
      apelido: "Nome novo",
      placa: "XYZ-9K12",
    });
    expect(editado).toMatchObject({ apelido: "Nome novo", placa: "XYZ-9K12" });

    const buscado = await buscarCaminhao(empresaId, criado.id);
    expect(buscado?.apelido).toBe("Nome novo");
    conferencias++;
  });

  it("arquivar some da lista sem apagar a linha", async () => {
    const empresaId = await criarEmpresaDeTeste("i");
    const criado = await criarCaminhao(empresaId, { apelido: "Vai arquivar" });
    await arquivarCaminhao(empresaId, criado.id);

    expect(await listarCaminhoes(empresaId)).toEqual([]);
    const buscado = await buscarCaminhao(empresaId, criado.id);
    expect(buscado?.arquivado_em).not.toBeNull();
    conferencias++;
  });

  it("isolamento: empresa A não busca nem lista o caminhão da empresa B", async () => {
    const empresaA = await criarEmpresaDeTeste("j1");
    const empresaB = await criarEmpresaDeTeste("j2");
    const daB = await criarCaminhao(empresaB, { apelido: "Só da B" });

    expect(await buscarCaminhao(empresaA, daB.id)).toBeNull();
    expect(await listarCaminhoes(empresaA)).toEqual([]);
    conferencias++;
  });
});

describe("4. buscarCaminhoesPorIds — para \"Meus fretes\" (item 4), inclui arquivado", () => {
  it("acha ativo e arquivado juntos, numa lista de ids", async () => {
    const empresaId = await criarEmpresaDeTeste("k1");
    const ativo = await criarCaminhao(empresaId, { apelido: "Ativo" });
    const arquivado = await criarCaminhao(empresaId, { apelido: "Arquivado" });
    await arquivarCaminhao(empresaId, arquivado.id);

    const encontrados = await buscarCaminhoesPorIds(empresaId, [ativo.id, arquivado.id]);
    expect(encontrados.map((c) => c.apelido).sort()).toEqual(["Arquivado", "Ativo"]);
    conferencias++;
  });

  it("lista vazia de ids não vai ao banco e devolve vazio", async () => {
    const empresaId = await criarEmpresaDeTeste("k2");
    expect(await buscarCaminhoesPorIds(empresaId, [])).toEqual([]);
    conferencias++;
  });

  it("isolamento: não acha caminhão de outra empresa, mesmo com id real", async () => {
    const empresaA = await criarEmpresaDeTeste("k3a");
    const empresaB = await criarEmpresaDeTeste("k3b");
    const daB = await criarCaminhao(empresaB, { apelido: "Só da B" });

    expect(await buscarCaminhoesPorIds(empresaA, [daB.id])).toEqual([]);
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
