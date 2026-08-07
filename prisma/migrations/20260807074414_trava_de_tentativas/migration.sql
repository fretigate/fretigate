-- Trava de tentativas, guardada no banco.
--
-- POR QUE NO BANCO E NAO EM MEMORIA
-- A Vercel roda varias instancias da aplicacao ao mesmo tempo. Com a contagem
-- em memoria, cada instancia teria a sua, e um limite de 5 tentativas viraria
-- 5 vezes o numero de instancias — sem ninguem perceber, porque em
-- desenvolvimento, com uma instancia so, o numero bate.
--
-- ESTA TABELA NASCE ISOLADA, no mesmo commit em que nasce (secao 3).
-- Ela nao tem `empresa_id` de proposito: a contagem acontece ANTES de existir
-- sessao, entao nao existe empresa para filtrar. O que existe e a mesma
-- protecao das outras tabelas do Better Auth — RLS ligado, forcado, e uma
-- politica nomeada restrita ao papel da autenticacao.

-- CreateTable
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,
    -- Secao 7: toda tabela tem criado_em e atualizado_em, sem ressalva.
    -- `lastRequest` e da biblioteca e mede a janela da trava, nao a vida da
    -- linha. Sem `arquivado_em`: contador de tentativa vencido some mesmo.
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

-- ---------------------------------------------------------------------------
-- Isolamento. Mesmo desenho de `session`, `account` e `verification`.
--
-- FORCE importa: sem ele o dono da tabela escapa da politica, e o dono e o
-- papel que roda as migrations.
-- ---------------------------------------------------------------------------
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit" FORCE  ROW LEVEL SECURITY;

-- RLS ligado sem politica nega tudo. Quem nao for `fretigate_auth` cai aqui, e
-- isso inclui `fretigate_app`: o papel do dominio nao tem nada que ver com a
-- contagem de tentativas de login.
CREATE POLICY "rate_limit_autenticacao" ON "rate_limit"
  TO "fretigate_auth" USING (true) WITH CHECK (true);

-- DELETE entra porque o proprio Better Auth limpa as linhas vencidas. Sem essa
-- permissao a tabela cresceria para sempre e a limpeza falharia calada.
-- A regra "nada e apagado" da secao 7 vale para o dominio, nao para contador
-- de tentativa expirado.
GRANT SELECT, INSERT, UPDATE, DELETE ON "rate_limit" TO "fretigate_auth";

-- Nada para `anon` e `authenticated`: a migration
-- `20260806223138_fecha_acesso_pela_api_publica` alterou o privilegio padrao
-- DO PAPEL `postgres`, que e quem roda as migrations — por isso esta tabela,
-- criada por ele, nasceu fechada sem precisar de linha nenhuma aqui.
--
-- O QUE E CONFERIDO, exatamente: `tests/isolamento/privilegios.test.ts` recusa
-- qualquer concessao a `anon` ou `authenticated` em qualquer tabela, e recusa
-- privilegio padrao DO `postgres` que faca a proxima tabela nascer aberta.
--
-- O QUE NAO E CONFERIDO, dito em voz alta: o privilegio padrao do
-- `supabase_admin` continua concedendo tudo a esses dois papeis. Ele so
-- morderia se alguma tabela fosse criada por `supabase_admin` em vez de por
-- `postgres`, o que nao acontece pelo caminho das migrations.
--
-- Duas versoes anteriores deste comentario prometeram garantia maior que a
-- conferida — a primeira inventou um teste que nao existia, a segunda disse
-- "toda tabela futura" onde o teste olha um papel so. Frase que promete demais
-- e pior que silencio: sem ela alguem desconfia e vai olhar; com ela, ninguem
-- olha.
