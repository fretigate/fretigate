-- Cliente (tarefa 3 do item 2): dados, documento e o prazo herdado.
--
-- Duas coisas nesta migration, na mesma tabela de motivo:
--   1. Empresa.prazo_padrao_dias — o topo dos tres niveis de prazo de
--      pagamento (docs/especificacao.md secao 4.7).
--   2. A tabela cliente em si.

-- ---------------------------------------------------------------------------
-- 1. Empresa.prazo_padrao_dias — 15, obrigatorio.
--
-- NOT NULL com DEFAULT preenche as linhas existentes na mesma instrucao; nao
-- precisa de UPDATE em separado.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD COLUMN "prazo_padrao_dias" INTEGER NOT NULL DEFAULT 15;

-- ---------------------------------------------------------------------------
-- 2. A tabela cliente.
-- ---------------------------------------------------------------------------
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "municipio_id" INTEGER,
    "prazo_pagamento_dias" INTEGER,
    "observacao" TEXT,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": quem gera o uuid e a aplicacao (Prisma,
-- `@default(uuid(7))`), antes do INSERT — nunca o banco, como em toda tabela
-- do dominio.

CREATE INDEX "cliente_empresa_id_idx" ON "cliente"("empresa_id");

-- Unico por empresa quando preenchido, mas so entre os NAO ARQUIVADOS
-- (docs/especificacao.md, entidade Cliente). Indice PARCIAL — o Prisma nao
-- modela isso (mesma limitacao do comentario de RLS no topo do
-- schema.prisma), entao esta linha existe so aqui.
--
-- NULL nunca colide consigo mesmo num indice unico do Postgres, entao nao
-- precisa excluir "documento IS NOT NULL" à parte: duas linhas com
-- documento nulo nunca conflitam, arquivadas ou nao.
--
-- Arquivamento libera o documento de proposito — diferente da trava de
-- Empresa.cnpj, que e anti-abuso e continua presa depois de arquivada.
-- Aqui nao ha abuso a evitar: cliente arquivado que a pessoa recadastra e
-- o caso comum, e recusar um registro que ela nao enxerga mais na lista
-- seria o defeito, nao a protecao.
CREATE UNIQUE INDEX "cliente_empresa_id_documento_key"
  ON "cliente"("empresa_id", "documento")
  WHERE "arquivado_em" IS NULL;

-- Formato do documento — CPF (11 digitos) ou CNPJ (12 alfanumerico + 2
-- digitos), espelhando "empresa_cnpj_formato"
-- (20260808102447_cnpj_alfanumerico_formato). Guardado so com letra e
-- numero, maiusculo, sem pontuacao.
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_documento_formato" CHECK (
  "documento" IS NULL
  OR "documento" ~ '^[0-9]{11}$'
  OR "documento" ~ '^[0-9A-Z]{12}[0-9]{2}$'
);

ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cliente" ADD CONSTRAINT "cliente_municipio_id_fkey"
  FOREIGN KEY ("municipio_id") REFERENCES "municipio"("codigo_ibge")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. RLS — falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cliente" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "cliente_isolamento" ON "cliente"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- 4. Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) — arquivar e UPDATE.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "cliente" TO "fretigate_app";
