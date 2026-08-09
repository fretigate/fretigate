-- TipoOperacao: o que Servico (item 3) vai apontar para. Toda empresa nasce
-- com os quatro (Frete, Reboque, Guincho, Mudanca), so Frete ativo — e essa
-- criacao mora na mesma transacao que cria a Empresa, nunca num passo
-- seguinte (CLAUDE.md secao 9, docs/especificacao.md).
--
-- ESTA MIGRATION PREENCHE AS EMPRESAS QUE JA EXISTEM. Sem isso, qualquer
-- empresa criada antes desta tabela nascer ficaria sem tipo nenhum, e o
-- primeiro frete dela nao teria o que escolher num campo obrigatorio. Hoje
-- so ha empresas de teste nos bancos de desenvolvimento e de teste (nenhum
-- dos dois recebe dado real — CLAUDE.md secao 5), mas a migration nao
-- assume isso: ela roda igual em qualquer banco, produção incluida.

-- ---------------------------------------------------------------------------
-- 1. A tabela.
-- ---------------------------------------------------------------------------
CREATE TABLE "tipo_operacao" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "ordem" INTEGER NOT NULL,
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "tipo_operacao_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": como em "empresa", quem gera o uuid e a aplicacao
-- (Prisma, `@default(uuid(7))`), antes do INSERT — nunca o banco.

CREATE INDEX "tipo_operacao_empresa_id_idx" ON "tipo_operacao"("empresa_id");

-- Unico por empresa: a mesma empresa nunca tem "frete" duas vezes, mas
-- "frete" existe em todas as empresas.
CREATE UNIQUE INDEX "tipo_operacao_empresa_id_slug_key" ON "tipo_operacao"("empresa_id", "slug");

-- ON DELETE CASCADE, e nao RESTRICT como o resto do dominio.
--
-- TipoOperacao nasce SEMPRE junto da Empresa, na mesma transacao — nunca
-- existe uma Empresa sem os quatro. Isso importa para
-- `reverter_cadastro_incompleto` (prisma/migrations/20260807090000_...):
-- ela apaga a Empresa orfa quando o passo 2 do cadastro (criar o Usuario)
-- falha depois do passo 1 (criar a Empresa) ja ter sido gravado. Com
-- RESTRICT, esse DELETE seria recusado pelos quatro TipoOperacao que ja
-- existem apontando para a Empresa que a funcao tenta apagar — e a reversao,
-- que existe exatamente para o caso em que algo falha no meio, falharia ela
-- mesma.
--
-- CASCADE aqui e seguro: a guarda "NOT EXISTS (... usuario ...)" dentro da
-- funcao continua de pe, inteira — ela decide SE a Empresa pode ser apagada.
-- O que o CASCADE muda e so o que acontece com as linhas que dependem da
-- Empresa depois que essa decisao ja foi tomada.
--
-- MEDIDO, NAO SUPOSTO: o CASCADE apaga os quatro TipoOperacao mesmo com
-- `fretigate_reversor` (o papel sem BYPASSRLS que a funcao usa) sem privilegio
-- NENHUM em tipo_operacao — nem SELECT, nem DELETE. A acao referencial do
-- Postgres roda por fora do privilegio e da politica de RLS do papel que
-- disparou o DELETE na tabela pai; ela nao e "mais um DELETE comum" sujeito as
-- mesmas regras. Por isso ESTE PAPEL NAO PRECISA DE NENHUM GRANT NOVO — o
-- alcance dele continua exatamente o que a migration
-- 20260807090000_reverter_cadastro_incompleto documenta: empresa e usuario, e
-- nada mais.
ALTER TABLE "tipo_operacao" ADD CONSTRAINT "tipo_operacao_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. RLS — falha fechada, como toda tabela de dominio (CLAUDE.md secao 9).
-- ---------------------------------------------------------------------------
ALTER TABLE "tipo_operacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tipo_operacao" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "tipo_operacao_isolamento" ON "tipo_operacao"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- 3. Privilegio da aplicacao. SEM DELETE, de proposito: nada e apagado
-- (CLAUDE.md secao 7) — arquivar e UPDATE. Nao conceder o privilegio
-- transforma a regra em impossibilidade, igual a "empresa" e "usuario".
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON "tipo_operacao" TO "fretigate_app";

-- `fretigate_reversor` NAO recebe nada aqui — o comentario da chave
-- estrangeira acima explica por que o CASCADE dele nao precisa. Escrito de
-- proposito, para quem ler esta migration nao achar a ausencia um
-- esquecimento.

-- ---------------------------------------------------------------------------
-- 4. Preenche as empresas que ja existem.
--
-- Roda pela conexao das migrations (`postgres`), que ignora RLS por atributo
-- — e isso e desenho, nao brecha: CLAUDE.md secao 9 diz que nenhuma conexao
-- que ATENDE PEDIDO DE USUARIO ignora RLS, e migration nao atende pedido de
-- usuario, e sim de quem opera.
--
-- ON CONFLICT DO NOTHING sobre a chave (empresa_id, slug): se alguma empresa
-- ja tivesse os quatro por algum motivo, esta linha nao duplicaria nem
-- sobrescreveria — mas hoje isso nunca acontece, porque a tabela acaba de
-- nascer.
--
-- `gen_random_uuid()` AQUI, NAO uuid v7 — e e uma excecao contida, nao o
-- padrao da tabela. A aplicacao sempre grava com `@default(uuid(7))`
-- (Prisma); este Postgres (17.6) nao tem gerador de uuid v7 nativo nem por
-- extensao (conferido: so uuid-ossp e pgcrypto, os dois so ate v4/v5), e
-- escrever um gerador de v7 em SQL so para 4 linhas por empresa, uma vez, seria
-- mais codigo do que o problema pede. Nao tem custo real: nada le "id" de
-- TipoOperacao esperando ordem cronologica — quem faz isso e `ordem` (exibicao)
-- e `criado_em` (tempo), os dois preenchidos certos aqui.
-- ---------------------------------------------------------------------------
INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
SELECT gen_random_uuid(), e.id, v.nome, v.slug, v.ativo, v.ordem
  FROM "empresa" e
  CROSS JOIN (VALUES
    ('Frete',    'frete',    true,  1),
    ('Reboque',  'reboque',  false, 2),
    ('Guincho',  'guincho',  false, 3),
    ('Mudança',  'mudanca',  false, 4)
  ) AS v(nome, slug, ativo, ordem)
ON CONFLICT (empresa_id, slug) DO NOTHING;
