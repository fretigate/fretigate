/**
 * Categoria de despesa — `docs/especificacao.md` §4.8: texto livre no banco
 * (`Despesa.categoria`, mesmo padrão de `Recebimento.forma`), lista fechada
 * só na interface. Decisão do fundador, 01/09/2026 (`docs/planos/
 * item-11-despesas.md`, decisão 2) — as sete do protótipo (`referencia/
 * .../TelaDespesas.dc.html`), Diesel primeiro por ser o gasto mais
 * frequente. "Outro" revela campo de texto livre (mesmo mecanismo de
 * `FolhaDeRecebimento.tsx`) — o texto digitado é o que grava, nunca a
 * palavra "Outro".
 *
 * Vive aqui, e não em `src/lib/servicos/despesas.ts`, pelo mesmo motivo de
 * `TIPOS_VEICULO` em `caminhao.ts`: componente cliente precisa da lista, e
 * `despesas.ts` importa `db`, que puxa `pg` para o bundle do navegador.
 */
export const CATEGORIAS_DESPESA = [
  "Diesel",
  "Manutenção",
  "Motorista",
  "Pedágio",
  "Pneu",
  "Documento",
  "Outro",
] as const;
