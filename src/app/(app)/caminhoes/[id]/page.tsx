import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { PlacaBadge } from "@/components/ui/PlacaBadge";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { exigirSessao } from "@/lib/auth/sessao";

/**
 * Perfil do caminhão — `docs/navegacao.md` linha 41. Nasce só com
 * identificação e Editar: km no período, R$/km, motorista habitual e
 * histórico dependem de `Servico`/`Motorista` (itens 3/4/7) — mesmo motivo
 * que adiou o resumo financeiro do perfil do cliente na tarefa 5.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const caminhao = await buscarCaminhao(sessao.empresaId, id);
  if (!caminhao) notFound();

  const rotuloPorTipo = Object.fromEntries(TIPOS_VEICULO.map((t) => [t.valor, t.rotulo]));
  const tipoRotulo = caminhao.tipo ? rotuloPorTipo[caminhao.tipo] : null;

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
          href="/caminhoes"
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
          Caminhão
        </span>
        <PilulaCabecalho href={`/caminhoes/${id}/editar`}>Editar</PilulaCabecalho>
      </div>

      <div className="flex flex-col px-20">
        {/* Apelido é a única coisa que ocupa o papel de "nome" — placa nunca
            entra aqui (`docs/estilo.md`: Azeret Mono "nunca em nome"). Sem
            apelido, a linha abaixo (placa + tipo) é a única identificação. */}
        {caminhao.apelido ? (
          <span
            className="text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta"
            style={{ fontVariationSettings: "'wdth' 96" }}
          >
            {caminhao.apelido}
          </span>
        ) : null}
        {caminhao.placa || tipoRotulo ? (
          <div className={`flex items-center gap-10 ${caminhao.apelido ? "mt-8" : ""}`}>
            {caminhao.placa ? <PlacaBadge placa={caminhao.placa} variante="escura" /> : null}
            {/* Secundário (`docs/estilo.md` linha 107: "Perfil do caminhão —
                Secundário: placa, tipo, linhas"), não terciário. */}
            {tipoRotulo ? (
              <span className="text-apoio font-medium text-tinta-apoio-forte">{tipoRotulo}</span>
            ) : null}
          </div>
        ) : null}

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Identificação
        </span>
        <div className="flex flex-col gap-4">
          <LinhaDado id={id} rotulo="Apelido" valor={caminhao.apelido} />
          <LinhaDado id={id} rotulo="Placa" valor={caminhao.placa} mono />
          <LinhaDado id={id} rotulo="Tipo" valor={tipoRotulo} />
        </div>
      </div>
    </main>
  );
}

/**
 * Mesmo componente de `clientes/[id]/page.tsx`, com um adicional: `mono`
 * troca o valor por `PlacaBadge` — a placa nunca é texto comum
 * (`docs/estilo.md` linhas 52–54, 93).
 */
function LinhaDado({
  id,
  rotulo,
  valor,
  mono,
}: {
  id: string;
  rotulo: string;
  valor: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-12 rounded-campo bg-separacao px-18 py-14">
      <span className="w-96 flex-none pt-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      {valor && mono ? (
        <PlacaBadge placa={valor} variante="escura" />
      ) : valor ? (
        <span className="min-w-0 flex-1 text-campo leading-[1.35] font-semibold text-tinta [overflow-wrap:anywhere]">
          {valor}
        </span>
      ) : (
        <Link
          href={`/caminhoes/${id}/editar`}
          className="min-w-0 flex-1 text-campo font-semibold leading-[1.35] text-acao"
        >
          adicionar
        </Link>
      )}
    </div>
  );
}
