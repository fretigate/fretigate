import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  contarCobrancasVencidasAgrupadas,
  contarFretesEmAndamento,
  faturamentoPorMes,
  resumoDeRodagemDoMes,
  resumoDoMes,
  sugerirRelatorio,
} from "@/lib/servicos/dashboard";
import { arquivarServico, criarServico } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";
import { instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";

/**
 * Dashboard (item 8, Tarefa 1) — só a REGRA de agregação por empresa e por
 * mês, nova nesta tarefa. Tudo que é reaproveitado (`resumoDeCobrancas`,
 * `contarFretesAFaturar`) já tem teste próprio em `tests/cobrancas.test.ts` e
 * não é repetido aqui.
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) é coberto de forma genérica por `tests/isolamento/*`. Aqui
 * entra o que é específico desta agregação: soma exclui cancelado
 * (dinheiro), a fronteira do mês fechado no fuso de Fortaleza (dado que não
 * volta se resolver errado), e o limiar da sugestão de relatório.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 17;

type EmpresaDeTeste = {
  empresaId: string;
  usuarioId: string;
  tipoOperacaoId: string;
  clienteId: string;
};

async function criarEmpresaDeTeste(sufixo: string): Promise<EmpresaDeTeste> {
  const empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Dashboard Teste ${marca} ${sufixo}`],
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

/**
 * Cria um frete com data/km/cliente arbitrários. `status_operacional` e
 * `ordem_enviada_em` não são parâmetro de `criarServico` (`DadosServico` não
 * os expõe — nascem `em_andamento`/nulo) — quando o teste precisa de outro
 * valor, ajusta por SQL direto depois, mesmo recurso de `plantarTitulo` em
 * `tests/cobrancas.test.ts`.
 */
async function criarFrete(
  e: EmpresaDeTeste,
  opcoes: { valor: number; dataServico: Date; km?: number | null; clienteId?: string },
) {
  const servico = await criarServico(e.empresaId, e.usuarioId, {
    tipo_operacao_id: e.tipoOperacaoId,
    cliente_id: opcoes.clienteId ?? e.clienteId,
    data_servico: opcoes.dataServico,
    valor: opcoes.valor,
    km: opcoes.km,
  });
  return servico.id;
}

async function marcarStatusOperacional(servicoId: string, status: string) {
  await raiz.query(`UPDATE "servico" SET status_operacional = $1 WHERE id = $2`, [status, servicoId]);
}

async function marcarOrdemEnviada(servicoId: string) {
  await raiz.query(`UPDATE "servico" SET ordem_enviada_em = now() WHERE id = $1`, [servicoId]);
}

async function plantarTitulo(e: EmpresaDeTeste, servicoId: string, status: "aberto" | "pago" | "cancelado", vencimento?: string) {
  await raiz.query(
    `INSERT INTO "titulo_receber"
       (id, servico_id, cliente_id, valor, status, integral, vencimento, empresa_id)
     VALUES ($1, $2, $3, 10000, $4, true, $5, $6)`,
    [
      randomUUID(),
      servicoId,
      e.clienteId,
      status,
      vencimento ? instanteDoDiaEmFortaleza(vencimento) : null,
      e.empresaId,
    ],
  );
}

/** Dois títulos do mesmo relatório (`contarCobrancasVencidasAgrupadas` conta 1, não 2). */
async function plantarRelatorioComDoisTitulos(
  e: EmpresaDeTeste,
  servicoIds: [string, string],
  vencimento: string,
) {
  const relatorioId = randomUUID();
  await raiz.query(
    `INSERT INTO "relatorio" (id, empresa_id, cliente_id, numero, data_inicial, data_final, valor_total, gerou_cobranca, gerado_em)
     VALUES ($1, $2, $3, 1, now(), now(), 20000, true, now())`,
    [relatorioId, e.empresaId, e.clienteId],
  );
  for (const servicoId of servicoIds) {
    await raiz.query(
      `INSERT INTO "titulo_receber"
         (id, servico_id, cliente_id, valor, status, integral, vencimento, relatorio_id, empresa_id)
       VALUES ($1, $2, $3, 10000, 'aberto', true, $4, $5, $6)`,
      [randomUUID(), servicoId, e.clienteId, instanteDoDiaEmFortaleza(vencimento), relatorioId, e.empresaId],
    );
  }
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "titulo_receber" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "relatorio_servico" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "relatorio" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "servico" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "usuario" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();

  if (conferencias < CONFERENCIAS_ESPERADAS) {
    throw new Error(
      `Só ${conferencias} de ${CONFERENCIAS_ESPERADAS} verificações rodaram — alguma exceção foi engolida no meio do arquivo.`,
    );
  }
});

describe("1. resumoDoMes — soma é diferente de cobrar, e a comparação com o mês anterior", () => {
  const hoje = "2026-08-15";

  it("soma valor do mês corrente, exclui cancelado, inclui em_andamento", async () => {
    const e = await criarEmpresaDeTeste("resumo-1");
    const a = await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-08-05") });
    const b = await criarFrete(e, { valor: 20_000, dataServico: instanteDoDiaEmFortaleza("2026-08-10") });
    const cancelado = await criarFrete(e, { valor: 99_999, dataServico: instanteDoDiaEmFortaleza("2026-08-12") });
    await marcarStatusOperacional(cancelado, "cancelado");
    void a;
    void b;

    const resumo = await resumoDoMes(e.empresaId, hoje);
    expect(resumo.faturamentoCentavos).toBe(30_000);
    expect(resumo.qtdFretes).toBe(2);
    expect(resumo.mediaPorFrete).toBe(150);
    conferencias++;
  });

  it("mês anterior com faturamento calcula a variação percentual", async () => {
    const e = await criarEmpresaDeTeste("resumo-2");
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-10") });
    await criarFrete(e, { valor: 15_000, dataServico: instanteDoDiaEmFortaleza("2026-08-10") });

    const resumo = await resumoDoMes(e.empresaId, hoje);
    expect(resumo.variacaoPercentual).toBe(50);
    conferencias++;
  });

  it("mês anterior sem faturamento devolve variação nula, nunca divisão por zero", async () => {
    const e = await criarEmpresaDeTeste("resumo-3");
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-08-10") });

    const resumo = await resumoDoMes(e.empresaId, hoje);
    expect(resumo.variacaoPercentual).toBeNull();
    conferencias++;
  });

  it("sem frete no mês, faturamento e média zerados/nulos — nunca erro", async () => {
    const e = await criarEmpresaDeTeste("resumo-4");
    const resumo = await resumoDoMes(e.empresaId, hoje);
    expect(resumo.faturamentoCentavos).toBe(0);
    expect(resumo.qtdFretes).toBe(0);
    expect(resumo.mediaPorFrete).toBeNull();
    conferencias++;
  });
});

describe("2. resumoDeRodagemDoMes — dado real com cobertura parcial, convite só quando zero", () => {
  const hoje = "2026-08-15";

  it("cobertura parcial: soma só os fretes com km, ignora os sem km", async () => {
    const e = await criarEmpresaDeTeste("rodagem-1");
    await criarFrete(e, { valor: 100_000, dataServico: instanteDoDiaEmFortaleza("2026-08-05"), km: 100_000 });
    await criarFrete(e, { valor: 50_000, dataServico: instanteDoDiaEmFortaleza("2026-08-06"), km: null });

    const rodagem = await resumoDeRodagemDoMes(e.empresaId, hoje);
    expect(rodagem.kmMesMetros).toBe(100_000);
    expect(rodagem.rsPorKm).toBeCloseTo(10, 5);
    // `CLAUDE.md` §8, regra 10: dado incompleto mostra a cobertura — a
    // pastilha da dashboard usa estes dois para a nota "1 de 2 fretes com km".
    expect(rodagem.fretesComKm).toBe(1);
    expect(rodagem.fretesNoMes).toBe(2);
    conferencias++;
  });

  it("cobertura zero — nenhum frete com km — devolve convite (null), não zero", async () => {
    const e = await criarEmpresaDeTeste("rodagem-2");
    await criarFrete(e, { valor: 50_000, dataServico: instanteDoDiaEmFortaleza("2026-08-05"), km: null });

    const rodagem = await resumoDeRodagemDoMes(e.empresaId, hoje);
    expect(rodagem.kmMesMetros).toBeNull();
    expect(rodagem.rsPorKm).toBeNull();
    expect(rodagem.fretesComKm).toBe(0);
    expect(rodagem.fretesNoMes).toBe(1);
    conferencias++;
  });
});

describe("3. contarFretesEmAndamento", () => {
  it("conta só em_andamento, não arquivado, e separa quem não tem ordem enviada", async () => {
    const e = await criarEmpresaDeTeste("andamento-1");
    const semOrdem = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    const comOrdem = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    await marcarOrdemEnviada(comOrdem);
    const finalizado = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    await marcarStatusOperacional(finalizado, "finalizado");
    const arquivado = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    await arquivarServico(e.empresaId, arquivado);
    void semOrdem;

    const contagem = await contarFretesEmAndamento(e.empresaId);
    expect(contagem.total).toBe(2);
    expect(contagem.semOrdemEnviada).toBe(1);
    conferencias++;
  });
});

describe("4. contarCobrancasVencidasAgrupadas — mesma unidade da lista, nunca título cru", () => {
  const hoje = "2026-08-15";

  it("um título vencido sem relatório conta 1", async () => {
    const e = await criarEmpresaDeTeste("vencidas-1");
    const s = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    await plantarTitulo(e, s, "aberto", "2026-08-01");

    expect(await contarCobrancasVencidasAgrupadas(e.empresaId, hoje)).toBe(1);
    conferencias++;
  });

  it("dois títulos vencidos do mesmo relatório contam como 1, não 2", async () => {
    const e = await criarEmpresaDeTeste("vencidas-2");
    const s1 = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    const s2 = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    await plantarRelatorioComDoisTitulos(e, [s1, s2], "2026-08-01");

    expect(await contarCobrancasVencidasAgrupadas(e.empresaId, hoje)).toBe(1);
    conferencias++;
  });

  it("título ainda não vencido não conta", async () => {
    const e = await criarEmpresaDeTeste("vencidas-3");
    const s = await criarFrete(e, { valor: 10_000, dataServico: new Date() });
    await plantarTitulo(e, s, "aberto", "2026-09-01");

    expect(await contarCobrancasVencidasAgrupadas(e.empresaId, hoje)).toBe(0);
    conferencias++;
  });
});

describe("5. sugerirRelatorio — 3 ou mais fretes a faturar de um mês fechado, fuso de Fortaleza", () => {
  const hoje = "2026-08-15";

  it("dois fretes não faturados de um mês fechado não dispara", async () => {
    const e = await criarEmpresaDeTeste("sugestao-1");
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-05") });
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-06") });

    expect(await sugerirRelatorio(e.empresaId, hoje)).toBeNull();
    conferencias++;
  });

  it("três fretes não faturados de um mês fechado dispara, com a contagem certa", async () => {
    const e = await criarEmpresaDeTeste("sugestao-2");
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-05") });
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-06") });
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-07") });

    const sugestao = await sugerirRelatorio(e.empresaId, hoje);
    expect(sugestao).toEqual({ clienteId: e.clienteId, quantidade: 3 });
    conferencias++;
  });

  it("frete cancelado ou já faturado não conta para o limiar", async () => {
    const e = await criarEmpresaDeTeste("sugestao-3");
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-05") });
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-06") });
    const cancelado = await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-07") });
    await marcarStatusOperacional(cancelado, "cancelado");
    const faturado = await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-07-08") });
    await plantarTitulo(e, faturado, "aberto", "2026-08-01");

    expect(await sugerirRelatorio(e.empresaId, hoje)).toBeNull();
    conferencias++;
  });

  it("dois clientes qualificando: escolhe o de maior contagem", async () => {
    const e = await criarEmpresaDeTeste("sugestao-4");
    const clienteB = await criarCliente(e.empresaId, { nome: "Cliente B" });
    for (let i = 0; i < 3; i++) {
      await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza(`2026-07-0${i + 1}`) });
    }
    for (let i = 0; i < 4; i++) {
      await criarFrete(e, {
        valor: 10_000,
        dataServico: instanteDoDiaEmFortaleza(`2026-07-1${i + 1}`),
        clienteId: clienteB.id,
      });
    }

    const sugestao = await sugerirRelatorio(e.empresaId, hoje);
    expect(sugestao).toEqual({ clienteId: clienteB.id, quantidade: 4 });
    conferencias++;
  });

  /**
   * A fronteira de verdade: um frete às 23h de 31/07 em Fortaleza é
   * `2026-08-01T02:00:00.000Z` em UTC — depois da meia-noite UTC, mas ainda
   * dentro do mês fechado (julho) em Fortaleza. Sem o fuso certo, um
   * servidor em UTC (a Vercel) leria isso como agosto, mês ainda aberto, e o
   * cliente nunca acumularia o suficiente para a sugestão aparecer.
   */
  it("respeita o fuso de Fortaleza na fronteira do mês fechado, não UTC", async () => {
    const e = await criarEmpresaDeTeste("sugestao-5");
    const ultimaHoraDeJulhoEmFortaleza = new Date("2026-08-01T02:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await criarFrete(e, { valor: 10_000, dataServico: ultimaHoraDeJulhoEmFortaleza });
    }

    const sugestao = await sugerirRelatorio(e.empresaId, hoje);
    expect(sugestao).toEqual({ clienteId: e.clienteId, quantidade: 3 });
    conferencias++;
  });

  it("frete do mês corrente (ainda não fechado) nunca entra na contagem", async () => {
    const e = await criarEmpresaDeTeste("sugestao-6");
    for (let i = 0; i < 3; i++) {
      await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza(`2026-08-0${i + 1}`) });
    }

    expect(await sugerirRelatorio(e.empresaId, hoje)).toBeNull();
    conferencias++;
  });
});

describe("6. faturamentoPorMes — 6 meses, o corrente incluído, ordem cronológica", () => {
  it("soma cada mês corretamente e devolve do mais antigo pro mais novo", async () => {
    const e = await criarEmpresaDeTeste("meses-1");
    await criarFrete(e, { valor: 10_000, dataServico: instanteDoDiaEmFortaleza("2026-03-10") });
    await criarFrete(e, { valor: 20_000, dataServico: instanteDoDiaEmFortaleza("2026-08-10") });
    const cancelado = await criarFrete(e, { valor: 99_999, dataServico: instanteDoDiaEmFortaleza("2026-08-11") });
    await marcarStatusOperacional(cancelado, "cancelado");

    const barras = await faturamentoPorMes(e.empresaId, "2026-08-15", 6);
    expect(barras.map((b) => b.mes)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(barras[0].faturamentoCentavos).toBe(10_000);
    expect(barras[5].faturamentoCentavos).toBe(20_000);
    expect(barras[1].faturamentoCentavos).toBe(0);
    conferencias++;
  });
});
