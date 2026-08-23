"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { rotuloSituacao } from "@/components/ui/EtiquetaSituacao";
import { FolhaDeBusca, type ItemFolhaDeBusca } from "@/components/ui/FolhaDeBusca";
import { FolhaDePeriodo, type JanelaEscolhida } from "@/components/ui/FolhaDePeriodo";
import { FolhaDeSituacao } from "@/components/ui/FolhaDeSituacao";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { deslocarDias } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { normalizarParaBusca } from "@/lib/utils/texto";
import type { SituacaoFinanceira } from "@/lib/servicos/titulos";

/**
 * "Meus fretes" (item 4, Tarefa 2) — `docs/componentes.md` linha 360 e o
 * protótipo de referência (`referencia/.../Tela 2 e 3...`, evidência
 * corroborante). Busca e os chips Cliente/Situação filtram o que já está
 * carregado; só o chip Período dispara uma consulta nova ao servidor
 * (decisão do fundador, plano do item 4, Tarefa 2) — por isso ele navega
 * (`router.push`) em vez de mexer em estado local.
 */

export type FreteParaLista = {
  id: string;
  clienteId: string;
  cliente: string;
  rota: string | null;
  valorCentavos: number;
  situacao: SituacaoFinanceira;
  /** `status_operacional === "cancelado"` — nunca entra na soma/contagem do total (`docs/especificacao.md` §7). */
  cancelado: boolean;
  /** "AAAA-MM-DD" em Fortaleza — para agrupar por dia. */
  dia: string;
  /** Já normalizado (`normalizarParaBusca`) — cliente + rota + placa + apelido + motorista. */
  textoBusca: string;
};

type Props = {
  fretes: FreteParaLista[];
  hoje: string;
  janelaAtual: string | undefined;
  /**
   * `true` quando o servidor resolveu um `Periodo` de verdade (janela pronta
   * válida ou intervalo personalizado completo) — `false` para "todos",
   * nenhuma janela, ou qualquer valor de URL não reconhecido. Achado do
   * `/revisar` (Tarefa 2): decidir o estado vazio pela string `janelaAtual`
   * deixava `?periodo=todos` (ou um valor inválido digitado à mão) mostrar
   * "Nenhum frete com esse filtro" mesmo numa empresa sem frete nenhum — o
   * `Periodo` resolvido é o sinal de verdade, não a string da URL.
   */
  filtroDePeriodoAtivo: boolean;
  /**
   * `true` quando `fretes` foi cortado no teto padrão de 50 (visão sem
   * período escolhido) — achado do segundo `/revisar`: sem isso, o total
   * contextual soma só os 50 mais recentes e mostra como se fosse o total
   * de verdade (`CLAUDE.md` §8, "número incompleto não é exibido... com
   * dado parcial, exibir a cobertura").
   */
  limitadoA50: boolean;
  rotuloPeriodo: string | null;
  /**
   * Semeia o chip Cliente já aberto — o número "já rodado" tocável do
   * perfil do cliente (Tarefa 6) chega aqui com `?cliente=<id>`. Não é
   * filtro novo, só o estado inicial do que já existe.
   */
  clienteInicial?: string;
  /**
   * Reforço do rótulo do chip para `clienteInicial` — o servidor resolve
   * (`fretes/page.tsx`, `buscarClientesPorIds`), nunca a URL. Achado do
   * primeiro `/revisar`: `clientesUnicos` só existe a partir dos fretes já
   * carregados aqui, e um cliente sem nenhum frete no período (ex.: "já
   * rodado" mostrando R$ 0,00 de propósito) nunca aparece nela. Sem isso, o
   * chip ficava com a cor de "selecionado" mostrando o rótulo genérico
   * "Cliente", em vez do nome — parecia filtro quebrado, não filtro
   * aplicado a um cliente sem resultado.
   */
  nomeClienteInicial?: string;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function rotuloDoGrupo(dia: string, hoje: string): string {
  if (dia === hoje) return "Hoje";
  if (dia === deslocarDias(hoje, -1)) return "Ontem";
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  const anoHoje = Number(hoje.slice(0, 4));
  const sufixoAno = ano !== anoHoje ? ` de ${ano}` : "";
  return `${diaDoMes} de ${MESES[mes - 1]}${sufixoAno}`;
}

export function ListaFretes({
  fretes,
  hoje,
  janelaAtual,
  filtroDePeriodoAtivo,
  limitadoA50,
  rotuloPeriodo,
  clienteInicial,
  nomeClienteInicial,
}: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState<string | undefined>(clienteInicial);
  const [situacaoFiltro, setSituacaoFiltro] = useState<SituacaoFinanceira | undefined>();
  const [folhaAberta, setFolhaAberta] = useState<"periodo" | "cliente" | "situacao" | null>(null);

  const clientesUnicos = useMemo<ItemFolhaDeBusca[]>(() => {
    const mapa = new Map<string, string>();
    for (const f of fretes) if (!mapa.has(f.clienteId)) mapa.set(f.clienteId, f.cliente);
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }, [fretes]);

  const termo = normalizarParaBusca(busca);
  const filtrados = useMemo(
    () =>
      fretes.filter((f) => {
        if (clienteFiltro && f.clienteId !== clienteFiltro) return false;
        if (situacaoFiltro && f.situacao !== situacaoFiltro) return false;
        if (termo && !f.textoBusca.includes(termo)) return false;
        return true;
      }),
    [fretes, clienteFiltro, situacaoFiltro, termo],
  );

  // Já vem ordenado (data_servico desc) do servidor — só agrupa em sequência,
  // nunca reordena.
  const grupos = useMemo(() => {
    const resultado: { dia: string; itens: FreteParaLista[] }[] = [];
    for (const frete of filtrados) {
      const ultimo = resultado[resultado.length - 1];
      if (ultimo && ultimo.dia === frete.dia) ultimo.itens.push(frete);
      else resultado.push({ dia: frete.dia, itens: [frete] });
    }
    return resultado;
  }, [filtrados]);

  // Frete cancelado não conta na soma nem na contagem do total (achado do
  // segundo /revisar): `docs/especificacao.md` §7, "frete cancelado não
  // conta nas somas derivadas dele" — mesma regra já aplicada a
  // `resumoFinanceiroDoCliente`/`resumoDoCaminhao`/`resumoDoMotorista`
  // (Tarefa 1), agora estendida a este total, que é soma do mesmo jeito. A
  // linha do frete cancelado continua na lista (nada é apagado, §7).
  const paraSomar = filtrados.filter((f) => !f.cancelado);
  const valorTotal = paraSomar.reduce((soma, f) => soma + f.valorCentavos, 0);

  function aplicarJanela(janela: JanelaEscolhida) {
    const parametros = new URLSearchParams();
    if (janela.tipo === "personalizado") {
      parametros.set("periodo", "personalizado");
      parametros.set("de", janela.de);
      parametros.set("ate", janela.ate);
    } else {
      parametros.set("periodo", janela.tipo);
    }
    // Carrega o filtro de cliente adiante — achado do segundo `/revisar` da
    // Tarefa 6: sem isso, `clienteFiltro` sobrevive como estado local (o
    // componente não remonta), mas a URL perde `cliente`, e o servidor não
    // tem mais como resolver o nome se este cliente não tiver frete no novo
    // período — o chip volta ao rótulo genérico "Cliente" mesmo com o
    // filtro de verdade ainda aplicado.
    if (clienteFiltro) parametros.set("cliente", clienteFiltro);
    setFolhaAberta(null);
    router.push(`/fretes?${parametros.toString()}`);
  }

  // Achado na verificação no navegador: `fretes` já vem filtrado pelo
  // período no servidor — se um período ativo devolver zero, isso não
  // significa "a empresa nunca lançou frete nenhum". Só mostra o convite de
  // primeiro frete quando NENHUM período de verdade está em vigor (achado do
  // /revisar: usa `filtroDePeriodoAtivo`, não a string `janelaAtual` — "todos"
  // e valor de URL desconhecido também não têm período de verdade) e mesmo
  // assim vier vazio; com período ativo, zero vira "Nenhum frete com esse
  // filtro", mais abaixo — o mesmo texto que a busca/cliente/situação já usam.
  if (fretes.length === 0 && !filtroDePeriodoAtivo) {
    return (
      <EstadoVazio
        titulo="Nenhum frete lançado ainda"
        texto="Seus fretes aparecem aqui assim que você lançar o primeiro."
        acao={
          // Rótulo exato registrado em `docs/especificacao.md` §9 ("O que o
          // corte da importação deixa em tela": "o convite passa a ser
          // lançar o primeiro frete") — achado do segundo /revisar: eu tinha
          // parafraseado para "Lançar frete", perdendo a citação exata, e
          // divergindo do padrão já usado em "Despesas — vazia" (`docs/
          // componentes.md`, "Lançar a primeira despesa").
          <Botao variante="principal" href="/fretes/novo">
            Lançar o primeiro frete
          </Botao>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-14">
      {/* Placeholder curto — achado do /auditar-tela: docs/estilo.md, Tipografia,
          "Campo de busca (cromo)" nomeia "Buscar frete" como o exemplo desta
          própria tela; a busca continua varrendo cliente, rota, placa e
          motorista, só o texto do campo fica curto. */}
      <CampoBusca
        placeholder="Buscar frete"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
      />

      <div className="flex gap-8 overflow-x-auto">
        <ChipFiltro
          rotulo={rotuloPeriodo ?? "Período"}
          ativo={rotuloPeriodo !== null}
          onClick={() => setFolhaAberta("periodo")}
        />
        <ChipFiltro
          rotulo={
            clienteFiltro
              ? (clientesUnicos.find((c) => c.id === clienteFiltro)?.nome ??
                (clienteFiltro === clienteInicial ? nomeClienteInicial : undefined) ??
                "Cliente")
              : "Cliente"
          }
          ativo={clienteFiltro !== undefined}
          onClick={() => setFolhaAberta("cliente")}
        />
        <ChipFiltro
          rotulo={situacaoFiltro ? rotuloSituacao(situacaoFiltro) : "Situação"}
          ativo={situacaoFiltro !== undefined}
          onClick={() => setFolhaAberta("situacao")}
        />
      </div>

      <span className="text-total-contextual font-medium text-tinta-apoio">
        {/* Sem filtro nenhum tocado e cortado nos 50 mais recentes — nomeia o
            corte em vez de deixar "N fretes" parecer o total de verdade
            (achado do segundo /revisar). Some assim que qualquer filtro
            (busca, cliente, situação) muda o que está contado. */}
        {limitadoA50 && !termo && !clienteFiltro && !situacaoFiltro
          ? "50 mais recentes"
          : `${paraSomar.length} ${paraSomar.length === 1 ? "frete" : "fretes"}`}{" "}
        · R$ {formatarCentavos(valorTotal)}
      </span>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-start gap-14 px-4 pt-30">
          <span className="text-apoio font-medium text-tinta-apoio-forte">
            Nenhum frete com esse filtro.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-20">
          {grupos.map((grupo) => (
            <div key={grupo.dia} className="flex flex-col gap-8">
              <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
                {rotuloDoGrupo(grupo.dia, hoje)}
              </span>
              <div className="flex flex-col gap-6">
                {grupo.itens.map((frete) => (
                  // Leva ao detalhe do frete (item 4, Tarefa 3).
                  <LinhaDeLista
                    key={frete.id}
                    href={`/fretes/${frete.id}`}
                    nome={frete.cliente}
                    apoio={frete.rota ?? undefined}
                    valorCentavos={frete.valorCentavos}
                    situacao={frete.situacao}
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
        <FolhaDeSituacao
          situacaoAtual={situacaoFiltro}
          onEscolher={(situacao) => {
            setSituacaoFiltro(situacao);
            setFolhaAberta(null);
          }}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}
    </div>
  );
}
