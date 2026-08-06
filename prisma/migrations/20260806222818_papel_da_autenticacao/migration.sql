-- Papel da autenticacao, para que NENHUMA conexao em execucao ignore RLS.
--
-- Antes disto, o Better Auth usaria `postgres` como saida de emergencia — e
-- `postgres` tem rolbypassrls. Uma conexao com esse atributo viva durante o
-- funcionamento do produto significa que qualquer defeito em codigo de dominio
-- passa invisivel pela camada 2.
--
-- Depois disto:
--   fretigate_app   dominio, preso a empresa do contexto
--   fretigate_auth  autenticacao, sem enxergar dominio
--   postgres        SO migrations
--
-- ESTE ARQUIVO NAO CONTEM SENHA. Os dois papeis nascem sem login.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fretigate_auth') THEN
    CREATE ROLE "fretigate_auth" NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "fretigate_auth";

-- Tabelas do Better Auth. DELETE entra aqui, e so aqui: encerrar sessao apaga
-- linha de `session`, e token de verificacao usado deixa de existir. Nao e
-- dado de dominio — a regra de "nada e apagado" (secao 7) vale para o dominio,
-- nao para credencial expirada, que deve mesmo sumir.
GRANT SELECT, INSERT, UPDATE, DELETE ON "session"      TO "fretigate_auth";
GRANT SELECT, INSERT, UPDATE, DELETE ON "account"      TO "fretigate_auth";
GRANT SELECT, INSERT, UPDATE, DELETE ON "verification" TO "fretigate_auth";

-- `usuario` e compartilhado: e a tabela `user` do Better Auth E a tabela de
-- dominio de quem entra no sistema. SEM DELETE — aqui a secao 7 vale.
GRANT SELECT, INSERT, UPDATE ON "usuario" TO "fretigate_auth";

-- NADA em `empresa`, e nada em tabela de dominio futura. O papel da
-- autenticacao nao tem por que enxergar frete, cliente ou cobranca.

-- ---------------------------------------------------------------------------
-- A politica propria em `usuario`.
--
-- POR QUE ELA PRECISA EXISTIR
-- No login, o Better Auth procura a pessoa pelo e-mail. Nesse instante NAO
-- existe contexto de empresa, por definicao: so se sabe de que empresa a pessoa
-- e depois de acha-la. Com apenas a politica de empresa valendo, a busca leria
-- zero linhas e o login seria impossivel.
--
-- POR QUE ISTO E MELHOR QUE BYPASSRLS
-- E declarado. Aparece em pg_policies, e da para auditar. BYPASSRLS e um
-- atributo invisivel do papel que desliga o motor inteiro, para todas as
-- tabelas, para sempre. Aqui o RLS continua LIGADO e a permissao e nomeada,
-- restrita a um papel e a uma tabela.
--
-- O QUE ISTO CUSTA, DITO EM VOZ ALTA
-- O papel da autenticacao consegue ler a linha de usuario de qualquer empresa.
-- Isso e inerente a autenticar, nao e falha do desenho. O que ele NAO consegue
-- e ler `empresa` nem qualquer tabela de dominio.
--
-- Politicas permissivas se somam com OU, e esta e restrita a um papel: ela nao
-- afrouxa nada para `fretigate_app`, que continua so com a politica de empresa.
-- ---------------------------------------------------------------------------
CREATE POLICY "usuario_autenticacao" ON "usuario"
  TO "fretigate_auth"
  USING (true)
  WITH CHECK (true);

-- Permite assumir o papel nos testes de isolamento (tarefa 6), pelo mesmo
-- motivo da migration anterior: teste que roda como `postgres` passa sempre.
GRANT "fretigate_auth" TO "postgres";
