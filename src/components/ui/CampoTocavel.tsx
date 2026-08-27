import type { ReactNode } from "react";

/**
 * O campo tocável das folhas de valor/data — parece um `CampoTexto`, mas
 * não é editável direto: o toque abre outra coisa no lugar dele (o teclado
 * numérico, ou um calendário). Primeiro em `FolhaDeFaturamento` (item 6,
 * Tarefa 1 — vencimento) e reusado em `FolhaDeRecebimento` (item 6, Tarefa 3
 * — valor e data do recebimento), depois de as duas folhas terem
 * reescrito a mesma classe à mão, achado do `/revisar` (`CLAUDE.md` §8:
 * "campo... vive em `/src/components/ui` e é reutilizado — proibido copiar
 * componente").
 */
type Props = {
  onClick: () => void;
  children: ReactNode;
  /** O valor mostrado é numérico (R$, contagem) — alinha os dígitos. */
  tabularNums?: boolean;
};

export function CampoTocavel({ onClick, children, tabularNums }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-64 items-center rounded-campo bg-separacao px-16 text-nome-recolhida font-semibold text-tinta",
        tabularNums ? "tabular-nums" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
