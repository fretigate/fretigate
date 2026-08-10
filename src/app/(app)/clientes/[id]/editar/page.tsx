import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { buscarCliente } from "@/lib/servicos/clientes";
import { FormularioCliente } from "../../FormularioCliente";

/** Edição de cliente — `docs/navegacao.md` linha 40: chega do "Editar" do perfil. */
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

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="flex items-center gap-10 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <Link
          href={`/clientes/${id}`}
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
          Editar cliente
        </span>
      </div>

      <FormularioCliente cliente={cliente} prazoPadraoEmpresa={empresa!.prazo_padrao_dias} />
    </main>
  );
}
