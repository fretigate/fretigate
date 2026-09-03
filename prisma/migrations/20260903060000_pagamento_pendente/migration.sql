-- Item 13, Tarefa 1: o caminho do pagamento ate a conta
-- (docs/planos/item-13-assinatura.md).
--
-- PAGAMENTO_PENDENTE
-- Nasce do webhook compra_aprovada da Kiwify quando a venda nao passou pelo
-- produto (checkout direto, Fluxo B, decisao do fundador) -- sem
-- empresa_id de contexto, entao sem dono ate ser reivindicada por quem
-- pagou, clicando no link do e-mail de confirmacao da Kiwify.
--
-- NAO E COMO MUNICIPIO, MESMO TENDO A COLUNA EMPRESA_ID -- achado so ao
-- rodar a suite contra a tabela nova, corrigido aqui (a formulacao
-- original deste comentario dizia "tabela sem empresa_id", e isso e
-- impreciso: a coluna existe, nullable). A ausencia e temporaria, dura so
-- ate vincular_pagamento_a_empresa gravar o valor, depois que a Empresa ja
-- existe (ver o comentario de reivindicar_pagamento mais abaixo para o
-- motivo de nao gravar antes). O que diferencia esta tabela de toda tabela
-- de dominio e a POLITICA, nao a coluna -- tests/isolamento/schema.test.ts
-- precisa da entrada propria em POLITICAS_ESPERADAS (nao em
-- SEM_EMPRESA_ID, que e para tabela sem a coluna nenhuma), e
-- tests/isolamento/vazamento.test.ts precisa dela em FORA_DO_LACO (o laco
-- generico testa acesso por db(empresaId), e fretigate_app nao tem
-- privilegio nenhum aqui).
--
-- O PAPEL NOVO, MESMO DESENHO DE FRETIGATE_CONVITE/FRETIGATE_RESERVOR
-- (CLAUDE.md secao 9)
-- Sem empresa_id fixo, a politica padrao de isolamento (empresa_id =
-- contexto) nao serve -- nao existe contexto de empresa antes de a empresa
-- nascer. fretigate_pagamento e NOLOGIN, NOBYPASSRLS, com politica propria
-- e nomeada (USING (true) WITH CHECK (true) -- diferente de
-- convite_busca_por_token, que e so leitura: aqui o papel tambem grava, e a
-- escrita real fica condicionada ao WHERE status = 'pendente' DENTRO de
-- cada funcao, nao pela politica). Sete funcoes SECURITY DEFINER, nunca
-- BYPASSRLS generico:
--   registrar_pagamento_pendente   -- webhook compra_aprovada, sem s1
--   localizar_pagamento_por_token  -- tela de reivindicacao
--   reivindicar_pagamento          -- uso unico atomico (caso 2 do plano),
--                                      NAO grava empresa_id (ver comentario
--                                      da funcao)
--   vincular_pagamento_a_empresa   -- grava empresa_id depois que a Empresa
--                                      ja existe de verdade
--   marcar_email_de_pagamento_enviado -- registra que o e-mail de ativacao
--                                      saiu com sucesso pela Resend -- o
--                                      UNICO caminho de entrega confirmado
--                                      (decisao do fundador, 03/09/2026)
--   estornar_pagamento_pendente    -- webhook de reembolso/chargeback antes
--                                      do clique (caso 4)
--   localizar_empresa_por_assinante_gateway -- eventos de assinatura DEPOIS
--                                      do primeiro pagamento (renovacao,
--                                      atraso, cancelamento), que tambem
--                                      chegam sem empresa_id de contexto
--
-- GATEWAY_ASSINANTE_ID EM EMPRESA
-- Kiwify customer.id -- estavel por comprador, nao muda a cada renovacao
-- (diferente do id da transacao, que e novo a cada cobranca). E a chave que
-- os eventos de assinatura depois do primeiro pagamento usam para achar a
-- empresa. NAO CONFIRMADO CONTRA ENTREGA REAL -- medido so no objeto de
-- venda da API REST da Kiwify, nunca visto num payload de evento de
-- assinatura de verdade (subscription_renewed/subscription_late/
-- subscription_canceled). Confirmar contra webhook de teste real antes de
-- considerar pronto para producao.
--
-- Preenchido nos dois caminhos que criam pagamento pago: reivindicacao do
-- token (Fluxo B, comprador sem cadastro previo) e upgrade de dentro do
-- produto (empresa ja existe, webhook chega com o parametro de rastreio
-- s1 preenchido) -- os dois gravam pela conexao normal de fretigate_app,
-- ja com empresa_id de contexto, sem precisar da funcao SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- Empresa.gateway_assinante_id
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD COLUMN "gateway_assinante_id" TEXT;
CREATE UNIQUE INDEX "empresa_gateway_assinante_id_key" ON "empresa"("gateway_assinante_id");

-- ---------------------------------------------------------------------------
-- PAGAMENTO_PENDENTE
-- ---------------------------------------------------------------------------
CREATE TYPE "status_pagamento_pendente" AS ENUM ('pendente', 'aceito', 'estornado');

CREATE TABLE "pagamento_pendente" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "transacao_externa" TEXT NOT NULL,
    "email_comprador" TEXT NOT NULL,
    "nome_comprador" TEXT NOT NULL,
    "gateway_assinante_id" TEXT NOT NULL,
    "documento_comprador" TEXT,
    "periodicidade" "periodicidade_plano" NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" "status_pagamento_pendente" NOT NULL DEFAULT 'pendente',
    "empresa_id" UUID,
    "recebido_em" TIMESTAMPTZ(6) NOT NULL,
    "aceito_em" TIMESTAMPTZ(6),
    "estornado_em" TIMESTAMPTZ(6),
    "email_enviado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamento_pendente_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE UNIQUE INDEX "pagamento_pendente_token_key" ON "pagamento_pendente"("token");
CREATE UNIQUE INDEX "pagamento_pendente_transacao_externa_key" ON "pagamento_pendente"("transacao_externa");
CREATE INDEX "pagamento_pendente_empresa_id_idx" ON "pagamento_pendente"("empresa_id");

ALTER TABLE "pagamento_pendente" ADD CONSTRAINT "pagamento_pendente_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pagamento_pendente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pagamento_pendente" FORCE  ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- fretigate_pagamento -- privilegio minimo e NOMEADO, so para as funcoes
-- abaixo. NOLOGIN, NOBYPASSRLS -- mesma forma de fretigate_convite/
-- fretigate_reversor.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fretigate_pagamento') THEN
    CREATE ROLE "fretigate_pagamento" NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "fretigate_pagamento";

-- pagamento_pendente: o papel tambem grava (registrar, reivindicar,
-- estornar), por isso SELECT, INSERT e UPDATE -- nunca DELETE (CLAUDE.md
-- secao 7, nada e apagado).
GRANT SELECT, INSERT, UPDATE ON "pagamento_pendente" TO "fretigate_pagamento";

CREATE POLICY "pagamento_pendente_acesso" ON "pagamento_pendente"
  TO "fretigate_pagamento"
  USING      (true)
  WITH CHECK (true);

-- empresa: SO LEITURA, e so para localizar_empresa_por_assinante_gateway
-- achar a empresa antes de saber o empresa_id -- mesma forma de
-- convite_busca_por_token/municipio_leitura (USING/WITH CHECK diferentes de
-- proposito: le, nunca grava). Este papel nunca ganha INSERT/UPDATE/DELETE
-- em empresa.
GRANT SELECT ON "empresa" TO "fretigate_pagamento";

CREATE POLICY "empresa_busca_por_assinante_gateway" ON "empresa"
  TO "fretigate_pagamento"
  USING      (true)
  WITH CHECK (false);

-- Necessario para os ALTER FUNCTION ... OWNER TO mais abaixo -- mesmo
-- motivo de fretigate_convite/fretigate_reversor.
GRANT "fretigate_pagamento" TO "postgres";

-- ---------------------------------------------------------------------------
-- registrar_pagamento_pendente -- chamada pela rota de webhook (compra
-- aprovada, sem s1) quando fretigate_app ainda nao tem empresa nenhuma.
--
-- Upsert-como-no-op em transacao_externa (ON CONFLICT ... DO UPDATE SET
-- transacao_externa = EXCLUDED.transacao_externa, um UPDATE que nao muda
-- nada mas faz o RETURNING funcionar): a Kiwify reenvia webhook em caso de
-- falha na entrega, entao o mesmo evento pode chegar mais de uma vez -- a
-- segunda chegada devolve a linha ja existente, sem inserir de novo nem
-- gerar um segundo token para a mesma compra.
-- ---------------------------------------------------------------------------
CREATE FUNCTION registrar_pagamento_pendente(
  p_id                   uuid,
  p_token                text,
  p_gateway              text,
  p_transacao_externa    text,
  p_email_comprador      text,
  p_nome_comprador       text,
  p_gateway_assinante_id text,
  p_documento_comprador  text,
  p_periodicidade        periodicidade_plano,
  p_valor_centavos       integer,
  p_recebido_em          timestamptz
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
      recebido_em
    )
    VALUES (
      p_id, p_token, p_gateway, p_transacao_externa, p_email_comprador,
      p_nome_comprador, p_gateway_assinante_id, p_documento_comprador,
      p_periodicidade, p_valor_centavos, p_recebido_em
    )
    ON CONFLICT (transacao_externa) DO UPDATE
      SET transacao_externa = EXCLUDED.transacao_externa
    RETURNING pagamento_pendente.id, pagamento_pendente.token, pagamento_pendente.status;
END;
$$;

-- ---------------------------------------------------------------------------
-- localizar_pagamento_por_token -- tela de reivindicacao. So os campos que
-- a confirmacao de compra precisa (caso 3 do plano: e-mail parcial e data,
-- nunca nome completo nem documento) -- o mascaramento do e-mail acontece
-- na aplicacao, nao aqui.
-- ---------------------------------------------------------------------------
CREATE FUNCTION localizar_pagamento_por_token(p_token text)
RETURNS TABLE (
  id              uuid,
  email_comprador text,
  recebido_em     timestamptz,
  status          status_pagamento_pendente
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.email_comprador, p.recebido_em, p.status
      FROM pagamento_pendente p
     WHERE p.token = p_token;
END;
$$;

-- ---------------------------------------------------------------------------
-- reivindicar_pagamento -- uso unico atomico (caso 2 do plano). So grava se
-- status ainda for 'pendente': dois cliques concorrentes no mesmo token,
-- so um dos dois UPDATE afeta a linha -- mesmo principio do updateMany de
-- aceitarConvite (usuarios.ts), em SQL porque quem chama ainda nao tem
-- empresa_id de contexto para passar pela politica normal.
--
-- NAO RECEBE empresa_id -- achado ao construir a rota que chama isto: a
-- Empresa ainda nao existe neste instante (o id e so um uuid gerado na
-- aplicacao, a linha nasce depois, por fretigate_app). Gravar empresa_id
-- aqui violaria a FK de pagamento_pendente.empresa_id -> empresa.id, que
-- ainda nao tem linha correspondente -- mesmo principio do CLAUDE.md
-- secao 9 ("criar uma empresa exige definir o contexto ANTES de
-- inserir"), aplicado aqui a ORDEM ENTRE DUAS TABELAS em vez de dentro de
-- uma so. O vinculo e gravado depois, por vincular_pagamento_a_empresa,
-- so quando a Empresa ja existe de verdade.
-- ---------------------------------------------------------------------------
CREATE FUNCTION reivindicar_pagamento(p_token text)
RETURNS TABLE (
  id                   uuid,
  nome_comprador       text,
  periodicidade        periodicidade_plano,
  gateway_assinante_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    UPDATE pagamento_pendente
       SET status = 'aceito'::status_pagamento_pendente, aceito_em = now()
     WHERE pagamento_pendente.token = p_token
       AND pagamento_pendente.status = 'pendente'
    RETURNING pagamento_pendente.id, pagamento_pendente.nome_comprador,
              pagamento_pendente.periodicidade, pagamento_pendente.gateway_assinante_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- vincular_pagamento_a_empresa -- grava o rastro de qual pagamento originou
-- qual empresa, DEPOIS que a Empresa ja existe de verdade (ver o
-- comentario de reivindicar_pagamento, acima, para o motivo da FK nao
-- deixar isso acontecer antes). Melhor esforco: se isto falhar depois de
-- criarEmpresaEDono ja ter criado a conta com sucesso, a pessoa ainda
-- entra normalmente -- so o rastro de auditoria fica incompleto, mesma
-- classe de estado parcial ja aceita em aceitarConvite (usuarios.ts) e em
-- gerarRelatorio (item 7).
--
-- GUARDA POR STATUS -- achada faltando pelo /revisar, 03/09/2026: com a
-- politica pagamento_pendente_acesso sendo USING (true) WITH CHECK (true),
-- a guarda escrita no comentario do topo do arquivo ("a escrita real fica
-- condicionada ao WHERE status = 'pendente' DENTRO de cada funcao") era o
-- UNICO filtro que existia -- e faltava aqui. So grava se status = 'aceito'
-- (reivindicar_pagamento ja rodou) e empresa_id ainda esta vazio -- nunca
-- sobrescreve um vinculo ja gravado.
-- ---------------------------------------------------------------------------
CREATE FUNCTION vincular_pagamento_a_empresa(p_pagamento_id uuid, p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pagamento_pendente
     SET empresa_id = p_empresa_id
   WHERE pagamento_pendente.id = p_pagamento_id
     AND pagamento_pendente.status = 'aceito'::status_pagamento_pendente
     AND pagamento_pendente.empresa_id IS NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- marcar_email_de_pagamento_enviado -- registra que o e-mail de ativacao
-- (com o link de reivindicacao) saiu com sucesso pela Resend. Decisao do
-- fundador, 03/09/2026: este e-mail deixou de ser reforco e virou o UNICO
-- caminho de entrega confirmado (a pagina de obrigado da Kiwify nao carrega
-- identificador nenhum, e o e-mail automatico da propria Kiwify nao serve
-- para produto de integracao externa -- docs/planos/item-13-assinatura.md).
-- O comando de visibilidade (caso 1 do plano) usa email_enviado_em para
-- separar "aguardando clique" de "e-mail nunca saiu, olhar primeiro".
-- Chamada só quando o envio de verdade teve sucesso -- nunca marca antes de
-- confirmar com a Resend.
--
-- GUARDA POR STATUS -- mesmo achado do /revisar de vincular_pagamento_a_
-- empresa, acima. So marca se status ainda for 'pendente' -- depois de
-- aceito ou estornado, marcar isto aqui nao tem sentido (o e-mail so serve
-- para reivindicar um token que ainda vale).
-- ---------------------------------------------------------------------------
CREATE FUNCTION marcar_email_de_pagamento_enviado(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pagamento_pendente
     SET email_enviado_em = now()
   WHERE pagamento_pendente.id = p_id
     AND pagamento_pendente.status = 'pendente'::status_pagamento_pendente;
END;
$$;

-- ---------------------------------------------------------------------------
-- estornar_pagamento_pendente -- webhook de reembolso/chargeback chegando
-- ANTES do clique (caso 4 do plano). So grava se status ainda for
-- 'pendente' -- se ja foi aceito, nao faz nada aqui: vira o outro caso,
-- assinatura existente mudando de estado, resolvido pela rota do webhook
-- via localizar_empresa_por_assinante_gateway, nao por esta funcao.
-- Devolve quantas linhas mudaram (0 ou 1) -- a rota do webhook usa isso pra
-- saber se ainda precisa procurar uma empresa ja existente.
-- ---------------------------------------------------------------------------
CREATE FUNCTION estornar_pagamento_pendente(p_transacao_externa text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linhas_afetadas integer;
BEGIN
  UPDATE pagamento_pendente
     SET status = 'estornado'::status_pagamento_pendente, estornado_em = now()
   WHERE pagamento_pendente.transacao_externa = p_transacao_externa
     AND pagamento_pendente.status = 'pendente';
  GET DIAGNOSTICS linhas_afetadas = ROW_COUNT;
  RETURN linhas_afetadas;
END;
$$;

-- ---------------------------------------------------------------------------
-- localizar_empresa_por_assinante_gateway -- eventos de assinatura DEPOIS
-- do primeiro pagamento (subscription_renewed/subscription_late/
-- subscription_canceled, e compra_reembolsada/chargeback quando a empresa
-- ja existe) chegam sem empresa_id de contexto, do mesmo jeito que
-- compra_aprovada chega -- so que agora o join e por
-- gateway_assinante_id, nao por token. So devolve o id: a rota do webhook
-- usa esse id para chamar db(empresaId) normalmente dai em diante -- RLS
-- por empresa_id = contexto volta a valer no proximo passo, esta funcao so
-- resolve o "antes de saber qual empresa".
-- ---------------------------------------------------------------------------
CREATE FUNCTION localizar_empresa_por_assinante_gateway(p_gateway_assinante_id text)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT e.id
      FROM empresa e
     WHERE e.gateway_assinante_id = p_gateway_assinante_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Troca de dono -- mesmo procedimento de fretigate_convite/
-- fretigate_reversor: GRANT CREATE so para o ALTER FUNCTION aceitar,
-- REVOKE logo depois (este papel nunca cria nada em execucao).
-- ---------------------------------------------------------------------------
GRANT CREATE ON SCHEMA "public" TO "fretigate_pagamento";

ALTER FUNCTION registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz) OWNER TO "fretigate_pagamento";
ALTER FUNCTION localizar_pagamento_por_token(text) OWNER TO "fretigate_pagamento";
ALTER FUNCTION reivindicar_pagamento(text) OWNER TO "fretigate_pagamento";
ALTER FUNCTION vincular_pagamento_a_empresa(uuid, uuid) OWNER TO "fretigate_pagamento";
ALTER FUNCTION marcar_email_de_pagamento_enviado(uuid) OWNER TO "fretigate_pagamento";
ALTER FUNCTION estornar_pagamento_pendente(text) OWNER TO "fretigate_pagamento";
ALTER FUNCTION localizar_empresa_por_assinante_gateway(text) OWNER TO "fretigate_pagamento";

REVOKE CREATE ON SCHEMA "public" FROM "fretigate_pagamento";

-- So fretigate_app chama isso, e so EXECUTE -- ela nunca ganha SELECT/
-- INSERT/UPDATE direto em pagamento_pendente, nem SELECT direto em empresa
-- alem do que a politica normal (empresa_isolamento) ja permite.
GRANT EXECUTE ON FUNCTION registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz) TO "fretigate_app";
GRANT EXECUTE ON FUNCTION localizar_pagamento_por_token(text) TO "fretigate_app";
GRANT EXECUTE ON FUNCTION reivindicar_pagamento(text) TO "fretigate_app";
GRANT EXECUTE ON FUNCTION vincular_pagamento_a_empresa(uuid, uuid) TO "fretigate_app";
GRANT EXECUTE ON FUNCTION marcar_email_de_pagamento_enviado(uuid) TO "fretigate_app";
GRANT EXECUTE ON FUNCTION estornar_pagamento_pendente(text) TO "fretigate_app";
GRANT EXECUTE ON FUNCTION localizar_empresa_por_assinante_gateway(text) TO "fretigate_app";

-- O POSTGRES CONCEDE EXECUTE A PUBLIC POR PADRAO EM FUNCAO NOVA -- protecao
-- generica (ALTER DEFAULT PRIVILEGES) nunca funcionou (CLAUDE.md secao 3).
-- So REVOKE direto, em cada funcao, fecha de verdade.
REVOKE EXECUTE ON FUNCTION registrar_pagamento_pendente(uuid, text, text, text, text, text, text, text, periodicidade_plano, integer, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION localizar_pagamento_por_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reivindicar_pagamento(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION vincular_pagamento_a_empresa(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION marcar_email_de_pagamento_enviado(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION estornar_pagamento_pendente(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION localizar_empresa_por_assinante_gateway(text) FROM PUBLIC;
