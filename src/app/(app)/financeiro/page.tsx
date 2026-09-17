import { exigirSessao } from "@/lib/auth/sessao";
import { resumoDoFinanceiro, type ResumoDoFinanceiro } from "@/lib/servicos/financeiro";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { ItemMenu } from "@/components/ui/ItemMenu";
import { TresNumeros, type ItemDeTresNumeros } from "@/components/ui/TresNumeros";

/**
 * Financeiro — hub com duas entradas, Opção A de `docs/planos/
 * financeiro-unifica-cobrancas-e-despesas.md` (decisão do fundador,
 * 12/09/2026). Cobranças e Despesas continuam sendo as mesmas telas de
 * sempre, em `/cobrancas` e `/despesas`, sem nenhuma mudança nelas; só o
 * caminho até chegar ganhou um passo a mais (barra → hub → tela).
 *
 * **Ganhou resumo em 17/09/2026** (`docs/planos/
 * financeiro-resumo-com-numeros.md`) — decisão do fundador, Proposta 2: três
 * números, caixa (dinheiro que já entrou ou já saiu de verdade), nunca
 * competência (por isso nunca os mesmos de Faturamento/Lucro da dashboard,
 * mesmo parecendo por fora). **Volta a precisar de `exigirSessao()`** — não
 * é mais redundante como na Opção A sem resumo: esta tela agora lê
 * `empresaId`.
 *
 * **As três pastilhas não são tocáveis** — nenhum documento define destino
 * para elas ainda (diferente de "A receber"/"Vencido"/"Lucro" da dashboard,
 * que já linkam para Cobranças/Despesas); registrado como pergunta ao
 * Design, mesmo tratamento já dado à pastilha "Rodagem" da dashboard
 * (`docs/navegacao.md`, "não-tocável, sem destino ainda").
 *
 * **Layout do resumo é provisório, sem resposta do Design ainda** (pedido
 * enviado, ver o plano) — reaproveita o componente `TresNumeros`
 * (`/src/components/ui`, o mesmo que Cobranças já usa) por ser o
 * precedente mais próximo no produto, não por decisão de que é o layout
 * certo aqui. Rótulos também provisórios — ver "Rótulos propostos" no
 * plano.
 *
 * As duas linhas reaproveitam o ícone de `barra-cobrancas.svg` — mesmo
 * precedente já usado para "Despesas" em Mais (`docs/planos/
 * item-11-despesas.md`: nenhum ícone próprio existe para nenhuma das duas,
 * decisão do fundador de 01/09/2026 de não travar tarefa em decisão visual
 * pequena). Pedido ao Design, ainda sem resposta: ícone próprio para
 * "Financeiro" na barra e, se fizer sentido, ícones distintos para as duas
 * linhas aqui.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const hoje = diaEmFortaleza(new Date());
  const resumo = await resumoDoFinanceiro(sessao.empresaId, hoje);

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="flex flex-col gap-14 px-20 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <span
          className="text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Financeiro
        </span>
        <TresNumeros itens={itensDoResumo(resumo, hoje)} />
      </div>

      <div className="flex flex-col gap-6 px-16">
        <ItemMenu href="/cobrancas" nome="Cobranças">
          <path d="M5.16 6.24h13.68v9.18a0.9 0.9 0 0 1 -0.9 0.9H6.06a0.9 0.9 0 0 1 -0.9 -0.9V6.24ZM8.04 9.3h7.92M8.04 12.36h4.5" />
        </ItemMenu>
        <ItemMenu href="/despesas" nome="Despesas">
          <path d="M5.16 6.24h13.68v9.18a0.9 0.9 0 0 1 -0.9 0.9H6.06a0.9 0.9 0 0 1 -0.9 -0.9V6.24ZM8.04 9.3h7.92M8.04 12.36h4.5" />
        </ItemMenu>
      </div>
    </main>
  );
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * "Recebido"/"Pago" são o mesmo dado de `resumoDeCobrancas`/`despesasDoMes`
 * (dinheiro que já mudou de mão) — números reais mesmo quando zero, porque
 * são soma direta, não combinação dos dois lados. "Sobrou" é a combinação
 * (`resumoDoFinanceiro`), nunca chamada "Saldo" ou "Lucro" — os dois nomes
 * já têm dono em outro lugar do produto
 * (`docs/planos/financeiro-resumo-com-numeros.md`, seção 4) — e vira
 * convite, não valor, quando nenhuma despesa foi lançada no mês: o mesmo
 * gatilho do Lucro da dashboard (`CLAUDE.md` §8, achado do `/revisar`
 * nesta tarefa — a primeira versão mostrava "Sobrou" igual a "Recebido"
 * sempre que ninguém tivesse lançado despesa, um número que parecia real e
 * não era).
 */
function itensDoResumo(resumo: ResumoDoFinanceiro, hoje: string): ItemDeTresNumeros[] {
  const mes = MESES[Number(hoje.slice(5, 7)) - 1];
  return [
    { rotulo: `Recebido em ${mes}`, valor: resumo.recebidoCentavos, tom: "acao" },
    { rotulo: `Pago em ${mes}`, valor: resumo.pagoCentavos, tom: "neutro" },
    resumo.saldoCentavos === null
      ? { rotulo: `Sobrou em ${mes}`, convite: "Aparece com despesa lançada." }
      : { rotulo: `Sobrou em ${mes}`, valor: resumo.saldoCentavos, tom: "neutro" },
  ];
}
