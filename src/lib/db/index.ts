import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Acesso ao banco com o filtro de empresa aplicado na camada de dados.
 *
 * O `CLAUDE.md` §3 diz que o filtro "tem que ser impossível esquecer". É este
 * arquivo que cumpre essa frase: nenhuma consulta sai daqui sem a empresa
 * definida, porque a definição não é um argumento que alguém lembra de passar
 * — é parte da mesma transação que a consulta.
 *
 * São quatro camadas, e esta é a primeira de duas que vivem no nosso código:
 *
 *   0. o cliente sem filtro não existe fora de `lib/db`
 *   1. ESTE ARQUIVO — toda operação vira `[set_config, consulta]`
 *   2. Row-Level Security no Postgres, que é quem recusa de verdade
 *   3. testes que leem o próprio schema (tarefa 6)
 *
 * A camada 2 é a única que não depende de nós acertarmos. As camadas 0 e 1
 * existem para que o erro apareça cedo e com mensagem legível, não para serem
 * a garantia.
 */

const URL_DO_BANCO = process.env.DATABASE_URL;

if (!URL_DO_BANCO) {
  throw new Error(
    "DATABASE_URL não está definida. Veja o .env.example — são três URLs, e " +
      "esta é a do papel `fretigate_app`.",
  );
}

/**
 * Um cliente por processo, não um por pedido.
 *
 * Em desenvolvimento o Next.js recarrega o módulo a cada alteração, e sem este
 * cache cada recarga abriria um pool novo até o banco recusar conexão.
 */
const cache = globalThis as unknown as { clienteBase?: PrismaClient };

const clienteBase =
  cache.clienteBase ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: URL_DO_BANCO }),
  });

if (process.env.NODE_ENV !== "production") cache.clienteBase = clienteBase;

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recusa antes de chegar ao banco, com mensagem legível.
 *
 * A política de RLS já falha fechada com nulo, vazio e valor inválido (§9), e
 * é ela a garantia. Isto aqui é só para o erro aparecer como "empresa_id
 * inválido" em vez de um erro de conversão de tipo do Postgres três camadas
 * abaixo.
 */
function exigirEmpresaId(empresaId: string): string {
  if (!FORMATO_UUID.test(empresaId)) {
    throw new Error(
      "empresa_id inválido. Ele vem SEMPRE da sessão autenticada no servidor, " +
        "nunca de URL, formulário, cabeçalho ou corpo do pedido (CLAUDE.md §3).",
    );
  }
  return empresaId;
}

/** `SELECT set_config('app.empresa_id', $1, true)` — o `true` é o que importa. */
function definirEmpresa(empresaId: string) {
  // `true` = vale só dentro desta transação. Com `false` o valor sobreviveria
  // na conexão e o próximo pedido, de OUTRA empresa, herdaria. Isso foi medido
  // na tarefa 2: com `false`, vazou em 60 de 60 leituras seguintes.
  return clienteBase.$queryRaw`SELECT set_config('app.empresa_id', ${empresaId}, true)`;
}

/**
 * O cliente escopado numa empresa.
 *
 * Cada operação vira `$transaction([set_config, operação])` — uma ida só ao
 * banco, e as duas instruções na mesma conexão física do pool. Isso foi
 * provado na tarefa 2, não suposto.
 *
 * NÃO é transação interativa aberta durante o pedido inteiro: isso prenderia
 * conexão e é frágil em serverless. Para várias consultas sob a mesma
 * configuração, use `emTransacao`.
 *
 * O `empresaId` vem **sempre da sessão autenticada no servidor** (§3). Quando
 * `lib/auth` existir (tarefa 7), ele passa a ser lido de lá e este argumento
 * some da chamada do dia a dia.
 */
export function db(empresaId: string) {
  const empresa = exigirEmpresaId(empresaId);

  return clienteBase.$extends({
    name: "filtro-de-empresa",
    query: {
      async $allOperations({ args, query }) {
        const [, resultado] = await clienteBase.$transaction([
          definirEmpresa(empresa),
          query(args),
        ]);
        return resultado;
      },
    },
  });
}

/**
 * Várias consultas sob a mesma empresa, numa transação só.
 *
 * Use quando as operações precisam ser atômicas entre si — criar o frete e o
 * título a receber, por exemplo. Para uma operação só, `db()` já é uma
 * transação e é mais barato.
 */
export function emTransacao<T>(
  empresaId: string,
  fn: (tx: Omit<PrismaClient, `$${string}`>) => Promise<T>,
): Promise<T> {
  const empresa = exigirEmpresaId(empresaId);

  return clienteBase.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.empresa_id', ${empresa}, true)`;
    return fn(tx);
  });
}

/**
 * Reverte um cadastro que não terminou (tarefa 8) — apaga a `Empresa` criada
 * por `emTransacao`, mas só se nenhum `Usuario` chegou a ser vinculado a ela.
 *
 * Chama a função de banco `reverter_cadastro_incompleto`
 * (`prisma/migrations/20260807090000_reverter_cadastro_incompleto`), que é
 * `SECURITY DEFINER`, dona de um papel próprio (`fretigate_reversor`, sem
 * `BYPASSRLS`) — a garantia de nunca apagar uma empresa com usuário não
 * depende de quem chama daqui: a função faz o próprio `set_config` e a
 * guarda `NOT EXISTS` fica escrita dentro dela.
 *
 * Não passa por `db()`/`emTransacao()` **desta conexão**: quem define
 * `app.empresa_id` é a própria função de banco, na conexão dela — não este
 * arquivo.
 *
 * ⚠️ NUNCA chame isto de dentro de um `emTransacao(...)` em andamento. As
 * duas coisas usam a mesma `clienteBase`, e o `set_config` interno da função
 * (`true` = vale só na transação atual) passaria a valer para o resto da
 * transação externa também — a mesma classe de vazamento de contexto entre
 * pedidos que a tarefa 2 mediu com `set_config(..., false)`. O uso correto é
 * sempre depois que a transação que criou a Empresa já terminou (comitada ou
 * não), nunca dentro de uma.
 */
export function reverterCadastroIncompleto(empresaId: string): Promise<number> {
  const empresa = exigirEmpresaId(empresaId);
  // `$executeRaw`, não `$queryRaw`: a função devolve `void`, e o Prisma não
  // sabe desserializar coluna de tipo `void` num `SELECT` comum.
  return clienteBase.$executeRaw`SELECT reverter_cadastro_incompleto(${empresa}::uuid)`;
}
