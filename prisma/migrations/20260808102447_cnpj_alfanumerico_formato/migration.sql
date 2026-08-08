-- Formato do CNPJ, alinhado ao alfanumerico (RFB, inscricao nova a partir de
-- 31/07/2026): 12 primeiras posicoes letra maiuscula (A-Z) ou digito, 2
-- digitos verificadores finais so numero. Sem pontuacao, sem minuscula.
--
-- O indice unico "empresa_cnpj_key" ja existente (migration
-- 20260806213650_planos_status_e_cnpj_unico) so deduplica o valor exato que
-- foi gravado -- ele nao garante que o valor gravado ja passou por
-- normalizacao. Se a aplicacao gravar sem normalizar, "12.345.678/0001-90" e
-- "12345678000190" sao strings diferentes para o indice, e a trava nao vale
-- nada (comentario ja existia no schema, ainda nao havia restricao que o
-- provasse). Esta restricao fecha essa lacuna no proprio banco, em vez de
-- confiar so na disciplina da aplicacao -- mesmo raciocinio do RLS falha
-- fechada (CLAUDE.md secao 9): a garantia vive na camada que nao pode ser
-- esquecida, nao so em codigo de aplicacao.
--
-- Tabela vazia (conferido, zero linhas) -- decisao do fundador de corrigir
-- agora, antes de existir CNPJ cadastrado, em vez de depois com dado real
-- para migrar.
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_cnpj_formato" CHECK (
  "cnpj" IS NULL OR "cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$'
);
