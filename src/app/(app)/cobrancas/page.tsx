import { exigirSessao } from "@/lib/auth/sessao";
import {
  contarFretesAFaturar,
  listarCobrancas,
  resumoDeCobrancas,
} from "@/lib/servicos/cobrancas";
import { grupoDaCobranca, resolverSituacaoDaUrl } from "@/lib/servicos/cobrancas-situacao";
import { buscarClientesPorIds } from "@/lib/servicos/clientes";
import { buscarServicosPorIds } from "@/lib/servicos/servicos";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarRota } from "@/lib/utils/rota";
import {
  formatarDataCurta,
  resolverLimiteDaLista,
  resolverPeriodoDaUrl,
  rotuloDoPeriodo,
} from "@/lib/utils/periodo";
import { ListaCobrancas, type CobrancaParaLista } from "./ListaCobrancas";

/**
 * Cobranças (item 6, Tarefa 2) — substitui a tela provisória que estava aqui
 * desde o item 4. `docs/especificacao.md` §4.5 para o conteúdo; o plano
 * (`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 2) para as decisões do
 * fundador de 26/08/2026.
 *
 * **Situação e Período viajam pela URL** (`?situacao=`, `?periodo=`) — os
 * dois trocam o que é lido do banco, e a dashboard do item 8 vai linkar para
 * cá já filtrada ("Pastilha Vencido → Cobranças filtrado",
 * `docs/navegacao.md`). Cliente filtra no navegador, sobre o que já veio.
 *
 * **A tela abre sem filtro de período** — decisão do fundador, 26/08/2026:
 * abrir no mês esconderia a cobrança vencida em junho, que é justamente a que
 * precisa aparecer. Mesmo motivo já aplicado em "Meus fretes", e pior aqui.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{
    situacao?: string;
    periodo?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const sessao = await exigirSessao();
  const { situacao: situacaoUrl, periodo: janela, de, ate } = await searchParams;

  const situacao = resolverSituacaoDaUrl(situacaoUrl);
  const periodo = resolverPeriodoDaUrl(janela, de, ate);
  const limite = resolverLimiteDaLista(janela, periodo);
  const hoje = diaEmFortaleza(new Date());

  const [resumo, titulos] = await Promise.all([
    resumoDeCobrancas(sessao.empresaId, hoje),
    listarCobrancas(sessao.empresaId, { situacao, periodo, limite, hoje }),
  ]);

  const [clientes, servicos] = await Promise.all([
    buscarClientesPorIds(sessao.empresaId, [...new Set(titulos.map((t) => t.cliente_id))]),
    buscarServicosPorIds(sessao.empresaId, [...new Set(titulos.map((t) => t.servico_id))]),
  ]);

  const nomeDoCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const servicoPorId = new Map(servicos.map((s) => [s.id, s]));

  const cobrancas: CobrancaParaLista[] = titulos.map((t) => {
    const servico = servicoPorId.get(t.servico_id);
    const rota = servico ? formatarRota(servico.origem_texto, servico.destino_texto) : null;
    const diaDoFrete = servico ? diaEmFortaleza(servico.data_servico) : null;
    const grupo = grupoDaCobranca(t, hoje);
    const recebido = t.valor_recebido ?? 0;

    return {
      id: t.id,
      clienteId: t.cliente_id,
      cliente: nomeDoCliente.get(t.cliente_id) ?? "Cliente",
      // "Sobral → Crateús · 22 jul" — a rota e o dia do frete que originou a
      // cobrança. Uma cobrança de relatório cobre vários fretes e vai ter
      // referência própria ("Relatório de julho · 9 fretes"), no item 7.
      referencia: [rota, diaDoFrete ? formatarDataCurta(diaDoFrete) : null]
        .filter(Boolean)
        .join(" · ") || null,
      // Em aberto mostra o que falta entrar; recebida mostra o que entrou.
      valorCentavos: grupo === "recebidas" ? recebido : t.valor - recebido,
      grupo,
      dia: grupo === "recebidas"
        ? (t.data_pagamento ? diaEmFortaleza(t.data_pagamento) : null)
        : (t.vencimento ? diaEmFortaleza(t.vencimento) : null),
      boleto: t.forma_pagamento_prevista === "boleto",
    };
  });

  // Uma consulta a mais só quando a lista veio vazia — é o único caso em que
  // o número é exibido (o estado vazio precisa dizer o que destrava a tela).
  const fretesAFaturar =
    titulos.length === 0 ? await contarFretesAFaturar(sessao.empresaId) : 0;

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="px-20 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <span
          className="text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Cobranças
        </span>
      </div>

      <div className="flex flex-col gap-14 px-16">
        <TresNumeros resumo={resumo} hoje={hoje} />

        <ListaCobrancas
          cobrancas={cobrancas}
          hoje={hoje}
          situacaoAtual={situacao}
          janelaAtual={janela}
          filtroDePeriodoAtivo={periodo !== null}
          limitadoA50={limite === 50 && titulos.length === 50}
          rotuloPeriodo={rotuloDoPeriodo(janela, de, ate, "Todas as cobranças")}
          fretesAFaturar={fretesAFaturar}
        />
      </div>
    </main>
  );
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * Os três números do topo (`docs/especificacao.md` §4.5): situação atual e
 * mês corrente, **sem responder aos filtros**.
 *
 * **"Desse, vencido"** é o rótulo do meio, não "Vencido" sozinho: §4.5 exige
 * que o rótulo deixe explícito que vencido é um recorte de a receber — sem
 * isso, quem lê soma os dois e enxerga dívida que não existe. O rótulo é o do
 * protótipo (`referencia/.../TelaCobrancas.dc.html`, "DESSE, VENCIDO").
 */
function TresNumeros({
  resumo,
  hoje,
}: {
  resumo: { aReceber: number; vencido: number; recebidoNoMes: number };
  hoje: string;
}) {
  const mes = MESES[Number(hoje.slice(5, 7)) - 1];
  const numeros = [
    {
      rotulo: "A receber",
      valor: resumo.aReceber,
      classe: "text-tinta",
      fundo: "bg-separacao",
      classeRotulo: "text-tinta-apoio",
    },
    {
      // A pastilha de fundo `#F6E6DD` com tinta `#B3401A` é o que
      // `docs/estilo.md` registra ("Fundo da pastilha 'Vencido' (dashboard e
      // Cobranças)") e o que o protótipo desenha — os três números ficam em
      // pastilhas, não soltos. Corrigido no segundo `/revisar`: a primeira
      // versão os deixou como texto solto **afirmando** que era o desenho do
      // protótipo, que mostra o contrário (`CLAUDE.md` §13, sobre afirmação
      // de medição).
      rotulo: "Desse, vencido",
      valor: resumo.vencido,
      classe: "text-vencido",
      fundo: "bg-vencido-fundo",
      classeRotulo: "text-vencido",
    },
    {
      rotulo: `Recebido em ${mes}`,
      valor: resumo.recebidoNoMes,
      classe: "text-acao",
      fundo: "bg-separacao",
      classeRotulo: "text-tinta-apoio",
    },
  ];

  return (
    <div className="flex gap-7">
      {numeros.map((numero) => (
        <div
          key={numero.rotulo}
          className={`flex min-w-0 flex-1 flex-col gap-10 rounded-linha px-11 py-13 ${numero.fundo}`}
        >
          {/* 9px, não os 11px do rótulo de seção — `docs/estilo.md`,
              "Conflitos resolvidos" 3 registra esta exceção para estes três
              rótulos e só para eles. Achado do `/revisar`: a primeira versão
              juntava o tamanho da regra geral com o rastreio da exceção. */}
          <span
            className={`text-eyebrow-topo-cobrancas font-bold uppercase leading-[1.25] tracking-[.09em] ${numero.classeRotulo}`}
          >
            {numero.rotulo}
          </span>
          <span className={`text-valor-lista font-extrabold leading-[1] tabular-nums ${numero.classe}`}>
            R$ {formatarCentavos(numero.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}
