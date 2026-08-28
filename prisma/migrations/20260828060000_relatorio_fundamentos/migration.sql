-- Item 7, Tarefa 1: Fundamentos -- a entidade Relatorio e o que ela amarra
-- (docs/planos/item-7-relatorio.md).
--
-- Escrita a mao, sem "prisma migrate dev --create-only": o banco de sombra
-- que o comando cria reaplica TODAS as migrations do zero, e
-- 20260825060000_balde_comprovantes_storage grava em storage.buckets, um
-- schema que so existe no projeto Supabase de verdade (P3006/42P01). Aplicada
-- por "prisma migrate deploy", que nao usa banco de sombra.
--
-- Referencias novas (Relatorio.cliente_id; RelatorioServico.relatorio_id e
-- .servico_id) precisam de conferencia contra a empresa no servico, antes de
-- gravar -- o Postgres nao aplica RLS na checagem de chave estrangeira
-- (CLAUDE.md secao 3). Ver src/lib/servicos/relatorios.ts.

-- ---------------------------------------------------------------------------
-- Contador atomico do numero sequencial por empresa -- mesmo padrao de
-- Servico.numero (migration 20260811110000_servico): nunca MAX(numero)+1,
-- incrementado dentro da mesma transacao que cria o Relatorio.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD COLUMN "proximo_numero_relatorio" INTEGER NOT NULL DEFAULT 1;

-- RELATORIO
-- valor_total e sempre recalculado a partir dos proprios Servico incluidos --
-- nunca recebido de input (src/lib/servicos/relatorios.ts). pdf_url nasce
-- nulo, gravado num segundo passo dentro da mesma transacao (Tarefa 4, quando
-- o gerador de PDF da Tarefa 2 existir).
CREATE TABLE "relatorio" (
    "id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "cliente_id" UUID NOT NULL,
    "data_inicial" TIMESTAMPTZ(6) NOT NULL,
    "data_final" TIMESTAMPTZ(6) NOT NULL,
    "valor_total" INTEGER NOT NULL,
    "gerou_cobranca" BOOLEAN NOT NULL DEFAULT false,
    "gerado_em" TIMESTAMPTZ(6) NOT NULL,
    "pdf_url" TEXT,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "relatorio_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "relatorio_empresa_id_idx" ON "relatorio"("empresa_id");

-- Garante em banco a mesma invariante que o contador atomico ja produz: nunca
-- dois relatorios da mesma empresa com o mesmo numero.
CREATE UNIQUE INDEX "relatorio_empresa_id_numero_key" ON "relatorio"("empresa_id", "numero");

ALTER TABLE "relatorio" ADD CONSTRAINT "relatorio_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relatorio" ADD CONSTRAINT "relatorio_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relatorio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "relatorio" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "relatorio_isolamento" ON "relatorio"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- Privilegio da aplicacao. SEM DELETE (CLAUDE.md secao 7, nada e apagado).
-- COM UPDATE: pdf_url e gravado num segundo passo depois do INSERT (Tarefa
-- 4), e arquivar e UPDATE.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem da FK acima -- ela e verificada pelo
-- Postgres sem RLS. A garantia de que cliente_id pertence a mesma empresa
-- fica no servico (src/lib/servicos/relatorios.ts), com teste proprio.
GRANT SELECT, INSERT, UPDATE ON "relatorio" TO "fretigate_app";

-- RELATORIO_SERVICO
-- Quais fretes exatamente entraram no relatorio -- necessario porque cada
-- linha da montagem e desmarcavel (docs/especificacao.md secao 4.4).
--
-- RETRATO CONGELADO (docs/especificacao.md secao 4.4, "O documento fica
-- gravado com os valores da epoca"; secao 8, regra 6 -- decisao do fundador,
-- 28/08/2026): data_servico/origem_texto/destino_texto/carga_texto/valor sao
-- copias do Servico no momento da criacao, nunca recalculadas depois. Servico
-- continua editavel enquanto nao tiver titulo ativo (secao 8, regra 12); sem
-- este retrato, um relatorio ja entregue ao cliente mudaria de conteudo por
-- baixo dele. servico_id continua para comparar com o dado ao vivo.
--
-- Uma linha nunca muda depois de gravada, mesmo padrao de cobranca_enviada.
CREATE TABLE "relatorio_servico" (
    "id" UUID NOT NULL,
    "relatorio_id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,
    "data_servico" TIMESTAMPTZ(6) NOT NULL,
    "origem_texto" TEXT,
    "destino_texto" TEXT,
    "carga_texto" TEXT,
    "valor" INTEGER NOT NULL,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "relatorio_servico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "relatorio_servico_empresa_id_idx" ON "relatorio_servico"("empresa_id");
CREATE INDEX "relatorio_servico_servico_id_idx" ON "relatorio_servico"("servico_id");

-- Nunca duas linhas do mesmo frete no mesmo relatorio.
CREATE UNIQUE INDEX "relatorio_servico_relatorio_id_servico_id_key"
  ON "relatorio_servico"("relatorio_id", "servico_id");

ALTER TABLE "relatorio_servico" ADD CONSTRAINT "relatorio_servico_relatorio_id_fkey"
  FOREIGN KEY ("relatorio_id") REFERENCES "relatorio"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relatorio_servico" ADD CONSTRAINT "relatorio_servico_servico_id_fkey"
  FOREIGN KEY ("servico_id") REFERENCES "servico"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relatorio_servico" ADD CONSTRAINT "relatorio_servico_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "relatorio_servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "relatorio_servico" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "relatorio_servico_isolamento" ON "relatorio_servico"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- SEM DELETE, SEM UPDATE, de proposito -- mesmo padrao de cobranca_enviada:
-- nada e apagado, e esta linha nunca muda depois de gravada.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem das duas chaves estrangeiras acima -- cada
-- uma e verificada pelo Postgres sem RLS. A garantia de que relatorio_id e
-- servico_id pertencem a mesma empresa fica no servico
-- (src/lib/servicos/relatorios.ts), com teste proprio.
GRANT SELECT, INSERT ON "relatorio_servico" TO "fretigate_app";

-- TITULO_RECEBER.RELATORIO_ID -- fecha a pendencia do item 3
-- (docs/diario.md, tarefa 3 do item 3): a tabela Relatorio agora existe.
-- Continua SEM conferencia propria em codigo -- nenhum caminho grava este
-- campo hoje (nasce na Tarefa 4, com gerarRelatorio). Quando esse caminho
-- existir, CLAUDE.md secao 3 exige a mesma conferencia de posse contra a
-- empresa que toda referencia nova exige, usando buscarRelatorio
-- (src/lib/servicos/relatorios.ts), com teste proprio -- requisito explicito
-- para quem construir a Tarefa 4, nao promessa de que ja esta feito.
ALTER TABLE "titulo_receber" ADD CONSTRAINT "titulo_receber_relatorio_id_fkey"
  FOREIGN KEY ("relatorio_id") REFERENCES "relatorio"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
