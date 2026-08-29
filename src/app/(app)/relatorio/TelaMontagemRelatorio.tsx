"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CabecalhoDeDetalhe } from "@/components/ui/CabecalhoDeDetalhe";
import { LinhaRecolhida } from "@/components/ui/LinhaRecolhida";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { ChipEscolha } from "@/components/ui/ChipEscolha";
import { Botao } from "@/components/ui/Botao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { FolhaDeBusca, type ItemFolhaDeBusca } from "@/components/ui/FolhaDeBusca";
import { FolhaDePeriodo, type JanelaEscolhida } from "@/components/ui/FolhaDePeriodo";
import { FolhaDeCalendario } from "@/components/ui/FolhaDeCalendario";
import { FolhaDePix } from "@/components/ui/FolhaDePix";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarDiaDaSemanaDataEAno } from "@/lib/utils/data-fortaleza";
import { formatarRota } from "@/lib/utils/rota";
import { rotuloDoPeriodo } from "@/lib/utils/periodo";
import { calcularTotaisDoRelatorio } from "@/lib/utils/totais-relatorio";
import { useMontadoNoCliente } from "@/lib/utils/montado";
import type { ServicoParaRelatorio } from "@/lib/servicos/relatorios";
import { salvarChavePixAction } from "../fretes/acoes";
import { gerarRelatorioAction } from "./acoes";

/**
 * Relatório — montagem (item 7, Tarefa 3, segundo commit —
 * `docs/especificacao.md` §4.4, `docs/componentes.md` linha 458).
 * Fundida com a antiga Tarefa 4 (`docs/planos/item-7-relatorio.md`): monta,
 * gera e navega para o Documento A4, um fluxo só.
 *
 * **Cada linha desmarcável, tudo marcado por padrão** — `incluidos` guarda
 * os ids DENTRO do relatório (não os de fora), mesmo sentido de
 * `docs/especificacao.md` §4.4 ("cada linha desmarcável"). As linhas usam
 * `LinhaDeLista` (`iconePersonalizado`/`desmarcado`) — extensão, não uma
 * segunda implementação do cartão (achado do `/revisar`, `CLAUDE.md` §8).
 *
 * **Somar é diferente de cobrar** (decisão do fundador, `docs/planos/
 * item-7-relatorio.md`): o total do documento soma tudo que está marcado,
 * `em_andamento` incluído; o total cobrável (só quando "Gerar cobrança"
 * está ativo) soma só o `finalizado` marcado. Os dois números aparecem
 * juntos, ao vivo, só quando divergem — sem `em_andamento` marcado, ou sem
 * cobrança ativa, é um total só.
 */

type Props = {
  hoje: string;
  clientes: { id: string; nome: string }[];
  clienteId: string | null;
  clienteNome: string | null;
  janela: string;
  de?: string;
  ate?: string;
  /** ISO — o período que a tela resolveu para buscar `servicos` (`resolverPeriodoDoRelatorio`); vai para `Relatorio.data_inicial`/`data_final` ao gerar. */
  periodo: { inicio: string; fim: string };
  servicos: ServicoParaRelatorio[];
  vencimentoInicial: string;
  chavePixEmpresa: string | null;
};

type FormaPrevista = "boleto" | "outro";

const FORMAS: { valor: FormaPrevista; rotulo: string }[] = [
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "outro", rotulo: "Outro" },
];

/**
 * "Sistema lembrando a última escolha" (`docs/especificacao.md` §4.4) — só
 * a marcação, por aparelho, nunca dado de servidor: é preferência de uso,
 * não regra de negócio. Lida em tempo de render, condicionada a
 * `useMontadoNoCliente()` — nunca num `useState` inicial nem num `useEffect`
 * com `setState` direto (o lint `react-hooks/set-state-in-effect`, achado
 * do `/revisar`, recusa o segundo). Durante o HTML do servidor e a
 * hidratação, `montado` é `false` e a marcação fica `false`/sem preferência
 * — depois, o valor real de `localStorage` entra, sem cascata de
 * re-render a partir de um efeito. Mesmo padrão de `AcaoCobrarNoWhatsApp.tsx`.
 */
const CHAVE_LEMBRAR_COBRANCA = "fretigate:relatorio:gerarCobranca";

function lerPreferenciaDeCobranca(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_LEMBRAR_COBRANCA) === "true";
  } catch {
    // Navegador privado, cota cheia, o que for — sem lembrar não trava a tela.
    return false;
  }
}

function salvarPreferenciaDeCobranca(valor: boolean) {
  try {
    window.localStorage.setItem(CHAVE_LEMBRAR_COBRANCA, String(valor));
  } catch {
    // Idem — falha em salvar não é motivo pra travar a tela.
  }
}

function diaCurto(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" }).format(
    data,
  );
}

/**
 * Mesmo ícone de `confirmar.svg` (`docs/estilo.md`, 19×15px, traço 2.4px) já
 * usado em `DeslizarParaRevelar.tsx` — nunca uma segunda variante desenhada à
 * mão (`CLAUDE.md` §6, "componente existe uma vez"). `stroke="currentColor"`,
 * nunca cor fixa: a cor vem de `text-acao` no `<span>` que envolve (mesma
 * combinação `bg-pilula`/`text-acao` do resto do produto — `ChipFiltro`,
 * `PilulaCabecalho`, `FolhaDeCalendario`) — achado do segundo `/revisar`, a
 * primeira versão tinha `#1B6B3A` fixo e 13×10, os dois fora do documentado.
 */
function IconeCheck() {
  return (
    <svg width={19} height={15} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.516 12.095 9.537 17.116 19.485 6.979"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconeCheckboxFrete({ marcado }: { marcado: boolean }) {
  if (marcado) {
    return (
      <span className="flex h-24 w-24 flex-none items-center justify-center rounded-pilula bg-pilula text-acao">
        <IconeCheck />
      </span>
    );
  }
  // Desmarcado: preenchido, sem borda — "o app não tem borda nenhuma,
  // separa por fundo" (`docs/estilo.md`). Achado do `/revisar`: a primeira
  // versão usava borda tracejada.
  return <span className="h-24 w-24 flex-none rounded-pilula bg-secundario-desabilitado" />;
}

export function TelaMontagemRelatorio({
  hoje,
  clientes,
  clienteId,
  clienteNome,
  janela,
  de,
  ate,
  periodo,
  servicos,
  vencimentoInicial,
  chavePixEmpresa,
}: Props) {
  const router = useRouter();
  const montado = useMontadoNoCliente();
  const [folhaAberta, setFolhaAberta] = useState<"cliente" | "periodo" | "vencimento" | "pix" | null>(
    null,
  );
  const [incluidos, setIncluidos] = useState<Set<string>>(() => new Set(servicos.map((s) => s.id)));
  // `null` = "a pessoa ainda não tocou o toggle nesta renderização" — usa a
  // preferência lembrada. Um valor concreto (depois do primeiro toque)
  // sempre vence, mesmo que divirja do que está salvo (não deveria, já que
  // `alternarGerarCobranca` salva no mesmo instante, mas a prioridade fica
  // explícita mesmo assim).
  const [gerarCobrancaEscolhido, setGerarCobrancaEscolhido] = useState<boolean | null>(null);
  const gerarCobranca = gerarCobrancaEscolhido ?? (montado ? lerPreferenciaDeCobranca() : false);
  const [formaPrevista, setFormaPrevista] = useState<FormaPrevista>("outro");
  const [vencimento, setVencimento] = useState(vencimentoInicial);
  const [chavePix, setChavePix] = useState(chavePixEmpresa);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  function alternarGerarCobranca() {
    const novo = !gerarCobranca;
    salvarPreferenciaDeCobranca(novo);
    setGerarCobrancaEscolhido(novo);
  }

  const itensClientes: ItemFolhaDeBusca[] = clientes.map((c) => ({ id: c.id, nome: c.nome }));

  const marcados = useMemo(() => servicos.filter((s) => incluidos.has(s.id)), [servicos, incluidos]);
  const { totalDocumento, totalCobravel, divergem: totaisDivergem } = useMemo(
    () => calcularTotaisDoRelatorio(servicos, incluidos, gerarCobranca),
    [servicos, incluidos, gerarCobranca],
  );

  function alternar(id: string) {
    setIncluidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function irPara(parametros: URLSearchParams) {
    setFolhaAberta(null);
    router.push(`/relatorio?${parametros.toString()}`);
  }

  function escolherCliente(id: string) {
    const parametros = new URLSearchParams({ cliente: id, periodo: janela });
    if (janela === "personalizado" && de && ate) {
      parametros.set("de", de);
      parametros.set("ate", ate);
    }
    irPara(parametros);
  }

  function escolherPeriodo(escolha: JanelaEscolhida) {
    if (!clienteId) return;
    const parametros = new URLSearchParams({ cliente: clienteId });
    if (escolha.tipo === "personalizado") {
      parametros.set("periodo", "personalizado");
      parametros.set("de", escolha.de);
      parametros.set("ate", escolha.ate);
    } else {
      parametros.set("periodo", escolha.tipo);
    }
    irPara(parametros);
  }

  async function gerar() {
    if (!clienteId || marcados.length === 0) return;
    if (gerarCobranca && chavePix === null) {
      setFolhaAberta("pix");
      return;
    }
    await gerarDeVerdade();
  }

  /**
   * `avisoSemPix` chega só quando quem chamou precisa de um aviso DEPOIS de
   * confirmado o sucesso — "Relatório gerado sem a chave Pix." (a exceção do
   * §12 quando fecha a folha de Pix sem preencher). Nunca mostrado antes de
   * saber se gerou de verdade — achado do `/revisar`: a primeira versão
   * disparava o aviso otimista antes do `await`, e uma falha na geração
   * deixava a tela com o aviso de sucesso E a mensagem de erro ao mesmo
   * tempo.
   *
   * **O aviso viaja pela URL de destino, não por `setState` nesta tela** —
   * achado do segundo `/revisar`: a versão anterior chamava `setAviso(...)`
   * e `router.push(...)` na mesma função, mas a navegação abandona esta
   * tela no mesmo instante — o aviso nunca chegava a aparecer.
   * `TelaDocumentoRelatorio` lê `?semPix=1` na primeira renderização.
   */
  async function gerarDeVerdade(avisoSemPix?: boolean) {
    if (!clienteId) return;
    setSalvando(true);
    setErro(undefined);
    try {
      const resultado = await gerarRelatorioAction({
        clienteId,
        servicoIds: marcados.map((s) => s.id),
        dataInicial: periodo.inicio,
        dataFinal: periodo.fim,
        gerarCobranca,
        vencimento: gerarCobranca ? vencimento : undefined,
        formaPrevista: gerarCobranca ? formaPrevista : undefined,
      });
      if (!resultado.ok) {
        setErro(resultado.erro);
        setSalvando(false);
        return;
      }
      router.push(`/relatorio/${resultado.relatorioId}${avisoSemPix ? "?semPix=1" : ""}`);
    } catch {
      setErro("Não deu para gerar o relatório agora.");
      setSalvando(false);
    }
  }

  const rotuloPeriodo = rotuloDoPeriodo(janela, de, ate) ?? "Período";

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <CabecalhoDeDetalhe href="/mais" rotulo="Relatório" />

      <div className="flex flex-1 flex-col gap-6 px-16">
        <LinhaRecolhida
          rotulo="CLIENTE"
          valor={clienteNome ?? "Escolher cliente"}
          onClick={() => setFolhaAberta("cliente")}
        />

        <div className="mt-10 flex flex-col gap-10">
          <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Período
          </span>
          <div className="flex gap-8">
            {/* Chip sozinho na fileira — 48px, não os 40 do filtro em grupo
                (`CLAUDE.md` §8: "a exceção depende de existir vizinho"). */}
            <ChipFiltro
              rotulo={rotuloPeriodo}
              ativo
              altura={48}
              onClick={() => setFolhaAberta("periodo")}
            />
          </div>
        </div>

        {!clienteId ? (
          <div className="mt-30">
            <EstadoVazio
              titulo="Escolha o cliente para ver os fretes."
              texto="O relatório entra com tudo que rodou no período — você tira o que não quiser antes de gerar."
            />
          </div>
        ) : servicos.length === 0 ? (
          <div className="mt-30">
            <EstadoVazio
              titulo={`Nenhum frete de ${clienteNome} nesse período.`}
              texto="Troque o período ou lance o frete que ficou no WhatsApp."
              acao={
                <Botao variante="texto" href="/fretes/novo">
                  Lançar frete
                </Botao>
              }
            />
          </div>
        ) : (
          <div className="mt-24 flex flex-col gap-6">
            <div className="flex flex-none flex-col gap-8 rounded-linha bg-separacao px-18 py-18">
              <span className="flex items-baseline gap-8 whitespace-nowrap">
                <span className="text-[20px] font-bold leading-[1.4] text-tinta-fraca">R$</span>
                <span
                  className="text-[46px] font-extrabold leading-[1] tabular-nums text-tinta"
                  style={{ fontVariationSettings: "'wdth' 94" }}
                >
                  {formatarCentavos(totalDocumento)}
                </span>
              </span>
              <span className="text-apoio font-medium text-tinta-apoio-forte">
                {marcados.length} {marcados.length === 1 ? "frete" : "fretes"}
                {marcados.length !== servicos.length
                  ? ` · ${servicos.length - marcados.length} ${
                      servicos.length - marcados.length === 1 ? "tirado" : "tirados"
                    }`
                  : ""}
              </span>
              {totaisDivergem ? (
                <span className="text-apoio font-semibold text-a-faturar">
                  R$ {formatarCentavos(totalCobravel)} cobrável — frete em andamento não entra na
                  cobrança
                </span>
              ) : null}
            </div>

            <span className="px-4 pt-20 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
              Fretes do período
            </span>

            {servicos.map((s) => {
              const marcado = incluidos.has(s.id);
              const rota = formatarRota(s.origemTexto, s.destinoTexto);
              return (
                <LinhaDeLista
                  key={s.id}
                  onClick={() => alternar(s.id)}
                  iconePersonalizado={<IconeCheckboxFrete marcado={marcado} />}
                  nome={rota ?? "Sem rota"}
                  valorCentavos={s.valor}
                  desmarcado={!marcado}
                  apoio={`${diaCurto(s.dataServico)} · ${
                    marcado ? (s.cargaTexto ?? "—") : "fora deste relatório"
                  }${marcado && s.statusOperacional === "em_andamento" ? " · Em andamento" : ""}`}
                />
              );
            })}

            <button
              type="button"
              onClick={alternarGerarCobranca}
              className="mt-16 flex items-start gap-14 rounded-linha bg-separacao px-18 py-16 text-left active:bg-principal-desabilitado"
            >
              <span
                className={`flex h-24 w-24 flex-none items-center justify-center rounded-etiqueta ${
                  gerarCobranca ? "bg-pilula text-acao" : "bg-secundario-desabilitado"
                }`}
              >
                {gerarCobranca ? <IconeCheck /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-5">
                <span className="text-nome-recolhida font-bold text-tinta">
                  Gerar cobrança para estes fretes
                </span>
                <span className="text-apoio font-normal leading-[1.35] text-tinta-apoio">
                  Entra em Cobranças com vencimento, e o Pix sai impresso no relatório.
                </span>
              </span>
            </button>

            {gerarCobranca ? (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-6 rounded-linha bg-separacao px-18 py-16">
                  <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
                    Forma prevista
                  </span>
                  <div role="radiogroup" aria-label="Forma de cobrança" className="flex gap-8">
                    {FORMAS.map((forma) => (
                      <ChipEscolha
                        key={forma.valor}
                        selecionado={formaPrevista === forma.valor}
                        onClick={() => setFormaPrevista(forma.valor)}
                      >
                        {forma.rotulo}
                      </ChipEscolha>
                    ))}
                  </div>
                </div>

                <LinhaRecolhida
                  rotulo="VENCIMENTO"
                  valor={formatarDiaDaSemanaDataEAno(vencimento)}
                  onClick={() => setFolhaAberta("vencimento")}
                />
              </div>
            ) : null}
          </div>
        )}

        {erro ? <span className="mt-14 text-apoio font-medium text-vencido">{erro}</span> : null}

        <div className="mt-24 flex-1" />
        <div className="pb-16">
          <Botao
            variante="principal"
            carregando={salvando}
            disabled={!clienteId || marcados.length === 0}
            onClick={gerar}
            distribuido
          >
            Gerar relatório
          </Botao>
        </div>
      </div>

      {folhaAberta === "cliente" ? (
        <FolhaDeBusca
          titulo="Cliente"
          placeholder="Buscar cliente"
          itens={itensClientes}
          onSelecionar={escolherCliente}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {folhaAberta === "periodo" ? (
        <FolhaDePeriodo
          hoje={hoje}
          janelaAtual={janela}
          ultimosTrintaDias
          onEscolher={escolherPeriodo}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {folhaAberta === "vencimento" ? (
        <FolhaDeCalendario
          hoje={hoje}
          escolhida={vencimento}
          titulo="Vencimento"
          onEscolher={(dia) => {
            setVencimento(dia);
            setFolhaAberta(null);
          }}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {folhaAberta === "pix" ? (
        <FolhaDePix
          rotuloBotao="Salvar e gerar relatório"
          onFechar={() => {
            // Exceção do §12: "Agora não" não bloqueia aqui — o relatório
            // segue sem a chave. O aviso só aparece depois de confirmado o
            // sucesso, já na tela de destino (`gerarDeVerdade`, acima).
            setFolhaAberta(null);
            void gerarDeVerdade(true);
          }}
          onSalvar={async (chavePixDigitada) => {
            const resultado = await salvarChavePixAction(chavePixDigitada);
            if (resultado.ok) {
              setChavePix(chavePixDigitada);
              setFolhaAberta(null);
              void gerarDeVerdade();
            }
            return resultado;
          }}
        />
      ) : null}
    </main>
  );
}
