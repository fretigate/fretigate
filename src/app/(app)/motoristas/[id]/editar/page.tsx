import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import { listarCaminhoes } from "@/lib/servicos/caminhoes";
import { FormularioMotorista } from "../../FormularioMotorista";

/** Edição de motorista — `docs/navegacao.md` linha 42: chega do "Editar" do perfil. */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const [motorista, caminhoes] = await Promise.all([
    buscarMotorista(sessao.empresaId, id),
    listarCaminhoes(sessao.empresaId),
  ]);
  if (!motorista) notFound();

  // O caminhão habitual atual entra na lista mesmo se foi arquivado depois
  // do vínculo — para não sumir uma escolha que ninguém desfez
  // (`docs/planos/item-2-cadastros.md`, tarefa 7). `FormularioMotorista`
  // marca visualmente qual está arquivado.
  const habitual = motorista.veiculo_habitual;
  const opcoes =
    habitual && !caminhoes.some((c) => c.id === habitual.id)
      ? [...caminhoes, habitual]
      : caminhoes;

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="flex items-center gap-10 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <Link
          href={`/motoristas/${id}`}
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
        <span
          className="min-w-0 flex-1 text-titulo-modelo font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Editar motorista
        </span>
      </div>

      <FormularioMotorista motorista={motorista} caminhoes={opcoes} />
    </main>
  );
}
