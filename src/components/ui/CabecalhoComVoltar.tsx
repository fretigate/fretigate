import { BotaoVoltar } from "./BotaoVoltar";

/**
 * Cabeçalho de toda tela de Nível 2 — `BotaoVoltar` + título, com a área
 * segura do topo já embutida. Extraído em 18/09/2026 (item 13, Tarefa 3,
 * continuação, achado do `/revisar`) de três cópias idênticas
 * (`/assinatura-vencida`, `/limite-do-gratuito`, `/planos`) — `CLAUDE.md`
 * §8, "Componente existe uma vez... Proibido copiar componente".
 */
export function CabecalhoComVoltar({ href, titulo }: { href: string; titulo: string }) {
  return (
    <div className="flex items-center gap-10 pb-4" style={{ paddingTop: "var(--area-segura-topo)" }}>
      <BotaoVoltar href={href} />
      <span
        className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        {titulo}
      </span>
    </div>
  );
}
