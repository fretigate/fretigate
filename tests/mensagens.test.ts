import { describe, expect, it } from "vitest";
import {
  montarMensagemCobranca,
  montarMensagemOrdem,
  type DadosMensagemCobranca,
  type DadosMensagemOrdem,
} from "@/lib/servicos/mensagens";

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

/**
 * `montarMensagemCobranca` — função pura (item 6, Tarefa 5). O molde
 * aprovado pelo fundador (`docs/planos/item-6-titulo-e-cobrancas.md`,
 * decisão 1): empresa sozinha na primeira linha, saudação, a rota (quando
 * existir), valor e vencimento juntos, o bloco do Pix (só quando a empresa
 * tem chave cadastrada) e a frase final, sempre presente.
 */
let conferenciasCobranca = 0;
const CONFERENCIAS_ESPERADAS_COBRANCA = 9;

const BASE_COBRANCA: DadosMensagemCobranca = {
  empresa: "Transportes Silva",
  cliente: "Frigorífico São Luiz",
  rota: "Fortaleza → Sobral",
  periodo: null,
  valor: "2.400,00",
  vencimento: "sexta, 5 de setembro",
  vencido: false,
  pix: "12.345.678/0001-90",
};

describe("montarMensagemCobranca", () => {
  it("caso cheio — o exemplo do plano, com Pix e rota (verificação obrigatória da Tarefa 5)", () => {
    const resultado = montarMensagemCobranca(BASE_COBRANCA);
    expect(resultado).toBe(
      [
        "Transportes Silva",
        "Oi, Frigorífico São Luiz. Tudo bem?",
        "Passando pra lembrar do frete Fortaleza → Sobral.",
        "Valor: R$ 2.400,00\nVencimento: sexta, 5 de setembro",
        "Pix: 12.345.678/0001-90",
        "Se já tiver pago, pode desconsiderar. Obrigado!",
      ].join("\n\n"),
    );
    conferenciasCobranca++;
  });

  it("sem Pix — o bloco inteiro some, nunca 'Pix: —' nem linha vazia", () => {
    const resultado = montarMensagemCobranca({ ...BASE_COBRANCA, pix: null });
    expect(resultado).not.toContain("Pix");
    expect(resultado).not.toContain("—");
    expect(resultado.includes("\n\n\n")).toBe(false);
    conferenciasCobranca++;
  });

  it("sem rota — a frase perde só o trecho da rota, continua fazendo sentido", () => {
    const resultado = montarMensagemCobranca({ ...BASE_COBRANCA, rota: null });
    expect(resultado).toContain("Passando pra lembrar do frete.");
    expect(resultado).not.toContain("frete ");
    conferenciasCobranca++;
  });

  it("vencido — só a linha do vencimento muda, 'Venceu' no lugar de 'Vencimento:'", () => {
    const resultado = montarMensagemCobranca({ ...BASE_COBRANCA, vencido: true });
    expect(resultado).toContain("Venceu sexta, 5 de setembro");
    expect(resultado).not.toContain("Vencimento:");
    // O resto do texto não muda — mesma frase final, mesma saudação.
    expect(resultado).toContain("Se já tiver pago, pode desconsiderar. Obrigado!");
    expect(resultado).toContain("Oi, Frigorífico São Luiz. Tudo bem?");
    conferenciasCobranca++;
  });

  it("a vencer — 'Vencimento:' aparece normalmente, nunca 'Venceu'", () => {
    const resultado = montarMensagemCobranca({ ...BASE_COBRANCA, vencido: false });
    expect(resultado).toContain("Vencimento: sexta, 5 de setembro");
    expect(resultado).not.toContain("Venceu");
    conferenciasCobranca++;
  });

  it("a frase final é sempre a mesma, sempre presente, com ou sem Pix/rota", () => {
    const minimo = montarMensagemCobranca({ ...BASE_COBRANCA, rota: null, pix: null });
    expect(minimo).toContain("Se já tiver pago, pode desconsiderar. Obrigado!");
    conferenciasCobranca++;
  });

  it("empresa sozinha na primeira linha, sem nada antes", () => {
    const resultado = montarMensagemCobranca(BASE_COBRANCA);
    expect(resultado.startsWith("Transportes Silva\n\n")).toBe(true);
    conferenciasCobranca++;
  });

  it("com período (item 7, relatório de vários fretes) — a frase vira 'dos fretes de {periodo}', nunca conta quantos", () => {
    const resultado = montarMensagemCobranca({ ...BASE_COBRANCA, periodo: "agosto" });
    expect(resultado).toContain("Passando pra lembrar dos fretes de agosto.");
    expect(resultado).not.toMatch(/\d+ fretes/);
    conferenciasCobranca++;
  });

  it("período presente vence a rota — nunca 'do frete {rota}' quando periodo está preenchido", () => {
    const resultado = montarMensagemCobranca({ ...BASE_COBRANCA, periodo: "20/08 a 10/09" });
    expect(resultado).toContain("Passando pra lembrar dos fretes de 20/08 a 10/09.");
    expect(resultado).not.toContain("Fortaleza → Sobral");
    conferenciasCobranca++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
    expect(conferenciasCobranca).toBe(CONFERENCIAS_ESPERADAS_COBRANCA);
  });
});
