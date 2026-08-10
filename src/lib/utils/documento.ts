import { cpf, cnpj } from "cpf-cnpj-validator";

/**
 * CPF ou CNPJ de `Cliente`/`Motorista` — normaliza, identifica o tipo e
 * valida o dígito verificador.
 *
 * Mesma regra de formato de `Empresa.cnpj` (`docs/especificacao.md`,
 * entidade Cliente): guardado só com letra e número, maiúsculo, sem
 * pontuação — CNPJ podendo trazer letra nas 12 primeiras posições (formato
 * alfanumérico da Receita, Nota Técnica RFB 49/2024) e CPF sempre 11
 * dígitos numéricos.
 *
 * `cpf-cnpj-validator` já sabe validar as duas formas de CNPJ — o dígito
 * verificador usa `charCodeAt - 48`, que funciona igual para dígito e para
 * letra A-Z.
 */

export type TipoDocumento = "cpf" | "cnpj";

/**
 * Remove máscara e normaliza para o formato guardado no banco.
 *
 * Usa a normalização "loose" do CNPJ (maiúsculo, só `[0-9A-Z]`) para os dois
 * tipos — para CPF isso dá o mesmo resultado que a normalização própria dele,
 * porque CPF nunca tem letra. Uma função só para os dois evita decidir o
 * tipo ANTES de saber se o texto é válido.
 */
export function normalizarDocumento(bruto: string): string {
  return cnpj.strip(bruto);
}

/** CPF tem 11 posições; CNPJ, 14. Qualquer outro tamanho não é nenhum dos dois. */
export function tipoDocumento(documentoNormalizado: string): TipoDocumento | null {
  if (documentoNormalizado.length === 11) return "cpf";
  if (documentoNormalizado.length === 14) return "cnpj";
  return null;
}

/**
 * Normaliza e confere o dígito verificador.
 *
 * Recebe o texto **bruto**, como a pessoa digitou (com ou sem máscara) — a
 * normalização é parte da validação, não um passo à parte que quem chama
 * precisa lembrar de fazer antes.
 */
export function documentoValido(bruto: string): boolean {
  const normalizado = normalizarDocumento(bruto);
  const tipo = tipoDocumento(normalizado);
  if (tipo === "cpf") return cpf.isValid(normalizado);
  if (tipo === "cnpj") return cnpj.isValid(normalizado);
  return false;
}
