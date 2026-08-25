-- Balde privado `comprovantes` + fecha `storage.objects`/`storage.buckets`
-- para a API publica do Supabase (`anon`/`authenticated`) — item 5, Tarefa 4
-- (`docs/planos/item-5-ordem-de-servico.md`), pendencia aberta desde o item 1
-- (`docs/diario.md`, 08/08/2026).
--
-- MESMA INTENCAO DE DEFESA EM PROFUNDIDADE ja aplicada as tabelas de
-- `public` (20260806223138_fecha_acesso_pela_api_publica) — mas so UMA
-- camada funciona aqui, e e RLS, nao privilegio. Ver a secao 2 abaixo para o
-- porque, medido, nao suposto: quem ler so este cabecalho e parar aqui sairia
-- achando que as duas camadas foram aplicadas ao balde, e nao foram.
--
-- A FRONTEIRA REAL NAO E ESTA MIGRATION. E o codigo do servidor conferindo
-- posse (`Servico.empresa_id === sessao.empresaId`, via `buscarServico`)
-- antes de gerar a URL assinada (`src/lib/servicos/comprovantes.ts`) —
-- CLAUDE.md secao 4, "Upload de imagem". O que fica aqui e so a segunda
-- camada: mesmo que o codigo do servidor tivesse um defeito, `anon` e
-- `authenticated` continuam sem alcancar o balde pelo Postgres direto.
--
-- `service_role` continua com o privilegio padrao do Supabase e ignora RLS
-- por atributo (`rolbypassrls`) — e o papel que o servidor usa para gravar e
-- ler comprovante (CLAUDE.md secao 4, "Os papeis embutidos do Supabase"). Nao
-- e tocado aqui, de proposito.

-- ---------------------------------------------------------------------------
-- 1. O balde. Privado (`public = false`): a unica forma de ler um objeto e
-- por URL assinada, gerada pelo servidor depois de conferir posse. Sem limite
-- de tamanho/tipo aqui — quem valida isso e o pipeline do servidor (item 5,
-- Tarefa 5), que precisa rejeitar pelo CONTEUDO do arquivo, nunca so pela
-- extensao ou pelo cabecalho de upload.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Camada de RLS, explicita — nega tudo para `anon`/`authenticated`.
--
-- MEDIDO NESTA TAREFA, NAO SUPOSTO: a primeira versao desta migration tentava
-- `REVOKE ALL ... FROM anon, authenticated`, no mesmo padrao ja usado para
-- `public` (`20260806223138_fecha_acesso_pela_api_publica`). Nao funciona
-- aqui. `storage.objects`/`storage.buckets` sao donas de `supabase_storage_admin`
-- (`SELECT relacl FROM pg_class` mostra todo GRANT com grantor
-- `supabase_storage_admin`), e `postgres` (quem roda esta migration) nao e
-- membro desse papel nem tem opcao de concessao sobre essas linhas de ACL —
-- o `REVOKE` roda sem erro e nao muda nada, porque o Postgres so revoga o que
-- quem pediu tem autoridade para revogar. `has_table_privilege('anon', ...)`
-- confirmou: `true` antes e depois do REVOKE. Mesma classe de achado que o
-- `CLAUDE.md` §3 ja registra para `ALTER DEFAULT PRIVILEGES` em funcao —
-- comando que parece proteger e nao protege e pior que nao ter nenhum.
--
-- O que FUNCIONA, medido: `postgres` CONSEGUE criar/derrubar politica de RLS
-- em `storage.objects`/`storage.buckets` (o Supabase concede isso à parte,
-- sem exigir posse da tabela) e CONSEGUE `SET ROLE anon`/`authenticated`
-- dentro da propria sessao para provar o efeito. E por isso que a fronteira
-- aqui e so RLS -- privilegio de tabela continua aberto (mesmo estado que o
-- Supabase entrega por padrao), e a politica abaixo nega toda linha antes de
-- qualquer privilegio importar.
--
-- TAMBEM MEDIDO: as duas tabelas ja vem com RLS LIGADO por padrao do proprio
-- Supabase (`rls_enabled = true`), mesmo sem nenhuma politica — e RLS ligado
-- sem politica nenhuma ja nega tudo para quem nao e dono nem tem
-- `rolbypassrls` (`tests/isolamento/storage.test.ts` provou isso derrubando
-- a politica sozinha e vendo `anon` continuar sem enxergar nada). A politica
-- explicita abaixo e uma camada A MAIS, conferivel por `pg_policies`, nao a
-- unica coisa entre `anon` e a linha.
--
-- `postgres` TAMBEM NAO CONSEGUE `ALTER TABLE ... DISABLE ROW LEVEL
-- SECURITY` NEM `... FORCE ROW LEVEL SECURITY` nestas duas tabelas ("must be
-- owner of table") — mesma falta de posse. `FORCE` fica de fora do padrao
-- usado no resto do projeto (ENABLE + FORCE juntos, tests/isolamento/
-- schema.test.ts) por isso, e medido que a ausencia nao importa aqui:
-- `FORCE` so muda o comportamento do DONO da tabela (por padrao, sem
-- `FORCE`, o dono e ISENTO de RLS na propria tabela, mesmo sem
-- `rolbypassrls`) -- e o dono, `supabase_storage_admin`, nunca e
-- anon/authenticated. Nao ter `FORCE` deixa o DONO isento (o que ele ja
-- seria de qualquer jeito, por ser dono e ter concessao propria e nomeada no
-- catalogo) -- nunca afeta se anon/authenticated enxergam linha, que
-- depende só da politica e do `rolbypassrls` DELES, nenhum dos dois
-- influenciado por `FORCE`. Por isso o contraste do teste usa a
-- tecnica de `privilegios.test.ts` (conceder de proposito, medir, revogar):
-- uma politica permissiva temporaria para `anon`, que PROVA que a consulta
-- enxergaria a linha se pudesse — nao desligar RLS por inteiro, que aqui nao
-- e uma opcao.
--
-- `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`, de proposito:
-- `storage` nao e o schema que `prisma migrate reset --force` derruba (esse
-- comando recria so o schema `public`, onde fica `_prisma_migrations` —
-- mesmo motivo pelo qual as roles deste arquivo de migrations sao criadas
-- com `IF NOT EXISTS`, mais acima no historico). Sem o DROP antes, a esteira
-- ficaria vermelha no PRIMEIRO reset depois deste commit: a migration reroda
-- do zero a cada `migrate reset`, e a politica da execucao anterior ainda
-- estaria la ("policy already exists").
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "objects_nega_api_publica" ON "storage"."objects";
CREATE POLICY "objects_nega_api_publica" ON "storage"."objects"
  TO "anon", "authenticated"
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "buckets_nega_api_publica" ON "storage"."buckets";
CREATE POLICY "buckets_nega_api_publica" ON "storage"."buckets"
  TO "anon", "authenticated"
  USING (false)
  WITH CHECK (false);
