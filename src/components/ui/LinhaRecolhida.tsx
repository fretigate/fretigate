/**
 * Rótulo curto (maiúsculas, 82px) + valor + seta, campo tocável que abre uma
 * folha de escolha — nasceu em "Lançar frete" (item 3, Tarefa 2), extraída
 * aqui no segundo uso real (item 7, tela de montagem do relatório —
 * `CLAUDE.md` §6: "extraída no primeiro segundo uso real, não antes"), mesma
 * razão de `Etiqueta`/`EtiquetaSituacao.tsx`.
 */
export function LinhaRecolhida({
  rotulo,
  valor,
  onClick,
  desabilitada,
}: {
  rotulo: string;
  valor: string;
  onClick: () => void;
  /** Frete com título ativo (`docs/especificacao.md` §8, item 12) — mesmo tratamento para qualquer campo travado. */
  desabilitada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitada}
      className="flex min-h-60 items-center gap-12 rounded-campo bg-separacao px-18 text-left active:bg-principal-desabilitado disabled:bg-secundario-desabilitado disabled:active:bg-secundario-desabilitado"
    >
      <span className="w-82 flex-none text-[11px] font-bold uppercase leading-[1] tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-nome-recolhida font-bold ${desabilitada ? "text-tinta-desabilitada" : "text-tinta"}`}
      >
        {valor}
      </span>
      {desabilitada ? null : (
        <svg width={8} height={14} viewBox="0 0 8 14" fill="none" className="flex-none" aria-hidden="true">
          <path
            d="M1.4 1.4 6.6 7l-5.2 5.6"
            stroke="#A8AFA9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
