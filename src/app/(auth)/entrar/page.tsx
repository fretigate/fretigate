import type { Metadata } from "next";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata: Metadata = {
  title: "Entrar — FretiGate",
};

// docs/componentes.md linha 408. Sem barra de navegação — mesma lista
// fechada do CLAUDE.md §8 de `src/app/(auth)/criar-conta/page.tsx`.
export default function Page() {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      <h1
        className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        Entrar
      </h1>
      <FormularioEntrar />
    </main>
  );
}
