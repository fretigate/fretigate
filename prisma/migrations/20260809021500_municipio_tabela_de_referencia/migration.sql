-- Municipio: a tabela global de referencia, base do IBGE.
--
-- Nao e dado de usuario. Nao tem empresa_id e nao tem id proprio — a chave e o
-- codigo_ibge, oficial e estavel. As duas excecoes estao declaradas na
-- especificacao (secao 6), no schema.prisma e em tests/isolamento/schema.test.ts.
--
-- Quem grava aqui e a seed (prisma/seed/municipios.mts), por ESTA conexao (a
-- das migrations). A aplicacao recebe so SELECT.

-- ---------------------------------------------------------------------------
-- 0. A CONFERENCIA QUE PRECISA VIR ANTES DA CHAVE ESTRANGEIRA.
--
-- A ordem importa e e contraintuitiva: a chave estrangeira de
-- empresa.municipio_id nasce aqui, mas a tabela municipio so recebe as 5.570
-- linhas depois, quando alguem rodar a seed. Ou seja, a ligacao e criada
-- apontando para uma tabela VAZIA.
--
-- Isso e seguro enquanto todo municipio_id for nulo — nulo nao referencia nada,
-- entao nao ha o que conferir. Com um valor preenchido, o Postgres recusaria a
-- criacao da chave com uma mensagem generica de violacao, e quem estivesse
-- publicando levaria um tempo ate entender que o problema era a ORDEM, nao o
-- dado.
--
-- Esta conferencia troca essa mensagem generica por uma que diz o que fazer.
-- Ela vale onde quer que a migration rode: desenvolvimento, esteira e producao
-- quando ela existir — que e mais do que qualquer conferencia manual feita uma
-- vez numa maquina so consegue prometer.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pendentes bigint;
BEGIN
  SELECT count(*) INTO pendentes FROM "empresa" WHERE "municipio_id" IS NOT NULL;

  IF pendentes > 0 THEN
    RAISE EXCEPTION
      'Ha % empresa(s) com municipio_id preenchido, e a tabela municipio ainda esta vazia. '
      'Rode a seed (npm run seed:municipios) ANTES desta migration, ou confira se esses '
      'codigos existem na base do IBGE.', pendentes;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 1. A tabela.
-- ---------------------------------------------------------------------------
CREATE TABLE "municipio" (
    "codigo_ibge" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "nome_normalizado" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "municipio_pkey" PRIMARY KEY ("codigo_ibge")
);

-- Indice de PREFIXO. `text_pattern_ops` e o que faz `nome_normalizado LIKE
-- 'forta%'` usar indice; sem ele o Postgres varre as 5.570 linhas a cada tecla
-- digitada, e a busca de municipio acontece enquanto a pessoa digita.
CREATE INDEX "municipio_nome_normalizado_idx" ON "municipio"("nome_normalizado" text_pattern_ops);

-- ---------------------------------------------------------------------------
-- 2. A ligacao com empresa. So depois da conferencia acima.
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_municipio_id_fkey"
  FOREIGN KEY ("municipio_id") REFERENCES "municipio"("codigo_ibge")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. RLS.
--
-- Municipio nao tem empresa_id, entao nao ha isolamento por empresa a fazer.
-- Mas ENABLE e FORCE entram do mesmo jeito, e a politica tambem: e o que
-- tests/isolamento/schema.test.ts exige de TODA tabela, e tabela sem RLS ligada
-- vira o precedente que a proxima copia.
--
-- USING (true) WITH CHECK (false) — le tudo, grava nada.
--
-- AS DUAS CLAUSULAS DA SECAO 9 ESTAO AQUI, SEM EXCECAO NENHUMA, e isso e o
-- ponto: a forma obvia seria `FOR SELECT USING (true)`, que teria pedido uma
-- excecao — politica FOR SELECT nao aceita WITH CHECK. A forma escolhida e MAIS
-- RIGIDA que ela, nao mais frouxa: nao existe comando de escrita concedido, E
-- a politica recusa a escrita de todo papel sujeito a ela.
--
-- ATE ONDE ESSA PROTECAO VAI, dito com precisao: "todo papel sujeito a ela" NAO
-- inclui `postgres`, que ignora RLS por atributo (rolbypassrls) — nem ENABLE
-- nem FORCE mudam isso. Quem grava as 5.570 linhas e a seed, pela conexao das
-- migrations, que E `postgres`. Ou seja: a politica protege contra
-- `fretigate_app` e contra qualquer papel futuro, e NAO protege contra a
-- conexao das migrations — igual a toda migration, que tambem pode tudo.
--
-- Isso e desenho, nao brecha: a regra da secao 9 do CLAUDE.md e "nenhuma
-- conexao que atende PEDIDO DE USUARIO ignora RLS". Comando de operacao —
-- migration e seed — roda como `postgres` por desenho. O que separa os dois
-- casos e quem chama: o `fretigate_reversor` existe porque aquela funcao roda
-- durante o pedido do usuario; esta seed e chamada por quem opera.
--
-- Duas camadas de proposito para a aplicacao, como no resto do projeto: o
-- privilegio (item 4, que nem concede INSERT/UPDATE) e a politica. Uma sozinha
-- volta em silencio no dia em que alguem rodar um GRANT amplo.
-- ---------------------------------------------------------------------------
ALTER TABLE "municipio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "municipio" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "municipio_leitura" ON "municipio"
  USING      (true)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 4. Privilegio: SO leitura para a aplicacao.
--
-- Nenhum INSERT, nenhum UPDATE, nenhum DELETE. Municipio e dado de referencia
-- global: nenhuma tela do produto escreve nele, e a garantia disso nao e
-- disciplina de quem escreve consulta — e a AUSENCIA do GRANT.
--
-- fretigate_auth nao recebe nada, como em toda tabela de dominio.
-- ---------------------------------------------------------------------------
GRANT SELECT ON "municipio" TO "fretigate_app";
