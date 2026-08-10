/**
 * Fretes — PROVISÓRIA. Fica ativa na barra desde a tarefa 4 por decisão do
 * fundador (09/08/2026): a barra é estrutura fixa de cinco posições, e um
 * item desabilitado exigiria um tratamento visual que a folha de estilo não
 * define. Esperado até o item 4 da ordem de construção (lista de fretes e
 * detalhe do frete, `docs/especificacao.md` §9) substituir esta tela.
 *
 * Sem checagem de sessão própria: o layout deste grupo já garante isso, e
 * esta tela não lê nenhum dado de empresa.
 */
export default function Pagina() {
  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-8 px-20 text-center"
      style={{
        paddingTop: "var(--area-segura-topo)",
        paddingBottom: "var(--folga-rolagem)",
      }}
    >
      <p className="text-titulo-vazio font-extrabold tracking-[-0.01em] text-tinta">
        Ainda não
      </p>
      <p className="text-apoio font-medium text-tinta-apoio">
        Seus fretes aparecem aqui a partir do lançamento de frete.
      </p>
    </main>
  );
}
