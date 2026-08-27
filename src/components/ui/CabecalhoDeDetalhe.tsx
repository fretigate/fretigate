import Link from "next/link";

/**
 * Cabeçalho de tela de detalhe — seta de Voltar + rótulo em eyebrow. Nasceu
 * em `fretes/[id]/page.tsx`, copiado para `cobrancas/[id]/page.tsx` (item 6,
 * Tarefa 4) até o `/revisar` apontar a cópia (`CLAUDE.md` §8). Extraído para
 * os dois reaproveitarem — as outras telas de detalhe que já têm o mesmo
 * bloco ficam como estão, fora do escopo desta tarefa.
 */

type Props = {
  /** Para onde a seta leva. */
  href: string;
  /** O texto em eyebrow — "Frete", "Cobrança". */
  rotulo: string;
};

export function CabecalhoDeDetalhe({ href, rotulo }: Props) {
  return (
    <div
      className="flex items-center gap-10 px-20 pb-14"
      style={{ paddingTop: "var(--area-segura-topo)" }}
    >
      <Link
        href={href}
        aria-label="Voltar"
        className="-ml-10 flex h-44 w-44 flex-none items-center justify-center"
      >
        <svg width={12} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15.6 4.35 8.4 12l7.2 7.65"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <span className="min-w-0 flex-1 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
    </div>
  );
}
