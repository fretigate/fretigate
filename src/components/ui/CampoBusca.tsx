import type { InputHTMLAttributes } from "react";

/**
 * Campo de busca das listas de cadastro — `docs/estilo.md` (altura 48,
 * ícone `busca.svg` 15px/1.9, texto 14/500 no papel terciário/cromo:
 * "Buscar cliente" etc.).
 */

type Props = InputHTMLAttributes<HTMLInputElement>;

export function CampoBusca({ className, ...resto }: Props) {
  return (
    <div
      className={[
        "flex h-48 items-center gap-10 rounded-campo bg-separacao px-15",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        className="flex-none text-tinta-apoio"
        aria-hidden="true"
      >
        <path d="M15.24 15.24l4.08 4.08" />
        <circle cx="10.68" cy="10.68" r="6" />
      </svg>
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent text-busca font-medium leading-[1] text-tinta outline-none placeholder:text-tinta-apoio"
        {...resto}
      />
    </div>
  );
}
