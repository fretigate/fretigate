import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { medirResolucaoDeMunicipios } from "@/lib/servicos/medicao-municipios";
import { criarServico } from "@/lib/servicos/servicos";
import { criarCliente } from "@/lib/servicos/clientes";

/**
 * O passo da esteira que avisa sem travar (`docs/planos/item-3-lancamento-
 * frete.md`, Tarefa 4; `docs/especificacao.md` §9).
 *
 * ESTE NÚMERO NÃO É USO REAL. Não existe cliente pagante ainda, e mesmo
 * quando existir, o projeto de teste nunca recebe dado dele (`CLAUDE.md` §5:
 * "o projeto de teste nunca recebe dado real de cliente"). O que este arquivo
 * mede é a RESOLUÇÃO EM SI, contra uma lista fixa que representa como gente de
 * verdade digita — decidido pelo fundador, 14/08/2026. O número de uso real só
 * existe pelo comando `npm run medir:municipios -- --empresa=<id>`, rodado
 * contra uma empresa de verdade.
 *
 * A LISTA É FIXA. Ela não muda para deixar o teste mais fácil ou mais
 * difícil — mudar a lista é mudar a régua, e a régua só serve enquanto for a
 * mesma de ontem. O que ela protege: se alguém mexer em
 * `normalizarParaBusca` ou em `resolverMunicipio` e piorar (ou melhorar) o
 * casamento, o número de falhas desta lista muda, e o aviso aparece.
 * Adicionar categoria nova de caso difícil é decisão do fundador, não ajuste
 * de quem está rodando o teste.
 *
 * O CRITÉRIO É DESVIO DO ESPERADO, NÃO OS 10% DO LIMITE DE USO REAL —
 * corrigido em 14/08/2026, mesma sessão em que a primeira versão reaproveitou
 * o limite de 10% aqui também. Numa lista de 41 itens isso quase não detecta
 * nada: uma falha nova sobe de 3 para 4 (9,8%), ainda abaixo de 10%; só a
 * partir de duas falhas novas o aviso dispararia. Lista fixa tem o número de
 * falhas **conhecido** (`CORPUS_FALHA.length`) — qualquer desvio, para mais
 * ou para menos, é sinal de verdade, não ruído de amostra. Os 10% continuam
 * sendo o limite certo para uso real (`docs/especificacao.md` §9); aqui não
 * fazem sentido.
 *
 * Por isso este teste NUNCA falha pelo desvio — só imprime `console.warn`.
 * É o mesmo cálculo de `medirResolucaoDeMunicipios` (mesma função da
 * Tarefa 4), a mesma que o comando de linha de comando usa.
 */

/**
 * 38 textos representando como uma ordem de frete real viria — nomes de
 * capital e de cidade grande, alguns sem acento, alguns no formato
 * "Cidade/UF". Se um destes deixar de resolver, é a prova de que este
 * arquivo existe para dar: a checagem estrutural abaixo (`totalElegivel`
 * bater com `CORPUS.length`) e o aviso de `console.warn` acima de 10% vão
 * reagir a isso.
 */
const CORPUS_RESOLVE = [
  "Sao Paulo", "Rio de Janeiro", "Fortaleza/CE", "Salvador", "Recife-PE",
  "Curitiba", "Porto Alegre", "Belo Horizonte", "Manaus", "Brasilia",
  "Goiania", "Belem/PA", "Florianopolis", "Vitoria", "Natal",
  "Joao Pessoa", "Teresina", "Sao Luis", "Aracaju", "Maceio",
  "Cuiaba", "Palmas/TO", "Macapa", "Porto Velho", "Campinas",
  "Sorocaba", "Uberlandia", "Ribeirao Preto", "Juiz de Fora", "Londrina",
  "Maringa", "Caxias do Sul", "Joinville", "Feira de Santana", "Anapolis",
  "Uberaba", "Sobral/CE", "Fortaleza CE",
];

/**
 * 3 casos difíceis, cada um representando uma categoria real de falha
 * aceita (`docs/especificacao.md` §9: ambíguo é conserto de tela, não
 * encontrado é conserto de dado) — abreviação/apelido local, erro de
 * digitação comum, e nome ambíguo em vários estados.
 */
const CORPUS_FALHA = [
  "BH", // abreviação/apelido local — nunca vira nome de município
  "Forteleza", // erro de digitação comum
  "Bom Jesus", // ambíguo: existe em PI, RN, PB, SC e RS
];

const CORPUS = [...CORPUS_RESOLVE, ...CORPUS_FALHA];

let raiz: Client;
let empresaId: string;

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 3;

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();

  empresaId = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [empresaId, `Regressao Municipio ${process.hrtime.bigint().toString(16).slice(-8)}`],
  );

  const usuarioId = `u-${empresaId}`;
  await raiz.query(
    `INSERT INTO "usuario" (id, nome, email, papel, empresa_id)
     VALUES ($1, $2, $3, 'dono', $4)`,
    [usuarioId, "Dono", `${empresaId}@teste.invalido`, empresaId],
  );

  const tipoOperacaoId = randomUUID();
  await raiz.query(
    `INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
     VALUES ($1, $2, 'Frete', 'frete', true, 1)`,
    [tipoOperacaoId, empresaId],
  );

  const cliente = await criarCliente(empresaId, { nome: "Cliente Regressão" });

  // Dois textos por Servico (origem + destino) — 21 criações ao todo. O
  // contador atômico de `numero` (Tarefa 1 do item 3) existe para suportar
  // paralelismo sem colidir, mas paralelismo tem um teto: o pool do driver
  // tem DEZ conexões (padrão do `pg-pool`, `src/lib/db/index.ts` não
  // sobrescreve) — mesmo motivo, mesmo número, já registrado em
  // `tests/isolamento/vazamento.test.ts` ("dez, e não vinte: o pool do
  // driver tem dez conexões, e pedir mais do que isso ao mesmo tempo faz a
  // transação estourar o tempo de espera ANTES de qualquer consulta
  // rodar"). Rodar as 21 de uma vez foi exatamente o defeito que derrubou a
  // esteira (não local — bancos e pools diferentes, `docs/diario.md`,
  // tarefa 4 da auditoria, 18/08/2026): estourava o pool do projeto de
  // teste, e a chamada que sobrava de um `Promise.all` já rejeitado
  // continuava rodando sozinha e inseria um Servico DEPOIS do `afterAll` já
  // ter limpado — a violação de chave estrangeira era o sintoma, a causa
  // era esta.
  //
  // BLOCO DE CINCO, NÃO DEZ — achado numa segunda rodada de revisão, depois
  // de a primeira correção (blocos de dez) ter sido escrita sem essa conta:
  // `criarServico` chama `normalizarEntrada`
  // (`src/lib/servicos/servicos.ts:128-130`), que resolve origem E destino
  // em paralelo, cada um seu próprio `db()` — CADA `criarServico` pede DUAS
  // conexões ao mesmo tempo, não uma. Um bloco de dez `criarServico` em
  // paralelo pede até vinte conexões no pico (dez chamadas × duas
  // resoluções cada) — o mesmo estouro que este bloco existe para evitar,
  // só que escondido atrás de um número que parecia certo. Com blocos de
  // CINCO, o pico é 5 × 2 = 10 — exatamente o tamanho do pool, a mesma
  // margem que o precedente de `tests/isolamento/vazamento.test.ts` já usa
  // (dez chamadas de UMA conexão cada). Continua rápido (5 idas e voltas
  // de bloco, não 21 sequenciais) sem nunca pedir mais conexão do que o
  // pool tem — agora contando o custo real de cada chamada, não só o
  // número de chamadas.
  const TAMANHO_DO_BLOCO = 5;
  const criacoes = Array.from(
    { length: Math.ceil(CORPUS.length / 2) },
    (_, indice) => {
      const i = indice * 2;
      return () =>
        criarServico(empresaId, usuarioId, {
          tipo_operacao_id: tipoOperacaoId,
          cliente_id: cliente.id,
          data_servico: new Date(),
          valor: 150000,
          origem_texto: CORPUS[i] ?? null,
          destino_texto: CORPUS[i + 1] ?? null,
        });
    },
  );
  for (let inicio = 0; inicio < criacoes.length; inicio += TAMANHO_DO_BLOCO) {
    await Promise.all(
      criacoes.slice(inicio, inicio + TAMANHO_DO_BLOCO).map((criar) => criar()),
    );
  }
}, 60_000);

afterAll(async () => {
  await raiz.query(`DELETE FROM "servico" WHERE empresa_id = $1`, [empresaId]);
  await raiz.query(`DELETE FROM "cliente" WHERE empresa_id = $1`, [empresaId]);
  await raiz.query(`DELETE FROM "usuario" WHERE empresa_id = $1`, [empresaId]);
  await raiz.query(`DELETE FROM "empresa" WHERE id = $1`, [empresaId]);
  await raiz.end();
});

describe("regressão contra a lista fixa", () => {
  it("a lista semeou como esperado — se este número mudou, a lista mudou", () => {
    expect(CORPUS.length).toBe(41);
    conferencias++;
  });

  it("mede e avisa sem travar, se o número de falhas desviar do esperado", async () => {
    const resultado = await medirResolucaoDeMunicipios(empresaId);

    // Tripwire estrutural: se isto vier `amostra_insuficiente`, a lista fixa
    // não está mais semeando o que este arquivo promete.
    expect(resultado.situacao).toBe("medido");
    if (resultado.situacao !== "medido") throw new Error("inalcançável");

    expect(resultado.totalElegivel).toBe(CORPUS.length);
    conferencias++;

    const FALHAS_ESPERADAS = CORPUS_FALHA.length;

    if (resultado.totalFalho !== FALHAS_ESPERADAS) {
      const direcao = resultado.totalFalho > FALHAS_ESPERADAS ? "regrediu" : "melhorou";
      console.warn(
        `\n  [medição de municípios] a lista fixa de regressão ${direcao}: ` +
          `${resultado.totalFalho} falha(s), esperado ${FALHAS_ESPERADAS} ` +
          `(${resultado.percentual.toFixed(1)}% de ${resultado.totalElegivel}).\n` +
          `  Ambíguos: ${resultado.ambiguos.map((a) => a.texto).join(", ") || "nenhum"}\n` +
          `  Não encontrados: ${resultado.naoEncontrados.map((a) => a.texto).join(", ") || "nenhum"}\n` +
          "  Isto NÃO falha o build — é aviso de possível regressão (ou correção) na " +
          "resolução de município.\n",
      );
    }

    // Nunca falha pelo desvio — de propósito (ver comentário do topo do
    // arquivo). A única coisa que este teste reprova é a lista deixar de
    // semear o que promete (as duas verificações acima).
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
