import Link from "next/link";
import type { ReactNode } from "react";
import { EtiquetaSituacao } from "./EtiquetaSituacao";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import type { SituacaoFinanceira } from "@/lib/servicos/titulos";

/**
 * Linha de lista — nasce em Clientes (tarefa 5), reusada por Motoristas e
 * Caminhões depois, pela Folha de busca do lançamento (item 3, tarefa 2) e
 * pela lista "Meus fretes" (item 4, Tarefa 2). Medidas de `docs/estilo.md`
 * (raio `20px`, fundo `#F0EDE6`) e `docs/componentes.md` § "Iniciais da
 * empresa" (círculo `40px` em linha de lista).
 *
 * **Duas variantes de conteúdo**, escolhidas por `valorCentavos` estar
 * presente: clássica (iniciais + nome + apoio, uma linha) ou frete (nome +
 * valor, apoio + situação, duas linhas). A variante de frete não nasceu
 * componente à parte (`LinhaDeFrete`) — achado do `/revisar` na Tarefa 2: o
 * comentário desta própria linha, escrito na tarefa 5, já previa "valor/
 * rótulo ficam de fora até existir Servico/TituloReceber para preencher",
 * ou seja, a extensão já estava prevista aqui, não em componente novo
 * (`CLAUDE.md` §8, "componente existe uma vez — proibido copiar").
 *
 * A linha inteira navega para o frete (`href`), ponto — nenhum link
 * aninhado dentro dela. Uma primeira versão dava ao nome do cliente um link
 * próprio para o perfil dele (`docs/navegacao.md`), com um link "esticado"
 * por baixo para não aninhar `<a>` dentro de `<a>`. Decisão do fundador,
 * 21/08/2026, revertida no mesmo dia: medido, o alvo de toque do nome ficava
 * em ~178×19,5px — bem abaixo do mínimo de 48px do §8 — porque o cartão de
 * 78px não tem espaço para dois alvos de 48px empilhados sem invadir a linha
 * de apoio/situação. Dois alvos de toque nesse espaço faz o dedo errar: quem
 * quer o frete, mira perto do nome, e cai no perfil do cliente por engano —
 * erro silencioso, todo dia. O caminho para o perfil do cliente continua
 * existindo (Mais → Clientes); a lacuna foi levada ao Design com a medida
 * (ver `docs/planos/item-4-lista-e-detalhe-do-frete.md`), não descartada em
 * silêncio.
 *
 * Com `href` navega (`next/link`) — as listas de cadastro e "Meus fretes".
 * Com `onClick` vira `<button>` — a folha de busca do lançamento seleciona e
 * fecha a folha, nunca troca de rota. Mesmo par de `Botao`/`PilulaEmLinha`.
 */

type PropsBase = {
  /**
   * Opcional: o círculo de iniciais é a regra de cliente/motorista, nunca de
   * caminhão (`docs/componentes.md` § "Iniciais da empresa" — a extensão às
   * linhas de lista é uma decisão do fundador restrita a cliente/motorista;
   * `ListaCaminhoes.tsx` já registra a decisão contrária: "'Scania branco' →
   * 'SB' não distingue nada"). Sem `iniciais`, a linha não desenha o círculo.
   * Só faz sentido na variante clássica (sem `valorCentavos`).
   */
  iniciais?: string;
  nome: string;
  apoio?: string;
  /** Presente = variante de frete (nome + valor, apoio + situação). */
  valorCentavos?: number;
  situacao?: SituacaoFinanceira;
};

type PropsLink = PropsBase & { href: string; onClick?: undefined };
type PropsBotao = PropsBase & { href?: undefined; onClick: () => void };

type Props = PropsLink | PropsBotao;

const CLASSE =
  "flex min-h-78 w-full rounded-linha bg-separacao px-18 py-14 text-left active:bg-principal-desabilitado";

function ConteudoClassico({ iniciais, nome, apoio }: PropsBase): ReactNode {
  return (
    <div className="flex w-full items-center gap-14">
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
    </div>
  );
}

function ConteudoFrete({ nome, apoio, valorCentavos, situacao }: PropsBase): ReactNode {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-10">
        <span className="min-w-0 flex-1 truncate text-nome-linha font-bold text-tinta">
          {nome}
        </span>
        <span className="flex-none text-valor-lista font-extrabold leading-[1] tabular-nums text-tinta">
          R$ {formatarCentavos(valorCentavos ?? 0)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-10">
        {apoio ? (
          <span className="min-w-0 flex-1 truncate text-apoio font-normal text-tinta-apoio-forte">
            {apoio}
          </span>
        ) : (
          <span />
        )}
        {situacao ? <EtiquetaSituacao situacao={situacao} /> : null}
      </div>
    </div>
  );
}

function Conteudo(props: PropsBase): ReactNode {
  if (props.valorCentavos !== undefined) return <ConteudoFrete {...props} />;
  return <ConteudoClassico {...props} />;
}

export function LinhaDeLista(props: Props): ReactNode {
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={CLASSE}>
        <Conteudo {...props} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={CLASSE}>
      <Conteudo {...props} />
    </button>
  );
}
