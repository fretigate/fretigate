import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Linha de lista — nasce em Clientes (tarefa 5), reusada por Motoristas e
 * Caminhões depois, e pela Folha de busca do lançamento (item 3, tarefa 2).
 * Medidas de `docs/estilo.md` (raio `20px`, fundo `#F0EDE6`) e
 * `docs/componentes.md` § "Iniciais da empresa" (círculo `40px` em linha de
 * lista).
 *
 * `valor`/`rotulo` (a coluna da direita, tipo "R$ 380 · A RECEBER") ficam de
 * fora até existir `Servico`/`TituloReceber` (item 3/4) para preencher — sem
 * eles a coluna mostraria número inventado, o que o `CLAUDE.md` §8 proíbe
 * ("número incompleto não é exibido").
 *
 * Com `href` navega (`next/link`) — as listas de cadastro. Com `onClick`
 * vira `<button>` — a folha de busca do lançamento seleciona e fecha a
 * folha, nunca troca de rota. Mesmo par de `Botao`/`PilulaEmLinha`.
 */

type PropsBase = {
  /**
   * Opcional: o círculo de iniciais é a regra de cliente/motorista, nunca de
   * caminhão (`docs/componentes.md` § "Iniciais da empresa" — a extensão às
   * linhas de lista é uma decisão do fundador restrita a cliente/motorista;
   * `ListaCaminhoes.tsx` já registra a decisão contrária: "'Scania branco' →
   * 'SB' não distingue nada"). Sem `iniciais`, a linha não desenha o círculo.
   */
  iniciais?: string;
  nome: string;
  apoio?: string;
};

type PropsLink = PropsBase & { href: string; onClick?: undefined };
type PropsBotao = PropsBase & { href?: undefined; onClick: () => void };

type Props = PropsLink | PropsBotao;

const CLASSE =
  "flex min-h-78 w-full items-center gap-14 rounded-linha bg-separacao px-18 py-14 text-left active:bg-principal-desabilitado";

function Conteudo({ iniciais, nome, apoio }: PropsBase): ReactNode {
  return (
    <>
      {/* docs/componentes.md § "Iniciais da empresa": "Fundo #1B6B3A com
          texto branco" em toda linha de lista — o documento manda mais que o
          protótipo (fundo claro/texto verde), que é só evidência (§13). */}
      {iniciais ? (
        <span className="flex h-40 w-40 flex-none items-center justify-center rounded-pilula bg-acao text-[13px] font-bold leading-[1] text-white">
          {iniciais}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-5">
        <span className="truncate text-nome-linha font-bold text-tinta">{nome}</span>
        {/* "Corpo de apoio" (13–15/1.2–1.5/400–500, docs/estilo.md) — usa o
            token já existente em vez de um tamanho novo fora da faixa. */}
        {apoio ? <span className="text-apoio font-normal text-tinta-apoio">{apoio}</span> : null}
      </span>
    </>
  );
}

export function LinhaDeLista(props: Props): ReactNode {
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={CLASSE}>
        <Conteudo iniciais={props.iniciais} nome={props.nome} apoio={props.apoio} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={CLASSE}>
      <Conteudo iniciais={props.iniciais} nome={props.nome} apoio={props.apoio} />
    </button>
  );
}
