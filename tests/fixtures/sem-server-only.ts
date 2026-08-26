// Fixture do contraste de `tests/protecao-server-only.test.ts` — deliberadamente
// SEM `import "server-only"`. Prova que o teste está mesmo reagindo à presença
// do import, não a qualquer coisa que der errado ao carregar um módulo.
export const semProtecaoServerOnly = true;
