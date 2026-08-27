-- Recebimento vira entidade propria (item 6, Tarefa 3 -- decisao 6 do
-- plano, docs/planos/item-6-titulo-e-cobrancas.md).
--
-- O PROBLEMA QUE MOTIVOU
-- Um titulo pode ser recebido em mais de uma vez (dois parciais, ou
-- adiantamento + saldo). Os tres campos escalares que TituloReceber tinha
-- ate aqui (valor_recebido, data_pagamento, forma_pagamento) so guardam UM
-- fato -- um segundo recebimento sobrescreveria data e forma do primeiro,
-- que deixaria de existir sem nada avisar (CLAUDE.md secao 9: duas fontes
-- de verdade divergem; secao 2: "dado nao gravado na hora nao volta
-- depois"). Palavras do fundador, no plano: "o total continua certo,
-- ninguem percebe que a data e a forma do primeiro pagamento foram
-- sobrescritas".
--
-- A SAIDA: entidade propria, uma linha por recebimento. Os tres campos
-- saem de titulo_receber (nao viram cache dela) -- tudo passa a derivar
-- dos recebimentos.

CREATE TABLE "recebimento" (
    "id" UUID NOT NULL,
    "titulo_id" UUID NOT NULL,
    "valor" INTEGER NOT NULL,
    "data" TIMESTAMPTZ(6) NOT NULL,
    "forma" TEXT,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "recebimento_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE INDEX "recebimento_empresa_id_idx" ON "recebimento"("empresa_id");
CREATE INDEX "recebimento_titulo_id_idx" ON "recebimento"("titulo_id");

-- Positivo sempre -- reforca no banco o que o servidor ja recusa
-- (CLAUDE.md secao 4, "toda entrada validada no servidor"). A funcao
-- registrar_recebimento (mais abaixo) confere o mesmo antes de gravar; esta
-- e' a segunda camada, para quem inserir por fora dela (nao deveria existir
-- caminho assim hoje, mas a tabela nao depende disso para ficar correta).
ALTER TABLE "recebimento" ADD CONSTRAINT "recebimento_valor_positivo" CHECK ("valor" > 0);

ALTER TABLE "recebimento" ADD CONSTRAINT "recebimento_titulo_id_fkey"
  FOREIGN KEY ("titulo_id") REFERENCES "titulo_receber"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recebimento" ADD CONSTRAINT "recebimento_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recebimento" ADD CONSTRAINT "recebimento_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RLS -- falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "recebimento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recebimento" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "recebimento_isolamento" ON "recebimento"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) -- arquivar seria UPDATE, se um dia existir caminho
-- para isso.
--
-- Nota (CLAUDE.md secao 3): esta politica cobre leitura e escrita da propria
-- linha, mas NAO cobre a checagem das tres chaves estrangeiras acima --
-- cada uma e verificada pelo Postgres sem RLS. A garantia de que
-- titulo_id pertence a mesma empresa fica no servico
-- (src/lib/servicos/titulos.ts, buscarTituloReceber antes de gravar), com
-- teste proprio -- e a funcao abaixo, sujeita a RLS por nao ser SECURITY
-- DEFINER, e' uma segunda camada da mesma garantia. usuario_id nunca vem de
-- input do usuario (sempre da sessao, mesmo padrao de
-- Servico.criado_por_usuario_id), entao nao precisa de conferencia propria.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "recebimento" TO "fretigate_app";

-- ---------------------------------------------------------------------------
-- Backfill: preserva o fato de cada recebimento ja gravado (ate aqui, so
-- "Ja recebi" gravava valor_recebido) antes das 3 colunas saírem de
-- titulo_receber, logo abaixo.
--
-- usuario_id nunca existiu em titulo_receber -- ninguem registrou, antes
-- desta tarefa, quem deu baixa num titulo. Para o fato nao desaparecer em
-- silencio (CLAUDE.md secao 7), a aproximacao usada e'
-- Servico.criado_por_usuario_id: quem lancou o frete e quem, no fluxo de
-- hoje, toca "Ja recebi" no mesmo aviso de sucesso. Nao e garantia -- e a
-- melhor aproximacao disponivel, registrada aqui para quem ler esta
-- migration depois nao achar um esquecimento.
--
-- COALESCE(data_pagamento, criado_em) e defensivo, nao esperado: o codigo
-- sempre gravou os dois juntos (criarTituloJaRecebi, antes desta tarefa).
--
-- gen_random_uuid() aqui, mesma excecao contida ja registrada na migration
-- 20260809050000_tipo_operacao -- Postgres 17.6 sem gerador de uuid v7
-- nativo nem por extensao, e nao vale escrever um gerador de v7 em SQL so
-- para este backfill, que roda uma vez.
--
-- Roda pela conexao das migrations (postgres), que ignora RLS por atributo
-- -- desenho, nao brecha (CLAUDE.md secao 9): migration nao atende pedido
-- de usuario, atende quem opera.
INSERT INTO "recebimento" (id, titulo_id, valor, data, forma, usuario_id, empresa_id, criado_em, atualizado_em)
SELECT gen_random_uuid(), tr.id, tr.valor_recebido, COALESCE(tr.data_pagamento, tr.criado_em),
       tr.forma_pagamento, s.criado_por_usuario_id, tr.empresa_id, tr.criado_em, tr.atualizado_em
  FROM "titulo_receber" tr
  JOIN "servico" s ON s.id = tr.servico_id
 WHERE tr.valor_recebido IS NOT NULL;

-- As 3 colunas saem daqui -- nao viram cache de Recebimento (CLAUDE.md
-- secao 9: duas fontes de verdade divergem).
ALTER TABLE "titulo_receber" DROP COLUMN "valor_recebido";
ALTER TABLE "titulo_receber" DROP COLUMN "data_pagamento";
ALTER TABLE "titulo_receber" DROP COLUMN "forma_pagamento";

-- ---------------------------------------------------------------------------
-- registrar_recebimento -- grava um Recebimento e ajusta o status do
-- titulo, atomicamente. E' a garantia de que a soma dos recebimentos de um
-- titulo nunca passa do valor dele, mesmo sob concorrencia real (dois
-- toques simultaneos em "Confirmar recebimento", ou o mesmo em duas abas).
--
-- POR QUE UMA FUNCAO, E NAO UM UPDATE COM CONDICAO NO WHERE (o padrao de
-- editarServicoComProtecaoDeTitulo, src/lib/servicos/titulos.ts)
-- Aquele padrao funciona quando a condicao e uma comparacao simples na
-- PROPRIA linha sendo gravada. Aqui a condicao e um AGREGADO sobre outra
-- tabela (soma dos recebimentos existentes) que precisa ser lido e
-- comparado ANTES do INSERT, com garantia de que nenhum outro recebimento
-- concorrente se intromete entre a leitura e a gravacao -- e isso precisa
-- de trava explicita (FOR UPDATE), que so faz sentido dentro de uma unica
-- operacao atomica no banco. SQL cru so e permitido em src/lib/db e em
-- /tests (CLAUDE.md secao 3); a saida usada em todo o produto para logica
-- assim e uma funcao de banco, chamada de la (reverter_cadastro_incompleto
-- e o precedente).
--
-- SECURITY INVOKER (o padrao -- sem SECURITY DEFINER), de proposito,
-- diferente de reverter_cadastro_incompleto: esta funcao nao precisa
-- ignorar nenhum privilegio -- fretigate_app ja tem SELECT/INSERT/UPDATE
-- em titulo_receber e recebimento. Rodando como quem chamou, RLS continua
-- valendo dentro da funcao exatamente como valeria fora dela: um
-- p_titulo_id de OUTRA empresa nunca aparece no FOR UPDATE (a politica
-- titulo_receber_isolamento filtra antes), e a funcao recusa com
-- 'titulo_invalido' -- uma segunda camada da conferencia de FK que
-- src/lib/servicos/titulos.ts ja faz antes de chamar (CLAUDE.md secao 3).
--
-- O FOR UPDATE e a garantia inteira: ele trava a linha do titulo pela
-- duracao desta transacao. Um segundo INSERT concorrente para o MESMO
-- titulo espera essa transacao terminar antes de conseguir a propria
-- trava -- so entao le a soma (que ja inclui o primeiro recebimento, se
-- commitado) e decide se ainda cabe. Dois titulos DIFERENTES nao se
-- travam entre si (linhas diferentes).
CREATE FUNCTION registrar_recebimento(
  p_id uuid,
  p_titulo_id uuid,
  p_valor integer,
  p_data timestamptz,
  p_forma text,
  p_usuario_id text,
  p_empresa_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_valor_titulo integer;
  v_recebido integer;
BEGIN
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'saldo_insuficiente';
  END IF;

  SELECT valor INTO v_valor_titulo
    FROM titulo_receber
   WHERE id = p_titulo_id AND arquivado_em IS NULL AND status = 'aberto'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'titulo_invalido';
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_recebido
    FROM recebimento
   WHERE titulo_id = p_titulo_id AND arquivado_em IS NULL;

  IF p_valor + v_recebido > v_valor_titulo THEN
    RAISE EXCEPTION 'saldo_insuficiente';
  END IF;

  INSERT INTO recebimento (id, titulo_id, valor, data, forma, usuario_id, empresa_id)
  VALUES (p_id, p_titulo_id, p_valor, p_data, p_forma, p_usuario_id, p_empresa_id);

  UPDATE titulo_receber
     SET status = CASE WHEN p_valor + v_recebido >= v_valor_titulo
                        THEN 'pago'::status_titulo_receber
                        ELSE 'aberto'::status_titulo_receber END,
         atualizado_em = now()
   WHERE id = p_titulo_id;
END;
$$;

-- O Postgres concede EXECUTE a PUBLIC por padrao em funcao nova -- CLAUDE.md
-- secao 3: "toda migration que cria funcao fecha aquela funcao na hora, com
-- REVOKE EXECUTE direto na funcao". ALTER DEFAULT PRIVILEGES nunca fechou
-- isso de verdade (medido na tarefa 1 do item 3) -- so o REVOKE direto na
-- funcao protege.
REVOKE EXECUTE ON FUNCTION registrar_recebimento(uuid, uuid, integer, timestamptz, text, text, uuid) FROM PUBLIC;

-- So fretigate_app chama isso, e so EXECUTE.
GRANT EXECUTE ON FUNCTION registrar_recebimento(uuid, uuid, integer, timestamptz, text, text, uuid) TO "fretigate_app";
