-- Reverter um cadastro que nao terminou (tarefa 8).
--
-- O CADASTRO PRECISA DE DUAS CONEXOES, NAO UMA TRANSACAO SO
-- Criar a Empresa passa pelo papel `fretigate_app` (CLAUDE.md secao 9: gerar
-- o uuid, `set_config`, inserir). Criar o Usuario e a senha passa pelo Better
-- Auth, que fala com o banco pelo papel `fretigate_auth` — uma conexao
-- diferente, sem BYPASSRLS, que nao enxerga `empresa`. Nao existe um unico
-- BEGIN/COMMIT cobrindo as duas. Se a Empresa for criada e a criacao do
-- Usuario falhar logo depois, sobra uma Empresa sem ninguem apontando pra
-- ela — um cadastro que comecou e nao terminou.
--
-- POR QUE ISSO E DELETE DE VERDADE, NAO ARQUIVAR
-- A secao 7 do CLAUDE.md protege dado que passou a existir de verdade no
-- produto. Empresa sem nenhum Usuario vinculado nunca existiu de verdade —
-- ninguem chegou a ve-la, nenhuma sessao aponta pra ela. Apagar essa linha e
-- reverter um cadastro incompleto, nao excluir um registro. Decisao do
-- fundador, registrada tambem no CLAUDE.md.
--
-- POR QUE ISSO E UMA FUNCAO, E NAO UM GRANT DELETE EM FRETIGATE_APP
-- `fretigate_app` nao tem DELETE em `empresa`, de proposito (migration
-- `20260806214555_rls_papel_da_aplicacao`). Conceder DELETE na tabela
-- inteira reabriria, para sempre e em qualquer codigo futuro que erre a
-- chamada, a possibilidade de apagar uma empresa de verdade.
--
-- SEGUNDA VERSAO DESTA FUNCAO — a primeira dependia de `postgres` ignorar
-- RLS (bloqueio do fundador, revisao de 07/08/2026)
-- A primeira versao era `SECURITY DEFINER` sem trocar o dono, entao rodava
-- como `postgres` — e `postgres` tem `rolbypassrls = true` (migration
-- `20260806214555_rls_papel_da_aplicacao`, "nem ENABLE nem FORCE mudam
-- isso"). O `DELETE` dentro da funcao ignorava RLS por completo, nao porque
-- alguma politica permitisse — porque o dono da funcao esta isento de RLS.
-- A arquitetura inteira do produto se apoia em "nenhuma conexao EM EXECUCAO
-- ignora RLS" (secao 9), e esta funcao roda em execucao, chamada por
-- `fretigate_app` toda vez que um cadastro falha na metade. Uma excecao
-- dessas devolve o buraco com todo mundo achando que esta protegido — e os
-- testes de isolamento continuariam verdes, porque conferem RLS pela conexao
-- CERTA, nao pegariam uma funcao escondida atras do dono errado.
--
-- A CORRECAO: a funcao agora faz o que qualquer consulta do produto faria —
-- `set_config('app.empresa_id', ...)` ANTES do `DELETE` — e a politica
-- `empresa_isolamento` passa a ser SATISFEITA de verdade, nao ignorada. Isso
-- so prova alguma coisa se o DONO da funcao nao tiver BYPASSRLS — dono com
-- bypassrls sempre passaria, e a politica nunca seria testada. Por isso o
-- papel novo abaixo, so para isto, sem LOGIN e sem BYPASSRLS.
DROP FUNCTION IF EXISTS reverter_cadastro_incompleto(uuid);

-- ---------------------------------------------------------------------------
-- `fretigate_reversor` — privilegio minimo e NOMEADO (visivel em
-- information_schema.role_table_grants), nunca BYPASSRLS, nunca LOGIN.
--   DELETE em empresa   — a operacao em si
--   SELECT em usuario   — o que a guarda `NOT EXISTS` precisa para ler
-- Nada alem disso. Este papel nao enxerga nenhuma outra tabela do produto.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fretigate_reversor') THEN
    CREATE ROLE "fretigate_reversor" NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "fretigate_reversor";
-- DELETE sozinho nao basta: com RLS ligado, a clausula USING da politica
-- avalia visibilidade da linha, e isso exige SELECT tambem — medido, nao
-- suposto (sem este GRANT, o DELETE recusa com "permission denied for table
-- empresa", mesmo o papel tendo DELETE).
GRANT SELECT, DELETE ON "empresa" TO "fretigate_reversor";
GRANT SELECT ON "usuario" TO "fretigate_reversor";

-- Trocar o dono de uma funcao para um papel exige poder assumir esse papel
-- (`SET ROLE`) — mesmo motivo da migration `20260806214755_permite_assumir_o_papel_da_aplicacao`,
-- que fez o mesmo para `fretigate_app`. Sem isto, nem quem roda as
-- migrations consegue executar o `ALTER FUNCTION ... OWNER TO` mais abaixo.
GRANT "fretigate_reversor" TO "postgres";

CREATE FUNCTION reverter_cadastro_incompleto(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- O contexto que qualquer consulta do produto teria. A partir daqui, RLS
  -- em `empresa` e em `usuario` PASSA A VALER de verdade para esta empresa —
  -- nao esta sendo contornado, esta sendo satisfeito.
  PERFORM set_config('app.empresa_id', p_empresa_id::text, true);

  -- A guarda continua aqui, em cima da politica ja satisfeita: mesmo chamada
  -- com o empresa_id certo, nunca apaga empresa que tenha usuario.
  DELETE FROM empresa
  WHERE id = p_empresa_id
    AND NOT EXISTS (
      SELECT 1 FROM usuario WHERE usuario.empresa_id = p_empresa_id
    );
END;
$$;

-- Trocar o dono de um objeto exige que o NOVO dono tenha CREATE no schema —
-- regra do proprio Postgres para ALTER ... OWNER TO, nao escolha nossa.
-- `fretigate_reversor` nunca usa isso pra criar nada (NOLOGIN: ninguem se
-- conecta como ele, e SECURITY DEFINER so roda o corpo da funcao, nunca DDL
-- arbitrario) — o grant existe so PARA a troca de dono abaixo, e sai logo
-- depois. Sem o REVOKE, o papel ficaria com CREATE no schema pra sempre,
-- contradizendo o proprio comentario de que ele so tem DELETE/SELECT
-- nomeados — achado no /revisar, nao escolha original.
GRANT CREATE ON SCHEMA "public" TO "fretigate_reversor";

-- SECURITY DEFINER roda com o privilegio de quem CRIOU a funcao por padrao —
-- por isso o dono muda para o papel de privilegio minimo depois de criada,
-- em vez de ela nascer pertencendo a quem rodou a migration.
ALTER FUNCTION reverter_cadastro_incompleto(uuid) OWNER TO "fretigate_reversor";

-- O CREATE era so para a linha acima aceitar a troca de dono. Sai agora —
-- este papel nunca precisa criar nada em execucao.
REVOKE CREATE ON SCHEMA "public" FROM "fretigate_reversor";

-- So `fretigate_app` chama isso, e so EXECUTE — ela nunca ganha DELETE direto
-- na tabela.
GRANT EXECUTE ON FUNCTION reverter_cadastro_incompleto(uuid) TO "fretigate_app";

-- O POSTGRES CONCEDE EXECUTE A PUBLIC POR PADRAO EM FUNCAO NOVA — diferente de
-- tabela, que nasce fechada. A migration `20260806223138_fecha_acesso_pela_api_publica`
-- revogou o privilegio padrao de FUNCTIONS especificamente de `anon` e
-- `authenticated`, mas nunca de `PUBLIC` — e `PUBLIC` inclui os dois, e todo
-- papel futuro, independente do que foi revogado deles por nome. Sem esta
-- linha, esta funcao — que apaga linha de `empresa` — ficaria alcancavel pela
-- API publica do Supabase via RPC, com a chave que fica no navegador.
REVOKE EXECUTE ON FUNCTION reverter_cadastro_incompleto(uuid) FROM PUBLIC;
