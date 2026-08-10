import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/**
 * Pílula em linha — `docs/componentes.md` 04. Primeira vez em uso: o botão
 * "Usar outro e-mail" da recuperação de senha.
 *
 * Com `href` vira `next/link` — segundo uso: "Cadastrar '{busca}'" na lista
 * de clientes sem resultado, que navega para o formulário em vez de chamar
 * o servidor. Modo link não carrega (é navegação, não chamada).
 */

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined;
  carregando?: boolean;
  children: ReactNode;
};

type PropsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  carregando?: undefined;
  children: ReactNode;
};

type Props = PropsBotao | PropsLink;

const CLASSE =
  "inline-flex h-38 items-center justify-center gap-[7px] rounded-pilula bg-pilula px-14 text-[12.5px] font-bold leading-[1] text-acao transition-colors active:bg-pilula-pressionada disabled:bg-separacao-variante disabled:text-tinta-desabilitada";

function Spinner() {
  return (
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
  );
}

export function PilulaEmLinha(props: Props) {
  const { className, children } = props;
  const classeFinal = [CLASSE, className].filter(Boolean).join(" ");

  // `disabled` sai daqui pelo mesmo motivo do `Botao` (ver o comentário lá):
  // é atributo nativo, e sem o `delete` o `{...nativos}` espalhado depois do
  // `disabled={props.disabled || carregando}` explícito abaixo apagaria o
  // travamento do toque repetido sempre que as duas props viessem juntas.
  const nativos: Record<string, unknown> = { ...props };
  delete nativos.className;
  delete nativos.children;
  delete nativos.href;
  delete nativos.carregando;
  delete nativos.disabled;

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classeFinal} {...nativos}>
        {children}
      </Link>
    );
  }

  const carregando = props.carregando ?? false;

  return (
    <button
      type="button"
      disabled={props.disabled || carregando}
      aria-busy={carregando}
      className={classeFinal}
      {...nativos}
    >
      {carregando ? <Spinner /> : children}
    </button>
  );
}
