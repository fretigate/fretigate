import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import { resumoDoMotorista } from "@/lib/servicos/servicos";
import { listarServicosDoMotorista } from "@/lib/servicos/titulos";
import { Botao } from "@/components/ui/Botao";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { ChipDePeriodoPerfil } from "@/components/ui/ChipDePeriodoPerfil";
import { ResumoDoPerfil } from "@/components/ui/ResumoDoPerfil";
import { HistoricoDoPerfil } from "@/components/ui/HistoricoDoPerfil";
import { formatarDocumento } from "@/lib/utils/documento";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { resolverPeriodoDoPerfil, rotuloDoPeriodo } from "@/lib/utils/periodo";

/**
 * Perfil do motorista — `docs/navegacao.md` linha 43. Terceiro dos três
 * commits da Tarefa 6 do item 4
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`): ganha resumo de
 * fretes/valor transportado no período e histórico, reaproveitando o mesmo
 * mecanismo de período e os mesmos componentes (`ChipDePeriodoPerfil`,
 * `ResumoDoPerfil`, `HistoricoDoPerfil`) dos perfis de cliente e caminhão.
 *
 * **"Lançar frete com este motorista" é a ação principal da tela**
 * (`docs/componentes.md` linha 411, variante 01) — diferente da pílula em
 * linha usada nos outros dois perfis.
 *
 * Telefone tocável fica para depois — não é só a pendência de toque:
 * `telefone` é texto livre, sem máscara nem validação, e abrir a conversa
 * exige decidir formato do número e tratamento de telefone inválido, a
 * mesma decisão que "Enviar ordem no WhatsApp" (item 5) vai precisar.
 * Registrado com o custo em `docs/especificacao.md` §9 ("Três exigências
 * para quando os itens 5 e 6 chegarem", item 3) — decisão do fundador,
 * 22/08/2026: resolver uma vez lá, não decidir de novo aqui.
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

  const motorista = await buscarMotorista(sessao.empresaId, id);
  if (!motorista) notFound();

  const { periodo, janelaEfetiva } = resolverPeriodoDoPerfil(janelaParam, de, ate);
  const [resumo, historico] = await Promise.all([
    resumoDoMotorista(sessao.empresaId, id, periodo),
    listarServicosDoMotorista(sessao.empresaId, id, periodo),
  ]);

  let caminhaoHabitual: string | null = null;
  if (motorista.veiculo_habitual) {
    caminhaoHabitual = nomeCaminhao(motorista.veiculo_habitual);
    if (motorista.veiculo_habitual.arquivado_em) caminhaoHabitual += " (arquivado)";
  }

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
          href="/motoristas"
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
          Motorista
        </span>
        <PilulaCabecalho href={`/motoristas/${id}/editar`}>Editar</PilulaCabecalho>
      </div>

      <div className="flex flex-col px-20">
        <span
          className="text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          {motorista.nome}
        </span>

        <ResumoDoPerfil
          chipPeriodo={
            <ChipDePeriodoPerfil
              caminhoBase={`/motoristas/${id}`}
              hoje={diaEmFortaleza(new Date())}
              janelaAtual={janelaEfetiva}
              rotuloPeriodo={rotuloDoPeriodo(janelaEfetiva, de, ate) ?? "Este mês"}
            />
          }
          numeros={[
            { rotulo: "Fretes no período", valor: `${resumo.fretesNoPeriodo}` },
            {
              rotulo: "Valor transportado",
              valor: `R$ ${formatarCentavos(resumo.valorTransportadoNoPeriodo)}`,
            },
          ]}
        />

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Identificação
        </span>
        <div className="flex flex-col gap-4">
          <LinhaDePerfil href={`/motoristas/${id}/editar`} rotulo="Telefone" valor={motorista.telefone} />
          <LinhaDePerfil
            href={`/motoristas/${id}/editar`}
            rotulo="Documento"
            valor={motorista.documento ? formatarDocumento(motorista.documento) : null}
          />
          <LinhaDePerfil
            href={`/motoristas/${id}/editar`}
            rotulo="Caminhão habitual"
            valor={caminhaoHabitual}
          />
        </div>

        <div className="pt-26">
          <Botao variante="principal" href={`/fretes/novo?motorista=${id}`}>
            Lançar frete com este motorista
          </Botao>
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
