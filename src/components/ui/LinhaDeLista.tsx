import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Linha de lista — nasce em Clientes (tarefa 5), reusada por Motoristas e
 * Caminhões depois. Medidas de `docs/estilo.md` (raio `20px`, fundo
 * `#F0EDE6`) e `docs/componentes.md` § "Iniciais da empresa" (círculo
 * `40px` em linha de lista).
 *
 * `valor`/`rotulo` (a coluna da direita, tipo "R$ 380 · A RECEBER") ficam de
 * fora até existir `Servico`/`TituloReceber` (item 3/4) para preencher — sem
 * eles a coluna mostraria número inventado, o que o `CLAUDE.md` §8 proíbe
 * ("número incompleto não é exibido").
 */

type Props = {
  href: string;
  iniciais: string;
  nome: string;
  apoio?: string;
};

export function LinhaDeLista({ href, iniciais, nome, apoio }: Props): ReactNode {
  return (
    <Link
      href={href}
      className="flex min-h-78 items-center gap-14 rounded-linha bg-separacao px-18 py-14 text-left active:bg-principal-desabilitado"
    >
      {/* docs/componentes.md § "Iniciais da empresa": "Fundo #1B6B3A com
          texto branco" em toda linha de lista — o documento manda mais que o
          protótipo (fundo claro/texto verde), que é só evidência (§13). */}
      <span className="flex h-40 w-40 flex-none items-center justify-center rounded-pilula bg-acao text-[13px] font-bold leading-[1] text-white">
        {iniciais}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-5">
        <span className="truncate text-nome-linha font-bold text-tinta">{nome}</span>
        {/* "Corpo de apoio" (13–15/1.2–1.5/400–500, docs/estilo.md) — usa o
            token já existente em vez de um tamanho novo fora da faixa. */}
        {apoio ? <span className="text-apoio font-normal text-tinta-apoio">{apoio}</span> : null}
      </span>
    </Link>
  );
}
