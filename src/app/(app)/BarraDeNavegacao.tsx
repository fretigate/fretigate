"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Barra de navegação — `docs/componentes.md` §10, ícones e medidas de
 * `docs/estilo.md`. Global e permanente dentro da sessão (o layout que a
 * renderiza é quem garante isso).
 *
 * A barra é estrutura fixa de cinco posições — ao contrário de uma lista,
 * tirar um item muda a geometria (a folga de rolagem de toda tela é medida a
 * partir do topo do (+)) — e um item desabilitado exigiria um tratamento
 * visual que a folha de estilo não define. É por isso que Fretes e Cobranças
 * puderam apontar para telas provisórias sem alterar a barra (decisão do
 * fundador, 09/08/2026, quando nenhuma das duas existia de verdade ainda) —
 * e é o mesmo motivo estrutural que, em 13/09/2026, fez esta tarefa criar um
 * hub ("Financeiro") em vez de remover ou desdobrar uma posição. **As duas
 * telas citadas em 09/08/2026 não são mais provisórias há muito tempo, e
 * "Cobranças" nem é mais o rótulo do item** (virou "Financeiro" nesta
 * mesma data) — o parágrafo ficou preso ao caso que motivou a regra, não à
 * regra em si (`CLAUDE.md` §2).
 */

const ATIVO = "text-verde-claro";
const INATIVO = "text-white/50";

function estaAtivo(pathname: string, rota: string) {
  return rota === "/" ? pathname === "/" : pathname.startsWith(rota);
}

export function BarraDeNavegacao() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed z-40 flex h-57 rounded-pilula bg-tinta px-4"
      style={{
        left: "var(--margem-lateral-esquerda)",
        right: "var(--margem-lateral-direita)",
        bottom: "var(--ancora-barra)",
      }}
      aria-label="Navegação principal"
    >
      <ItemBarra
        href="/"
        rotulo="Início"
        ativo={estaAtivo(pathname, "/")}
        largura={19}
      >
        <path d="M5.34 10.56 12 5.16l6.66 5.4v7.38a0.9 0.9 0 0 1 -0.9 0.9h-3.24v-4.68H9.48v4.68H6.24a0.9 0.9 0 0 1 -0.9 -0.9V10.56Z" />
      </ItemBarra>

      <ItemBarra
        href="/fretes"
        rotulo="Fretes"
        ativo={estaAtivo(pathname, "/fretes")}
        largura={21}
      >
        <path d="M4.309 7.254h9.164v7.691H4.309zM13.473 9.873h3.273l2.946 2.782v2.291h-6.218z" />
        <circle cx="7.746" cy="16.746" r="1.636" />
        <circle cx="16.255" cy="16.746" r="1.636" />
      </ItemBarra>

      {/* (+) — abre Lançar frete de qualquer lugar (`docs/navegacao.md`
          linha 88). Era provisório apontando para `/clientes/novo`
          (`docs/planos/item-2-cadastros.md`, tarefa 4) até a Tarefa 2 do
          item 3 construir a tela de lançamento. */}
      <Link
        href="/fretes/novo"
        className="flex flex-1 flex-col items-center justify-end gap-5 pb-11"
      >
        <span className="-mt-[17.5px] flex h-48 w-48 items-center justify-center rounded-pilula bg-acao text-white active:bg-acao-pressionada">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 6.115v11.769M6.115 12h11.769" />
          </svg>
        </span>
        <span className="text-etiqueta font-bold leading-none text-white">Novo</span>
      </Link>

      {/* "Financeiro" desde 13/09/2026 (`docs/planos/
          financeiro-unifica-cobrancas-e-despesas.md`, Opção A) — antes ia
          direto para "/cobrancas"; agora abre o hub, que leva para Cobranças
          e Despesas. Ícone reaproveitado, pergunta ao Design em aberto (ver
          o comentário de `financeiro/page.tsx`). */}
      <ItemBarra
        href="/financeiro"
        rotulo="Financeiro"
        ativo={estaAtivo(pathname, "/financeiro")}
      >
        <path d="M5.16 6.24h13.68v9.18a0.9 0.9 0 0 1 -0.9 0.9H6.06a0.9 0.9 0 0 1 -0.9 -0.9V6.24ZM8.04 9.3h7.92M8.04 12.36h4.5" />
      </ItemBarra>

      <ItemBarra href="/mais" rotulo="Mais" ativo={estaAtivo(pathname, "/mais")}>
        <path d="M6.06 8.4h11.88M6.06 12h11.88M6.06 15.6h7.56" />
      </ItemBarra>
    </nav>
  );
}

function ItemBarra({
  href,
  rotulo,
  ativo,
  largura = 20,
  children,
}: {
  href: string;
  rotulo: string;
  ativo: boolean;
  largura?: number;
  children: ReactNode;
}) {
  const cor = ativo ? ATIVO : INATIVO;

  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-end gap-5 pb-11 ${cor}`}
    >
      <svg
        width={largura}
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
      <span
        className={`text-etiqueta leading-none ${ativo ? "font-bold" : "font-semibold"}`}
      >
        {rotulo}
      </span>
    </Link>
  );
}
