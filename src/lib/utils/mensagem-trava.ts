/**
 * A mensagem de travado (CLAUDE.md §4 / docs/especificacao.md § Trava de
 * tentativas) para os fluxos que falam com o Better Auth pelo navegador —
 * Entrar, Esqueci a senha, Redefinir senha (`src/lib/auth/cliente.ts`), mais
 * "Reenviar e-mail" da dashboard (`src/app/(app)/BotaoReenviarEmail.tsx`,
 * item 8, Tarefa 2, 30/08/2026).
 *
 * O prazo exato vem do cabeçalho `X-Retry-After` da resposta 429 do próprio
 * limitador (`node_modules/better-auth/dist/api/rate-limiter`). Sem ele —
 * pedido que nunca chegou a responder, por exemplo — cai numa mensagem sem
 * horário, nunca um erro técnico.
 */

export function formatarHorarioFortaleza(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

const MENSAGEM_SEM_HORARIO = "Muitas tentativas por aqui. Tenta de novo em alguns minutos.";

export function mensagemDeTrava(retryAfterSegundos: string | null): string {
  const segundos = retryAfterSegundos ? Number(retryAfterSegundos) : NaN;
  if (!Number.isFinite(segundos) || segundos <= 0) return MENSAGEM_SEM_HORARIO;

  const horario = formatarHorarioFortaleza(new Date(Date.now() + segundos * 1000));
  return `Muitas tentativas por aqui. Você pode tentar de novo às ${horario}.`;
}
