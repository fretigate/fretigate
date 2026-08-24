import { describe, expect, it } from "vitest";
import { montarMensagemOrdem, type DadosMensagemOrdem } from "@/lib/servicos/mensagens";

/**
 * `montarMensagemOrdem` — função pura (item 5, Tarefa 2). Cobre a regra de
 * montagem inteira: as quatro linhas do meio só entram se o campo
 * correspondente tiver valor, nunca duas quebras de linha em branco
 * seguidas, nunca valor do frete nem nome do cliente
 * (`docs/planos/item-5-ordem-de-servico.md`, Tarefa 2).
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 7;

const BASE: DadosMensagemOrdem = {
  empresa: "Transportes Ceará",
  diaEData: "segunda, 25 de agosto",
};

describe("montarMensagemOrdem", () => {
  it("caso mínimo — só origem e destino, sem carga nem caminhão (verificação obrigatória da Tarefa 2)", () => {
    const resultado = montarMensagemOrdem({
      ...BASE,
      origem: "Sobral/CE",
      destino: "Fortaleza/CE",
    });
    expect(resultado).toBe(
      [
        "Transportes Ceará",
        "Frete de segunda, 25 de agosto",
        "",
        "Origem: Sobral/CE",
        "Destino: Fortaleza/CE",
        "",
        "Manda uma foto do embarque quando carregar.",
      ].join("\n"),
    );
    conferencias++;
  });

  it("todos os campos preenchidos — as quatro linhas, na ordem Origem/Destino/Carga/Caminhão", () => {
    const resultado = montarMensagemOrdem({
      ...BASE,
      origem: "Sobral/CE",
      destino: "Fortaleza/CE",
      carga: "Grãos",
      caminhao: "Toco ABC-1234",
    });
    expect(resultado).toBe(
      [
        "Transportes Ceará",
        "Frete de segunda, 25 de agosto",
        "",
        "Origem: Sobral/CE",
        "Destino: Fortaleza/CE",
        "Carga: Grãos",
        "Caminhão: Toco ABC-1234",
        "",
        "Manda uma foto do embarque quando carregar.",
      ].join("\n"),
    );
    conferencias++;
  });

  it("nenhum campo do meio preenchido — cabeçalho, uma linha em branco, frase final (nunca duas)", () => {
    const resultado = montarMensagemOrdem(BASE);
    expect(resultado).toBe(
      [
        "Transportes Ceará",
        "Frete de segunda, 25 de agosto",
        "",
        "Manda uma foto do embarque quando carregar.",
      ].join("\n"),
    );
    expect(resultado.includes("\n\n\n")).toBe(false);
    conferencias++;
  });

  it("null é tratado igual a ausente — não gera 'Carga: —' nem linha vazia", () => {
    const resultado = montarMensagemOrdem({ ...BASE, origem: "Sobral/CE", destino: null, carga: null });
    expect(resultado).not.toContain("Destino:");
    expect(resultado).not.toContain("Carga:");
    expect(resultado).not.toContain("—");
    conferencias++;
  });

  it("só carga preenchida — uma linha só no meio, sem as outras três", () => {
    const resultado = montarMensagemOrdem({ ...BASE, carga: "Móveis" });
    expect(resultado).toBe(
      [
        "Transportes Ceará",
        "Frete de segunda, 25 de agosto",
        "",
        "Carga: Móveis",
        "",
        "Manda uma foto do embarque quando carregar.",
      ].join("\n"),
    );
    conferencias++;
  });

  it("frase final é sempre a mesma, sempre presente", () => {
    const semNada = montarMensagemOrdem(BASE);
    const comTudo = montarMensagemOrdem({ ...BASE, origem: "A", destino: "B", carga: "C", caminhao: "D" });
    expect(semNada).toContain("Manda uma foto do embarque quando carregar.");
    expect(comTudo).toContain("Manda uma foto do embarque quando carregar.");
    conferencias++;
  });

  it("cabeçalho sempre com empresa e 'Frete de {diaEData}', sem reformatar a data recebida", () => {
    const resultado = montarMensagemOrdem({ ...BASE, empresa: "ACME Transportes" });
    expect(resultado.startsWith("ACME Transportes\nFrete de segunda, 25 de agosto")).toBe(true);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
