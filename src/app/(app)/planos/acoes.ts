"use server";

import { comoDonoSemPortao } from "@/lib/auth/acao";
import { criarSolicitacaoUpgrade } from "@/lib/servicos/pagamentos";
import { linkDeCheckout } from "@/lib/utils/pagamento";

/**
 * Gera o link de checkout de um plano, com o `SolicitacaoUpgrade` já
 * criado — item 13, Tarefa 3, continuação (`docs/planos/
 * item-13-tarefa-3-tela-de-planos.md`, achado do `/revisar`, 18/09/2026).
 *
 * **`comoDonoSemPortao`, não `comoDono`** (`src/lib/auth/acao.ts`) — a
 * segunda exceção nomeada do envelope, mesma ideia de `comoUsuarioLeitura`:
 * `comoDono` bloqueia toda escrita quando `status_assinatura` é `vencida`/
 * `encerrada` (o portão de escrita, item 13 Tarefa 2), e é exatamente quem
 * está `vencida` que mais precisa conseguir gerar este link, para poder
 * pagar e sair desse estado — usar `comoDono` aqui trancaria a própria
 * porta de saída.
 */
export const gerarLinkDeCheckoutAction = comoDonoSemPortao(
  async (
    sessao,
    plano: "mensal" | "anual",
  ): Promise<{ ok: true; url: string } | { ok: false; erro: string }> => {
    try {
      const { token } = await criarSolicitacaoUpgrade(sessao.empresaId);
      return { ok: true, url: linkDeCheckout(plano, token) };
    } catch {
      return { ok: false, erro: "Não deu para gerar o link agora." };
    }
  },
);
