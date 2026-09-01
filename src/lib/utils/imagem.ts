import libheif from "libheif-js/wasm-bundle";
import sharp from "sharp";

/**
 * O miolo do reprocessamento de imagem — extraído de `src/lib/servicos/
 * comprovantes.ts` no item 10, Tarefa 2, quando a logo da empresa
 * (`src/lib/servicos/logo.ts`) virou o segundo caso de uso real do mesmo
 * pipeline (`CLAUDE.md` §6: "sem dois casos de uso reais" é o que barra
 * abstração especulativa — agora existem dois). Cada chamador continua dono
 * da própria orquestração: tamanho máximo de entrada, mensagens de erro e o
 * alvo de saída (lado máximo, bytes) mudam por caso de uso (comprovante:
 * 1600px/~300KB; logo: 480px/~80KB, `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, decisão 4) — só o MECANISMO de
 * decodificar/redimensionar/recomprimir é compartilhado.
 *
 * Nada neste arquivo confere tamanho de entrada ou tipo de conteúdo — isso
 * continua em cada serviço, porque a mensagem de erro ("Envie uma foto em
 * JPEG..." vs a que a logo usa) é decisão de cada tela, não deste mecanismo.
 */

/** Generoso o bastante para qualquer foto de celular real, curto o bastante para não deixar uma imagem pequena expandir para gigabytes na decodificação (`CLAUDE.md` §4). */
export const LIMITE_PIXELS_ENTRADA = 60_000_000;

export const TIPOS_PERMITIDOS_IMAGEM = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Decodifica HEIC/HEIF em duas etapas — o binário pré-compilado do `sharp`
 * (o que a Vercel também usa) não decodifica HEIC de iPhone de verdade (só
 * AVIF; `libde265`/`x265` exigem compilar o `libvips` global à parte pela
 * licença). Devolve os pixels crus (RGBA) prontos para `sharp({ raw: ... })`.
 * Lança se o arquivo não abrir como HEIC (`libheif-js` devolve lista vazia
 * em vez de lançar, medido) ou se a dimensão passar do limite — a conferência
 * roda ANTES de `imagem.display(...)` (o passo que de fato aloca
 * `largura×altura×4` bytes), senão um HEIC pequeno e malicioso decodificaria
 * para gigabytes antes de qualquer limite importar.
 */
export async function decodificarHeic(
  buffer: Buffer,
  mensagemTipoInvalido: string,
  mensagemImagemGrande: string,
): Promise<{ width: number; height: number; data: Buffer }> {
  await libheif.ready;
  const decoder = new libheif.HeifDecoder();
  const imagens = decoder.decode(buffer);

  try {
    if (!imagens.length) throw new Error(mensagemTipoInvalido);

    const imagem = imagens[0];
    const width = imagem.get_width();
    const height = imagem.get_height();
    if (width * height > LIMITE_PIXELS_ENTRADA) {
      throw new Error(mensagemImagemGrande);
    }

    const resultado = await new Promise<{ data: Uint8ClampedArray; width: number; height: number }>(
      (resolve, reject) => {
        imagem.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, (saida) => {
          if (!saida) return reject(new Error("Não deu para abrir a imagem."));
          resolve(saida);
        });
      },
    );

    return {
      width,
      height,
      data: Buffer.from(resultado.data.buffer, resultado.data.byteOffset, resultado.data.byteLength),
    };
  } finally {
    for (const imagem of imagens) imagem.free();
    decoder.decoder.delete();
  }
}

export type LimitesDeSaida = {
  /** Maior lado, em pixels — nunca aumenta uma imagem menor. */
  ladoMaximoPx: number;
  alvoBytes: number;
  qualidadeInicial: number;
  /** Piso — abaixo disso o resultado fica feio (`CLAUDE.md` §4). */
  qualidadeMinima: number;
};

/**
 * Redimensiona e recomprime em JPEG, mirando `limites.alvoBytes`: qualidade
 * `qualidadeInicial` primeiro; se passar do alvo, um segundo passe em
 * `qualidadeMinima` — aceita o resultado desse segundo passe mesmo que ainda
 * passe do alvo, é o melhor que o piso permite.
 *
 * Metadados EXIF somem por padrão (o código nunca chama `.withMetadata()`).
 *
 * **`.flatten({ background: "#FFFFFF" })` sempre roda, para os dois casos de
 * uso — mudança de comportamento do comprovante, avaliada, não só herdada.**
 * Necessário para PNG com fundo transparente (logo de empresa, o caso que
 * motivou a extração): sem isso o `sharp` preenche a transparência com preto
 * ao converter para JPEG, e uma logo escura sobre fundo transparente sairia
 * como um quadrado preto. Para o comprovante é inócuo, não hipotético: JPEG
 * não tem canal alfa (é o formato mais comum de foto de celular) e o HEIC de
 * câmera de verdade também não produz transparência — só PNG/WEBP editados à
 * mão poderiam chegar com alfa, e não é o que uma foto de comprovante é.
 * `sharp` já trata `.flatten()` como no-op quando a imagem de entrada não
 * tem canal alfa nenhum — nenhum pixel de foto real é reescrito.
 */
export async function reprocessarImagem(
  entrada: Buffer,
  mimeDetectado: string,
  limites: LimitesDeSaida,
  mensagensHeic: { tipoInvalido: string; imagemGrande: string },
): Promise<Buffer> {
  const origemSharp =
    mimeDetectado === "image/heic" || mimeDetectado === "image/heif"
      ? await decodificarHeic(entrada, mensagensHeic.tipoInvalido, mensagensHeic.imagemGrande).then(
          ({ width, height, data }) => ({
            buffer: data,
            opcoes: { raw: { width, height, channels: 4 as const }, limitInputPixels: LIMITE_PIXELS_ENTRADA },
            aplicarRotate: false,
          }),
        )
      : { buffer: entrada, opcoes: { limitInputPixels: LIMITE_PIXELS_ENTRADA }, aplicarRotate: true };

  async function recodificar(qualidade: number): Promise<Buffer> {
    let pipeline = sharp(origemSharp.buffer, origemSharp.opcoes);
    // `.rotate()` sem argumento aplica a rotação do EXIF de orientação NOS
    // PIXELS antes de qualquer outra coisa (só JPEG/PNG/WEBP — HEIC/HEIF já
    // chega com a orientação aplicada pelo `libheif`, via `irot`/`imir`).
    if (origemSharp.aplicarRotate) pipeline = pipeline.rotate();
    return pipeline
      .resize({
        width: limites.ladoMaximoPx,
        height: limites.ladoMaximoPx,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#FFFFFF" })
      .jpeg({ quality: qualidade })
      .toBuffer();
  }

  const primeiraPassada = await recodificar(limites.qualidadeInicial);
  if (primeiraPassada.length <= limites.alvoBytes) return primeiraPassada;
  return recodificar(limites.qualidadeMinima);
}
