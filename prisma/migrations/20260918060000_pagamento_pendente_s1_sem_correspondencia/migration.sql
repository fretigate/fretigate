-- Item 13, Tarefa 3 (continuacao): tela de Planos + upgrade de dentro do
-- produto (docs/planos/item-13-tarefa-3-tela-de-planos.md).
--
-- REESCRITA NO MESMO COMMIT, ANTES DE QUALQUER PUSH -- a primeira versao
-- desta migration (mesma sessao) so adicionava s1_sem_correspondencia como
-- UUID e reabria registrar_pagamento_pendente para gravar o empresa_id
-- assinado (HMAC) recebido no s1. O segundo passe do /revisar (18/09/2026)
-- achou que isso ainda violava CLAUDE.md secao 3 ("empresa_id vem sempre da
-- sessao autenticada... nunca de URL, formulario, header ou body"): mesmo
-- assinado contra forjadura, o empresa_id continuava vindo do corpo do
-- webhook e indo direto para db(empresaId) -- o padrao ja usado em CLAUDE.md
-- secao 9 para "nao sei a empresa ainda" (localizar_convite_por_token)
-- nunca transporta o identificador, resolve ele NO BANCO a partir de um
-- token opaco. Corrigido para o mesmo padrao antes do commit -- nunca
-- editar migration ja commitada/aplicada em outro lugar, mas esta nunca saiu
-- desta maquina.
--
-- SOLICITACAO_UPGRADE
-- Tabela de dominio nova (tem empresa_id, isolada como qualquer outra) --
-- nasce quando o dono, logado, toca em "Assinar o anual/mensal" em /planos
-- (Server Action gerarLinkDeCheckoutAction, comoDono por fora do envelope
-- normal -- ver o comentario do arquivo). O token vai no parametro de
-- rastreio s1 da URL de checkout; o webhook (order_approved) resolve esse
-- token DEPOIS, sem nunca ter recebido o empresa_id em lugar nenhum do
-- pedido -- mesmo raciocinio de Convite/fretigate_convite, reaproveitando
-- o papel fretigate_pagamento (mesmo dominio, mesma classe de problema:
-- webhook de pagamento resolvendo identidade por token antes de existir
-- contexto de empresa).
--
-- USO UNICO E COM PRAZO -- reivindicar_solicitacao_upgrade so marca
-- usado_em (e devolve o empresa_id) se ainda nao foi usada E o prazo nao
-- venceu, tudo numa unica instrucao atomica (mesmo desenho de
-- reivindicar_pagamento). Um token vencido ou ja usado nunca reativa
-- upgrade nenhum -- so cai no Fluxo B, registrando o token cru (nao mais
-- um UUID) em pagamento_pendente.s1_sem_correspondencia, corrigido abaixo
-- para TEXT.

-- ---------------------------------------------------------------------------
-- PAGAMENTO_PENDENTE.S1_SEM_CORRESPONDENCIA -- guarda o TOKEN (texto opaco,
-- gerarTokenDeUpgrade) que chegou no s1 sem resolver upgrade nenhum -- nunca
-- um empresa_id, porque o s1 nunca carrega um empresa_id (nem cru, nem
-- assinado) depois desta correcao. So diagnostico para scripts/
-- pagamentos-pendentes.mts, nunca usado para achar a empresa de novo.
-- ---------------------------------------------------------------------------
ALTER TABLE "pagamento_pendente" ADD COLUMN "s1_sem_correspondencia" TEXT;

DROP FUNCTION IF EXISTS registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz);

-- ---------------------------------------------------------------------------
-- registrar_pagamento_pendente -- mesma funcao de
-- 20260903060000_pagamento_pendente, so com o parametro novo no fim
-- (DEFAULT NULL -- chamada existente, com onze argumentos, continua
-- funcionando sem precisar passar o novo).
-- ---------------------------------------------------------------------------
CREATE FUNCTION registrar_pagamento_pendente(
  p_id                     uuid,
  p_token                  text,
  p_gateway                text,
  p_transacao_externa      text,
  p_email_comprador        text,
  p_nome_comprador         text,
  p_gateway_assinante_id   text,
  p_documento_comprador    text,
  p_periodicidade          periodicidade_plano,
  p_valor_centavos         integer,
  p_recebido_em            timestamptz,
  p_s1_sem_correspondencia text DEFAULT NULL
)
RETURNS TABLE (
  id     uuid,
  token  text,
  status status_pagamento_pendente
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    INSERT INTO pagamento_pendente (
      id, token, gateway, transacao_externa, email_comprador, nome_comprador,
      gateway_assinante_id, documento_comprador, periodicidade, valor_centavos,
      recebido_em, s1_sem_correspondencia
    )
    VALUES (
      p_id, p_token, p_gateway, p_transacao_externa, p_email_comprador,
      p_nome_comprador, p_gateway_assinante_id, p_documento_comprador,
      p_periodicidade, p_valor_centavos, p_recebido_em, p_s1_sem_correspondencia
    )
    ON CONFLICT (transacao_externa) DO UPDATE
      SET transacao_externa = EXCLUDED.transacao_externa
    RETURNING pagamento_pendente.id, pagamento_pendente.token, pagamento_pendente.status;
END;
$$;

GRANT CREATE ON SCHEMA "public" TO "fretigate_pagamento";

ALTER FUNCTION registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz, text) OWNER TO "fretigate_pagamento";

REVOKE CREATE ON SCHEMA "public" FROM "fretigate_pagamento";

REVOKE EXECUTE ON FUNCTION registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz, text) TO "fretigate_app";

-- ---------------------------------------------------------------------------
-- SOLICITACAO_UPGRADE
-- ---------------------------------------------------------------------------
CREATE TABLE "solicitacao_upgrade" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),

    CONSTRAINT "solicitacao_upgrade_pkey" PRIMARY KEY ("id")
);
-- `atualizado_em` (CLAUDE.md §7: "Toda tabela tem criado_em e
-- atualizado_em") -- achado do /revisar, 18/09/2026: a primeira versao
-- desta tabela nasceu sem, unica tabela de dominio do produto nessa
-- situacao. `usado_em` continua campo proprio (marca o momento exato da
-- reivindicacao), nao e substituido por `atualizado_em` generico.

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio (mesmo padrao de Convite).

CREATE UNIQUE INDEX "solicitacao_upgrade_token_key" ON "solicitacao_upgrade"("token");
CREATE INDEX "solicitacao_upgrade_empresa_id_idx" ON "solicitacao_upgrade"("empresa_id");

ALTER TABLE "solicitacao_upgrade" ADD CONSTRAINT "solicitacao_upgrade_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "solicitacao_upgrade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solicitacao_upgrade" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "solicitacao_upgrade_isolamento" ON "solicitacao_upgrade"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- Privilegio da aplicacao. So SELECT/INSERT: ninguem edita ou apaga uma
-- solicitacao depois de criada -- so o papel fretigate_pagamento marca
-- usado_em, e so pela funcao abaixo.
GRANT SELECT, INSERT ON "solicitacao_upgrade" TO "fretigate_app";

-- fretigate_pagamento ja existe (20260903060000_pagamento_pendente) -- so
-- ganha alcance nesta tabela nova, mesma politica USING (true) WITH CHECK
-- (true) que ja usa em pagamento_pendente (o papel tambem grava; a escrita
-- real fica condicionada ao WHERE dentro da funcao, nao pela politica).
GRANT SELECT, UPDATE ON "solicitacao_upgrade" TO "fretigate_pagamento";

CREATE POLICY "solicitacao_upgrade_reivindicacao" ON "solicitacao_upgrade"
  TO "fretigate_pagamento"
  USING      (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- reivindicar_solicitacao_upgrade -- uso unico atomico, mesmo desenho de
-- reivindicar_pagamento: so marca usado_em (e devolve o empresa_id) se
-- ainda nao foi usada E o prazo nao venceu. Tudo numa unica instrucao --
-- nao ha janela entre "checar" e "marcar" para duas entregas concorrentes
-- do mesmo evento (a Kiwify reenvia webhook em caso de falha) reivindicarem
-- a mesma solicitacao duas vezes.
-- ---------------------------------------------------------------------------
CREATE FUNCTION reivindicar_solicitacao_upgrade(p_token text)
RETURNS TABLE (empresa_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    UPDATE solicitacao_upgrade
       SET usado_em = now()
     WHERE solicitacao_upgrade.token = p_token
       AND solicitacao_upgrade.usado_em IS NULL
       AND solicitacao_upgrade.expira_em > now()
    RETURNING solicitacao_upgrade.empresa_id;
END;
$$;

GRANT CREATE ON SCHEMA "public" TO "fretigate_pagamento";

ALTER FUNCTION reivindicar_solicitacao_upgrade(text) OWNER TO "fretigate_pagamento";

REVOKE CREATE ON SCHEMA "public" FROM "fretigate_pagamento";

REVOKE EXECUTE ON FUNCTION reivindicar_solicitacao_upgrade(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION reivindicar_solicitacao_upgrade(text) TO "fretigate_app";
