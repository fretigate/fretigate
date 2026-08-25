/**
 * Trava de banco: a suíte recusa rodar fora dos projetos permitidos —
 * desenvolvimento (máquina de quem programa) ou teste (esteira de CI). Ver
 * `CLAUDE.md` §5, "Ambientes".
 *
 * POR QUE ISTO EXISTE
 * Os testes de isolamento semeiam e APAGAM linhas — o `afterAll` de
 * `vazamento.test.ts` roda `DELETE` sem perguntar nada a ninguém. Hoje o
 * estrago possível é zero, porque nenhum dos dois projetos permitidos recebe
 * dado real de cliente. No dia em que existir produção, um `.env` apontado
 * para o lugar errado, ou uma variável herdada de outro terminal, faz
 * `npm test` apagar dado de cliente.
 *
 * Roda como `setupFiles` do vitest, que executa ANTES de o arquivo de teste ser
 * importado. Os testes conectam no topo do módulo, então este é o único ponto
 * que pega todos sem depender de alguém lembrar de chamar.
 *
 * NÃO É A ÚNICA DEFESA, nem a principal.
 * A garantia de verdade é o papel `fretigate_app` não ter `DELETE`, e a
 * credencial de produção não estar na máquina de ninguém. Isto aqui pega o
 * engano comum, que é o que mais acontece.
 */

/**
 * Projetos onde a suíte pode rodar. Fica **no repositório**, versionada, e não
 * no `.env`.
 *
 * É o ponto todo: se a expectativa morasse no `.env`, o mesmo engano que troca
 * a URL trocaria a expectativa junto, e a trava aprovaria o desastre.
 * Identificador de projeto Supabase não é segredo — aparece na URL pública.
 */
export const PROJETOS_DE_TESTE = ["ysldmzvszjxdgcbtaurh", "qutzsvrkaqvpluqxbhmp"];

/**
 * O projeto de teste, sozinho — não "um dos dois permitidos" como
 * `PROJETOS_DE_TESTE` acima. Usado só pela esteira, antes de `prisma migrate
 * reset --force` (`.github/workflows/ci.yml`, `CLAUDE.md` §5): esse comando
 * derruba o schema inteiro, não só aplica migration. "Desenvolvimento também
 * vale" era uma aprovação razoável enquanto o pior caso era aplicar migration
 * duas vezes; deixou de ser no dia em que o comando passou a apagar.
 */
export const PROJETO_DE_TESTE_CI = "qutzsvrkaqvpluqxbhmp";

const VARIAVEIS = ["DATABASE_URL", "AUTH_DATABASE_URL", "DIRECT_URL"] as const;

/**
 * `SUPABASE_URL` (item 5, Tarefa 4) não é conexão de banco — é a API de
 * storage do mesmo projeto. Fica FORA de `VARIAVEIS`/`identificadorDoProjeto`
 * de propósito: o formato é outro (`https://<projeto>.supabase.co`, não
 * `postgres://usuario.projeto@...`), e `tests/isolamento/comprovantes.test.ts`
 * grava e apaga objeto de verdade no balde desse projeto — o mesmo risco que
 * `VARIAVEIS` já cobre para linha de banco, só que em storage.
 */
const VARIAVEL_STORAGE = "SUPABASE_URL";

/**
 * Extrai o identificador do projeto Supabase do usuário da conexão
 * (`fretigate_app.ysldmzvszjxdgcbtaurh`).
 *
 * Devolve `null` quando não reconhece o formato — e quem chama trata `null`
 * como RECUSA, nunca como permissão.
 */
export function identificadorDoProjeto(url: string): string | null {
  const usuario = url.match(/^postgres(?:ql)?:\/\/([^:@/]+)[:@]/)?.[1];
  if (!usuario) return null;

  // O identificador do Supabase tem 20 letras minúsculas, depois do ponto.
  const ref = usuario.match(/\.([a-z]{20})$/)?.[1];
  return ref ?? null;
}

/** O mesmo, para a URL da API (`https://<projeto>.supabase.co`), formato diferente do de conexão. */
export function identificadorDoProjetoStorage(url: string): string | null {
  return url.match(/^https:\/\/([a-z]{20})\.supabase\.co\/?$/)?.[1] ?? null;
}

function recusar(motivo: string): never {
  throw new Error(
    [
      "",
      "┌─────────────────────────────────────────────────────────────┐",
      "│  SUÍTE DE TESTES BLOQUEADA                                  │",
      "└─────────────────────────────────────────────────────────────┘",
      "",
      motivo,
      "",
      "Estes testes SEMEIAM E APAGAM linhas no banco a que se conectam.",
      "Rodar fora dos projetos permitidos apaga dado de verdade.",
      "",
      `Projeto(s) permitido(s): ${PROJETOS_DE_TESTE.join(", ")}`,
      "",
      "O que fazer:",
      "  1. conferir as três URLs do `.env` — DATABASE_URL, AUTH_DATABASE_URL",
      "     e DIRECT_URL — e apontar as três para um dos projetos permitidos",
      "     (desenvolvimento, na máquina de quem programa; teste, na esteira);",
      "  2. conferir se alguma delas não veio do ambiente do terminal, herdada",
      "     de outro comando, em vez de vir do `.env`;",
      "  3. se um projeto novo de teste passou a existir, acrescentá-lo à lista",
      "     em `tests/guarda-de-banco.ts` — de propósito, e num commit próprio.",
      "",
    ].join("\n"),
  );
}

/**
 * A validação em si, parametrizada por `env` — nunca lê `process.env`
 * diretamente. Isso permite `tests/guarda-de-banco.test.ts` chamar com
 * valores forjados, sem mutar o ambiente global do processo (§3, item 4 do
 * `CLAUDE.md`: a trava precisa de teste que rode sempre, não só a conferência
 * manual que já foi feita uma vez).
 */
export function validar(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV === "production") {
    recusar("NODE_ENV está como `production`.");
  }

  for (const nome of VARIAVEIS) {
    const url = env[nome];

    if (!url) {
      recusar(`A variável ${nome} não está definida.`);
    }

    const ref = identificadorDoProjeto(url);

    // FALHA FECHADA. Não reconhecer o formato recusa, e é a regra que decide se
    // esta trava vale alguma coisa.
    //
    // O erro fácil seria escrever "achei um identificador e ele não está na
    // lista, então recuso" — isso APROVA POR OMISSÃO tudo que não tem o formato
    // esperado: endereço local, outro provedor, string malformada, um Postgres de
    // produção em qualquer outro lugar. Recusar por não reconhecer, nunca aprovar
    // por não encontrar.
    if (ref === null) {
      recusar(
        `Não reconheci o projeto na variável ${nome}.\n` +
          "Ela não tem o formato de conexão do Supabase (`usuario.identificador`).\n" +
          "Pode ser um banco local, outro provedor, ou a URL estar malformada —\n" +
          "e nenhum desses casos é aprovado por não ser reconhecido.",
      );
    }

    if (!PROJETOS_DE_TESTE.includes(ref)) {
      // Imprime só o identificador, que é público. NUNCA a URL, que traz a senha.
      recusar(`A variável ${nome} aponta para o projeto \`${ref}\`.`);
    }
  }

  // `SUPABASE_URL` é OPCIONAL aqui — quem roda só teste que não toca storage
  // não precisa dela definida, e a suíte não deve recusar por isso. Mas
  // QUANDO está definida, vale a mesma regra das três de cima, formato
  // diferente: precisa apontar para um projeto permitido.
  const urlStorage = env[VARIAVEL_STORAGE];
  if (urlStorage) {
    const refStorage = identificadorDoProjetoStorage(urlStorage);
    if (refStorage === null) {
      recusar(
        `Não reconheci o projeto na variável ${VARIAVEL_STORAGE}.\n` +
          "Ela não tem o formato da API do Supabase (`https://<projeto>.supabase.co`).",
      );
    }
    if (!PROJETOS_DE_TESTE.includes(refStorage)) {
      recusar(`A variável ${VARIAVEL_STORAGE} aponta para o projeto \`${refStorage}\`.`);
    }
  }
}

/**
 * Mais rígida que `validar`: recusa também o projeto de desenvolvimento.
 * Chamada só pelos passos da esteira que mexem com o schema inteiro do
 * banco de teste, nesta ordem — `tests/guarda-do-reset.ts`, depois
 * `tests/encerra-conexoes-anteriores.ts` (matando conexão presa), depois
 * `migrate reset` em si — nunca em `npm test`, que precisa continuar
 * aprovando as duas máquinas (`CLAUDE.md` §5).
 */
export function validarSoTeste(env: Record<string, string | undefined>): void {
  validar(env);
  const ref = identificadorDoProjeto(env.DIRECT_URL!);
  if (ref !== PROJETO_DE_TESTE_CI) {
    recusar(
      `DIRECT_URL aponta para o projeto \`${ref}\`, não para o projeto de ` +
        `teste (\`${PROJETO_DE_TESTE_CI}\`).\n` +
        "`prisma migrate reset --force` derruba o schema inteiro — não pode " +
        "rodar contra desenvolvimento, nem por engano de secret.",
    );
  }
}

validar(process.env);
