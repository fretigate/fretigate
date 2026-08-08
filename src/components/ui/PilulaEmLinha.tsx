import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Pílula em linha — `docs/componentes.md` 04. Primeira vez em uso: o botão
 * "Usar outro e-mail" da recuperação de senha. Só o modo botão (sem `href`)
 * — nenhum uso atual precisa navegar.
 */

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  carregando?: boolean;
  children: ReactNode;
};

export function PilulaEmLinha({
  carregando = false,
  disabled,
  children,
  className,
  ...resto
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      aria-busy={carregando}
      className={[
        "inline-flex h-38 items-center justify-center gap-[7px] rounded-pilula bg-pilula px-14 text-[12.5px] font-bold leading-[1] text-acao transition-colors active:bg-pilula-pressionada disabled:bg-separacao-variante disabled:text-tinta-desabilitada",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...resto}
    >
      {carregando ? (
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          className="animate-spin"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="rgba(20,26,23,.15)" strokeWidth="2" />
          <path
            d="M22 12a10 10 0 0 0-10-10"
            className="stroke-acao"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
