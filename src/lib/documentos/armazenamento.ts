import "server-only";
import { createClient } from "@supabase/supabase-js";
import { uuidv7 } from "uuidv7";

/**
 * Upload do PDF gerado ao balde `relatorios` — mesmo padrão de
 * `src/lib/servicos/comprovantes.ts` (item 5): nome de arquivo aleatório,
 * fora de pasta pública, balde privado (migration
 * `20260828070000_balde_relatorios_storage`).
 *
 * **Mais simples que `comprovantes.ts` de propósito.** Lá o arquivo vem do
 * usuário — precisa validar conteúdo, reprocessar, recomprimir (`CLAUDE.md`
 * §4, "Upload de imagem"). Aqui o PDF é gerado por este próprio produto
 * (`gerador.ts`), nunca por upload de terceiro — não há conteúdo hostil a
 * filtrar, só um arquivo a guardar.
 *
 * **Sem checagem de posse aqui** — decisão de desenho, não descuido, mas sem
 * cadeia de proteção para provar ainda: esta função só grava em
 * `{empresaId}/{uuid}.pdf`, sem referenciar nenhuma linha do banco — não há
 * "posse de quê" para conferir, mesma natureza de qualquer `db(empresaId)`
 * do resto do produto. A garantia real é inteiramente do lado de quem
 * chama: `empresaId` precisa vir sempre da sessão autenticada, nunca de
 * entrada externa. Hoje (Tarefa 2) **nenhum chamador existe ainda** — quem
 * escrever a Tarefa 4 (`gerarRelatorio`) é responsável por passar o
 * `empresaId` certo, com o mesmo cuidado que `criarRelatorio` já tem para
 * `cliente_id`/`servico_id` (`CLAUDE.md` §3) — não é uma garantia que já
 * está encadeada, é um requisito para quem encadear.
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
      "gravar/ler o balde de relatórios.",
  );
}

const BALDE_RELATORIOS = "relatorios";

/** Um cliente por processo — mesmo padrão de `comprovantes.ts`/`src/lib/db/index.ts`. */
const cache = globalThis as unknown as {
  clienteStorageRelatorios?: ReturnType<typeof createClient>;
};

const clienteStorage =
  cache.clienteStorageRelatorios ??
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

if (process.env.NODE_ENV !== "production") cache.clienteStorageRelatorios = clienteStorage;

/**
 * Grava o PDF no balde e devolve o CAMINHO (nunca uma URL) — mesma razão de
 * `Servico.comprovante_url`: a URL assinada é gerada a cada leitura, não
 * guardada. Quem chama grava o caminho devolvido em `Relatorio.pdf_url`
 * (Tarefa 4).
 */
export async function enviarRelatorioAoStorage(empresaId: string, pdf: Buffer): Promise<string> {
  const caminho = `${empresaId}/${uuidv7()}.pdf`;
  const { error } = await clienteStorage.storage
    .from(BALDE_RELATORIOS)
    .upload(caminho, pdf, { contentType: "application/pdf" });
  // Nunca relança o erro do Supabase — mesmo motivo de `comprovantes.ts`:
  // texto de terceiro, em inglês, nunca revisado, não pode chegar cru à tela
  // (`CLAUDE.md` §8, "Vocabulário do usuário").
  if (error) {
    console.error("[documentos] falha ao gravar relatório no storage", error.message);
    throw new Error("Não deu para gerar o relatório agora.");
  }
  return caminho;
}
