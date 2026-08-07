/**
 * A única pergunta declarada do produto — `docs/especificacao.md` §4.12.
 *
 * Fora de `cadastro.ts` de propósito: arquivo com `"use server"` só pode
 * exportar função assíncrona (é a regra do Next.js para Server Actions) —
 * uma constante como esta viraria uma referência de ação quebrada do lado do
 * cliente, não o array. `FormularioCriarConta.tsx` (client) e `cadastro.ts`
 * (server) importam os dois daqui.
 */
export const OPCOES_ORIGEM = [
  "Anúncio no Instagram ou Facebook",
  "Pesquisei no Google",
  "Alguém me indicou",
  "Vi outra empresa usando",
] as const;

export const OUTRO_ORIGEM = "Outro";
