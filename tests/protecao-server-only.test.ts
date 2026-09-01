import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Teste PERMANENTE da proteção `import "server-only"` (item 5, Tarefa 6,
 * 25/08/2026) em todo arquivo do produto que a tem — os dois que conectam no
 * banco com privilégio (`src/lib/db/index.ts`,
 * `src/lib/db/sem-filtro-de-empresa.ts`), o que assina sessão
 * (`src/lib/auth/index.ts`), os três que guardam chave `service_role`
 * (`src/lib/servicos/comprovantes.ts`, protegido desde a Tarefa 4;
 * `src/lib/documentos/armazenamento.ts`, item 7 Tarefa 2;
 * `src/lib/servicos/logo.ts`, item 10 Tarefa 2), e os dois que
 * abrem um Chromium isolado ou montam a marcação do PDF
 * (`src/lib/documentos/navegador.ts`, `gerador.ts`) — nenhum dos dois deve
 * ser arrastado para o lado do navegador, mesmo raciocínio de
 * `comprovantes.ts`, item 7 Tarefa 2.
 *
 * POR QUE PROVA O EFEITO, NÃO A PRESENÇA DA LINHA
 * Checar `readFileSync(...).includes('import "server-only"')` provaria que a
 * linha existe, não que ela protege — é exatamente a lacuna que motivou esta
 * tarefa: a proteção anterior (o build quebrando por acidente, porque `pg`
 * não roda em navegador) também "existia" sem que ninguém tivesse escrito
 * uma trava pensada para isso. Este teste roda o mecanismo de verdade: o
 * pacote `server-only` decide entre lançar ou não por `exports` condicional
 * (`node_modules/server-only/package.json`, condição `react-server` — a
 * mesma que o Next.js ativa ao empacotar para o servidor, e que falta num
 * bundle de navegador). Chamar `node` sem essa condição reproduz, em
 * miniatura, o que aconteceria se um desses arquivos fosse arrastado para o
 * lado errado — sem precisar rodar `next build` inteiro (caro, e a esteira
 * não roda `npm run build` — `.github/workflows/ci.yml` só tem lint,
 * guardas, migration, seed e `npm test`).
 *
 * O CONTRASTE (`CLAUDE.md` §3, item 1, aplicado aqui)
 * Cada arquivo protegido roda duas vezes: SEM a condição `react-server`
 * (precisa lançar o erro do `server-only`) e COM ela (precisa carregar
 * normalmente — é o comportamento real do build do Next.js do lado do
 * servidor). Sem o segundo lado, um teste que só checasse "lança sempre"
 * não provaria nada: podia ser esse arquivo lançando por falta de variável
 * de ambiente, não pelo `server-only`. E a fixture `tests/fixtures/sem-server-only.ts`
 * (sem o import) roda pelo mesmo caminho sem a condição — se ELA lançasse o
 * mesmo erro, o teste estaria reagindo a outra coisa, não à proteção.
 *
 * LISTA POR NOME, NÃO VARREDURA (decisão do fundador, 25/08/2026): um
 * arquivo sensível novo que nascer sem `server-only` não deve passar
 * despercebido só porque um `grep`/varredura não sabia procurar por ele —
 * a lista abaixo é a própria decisão de quais arquivos precisam da proteção,
 * conferida um a um.
 *
 * ⛔ REGRA, NÃO FOTOGRAFIA: TODO ARQUIVO QUE RECEBER `import "server-only"`
 * ENTRA NESTA LISTA, no mesmo commit que ganha a linha. Uma lista por nome
 * só protege o que alguém escreveu nela — o arquivo esquecido fica com a
 * proteção sem ninguém medindo se ela continua ali, que é exatamente o
 * problema que este teste existe para fechar. Foi o que aconteceu com
 * `comprovantes.ts`: protegido na Tarefa 4, ficou de fora da primeira
 * versão desta lista (que só olhava os três arquivos da Tarefa 6) e entrou
 * por decisão do fundador, 25/08/2026 — "é o mais sensível dos quatro,
 * guarda a chave que ignora o isolamento". Sem esta regra escrita, o quinto
 * repetiria o mesmo.
 *
 * POR QUE TAMBÉM CHECA A LINHA, E NÃO SÓ O EFEITO
 * Medido ao montar este teste, não suposto: `src/lib/auth/index.ts` importa
 * `src/lib/db/sem-filtro-de-empresa.ts`, que também é protegido. Removendo
 * só a linha de `auth/index.ts` (na mão, para testar o próprio teste), o
 * contraste OFF de `auth/index.ts` continuou "passando" — carregar o arquivo
 * ainda lançava o erro de `server-only`, só que vindo de dentro de
 * `sem-filtro-de-empresa.ts`, não da linha que faltou. O teste de efeito
 * prova que a CADEIA inteira quebra do jeito certo — não prova que CADA
 * arquivo tem a própria linha, porque um arquivo pode estar protegido só por
 * tabela, via o que ele importa. Por isso a checagem de presença abaixo
 * confere o próprio código-fonte de cada um da lista, por nome: sem ela, uma
 * remoção futura da linha em `auth/index.ts` especificamente passaria
 * despercebida enquanto `sem-filtro-de-empresa.ts` continuasse protegido.
 */

const raizDoRepo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Ver "REGRA, NÃO FOTOGRAFIA" no topo: arquivo novo com `server-only` entra aqui. */
const ARQUIVOS_PROTEGIDOS = [
  "src/lib/db/index.ts",
  "src/lib/db/sem-filtro-de-empresa.ts",
  "src/lib/auth/index.ts",
  "src/lib/servicos/comprovantes.ts",
  "src/lib/documentos/armazenamento.ts",
  "src/lib/documentos/navegador.ts",
  "src/lib/documentos/gerador.ts",
  "src/lib/servicos/logo.ts",
];

const ARQUIVO_SEM_PROTECAO = "tests/fixtures/sem-server-only.ts";

const MARCADOR_CARREGOU = "MODULO_CARREGOU_SEM_SERVER_ONLY";
const TRECHO_ERRO_SERVER_ONLY = "cannot be imported from a Client Component module";

/**
 * Roda `node --import tsx -e "require(<arquivo>)"` — o mesmo par de flags
 * que `package.json` já usa para `medir:municipios` (a única ferramenta do
 * projeto que carrega estes arquivos fora do bundler do Next.js). Sem
 * `--conditions=react-server`, reproduz a resolução de módulo de um
 * contexto que não é o build de servidor do Next.js — o cenário que este
 * teste precisa provar que quebra.
 */
function carregarForaDoBundler(caminhoRelativo: string, { comCondicaoReactServer = false } = {}) {
  const caminhoAbsoluto = join(raizDoRepo, caminhoRelativo);
  const args = [
    ...(comCondicaoReactServer ? ["--conditions=react-server"] : []),
    "--import",
    "tsx",
    "-e",
    `require(${JSON.stringify(caminhoAbsoluto)}); console.log(${JSON.stringify(MARCADOR_CARREGOU)});`,
  ];
  return spawnSync(process.execPath, args, {
    cwd: raizDoRepo,
    encoding: "utf8",
    env: process.env,
  });
}

/** `CLAUDE.md` §3, item 4 — contagem de verificações, aplicada ao mesmo padrão. */
let conferencias = 0;
const CONFERENCIAS_ESPERADAS = ARQUIVOS_PROTEGIDOS.length * 3 + 1;

describe("proteção server-only — a própria linha, por arquivo (não mascarada por proteção transitiva)", () => {
  it.each(ARQUIVOS_PROTEGIDOS)("%s começa com import \"server-only\"", (arquivo) => {
    const primeiraLinha = readFileSync(join(raizDoRepo, arquivo), "utf8").split(/\r?\n/, 1)[0];
    expect(primeiraLinha).toBe('import "server-only";');
    conferencias++;
  });
});

describe("proteção server-only — contraste OFF (falta a condição react-server)", () => {
  it.each(ARQUIVOS_PROTEGIDOS)("%s lança o erro de server-only fora do contexto de servidor", (arquivo) => {
    const resultado = carregarForaDoBundler(arquivo);
    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain(TRECHO_ERRO_SERVER_ONLY);
    expect(resultado.stdout).not.toContain(MARCADOR_CARREGOU);
    conferencias++;
  });

  it("a fixture SEM o import não lança esse erro — prova que o teste reage à proteção, não a qualquer falha de carregar", () => {
    const resultado = carregarForaDoBundler(ARQUIVO_SEM_PROTECAO);
    expect(resultado.stderr).not.toContain(TRECHO_ERRO_SERVER_ONLY);
    expect(resultado.stdout).toContain(MARCADOR_CARREGOU);
    conferencias++;
  });
});

describe("proteção server-only — contraste ON (com a condição react-server, como o Next.js usa no servidor)", () => {
  it.each(ARQUIVOS_PROTEGIDOS)("%s carrega normalmente no lado que o Next.js protege de verdade", (arquivo) => {
    const resultado = carregarForaDoBundler(arquivo, { comCondicaoReactServer: true });
    expect(resultado.stdout).toContain(MARCADOR_CARREGOU);
    expect(resultado.status).toBe(0);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
