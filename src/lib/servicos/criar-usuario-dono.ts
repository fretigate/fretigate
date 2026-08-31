import { auth } from "@/lib/auth";

/**
 * Cria um Usuário + credencial de senha, por dentro do Better Auth.
 *
 * ISOLADO NUM ARQUIVO SÓ, DE PROPÓSITO (decisão do fundador, 07/08/2026).
 *
 * Não existe rota pública do Better Auth para isto: `auth.api.signUpEmail`
 * está desligada (`disableSignUp: true`, ver `src/lib/auth/index.ts`) e
 * filtraria `empresa_id`/`papel` mesmo se não estivesse. A alternativa
 * pública mais próxima é `auth.api.createUser`, do plugin `admin` — mas
 * adotá-lo significa importar o plugin inteiro: 15 endpoints (banir,
 * personificar, listar usuário através de empresas, revogar sessão de
 * qualquer um...), nenhum dos quais o produto usa nem deveria, mais um campo
 * `role` de schema que não é o nosso `papel`. É um plugin de administrador
 * com sessão, para o caso de uma empresa se cadastrando — ferramenta errada,
 * mesmo funcionando.
 *
 * Por isso o caminho é `ctx.internalAdapter`/`ctx.password` — não é um
 * backdoor não documentado, é a mesma peça publicada em `@better-auth/core`
 * que o próprio plugin `admin` usa por baixo (conferido no código-fonte
 * dele). O risco de uma interface trocar de nome numa atualização é menor e
 * mais controlado do que o risco de superfície de importar 15 endpoints
 * administrativos: `tests/cadastro.test.ts` confere que as três funções
 * abaixo continuam existindo, e quebra alto, aqui, se não continuarem — não
 * quebra em produção, calado.
 *
 * `papel` entrou como parâmetro no item 10, Tarefa 1: `aceitarConvite`
 * (`src/lib/servicos/usuarios.ts`) precisa do mesmo mecanismo para criar um
 * operador, não só um dono — segundo caso de uso real, não abstração
 * especulativa (`CLAUDE.md` §6).
 */
export async function criarUsuario(
  ctx: Awaited<typeof auth.$context>,
  dados: { email: string; nome: string; empresaId: string; senha: string; papel: "dono" | "operador" },
) {
  const hash = await ctx.password.hash(dados.senha);
  const usuarioCriado = await ctx.internalAdapter.createUser({
    email: dados.email,
    name: dados.nome,
    emailVerified: false,
    empresa_id: dados.empresaId,
    papel: dados.papel,
  });
  await ctx.internalAdapter.linkAccount({
    userId: usuarioCriado.id,
    providerId: "credential",
    accountId: usuarioCriado.id,
    password: hash,
  });
  return usuarioCriado;
}

export async function criarUsuarioDono(
  ctx: Awaited<typeof auth.$context>,
  dados: { email: string; nome: string; empresaId: string; senha: string },
) {
  return criarUsuario(ctx, { ...dados, papel: "dono" });
}
