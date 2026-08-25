import "server-only";
import { createClient } from "@supabase/supabase-js";
import { buscarServico } from "./servicos";

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
  if (error) throw error;
  return data.signedUrl;
}
