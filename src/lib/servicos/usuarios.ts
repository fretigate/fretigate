import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, localizarConvitePorToken } from "@/lib/db";
import { auth } from "@/lib/auth";
import { criarUsuario } from "@/lib/servicos/criar-usuario-dono";

/**
 * Usuário e Convite (item 10, Tarefa 1 — `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, "Fundamentos: schema e
 * serviços") — tudo por `db(empresaId)`, a única porta de acesso a dados
 * (`CLAUDE.md` §3), com a única exceção de `aceitarConvite`: ela não tem
 * `empresaId` para começar — é o que `localizarConvitePorToken`
 * (`src/lib/db`) existe para descobrir. Ver o comentário do `model Convite`
 * em `prisma/schema.prisma` para o porquê.
 */

const CAMPOS_USUARIO = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ultimo_acesso_em: true,
  criado_em: true,
} as const;

/** "Usuários — lista" (`docs/componentes.md`) — só os que têm acesso hoje. */
export function listarUsuarios(empresaId: string) {
  return db(empresaId).usuario.findMany({
    where: { arquivado_em: null },
    select: CAMPOS_USUARIO,
    orderBy: { criado_em: "asc" },
  });
}

/** "Usuários — detalhe" (`docs/componentes.md`). */
export function buscarUsuario(empresaId: string, id: string) {
  return db(empresaId).usuario.findUnique({ where: { id }, select: CAMPOS_USUARIO });
}

/**
 * "Remover acesso" — destrutiva, só visível para o dono
 * (`docs/especificacao.md` §4.9), e não apaga histórico: arquivar, nunca
 * `DELETE` (`CLAUDE.md` §7) — os fretes/cobranças já lançados por esse
 * usuário continuam apontando para a linha.
 *
 * **O acesso do dono não é removível** (`docs/componentes.md`, "Usuários —
 * detalhe") — a regra é sobre o `papel` do ALVO, não sobre "o chamador não
 * remove a si mesmo" (achado do segundo `/revisar`, 31/08/2026: a primeira
 * versão comparava `usuarioId === chamadoPorUsuarioId`, que hoje coincide
 * com a regra escrita só porque existe um único dono por empresa —
 * `CLAUDE.md` §2, "texto/código certo só por coincidência de estado". Lida
 * pelo próprio banco, escopado por empresa (`db(empresaId)`), não por um
 * parâmetro de quem chama.
 */
export async function removerAcesso(empresaId: string, usuarioId: string) {
  const alvo = await db(empresaId).usuario.findUnique({
    where: { id: usuarioId },
    select: { papel: true },
  });
  if (!alvo) throw new Error("Usuário não encontrado.");
  if (alvo.papel === "dono") throw new Error("O acesso do dono não pode ser removido.");

  return db(empresaId).usuario.update({
    where: { id: usuarioId },
    data: { arquivado_em: new Date() },
    select: CAMPOS_USUARIO,
  });
}

const CAMPOS_CONVITE = {
  id: true,
  telefone: true,
  nome: true,
  papel: true,
  status: true,
  enviado_em: true,
  aceito_em: true,
  /**
   * `token` entrou na Tarefa 4 (item 10) — a tela precisa dele para "Ver o
   * que ela recebe" (link real para `/aceitar-convite?token=`) e para
   * remontar a mensagem do WhatsApp depois de "Reenviar". Seguro só por quem
   * chama: as quatro funções que leem `CAMPOS_CONVITE`
   * (`listarConvitesPendentes`, `convidarUsuario`, `reenviarConvite`,
   * `cancelarConvite`, abaixo) só respondem a `comoDono`
   * (`src/app/(app)/conta/usuarios/acoes.ts`) — o token nunca chega a quem
   * não seja o próprio dono da empresa.
   */
  token: true,
} as const;

/**
 * "Usuários — lista", bloco de convite pendente (`docs/especificacao.md`
 * §4.9: "Convite pendente com reenviar e cancelar"). Só `pendente` — aceito
 * já virou `Usuario` (aparece em `listarUsuarios`), cancelado não tem ação
 * nenhuma para oferecer.
 */
export function listarConvitesPendentes(empresaId: string) {
  return db(empresaId).convite.findMany({
    where: { status: "pendente", arquivado_em: null },
    select: CAMPOS_CONVITE,
    orderBy: { enviado_em: "desc" },
  });
}

/**
 * A credencial de aceite — não reaproveita o código de 24 caracteres do
 * Better Auth (vive em `verification`, tabela da biblioteca, sem porta de
 * saída para `Convite`). `base64url`: sem `+`/`/`/`=`, seguro dentro de uma
 * URL sem escapar nada.
 */
function gerarTokenDeConvite(): string {
  return randomBytes(32).toString("base64url");
}

export type DadosConvite = { telefone: string; nome: string };

/**
 * Cria o convite — **sempre papel `operador`** (decisão do fundador,
 * 31/08/2026): o formulário que o Design desenhou (`docs/componentes.md`,
 * "Usuários — convite") nunca oferece seletor de papel; só o dono original
 * tem esse papel. Se um dia isso mudar, é decisão nova, não inferida por
 * analogia com esta.
 *
 * **`telefone`, texto livre, sem normalizar nem validar aqui** — mesmo
 * padrão de `Cliente.telefone`/`Motorista.telefone` (`src/lib/utils/
 * telefone.ts`): o que se grava é o texto como a pessoa digitou; validação e
 * normalização (`normalizarTelefone`) acontecem só na hora de montar o link
 * do WhatsApp, na tela (Tarefa 4) — não na gravação.
 */
export async function convidarUsuario(empresaId: string, dados: DadosConvite) {
  const telefone = dados.telefone.trim();
  const nome = dados.nome.trim();
  if (!telefone) throw new Error("Informe o WhatsApp da pessoa.");
  if (!nome) throw new Error("Informe o nome da pessoa.");

  return db(empresaId).convite.create({
    data: {
      telefone,
      nome,
      papel: "operador",
      token: gerarTokenDeConvite(),
      enviado_em: new Date(),
      empresa_id: empresaId,
    },
    select: CAMPOS_CONVITE,
  });
}

async function convitePendente(empresaId: string, conviteId: string) {
  const atual = await db(empresaId).convite.findUnique({
    where: { id: conviteId },
    select: { status: true },
  });
  if (!atual) throw new Error("Convite não encontrado.");
  if (atual.status !== "pendente") throw new Error("Este convite não está mais pendente.");
}

/** "Reenviar" (`docs/componentes.md`, "Usuários — lista") — token e prazo novos. */
export async function reenviarConvite(empresaId: string, conviteId: string) {
  await convitePendente(empresaId, conviteId);
  return db(empresaId).convite.update({
    where: { id: conviteId },
    data: { token: gerarTokenDeConvite(), enviado_em: new Date() },
    select: CAMPOS_CONVITE,
  });
}

/** "Cancelar" (`docs/componentes.md`, "Usuários — lista"). */
export async function cancelarConvite(empresaId: string, conviteId: string) {
  await convitePendente(empresaId, conviteId);
  return db(empresaId).convite.update({
    where: { id: conviteId },
    data: { status: "cancelado" },
    select: CAMPOS_CONVITE,
  });
}

export type DadosAceitarConvite = { email: string; senha: string };
export type ResultadoAceitarConvite = { usuarioId: string; empresaId: string; email: string };

/**
 * `(auth)/aceitar-convite` (item 10, Tarefa 4) — token válido + e-mail + senha
 * → cria o Usuário e marca `aceito_em`. Público, sem `empresaId`: o primeiro
 * passo (`localizarConvitePorToken`) é exatamente o que descobre a empresa —
 * ver o comentário do `model Convite`.
 *
 * **`email` é entrada desta função, não do `Convite`** (achado do `/revisar`,
 * decisão do fundador, 31/08/2026): o convite guarda só `telefone` — quem foi
 * chamado no WhatsApp —, nunca e-mail. É a própria pessoa quem digita o
 * e-mail da conta dela ao aceitar, aqui, junto da senha.
 *
 * **A função de banco só recusa token que não existe; tudo o mais é regra
 * daqui** (decisão do fundador, 31/08/2026): convite vencido, já aceito ou
 * cancelado — `status !== "pendente"` cobre os dois últimos; não existe hoje
 * um prazo de expiração próprio do convite, só o que `status` já expressa.
 *
 * **O convite é reivindicado atomicamente ANTES de criar o `Usuario`, não
 * depois** (achado do segundo `/revisar`, 31/08/2026: "verifica num passo,
 * grava noutro" — o mesmo padrão que `CLAUDE.md` §2 já cataloga). A primeira
 * versão lia `status` numa consulta e gravava `"aceito"` noutra, sem
 * condição no `WHERE`: dois aceites do MESMO token ao mesmo tempo passavam
 * os dois pela checagem (`credencial de uso único`, `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, Tarefa 1) e criavam dois
 * `Usuario`. Agora é um `updateMany` com `status: "pendente"` na própria
 * cláusula `WHERE` — mesmo princípio do piso de `atualizarConfiguracoes`
 * (`src/lib/servicos/empresas.ts`): o banco confere e grava numa instrução
 * só, então só um dos dois aceites simultâneos reivindica o token.
 *
 * Não chama `auth.api.signInEmail` — quem loga a pessoa depois de criar a
 * conta é a Server Action da Tarefa 4 (mesma separação de `criarConta`/
 * `criarUsuarioDono`: o serviço cria a conta, a ação decide sessão e
 * redirecionamento).
 *
 * **Estado parcial aceito, não resolvido**: se o convite for reivindicado e
 * a criação do `Usuario` falhar logo depois, o convite fica `aceito` sem
 * nenhum `Usuario` correspondente — ninguém consegue entrar com aquele
 * token de novo. Raro (falha entre duas escritas próximas, sem transação
 * cobrindo as duas conexões — `convite` é gravado por `db(empresaId)`,
 * `usuario` pelo Better Auth), mesma classe de estado parcial já aceita em
 * `gerarRelatorio` (`docs/planos/item-7-relatorio.md`), não resolvido agora.
 */
export async function aceitarConvite(
  token: string,
  dados: DadosAceitarConvite,
): Promise<ResultadoAceitarConvite> {
  const convite = await localizarConvitePorToken(token);
  if (!convite) throw new Error("Convite inválido.");
  if (convite.status !== "pendente") throw new Error("Este convite já foi usado ou cancelado.");

  const emailValidado = z.email().safeParse(dados.email.trim().toLowerCase());
  if (!emailValidado.success) throw new Error("E-mail inválido.");
  const email = emailValidado.data;

  const ctx = await auth.$context;
  const { minPasswordLength, maxPasswordLength } = ctx.password.config;
  if (dados.senha.length < minPasswordLength) {
    throw new Error(`A senha precisa de pelo menos ${minPasswordLength} caracteres.`);
  }
  if (dados.senha.length > maxPasswordLength) {
    throw new Error(`A senha pode ter no máximo ${maxPasswordLength} caracteres.`);
  }

  const existente = await ctx.internalAdapter.findUserByEmail(email);
  if (existente) throw new Error("Já existe uma conta com esse e-mail.");

  const reivindicado = await db(convite.empresa_id).convite.updateMany({
    where: { id: convite.id, status: "pendente" },
    data: { status: "aceito", aceito_em: new Date() },
  });
  if (reivindicado.count === 0) throw new Error("Este convite já foi usado ou cancelado.");

  const usuarioCriado = await criarUsuario(ctx, {
    email,
    nome: convite.nome,
    empresaId: convite.empresa_id,
    senha: dados.senha,
    papel: convite.papel,
  });

  return { usuarioId: usuarioCriado.id, empresaId: convite.empresa_id, email };
}
