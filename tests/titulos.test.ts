import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  criarTituloJaRecebi,
  faturarServico,
  vencimentoPadrao,
  buscarTituloPorServico,
  buscarTituloReceber,
  registrarRecebimento,
  traduzirFalhaDeRecebimento,
  ultimoRecebimentoEm,
  editarServicoComProtecaoDeTitulo,
  listarServicosComSituacao,
  buscarServicoComTitulos,
  resumoFinanceiroDoCliente,
  listarServicosDoCliente,
  listarServicosDoCaminhao,
  listarServicosDoMotorista,
  registrarCobrancaEnviada,
  ultimoEnvioPorTitulo,
  listarEnviosDoTitulo,
} from "@/lib/servicos/titulos";
import {
  criarServico,
  arquivarServico,
  marcarServicoFinalizado,
  resumoDoCaminhao,
  resumoDoMotorista,
  type DadosServico,
  type Periodo,
} from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";
import { criarCaminhao } from "@/lib/servicos/caminhoes";
import { criarMotorista } from "@/lib/servicos/motoristas";
import { diaEmFortaleza, instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";

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
const CONFERENCIAS_ESPERADAS = 70;

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
 * para o mesmo frete, ou `cancelado`). `criarTituloJaRecebi` e
 * `registrarRecebimento` são os caminhos de produção, e nenhum dos dois
 * cria "cancelado" nem um segundo título para o mesmo frete (estorno é o
 * item 7).
 *
 * **`valorRecebido`, quando informado, também planta um `Recebimento`**
 * (item 6, Tarefa 3) — desde que essa tarefa saiu de `TituloReceber`, é
 * essa a única forma de simular "já entrou dinheiro" que `situacaoFinanceira`
 * e `resumoFinanceiroDoCliente` enxergam.
 */
async function plantarTitulo(
  e: { empresaId: string; clienteId: string; usuarioId: string },
  servicoId: string,
  dados: { valor: number; valorRecebido: number | null; status: "aberto" | "pago" | "cancelado"; integral: boolean; dataPagamento?: Date },
): Promise<string> {
  // Sem DEFAULT para "id" (migration `20260814140000_titulo_receber`) — a
  // aplicação gera o uuid antes do INSERT, como em toda tabela do domínio.
  const tituloId = randomUUID();
  await raiz.query(
    `INSERT INTO "titulo_receber"
       (id, servico_id, cliente_id, valor, status, integral, empresa_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [tituloId, servicoId, e.clienteId, dados.valor, dados.status, dados.integral, e.empresaId],
  );

  if (dados.valorRecebido !== null && dados.valorRecebido > 0) {
    await raiz.query(
      `INSERT INTO "recebimento" (id, titulo_id, valor, data, usuario_id, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), tituloId, dados.valorRecebido, dados.dataPagamento ?? new Date(), e.usuarioId, e.empresaId],
    );
  }

  return tituloId;
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
    // `cobranca_enviada` e `recebimento` referenciam `titulo_receber` (item
    // 6, Tarefas 3 e 5) — saem primeiro. `titulo_receber` referencia servico
    // e cliente — sai antes deles.
    await raiz.query(`DELETE FROM "cobranca_enviada" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "recebimento" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
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
    const titulo = await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);

    expect(titulo.status).toBe("pago");
    expect(titulo.integral).toBe(true);
    expect(titulo.servico_id).toBe(e.servicoId);
    expect(titulo.cliente_id).toBe(e.clienteId);
    expect(titulo.valor).toBe(e.valorServico);
    // Nada perguntado nesta fatia — CLAUDE.md §9, "carga_categoria" mesma lógica.
    expect(titulo.vencimento).toBeNull();
    expect(titulo.forma_pagamento_prevista).toBeNull();
    expect(titulo.relatorio_id).toBeNull();
    conferencias++;

    // O recebimento nasce junto (item 6, Tarefa 3) — `valor_recebido` saiu
    // de `TituloReceber`; quem prova o fato agora é `Recebimento`.
    const recebimento = await raiz.query<{
      valor: number;
      data: Date;
      forma: string | null;
      usuario_id: string;
    }>("SELECT valor, data, forma, usuario_id FROM recebimento WHERE titulo_id = $1", [titulo.id]);
    expect(recebimento.rowCount).toBe(1);
    expect(recebimento.rows[0].valor).toBe(e.valorServico);
    expect(recebimento.rows[0].data.getTime()).toBeGreaterThanOrEqual(antes.getTime());
    expect(recebimento.rows[0].forma).toBeNull();
    expect(recebimento.rows[0].usuario_id).toBe(e.usuarioId);
    conferencias++;
  });

  it("buscarTituloPorServico acha o título recém-criado", async () => {
    const e = await criarEmpresaDeTeste("b");
    const criado = await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);
    const achado = await buscarTituloPorServico(e.empresaId, e.servicoId);
    expect(achado?.id).toBe(criado.id);
    conferencias++;
  });
});

describe("2. a conferência de FK — CLAUDE.md §3", () => {
  it("recusa servico_id de outra empresa (via Já recebi)", async () => {
    const a = await criarEmpresaDeTeste("c1");
    const b = await criarEmpresaDeTeste("c2");
    await expect(criarTituloJaRecebi(a.empresaId, a.usuarioId, b.servicoId)).rejects.toThrow(
      "Selecione um frete válido.",
    );
    conferencias++;
  });

  it("recusa servico_id que não existe", async () => {
    const e = await criarEmpresaDeTeste("e");
    await expect(criarTituloJaRecebi(e.empresaId, e.usuarioId, randomUUID())).rejects.toThrow(
      "Selecione um frete válido.",
    );
    conferencias++;
  });

  it("recusa servico_id arquivado", async () => {
    const e = await criarEmpresaDeTeste("f");
    await arquivarServico(e.empresaId, e.servicoId);
    await expect(criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId)).rejects.toThrow(
      "Selecione um frete válido.",
    );
    conferencias++;
  });
});

describe("3. um título integral por frete — achado da revisão do fundador", () => {
  it("Já recebi chamado duas vezes em sequência para o mesmo frete recusa na segunda", async () => {
    const e = await criarEmpresaDeTeste("g");
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);
    await expect(criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId)).rejects.toThrow(
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
      criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId),
      criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId),
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
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);
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
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);
    await expect(
      editarServicoComProtecaoDeTitulo(e.empresaId, e.servicoId, dadosParaEditar(e, { cliente_id: outroCliente.id })),
    ).rejects.toThrow(/cliente/);
    conferencias++;
  });

  it("com título ativo, aceita quando valor e cliente ficam iguais — os outros sete campos continuam livres", async () => {
    const e = await criarEmpresaDeTeste("w4");
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);
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
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, servicoQuitado.id);

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
            .map((s) => criarTituloJaRecebi(empresa.empresaId, empresa.usuarioId, s.id)),
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
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);

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
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, servicoRecebido.id);

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
      await criarTituloJaRecebi(e.empresaId, e.usuarioId, ultimo.id);
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

/**
 * Item 6, Tarefa 1 — "Faturar frete": o primeiro caminho do produto a criar
 * um título que ainda NÃO foi pago. Até aqui, `criarTituloJaRecebi` era o
 * único, e ele já nasce pago — por isso a etiqueta "Faturado"
 * (`situacaoFinanceira`) era inalcançável na prática.
 */
describe("8. vencimentoPadrao — os dois primeiros dos três níveis de prazo (§4.7)", () => {
  it("usa o prazo do cliente quando ele tem um", () => {
    expect(vencimentoPadrao("2026-08-26", 30, 15)).toBe("2026-09-25");
    conferencias++;
  });

  it("herda o prazo da empresa quando o do cliente é nulo", () => {
    expect(vencimentoPadrao("2026-08-26", null, 15)).toBe("2026-09-10");
    conferencias++;
  });

  it("atravessa virada de mês e de ano", () => {
    expect(vencimentoPadrao("2026-12-20", null, 15)).toBe("2027-01-04");
    conferencias++;
  });

  /**
   * O erro que esta verificação existe para pegar: usar UTC cru em vez do
   * dia de Fortaleza. Às 22h de Fortaleza (01h UTC do dia seguinte), quem
   * lesse a data em UTC contaria o prazo a partir de amanhã, e o vencimento
   * sairia um dia adiantado — o mesmo defeito que o `/revisar` já achou na
   * Tarefa 2 do item 3, e que `src/lib/utils/data-fortaleza.ts` existe para
   * eliminar. Mede a COMPOSIÇÃO (`diaEmFortaleza` + `vencimentoPadrao`),
   * não cada peça isolada — é na junção que o erro aparece.
   */
  it("conta o prazo a partir do dia de Fortaleza, não do dia em UTC", () => {
    // 27/08 às 01h UTC = 26/08 às 22h em Fortaleza (UTC-3).
    const instante = new Date("2026-08-27T01:00:00.000Z");
    expect(instante.toISOString().slice(0, 10)).toBe("2026-08-27"); // o dia errado
    expect(diaEmFortaleza(instante)).toBe("2026-08-26"); // o dia certo
    expect(vencimentoPadrao(diaEmFortaleza(instante), null, 15)).toBe("2026-09-10");
    conferencias++;
  });
});

describe("9. faturarServico — cria o título EM ABERTO", () => {
  it("status aberto, sem nada recebido, com vencimento e forma prevista gravados", async () => {
    const e = await criarEmpresaDeTeste("f1");
    await marcarServicoFinalizado(e.empresaId, e.servicoId);

    const vencimento = instanteDoDiaEmFortaleza("2026-09-10");
    const titulo = await faturarServico(e.empresaId, e.servicoId, {
      vencimento,
      formaPrevista: "boleto",
    });

    expect(titulo.status).toBe("aberto");
    expect(titulo.integral).toBe(true);
    // Sem nada recebido — item 6, Tarefa 3: quem prova isso agora é a
    // ausência de `Recebimento`, não mais um campo nulo no título.
    const recebimentos = await raiz.query("SELECT 1 FROM recebimento WHERE titulo_id = $1", [
      titulo.id,
    ]);
    expect(recebimentos.rowCount).toBe(0);
    expect(titulo.vencimento?.getTime()).toBe(vencimento.getTime());
    expect(titulo.forma_pagamento_prevista).toBe("boleto");
    // Derivados do Servico, nunca de input — mesma regra de "Já recebi".
    expect(titulo.cliente_id).toBe(e.clienteId);
    expect(titulo.valor).toBe(e.valorServico);
    // O automático é o item 7 (relatório); este caminho é o manual.
    expect(titulo.relatorio_id).toBeNull();
    conferencias++;
  });

  /**
   * O que este item destrava, dito como comportamento e não como campo:
   * antes dele, um frete só podia estar "A faturar" ou "Quitado", porque o
   * único título possível já nascia pago.
   */
  it("o frete passa a Faturado — título ativo, nenhum centavo entrou", async () => {
    const e = await criarEmpresaDeTeste("f2");
    await marcarServicoFinalizado(e.empresaId, e.servicoId);

    const antes = await buscarServicoComTitulos(e.empresaId, e.servicoId);
    expect(antes?.situacao_financeira).toBe("a_faturar");

    await faturarServico(e.empresaId, e.servicoId, {
      vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
      formaPrevista: "outro",
    });

    const depois = await buscarServicoComTitulos(e.empresaId, e.servicoId);
    expect(depois?.situacao_financeira).toBe("faturado");
    conferencias++;
  });

  it("recusa frete que ainda está em andamento", async () => {
    const e = await criarEmpresaDeTeste("f3");
    await expect(
      faturarServico(e.empresaId, e.servicoId, {
        vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
        formaPrevista: "outro",
      }),
    ).rejects.toThrow("Só dá para faturar um frete finalizado.");
    conferencias++;
  });

  it("recusa frete arquivado", async () => {
    const e = await criarEmpresaDeTeste("f4");
    await marcarServicoFinalizado(e.empresaId, e.servicoId);
    await arquivarServico(e.empresaId, e.servicoId);
    await expect(
      faturarServico(e.empresaId, e.servicoId, {
        vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
        formaPrevista: "outro",
      }),
    ).rejects.toThrow("Frete não encontrado.");
    conferencias++;
  });

  /** `CLAUDE.md` §3 — o Postgres não aplica RLS ao verificar chave estrangeira. */
  it("recusa servico_id de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("f5a");
    const b = await criarEmpresaDeTeste("f5b");
    await marcarServicoFinalizado(b.empresaId, b.servicoId);

    await expect(
      faturarServico(a.empresaId, b.servicoId, {
        vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
        formaPrevista: "outro",
      }),
    ).rejects.toThrow("Frete não encontrado.");

    // E o frete de B continua sem título nenhum — a recusa não gravou nada
    // "quase certo" no lugar errado.
    const b_ = await buscarServicoComTitulos(b.empresaId, b.servicoId);
    expect(b_?.titulos).toEqual([]);
    conferencias++;
  });

  it("recusa faturar duas vezes o mesmo frete", async () => {
    const e = await criarEmpresaDeTeste("f6");
    await marcarServicoFinalizado(e.empresaId, e.servicoId);
    const dados = {
      vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
      formaPrevista: "outro" as const,
    };
    await faturarServico(e.empresaId, e.servicoId, dados);
    await expect(faturarServico(e.empresaId, e.servicoId, dados)).rejects.toThrow(
      "Este frete já foi faturado.",
    );
    conferencias++;
  });

  it("recusa faturar um frete que já tem título de 'Já recebi'", async () => {
    const e = await criarEmpresaDeTeste("f7");
    await criarTituloJaRecebi(e.empresaId, e.usuarioId, e.servicoId);
    await marcarServicoFinalizado(e.empresaId, e.servicoId);
    await expect(
      faturarServico(e.empresaId, e.servicoId, {
        vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
        formaPrevista: "outro",
      }),
    ).rejects.toThrow("Este frete já foi faturado.");
    conferencias++;
  });

  /**
   * **Quem garante é o banco, não o `if`.** Dois pedidos simultâneos passam
   * os dois pela leitura antes de qualquer `INSERT` terminar — é o índice
   * único parcial `titulo_receber_um_integral_por_servico` que recusa o
   * segundo. Mesma prova já feita para `criarTituloJaRecebi` (bloco 3),
   * repetida aqui porque é outro caminho de escrita: se ele esquecesse de
   * traduzir o `P2002`, o usuário veria o erro cru do banco.
   */
  it("sob concorrência, exatamente um dos dois faturamentos passa", async () => {
    const e = await criarEmpresaDeTeste("f8");
    await marcarServicoFinalizado(e.empresaId, e.servicoId);
    const dados = {
      vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
      formaPrevista: "outro" as const,
    };

    const resultados = await Promise.allSettled([
      faturarServico(e.empresaId, e.servicoId, dados),
      faturarServico(e.empresaId, e.servicoId, dados),
    ]);

    const aceitos = resultados.filter((r) => r.status === "fulfilled");
    const recusados = resultados.filter((r) => r.status === "rejected");
    expect(aceitos).toHaveLength(1);
    expect(recusados).toHaveLength(1);
    // Mensagem do produto, nunca a do Postgres.
    expect((recusados[0] as PromiseRejectedResult).reason.message).toBe(
      "Este frete já foi faturado.",
    );

    const servico = await buscarServicoComTitulos(e.empresaId, e.servicoId);
    expect(servico?.titulos).toHaveLength(1);
    conferencias++;
  });
});

/**
 * Um título aberto de verdade (via `faturarServico`), pronto para receber.
 *
 * **Sempre um frete NOVO, nunca `e.servicoId`** — achado ao rodar: uma
 * primeira versão chamava `faturarServico(e.empresaId, e.servicoId, ...)` e
 * ignorava `valor`, porque `faturarServico` deriva o valor do próprio
 * `Servico` (nunca de parâmetro — `CLAUDE.md` §9, mesma regra de
 * "Já recebi"). O título saía sempre com `e.valorServico` (150000),
 * silenciosamente, e os testes de saldo/concorrência mediam o valor errado
 * sem nenhum `expect` acusar — só o teste do próprio saldo ficou vermelho.
 */
async function criarTituloAberto(e: EmpresaDeTeste, valor = e.valorServico) {
  const servico = await criarServico(e.empresaId, e.usuarioId, {
    tipo_operacao_id: e.tipoOperacaoId,
    cliente_id: e.clienteId,
    data_servico: new Date(),
    valor,
  });
  await marcarServicoFinalizado(e.empresaId, servico.id);
  return faturarServico(e.empresaId, servico.id, {
    vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
    formaPrevista: "outro",
  });
}

describe("10. registrarRecebimento — confirmar recebimento (item 6, Tarefa 3)", () => {
  it("recusa valor zero ou negativo, sem tocar o banco", async () => {
    const e = await criarEmpresaDeTeste("rec1");
    const titulo = await criarTituloAberto(e);

    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: 0,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow("Informe um valor válido.");
    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: -100,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow("Informe um valor válido.");
    conferencias++;
  });

  /**
   * Recebimento é registro de um fato que já aconteceu — nunca no futuro
   * (achado do `/revisar`: a folha permite "Outra data" sem teto, e nem o
   * schema nem esta função tinham essa recusa).
   */
  it("recusa data no futuro", async () => {
    const e = await criarEmpresaDeTeste("rec1b");
    const titulo = await criarTituloAberto(e);
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: e.valorServico,
        data: amanha,
        forma: "Pix",
      }),
    ).rejects.toThrow("Não dá para registrar um recebimento no futuro.");
    conferencias++;
  });

  /**
   * Teste determinístico de `traduzirFalhaDeRecebimento`, exportada só para
   * isto — achado do segundo `/revisar`: o teste de concorrência abaixo não
   * prova sozinho qual ramo desta função rodou, porque a checagem amigável
   * de `registrarRecebimento` pode pegar o mesmo caso antes de chegar aqui,
   * com a MESMA mensagem — o teste passaria pelo motivo errado. Testar a
   * função pura, com o texto exato que `registrar_recebimento` (a função de
   * banco) levanta, prova o mapeamento sem depender de vencer uma corrida.
   */
  it("traduzirFalhaDeRecebimento — mapeia cada causa da função de banco, sobe o resto como está", () => {
    expect(() => traduzirFalhaDeRecebimento(new Error("titulo_invalido"))).toThrow(
      "Esta cobrança já foi recebida ou cancelada.",
    );
    expect(() => traduzirFalhaDeRecebimento(new Error("saldo_insuficiente"))).toThrow(
      "Valor maior que o saldo em aberto.",
    );
    const desconhecido = new Error("connection terminated unexpectedly");
    expect(() => traduzirFalhaDeRecebimento(desconhecido)).toThrow(desconhecido);
    conferencias++;
  });

  it("recusa recebimento contra frete arquivado — mesma regra da secundária do detalhe, agora no serviço", async () => {
    const e = await criarEmpresaDeTeste("rec1c");
    const titulo = await criarTituloAberto(e);
    // O `servicoId` real não é `e.servicoId` (que fica sem título nesta
    // suíte) — `criarTituloAberto` cria um frete próprio. Precisa ser
    // resgatado do título para arquivar o frete certo.
    await arquivarServico(e.empresaId, titulo.servico_id);

    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: 100,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow("Este frete foi arquivado — não é possível registrar recebimento.");
    conferencias++;
  });

  /**
   * A conferência de FK que `CLAUDE.md` §3 exige: o Postgres não aplica RLS
   * na checagem de chave estrangeira, então sem esta checagem em
   * `buscarTituloReceber` o `tituloId` de outra empresa passaria batido para
   * a função de banco. `registrarRecebimento` confere ANTES de chamar
   * `registrarRecebimentoAtomico` — a mensagem prova que a recusa aconteceu
   * na camada certa.
   */
  it("recusa título de outra empresa (conferência de FK — CLAUDE.md §3)", async () => {
    const a = await criarEmpresaDeTeste("rec2a");
    const b = await criarEmpresaDeTeste("rec2b");
    const tituloDeB = await criarTituloAberto(b);

    await expect(
      registrarRecebimento(a.empresaId, a.usuarioId, tituloDeB.id, {
        valor: 100,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow("Cobrança não encontrada.");

    // A cobrança de B continua intacta — nada vazou nem foi alterado.
    const aindaAberto = await buscarTituloReceber(b.empresaId, tituloDeB.id);
    expect(aindaAberto?.status).toBe("aberto");
    conferencias++;
  });

  it("recusa título que não existe", async () => {
    const e = await criarEmpresaDeTeste("rec3");
    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, randomUUID(), {
        valor: 100,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow("Cobrança não encontrada.");
    conferencias++;
  });

  it("recusa título já pago — não edita o que já foi recebido por inteiro", async () => {
    const e = await criarEmpresaDeTeste("rec4");
    const titulo = await criarTituloAberto(e);
    await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: e.valorServico,
      data: new Date(),
      forma: "Pix",
    });

    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: 1,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow("Esta cobrança já foi recebida ou cancelada.");
    conferencias++;
  });

  /**
   * A mensagem diz o saldo — decisão do fundador, 26/08/2026
   * (`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 3): aceitar mais que
   * o saldo criaria um estado sem nome no produto, e dizer o número deixa a
   * pessoa corrigir na hora.
   */
  it("recusa valor maior que o saldo em aberto, com o saldo na mensagem", async () => {
    const e = await criarEmpresaDeTeste("rec5");
    const titulo = await criarTituloAberto(e);

    await expect(
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: e.valorServico + 1,
        data: new Date(),
        forma: "Pix",
      }),
    ).rejects.toThrow(`Valor maior que o saldo em aberto (R$ ${formatarCentavos(e.valorServico)}).`);
    conferencias++;
  });

  it("recebimento parcial: título continua aberto, com o saldo certo", async () => {
    const e = await criarEmpresaDeTeste("rec6");
    const titulo = await criarTituloAberto(e); // e.valorServico, ver criarEmpresaDeTeste

    const parcial = Math.floor(e.valorServico / 3);
    const atualizado = await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: parcial,
      data: new Date(),
      forma: "Dinheiro",
    });
    expect(atualizado.status).toBe("aberto");

    const recebimentos = await raiz.query<{ valor: number; forma: string }>(
      "SELECT valor, forma FROM recebimento WHERE titulo_id = $1",
      [titulo.id],
    );
    expect(recebimentos.rowCount).toBe(1);
    expect(recebimentos.rows[0].valor).toBe(parcial);
    expect(recebimentos.rows[0].forma).toBe("Dinheiro");
    conferencias++;
  });

  it("dois recebimentos parciais que somam o valor cheio fecham o título — pago", async () => {
    const e = await criarEmpresaDeTeste("rec7");
    const titulo = await criarTituloAberto(e, 30000);

    const meio = await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: 10000,
      data: new Date(),
      forma: "Pix",
    });
    expect(meio.status).toBe("aberto");

    const final = await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: 20000,
      data: new Date(),
      forma: "Transferência",
    });
    expect(final.status).toBe("pago");
    conferencias++;
  });

  it("'Outro' grava o texto digitado, não a palavra 'Outro'", async () => {
    const e = await criarEmpresaDeTeste("rec8");
    const titulo = await criarTituloAberto(e);

    await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: e.valorServico,
      data: new Date(),
      forma: "Cheque pré-datado",
    });
    const { rows } = await raiz.query<{ forma: string }>(
      "SELECT forma FROM recebimento WHERE titulo_id = $1",
      [titulo.id],
    );
    expect(rows[0].forma).toBe("Cheque pré-datado");
    conferencias++;
  });

  /**
   * **Quem garante é o banco, não o `if`** — mesmo princípio da concorrência
   * de `faturarServico` (bloco 9) e `criarTituloJaRecebi` (bloco 3), aqui um
   * nível mais fundo: a condição não é "existe uma linha" (índice único),
   * é um AGREGADO sobre outra tabela (soma dos recebimentos). Dois
   * recebimentos de metade do valor, disparados ao mesmo tempo, só podem
   * fechar o título uma vez — se os dois passassem, o título receberia mais
   * do que vale, dinheiro que não existe.
   */
  it("concorrência: dois recebimentos que juntos passam do valor — só um soma o suficiente para completar", async () => {
    const e = await criarEmpresaDeTeste("rec9");
    const titulo = await criarTituloAberto(e, 100000);
    const metade = 60000; // duas vezes isso estoura o valor (120000 > 100000)

    const resultados = await Promise.allSettled([
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: metade,
        data: new Date(),
        forma: "Pix",
      }),
      registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
        valor: metade,
        data: new Date(),
        forma: "Pix",
      }),
    ]);

    const aceitos = resultados.filter((r) => r.status === "fulfilled");
    const recusados = resultados.filter((r) => r.status === "rejected");
    expect(aceitos).toHaveLength(1);
    expect(recusados).toHaveLength(1);
    // Substring, não igualdade exata: qual das duas chamadas perde a corrida
    // decide SE a mensagem sai com o valor do saldo (a checagem amigável de
    // `registrarRecebimento`, quando ela ainda vê o saldo íntegro) ou sem
    // (`traduzirFalhaDeRecebimento`, quando a corrida só é detectada pela
    // função de banco) — as duas são "saldo insuficiente" de verdade, só
    // achadas em momentos diferentes. `traduzirFalhaDeRecebimento` (acima)
    // já prova cada mensagem sozinha, sem depender de vencer corrida nenhuma.
    expect((recusados[0] as PromiseRejectedResult).reason.message).toContain(
      "Valor maior que o saldo em aberto",
    );

    // A prova final, em dinheiro: nunca mais que o valor do título.
    const soma = await raiz.query<{ total: string }>(
      "SELECT COALESCE(SUM(valor), 0)::text AS total FROM recebimento WHERE titulo_id = $1",
      [titulo.id],
    );
    expect(Number(soma.rows[0].total)).toBe(metade);
    conferencias++;
  });
});

describe("11. ultimoRecebimentoEm — a data que \"recebido em X\" mostra (item 6, Tarefa 4)", () => {
  /**
   * Achado do `/revisar` na Tarefa 4: o resumo do detalhe da cobrança usava
   * `vencimento` como a data de "recebido em X" — para um título faturado
   * (com vencimento) e só depois recebido, isso afirmaria que o dinheiro
   * entrou num dia em que não entrou. `ultimoRecebimentoEm` é a fonte
   * correta: a data real do `Recebimento` mais recente, nunca o vencimento.
   */
  it("sem nenhum recebimento, devolve null", async () => {
    const e = await criarEmpresaDeTeste("urec1");
    const titulo = await criarTituloAberto(e);
    expect(await ultimoRecebimentoEm(e.empresaId, titulo.id)).toBeNull();
    conferencias++;
  });

  it("com dois recebimentos parciais registrados fora de ordem, devolve a data do MAIS RECENTE — nunca a mais antiga, nunca a ordem de inserção", async () => {
    const e = await criarEmpresaDeTeste("urec2");
    const titulo = await criarTituloAberto(e, 30000);
    const hoje = instanteDoDiaEmFortaleza(diaEmFortaleza(new Date()));
    const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

    // O recebimento de HOJE é registrado primeiro, o de ONTEM depois — se a
    // função lesse pela ordem de inserção (ou pelo primeiro que o banco
    // devolvesse), acertaria por acaso aqui. A prova real é inverter: gravar
    // fora de ordem cronológica e conferir que a função ainda acha a maior
    // data, não a última gravada.
    await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: 10000,
      data: hoje,
      forma: "Pix",
    });
    await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: 10000,
      data: ontem,
      forma: "Dinheiro",
    });

    const ultimo = await ultimoRecebimentoEm(e.empresaId, titulo.id);
    expect(ultimo).not.toBeNull();
    expect(diaEmFortaleza(ultimo!)).toBe(diaEmFortaleza(hoje));
    conferencias++;
  });
});

describe("12. registrarCobrancaEnviada — \"Cobrar no WhatsApp\" (item 6, Tarefa 5)", () => {
  it("recusa título de outra empresa (conferência de FK — CLAUDE.md §3)", async () => {
    const a = await criarEmpresaDeTeste("cob1a");
    const b = await criarEmpresaDeTeste("cob1b");
    const tituloDeB = await criarTituloAberto(b);

    await expect(
      registrarCobrancaEnviada(a.empresaId, a.usuarioId, tituloDeB.id),
    ).rejects.toThrow("Cobrança não encontrada.");

    // Nada vazou nem foi gravado para a cobrança de B.
    const envios = await listarEnviosDoTitulo(b.empresaId, tituloDeB.id);
    expect(envios).toHaveLength(0);
    conferencias++;
  });

  it("recusa título que não existe", async () => {
    const e = await criarEmpresaDeTeste("cob2");
    await expect(
      registrarCobrancaEnviada(e.empresaId, e.usuarioId, randomUUID()),
    ).rejects.toThrow("Cobrança não encontrada.");
    conferencias++;
  });

  it("recusa título já pago", async () => {
    const e = await criarEmpresaDeTeste("cob3");
    const titulo = await criarTituloAberto(e);
    await registrarRecebimento(e.empresaId, e.usuarioId, titulo.id, {
      valor: e.valorServico,
      data: new Date(),
      forma: "Pix",
    });

    await expect(
      registrarCobrancaEnviada(e.empresaId, e.usuarioId, titulo.id),
    ).rejects.toThrow("Esta cobrança já foi recebida ou cancelada.");
    conferencias++;
  });

  it("recusa título com forma prevista boleto — o banco já avisa, sem cobrar por aqui", async () => {
    const e = await criarEmpresaDeTeste("cob3b");
    const servico = await criarServico(e.empresaId, e.usuarioId, {
      tipo_operacao_id: e.tipoOperacaoId,
      cliente_id: e.clienteId,
      data_servico: new Date(),
      valor: e.valorServico,
    });
    await marcarServicoFinalizado(e.empresaId, servico.id);
    const titulo = await faturarServico(e.empresaId, servico.id, {
      vencimento: instanteDoDiaEmFortaleza("2026-09-10"),
      formaPrevista: "boleto",
    });

    await expect(
      registrarCobrancaEnviada(e.empresaId, e.usuarioId, titulo.id),
    ).rejects.toThrow("Cobrança por boleto — o banco já avisa, sem cobrar por aqui.");
    conferencias++;
  });

  it("recusa frete arquivado — mesmo critério de registrarRecebimento", async () => {
    const e = await criarEmpresaDeTeste("cob4");
    const titulo = await criarTituloAberto(e);
    await arquivarServico(e.empresaId, titulo.servico_id);

    await expect(
      registrarCobrancaEnviada(e.empresaId, e.usuarioId, titulo.id),
    ).rejects.toThrow("Este frete foi arquivado — não é possível registrar o envio.");
    conferencias++;
  });

  it("grava a confirmação — usuário e título certos, isolada por empresa", async () => {
    const e = await criarEmpresaDeTeste("cob5");
    const titulo = await criarTituloAberto(e);

    await registrarCobrancaEnviada(e.empresaId, e.usuarioId, titulo.id);

    const { rows } = await raiz.query<{ titulo_id: string; usuario_id: string; empresa_id: string }>(
      `SELECT titulo_id, usuario_id, empresa_id FROM cobranca_enviada WHERE titulo_id = $1`,
      [titulo.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].usuario_id).toBe(e.usuarioId);
    expect(rows[0].empresa_id).toBe(e.empresaId);
    conferencias++;
  });

  /**
   * Diferente de `marcarOrdemEnviada` (uma vez por frete): a mesma cobrança
   * pode ser cobrada mais de uma vez ao longo do tempo, e cada confirmação é
   * um fato próprio — histórico, não um campo único sobrescrito.
   */
  it("permite mais de uma confirmação para o mesmo título — histórico, não flag único", async () => {
    const e = await criarEmpresaDeTeste("cob6");
    const titulo = await criarTituloAberto(e);

    await registrarCobrancaEnviada(e.empresaId, e.usuarioId, titulo.id);
    await registrarCobrancaEnviada(e.empresaId, e.usuarioId, titulo.id);

    const envios = await listarEnviosDoTitulo(e.empresaId, titulo.id);
    expect(envios).toHaveLength(2);
    conferencias++;
  });
});

describe("13. ultimoEnvioPorTitulo — \"cobrado há X dias por Y\" em lote (item 6, Tarefa 5)", () => {
  it("título sem nenhum envio não entra no mapa", async () => {
    const e = await criarEmpresaDeTeste("uenv1");
    const titulo = await criarTituloAberto(e);

    const mapa = await ultimoEnvioPorTitulo(e.empresaId, [titulo.id]);
    expect(mapa.has(titulo.id)).toBe(false);
    conferencias++;
  });

  /**
   * Mesma prova de `ultimoRecebimentoEm` (bloco 11): grava fora de ordem
   * cronológica e confere que a função acha a MAIOR data, não a última
   * gravada nem a primeira que o banco devolver. `enviado_em` é escrito
   * direto por SQL aqui — `registrarCobrancaEnviada` sempre usa o instante
   * do toque, sem permitir escolher a data, então só assim dá para simular
   * dois envios em datas diferentes de forma determinística.
   */
  it("com dois envios fora de ordem, devolve o mais recente e quem enviou", async () => {
    const e = await criarEmpresaDeTeste("uenv2");
    const titulo = await criarTituloAberto(e);
    const hoje = new Date();
    const semanaPassada = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    const outroUsuarioId = `u-outro-${e.empresaId}`;
    await raiz.query(
      `INSERT INTO "usuario" (id, nome, email, papel, empresa_id) VALUES ($1, $2, $3, 'operador', $4)`,
      [outroUsuarioId, "Monalisa", `${outroUsuarioId}@teste.invalido`, e.empresaId],
    );

    // O envio da SEMANA PASSADA é gravado primeiro (pelo dono), o de HOJE
    // depois (por Monalisa) — se a função lesse pela ordem de inserção,
    // acertaria por acaso. A prova real é gravar fora de ordem.
    await raiz.query(
      `INSERT INTO "cobranca_enviada" (id, empresa_id, titulo_id, usuario_id, enviado_em)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [e.empresaId, titulo.id, e.usuarioId, semanaPassada],
    );
    await raiz.query(
      `INSERT INTO "cobranca_enviada" (id, empresa_id, titulo_id, usuario_id, enviado_em)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [e.empresaId, titulo.id, outroUsuarioId, hoje],
    );

    const mapa = await ultimoEnvioPorTitulo(e.empresaId, [titulo.id]);
    const ultimo = mapa.get(titulo.id);
    expect(ultimo).toBeDefined();
    expect(ultimo!.usuarioNome).toBe("Monalisa");
    expect(ultimo!.em.getTime()).toBe(hoje.getTime());
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
