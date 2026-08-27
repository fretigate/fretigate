"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { FolhaDeBusca, type ItemFolhaDeBusca } from "@/components/ui/FolhaDeBusca";
import { FolhaDeOrdenacao } from "@/components/ui/FolhaDeOrdenacao";
import { FolhaDePeriodo, type JanelaEscolhida } from "@/components/ui/FolhaDePeriodo";
import { FolhaDeRecebimento } from "@/components/ui/FolhaDeRecebimento";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { AcaoCobrarNoWhatsApp } from "@/components/ui/AcaoCobrarNoWhatsApp";
import { Etiqueta } from "@/components/ui/EtiquetaSituacao";
import { Botao } from "@/components/ui/Botao";
import { formatarCentavos } from "@/lib/utils/dinheiro";
// As ações moram em `fretes/acoes.ts`, ao lado de `faturarServicoAction` e
// `criarTituloJaRecebiAction` — as outras ações de título e cobrança, mesmo
// motivo de não terem nascido cada uma no seu próprio domínio de tela.
import {
  registrarCobrancaEnviadaAction,
  registrarRecebimentoAction,
  salvarChavePixAction,
} from "../fretes/acoes";
import { salvarTelefoneClienteAction } from "../clientes/acoes";
// De `cobrancas-situacao`, nunca de `cobrancas`: este é Client Component, e
// o outro módulo importa `@/lib/db` (`server-only`) — o `npm run build`
// reprova a cadeia inteira, como reprovou ao escrever esta tarefa.
import {
  CLASSE_DO_PRAZO,
  ROTULO_SITUACAO,
  SITUACAO_PADRAO,
  SITUACOES as VALORES_DE_SITUACAO,
  textoDoPrazo,
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
  /**
   * Já entrou parte, e ainda falta (item 6, Tarefa 3) — nunca `true` junto
   * com o grupo "recebidas", que é o caso cheio, não parcial.
   */
  parcial: boolean;
  /**
   * As peças de "Cobrar no WhatsApp" (item 6, Tarefa 5) — só usadas fora de
   * "recebidas"/boleto (`ListaCobrancas` decide se a pílula aparece; estes
   * campos vêm preenchidos sempre que fazem sentido, `null`/vazio quando não
   * se aplicam). `clienteTelefone` é o de `Cliente.telefone`, espelho do
   * cadastro — mesmo cuidado de `docs/componentes.md` § "Fonte única do
   * dado".
   */
  clienteTelefone: string | null;
  /** `formatarRota` puro, sem o dia — o que `montarMensagemCobranca` espera em `rota`, diferente de `referencia` (rota + dia, para exibição). */
  rota: string | null;
  /** "sexta, 5 de setembro" — `null` só quando não há vencimento (título "a vencer" sem data, hoje inalcançável para título aberto). */
  vencimentoFormatado: string | null;
  /** "cobrado há 2 dias por Monalisa" (§4.5) — `null` quando ninguém cobrou ainda. */
  marcaCobrado: string | null;
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
  /** Nome fantasia — primeira linha do molde de `montarMensagemCobranca` (item 6, Tarefa 5). */
  empresaNome: string;
  /** `Empresa.chave_pix` — `null` abre `FolhaDePix` ao cobrar (decisão 2, sem bloquear o envio). */
  chavePixEmpresa: string | null;
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
  empresaNome,
  chavePixEmpresa,
}: Props) {
  const router = useRouter();
  const [clienteFiltro, setClienteFiltro] = useState<string | undefined>();
  const [folhaAberta, setFolhaAberta] = useState<"periodo" | "cliente" | "situacao" | null>(null);
  // Deslizar → folha de recebimento (item 6, Tarefa 3, decisão do
  // fundador, 26/08/2026: as duas listas que revelam "Marcar recebido"
  // abrem a mesma folha, nunca marcam na hora — `DeslizarParaRevelar.tsx`).
  const [recebendo, setRecebendo] = useState<{ tituloId: string; saldoCentavos: number } | null>(
    null,
  );
  const [aviso, setAviso] = useState<string | null>(null);

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
                  <LinhaDeLista
                    key={cobranca.id}
                    href={`/cobrancas/${cobranca.id}`}
                    nome={cobranca.cliente}
                    apoio={cobranca.referencia ?? undefined}
                    valorCentavos={cobranca.valorCentavos}
                    marca={<MarcaDaCobranca cobranca={cobranca} hoje={hoje} />}
                    aoDeslizar={
                      // "Recebidas" já está pago — nada para receber, então
                      // sem painel (a função recusaria mesmo, mas o painel
                      // nem deveria aparecer para essa ação).
                      cobranca.grupo === "recebidas"
                        ? undefined
                        : {
                            rotulo: "Marcar recebido",
                            onRevelar: () =>
                              setRecebendo({
                                tituloId: cobranca.id,
                                saldoCentavos: cobranca.valorCentavos,
                              }),
                          }
                    }
                    rodape={
                      // Boleto e Recebidas não cobram por WhatsApp (§8 item
                      // 11 · "Recebidas" já está pago) — sem pílula e sem
                      // marca de cobrado, mesmo critério do protótipo
                      // (`referencia/.../TelaCobrancas.dc.html`).
                      cobranca.boleto || cobranca.grupo === "recebidas" ? undefined : (
                        <div className="flex items-center gap-12">
                          <AcaoCobrarNoWhatsApp
                            variante="pilula"
                            tituloId={cobranca.id}
                            cliente={{
                              id: cobranca.clienteId,
                              nome: cobranca.cliente,
                              telefone: cobranca.clienteTelefone,
                            }}
                            dadosMensagem={{
                              empresa: empresaNome,
                              cliente: cobranca.cliente,
                              rota: cobranca.rota,
                              valor: formatarCentavos(cobranca.valorCentavos),
                              vencimento: cobranca.vencimentoFormatado ?? "",
                              vencido: cobranca.grupo === "vencidas",
                            }}
                            chavePixEmpresa={chavePixEmpresa}
                            registrar={registrarCobrancaEnviadaAction}
                            salvarTelefoneCliente={salvarTelefoneClienteAction}
                            salvarChavePix={salvarChavePixAction}
                          />
                          {cobranca.marcaCobrado ? (
                            <span className="text-apoio font-medium text-tinta-apoio">
                              {cobranca.marcaCobrado}
                            </span>
                          ) : null}
                        </div>
                      )
                    }
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

      {recebendo ? (
        <FolhaDeRecebimento
          hoje={hoje}
          saldoCentavos={recebendo.saldoCentavos}
          onFechar={() => setRecebendo(null)}
          onConfirmar={async ({ valorCentavos, data, forma }) => {
            try {
              const resultado = await registrarRecebimentoAction({
                tituloId: recebendo.tituloId,
                valorCentavos,
                data,
                forma,
              });
              if (!resultado.ok) return resultado;
              setRecebendo(null);
              setAviso(
                valorCentavos < recebendo.saldoCentavos
                  ? "Recebimento parcial registrado"
                  : "Recebimento registrado",
              );
              router.refresh();
              return { ok: true as const };
            } catch {
              return { ok: false as const, erro: "Não deu para salvar agora." };
            }
          }}
        />
      ) : null}

      {aviso ? <AvisoDoSistema mensagem={aviso} onSumir={() => setAviso(null)} /> : null}
    </div>
  );
}

/**
 * A marca de uma cobrança na lista — tarjas Boleto/Parcial + o prazo em
 * palavras, colorido. Único consumidor hoje (achado do segundo `/revisar` na
 * Tarefa 4: nasceu componente à parte para o detalhe reaproveitar também,
 * mas o resumo do detalhe mostra só o prazo, sem as tarjas — `CLAUDE.md` §6,
 * "sem camada sem dois casos de uso reais"). `textoDoPrazo`/`CLASSE_DO_PRAZO`
 * continuam exportados de `cobrancas-situacao.ts`, onde o detalhe
 * (`cobrancas/[id]/page.tsx`) importa só o texto, sem a composição inteira.
 */
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
      {/* Já entrou parte, ainda falta (item 6, Tarefa 3) — mesma etiqueta
          "Parcial" de `EtiquetaSituacao` (fundo próprio `--color-parcial-fundo`,
          `docs/estilo.md`). Pedido de confirmação de posição ao Design,
          ainda em aberto (não respondido na Tarefa 3 nem revisitado nesta
          tarefa — achado do quarto `/revisar` na Tarefa 4: uma reescrita
          anterior deste comentário tinha deixado a pergunta cair). */}
      {cobranca.parcial ? (
        <Etiqueta texto="Parcial" classeTexto="text-parcial-apoio" classeFundo="bg-parcial-fundo" />
      ) : null}
      <span className={`text-apoio font-medium ${CLASSE_DO_PRAZO[cobranca.grupo]}`}>
        {textoDoPrazo(cobranca, hoje)}
      </span>
    </>
  );
}
