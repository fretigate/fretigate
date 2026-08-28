import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { criarRelatorio, buscarRelatorio } from "@/lib/servicos/relatorios";
import { criarServico, editarServico, arquivarServico } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";

/**
 * Relatorio (item 7, Tarefa 1 — `docs/planos/item-7-relatorio.md`,
 * "Fundamentos: a entidade Relatorio e o que ela amarra"): `criarRelatorio`
 * grava a entidade + as linhas de `RelatorioServico` com o retrato congelado
 * de cada frete (`docs/especificacao.md` §4.4/§8 regra 6 — decisão do
 * fundador, 28/08/2026), `valor_total` sempre recalculado a partir dos
 * próprios `Servico`, o contador atômico de `numero`, e a função RECUSA todo
 * frete que não pertença ao relatório: outra empresa, outro cliente,
 * cancelado, arquivado ou fora do período (mesma decisão — a proteção mora
 * onde a gravação acontece, não em quem chama).
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) já é coberto de forma genérica por `tests/isolamento/*` e
 * pela extensão de `vazamento.test.ts` para `relatorio`/`relatorio_servico`.
 * Este arquivo mede a REGRA DE NEGÓCIO.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 27;

type EmpresaDeTeste = {
  empresaId: string;
  usuarioId: string;
  tipoOperacaoId: string;
  clienteId: string;
};

/**
 * Empresa + usuário + `TipoOperacao` "Frete" (via SQL cru, como
 * `tests/servicos.test.ts` já faz) + um `Cliente` (via `criarCliente`).
 */
async function criarEmpresaDeTeste(sufixo: string): Promise<EmpresaDeTeste> {
  const empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Relatorio Teste ${marca} ${sufixo}`],
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

/** Um `Servico` de verdade — `data_servico` padrão é agora, dentro de `periodo()`. */
function criarServicoDe(e: EmpresaDeTeste, extra: Record<string, unknown> = {}) {
  return criarServico(e.empresaId, e.usuarioId, {
    tipo_operacao_id: e.tipoOperacaoId,
    cliente_id: e.clienteId,
    data_servico: new Date(),
    valor: 100000,
    ...extra,
  });
}

function periodo() {
  const agora = new Date();
  return {
    dataInicial: new Date(agora.getTime() - 24 * 60 * 60 * 1000),
    dataFinal: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
  };
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    // `relatorio_servico` referencia `relatorio` e `servico` — sai primeiro.
    // `relatorio` referencia `cliente` — sai antes dele. `servico` referencia
    // `tipo_operacao`/`cliente`/`usuario` — sai antes deles.
    await raiz.query(`DELETE FROM "relatorio_servico" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "relatorio" WHERE empresa_id = ANY($1)`, [
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
    // `tipo_operacao` é `Cascade` de `Empresa` (CLAUDE.md §7) — sai sozinho.
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [
      empresasParaLimpar,
    ]);
  }
  await raiz.end();
});

describe("1. criarRelatorio — a entidade, o que ela amarra, e o retrato congelado", () => {
  it("numero começa em 1, valor_total é a soma exata, uma RelatorioServico por frete com o retrato do Servico", async () => {
    const e = await criarEmpresaDeTeste("a");
    const s1 = await criarServicoDe(e, {
      valor: 100000,
      origem_texto: "Fortaleza",
      destino_texto: "Sobral",
      carga_texto: "Grãos",
    });
    const s2 = await criarServicoDe(e, { valor: 50000, carga_texto: "Móveis" });

    const relatorio = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [s1.id, s2.id],
    });

    expect(relatorio.numero).toBe(1);
    expect(relatorio.cliente_id).toBe(e.clienteId);
    expect(relatorio.valor_total).toBe(150000);
    expect(relatorio.gerou_cobranca).toBe(false);
    expect(relatorio.pdf_url).toBeNull();
    conferencias++;

    const linhas = await raiz.query<{
      servico_id: string;
      valor: number;
      origem_texto: string | null;
      destino_texto: string | null;
      carga_texto: string | null;
    }>(
      `SELECT servico_id, valor, origem_texto, destino_texto, carga_texto
         FROM "relatorio_servico" WHERE relatorio_id = $1 ORDER BY valor DESC`,
      [relatorio.id],
    );
    expect(linhas.rows.map((r) => r.servico_id).sort()).toEqual([s1.id, s2.id].sort());
    conferencias++;

    const linha1 = linhas.rows.find((r) => r.servico_id === s1.id)!;
    expect(linha1.valor).toBe(100000);
    expect(linha1.origem_texto).toBe("Fortaleza");
    expect(linha1.destino_texto).toBe("Sobral");
    expect(linha1.carga_texto).toBe("Grãos");
    conferencias++;

    const linha2 = linhas.rows.find((r) => r.servico_id === s2.id)!;
    expect(linha2.valor).toBe(50000);
    expect(linha2.carga_texto).toBe("Móveis");
    conferencias++;
  });

  it("retrato congela — editar o Servico depois não muda a linha do relatório já gerado", async () => {
    const e = await criarEmpresaDeTeste("n1");
    const original = await criarServicoDe(e, {
      valor: 100000,
      origem_texto: "Fortaleza",
      destino_texto: "Sobral",
      carga_texto: "Grãos",
    });

    const relatorio = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [original.id],
    });

    await editarServico(e.empresaId, original.id, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: original.data_servico,
      valor: 999999,
      origem_texto: "Outra origem",
      destino_texto: "Outro destino",
      carga_texto: "Outra carga",
    });

    const linha = await raiz.query<{
      valor: number;
      origem_texto: string;
      destino_texto: string;
      carga_texto: string;
    }>(
      `SELECT valor, origem_texto, destino_texto, carga_texto FROM "relatorio_servico" WHERE relatorio_id = $1`,
      [relatorio.id],
    );
    expect(linha.rows[0].valor).toBe(100000);
    expect(linha.rows[0].origem_texto).toBe("Fortaleza");
    expect(linha.rows[0].destino_texto).toBe("Sobral");
    expect(linha.rows[0].carga_texto).toBe("Grãos");
    conferencias++;

    // O total do relatório, já gravado, também não muda.
    expect(relatorio.valor_total).toBe(100000);
    conferencias++;
  });

  it("um único frete: valor_total bate com o valor dele, uma linha só", async () => {
    const e = await criarEmpresaDeTeste("b");
    const s1 = await criarServicoDe(e, { valor: 75000 });

    const relatorio = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [s1.id],
    });

    expect(relatorio.valor_total).toBe(75000);
    conferencias++;

    const linhas = await raiz.query(
      `SELECT count(*)::int n FROM "relatorio_servico" WHERE relatorio_id = $1`,
      [relatorio.id],
    );
    expect(linhas.rows[0].n).toBe(1);
    conferencias++;
  });

  it("segundo relatório da mesma empresa recebe numero 2", async () => {
    const e = await criarEmpresaDeTeste("c");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    const s2 = await criarServicoDe(e, { valor: 10000 });

    const primeiro = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [s1.id],
    });
    const segundo = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [s2.id],
    });

    expect(primeiro.numero).toBe(1);
    expect(segundo.numero).toBe(2);
    conferencias++;
  });

  it("duas empresas diferentes começam do 1, cada uma no seu contador", async () => {
    const a = await criarEmpresaDeTeste("d1");
    const b = await criarEmpresaDeTeste("d2");
    const sa = await criarServicoDe(a, { valor: 10000 });
    const sb = await criarServicoDe(b, { valor: 10000 });

    const ra = await criarRelatorio(a.empresaId, {
      clienteId: a.clienteId,
      ...periodo(),
      servicoIds: [sa.id],
    });
    const rb = await criarRelatorio(b.empresaId, {
      clienteId: b.clienteId,
      ...periodo(),
      servicoIds: [sb.id],
    });

    expect(ra.numero).toBe(1);
    expect(rb.numero).toBe(1);
    conferencias++;
  });

  it("concorrência: criações simultâneas da mesma empresa nunca colidem no numero", async () => {
    // Mesmo teste de `tests/servicos.test.ts` ("concorrência: criações
    // simultâneas..."), aplicado ao contador de `Relatorio.numero`
    // (CLAUDE.md §3, "concorrência real").
    const e = await criarEmpresaDeTeste("g");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    const QUANTIDADE = 8;
    const criados = await Promise.all(
      Array.from({ length: QUANTIDADE }, () =>
        criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [s1.id] }),
      ),
    );
    const numeros = criados.map((r) => r.numero).sort((x, y) => x - y);
    expect(numeros).toEqual(Array.from({ length: QUANTIDADE }, (_, i) => i + 1));
    conferencias++;
  });
});

describe("2. a função recusa — CLAUDE.md §3 e a decisão de não confiar em quem chama (28/08/2026)", () => {
  it("recusa clienteId de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("e1");
    const b = await criarEmpresaDeTeste("e2");
    const sa = await criarServicoDe(a, { valor: 10000 });

    await expect(
      criarRelatorio(a.empresaId, { clienteId: b.clienteId, ...periodo(), servicoIds: [sa.id] }),
    ).rejects.toThrow("Selecione um cliente válido.");
    conferencias++;
  });

  it("recusa clienteId que não existe", async () => {
    const e = await criarEmpresaDeTeste("f1");
    const s1 = await criarServicoDe(e, { valor: 10000 });

    await expect(
      criarRelatorio(e.empresaId, { clienteId: randomUUID(), ...periodo(), servicoIds: [s1.id] }),
    ).rejects.toThrow("Selecione um cliente válido.");
    conferencias++;
  });

  it("recusa servicoId de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("h1");
    const b = await criarEmpresaDeTeste("h2");
    const sb = await criarServicoDe(b, { valor: 10000 });

    await expect(
      criarRelatorio(a.empresaId, { clienteId: a.clienteId, ...periodo(), servicoIds: [sb.id] }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa servicoId que não existe", async () => {
    const e = await criarEmpresaDeTeste("i1");
    await expect(
      criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [randomUUID()] }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa quando SÓ UM dos vários servicoIds é de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("j1");
    const b = await criarEmpresaDeTeste("j2");
    const sa = await criarServicoDe(a, { valor: 10000 });
    const sb = await criarServicoDe(b, { valor: 10000 });

    await expect(
      criarRelatorio(a.empresaId, {
        clienteId: a.clienteId,
        ...periodo(),
        servicoIds: [sa.id, sb.id],
      }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa frete de outro cliente da mesma empresa", async () => {
    const e = await criarEmpresaDeTeste("o1");
    const outroCliente = await criarCliente(e.empresaId, { nome: "Outro cliente" });
    const servicoDoOutro = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: outroCliente.id,
      data_servico: new Date(),
      valor: 10000,
    });

    await expect(
      criarRelatorio(e.empresaId, {
        clienteId: e.clienteId,
        ...periodo(),
        servicoIds: [servicoDoOutro.id],
      }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa frete cancelado — nunca entra em documento nenhum (docs/especificacao.md §7)", async () => {
    const e = await criarEmpresaDeTeste("p1");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    await raiz.query(`UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`, [s1.id]);

    await expect(
      criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [s1.id] }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("aceita frete em_andamento — a montagem (Tarefa 3) decide cobrança, isto só filtra cancelado/arquivado/fora do escopo", async () => {
    const e = await criarEmpresaDeTeste("q1");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    expect(s1.status_operacional).toBe("em_andamento");

    const relatorio = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [s1.id],
    });
    expect(relatorio.valor_total).toBe(10000);
    conferencias++;
  });

  it("recusa frete arquivado", async () => {
    const e = await criarEmpresaDeTeste("r1");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    await arquivarServico(e.empresaId, s1.id);

    await expect(
      criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [s1.id] }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa frete com data_servico antes do período", async () => {
    const e = await criarEmpresaDeTeste("s1");
    const agora = new Date();
    const s1 = await criarServicoDe(e, {
      valor: 10000,
      data_servico: new Date(agora.getTime() - 10 * 24 * 60 * 60 * 1000),
    });

    await expect(
      criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [s1.id] }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa frete com data_servico depois do período", async () => {
    const e = await criarEmpresaDeTeste("t1");
    const agora = new Date();
    const s1 = await criarServicoDe(e, {
      valor: 10000,
      data_servico: new Date(agora.getTime() + 10 * 24 * 60 * 60 * 1000),
    });

    await expect(
      criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [s1.id] }),
    ).rejects.toThrow("Um ou mais fretes não pertencem a este relatório.");
    conferencias++;
  });

  it("recusa lista de fretes vazia", async () => {
    const e = await criarEmpresaDeTeste("u1");
    await expect(
      criarRelatorio(e.empresaId, { clienteId: e.clienteId, ...periodo(), servicoIds: [] }),
    ).rejects.toThrow("Selecione ao menos um frete.");
    conferencias++;
  });

  it("recusa período com data final anterior à inicial", async () => {
    const e = await criarEmpresaDeTeste("v1");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    const { dataInicial, dataFinal } = periodo();

    await expect(
      criarRelatorio(e.empresaId, {
        clienteId: e.clienteId,
        dataInicial: dataFinal,
        dataFinal: dataInicial,
        servicoIds: [s1.id],
      }),
    ).rejects.toThrow("Período inválido.");
    conferencias++;
  });
});

describe("3. buscarRelatorio — a conferência de FK para `relatorio_id`", () => {
  it("acha o relatório recém-criado", async () => {
    const e = await criarEmpresaDeTeste("k1");
    const s1 = await criarServicoDe(e, { valor: 10000 });
    const criado = await criarRelatorio(e.empresaId, {
      clienteId: e.clienteId,
      ...periodo(),
      servicoIds: [s1.id],
    });

    const achado = await buscarRelatorio(e.empresaId, criado.id);
    expect(achado?.id).toBe(criado.id);
    conferencias++;
  });

  it("retorna null para relatório de outra empresa — a garantia que `gerarRelatorio` (Tarefa 4) vai usar antes de gravar `titulo_receber.relatorio_id`", async () => {
    const a = await criarEmpresaDeTeste("l1");
    const b = await criarEmpresaDeTeste("l2");
    const sb = await criarServicoDe(b, { valor: 10000 });
    const relatorioDeB = await criarRelatorio(b.empresaId, {
      clienteId: b.clienteId,
      ...periodo(),
      servicoIds: [sb.id],
    });

    expect(await buscarRelatorio(a.empresaId, relatorioDeB.id)).toBeNull();
    conferencias++;
  });

  it("retorna null para id que não existe", async () => {
    const e = await criarEmpresaDeTeste("m1");
    expect(await buscarRelatorio(e.empresaId, randomUUID())).toBeNull();
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
