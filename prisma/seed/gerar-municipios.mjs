/**
 * Gera `prisma/seed/municipios.json` a partir das DUAS fontes oficiais do IBGE.
 *
 * POR QUE ESTE ARQUIVO É COMITADO
 * `municipios.json` é dado que entra no banco de todo cliente, e `PROCEDENCIA.md`
 * afirma um cruzamento entre duas fontes. Afirmação que ninguém consegue refazer
 * não é procedência, é promessa — e no dia em que o IBGE criar um município,
 * regenerar o arquivo viraria arqueologia. Este script é o método escrito de
 * forma executável.
 *
 * NÃO roda em `npm install`, nem na esteira, nem no build. É comando de mão:
 *
 *     node prisma/seed/gerar-municipios.mjs
 *
 * Não fala com banco nenhum. Só baixa, cruza, confere e escreve um arquivo.
 * Quem grava no banco é `municipios.mts`, que é outra coisa.
 *
 * AS DUAS FONTES, E POR QUE SÃO DUAS
 *
 *   1. Localidades do Brasil 2022 (arquivo geográfico) — dá a coordenada da
 *      SEDE do município: a praça central, para onde o caminhão vai. Não é o
 *      centro geométrico do território, que num município grande cai no mato.
 *
 *   2. API de Localidades do IBGE — dá nome e UF ATUAIS. O arquivo geográfico
 *      é uma fotografia de 2022 e envelhece no nome: ele traz "Bom Jesus" onde
 *      o nome oficial hoje é "Bom Jesus de Goiás". Nome errado é município que
 *      o usuário não acha na busca.
 *
 * Cada fonte manda no que ela é autoridade. O cruzamento entre as duas é
 * conferência, não conveniência: divergência de código entre elas PARA a
 * geração, em vez de virar arquivo silenciosamente errado.
 */

import { inflateRawSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const ZIP =
  "https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/" +
  "localidades/Localidades_do_Brasil/2022/Localidades_Brasil_shp.zip";

const API =
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado";

/** O arquivo geográfico traz todas as localidades; sede de município é esta. */
const CATEGORIA_DA_SEDE = "Cidade";

/**
 * Fernando de Noronha (2605459) aparece na API e NÃO tem sede no arquivo
 * geográfico. Não é falha do cruzamento: o IBGE o classifica como distrito
 * estadual, não município — é por isso que a conta oficial é 5.570 e não 5.571.
 * É ilha, sem estrada, e nenhum caminhão chega lá.
 *
 * Fica declarado como exceção NOMEADA, e o cruzamento reprova se aparecer
 * qualquer outro código sem sede: aí é fonte mudando, e alguém precisa olhar.
 */
const SEM_SEDE_ESPERADOS = new Set([2605459]);

/** As 27 unidades da federação. Menos que isso é arquivo incompleto. */
const UFS = 27;

/**
 * Limites do Brasil, com folga. Serve para pegar coordenada trocada de sinal
 * ou de ordem (latitude no lugar da longitude), que é o erro clássico e o que
 * mais passa despercebido — o número continua parecendo um número.
 */
const BRASIL = { latMin: -34, latMax: 6, lonMin: -74, lonMax: -32 };

function parar(motivo) {
  console.error(`\n  GERAÇÃO INTERROMPIDA\n\n  ${motivo}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Leitura do .dbf de dentro do .zip, sem dependência.
//
// O .dbf é a tabela de atributos do shapefile: cabeçalho com a lista de campos
// e, depois, registros de largura fixa. Formato antigo e estável — ler é mais
// barato que trazer uma biblioteca para isso.
// ---------------------------------------------------------------------------

/** Extrai UMA entrada do zip pelo nome. Só o que é preciso, nada de descompactar tudo. */
function extrairDoZip(zip, nomeProcurado) {
  // Fim do diretório central: assinatura 0x06054b50, perto do fim do arquivo.
  let fim = zip.length - 22;
  while (fim >= 0 && zip.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) parar("O arquivo baixado não é um zip válido.");

  const quantas = zip.readUInt16LE(fim + 10);
  let p = zip.readUInt32LE(fim + 16);

  for (let i = 0; i < quantas; i++) {
    const metodo = zip.readUInt16LE(p + 10);
    const tamComprimido = zip.readUInt32LE(p + 20);
    const tamOriginal = zip.readUInt32LE(p + 24);
    const tamNome = zip.readUInt16LE(p + 28);
    const tamExtra = zip.readUInt16LE(p + 30);
    const tamComentario = zip.readUInt16LE(p + 32);
    const inicioLocal = zip.readUInt32LE(p + 42);
    const nome = zip.toString("utf8", p + 46, p + 46 + tamNome);

    if (nome === nomeProcurado) {
      // O cabeçalho local repete o nome e o extra, com tamanhos PRÓPRIOS — os
      // do diretório central não servem aqui, e usar os errados desloca tudo.
      const nomeLocal = zip.readUInt16LE(inicioLocal + 26);
      const extraLocal = zip.readUInt16LE(inicioLocal + 28);
      const dados = inicioLocal + 30 + nomeLocal + extraLocal;
      const bruto = zip.subarray(dados, dados + tamComprimido);

      if (metodo === 0) return bruto;
      if (metodo === 8) return inflateRawSync(bruto, { maxOutputLength: tamOriginal });
      parar(`A entrada \`${nome}\` usa um método de compressão inesperado (${metodo}).`);
    }

    p += 46 + tamNome + tamExtra + tamComentario;
  }

  parar(`O zip do IBGE não tem a entrada \`${nomeProcurado}\`.`);
}

function* lerDbf(buf) {
  const registros = buf.readUInt32LE(4);
  const inicio = buf.readUInt16LE(8);
  const largura = buf.readUInt16LE(10);

  const campos = [];
  // 0x0d encerra a lista de campos do cabeçalho.
  for (let off = 32; buf[off] !== 0x0d; off += 32) {
    campos.push({
      nome: buf.toString("latin1", off, off + 11).replace(/\0.*$/, ""),
      tamanho: buf[off + 16],
    });
  }

  let off = inicio;
  for (let i = 0; i < registros; i++, off += largura) {
    if (buf[off] === 0x2a) continue; // marcado como apagado
    let p = off + 1;
    const linha = {};
    for (const c of campos) {
      // UTF-8 por causa do .cpg do próprio IBGE, que declara UTF-8.
      linha[c.nome] = buf.toString("utf8", p, p + c.tamanho).trim();
      p += c.tamanho;
    }
    yield linha;
  }
}

async function baixar(url, rotulo) {
  process.stdout.write(`  baixando ${rotulo}... `);
  const resposta = await fetch(url);
  if (!resposta.ok) parar(`${rotulo} respondeu ${resposta.status}.\n  ${url}`);
  const buf = Buffer.from(await resposta.arrayBuffer());
  console.log(`${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return buf;
}

// ---------------------------------------------------------------------------
// 1. Fonte geográfica: a sede de cada município.
// ---------------------------------------------------------------------------

const zip = await baixar(ZIP, "Localidades do Brasil 2022 (IBGE)");
const dbf = extrairDoZip(zip, "BR_localidades_2022.dbf");

const sedes = new Map();
for (const linha of lerDbf(dbf)) {
  if (linha.CT_LOCALID !== CATEGORIA_DA_SEDE) continue;

  const codigo = Number(linha.CD_MUN);
  const latitude = Number(linha.LAT_LOCALI);
  const longitude = Number(linha.LONG_LOCAL);

  // Capital aparece duas vezes (como sede e como capital), com a MESMA
  // coordenada. Repetição idêntica é esperada; repetição divergente é a fonte
  // se contradizendo, e aí a geração para em vez de escolher uma no chute.
  const jaVista = sedes.get(codigo);
  if (jaVista) {
    if (jaVista.latitude !== latitude || jaVista.longitude !== longitude) {
      parar(
        `O arquivo geográfico dá duas coordenadas diferentes para o município ` +
          `${codigo} (${linha.NM_MUN}). A fonte está se contradizendo.`,
      );
    }
    continue;
  }

  sedes.set(codigo, { latitude, longitude, nome_no_arquivo: linha.NM_MUN });
}

console.log(`  sedes municipais no arquivo geográfico: ${sedes.size}`);

// ---------------------------------------------------------------------------
// 2. Fonte cadastral: nome e UF atuais.
// ---------------------------------------------------------------------------

const api = JSON.parse((await baixar(API, "API de Localidades (IBGE)")).toString("utf8"));
console.log(`  municípios na API: ${api.length}`);

// ---------------------------------------------------------------------------
// 3. O cruzamento. É aqui que a geração para, se parar.
// ---------------------------------------------------------------------------

const codigosDaApi = new Set(api.map((m) => m["municipio-id"]));

const semSede = api
  .map((m) => m["municipio-id"])
  .filter((c) => !sedes.has(c) && !SEM_SEDE_ESPERADOS.has(c));

if (semSede.length > 0) {
  parar(
    `${semSede.length} município(s) da API não têm sede no arquivo geográfico: ` +
      `${semSede.join(", ")}.\n  Isso é fonte nova ou município criado depois de 2022 — ` +
      `alguém precisa decidir de onde vem a coordenada dele.`,
  );
}

const sedeSemCadastro = [...sedes.keys()].filter((c) => !codigosDaApi.has(c));
if (sedeSemCadastro.length > 0) {
  parar(
    `${sedeSemCadastro.length} sede(s) do arquivo geográfico não existem mais na ` +
      `API: ${sedeSemCadastro.join(", ")}.\n  Município extinto não some do histórico ` +
      `(CLAUDE.md §7) — isso é decisão, não conserto automático.`,
  );
}

/** Divergência de NOME não para a geração: a API vence, e o relato fica no console. */
const nomesCorrigidos = [];

const municipios = api
  .filter((m) => sedes.has(m["municipio-id"]))
  .map((m) => {
    const codigo = m["municipio-id"];
    const sede = sedes.get(codigo);
    const nome = m["municipio-nome"];
    const uf = m["UF-sigla"];

    if (sede.nome_no_arquivo !== nome) {
      nomesCorrigidos.push(`${codigo}: "${sede.nome_no_arquivo}" -> "${nome}"`);
    }

    return { codigo_ibge: codigo, nome, uf, latitude: sede.latitude, longitude: sede.longitude };
  })
  .sort((a, b) => a.codigo_ibge - b.codigo_ibge);

// ---------------------------------------------------------------------------
// 4. Conferência do resultado. As mesmas regras que a seed refaz antes de
//    gravar — de propósito: uma trava vale mais nos dois lados do arquivo do
//    que confiando que o outro lado conferiu.
// ---------------------------------------------------------------------------

const problemas = [];
for (const m of municipios) {
  if (!Number.isInteger(m.codigo_ibge) || m.codigo_ibge < 1000000) {
    problemas.push(`código inválido: ${m.codigo_ibge}`);
  }
  if (!m.nome) problemas.push(`${m.codigo_ibge}: nome vazio`);
  if (!/^[A-Z]{2}$/.test(m.uf)) problemas.push(`${m.codigo_ibge}: UF inválida (${m.uf})`);
  if (!Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) {
    problemas.push(`${m.codigo_ibge}: coordenada não numérica`);
  } else if (m.latitude === 0 || m.longitude === 0) {
    problemas.push(`${m.codigo_ibge}: coordenada zerada`);
  } else if (
    m.latitude < BRASIL.latMin ||
    m.latitude > BRASIL.latMax ||
    m.longitude < BRASIL.lonMin ||
    m.longitude > BRASIL.lonMax
  ) {
    problemas.push(`${m.codigo_ibge}: coordenada fora do Brasil (${m.latitude}, ${m.longitude})`);
  }
}

const ufs = new Set(municipios.map((m) => m.uf));
if (ufs.size !== UFS) problemas.push(`${ufs.size} UFs, esperadas ${UFS}`);

if (problemas.length > 0) {
  parar(`${problemas.length} problema(s):\n  - ${problemas.slice(0, 20).join("\n  - ")}`);
}

// ---------------------------------------------------------------------------
// 5. O arquivo.
// ---------------------------------------------------------------------------

const hoje = new Date().toISOString().slice(0, 10);

const conteudo = {
  procedencia: {
    gerado_em: hoje,
    gerado_por: "prisma/seed/gerar-municipios.mjs",
    // A seed confere a quantidade contra ESTE número, nunca contra 5.570
    // cravado no código: município novo é criado por lei estadual, e um número
    // fixo faria a seed parar de carregar no dia em que a conta mudasse.
    registros: municipios.length,
    fontes: {
      coordenada_da_sede: { url: ZIP, edicao: "Localidades do Brasil 2022", sedes: sedes.size },
      nome_e_uf: { url: API, municipios_listados: api.length },
    },
    excluidos: [...SEM_SEDE_ESPERADOS].map((c) => ({
      codigo_ibge: c,
      motivo: "distrito estadual, não município — sem sede no arquivo geográfico do IBGE",
    })),
    nomes_corrigidos_pela_api: nomesCorrigidos,
  },
  municipios,
};

// UM MUNICÍPIO POR LINHA, de propósito. `JSON.stringify` normal gravaria as
// 5.570 linhas grudadas numa linha só, e aí o dia em que o IBGE corrigir uma
// coordenada o Git mostraria "a linha inteira mudou" — 539 KB de diff para
// esconder uma alteração de dois dígitos. Assim a regeneração se lê.
const destino = new URL("./municipios.json", import.meta.url);
writeFileSync(
  destino,
  [
    "{",
    `"procedencia": ${JSON.stringify(conteudo.procedencia, null, 2)},`,
    '"municipios": [',
    municipios.map((m) => JSON.stringify(m)).join(",\n"),
    "]",
    "}",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`\n  ${municipios.length} municípios, ${ufs.size} UFs.`);
if (nomesCorrigidos.length > 0) {
  console.log(`  ${nomesCorrigidos.length} nome(s) corrigido(s) pela API:`);
  for (const n of nomesCorrigidos) console.log(`    ${n}`);
}
console.log(`  escrito em prisma/seed/municipios.json\n`);
console.log(`  ATUALIZE prisma/seed/PROCEDENCIA.md no mesmo commit.\n`);
