import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarMotoristas } from "@/lib/servicos/motoristas";
import { estatisticasPorMotorista } from "@/lib/servicos/servicos";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { ListaMotoristas } from "./ListaMotoristas";

/**
 * Motoristas — lista. `docs/navegacao.md` linha 42: chega de Mais, a linha
 * leva ao perfil, "+ Novo" leva ao cadastro. Mesma casca de `clientes/page.tsx`
 * e `caminhoes/page.tsx` (tarefas 5 e 6) — tela de nível 2.
 *
 * `estatisticasPorMotorista` busca em paralelo com `listarMotoristas`
 * (item 4, Tarefa 5) — mesmo padrão de `clientes/page.tsx`.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const [motoristas, estatisticas] = await Promise.all([
    listarMotoristas(sessao.empresaId),
    estatisticasPorMotorista(sessao.empresaId),
  ]);

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
          Motoristas
        </span>
        {/* Mesma condição de `clientes/page.tsx`: some quando a lista está
            totalmente vazia — o estado vazio já tem o próprio principal. */}
        {motoristas.length > 0 ? (
          <PilulaCabecalho href="/motoristas/novo">+ Novo</PilulaCabecalho>
        ) : null}
      </div>

      <div className="px-16">
        <ListaMotoristas
          motoristas={motoristas.map((m) => ({
            id: m.id,
            nome: m.nome,
            veiculoHabitual: m.veiculo_habitual
              ? nomeCaminhao(m.veiculo_habitual) + (m.veiculo_habitual.arquivado_em ? " (arquivado)" : "")
              : null,
            fretes: estatisticas.get(m.id)?.fretes ?? 0,
            valorTransportadoCentavos: estatisticas.get(m.id)?.valorTransportadoCentavos ?? 0,
          }))}
        />
      </div>
    </main>
  );
}
