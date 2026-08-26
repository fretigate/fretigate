import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { enviarComprovante, TAMANHO_MAXIMO_COMPROVANTE_BYTES } from "@/lib/servicos/comprovantes";

/**
 * O pipeline de upload do comprovante (item 5, Tarefa 5 —
 * `docs/planos/item-5-ordem-de-servico.md`): tamanho, tipo por conteúdo,
 * reprocessamento de imagem (redimensiona, remove EXIF, sempre JPEG) e a
 * checagem de posse — antes de qualquer coisa tocar o storage. Fala com o
 * balde de verdade (`SUPABASE_SERVICE_ROLE_KEY`), por isso mora em
 * `tests/isolamento/`, ao lado de `comprovantes.test.ts` (que mede
 * `gerarUrlComprovante`, a leitura — este mede a gravação).
 *
 * HEIC/HEIF NÃO tem teste automatizado aqui — o pipeline usa `libheif-js`
 * (WASM) direto, não o `sharp` pré-compilado (medido nesta tarefa: o
 * binário pré-compilado do `sharp`/`libvips` que a Vercel também usaria não
 * decodifica HEIC de iPhone de verdade — só AVIF; `libde265`/`x265`, os
 * decodificadores de HEVC, exigem compilar o `libvips` global à parte, por
 * causa da licença). `docs/planos/item-5-ordem-de-servico.md` pedia uma
 * foto HEIC REAL de iPhone antes de considerar a tarefa pronta — feito à
 * mão, fora da suíte automatizada (25/08/2026, decisão do fundador: ele
 * mandou a foto): arquivo real de iPhone (`3024×4032`, formato "Alta
 * Eficiência"), decodificado por `libheif-js`, redimensionado para
 * `1200×1600`, 153 KB, sem EXIF, **conferido visualmente e a orientação
 * saiu correta** (a suposição de que `libheif` aplica `irot`/`imir`
 * automaticamente ao decodificar SE confirmou). A foto em si não entrou no
 * repositório nem ficou salva em lugar nenhum — é imagem pessoal de
 * terceiro, apagada logo depois da verificação. Sem teste automatizado
 * permanente porque não há arquivo HEIC de teste versionável (o mesmo
 * motivo por trás de este arquivo não ter um antes desta verificação).
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);
const A = `eeeeeeee-eeee-4eee-8eee-${marca.padStart(12, "0")}`;
const B = `ffffffff-ffff-4fff-8fff-${marca.padStart(12, "0")}`;

let raiz: Client;
let servicoDeAId: string;
let tipoOperacaoAId: string;
let clienteAId: string;

const clienteStorage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 11;

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

/** `numero` só precisa ser único por empresa (`servico_empresa_id_numero_key`) — cada empresa deste arquivo conta a partir de 1. */
const proximoNumeroPorEmpresa = new Map<string, number>();

async function criarServicoDe(empresaId: string, tipoOperacaoId: string, clienteId: string): Promise<string> {
  const id = randomUUID();
  const numero = proximoNumeroPorEmpresa.get(empresaId) ?? 1;
  proximoNumeroPorEmpresa.set(empresaId, numero + 1);
  await raiz.query(
    `INSERT INTO "servico"
       (id, empresa_id, numero, tipo_operacao_id, cliente_id, data_servico,
        valor, criado_por_usuario_id)
     VALUES ($1, $2, $6, $3, $4, now(), 10000, $5)`,
    [id, empresaId, tipoOperacaoId, clienteId, `u-${empresaId}`, numero],
  );
  return id;
}

/** Comprovante em `2000×1000`, com EXIF (Copyright) e orientação 6 (90° horário) — prova que `.rotate()` roda ANTES do EXIF sumir: se não rodasse, a imagem sairia deitada (1600×800), não em pé (800×1600). */
async function fotoComExifEOrientacao(): Promise<Buffer> {
  const semExif = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();
  return sharp(semExif)
    .withExif({ IFD0: { Copyright: "Teste EXIF — precisa sumir" } })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
}

function svgDisfarcadoDeJpg(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();

  tipoOperacaoAId = randomUUID();
  clienteAId = randomUUID();
  await semear(A, "Empresa Upload A", tipoOperacaoAId, clienteAId);
  servicoDeAId = await criarServicoDe(A, tipoOperacaoAId, clienteAId);

  const tipoOperacaoB = randomUUID();
  const clienteB = randomUUID();
  await semear(B, "Empresa Upload B", tipoOperacaoB, clienteB);
});

afterAll(async () => {
  // Limpa os dois prefixos — `B/` não deveria ter nada (é o que o teste de
  // isolamento mede), mas limpar os dois é defesa simétrica, não suposição
  // de que só `A/` pode ter sobrado algo.
  for (const empresaId of [A, B]) {
    const { data: objetos } = await clienteStorage.storage.from("comprovantes").list(empresaId);
    if (objetos?.length) {
      await clienteStorage.storage
        .from("comprovantes")
        .remove(objetos.map((o) => `${empresaId}/${o.name}`));
    }
  }
  await raiz.query(`DELETE FROM "servico" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "cliente" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "usuario" WHERE empresa_id IN ($1,$2)`, [A, B]);
  await raiz.query(`DELETE FROM "empresa" WHERE id IN ($1,$2)`, [A, B]);
  await raiz.end();
});

describe("enviarComprovante — pipeline de upload", () => {
  it("recusa arquivo acima de 10 MB, sem gravar nada", async () => {
    const grandeDemais = Buffer.alloc(TAMANHO_MAXIMO_COMPROVANTE_BYTES + 1);
    await expect(enviarComprovante(A, servicoDeAId, grandeDemais)).rejects.toThrow(
      "O arquivo passa de 10 MB.",
    );
    const r = await raiz.query(`SELECT comprovante_url FROM "servico" WHERE id = $1`, [servicoDeAId]);
    expect(r.rows[0].comprovante_url).toBeNull();
    conferencias++;
  });

  it("recusa tipo não permitido por CONTEÚDO — um SVG disfarçado de .jpg", async () => {
    // O nome do arquivo nunca chega a esta função (só o Buffer) — a prova de
    // que a recusa é por conteúdo, não por extensão, é o texto do SVG em si
    // não bater com nenhuma assinatura binária que `file-type` reconheça.
    await expect(enviarComprovante(A, servicoDeAId, svgDisfarcadoDeJpg())).rejects.toThrow(
      "Envie uma foto em JPEG, PNG, WEBP ou HEIC.",
    );
    conferencias++;
  });

  it("resultado final é sempre JPEG, sem EXIF, redimensionado e com a orientação já aplicada nos pixels", async () => {
    await enviarComprovante(A, servicoDeAId, await fotoComExifEOrientacao());

    const r = await raiz.query<{ comprovante_url: string }>(
      `SELECT comprovante_url FROM "servico" WHERE id = $1`,
      [servicoDeAId],
    );
    const caminho = r.rows[0].comprovante_url;
    expect(caminho).toMatch(new RegExp(`^${A}/.+\\.jpg$`));
    conferencias++;

    const { data, error } = await clienteStorage.storage.from("comprovantes").download(caminho);
    expect(error).toBeNull();
    const baixado = Buffer.from(await data!.arrayBuffer());

    const metadados = await sharp(baixado).metadata();
    expect(metadados.format).toBe("jpeg");
    expect(metadados.exif).toBeUndefined();
    conferencias++;

    // 2000×1000 com orientação 6 (90° horário) baked in vira 1000×2000 —
    // redimensionado (maior lado 1600) vira 800×1600. Sair "deitado"
    // (1600×800) seria a prova de que `.rotate()` NÃO rodou antes do resize.
    expect(metadados.width).toBe(800);
    expect(metadados.height).toBe(1600);
    conferencias++;

    const { data: infoObjeto } = await clienteStorage.storage.from("comprovantes").list(A, {
      search: caminho.split("/")[1],
    });
    expect(infoObjeto?.[0]?.metadata?.mimetype).toBe("image/jpeg");
    conferencias++;
  });

  /**
   * SEM contraste próprio aqui — achado do terceiro passe do `/revisar`: a
   * primeira tentativa de contraste (removida) gravava via `raiz`, o
   * cliente `pg` com o papel `postgres` (`DIRECT_URL`) que ignora RLS por
   * ATRIBUTO, sempre — não provava nada sobre a checagem de
   * `enviarComprovante`, só que `postgres` pode escrever qualquer linha,
   * fato já conhecido e sem relação com este código.
   *
   * A proteção medida abaixo não é um `if` só deste arquivo (como era em
   * `gerarUrlComprovante`/Tarefa 4, que por isso TEM seu próprio contraste
   * em `tests/isolamento/comprovantes.test.ts`) — é a RLS de `servico` via
   * `db(empresaId)`/`set_config`, a mesma que protege toda escrita do
   * domínio (`CLAUDE.md` §3/§9). Essa RLS já tem contraste, concorrência e
   * os três jeitos de não ter contexto medidos de forma genérica em
   * `tests/isolamento/schema.test.ts` e `vazamento.test.ts` — duplicar
   * contraste aqui testaria a MESMA política de novo, com um nome
   * diferente. `salvarCaminhoComprovante` (`servicos.ts`) confere posse de
   * novo, de forma independente, antes de gravar — mesmo padrão de
   * `marcarOrdemEnviada`/`marcarServicoFinalizado`, nenhum dos quais tem
   * contraste próprio em `tests/servicos.test.ts` pelo mesmo motivo.
   */
  it("recusa gravar comprovante em frete de outra empresa — o frete de A continua sem vazar nada em B", async () => {
    const antes = (
      await raiz.query<{ comprovante_url: string | null }>(
        `SELECT comprovante_url FROM "servico" WHERE id = $1`,
        [servicoDeAId],
      )
    ).rows[0].comprovante_url;

    await expect(enviarComprovante(B, servicoDeAId, await fotoComExifEOrientacao())).rejects.toThrow(
      "Frete não encontrado.",
    );
    conferencias++;

    // O nome deste teste afirma "sem vazar nada em B" — isto é o que mede
    // essa frase, não só o `rejects.toThrow` acima (achado do quarto passe
    // do `/revisar`: nome de teste que promete mais do que o corpo mede é
    // a mesma classe de erro do §13, "afirmação de medição sobre coisa que
    // não existe"). Recusa antes de `buscarServico` retornar chega antes de
    // qualquer upload — nenhum objeto sob o prefixo `B/` deveria existir.
    const { data: objetosDeB } = await clienteStorage.storage.from("comprovantes").list(B);
    expect(objetosDeB).toEqual([]);
    conferencias++;

    // E o `Servico` de A continua exatamente como estava antes da tentativa.
    const depois = (
      await raiz.query<{ comprovante_url: string | null }>(
        `SELECT comprovante_url FROM "servico" WHERE id = $1`,
        [servicoDeAId],
      )
    ).rows[0].comprovante_url;
    expect(depois).toBe(antes);
    conferencias++;
  });

  it("trocar comprovante NÃO apaga o objeto antigo do balde — nada é apagado (CLAUDE.md §7)", async () => {
    // Frete próprio (não `servicoDeAId`, já usado pelos testes acima) para
    // este teste ficar independente de ordem de execução — mesma empresa,
    // reaproveitando o tipo de operação e o cliente já semeados.
    const servicoId = await criarServicoDe(A, tipoOperacaoAId, clienteAId);

    await enviarComprovante(A, servicoId, await fotoComExifEOrientacao());
    const primeiro = (
      await raiz.query<{ comprovante_url: string }>(
        `SELECT comprovante_url FROM "servico" WHERE id = $1`,
        [servicoId],
      )
    ).rows[0].comprovante_url;

    await enviarComprovante(A, servicoId, await fotoComExifEOrientacao());
    const segundo = (
      await raiz.query<{ comprovante_url: string }>(
        `SELECT comprovante_url FROM "servico" WHERE id = $1`,
        [servicoId],
      )
    ).rows[0].comprovante_url;

    // O Servico passa a apontar pro novo caminho...
    expect(segundo).not.toBe(primeiro);
    conferencias++;

    // ...mas o objeto ANTIGO continua no balde — corrigido no segundo passe
    // do `/revisar`: a primeira versão desta tarefa apagava o antigo, o que
    // violava `CLAUDE.md` §7 ("Nada é apagado"). `afterAll` deste arquivo
    // limpa os dois (lista tudo sob o prefixo `A/`).
    const { data: primeiroAindaExiste } = await clienteStorage.storage
      .from("comprovantes")
      .list(A, { search: primeiro.split("/")[1] });
    expect(primeiroAindaExiste?.length).toBe(1);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
