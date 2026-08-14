import type { Metadata } from "next";
import { Marca } from "@/components/auth/Marca";
import { FormularioCriarConta } from "./FormularioCriarConta";

export const metadata: Metadata = {
  title: "Criar conta — FretiGate",
};

// docs/componentes.md linha 285: campos, botões e chips desta tela.
// Sem barra de navegação — quem abre esta tela ainda não está dentro do app.
// Por isso NÃO reserva a folga de rolagem de `--folga-rolagem` (CLAUDE.md
// §8: essa folga é só para tela COM barra) — usa margem inferior padrão.
//
// Margem lateral 20px, não o token `--margem-lateral` (esse é a fórmula de
// área segura da barra flutuante, outra regra) — docs/estilo.md linha 117:
// "16 nas telas com cartão de topo, 20 nas com título de página". Esta tela
// tem título de página.
export default function Page() {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      <Marca />
      {/* docs/estilo.md linha 80 — Título de tela: 20/1.1, 700, wdth 96%,
          ls -.01em, tinta #3C443E. Nenhum outro título existe no código
          ainda para copiar o padrão de `wdth` — primeira vez aplicando. */}
      <h1
        className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        Criar conta
      </h1>
      <FormularioCriarConta />
    </main>
  );
}
