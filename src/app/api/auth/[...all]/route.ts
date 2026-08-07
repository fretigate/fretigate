import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * O endereço por onde o navegador fala com a autenticação.
 *
 * Um arquivo só atende a todas as rotas da biblioteca — entrar, sair,
 * recuperar senha, verificar e-mail. O `[...all]` é o que faz `/api/auth/*`
 * inteiro cair aqui.
 *
 * Não há lógica nossa neste arquivo, e isso é proposital: regra que morasse
 * aqui valeria só para quem chega pela rede, e a mesma operação chamada de
 * dentro do servidor passaria por fora dela. O que precisa valer sempre está
 * na configuração, em `lib/auth`.
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
