import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { resumoDoCaminhao } from "@/lib/servicos/servicos";
import { listarServicosDoCaminhao } from "@/lib/servicos/titulos";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { PlacaBadge } from "@/components/ui/PlacaBadge";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { ChipDePeriodoPerfil } from "@/components/ui/ChipDePeriodoPerfil";
import { ResumoDoPerfil } from "@/components/ui/ResumoDoPerfil";
import { HistoricoDoPerfil } from "@/components/ui/HistoricoDoPerfil";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { resolverPeriodoDoPerfil, rotuloDoPeriodo } from "@/lib/utils/periodo";

/**
 * Perfil do caminhão — `docs/navegacao.md` linha 42. Segundo dos três
 * commits da Tarefa 6 do item 4
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`): ganha resumo de km/R$
 * por km no período e histórico, reaproveitando o mesmo mecanismo de período
 * e os mesmos componentes (`ChipDePeriodoPerfil`, `ResumoDoPerfil`,
 * `HistoricoDoPerfil`) do perfil do cliente, primeiro commit desta tarefa.
 *
 * **Km e R$/km só aparecem com km preenchido no período** —
 * `docs/especificacao.md` §4.7. Sem isso, um único convite substitui os
 * dois números (`resumo.kmPeriodoMetros === null`), em vez de cada um
 * mostrar seu próprio convite lado a lado — os dois nascem juntos e morrem
 * juntos em `resumoDoCaminhao`, então duplicar o mesmo aviso em duas células
 * seria redundante.
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

  const caminhao = await buscarCaminhao(sessao.empresaId, id);
  if (!caminhao) notFound();

  const { periodo, janelaEfetiva } = resolverPeriodoDoPerfil(janelaParam, de, ate);
  const [resumo, historico] = await Promise.all([
    resumoDoCaminhao(sessao.empresaId, id, periodo),
    listarServicosDoCaminhao(sessao.empresaId, id, periodo),
  ]);

  const rotuloPorTipo = Object.fromEntries(TIPOS_VEICULO.map((t) => [t.valor, t.rotulo]));
  const tipoRotulo = caminhao.tipo ? rotuloPorTipo[caminhao.tipo] : null;

  const numeros =
    resumo.kmPeriodoMetros === null
      ? [
          {
            rotulo: "Km e R$/km",
            convite: "Preencha o km ao lançar para ver o R$/km",
          },
        ]
      : [
          {
            rotulo: "Km no período",
            valor: `${(resumo.kmPeriodoMetros / 1000).toLocaleString("pt-BR")} km`,
          },
          {
            rotulo: "R$/km",
            valor: `R$ ${resumo.rsPorKm!.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
        ];

  // Cobertura parcial só quando já existe km para mostrar — no estado de
  // convite, o próprio convite já diz "preencha o km", e repetir "0 de N
  // fretes com km" ao lado seria o mesmo aviso duas vezes.
  const notaCobertura =
    resumo.kmPeriodoMetros !== null && resumo.fretesComKm < resumo.fretesNoPeriodo
      ? `${resumo.fretesComKm} de ${resumo.fretesNoPeriodo} fretes com km`
      : undefined;

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

        <ResumoDoPerfil
          chipPeriodo={
            <ChipDePeriodoPerfil
              caminhoBase={`/caminhoes/${id}`}
              hoje={diaEmFortaleza(new Date())}
              janelaAtual={janelaEfetiva}
              rotuloPeriodo={rotuloDoPeriodo(janelaEfetiva, de, ate) ?? "Este mês"}
            />
          }
          numeros={numeros}
          nota={notaCobertura}
        />

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Identificação
        </span>
        <div className="flex flex-col gap-4">
          <LinhaDePerfil href={`/caminhoes/${id}/editar`} rotulo="Apelido" valor={caminhao.apelido} />
          <LinhaDePerfil href={`/caminhoes/${id}/editar`} rotulo="Placa" valor={caminhao.placa} mono />
          <LinhaDePerfil href={`/caminhoes/${id}/editar`} rotulo="Tipo" valor={tipoRotulo} />
        </div>

        <div className="pt-26">
          <PilulaEmLinha href={`/fretes/novo?caminhao=${id}`}>
            Lançar frete com este caminhão
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
