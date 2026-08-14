import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { criarTituloJaRecebi, buscarTituloPorServico } from "@/lib/servicos/titulos";
import { criarServico, arquivarServico } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";

/**
 * TituloReceber (tarefa 3 do item 3): "Já recebi" cria um título já pago,
 * derivado do `Servico` — nunca de input do usuário —, a conferência de FK
 * de `servico_id` e a recusa de um segundo título para o mesmo frete.
 *
 * Só uma conferência de FK aqui, não duas: `cliente_id` nunca é escolhido,
 * vem sempre de `servico.cliente_id` — não há caminho público para injetar
 * um `cliente_id` de outra empresa (ver o comentário de
 * `criarTituloJaRecebi`, `src/lib/servicos/titulos.ts`).
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) já é coberto de forma genérica por `tests/isolamento/*` e
 * pela extensão de `vazamento.test.ts` para `titulo_receber`. Este arquivo
 * mede a REGRA DE NEGÓCIO.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 7;

type EmpresaDeTeste = {
  empresaId: string;
  usuarioId: string;
  clienteId: string;
  servicoId: string;
  valorServico: number;
};

/**
 * Empresa + usuário + `TipoOperacao` (via SQL cru, como `servicos.test.ts` já
 * faz) + `Cliente` + `Servico` — o suficiente para ter um frete de verdade
 * para "Já recebi" gerar título.
 */
async function criarEmpresaDeTeste(sufixo: string): Promise<EmpresaDeTeste> {
  const empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Titulo Teste ${marca} ${sufixo}`],
  );
  empresasParaLimpar.push(empresaId);

  const usuarioId = `u-${empresaId}`;
  await raiz.query(
    `INSERT INTO "usuario" (id, nome, email, papel, empresa_id)
     VALUES ($1, $2, $3, 'dono', $4)`,
    [usuarioId, `Dono ${sufixo}`, `${empresaId}@teste.invalido`, empresaId],
  );

  const tipoOperacaoId = randomUUID();
  await raiz.query(
    `INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
     VALUES ($1, $2, 'Frete', 'frete', true, 1)`,
    [tipoOperacaoId, empresaId],
  );

  const cliente = await criarCliente(empresaId, { nome: `Cliente ${sufixo}` });

  const valorServico = 150000;
  const servico = await criarServico(empresaId, usuarioId, {
    tipo_operacao_id: tipoOperacaoId,
    cliente_id: cliente.id,
    data_servico: new Date(),
    valor: valorServico,
  });

  return { empresaId, usuarioId, clienteId: cliente.id, servicoId: servico.id, valorServico };
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    // `titulo_receber` referencia servico e cliente — sai primeiro.
    await raiz.query(`DELETE FROM "titulo_receber" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "servico" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "usuario" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [
      empresasParaLimpar,
    ]);
  }
  await raiz.end();
});

describe("1. Já recebi — cria título pago derivado do Servico", () => {
  it("status pago, valor e cliente_id vêm do Servico, não de input", async () => {
    const e = await criarEmpresaDeTeste("a");
    const antes = new Date();
    const titulo = await criarTituloJaRecebi(e.empresaId, e.servicoId);

    expect(titulo.status).toBe("pago");
    expect(titulo.integral).toBe(true);
    expect(titulo.servico_id).toBe(e.servicoId);
    expect(titulo.cliente_id).toBe(e.clienteId);
    expect(titulo.valor).toBe(e.valorServico);
    expect(titulo.valor_recebido).toBe(e.valorServico);
    expect(titulo.data_pagamento).not.toBeNull();
    expect((titulo.data_pagamento as Date).getTime()).toBeGreaterThanOrEqual(antes.getTime());
    // Nada perguntado nesta fatia — CLAUDE.md §9, "carga_categoria" mesma lógica.
    expect(titulo.vencimento).toBeNull();
    expect(titulo.forma_pagamento_prevista).toBeNull();
    expect(titulo.forma_pagamento).toBeNull();
    expect(titulo.relatorio_id).toBeNull();
    conferencias++;
  });

  it("buscarTituloPorServico acha o título recém-criado", async () => {
    const e = await criarEmpresaDeTeste("b");
    const criado = await criarTituloJaRecebi(e.empresaId, e.servicoId);
    const achado = await buscarTituloPorServico(e.empresaId, e.servicoId);
    expect(achado?.id).toBe(criado.id);
    conferencias++;
  });
});

describe("2. a conferência de FK — CLAUDE.md §3", () => {
  it("recusa servico_id de outra empresa (via Já recebi)", async () => {
    const a = await criarEmpresaDeTeste("c1");
    const b = await criarEmpresaDeTeste("c2");
    await expect(criarTituloJaRecebi(a.empresaId, b.servicoId)).rejects.toThrow(
      "Selecione um frete válido.",
    );
    conferencias++;
  });

  it("recusa servico_id que não existe", async () => {
    const e = await criarEmpresaDeTeste("e");
    await expect(criarTituloJaRecebi(e.empresaId, randomUUID())).rejects.toThrow(
      "Selecione um frete válido.",
    );
    conferencias++;
  });

  it("recusa servico_id arquivado", async () => {
    const e = await criarEmpresaDeTeste("f");
    await arquivarServico(e.empresaId, e.servicoId);
    await expect(criarTituloJaRecebi(e.empresaId, e.servicoId)).rejects.toThrow(
      "Selecione um frete válido.",
    );
    conferencias++;
  });
});

describe("3. um título integral por frete — achado da revisão do fundador", () => {
  it("Já recebi chamado duas vezes em sequência para o mesmo frete recusa na segunda", async () => {
    const e = await criarEmpresaDeTeste("g");
    await criarTituloJaRecebi(e.empresaId, e.servicoId);
    await expect(criarTituloJaRecebi(e.empresaId, e.servicoId)).rejects.toThrow(
      "Este frete já tem título lançado.",
    );
    conferencias++;
  });

  it("concorrência: dois pedidos simultâneos para o mesmo frete resultam em um título só", async () => {
    // A checagem `findFirst` sozinha não prova nada aqui — as duas chamadas
    // podem passar por ela antes de qualquer `INSERT` terminar. Quem garante
    // é o índice único parcial (`titulo_receber_um_integral_por_servico`);
    // este teste mede o banco, não a checagem em código (CLAUDE.md §3,
    // "concorrência real... isolamento que só funciona com um pedido por
    // vez não é isolamento" — mesmo princípio aplicado a unicidade, não a
    // vazamento entre empresas, igual ao teste de `numero` em
    // `tests/servicos.test.ts`).
    const e = await criarEmpresaDeTeste("h");
    const resultados = await Promise.allSettled([
      criarTituloJaRecebi(e.empresaId, e.servicoId),
      criarTituloJaRecebi(e.empresaId, e.servicoId),
    ]);

    const sucesso = resultados.filter((r) => r.status === "fulfilled");
    const falha = resultados.filter((r) => r.status === "rejected");
    expect(sucesso).toHaveLength(1);
    expect(falha).toHaveLength(1);
    expect((falha[0] as PromiseRejectedResult).reason.message).toBe(
      "Este frete já tem título lançado.",
    );

    // Prova pelo banco, não só pelo retorno das duas chamadas: se o índice
    // não estivesse funcionando, as duas poderiam "suceder" sem que o
    // `Promise.allSettled` acusasse nada de errado.
    const { rows } = await raiz.query(
      `SELECT count(*)::int n FROM "titulo_receber" WHERE servico_id = $1`,
      [e.servicoId],
    );
    expect(rows[0].n).toBe(1);
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
