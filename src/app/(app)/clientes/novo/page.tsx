import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { FormularioCliente } from "../FormularioCliente";

/**
 * Cadastro de cliente — `docs/navegacao.md` linha 40: chega do "+ Novo" da
 * lista, do (+) da barra (`BarraDeNavegacao.tsx`, provisório até o item 3) e
 * de "Cadastrar '{busca}'" na lista sem resultado.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string }>;
}) {
  const sessao = await exigirSessao();
  const { nome } = await searchParams;

  const empresa = await db(sessao.empresaId).empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { prazo_padrao_dias: true },
  });

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="flex items-center gap-10 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
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
        <span
          className="min-w-0 flex-1 text-titulo-modelo font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Novo cliente
        </span>
      </div>

      <FormularioCliente
        prazoPadraoEmpresa={empresa!.prazo_padrao_dias}
        nomeInicial={nome}
      />
    </main>
  );
}
