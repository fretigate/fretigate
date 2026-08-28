import { randomUUID } from "node:crypto";
import { describe, expect, it, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { enviarRelatorioAoStorage } from "@/lib/documentos/armazenamento";

/**
 * O upload do PDF ao balde `relatorios` (item 7, Tarefa 2 —
 * `docs/planos/item-7-relatorio.md`, migration
 * `20260828070000_balde_relatorios_storage`).
 *
 * **Não fica em `tests/isolamento/`** — diferente de `comprovantes.ts`,
 * `enviarRelatorioAoStorage` não confere posse: ela só grava em
 * `{empresaId}/{uuid}.pdf`, sem referenciar nenhuma linha do banco — não há
 * "posse de quê" para checar aqui, mesma natureza de qualquer `db(empresaId)`
 * do resto do produto (ver o comentário de `src/lib/documentos/
 * armazenamento.ts`, corrigido no primeiro `/revisar` desta tarefa: hoje
 * **nenhum chamador existe ainda**, então não há garantia de contexto
 * autenticado encadeada para medir — só o encanamento do upload em si). A
 * política de RLS que protege o balde (table-wide, não por balde) já está
 * medida em `tests/isolamento/storage.test.ts`.
 */

const clienteStorage = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const empresaDeTeste = randomUUID();
const caminhosGravados: string[] = [];

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 4;

afterAll(async () => {
  if (caminhosGravados.length) {
    await clienteStorage.storage.from("relatorios").remove(caminhosGravados);
  }
});

describe("enviarRelatorioAoStorage", () => {
  it("grava no balde `relatorios`, sob o prefixo da empresa, com nome aleatório e extensão .pdf", async () => {
    const pdfFalso = Buffer.from("%PDF-1.7 conteúdo de teste, não é um PDF real de verdade");
    const caminho = await enviarRelatorioAoStorage(empresaDeTeste, pdfFalso);
    caminhosGravados.push(caminho);

    expect(caminho).toMatch(new RegExp(`^${empresaDeTeste}/.+\\.pdf$`));
    conferencias++;
  });

  it("o conteúdo gravado é exatamente o que foi enviado, com content-type application/pdf", async () => {
    const pdfFalso = Buffer.from("%PDF-1.7 outro conteúdo de teste");
    const caminho = await enviarRelatorioAoStorage(empresaDeTeste, pdfFalso);
    caminhosGravados.push(caminho);

    const { data, error } = await clienteStorage.storage.from("relatorios").download(caminho);
    expect(error).toBeNull();
    conferencias++;

    const baixado = Buffer.from(await data!.arrayBuffer());
    expect(baixado.equals(pdfFalso)).toBe(true);
    conferencias++;

    const { data: infoObjeto } = await clienteStorage.storage
      .from("relatorios")
      .list(empresaDeTeste, { search: caminho.split("/")[1] });
    expect(infoObjeto?.[0]?.metadata?.mimetype).toBe("application/pdf");
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
