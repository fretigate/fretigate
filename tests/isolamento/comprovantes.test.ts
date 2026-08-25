import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { gerarUrlComprovante } from "@/lib/servicos/comprovantes";

/**
 * A fronteira REAL do balde `comprovantes` (item 5, Tarefa 4 —
 * `docs/planos/item-5-ordem-de-servico.md`): não é RLS
 * (`tests/isolamento/storage.test.ts`, arquivo separado deste porque aquele
 * não precisa de `SUPABASE_SERVICE_ROLE_KEY` para rodar e este precisa) — é
 * `gerarUrlComprovante` conferindo posse via `buscarServico` ANTES de gerar
 * a URL assinada. `service_role` ignora RLS por atributo, então se essa
 * checagem sumisse do código, o banco não pegaria — só este teste pegaria.
 *
 * O CONTRASTE (§3, item 1): chama o cliente de storage DIRETO, pulando
 * `gerarUrlComprovante` de propósito — código temporário só para provar que
 * o teste mede alguma coisa. Se essa chamada direta CONSEGUE gerar a URL do
 * comprovante da empresa A, então a checagem de posse é o que impede a
 * empresa B de conseguir a mesma URL pela função de verdade — não alguma
 * outra proteção que o teste não estaria vendo.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);
const A = `cccccccc-cccc-4ccc-8ccc-${marca.padStart(12, "0")}`;
const B = `dddddddd-dddd-4ddd-8ddd-${marca.padStart(12, "0")}`;
const CAMINHO_COMPROVANTE_A = `${A}/probe-${marca}.jpg`;

let raiz: Client;
let servicoComComprovanteId: string;
let servicoSemComprovanteId: string;

const clienteStorage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 5;

async function semear(id: string, nome: string, tipoOperacaoId: string, clienteId: string) {
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [id, nome],
  );
  await raiz.query(
    `INSERT INTO "usuario" (id, nome, email, papel, empresa_id)
     VALUES ($1, $2, $3, 'dono', $4)`,
    [`u-${id}`, `Dono ${nome}`, `${id}@teste.invalido`, id],
  );
  await raiz.query(
    `INSERT INTO "tipo_operacao" (id, empresa_id, nome, slug, ativo, ordem)
     VALUES ($1, $2, 'Frete', 'frete', true, 1)`,
    [tipoOperacaoId, id],
  );
  await raiz.query(`INSERT INTO "cliente" (id, empresa_id, nome) VALUES ($1, $2, $3)`, [
    clienteId,
    id,
    `Cliente ${nome}`,
  ]);
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();

  const tipoOperacaoA = randomUUID();
  const clienteA = randomUUID();
  await semear(A, "Empresa A", tipoOperacaoA, clienteA);

  const tipoOperacaoB = randomUUID();
  const clienteB = randomUUID();
  await semear(B, "Empresa B", tipoOperacaoB, clienteB);

  // Objeto de verdade no balde — sem isto, `createSignedUrl` não teria o que
  // assinar (§3, item 1: teste que passaria de qualquer jeito não mede nada).
  const { error: erroUpload } = await clienteStorage.storage
    .from("comprovantes")
    .upload(CAMINHO_COMPROVANTE_A, Buffer.from("teste"), { contentType: "image/jpeg" });
  if (erroUpload) throw erroUpload;

  servicoComComprovanteId = randomUUID();
  await raiz.query(
    `INSERT INTO "servico"
       (id, empresa_id, numero, tipo_operacao_id, cliente_id, data_servico,
        valor, criado_por_usuario_id, comprovante_url)
     VALUES ($1, $2, 1, $3, $4, now(), 10000, $5, $6)`,
    [servicoComComprovanteId, A, tipoOperacaoA, clienteA, `u-${A}`, CAMINHO_COMPROVANTE_A],
  );

  servicoSemComprovanteId = randomUUID();
  await raiz.query(
    `INSERT INTO "servico"
       (id, empresa_id, numero, tipo_operacao_id, cliente_id, data_servico,
        valor, criado_por_usuario_id)
     VALUES ($1, $2, 2, $3, $4, now(), 10000, $5)`,
    [servicoSemComprovanteId, A, tipoOperacaoA, clienteA, `u-${A}`],
  );
});

afterAll(async () => {
  await clienteStorage.storage.from("comprovantes").remove([CAMINHO_COMPROVANTE_A]);
  await raiz.query(`DELETE FROM "servico" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "cliente" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "usuario" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "empresa" WHERE id IN ($1,$2)`, [A, B]);
  await raiz.end();
});

describe("gerarUrlComprovante — a checagem de posse é a fronteira real", () => {
  it("gera a URL para a própria empresa", async () => {
    const url = await gerarUrlComprovante(A, servicoComComprovanteId);
    expect(url).toMatch(/^https?:\/\//);
    conferencias++;
  });

  it("devolve null quando o frete não tem comprovante ainda", async () => {
    const url = await gerarUrlComprovante(A, servicoSemComprovanteId);
    expect(url).toBeNull();
    conferencias++;
  });

  it("recusa gerar URL para frete de outra empresa", async () => {
    await expect(gerarUrlComprovante(B, servicoComComprovanteId)).rejects.toThrow(
      "Frete não encontrado.",
    );
    conferencias++;
  });

  it("o contraste: sem a checagem de posse, a mesma chamada teria funcionado", async () => {
    // Código temporário, só para o teste — chama o storage direto, do jeito
    // que `gerarUrlComprovante` chamaria SE não tivesse `buscarServico`
    // antes. Prova que é a checagem, e não outra coisa, que barra o teste
    // anterior: `service_role` não olha empresa nenhuma.
    const { data, error } = await clienteStorage.storage
      .from("comprovantes")
      .createSignedUrl(CAMINHO_COMPROVANTE_A, 60);
    expect(error).toBeNull();
    expect(data?.signedUrl).toMatch(/^https?:\/\//);
    conferencias++;
  });

  it("depois da recusa, o frete de A continua sem vazar nada em B", async () => {
    // `buscarServico` já escopado por empresa é o mecanismo — aqui só
    // confirma que a tentativa de B não teve efeito colateral nenhum.
    const aindaExiste = await raiz.query(
      `SELECT comprovante_url FROM "servico" WHERE id = $1 AND empresa_id = $2`,
      [servicoComComprovanteId, A],
    );
    expect(aindaExiste.rows[0]?.comprovante_url).toBe(CAMINHO_COMPROVANTE_A);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
