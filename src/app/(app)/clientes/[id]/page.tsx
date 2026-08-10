import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { buscarCliente } from "@/lib/servicos/clientes";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { formatarDocumento } from "@/lib/utils/documento";

/**
 * Perfil do cliente — `docs/navegacao.md` linha 39. Nasce só com
 * identificação, dados cadastrais e Editar: o resumo financeiro (já rodado ·
 * a receber · vencido · recebido) e o histórico de fretes dependem de
 * `Servico`/`TituloReceber` (item 4) — combinado com o fundador, 10/08/2026.
 * Pelo mesmo motivo não há "Gerar relatório" nem "Cobrar no WhatsApp" ainda:
 * as duas dependem de dado que não existe (relatório, valor em aberto).
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const [cliente, empresa] = await Promise.all([
    buscarCliente(sessao.empresaId, id),
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { prazo_padrao_dias: true },
    }),
  ]);
  if (!cliente) notFound();

  const cidade = cliente.municipio ? `${cliente.municipio.nome}/${cliente.municipio.uf}` : null;
  const prazoDias = cliente.prazo_pagamento_dias ?? empresa!.prazo_padrao_dias;
  const prazoOrigem =
    cliente.prazo_pagamento_dias != null
      ? "Acordo próprio deste cliente."
      : "Herdado da configuração padrão da empresa.";

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

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Identificação
        </span>
        <div className="flex flex-col gap-4">
          <LinhaDado id={id} rotulo="Telefone" valor={cliente.telefone} />
          <LinhaDado id={id} rotulo="Documento" valor={cliente.documento ? formatarDocumento(cliente.documento) : null} />
          <LinhaDado id={id} rotulo="Endereço" valor={cliente.endereco} />
          <LinhaDado id={id} rotulo="E-mail" valor={cliente.email} />
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
      </div>
    </main>
  );
}

/**
 * Uma linha de dado do perfil. Campo vazio mostra "adicionar" em verde,
 * tocável — nunca "não preenchido" (`docs/componentes.md` § "A palavra é
 * sempre 'adicionar'"). O toque leva para o formulário de edição.
 */
function LinhaDado({ id, rotulo, valor }: { id: string; rotulo: string; valor: string | null }) {
  return (
    <div className="flex items-start gap-12 rounded-campo bg-separacao px-18 py-14">
      <span className="w-96 flex-none pt-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      {valor ? (
        <span className="min-w-0 flex-1 text-campo leading-[1.35] font-semibold text-tinta [overflow-wrap:anywhere]">
          {valor}
        </span>
      ) : (
        <Link
          href={`/clientes/${id}/editar`}
          className="min-w-0 flex-1 text-campo font-semibold leading-[1.35] text-acao"
        >
          adicionar
        </Link>
      )}
    </div>
  );
}
