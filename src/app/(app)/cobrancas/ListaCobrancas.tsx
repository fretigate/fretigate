"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { FolhaDeBusca, type ItemFolhaDeBusca } from "@/components/ui/FolhaDeBusca";
import { FolhaDeOrdenacao } from "@/components/ui/FolhaDeOrdenacao";
import { FolhaDePeriodo, type JanelaEscolhida } from "@/components/ui/FolhaDePeriodo";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { Etiqueta } from "@/components/ui/EtiquetaSituacao";
import { Botao } from "@/components/ui/Botao";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarDataCurta } from "@/lib/utils/periodo";
import { instanteDoDiaEmFortaleza } from "@/lib/utils/data-fortaleza";
// De `cobrancas-situacao`, nunca de `cobrancas`: este é Client Component, e
// o outro módulo importa `@/lib/db` (`server-only`) — o `npm run build`
// reprova a cadeia inteira, como reprovou ao escrever esta tarefa.
import {
  ROTULO_SITUACAO,
  SITUACAO_PADRAO,
  SITUACOES as VALORES_DE_SITUACAO,
  type GrupoDeCobranca,
  type SituacaoCobranca,
} from "@/lib/servicos/cobrancas-situacao";

/**
 * Cobranças (item 6, Tarefa 2) — `docs/especificacao.md` §4.5 e o protótipo
 * (`referencia/.../TelaCobrancas.dc.html`, evidência corroborante, nunca
 * autoridade — `CLAUDE.md` §13).
 *
 * **Situação e Período vão ao servidor pela URL; Cliente filtra aqui**, sobre
 * o que já veio. O motivo de Situação não ser filtro local (diferente de
 * "Meus fretes") está em `resolverSituacaoDaUrl`
 * (`src/lib/servicos/cobrancas.ts`): ela troca o conjunto lido do banco, e a
 * dashboard do item 8 linka para cá já filtrada.
 *
 * **Sem campo de busca** — §4.5 lista três filtros (Situação · Cliente ·
 * Período) e nenhuma busca; a lista de cobranças em aberto é curta por
 * natureza, diferente de "Meus fretes".
 */

export type CobrancaParaLista = {
  id: string;
  clienteId: string;
  cliente: string;
  /** Rota e dia do frete — `null` quando o frete não tem origem/destino. */
  referencia: string | null;
  /**
   * Em aberto, o que **falta entrar** (valor menos o já recebido); em
   * Recebidas, o que **entrou**. É o mesmo dinheiro que os números do topo
   * contam, para a linha e o topo nunca discordarem (decisão do fundador,
   * 26/08/2026 — plano do item 6, Tarefa 2). Hoje os dois são iguais ao valor
   * cheio: recebimento parcial só nasce na Tarefa 3.
   */
  valorCentavos: number;
  grupo: GrupoDeCobranca;
  /** Dia (`"AAAA-MM-DD"` em Fortaleza) do vencimento, ou do recebimento nas pagas. */
  dia: string | null;
  boleto: boolean;
};

type Props = {
  cobrancas: CobrancaParaLista[];
  hoje: string;
  situacaoAtual: SituacaoCobranca;
  janelaAtual: string | undefined;
  filtroDePeriodoAtivo: boolean;
  /** `true` quando a lista foi cortada no teto de 50 — mesma regra de "Meus fretes". */
  limitadoA50: boolean;
  rotuloPeriodo: string | null;
  /**
   * Fretes na situação **A faturar** — só o estado vazio usa. Mesmo critério
   * da etiqueta de "Meus fretes", para o número aqui nunca discordar da lista
   * que o botão abre (decisão do fundador, 26/08/2026, achado do `/revisar`).
   */
  fretesAFaturar: number;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const ORDEM_DOS_GRUPOS: GrupoDeCobranca[] = ["vencidas", "vence_hoje", "a_vencer", "recebidas"];

// A lista da folha sai da mesma constante que o servidor valida — duas listas
// divergem, e a que envelhece é sempre a que ninguém executa.
const SITUACOES: { valor: SituacaoCobranca; rotulo: string }[] = VALORES_DE_SITUACAO.map(
  (valor) => ({ valor, rotulo: ROTULO_SITUACAO[valor] }),
);

function diferencaEmDias(de: string, ate: string): number {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.round(
    (instanteDoDiaEmFortaleza(ate).getTime() - instanteDoDiaEmFortaleza(de).getTime()) / umDia,
  );
}

/**
 * O prazo, em palavras — "venceu há 6 dias", "vence hoje", "vence em 12 ago",
 * "recebido em 5 ago". A conta é entre **dias de Fortaleza**, nunca entre
 * instantes: é o que mantém "vence hoje" sendo hoje até a meia-noite de lá,
 * mesmo com o servidor em UTC.
 */
function textoDoPrazo(cobranca: CobrancaParaLista, hoje: string): string {
  const { grupo, dia } = cobranca;
  if (grupo === "recebidas") return dia ? `recebido em ${formatarDataCurta(dia)}` : "recebido";
  if (!dia) return "sem vencimento";
  if (grupo === "vence_hoje") return "vence hoje";
  if (grupo === "vencidas") {
    const dias = diferencaEmDias(dia, hoje);
    return dias === 1 ? "venceu ontem" : `venceu há ${dias} dias`;
  }
  const dias = diferencaEmDias(hoje, dia);
  return dias === 1 ? "vence amanhã" : `vence em ${formatarDataCurta(dia)}`;
}

/**
 * Cor do prazo — `docs/estilo.md`: `#B3401A` ("Vencido"), `#8A6206` ("A
 * faturar / vence hoje"), `--color-acao` para o que já entrou. A vencer fica
 * na tinta de apoio: é o estado normal, não um alerta.
 */
const CLASSE_DO_PRAZO: Record<GrupoDeCobranca, string> = {
  vencidas: "text-vencido",
  vence_hoje: "text-a-faturar",
  a_vencer: "text-tinta-apoio",
  recebidas: "text-acao",
};

function rotuloDoGrupo(grupo: GrupoDeCobranca, dia: string | null): string {
  if (grupo === "vencidas") return "Vencidas";
  if (grupo === "vence_hoje") return "Vence hoje";
  if (grupo === "a_vencer") return "A vencer";
  // "Recebidas em agosto" — um grupo por mês do recebimento, porque a tela
  // abre sem filtro de período (decisão do fundador, 26/08/2026) e o mês
  // precisa vir do próprio dado, não de um filtro que pode não existir.
  if (!dia) return "Recebidas";
  const [ano, mes] = dia.split("-").map(Number);
  return `Recebidas em ${MESES[mes - 1]} de ${ano}`;
}

export function ListaCobrancas({
  cobrancas,
  hoje,
  situacaoAtual,
  janelaAtual,
  filtroDePeriodoAtivo,
  limitadoA50,
  rotuloPeriodo,
  fretesAFaturar,
}: Props) {
  const router = useRouter();
  const [clienteFiltro, setClienteFiltro] = useState<string | undefined>();
  const [folhaAberta, setFolhaAberta] = useState<"periodo" | "cliente" | "situacao" | null>(null);

  const clientesUnicos = useMemo<ItemFolhaDeBusca[]>(() => {
    const mapa = new Map<string, string>();
    for (const c of cobrancas) if (!mapa.has(c.clienteId)) mapa.set(c.clienteId, c.cliente);
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }, [cobrancas]);

  const filtradas = useMemo(
    () => (clienteFiltro ? cobrancas.filter((c) => c.clienteId === clienteFiltro) : cobrancas),
    [cobrancas, clienteFiltro],
  );

  // Já vem ordenada do servidor (vencimento asc nas abertas, recebimento desc
  // nas pagas) — só agrupa em sequência, nunca reordena.
  const grupos = useMemo(() => {
    const resultado: { chave: string; rotulo: string; itens: CobrancaParaLista[] }[] = [];
    for (const cobranca of filtradas) {
      const rotulo = rotuloDoGrupo(cobranca.grupo, cobranca.dia);
      const ultimo = resultado[resultado.length - 1];
      if (ultimo && ultimo.rotulo === rotulo) ultimo.itens.push(cobranca);
      else resultado.push({ chave: rotulo, rotulo, itens: [cobranca] });
    }
    return resultado.sort(
      (a, b) => ORDEM_DOS_GRUPOS.indexOf(a.itens[0].grupo) - ORDEM_DOS_GRUPOS.indexOf(b.itens[0].grupo),
    );
  }, [filtradas]);

  const valorTotal = filtradas.reduce((soma, c) => soma + c.valorCentavos, 0);

  function irPara(parametros: URLSearchParams) {
    setFolhaAberta(null);
    router.push(`/cobrancas?${parametros.toString()}`);
  }

  function aplicarJanela(janela: JanelaEscolhida) {
    const parametros = new URLSearchParams({ situacao: situacaoAtual });
    if (janela.tipo === "personalizado") {
      parametros.set("periodo", "personalizado");
      parametros.set("de", janela.de);
      parametros.set("ate", janela.ate);
    } else {
      parametros.set("periodo", janela.tipo);
    }
    irPara(parametros);
  }

  function aplicarSituacao(situacao: SituacaoCobranca) {
    const parametros = new URLSearchParams({ situacao });
    // Carrega o período adiante — trocar de situação não é trocar de janela.
    if (janelaAtual) parametros.set("periodo", janelaAtual);
    irPara(parametros);
  }

  // Nada em aberto e nenhum recorte pedido: é a tela vazia de verdade, não
  // "não achei com esse filtro". Só vale para a situação padrão — em
  // "Recebidas" ou "Boleto", zero significa que aquele recorte está vazio.
  const semRecorte =
    situacaoAtual === SITUACAO_PADRAO && !filtroDePeriodoAtivo && clienteFiltro === undefined;

  const telaVazia = cobrancas.length === 0 && semRecorte;

  /**
   * O estado vazio ocupa o lugar da lista, **nunca o da tela inteira** —
   * achado do `/revisar`: uma primeira versão saía antes dos chips, e uma
   * empresa que só usou "Já recebi" (todo título pago, nada em aberto) abria
   * Cobranças sem chip nenhum, com "Recebido no mês" mostrando dinheiro no
   * topo e nenhum caminho até a lista dele. Era exatamente o buraco que a
   * decisão 3 do plano (o chip "Recebidas") existe para fechar.
   */
  const vazio = (
      <EstadoVazio
        titulo="Ninguém te deve nada agora."
        texto={
          // "A faturar", não "ainda não faturados" — decisão do fundador,
          // 26/08/2026: é o rótulo que a lista de Fretes já usa, e a pessoa
          // reconhece na chegada o que o botão prometeu.
          fretesAFaturar > 0
            ? `Você tem ${fretesAFaturar} ${
                fretesAFaturar === 1 ? "frete a faturar" : "fretes a faturar"
              }. Faturar um frete cria a cobrança dele.`
            : "Suas cobranças aparecem aqui quando você faturar um frete."
        }
        acao={
          // "Gerar relatório" (`docs/componentes.md`, "Cobranças vazia") é o
          // item 7 e não existe — `CLAUDE.md` §8 proíbe botão sem destino, e
          // manda dizer o que falta para a ação existir, que é o texto acima.
          // A neutra leva a Fretes já filtrado, sem teto de 50, para a
          // contagem prometida aqui bater com a lista de lá. Variante
          // "texto", não secundária: é o que `docs/componentes.md` registra
          // para esta tela ("Cobranças vazia | ... · texto neutra **Ver os 4
          // fretes**").
          fretesAFaturar > 0 ? (
            <Botao variante="texto" href="/fretes?situacao=a_faturar&periodo=todos">
              Ver os {fretesAFaturar} fretes
            </Botao>
          ) : undefined
        }
      />
  );

  return (
    <div className="flex flex-col gap-14">
      <div className="flex gap-8 overflow-x-auto">
        {/* Sempre "selecionado", mostrando o valor: esta tela nunca fica sem
            situação aplicada (não existe "Todas" entre as quatro), e um chip
            neutro dizendo "Situação" enquanto a lista mostra só as abertas
            mentiria sobre o que está em vigor. `docs/componentes.md`, "Chips
            de seleção › Filtro": o estado selecionado é o que mostra o valor
            escolhido. Achado do `/revisar`. */}
        <ChipFiltro
          rotulo={ROTULO_SITUACAO[situacaoAtual]}
          ativo
          onClick={() => setFolhaAberta("situacao")}
        />
        <ChipFiltro
          rotulo={rotuloPeriodo ?? "Período"}
          ativo={rotuloPeriodo !== null}
          onClick={() => setFolhaAberta("periodo")}
        />
        <ChipFiltro
          rotulo={
            clienteFiltro
              ? (clientesUnicos.find((c) => c.id === clienteFiltro)?.nome ?? "Cliente")
              : "Cliente"
          }
          ativo={clienteFiltro !== undefined}
          onClick={() => setFolhaAberta("cliente")}
        />
      </div>

      {/* Sem total quando a tela está vazia de verdade: "0 cobranças · R$
          0,00" acima de "Ninguém te deve nada agora" repete a mesma coisa em
          números. */}
      {telaVazia ? null : (
        <span className="text-total-contextual font-medium text-tinta-apoio">
          {/* "Mais urgentes", não "mais recentes" — achado do segundo
              `/revisar`: as abertas vêm ordenadas por vencimento crescente
              (`listarCobrancas`), então o teto corta pelas que vencem depois,
              e o texto copiado de "Meus fretes" (onde a ordem é por data, e
              "recentes" é verdade) nomeava um recorte diferente do aplicado.
              Só "Recebidas" desce por data do recebimento. */}
          {limitadoA50 && !clienteFiltro
            ? situacaoAtual === "recebidas"
              ? "50 mais recentes"
              : "50 que vencem antes"
            : `${filtradas.length} ${filtradas.length === 1 ? "cobrança" : "cobranças"}`}{" "}
          · R$ {formatarCentavos(valorTotal)}
        </span>
      )}

      {telaVazia ? (
        vazio
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-start gap-14 px-4 pt-30">
          <span className="text-apoio font-medium text-tinta-apoio-forte">
            Nenhuma cobrança com esse filtro.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-20">
          {grupos.map((grupo) => (
            <div key={grupo.chave} className="flex flex-col gap-8">
              <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
                {grupo.rotulo}
              </span>
              <div className="flex flex-col gap-6">
                {grupo.itens.map((cobranca) => (
                  // Sem `href`: o detalhe da cobrança é a Tarefa 4 (decisão do
                  // fundador, 26/08/2026 — plano do item 6).
                  <LinhaDeLista
                    key={cobranca.id}
                    nome={cobranca.cliente}
                    apoio={cobranca.referencia ?? undefined}
                    valorCentavos={cobranca.valorCentavos}
                    marca={<MarcaDaCobranca cobranca={cobranca} hoje={hoje} />}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {folhaAberta === "periodo" ? (
        <FolhaDePeriodo
          hoje={hoje}
          janelaAtual={janelaAtual}
          rotuloTodos="Todas as cobranças"
          onEscolher={aplicarJanela}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {folhaAberta === "cliente" ? (
        <FolhaDeBusca
          titulo="Cliente"
          placeholder="Buscar cliente"
          itens={clientesUnicos}
          onSelecionar={(id) => {
            setClienteFiltro(id);
            setFolhaAberta(null);
          }}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {folhaAberta === "situacao" ? (
        <FolhaDeOrdenacao
          titulo="Situação"
          criterios={SITUACOES}
          atual={situacaoAtual}
          onEscolher={aplicarSituacao}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}
    </div>
  );
}

function MarcaDaCobranca({
  cobranca,
  hoje,
}: {
  cobranca: CobrancaParaLista;
  hoje: string;
}): ReactNode {
  return (
    <>
      {/* Boleto continua na lista com marca discreta (`docs/especificacao.md`
          §4.5) — o que ele NÃO ganha é "Cobrar no WhatsApp" e presença nas
          pendências da dashboard, os dois em tarefas seguintes. Mesma
          etiqueta das situações de frete: `docs/estilo.md` lista "BOLETO"
          entre elas, "todas iguais". */}
      {cobranca.boleto ? <Etiqueta texto="Boleto" classeTexto="text-tinta-fraca" /> : null}
      <span className={`text-apoio font-medium ${CLASSE_DO_PRAZO[cobranca.grupo]}`}>
        {textoDoPrazo(cobranca, hoje)}
      </span>
    </>
  );
}
