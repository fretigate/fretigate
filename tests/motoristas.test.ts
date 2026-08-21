import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { cpf, cnpj } from "cpf-cnpj-validator";
import {
  listarMotoristas,
  buscarMotorista,
  buscarMotoristasPorIds,
  criarMotorista,
  editarMotorista,
  arquivarMotorista,
} from "@/lib/servicos/motoristas";
import { criarCaminhao } from "@/lib/servicos/caminhoes";

/**
 * Motorista (tarefa 7 do item 2): nome obrigatório, documento validado e
 * único por empresa entre os não arquivados (mesma regra de `Cliente`), e
 * caminhão habitual restrito à própria empresa.
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) já é coberto de forma genérica por `tests/isolamento/*` e
 * pela extensão de `vazamento.test.ts` para `motorista`. Este arquivo mede a
 * REGRA DE NEGÓCIO: o que a especificação da entidade promete — e a
 * conferência de integridade referencial exigida pelo `CLAUDE.md` §3, que as
 * camadas de isolamento não cobrem.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 18;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Motorista Teste ${marca} ${sufixo}`],
  );
  empresasParaLimpar.push(id);
  return id;
}

/** Dígito verificador errado, de propósito — para provar que a validação recusa. */
function comDigitoErrado(documento: string): string {
  const ultimo = documento.at(-1)!;
  const trocado = String((Number(ultimo) + 1) % 10);
  return documento.slice(0, -1) + trocado;
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    // `motorista` referencia `veiculo` — sai primeiro, senão o `DELETE` de
    // "veiculo" esbarraria na referência (`ON DELETE RESTRICT`).
    await raiz.query(`DELETE FROM "motorista" WHERE empresa_id = ANY($1)`, [
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

describe("1. só `nome` é obrigatório", () => {
  it("cria com só o nome — documento e caminhão habitual ficam nulos", async () => {
    const empresaId = await criarEmpresaDeTeste("a");
    const m = await criarMotorista(empresaId, { nome: "  Fulano de Tal  " });
    expect(m.nome).toBe("Fulano de Tal");
    expect(m.documento).toBeNull();
    expect(m.veiculo_habitual_id).toBeNull();
    conferencias++;
  });

  it("recusa nome vazio (só espaço)", async () => {
    const empresaId = await criarEmpresaDeTeste("b");
    await expect(criarMotorista(empresaId, { nome: "   " })).rejects.toThrow();
    conferencias++;
  });
});

describe("2. documento — mesma regra de Cliente", () => {
  it("aceita CPF válido e normaliza sem pontuação", async () => {
    const empresaId = await criarEmpresaDeTeste("c");
    const bruto = cpf.generate(true);
    const m = await criarMotorista(empresaId, { nome: "CPF válido", documento: bruto });
    expect(m.documento).toBe(cpf.strip(bruto));
    conferencias++;
  });

  it("aceita CNPJ alfanumérico válido", async () => {
    const empresaId = await criarEmpresaDeTeste("d");
    const bruto = cnpj.generate({ formatted: true });
    const m = await criarMotorista(empresaId, { nome: "CNPJ válido", documento: bruto });
    expect(m.documento).toBe(cnpj.strip(bruto));
    conferencias++;
  });

  it("recusa CPF com dígito verificador errado", async () => {
    const empresaId = await criarEmpresaDeTeste("e");
    const invalido = comDigitoErrado(cpf.generate());
    await expect(
      criarMotorista(empresaId, { nome: "CPF inválido", documento: invalido }),
    ).rejects.toThrow();
    conferencias++;
  });

  it("recusa CNPJ com dígito verificador errado", async () => {
    const empresaId = await criarEmpresaDeTeste("f");
    const invalido = comDigitoErrado(cnpj.generate());
    await expect(
      criarMotorista(empresaId, { nome: "CNPJ inválido", documento: invalido }),
    ).rejects.toThrow();
    conferencias++;
  });
});

describe("3. único por empresa, só entre os não arquivados", () => {
  it("duas empresas podem ter o mesmo documento", async () => {
    const documento = cpf.generate();
    const empresaA = await criarEmpresaDeTeste("g1");
    const empresaB = await criarEmpresaDeTeste("g2");
    await expect(
      criarMotorista(empresaA, { nome: "Motorista A", documento }),
    ).resolves.toMatchObject({ documento });
    await expect(
      criarMotorista(empresaB, { nome: "Motorista B", documento }),
    ).resolves.toMatchObject({ documento });
    conferencias++;
  });

  it("a mesma empresa não pode duplicar — nem com máscara diferente", async () => {
    const empresaId = await criarEmpresaDeTeste("h");
    const documento = cpf.generate();
    await criarMotorista(empresaId, { nome: "Primeiro", documento });
    await expect(
      criarMotorista(empresaId, { nome: "Segundo", documento: cpf.format(documento) }),
    ).rejects.toThrow("Já existe um motorista com esse documento.");
    conferencias++;
  });

  it("arquivar libera o documento para outro cadastro", async () => {
    const empresaId = await criarEmpresaDeTeste("i");
    const documento = cpf.generate();
    const primeiro = await criarMotorista(empresaId, { nome: "Vai arquivar", documento });

    await arquivarMotorista(empresaId, primeiro.id);

    await expect(
      criarMotorista(empresaId, { nome: "Recadastro", documento }),
    ).resolves.toMatchObject({ documento });
    conferencias++;
  });
});

describe("4. caminhão habitual — RLS não cobre chave estrangeira (CLAUDE.md §3)", () => {
  it("aceita um caminhão da própria empresa", async () => {
    const empresaId = await criarEmpresaDeTeste("j");
    const caminhao = await criarCaminhao(empresaId, { apelido: "Caminhão da casa" });
    const m = await criarMotorista(empresaId, {
      nome: "Com caminhão",
      veiculo_habitual_id: caminhao.id,
    });
    expect(m.veiculo_habitual_id).toBe(caminhao.id);
    conferencias++;
  });

  it("recusa caminhão de outra empresa — sem isto, o vínculo gravaria por fora do RLS", async () => {
    const empresaA = await criarEmpresaDeTeste("k1");
    const empresaB = await criarEmpresaDeTeste("k2");
    const caminhaoDaB = await criarCaminhao(empresaB, { apelido: "Só da B" });

    await expect(
      criarMotorista(empresaA, {
        nome: "Tentando roubar caminhão",
        veiculo_habitual_id: caminhaoDaB.id,
      }),
    ).rejects.toThrow("Selecione um caminhão válido.");
    conferencias++;
  });

  it("sem caminhão informado, fica nulo", async () => {
    const empresaId = await criarEmpresaDeTeste("l");
    const m = await criarMotorista(empresaId, { nome: "Sem caminhão" });
    expect(m.veiculo_habitual_id).toBeNull();
    conferencias++;
  });
});

describe("5. listar, buscar, editar e isolamento", () => {
  it("lista só os não arquivados, mais recente primeiro", async () => {
    const empresaId = await criarEmpresaDeTeste("m");
    const antigo = await criarMotorista(empresaId, { nome: "Antigo" });
    const recente = await criarMotorista(empresaId, { nome: "Recente" });
    const arquivado = await criarMotorista(empresaId, { nome: "Arquivado" });
    await arquivarMotorista(empresaId, arquivado.id);

    const lista = await listarMotoristas(empresaId);
    expect(lista.map((m) => m.id)).toEqual([recente.id, antigo.id]);
    conferencias++;
  });

  it("editar troca os dados", async () => {
    const empresaId = await criarEmpresaDeTeste("n");
    const criado = await criarMotorista(empresaId, { nome: "Nome velho" });
    const editado = await editarMotorista(empresaId, criado.id, {
      nome: "Nome novo",
      telefone: "85999999999",
    });
    expect(editado).toMatchObject({ nome: "Nome novo", telefone: "85999999999" });

    const buscado = await buscarMotorista(empresaId, criado.id);
    expect(buscado?.nome).toBe("Nome novo");
    conferencias++;
  });

  it("isolamento: empresa A não busca nem lista o motorista da empresa B", async () => {
    const empresaA = await criarEmpresaDeTeste("o1");
    const empresaB = await criarEmpresaDeTeste("o2");
    const daB = await criarMotorista(empresaB, { nome: "Só da B" });

    expect(await buscarMotorista(empresaA, daB.id)).toBeNull();
    expect(await listarMotoristas(empresaA)).toEqual([]);
    conferencias++;
  });
});

describe("6. buscarMotoristasPorIds — para \"Meus fretes\" (item 4), inclui arquivado", () => {
  it("acha ativo e arquivado juntos, numa lista de ids", async () => {
    const empresaId = await criarEmpresaDeTeste("p1");
    const ativo = await criarMotorista(empresaId, { nome: "Ativo" });
    const arquivado = await criarMotorista(empresaId, { nome: "Arquivado" });
    await arquivarMotorista(empresaId, arquivado.id);

    const encontrados = await buscarMotoristasPorIds(empresaId, [ativo.id, arquivado.id]);
    expect(encontrados.map((m) => m.nome).sort()).toEqual(["Arquivado", "Ativo"]);
    conferencias++;
  });

  it("lista vazia de ids não vai ao banco e devolve vazio", async () => {
    const empresaId = await criarEmpresaDeTeste("p2");
    expect(await buscarMotoristasPorIds(empresaId, [])).toEqual([]);
    conferencias++;
  });

  it("isolamento: não acha motorista de outra empresa, mesmo com id real", async () => {
    const empresaA = await criarEmpresaDeTeste("p3a");
    const empresaB = await criarEmpresaDeTeste("p3b");
    const daB = await criarMotorista(empresaB, { nome: "Só da B" });

    expect(await buscarMotoristasPorIds(empresaA, [daB.id])).toEqual([]);
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
