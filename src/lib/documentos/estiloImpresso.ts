/**
 * Valores literais da seção "Impresso — só o documento A4" de
 * `docs/estilo.md` — contexto próprio, deliberadamente fora do sistema de
 * tokens Tailwind do resto do app (`src/app/globals.css`): "nada abaixo se
 * aplica a tela; nada da escala de tela se aplica ao impresso".
 *
 * Compartilhado entre `moldeDocumentoA4.ts` e `corpoRelatorio.ts` só para os
 * valores que aparecem nos dois (as duas cores de tinta e os três fios) —
 * evita o número errado divergir entre os dois arquivos. Tamanho de fonte e
 * espaçamento, que não se repetem entre os dois, ficam onde são usados.
 */

export const TINTA_PRINCIPAL = "#141A17";
export const TINTA_APOIO = "#3C443E";
export const TINTA_TERCIARIA = "#6E7770";
export const TINTA_MARCA_DISCRETA = "#A8AFA9";

export const FIO_FORTE = `1.5px solid ${TINTA_PRINCIPAL}`;
export const FIO_DE_LINHA = "1px solid rgba(20,26,23,.16)";
/** Mesmo valor visual do fio forte — nome próprio porque o uso é diferente (moldura fechada, não divisor). */
export const FIO_MOLDURA = `1.5px solid ${TINTA_PRINCIPAL}`;

/**
 * As duas famílias declaram as mesmas variáveis que `src/app/layout.tsx`
 * expõe no `<html>` para o resto do app (`--fonte-interface`,
 * `--fonte-placa`) — é o mesmo Archivo/Azeret Mono, só que "Impresso" é
 * outro contexto de tamanho, não outra família. Quando a marcação roda
 * dentro do app (Tarefa 3, prévia em tela), essas variáveis já existem no
 * `<html>` do `RootLayout`. Quando roda isolada para o Puppeteer
 * (`gerador.ts`), o próprio gerador define as duas no `<html>` que constrói
 * (`fontesEmbutidas.ts`).
 */
export const FONTE_ARCHIVO = "var(--fonte-interface, Archivo, sans-serif)";
export const FONTE_AZERET_MONO = "var(--fonte-placa, 'Azeret Mono', monospace)";
