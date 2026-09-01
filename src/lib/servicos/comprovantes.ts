import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fileTypeFromBuffer } from "file-type";
import { uuidv7 } from "uuidv7";
import { reprocessarImagem, TIPOS_PERMITIDOS_IMAGEM } from "@/lib/utils/imagem";
import { buscarServico, salvarCaminhoComprovante } from "./servicos";

/**
 * URL assinada do comprovante do frete (item 5, Tarefa 4 —
 * `docs/planos/item-5-ordem-de-servico.md`). O upload em si (Tarefa 5) ainda
 * não existe; este arquivo é a fundação: o balde privado `comprovantes`
 * (migration `20260825060000_balde_comprovantes_storage`) e a única forma
 * autorizada de ler o que está nele.
 *
 * A FRONTEIRA REAL NÃO É O RLS DO BALDE — é `buscarServico` logo abaixo.
 * `anon`/`authenticated` já não alcançam `storage.objects` (a migration
 * acima), mas isso protege contra a API pública do Supabase, que este
 * produto nunca usa. A garantia que importa é: ninguém gera URL assinada
 * para o comprovante de um frete que não é da própria empresa. Por isso
 * `gerarUrlComprovante` chama `buscarServico(empresaId, servicoId)` —
 * exatamente a mesma checagem de posse que `marcarOrdemEnviada` e
 * `marcarServicoFinalizado` já usam — ANTES de tocar o storage (CLAUDE.md
 * §4, "Upload de imagem").
 *
 * `service_role` (a chave usada aqui) ignora RLS por atributo e nunca vai ao
 * navegador (CLAUDE.md §4, "Os papéis embutidos do Supabase") — é por isso
 * que ela pode gravar/ler qualquer objeto do balde, e por isso que a checagem
 * de posse não pode vir do banco: o banco, por esta chave, deixaria passar.
 *
 * `import "server-only"` é uma camada DIFERENTE da trava de `eslint.config.mjs`
 * — a do ESLint impede um SEGUNDO cliente `service_role` nascer em outro
 * arquivo do servidor; esta impede que ESTE arquivo (com a chave real, lida
 * do ambiente) seja arrastado para o pacote que vai ao navegador. Sem ela, um
 * Client Component importando (direto ou por engano, através de outro
 * arquivo) qualquer coisa daqui faria o build do Next.js tentar empacotar
 * este módulo para rodar no celular de quem usa o produto — `server-only`
 * transforma essa tentativa em erro de build, antes de publicar, em vez de a
 * chave (ou o `throw` de variável faltando) aparecer em produção.
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
      "gravar/ler o balde de comprovantes.",
  );
}

const BALDE_COMPROVANTES = "comprovantes";

/** Curta de propósito — a URL vale só o tempo de a tela carregar a imagem. */
const EXPIRACAO_URL_SEGUNDOS = 60;

/**
 * Um cliente por processo, mesmo padrão de `src/lib/db/index.ts` — sem isto,
 * cada recarga do Next.js em desenvolvimento abriria um cliente novo.
 */
const cache = globalThis as unknown as {
  clienteStorage?: ReturnType<typeof createClient>;
};

const clienteStorage =
  cache.clienteStorage ??
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

if (process.env.NODE_ENV !== "production") cache.clienteStorage = clienteStorage;

/**
 * Gera a URL assinada do comprovante do frete, ou `null` se o frete ainda
 * não tem um. Lança se o frete não existe OU não pertence à empresa da
 * sessão — a mesma mensagem "Frete não encontrado", nunca dizendo qual dos
 * dois casos é (mesmo padrão de `marcarOrdemEnviada`/`marcarServicoFinalizado`
 * em `src/lib/servicos/servicos.ts`).
 */
export async function gerarUrlComprovante(
  empresaId: string,
  servicoId: string,
): Promise<string | null> {
  const servico = await buscarServico(empresaId, servicoId);
  if (!servico || servico.arquivado_em) throw new Error("Frete não encontrado.");
  if (!servico.comprovante_url) return null;

  // "Tipo de conteúdo fixo — nunca derivado do arquivo" (CLAUDE.md §4,
  // "Upload de imagem") é responsabilidade de QUEM GRAVA, não de quem lê: a
  // URL assinada serve o objeto com o `content-type` que está gravado nele,
  // e é o pipeline de upload (Tarefa 5) que grava sempre `image/jpeg`,
  // nunca o tipo que o navegador declarou. Nada aqui decide tipo de
  // conteúdo — só confere posse e assina.
  const { data, error } = await clienteStorage.storage
    .from(BALDE_COMPROVANTES)
    .createSignedUrl(servico.comprovante_url, EXPIRACAO_URL_SEGUNDOS);
  // `null`, nunca relança — achado do quinto passe do `/revisar`: esta
  // função entra no `Promise.all` do detalhe do frete (`page.tsx`); um
  // `throw` aqui derrubaria a tela INTEIRA (valor, cliente, todos os
  // campos) por causa só da miniatura do comprovante. Uma falha do storage
  // ao assinar vira "sem miniatura desta vez", não "sem tela" — mesmo
  // raciocínio já aplicado à gravação (`enviarComprovante`), agora também
  // na leitura. `error` continua sendo o objeto de erro do Supabase, nunca
  // dado do usuário — seguro para log de servidor (`CLAUDE.md` §4).
  if (error) {
    console.error("[comprovantes] falha ao assinar URL do storage", error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Upload do comprovante (item 5, Tarefa 5). Pipeline no servidor, nesta
 * ordem — cada passo é a defesa de uma frase específica do `CLAUDE.md` §4
 * ("Upload de imagem"):
 *
 * 1. Rejeita acima de 10 MB. O chamador (`src/app/api/fretes/[id]/
 *    comprovante/route.ts`) já rejeita pelo `Content-Length` do pedido,
 *    ANTES de chamar esta função — a conferência aqui, sobre o buffer já em
 *    memória, é a mesma regra vista de um segundo lugar, para
 *    `enviarComprovante` continuar segura mesmo chamada direto (como os
 *    testes fazem) sem passar pela rota.
 * 2. Sniff por conteúdo (`file-type`, sobre os bytes de verdade) — só aceita
 *    JPEG, PNG, WEBP, HEIC/HEIF (`CLAUDE.md` §4 — os dois últimos são o
 *    mesmo formato de contêiner, rótulos diferentes; decisão do fundador,
 *    25/08/2026). Qualquer outra coisa (SVG incluso, mesmo que a extensão
 *    diga `.jpg`) é recusada aqui, antes de qualquer decodificação —
 *    `file-type` não reconhece SVG (é texto/XML, não um formato binário com
 *    assinatura), então um SVG disfarçado cai neste `if` do mesmo jeito que
 *    um tipo desconhecido.
 * 3. HEIC/HEIF **nunca** passa pelo `sharp` para decodificar — vai por
 *    `libheif-js` (WASM), decodificado em duas etapas. **Medido nesta
 *    tarefa, não suposto**: o binário pré-compilado do `sharp` (o que a
 *    Vercel também usaria, mesmo pacote) NÃO decodifica HEIC de iPhone de
 *    verdade — o formato usa o codec HEVC, e o binário pré-compilado do
 *    `sharp` só vem com decodificação de AVIF (`libaom`), nunca com
 *    `libde265`/`x265` (a licença desses dois exige compilar o `libvips`
 *    global à parte). As DUAS etapas do `libheif-js` importam, nessa
 *    ordem — `decodificarHeic`, em `src/lib/utils/imagem.ts` (extraída
 *    nesta tarefa, item 10 Tarefa 2, quando a logo virou o segundo caso de
 *    uso do mesmo mecanismo):
 *    a. `decoder.decode(buffer)` só faz o parse do contêiner (dimensões,
 *       lista de imagens) — NÃO aloca os pixels ainda.
 *    b. `imagem.get_width()/get_height()` já estão disponíveis depois de
 *       (a) — é aqui que a dimensão é conferida contra
 *       `LIMITE_PIXELS_ENTRADA`, ANTES de `imagem.display(...)` (que é o
 *       passo que de fato aloca `largura×altura×4` bytes). Sem separar as
 *       duas etapas, um HEIC pequeno e malicioso (alta razão de compressão)
 *       decodificaria para gigabytes antes de qualquer limite ser
 *       conferido — exatamente o cenário que `limitInputPixels` do `sharp`
 *       resolve para os OUTROS formatos (item 4 abaixo), mas que não
 *       alcança HEIC porque o `sharp` nunca chega a abrir o arquivo
 *       original neste ramo.
 *    O resultado de `imagem.display(...)` já sai com a orientação do
 *    contêiner aplicada nos pixels — HEIC guarda rotação em propriedade do
 *    item (`irot`/`imir`), não em EXIF como o JPEG, e o `libheif` aplica
 *    por padrão ao decodificar. Os pixels crus (RGBA) alimentam o `sharp`
 *    direto (`raw`), sem reencodar em JPEG por uma biblioteca intermediária
 *    — só o `sharp`/`mozjpeg` grava o JPEG final, o mesmo caminho dos
 *    outros formatos a partir daqui.
 * 4. JPEG/PNG/WEBP abrem direto no `sharp`, com `limitInputPixels`
 *    configurado na própria instância — imagem pequena que expandisse para
 *    gigabytes na decodificação nunca chega a alocar tudo isso. (HEIC/HEIF
 *    já chegam aqui como pixels crus, já dentro do limite — item 3.)
 * 5. Só para JPEG/PNG/WEBP: `.rotate()` sem argumento aplica a rotação do
 *    EXIF de orientação NOS PIXELS antes de qualquer outra coisa — sem
 *    isto, o passo seguinte (que descarta o EXIF) deixaria fotos tiradas em
 *    retrato aparecendo de lado. (HEIC/HEIF não usam EXIF para orientação —
 *    item 3 já aplicou.) Depois, redimensiona (maior lado em 1600px,
 *    mantendo proporção, nunca aumenta) e recomprime em JPEG mirando
 *    ~300 KB: qualidade 80 primeiro; se o resultado passar do teto, um
 *    segundo passe em qualidade 50 (nunca mais baixo, para não ficar
 *    feio) — aceita o resultado desse segundo passe mesmo que ainda passe
 *    do teto, ele é o melhor que este piso permite. **Metadados EXIF somem
 *    neste passo por padrão** — o código nunca chama `.withMetadata()`,
 *    que é a única forma de o `sharp` preservar metadados na saída.
 * 6. Nome aleatório (`uuidv7`), grava no balde `comprovantes` com
 *    `contentType: "image/jpeg"` fixo — nunca derivado do arquivo que a
 *    pessoa mandou (`CLAUDE.md` §4: "tipo de conteúdo fixo — nunca
 *    derivado do arquivo"). **O objeto antigo, se o frete já tinha
 *    comprovante, NÃO é apagado ao trocar** — corrigido no segundo passe do
 *    `/revisar`: a primeira versão apagava, e isso violava `CLAUDE.md` §7
 *    ("Nada é apagado. Exclusão é `arquivado_em` preenchido") — a exceção
 *    do §7 só vale para o que "nunca chegou a existir de verdade" (uma
 *    `Empresa` sem `Usuario`), e um comprovante trocado já foi visto e
 *    usado pelo dono. Consequência: trocar comprovante acumula objeto órfão
 *    no balde — ver a lacuna de 2 GB abaixo, que cresce mais rápido por
 *    causa disso.
 * 7. `salvarCaminhoComprovante` (`src/lib/servicos/servicos.ts`) grava o
 *    CAMINHO no `Servico`, nunca uma URL — a URL assinada é gerada a cada
 *    leitura por `gerarUrlComprovante`, acima (mesma razão de "caminho não
 *    é autorização").
 *
 * A checagem de posse (`buscarServico`) roda ANTES de qualquer processamento
 * — mesmo padrão de `gerarUrlComprovante`: nunca gasta CPU decodificando
 * imagem para um frete que a empresa da sessão nem pode ver.
 *
 * **O que este pipeline NÃO faz, registrado como lacuna** (`CLAUDE.md` §14):
 * não soma o espaço já ocupado pela empresa contra o teto de 2 GB — cada
 * upload só é conferido contra o próprio tamanho. Trocar comprovante deixa
 * o objeto anterior no balde (item 6 acima, §7) — o espaço cresce a cada
 * troca, não só no primeiro comprovante de cada frete. Decisão do fundador,
 * 25/08/2026: não é urgente sem clientes pagantes — vira tarefa própria
 * antes de ligar anúncio, junto das outras pendências de lançamento.
 */

export const TAMANHO_MAXIMO_COMPROVANTE_BYTES = 10 * 1024 * 1024;

/**
 * Toda mensagem que `enviarComprovante` pode lançar e que é segura para
 * mostrar na tela — escrita por este produto, em português, revisada.
 * `src/app/api/fretes/[id]/comprovante/route.ts` confere contra esta lista
 * antes de repassar `erro.message` ao usuário; qualquer coisa fora dela
 * (o `sharp` estourando `limitInputPixels` em inglês, um erro do Prisma
 * mencionando "records", qualquer exceção que este arquivo não previu)
 * vira a mensagem genérica. Achado do quinto passe do `/revisar`: um
 * `catch` que decide "é `Error`? mostra a mensagem" (o padrão do resto do
 * produto, `erroDoServico` em `fretes/acoes.ts` etc.) funciona porque lá
 * TODA mensagem lançada é escrita à mão; aqui o pipeline passa por `sharp`
 * e pelo Prisma, que lançam as próprias frases — a lista fechada é o que
 * garante que só o que este arquivo escreveu chega à tela (`CLAUDE.md` §8,
 * "Vocabulário do usuário").
 */
export const MENSAGENS_SEGURAS_DE_COMPROVANTE = new Set([
  "Frete não encontrado.",
  "O arquivo passa de 10 MB.",
  "Envie uma foto em JPEG, PNG, WEBP ou HEIC.",
  "Imagem grande demais.",
  "Não deu para abrir a imagem.",
  "Não deu para enviar agora.",
]);

const LIMITES_COMPROVANTE = {
  ladoMaximoPx: 1600,
  alvoBytes: 300 * 1024,
  qualidadeInicial: 80,
  qualidadeMinima: 50,
};

/**
 * Casca fina sobre `reprocessarImagem` (`src/lib/utils/imagem.ts`, extraída
 * nesta tarefa) — só decide o alvo de saída e as mensagens de erro do
 * comprovante. Ver o item 3-5 do comentário de `enviarComprovante`, abaixo,
 * para o mecanismo (decodificação HEIC em duas etapas, `.rotate()` antes do
 * resize, EXIF removido por padrão).
 */
async function reprocessarComprovante(entrada: Buffer, mimeDetectado: string): Promise<Buffer> {
  return reprocessarImagem(entrada, mimeDetectado, LIMITES_COMPROVANTE, {
    tipoInvalido: "Envie uma foto em JPEG, PNG, WEBP ou HEIC.",
    imagemGrande: "Imagem grande demais.",
  });
}

/**
 * Envia o comprovante do frete. Lança se o frete não existe/não pertence à
 * empresa (mesma mensagem de `gerarUrlComprovante`), se o arquivo passa de
 * 10 MB, ou se o conteúdo não é um dos tipos aceitos.
 */
export async function enviarComprovante(
  empresaId: string,
  servicoId: string,
  arquivo: Buffer,
): Promise<void> {
  const servico = await buscarServico(empresaId, servicoId);
  if (!servico || servico.arquivado_em) throw new Error("Frete não encontrado.");

  if (arquivo.byteLength > TAMANHO_MAXIMO_COMPROVANTE_BYTES) {
    throw new Error("O arquivo passa de 10 MB.");
  }

  const tipo = await fileTypeFromBuffer(arquivo);
  if (!tipo || !TIPOS_PERMITIDOS_IMAGEM.has(tipo.mime)) {
    throw new Error("Envie uma foto em JPEG, PNG, WEBP ou HEIC.");
  }

  const processada = await reprocessarComprovante(arquivo, tipo.mime);

  const caminho = `${empresaId}/${uuidv7()}.jpg`;
  const { error } = await clienteStorage.storage
    .from(BALDE_COMPROVANTES)
    .upload(caminho, processada, { contentType: "image/jpeg" });
  // Nunca relança o erro do Supabase — achado do `/revisar`: a versão
  // anterior fazia `throw error`, e esse texto (de terceiro, em inglês,
  // nunca revisado) chegava cru até o `AvisoDoSistema` da tela
  // (`CLAUDE.md` §8, "Vocabulário do usuário"). Registrado no log do
  // servidor, nunca em log de dado pessoal (`CLAUDE.md` §4) — é erro de
  // infraestrutura, não conteúdo do arquivo.
  if (error) {
    console.error("[comprovantes] falha ao gravar no storage", error.message);
    throw new Error("Não deu para enviar agora.");
  }

  // O caminho anterior, se havia um, fica no balde — nunca apagado (§7,
  // "Nada é apagado"). Ver o item 6 do comentário acima e a lacuna de 2 GB.
  await salvarCaminhoComprovante(empresaId, servicoId, caminho);
}
