import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  listarServicos,
  buscarServico,
  criarServico,
  editarServico,
  arquivarServico,
  marcarOrdemEnviada,
  marcarServicoFinalizado,
  salvarCaminhoComprovante,
  resumoDoCaminhao,
  resumoDoMotorista,
  valoresTotaisPorCliente,
  estatisticasPorCaminhao,
  estatisticasPorMotorista,
  buscarUltimaOrigemPreenchida,
  origemPadraoDoLancamento,
  type Periodo,
} from "@/lib/servicos/servicos";
import { resumoFinanceiroDoCliente } from "@/lib/servicos/titulos";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { criarCliente, arquivarCliente } from "@/lib/servicos/clientes";
import { criarCaminhao, arquivarCaminhao } from "@/lib/servicos/caminhoes";
import { criarMotorista, arquivarMotorista } from "@/lib/servicos/motoristas";

/**
 * Servico (tarefa 1 do item 3): cliente/valor/data/tipo de operação
 * obrigatórios, as quatro conferências de FK, o contador atômico de
 * `numero` e a resolução de município que nunca bloqueia o salvar.
 *
 * O isolamento entre empresas (contraste, concorrência, os três jeitos de não
 * ter contexto) já é coberto de forma genérica por `tests/isolamento/*` e
 * pela extensão de `vazamento.test.ts` para `servico`. Este arquivo mede a
 * REGRA DE NEGÓCIO: o que a especificação da entidade promete — e as
 * conferências de integridade referencial exigidas pelo `CLAUDE.md` §3, que
 * as camadas de isolamento não cobrem.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 58;

/** Uma janela de 2 dias em volta de agora — cobre `data_servico: new Date()` de `dadosMinimos`. */
function periodoAmplo(): Periodo {
  const agora = new Date();
  return {
    inicio: new Date(agora.getTime() - 24 * 60 * 60 * 1000),
    fim: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
  };
}

type EmpresaDeTeste = {
  empresaId: string;
  usuarioId: string;
  tipoOperacaoId: string;
  clienteId: string;
};

/**
 * Empresa + usuário + `TipoOperacao` "Frete" (via SQL cru, como
 * `vazamento.test.ts` já faz — não é a criação real, só o suficiente para
 * ter uma referência válida) + um `Cliente` (via `criarCliente`, o serviço
 * de verdade).
 */
async function criarEmpresaDeTeste(sufixo: string): Promise<EmpresaDeTeste> {
  const empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Servico Teste ${marca} ${sufixo}`],
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

function dadosMinimos(e: EmpresaDeTeste, extra: Record<string, unknown> = {}) {
  return {
    tipo_operacao_id: e.tipoOperacaoId,
    cliente_id: e.clienteId,
    data_servico: new Date(),
    valor: 150000,
    ...extra,
  };
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    // `servico` referencia tipo_operacao/cliente/veiculo/motorista — sai
    // primeiro. `motorista` referencia `veiculo`, sai antes dele.
    await raiz.query(`DELETE FROM "servico" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "motorista" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [
      empresasParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "veiculo" WHERE empresa_id = ANY($1)`, [
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

describe("1. CRUD básico", () => {
  it("cria com os obrigatórios e nasce em_andamento, manual, número 1", async () => {
    const e = await criarEmpresaDeTeste("a");
    const s = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    expect(s.numero).toBe(1);
    expect(s.status_operacional).toBe("em_andamento");
    expect(s.origem_lancamento).toBe("manual");
    expect(s.criado_por_usuario_id).toBe(e.usuarioId);
    expect(s.carga_categoria).toBeNull();
    expect(s.ordem_enviada_em).toBeNull();
    expect(s.comprovante_url).toBeNull();
    conferencias++;
  });

  it("recusa valor zero ou negativo", async () => {
    const e = await criarEmpresaDeTeste("b");
    await expect(
      criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { valor: 0 })),
    ).rejects.toThrow();
    conferencias++;
  });

  it("editar troca os dados sem mudar o número", async () => {
    const e = await criarEmpresaDeTeste("c");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { valor: 100 }));
    const editado = await editarServico(e.empresaId, criado.id, dadosMinimos(e, { valor: 200 }));
    expect(editado.valor).toBe(200);
    expect(editado.numero).toBe(criado.numero);
    conferencias++;
  });

  it("buscar e listar respeitam arquivado_em", async () => {
    const e = await criarEmpresaDeTeste("d");
    const ativo = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    const vaiArquivar = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    await arquivarServico(e.empresaId, vaiArquivar.id);

    const lista = await listarServicos(e.empresaId);
    expect(lista.map((s) => s.id)).toEqual([ativo.id]);

    const arquivado = await buscarServico(e.empresaId, vaiArquivar.id);
    expect(arquivado?.arquivado_em).not.toBeNull();
    conferencias++;
  });
});

describe("2. as quatro conferências de FK — CLAUDE.md §3", () => {
  it("recusa cliente de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("e1");
    const b = await criarEmpresaDeTeste("e2");
    await expect(
      criarServico(a.empresaId, a.usuarioId, dadosMinimos(a, { cliente_id: b.clienteId })),
    ).rejects.toThrow("Selecione um cliente válido.");
    conferencias++;
  });

  it("recusa tipo de operação de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("f1");
    const b = await criarEmpresaDeTeste("f2");
    await expect(
      criarServico(
        a.empresaId,
        a.usuarioId,
        dadosMinimos(a, { tipo_operacao_id: b.tipoOperacaoId }),
      ),
    ).rejects.toThrow("Selecione um tipo de operação válido.");
    conferencias++;
  });

  it("recusa caminhão de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("g1");
    const b = await criarEmpresaDeTeste("g2");
    const caminhaoDaB = await criarCaminhao(b.empresaId, { apelido: "Só da B" });
    await expect(
      criarServico(a.empresaId, a.usuarioId, dadosMinimos(a, { veiculo_id: caminhaoDaB.id })),
    ).rejects.toThrow("Selecione um caminhão válido.");
    conferencias++;
  });

  it("recusa motorista de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("h1");
    const b = await criarEmpresaDeTeste("h2");
    const motoristaDaB = await criarMotorista(b.empresaId, { nome: "Só da B" });
    await expect(
      criarServico(
        a.empresaId,
        a.usuarioId,
        dadosMinimos(a, { motorista_id: motoristaDaB.id }),
      ),
    ).rejects.toThrow("Selecione um motorista válido.");
    conferencias++;
  });

  it("aceita caminhão e motorista da própria empresa", async () => {
    const e = await criarEmpresaDeTeste("i");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Da casa" });
    const motorista = await criarMotorista(e.empresaId, { nome: "Da casa" });
    const s = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, motorista_id: motorista.id }),
    );
    expect(s.veiculo_id).toBe(caminhao.id);
    expect(s.motorista_id).toBe(motorista.id);
    conferencias++;
  });

  it("recusa usuário de outra empresa em criado_por_usuario_id", async () => {
    const a = await criarEmpresaDeTeste("i1");
    const b = await criarEmpresaDeTeste("i2");
    await expect(
      criarServico(a.empresaId, b.usuarioId, dadosMinimos(a)),
    ).rejects.toThrow("Sessão inválida.");
    conferencias++;
  });
});

describe("2b. arquivado é recusado em referência NOVA — decisão do fundador, 11/08/2026", () => {
  it("recusa cliente arquivado", async () => {
    const e = await criarEmpresaDeTeste("i3");
    const cliente = await criarCliente(e.empresaId, { nome: "Vai arquivar" });
    await arquivarCliente(e.empresaId, cliente.id);
    await expect(
      criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { cliente_id: cliente.id })),
    ).rejects.toThrow("Selecione um cliente válido.");
    conferencias++;
  });

  it("recusa caminhão arquivado", async () => {
    const e = await criarEmpresaDeTeste("i4");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Vai arquivar" });
    await arquivarCaminhao(e.empresaId, caminhao.id);
    await expect(
      criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { veiculo_id: caminhao.id })),
    ).rejects.toThrow("Selecione um caminhão válido.");
    conferencias++;
  });

  it("recusa motorista arquivado", async () => {
    const e = await criarEmpresaDeTeste("i5");
    const motorista = await criarMotorista(e.empresaId, { nome: "Vai arquivar" });
    await arquivarMotorista(e.empresaId, motorista.id);
    await expect(
      criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { motorista_id: motorista.id })),
    ).rejects.toThrow("Selecione um motorista válido.");
    conferencias++;
  });

  it("recusa tipo de operação inativo", async () => {
    const e = await criarEmpresaDeTeste("i6");
    const tipoInativoId = randomUUID();
    await raiz.query(
      `INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
       VALUES ($1, $2, 'Guincho', 'guincho', false, 3)`,
      [tipoInativoId, e.empresaId],
    );
    await expect(
      criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { tipo_operacao_id: tipoInativoId })),
    ).rejects.toThrow("Selecione um tipo de operação válido.");
    conferencias++;
  });
});

describe("2c. arquivado é aceito na EDIÇÃO quando o id não muda — item 4, tarefa 4", () => {
  it("edita outro campo de um frete cujo cliente foi arquivado depois, sem tocar no cliente", async () => {
    const e = await criarEmpresaDeTeste("r1");
    const cliente = await criarCliente(e.empresaId, { nome: "Vai arquivar depois" });
    const criado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { cliente_id: cliente.id, carga_texto: "Antes" }),
    );
    await arquivarCliente(e.empresaId, cliente.id);

    const editado = await editarServico(
      e.empresaId,
      criado.id,
      dadosMinimos(e, { cliente_id: cliente.id, carga_texto: "Depois" }),
    );
    expect(editado.cliente_id).toBe(cliente.id);
    expect(editado.carga_texto).toBe("Depois");
    conferencias++;
  });

  it("edita outro campo de um frete cujo caminhão e motorista foram arquivados depois, sem tocar neles", async () => {
    const e = await criarEmpresaDeTeste("r2");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Vai arquivar" });
    const motorista = await criarMotorista(e.empresaId, { nome: "Vai arquivar" });
    const criado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, motorista_id: motorista.id }),
    );
    await arquivarCaminhao(e.empresaId, caminhao.id);
    await arquivarMotorista(e.empresaId, motorista.id);

    const editado = await editarServico(
      e.empresaId,
      criado.id,
      dadosMinimos(e, { veiculo_id: caminhao.id, motorista_id: motorista.id, carga_texto: "Editado" }),
    );
    expect(editado.veiculo_id).toBe(caminhao.id);
    expect(editado.motorista_id).toBe(motorista.id);
    expect(editado.carga_texto).toBe("Editado");
    conferencias++;
  });

  it("trocar para OUTRO cliente arquivado continua recusado, mesmo na edição", async () => {
    const e = await criarEmpresaDeTeste("r3");
    const original = await criarCliente(e.empresaId, { nome: "Original" });
    const outroArquivado = await criarCliente(e.empresaId, { nome: "Outro, vai arquivar" });
    await arquivarCliente(e.empresaId, outroArquivado.id);
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { cliente_id: original.id }));

    await expect(
      editarServico(e.empresaId, criado.id, dadosMinimos(e, { cliente_id: outroArquivado.id })),
    ).rejects.toThrow("Selecione um cliente válido.");
    conferencias++;
  });

  it("recusa editar um frete que não existe", async () => {
    const e = await criarEmpresaDeTeste("r5");
    await expect(editarServico(e.empresaId, randomUUID(), dadosMinimos(e))).rejects.toThrow(
      "Frete não encontrado.",
    );
    conferencias++;
  });

  it("recusa editar um frete arquivado — mesma mensagem de não encontrado", async () => {
    const e = await criarEmpresaDeTeste("r6");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    await arquivarServico(e.empresaId, criado.id);
    await expect(editarServico(e.empresaId, criado.id, dadosMinimos(e))).rejects.toThrow(
      "Frete não encontrado.",
    );
    conferencias++;
  });
});

describe("3. número sequencial por empresa — contador atômico", () => {
  it("o segundo serviço da mesma empresa nasce com número 2", async () => {
    const e = await criarEmpresaDeTeste("j");
    const primeiro = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    const segundo = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    expect(primeiro.numero).toBe(1);
    expect(segundo.numero).toBe(2);
    conferencias++;
  });

  it("duas empresas diferentes começam cada uma do 1", async () => {
    const a = await criarEmpresaDeTeste("k1");
    const b = await criarEmpresaDeTeste("k2");
    const sa = await criarServico(a.empresaId, a.usuarioId, dadosMinimos(a));
    const sb = await criarServico(b.empresaId, b.usuarioId, dadosMinimos(b));
    expect(sa.numero).toBe(1);
    expect(sb.numero).toBe(1);
    conferencias++;
  });

  it("concorrência: criações simultâneas da mesma empresa nunca colidem", async () => {
    // Isolamento que só funciona com um pedido por vez não é isolamento —
    // aqui a garantia é unicidade, não vazamento (CLAUDE.md §3, "concorrência
    // real" aplicado a uma garantia diferente).
    //
    // Sem lote de conexão aqui, de propósito: `dadosMinimos(e)` não passa
    // `origem_texto`/`destino_texto`, então `normalizarEntrada` não chama
    // `resolverMunicipio` nenhuma vez (`src/lib/servicos/servicos.ts:125-131`)
    // — cada `criarServico` desta chamada usa UMA conexão, não duas. Oito
    // simultâneas pedem até oito no pico, dentro do pool de dez. Medido,
    // não suposto, depois de uma primeira versão errada deste comentário
    // (achada pelo `/revisar`) ter afirmado "duas conexões" como regra
    // geral quando só vale com origem e destino preenchidos.
    const e = await criarEmpresaDeTeste("l");
    const QUANTIDADE = 8;
    const criados = await Promise.all(
      Array.from({ length: QUANTIDADE }, () =>
        criarServico(e.empresaId, e.usuarioId, dadosMinimos(e)),
      ),
    );
    const numeros = criados.map((s) => s.numero).sort((x, y) => x - y);
    expect(numeros).toEqual(
      Array.from({ length: QUANTIDADE }, (_, i) => i + 1),
    );
    conferencias++;
  });
});

describe("4. resolução de município — nunca bloqueia o salvar", () => {
  it("texto que resolve grava origem_municipio_id/destino_municipio_id", async () => {
    const e = await criarEmpresaDeTeste("m");
    const s = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { origem_texto: "Fortaleza", destino_texto: "Fortaleza/CE" }),
    );
    expect(s.origem_municipio_id).toBe(2304400);
    expect(s.destino_municipio_id).toBe(2304400);
    conferencias++;
  });

  it("texto que não resolve continua salvando, com município nulo", async () => {
    const e = await criarEmpresaDeTeste("n");
    const s = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { origem_texto: "Cidade Que Nao Existe Em Lugar Nenhum" }),
    );
    expect(s.origem_texto).toBe("Cidade Que Nao Existe Em Lugar Nenhum");
    expect(s.origem_municipio_id).toBeNull();
    conferencias++;
  });

  it("sem origem/destino digitados, os dois ficam nulos", async () => {
    const e = await criarEmpresaDeTeste("o");
    const s = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    expect(s.origem_texto).toBeNull();
    expect(s.origem_municipio_id).toBeNull();
    expect(s.destino_texto).toBeNull();
    expect(s.destino_municipio_id).toBeNull();
    conferencias++;
  });
});

describe("4b. buscarUltimaOrigemPreenchida e origemPadraoDoLancamento — item 10, Tarefa 3", () => {
  it("o mais recente tem origem — é ele que volta", async () => {
    const e = await criarEmpresaDeTeste("uop1");
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { origem_texto: "Fortaleza" }));
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { origem_texto: "Sobral" }));
    const ultima = await buscarUltimaOrigemPreenchida(e.empresaId);
    expect(ultima?.origem_texto).toBe("Sobral");
    conferencias++;
  });

  it("o mais recente NÃO tem origem — olha pra trás até achar uma preenchida", async () => {
    const e = await criarEmpresaDeTeste("uop2");
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { origem_texto: "Fortaleza" }));
    // Frete mais recente, sem origem — não é este que deve voltar.
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    const ultima = await buscarUltimaOrigemPreenchida(e.empresaId);
    expect(ultima?.origem_texto).toBe("Fortaleza");
    conferencias++;
  });

  it("nenhum frete tem origem — devolve null (quem decide o pátio é origemPadraoDoLancamento)", async () => {
    const e = await criarEmpresaDeTeste("uop3");
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    const ultima = await buscarUltimaOrigemPreenchida(e.empresaId);
    expect(ultima?.origem_texto).toBeUndefined();
    conferencias++;
  });

  it("origemPadraoDoLancamento: origem preenchida manda, mesmo com pátio cadastrado", () => {
    expect(
      origemPadraoDoLancamento({ ultimaOrigemPreenchida: "Sobral", patioEndereco: "Av. do Pátio" }),
    ).toBe("Sobral");
    conferencias++;
  });

  it("origemPadraoDoLancamento: sem origem preenchida, cai pro pátio", () => {
    expect(
      origemPadraoDoLancamento({ ultimaOrigemPreenchida: null, patioEndereco: "Av. do Pátio" }),
    ).toBe("Av. do Pátio");
    conferencias++;
  });

  it("origemPadraoDoLancamento: nem origem nem pátio — campo nasce vazio", () => {
    expect(origemPadraoDoLancamento({ ultimaOrigemPreenchida: null, patioEndereco: null })).toBe("");
    conferencias++;
  });
});

describe("5. resumoDoCaminhao — km convertido de metros, R$/km só sobre fretes com km", () => {
  it("soma valor e km só dos fretes que TÊM km — frete sem km não entra em nenhum dos dois lados", async () => {
    const e = await criarEmpresaDeTeste("p1");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Do resumo" });
    // 10km + 5km = 15km; R$1.500,00 + R$500,00 = R$2.000,00 → R$133,33/km.
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 150000, km: 10000 }),
    );
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 50000, km: 5000 }),
    );
    // Achado do /revisar (20/08/2026): um terceiro frete SEM km, com valor
    // alto, provaria o bug se entrasse no numerador sem entrar no
    // denominador — o R$/km sairia inflado.
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 900000 }),
    );

    const resumo = await resumoDoCaminhao(e.empresaId, caminhao.id, periodoAmplo());
    // kmPeriodoMetros é metros, inteiro — CLAUDE.md §7: soma de distância
    // continua sendo distância, nunca float em quilômetros (achado do
    // terceiro /revisar, corrigindo a versão anterior deste campo).
    expect(resumo.kmPeriodoMetros).toBe(15000);
    // rsPorKm sai em REAIS, não centavos — achado do quarto /revisar: sem o
    // /100, o retorno seria centavos-por-km (13333,33), não os R$133,33/km
    // que o comentário acima já prometia.
    expect(resumo.rsPorKm).toBeCloseTo(2000 / 15, 5);
    // Achado do segundo /revisar: a tela precisa saber quantos fretes do
    // período têm km, contra o total, para exibir a cobertura quando for
    // parcial (CLAUDE.md §8, regra 10). Aqui: 2 de 3.
    expect(resumo.fretesComKm).toBe(2);
    expect(resumo.fretesNoPeriodo).toBe(3);
    conferencias++;
  });

  it("sem km preenchido em nenhum frete do período, kmPeriodoMetros e rsPorKm ficam nulos", async () => {
    const e = await criarEmpresaDeTeste("p2");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Sem km" });
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { veiculo_id: caminhao.id, valor: 90000 }));

    const resumo = await resumoDoCaminhao(e.empresaId, caminhao.id, periodoAmplo());
    expect(resumo.kmPeriodoMetros).toBeNull();
    expect(resumo.rsPorKm).toBeNull();
    expect(resumo.fretesComKm).toBe(0);
    expect(resumo.fretesNoPeriodo).toBe(1);
    conferencias++;
  });

  it("frete fora do período não entra na soma, mesmo tendo km", async () => {
    const e = await criarEmpresaDeTeste("p3");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Fora do período" });
    const haUmAno = new Date();
    haUmAno.setUTCFullYear(haUmAno.getUTCFullYear() - 1);
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 90000, km: 9000, data_servico: haUmAno }),
    );

    const resumo = await resumoDoCaminhao(e.empresaId, caminhao.id, periodoAmplo());
    expect(resumo.kmPeriodoMetros).toBeNull();
    expect(resumo.rsPorKm).toBeNull();
    expect(resumo.fretesNoPeriodo).toBe(0);
    conferencias++;
  });

  it("frete cancelado não conta nem no valor nem no km — decisão do fundador, 20/08/2026", async () => {
    const e = await criarEmpresaDeTeste("p4");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Com cancelado" });
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 100000, km: 10000 }),
    );
    const cancelado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 999999, km: 999999 }),
    );
    await raiz.query(
      `UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`,
      [cancelado.id],
    );

    const resumo = await resumoDoCaminhao(e.empresaId, caminhao.id, periodoAmplo());
    expect(resumo.kmPeriodoMetros).toBe(10000);
    expect(resumo.rsPorKm).toBeCloseTo(1000 / 10, 5);
    expect(resumo.fretesNoPeriodo).toBe(1);
    conferencias++;
  });

  it("km = 0 não conta — entraria no numerador sem contribuir ao denominador", async () => {
    // Achado do quinto /revisar: `km: { not: null }` deixaria um frete com
    // km=0 (tecnicamente "não nulo") somar seu valor sem somar distância
    // nenhuma, inflando o R$/km — a mesma classe de bug do primeiro passe,
    // só que disfarçada. O filtro certo é `km: { gt: 0 }`.
    const e = await criarEmpresaDeTeste("p5");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Com km zero" });
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 100000, km: 10000 }),
    );
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 999999, km: 0 }),
    );

    const resumo = await resumoDoCaminhao(e.empresaId, caminhao.id, periodoAmplo());
    expect(resumo.kmPeriodoMetros).toBe(10000);
    expect(resumo.rsPorKm).toBeCloseTo(1000 / 10, 5);
    expect(resumo.fretesComKm).toBe(1);
    expect(resumo.fretesNoPeriodo).toBe(2);
    conferencias++;
  });
});

describe("6. resumoDoMotorista — fretes e valor transportado no período", () => {
  it("conta fretes e soma valor transportado no período", async () => {
    const e = await criarEmpresaDeTeste("q1");
    const motorista = await criarMotorista(e.empresaId, { nome: "Do resumo" });
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { motorista_id: motorista.id, valor: 100000 }));
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { motorista_id: motorista.id, valor: 50000 }));

    const resumo = await resumoDoMotorista(e.empresaId, motorista.id, periodoAmplo());
    expect(resumo.fretesNoPeriodo).toBe(2);
    expect(resumo.valorTransportadoNoPeriodo).toBe(150000);
    conferencias++;
  });

  it("frete fora do período não entra na contagem nem na soma", async () => {
    const e = await criarEmpresaDeTeste("q2");
    const motorista = await criarMotorista(e.empresaId, { nome: "Fora do período" });
    const haUmAno = new Date();
    haUmAno.setUTCFullYear(haUmAno.getUTCFullYear() - 1);
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { motorista_id: motorista.id, valor: 70000, data_servico: haUmAno }),
    );

    const resumo = await resumoDoMotorista(e.empresaId, motorista.id, periodoAmplo());
    expect(resumo.fretesNoPeriodo).toBe(0);
    expect(resumo.valorTransportadoNoPeriodo).toBe(0);
    conferencias++;
  });

  it("frete cancelado não conta nem na contagem nem no valor transportado", async () => {
    const e = await criarEmpresaDeTeste("q3");
    const motorista = await criarMotorista(e.empresaId, { nome: "Com cancelado" });
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { motorista_id: motorista.id, valor: 60000 }));
    const cancelado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { motorista_id: motorista.id, valor: 999999 }),
    );
    await raiz.query(
      `UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`,
      [cancelado.id],
    );

    const resumo = await resumoDoMotorista(e.empresaId, motorista.id, periodoAmplo());
    expect(resumo.fretesNoPeriodo).toBe(1);
    expect(resumo.valorTransportadoNoPeriodo).toBe(60000);
    conferencias++;
  });
});

describe("7. valoresTotaisPorCliente — mesmo número do resumo do perfil (Tarefa 5)", () => {
  it("bate exatamente com resumoFinanceiroDoCliente.jaRodado, para o mesmo cliente — o risco central desta tarefa", async () => {
    // O número que ordena a lista de Clientes e o número que o resumo do
    // perfil mostra são o MESMO cálculo visto de dois lugares. Esta
    // igualdade é o teste em si, não uma conferência a mais: se um dia
    // alguém alterar um dos dois filtros (por exemplo, parar de excluir
    // cancelado só num dos dois lugares), é aqui que quebra — um teste que
    // só conferisse "valoresTotaisPorCliente roda sem erro" passaria mesmo
    // com o filtro errado.
    const e = await criarEmpresaDeTeste("s1");
    const haDoisAnos = new Date();
    haDoisAnos.setUTCFullYear(haDoisAnos.getUTCFullYear() - 2);
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { valor: 100000, data_servico: haDoisAnos }),
    );
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { valor: 50000 }));
    const cancelado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { valor: 999999 }),
    );
    await raiz.query(`UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`, [
      cancelado.id,
    ]);

    const periodoLargo: Periodo = {
      inicio: new Date(haDoisAnos.getTime() - 24 * 60 * 60 * 1000),
      fim: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const [mapa, resumo] = await Promise.all([
      valoresTotaisPorCliente(e.empresaId),
      resumoFinanceiroDoCliente(e.empresaId, e.clienteId, periodoLargo, diaEmFortaleza(new Date())),
    ]);

    expect(mapa.get(e.clienteId)).toBe(resumo.jaRodado);
    expect(mapa.get(e.clienteId)).toBe(150000);
    conferencias++;
  });
});

describe("8. estatisticasPorMotorista — mesmo número do resumo do perfil (Tarefa 5)", () => {
  it("bate exatamente com resumoDoMotorista, para o mesmo motorista — mesma técnica do teste anterior", async () => {
    const e = await criarEmpresaDeTeste("s2");
    const motorista = await criarMotorista(e.empresaId, { nome: "Comparado" });
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { motorista_id: motorista.id, valor: 80000 }),
    );
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { motorista_id: motorista.id, valor: 40000 }),
    );

    const [mapa, resumo] = await Promise.all([
      estatisticasPorMotorista(e.empresaId),
      resumoDoMotorista(e.empresaId, motorista.id, periodoAmplo()),
    ]);

    const estatistica = mapa.get(motorista.id);
    expect(estatistica?.fretes).toBe(resumo.fretesNoPeriodo);
    expect(estatistica?.valorTransportadoCentavos).toBe(resumo.valorTransportadoNoPeriodo);
    expect(estatistica).toEqual({ fretes: 2, valorTransportadoCentavos: 120000 });
    conferencias++;
  });
});

describe("9. estatisticasPorCaminhao — sem par direto, valor plantado conhecido", () => {
  it("soma fretes e valor transportado do caminhão, com ou sem km preenchido", async () => {
    // resumoDoCaminhao (Tarefa 1) não expõe "valor total transportado": seu
    // único número de valor é o numerador de rsPorKm, restrito aos fretes
    // COM km — um filtro a mais, para um propósito diferente. Por isso não
    // há par direto para comparação cruzada; testado como as outras
    // leituras de agregação do projeto, com valor plantado conhecido.
    const e = await criarEmpresaDeTeste("s3");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Estatística" });
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 70000 }),
    );
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 30000, km: 5000 }),
    );

    const mapa = await estatisticasPorCaminhao(e.empresaId);
    expect(mapa.get(caminhao.id)).toEqual({ fretes: 2, valorTransportadoCentavos: 100000 });
    conferencias++;
  });
});

describe("10. frete cancelado não conta em nenhuma das três leituras de ordenação", () => {
  it("valoresTotaisPorCliente ignora frete cancelado", async () => {
    const e = await criarEmpresaDeTeste("s4");
    await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { valor: 50000 }));
    const cancelado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, { valor: 50000 }));
    await raiz.query(`UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`, [
      cancelado.id,
    ]);

    const mapa = await valoresTotaisPorCliente(e.empresaId);
    expect(mapa.get(e.clienteId)).toBe(50000);
    conferencias++;
  });

  it("estatisticasPorCaminhao ignora frete cancelado", async () => {
    const e = await criarEmpresaDeTeste("s5");
    const caminhao = await criarCaminhao(e.empresaId, { apelido: "Com cancelado" });
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 50000 }),
    );
    const cancelado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { veiculo_id: caminhao.id, valor: 50000 }),
    );
    await raiz.query(`UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`, [
      cancelado.id,
    ]);

    const mapa = await estatisticasPorCaminhao(e.empresaId);
    expect(mapa.get(caminhao.id)).toEqual({ fretes: 1, valorTransportadoCentavos: 50000 });
    conferencias++;
  });

  it("estatisticasPorMotorista ignora frete cancelado", async () => {
    const e = await criarEmpresaDeTeste("s6");
    const motorista = await criarMotorista(e.empresaId, { nome: "Com cancelado" });
    await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { motorista_id: motorista.id, valor: 50000 }),
    );
    const cancelado = await criarServico(
      e.empresaId,
      e.usuarioId,
      dadosMinimos(e, { motorista_id: motorista.id, valor: 50000 }),
    );
    await raiz.query(`UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`, [
      cancelado.id,
    ]);

    const mapa = await estatisticasPorMotorista(e.empresaId);
    expect(mapa.get(motorista.id)).toEqual({ fretes: 1, valorTransportadoCentavos: 50000 });
    conferencias++;
  });
});

describe("11. isolamento entre empresas — as três leituras novas (CLAUDE.md §3)", () => {
  it("valoresTotaisPorCliente só enxerga a própria empresa", async () => {
    const a = await criarEmpresaDeTeste("s7a");
    const b = await criarEmpresaDeTeste("s7b");
    await criarServico(a.empresaId, a.usuarioId, dadosMinimos(a, { valor: 70000 }));
    await criarServico(b.empresaId, b.usuarioId, dadosMinimos(b, { valor: 999999 }));

    const mapaA = await valoresTotaisPorCliente(a.empresaId);
    expect(mapaA.get(a.clienteId)).toBe(70000);
    expect(mapaA.has(b.clienteId)).toBe(false);
    conferencias++;
  });

  it("estatisticasPorCaminhao só enxerga a própria empresa", async () => {
    const a = await criarEmpresaDeTeste("s8a");
    const b = await criarEmpresaDeTeste("s8b");
    const caminhaoA = await criarCaminhao(a.empresaId, { apelido: "A" });
    const caminhaoB = await criarCaminhao(b.empresaId, { apelido: "B" });
    await criarServico(
      a.empresaId,
      a.usuarioId,
      dadosMinimos(a, { veiculo_id: caminhaoA.id, valor: 70000 }),
    );
    await criarServico(
      b.empresaId,
      b.usuarioId,
      dadosMinimos(b, { veiculo_id: caminhaoB.id, valor: 999999 }),
    );

    const mapaA = await estatisticasPorCaminhao(a.empresaId);
    expect(mapaA.get(caminhaoA.id)).toEqual({ fretes: 1, valorTransportadoCentavos: 70000 });
    expect(mapaA.has(caminhaoB.id)).toBe(false);
    conferencias++;
  });

  it("estatisticasPorMotorista só enxerga a própria empresa", async () => {
    const a = await criarEmpresaDeTeste("s9a");
    const b = await criarEmpresaDeTeste("s9b");
    const motoristaA = await criarMotorista(a.empresaId, { nome: "A" });
    const motoristaB = await criarMotorista(b.empresaId, { nome: "B" });
    await criarServico(
      a.empresaId,
      a.usuarioId,
      dadosMinimos(a, { motorista_id: motoristaA.id, valor: 70000 }),
    );
    await criarServico(
      b.empresaId,
      b.usuarioId,
      dadosMinimos(b, { motorista_id: motoristaB.id, valor: 999999 }),
    );

    const mapaA = await estatisticasPorMotorista(a.empresaId);
    expect(mapaA.get(motoristaA.id)).toEqual({ fretes: 1, valorTransportadoCentavos: 70000 });
    expect(mapaA.has(motoristaB.id)).toBe(false);
    conferencias++;
  });
});

describe("12. marcarOrdemEnviada — item 5, Tarefa 2", () => {
  it("grava ordem_enviada_em, nulo antes", async () => {
    const e = await criarEmpresaDeTeste("s10a");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    expect(criado.ordem_enviada_em).toBeNull();

    const atualizado = await marcarOrdemEnviada(e.empresaId, criado.id);
    expect(atualizado.ordem_enviada_em).not.toBeNull();
    conferencias++;
  });

  it("idempotente — tocar de novo só atualiza o mesmo timestamp, não é erro", async () => {
    const e = await criarEmpresaDeTeste("s10b");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));

    const primeira = await marcarOrdemEnviada(e.empresaId, criado.id);
    const segunda = await marcarOrdemEnviada(e.empresaId, criado.id);
    expect(segunda.ordem_enviada_em!.getTime()).toBeGreaterThanOrEqual(
      primeira.ordem_enviada_em!.getTime(),
    );
    conferencias++;
  });

  it("isolamento — recusa gravar em serviço de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("s10c");
    const b = await criarEmpresaDeTeste("s10d");
    const servicoDeA = await criarServico(a.empresaId, a.usuarioId, dadosMinimos(a));

    await expect(marcarOrdemEnviada(b.empresaId, servicoDeA.id)).rejects.toThrow(
      "Frete não encontrado.",
    );
    const aindaNulo = await buscarServico(a.empresaId, servicoDeA.id);
    expect(aindaNulo?.ordem_enviada_em).toBeNull();
    conferencias++;
  });
});

describe("13. marcarServicoFinalizado — item 5, Tarefa 3", () => {
  it("transição válida: em_andamento → finalizado", async () => {
    const e = await criarEmpresaDeTeste("s11a");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    expect(criado.status_operacional).toBe("em_andamento");

    const atualizado = await marcarServicoFinalizado(e.empresaId, criado.id);
    expect(atualizado.status_operacional).toBe("finalizado");
    conferencias++;
  });

  it("recusa a partir de finalizado", async () => {
    const e = await criarEmpresaDeTeste("s11b");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    await marcarServicoFinalizado(e.empresaId, criado.id);

    await expect(marcarServicoFinalizado(e.empresaId, criado.id)).rejects.toThrow(
      "Este frete já não está em andamento.",
    );
    conferencias++;
  });

  it("recusa a partir de cancelado", async () => {
    const e = await criarEmpresaDeTeste("s11c");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    await raiz.query(
      `UPDATE "servico" SET status_operacional = 'cancelado' WHERE id = $1`,
      [criado.id],
    );

    await expect(marcarServicoFinalizado(e.empresaId, criado.id)).rejects.toThrow(
      "Este frete já não está em andamento.",
    );
    conferencias++;
  });

  it("isolamento — recusa gravar em serviço de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("s11d");
    const b = await criarEmpresaDeTeste("s11e");
    const servicoDeA = await criarServico(a.empresaId, a.usuarioId, dadosMinimos(a));

    await expect(marcarServicoFinalizado(b.empresaId, servicoDeA.id)).rejects.toThrow(
      "Frete não encontrado.",
    );
    const aindaEmAndamento = await buscarServico(a.empresaId, servicoDeA.id);
    expect(aindaEmAndamento?.status_operacional).toBe("em_andamento");
    conferencias++;
  });
});

/**
 * O pipeline inteiro do upload (tamanho, tipo por conteúdo, imagem,
 * storage) mora em `tests/isolamento/enviar-comprovante.test.ts` — precisa
 * do balde de verdade e de `SUPABASE_SERVICE_ROLE_KEY`. Aqui mede só a
 * gravação do caminho no `Servico`, a mesma classe de teste de
 * `marcarOrdemEnviada`/`marcarServicoFinalizado` acima.
 */
describe("14. salvarCaminhoComprovante — item 5, Tarefa 5", () => {
  it("grava o caminho, nulo antes", async () => {
    const e = await criarEmpresaDeTeste("s12a");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));
    expect(criado.comprovante_url).toBeNull();

    const atualizado = await salvarCaminhoComprovante(e.empresaId, criado.id, `${e.empresaId}/x.jpg`);
    expect(atualizado.comprovante_url).toBe(`${e.empresaId}/x.jpg`);
    conferencias++;
  });

  it("trocar comprovante sobrescreve o caminho anterior", async () => {
    const e = await criarEmpresaDeTeste("s12b");
    const criado = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e));

    await salvarCaminhoComprovante(e.empresaId, criado.id, `${e.empresaId}/primeiro.jpg`);
    const trocado = await salvarCaminhoComprovante(e.empresaId, criado.id, `${e.empresaId}/segundo.jpg`);
    expect(trocado.comprovante_url).toBe(`${e.empresaId}/segundo.jpg`);
    conferencias++;
  });

  it("isolamento — recusa gravar em serviço de outra empresa", async () => {
    const a = await criarEmpresaDeTeste("s12c");
    const b = await criarEmpresaDeTeste("s12d");
    const servicoDeA = await criarServico(a.empresaId, a.usuarioId, dadosMinimos(a));

    await expect(
      salvarCaminhoComprovante(b.empresaId, servicoDeA.id, `${b.empresaId}/invasor.jpg`),
    ).rejects.toThrow("Frete não encontrado.");
    const aindaSemComprovante = await buscarServico(a.empresaId, servicoDeA.id);
    expect(aindaSemComprovante?.comprovante_url).toBeNull();
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
