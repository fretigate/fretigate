import { afterAll, describe, expect, it } from "vitest";
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Teste de contraste PERMANENTE da varredura de segredo (tarefa 4 da
 * auditoria de segurança, `docs/planos/auditoria-4-varredura-de-segredo.md`).
 *
 * POR QUE RODA O BINÁRIO DE VERDADE, NUNCA REIMPLEMENTA A REGRA
 * O `.gitleaks.toml` deste repositório já passou por duas correções de
 * raciocínio errado (`docs/diario.md`, 18/08/2026): duas vezes alguém leu a
 * regex e concluiu que ela cobria um disfarce que, na prática, não cobria —
 * só rodar a ferramenta de verdade contra um caso plantado revelou o erro.
 * Um teste que reimplementasse "o que a regra deveria fazer" testaria de
 * novo o mesmo entendimento que já falhou duas vezes. Por isso este arquivo
 * chama o binário real do gitleaks, com a configuração real do repositório,
 * a mesma versão fixa que a esteira baixa (`CLAUDE.md` §4).
 *
 * O CONTRASTE (`CLAUDE.md` §3, item 1, aplicado aqui)
 * Cada caso roda duas vezes: com a regra "pura" (sem a lista de isenção de
 * placeholder) e com a configuração real (regra + isenção). A regra pura
 * prova que o disfarce de fato chegaria a ser avaliado pela regra — sem
 * isso, um caso que desse "isento" no teste normal não provaria nada: podia
 * ser isento de verdade, ou podia ser um caso que a regra nunca alcança,
 * como se a proteção nunca tivesse existido. A configuração real prova o
 * resultado que importa.
 */

const raizDoRepo = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAMINHO_CONFIG_REAL = join(raizDoRepo, ".gitleaks.toml");
const RULE_ID = "generic-connection-string-credential";

/**
 * Mesma versão fixa que `.github/workflows/ci.yml` baixa
 * (`GITLEAKS_VERSION=8.30.1`) — nunca "a versão que estiver instalada".
 * Sem isto, `GITLEAKS_BIN` ou o PATH podiam resolver para outra versão, o
 * teste passar, e ninguém saber contra qual gitleaks — o `useDefault = true`
 * do `.gitleaks.toml` herda o conjunto de regras padrão da versão que rodou,
 * e esse conjunto muda entre versões. Mesmo espírito do `node-version: 24`
 * fixo no `ci.yml`.
 */
const VERSAO_ESPERADA = "8.30.1";

/**
 * Contagem de verificações — `CLAUDE.md` §3, item 4. Teste que não distingue
 * "passou" de "não rodou" é pior que teste nenhum.
 */
let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 9;

type Achado = { RuleID: string; File: string; Secret: string; Fingerprint: string };

/**
 * Executa o binário do gitleaks. O candidato resolvido pelo PATH (bare
 * `"gitleaks"`, sem caminho) precisa de shell no Windows, que não resolve
 * `.exe`/`.cmd` sem um — os outros três candidatos de `localizarGitleaks`
 * são caminho de arquivo explícito e nunca precisam.
 *
 * Quando precisa de shell, monta UM COMANDO SÓ (`execSync`), nunca
 * `execFileSync(..., {shell:true})` com array de args — essa combinação é
 * depreciada pelo próprio Node (os args não ficam escapados). Seguro aqui
 * porque nenhum argumento vem de entrada externa: são só os literais fixos
 * deste arquivo e caminhos que este próprio teste gerou.
 */
function executar(bin: string, args: string[], precisaDeShell: boolean): string {
  if (precisaDeShell) {
    const comando = [bin, ...args].map((parte) => `"${parte}"`).join(" ");
    return execSync(comando, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  }
  return execFileSync(bin, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}

/**
 * Localiza o binário do gitleaks. NUNCA pula em silêncio: se nada for
 * encontrado, o módulo lança na hora de carregar — o mesmo desenho de
 * `tests/guarda-de-banco.ts`, que recusa a suíte inteira em vez de deixar um
 * teste "passar" sem ter rodado.
 *
 * Ordem de busca:
 * 1. `GITLEAKS_BIN` — override explícito, para quem instalou em outro lugar.
 * 2. `<raiz>/gitleaks` — onde a esteira já baixa o binário antes de `npm test`
 *    rodar (`.github/workflows/ci.yml`, passo "Baixar e conferir gitleaks").
 * 3. `<raiz>/gitleaks.exe` — mesma convenção, para quem baixou o binário do
 *    Windows na raiz do repositório para testar localmente.
 * 4. `gitleaks` no PATH — para quem tem o binário instalado globalmente.
 */
function localizarGitleaks(): { bin: string; precisaDeShell: boolean } {
  const candidatos = [
    process.env.GITLEAKS_BIN,
    join(raizDoRepo, "gitleaks"),
    join(raizDoRepo, "gitleaks.exe"),
    "gitleaks",
  ].filter((c): c is string => Boolean(c));

  const tentativas: string[] = [];
  for (const candidato of candidatos) {
    const precisaDeShell = candidato === "gitleaks";
    let versao: string;
    try {
      versao = executar(candidato, ["version"], precisaDeShell).trim();
    } catch (erro) {
      tentativas.push(`  - ${candidato}: não rodou (${(erro as Error).message.split("\n")[0]})`);
      continue;
    }
    if (versao !== VERSAO_ESPERADA) {
      tentativas.push(`  - ${candidato}: versão ${versao || "(vazia)"}, esperada ${VERSAO_ESPERADA}`);
      continue;
    }
    return { bin: candidato, precisaDeShell };
  }

  throw new Error(
    [
      "",
      "┌─────────────────────────────────────────────────────────────┐",
      "│  BINÁRIO DO GITLEAKS NÃO ENCONTRADO (OU VERSÃO ERRADA)       │",
      "└─────────────────────────────────────────────────────────────┘",
      "",
      "Este teste roda o binário REAL do gitleaks contra a configuração real",
      "do repositório — de propósito, não reimplementa a regra (ver comentário",
      "no topo do arquivo). Sem o binário na versão certa, ele falha alto,",
      "nunca pula nem roda contra uma versão diferente da que a esteira usa.",
      "",
      "Tentativas:",
      ...tentativas,
      "",
      "O que fazer:",
      "  - Na esteira, o binário certo já existe (baixado antes de `npm test` —",
      "    ver `.github/workflows/ci.yml`). Se isto falhar lá, o passo de",
      "    download quebrou ou a versão fixada mudou nos dois lugares sem",
      "    sincronizar.",
      `  - Localmente, baixe a versão ${VERSAO_ESPERADA} do GitHub Releases do`,
      "    gitleaks para a raiz do repositório, ou defina GITLEAKS_BIN",
      "    apontando para um binário dessa mesma versão.",
      "",
    ].join("\n"),
  );
}

const { bin: GITLEAKS_BIN, precisaDeShell: GITLEAKS_PRECISA_DE_SHELL } = localizarGitleaks();

/**
 * Roda `gitleaks detect` e devolve os achados. Trata só o par de saídas que
 * o gitleaks documenta (0 = sem achado, 1 = achado encontrado) como
 * execução válida — qualquer outro código de saída é falha de execução, não
 * resultado da varredura, e propaga o erro em vez de interpretar como "zero
 * achados".
 */
function rodarGitleaks(config: string, origem: string, relatorio: string): Achado[] {
  try {
    executar(
      GITLEAKS_BIN,
      ["detect", "--source", origem, "--no-git", "--config", config, "--report-format", "json", "--report-path", relatorio],
      GITLEAKS_PRECISA_DE_SHELL,
    );
  } catch (erro) {
    const e = erro as { status?: number | null; stderr?: string; stdout?: string };
    if (e.status !== 1) {
      throw new Error(`gitleaks falhou ao rodar (código ${e.status}):\n${e.stderr ?? e.stdout ?? erro}`);
    }
  }
  return JSON.parse(readFileSync(relatorio, "utf8")) as Achado[];
}

function achadosDoArquivo(achados: Achado[], nomeArquivo: string): Achado[] {
  return achados.filter((a) => a.File.endsWith(nomeArquivo));
}

// --- Fixtures ---------------------------------------------------------
//
// Os quatro casos que o fundador pediu: os dois disfarces que passaram
// silenciosos antes das correções (não só a versão final da regra), e o
// placeholder exato nas duas capitalizações que aparecem de verdade no
// repositório (`docs/diario.md`, `tests/guarda-de-banco.test.ts`).
//
// Nenhum valor aqui é segredo real — são strings sintéticas, com a FORMA de
// segredo, para exercitar a regra.

const ARQ_PLACEHOLDER_MINUSCULO = "caso1-placeholder-minusculo.txt";
const ARQ_PLACEHOLDER_MAIUSCULO = "caso2-placeholder-maiusculo.txt";
const ARQ_DISFARCE_CAMPO = "caso3-disfarce-senha-terminada-em-dois-pontos-senha.txt";
const ARQ_DISFARCE_QUERY = "caso4-disfarce-query-string-depois-do-host.txt";

const SENHA_REAL_DISFARCE_QUERY = "xK9mQ2vP7wZ4nR8t";

// Pedaços da fixture do disfarce 2, DELIBERADAMENTE quebrados de forma que
// nenhuma linha deste arquivo contenha o texto contíguo
// "protocolo://usuário:senha@host" — o mesmo formato que a própria regra
// procura. Medido (e por isso registrado em `docs/diario.md`, 20/08/2026):
// uma versão anterior escrevia isso como um template literal só, e o
// gitleaks não acusava — não porque a exceção do placeholder funcionasse
// (a senha não é "senha"/"SENHA"), mas porque o texto fonte usava
// `${SENHA_REAL_DISFARCE_QUERY}` e o gitleaks, por algum motivo não
// documentado, não casa a regra contra sintaxe no formato `${...}`. Isso é
// comportamento observado da ferramenta, não uma garantia da nossa regra —
// pode mudar numa atualização sem aviso. A quebra abaixo fecha a questão
// por CONSTRUÇÃO: nenhum trecho contíguo do arquivo fonte forma o padrão,
// então não depende de nenhuma heurística do gitleaks para ficar seguro.
const PROTOCOLO_DISFARCE_QUERY = "postgres";
const USUARIO_DISFARCE_QUERY = "postgres";
const HOST_DISFARCE_QUERY = "host.example.com:5432";
const QUERY_STRING_DISFARCE = "?p=:senha@x";

const raizFixtures = mkdtempSync(join(tmpdir(), "fretigate-varredura-de-segredo-"));

writeFileSync(
  join(raizFixtures, ARQ_PLACEHOLDER_MINUSCULO),
  'DATABASE_URL="postgres://postgres:senha@host.example.com:5432/db"\n',
);
writeFileSync(
  join(raizFixtures, ARQ_PLACEHOLDER_MAIUSCULO),
  'DATABASE_URL="postgres://postgres:SENHA@host.example.com:5432/db"\n',
);
// Disfarce 1: senha real terminada em ":senha" — antes da correção, a
// subcadeia ":senha@" nascia dentro do próprio campo e disfarçava a senha
// verdadeira como se fosse o placeholder.
writeFileSync(
  join(raizFixtures, ARQ_DISFARCE_CAMPO),
  'AUTH_DATABASE_URL="postgres://postgres:aB9x7Kp2Qz:senha@host.example.com:5432/db"\n',
);
// Disfarce 2: senha real seguida de "?p=:senha@" depois do endereço — antes
// da correção, a comparação era contra a URL inteira capturada pela regra,
// não contra o campo isolado da senha, e essa subcadeia mais adiante isentava
// a senha real de verdade.
writeFileSync(
  join(raizFixtures, ARQ_DISFARCE_QUERY),
  `AUTH_DATABASE_URL="${PROTOCOLO_DISFARCE_QUERY}://${USUARIO_DISFARCE_QUERY}:${SENHA_REAL_DISFARCE_QUERY}@${HOST_DISFARCE_QUERY}${QUERY_STRING_DISFARCE}"\n`,
);

const configReal = readFileSync(CAMINHO_CONFIG_REAL, "utf8");
const marcadorAllowlist = "[rules.allowlist]";
const indiceAllowlist = configReal.indexOf(marcadorAllowlist);
if (indiceAllowlist === -1) {
  throw new Error(
    `${CAMINHO_CONFIG_REAL} não tem mais a seção "${marcadorAllowlist}" — o teste ` +
      "depende dela para construir a versão sem isenção (a regra \"pura\") usada no contraste.",
  );
}
if (!configReal.includes(RULE_ID)) {
  throw new Error(`${CAMINHO_CONFIG_REAL} não declara mais a regra "${RULE_ID}" que este teste confere.`);
}

const CAMINHO_CONFIG_PURA = join(raizFixtures, "config-sem-allowlist.toml");
writeFileSync(CAMINHO_CONFIG_PURA, configReal.slice(0, indiceAllowlist));

const RELATORIO_REGRA_PURA = join(raizFixtures, "relatorio-regra-pura.json");
const RELATORIO_CONFIG_REAL = join(raizFixtures, "relatorio-config-real.json");

const achadosRegraPura = rodarGitleaks(CAMINHO_CONFIG_PURA, raizFixtures, RELATORIO_REGRA_PURA)
  .filter((a) => a.RuleID === RULE_ID);
const achadosConfigReal = rodarGitleaks(CAMINHO_CONFIG_REAL, raizFixtures, RELATORIO_CONFIG_REAL)
  .filter((a) => a.RuleID === RULE_ID);

afterAll(() => {
  rmSync(raizFixtures, { recursive: true, force: true });
});

describe("varredura de segredo — a regra pura enxerga conexão com senha (contraste)", () => {
  it("o binário é exatamente a versão fixa que a esteira baixa", () => {
    // Sem isto, um binário corrompido, incompatível, ou só de outra versão
    // (`GITLEAKS_BIN`/PATH resolvendo para algo diferente) podia fazer as
    // duas execuções abaixo devolver achados diferentes dos daqui — o
    // `useDefault = true` do `.gitleaks.toml` herda o conjunto de regras
    // padrão da versão que rodou, e esse conjunto muda entre versões.
    const versao = executar(GITLEAKS_BIN, ["version"], GITLEAKS_PRECISA_DE_SHELL).trim();
    expect(versao).toBe(VERSAO_ESPERADA);
    conferencias++;
  });

  it("a regra pura reconhece o placeholder minúsculo como conexão com senha", () => {
    const achados = achadosDoArquivo(achadosRegraPura, ARQ_PLACEHOLDER_MINUSCULO);
    expect(achados).toHaveLength(1);
    expect(achados[0].Secret).toBe("senha");
    conferencias++;
  });

  it("a regra pura reconhece o placeholder maiúsculo como conexão com senha", () => {
    const achados = achadosDoArquivo(achadosRegraPura, ARQ_PLACEHOLDER_MAIUSCULO);
    expect(achados).toHaveLength(1);
    expect(achados[0].Secret).toBe("SENHA");
    conferencias++;
  });
});

describe("varredura de segredo — configuração real isenta só o placeholder exato", () => {
  it("placeholder minúsculo fica isento", () => {
    expect(achadosDoArquivo(achadosConfigReal, ARQ_PLACEHOLDER_MINUSCULO)).toEqual([]);
    conferencias++;
  });

  it("placeholder maiúsculo fica isento", () => {
    expect(achadosDoArquivo(achadosConfigReal, ARQ_PLACEHOLDER_MAIUSCULO)).toEqual([]);
    conferencias++;
  });
});

describe("varredura de segredo — disfarce 1 (senha real terminada em ':senha')", () => {
  it("nem a regra pura casa esse formato — não sobra brecha para a isenção explorar", () => {
    // Medido, não suposto (docs/diario.md, 18/08/2026): depois da correção
    // que exclui ":" do campo da senha, este formato deixa de casar com a
    // regra inteira — não é mais "casa e depois é isentado por engano", é
    // "não casa". A verificação seguinte confirma que a configuração real
    // não faz melhor nem pior que a regra pura aqui: as duas concordam.
    expect(achadosDoArquivo(achadosRegraPura, ARQ_DISFARCE_CAMPO)).toEqual([]);
    conferencias++;
  });

  it("a configuração real também não isenta por engano — mesmo resultado, motivo correto", () => {
    expect(achadosDoArquivo(achadosConfigReal, ARQ_DISFARCE_CAMPO)).toEqual([]);
    conferencias++;
  });
});

describe("varredura de segredo — disfarce 2 (senha real seguida de '?p=:senha@' depois do endereço)", () => {
  it("a regra pura captura a senha real, não o texto depois do host (contraste)", () => {
    const achados = achadosDoArquivo(achadosRegraPura, ARQ_DISFARCE_QUERY);
    expect(achados).toHaveLength(1);
    expect(achados[0].Secret).toBe(SENHA_REAL_DISFARCE_QUERY);
    conferencias++;
  });

  it("a configuração real reprova — a senha real disfarçada não fica isenta", () => {
    const achados = achadosDoArquivo(achadosConfigReal, ARQ_DISFARCE_QUERY);
    expect(achados).toHaveLength(1);
    expect(achados[0].Secret).toBe(SENHA_REAL_DISFARCE_QUERY);
    expect(achados[0].Secret).not.toBe("senha");
    expect(achados[0].Secret).not.toBe("SENHA");
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
