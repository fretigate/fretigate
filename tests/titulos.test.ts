import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  criarTituloJaRecebi,
  buscarTituloPorServico,
  editarServicoComProtecaoDeTitulo,
  listarServicosComSituacao,
  buscarServicoComTitulos,
  resumoFinanceiroDoCliente,
  listarServicosDoCliente,
  listarServicosDoCaminhao,
  listarServicosDoMotorista,
} from "@/lib/servicos/titulos";
import {
  criarServico,
  arquivarServico,
  resumoDoCaminhao,
  resumoDoMotorista,
  type DadosServico,
  type Periodo,
} from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";
import { criarCaminhao } from "@/lib/servicos/caminhoes";
import { criarMotorista } from "@/lib/servicos/motoristas";

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
const CONFERENCIAS_ESPERADAS = 34;

type EmpresaDeTeste = {
  empresaId: string;
  usuarioId: string;
  tipoOperacaoId: string;
  clienteId: string;
  servicoId: string;
  valorServico: number;
};

/** Uma janela de 2 dias em volta de agora — cobre `data_servico`/`data_pagamento` de hoje. */
function periodoAmplo(): Periodo {
  const agora = new Date();
  return {
    inicio: new Date(agora.getTime() - 24 * 60 * 60 * 1000),
    fim: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
  };
}

/**
 * Planta um título direto por SQL (`raiz`, o mesmo papel que já insere
 * `tipo_operacao` nestes testes) — só para alcançar estados que nenhuma
 * função de serviço cria ainda (`aberto`, ou um segundo título não integral
 * para o mesmo frete). `criarTituloJaRecebi` é o único caminho de produção
 * até o item 6 existir, e ele só cria título pago e integral.
 */
async function plantarTitulo(
  e: { empresaId: string; clienteId: string },
  servicoId: string,
  dados: { valor: number; valorRecebido: number | null; status: "aberto" | "pago" | "cancelado"; integral: boolean; dataPagamento?: Date },
) {
  // Sem DEFAULT para "id" (migration `20260814140000_titulo_receber`) — a
  // aplicação gera o uuid antes do INSERT, como em toda tabela do domínio.
  await raiz.query(
    `INSERT INTO "titulo_receber"
       (id, servico_id, cliente_id, valor, valor_recebido, status, integral, data_pagamento, empresa_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      randomUUID(),
      servicoId,
      e.clienteId,
      dados.valor,
      dados.valorRecebido,
      dados.status,
      dados.integral,
      dados.dataPagamento ?? null,
      e.empresaId,
    ],
  );
}

/**
 * Conta quantas vezes o driver `pg` foi chamado — não `xact_commit` do
 * banco. Achado ao rodar pela primeira vez: `pg_stat_database` soma commits
 * de TODAS as sessões do banco de teste compartilhado (autovacuum incluso),
 * e a contagem saiu 8 num cenário que deveria ser ~2 — ruído de fundo, não
 * sinal.
 *
 * **Não é `Pool.prototype.query`.** `db()` sempre embrulha a operação em
 * `$transaction([...])` (`src/lib/db/index.ts`), e o adaptador abre a
 * transação com `pool.connect()` — pegando um `PoolClient` emprestado — e
 * emite cada consulta por **esse client**, não pelo `Pool`
 * (`node_modules/@prisma/adapter-pg/dist/index.js`, `startTransaction` +
 * `PgQueryable.performIO`, `this.client.query(...)` onde `this.client` já é
 * o `PoolClient`). Achado do segundo `/revisar`: a primeira versão
 * interceptava `Pool.prototype.query`, que nunca é chamado nesse caminho —
 * as duas contagens saíam zero, e `0 - 0 <= 2` passava sem medir nada. Um
 * `PoolClient` do `pg` é, por baixo, uma instância de `Client` — é
 * `Client.prototype.query` que precisa ser interceptado.
 */
function monitorarConsultasPg() {
  const original = Client.prototype.query;
  let total = 0;
  // A assinatura de `Client.prototype.query` tem várias sobrecargas; aqui só
  // se conta a chamada, o `apply` repassa os argumentos como vieram.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Client.prototype.query = function (this: Client, ...args: any[]) {
    total++;
    return (original as (...a: unknown[]) => unknown).apply(this, args);
  } as typeof Client.prototype.query;
  return {
    total: () => total,
    parar: () => {
      Client.prototype.query = original;
    },
  };
}

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

  return {
    empresaId,
    usuarioId,
    tipoOperacaoId,
    clienteId: cliente.id,
    servicoId: servico.id,
    valorServico,
  };
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
    // `motorista` referencia `veiculo` (veiculo_habitual_id) — sai antes
    // dele, mesma ordem de `tests/servicos.test.ts`. Achado do quarto
    // /revisar: a versão anterior invertia essa ordem; passava só porque
    // nenhum teste deste arquivo grava veiculo_habitual_id ainda.
    await raiz.query(`DELETE FROM "motorista" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "veiculo" WHERE empresa_id = ANY($1)`, [
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

describe("3b. editarServicoComProtecaoDeTitulo — trava valor e cliente do frete com título ativo (item 4, tarefa 4)", () => {
  /** `e.servicoId` já existe (`tipo_operacao_id`/`cliente_id`/`data_servico`/`valor` de `criarEmpresaDeTeste`). */
  function dadosParaEditar(e: EmpresaDeTeste, extra: Partial<DadosServico> = {}): DadosServico {
    return {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: e.valorServico,
      ...extra,
    };
  }

  it("sem título nenhum, edita valor e cliente livremente", async () => {
    const e = await criarEmpresaDeTeste("w1");
    const outroCliente = await criarCliente(e.empresaId, { nome: "Outro" });
    const editado = await editarServicoComProtecaoDeTitulo(
      e.empresaId,
      e.servicoId,
      dadosParaEditar(e, { cliente_id: outroCliente.id, valor: e.valorServico + 999 }),
    );
    expect(editado.cliente_id).toBe(outroCliente.id);
    expect(editado.valor).toBe(e.valorServico + 999);
    conferencias++;
  });

  it("com título ativo, recusa mudar o valor — a gravação nem chega a acontecer", async () => {
    const e = await criarEmpresaDeTeste("w2");
    await criarTituloJaRecebi(e.empresaId, e.servicoId);
    await expect(
      editarServicoComProtecaoDeTitulo(e.empresaId, e.servicoId, dadosParaEditar(e, { valor: e.valorServico + 1 })),
    ).rejects.toThrow(/valor/);
    const depois = await buscarServicoComTitulos(e.empresaId, e.servicoId);
    expect(depois?.valor).toBe(e.valorServico);
    conferencias++;
  });

  it("com título ativo, recusa trocar o cliente", async () => {
    const e = await criarEmpresaDeTeste("w3");
    const outroCliente = await criarCliente(e.empresaId, { nome: "Outro" });
    await criarTituloJaRecebi(e.empresaId, e.servicoId);
    await expect(
      editarServicoComProtecaoDeTitulo(e.empresaId, e.servicoId, dadosParaEditar(e, { cliente_id: outroCliente.id })),
    ).rejects.toThrow(/cliente/);
    conferencias++;
  });

  it("com título ativo, aceita quando valor e cliente ficam iguais — os outros sete campos continuam livres", async () => {
    const e = await criarEmpresaDeTeste("w4");
    await criarTituloJaRecebi(e.empresaId, e.servicoId);
    const editado = await editarServicoComProtecaoDeTitulo(
      e.empresaId,
      e.servicoId,
      dadosParaEditar(e, { carga_texto: "Mudou só a carga" }),
    );
    expect(editado.carga_texto).toBe("Mudou só a carga");
    expect(editado.valor).toBe(e.valorServico);
    conferencias++;
  });

  it("título cancelado destrava — não há mais dinheiro amarrado ao valor antigo", async () => {
    const e = await criarEmpresaDeTeste("w5");
    await plantarTitulo(e, e.servicoId, {
      valor: e.valorServico,
      valorRecebido: e.valorServico,
      status: "cancelado",
      integral: true,
      dataPagamento: new Date(),
    });
    const editado = await editarServicoComProtecaoDeTitulo(
      e.empresaId,
      e.servicoId,
      dadosParaEditar(e, { valor: e.valorServico + 1 }),
    );
    expect(editado.valor).toBe(e.valorServico + 1);
    conferencias++;
  });

  /**
   * Prova o achado do `/revisar`: a primeira versão decidia "ativo" olhando
   * só um título (`buscarTituloPorServico`, `findFirst`) — com dois títulos
   * no mesmo frete, um cancelado e outro ativo, o `findFirst` podia pegar o
   * cancelado e destravar por engano, mesmo a regra escrita já dizendo
   * "todos". Dois não-integrais, de propósito — o índice único
   * (`titulo_receber_um_integral_por_servico`) só limita título integral.
   */
  it("dois títulos no mesmo frete (um cancelado, um ativo) continuam travando — não basta olhar só um", async () => {
    const e = await criarEmpresaDeTeste("w6");
    await plantarTitulo(e, e.servicoId, {
      valor: e.valorServico,
      valorRecebido: e.valorServico,
      status: "cancelado",
      integral: false,
      dataPagamento: new Date(),
    });
    await plantarTitulo(e, e.servicoId, {
      valor: e.valorServico,
      valorRecebido: null,
      status: "aberto",
      integral: false,
    });
    await expect(
      editarServicoComProtecaoDeTitulo(e.empresaId, e.servicoId, dadosParaEditar(e, { valor: e.valorServico + 1 })),
    ).rejects.toThrow(/valor/);
    conferencias++;
  });

  it("recusa frete que não existe", async () => {
    const e = await criarEmpresaDeTeste("w7");
    await expect(
      editarServicoComProtecaoDeTitulo(e.empresaId, randomUUID(), dadosParaEditar(e)),
    ).rejects.toThrow("Frete não encontrado.");
    conferencias++;
  });
});

describe("4. listarServicosComSituacao — leitura em lote, sem N+1", () => {
  it("os quatro estados aparecem corretamente numa leitura em lote", async () => {
    const e = await criarEmpresaDeTeste("s1");
    // e.servicoId já existe, sem título nenhum → a_faturar.

    const dadosServico = {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: 100000,
    };

    const servicoQuitado = await criarServico(e.empresaId, e.usuarioId, dadosServico);
    await criarTituloJaRecebi(e.empresaId, servicoQuitado.id);

    const servicoFaturado = await criarServico(e.empresaId, e.usuarioId, dadosServico);
    await plantarTitulo(e, servicoFaturado.id, {
      valor: 100000,
      valorRecebido: null,
      status: "aberto",
      integral: true,
    });

    // Adiantamento pago + saldo em aberto — o segundo caminho para Parcial,
    // distinto do recebimento parcial num título só (já coberto na função
    // pura, `tests/situacao-financeira.test.ts`).
    const servicoParcial = await criarServico(e.empresaId, e.usuarioId, dadosServico);
    await plantarTitulo(e, servicoParcial.id, {
      valor: 40000,
      valorRecebido: 40000,
      status: "pago",
      integral: false,
    });
    await plantarTitulo(e, servicoParcial.id, {
      valor: 60000,
      valorRecebido: null,
      status: "aberto",
      integral: false,
    });

    const lista = await listarServicosComSituacao(e.empresaId);
    const porId = new Map(lista.map((s) => [s.id, s.situacao_financeira]));
    expect(porId.get(e.servicoId)).toBe("a_faturar");
    expect(porId.get(servicoQuitado.id)).toBe("quitado");
    expect(porId.get(servicoFaturado.id)).toBe("faturado");
    expect(porId.get(servicoParcial.id)).toBe("parcial");
    conferencias++;
  });

  it(
    "não faz uma consulta por frete — o número de idas ao banco não cresce com a quantidade de fretes",
    async () => {
      // Compara o custo com POUCOS fretes contra o custo com MUITOS —
      // em vez de um teto absoluto. `pg_stat_database.xact_commit` foi
      // tentado primeiro e reprovou por ruído: soma commit de TODAS as
      // sessões do banco de teste compartilhado (autovacuum incluso), não só
      // do nosso processo — saiu 8 num cenário que deveria ser ~2.
      // `monitorarConsultasPg` conta só as chamadas que O NOSSO processo fez
      // ao driver `pg`, imune a esse ruído. Se a leitura fosse uma consulta
      // por frete (N+1), o custo cresceria com N; sendo em lote, a diferença
      // entre pouco e muito fica presa a uma folga pequena e fixa.
      async function criarFretes(empresa: EmpresaDeTeste, quantidade: number) {
        const dadosServico = {
          tipo_operacao_id: empresa.tipoOperacaoId,
          cliente_id: empresa.clienteId,
          data_servico: new Date(),
          valor: 10000,
        };
        const servicos = await Promise.all(
          Array.from({ length: quantidade }, () =>
            criarServico(empresa.empresaId, empresa.usuarioId, dadosServico),
          ),
        );
        // Metade ganha título — cada `criarTituloJaRecebi` é sequencial por
        // dentro (busca → busca → cria), então em paralelo usa no máximo uma
        // conexão por chamada, não três.
        await Promise.all(
          servicos
            .slice(0, Math.floor(quantidade / 2))
            .map((s) => criarTituloJaRecebi(empresa.empresaId, s.id)),
        );
      }

      // Oito em paralelo no laço "grande" — mesmo teto já validado pela
      // concorrência de `criarServico` em `tests/servicos.test.ts` ("dentro
      // do pool de dez"). Achado do quinto /revisar: uma versão anterior
      // deste teste usava 16, que ultrapassa esse teto e arrisca a mesma
      // instabilidade de pool já documentada (`CLAUDE.md` §2, "21 conexões
      // de uma vez a um pool de dez").
      const e = await criarEmpresaDeTeste("s2");
      await criarFretes(e, 2);
      const monitorPequeno = monitorarConsultasPg();
      const resultadoPequeno = await listarServicosComSituacao(e.empresaId);
      const consultasPequeno = monitorPequeno.total();
      monitorPequeno.parar();

      const f = await criarEmpresaDeTeste("s2b");
      await criarFretes(f, 8);
      const monitorGrande = monitorarConsultasPg();
      const resultadoGrande = await listarServicosComSituacao(f.empresaId);
      const consultasGrande = monitorGrande.total();
      monitorGrande.parar();

      // e.servicoId/f.servicoId (auto-criados) + os fretes de cada laço.
      expect(resultadoPequeno).toHaveLength(1 + 2);
      expect(resultadoGrande).toHaveLength(1 + 8);

      // A instrumentação precisa provar que MEDIU, não só que não achou
      // nada (CLAUDE.md §3, item 4) — achado do segundo /revisar: a versão
      // anterior interceptava o método errado (`Pool`, não `Client`) e as
      // duas contagens saíam zero, o que teria passado em qualquer cenário,
      // N+1 incluso.
      expect(consultasPequeno).toBeGreaterThan(0);
      expect(consultasGrande).toBeGreaterThan(0);

      // A lista grande tem 3x mais fretes que a pequena (9 contra 3), mas o
      // número de idas ao banco não acompanha — uma consulta por frete
      // faria essa diferença crescer com N; aqui fica presa a uma folga
      // pequena e fixa.
      expect(consultasGrande - consultasPequeno).toBeLessThanOrEqual(2);
      conferencias++;
    },
    60_000,
  );

  it("isolamento: não mistura frete de outra empresa — leitura nova, CLAUDE.md §3", async () => {
    const a = await criarEmpresaDeTeste("s3a");
    await criarEmpresaDeTeste("s3b");

    const lista = await listarServicosComSituacao(a.empresaId);
    expect(lista.map((s) => s.id)).toEqual([a.servicoId]);
    conferencias++;
  });

  /**
   * Achado do segundo `/revisar`: `periodo`/`limite` (Tarefa 2, filtro de
   * "Meus fretes") nunca tinham sido exercidos contra o banco de verdade —
   * só as funções puras de `periodo.ts` (`tests/periodo.test.ts`), que não
   * tocam a consulta em si. É sobre esta janela que a soma de dinheiro da
   * tela é feita, então a borda (dentro/fora do intervalo) precisa medir
   * contra o banco, não só contra a lógica pura de data.
   */
  it("periodo filtra por data_servico — fora do intervalo não aparece, dentro aparece", async () => {
    const e = await criarEmpresaDeTeste("s4");
    const dentro = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date("2026-03-15T12:00:00Z"),
      valor: 50000,
    });
    const fora = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date("2026-01-01T12:00:00Z"),
      valor: 50000,
    });

    const lista = await listarServicosComSituacao(e.empresaId, {
      periodo: { inicio: new Date("2026-03-01T00:00:00Z"), fim: new Date("2026-03-31T23:59:59Z") },
    });
    const ids = lista.map((s) => s.id);
    expect(ids).toContain(dentro.id);
    expect(ids).not.toContain(fora.id);
    expect(ids).not.toContain(e.servicoId); // criado fora da janela de março
    conferencias++;
  });

  it("limite corta a quantidade retornada, mantendo os mais recentes primeiro", async () => {
    const e = await criarEmpresaDeTeste("s5");
    const dadosServico = {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      valor: 10000,
    };
    const criados = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        criarServico(e.empresaId, e.usuarioId, {
          ...dadosServico,
          data_servico: new Date(Date.now() + i * 60_000),
        }),
      ),
    );

    const lista = await listarServicosComSituacao(e.empresaId, { limite: 3 });
    expect(lista).toHaveLength(3);
    // Os 3 mais recentes dos 5 criados (e.servicoId é o mais antigo — criado
    // antes do laço, na própria `criarEmpresaDeTeste`).
    const idsEsperados = criados
      .slice(-3)
      .reverse()
      .map((s) => s.id);
    expect(lista.map((s) => s.id)).toEqual(idsEsperados);
    conferencias++;
  });
});

describe("5. buscarServicoComTitulos", () => {
  it("traz o servico com os títulos e a situação derivada", async () => {
    const e = await criarEmpresaDeTeste("t1");
    await criarTituloJaRecebi(e.empresaId, e.servicoId);

    const detalhe = await buscarServicoComTitulos(e.empresaId, e.servicoId);
    expect(detalhe?.id).toBe(e.servicoId);
    expect(detalhe?.titulos).toHaveLength(1);
    expect(detalhe?.situacao_financeira).toBe("quitado");
    conferencias++;
  });

  it("retorna null para id de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("t2a");
    const b = await criarEmpresaDeTeste("t2b");

    const detalhe = await buscarServicoComTitulos(a.empresaId, b.servicoId);
    expect(detalhe).toBeNull();
    conferencias++;
  });
});

describe("6. resumoFinanceiroDoCliente — dois números, título cancelado não conta para recebido", () => {
  it("soma já rodado e recebido no período, ignorando título cancelado", async () => {
    const e = await criarEmpresaDeTeste("u1");
    // e.servicoId (150000, sem título) já conta para "já rodado".

    const servicoRecebido = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: 50000,
    });
    await criarTituloJaRecebi(e.empresaId, servicoRecebido.id);

    const servicoCancelado = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: 30000,
    });
    await plantarTitulo(e, servicoCancelado.id, {
      valor: 30000,
      valorRecebido: 30000,
      status: "cancelado",
      integral: true,
      dataPagamento: new Date(),
    });

    const resumo = await resumoFinanceiroDoCliente(e.empresaId, e.clienteId, periodoAmplo());
    // "Já rodado" é o valor do frete em si — não depende do título nem do
    // seu status, por isso inclui o serviço com título cancelado.
    expect(resumo.jaRodado).toBe(e.valorServico + 50000 + 30000);
    // "Recebido" ignora o título cancelado — mesmo raciocínio de situacaoFinanceira.
    expect(resumo.recebidoNoPeriodo).toBe(50000);
    conferencias++;
  });

  it("fora do período não conta", async () => {
    const e = await criarEmpresaDeTeste("u2");
    const haUmAno = new Date();
    haUmAno.setUTCFullYear(haUmAno.getUTCFullYear() - 1);

    const servicoAntigo = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: haUmAno,
      valor: 80000,
    });
    await plantarTitulo(e, servicoAntigo.id, {
      valor: 80000,
      valorRecebido: 80000,
      status: "pago",
      integral: true,
      dataPagamento: haUmAno,
    });

    const resumo = await resumoFinanceiroDoCliente(e.empresaId, e.clienteId, periodoAmplo());
    // e.servicoId (auto-criado, dentro do período) ainda conta.
    expect(resumo.jaRodado).toBe(e.valorServico);
    expect(resumo.recebidoNoPeriodo).toBe(0);
    conferencias++;
  });

  it("frete cancelado (status_operacional) não conta para já rodado — decisão do fundador, 20/08/2026", async () => {
    const e = await criarEmpresaDeTeste("u3");
    const cancelado = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: 999999,
    });
    await raiz.query(
      `UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`,
      [cancelado.id],
    );

    const resumo = await resumoFinanceiroDoCliente(e.empresaId, e.clienteId, periodoAmplo());
    // Só e.servicoId (auto-criado) conta — o cancelado não vai acontecer.
    expect(resumo.jaRodado).toBe(e.valorServico);
    conferencias++;
  });

  it("isolamento: resumoFinanceiroDoCliente não enxerga cliente de outra empresa, mesmo com id real", async () => {
    const a = await criarEmpresaDeTeste("u4a");
    const b = await criarEmpresaDeTeste("u4b");

    const resumo = await resumoFinanceiroDoCliente(a.empresaId, b.clienteId, periodoAmplo());
    expect(resumo.jaRodado).toBe(0);
    expect(resumo.recebidoNoPeriodo).toBe(0);
    conferencias++;
  });
});

describe("7. históricos dos perfis — teto de 5, total real, situação em cada linha, isolamento", () => {
  it(
    "listarServicosDoCliente traz os 5 mais recentes, o total real, e cada linha já com a situação financeira",
    async () => {
      // Achado na esteira (CLAUDE.md §2, "suíte verde" ≠ "esteira verde"):
      // a primeira versão criava os 7 fretes num laço sequencial, rápido o
      // bastante localmente mas não contra o banco da esteira — estourou o
      // testTimeout de 30s lá, mesmo com a suíte inteira local verde.
      // Paralelizado (Promise.all) e com data_servico explícita em cada um
      // — não dependendo mais da ordem de chegada do INSERT, já que a
      // ordenação real é por data_servico, não por quando o teste rodou.
      const e = await criarEmpresaDeTeste("v1");
      const outroCliente = await criarCliente(e.empresaId, { nome: "Não entra" });
      const agora = new Date();
      const dadosServicoBase = {
        tipo_operacao_id: e.tipoOperacaoId,
        cliente_id: e.clienteId,
        valor: 10000,
      };

      const servicos = await Promise.all(
        Array.from({ length: 7 }, (_, i) =>
          criarServico(e.empresaId, e.usuarioId, {
            ...dadosServicoBase,
            // i=0 → +7 dias (o mais recente); i=6 → +1 dia — todos depois
            // de `agora` (data de e.servicoId), ordem determinística.
            data_servico: new Date(agora.getTime() + (7 - i) * 24 * 60 * 60 * 1000),
          }),
        ),
      );
      const ultimo = servicos[0];
      // O mais recente ganha título — decisão do fundador, 20/08/2026: toda
      // linha de frete no produto mostra a etiqueta, o histórico do perfil
      // também precisa.
      await criarTituloJaRecebi(e.empresaId, ultimo.id);
      // Frete de outro cliente não deve contar nem aparecer.
      await criarServico(e.empresaId, e.usuarioId, { ...dadosServicoBase, cliente_id: outroCliente.id, data_servico: agora });

      // Período largo o bastante pra cobrir os 7 fretes plantados até 7 dias
      // no futuro, mais o auto-criado por criarEmpresaDeTeste (~agora) — o
      // histórico agora segue o período (Tarefa 6, achado do segundo
      // /revisar), então `periodoAmplo()` (±1 dia) não bastaria aqui.
      const periodoDoTeste: Periodo = {
        inicio: new Date(agora.getTime() - 24 * 60 * 60 * 1000),
        fim: new Date(agora.getTime() + 8 * 24 * 60 * 60 * 1000),
      };
      const historico = await listarServicosDoCliente(e.empresaId, e.clienteId, periodoDoTeste);
      expect(historico.servicos).toHaveLength(5);
      expect(historico.total).toBe(8); // e.servicoId (auto-criado) + os 7 em paralelo
      expect(historico.totalGeral).toBe(8); // mesmo total, sem filtro de período
      const porId = new Map(historico.servicos.map((s) => [s.id, s.situacao_financeira]));
      expect(porId.get(ultimo.id)).toBe("quitado");
      conferencias++;
    },
    60_000,
  );

  it("listarServicosDoCaminhao e listarServicosDoMotorista filtram cada um pela própria entidade", async () => {
    const e = await criarEmpresaDeTeste("v2");
    const caminhaoA = await criarCaminhao(e.empresaId, { apelido: "A" });
    const caminhaoB = await criarCaminhao(e.empresaId, { apelido: "B" });
    const motorista = await criarMotorista(e.empresaId, { nome: "Do histórico" });
    const dadosServico = {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: 10000,
    };
    await criarServico(e.empresaId, e.usuarioId, { ...dadosServico, veiculo_id: caminhaoA.id });
    await criarServico(e.empresaId, e.usuarioId, { ...dadosServico, veiculo_id: caminhaoB.id });
    await criarServico(e.empresaId, e.usuarioId, { ...dadosServico, motorista_id: motorista.id });

    const historicoA = await listarServicosDoCaminhao(e.empresaId, caminhaoA.id, periodoAmplo());
    const historicoMotorista = await listarServicosDoMotorista(
      e.empresaId,
      motorista.id,
      periodoAmplo(),
    );
    expect(historicoA.total).toBe(1);
    expect(historicoMotorista.total).toBe(1);
    conferencias++;
  });

  it("isolamento: listarServicosDoCliente não enxerga cliente de outra empresa, mesmo com id real", async () => {
    // Achado do /revisar (20/08/2026): um teste de isolamento com um id que
    // não existe em lugar nenhum passaria de qualquer jeito e não prova nada
    // (CLAUDE.md §3). Aqui o id É real — b.clienteId tem um frete de verdade
    // (o auto-criado por criarEmpresaDeTeste) — e a empresa A não pode vê-lo.
    const a = await criarEmpresaDeTeste("v3a");
    const b = await criarEmpresaDeTeste("v3b");

    const historicoVistoPorA = await listarServicosDoCliente(a.empresaId, b.clienteId, periodoAmplo());
    expect(historicoVistoPorA.total).toBe(0);
    expect(historicoVistoPorA.servicos).toEqual([]);
    conferencias++;
  });

  it("isolamento: resumoDoCaminhao não enxerga caminhão de outra empresa, mesmo com id real", async () => {
    const a = await criarEmpresaDeTeste("v4a");
    const b = await criarEmpresaDeTeste("v4b");
    const caminhaoDeB = await criarCaminhao(b.empresaId, { apelido: "Só da B" });
    await criarServico(b.empresaId, b.usuarioId, {
      tipo_operacao_id: b.tipoOperacaoId,
      cliente_id: b.clienteId,
      veiculo_id: caminhaoDeB.id,
      data_servico: new Date(),
      valor: 70000,
      km: 10000,
    });

    const resumoVistoPorA = await resumoDoCaminhao(a.empresaId, caminhaoDeB.id, periodoAmplo());
    expect(resumoVistoPorA.kmPeriodoMetros).toBeNull();
    expect(resumoVistoPorA.rsPorKm).toBeNull();
    conferencias++;
  });

  it("isolamento: listarServicosDoCaminhao e listarServicosDoMotorista não enxergam entidade de outra empresa, mesmo com id real", async () => {
    const a = await criarEmpresaDeTeste("v5a");
    const b = await criarEmpresaDeTeste("v5b");
    const caminhaoDeB = await criarCaminhao(b.empresaId, { apelido: "Só da B" });
    const motoristaDeB = await criarMotorista(b.empresaId, { nome: "Só da B" });
    await criarServico(b.empresaId, b.usuarioId, {
      tipo_operacao_id: b.tipoOperacaoId,
      cliente_id: b.clienteId,
      veiculo_id: caminhaoDeB.id,
      motorista_id: motoristaDeB.id,
      data_servico: new Date(),
      valor: 50000,
    });

    const historicoCaminhaoVistoPorA = await listarServicosDoCaminhao(
      a.empresaId,
      caminhaoDeB.id,
      periodoAmplo(),
    );
    const historicoMotoristaVistoPorA = await listarServicosDoMotorista(
      a.empresaId,
      motoristaDeB.id,
      periodoAmplo(),
    );
    expect(historicoCaminhaoVistoPorA.total).toBe(0);
    expect(historicoMotoristaVistoPorA.total).toBe(0);
    conferencias++;
  });

  it("isolamento: resumoDoMotorista não enxerga motorista de outra empresa, mesmo com id real", async () => {
    const a = await criarEmpresaDeTeste("v6a");
    const b = await criarEmpresaDeTeste("v6b");
    const motoristaDeB = await criarMotorista(b.empresaId, { nome: "Só da B" });
    await criarServico(b.empresaId, b.usuarioId, {
      tipo_operacao_id: b.tipoOperacaoId,
      cliente_id: b.clienteId,
      motorista_id: motoristaDeB.id,
      data_servico: new Date(),
      valor: 50000,
    });

    const resumoVistoPorA = await resumoDoMotorista(a.empresaId, motoristaDeB.id, periodoAmplo());
    expect(resumoVistoPorA.fretesNoPeriodo).toBe(0);
    expect(resumoVistoPorA.valorTransportadoNoPeriodo).toBe(0);
    conferencias++;
  });

  it("ordena por data_servico (quando o frete aconteceu), não por criado_em (quando foi lançado)", async () => {
    // Decisão do fundador, 20/08/2026: a lista "Meus fretes" agrupa por
    // data_servico, e o histórico do perfil precisa da mesma ordem — senão
    // duas telas mostram ordens diferentes para o mesmo frete.
    const e = await criarEmpresaDeTeste("v7");
    const dadosServico = {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      valor: 10000,
    };
    const ontem = new Date();
    ontem.setUTCDate(ontem.getUTCDate() - 1);
    const semanaQuePassou = new Date();
    semanaQuePassou.setUTCDate(semanaQuePassou.getUTCDate() - 7);

    // Lançado (criado_em) DEPOIS, mas aconteceu (data_servico) ANTES —
    // ordenar por criado_em inverteria a posição dos dois.
    const antigo = await criarServico(e.empresaId, e.usuarioId, {
      ...dadosServico,
      data_servico: semanaQuePassou,
    });
    const recente = await criarServico(e.empresaId, e.usuarioId, {
      ...dadosServico,
      data_servico: ontem,
    });

    // Período largo o bastante pra cobrir o frete de 7 dias atrás — o
    // histórico segue o período (Tarefa 6), `periodoAmplo()` (±1 dia) não
    // alcançaria `semanaQuePassou`.
    const periodoDoTeste: Periodo = {
      inicio: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      fim: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    const historico = await listarServicosDoCliente(e.empresaId, e.clienteId, periodoDoTeste);
    const ids = historico.servicos.map((s) => s.id);
    // e.servicoId (auto-criado, data_servico = agora) vem primeiro; depois
    // o "recente" (ontem); depois o "antigo" (semana passada) — mesmo tendo
    // sido criado ANTES do "recente".
    expect(ids.indexOf(e.servicoId)).toBeLessThan(ids.indexOf(recente.id));
    expect(ids.indexOf(recente.id)).toBeLessThan(ids.indexOf(antigo.id));
    conferencias++;
  });

  it("frete cancelado continua na lista e no histórico — sai das somas, não das telas", async () => {
    const e = await criarEmpresaDeTeste("v8");
    const cancelado = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: 50000,
    });
    await raiz.query(
      `UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`,
      [cancelado.id],
    );

    const lista = await listarServicosComSituacao(e.empresaId);
    expect(lista.map((s) => s.id)).toContain(cancelado.id);

    const historico = await listarServicosDoCliente(e.empresaId, e.clienteId, periodoAmplo());
    expect(historico.servicos.map((s) => s.id)).toContain(cancelado.id);
    expect(historico.total).toBe(2); // e.servicoId + o cancelado
    conferencias++;
  });

  it("totalGeral distingue 'nenhum frete lançado' de 'nenhum frete neste período' — mesmo cliente, dois vazios diferentes", async () => {
    // Decisão do fundador, segundo /revisar da Tarefa 6: são textos
    // diferentes na tela ("Nenhum frete lançado ainda." vs "Nenhum frete
    // neste período."), e totalGeral (sem filtro de período) é o que os
    // distingue.
    const e = await criarEmpresaDeTeste("v9");
    // e.servicoId (auto-criado por criarEmpresaDeTeste) já data de ~agora —
    // mais este, uma semana atrás, para o cliente ter dois fretes reais,
    // nenhum dentro do período estreito que o teste pede abaixo.
    const semanaQuePassou = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: semanaQuePassou,
      valor: 30000,
    });
    // Janela de um dia, duas semanas atrás — não toca nem o auto-criado
    // (~agora) nem o de `semanaQuePassou` (-7 dias).
    const periodoEstreito: Periodo = {
      inicio: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      fim: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    };

    const historicoNoPeriodo = await listarServicosDoCliente(
      e.empresaId,
      e.clienteId,
      periodoEstreito,
    );
    expect(historicoNoPeriodo.servicos).toEqual([]);
    expect(historicoNoPeriodo.total).toBe(0);
    // e.servicoId (auto-criado, ~agora) + o de semanaQuePassou, sem filtro.
    expect(historicoNoPeriodo.totalGeral).toBe(2);
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
