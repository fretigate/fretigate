-- Balde privado `relatorios` — item 7, Tarefa 2 (`docs/planos/item-7-relatorio.md`),
-- mesmo padrao do balde `comprovantes` (item 5, migration
-- `20260825060000_balde_comprovantes_storage`).
--
-- NAO REPETE a politica de RLS daquela migration de proposito: as duas
-- politicas de la (`objects_nega_api_publica`, `buckets_nega_api_publica`)
-- ja negam `anon`/`authenticated` em TODA LINHA de `storage.objects`/
-- `storage.buckets`, qualquer que seja o `bucket_id` — nao sao politicas
-- por balde, sao politicas por TABELA. Criar uma segunda politica identica
-- aqui nao fecharia nada que ja nao estivesse fechado; so duplicaria uma
-- entrada em `pg_policies` sem mudar o resultado. Medido em
-- `tests/isolamento/storage.test.ts`, que testa a tabela inteira, nao um
-- balde especifico — o teste ja cobre este balde novo sem precisar mudar.
--
-- A fronteira real continua sendo o codigo do servidor
-- (`src/lib/documentos/armazenamento.ts`), que so grava/le com
-- `service_role` depois de conferir posse do relatorio — mesmo raciocinio
-- de `comprovantes.ts` (`CLAUDE.md` §4, "Upload de imagem").
INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios', 'relatorios', false)
ON CONFLICT (id) DO NOTHING;
