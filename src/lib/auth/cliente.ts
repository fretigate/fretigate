import { createAuthClient } from "better-auth/client";

/**
 * O lado do navegador da autenticação — Entrar, Esqueci a senha e Redefinir
 * senha (tarefa 8, fatia 2), mais "Reenviar e-mail" da dashboard
 * (`BotaoReenviarEmail.tsx`, item 8, Tarefa 2, 30/08/2026).
 *
 * Por que estes fluxos falam com o servidor por aqui (fetch real, no
 * navegador) e não por Server Action, ao contrário do cadastro
 * (`src/lib/servicos/cadastro.ts`): o limite de tentativas do Better Auth
 * (`src/lib/auth/index.ts`, `rateLimit.customRules`) só liga quando o pedido
 * passa pelo roteador de verdade (`/api/auth/[...all]`) — é lá que o IP é
 * lido. Uma chamada de servidor a `auth.api.signInEmail(...)` (como a que o
 * cadastro faz para logar sozinho depois de criar a conta) NUNCA passa pelo
 * roteador, então NUNCA é travada, não importa o que se passe para ela.
 * Conferido no código da biblioteca antes de escolher este caminho.
 *
 * Sem `baseURL`: o padrão é `/api/auth`, relativo à própria origem — não
 * precisa do `NEXT_PUBLIC_APP_URL` aqui, e um pedido relativo nunca escapa
 * para outro domínio.
 */
export const authClient = createAuthClient();
