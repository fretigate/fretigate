-- Item 11: Despesas (docs/planos/item-11-despesas.md).
--
-- Escrita a mao, sem "prisma migrate dev --create-only" -- mesmo motivo ja
-- documentado nas migrations recentes: o banco de sombra do comando reaplica
-- TODAS as migrations do zero, e migrations anteriores gravam em
-- storage.buckets/storage.objects, schema que so existe no projeto Supabase
-- de verdade (P3006/42P01). Aplicada por "prisma migrate deploy".
--
-- veiculo_id e servico_id: o Postgres nao aplica RLS na checagem de chave
-- estrangeira (CLAUDE.md secao 3). veiculo_id e conferido contra a empresa no
-- servico antes de gravar (src/lib/servicos/despesas.ts, mesmo padrao de
-- Motorista.veiculo_habitual_id) -- servico_id NAO tem conferencia ainda,
-- porque nenhum caminho grava esse campo nesta tarefa (decisao do fundador,
-- 01/09/2026, docs/planos/item-11-despesas.md, decisao 1).

CREATE TABLE "despesa" (
    "id" UUID NOT NULL,
    "data" TIMESTAMPTZ(6) NOT NULL,
    "categoria" TEXT,
    "valor" INTEGER NOT NULL,
    "descricao" TEXT,
    "veiculo_id" UUID,
    "servico_id" UUID,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "despesa_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

-- Centavos, inteiro, sempre positivo (CLAUDE.md secao 7) -- mesma garantia
-- de banco que ja existe em "recebimento" (migration
-- 20260826070000_recebimento_e_derivacao_de_titulo).
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_valor_positivo" CHECK ("valor" > 0);

CREATE INDEX "despesa_empresa_id_idx" ON "despesa"("empresa_id");

ALTER TABLE "despesa" ADD CONSTRAINT "despesa_veiculo_id_fkey"
  FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "despesa" ADD CONSTRAINT "despesa_servico_id_fkey"
  FOREIGN KEY ("servico_id") REFERENCES "servico"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "despesa" ADD CONSTRAINT "despesa_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "despesa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "despesa" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "despesa_isolamento" ON "despesa"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- Privilegio da aplicacao. SEM DELETE (CLAUDE.md secao 7, nada e apagado).
-- COM UPDATE: editar e arquivar sao os dois UPDATE.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem das duas FKs acima -- cada uma e
-- verificada pelo Postgres sem RLS. A garantia de que veiculo_id pertence a
-- mesma empresa fica no servico (src/lib/servicos/despesas.ts), com teste
-- proprio. servico_id nao tem essa garantia ainda -- ver comentario do
-- model Despesa em schema.prisma.
GRANT SELECT, INSERT, UPDATE ON "despesa" TO "fretigate_app";
