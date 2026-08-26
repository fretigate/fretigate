/**
 * `libheif-js` não publica tipos para o subcaminho `wasm-bundle` (o pacote
 * inteiro não tem `@types` — `src/lib/servicos/comprovantes.ts`, item 5
 * Tarefa 5). Só a fatia da API que este produto usa: o suficiente para medir
 * a dimensão da imagem ANTES de decodificar os pixels (`CLAUDE.md` §4,
 * "acima de um limite de dimensão antes de abrir o arquivo") — não a API
 * inteira do `libheif`.
 */
declare module "libheif-js/wasm-bundle" {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      alvo: { data: Uint8ClampedArray; width: number; height: number },
      retorno: (resultado: { data: Uint8ClampedArray; width: number; height: number } | null) => void,
    ): void;
    free(): void;
  }

  interface HeifDecoderInstance {
    decode(buffer: Buffer | Uint8Array): HeifImage[];
    /** Contexto interno do WASM — precisa de `.delete()` explícito para não vazar memória. */
    decoder: { delete(): void };
  }

  interface LibheifModule {
    ready: Promise<void>;
    HeifDecoder: new () => HeifDecoderInstance;
  }

  const libheif: LibheifModule;
  export default libheif;
}
