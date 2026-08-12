-- Servico (tarefa 1 do item 3): tabela, contador de numero, RLS e concessoes.
--
-- docs/especificacao.md, entidade Servico: so cliente_id, valor, data_servico
-- e tipo_operacao_id sao obrigatorios. origem_texto/destino_texto guardam
-- sempre o texto digitado; a resolucao de municipio nunca bloqueia o salvar
-- (src/lib/servicos/servicos.ts). carga_categoria, ordem_enviada_em e
-- comprovante_url ficam nulos nesta fatia (itens 5 e 15).
--
-- Quatro referencias (tipo_operacao_id, cliente_id, veiculo_id, motorista_id)
-- precisam de conferencia contra a empresa no servico, antes de gravar — o
-- Postgres nao aplica RLS na checagem de chave estrangeira (CLAUDE.md secao 3).
-- As chaves estrangeiras abaixo sao a segunda garantia, nao a primeira.

CREATE TYPE "status_operacional_servico" AS ENUM ('em_andamento', 'finalizado', 'cancelado');

CREATE TYPE "origem_lancamento_servico" AS ENUM ('manual', 'importacao');

-- ---------------------------------------------------------------------------
-- Contador atomico do numero sequencial por empresa.
--
-- Nunca MAX(numero)+1 — teria corrida sob concorrencia. O incremento roda
-- dentro da mesma transacao que cria o Servico (emTransacao), com
-- UPDATE ... SET x = x + 1, que o Postgres serializa por linha.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD COLUMN "proximo_numero_servico" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "servico" (
    "id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo_operacao_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "veiculo_id" UUID,
    "motorista_id" UUID,
    "data_servico" TIMESTAMPTZ(6) NOT NULL,
    "origem_texto" TEXT,
    "origem_municipio_id" INTEGER,
    "destino_texto" TEXT,
    "destino_municipio_id" INTEGER,
    "carga_texto" TEXT,
    "carga_categoria" TEXT,
    "valor" INTEGER NOT NULL,
    "km" INTEGER,
    "status_operacional" "status_operacional_servico" NOT NULL DEFAULT 'em_andamento',
    "origem_lancamento" "origem_lancamento_servico" NOT NULL DEFAULT 'manual',
    "ordem_enviada_em" TIMESTAMPTZ(6),
    "comprovante_url" TEXT,
    "criado_por_usuario_id" TEXT NOT NULL,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "servico_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "servico_empresa_id_idx" ON "servico"("empresa_id");

-- Garante em banco a mesma invariante que o contador atomico ja produz: nunca
-- dois servicos da mesma empresa com o mesmo numero.
CREATE UNIQUE INDEX "servico_empresa_id_numero_key" ON "servico"("empresa_id", "numero");

ALTER TABLE "servico" ADD CONSTRAINT "servico_tipo_operacao_id_fkey"
  FOREIGN KEY ("tipo_operacao_id") REFERENCES "tipo_operacao"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_veiculo_id_fkey"
  FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_motorista_id_fkey"
  FOREIGN KEY ("motorista_id") REFERENCES "motorista"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_origem_municipio_id_fkey"
  FOREIGN KEY ("origem_municipio_id") REFERENCES "municipio"("codigo_ibge")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_destino_municipio_id_fkey"
  FOREIGN KEY ("destino_municipio_id") REFERENCES "municipio"("codigo_ibge")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_criado_por_usuario_id_fkey"
  FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "servico" ADD CONSTRAINT "servico_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS — falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "servico" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "servico_isolamento" ON "servico"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) — arquivar e UPDATE.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem das seis chaves estrangeiras acima — cada
-- uma e verificada pelo Postgres sem RLS. A garantia de que a referencia
-- pertence a mesma empresa fica no servico (src/lib/servicos/servicos.ts),
-- nao aqui.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "servico" TO "fretigate_app";
