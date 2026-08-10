import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarCaminhoes } from "@/lib/servicos/caminhoes";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { ListaCaminhoes } from "./ListaCaminhoes";

/**
 * Caminhões — lista. `docs/navegacao.md` linha 41: chega de Mais, a linha
 * leva ao perfil, "+ Novo" leva ao cadastro. Mesma casca de `clientes/page.tsx`
 * (tarefa 5) — tela de nível 2.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const caminhoes = await listarCaminhoes(sessao.empresaId);
  const rotuloPorTipo = Object.fromEntries(TIPOS_VEICULO.map((t) => [t.valor, t.rotulo]));

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
          href="/mais"
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
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Caminhões
        </span>
        {/* Mesma condição de `clientes/page.tsx`: some quando a lista está
            totalmente vazia — o estado vazio já tem o próprio principal. */}
        {caminhoes.length > 0 ? (
          <PilulaCabecalho href="/caminhoes/novo">+ Novo</PilulaCabecalho>
        ) : null}
      </div>

      <div className="px-16">
        <ListaCaminhoes
          caminhoes={caminhoes.map((c) => ({
            id: c.id,
            apelido: c.apelido,
            placa: c.placa,
            tipo: c.tipo ? rotuloPorTipo[c.tipo] : null,
          }))}
        />
      </div>
    </main>
  );
}
