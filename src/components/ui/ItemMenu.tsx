import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Item de menu — as linhas de "Mais" (CADASTROS, FERRAMENTAS, AJUSTES).
 * Nasce com a linha "Clientes" (tarefa 5); Caminhões e Motoristas
 * reaproveitam depois. Ícone + nome + apoio opcional + seta de afordância
 * (`seta-linha.svg`, `docs/componentes.md` § 09).
 */

type Props = {
  href: string;
  nome: string;
  apoio?: string;
  children: ReactNode;
};

export function ItemMenu({ href, nome, apoio, children }: Props) {
  return (
    <Link
      href={href}
      className="flex min-h-64 w-full items-center gap-14 rounded-campo bg-separacao px-18 py-14 active:bg-principal-desabilitado"
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-tinta"
        aria-hidden="true"
      >
        {children}
      </svg>
      <span className="flex min-w-0 flex-1 flex-col gap-4">
        <span className="text-nome-recolhida font-bold text-tinta">{nome}</span>
        {/* "Total contextual (cromo)" — docs/estilo.md § Tipografia:
            12/1/500, tinta #6E7770. Contagem de cadastro é informação de
            apoio, não conteúdo do usuário — mesmo papel do "12 fretes ·
            R$ 38.420" da lista. */}
        {apoio ? (
          <span className="text-total-contextual font-medium text-tinta-apoio">{apoio}</span>
        ) : null}
      </span>
      <svg
        width={8}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-tinta-fraca"
        aria-hidden="true"
      >
        <path d="M8.657 4.8 15.343 12l-6.686 7.2" />
      </svg>
    </Link>
  );
}
