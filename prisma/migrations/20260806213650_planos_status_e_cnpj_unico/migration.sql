-- Planos, periodicidade, status da assinatura e CNPJ unico.
--
-- As colunas `plano` e `status_assinatura` eram texto e viram enumeracao. O
-- DROP/ADD abaixo descarta o conteudo delas: e seguro porque a tabela esta
-- vazia (conferido, zero linhas) e nenhum dado real entrou ainda. Repetir isso
-- com a tabela populada exigiria conversao com USING, nao DROP.

-- CreateEnum
CREATE TYPE "plano_empresa" AS ENUM ('gratuito', 'pago');

-- CreateEnum
CREATE TYPE "periodicidade_plano" AS ENUM ('mensal', 'anual');

-- CreateEnum
CREATE TYPE "status_assinatura_empresa" AS ENUM ('ativa', 'inadimplente', 'vencida', 'encerrada');

-- AlterTable
ALTER TABLE "empresa" ADD COLUMN     "periodicidade" "periodicidade_plano",
DROP COLUMN "plano",
ADD COLUMN     "plano" "plano_empresa" NOT NULL DEFAULT 'gratuito',
DROP COLUMN "status_assinatura",
ADD COLUMN     "status_assinatura" "status_assinatura_empresa" NOT NULL DEFAULT 'ativa';

-- CreateIndex
-- CNPJ unico sobre TODAS as linhas, arquivadas incluidas. E trava anti-abuso:
-- indice parcial por `arquivado_em` deixaria arquivar e cadastrar de novo para
-- zerar o limite do plano gratuito. Nulo nao colide com nulo no Postgres, que e
-- o que permite o CNPJ ser preenchido depois.
CREATE UNIQUE INDEX "empresa_cnpj_key" ON "empresa"("cnpj");

-- ---------------------------------------------------------------------------
-- Coerencia entre plano, periodicidade e status. Escrito a mao: o Prisma nao
-- modela CHECK.
--
-- Sem isto, "gratuito fica sempre ativa" seria so uma frase no documento, e
-- bastaria um caminho de codigo esquecido para existir empresa gratuita
-- inadimplente — que nao quer dizer nada, e que a tela de cobranca nao sabe
-- desenhar.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_plano_coerente" CHECK (
  (
    "plano" = 'gratuito'
    AND "periodicidade" IS NULL
    AND "status_assinatura" = 'ativa'
  )
  OR
  (
    "plano" = 'pago'
    AND "periodicidade" IS NOT NULL
  )
);
