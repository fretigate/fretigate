import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import {
  buscarServicoComTitulos,
  buscarTituloReceber,
  ultimoRecebimentoEm,
} from "@/lib/servicos/titulos";
import { buscarCliente } from "@/lib/servicos/clientes";
import { referenciaDoServico } from "@/lib/servicos/cobrancas";
import { CLASSE_DO_PRAZO, grupoDaCobranca, textoDoPrazo } from "@/lib/servicos/cobrancas-situacao";
import { CabecalhoDeDetalhe } from "@/components/ui/CabecalhoDeDetalhe";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { AcaoMarcarRecebido } from "@/components/ui/AcaoMarcarRecebido";
// Mesma ação de `fretes/acoes.ts` que "Marcar recebido" já usa no detalhe do
// frete — `AcaoMarcarRecebido` recebe por prop (achado do terceiro
// `/revisar`), nunca importa Server Action por conta própria.
import { registrarRecebimentoAction } from "../../fretes/acoes";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarRota } from "@/lib/utils/rota";
import { diaEmFortaleza, formatarDiaDaSemanaDataEAno } from "@/lib/utils/data-fortaleza";
import { formatarDataCurta } from "@/lib/utils/periodo";

/**
 * Detalhe da cobrança (item 6, Tarefa 4) — fecha o link provisório da lista
 * (`ListaCobrancas.tsx`), que até aqui não tinha destino nenhum (decisão do
 * fundador, plano da Tarefa 2: "adiantar meio detalhe quebraria 'uma tarefa
 * por vez'").
 *
 * Ordem já medida por `docs/componentes.md`: resumo (cliente · referência ·
 * valor · marca de prazo) → campos (VENCIMENTO · SITUAÇÃO · FORMA) →
 * **ações** → FRETES INCLUÍDOS. Mockup real em
 * `referencia/.../TelaCobrancas.dc.html` (estados `detalhe`/`parcial`) — a
 * evidência corroborante que faltava até este planejamento.
 *
 * **Sem chave Pix** (Tarefa 5) e **sem edição de "forma prevista"**
 * (consequência única — mostrar/esconder "Cobrar no WhatsApp" — é da
 * Tarefa 6): os dois confirmados como fora de escopo pelo fundador,
 * `docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 4.
 *
 * **`buscarTituloReceber` primeiro, sempre** — é o único identificador que
 * chega de fora (a URL), e é ele que confere a posse contra a empresa
 * (`CLAUDE.md` §3). `buscarServicoComTitulos` vem depois, pelo
 * `servico_id` do título já confirmado — e devolve `situacao_financeira`
 * derivada de TODOS os títulos do frete (nunca só este, `CLAUDE.md` §2) e o
 * `totalRecebido` de cada um, o mesmo dado que `totalRecebidoPorTitulo`
 * daria numa consulta à parte.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const titulo = await buscarTituloReceber(sessao.empresaId, id);
  if (!titulo || titulo.arquivado_em) notFound();

  const servicoComTitulos = await buscarServicoComTitulos(sessao.empresaId, titulo.servico_id);
  if (!servicoComTitulos) notFound();

  const tituloAtual = servicoComTitulos.titulos.find((t) => t.id === id);
  if (!tituloAtual) notFound();

  const cliente = await buscarCliente(sessao.empresaId, titulo.cliente_id);

  const hoje = diaEmFortaleza(new Date());
  const grupo = grupoDaCobranca(tituloAtual, hoje);
  const recebido = tituloAtual.totalRecebido;
  const saldo = tituloAtual.valor - recebido;
  // Só em "Recebidas" e nunca em "Parcial" — mesma regra da lista
  // (`ListaCobrancas.tsx`, achado do plano da Tarefa 2): um título pago não
  // é "parcial", é o caso normal.
  const parcial = grupo !== "recebidas" && recebido > 0;

  const referencia = referenciaDoServico(servicoComTitulos);

  // A data do prazo, para "Recebida" é a do **recebimento**, nunca a do
  // vencimento — achado do `/revisar`: um título faturado com vencimento e
  // depois recebido tem os dois preenchidos, e usar `vencimento` aqui
  // afirmaria que o dinheiro entrou num dia em que não entrou.
  const dataDoRecebimento = grupo === "recebidas" ? await ultimoRecebimentoEm(sessao.empresaId, id) : null;
  const diaDoPrazo =
    grupo === "recebidas"
      ? dataDoRecebimento
        ? diaEmFortaleza(dataDoRecebimento)
        : null
      : tituloAtual.vencimento
        ? diaEmFortaleza(tituloAtual.vencimento)
        : null;

  const vencimentoTexto = tituloAtual.vencimento
    ? formatarDiaDaSemanaDataEAno(diaEmFortaleza(tituloAtual.vencimento)) +
      (grupo === "recebidas" ? " · pago" : "")
    : "Sem vencimento";

  const situacaoTexto =
    grupo === "recebidas"
      ? "Recebida"
      : parcial
        ? `Parcial · recebeu R$ ${formatarCentavos(recebido)}, falta R$ ${formatarCentavos(saldo)}`
        : grupo === "vencidas"
          ? "Vencida"
          : "Em aberto";

  // Ausente para título nascido de "Já recebi" — ninguém pergunta "forma
  // prevista" nesse caminho (`titulos.ts`, `criarTituloJaRecebi`). Campo que
  // não se aplica não é exibido (`CLAUDE.md` §8, "número incompleto não é
  // exibido", mesmo princípio aplicado a um texto).
  const formaTexto =
    tituloAtual.forma_pagamento_prevista === "boleto"
      ? "Boleto — o banco avisa"
      : tituloAtual.forma_pagamento_prevista === "outro"
        ? "Pix, dinheiro ou transferência"
        : null;

  // Mesmo critério do detalhe do frete (`fretes/[id]/page.tsx`,
  // `AcaoMarcarRecebido`): frete arquivado com título ainda aberto não
  // oferece a ação — `registrarRecebimento` já recusa, e um botão sem ação de
  // fundo válida não entra, nem desabilitado (`CLAUDE.md` §8).
  const podeReceber = tituloAtual.status === "aberto" && !servicoComTitulos.arquivado_em;
  const jaRecebido = tituloAtual.status === "pago";

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <CabecalhoDeDetalhe href="/cobrancas" rotulo="Cobrança" />

      <div className="flex flex-col px-20">
        <span
          className="text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          {cliente?.nome ?? "Cliente"}
        </span>
        {referencia ? (
          <span className="mt-4 text-apoio font-normal text-tinta-apoio-forte">{referencia}</span>
        ) : null}

        <span
          className="mt-14 text-heroi-detalhe font-extrabold leading-[1] tracking-[-0.03em] tabular-nums text-tinta"
          style={{ fontVariationSettings: "'wdth' 94" }}
        >
          R$ {formatarCentavos(tituloAtual.valor)}
        </span>
        {/* Só o prazo, sem as tarjas Boleto/Parcial da lista — achado do
            `/revisar` (decisão do fundador): SITUAÇÃO e FORMA, logo abaixo,
            já dizem o mesmo, e repetir custa espaço no trecho que precisa
            caber a ação principal sem rolar. */}
        <span className={`mt-8 text-apoio font-medium ${CLASSE_DO_PRAZO[grupo]}`}>
          {textoDoPrazo({ grupo, dia: diaDoPrazo }, hoje)}
        </span>

        <div className="mt-24 flex flex-col gap-4">
          <LinhaDePerfil rotulo="Vencimento" valor={vencimentoTexto} semAdicionarQuandoVazio />
          <LinhaDePerfil rotulo="Situação" valor={situacaoTexto} semAdicionarQuandoVazio />
          {formaTexto ? (
            <LinhaDePerfil rotulo="Forma" valor={formaTexto} semAdicionarQuandoVazio />
          ) : null}
        </div>

        <div className="mt-26 flex flex-col gap-10">
          <AcaoMarcarRecebido
            variante="principal"
            podeReceber={podeReceber}
            tituloId={podeReceber ? tituloAtual.id : undefined}
            saldoCentavos={saldo}
            jaRecebeuAlgo={recebido > 0}
            jaRecebido={jaRecebido}
            hoje={hoje}
            registrar={registrarRecebimentoAction}
          />
        </div>

        {/* FRETES INCLUÍDOS — sempre 1 linha hoje (o agrupamento por
            relatório é item 7); reaproveita `LinhaDeLista`, mesmo padrão de
            `HistoricoDoPerfil` (data como `nome`, rota como `apoio`). Sem
            pílula "ver todos": não há o que ver além desta única linha. */}
        <div className="mt-26 flex flex-col gap-6">
          <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Fretes incluídos
          </span>
          <LinhaDeLista
            href={`/fretes/${servicoComTitulos.id}`}
            nome={formatarDataCurta(diaEmFortaleza(servicoComTitulos.data_servico))}
            apoio={formatarRota(servicoComTitulos.origem_texto, servicoComTitulos.destino_texto) ?? undefined}
            valorCentavos={servicoComTitulos.valor}
            situacao={servicoComTitulos.situacao_financeira}
          />
        </div>
      </div>
    </main>
  );
}
