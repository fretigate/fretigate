import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Client } from "pg";
import { auth } from "@/lib/auth";
import { emTransacao, reverterCadastroIncompleto } from "@/lib/db";
import { uuidv7 } from "uuidv7";

/**
 * O cadastro (tarefa 8): criar Empresa + Usuário dono, e a reversão quando a
 * segunda metade falha depois da primeira já ter sido gravada.
 *
 * Isto testa o MECANISMO — os mesmos exports que `src/lib/servicos/cadastro.ts`
 * usa (`emTransacao`, `auth.$context`, `reverterCadastroIncompleto`) — não a
 * Server Action em si. A Server Action depende de `headers()`/`redirect()` do
 * Next.js, que só existem dentro de um pedido real; a cobertura desse fio (o
 * formulário, o botão, o erro na tela) foi manual, pelo navegador, e está no
 * diário. O que precisa de prova permanente é a parte que envolve isolamento —
 * exatamente o que fica aqui.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);
const emailNovo = `cadastro-${marca}@teste.invalido`;
const emailJaExiste = `ja-existe-${marca}@teste.invalido`;
const emailOrfa = `orfa-${marca}@teste.invalido`;

let raiz: Client;
const empresasParaLimpar: string[] = [];
const usuariosParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 14;

async function criarEmpresa(nome: string) {
  const empresaId = uuidv7();
  await emTransacao(empresaId, async (tx) => {
    await tx.empresa.create({
      data: {
        id: empresaId,
        nome_fantasia: nome,
        origem_declarada: "Alguém me indicou",
        termos_aceitos_em: new Date(),
        termos_versao: "teste",
      },
    });
  });
  empresasParaLimpar.push(empresaId);
  return empresaId;
}

async function criarUsuarioDono(empresaId: string, email: string, nome: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash("senha-de-teste-123");
  const usuario = await ctx.internalAdapter.createUser({
    email,
    name: nome,
    emailVerified: false,
    empresa_id: empresaId,
    papel: "dono",
  });
  await ctx.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: hash,
  });
  usuariosParaLimpar.push(usuario.id);
  return usuario;
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (usuariosParaLimpar.length) {
    await raiz.query(`DELETE FROM "account" WHERE "userId" = ANY($1)`, [
      usuariosParaLimpar,
    ]);
    await raiz.query(`DELETE FROM "usuario" WHERE id = ANY($1)`, [
      usuariosParaLimpar,
    ]);
  }
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [
      empresasParaLimpar,
    ]);
  }
  await raiz.end();
});

describe("1. cadastro normal — Empresa e Usuário corretamente vinculados", () => {
  it("cria a Empresa com os campos do formulário", async () => {
    const empresaId = await criarEmpresa("Transportes Teste Cadastro");
    const { rows } = await raiz.query(
      `SELECT nome_fantasia, origem_declarada, plano, status_assinatura
         FROM "empresa" WHERE id = $1`,
      [empresaId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      nome_fantasia: "Transportes Teste Cadastro",
      origem_declarada: "Alguém me indicou",
      plano: "gratuito",
      status_assinatura: "ativa",
    });
    conferencias++;

    const usuario = await criarUsuarioDono(empresaId, emailNovo, "Fulano de Teste");
    const { rows: linhasUsuario } = await raiz.query(
      `SELECT papel, empresa_id, email FROM "usuario" WHERE id = $1`,
      [usuario.id],
    );
    expect(linhasUsuario[0]).toMatchObject({
      papel: "dono",
      empresa_id: empresaId,
      email: emailNovo,
    });
    conferencias++;

    const { rows: linhasConta } = await raiz.query(
      `SELECT "providerId", (password IS NOT NULL) AS tem_hash
         FROM "account" WHERE "userId" = $1`,
      [usuario.id],
    );
    expect(linhasConta).toHaveLength(1);
    expect(linhasConta[0]).toMatchObject({
      providerId: "credential",
      tem_hash: true,
    });
    conferencias++;
  });
});

describe("2. e-mail duplicado é recusado antes de criar qualquer coisa", () => {
  it("`findUserByEmail` enxerga o usuário já existente", async () => {
    const empresaId = await criarEmpresa("Empresa do primeiro dono");
    await criarUsuarioDono(empresaId, emailJaExiste, "Primeiro Dono");

    const ctx = await auth.$context;
    const existente = await ctx.internalAdapter.findUserByEmail(emailJaExiste);
    expect(existente?.user?.email).toBe(emailJaExiste);
    conferencias++;

    // Confirma que é isso, e só isso, que o cadastro usa para recusar — ver
    // `src/lib/servicos/cadastro.ts`, o passo antes de gerar o uuid da empresa.
    const inexistente = await ctx.internalAdapter.findUserByEmail(
      `nunca-existiu-${marca}@teste.invalido`,
    );
    expect(inexistente).toBeNull();
    conferencias++;
  });
});

describe("3. o contraste — a reversão realmente apaga a Empresa órfã", () => {
  it("Empresa criada, Usuário falha (e-mail já em uso), reversão limpa a Empresa", async () => {
    // Semeia o e-mail que vai colidir.
    const empresaDoDono = await criarEmpresa("Dona do e-mail colidido");
    await criarUsuarioDono(empresaDoDono, emailOrfa, "Dono Original");

    // Passo 1 do cadastro: a Empresa nasce normalmente.
    const empresaOrfa = await criarEmpresa("Empresa que vai ficar órfã");

    // Passo 2: a criação do Usuário falha — mesmo e-mail já em uso, a mesma
    // classe de erro que aconteceria com qualquer outra falha depois da
    // Empresa já ter sido gravada.
    const ctx = await auth.$context;
    await expect(
      ctx.internalAdapter.createUser({
        email: emailOrfa,
        name: "Não vai existir",
        emailVerified: false,
        empresa_id: empresaOrfa,
        papel: "dono",
      }),
    ).rejects.toThrow();
    conferencias++;

    // Antes da reversão: a Empresa órfã ainda está lá — prova que o teste
    // mede a reversão, não um estado que já nasceria limpo.
    const { rows: antes } = await raiz.query(
      `SELECT id FROM "empresa" WHERE id = $1`,
      [empresaOrfa],
    );
    expect(antes).toHaveLength(1);
    conferencias++;

    // Passo 3: reverte.
    await reverterCadastroIncompleto(empresaOrfa);

    const { rows: depois } = await raiz.query(
      `SELECT id FROM "empresa" WHERE id = $1`,
      [empresaOrfa],
    );
    expect(depois).toHaveLength(0);
    conferencias++;
    // Não sobra em `empresasParaLimpar` para o `afterAll` reclamar — já foi.
    empresasParaLimpar.splice(empresasParaLimpar.indexOf(empresaOrfa), 1);

    // E a empresa do dono original — que tem usuário de verdade — continua
    // intacta. Reversão não é faca sem cabo.
    const { rows: doDono } = await raiz.query(
      `SELECT id FROM "empresa" WHERE id = $1`,
      [empresaDoDono],
    );
    expect(doDono).toHaveLength(1);
    conferencias++;
  });
});

describe("4. a guarda da função — nunca apaga Empresa com Usuário", () => {
  it("chamar a reversão numa Empresa com dono não apaga nada", async () => {
    const empresaComDono = await criarEmpresa("Empresa com dono de verdade");
    await criarUsuarioDono(
      empresaComDono,
      `guarda-${marca}@teste.invalido`,
      "Dono Protegido",
    );

    // Chamada direta, como se alguém tivesse errado o id — é exatamente o
    // caso que a guarda `NOT EXISTS (... usuario ...)` dentro da função
    // (prisma/migrations/20260807090000_reverter_cadastro_incompleto)
    // precisa recusar sozinha, sem depender de quem chamou ter acertado.
    await reverterCadastroIncompleto(empresaComDono);

    const { rows } = await raiz.query(
      `SELECT id FROM "empresa" WHERE id = $1`,
      [empresaComDono],
    );
    expect(rows).toHaveLength(1);
    conferencias++;
  });

  it("a reversão não depende de `postgres` ignorar RLS — o contraste do bloqueio de 07/08/2026", async () => {
    // A primeira versão desta função rodava como `postgres` (SECURITY
    // DEFINER sem trocar o dono), que tem `rolbypassrls = true` — o DELETE
    // ignorava RLS por completo, e os testes acima continuariam verdes do
    // mesmo jeito, porque conferem o RESULTADO, não o MECANISMO. Esta
    // verificação existe para não deixar essa regressão passar em silêncio.
    const { rows } = await raiz.query<{
      dono: string;
      bypassa_rls: boolean;
    }>(
      `SELECT p.proowner::regrole::text AS dono, r.rolbypassrls AS bypassa_rls
         FROM pg_proc p
         JOIN pg_roles r ON r.oid = p.proowner
        WHERE p.proname = 'reverter_cadastro_incompleto'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].dono).not.toBe("postgres");
    expect(rows[0].bypassa_rls).toBe(false);
    conferencias++;
  });

  it("a função nunca é alcançável pela API pública do Supabase (PUBLIC revogado)", async () => {
    // O Postgres concede EXECUTE a PUBLIC por padrão em função nova — ao
    // contrário de tabela. A migration revoga isso explicitamente; aqui é a
    // prova de que continua revogado.
    const { rows } = await raiz.query(
      `SELECT grantee FROM information_schema.routine_privileges
         WHERE routine_name = 'reverter_cadastro_incompleto'
           AND grantee IN ('PUBLIC', 'anon', 'authenticated')`,
    );
    expect(rows).toEqual([]);
    conferencias++;

    const { rows: fretigateApp } = await raiz.query(
      `SELECT grantee FROM information_schema.routine_privileges
         WHERE routine_name = 'reverter_cadastro_incompleto'
           AND grantee = 'fretigate_app'`,
    );
    // Contraste: confirma que a consulta enxerga concessão quando ela existe —
    // sem isto, a verificação acima passaria vazia mesmo se a tabela de
    // metadados estivesse simplesmente errada.
    expect(fretigateApp).toHaveLength(1);
    conferencias++;
  });
});

describe("5. a interface interna do Better Auth que criarUsuarioDono usa", () => {
  it("continua existindo com a forma esperada", async () => {
    // `src/lib/servicos/criar-usuario-dono.ts` usa `ctx.password.hash` e
    // `ctx.internalAdapter.{createUser,linkAccount}` — API interna do
    // Better Auth, não a rota pública (desligada por `disableSignUp`).
    // Decisão do fundador (07/08/2026): preferir essa interface a importar o
    // plugin `admin` inteiro por uma função, com a condição de que uma
    // mudança de nome numa atualização quebre AQUI, alto, e não em produção,
    // calado. Este teste é essa condição.
    const ctx = await auth.$context;
    expect(typeof ctx.password.hash).toBe("function");
    expect(typeof ctx.internalAdapter.createUser).toBe("function");
    expect(typeof ctx.internalAdapter.linkAccount).toBe("function");
    expect(typeof ctx.internalAdapter.findUserByEmail).toBe("function");
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
