-- Chave Pix da empresa e o histórico de "Cobrar no WhatsApp" (item 6,
-- Tarefa 5 -- docs/planos/item-6-titulo-e-cobrancas.md).
--
-- CHAVE PIX
-- Texto livre, nulavel, sem enum e sem checagem de formato: chave Pix pode
-- ser CPF, CNPJ, e-mail, telefone ou aleatoria, e recusar uma valida e pior
-- que aceitar uma torta.
ALTER TABLE "empresa" ADD COLUMN "chave_pix" TEXT;

-- COBRANCA_ENVIADA
-- Uma linha por confirmacao de "Enviei" ao voltar da conversa do WhatsApp.
-- Repetivel (diferente de Servico.ordem_enviada_em, que e uma vez por
-- frete): a mesma cobranca pode ser cobrada mais de uma vez ao longo do
-- tempo, e cada envio e um fato proprio -- um campo escalar sobrescreveria o
-- envio anterior em silencio (CLAUDE.md secao 9, mesmo raciocinio de
-- Recebimento).
CREATE TABLE "cobranca_enviada" (
    "id" UUID NOT NULL,
    "titulo_id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "enviado_em" TIMESTAMPTZ(6) NOT NULL,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "cobranca_enviada_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "cobranca_enviada_empresa_id_idx" ON "cobranca_enviada"("empresa_id");
CREATE INDEX "cobranca_enviada_titulo_id_idx" ON "cobranca_enviada"("titulo_id");

ALTER TABLE "cobranca_enviada" ADD CONSTRAINT "cobranca_enviada_titulo_id_fkey"
  FOREIGN KEY ("titulo_id") REFERENCES "titulo_receber"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cobranca_enviada" ADD CONSTRAINT "cobranca_enviada_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cobranca_enviada" ADD CONSTRAINT "cobranca_enviada_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS -- falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "cobranca_enviada" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cobranca_enviada" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "cobranca_enviada_isolamento" ON "cobranca_enviada"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7). SEM UPDATE tambem -- diferente de "recebimento",
-- esta linha nunca muda depois de gravada (nenhum status para atualizar);
-- conceder UPDATE sem nenhum caminho que o use seria privilegio parado.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem das tres chaves estrangeiras acima -- cada
-- uma e verificada pelo Postgres sem RLS. A garantia de que titulo_id
-- pertence a mesma empresa fica no servico (src/lib/servicos/titulos.ts,
-- buscarTituloReceber antes de gravar), com teste proprio. usuario_id nunca
-- vem de input do usuario (sempre da sessao), entao nao precisa de
-- conferencia propria.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT ON "cobranca_enviada" TO "fretigate_app";
