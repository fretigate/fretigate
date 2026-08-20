import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { medirResolucaoDeMunicipios } from "@/lib/servicos/medicao-municipios";
import { criarServico } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";

/**
 * A medição dos 10% (tarefa 4 do item 3): o piso de 20, a separação
 * ambíguo/não encontrado, a ordem por frequência, e o caso "resolveria hoje" —
 * texto salvo sem município na criação, mas que casa com um município real
 * agora, e por isso não conta como falha atual.
 *
 * O isolamento entre empresas já é coberto por `tests/isolamento/*`; este
 * arquivo mede a REGRA DE CONTAGEM, não RLS.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 7;

type EmpresaDeTeste = {
  empresaId: string;
  usuarioId: string;
  tipoOperacaoId: string;
  clienteId: string;
};

/** Mesmo padrão de `tests/servicos.test.ts` e `tests/titulos.test.ts`. */
async function criarEmpresaDeTeste(sufixo: string): Promise<EmpresaDeTeste> {
  const empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Medicao Teste ${marca} ${sufixo}`],
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

// Em paralelo, não em sequência: o contador atômico de `numero` (Tarefa 1 do
// item 3) existe exatamente para suportar isto sem colidir, e uma criação de
// cada vez multiplicava a ida e volta ao Supabase por `quantidade`, perto
// demais do `testTimeout` global em suíte cheia.
//
// BLOCOS DE CINCO, DENTRO DA PRÓPRIA FUNÇÃO — não em cada chamador. O pool
// do driver (`pg-pool`, padrão) tem dez conexões; `criarServico` chama
// `normalizarEntrada`, que — SÓ QUANDO origem_texto E destino_texto vêm
// preenchidos em `extra` — resolve os dois em paralelo, cada um seu
// próprio `db()`, pedindo até duas conexões ao mesmo tempo
// (`src/lib/servicos/servicos.ts:125-131`). A função não sabe de antemão
// o que cada chamador vai passar em `extra` (hoje varia: duas chamadas
// preenchem os dois campos, duas preenchem só um) — por isso usa o teto
// conservador sempre, em vez de calcular por chamada. Cinco é o maior
// bloco que nunca estoura mesmo no pior caso (5 × 2 = 10) — o mesmo
// defeito que derrubou a esteira em
// `tests/regressao-resolucao-municipios.test.ts`
// (`docs/planos/correcao-pool-esteira-vermelha.md`) reapareceria com uma
// chamada futura de quantidade maior se o teto vivesse só nos lugares que
// chamam, em vez de na função.
const TAMANHO_DO_BLOCO = 5;

async function criarServicos(e: EmpresaDeTeste, quantidade: number, extra: Record<string, unknown>) {
  const resultados: Awaited<ReturnType<typeof criarServico>>[] = [];
  for (let inicio = 0; inicio < quantidade; inicio += TAMANHO_DO_BLOCO) {
    const tamanho = Math.min(TAMANHO_DO_BLOCO, quantidade - inicio);
    const lote = await Promise.all(
      Array.from({ length: tamanho }, () =>
        criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, extra)),
      ),
    );
    resultados.push(...lote);
  }
  return resultados;
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "servico" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "usuario" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("1. abaixo do piso", () => {
  it("não calcula percentual com menos de 20 elegíveis", async () => {
    const e = await criarEmpresaDeTeste("piso");
    await criarServicos(e, 2, { origem_texto: "Fortaleza", destino_texto: "Bom Jesus" });

    const resultado = await medirResolucaoDeMunicipios(e.empresaId);
    expect(resultado).toEqual({ situacao: "amostra_insuficiente", totalElegivel: 4, piso: 20 });
    conferencias++;
  });
});

describe("2. medição completa", () => {
  it("separa ambíguo de não encontrado, ordena por frequência, e ignora quem resolveria hoje", async () => {
    const e = await criarEmpresaDeTeste("medicao");

    // 10x: origem resolve ("Fortaleza"), destino é ambíguo ("Bom Jesus", sem UF).
    await criarServicos(e, 10, { origem_texto: "Fortaleza", destino_texto: "Bom Jesus" });

    // 7x e 3x: dois textos que não existem, com contagens diferentes — testa
    // a ordenação por frequência, maior primeiro.
    await criarServicos(e, 7, { destino_texto: "Textoquenaoexisteumdois" });
    await criarServicos(e, 3, { destino_texto: "Textoquenaoexistetres" });

    // 1x: gravado sem município (simulando um frete lançado antes de a base do
    // IBGE ter esse município), mas o texto É "Fortaleza" — resolveria agora.
    // Não pode contar como falha atual, e não pode aparecer nas duas listas.
    const resolveriaAgora = await criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, {
      destino_texto: "Fortaleza",
    }));
    await raiz.query(`UPDATE "servico" SET destino_municipio_id = NULL WHERE id = $1`, [
      resolveriaAgora.id,
    ]);

    const resultado = await medirResolucaoDeMunicipios(e.empresaId);

    expect(resultado.situacao).toBe("medido");
    if (resultado.situacao !== "medido") throw new Error("inalcançável");

    // 31 elegíveis: (10 origem + 10 destino) + 7 + 3 + 1 destino do último.
    expect(resultado.totalElegivel).toBe(31);
    // 20 falhos: os 10 ambíguos + os 10 não encontrados. O último (resolveria
    // agora) fica de fora da conta.
    expect(resultado.totalFalho).toBe(20);
    expect(resultado.percentual).toBeCloseTo((20 / 31) * 100, 5);
    conferencias++;

    expect(resultado.ambiguos).toEqual([{ texto: "Bom Jesus", ocorrencias: 10 }]);
    conferencias++;

    // Ordem por frequência, maior primeiro — não por ordem de criação.
    expect(resultado.naoEncontrados).toEqual([
      { texto: "Textoquenaoexisteumdois", ocorrencias: 7 },
      { texto: "Textoquenaoexistetres", ocorrencias: 3 },
    ]);
    conferencias++;

    // "Fortaleza" (o que resolveria agora) não aparece em nenhuma das duas
    // listas de falha.
    const textosNasListas = [...resultado.ambiguos, ...resultado.naoEncontrados].map(
      (i) => i.texto,
    );
    expect(textosNasListas).not.toContain("Fortaleza");
    conferencias++;
  });
});

describe("3. mais de dez textos únicos não resolvidos", () => {
  it("processa todos, não só o primeiro bloco de dez", async () => {
    // Prova o laço de blocos de `medirResolucaoDeMunicipios`
    // (`src/lib/servicos/medicao-municipios.ts`), achado do `/revisar`:
    // nenhum teste tinha mais de dez textos únicos não resolvidos, então um
    // fatiamento errado — ou o laço voltando a ser `Promise.all` sem
    // teto — passaria sem nenhum acusar. Treze Servico, origem E destino
    // cada um com texto único (26 textos não resolvidos ao todo) — cima do
    // piso de 20 elegíveis, e quebra em dois blocos cheios de dez mais um
    // de seis, cruzando duas fronteiras.
    const e = await criarEmpresaDeTeste("blocos");
    const QUANTIDADE_DE_SERVICOS = 13;
    const totalDeTextos = QUANTIDADE_DE_SERVICOS * 2;
    const textos = Array.from(
      { length: totalDeTextos },
      (_, i) => `Textoinexistente${String(i + 1).padStart(2, "0")}`,
    );

    // Blocos de cinco, não sequencial — mesmo motivo e mesmo número já
    // usados por `criarServicos` acima (cada chamada com origem E destino
    // preenchidos pede duas conexões; 5 × 2 = 10, o teto do pool).
    // Sequencial multiplicava por 13 as idas e voltas e chegou perto demais
    // do `testTimeout` global, achado ao rodar contra a esteira (latência
    // maior que o banco de desenvolvimento).
    for (let inicio = 0; inicio < QUANTIDADE_DE_SERVICOS; inicio += TAMANHO_DO_BLOCO) {
      const tamanho = Math.min(TAMANHO_DO_BLOCO, QUANTIDADE_DE_SERVICOS - inicio);
      await Promise.all(
        Array.from({ length: tamanho }, (_, offset) => {
          const i = inicio + offset;
          return criarServico(e.empresaId, e.usuarioId, dadosMinimos(e, {
            origem_texto: textos[i * 2],
            destino_texto: textos[i * 2 + 1],
          }));
        }),
      );
    }

    const resultado = await medirResolucaoDeMunicipios(e.empresaId);

    expect(resultado.situacao).toBe("medido");
    if (resultado.situacao !== "medido") throw new Error("inalcançável");

    expect(resultado.totalElegivel).toBe(totalDeTextos);
    expect(resultado.totalFalho).toBe(totalDeTextos);
    conferencias++;

    // Os 26 aparecem — nenhum perdido no corte entre blocos.
    expect(resultado.naoEncontrados).toHaveLength(totalDeTextos);
    const textosNaLista = resultado.naoEncontrados.map((t) => t.texto).sort();
    expect(textosNaLista).toEqual([...textos].sort());
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
