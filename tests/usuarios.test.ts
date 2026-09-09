import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { auth } from "@/lib/auth";
import {
  listarUsuarios,
  buscarUsuario,
  removerAcesso,
  convidarUsuario,
  listarConvitesPendentes,
  reenviarConvite,
  cancelarConvite,
  aceitarConvite,
} from "@/lib/servicos/usuarios";

/**
 * Usuário e Convite (item 10, Tarefa 1): remoção de acesso (nunca o próprio
 * dono), convite sempre `operador` e guardado por `telefone` (nunca
 * e-mail — o convite é sempre por WhatsApp), reenviar/cancelar só quando
 * pendente, e `aceitarConvite` — o único caminho do produto que acha uma
 * linha de domínio antes de saber a empresa (`localizar_convite_por_token`).
 *
 * O isolamento entre empresas já é coberto de forma genérica por
 * `tests/isolamento/*`. Este arquivo mede a REGRA DE NEGÓCIO.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];
const usuariosParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 21;

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Usuarios Teste ${marca} ${sufixo}`],
  );
  empresasParaLimpar.push(id);
  return id;
}

/**
 * Igual a `criarEmpresaDeTeste`, com `status_assinatura` explícito — só para
 * os dois casos novos de `aceitarConvite` contra assinatura (item 13,
 * Tarefa 2). `empresa_plano_coerente` (migration
 * `20260806213650_planos_status_e_cnpj_unico`) exige `plano = 'pago'` com
 * `periodicidade` preenchida para qualquer `status_assinatura` diferente de
 * `ativa`.
 */
async function criarEmpresaComStatusAssinatura(
  sufixo: string,
  status: "ativa" | "inadimplente" | "vencida" | "encerrada",
): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao, plano, periodicidade, status_assinatura)
     VALUES ($1, $2, now(), 'teste', 'pago', 'mensal', $3)`,
    [id, `Usuarios Teste ${marca} ${sufixo}`, status],
  );
  empresasParaLimpar.push(id);
  return id;
}

/** Mesmo mecanismo de `criarUsuarioDono` (`src/lib/servicos/criar-usuario-dono.ts`). */
async function criarUsuarioDeTeste(empresaId: string, email: string, nome: string, papel: "dono" | "operador") {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash("senha-de-teste-123");
  const usuario = await ctx.internalAdapter.createUser({
    email,
    name: nome,
    emailVerified: false,
    empresa_id: empresaId,
    papel,
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

/**
 * Busca o token direto no banco. `token: true` entrou em `CAMPOS_CONVITE`
 * no item 10, Tarefa 4 — o serviço passou a expor o campo (`convidarUsuario`/
 * `reenviarConvite`/`cancelarConvite`/`listarConvitesPendentes`) —, mas os
 * testes escritos antes disso continuam pegando o valor aqui, sem depender
 * da forma de retorno de cada função.
 */
async function tokenDoConvite(conviteId: string): Promise<string> {
  const { rows } = await raiz.query<{ token: string }>(
    `SELECT token FROM "convite" WHERE id = $1`,
    [conviteId],
  );
  return rows[0]!.token;
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
});

afterAll(async () => {
  if (usuariosParaLimpar.length) {
    await raiz.query(`DELETE FROM "account" WHERE "userId" = ANY($1)`, [usuariosParaLimpar]);
    await raiz.query(`DELETE FROM "usuario" WHERE id = ANY($1)`, [usuariosParaLimpar]);
  }
  if (empresasParaLimpar.length) {
    // `convite` referencia `empresa` (RESTRICT) — sai antes dela.
    await raiz.query(`DELETE FROM "convite" WHERE empresa_id = ANY($1)`, [empresasParaLimpar]);
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("1. listarUsuarios / buscarUsuario / removerAcesso", () => {
  it("lista só quem tem acesso hoje, e remover acesso arquiva sem apagar", async () => {
    const empresaId = await criarEmpresaDeTeste("a");
    const dono = await criarUsuarioDeTeste(empresaId, `dono-${marca}@teste.invalido`, "Dono", "dono");
    const operador = await criarUsuarioDeTeste(
      empresaId,
      `operador-${marca}@teste.invalido`,
      "Operador",
      "operador",
    );

    const antes = await listarUsuarios(empresaId);
    expect(antes.map((u) => u.id).sort()).toEqual([dono.id, operador.id].sort());

    await removerAcesso(empresaId, operador.id);

    const depois = await listarUsuarios(empresaId);
    expect(depois.map((u) => u.id)).toEqual([dono.id]);

    const buscado = await buscarUsuario(empresaId, operador.id);
    expect(buscado?.id).toBe(operador.id); // ainda existe — arquivado, não apagado
    conferencias++;
  });

  it("o acesso do dono não pode ser removido — mesmo por outro dono, não só por si mesmo", async () => {
    const empresaId = await criarEmpresaDeTeste("b");
    const dono = await criarUsuarioDeTeste(empresaId, `autoremove-${marca}@teste.invalido`, "Dono", "dono");
    const outroDono = await criarUsuarioDeTeste(
      empresaId,
      `outro-dono-${marca}@teste.invalido`,
      "Outro Dono",
      "dono",
    );
    await expect(removerAcesso(empresaId, dono.id)).rejects.toThrow(
      "O acesso do dono não pode ser removido.",
    );
    // A regra é sobre o papel do ALVO, não sobre quem chama — outro dono
    // tentando remover não muda o resultado.
    await expect(removerAcesso(empresaId, outroDono.id)).rejects.toThrow(
      "O acesso do dono não pode ser removido.",
    );
    conferencias++;
  });
});

describe("2. convidarUsuario / listarConvitesPendentes", () => {
  it("cria convite sempre com papel operador, status pendente, guardado por telefone", async () => {
    const empresaId = await criarEmpresaDeTeste("c");
    const convite = await convidarUsuario(empresaId, {
      telefone: "85999998888",
      nome: "  Fulano Convidado  ",
    });
    expect(convite.telefone).toBe("85999998888");
    expect(convite.nome).toBe("Fulano Convidado");
    expect(convite.papel).toBe("operador");
    expect(convite.status).toBe("pendente");
    expect(convite).not.toHaveProperty("email");

    const pendentes = await listarConvitesPendentes(empresaId);
    expect(pendentes.map((c) => c.id)).toContain(convite.id);
    conferencias++;
  });

  it("recusa telefone ou nome vazio", async () => {
    const empresaId = await criarEmpresaDeTeste("d");
    await expect(convidarUsuario(empresaId, { telefone: "  ", nome: "Nome" })).rejects.toThrow();
    await expect(convidarUsuario(empresaId, { telefone: "85999998888", nome: "  " })).rejects.toThrow();
    conferencias++;
  });
});

describe("3. reenviarConvite / cancelarConvite — só quando pendente", () => {
  it("reenviar gera token novo", async () => {
    const empresaId = await criarEmpresaDeTeste("e");
    const convite = await convidarUsuario(empresaId, { telefone: "85999997777", nome: "Reenviar" });
    const reenviado = await reenviarConvite(empresaId, convite.id);
    expect(reenviado.status).toBe("pendente");
    conferencias++;
  });

  it("cancelar muda o status, e nem reenviar nem cancelar de novo funcionam depois", async () => {
    const empresaId = await criarEmpresaDeTeste("f");
    const convite = await convidarUsuario(empresaId, { telefone: "85999996666", nome: "Cancelar" });
    const cancelado = await cancelarConvite(empresaId, convite.id);
    expect(cancelado.status).toBe("cancelado");

    await expect(reenviarConvite(empresaId, convite.id)).rejects.toThrow(
      "Este convite não está mais pendente.",
    );
    await expect(cancelarConvite(empresaId, convite.id)).rejects.toThrow(
      "Este convite não está mais pendente.",
    );
    conferencias++;
  });

  it("convite cancelado some de listarConvitesPendentes", async () => {
    const empresaId = await criarEmpresaDeTeste("g");
    const convite = await convidarUsuario(empresaId, { telefone: "85999995555", nome: "Sumiu" });
    await cancelarConvite(empresaId, convite.id);
    const pendentes = await listarConvitesPendentes(empresaId);
    expect(pendentes.map((c) => c.id)).not.toContain(convite.id);
    conferencias++;
  });
});

describe("4. aceitarConvite — o único caminho que acha uma linha de domínio antes da empresa", () => {
  it("token válido + e-mail + senha cria o Usuario na empresa certa, papel operador, e marca aceito_em", async () => {
    const empresaId = await criarEmpresaDeTeste("h");
    const convite = await convidarUsuario(empresaId, { telefone: "85999994444", nome: "Vai Aceitar" });
    const token = await tokenDoConvite(convite.id);

    const email = `aceita-${marca}@teste.invalido`;
    const resultado = await aceitarConvite(token, { email, senha: "senha-de-teste-123" });
    usuariosParaLimpar.push(resultado.usuarioId);

    expect(resultado.empresaId).toBe(empresaId);
    expect(resultado.email).toBe(email);

    const usuarioCriado = await buscarUsuario(empresaId, resultado.usuarioId);
    expect(usuarioCriado?.papel).toBe("operador");
    expect(usuarioCriado?.nome).toBe("Vai Aceitar"); // vem do convite, não do formulário de aceite

    const { rows: convitesDepois } = await raiz.query<{ status: string; aceito_em: Date | null }>(
      `SELECT status, aceito_em FROM "convite" WHERE id = $1`,
      [convite.id],
    );
    expect(convitesDepois[0]!.status).toBe("aceito");
    expect(convitesDepois[0]!.aceito_em).not.toBeNull();
    conferencias++;
  });

  it("recusa token que não existe", async () => {
    await expect(
      aceitarConvite("token-que-nunca-existiu", { email: "x@teste.invalido", senha: "senha-de-teste-123" }),
    ).rejects.toThrow("Convite inválido.");
    conferencias++;
  });

  it("recusa convite já aceito", async () => {
    const empresaId = await criarEmpresaDeTeste("i");
    const convite = await convidarUsuario(empresaId, { telefone: "85999993333", nome: "Duas Vezes" });
    const token = await tokenDoConvite(convite.id);

    const primeira = await aceitarConvite(token, {
      email: `duas-vezes-${marca}@teste.invalido`,
      senha: "senha-de-teste-123",
    });
    usuariosParaLimpar.push(primeira.usuarioId);

    await expect(
      aceitarConvite(token, { email: `outra-vez-${marca}@teste.invalido`, senha: "outra-senha-123" }),
    ).rejects.toThrow("Este convite já foi usado ou cancelado.");
    conferencias++;
  });

  it("concorrência — dois aceites simultâneos do MESMO token nunca criam dois Usuario", async () => {
    // §3, "concorrência real": não basta provar que passa um pedido por vez.
    // Achado do segundo `/revisar`, 31/08/2026 — a primeira versão lia
    // `status` numa consulta e gravava noutra, sem condição no `WHERE`; os
    // dois aceites passavam pela checagem e criavam dois `Usuario` para o
    // mesmo convite. Agora o convite é reivindicado atomicamente
    // (`updateMany` com `status: "pendente"` no `WHERE`) antes de criar a
    // conta — só um dos dois pode vencer.
    const empresaId = await criarEmpresaDeTeste("n");
    const convite = await convidarUsuario(empresaId, { telefone: "85977776666", nome: "Corrida" });
    const token = await tokenDoConvite(convite.id);

    const emailA = `corrida-a-${marca}@teste.invalido`;
    const emailB = `corrida-b-${marca}@teste.invalido`;

    const [resultadoA, resultadoB] = await Promise.allSettled([
      aceitarConvite(token, { email: emailA, senha: "senha-de-teste-123" }),
      aceitarConvite(token, { email: emailB, senha: "senha-de-teste-123" }),
    ]);

    const sucessos = [resultadoA, resultadoB].filter((r) => r.status === "fulfilled");
    const falhas = [resultadoA, resultadoB].filter((r) => r.status === "rejected");
    expect(sucessos).toHaveLength(1);
    expect(falhas).toHaveLength(1);
    expect((falhas[0] as PromiseRejectedResult).reason.message).toBe(
      "Este convite já foi usado ou cancelado.",
    );

    const vencedor = (sucessos[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof aceitarConvite>>>)
      .value;
    usuariosParaLimpar.push(vencedor.usuarioId);

    // A prova final: só existe UM Usuario, para o e-mail que de fato venceu.
    const vencedorExiste = await raiz.query(`SELECT id FROM "usuario" WHERE email = $1`, [
      vencedor.email,
    ]);
    const perdedorExiste = await raiz.query(`SELECT id FROM "usuario" WHERE email = $1`, [
      vencedor.email === emailA ? emailB : emailA,
    ]);
    expect(vencedorExiste.rowCount).toBe(1);
    expect(perdedorExiste.rowCount).toBe(0);
    conferencias++;
  });

  it("recusa convite cancelado", async () => {
    const empresaId = await criarEmpresaDeTeste("j");
    const convite = await convidarUsuario(empresaId, { telefone: "85999992222", nome: "Cancelado Antes" });
    const token = await tokenDoConvite(convite.id);
    await cancelarConvite(empresaId, convite.id);

    await expect(
      aceitarConvite(token, { email: `cancelado-${marca}@teste.invalido`, senha: "senha-de-teste-123" }),
    ).rejects.toThrow("Este convite já foi usado ou cancelado.");
    conferencias++;
  });

  it("recusa e-mail em formato inválido", async () => {
    const empresaId = await criarEmpresaDeTeste("k");
    const convite = await convidarUsuario(empresaId, { telefone: "85999991111", nome: "E-mail Torto" });
    const token = await tokenDoConvite(convite.id);

    await expect(
      aceitarConvite(token, { email: "não-é-email", senha: "senha-de-teste-123" }),
    ).rejects.toThrow("E-mail inválido.");
    conferencias++;
  });

  it("recusa senha curta demais", async () => {
    const empresaId = await criarEmpresaDeTeste("l");
    const convite = await convidarUsuario(empresaId, { telefone: "85999990000", nome: "Senha Curta" });
    const token = await tokenDoConvite(convite.id);

    await expect(
      aceitarConvite(token, { email: `senha-curta-${marca}@teste.invalido`, senha: "123" }),
    ).rejects.toThrow(/pelo menos/);
    conferencias++;
  });

  it("recusa quando já existe conta com o e-mail informado no aceite", async () => {
    const empresaId = await criarEmpresaDeTeste("m");
    const emailJaExiste = `ja-tem-conta-${marca}@teste.invalido`;
    await criarUsuarioDeTeste(empresaId, emailJaExiste, "Já Tem Conta", "dono");

    const convite = await convidarUsuario(empresaId, { telefone: "85988887777", nome: "Repetido" });
    const token = await tokenDoConvite(convite.id);

    await expect(
      aceitarConvite(token, { email: emailJaExiste, senha: "senha-de-teste-123" }),
    ).rejects.toThrow("Já existe uma conta com esse e-mail.");
    conferencias++;
  });

  /**
   * Item 13, Tarefa 2, achado do `/revisar`, decisão do fundador,
   * 09/09/2026: aceitar convite numa empresa `vencida` deixava a pessoa
   * criar conta e senha para uma conta que não serve — ela não consegue
   * fazer nada, e o portão de escrita é do dono, não dela. A recusa
   * acontece ANTES de qualquer gravação: o convite continua `pendente`,
   * não `aceito` — quando o dono regularizar, o mesmo link volta a
   * funcionar, sem convite novo.
   */
  it("recusa aceitar quando a assinatura da empresa está vencida — o convite continua pendente, não é consumido", async () => {
    const empresaId = await criarEmpresaComStatusAssinatura("o", "vencida");
    const convite = await convidarUsuario(empresaId, { telefone: "85988886666", nome: "Empresa Vencida" });
    const token = await tokenDoConvite(convite.id);

    await expect(
      aceitarConvite(token, { email: `vencida-${marca}@teste.invalido`, senha: "senha-de-teste-123" }),
    ).rejects.toThrow("A assinatura desta empresa está com pendência — fale com quem te convidou.");
    conferencias++;

    const { rows } = await raiz.query<{ status: string; aceito_em: Date | null }>(
      `SELECT status, aceito_em FROM "convite" WHERE id = $1`,
      [convite.id],
    );
    expect(rows[0]!.status).toBe("pendente");
    conferencias++;
    expect(rows[0]!.aceito_em).toBeNull();
    conferencias++;
  });

  /**
   * O contraste: `inadimplente` não bloqueia, mesma regra de
   * `comoUsuario`/`comoDono` (`src/lib/auth/acao.ts`) — a Kiwify ainda está
   * tentando cobrar, e cortar acesso aqui tiraria a pessoa bem quando a
   * empresa ainda vai pagar.
   */
  it("inadimplente NÃO bloqueia aceitar convite — só vencida", async () => {
    const empresaId = await criarEmpresaComStatusAssinatura("p", "inadimplente");
    const convite = await convidarUsuario(empresaId, { telefone: "85988885555", nome: "Empresa Inadimplente" });
    const token = await tokenDoConvite(convite.id);

    const resultado = await aceitarConvite(token, {
      email: `inadimplente-${marca}@teste.invalido`,
      senha: "senha-de-teste-123",
    });
    usuariosParaLimpar.push(resultado.usuarioId);
    expect(resultado.empresaId).toBe(empresaId);
    conferencias++;
  });
});

describe("5. a busca por token não depende de `postgres` ignorar RLS", () => {
  it("`localizar_convite_por_token` não é dona de `postgres`, e o dono não ignora RLS", async () => {
    // Mesmo contraste de `reverter_cadastro_incompleto`
    // (`tests/cadastro.test.ts`): sem esta verificação, a regressão para
    // "dono = postgres" (que tem `rolbypassrls`) passaria despercebida —
    // o resultado observável das buscas acima continuaria idêntico.
    const { rows } = await raiz.query<{ dono: string; bypassa_rls: boolean }>(
      `SELECT p.proowner::regrole::text AS dono, r.rolbypassrls AS bypassa_rls
         FROM pg_proc p
         JOIN pg_roles r ON r.oid = p.proowner
        WHERE p.proname = 'localizar_convite_por_token'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.dono).toBe("fretigate_convite");
    expect(rows[0]!.bypassa_rls).toBe(false);
    conferencias++;
  });

  it("a função nunca é alcançável pela API pública do Supabase (PUBLIC revogado)", async () => {
    const { rows } = await raiz.query(
      `SELECT grantee FROM information_schema.routine_privileges
         WHERE routine_name = 'localizar_convite_por_token'
           AND grantee IN ('PUBLIC', 'anon', 'authenticated')`,
    );
    expect(rows).toEqual([]);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
