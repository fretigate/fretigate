import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * As três fontes de `./fontes/` (ver `PROCEDENCIA.md` na mesma pasta),
 * embutidas como `data:` URI dentro de um `<style>` — o Chromium isolado do
 * Puppeteer (`navegador.ts`) não tem acesso a rede nem a um servidor de
 * arquivos estáticos por trás dele, então `page.setContent()` só enxerga o
 * que estiver dentro do próprio HTML.
 *
 * `import.meta.url` (não `process.cwd()`) resolve o caminho relativo a ESTE
 * arquivo, não ao diretório de onde o processo foi iniciado — mesma razão
 * pela qual `scripts/medir-municipios.mts` existe: caminho relativo a `cwd`
 * quebra dependendo de onde o comando roda.
 */
const DIRETORIO = dirname(fileURLToPath(import.meta.url));

function comoDataUri(nomeDoArquivo: string): string {
  const bytes = readFileSync(join(DIRETORIO, "fontes", nomeDoArquivo));
  return `data:font/woff2;base64,${bytes.toString("base64")}`;
}

/**
 * O `<style>` completo, memorizado — os três arquivos não mudam durante a
 * vida do processo, então ler e converter para base64 a cada PDF gerado
 * seria trabalho repetido sem necessidade (mesmo padrão de "um cliente por
 * processo" já usado em `src/lib/db/index.ts` e `comprovantes.ts`, aplicado
 * aqui a leitura de arquivo em vez de conexão).
 *
 * Declara as variáveis `--fonte-interface`/`--fonte-placa` no próprio
 * `:root` deste documento standalone — os mesmos nomes que
 * `src/app/layout.tsx` expõe no `<html>` do app (ver `estiloImpresso.ts`,
 * na mesma pasta), para `moldeDocumentoA4.ts`/`corpoRelatorio.ts`
 * resolverem a fonte certa nos dois contextos (prévia em tela via Tarefa 3,
 * ou aqui, standalone) sem saber em qual dos dois estão rodando.
 */
let estiloDeFontesCache: string | null = null;

export function estiloDeFontesEmbutidas(): string {
  if (estiloDeFontesCache) return estiloDeFontesCache;

  const archivo = comoDataUri("archivo-variavel.woff2");
  const azeretMono = comoDataUri("azeret-mono-variavel.woff2");
  const interSimbolos = comoDataUri("inter-simbolos.woff2");

  estiloDeFontesCache = `
    :root {
      --fonte-interface: 'Archivo', sans-serif;
      --fonte-placa: 'Azeret Mono', monospace;
    }
    @font-face {
      font-family: 'Archivo';
      font-style: normal;
      font-weight: 100 900;
      font-stretch: 62.5% 125%;
      src: url(${archivo}) format('woff2');
    }
    @font-face {
      font-family: 'Archivo';
      font-style: normal;
      font-weight: 100 900;
      font-stretch: 62.5% 125%;
      /* Só os dois glifos que o arquivo do Archivo não tem — → e ✓.
         Ver fontes/PROCEDENCIA.md. */
      unicode-range: U+2192, U+2713;
      src: url(${interSimbolos}) format('woff2');
    }
    @font-face {
      font-family: 'Azeret Mono';
      font-style: normal;
      font-weight: 100 900;
      src: url(${azeretMono}) format('woff2');
    }
    html, body { margin: 0; padding: 0; }
  `;

  return estiloDeFontesCache;
}
