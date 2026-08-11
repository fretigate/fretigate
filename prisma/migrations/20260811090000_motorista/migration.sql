-- Motoristas (tarefa 7 do item 2): tabela, RLS e concessoes.
--
-- docs/especificacao.md, entidade Motorista: so nome e obrigatorio, documento
-- segue exatamente a mesma regra de cliente (formato, normalizacao,
-- unicidade parcial por empresa entre os nao arquivados), sem "ativo".

CREATE TABLE "motorista" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "veiculo_habitual_id" UUID,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "motorista_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "motorista_empresa_id_idx" ON "motorista"("empresa_id");

-- Unico por empresa quando preenchido, mas so entre os NAO ARQUIVADOS —
-- mesma regra e mesmo motivo de "cliente_empresa_id_documento_key"
-- (20260809060000_cliente_e_prazo_padrao): arquivamento libera o documento
-- de proposito, motorista arquivado que a pessoa recadastra e o caso comum.
CREATE UNIQUE INDEX "motorista_empresa_id_documento_key"
  ON "motorista"("empresa_id", "documento")
  WHERE "arquivado_em" IS NULL;

-- Formato do documento — mesma regra de "cliente_documento_formato": CPF (11
-- digitos) ou CNPJ (12 alfanumerico + 2 digitos).
ALTER TABLE "motorista" ADD CONSTRAINT "motorista_documento_formato" CHECK (
  "documento" IS NULL
  OR "documento" ~ '^[0-9]{11}$'
  OR "documento" ~ '^[0-9A-Z]{12}[0-9]{2}$'
);

ALTER TABLE "motorista" ADD CONSTRAINT "motorista_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "motorista" ADD CONSTRAINT "motorista_veiculo_habitual_id_fkey"
  FOREIGN KEY ("veiculo_habitual_id") REFERENCES "veiculo"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS — falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "motorista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "motorista" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "motorista_isolamento" ON "motorista"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) — arquivar e UPDATE.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem de "veiculo_habitual_id" — a chave
-- estrangeira e verificada pelo Postgres sem RLS. A garantia de que o
-- caminhao referenciado pertence a mesma empresa fica no servico
-- (src/lib/servicos/motoristas.ts), nao aqui.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "motorista" TO "fretigate_app";
