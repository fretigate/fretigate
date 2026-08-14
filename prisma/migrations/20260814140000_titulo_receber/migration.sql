-- TituloReceber (tarefa 3 do item 3): tabela, RLS e concessoes.
--
-- docs/especificacao.md, entidade TituloReceber: entidade propria, nunca
-- campo em Servico (situacao financeira e derivada). Schema minimo desta
-- fatia (docs/planos/item-3-lancamento-frete.md, Tarefa 3): so "Ja recebi"
-- grava aqui. vencimento, forma_pagamento_prevista e forma_pagamento ficam
-- sempre nulos ate a tela de cobranca e o titulo automatico (item 6)
-- existirem.
--
-- Duas referencias (servico_id, cliente_id) precisam de conferencia contra a
-- empresa no servico, antes de gravar — o Postgres nao aplica RLS na
-- checagem de chave estrangeira (CLAUDE.md secao 3). As chaves estrangeiras
-- abaixo sao a segunda garantia, nao a primeira.
--
-- relatorio_id fica sem chave estrangeira de proposito: a tabela Relatorio
-- so nasce no item 7. Pendencia registrada em docs/diario.md.

CREATE TYPE "status_titulo_receber" AS ENUM ('aberto', 'pago', 'cancelado');

CREATE TYPE "forma_pagamento_prevista_titulo" AS ENUM ('boleto', 'outro');

CREATE TABLE "titulo_receber" (
    "id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "valor" INTEGER NOT NULL,
    "valor_recebido" INTEGER,
    "vencimento" TIMESTAMPTZ(6),
    "forma_pagamento_prevista" "forma_pagamento_prevista_titulo",
    "status" "status_titulo_receber" NOT NULL DEFAULT 'aberto',
    "data_pagamento" TIMESTAMPTZ(6),
    "forma_pagamento" TEXT,
    "relatorio_id" UUID,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "titulo_receber_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "titulo_receber_empresa_id_idx" ON "titulo_receber"("empresa_id");

ALTER TABLE "titulo_receber" ADD CONSTRAINT "titulo_receber_servico_id_fkey"
  FOREIGN KEY ("servico_id") REFERENCES "servico"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "titulo_receber" ADD CONSTRAINT "titulo_receber_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "titulo_receber" ADD CONSTRAINT "titulo_receber_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS — falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "titulo_receber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "titulo_receber" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "titulo_receber_isolamento" ON "titulo_receber"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) — arquivar e UPDATE.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem das duas chaves estrangeiras acima — cada
-- uma e verificada pelo Postgres sem RLS. A garantia de que a referencia
-- pertence a mesma empresa fica no servico (src/lib/servicos/titulos.ts),
-- nao aqui.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "titulo_receber" TO "fretigate_app";
