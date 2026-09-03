import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Mensagens reutilizadas por mais de um bloco abaixo — extraídas para não
// divergir com o tempo (duas cópias da mesma frase são duas frases que podem
// parar de concordar).
const MSG_SQL_CRU = "SQL cru só em src/lib/db e em /tests (CLAUDE.md §3).";
const MSG_CLIENTE_PROPRIO =
  "Cliente de banco só se constrói em src/lib/db — em nenhum outro lugar " +
  "(CLAUDE.md §3, tarefa 2 da auditoria).";
const MSG_SEM_FILTRO =
  "bancoSemFiltroDeEmpresa só pode ser importado por src/lib/auth (o " +
  "login) — veja o comentário no arquivo.";
const MSG_SESSAO_POR_CABECALHO =
  "sessao-por-cabecalho só pode ser importado por src/lib/auth — veja o " +
  "comentário no arquivo (docs/planos/auditoria-3-mecanismo-de-sessao.md).";
const MSG_SUPABASE_SERVICE_ROLE =
  "@supabase/supabase-js só pode ser importado por " +
  "src/lib/servicos/comprovantes.ts, src/lib/documentos/armazenamento.ts " +
  "e src/lib/servicos/logo.ts — é o cliente com a chave service_role, que " +
  "ignora RLS por atributo (CLAUDE.md §4, item 5 Tarefa 4; item 7 Tarefa 2; " +
  "item 10 Tarefa 2). Um cliente construído num quarto arquivo teria a " +
  "mesma chave e nenhuma checagem de posse — a garantia de " +
  "gerarUrlComprovante/enviarRelatorioAoStorage/gerarUrlLogo ficaria presa " +
  "a uma linha de código, não a algo impossível de esquecer.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Material de referência e documentação, não código do produto. Os
    // protótipos em referencia/ têm JSX e JS de ferramenta de design, com
    // React global e ReactDOM.render — não são para corrigir, são para
    // consultar.
    "referencia/**",
    "docs/**",
    // Cliente gerado pelo Prisma (a partir da tarefa 2).
    "src/lib/generated/**",
    "prisma/generated/**",
  ]),
  // Trava de SQL cru (CLAUDE.md §3, tarefa 9): "SQL cru só em src/lib/db e em
  // /tests. Em nenhum outro lugar." /tests fica fora de src/**, então nem
  // precisa de exceção nomeada aqui — só src/lib/db precisa.
  //
  // scripts/** entrou em 14/08/2026, junto da pasta (CLAUDE.md §6): é o outro
  // lugar de fora de src/lib/db que fala com o banco (a seed de municípios,
  // o comando de medição), e a trava vale para ele igual a qualquer outro
  // arquivo do produto.
  //
  // Duas travas entraram junto (tarefa 2 da auditoria, 18/08/2026):
  //   - construir cliente de banco próprio (o import de @prisma/adapter-pg,
  //     único jeito de dar connectionString a um PrismaClient neste projeto,
  //     e a sintaxe `new PrismaClient(...)` em si, mais precisa que o import
  //     sozinho porque mede a construção, não um proxy dela);
  //   - importar bancoSemFiltroDeEmpresa, que só faz sentido em
  //     src/lib/auth: é lá que o Better Auth acha a pessoa pelo e-mail,
  //     antes de existir empresa. Diferente da trava de SQL cru,
  //     src/lib/db NÃO ganha exceção aqui — ninguém dentro de src/lib/db
  //     tem motivo para importar o cliente sem filtro (ele é trabalho de
  //     auth, não de acesso a dados em geral), então o bloco abaixo para
  //     src/lib/db/** mantém esta restrição de pé mesmo desligando as de
  //     SQL cru e cliente próprio.
  // Antes desta tarefa a segunda só existia como frase no comentário de
  // sem-filtro-de-empresa.ts — afirmação de mecanismo sobre coisa que não
  // existia (CLAUDE.md §13).
  //
  // Uma terceira trava entrou na tarefa 3 da auditoria (18/08/2026):
  // importar sessao-por-cabecalho, que só faz sentido em src/lib/auth (o
  // único chamador de produção — sessao.ts). tests/ fica fora de src/**,
  // então nunca esteve no escopo desta regra — é a exceção provada em
  // docs/planos/auditoria-3-mecanismo-de-sessao.md §4, mesmo raciocínio que
  // já vale para SQL cru.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx,mts,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "pg", message: MSG_SQL_CRU },
            { name: "@prisma/adapter-pg", message: MSG_CLIENTE_PROPRIO },
            {
              name: "@/lib/db/sem-filtro-de-empresa",
              message: MSG_SEM_FILTRO,
            },
            {
              name: "@/lib/auth/sessao-por-cabecalho",
              message: MSG_SESSAO_POR_CABECALHO,
            },
            { name: "@supabase/supabase-js", message: MSG_SUPABASE_SERVICE_ROLE },
          ],
          patterns: [
            // Defesa em profundidade contra import relativo (`../db/sem-
            // filtro-de-empresa`) em vez do alias `@/` — que é a convenção
            // do projeto (CLAUDE.md §6), mas a regra não deve depender só
            // dela ser seguida.
            { group: ["**/sem-filtro-de-empresa"], message: MSG_SEM_FILTRO },
            {
              group: ["**/sessao-por-cabecalho"],
              message: MSG_SESSAO_POR_CABECALHO,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^\\$(query|execute)Raw(Unsafe)?$/]",
          message: MSG_SQL_CRU,
        },
        {
          selector: "NewExpression[callee.name='PrismaClient']",
          message: MSG_CLIENTE_PROPRIO,
        },
      ],
    },
  },
  // src/lib/db abre SQL cru e cliente próprio (é onde os dois legitimamente
  // moram), mas NÃO abre importar sem-filtro-de-empresa — essa exceção é só
  // de src/lib/auth, decisão do fundador, 18/08/2026: as duas travas têm
  // motivos diferentes. src/lib/db é exceção da trava de SQL cru porque é a
  // camada de acesso a dados; mas o cliente sem filtro não é acesso a dados
  // em geral, é a saída de emergência do login. Sem esta restrição aqui,
  // qualquer arquivo de src/lib/db (o index.ts, por exemplo, importado pelo
  // produto inteiro) poderia importar e reexportar bancoSemFiltroDeEmpresa
  // sem a regra reclamar, e a saída de emergência vazaria para o caminho
  // normal sem trava nenhuma vendo.
  {
    files: ["src/lib/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/db/sem-filtro-de-empresa", message: MSG_SEM_FILTRO },
            {
              name: "@/lib/auth/sessao-por-cabecalho",
              message: MSG_SESSAO_POR_CABECALHO,
            },
            { name: "@supabase/supabase-js", message: MSG_SUPABASE_SERVICE_ROLE },
          ],
          patterns: [
            { group: ["**/sem-filtro-de-empresa"], message: MSG_SEM_FILTRO },
            {
              group: ["**/sessao-por-cabecalho"],
              message: MSG_SESSAO_POR_CABECALHO,
            },
          ],
        },
      ],
      "no-restricted-syntax": "off",
    },
  },
  // src/lib/auth precisa da exceção de sem-filtro-de-empresa — SQL cru e
  // cliente próprio continuam banidos ali (o login só importa o cliente já
  // pronto, nunca constrói o dele). Cada regra do ESLint é sobrescrita por
  // CHAVE, não por bloco inteiro: este bloco não menciona
  // no-restricted-syntax, então o de cima (SQL cru + cliente próprio) continua
  // valendo aqui.
  {
    files: ["src/lib/auth/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "pg", message: MSG_SQL_CRU },
            { name: "@prisma/adapter-pg", message: MSG_CLIENTE_PROPRIO },
            { name: "@supabase/supabase-js", message: MSG_SUPABASE_SERVICE_ROLE },
          ],
        },
      ],
    },
  },
  // Exceção nomeada, só para estes três arquivos — é onde o cliente
  // `service_role` legitimamente mora, um por balde de storage
  // (`comprovantes`, item 5 Tarefa 4; `relatorios`, item 7 Tarefa 2; `logos`,
  // item 10 Tarefa 2). Reabre só `@supabase/supabase-js`; as outras travas
  // do bloco `src/**` continuam valendo aqui (SQL cru, cliente Prisma
  // próprio, sem-filtro-de-empresa, sessao-por-cabecalho — nenhuma delas faz
  // sentido nestes arquivos, e não há motivo para abri-las).
  {
    files: [
      "src/lib/servicos/comprovantes.ts",
      "src/lib/documentos/armazenamento.ts",
      "src/lib/servicos/logo.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "pg", message: MSG_SQL_CRU },
            { name: "@prisma/adapter-pg", message: MSG_CLIENTE_PROPRIO },
            {
              name: "@/lib/db/sem-filtro-de-empresa",
              message: MSG_SEM_FILTRO,
            },
            {
              name: "@/lib/auth/sessao-por-cabecalho",
              message: MSG_SESSAO_POR_CABECALHO,
            },
          ],
          patterns: [
            { group: ["**/sem-filtro-de-empresa"], message: MSG_SEM_FILTRO },
            {
              group: ["**/sessao-por-cabecalho"],
              message: MSG_SESSAO_POR_CABECALHO,
            },
          ],
        },
      ],
    },
  },
  // Exceção nomeada, só para os arquivos listados — decisão do fundador,
  // 18/08/2026 (CLAUDE.md §6, §9): a seed de municípios fala com o banco
  // por fora de db(), porque município não tem empresa_id e a
  // leitura/gravação usa DIRECT_URL, não DATABASE_URL. É a mesma classe de
  // exceção que municipio_leitura é em RLS (USING (true) WITH CHECK
  // (false)): nomeada, escrita, com o motivo ao lado — não um "liga tudo de
  // novo" (o bloco abaixo reabre só o cliente próprio, mantendo SQL cru e
  // sem-filtro-de-empresa banidos, que nenhum destes scripts usa nem tem
  // motivo para usar).
  //
  // `scripts/pagamentos-pendentes.mts` somou em 03/09/2026 (item 13, Tarefa
  // 1 — `docs/planos/item-13-assinatura.md`), mesmo motivo: lista
  // `PagamentoPendente`, tabela que `fretigate_app` não tem privilégio
  // nenhum de alcançar direto (só pelas funções `SECURITY DEFINER`) —
  // comando de operação, fala pela conexão das migrations, não da
  // aplicação.
  {
    files: ["scripts/seed/municipios.mts", "scripts/pagamentos-pendentes.mts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "pg", message: MSG_SQL_CRU }],
          patterns: [
            { group: ["**/sem-filtro-de-empresa"], message: MSG_SEM_FILTRO },
            {
              group: ["**/sessao-por-cabecalho"],
              message: MSG_SESSAO_POR_CABECALHO,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^\\$(query|execute)Raw(Unsafe)?$/]",
          message: MSG_SQL_CRU,
        },
      ],
    },
  },
]);

export default eslintConfig;
