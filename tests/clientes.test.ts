import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { cpf, cnpj } from "cpf-cnpj-validator";
import {
  listarClientes,
  buscarCliente,
  criarCliente,
  editarCliente,
  arquivarCliente,
} from "@/lib/servicos/clientes";

/**
 * Cliente (tarefa 3 do item 2): nome obrigatório, documento validado e único
 * por empresa entre os não arquivados, prazo herdado nulo por padrão.
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) já é coberto de forma genérica por `tests/isolamento/*` e
 * pela extensão de `vazamento.test.ts` para `cliente`. Este arquivo mede a
 * REGRA DE NEGÓCIO: o que a especificação da entidade promete.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 13;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Cliente Teste ${marca} ${sufixo}`],
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
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [
      empresasParaLimpar,
    ]);
  }
  await raiz.end();
});

describe("1. só `nome` é obrigatório", () => {
  it("cria com só o nome — documento e prazo ficam nulos, nunca ''", async () => {
    const empresaId = await criarEmpresaDeTeste("a");
    const c = await criarCliente(empresaId, { nome: "  Fulano de Tal  " });
    expect(c.nome).toBe("Fulano de Tal");
    expect(c.documento).toBeNull();
    expect(c.prazo_pagamento_dias).toBeNull();
    conferencias++;
  });

  it("recusa nome vazio (só espaço)", async () => {
    const empresaId = await criarEmpresaDeTeste("b");
    await expect(criarCliente(empresaId, { nome: "   " })).rejects.toThrow();
    conferencias++;
  });

  it("prazo_pagamento_dias aceita valor explícito", async () => {
    const empresaId = await criarEmpresaDeTeste("c");
    const c = await criarCliente(empresaId, { nome: "Com prazo", prazo_pagamento_dias: 30 });
    expect(c.prazo_pagamento_dias).toBe(30);
    conferencias++;
  });
});

describe("2. documento — formato, dígito verificador e normalização", () => {
  it("aceita CPF válido e normaliza sem pontuação, maiúsculo", async () => {
    const empresaId = await criarEmpresaDeTeste("d");
    const bruto = cpf.generate(true); // formatado, com máscara
    const c = await criarCliente(empresaId, { nome: "CPF válido", documento: bruto });
    expect(c.documento).toBe(cpf.strip(bruto));
    expect(c.documento).toMatch(/^[0-9]{11}$/);
    conferencias++;
  });

  it("aceita CNPJ alfanumérico válido (Nota Técnica RFB 49/2024)", async () => {
    const empresaId = await criarEmpresaDeTeste("e");
    const bruto = cnpj.generate({ formatted: true });
    const c = await criarCliente(empresaId, { nome: "CNPJ válido", documento: bruto });
    expect(c.documento).toBe(cnpj.strip(bruto));
    expect(c.documento).toMatch(/^[0-9A-Z]{12}[0-9]{2}$/);
    conferencias++;
  });

  it("recusa CPF com dígito verificador errado", async () => {
    const empresaId = await criarEmpresaDeTeste("f");
    const invalido = comDigitoErrado(cpf.generate());
    await expect(
      criarCliente(empresaId, { nome: "CPF inválido", documento: invalido }),
    ).rejects.toThrow();
    conferencias++;
  });

  it("recusa CNPJ com dígito verificador errado", async () => {
    const empresaId = await criarEmpresaDeTeste("g");
    const invalido = comDigitoErrado(cnpj.generate());
    await expect(
      criarCliente(empresaId, { nome: "CNPJ inválido", documento: invalido }),
    ).rejects.toThrow();
    conferencias++;
  });
});

describe("3. único por empresa, só entre os não arquivados", () => {
  it("duas empresas podem ter o mesmo documento", async () => {
    const documento = cpf.generate();
    const empresaA = await criarEmpresaDeTeste("h1");
    const empresaB = await criarEmpresaDeTeste("h2");
    await expect(
      criarCliente(empresaA, { nome: "Cliente A", documento }),
    ).resolves.toMatchObject({ documento });
    await expect(
      criarCliente(empresaB, { nome: "Cliente B", documento }),
    ).resolves.toMatchObject({ documento });
    conferencias++;
  });

  it("a mesma empresa não pode duplicar — nem com máscara diferente", async () => {
    const empresaId = await criarEmpresaDeTeste("i");
    const documento = cpf.generate();
    await criarCliente(empresaId, { nome: "Primeiro", documento });
    await expect(
      criarCliente(empresaId, { nome: "Segundo", documento: cpf.format(documento) }),
    ).rejects.toThrow("Já existe um cliente com esse documento.");
    conferencias++;
  });

  it("arquivar libera o documento para outro cadastro", async () => {
    const empresaId = await criarEmpresaDeTeste("j");
    const documento = cpf.generate();
    const primeiro = await criarCliente(empresaId, { nome: "Vai arquivar", documento });

    await arquivarCliente(empresaId, primeiro.id);

    await expect(
      criarCliente(empresaId, { nome: "Recadastro", documento }),
    ).resolves.toMatchObject({ documento });
    conferencias++;
  });
});

describe("4. listar, buscar e editar", () => {
  it("lista só os não arquivados, mais recente primeiro", async () => {
    const empresaId = await criarEmpresaDeTeste("k");
    const antigo = await criarCliente(empresaId, { nome: "Antigo" });
    const recente = await criarCliente(empresaId, { nome: "Recente" });
    const arquivado = await criarCliente(empresaId, { nome: "Arquivado" });
    await arquivarCliente(empresaId, arquivado.id);

    const lista = await listarClientes(empresaId);
    expect(lista.map((c) => c.id)).toEqual([recente.id, antigo.id]);
    conferencias++;
  });

  it("editar troca os dados", async () => {
    const empresaId = await criarEmpresaDeTeste("l");
    const criado = await criarCliente(empresaId, { nome: "Nome velho" });
    const editado = await editarCliente(empresaId, criado.id, {
      nome: "Nome novo",
      telefone: "85999999999",
    });
    expect(editado).toMatchObject({ nome: "Nome novo", telefone: "85999999999" });

    const buscado = await buscarCliente(empresaId, criado.id);
    expect(buscado?.nome).toBe("Nome novo");
    conferencias++;
  });

  it("isolamento: empresa A não busca nem lista o cliente da empresa B", async () => {
    const empresaA = await criarEmpresaDeTeste("m1");
    const empresaB = await criarEmpresaDeTeste("m2");
    const daB = await criarCliente(empresaB, { nome: "Só da B" });

    expect(await buscarCliente(empresaA, daB.id)).toBeNull();
    expect(await listarClientes(empresaA)).toEqual([]);
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
