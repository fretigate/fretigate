import type { ReactNode } from "react";
import { Fragment } from "react";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import {
  contarCobrancasVencidasAgrupadas,
  contarFretesEmAndamento,
  faturamentoPorMes,
  resumoDeLucroDoMes,
  resumoDeRodagemDoMes,
  resumoDoMes,
  sugerirRelatorio,
  type FaturamentoDoMes,
} from "@/lib/servicos/dashboard";
import { contarFretesAFaturar, resumoDeCobrancas } from "@/lib/servicos/cobrancas";
import { buscarCliente } from "@/lib/servicos/clientes";
import { medir } from "@/lib/utils/medir-tempo";
import { deslocarDias, deslocarMes, diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarMesAbreviado } from "@/lib/utils/periodo";
import { iniciais } from "@/lib/utils/iniciais";
import { PilulaSobreEscuro } from "@/components/ui/PilulaSobreEscuro";
import { CartaoConviteDeInstalacao } from "@/components/ui/CartaoConviteDeInstalacao";
import { BotaoReenviarEmail } from "./BotaoReenviarEmail";

/**
 * Dashboard (item 8, Tarefa 2) — substitui o pouso provisório que existia
 * aqui desde o item 1. `docs/especificacao.md` §4.6 para o conteúdo,
 * `docs/planos/item-8-dashboard.md` para as decisões do fundador de
 * 29/08/2026 (Rodagem com dado real, marca não-tocável até o item 10,
 * "Fretes em andamento" sem filtro operacional, sugestão de relatório a
 * partir de 3 fretes).
 *
 * **"Importar fretes" não nasce** — corte já registrado
 * (`docs/especificacao.md`, "O que o corte da importação deixa em tela"):
 * o cartão escuro fica com um atalho só, "Gerar relatório".
 * `docs/componentes.md` linha 457 ainda lista as duas pílulas — o mesmo
 * corte já foi aplicado em Mais sem essa linha ser corrigida; fica
 * registrado para pedir ao Design.
 *
 * **A pastilha Lucro mostra número real desde o item 11**
 * (`docs/planos/item-11-despesas.md`) — `resumoDeLucroDoMes` (faturamento
 * menos despesas do mês). Convite só quando **nenhuma despesa foi lançada
 * no mês**, nunca quando a conta "faturamento − 0" daria um número —
 * mesma armadilha do R$/km sem km (`CLAUDE.md` §8, regra 10; decisão do
 * fundador, 01/09/2026).
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const hoje = diaEmFortaleza(new Date());

  // Diagnóstico temporário — investigação de `dashboard.total` nunca
  // aparecer nos logs de produção (`docs/planos/
  // investiga-dashboard-total-nao-fecha.md`). Marca todas as linhas
  // `[medir]` deste carregamento com o mesmo id, para dar para agrupar
  // depois; o log logo após o `Promise.all` localiza se a falta é antes ou
  // depois dele resolver.
  const idPedido = randomUUID().slice(0, 8);

  const [empresa, usuario, resumoMes, lucro, rodagem, cobrancas, fretesAFaturar, emAndamento, vencidasAgrupadas, sugestao, meses] =
    await medir(
      "dashboard.total",
      () =>
        Promise.all([
          medir(
            "dashboard.empresa",
            () =>
              db(sessao.empresaId).empresa.findUnique({
                where: { id: sessao.empresaId },
                select: { nome_fantasia: true },
              }),
            idPedido,
          ),
          medir(
            "dashboard.usuario",
            () =>
              db(sessao.empresaId).usuario.findUnique({
                where: { id: sessao.usuarioId },
                select: { email_verificado: true },
              }),
            idPedido,
          ),
          resumoDoMes(sessao.empresaId, hoje, idPedido),
          resumoDeLucroDoMes(sessao.empresaId, hoje, idPedido),
          resumoDeRodagemDoMes(sessao.empresaId, hoje, idPedido),
          resumoDeCobrancas(sessao.empresaId, hoje, idPedido),
          contarFretesAFaturar(sessao.empresaId, idPedido),
          contarFretesEmAndamento(sessao.empresaId, idPedido),
          contarCobrancasVencidasAgrupadas(sessao.empresaId, hoje, idPedido),
          sugerirRelatorio(sessao.empresaId, hoje, idPedido),
          faturamentoPorMes(sessao.empresaId, hoje, 6, idPedido),
        ]),
      idPedido,
    );
  console.log(`[dashboard] promise.all resolvido id=${idPedido}`);

  // Uma consulta a mais só quando existe sugestão — mesmo padrão de
  // `contarFretesAFaturar` em `cobrancas/page.tsx` (custo só quando o
  // resultado precisa dele).
  const clienteSugerido = sugestao
    ? await medir(
        "dashboard.clienteSugerido",
        () => buscarCliente(sessao.empresaId, sugestao.clienteId),
        idPedido,
      )
    : null;

  const nomeEmpresa = empresa?.nome_fantasia ?? "";

  const pendencias: { chave: string; conteudo: ReactNode }[] = [];

  if (emAndamento.total > 0) {
    pendencias.push({
      chave: "andamento",
      conteudo: (
        <LinhaDePendencia
          href="/fretes"
          titulo={`${emAndamento.total} ${emAndamento.total === 1 ? "frete" : "fretes"} em andamento`}
          apoio={emAndamento.semOrdemEnviada > 0 ? `${emAndamento.semOrdemEnviada} sem ordem enviada` : undefined}
        />
      ),
    });
  }
  if (fretesAFaturar > 0) {
    pendencias.push({
      chave: "a-faturar",
      conteudo: (
        // `periodo=todos` — achado do `/revisar`: `contarFretesAFaturar` não
        // tem recorte de data, mas a lista sem `periodo` cai no teto de 50
        // mais recentes (`resolverLimiteDaLista`) — sem isso, a pendência
        // podia anunciar mais fretes do que a tela que ela mesmo abre mostra.
        <LinhaDePendencia
          href="/fretes?situacao=a_faturar&periodo=todos"
          titulo={`${fretesAFaturar} ${fretesAFaturar === 1 ? "frete pronto" : "fretes prontos"} para faturar`}
        />
      ),
    });
  }
  if (vencidasAgrupadas > 0) {
    pendencias.push({
      chave: "vencidas",
      conteudo: (
        <LinhaDePendencia
          href="/cobrancas"
          titulo={`${vencidasAgrupadas} ${vencidasAgrupadas === 1 ? "cobrança vencida" : "cobranças vencidas"}`}
        />
      ),
    });
  }
  if (sugestao && clienteSugerido) {
    pendencias.push({
      chave: "sugestao",
      conteudo: (
        <LinhaDePendencia
          href={`/relatorio?cliente=${sugestao.clienteId}`}
          titulo={`${clienteSugerido.nome} tem ${sugestao.quantidade} fretes sem cobrança`}
          apoio="Toque para gerar o relatório dele."
        />
      ),
    });
  }
  if (!usuario?.email_verificado) {
    pendencias.push({ chave: "email", conteudo: <LinhaDeEmailNaoConfirmado email={sessao.email} /> });
  }

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-16"
      style={{
        paddingTop: "var(--area-segura-topo)",
        paddingBottom: "var(--folga-rolagem)",
      }}
    >
      <CartaoEscuro nomeEmpresa={nomeEmpresa} resumo={resumoMes} ehDono={sessao.papel === "dono"} />

      <div className="grid grid-cols-2 gap-8">
        <Pastilha href="/cobrancas" rotulo="A receber" valor={`R$ ${formatarCentavos(cobrancas.aReceber)}`} />
        <Pastilha
          href="/cobrancas?situacao=vencidas"
          rotulo="Vencido"
          valor={`R$ ${formatarCentavos(cobrancas.vencido)}`}
          vencida
        />
        {lucro.lucroCentavos === null ? (
          <Pastilha
            href="/despesas"
            rotulo="Lucro no mês"
            convite="O lucro aparece quando houver despesa lançada."
          />
        ) : (
          <Pastilha
            href="/despesas"
            rotulo="Lucro no mês"
            valor={`R$ ${formatarCentavos(lucro.lucroCentavos)}`}
            apoio={`R$ ${formatarCentavos(lucro.faturamentoCentavos)} de faturamento − R$ ${formatarCentavos(lucro.despesasCentavos)} de despesas`}
          />
        )}
        {rodagem.kmMesMetros === null ? (
          <Pastilha rotulo="Rodagem no mês" convite="Preencha o km ao lançar para ver o R$/km." />
        ) : (
          <Pastilha
            rotulo="Rodagem no mês"
            valor={`${(rodagem.kmMesMetros / 1000).toLocaleString("pt-BR")} km`}
            apoio={`R$ ${rodagem.rsPorKm!.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/km`}
            nota={
              rodagem.fretesComKm < rodagem.fretesNoMes
                ? `${rodagem.fretesComKm} de ${rodagem.fretesNoMes} fretes com km`
                : undefined
            }
          />
        )}
      </div>

      {pendencias.length > 0 ? (
        <div className="flex flex-col gap-14">
          <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Precisa de você
          </span>
          <div className="flex flex-col gap-8">
            {pendencias.map((p) => (
              <Fragment key={p.chave}>{p.conteudo}</Fragment>
            ))}
          </div>
        </div>
      ) : null}

      <BarrasDoGrafico meses={meses} />

      <CartaoConviteDeInstalacao />
    </main>
  );
}

/**
 * O cartão de faturamento no topo — única superfície escura fora do aviso
 * do sistema e da barra (`docs/estilo.md`, "Superfícies: as três
 * categorias"). Marca da empresa agora É tocável para o dono, levando a
 * `/conta` — item 10, Tarefa 2 fecha a pendência que o item 8 deixou
 * registrada (a tela de Conta não existia ainda quando a dashboard nasceu).
 *
 * **Continua não-tocável para o operador** (`ehDono` decide) — `/conta` é
 * `comoDono`/`exigirDono()` (decisão 1 do plano: identidade e regra
 * financeira da empresa), então um operador tocando o mesmo cartão cairia
 * num 404 (`CLAUDE.md` §8, nunca botão sem destino alcançável por quem o
 * vê).
 */
function CartaoEscuro({
  nomeEmpresa,
  resumo,
  ehDono,
}: {
  nomeEmpresa: string;
  resumo: {
    faturamentoCentavos: number;
    qtdFretes: number;
    mediaPorFrete: number | null;
    variacaoPercentual: number | null;
  };
  ehDono: boolean;
}) {
  const pecas: ReactNode[] = [];
  if (resumo.variacaoPercentual !== null) {
    const negativa = resumo.variacaoPercentual < 0;
    pecas.push(
      <span
        key="variacao"
        className="inline-flex items-center gap-4 text-[14px] font-bold leading-[1] text-verde-claro"
      >
        <svg
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={negativa ? "rotate-180" : ""}
          aria-hidden="true"
        >
          <path d="M12 18.231V6.323M6.6 11.585 12 6.185l5.4 5.4" />
        </svg>
        {Math.round(Math.abs(resumo.variacaoPercentual))}%
      </span>,
    );
  }
  pecas.push(
    <span key="qtd" className="text-[13px] font-medium text-white/70">
      {resumo.qtdFretes} {resumo.qtdFretes === 1 ? "frete" : "fretes"}
    </span>,
  );
  if (resumo.mediaPorFrete !== null) {
    pecas.push(
      <span key="media" className="text-[13px] font-medium text-white/70">
        média R${" "}
        {resumo.mediaPorFrete.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>,
    );
  }

  return (
    <div className="flex flex-col gap-18 rounded-cartao-escuro bg-tinta px-20 pb-24 pt-18">
      {ehDono ? (
        // `-my-9 py-9`: alvo de toque 48px (30px do círculo + 9+9 de
        // padding — CLAUDE.md §8) sem empurrar o resto do cartão pra baixo —
        // a margem negativa cancela o padding na visual, só a área tocável
        // cresce. Achado do `/revisar`: a primeira versão tinha ~30px de
        // alvo.
        <Link href="/conta" className="-my-9 flex items-center gap-10 self-start py-9">
          <div className="flex h-30 w-30 flex-none items-center justify-center rounded-pilula bg-acao text-[12px] font-bold tracking-[.02em] text-white">
            {iniciais(nomeEmpresa)}
          </div>
          <span className="text-nome-empresa font-bold text-white/82">{nomeEmpresa}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-10">
          <div className="flex h-30 w-30 flex-none items-center justify-center rounded-pilula bg-acao text-[12px] font-bold tracking-[.02em] text-white">
            {iniciais(nomeEmpresa)}
          </div>
          <span className="text-nome-empresa font-bold text-white/82">{nomeEmpresa}</span>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-white/45">
          Faturamento do mês
        </span>
        <span
          className="text-heroi font-extrabold leading-[1] tracking-[-0.035em] text-white [font-variant-numeric:tabular-nums]"
          style={{ fontVariationSettings: "'wdth' 92" }}
        >
          R$ {formatarCentavos(resumo.faturamentoCentavos)}
        </span>
        <div className="flex flex-wrap items-center gap-6">
          {pecas.map((peca, i) => (
            <Fragment key={i}>
              {i > 0 ? <span className="text-[13px] text-white/45">·</span> : null}
              {peca}
            </Fragment>
          ))}
        </div>
      </div>

      <PilulaSobreEscuro href="/relatorio">Gerar relatório</PilulaSobreEscuro>
    </div>
  );
}

type PropsPastilha = {
  href?: string;
  rotulo: string;
  valor?: string;
  apoio?: string;
  /** Cobertura parcial ("3 de 5 fretes com km") — `CLAUDE.md` §8, regra 10: dado incompleto mostra a cobertura, não só o número. */
  nota?: string;
  convite?: string;
  vencida?: boolean;
};

/** Raio 22, padding 18, valor 25/800 — `docs/estilo.md` linha 113. */
function Pastilha({ href, rotulo, valor, apoio, nota, convite, vencida = false }: PropsPastilha) {
  const conteudo = (
    <div
      className={`flex min-w-0 flex-col gap-6 rounded-pastilha px-18 py-18 ${vencida ? "bg-vencido-fundo" : "bg-separacao"}`}
    >
      <span
        className={`text-eyebrow font-bold uppercase tracking-[.16em] ${vencida ? "text-vencido" : "text-tinta-apoio"}`}
      >
        {rotulo}
      </span>
      {convite ? (
        <span className="text-apoio font-medium text-tinta-apoio-forte">{convite}</span>
      ) : (
        <>
          <span
            className={`text-valor-pastilha font-extrabold tabular-nums ${vencida ? "text-vencido" : "text-tinta"}`}
          >
            {valor}
          </span>
          {apoio ? <span className="text-total-contextual font-medium text-tinta-apoio">{apoio}</span> : null}
          {nota ? <span className="text-total-contextual font-medium text-tinta-apoio">{nota}</span> : null}
        </>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="min-w-0">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

/**
 * Barras dos últimos 6 meses — sem eixo, legenda ou grade
 * (`docs/especificacao.md` §4.6). Mês corrente `#1B6B3A`, anterior
 * `#D6D1C5`, resto `#E4E0D6` (`docs/estilo.md` § Cores). Altura máxima
 * (112px) e raio (`8 8 3 3`) não têm token em `docs/estilo.md` — registrados
 * como lacuna lá, mesmo padrão do `h-180` da miniatura de comprovante.
 * Cada barra leva a Fretes filtrado naquele mês.
 *
 * **Alvo de toque mínimo 48px (`CLAUDE.md` §8)**: com faturamento zero (ou
 * um mês muito menor que o maior do período), a barra visível encolhe até
 * 4px — a coluna inteira (`min-h-48`, conteúdo alinhado embaixo) garante o
 * alvo sem esticar a barra visualmente.
 */
function BarrasDoGrafico({ meses }: { meses: FaturamentoDoMes[] }) {
  const ALTURA_MAX = 112;
  const maior = Math.max(0, ...meses.map((m) => m.faturamentoCentavos));

  return (
    <div className="flex items-end gap-10">
      {meses.map((mes, i) => {
        const primeiroDia = `${mes.mes}-01`;
        const ultimoDia = deslocarDias(deslocarMes(primeiroDia, 1), -1);
        const altura = maior > 0 ? Math.max(4, Math.round((mes.faturamentoCentavos / maior) * ALTURA_MAX)) : 4;
        const cor =
          i === meses.length - 1
            ? "bg-acao"
            : i === meses.length - 2
              ? "bg-grafico-mes-anterior"
              : "bg-principal-desabilitado";

        return (
          <Link
            key={mes.mes}
            href={`/fretes?periodo=personalizado&de=${primeiroDia}&ate=${ultimoDia}`}
            className="flex min-h-48 min-w-0 flex-1 flex-col items-center justify-end gap-6"
          >
            <div className={`w-full rounded-t-[8px] rounded-b-[3px] ${cor}`} style={{ height: `${altura}px` }} />
            <span className="text-[11px] font-semibold text-tinta-apoio">{formatarMesAbreviado(mes.mes)}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** `min-h-70` não tem token em `docs/estilo.md` — registrado como lacuna lá, mesmo padrão do `h-180` da miniatura de comprovante. */
function LinhaDePendencia({ href, titulo, apoio }: { href: string; titulo: string; apoio?: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-70 items-center gap-14 rounded-campo bg-separacao px-18 py-14 active:bg-principal-desabilitado"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <span className="text-nome-recolhida font-bold text-tinta">{titulo}</span>
        {apoio ? <span className="text-apoio font-medium text-tinta-apoio">{apoio}</span> : null}
      </div>
      <svg
        width={8}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-tinta-fraca"
        aria-hidden="true"
      >
        <path d="M8.657 4.8 15.343 12l-6.686 7.2" />
      </svg>
    </Link>
  );
}

/**
 * "E-mail não confirmado" não é `LinhaDePendencia` — não navega para lugar
 * nenhum, chama o servidor (`BotaoReenviarEmail`, cliente). Nunca bloqueia
 * o login (`docs/especificacao.md` §4: e-mail não confirmado não impede
 * entrar) — só oferece a saída de resolver, com trava de tentativas própria
 * já existente no Better Auth (`src/lib/auth/index.ts`).
 */
function LinhaDeEmailNaoConfirmado({ email }: { email: string }) {
  return (
    <div className="flex flex-col gap-14 rounded-campo bg-separacao px-18 py-14">
      <div className="flex flex-col gap-4">
        <span className="text-nome-recolhida font-bold text-tinta">Confirme seu e-mail</span>
        <span className="text-apoio font-medium text-tinta-apoio">Pode ter caído na caixa de spam.</span>
      </div>
      <BotaoReenviarEmail email={email} />
    </div>
  );
}
