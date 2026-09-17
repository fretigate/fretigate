import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { resumoDoFinanceiro } from "@/lib/servicos/financeiro";
import { criarTituloJaRecebi } from "@/lib/servicos/titulos";
import { criarServico } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";
import { criarDespesa } from "@/lib/servicos/despesas";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";

/**
 * Financeiro (hub) — `resumoDoFinanceiro`
 * (`docs/planos/financeiro-resumo-com-numeros.md`). `recebidoNoMes`
 * (`cobrancas.ts`) e `despesasDoMes` (`despesas.ts`) já têm cobertura
 * própria de regra de negócio, direto e por delegação — `resumoDeCobrancas`
 * ("Recebido no mês") em `tests/cobrancas.test.ts`, `resumoDeLucroDoMes`
 * ("despesa fora do mês", "despesa arquivada") em `tests/dashboard.test.ts`.
 * Este arquivo mede só o que é **novo**: a composição dos dois num terceiro
 * número (Saldo), nunca gravado (`CLAUDE.md` §9), e que a soma de uma
 * empresa nunca inclui centavo da outra.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 5;

type EmpresaDeTeste = { empresaId: string; usuarioId: string; tipoOperacaoId: string; clienteId: string };

async function criarEmpresaDeTeste(sufixo: string): Promise<EmpresaDeTeste> {
  const empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Financeiro Teste ${marca} ${sufixo}`],
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

  return { empresaId, usuarioId, tipoOperacaoId, clienteId: cliente.id };
}

/** Recebido de verdade, hoje — `criarTituloJaRecebi` grava o `Recebimento` com `new Date()`. */
async function receber(e: EmpresaDeTeste, valor: number) {
  const servico = await criarServico(e.empresaId, e.usuarioId, {
    tipo_operacao_id: e.tipoOperacaoId,
    cliente_id: e.clienteId,
    data_servico: new Date(),
    valor,
  });
  await criarTituloJaRecebi(e.empresaId, e.usuarioId, servico.id);
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "recebimento" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "titulo_receber" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "despesa" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "servico" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "usuario" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("resumoDoFinanceiro — recebido, pago e o saldo entre os dois", () => {
  const hoje = diaEmFortaleza(new Date());

  it("saldo positivo: recebeu mais do que pagou", async () => {
    const e = await criarEmpresaDeTeste("a");
    await receber(e, 100_000);
    await criarDespesa(e.empresaId, { data: new Date(), valor: 40_000 });

    const resumo = await resumoDoFinanceiro(e.empresaId, hoje);
    expect(resumo.recebidoCentavos).toBe(100_000);
    expect(resumo.pagoCentavos).toBe(40_000);
    expect(resumo.saldoCentavos).toBe(60_000);
    conferencias++;
  });

  it("saldo negativo: pagou mais do que recebeu — número real, nunca escondido", async () => {
    const e = await criarEmpresaDeTeste("b");
    await receber(e, 20_000);
    await criarDespesa(e.empresaId, { data: new Date(), valor: 50_000 });

    const resumo = await resumoDoFinanceiro(e.empresaId, hoje);
    expect(resumo.saldoCentavos).toBe(-30_000);
    conferencias++;
  });

  it("sem recebimento nem despesa: Recebido e Pago são zero, Saldo é convite (null)", async () => {
    // Mesmo gatilho do Lucro da dashboard (`CLAUDE.md` §8, "Número
    // incompleto não é exibido") — a contagem de despesas lançadas decide,
    // nunca a conta: "Pago" zero pode ser "não gastou nada" ou "ainda não
    // lançou", e um Saldo calculado em cima disso herdaria a mesma dúvida.
    // "Recebido"/"Pago" continuam reais mesmo em zero — são soma direta,
    // não uma combinação dos dois lados.
    const e = await criarEmpresaDeTeste("c");
    const resumo = await resumoDoFinanceiro(e.empresaId, hoje);
    expect(resumo.recebidoCentavos).toBe(0);
    expect(resumo.pagoCentavos).toBe(0);
    expect(resumo.saldoCentavos).toBeNull();
    conferencias++;
  });

  it("recebimento sem despesa lançada: pago zero, saldo é convite, não o valor recebido", async () => {
    const e = await criarEmpresaDeTeste("d");
    await receber(e, 15_000);

    const resumo = await resumoDoFinanceiro(e.empresaId, hoje);
    expect(resumo.pagoCentavos).toBe(0);
    expect(resumo.saldoCentavos).toBeNull();
    conferencias++;
  });

  it("a soma de uma empresa nunca inclui centavo da outra", async () => {
    const a = await criarEmpresaDeTeste("e1");
    const b = await criarEmpresaDeTeste("e2");
    await receber(a, 10_000);
    await criarDespesa(a.empresaId, { data: new Date(), valor: 4_000 });
    await receber(b, 999_999);
    await criarDespesa(b.empresaId, { data: new Date(), valor: 1 });

    const resumoA = await resumoDoFinanceiro(a.empresaId, hoje);
    const resumoB = await resumoDoFinanceiro(b.empresaId, hoje);
    expect(resumoA.recebidoCentavos).toBe(10_000);
    expect(resumoA.pagoCentavos).toBe(4_000);
    expect(resumoB.recebidoCentavos).toBe(999_999);
    expect(resumoB.pagoCentavos).toBe(1);
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
