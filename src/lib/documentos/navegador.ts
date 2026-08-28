import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Abre um Chromium isolado para imprimir o documento em PDF.
 *
 * `puppeteer-core` + `@sparticuz/chromium`, sem a versão "enxuta"
 * (`@sparticuz/chromium-min`) — exatamente a combinação medida contra a
 * Vercel de verdade antes deste plano (`docs/planos/item-7-relatorio.md`,
 * "A medição que veio antes deste plano": ≈2,9s frio, ≈0,4s quente, coube no
 * tamanho da função sem precisar hospedar o binário à parte).
 *
 * **ATENÇÃO AO RODAR — só funciona em Linux x64.** `@sparticuz/chromium`
 * empacota um único binário (`node_modules/@sparticuz/chromium/bin/
 * chromium.br`) — é o que a Vercel usa (medido) e o que a esteira usa
 * (`ubuntu-latest`, `CLAUDE.md` §5, mesma arquitetura). **Não roda no
 * Windows da máquina de quem programa** — não existe binário Windows dentro
 * do pacote. `tests/documentos/gerador.test.ts` pula os testes que chamam
 * esta função quando `process.platform === "win32"`, de propósito — ver o
 * comentário lá e `CLAUDE.md` §14.
 */
export async function abrirNavegador(): Promise<Browser> {
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}
