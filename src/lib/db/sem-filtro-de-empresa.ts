import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * A saída de emergência: acesso SEM filtro de empresa.
 *
 * ⛔ SÓ `src/lib/auth` PODE IMPORTAR ESTE ARQUIVO.
 *
 * Existe por um motivo, e é um só: no login, o Better Auth procura a pessoa
 * pelo e-mail, e nesse instante **não existe contexto de empresa por
 * definição** — só se sabe de que empresa alguém é depois de achá-lo. Nenhum
 * outro caso justifica.
 *
 * ISTO NÃO É UM CLIENTE COM PODERES DE ADMINISTRADOR.
 *
 * Ele conecta com o papel `fretigate_auth`, que:
 *
 *   - NÃO tem `BYPASSRLS` — o RLS continua ligado e valendo;
 *   - alcança `session`, `account`, `verification` e `usuario`, e nada mais;
 *   - **não enxerga `empresa`** nem nenhuma tabela de domínio. Frete, cliente,
 *     cobrança e despesa são invisíveis para ele, hoje e quando existirem.
 *
 * A permissão que ele tem em `usuario` é uma política NOMEADA
 * (`usuario_autenticacao`), visível em `pg_policies`. Foi escolhida em vez de
 * `BYPASSRLS` justamente porque dá para auditar: `BYPASSRLS` é um atributo
 * invisível que desligaria o motor para todas as tabelas de uma vez.
 *
 * Ou seja: mesmo que este arquivo vaze para onde não devia, o estrago é
 * limitado pelo banco, não pela nossa disciplina. A trava de importação
 * (tarefa 9) existe para o erro aparecer no build, não para ser a garantia.
 */

const URL_DA_AUTENTICACAO = process.env.AUTH_DATABASE_URL;

if (!URL_DA_AUTENTICACAO) {
  throw new Error(
    "AUTH_DATABASE_URL não está definida. Veja o .env.example — é a URL do " +
      "papel `fretigate_auth`, e é diferente da DATABASE_URL de propósito.",
  );
}

const cache = globalThis as unknown as { clienteDaAutenticacao?: PrismaClient };

/**
 * Cliente da autenticação. Nome longo e feio de propósito: se aparecer numa
 * revisão de código fora de `lib/auth`, tem que saltar aos olhos.
 */
export const bancoSemFiltroDeEmpresa =
  cache.clienteDaAutenticacao ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: URL_DA_AUTENTICACAO }),
  });

if (process.env.NODE_ENV !== "production") {
  cache.clienteDaAutenticacao = bancoSemFiltroDeEmpresa;
}
