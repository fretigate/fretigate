import { describe, expect, it } from "vitest";
import { linkWhatsapp, normalizarTelefone } from "@/lib/utils/telefone";

/**
 * `normalizarTelefone`/`linkWhatsapp` — função pura, sem banco (item 5,
 * Tarefa 1). Cobre as bordas da regra escrita em `docs/componentes.md` §12:
 * 10 ou 11 dígitos com DDD, DDD ≥ 11.
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 15;

describe("normalizarTelefone", () => {
  it("9 dígitos → faltam dígitos", () => {
    const resultado = normalizarTelefone("889912345");
    expect(resultado).toEqual({ ok: false, erro: "Faltam dígitos. Com DDD são 10 ou 11." });
    conferencias++;
  });

  it("10 dígitos, DDD válido → ok", () => {
    const resultado = normalizarTelefone("8832211234");
    expect(resultado).toEqual({ ok: true, digitos: "8832211234" });
    conferencias++;
  });

  it("11 dígitos, DDD válido → ok", () => {
    const resultado = normalizarTelefone("88991234567");
    expect(resultado).toEqual({ ok: true, digitos: "88991234567" });
    conferencias++;
  });

  it("12 dígitos → número comprido demais", () => {
    const resultado = normalizarTelefone("889912345678");
    expect(resultado).toEqual({ ok: false, erro: "Número comprido demais…" });
    conferencias++;
  });

  it("DDD 10 (menor que 11) → esse DDD não existe", () => {
    const resultado = normalizarTelefone("1032211234");
    expect(resultado).toEqual({ ok: false, erro: "Esse DDD não existe." });
    conferencias++;
  });

  it("DDD 00 → esse DDD não existe", () => {
    const resultado = normalizarTelefone("0032211234");
    expect(resultado).toEqual({ ok: false, erro: "Esse DDD não existe." });
    conferencias++;
  });

  it("string vazia → faltam dígitos, não erro de outro tipo", () => {
    const resultado = normalizarTelefone("");
    expect(resultado).toEqual({ ok: false, erro: "Faltam dígitos. Com DDD são 10 ou 11." });
    conferencias++;
  });

  it("string com letras, sem dígito nenhum → faltam dígitos", () => {
    const resultado = normalizarTelefone("abc-defg");
    expect(resultado).toEqual({ ok: false, erro: "Faltam dígitos. Com DDD são 10 ou 11." });
    conferencias++;
  });

  /**
   * O que já está salvo hoje é texto livre (`docs/especificacao.md` §9) —
   * pode ter parênteses, traço, espaço. A normalização precisa lidar com
   * isso, não só com o que vai passar a ser digitado daqui pra frente.
   */
  it("texto livre com pontuação (formato salvo hoje) → mesmos dígitos, válido", () => {
    const resultado = normalizarTelefone("(88) 99123-4567");
    expect(resultado).toEqual({ ok: true, digitos: "88991234567" });
    conferencias++;
  });

  it("texto livre com pontuação e DDD inválido → mesma mensagem de erro", () => {
    const resultado = normalizarTelefone("(10) 3221-1234");
    expect(resultado).toEqual({ ok: false, erro: "Esse DDD não existe." });
    conferencias++;
  });

  it("espaços e traços misturados, 11 dígitos → válido", () => {
    const resultado = normalizarTelefone("88 9 9123-4567");
    expect(resultado).toEqual({ ok: true, digitos: "88991234567" });
    conferencias++;
  });
});

describe("linkWhatsapp", () => {
  it("sem texto → só o link, DDI 55 fixo", () => {
    expect(linkWhatsapp("88991234567")).toBe("https://wa.me/5588991234567");
    conferencias++;
  });

  it("com texto → acrescenta ?text= codificado", () => {
    expect(linkWhatsapp("88991234567", "Olá! Tudo bem?")).toBe(
      "https://wa.me/5588991234567?text=Ol%C3%A1!%20Tudo%20bem%3F",
    );
    conferencias++;
  });

  it("texto vazio → tratado como sem texto (nunca '?text=' vazio)", () => {
    expect(linkWhatsapp("88991234567", "")).toBe("https://wa.me/5588991234567");
    conferencias++;
  });

  it("dígitos de 10 posições (sem o 9) → mesmo formato de link", () => {
    expect(linkWhatsapp("8832211234")).toBe("https://wa.me/558832211234");
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
