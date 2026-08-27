-- Estorno (item 6, Tarefa 6): o indice unico parcial
-- "titulo_receber_um_integral_por_servico" (migration
-- 20260814150000_titulo_integral_unico_por_frete) e
-- "WHERE integral = true AND arquivado_em IS NULL" -- nao exclui
-- status = 'cancelado'. Sem esta correcao, o estorno cancela o titulo e o
-- frete volta a "A faturar" na tela, mas refaturar falha: a leitura de
-- faturarServico deixa passar (procura so titulo ativo) e o banco recusa
-- com erro de unicidade, traduzido para "Este frete ja foi faturado" --
-- mentira, ja que o anterior esta cancelado.
--
-- A correcao faz o indice dizer o que a regra diz: no maximo um titulo
-- integral ATIVO por frete -- nao um titulo integral qualquer.
--
-- Indice unico parcial, nao modelavel em schema.prisma -- mesma limitacao
-- ja registrada na migration anterior.

DROP INDEX "titulo_receber_um_integral_por_servico";

CREATE UNIQUE INDEX "titulo_receber_um_integral_por_servico"
  ON "titulo_receber" ("servico_id")
  WHERE "integral" = true AND "arquivado_em" IS NULL AND "status" <> 'cancelado';
