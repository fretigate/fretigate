"use client";

import { useState } from "react";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { authClient } from "@/lib/auth/cliente";
import { mensagemDeTrava } from "@/lib/utils/mensagem-trava";

/**
 * "Reenviar e-mail" — pendência "E-mail ainda não confirmado" da dashboard
 * (item 8, `docs/planos/item-8-dashboard.md`, Tarefa 2). Chama
 * `authClient.sendVerificationEmail` direto no navegador, nunca Server
 * Action — é o mesmo motivo já documentado em `src/lib/auth/cliente.ts`: o
 * rate limit do Better Auth (`customRules["/send-verification-email"]`, 3
 * por 5 minutos) só liga quando o pedido passa pelo roteador HTTP de
 * verdade. Mesmo padrão de erro de `FormularioEntrar.tsx` (rede, 429).
 */
export function BotaoReenviarEmail({ email }: { email: string }) {
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | undefined>();

  async function reenviar() {
    if (carregando) return;
    setCarregando(true);
    setMensagem(undefined);

    let retryAfter: string | null = null;
    let error: Awaited<ReturnType<typeof authClient.sendVerificationEmail>>["error"];
    try {
      ({ error } = await authClient.sendVerificationEmail(
        { email },
        {
          onResponse(contexto) {
            retryAfter = contexto.response.headers.get("X-Retry-After");
          },
        },
      ));
    } catch {
      setCarregando(false);
      setMensagem("Sem conexão com o servidor. Tenta de novo.");
      return;
    }

    setCarregando(false);
    if (!error) {
      setMensagem("E-mail enviado. Confere sua caixa de entrada.");
      return;
    }
    setMensagem(error.status === 429 ? mensagemDeTrava(retryAfter) : "Não deu para enviar agora. Tenta de novo.");
  }

  return (
    <div className="flex flex-col gap-8">
      <PilulaEmLinha type="button" carregando={carregando} onClick={reenviar}>
        Reenviar e-mail
      </PilulaEmLinha>
      {mensagem ? (
        <span className="text-total-contextual font-medium text-tinta-apoio">{mensagem}</span>
      ) : null}
    </div>
  );
}
