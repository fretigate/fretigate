import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { formatarDocumento } from "@/lib/utils/documento";
import { nomeCaminhao } from "@/lib/utils/caminhao";

/**
 * Perfil do motorista — `docs/navegacao.md` linha 42. Nasce só com
 * identificação e Editar: resumo, histórico e "Lançar frete com este
 * motorista" dependem de `Servico` (item 3) — mesmo motivo que adiou o
 * resumo financeiro do perfil de Cliente e Caminhão. Telefone tocável
 * também fica para depois, mesma lacuna do perfil de Cliente
 * (`docs/planos/item-2-cadastros.md`, tarefa 7).
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const motorista = await buscarMotorista(sessao.empresaId, id);
  if (!motorista) notFound();

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
      </div>
    </main>
  );
}
