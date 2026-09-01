import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { cnpj } from "cpf-cnpj-validator";
import { buscarEmpresa, atualizarContaDaEmpresa, atualizarConfiguracoes } from "@/lib/servicos/empresas";

/**
 * Empresa (item 10, Tarefa 1): leitura completa, Conta da empresa (CNPJ
 * validado, resto texto livre) e Configurações (pátio, prazo padrão, o piso
 * da numeração do relatório — decisão 5 do plano).
 *
 * O isolamento entre empresas já é coberto de forma genérica por
 * `tests/isolamento/*`. Este arquivo mede a REGRA DE NEGÓCIO.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

/** Fortaleza/CE — codigo_ibge fixo, mesmo usado em `tests/servicos.test.ts` para resolução sem ambiguidade. */
const FORTALEZA = 2304400;

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 20;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Empresa Teste ${marca} ${sufixo}`],
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
  const { rows } = await raiz.query(
    `SELECT 1 FROM "municipio" WHERE codigo_ibge = $1`,
    [FORTALEZA],
  );
  if (!rows[0]) throw new Error("Seed de municípios ausente — rode `npm run seed:municipios`.");
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("1. buscarEmpresa", () => {
  it("devolve os campos recém-criados, resto nulo/padrão", async () => {
    const empresaId = await criarEmpresaDeTeste("a");
    const empresa = await buscarEmpresa(empresaId);
    expect(empresa?.cnpj).toBeNull();
    expect(empresa?.patio_endereco).toBeNull();
    expect(empresa?.prazo_padrao_dias).toBe(15);
    expect(empresa?.proximo_numero_relatorio).toBe(1);
    conferencias++;
  });
});

describe("2. atualizarContaDaEmpresa", () => {
  it("grava razão social, endereço, telefone, e-mail, chave Pix e logo", async () => {
    const empresaId = await criarEmpresaDeTeste("b");
    const conta = await atualizarContaDaEmpresa(empresaId, {
      razaoSocial: "  Transportes Teste LTDA  ",
      endereco: "Rua Teste, 123",
      telefone: "8599999999",
      email: "contato@teste.invalido",
      chavePix: "chave-pix-teste",
      logoUrl: "https://storage.teste.invalido/logo.jpg",
    });
    expect(conta.razao_social).toBe("Transportes Teste LTDA");
    expect(conta.endereco).toBe("Rua Teste, 123");
    expect(conta.chave_pix).toBe("chave-pix-teste");
    expect(conta.logo_url).toBe("https://storage.teste.invalido/logo.jpg");
    conferencias++;
  });

  it("aceita CNPJ válido e normaliza sem pontuação, maiúsculo", async () => {
    const empresaId = await criarEmpresaDeTeste("c");
    const bruto = cnpj.generate(true); // formatado, com máscara
    const conta = await atualizarContaDaEmpresa(empresaId, { cnpj: bruto });
    expect(conta.cnpj).toBe(cnpj.strip(bruto));
    expect(conta.cnpj).toMatch(/^[0-9A-Z]{14}$/);
    conferencias++;
  });

  it("recusa CNPJ com dígito verificador errado", async () => {
    const empresaId = await criarEmpresaDeTeste("d");
    const invalido = comDigitoErrado(cnpj.strip(cnpj.generate(true)));
    await expect(atualizarContaDaEmpresa(empresaId, { cnpj: invalido })).rejects.toThrow(
      "CNPJ inválido.",
    );
    conferencias++;
  });

  it("recusa CPF no campo de CNPJ — Empresa é sempre pessoa jurídica", async () => {
    const empresaId = await criarEmpresaDeTeste("e");
    await expect(
      atualizarContaDaEmpresa(empresaId, { cnpj: "12345678901" }),
    ).rejects.toThrow("CNPJ inválido.");
    conferencias++;
  });

  it("campo vazio grava nulo, nunca string vazia", async () => {
    const empresaId = await criarEmpresaDeTeste("f");
    await atualizarContaDaEmpresa(empresaId, { razaoSocial: "Antes" });
    const conta = await atualizarContaDaEmpresa(empresaId, { razaoSocial: "   " });
    expect(conta.razao_social).toBeNull();
    conferencias++;
  });

  it("campo omitido não é tocado — só o que foi passado muda", async () => {
    const empresaId = await criarEmpresaDeTeste("m");
    await atualizarContaDaEmpresa(empresaId, { razaoSocial: "Fica intacta", telefone: "8599999999" });
    const conta = await atualizarContaDaEmpresa(empresaId, { chavePix: "só a chave" });
    expect(conta.razao_social).toBe("Fica intacta");
    expect(conta.telefone).toBe("8599999999");
    expect(conta.chave_pix).toBe("só a chave");
    conferencias++;
  });

  it("CNPJ duplicado nunca sobe o erro cru do banco", async () => {
    const empresaUm = await criarEmpresaDeTeste("n");
    const empresaDois = await criarEmpresaDeTeste("o");
    const bruto = cnpj.generate(true);
    await atualizarContaDaEmpresa(empresaUm, { cnpj: bruto });
    await expect(atualizarContaDaEmpresa(empresaDois, { cnpj: bruto })).rejects.toThrow(
      "Já existe uma conta com esse CNPJ.",
    );
    conferencias++;
  });
});

describe("3. atualizarConfiguracoes", () => {
  it("grava pátio (endereço, com município resolvido do próprio texto) e prazo padrão", async () => {
    const empresaId = await criarEmpresaDeTeste("g");
    const config = await atualizarConfiguracoes(empresaId, {
      patioEndereco: "Fortaleza",
      prazoPadraoDias: 30,
    });
    expect(config.patio_endereco).toBe("Fortaleza");
    // Nunca entrada externa — nasce só de resolverMunicipio rodando sobre o
    // próprio patioEndereco (item 10, Tarefa 3, decisão do fundador).
    expect(config.patio_municipio_id).toBe(FORTALEZA);
    expect(config.prazo_padrao_dias).toBe(30);
    conferencias++;
  });

  it("pátio com texto ambíguo grava o texto e não chuta um município", async () => {
    // "Bom Jesus" existe em PI, RN, PB, SC e RS — mesmo caso de
    // `tests/municipios.test.ts`. Nunca bloqueia o salvar (`docs/
    // especificacao.md` §6), mas também nunca resolve para um dos vários.
    const empresaId = await criarEmpresaDeTeste("g2");
    const config = await atualizarConfiguracoes(empresaId, { patioEndereco: "Bom Jesus" });
    expect(config.patio_endereco).toBe("Bom Jesus");
    expect(config.patio_municipio_id).toBeNull();
    conferencias++;
  });

  it("pátio com texto que não resolve continua salvando, com município nulo", async () => {
    const empresaId = await criarEmpresaDeTeste("g3");
    const config = await atualizarConfiguracoes(empresaId, {
      patioEndereco: "Cidade Que Nao Existe Em Lugar Nenhum",
    });
    expect(config.patio_endereco).toBe("Cidade Que Nao Existe Em Lugar Nenhum");
    expect(config.patio_municipio_id).toBeNull();
    conferencias++;
  });

  it("campo omitido não é tocado — só o que foi passado muda", async () => {
    const empresaId = await criarEmpresaDeTeste("h");
    await atualizarConfiguracoes(empresaId, { prazoPadraoDias: 20 });
    const config = await atualizarConfiguracoes(empresaId, { patioEndereco: "Só o pátio" });
    expect(config.patio_endereco).toBe("Só o pátio");
    expect(config.prazo_padrao_dias).toBe(20);
    conferencias++;
  });

  it("prazo padrão aceita os dois limites da faixa — 0 e 90", async () => {
    const empresaId = await criarEmpresaDeTeste("faixa1");
    const zero = await atualizarConfiguracoes(empresaId, { prazoPadraoDias: 0 });
    expect(zero.prazo_padrao_dias).toBe(0);
    const noventa = await atualizarConfiguracoes(empresaId, { prazoPadraoDias: 90 });
    expect(noventa.prazo_padrao_dias).toBe(90);
    conferencias++;
  });

  it("prazo padrão recusa abaixo do mínimo, com a faixa na mensagem", async () => {
    const empresaId = await criarEmpresaDeTeste("faixa2");
    await expect(atualizarConfiguracoes(empresaId, { prazoPadraoDias: -1 })).rejects.toThrow(
      "entre 0 e 90 dias",
    );
    conferencias++;
  });

  it("prazo padrão recusa acima do máximo, com a faixa na mensagem", async () => {
    const empresaId = await criarEmpresaDeTeste("faixa3");
    await expect(atualizarConfiguracoes(empresaId, { prazoPadraoDias: 91 })).rejects.toThrow(
      "entre 0 e 90 dias",
    );
    conferencias++;
  });

  it("numeração do relatório aceita subir", async () => {
    const empresaId = await criarEmpresaDeTeste("i");
    const config = await atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 50 });
    expect(config.proximo_numero_relatorio).toBe(50);
    conferencias++;
  });

  it("numeração do relatório recusa descer, com o número atual na mensagem", async () => {
    const empresaId = await criarEmpresaDeTeste("j");
    await atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 50 });
    await expect(atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 49 })).rejects.toThrow(
      "50",
    );
    conferencias++;
  });

  it("numeração do relatório aceita repetir o valor atual", async () => {
    const empresaId = await criarEmpresaDeTeste("k");
    await atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 50 });
    const config = await atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 50 });
    expect(config.proximo_numero_relatorio).toBe(50);
    conferencias++;
  });

  it("gravar pátio/prazo depois não regride a numeração já gravada", async () => {
    // Achado do segundo `/revisar`, 31/08/2026: a primeira versão gravava a
    // numeração de novo, sem guarda, no `update` que grava pátio/prazo —
    // desfazendo a própria proteção do piso.
    const empresaId = await criarEmpresaDeTeste("p");
    await atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 80 });
    const config = await atualizarConfiguracoes(empresaId, { patioEndereco: "Depois do 80" });
    expect(config.proximo_numero_relatorio).toBe(80);
    conferencias++;
  });

  it("concorrência — dois pedidos simultâneos nunca deixam o piso regredir", async () => {
    // §3, "concorrência real": não basta provar que passa um pedido por vez.
    const empresaId = await criarEmpresaDeTeste("q");
    const resultados = await Promise.allSettled([
      atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 100 }),
      atualizarConfiguracoes(empresaId, { proximoNumeroRelatorio: 5 }),
    ]);
    const aceitos = resultados
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof atualizarConfiguracoes>>> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value.proximo_numero_relatorio);
    expect(aceitos.length).toBeGreaterThan(0);

    const final = await buscarEmpresa(empresaId);
    // Não importa a ordem em que os dois pedidos chegaram ao banco: o valor
    // final é sempre o maior dos aceitos — nunca um lido antes de ser
    // sobrescrito por um valor menor.
    expect(final?.proximo_numero_relatorio).toBe(Math.max(...aceitos));
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
