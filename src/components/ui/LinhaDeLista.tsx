import Link from "next/link";
import type { ReactNode } from "react";
import { DeslizarParaRevelar } from "./DeslizarParaRevelar";
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
 *
 * **`iconePersonalizado`/`desmarcado`/`acessorio`** entraram no item 7,
 * segundo commit (29/08/2026), achado do `/revisar`: a linha desmarcável da
 * montagem do relatório e a linha agrupada de Cobranças (`LinhaCobrancaAgrupada.tsx`)
 * tinham nascido como implementações à parte, copiando este cartão em vez de
 * estendê-lo — `CLAUDE.md` §8, "componente existe uma vez". `acessorio`
 * segue o mesmo desenho de `rodape` (irmão do alvo de navegação, nunca
 * aninhado — mesmo motivo), só que ao LADO em vez de abaixo.
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
  /**
   * Substitui o círculo de `iniciais` por qualquer marcador — o checkbox
   * marcado/desmarcado da montagem do relatório (item 7, segundo commit).
   * Funciona nas duas variantes; tem prioridade sobre `iniciais` quando os
   * dois vêm preenchidos (nunca os dois juntos, na prática).
   */
  iconePersonalizado?: ReactNode;
  nome: string;
  apoio?: string;
  /** Presente = variante de frete (nome + valor, apoio + situação). */
  valorCentavos?: number;
  situacao?: SituacaoFinanceira;
  /**
   * Ocupa, na variante de frete, o lugar da etiqueta de situação — para a
   * lista de Cobranças (item 6, Tarefa 2), onde o canto direito da segunda
   * linha traz o prazo ("venceu há 6 dias", "vence hoje") e a marca discreta
   * de boleto, não uma `SituacaoFinanceira`. Mesma linha, mesmo lugar,
   * conteúdo de outro domínio: extensão do componente que já existe, nunca
   * uma cópia dele (`CLAUDE.md` §8).
   */
  marca?: ReactNode;
  /**
   * Esmaece nome e valor e risca os dois — "fora deste relatório" (item 7,
   * segundo commit), quando a pessoa desmarca uma linha da montagem. Só faz
   * sentido na variante de frete.
   */
  desmarcado?: boolean;
  /**
   * Deslizar revela "Marcar recebido" (item 6, Tarefa 3 —
   * `docs/componentes.md`: Meus fretes e Cobranças). Independente de
   * `href`/`onClick`: a linha continua navegando ou selecionando
   * normalmente no toque; o painel só aparece arrastando para a esquerda
   * (`DeslizarParaRevelar`).
   */
  aoDeslizar?: { rotulo: string; onRevelar: () => void };
  /**
   * Terceira linha, fora do alvo de navegação — a pílula "Cobrar no
   * WhatsApp" e a marca "cobrado há X dias" de Cobranças (item 6, Tarefa 5).
   * **Nunca aninhada dentro do `<a>`/`<button>` da linha** — um `<button>`
   * dentro de `<a>` é HTML inválido, e o toque nele acabaria também
   * navegando (o clique borbulha para o elemento que o React/Next trata como
   * o link). Em vez disso, `rodape` é **irmão** do alvo de navegação, dentro
   * do mesmo cartão: o toque nele nunca alcança o `<a>`/`<button>`, porque
   * não está dentro dele.
   */
  rodape?: ReactNode;
  /**
   * Controle ao LADO do alvo de navegação, dentro do mesmo cartão — o
   * chevron de "ver fretes desta cobrança" (`LinhaCobrancaAgrupada.tsx`,
   * item 7, segundo commit). Mesmo motivo de `rodape` (irmão, nunca
   * aninhado) — só a posição muda, de abaixo para o lado, via
   * `items-stretch`: o acessório herda a altura real da linha (mínimo
   * `min-h-78`), nunca um alvo mais baixo que 48px.
   */
  acessorio?: ReactNode;
};

type PropsLink = PropsBase & { href: string; onClick?: undefined };
type PropsBotao = PropsBase & { href?: undefined; onClick: () => void };

type Props = PropsLink | PropsBotao;

const CLASSE =
  "flex min-h-78 w-full rounded-linha bg-separacao px-18 py-14 text-left active:bg-principal-desabilitado";

/** Mesma aparência de `CLASSE`, mas sem o raio/fundo — quando só `rodape` existe (sem `acessorio`), o alvo continua sozinho no envoltório, então `w-full` ainda é certo (não é item de um flex ao lado de outra coisa). */
const CLASSE_ENVOLVIDA =
  "flex min-h-78 w-full px-18 py-14 text-left active:bg-principal-desabilitado";

/** Quando `acessorio` existe, o alvo de navegação é item de um `flex items-stretch` ao lado dele — `w-full` ali tentaria tomar o espaço inteiro e empurraria o acessório pra fora. `flex-1` divide o espaço direito; `min-w-0` deixa o texto truncar em vez de estourar a linha. */
const CLASSE_COM_ACESSORIO =
  "flex min-h-78 min-w-0 flex-1 px-18 py-14 text-left active:bg-principal-desabilitado";

function ConteudoClassico({ iniciais, iconePersonalizado, nome, apoio }: PropsBase): ReactNode {
  return (
    <div className="flex w-full items-center gap-14">
      {/* docs/componentes.md § "Iniciais da empresa": "Fundo #1B6B3A com
          texto branco" em toda linha de lista — o documento manda mais que o
          protótipo (fundo claro/texto verde), que é só evidência (§13). */}
      {iconePersonalizado ? (
        iconePersonalizado
      ) : iniciais ? (
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

function ConteudoFrete({
  iconePersonalizado,
  nome,
  apoio,
  valorCentavos,
  situacao,
  marca,
  desmarcado,
}: PropsBase): ReactNode {
  const classeTexto = desmarcado ? "text-tinta-desabilitada line-through" : "text-tinta";
  return (
    <div className="flex w-full items-center gap-14">
      {iconePersonalizado}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex items-start justify-between gap-10">
          <span className={`min-w-0 flex-1 truncate text-nome-linha font-bold ${classeTexto}`}>
            {nome}
          </span>
          <span
            className={`flex-none text-valor-lista font-extrabold leading-[1] tabular-nums ${classeTexto}`}
          >
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
          {marca ? (
            <span className="flex flex-none items-center gap-8">{marca}</span>
          ) : situacao ? (
            <EtiquetaSituacao situacao={situacao} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Conteudo(props: PropsBase): ReactNode {
  if (props.valorCentavos !== undefined) return <ConteudoFrete {...props} />;
  return <ConteudoClassico {...props} />;
}

function linha(props: Props, classe: string): ReactNode {
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classe}>
        <Conteudo {...props} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={classe}>
      <Conteudo {...props} />
    </button>
  );
}

export function LinhaDeLista(props: Props): ReactNode {
  const precisaDeEnvoltorio = Boolean(props.rodape) || Boolean(props.acessorio);
  const classeLinha = props.acessorio ? CLASSE_COM_ACESSORIO : precisaDeEnvoltorio ? CLASSE_ENVOLVIDA : CLASSE;

  const corpo = props.acessorio ? (
    <div className="flex items-stretch">
      {linha(props, classeLinha)}
      {props.acessorio}
    </div>
  ) : (
    linha(props, classeLinha)
  );

  const nucleo = precisaDeEnvoltorio ? (
    <div className="overflow-hidden rounded-linha bg-separacao">
      {corpo}
      {props.rodape ? <div className="px-18 pb-14">{props.rodape}</div> : null}
    </div>
  ) : (
    corpo
  );

  if (!props.aoDeslizar) return nucleo;

  return (
    <DeslizarParaRevelar rotulo={props.aoDeslizar.rotulo} onRevelar={props.aoDeslizar.onRevelar}>
      {nucleo}
    </DeslizarParaRevelar>
  );
}
