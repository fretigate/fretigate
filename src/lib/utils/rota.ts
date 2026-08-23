/**
 * "Origem → Destino" — só o que existir; nenhum dos dois é obrigatório no
 * Lançamento. Extraído de `fretes/page.tsx` (Tarefa 2) para o histórico do
 * perfil (Tarefa 6) reaproveitar, em vez de duplicar (`CLAUDE.md` §8).
 */
export function formatarRota(origem: string | null, destino: string | null): string | null {
  if (origem && destino) return `${origem} → ${destino}`;
  return origem || destino || null;
}
