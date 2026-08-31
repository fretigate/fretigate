import "server-only";
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

/**
 * Registra um recebimento e ajusta o status do título, atomicamente — chama
 * a função de banco `registrar_recebimento` (migration
 * `20260826070000_recebimento_e_derivacao_de_titulo`, item 6, Tarefa 3).
 *
 * **Diferente de `reverterCadastroIncompleto`, esta função NÃO é `SECURITY
 * DEFINER`** — ela roda com o privilégio de quem chama (`fretigate_app`, que
 * já tem tudo que precisa: `SELECT`/`UPDATE` em `titulo_receber`,
 * `SELECT`/`INSERT` em `recebimento`) e RLS continua valendo dentro dela.
 * Por isso, ao contrário daquela, esta chamada PRECISA definir
 * `app.empresa_id` antes — é o mesmo `[definirEmpresa, query]` de `db()`, só
 * que com `$executeRaw` no lugar de uma operação do Prisma Client. É essa
 * definição que faz um `tituloId` de outra empresa ser recusado pela própria
 * política de `titulo_receber` (a função nem encontra a linha), não por uma
 * checagem extra aqui.
 *
 * **A garantia contra dois recebimentos concorrentes somarem além do valor
 * do título mora inteira dentro da função** (`FOR UPDATE` na linha do
 * título, pela duração da transação) — `src/lib/servicos/titulos.ts` não
 * sabe SQL (`CLAUDE.md` §3: "SQL cru só em `src/lib/db` e em `/tests`"), só
 * chama isto depois de já ter confirmado, com `db(empresaId)`, que o título
 * existe, pertence à empresa e está aberto. Essa checagem prévia é só para a
 * mensagem de erro ficar boa no caso comum; quem garante de verdade,
 * inclusive sob corrida, é a função.
 *
 * Lança se a função de banco recusar (título inválido/não aberto, ou valor
 * que estoura o saldo) — `titulos.ts` traduz qualquer exceção daqui para a
 * mensagem certa, porque a essa altura as checagens amigáveis já passaram.
 */
export async function registrarRecebimentoAtomico(
  empresaId: string,
  dados: {
    id: string;
    tituloId: string;
    valor: number;
    data: Date;
    forma: string | null;
    usuarioId: string;
  },
): Promise<void> {
  const empresa = exigirEmpresaId(empresaId);
  await clienteBase.$transaction([
    definirEmpresa(empresa),
    clienteBase.$executeRaw`SELECT registrar_recebimento(
      ${dados.id}::uuid, ${dados.tituloId}::uuid, ${dados.valor}::integer,
      ${dados.data}::timestamptz, ${dados.forma}, ${dados.usuarioId}, ${empresa}::uuid
    )`,
  ]);
}

/** O que `localizar_convite_por_token` devolve — só o mínimo para achar a empresa. */
type LinhaConviteLocalizado = {
  id: string;
  empresa_id: string;
  telefone: string;
  nome: string;
  papel: "dono" | "operador";
  status: "pendente" | "aceito" | "cancelado";
};

/**
 * Acha um `Convite` pelo token — ANTES de saber a empresa (item 10, Tarefa 1
 * — `docs/planos/item-10-configuracoes-conta-e-usuarios.md`).
 *
 * `Convite` é tabela de domínio, isolada como qualquer outra por
 * `convite_isolamento`; sem saber a empresa não há `app.empresa_id` para
 * definir, e `db(empresaId)` exige exatamente isso. Chama
 * `localizar_convite_por_token` (migration `20260831060000_convite_e_patio_do_frete`),
 * `SECURITY DEFINER`, dona de um papel próprio (`fretigate_convite`, sem
 * `BYPASSRLS`, sem `LOGIN`) com uma política só sua (`convite_busca_por_token`,
 * `USING (true)`) — mesmo mecanismo de `usuario_autenticacao`
 * (`src/lib/db/sem-filtro-de-empresa.ts`), só que preso dentro da função: ela
 * devolve só os campos de `LinhaConviteLocalizado`, nunca a linha inteira
 * (sem `arquivado_em`, sem `enviado_em`/`aceito_em`), e nenhuma tabela de
 * autenticação ganha alcance novo. Decisão do fundador,
 * 31/08/2026, depois de medir três caminhos — ver o comentário do `model
 * Convite` em `prisma/schema.prisma`.
 *
 * **A função só recusa o que impede achar o convite** — token que não
 * existe (`null` aqui). Convite vencido, já aceito ou cancelado é decisão de
 * `src/lib/servicos/usuarios.ts` (`aceitarConvite`), não desta função: regra
 * de negócio mora em `src/lib/servicos`, nunca em SQL.
 *
 * Não passa por `exigirEmpresaId`: não há empresa nenhuma para exigir aqui —
 * é exatamente o que esta função existe para descobrir.
 */
export async function localizarConvitePorToken(
  token: string,
): Promise<LinhaConviteLocalizado | null> {
  const linhas = await clienteBase.$queryRaw<LinhaConviteLocalizado[]>`
    SELECT id, empresa_id, telefone, nome, papel, status
      FROM localizar_convite_por_token(${token})`;
  return linhas[0] ?? null;
}

/**
 * Fecha o pool de conexões do `clienteBase` — para processo CURTO que usa
 * `db()`/`emTransacao()` e depois termina (comando de terminal, suíte de
 * teste), nunca para o servidor em execução (lá o processo é longo, e o pool
 * existe exatamente para ficar aberto).
 *
 * O comentário da linha 34 ("um cliente por processo, não um por pedido")
 * explica por que o cliente é cacheado — não por que ele nunca precisa
 * fechar. Processo servidor nunca chama isto; processo curto SEMPRE deveria.
 * Esperado (não medido): sem isto, a conexão fica presa até o sistema
 * operacional ou o pooler notarem que o processo morreu — o que pode levar
 * bem mais que a duração do próprio comando.
 *
 * Achado em 18/08/2026, investigando suíte local instável
 * (`docs/diario.md`): nenhum processo curto deste projeto chamava isto —
 * nem a suíte de testes, nem `scripts/medir-municipios.mts`. A seed
 * (`scripts/seed/municipios.mts`) já fazia o equivalente certo, com um
 * `PrismaClient` próprio dela.
 */
export function fecharConexao(): Promise<void> {
  return clienteBase.$disconnect();
}
