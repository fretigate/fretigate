/**
 * Link público de aceite de convite (item 10, Tarefa 4) — usado em três
 * lugares (`FormularioConvite.tsx`, `ListaUsuarios.tsx` para "Reenviar" e
 * "Ver o que ela recebe"), então mora aqui em vez de repetido em cada um
 * (`CLAUDE.md` §8). Sem `"server-only"` de propósito — este arquivo
 * precisa ser importável tanto do servidor (`page.tsx`, `acoes.ts`) quanto
 * do cliente (`FormularioConvite.tsx`, `ListaUsuarios.tsx`).
 *
 * **Falha alto no carregamento, achado do segundo `/revisar`** — a
 * primeira versão deixava `APP_URL` chegar `undefined` em silêncio, e o
 * link quebrado (`undefined/aceitar-convite?token=...`) iria para o
 * WhatsApp de quem foi convidado sem ninguém perceber. Mesmo padrão de
 * `src/lib/auth/index.ts` para a mesma variável (`CLAUDE.md` §5).
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!APP_URL) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL não está definida. É dela que sai o link de aceite " +
      "dentro da mensagem de convite por WhatsApp.",
  );
}

export function linkDeAceiteDoConvite(token: string): string {
  return `${APP_URL}/aceitar-convite?token=${token}`;
}

/**
 * Mensagem única para token ausente, inexistente, já aceito ou cancelado —
 * `docs/planos/item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 4",
 * item 3: distinguir o motivo revelaria informação a quem não deveria ter
 * (ex.: confirmar que um telefone específico já tem convite aceito). Com
 * saída explícita, achado do fundador ao aprovar o plano — nunca deixa a
 * pessoa parada numa tela que só nega.
 */
export const MENSAGEM_CONVITE_INDISPONIVEL =
  "Este convite não está mais disponível. Peça a quem te convidou para mandar um novo.";
