import type { ButtonHTMLAttributes } from "react";

/**
 * Chip de escolha — `docs/componentes.md` "Chips de seleção › Escolha".
 * Controle de estado, não ação: nunca entra no bloco de ações do rodapé, e
 * nunca usa o verde sólido da ação principal (§8) — selecionado é sempre
 * `--color-pilula` com texto `--color-acao`.
 */

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selecionado: boolean;
};

export function ChipEscolha({ selecionado, className, ...resto }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      className={[
        "h-48 rounded-pilula px-16 text-botao-secundario leading-[1] transition-colors",
        selecionado
          ? "bg-pilula font-bold text-acao"
          : "bg-separacao font-semibold text-tinta",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...resto}
    />
  );
}
