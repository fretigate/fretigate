import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  contarFretesAFaturar,
  listarCobrancas,
  resumoDeCobrancas,
} from "@/lib/servicos/cobrancas";
import { grupoDaCobranca, resolverSituacaoDaUrl } from "@/lib/servicos/cobrancas-situacao";
import {
  criarTituloJaRecebi,
  faturarServico,
  listarServicosComSituacao,
} from "@/lib/servicos/titulos";
import { arquivarServico, criarServico, marcarServicoFinalizado } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";
import {
  deslocarDias,
  diaEmFortaleza,
  instanteDoDiaEmFortaleza,
} from "@/lib/utils/data-fortaleza";

/**
 * Cobranças (item 6, Tarefa 2) — a REGRA de leitura da tela: os três números
 * do topo, o filtro por situação e período, o agrupamento por vencimento e a
 * contagem do estado vazio.
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) é coberto de forma genérica por `tests/isolamento/*`. Aqui
 * entra só o caso que é **dinheiro**: uma soma de uma empresa nunca pode
 * incluir centavo da outra.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 24;

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
    [empresaId, `Cobranca Teste ${marca} ${sufixo}`],
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

async function criarFrete(e: EmpresaDeTeste, valor: number, origem?: string, destino?: string) {
  const servico = await criarServico(e.empresaId, e.usuarioId, {
    tipo_operacao_id: e.tipoOperacaoId,
    cliente_id: e.clienteId,
    data_servico: new Date(),
    valor,
    origem_texto: origem,
    destino_texto: destino,
  });
  return servico.id;
}

/**
 * Planta um título direto por SQL — o mesmo recurso de `tests/titulos.test.ts`,
 * pelo mesmo motivo e com um a mais: além de vencimento no passado (que
 * `faturarServico` aceitaria), alcança o **recebimento parcial** (título
 * `aberto` com algum `Recebimento`), que nenhuma função de produção cria até
 * a Tarefa 3 existir.
 *
 * **`valorRecebido`, quando informado, também planta um `Recebimento`**
 * (item 6, Tarefa 3 — a mesma mudança do `plantarTitulo` de
 * `tests/titulos.test.ts`): é dessa tabela, não mais de um campo escalar em
 * `titulo_receber`, que `resumoDeCobrancas`/`listarCobrancas` somam o que já
 * entrou.
 *
 * É o que permite medir hoje a regra de soma por saldo, aprovada pelo
 * fundador em 26/08/2026 — sem isto, a regra ficaria escrita e não medida, e
 * só quebraria no dia da Tarefa 3, em dinheiro.
 */
async function plantarTitulo(
  e: EmpresaDeTeste,
  servicoId: string,
  dados: {
    valor: number;
    valorRecebido?: number | null;
    status: "aberto" | "pago" | "cancelado";
    vencimento?: string | null;
    dataPagamento?: Date | null;
    formaPrevista?: "boleto" | "outro" | null;
    arquivado?: boolean;
  },
) {
  const tituloId = randomUUID();
  await raiz.query(
    `INSERT INTO "titulo_receber"
       (id, servico_id, cliente_id, valor, status, integral,
        vencimento, forma_pagamento_prevista, arquivado_em, empresa_id)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9)`,
    [
      tituloId,
      servicoId,
      e.clienteId,
      dados.valor,
      dados.status,
      dados.vencimento ? instanteDoDiaEmFortaleza(dados.vencimento) : null,
      dados.formaPrevista ?? null,
      dados.arquivado ? new Date() : null,
      e.empresaId,
    ],
  );

  if (dados.valorRecebido !== null && dados.valorRecebido !== undefined && dados.valorRecebido > 0) {
    await raiz.query(
      `INSERT INTO "recebimento" (id, titulo_id, valor, data, usuario_id, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), tituloId, dados.valorRecebido, dados.dataPagamento ?? new Date(), e.usuarioId, e.empresaId],
    );
  }

  return tituloId;
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    // `recebimento` referencia `titulo_receber` (item 6, Tarefa 3) — sai
    // primeiro.
    await raiz.query(`DELETE FROM "recebimento" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "titulo_receber" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "servico" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "usuario" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("1. grupoDaCobranca — Vencidas · Vence hoje · A vencer", () => {
  const hoje = "2026-08-26";

  it("separa os três grupos pelo dia do vencimento", () => {
    const emDia = (dia: string) => ({ status: "aberto", vencimento: instanteDoDiaEmFortaleza(dia) });

    expect(grupoDaCobranca(emDia(deslocarDias(hoje, -1)), hoje)).toBe("vencidas");
    expect(grupoDaCobranca(emDia(hoje), hoje)).toBe("vence_hoje");
    expect(grupoDaCobranca(emDia(deslocarDias(hoje, 1)), hoje)).toBe("a_vencer");
    conferencias++;
  });

  it("título pago é sempre Recebidas, mesmo vencido", () => {
    expect(
      grupoDaCobranca(
        { status: "pago", vencimento: instanteDoDiaEmFortaleza(deslocarDias(hoje, -30)) },
        hoje,
      ),
    ).toBe("recebidas");
    conferencias++;
  });

  /**
   * Aberto sem vencimento é inalcançável hoje (`faturarServico` sempre grava
   * vencimento), mas cai em "A vencer" de propósito: "A receber" soma **todo**
   * título aberto, e uma linha que não caísse em grupo nenhum sumiria da tela
   * contando no número do topo.
   */
  it("aberto sem vencimento cai em A vencer, nunca fora da lista", () => {
    expect(grupoDaCobranca({ status: "aberto", vencimento: null }, hoje)).toBe("a_vencer");
    conferencias++;
  });

  /**
   * O contraste do fuso: às 22h de Fortaleza o servidor em UTC já vê o dia
   * seguinte. Uma cobrança que vence hoje viraria "venceu ontem" — o defeito
   * que `src/lib/utils/data-fortaleza.ts` existe para eliminar.
   */
  it("Vence hoje continua hoje às 22h de Fortaleza, com o servidor em UTC", () => {
    const instante = new Date("2026-08-27T01:00:00.000Z");
    const diaUtc = instante.toISOString().slice(0, 10);
    const diaFortaleza = diaEmFortaleza(instante);
    expect(diaUtc).toBe("2026-08-27");
    expect(diaFortaleza).toBe("2026-08-26");

    const vence26 = { status: "aberto", vencimento: instanteDoDiaEmFortaleza("2026-08-26") };
    expect(grupoDaCobranca(vence26, diaFortaleza)).toBe("vence_hoje");
    // Com o dia errado (UTC), a mesma cobrança apareceria como vencida.
    expect(grupoDaCobranca(vence26, diaUtc)).toBe("vencidas");
    conferencias++;
  });
});

describe("2. resolverSituacaoDaUrl", () => {
  it("aceita as quatro situações e cai no padrão com valor desconhecido", () => {
    expect(resolverSituacaoDaUrl("recebidas")).toBe("recebidas");
    expect(resolverSituacaoDaUrl("boleto")).toBe("boleto");
    expect(resolverSituacaoDaUrl("vencidas")).toBe("vencidas");
    expect(resolverSituacaoDaUrl(undefined)).toBe("em_aberto");
    expect(resolverSituacaoDaUrl("qualquer-coisa")).toBe("em_aberto");
    conferencias++;
  });
});

describe("3. resumoDeCobrancas — os três números do topo", () => {
  it("A receber soma o saldo dos abertos; Vencido é um recorte dele", async () => {
    const e = await criarEmpresaDeTeste("r1");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 100000), {
      valor: 100000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -10),
    });
    await plantarTitulo(e, await criarFrete(e, 40000), {
      valor: 40000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 10),
    });

    const resumo = await resumoDeCobrancas(e.empresaId, hoje);
    expect(resumo.aReceber).toBe(140000);
    expect(resumo.vencido).toBe(100000);
    expect(resumo.recebidoNoMes).toBe(0);
    conferencias++;
  });

  /**
   * A regra aprovada pelo fundador em 26/08/2026: saldo em "A receber" e
   * "Vencido", o pedaço já recebido em "Recebido no mês". Nada contado duas
   * vezes, nada sumindo. O estado é semeado direto no banco porque nenhuma
   * função de produção cria recebimento parcial até a Tarefa 3.
   */
  it("título parcial: o saldo entra em A receber, o recebido entra no mês", async () => {
    const e = await criarEmpresaDeTeste("r2");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 100000), {
      valor: 100000,
      valorRecebido: 40000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -3),
      dataPagamento: new Date(),
    });

    const resumo = await resumoDeCobrancas(e.empresaId, hoje);
    // Não 100000: somar o valor cheio contaria de novo o que já entrou.
    expect(resumo.aReceber).toBe(60000);
    expect(resumo.vencido).toBe(60000);
    expect(resumo.recebidoNoMes).toBe(40000);
    // A soma das duas pontas é o valor do título, sem sobra nem falta.
    expect(resumo.aReceber + resumo.recebidoNoMes).toBe(100000);
    conferencias++;
  });

  it("cancelado e arquivado não entram em nenhum dos três", async () => {
    const e = await criarEmpresaDeTeste("r3");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 50000), {
      valor: 50000,
      status: "cancelado",
      vencimento: deslocarDias(hoje, -1),
    });
    await plantarTitulo(e, await criarFrete(e, 70000), {
      valor: 70000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -1),
      arquivado: true,
    });

    const resumo = await resumoDeCobrancas(e.empresaId, hoje);
    expect(resumo.aReceber).toBe(0);
    expect(resumo.vencido).toBe(0);
    conferencias++;
  });

  /**
   * Diferente do teste acima ("cancelado e arquivado") — ali o TÍTULO está
   * arquivado; aqui é o FRETE, com o título continuando `aberto` e sem
   * `arquivado_em` próprio. Achado do fundador, 26/08/2026: `arquivarServico`
   * não trava nada e não toca o título — um frete arquivado com título ainda
   * aberto é alcançável hoje, e antes desta correção continuava contando em
   * "A receber"/"Vencido", dinheiro errado na tela que existe para responder
   * essa pergunta. Buraco da Tarefa 2, corrigido aqui.
   */
  it("frete arquivado com título ainda aberto não entra em A receber nem em Vencido", async () => {
    const e = await criarEmpresaDeTeste("r3b");
    const hoje = diaEmFortaleza(new Date());
    const freteId = await criarFrete(e, 80000);
    await plantarTitulo(e, freteId, {
      valor: 80000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -2),
    });
    await arquivarServico(e.empresaId, freteId);

    const resumo = await resumoDeCobrancas(e.empresaId, hoje);
    expect(resumo.aReceber).toBe(0);
    expect(resumo.vencido).toBe(0);

    const listados = await listarCobrancas(e.empresaId, { situacao: "vencidas", periodo: null, hoje });
    expect(listados.find((t) => t.valor === 80000)).toBeUndefined();
    conferencias++;
  });

  it("Recebido no mês conta pela data do recebimento, não pelo vencimento", async () => {
    const e = await criarEmpresaDeTeste("r4");
    const hoje = diaEmFortaleza(new Date());
    const mesPassado = new Date(instanteDoDiaEmFortaleza(hoje).getTime() - 45 * 24 * 3600 * 1000);

    await plantarTitulo(e, await criarFrete(e, 30000), {
      valor: 30000,
      valorRecebido: 30000,
      status: "pago",
      dataPagamento: new Date(),
    });
    await plantarTitulo(e, await criarFrete(e, 90000), {
      valor: 90000,
      valorRecebido: 90000,
      status: "pago",
      dataPagamento: mesPassado,
    });

    const resumo = await resumoDeCobrancas(e.empresaId, hoje);
    expect(resumo.recebidoNoMes).toBe(30000);
    conferencias++;
  });

  /** `CLAUDE.md` §3 — em dinheiro, o vazamento seria número errado na tela. */
  it("a soma de uma empresa nunca inclui centavo da outra", async () => {
    const a = await criarEmpresaDeTeste("r5a");
    const b = await criarEmpresaDeTeste("r5b");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(a, await criarFrete(a, 10000), {
      valor: 10000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 5),
    });
    await plantarTitulo(b, await criarFrete(b, 999999), {
      valor: 999999,
      status: "aberto",
      vencimento: deslocarDias(hoje, 5),
    });

    expect((await resumoDeCobrancas(a.empresaId, hoje)).aReceber).toBe(10000);
    expect((await resumoDeCobrancas(b.empresaId, hoje)).aReceber).toBe(999999);
    conferencias++;
  });
});

describe("4. listarCobrancas — situação, período e ordem", () => {
  it("Em aberto traz só o que ainda não entrou, do mais atrasado ao mais distante", async () => {
    const e = await criarEmpresaDeTeste("l1");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 10000), {
      valor: 10000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 20),
    });
    await plantarTitulo(e, await criarFrete(e, 20000), {
      valor: 20000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -20),
    });
    await plantarTitulo(e, await criarFrete(e, 30000), {
      valor: 30000,
      valorRecebido: 30000,
      status: "pago",
      dataPagamento: new Date(),
    });

    const lista = await listarCobrancas(e.empresaId, {
      situacao: "em_aberto",
      periodo: null,
      hoje,
    });
    expect(lista.map((t) => t.valor)).toEqual([20000, 10000]);
    conferencias++;
  });

  it("Vencidas corta pelo dia de Fortaleza — o que vence hoje não entra", async () => {
    const e = await criarEmpresaDeTeste("l2");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 11000), {
      valor: 11000,
      status: "aberto",
      vencimento: hoje,
    });
    await plantarTitulo(e, await criarFrete(e, 22000), {
      valor: 22000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -1),
    });

    const lista = await listarCobrancas(e.empresaId, { situacao: "vencidas", periodo: null, hoje });
    expect(lista.map((t) => t.valor)).toEqual([22000]);
    conferencias++;
  });

  it("Boleto traz só a forma prevista boleto, e ela continua em Em aberto", async () => {
    const e = await criarEmpresaDeTeste("l3");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 33000), {
      valor: 33000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 3),
      formaPrevista: "boleto",
    });
    await plantarTitulo(e, await criarFrete(e, 44000), {
      valor: 44000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 3),
      formaPrevista: "outro",
    });

    const boleto = await listarCobrancas(e.empresaId, { situacao: "boleto", periodo: null, hoje });
    const aberto = await listarCobrancas(e.empresaId, {
      situacao: "em_aberto",
      periodo: null,
      hoje,
    });
    expect(boleto.map((t) => t.valor)).toEqual([33000]);
    expect(aberto).toHaveLength(2);
    conferencias++;
  });

  it("nas abertas, o período conta pelo vencimento", async () => {
    const e = await criarEmpresaDeTeste("l4");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 55000), {
      valor: 55000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 2),
    });
    await plantarTitulo(e, await criarFrete(e, 66000), {
      valor: 66000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 60),
    });

    const lista = await listarCobrancas(e.empresaId, {
      situacao: "em_aberto",
      periodo: {
        inicio: instanteDoDiaEmFortaleza(hoje),
        fim: instanteDoDiaEmFortaleza(deslocarDias(hoje, 7)),
      },
      hoje,
    });
    expect(lista.map((t) => t.valor)).toEqual([55000]);
    conferencias++;
  });

  /**
   * A exceção decidida pelo fundador em 26/08/2026: título de "Já recebi"
   * nasce pago **sem vencimento**. Se o período contasse por vencimento
   * dentro de Recebidas, ele sumiria dos dois lados — não cai em nenhum grupo
   * de vencimento e também não passaria pelo filtro.
   */
  it("em Recebidas o período conta pela data do recebimento — inclusive sem vencimento", async () => {
    const e = await criarEmpresaDeTeste("l5");
    const hoje = diaEmFortaleza(new Date());
    const servicoId = await criarFrete(e, 77000);
    const titulo = await criarTituloJaRecebi(e.empresaId, e.usuarioId, servicoId);
    expect(titulo.vencimento).toBeNull();

    const lista = await listarCobrancas(e.empresaId, {
      situacao: "recebidas",
      periodo: {
        inicio: instanteDoDiaEmFortaleza(deslocarDias(hoje, -1)),
        fim: instanteDoDiaEmFortaleza(deslocarDias(hoje, 1)),
      },
      hoje,
    });
    expect(lista.map((t) => t.valor)).toEqual([77000]);
    conferencias++;
  });

  /**
   * Achado do `/revisar` na Tarefa 3: uma primeira versão usava
   * `atualizado_em` do título (o instante em que a linha foi gravada) como
   * proxy da data do recebimento — verdade só quando ninguém backdata. Este
   * teste planta um título `pago` cujo `Recebimento.data` é de 40 dias
   * atrás, mas cuja LINHA acabou de ser gravada agora (`atualizado_em` ~
   * "agora", por ser a única coisa que `plantarTitulo`/o banco preenchem
   * sozinhos). Se o filtro ainda usasse `atualizado_em`, este título
   * apareceria dentro da janela de 2 dias em volta de hoje — o que provaria
   * que a correção não pegou.
   */
  it("em Recebidas, o filtro e a ordem seguem a data do Recebimento, não a de quando a linha do título foi gravada", async () => {
    const e = await criarEmpresaDeTeste("l5b");
    const hoje = diaEmFortaleza(new Date());
    const haQuarentaDias = new Date(instanteDoDiaEmFortaleza(hoje).getTime() - 40 * 24 * 3600 * 1000);

    // Pago há 40 dias (Recebimento.data), mas a LINHA do título é gravada
    // agora — atualizado_em não sabe disso.
    await plantarTitulo(e, await criarFrete(e, 44400), {
      valor: 44400,
      valorRecebido: 44400,
      status: "pago",
      dataPagamento: haQuarentaDias,
    });

    const dentroDosUltimos2Dias = await listarCobrancas(e.empresaId, {
      situacao: "recebidas",
      periodo: {
        inicio: instanteDoDiaEmFortaleza(deslocarDias(hoje, -1)),
        fim: instanteDoDiaEmFortaleza(deslocarDias(hoje, 1)),
      },
      hoje,
    });
    // Se o código ainda usasse `atualizado_em` (que seria "agora"), este
    // título apareceria aqui — e não deveria, porque foi recebido há 40 dias.
    expect(dentroDosUltimos2Dias.map((t) => t.valor)).not.toContain(44400);

    const semFiltro = await listarCobrancas(e.empresaId, {
      situacao: "recebidas",
      periodo: null,
      hoje,
    });
    const encontrado = semFiltro.find((t) => t.valor === 44400);
    expect(encontrado?.ultimoRecebimentoEm?.getTime()).toBe(haQuarentaDias.getTime());
    conferencias++;
  });

  /**
   * Achado do segundo `/revisar`: o teste acima planta um título só, e não
   * mede ordem nem corte — "recebidas" passou a ordenar e cortar em
   * memória (`groupBy` + `sort` + `slice`, não mais `orderBy`/`take` do
   * Prisma), e nenhum teste provava que essa reimplementação preserva a
   * ordem certa. `ListaCobrancas.tsx` confia por escrito que a lista "já
   * vem ordenada do servidor... nunca reordena" — se o `sort` ou o `slice`
   * fossem invertidos ou removidos, nada além deste teste acusaria.
   */
  it("em Recebidas, três títulos com datas de recebimento diferentes saem do mais recente ao mais antigo, e o teto corta os mais antigos", async () => {
    const e = await criarEmpresaDeTeste("l5c");
    const hoje = diaEmFortaleza(new Date());
    const ha3Dias = new Date(instanteDoDiaEmFortaleza(hoje).getTime() - 3 * 24 * 3600 * 1000);
    const ha10Dias = new Date(instanteDoDiaEmFortaleza(hoje).getTime() - 10 * 24 * 3600 * 1000);
    const ha20Dias = new Date(instanteDoDiaEmFortaleza(hoje).getTime() - 20 * 24 * 3600 * 1000);

    // Plantados fora de ordem de propósito — se o código confiasse na ordem
    // de inserção (`criado_em`) em vez da data do recebimento, passaria por
    // coincidência.
    await plantarTitulo(e, await criarFrete(e, 10001), {
      valor: 10001,
      valorRecebido: 10001,
      status: "pago",
      dataPagamento: ha10Dias,
    });
    await plantarTitulo(e, await criarFrete(e, 10003), {
      valor: 10003,
      valorRecebido: 10003,
      status: "pago",
      dataPagamento: ha3Dias,
    });
    await plantarTitulo(e, await criarFrete(e, 10002), {
      valor: 10002,
      valorRecebido: 10002,
      status: "pago",
      dataPagamento: ha20Dias,
    });

    const semTeto = await listarCobrancas(e.empresaId, {
      situacao: "recebidas",
      periodo: null,
      hoje,
    });
    // Do mais recente (3 dias) ao mais antigo (20 dias) — nunca a ordem de
    // criação (10001, 10003, 10002).
    expect(semTeto.map((t) => t.valor)).toEqual([10003, 10001, 10002]);

    const comTeto = await listarCobrancas(e.empresaId, {
      situacao: "recebidas",
      periodo: null,
      limite: 2,
      hoje,
    });
    // O corte mantém os dois mais recentes, descarta o mais antigo (20 dias).
    expect(comTeto.map((t) => t.valor)).toEqual([10003, 10001]);
    conferencias++;
  });

  /**
   * A outra metade da decisão do fundador sobre frete arquivado (26/08/2026):
   * o filtro que tira frete arquivado de "A receber"/"Vencido"
   * (`resumoDeCobrancas`) e das listas em aberto **não se estende** a
   * "Recebidas" nem a "Recebido no mês" — dinheiro já recebido continua
   * contando, mesmo que o frete seja arquivado depois (`CLAUDE.md` §7).
   * Achado do quarto `/revisar`: só a metade que EXCLUI tinha teste; esta é
   * a metade que garante que ninguém estende o filtro por engano depois.
   */
  it("frete arquivado não tira a cobrança de Recebidas nem de Recebido no mês", async () => {
    const e = await criarEmpresaDeTeste("l5d");
    const hoje = diaEmFortaleza(new Date());
    const freteId = await criarFrete(e, 55500);
    await plantarTitulo(e, freteId, {
      valor: 55500,
      valorRecebido: 55500,
      status: "pago",
      dataPagamento: new Date(),
    });
    await arquivarServico(e.empresaId, freteId);

    const resumo = await resumoDeCobrancas(e.empresaId, hoje);
    expect(resumo.recebidoNoMes).toBe(55500);

    const recebidas = await listarCobrancas(e.empresaId, {
      situacao: "recebidas",
      periodo: null,
      hoje,
    });
    expect(recebidas.find((t) => t.valor === 55500)).toBeDefined();
    conferencias++;
  });

  it("o teto corta a lista, nunca a cobrança mais urgente", async () => {
    const e = await criarEmpresaDeTeste("l6");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(e, await criarFrete(e, 88000), {
      valor: 88000,
      status: "aberto",
      vencimento: deslocarDias(hoje, -5),
    });
    await plantarTitulo(e, await criarFrete(e, 99000), {
      valor: 99000,
      status: "aberto",
      vencimento: deslocarDias(hoje, 5),
    });

    const lista = await listarCobrancas(e.empresaId, {
      situacao: "em_aberto",
      periodo: null,
      limite: 1,
      hoje,
    });
    expect(lista.map((t) => t.valor)).toEqual([88000]);
    conferencias++;
  });

  it("uma empresa nunca lista cobrança da outra", async () => {
    const a = await criarEmpresaDeTeste("l7a");
    const b = await criarEmpresaDeTeste("l7b");
    const hoje = diaEmFortaleza(new Date());

    await plantarTitulo(b, await criarFrete(b, 123456), {
      valor: 123456,
      status: "aberto",
      vencimento: deslocarDias(hoje, 1),
    });

    const lista = await listarCobrancas(a.empresaId, {
      situacao: "em_aberto",
      periodo: null,
      hoje,
    });
    expect(lista).toHaveLength(0);
    conferencias++;
  });
});

describe("5. contarFretesAFaturar — o número do estado vazio", () => {
  it("conta o frete sem cobrança, e para de contar depois de faturado", async () => {
    const e = await criarEmpresaDeTeste("c1");
    const servicoId = await criarFrete(e, 15000);

    // Em andamento JÁ conta — decisão do fundador, 26/08/2026: o número
    // acompanha um botão que abre "Meus fretes" filtrado por A faturar, e lá
    // a etiqueta não olha `status_operacional`.
    expect(await contarFretesAFaturar(e.empresaId)).toBe(1);

    await marcarServicoFinalizado(e.empresaId, servicoId);
    expect(await contarFretesAFaturar(e.empresaId)).toBe(1);

    await faturarServico(e.empresaId, servicoId, {
      vencimento: instanteDoDiaEmFortaleza(deslocarDias(diaEmFortaleza(new Date()), 15)),
      formaPrevista: "outro",
    });
    expect(await contarFretesAFaturar(e.empresaId)).toBe(0);
    conferencias++;
  });

  it("título cancelado devolve o frete à conta; arquivado sai dela", async () => {
    const e = await criarEmpresaDeTeste("c2");
    const comCancelado = await criarFrete(e, 25000);
    await marcarServicoFinalizado(e.empresaId, comCancelado);
    await plantarTitulo(e, comCancelado, { valor: 25000, status: "cancelado" });
    expect(await contarFretesAFaturar(e.empresaId)).toBe(1);

    const arquivado = await criarFrete(e, 35000);
    await marcarServicoFinalizado(e.empresaId, arquivado);
    expect(await contarFretesAFaturar(e.empresaId)).toBe(2);
    await arquivarServico(e.empresaId, arquivado);
    expect(await contarFretesAFaturar(e.empresaId)).toBe(1);
    conferencias++;
  });

  /**
   * **O teste que amarra o número à tela que ele abre.** O estado vazio de
   * Cobranças mostra "Ver os N fretes" e leva a `/fretes?situacao=a_faturar`,
   * onde a etiqueta sai de `situacaoFinanceira` — duas consultas diferentes,
   * escritas em arquivos diferentes, que precisam devolver a mesma coisa
   * para sempre.
   *
   * Mede uma contra a outra, e não a leitura de que "parecem iguais": foi
   * exatamente essa leitura que falhou no primeiro passe do `/revisar` desta
   * tarefa, quando a contagem exigia `finalizado` e a lista não.
   *
   * O cenário tem os quatro estados que já se sabe distinguir hoje: em
   * andamento, finalizado sem título, faturado e com título cancelado.
   */
  it("o número é sempre igual ao que a lista de Fretes mostra em A faturar", async () => {
    const e = await criarEmpresaDeTeste("c3");

    const emAndamento = await criarFrete(e, 10000);
    const finalizado = await criarFrete(e, 20000);
    const faturado = await criarFrete(e, 30000);
    const comCancelado = await criarFrete(e, 40000);

    await marcarServicoFinalizado(e.empresaId, finalizado);
    await marcarServicoFinalizado(e.empresaId, faturado);
    await marcarServicoFinalizado(e.empresaId, comCancelado);
    await faturarServico(e.empresaId, faturado, {
      vencimento: instanteDoDiaEmFortaleza(deslocarDias(diaEmFortaleza(new Date()), 15)),
      formaPrevista: "outro",
    });
    await plantarTitulo(e, comCancelado, { valor: 40000, status: "cancelado" });

    const naLista = (await listarServicosComSituacao(e.empresaId)).filter(
      (s) => s.situacao_financeira === "a_faturar",
    );
    const contados = await contarFretesAFaturar(e.empresaId);

    expect(contados).toBe(naLista.length);
    // O cenário precisa ter os três que contam — senão a igualdade acima
    // passaria com zero dos dois lados, sem medir nada.
    expect(naLista.map((s) => s.id).sort()).toEqual(
      [emAndamento, finalizado, comCancelado].sort(),
    );
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
