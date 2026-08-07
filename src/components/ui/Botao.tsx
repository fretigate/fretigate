import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/**
 * O sistema de botão inteiro do produto — `docs/componentes.md` 01/02/03.
 *
 * As três variantes são um componente só, não três: mesma hierarquia de
 * estados (normal, pressionado, carregando, desabilitado), só o tratamento
 * visual muda. Nenhuma tela cria botão fora daqui (CLAUDE.md §8).
 *
 * Com `href`, vira link (`next/link`) com a mesma aparência — "Já tenho
 * conta" e "Esqueci a senha" navegam, não chamam o servidor, e não fazem
 * sentido como `<button>`.
 */

type Variante = "principal" | "secundaria" | "texto";

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante: Variante;
  href?: undefined;
  carregando?: boolean;
  /** Só para a variante "texto" — vermelho em vez de neutro. */
  destrutiva?: boolean;
  children: ReactNode;
};

type PropsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variante: Variante;
  href: string;
  carregando?: undefined;
  destrutiva?: boolean;
  children: ReactNode;
};

type Props = PropsBotao | PropsLink;

// Sem peso de fonte aqui, de propósito: 700 (principal/secundária) e 600
// (texto) competiam pelo mesmo atributo, e quem vencia era a ordem que o
// Tailwind gera no CSS — não a ordem escrita no JSX. Cada variante traz o
// próprio peso agora, sem sobreposição possível.
const CLASSE_BASE =
  "inline-flex items-center justify-center gap-[10px] rounded-pilula transition-colors disabled:cursor-not-allowed";

const CLASSE_POR_VARIANTE: Record<Variante, string> = {
  // 01 — Principal: altura 60, texto 17/700, verde sólido. Padding lateral
  // (24, docs/componentes.md) só vale para largura automática — aqui é sempre
  // w-full, então não entra.
  principal:
    "h-60 w-full text-botao-principal font-bold leading-[1] bg-acao text-white active:bg-acao-pressionada disabled:bg-principal-desabilitado disabled:text-tinta-desabilitada",
  // 02 — Secundária: altura 52, texto 15/700, fundo claro neutro. Mesma razão
  // acima para não ter padding lateral em largura total.
  secundaria:
    "h-52 w-full text-botao-secundario font-bold leading-[1] bg-separacao text-tinta active:bg-principal-desabilitado disabled:bg-secundario-desabilitado disabled:text-tinta-desabilitada",
  // 03 — Texto: altura 44 (alvo mínimo de toque), sem fundo. Nunca carrega.
  texto: "h-44 text-[14px] font-semibold leading-[1] disabled:text-tinta-desabilitada",
};

const CLASSE_TEXTO_DESTRUTIVA = "text-vencido active:text-destrutiva-pressionada";
const CLASSE_TEXTO_NEUTRA = "text-tinta-apoio active:text-tinta";

/** Spinner de carregamento — traço claro sobre trilha translúcida, por variante. */
function Spinner({ variante }: { variante: "principal" | "secundaria" }) {
  const tamanho = variante === "principal" ? 20 : 18;
  // Trilha translúcida: rgba literal porque é isto que docs/componentes.md 01/02
  // escreve (não é um token nomeado). O traço sólido é token — branco/tinta.
  const trilha =
    variante === "principal" ? "rgba(255,255,255,.3)" : "rgba(20,26,23,.15)";
  const classeTraco = variante === "principal" ? "stroke-white" : "stroke-tinta";

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke={trilha} strokeWidth="2.5" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        className={classeTraco}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Botao(props: Props) {
  const { variante, destrutiva = false, className, children } = props;

  const classeTexto =
    variante === "texto"
      ? destrutiva
        ? CLASSE_TEXTO_DESTRUTIVA
        : CLASSE_TEXTO_NEUTRA
      : "";

  const classeFinal = [
    CLASSE_BASE,
    CLASSE_POR_VARIANTE[variante],
    classeTexto,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Os campos do componente (variante, destrutiva, className, children, href,
  // carregando) não são atributo nativo de `<button>`/`<a>` — tirados de uma
  // cópia antes de espalhar o resto, em vez de re-desestruturar só para
  // descartar (o que deixaria binding não usado para trás).
  const nativos: Record<string, unknown> = { ...props };
  delete nativos.variante;
  delete nativos.destrutiva;
  delete nativos.className;
  delete nativos.children;
  delete nativos.href;
  delete nativos.carregando;

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
      // Estado carregando trava largura/altura e ignora toque repetido — CLAUDE.md §8:
      // todo botão que chama o servidor precisa disso, senão frete e cobrança duplicam.
      disabled={props.disabled || carregando}
      aria-busy={carregando}
      className={classeFinal}
      {...nativos}
    >
      {carregando && variante !== "texto" ? (
        <Spinner variante={variante} />
      ) : (
        children
      )}
    </button>
  );
}
