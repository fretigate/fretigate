import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import {
  contarFretesAFaturar,
  listarCobrancas,
  referenciaDoServico,
  resumoDeCobrancas,
} from "@/lib/servicos/cobrancas";
import {
  agruparPorRelatorio,
  grupoDaCobranca,
  resolverSituacaoDaUrl,
  textoCobradoHa,
  type CobrancaParaLista,
} from "@/lib/servicos/cobrancas-situacao";
import { ultimoEnvioPorTitulo } from "@/lib/servicos/titulos";
import { buscarClientesPorIds } from "@/lib/servicos/clientes";
import { buscarServicosPorIds } from "@/lib/servicos/servicos";
import { buscarRelatoriosPorIds } from "@/lib/servicos/relatorios";
import {
  diaEmFortaleza,
  formatarDiaDaSemanaEData,
  formatarPeriodoDeCobranca,
} from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarRota } from "@/lib/utils/rota";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import {
  resolverLimiteDaLista,
  resolverPeriodoDaUrl,
  rotuloDoPeriodo,
} from "@/lib/utils/periodo";
import { ListaCobrancas } from "./ListaCobrancas";

/**
 * Cobranças (item 6, Tarefa 2) — substitui a tela provisória que estava aqui
 * desde o item 4. `docs/especificacao.md` §4.5 para o conteúdo; o plano
 * (`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 2) para as decisões do
 * fundador de 26/08/2026.
 *
 * **Situação e Período viajam pela URL** (`?situacao=`, `?periodo=`) — os
 * dois trocam o que é lido do banco, e a dashboard do item 8 vai linkar para
 * cá já filtrada ("Pastilha Vencido → Cobranças filtrado",
 * `docs/navegacao.md`). Cliente filtra no navegador, sobre o que já veio —
 * `?cliente=` (Tarefa 7 do item 6, 27/08/2026) só semeia o valor inicial
 * desse filtro local, para "A receber"/"Vencido" do perfil do cliente
 * linkarem direto para cá já filtrados; não vira consulta nova.
 *
 * **A tela abre sem filtro de período** — decisão do fundador, 26/08/2026:
 * abrir no mês esconderia a cobrança vencida em junho, que é justamente a que
 * precisa aparecer. Mesmo motivo já aplicado em "Meus fretes", e pior aqui.
 *
 * **Ganhou "Voltar" em 13/09/2026** (`docs/planos/
 * financeiro-unifica-cobrancas-e-despesas.md`) — até então não precisava:
 * era destino direto da barra, sem tela anterior. Com o hub "Financeiro" no
 * lugar da barra, esta virou tela de nível 2, e `docs/componentes.md` linha
 * 269 exige `voltar.svg` "no topo de toda tela de nível 2" — regra já
 * escrita, não decisão nova desta tarefa.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{
    situacao?: string;
    periodo?: string;
    de?: string;
    ate?: string;
    cliente?: string;
  }>;
}) {
  const sessao = await exigirSessao();
  const { situacao: situacaoUrl, periodo: janela, de, ate, cliente: clienteUrl } = await searchParams;

  // `cliente` nunca chega a uma consulta ao banco — só semeia o filtro local
  // (`ListaCobrancas`, `clienteFiltro`), comparado por igualdade contra os
  // clientes já carregados, com *fallback* seguro se não bater com nenhum.
  // Ainda assim, validar o formato aqui é consistente com `situacao` e
  // `de`/`ate` (`CLAUDE.md` §4) e barato — achado do `/revisar`.
  const clienteInicial =
    clienteUrl && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteUrl)
      ? clienteUrl
      : undefined;

  const situacao = resolverSituacaoDaUrl(situacaoUrl);
  const periodo = resolverPeriodoDaUrl(janela, de, ate);
  const limite = resolverLimiteDaLista(janela, periodo);
  const hoje = diaEmFortaleza(new Date());

  const [resumo, { titulos, cortado }] = await Promise.all([
    resumoDeCobrancas(sessao.empresaId, hoje),
    listarCobrancas(sessao.empresaId, { situacao, periodo, limite, hoje }),
  ]);

  // `clienteInicial` entra no mesmo lote — achado do segundo `/revisar`: sem
  // isso, um cliente sem NENHUMA cobrança nesta situação (ex.: "Vencido" com
  // R$ 0,00, tocado no perfil) chegava aqui sem nome, e o chip ficava
  // "ativo" mostrando o rótulo neutro "Cliente" — mentindo sobre o que está
  // em vigor (`docs/componentes.md`, "Chips de seleção › Filtro").
  const idsDeClientes = new Set(titulos.map((t) => t.cliente_id));
  if (clienteInicial) idsDeClientes.add(clienteInicial);

  const idsDeRelatorio = [
    ...new Set(titulos.map((t) => t.relatorio_id).filter((id): id is string => id !== null)),
  ];

  const [clientes, servicos, envios, empresa, relatorios] = await Promise.all([
    buscarClientesPorIds(sessao.empresaId, [...idsDeClientes]),
    buscarServicosPorIds(sessao.empresaId, [...new Set(titulos.map((t) => t.servico_id))]),
    // Em lote, nunca uma consulta por linha — mesma regra de
    // `totalRecebidoPorTitulo`/`ultimoEnvioPorTitulo` (`titulos.ts`) e do
    // resto de `listarCobrancas` — "cobrado há X dias por Y" (item 6,
    // Tarefa 5).
    ultimoEnvioPorTitulo(sessao.empresaId, titulos.map((t) => t.id)),
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { nome_fantasia: true, chave_pix: true },
    }),
    // O período de cada relatório, para `{periodo}` na mensagem de cobrança
    // agrupada (item 7, segundo commit) — `agruparPorRelatorio`, abaixo.
    buscarRelatoriosPorIds(sessao.empresaId, idsDeRelatorio),
  ]);

  const nomeDoCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const telefoneDoCliente = new Map(clientes.map((c) => [c.id, c.telefone]));
  const servicoPorId = new Map(servicos.map((s) => [s.id, s]));
  const periodoPorRelatorio = new Map(
    relatorios.map((r) => [r.id, formatarPeriodoDeCobranca(r.data_inicial, r.data_final)]),
  );

  const cobrancasFlat: CobrancaParaLista[] = titulos.map((t) => {
    const servico = servicoPorId.get(t.servico_id);
    const grupo = grupoDaCobranca(t, hoje);
    // Sempre igual a `t.valor` quando `status === "pago"` — a função de
    // banco (`registrar_recebimento`) só marca "pago" quando a soma dos
    // recebimentos alcança o valor, nunca antes (item 6, Tarefa 3).
    const recebido = t.totalRecebido;
    const envio = envios.get(t.id) ?? null;

    return {
      id: t.id,
      clienteId: t.cliente_id,
      cliente: nomeDoCliente.get(t.cliente_id) ?? "Cliente",
      referencia: referenciaDoServico(servico ?? null),
      // Em aberto mostra o que falta entrar; recebida mostra o que entrou.
      valorCentavos: grupo === "recebidas" ? recebido : t.valor - recebido,
      grupo,
      // "Recebidas" usa a data do último `Recebimento`, nunca `vencimento`
      // — ver o comentário de `listarCobrancas` em `cobrancas.ts`.
      dia: grupo === "recebidas" && t.ultimoRecebimentoEm
        ? diaEmFortaleza(t.ultimoRecebimentoEm)
        : (t.vencimento ? diaEmFortaleza(t.vencimento) : null),
      boleto: t.forma_pagamento_prevista === "boleto",
      // Só faz sentido fora de "Recebidas": um título pago não é "parcial",
      // é o caso normal (item 6, Tarefa 3 — a linha do recebimento parcial).
      parcial: grupo !== "recebidas" && recebido > 0,
      clienteTelefone: telefoneDoCliente.get(t.cliente_id) ?? null,
      rota: formatarRota(servico?.origem_texto ?? null, servico?.destino_texto ?? null),
      vencimentoFormatado: t.vencimento ? formatarDiaDaSemanaEData(t.vencimento) : null,
      marcaCobrado: envio ? textoCobradoHa(envio, hoje) : null,
      marcaCobradoEm: envio?.em ?? null,
      relatorioId: t.relatorio_id,
    };
  });

  // Junta em uma linha só os títulos com o mesmo `relatorio_id` (item 7,
  // `docs/especificacao.md` §4.5) — depois do teto de 50: o corte já
  // aconteceu em `listarCobrancas` sobre os títulos individuais, então um
  // relatório de 4 fretes conta como 4 contra o teto, não como 1.
  const cobrancas = agruparPorRelatorio(cobrancasFlat, periodoPorRelatorio);

  // Uma consulta a mais só quando a lista veio vazia — é o único caso em que
  // o número é exibido (o estado vazio precisa dizer o que destrava a tela).
  const fretesAFaturar =
    titulos.length === 0 ? await contarFretesAFaturar(sessao.empresaId) : 0;

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <BotaoVoltar href="/financeiro" />
        <span
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
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
          limitadoA50={limite === 50 && cortado}
          rotuloPeriodo={rotuloDoPeriodo(janela, de, ate, "Todas as cobranças")}
          clienteInicial={clienteInicial}
          clienteInicialNome={clienteInicial ? (nomeDoCliente.get(clienteInicial) ?? null) : null}
          fretesAFaturar={fretesAFaturar}
          empresaNome={empresa!.nome_fantasia}
          chavePixEmpresa={empresa!.chave_pix}
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
