/**
 * Carrega os municípios do IBGE no banco.
 *
 *     npm run seed:municipios            confere, grava e relata
 *     npm run seed:municipios -- --forcar  libera o teto de alterações
 *
 * NUNCA RODA EM `postinstall`, e isso é decisão registrada
 * (`docs/especificacao.md` §6). A Vercel roda `npm install` a cada publicação:
 * um `postinstall` tentaria falar com o banco durante o build — e ou quebra a
 * publicação, ou grava 5.570 linhas onde não devia. É comando de mão.
 *
 * FALA PELA CONEXÃO DAS MIGRATIONS (`DIRECT_URL`), NUNCA PELA DA APLICAÇÃO.
 * Não é conveniência, é o desenho: `fretigate_app` recebe **só `SELECT`** em
 * `municipio`, e a garantia de que nenhuma tela escreve ali não é disciplina de
 * quem escreve consulta — é a ausência do `GRANT`. Também não passa por `db()`,
 * que exige contexto de empresa: município não tem empresa.
 *
 * O comando do `package.json` desliga um aviso do Node
 * (`MODULE_TYPELESS_PACKAGE_JSON`), e é o único que ele desliga. O aviso é
 * sobre o cliente gerado pelo Prisma, arquivo que não escrevemos e não
 * controlamos, e apareceria a cada execução. Aviso que sempre aparece e nunca
 * importa ensina a ignorar a saída inteira — inclusive a parte que importa.
 *
 * NÃO TEM TRAVA DE BANCO, e isso é de propósito — ao contrário da suíte de
 * testes (`tests/guarda-de-banco.ts`), que recusa rodar fora dos projetos de
 * desenvolvimento e teste. Esta seed **precisa** rodar em produção: sem ela, o
 * campo de município nasce vazio para o cliente pagante. O que a torna segura
 * em qualquer banco é ela nunca apagar e nunca sobrescrever em massa sem
 * autorização explícita.
 */

import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/lib/generated/prisma/client.ts";
import { normalizarParaBusca } from "../../src/lib/utils/texto.ts";

type MunicipioDoArquivo = {
  codigo_ibge: number;
  nome: string;
  uf: string;
  latitude: number;
  longitude: number;
};

type Arquivo = {
  procedencia: { registros: number; gerado_em: string };
  municipios: MunicipioDoArquivo[];
};

/**
 * Faixa de sanidade da quantidade declarada.
 *
 * NÃO é `=== 5570`, e isso está escrito porque a tentação é escrever o número.
 * Município novo é criado por lei estadual: um número cravado faria a seed
 * **parar de carregar** no dia em que o IBGE mudasse a conta — o oposto do que
 * ela protege. Quem manda é o número que o próprio arquivo declara; a faixa só
 * pega arquivo truncado ou trocado por outro que nem parece uma base de
 * municípios.
 */
const FAIXA_DE_SANIDADE = { minimo: 5000, maximo: 6000 };

/** As 27 unidades da federação. */
const UFS = new Set([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
  "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
  "SE", "SP", "TO",
]);

/** Limites do Brasil, com folga — pega coordenada trocada de sinal ou de ordem. */
const BRASIL = { latMin: -34, latMax: 6, lonMin: -74, lonMax: -32 };

/**
 * Quantas linhas a seed pode ALTERAR sem autorização explícita.
 *
 * Inserir nunca é destrutivo: linha nova não apaga nada, e a primeira carga são
 * 5.570 de uma vez. Alterar é outra história — reescreve o que já estava lá.
 *
 * A conferência de formato recusa arquivo **malformado**, mas não recusa
 * arquivo **válido e errado**: edição antiga, download trocado, geração
 * interrompida pela metade. Nesses casos o sintoma é sempre o mesmo, muitas
 * linhas mudando de uma vez. Correção real do IBGE é punhado; centenas é
 * arquivo errado.
 */
const TETO_DE_ALTERACOES = 100;

const forcar = process.argv.includes("--forcar");

function parar(motivo: string): never {
  console.error(`\n  SEED INTERROMPIDA — nada foi gravado.\n\n  ${motivo}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Ler e conferir ANTES de qualquer conexão com o banco.
//
// A ordem é a garantia: arquivo ruim nunca chega perto do banco, porque a seed
// nem abriu conexão ainda.
// ---------------------------------------------------------------------------

const caminho = new URL("./municipios.json", import.meta.url);
const arquivo: Arquivo = JSON.parse(readFileSync(caminho, "utf8"));

const declarados = arquivo.procedencia?.registros;
const municipios = arquivo.municipios;

if (!Array.isArray(municipios) || typeof declarados !== "number") {
  parar("`municipios.json` não tem o formato esperado (procedencia + municipios).");
}

if (declarados < FAIXA_DE_SANIDADE.minimo || declarados > FAIXA_DE_SANIDADE.maximo) {
  parar(
    `O arquivo declara ${declarados} municípios, fora da faixa de sanidade ` +
      `(${FAIXA_DE_SANIDADE.minimo} a ${FAIXA_DE_SANIDADE.maximo}).\n  ` +
      "Isso não é o IBGE tendo mudado a conta — é outro arquivo.",
  );
}

if (municipios.length !== declarados) {
  parar(
    `O arquivo declara ${declarados} municípios e traz ${municipios.length}.\n  ` +
      "Arquivo truncado ou editado à mão. Regere com " +
      "`node prisma/seed/gerar-municipios.mjs`.",
  );
}

/** O que vai para o banco, já com o nome normalizado pela função única. */
const paraGravar = municipios.map((m) => ({
  ...m,
  nome_normalizado: normalizarParaBusca(m.nome),
}));

const problemas: string[] = [];
const vistos = new Set<number>();

for (const m of paraGravar) {
  if (!Number.isInteger(m.codigo_ibge) || m.codigo_ibge < 1000000) {
    problemas.push(`código inválido: ${m.codigo_ibge}`);
    continue;
  }
  if (vistos.has(m.codigo_ibge)) problemas.push(`${m.codigo_ibge}: código repetido`);
  vistos.add(m.codigo_ibge);

  if (!m.nome?.trim()) problemas.push(`${m.codigo_ibge}: nome vazio`);
  if (!m.nome_normalizado) problemas.push(`${m.codigo_ibge}: nome normalizado vazio`);
  if (!UFS.has(m.uf)) problemas.push(`${m.codigo_ibge}: UF fora das 27 (${m.uf})`);

  if (!Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) {
    problemas.push(`${m.codigo_ibge}: coordenada não numérica`);
  } else if (m.latitude === 0 || m.longitude === 0) {
    // Zero é o valor que "faltou preencher" costuma assumir, e cai no golfo da
    // Guiné — longe de qualquer município brasileiro.
    problemas.push(`${m.codigo_ibge}: coordenada zerada`);
  } else if (
    m.latitude < BRASIL.latMin ||
    m.latitude > BRASIL.latMax ||
    m.longitude < BRASIL.lonMin ||
    m.longitude > BRASIL.lonMax
  ) {
    problemas.push(
      `${m.codigo_ibge}: coordenada fora do Brasil (${m.latitude}, ${m.longitude})`,
    );
  }
}

const ufsPresentes = new Set(paraGravar.map((m) => m.uf));
if (ufsPresentes.size !== UFS.size) {
  problemas.push(`${ufsPresentes.size} UFs presentes, esperadas ${UFS.size}`);
}

if (problemas.length > 0) {
  parar(
    `${problemas.length} problema(s) no arquivo:\n  - ` +
      problemas.slice(0, 20).join("\n  - ") +
      (problemas.length > 20 ? `\n  - ... e mais ${problemas.length - 20}` : ""),
  );
}

console.log(
  `  arquivo conferido: ${paraGravar.length} municípios, ${ufsPresentes.size} UFs ` +
    `(gerado em ${arquivo.procedencia.gerado_em})`,
);

// ---------------------------------------------------------------------------
// 2. O que já está no banco, e o que muda.
// ---------------------------------------------------------------------------

const URL_DIRETA = process.env.DIRECT_URL;
if (!URL_DIRETA) {
  parar(
    "DIRECT_URL não está definida. É a conexão das migrations — a mesma que " +
      "cria a tabela grava o conteúdo dela.\n  Rode com `npm run seed:municipios`, " +
      "que carrega o `.env`.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: URL_DIRETA }),
});

try {
  const existentes = new Map(
    (
      await prisma.municipio.findMany({
        select: {
          codigo_ibge: true,
          nome: true,
          uf: true,
          nome_normalizado: true,
          latitude: true,
          longitude: true,
        },
      })
    ).map((m) => [m.codigo_ibge, m]),
  );

  const novos = paraGravar.filter((m) => !existentes.has(m.codigo_ibge));

  const alterados = paraGravar.filter((m) => {
    const atual = existentes.get(m.codigo_ibge);
    if (!atual) return false;
    return (
      atual.nome !== m.nome ||
      atual.uf !== m.uf ||
      atual.nome_normalizado !== m.nome_normalizado ||
      atual.latitude !== m.latitude ||
      atual.longitude !== m.longitude
    );
  });

  /**
   * Está no banco e não está na fonte. A seed RELATA E NÃO APAGA: "nada é
   * apagado" (`CLAUDE.md` §7), e município extinto é `arquivado_em` preenchido
   * — decisão do fundador, não efeito de recarregar um arquivo.
   */
  const ausentes = [...existentes.keys()].filter((c) => !vistos.has(c));

  console.log(
    `  no banco: ${existentes.size} · novos: ${novos.length} · ` +
      `alterados: ${alterados.length} · inalterados: ${
        paraGravar.length - novos.length - alterados.length
      }`,
  );

  for (const m of alterados) {
    const atual = existentes.get(m.codigo_ibge)!;
    const mudou: string[] = [];
    if (atual.nome !== m.nome) mudou.push(`nome "${atual.nome}" -> "${m.nome}"`);
    if (atual.uf !== m.uf) mudou.push(`uf ${atual.uf} -> ${m.uf}`);
    if (atual.nome_normalizado !== m.nome_normalizado) mudou.push("nome normalizado");
    if (atual.latitude !== m.latitude || atual.longitude !== m.longitude) {
      mudou.push(
        `coordenada ${atual.latitude},${atual.longitude} -> ${m.latitude},${m.longitude}`,
      );
    }
    console.log(`    ${m.codigo_ibge} ${m.nome}/${m.uf}: ${mudou.join(" · ")}`);
  }

  if (alterados.length > TETO_DE_ALTERACOES && !forcar) {
    parar(
      `${alterados.length} alterações, acima do teto de ${TETO_DE_ALTERACOES}.\n  ` +
        "Correção do IBGE é punhado de linhas; centenas costuma ser arquivo " +
        "trocado ou edição antiga.\n  As alterações estão listadas acima. Se " +
        "estiverem certas, rode de novo com:\n\n      npm run seed:municipios -- --forcar",
    );
  }

  if (ausentes.length > 0) {
    console.log(
      `\n  ${ausentes.length} município(s) no banco e não na fonte — NADA foi ` +
        `apagado (§7):\n    ${ausentes.join(", ")}`,
    );
  }

  // -------------------------------------------------------------------------
  // 3. Gravar. Só o que mudou.
  // -------------------------------------------------------------------------

  if (novos.length > 0) {
    // `skipDuplicates` mesmo já sabendo quais são novos: entre a leitura acima
    // e esta linha, outra execução pode ter gravado. Custa nada e evita a
    // execução perdida por corrida.
    await prisma.municipio.createMany({ data: novos, skipDuplicates: true });
  }

  if (alterados.length > 0) {
    // UMA TRANSAÇÃO SÓ: metade atualizada é pior que nenhuma, porque ninguém
    // fica sabendo qual metade.
    //
    // Com tempo limite explícito, e isto foi MEDIDO, não previsto: o padrão do
    // Prisma é 5 segundos, e 150 atualizações contra o Supabase levaram 5,1 s —
    // a transação expirou no meio. Cada linha é uma ida e volta ao banco, então
    // o tempo cresce com a quantidade e o padrão só serve para punhado. Uma
    // recarga forçada, que pode mexer nas 5.570, precisa de folga de verdade.
    const porLinha = 200; // ms de folga por atualização, medido com margem
    await prisma.$transaction(
      async (tx) => {
        for (const m of alterados) {
          await tx.municipio.update({
            where: { codigo_ibge: m.codigo_ibge },
            // `arquivado_em` NÃO entra nesta lista, e é o ponto: se alguém
            // arquivou um município extinto, recarregar a fonte não o
            // ressuscita.
            data: {
              nome: m.nome,
              uf: m.uf,
              nome_normalizado: m.nome_normalizado,
              latitude: m.latitude,
              longitude: m.longitude,
            },
          });
        }
      },
      { timeout: Math.max(30_000, alterados.length * porLinha), maxWait: 15_000 },
    );
  }

  // -------------------------------------------------------------------------
  // 4. Conferir DEPOIS.
  //
  // A conferência de antes olha o arquivo; esta olha o banco. Sem ela, a seed
  // relataria "gravei" apoiada em ter chamado a função, não em ter o resultado
  // — que é exatamente o defeito que o §3 do CLAUDE.md manda nunca repetir.
  // -------------------------------------------------------------------------

  const gravados = new Map(
    (
      await prisma.municipio.findMany({
        select: {
          codigo_ibge: true,
          nome: true,
          uf: true,
          nome_normalizado: true,
          latitude: true,
          longitude: true,
        },
      })
    ).map((m) => [m.codigo_ibge, m]),
  );

  const divergentes = paraGravar.filter((m) => {
    const g = gravados.get(m.codigo_ibge);
    return (
      !g ||
      g.nome !== m.nome ||
      g.uf !== m.uf ||
      g.nome_normalizado !== m.nome_normalizado ||
      g.latitude !== m.latitude ||
      g.longitude !== m.longitude
    );
  });

  if (divergentes.length > 0) {
    parar(
      `Gravou, mas ${divergentes.length} município(s) não conferem com o arquivo ` +
        `depois da gravação.\n  Primeiros: ${divergentes
          .slice(0, 5)
          .map((m) => m.codigo_ibge)
          .join(", ")}`,
    );
  }

  console.log(
    `\n  ${gravados.size} municípios no banco, todos conferindo com o arquivo.\n`,
  );
} finally {
  // Sem `process.exit` aqui. Um `finally` que encerra o processo ENGOLE a
  // exceção que estava subindo — foi assim que um teste deste projeto imprimiu
  // aprovação sem ter verificado nada (`CLAUDE.md` §3).
  await prisma.$disconnect();
}
