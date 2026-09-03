import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { auth } from "@/lib/auth";
import {
  registrarPagamento,
  buscarConfirmacaoDeCompra,
  ativarAssinatura,
  estornarPagamento,
  atualizarStatusAssinaturaPorAssinanteGateway,
} from "@/lib/servicos/pagamentos";

/**
 * O pagamento que ainda não é conta (item 13, Tarefa 1 — `docs/planos/
 * item-13-assinatura.md`). Mesma separação de `usuarios.test.ts`
 * (convite): o isolamento genérico já é coberto por `tests/isolamento/*`
 * — `pagamento_pendente` entra em `FORA_DO_LACO` (`vazamento.test.ts`)
 * porque o mecanismo de proteção não é `empresa_id = contexto`, é ausência
 * total de privilégio de `fretigate_app` na tabela (prova própria, seção
 * "6." abaixo). Este arquivo mede a REGRA DE NEGÓCIO: os quatro casos do
 * plano, a criação de conta com plano pago, e a mudança de estado da
 * assinatura depois do primeiro pagamento.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);

let raiz: Client;
const empresasParaLimpar: string[] = [];
const usuariosParaLimpar: string[] = [];
const pagamentosParaLimpar: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 15;

function gerarTransacaoExterna(sufixo: string): string {
  return `pagamentos-teste-${marca}-${sufixo}`;
}

async function registrarPagamentoDeTeste(
  sufixo: string,
  dados: Partial<Parameters<typeof registrarPagamento>[0]> = {},
) {
  const resultado = await registrarPagamento({
    gateway: "kiwify",
    transacaoExterna: gerarTransacaoExterna(sufixo),
    emailComprador: `comprador-${marca}-${sufixo}@teste.invalido`,
    nomeComprador: `Comprador ${sufixo}`,
    gatewayAssinanteId: `assinante-${marca}-${sufixo}`,
    documentoComprador: "12345678900",
    periodicidade: "mensal",
    valorCentavos: 14900,
    recebidoEm: new Date(),
    ...dados,
  });
  pagamentosParaLimpar.push(resultado.id);
  return resultado;
}

/** Mesmo mecanismo de `criarUsuarioDono` — para o teste de "e-mail já existe". */
async function criarUsuarioDeTeste(empresaId: string, email: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash("senha-de-teste-123");
  const usuario = await ctx.internalAdapter.createUser({
    email,
    name: "Já Tem Conta",
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

async function criarEmpresaDeTeste(sufixo: string): Promise<string> {
  const id = randomUUID();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, `Pagamentos Teste ${marca} ${sufixo}`],
  );
  empresasParaLimpar.push(id);
  return id;
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
  if (pagamentosParaLimpar.length) {
    // `pagamento_pendente` referencia `empresa` (RESTRICT) — sai antes dela.
    await raiz.query(`DELETE FROM "pagamento_pendente" WHERE id = ANY($1)`, [pagamentosParaLimpar]);
  }
  if (empresasParaLimpar.length) {
    await raiz.query(`DELETE FROM "empresa" WHERE id = ANY($1)`, [empresasParaLimpar]);
  }
  await raiz.end();
});

describe("1. registrarPagamento — deduplicação por transação externa", () => {
  it("cria um pagamento pendente novo, com token", async () => {
    const resultado = await registrarPagamentoDeTeste("a");
    expect(resultado.token).toBeTruthy();
    expect(resultado.id).toBeTruthy();
    conferencias++;
  });

  it("a mesma transação externa reentregue (reenvio da Kiwify) devolve o MESMO token, nunca cria dois", async () => {
    const transacaoExterna = gerarTransacaoExterna("dedup");
    const primeira = await registrarPagamento({
      gateway: "kiwify",
      transacaoExterna,
      emailComprador: `dedup-${marca}@teste.invalido`,
      nomeComprador: "Dedup",
      gatewayAssinanteId: `assinante-dedup-${marca}`,
      documentoComprador: null,
      periodicidade: "anual",
      valorCentavos: 84000,
      recebidoEm: new Date(),
    });
    pagamentosParaLimpar.push(primeira.id);

    const segunda = await registrarPagamento({
      gateway: "kiwify",
      transacaoExterna,
      emailComprador: `dedup-${marca}@teste.invalido`,
      nomeComprador: "Dedup",
      gatewayAssinanteId: `assinante-dedup-${marca}`,
      documentoComprador: null,
      periodicidade: "anual",
      valorCentavos: 84000,
      recebidoEm: new Date(),
    });

    expect(segunda.id).toBe(primeira.id);
    expect(segunda.token).toBe(primeira.token);

    const { rows } = await raiz.query(
      `SELECT count(*)::int AS total FROM "pagamento_pendente" WHERE transacao_externa = $1`,
      [transacaoExterna],
    );
    expect(rows[0]!.total).toBe(1);
    conferencias++;
  });
});

describe("2. buscarConfirmacaoDeCompra — o que a tela pública pode mostrar", () => {
  it("pendente: e-mail mascarado e data, nunca o e-mail inteiro", async () => {
    const resultado = await registrarPagamentoDeTeste("confirmacao", {
      emailComprador: "analista@teste.invalido",
    });
    const confirmacao = await buscarConfirmacaoDeCompra(resultado.token);

    expect(confirmacao.situacao).toBe("pendente");
    if (confirmacao.situacao !== "pendente") throw new Error("esperado pendente");
    expect(confirmacao.emailParcial).not.toBe("analista@teste.invalido");
    expect(confirmacao.emailParcial).toContain("@teste.invalido");
    expect(confirmacao.emailParcial.startsWith("an")).toBe(true);
    expect(confirmacao.data).toBeInstanceOf(Date);
    conferencias++;
  });

  it("token inexistente e token estornado dão a MESMA situação indisponível — não distingue o motivo", async () => {
    const inexistente = await buscarConfirmacaoDeCompra("token-que-nunca-existiu-" + marca);
    expect(inexistente.situacao).toBe("indisponivel");

    const paraEstornar = await registrarPagamentoDeTeste("estornar-confirmacao");
    await estornarPagamento(gerarTransacaoExterna("estornar-confirmacao"));
    const estornado = await buscarConfirmacaoDeCompra(paraEstornar.token);
    expect(estornado.situacao).toBe("indisponivel");
    conferencias++;
  });

  it("token já reivindicado dá a situação ja_reivindicado", async () => {
    const resultado = await registrarPagamentoDeTeste("ja-reivindicado-confirmacao");
    const ativado = await ativarAssinatura(resultado.token, {
      nomeEmpresa: `Empresa Já Ativada ${marca}`,
      email: `ja-ativada-${marca}@teste.invalido`,
      senha: "senha-de-teste-123",
    });
    if ("erro" in ativado) throw new Error("esperado sucesso: " + ativado.erro);
    usuariosParaLimpar.push(ativado.usuarioId);
    empresasParaLimpar.push(ativado.empresaId);

    const confirmacao = await buscarConfirmacaoDeCompra(resultado.token);
    expect(confirmacao.situacao).toBe("ja_reivindicado");
    conferencias++;
  });
});

describe("3. ativarAssinatura — a conta nasce paga, ligada ao pagamento", () => {
  it("token válido cria Empresa (plano pago, periodicidade e gateway certos) e Usuário dono, e vincula o pagamento", async () => {
    const resultado = await registrarPagamentoDeTeste("ativar-sucesso", {
      periodicidade: "anual",
      nomeComprador: "Dono Vindo Da Kiwify",
    });

    const ativado = await ativarAssinatura(resultado.token, {
      nomeEmpresa: `Empresa Ativada ${marca}`,
      email: `ativada-${marca}@teste.invalido`,
      senha: "senha-de-teste-123",
    });
    if ("erro" in ativado) throw new Error("esperado sucesso: " + ativado.erro);
    usuariosParaLimpar.push(ativado.usuarioId);
    empresasParaLimpar.push(ativado.empresaId);

    const { rows: empresas } = await raiz.query(
      `SELECT nome_fantasia, plano, periodicidade, status_assinatura, gateway_assinante_id
         FROM "empresa" WHERE id = $1`,
      [ativado.empresaId],
    );
    expect(empresas[0]!.nome_fantasia).toBe(`Empresa Ativada ${marca}`);
    expect(empresas[0]!.plano).toBe("pago");
    expect(empresas[0]!.periodicidade).toBe("anual");
    expect(empresas[0]!.status_assinatura).toBe("ativa");
    expect(empresas[0]!.gateway_assinante_id).toBe(`assinante-${marca}-ativar-sucesso`);

    const { rows: usuarios } = await raiz.query(
      `SELECT nome, papel FROM "usuario" WHERE id = $1`,
      [ativado.usuarioId],
    );
    expect(usuarios[0]!.papel).toBe("dono");
    expect(usuarios[0]!.nome).toBe("Dono Vindo Da Kiwify"); // vem do comprador, não do formulário

    const { rows: pagamentos } = await raiz.query(
      `SELECT status, empresa_id FROM "pagamento_pendente" WHERE id = $1`,
      [resultado.id],
    );
    expect(pagamentos[0]!.status).toBe("aceito");
    expect(pagamentos[0]!.empresa_id).toBe(ativado.empresaId);
    conferencias++;
  });

  it("recusa token inexistente e token já estornado com a mesma mensagem", async () => {
    await expect(
      ativarAssinatura("token-que-nunca-existiu-" + marca, {
        nomeEmpresa: "X",
        email: `x-${marca}@teste.invalido`,
        senha: "senha-de-teste-123",
      }),
    ).resolves.toMatchObject({ erro: "Este link já não está disponível." });

    const paraEstornar = await registrarPagamentoDeTeste("ativar-estornado");
    await estornarPagamento(gerarTransacaoExterna("ativar-estornado"));
    const resultado = await ativarAssinatura(paraEstornar.token, {
      nomeEmpresa: "X",
      email: `estornado-${marca}@teste.invalido`,
      senha: "senha-de-teste-123",
    });
    expect(resultado).toMatchObject({ erro: "Este link já não está disponível." });
    conferencias++;
  });

  it("recusa nome de empresa vazio, e-mail inválido e senha curta", async () => {
    const semNome = await registrarPagamentoDeTeste("valida-nome");
    expect(
      await ativarAssinatura(semNome.token, {
        nomeEmpresa: "   ",
        email: `x-${marca}@teste.invalido`,
        senha: "senha-de-teste-123",
      }),
    ).toMatchObject({ erro: "Diga o nome da empresa." });

    const emailTorto = await registrarPagamentoDeTeste("valida-email");
    expect(
      await ativarAssinatura(emailTorto.token, {
        nomeEmpresa: "X",
        email: "não-é-email",
        senha: "senha-de-teste-123",
      }),
    ).toMatchObject({ erro: "E-mail inválido." });

    const senhaCurta = await registrarPagamentoDeTeste("valida-senha");
    const resultado = await ativarAssinatura(senhaCurta.token, {
      nomeEmpresa: "X",
      email: `senha-curta-${marca}@teste.invalido`,
      senha: "123",
    });
    expect("erro" in resultado && /pelo menos/.test(resultado.erro)).toBe(true);
    conferencias++;
  });

  it("recusa quando já existe conta com o e-mail informado", async () => {
    const empresaId = await criarEmpresaDeTeste("existente");
    const emailJaExiste = `ja-existe-${marca}@teste.invalido`;
    await criarUsuarioDeTeste(empresaId, emailJaExiste);

    const resultado = await registrarPagamentoDeTeste("email-repetido");
    expect(
      await ativarAssinatura(resultado.token, {
        nomeEmpresa: "X",
        email: emailJaExiste,
        senha: "senha-de-teste-123",
      }),
    ).toMatchObject({ erro: "Já existe uma conta com esse e-mail." });
    conferencias++;
  });

  it("concorrência — duas ativações simultâneas do MESMO token nunca criam duas empresas", async () => {
    // §3, "concorrência real" — mesmo desenho do teste equivalente de
    // aceitarConvite (tests/usuarios.test.ts): reivindicar_pagamento já é o
    // UPDATE ... WHERE status = 'pendente' atômico (caso 2 do plano), então
    // só uma das duas chamadas simultâneas pode vencer.
    const resultado = await registrarPagamentoDeTeste("corrida");

    const [a, b] = await Promise.all([
      ativarAssinatura(resultado.token, {
        nomeEmpresa: `Corrida A ${marca}`,
        email: `corrida-a-${marca}@teste.invalido`,
        senha: "senha-de-teste-123",
      }),
      ativarAssinatura(resultado.token, {
        nomeEmpresa: `Corrida B ${marca}`,
        email: `corrida-b-${marca}@teste.invalido`,
        senha: "senha-de-teste-123",
      }),
    ]);

    const sucessos = [a, b].filter((r) => !("erro" in r));
    const falhas = [a, b].filter((r) => "erro" in r);
    expect(sucessos).toHaveLength(1);
    expect(falhas).toHaveLength(1);

    const vencedor = sucessos[0] as Exclude<typeof a, { erro: string }>;
    usuariosParaLimpar.push(vencedor.usuarioId);
    empresasParaLimpar.push(vencedor.empresaId);

    const { rows } = await raiz.query(
      `SELECT count(*)::int AS total FROM "empresa" WHERE nome_fantasia IN ($1, $2)`,
      [`Corrida A ${marca}`, `Corrida B ${marca}`],
    );
    expect(rows[0]!.total).toBe(1);
    conferencias++;
  });
});

describe("4. estornarPagamento — caso 4 do plano", () => {
  it("estorna um pagamento ainda pendente — o token morre, reivindicar depois falha", async () => {
    const resultado = await registrarPagamentoDeTeste("estorno-antes");
    const estorno = await estornarPagamento(gerarTransacaoExterna("estorno-antes"));
    expect(estorno.estornou).toBe(true);

    const { rows } = await raiz.query(
      `SELECT status, estornado_em FROM "pagamento_pendente" WHERE id = $1`,
      [resultado.id],
    );
    expect(rows[0]!.status).toBe("estornado");
    expect(rows[0]!.estornado_em).not.toBeNull();
    conferencias++;
  });

  it("estornar um pagamento já aceito não faz nada — devolve estornou: false", async () => {
    const resultado = await registrarPagamentoDeTeste("estorno-depois");
    const ativado = await ativarAssinatura(resultado.token, {
      nomeEmpresa: `Empresa Estorno Depois ${marca}`,
      email: `estorno-depois-${marca}@teste.invalido`,
      senha: "senha-de-teste-123",
    });
    if ("erro" in ativado) throw new Error("esperado sucesso: " + ativado.erro);
    usuariosParaLimpar.push(ativado.usuarioId);
    empresasParaLimpar.push(ativado.empresaId);

    const estorno = await estornarPagamento(gerarTransacaoExterna("estorno-depois"));
    expect(estorno.estornou).toBe(false);

    const { rows } = await raiz.query(
      `SELECT status FROM "pagamento_pendente" WHERE id = $1`,
      [resultado.id],
    );
    expect(rows[0]!.status).toBe("aceito"); // continua aceito, nunca vira estornado por engano
    conferencias++;
  });
});

describe("5. atualizarStatusAssinaturaPorAssinanteGateway — eventos depois do primeiro pagamento", () => {
  it("acha a empresa pelo gateway_assinante_id e muda o status_assinatura", async () => {
    const gatewayAssinanteId = `assinante-renovacao-${marca}`;
    const empresaId = randomUUID();
    await raiz.query(
      `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao, plano, periodicidade, gateway_assinante_id)
       VALUES ($1, $2, now(), 'teste', 'pago', 'mensal', $3)`,
      [empresaId, `Empresa Renovação ${marca}`, gatewayAssinanteId],
    );
    empresasParaLimpar.push(empresaId);

    const achou = await atualizarStatusAssinaturaPorAssinanteGateway(gatewayAssinanteId, "inadimplente");
    expect(achou).toBe(true);

    const { rows } = await raiz.query(
      `SELECT status_assinatura FROM "empresa" WHERE id = $1`,
      [empresaId],
    );
    expect(rows[0]!.status_assinatura).toBe("inadimplente");
    conferencias++;
  });

  it("gateway_assinante_id desconhecido devolve false, sem quebrar", async () => {
    const achou = await atualizarStatusAssinaturaPorAssinanteGateway(
      "assinante-que-nunca-existiu-" + marca,
      "vencida",
    );
    expect(achou).toBe(false);
    conferencias++;
  });
});

describe("6. fretigate_app não tem privilégio nenhum em pagamento_pendente", () => {
  it("nenhum GRANT direto — todo acesso passa pelas funções SECURITY DEFINER", async () => {
    // Contraste do §3, adaptado a esta tabela: o mecanismo de proteção não
    // é `empresa_id = contexto` (não há isolamento por empresa a testar
    // aqui, ver o comentário do topo do arquivo) — é a AUSÊNCIA de
    // privilégio direto. Sem esta prova, nada mostra que `fretigate_app`
    // realmente não alcança a tabela por fora das sete funções — mesma
    // técnica de `tests/isolamento/privilegios.test.ts` para função.
    const { rows } = await raiz.query(
      `SELECT privilege_type FROM information_schema.table_privileges
         WHERE table_name = 'pagamento_pendente' AND grantee = 'fretigate_app'`,
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
