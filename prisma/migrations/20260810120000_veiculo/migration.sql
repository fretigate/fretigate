-- Caminhoes (tarefa 6 do item 2): tabela, RLS e concessoes.
--
-- docs/especificacao.md, entidade Veiculo: so apelido OU placa e obrigatorio,
-- tipo e chip de escolha unica entre cinco valores, sem "ativo" e sem "ano"
-- (os dois motivos estao no comentario do model Veiculo em schema.prisma).

CREATE TYPE "tipo_veiculo" AS ENUM ('toco', 'truck', 'bitruck', 'carreta', 'bitrem');

CREATE TABLE "veiculo" (
    "id" UUID NOT NULL,
    "placa" TEXT,
    "apelido" TEXT,
    "tipo" "tipo_veiculo",
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "veiculo_empresa_id_idx" ON "veiculo"("empresa_id");

-- So apelido OU placa e obrigatorio (docs/especificacao.md, entidade Veiculo)
-- — os dois identificam o caminhao, e quem so sabe a placa cadastra pela
-- placa. src/lib/servicos/caminhoes.ts ja recusa antes de chegar aqui; este
-- CHECK e a segunda garantia, para quem gravar por fora do servico.
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_apelido_ou_placa" CHECK (
  "placa" IS NOT NULL OR "apelido" IS NOT NULL
);

ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS — falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "veiculo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "veiculo" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "veiculo_isolamento" ON "veiculo"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) — arquivar e UPDATE.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "veiculo" TO "fretigate_app";
