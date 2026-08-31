import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";

/**
 * Despesas — PROVISÓRIA, mesmo tratamento das telas de Fretes e Cobranças na
 * "casca do app" (commit `3b7561f`, 10/08/2026): fica ativa desde já, no
 * destino que já existe (a pastilha Lucro da dashboard), apontando para uma
 * tela curta que diz o que falta em vez de dar erro. **Esperado até o item
 * 11 da ordem de construção (Despesas, `docs/especificacao.md` §9)
 * substituir esta tela.**
 *
 * `docs/navegacao.md` linha 47. Item 11 (Despesa) ainda não existe no
 * schema, então esta tela nasce só com o estado vazio que explica por que o
 * Lucro da dashboard ainda não tem número — mesmo texto já decidido em
 * `docs/navegacao.md` ("Estado vazio explica que o Lucro depende dela") e
 * usado no card de Lucro em estado de convite (item 8, Tarefa 2).
 *
 * Nasceu nesta tarefa, fora do escopo original de `docs/planos/
 * item-8-dashboard.md`: o plano já linkava a pastilha Lucro para cá supondo
 * que a rota já respondia com esse mesmo estado vazio — sem esta página, o
 * toque levava a um 404 (`CLAUDE.md` §8: nunca um botão sem destino).
 * Decisão do fundador, 30/08/2026: correto manter o destino (diferente da
 * pastilha Rodagem, que não tem destino porque nenhum foi definido — aqui
 * existe um definido, só não construído). Sem "+ Nova despesa" nem lista —
 * os dois só nascem no item 11.
 *
 * **Voltar → `/`, não `/mais`** — toda tela de nível 2 tem Voltar no canto
 * superior esquerdo, levando de volta à origem (`docs/navegacao.md`,
 * "Regras de navegação"). Achado do segundo `/revisar`: a primeira versão
 * usava `/mais` por analogia com Clientes/Caminhões/Motoristas, mas hoje o
 * único caminho até aqui é a pastilha Lucro da dashboard — "Mais" ainda não
 * tem linha de Despesas (`src/app/(app)/mais/page.tsx`, nasce no item 11).
 * `/mais` não seria "voltar à origem", seria um destino novo.
 */
export default async function Pagina() {
  await exigirSessao();

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
          href="/"
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
          Despesas
        </span>
      </div>

      <div className="px-16">
        <EstadoVazio
          titulo="Ainda sem despesas"
          texto="O lucro aparece quando houver despesa lançada."
        />
      </div>
    </main>
  );
}
