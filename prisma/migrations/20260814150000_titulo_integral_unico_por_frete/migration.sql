-- Titulo integral por frete (tarefa 3 do item 3, correcao da revisao):
-- a checagem de "um titulo por frete" em codigo (findFirst + create) tem
-- corrida sob concorrencia real -- dois pedidos simultaneos passam os dois
-- pela checagem antes de qualquer INSERT terminar. Quem garante precisa ser
-- o banco, nao a aplicacao (CLAUDE.md secao 3, mesmo principio do RLS: "e o
-- banco que garante, nao ela").
--
-- "integral" diz que um TituloReceber cobre o valor inteiro do frete, em
-- oposicao a uma fracao dele -- adiantamento, saldo (docs/especificacao.md,
-- entidade TituloReceber; comentario do model em prisma/schema.prisma). Um
-- frete tem no maximo um titulo integral; pode ter qualquer numero de
-- titulos nao integrais -- e por isso a restricao nao pode ser "um titulo
-- por servico_id" em geral, so "um titulo INTEGRAL por servico_id".
--
-- Indice unico parcial, nao modelavel em schema.prisma -- mesma limitacao
-- de "cliente_empresa_id_documento_key" (tests/clientes.test.ts).

ALTER TABLE "titulo_receber" ADD COLUMN "integral" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "titulo_receber_um_integral_por_servico"
  ON "titulo_receber" ("servico_id")
  WHERE "integral" = true AND "arquivado_em" IS NULL;
