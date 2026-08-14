import type { Metadata } from "next";
import { Marca } from "@/components/auth/Marca";
import { PedidoDeRecuperacao } from "@/components/auth/PedidoDeRecuperacao";

export const metadata: Metadata = {
  title: "Esqueci a senha — FretiGate",
};

// docs/componentes.md, telas "Esqueci a senha" e "Recuperação enviada"
// (exportação do Design de 07/08/2026, tarefa 8 fatia 2): campo E-MAIL DA
// CONTA, principal Mandar link novo, secundária Voltar pra entrada — e
// depois de mandado, a confirmação com o aviso de spam, o mesmo principal
// para reenviar, a pílula Usar outro e-mail e a mesma Voltar pra entrada.
// As duas telas são os dois estados de `PedidoDeRecuperacao`. Sem barra —
// mesma lista fechada do CLAUDE.md §8.
export default function Page() {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      <Marca />
      <h1
        className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        Esqueci a senha
      </h1>
      <PedidoDeRecuperacao />
    </main>
  );
}
