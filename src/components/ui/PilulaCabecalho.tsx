import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/**
 * Pílula de cabeçalho — `docs/componentes.md` 06. Ação de cabeçalho de tela
 * ou de folha: "+ Novo", "Editar". Nunca verde sólida — só a principal do
 * rodapé é verde sólida.
 *
 * Mesmo par botão/link do `Botao`: com `href` vira `next/link` — "+ Novo"
 * navega para o cadastro, não chama o servidor.
 */

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined;
  children: ReactNode;
};

type PropsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

type Props = PropsBotao | PropsLink;

const CLASSE =
  "inline-flex h-44 items-center justify-center rounded-pilula bg-pilula px-16 text-[13.5px] font-bold leading-[1] text-acao transition-colors active:bg-pilula-pressionada disabled:bg-separacao-variante disabled:text-tinta-desabilitada";

export function PilulaCabecalho(props: Props) {
  const { className, children } = props;
  const classeFinal = [CLASSE, className].filter(Boolean).join(" ");

  // Mesma técnica do `Botao`: descarta os campos do componente de uma cópia
  // antes de espalhar o resto, em vez de re-desestruturar só para descartar.
  const nativos: Record<string, unknown> = { ...props };
  delete nativos.className;
  delete nativos.children;
  delete nativos.href;

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classeFinal} {...nativos}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classeFinal} {...nativos}>
      {children}
    </button>
  );
}
