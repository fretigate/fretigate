-- Balde privado `logos` — item 10, Tarefa 2 (`docs/planos/
-- item-10-configuracoes-conta-e-usuarios.md`), mesmo padrao do balde
-- `relatorios` (migration `20260828070000_balde_relatorios_storage`).
--
-- NAO REPETE a politica de RLS de `20260825060000_balde_comprovantes_storage`
-- de proposito: `objects_nega_api_publica`/`buckets_nega_api_publica` ja
-- negam `anon`/`authenticated` em TODA LINHA de `storage.objects`/
-- `storage.buckets`, qualquer que seja o `bucket_id` — sao politicas por
-- TABELA, nao por balde. Criar uma terceira politica identica aqui nao
-- fecharia nada que ja nao estivesse fechado; so duplicaria uma entrada em
-- `pg_policies` sem mudar o resultado. `tests/isolamento/storage.test.ts` ja
-- cobre este balde novo sem precisar mudar, pelo mesmo motivo.
--
-- A fronteira real continua sendo o codigo do servidor
-- (`src/lib/servicos/logo.ts`), que so grava/le com `service_role` — a
-- garantia de isolamento entre empresas e o caminho `{empresaId}/...` mais o
-- `empresaId` vindo sempre da sessao, nunca desta migration (CLAUDE.md §4,
-- "Upload de imagem").
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false)
ON CONFLICT (id) DO NOTHING;
