import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  listarServicos,
  buscarServico,
  criarServico,
  editarServico,
  arquivarServico,
} from "@/lib/servicos/servicos";
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
const CONFERENCIAS_ESPERADAS = 20;

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

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    // §3, item 4: não basta nenhuma ter falhado. Se uma exceção pulou
    // verificações, o número não bate e o arquivo reprova.
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
