-- Camada 2 do isolamento: o Postgres recusando.
--
-- POR QUE ISTO PRECISA DE UM PAPEL NOVO
-- A aplicacao conectava como `postgres`, e `postgres` tem rolbypassrls = true.
-- Papel com esse atributo IGNORA politica de RLS, e nem ENABLE nem FORCE mudam
-- isso. Sem papel dedicado, tudo abaixo seria enfeite.
--
-- ESTE ARQUIVO NAO CONTEM SENHA, e nao pode conter — ele e versionado
-- (CLAUDE.md secao 4). O papel nasce sem login; dar senha a ele e um passo
-- manual, fora do repositorio, descrito em docs/diario.md.

-- ---------------------------------------------------------------------------
-- Valor padrao para as colunas de atualizacao.
-- Quem preenchia era so o Prisma, na aplicacao. Todo INSERT em SQL cru — o das
-- migrations e o dos testes de isolamento da tarefa 6 — falhava com violacao
-- de nao-nulo.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa"      ALTER COLUMN "atualizado_em" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "usuario"      ALTER COLUMN "atualizado_em" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "session"      ALTER COLUMN "updatedAt"     SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "account"      ALTER COLUMN "updatedAt"     SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "verification" ALTER COLUMN "updatedAt"     SET DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- O papel da aplicacao.
--
-- NOBYPASSRLS  e o ponto inteiro deste arquivo.
-- NOLOGIN      nasce sem poder entrar. Ganha senha num passo manual.
-- NAO e dono   das tabelas: dono escapa de politica quando falta o FORCE, e
--              nao se depende de lembrar do FORCE.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fretigate_app') THEN
    CREATE ROLE "fretigate_app" NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "fretigate_app";

-- Tabelas de dominio. SEM DELETE, de proposito: o CLAUDE.md secao 7 diz que
-- nada e apagado — exclusao e `arquivado_em` preenchido, que e UPDATE. Nao
-- conceder o privilegio transforma a regra em impossibilidade.
GRANT SELECT, INSERT, UPDATE ON "empresa" TO "fretigate_app";
GRANT SELECT, INSERT, UPDATE ON "usuario" TO "fretigate_app";

-- As tabelas do Better Auth NAO recebem privilegio nenhum aqui, de proposito.
-- Elas guardam hash de senha e token de sessao, e nao tem empresa_id — nao ha
-- politica de empresa que faca sentido nelas. Quem fala com elas e o Better
-- Auth, por uma conexao separada (a "saida de emergencia" da tarefa 5, restrita
-- a lib/auth). Resultado: o papel da aplicacao literalmente NAO CONSEGUE ler
-- hash de senha, mesmo que alguem escreva a consulta.

-- ---------------------------------------------------------------------------
-- RLS nas tabelas com escopo de empresa.
--
-- FORCE alem de ENABLE: sem FORCE, o dono da tabela escapa da politica.
-- RLS ligado sem politica nenhuma tambem nega tudo — o esquecimento nega, nao
-- libera.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "empresa" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario" FORCE  ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- As politicas. Falha fechada — CLAUDE.md secao 9.
--
--   nulo          contexto nunca definido            -> nulo -> nega
--   string vazia  conexao reaproveitada do pool      -> nullif -> nulo -> nega
--   invalido      texto que nao e identificador      -> erro na conversao
--
-- `empresa_id = nulo` resulta em NULO, que nao e verdadeiro, entao o Postgres
-- nao devolve a linha. Zero linhas, nunca a tabela inteira.
--
-- NUNCA acrescentar `OR current_setting(...) IS NULL` aqui. E a alteracao de
-- uma linha que transforma falha fechada em falha aberta, e e o atalho que
-- alguem faz para "consertar" um teste que devolve vazio.
--
-- USING governa o que se enxerga; WITH CHECK governa o que se grava. Sem o
-- segundo, um INSERT gravaria linha com o empresa_id de outra empresa: leitura
-- travada e escrita livre.
-- ---------------------------------------------------------------------------
CREATE POLICY "empresa_isolamento" ON "empresa"
  USING      ("id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

CREATE POLICY "usuario_isolamento" ON "usuario"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);
