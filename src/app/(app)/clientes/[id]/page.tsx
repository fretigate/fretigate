import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { buscarCliente } from "@/lib/servicos/clientes";
import { resumoFinanceiroDoCliente, listarServicosDoCliente } from "@/lib/servicos/titulos";
import { Botao } from "@/components/ui/Botao";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { ChipDePeriodoPerfil } from "@/components/ui/ChipDePeriodoPerfil";
import { ResumoDoPerfil } from "@/components/ui/ResumoDoPerfil";
import { HistoricoDoPerfil } from "@/components/ui/HistoricoDoPerfil";
import { TelefonePerfil } from "@/components/ui/TelefonePerfil";
import { formatarDocumento } from "@/lib/utils/documento";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { resolverPeriodoDoPerfil, rotuloDoPeriodo } from "@/lib/utils/periodo";
import { salvarTelefoneClienteAction } from "../acoes";

/**
 * Perfil do cliente — `docs/navegacao.md` linha 39. Ganha resumo financeiro
 * e histórico de fretes na Tarefa 6 do item 4
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`), "a receber"/"vencido"
 * no resumo na Tarefa 7 do item 6, e o principal **Gerar relatório** na
 * Tarefa 4 do item 7 (`docs/componentes.md` linha 461) — cliente
 * pré-selecionado via `?cliente=`, mesmo mecanismo de `fretes/novo`.
 *
 * Continua **sem** "Cobrar no WhatsApp": já tem o dado que faltava (valor em
 * aberto, Tarefa 7 do item 6), mas não foi construído aqui — é escopo que
 * ninguém pediu ainda, não falta de dado (achado ao revisar o pedido do
 * fundador, 27/08/2026, quando "Gerar relatório" ainda estava no mesmo caso).
 */
export default async function Pagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const sessao = await exigirSessao();
  const { id } = await params;
  const { periodo: janelaParam, de, ate } = await searchParams;

  const [cliente, empresa] = await Promise.all([
    buscarCliente(sessao.empresaId, id),
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { prazo_padrao_dias: true },
    }),
  ]);
  if (!cliente) notFound();

  const { periodo, janelaEfetiva } = resolverPeriodoDoPerfil(janelaParam, de, ate);
  const hoje = diaEmFortaleza(new Date());
  const [resumo, historico] = await Promise.all([
    resumoFinanceiroDoCliente(sessao.empresaId, id, periodo, hoje),
    listarServicosDoCliente(sessao.empresaId, id, periodo),
  ]);

  const cidade = cliente.municipio ? `${cliente.municipio.nome}/${cliente.municipio.uf}` : null;
  const prazoDias = cliente.prazo_pagamento_dias ?? empresa!.prazo_padrao_dias;
  const prazoOrigem =
    cliente.prazo_pagamento_dias != null
      ? "Acordo próprio deste cliente."
      : "Herdado da configuração padrão da empresa.";

  // `?cliente=` semeia o chip Cliente que "Meus fretes" já tem (Tarefa 6) —
  // sem esse parâmetro, período nenhum viajaria junto, e "já rodado" levaria
  // a um período diferente do que ele soma. O nome do cliente NÃO viaja pela
  // URL (achado do segundo /revisar: dado de terceiro em query string entra
  // em log de acesso da hospedagem) — "Meus fretes" resolve o nome sozinho,
  // buscando esse cliente no banco quando `cliente` estiver presente.
  const parametrosDeFretes = new URLSearchParams({ cliente: id, periodo: janelaEfetiva });
  if (de) parametrosDeFretes.set("de", de);
  if (ate) parametrosDeFretes.set("ate", ate);

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <Link
          href="/clientes"
          aria-label="Voltar"
          className="-ml-10 flex h-44 w-44 flex-none items-center justify-center"
        >
          <svg width={12} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15.6 4.35 8.4 12l7.2 7.65"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <span className="min-w-0 flex-1 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Cliente
        </span>
        <PilulaCabecalho href={`/clientes/${id}/editar`}>Editar</PilulaCabecalho>
      </div>

      <div className="flex flex-col px-20">
        <span
          className="text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          {cliente.nome}
        </span>
        {/* "Corpo de apoio" (13–15/1.2–1.5/400–500, docs/estilo.md) — mesmo
            token de LinhaDeLista.tsx, em vez de um tamanho arbitrário novo. */}
        {cidade ? (
          <span className="mt-8 text-apoio font-medium text-tinta-apoio">{cidade}</span>
        ) : null}

        <ResumoDoPerfil
          chipPeriodo={
            <ChipDePeriodoPerfil
              caminhoBase={`/clientes/${id}`}
              hoje={hoje}
              janelaAtual={janelaEfetiva}
              rotuloPeriodo={rotuloDoPeriodo(janelaEfetiva, de, ate) ?? "Este mês"}
            />
          }
          numeros={[
            {
              rotulo: "Já rodado",
              valor: `R$ ${formatarCentavos(resumo.jaRodado)}`,
              href: `/fretes?${parametrosDeFretes.toString()}`,
            },
            {
              rotulo: "Recebido no período",
              valor: `R$ ${formatarCentavos(resumo.recebidoNoPeriodo)}`,
            },
          ]}
          numerosAtuais={[
            {
              rotulo: "A receber",
              valor: `R$ ${formatarCentavos(resumo.aReceber)}`,
              // `periodo=todos` não filtra data nenhuma (mesmo efeito de
              // omitir o parâmetro) — a única diferença é tirar o teto de 50
              // (`resolverLimiteDaLista`). Sem isso, achado do /revisar: numa
              // empresa com mais de 50 títulos abertos, a lista cortada por
              // vencimento (de TODOS os clientes) podia não incluir nenhum
              // deste cliente, e o número aqui discordaria da tela que ele
              // mesmo abre — mesmo defeito já corrigido em
              // `contarFretesAFaturar`.
              href: `/cobrancas?situacao=em_aberto&periodo=todos&cliente=${id}`,
            },
            {
              rotulo: "Vencido",
              valor: `R$ ${formatarCentavos(resumo.vencido)}`,
              href: `/cobrancas?situacao=vencidas&periodo=todos&cliente=${id}`,
            },
          ]}
        />

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Identificação
        </span>
        <div className="flex flex-col gap-4">
          <LinhaDePerfil
            rotulo="Telefone"
            valor={cliente.telefone}
            valorNode={
              <TelefonePerfil
                nome={cliente.nome}
                telefone={cliente.telefone}
                salvar={salvarTelefoneClienteAction.bind(null, id)}
              />
            }
          />
          <LinhaDePerfil
            href={`/clientes/${id}/editar`}
            rotulo="Documento"
            valor={cliente.documento ? formatarDocumento(cliente.documento) : null}
          />
          <LinhaDePerfil href={`/clientes/${id}/editar`} rotulo="Endereço" valor={cliente.endereco} />
          <LinhaDePerfil href={`/clientes/${id}/editar`} rotulo="E-mail" valor={cliente.email} />
        </div>

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Condição comercial
        </span>
        <div className="flex flex-col gap-6 rounded-campo bg-separacao px-18 py-14">
          <div className="flex items-start gap-12">
            <span className="w-96 flex-none pt-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
              Prazo de pagamento
            </span>
            <span className="min-w-0 flex-1 text-campo font-semibold leading-[1.35] text-tinta">
              {prazoDias} dias
            </span>
          </div>
          <span className="pl-108 text-apoio font-medium text-tinta-apoio">{prazoOrigem}</span>
        </div>

        <div className="pt-26 flex flex-col gap-10">
          <Botao variante="principal" href={`/relatorio?cliente=${id}`}>
            Gerar relatório
          </Botao>
          <PilulaEmLinha href={`/fretes/novo?cliente=${id}`}>
            Lançar frete para este cliente
          </PilulaEmLinha>
        </div>

        <HistoricoDoPerfil
          servicos={historico.servicos}
          total={historico.total}
          totalGeral={historico.totalGeral}
        />
      </div>
    </main>
  );
}
