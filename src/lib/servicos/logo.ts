import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fileTypeFromBuffer } from "file-type";
import { uuidv7 } from "uuidv7";
import { reprocessarImagem, TIPOS_PERMITIDOS_IMAGEM } from "@/lib/utils/imagem";
import { atualizarContaDaEmpresa, buscarEmpresa } from "./empresas";

/**
 * Logo da empresa (item 10, Tarefa 2 — `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`). Mesmo padrão de
 * `src/lib/servicos/comprovantes.ts`: balde privado (migration
 * `20260831070000_balde_logos_storage`), `service_role`, nome aleatório,
 * conteúdo sempre reprocessado e recomprimido (`CLAUDE.md` §4, "Upload de
 * imagem"). O mecanismo de decodificar/redimensionar (`reprocessarImagem`,
 * `src/lib/utils/imagem.ts`) é compartilhado com o comprovante; o que muda
 * aqui é o alvo de saída e o destino final do caminho gravado.
 *
 * **Diferente do comprovante em dois pontos, os dois pela decisão 4 do
 * plano:**
 * 1. Limite próprio, menor — lado máximo **480px**, alvo **~80 KB** (contra
 *    1600px/~300KB do comprovante): a logo embute como `data:` URI dentro
 *    do PDF do relatório (`logoComoDataUri`, abaixo) — um payload grande
 *    infla o HTML que o Chromium precisa montar a cada geração.
 * 2. O caminho gravado não é por frete — é a EMPRESA inteira
 *    (`Empresa.logo_url`, uma coluna só). `enviarLogo` grava direto por
 *    `atualizarContaDaEmpresa`, sem checagem de posse adicional: quem chama
 *    (`src/app/api/conta/logo/route.ts`) já exigiu `exigirDono()` antes —
 *    não existe "logo de outro frete" para confundir, é sempre A logo da
 *    empresa da sessão.
 *
 * **Igual ao comprovante:** trocar a logo NÃO apaga o objeto antigo do
 * balde (`CLAUDE.md` §7, "Nada é apagado") — mesma lacuna já registrada em
 * `CLAUDE.md` §14 (teto de 2 GB por empresa, ainda sem mecanismo).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL não está definida. Veja o .env.example — é a URL do " +
      "projeto Supabase do ambiente (dev/teste/produção têm projetos " +
      "diferentes, CLAUDE.md §5).",
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY não está definida. Veja o .env.example — é a " +
      "chave que NUNCA vai ao navegador (CLAUDE.md §4), usada só aqui para " +
      "gravar/ler o balde de logos.",
  );
}

const BALDE_LOGOS = "logos";

/** Um cliente por processo — mesmo padrão de `comprovantes.ts`/`armazenamento.ts`/`src/lib/db/index.ts`. */
const cache = globalThis as unknown as {
  clienteStorageLogos?: ReturnType<typeof createClient>;
};

const clienteStorage =
  cache.clienteStorageLogos ??
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

if (process.env.NODE_ENV !== "production") cache.clienteStorageLogos = clienteStorage;

export const TAMANHO_MAXIMO_LOGO_BYTES = 10 * 1024 * 1024;

const LIMITES_LOGO = {
  ladoMaximoPx: 480,
  alvoBytes: 80 * 1024,
  qualidadeInicial: 80,
  qualidadeMinima: 50,
};

/** Mesma lista fechada do padrão de `MENSAGENS_SEGURAS_DE_COMPROVANTE` (`comprovantes.ts`) — só o que este arquivo escreveu chega à tela (`CLAUDE.md` §8). */
export const MENSAGENS_SEGURAS_DE_LOGO = new Set([
  "O arquivo passa de 10 MB.",
  "Envie uma imagem em JPEG, PNG, WEBP ou HEIC.",
  "Imagem grande demais.",
  "Não deu para abrir a imagem.",
  "Não deu para enviar agora.",
]);

/**
 * Processa e grava a logo, e já atualiza `Empresa.logo_url` com o caminho —
 * quem chama (a rota de API) não precisa de uma segunda chamada para
 * persistir. Lança se o arquivo passar de 10 MB ou não for um tipo aceito.
 */
export async function enviarLogo(empresaId: string, arquivo: Buffer): Promise<string> {
  if (arquivo.byteLength > TAMANHO_MAXIMO_LOGO_BYTES) {
    throw new Error("O arquivo passa de 10 MB.");
  }

  const tipo = await fileTypeFromBuffer(arquivo);
  if (!tipo || !TIPOS_PERMITIDOS_IMAGEM.has(tipo.mime)) {
    throw new Error("Envie uma imagem em JPEG, PNG, WEBP ou HEIC.");
  }

  const processada = await reprocessarImagem(arquivo, tipo.mime, LIMITES_LOGO, {
    tipoInvalido: "Envie uma imagem em JPEG, PNG, WEBP ou HEIC.",
    imagemGrande: "Imagem grande demais.",
  });

  const caminho = `${empresaId}/${uuidv7()}.jpg`;
  const { error } = await clienteStorage.storage
    .from(BALDE_LOGOS)
    .upload(caminho, processada, { contentType: "image/jpeg" });
  // Nunca relança o erro do Supabase — mesmo motivo de `comprovantes.ts`:
  // texto de terceiro, em inglês, não pode chegar cru à tela.
  if (error) {
    console.error("[logo] falha ao gravar no storage", error.message);
    throw new Error("Não deu para enviar agora.");
  }

  // O caminho antigo, se havia um, fica no balde — nunca apagado (§7).
  await atualizarContaDaEmpresa(empresaId, { logoUrl: caminho });
  return caminho;
}

/** Curta — só o tempo de a tela de Conta carregar a prévia (mesmo padrão de `gerarUrlComprovante`, 60s). */
const EXPIRACAO_URL_LOGO_SEGUNDOS = 60;

/** URL assinada para exibir a logo em tela (`/conta`) — `null` se a empresa não tem logo. */
export async function gerarUrlLogo(empresaId: string): Promise<string | null> {
  const empresa = await buscarEmpresa(empresaId);
  if (!empresa?.logo_url) return null;

  const { data, error } = await clienteStorage.storage
    .from(BALDE_LOGOS)
    .createSignedUrl(empresa.logo_url, EXPIRACAO_URL_LOGO_SEGUNDOS);
  if (error) {
    console.error("[logo] falha ao assinar URL do storage", error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Bytes da logo como `data:` URI — para embutir no PDF do relatório
 * (`src/lib/servicos/relatorios.ts`, `montarDadosDocumentoRelatorio`), a
 * mesma razão de `src/lib/documentos/fontesEmbutidas.ts`: o Chromium do
 * gerador não tem acesso a rede, então `<img src="URL assinada">` nunca
 * carregaria. `caminho` é sempre `Empresa.logo_url` — sempre `.jpg`, sempre
 * `image/jpeg` (`enviarLogo` grava com esse `contentType` fixo). `null` se o
 * download falhar — o cabeçalho do documento cai para as iniciais da
 * empresa (`moldeDocumentoA4.ts`), nunca quebra a geração inteira por causa
 * só da logo (mesmo raciocínio de `gerarUrlComprovante` sobre não derrubar a
 * tela inteira por uma miniatura).
 */
export async function logoComoDataUri(caminho: string): Promise<string | null> {
  const { data, error } = await clienteStorage.storage.from(BALDE_LOGOS).download(caminho);
  if (error || !data) {
    console.error("[logo] falha ao baixar do storage", error?.message);
    return null;
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}
