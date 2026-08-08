-- Fecha, por padrao, o EXECUTE que o Postgres concede a PUBLIC em funcao
-- nova.
--
-- O QUE FOI ENCONTRADO (tarefa 8)
-- Tabela ja nasce fechada (20260806223138_fecha_acesso_pela_api_publica). Ela
-- revogou ALL FUNCTIONS de "anon" e "authenticated", nomeados, para funcao
-- futura -- mas o Postgres concede EXECUTE a PUBLIC por padrao em funcao
-- nova, e PUBLIC nao e um papel entre outros: e herdado por TODO papel,
-- anon/authenticated inclusive, independente do que foi revogado deles por
-- nome. `reverter_cadastro_incompleto` (tarefa 8) precisou ser fechada na
-- mao, na propria migration que a criou (REVOKE EXECUTE ... FROM PUBLIC). A
-- proxima funcao nasce aberta se ninguem lembrar.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE ALL ON FUNCTIONS FROM PUBLIC;
