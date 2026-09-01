import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { enviarLogo, gerarUrlLogo, logoComoDataUri, TAMANHO_MAXIMO_LOGO_BYTES } from "@/lib/servicos/logo";

/**
 * O pipeline da logo da empresa (item 10, Tarefa 2 —
 * `docs/planos/item-10-configuracoes-conta-e-usuarios.md`). Mesmo padrão de
 * `tests/isolamento/enviar-comprovante.test.ts` — fala com o balde de
 * verdade, por isso mora em `tests/isolamento/`. Cobre o que é DIFERENTE do
 * comprovante (limite próprio 480px/~80KB, decisão 4; `.flatten()` sobre
 * fundo transparente, achado ao extrair o mecanismo compartilhado;
 * `logoComoDataUri` para o PDF) — o mecanismo de decodificar/reprocessar em
 * si (HEIC em duas etapas, `.rotate()` antes do resize, EXIF removido) já
 * está medido em `enviar-comprovante.test.ts`, contra `reprocessarImagem`
 * (`src/lib/utils/imagem.ts`), a mesma função por baixo dos dois.
 */

const marca = process.hrtime.bigint().toString(16).slice(-8);
const A = `12121212-1212-4121-8121-${marca.padStart(12, "0")}`;

let raiz: Client;

const clienteStorage = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 12;

async function pngTransparente(): Promise<Buffer> {
  // Fundo transparente com um quadrado escuro — sem `.flatten()` explícito
  // sobre branco, o `sharp` preencheria a transparência com PRETO ao
  // converter pra JPEG, e o quadrado escuro sumiria dentro dela.
  return sharp({
    create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 20, g: 20, b: 20 } } })
          .png()
          .toBuffer(),
        left: 200,
        top: 200,
      },
    ])
    .png()
    .toBuffer();
}

function svgDisfarcadoDeJpg(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
}

beforeAll(async () => {
  raiz = new Client({ connectionString: process.env.DIRECT_URL });
  await raiz.connect();
  await raiz.query(
    `INSERT INTO "empresa" (id, nome_fantasia, termos_aceitos_em, termos_versao)
     VALUES ($1, $2, now(), 'teste')`,
    [A, `Empresa Logo ${marca}`],
  );
});

afterAll(async () => {
  const { data: objetos } = await clienteStorage.storage.from("logos").list(A);
  if (objetos?.length) {
    await clienteStorage.storage.from("logos").remove(objetos.map((o) => `${A}/${o.name}`));
  }
  await raiz.query(`DELETE FROM "empresa" WHERE id = $1`, [A]);
  await raiz.end();
});

describe("gerarUrlLogo — antes de qualquer envio", () => {
  it("devolve null quando a empresa não tem logo ainda", async () => {
    expect(await gerarUrlLogo(A)).toBeNull();
    conferencias++;
  });
});

describe("enviarLogo — pipeline de upload", () => {
  it("recusa arquivo acima de 10 MB, sem gravar nada", async () => {
    const grandeDemais = Buffer.alloc(TAMANHO_MAXIMO_LOGO_BYTES + 1);
    await expect(enviarLogo(A, grandeDemais)).rejects.toThrow("O arquivo passa de 10 MB.");
    const r = await raiz.query(`SELECT logo_url FROM "empresa" WHERE id = $1`, [A]);
    expect(r.rows[0].logo_url).toBeNull();
    conferencias++;
  });

  it("recusa tipo não permitido por CONTEÚDO — um SVG disfarçado de .jpg", async () => {
    await expect(enviarLogo(A, svgDisfarcadoDeJpg())).rejects.toThrow(
      "Envie uma imagem em JPEG, PNG, WEBP ou HEIC.",
    );
    conferencias++;
  });

  it("resultado final é JPEG, redimensionado ao limite da logo (480px), fundo transparente vira branco (não preto)", async () => {
    const caminho = await enviarLogo(A, await pngTransparente());
    expect(caminho).toMatch(new RegExp(`^${A}/.+\\.jpg$`));
    conferencias++;

    const r = await raiz.query<{ logo_url: string }>(`SELECT logo_url FROM "empresa" WHERE id = $1`, [A]);
    expect(r.rows[0].logo_url).toBe(caminho);
    conferencias++;

    const { data, error } = await clienteStorage.storage.from("logos").download(caminho);
    expect(error).toBeNull();
    const baixado = Buffer.from(await data!.arrayBuffer());

    const metadados = await sharp(baixado).metadata();
    expect(metadados.format).toBe("jpeg");
    // 600px de entrada, teto de 480px — teria saído 600 se o limite da
    // logo (diferente do comprovante, 1600px) não estivesse valendo.
    expect(Math.max(metadados.width!, metadados.height!)).toBe(480);
    conferencias++;

    // O quadrado escuro (canto superior esquerdo do composite, coordenada
    // proporcional 200/600 → 160/480 depois do resize) precisa continuar
    // escuro; um pixel fora dele (canto 10,10) precisa ter virado BRANCO —
    // se `.flatten()` não estivesse setado para "#FFFFFF", sairia preto.
    const pixelFundo = await sharp(baixado)
      .extract({ left: 10, top: 10, width: 1, height: 1 })
      .raw()
      .toBuffer();
    // O comprimento é conferido ANTES do laço — achado do segundo `/revisar`:
    // um laço `for` sobre um buffer vazio roda zero verificações e o
    // `conferencias++` seguinte contaria do mesmo jeito, disfarçando "não
    // rodou" de "passou" (`CLAUDE.md` §3, item 4). JPEG sem canal alfa: 3
    // bytes (RGB) para 1 pixel.
    expect(pixelFundo.length).toBe(3);
    conferencias++;
    // >=250, não `toEqual([255,255,255])` de propósito — compressão JPEG
    // (lossy) pode deixar o branco levemente imperfeito nos três canais; o
    // que a linha prova é "claro", não "preto" (o que `.flatten()` sem
    // argumento produziria).
    for (const canal of pixelFundo) expect(canal).toBeGreaterThanOrEqual(250);
    conferencias++;
  });

  it("trocar a logo NÃO apaga o objeto antigo do balde — nada é apagado (CLAUDE.md §7)", async () => {
    const primeiro = (await raiz.query<{ logo_url: string }>(`SELECT logo_url FROM "empresa" WHERE id = $1`, [A]))
      .rows[0].logo_url;

    const segundo = await enviarLogo(A, await pngTransparente());
    expect(segundo).not.toBe(primeiro);
    conferencias++;

    const { data: primeiroAindaExiste } = await clienteStorage.storage
      .from("logos")
      .list(A, { search: primeiro.split("/")[1] });
    expect(primeiroAindaExiste?.length).toBe(1);
    conferencias++;
  });
});

describe("gerarUrlLogo / logoComoDataUri — depois do envio", () => {
  it("gerarUrlLogo devolve uma URL assinada de verdade", async () => {
    const url = await gerarUrlLogo(A);
    expect(url).toMatch(/^https?:\/\//);
    conferencias++;
  });

  it("logoComoDataUri devolve os mesmos bytes como data: URI — o que o gerador de PDF embute", async () => {
    const empresa = await raiz.query<{ logo_url: string }>(`SELECT logo_url FROM "empresa" WHERE id = $1`, [A]);
    const dataUri = await logoComoDataUri(empresa.rows[0].logo_url);
    expect(dataUri).toMatch(/^data:image\/jpeg;base64,/);

    const bytesDoDataUri = Buffer.from(dataUri!.split(",")[1], "base64");
    const { data } = await clienteStorage.storage.from("logos").download(empresa.rows[0].logo_url);
    const bytesDoBalde = Buffer.from(await data!.arrayBuffer());
    expect(bytesDoDataUri.equals(bytesDoBalde)).toBe(true);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
