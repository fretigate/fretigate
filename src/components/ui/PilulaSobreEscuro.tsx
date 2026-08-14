import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/**
 * Pílula sobre escuro — `docs/componentes.md` 05. Só dentro do cartão preto
 * da dashboard e do `AvisoDoSistema`, nunca sobre fundo claro.
 *
 * Primeiro uso: "Já recebi" (chama o servidor, carrega) e "Novo frete"
 * (`href`, não carrega) dentro do aviso "Frete salvo" de Lançar frete.
 *
 * `carregando` é obrigatório em quem chama o servidor — é exatamente o botão
 * que `CLAUDE.md` §8 cita como exemplo de duplicar título sem essa trava.
 */

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined;
  carregando?: boolean;
  /** Ver `TAMANHO_TEXTO` abaixo. */
  dentroDoAviso?: boolean;
  children: ReactNode;
};

type PropsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  carregando?: undefined;
  dentroDoAviso?: boolean;
  children: ReactNode;
};

type Props = PropsBotao | PropsLink;

// Sem tamanho de texto na base, de propósito — mesma razão do `Botao.tsx`
// (comentário lá: duas classes de mesma propriedade CSS competindo não tem
// vencedor garantido pela ordem escrita no JSX, só pela ordem em que o
// Tailwind gera o CSS). `docs/componentes.md` "05": 12.5px é o tamanho
// normal; "no aviso do sistema o texto sobe para 14px" — a única forma
// segura é a instância escolher UMA classe, nunca duas competindo.
const CLASSE_BASE =
  "inline-flex h-46 items-center justify-center gap-[7px] rounded-pilula bg-white/10 px-14 font-semibold leading-[1.15] text-white transition-colors active:bg-white/20 disabled:bg-white/[.06] disabled:text-white/55";

const TAMANHO_TEXTO = {
  padrao: "text-[12.5px]",
  aviso: "text-[14px]",
} as const;

function Spinner() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="2" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        className="stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PilulaSobreEscuro(props: Props) {
  const { className, children, dentroDoAviso = false } = props;
  const classeFinal = [
    CLASSE_BASE,
    dentroDoAviso ? TAMANHO_TEXTO.aviso : TAMANHO_TEXTO.padrao,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // `disabled` sai daqui pelo mesmo motivo do `Botao`/`PilulaEmLinha` (ver o
  // comentário lá): sem o `delete`, o `{...nativos}` espalhado depois do
  // `disabled={props.disabled || carregando}` explícito abaixo apagaria o
  // travamento do toque repetido sempre que as duas props viessem juntas.
  const nativos: Record<string, unknown> = { ...props };
  delete nativos.className;
  delete nativos.children;
  delete nativos.href;
  delete nativos.carregando;
  delete nativos.dentroDoAviso;
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
