import { db } from "@/lib/db";

/**
 * Empresa — escrita pontual de campo próprio (item 6, Tarefa 5, primeiro
 * escritor: `chave_pix`). Não existe "editarEmpresa" genérico ainda — a tela
 * que editaria o resto da Conta da empresa é o item 10; até lá, o campo
 * ganha a própria função, mesmo padrão de `salvarTelefoneClienteAction`/
 * `salvarTelefoneMotoristaAction` (um campo, uma função, sem esperar o
 * formulário inteiro existir).
 */

/**
 * "Falta a chave Pix da sua empresa" (`docs/componentes.md` §12) — grava a
 * chave ao confirmar a folha. Texto livre, sem validação de formato: chave
 * Pix pode ser CPF, CNPJ, e-mail, telefone ou aleatória — recusar uma válida
 * é pior que aceitar uma torta (`docs/planos/item-6-titulo-e-cobrancas.md`,
 * Tarefa 5).
 */
export async function salvarChavePix(empresaId: string, chavePix: string): Promise<void> {
  await db(empresaId).empresa.update({
    where: { id: empresaId },
    data: { chave_pix: chavePix },
  });
}
