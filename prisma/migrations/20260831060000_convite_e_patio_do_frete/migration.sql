-- Item 10, Tarefa 1: Fundamentos -- endereco do patio (Empresa) e a tabela
-- Convite (docs/planos/item-10-configuracoes-conta-e-usuarios.md).
--
-- PATIO_MUNICIPIO_ID
-- Segunda referencia de Empresa para Municipio (a primeira ja existe desde o
-- item 2, municipio_id) -- por isso a constraint de chave estrangeira abaixo
-- tem nome proprio, e o Prisma precisou de relacao nomeada
-- (EmpresaPatioMunicipio) para distinguir as duas.
--
-- CONVITE
-- Sempre papel 'operador' (decisao do fundador, 31/08/2026) -- o formulario
-- do Design nunca oferece seletor de papel. token e a propria credencial de
-- aceite, gerado com crypto.randomBytes na aplicacao (nunca DEFAULT do
-- banco).
--
-- A BUSCA POR TOKEN, ANTES DE SABER A EMPRESA
-- Convite e tabela de dominio (tem empresa_id, isolada como qualquer outra),
-- e fretigate_auth (src/lib/db/sem-filtro-de-empresa.ts) nunca pode alcancar
-- tabela de dominio -- a garantia esta escrita la, "hoje e quando existirem".
-- Decisao do fundador, 31/08/2026, depois de medir tres caminhos (como o
-- Better Auth resolve o token de recuperacao de senha; Convite entrar no
-- conjunto de autenticacao; funcao SECURITY DEFINER dedicada): a busca roda
-- dentro de uma funcao propria (localizar_convite_por_token, no fim deste
-- arquivo), dona de um papel novo (fretigate_convite) com uma politica so
-- sua, USING (true) -- mesmo mecanismo de usuario_autenticacao, mas preso
-- dentro da funcao. Ela devolve so id/empresa_id/telefone/nome/papel/status,
-- nunca a linha inteira, e nenhuma tabela de autenticacao ganha alcance novo.
--
-- A funcao so recusa o que impede achar o convite (token que nao existe) --
-- convite vencido, ja usado ou cancelado e decisao do servico
-- (src/lib/servicos/usuarios.ts), nao da funcao: regra de negocio mora em
-- src/lib/servicos, nunca em SQL (decisao do fundador, mesma conversa).
--
-- TELEFONE, NAO EMAIL (achado do /revisar, decisao do fundador, 31/08/2026)
-- O formulario que o Design desenhou (docs/componentes.md, "Usuarios --
-- convite") pede nome e WhatsApp, nunca e-mail -- e o convite e sempre por
-- WhatsApp (docs/especificacao.md, "convite de usuario nao manda e-mail").
-- O e-mail da conta nasce so quando a pessoa aceita, digitado por ela em
-- (auth)/aceitar-convite -- nunca antes.

-- ---------------------------------------------------------------------------
-- Empresa.patio_endereco / patio_municipio_id
-- ---------------------------------------------------------------------------
ALTER TABLE "empresa" ADD COLUMN "patio_endereco" TEXT;
ALTER TABLE "empresa" ADD COLUMN "patio_municipio_id" INTEGER;

ALTER TABLE "empresa" ADD CONSTRAINT "empresa_patio_municipio_id_fkey"
  FOREIGN KEY ("patio_municipio_id") REFERENCES "municipio"("codigo_ibge")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CONVITE
-- ---------------------------------------------------------------------------
CREATE TYPE "status_convite" AS ENUM ('pendente', 'aceito', 'cancelado');

CREATE TABLE "convite" (
    "id" UUID NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "papel_usuario" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "status_convite" NOT NULL DEFAULT 'pendente',
    "enviado_em" TIMESTAMPTZ(6) NOT NULL,
    "aceito_em" TIMESTAMPTZ(6),
    "empresa_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivado_em" TIMESTAMPTZ(6),

    CONSTRAINT "convite_pkey" PRIMARY KEY ("id")
);

-- Sem DEFAULT para "id": a aplicacao gera o uuid antes do INSERT, como em
-- toda tabela do dominio.

CREATE UNIQUE INDEX "convite_token_key" ON "convite"("token");
CREATE INDEX "convite_empresa_id_idx" ON "convite"("empresa_id");

ALTER TABLE "convite" ADD CONSTRAINT "convite_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "convite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "convite" FORCE  ROW LEVEL SECURITY;

CREATE POLICY "convite_isolamento" ON "convite"
  USING      ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid)
  WITH CHECK ("empresa_id" = nullif(current_setting('app.empresa_id', true), '')::uuid);

-- Privilegio da aplicacao. SEM DELETE (CLAUDE.md secao 7, nada e apagado) --
-- cancelar e UPDATE de status.
GRANT SELECT, INSERT, UPDATE ON "convite" TO "fretigate_app";

-- ---------------------------------------------------------------------------
-- fretigate_convite -- privilegio minimo e NOMEADO, so para a funcao abaixo.
-- Mesma forma de fretigate_reversor (migration
-- 20260807090000_reverter_cadastro_incompleto): NOLOGIN, NOBYPASSRLS, sem
-- nenhuma outra tabela.
--
-- A politica USING (true) e restrita a este papel -- nao afrouxa nada para
-- fretigate_app, que continua so com convite_isolamento (politicas
-- permissivas se somam por OU, mas so entre si; um papel que nao e alvo de
-- uma politica nao ganha nada dela).
--
-- WITH CHECK (false) explicito, mesma forma de municipio_leitura
-- (CLAUDE.md secao 9: as duas clausulas sempre escritas) -- este papel so
-- tem SELECT concedido, entao nunca gravaria de qualquer jeito; o WITH CHECK
-- e defesa em profundidade, nao a unica trava.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fretigate_convite') THEN
    CREATE ROLE "fretigate_convite" NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "fretigate_convite";
GRANT SELECT ON "convite" TO "fretigate_convite";

CREATE POLICY "convite_busca_por_token" ON "convite"
  TO "fretigate_convite"
  USING      (true)
  WITH CHECK (false);

-- Necessario para o ALTER FUNCTION ... OWNER TO mais abaixo -- mesmo motivo
-- de fretigate_reversor.
GRANT "fretigate_convite" TO "postgres";

CREATE FUNCTION localizar_convite_por_token(p_token text)
RETURNS TABLE (
  id         uuid,
  empresa_id uuid,
  telefone   text,
  nome       text,
  papel      papel_usuario,
  status     status_convite
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sem set_config nenhum: e exatamente por nao saber a empresa que esta
  -- funcao existe. A leitura ampla vem so da politica convite_busca_por_token,
  -- restrita ao dono desta funcao.
  RETURN QUERY
    SELECT c.id, c.empresa_id, c.telefone, c.nome, c.papel, c.status
      FROM convite c
     WHERE c.token = p_token;
END;
$$;

-- Trocar o dono de um objeto exige que o NOVO dono tenha CREATE no schema --
-- regra do proprio Postgres para ALTER ... OWNER TO, nao escolha nossa.
-- fretigate_convite nunca usa isso pra criar nada (NOLOGIN, e SECURITY
-- DEFINER so roda o corpo da funcao) -- o grant existe so PARA a troca de
-- dono abaixo, e sai logo depois. Mesmo padrao de fretigate_reversor
-- (migration 20260807090000_reverter_cadastro_incompleto).
GRANT CREATE ON SCHEMA "public" TO "fretigate_convite";

ALTER FUNCTION localizar_convite_por_token(text) OWNER TO "fretigate_convite";

-- O CREATE era so para a linha acima aceitar a troca de dono. Sai agora --
-- este papel nunca precisa criar nada em execucao.
REVOKE CREATE ON SCHEMA "public" FROM "fretigate_convite";

-- So fretigate_app chama isso, e so EXECUTE -- ela nunca ganha SELECT direto
-- na tabela alem do que convite_isolamento ja permite.
GRANT EXECUTE ON FUNCTION localizar_convite_por_token(text) TO "fretigate_app";

-- O POSTGRES CONCEDE EXECUTE A PUBLIC POR PADRAO EM FUNCAO NOVA -- protecao
-- generica (ALTER DEFAULT PRIVILEGES) nunca funcionou, medido na tarefa 1 do
-- item 3 (CLAUDE.md secao 3). So REVOKE direto, na propria funcao, fecha de
-- verdade.
REVOKE EXECUTE ON FUNCTION localizar_convite_por_token(text) FROM PUBLIC;
