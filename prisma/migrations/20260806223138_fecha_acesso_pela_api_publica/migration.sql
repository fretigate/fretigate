-- Fecha o acesso as nossas tabelas pela API publica do Supabase.
--
-- O QUE FOI ENCONTRADO
-- O Supabase concede, por privilegio padrao, TODOS os privilegios em toda
-- tabela nova de `public` aos papeis `anon`, `authenticated` e `service_role`.
-- `anon` e o papel da API REST publica, usada com a chave que POR DESENHO fica
-- no navegador.
--
-- Tabela criada por migration do Prisma nao ganha RLS sozinha. Resultado:
-- `session`, `account` e `verification` — token de sessao e hash de senha —
-- estavam alcancaveis por quem tivesse a chave publica do projeto.
--
-- O FretiGate NAO usa a API REST do Supabase. Fala com o Postgres direto, pelo
-- Prisma. Entao esses privilegios nao servem para nada aqui e saem.
--
-- Duas camadas, de proposito: tirar o privilegio E ligar o RLS. Privilegio
-- sozinho volta se alguem rodar um GRANT amplo; RLS sozinho nao cobre tabela
-- criada antes de alguem lembrar de liga-lo.

-- ---------------------------------------------------------------------------
-- 1. Tira o privilegio das tabelas que ja existem.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE USAGE ON SCHEMA "public" FROM "anon", "authenticated";

-- ---------------------------------------------------------------------------
-- 2. Tira o privilegio das tabelas que AINDA NAO EXISTEM.
-- Sem isto, a proxima migration recria o buraco em silencio — e o produto
-- inteiro ainda esta por ser escrito.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON TABLES    FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";

-- ---------------------------------------------------------------------------
-- 3. RLS tambem nas tabelas do Better Auth.
--
-- Elas nao tem `empresa_id`, entao nao ha politica de empresa que faca sentido.
-- O que faz sentido e: ninguem enxerga, exceto o papel da autenticacao, por
-- politica nomeada. RLS ligado sem politica nega tudo — o esquecimento nega.
-- ---------------------------------------------------------------------------
ALTER TABLE "session"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session"      FORCE  ROW LEVEL SECURITY;
ALTER TABLE "account"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account"      FORCE  ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "session_autenticacao" ON "session"
  TO "fretigate_auth" USING (true) WITH CHECK (true);
CREATE POLICY "account_autenticacao" ON "account"
  TO "fretigate_auth" USING (true) WITH CHECK (true);
CREATE POLICY "verification_autenticacao" ON "verification"
  TO "fretigate_auth" USING (true) WITH CHECK (true);
