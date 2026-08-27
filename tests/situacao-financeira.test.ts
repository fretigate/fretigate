import { describe, expect, it } from "vitest";
import { situacaoFinanceira, type TituloParaSituacao } from "@/lib/servicos/titulos";

/**
 * situacaoFinanceira (Tarefa 1 do item 4) — função pura, sem banco:
 * `docs/especificacao.md` §7. Testada isoladamente, sem montar cenário no
 * Postgres — é lógica pura, testar direto é mais barato e mais preciso
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 1).
 *
 * A ordem de avaliação é o ponto crítico (achado do `/revisar`,
 * 20/08/2026): "algum dinheiro entrou" precisa ser checado antes de "existe
 * título não pago", senão "parcial" nunca é alcançado — um teste que só
 * exercitasse A faturar e Quitado passaria em verde com a ordem errada.
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 11;

function titulo(parcial: Partial<TituloParaSituacao>): TituloParaSituacao {
  return { status: "aberto", totalRecebido: 0, arquivado_em: null, ...parcial };
}

describe("os quatro estados são todos alcançáveis", () => {
  it("nenhum título → a_faturar", () => {
    expect(situacaoFinanceira([])).toBe("a_faturar");
    conferencias++;
  });

  it("um título pago → quitado", () => {
    expect(situacaoFinanceira([titulo({ status: "pago", totalRecebido: 1000 })])).toBe(
      "quitado",
    );
    conferencias++;
  });

  it("dois títulos, os dois pagos → quitado", () => {
    expect(
      situacaoFinanceira([
        titulo({ status: "pago", totalRecebido: 500 }),
        titulo({ status: "pago", totalRecebido: 500 }),
      ]),
    ).toBe("quitado");
    conferencias++;
  });

  it("recebimento parcial num único título (aberto, com totalRecebido > 0) → parcial", () => {
    expect(situacaoFinanceira([titulo({ status: "aberto", totalRecebido: 300 })])).toBe(
      "parcial",
    );
    conferencias++;
  });

  it("adiantamento pago + saldo em aberto (dois títulos) → parcial", () => {
    // O segundo caminho para Parcial, distinto do de cima: aqui nenhum
    // título isolado tem recebimento parcial — é a COMBINAÇÃO de um pago e
    // um aberto que soma "algum dinheiro entrou, ainda falta pagar".
    expect(
      situacaoFinanceira([
        titulo({ status: "pago", totalRecebido: 500 }),
        titulo({ status: "aberto", totalRecebido: 0 }),
      ]),
    ).toBe("parcial");
    conferencias++;
  });

  it("título aberto sem nada recebido → faturado", () => {
    expect(situacaoFinanceira([titulo({ status: "aberto", totalRecebido: 0 })])).toBe(
      "faturado",
    );
    conferencias++;
  });

  it("título aberto com totalRecebido zero → faturado (zero não é dinheiro que entrou)", () => {
    expect(situacaoFinanceira([titulo({ status: "aberto", totalRecebido: 0 })])).toBe(
      "faturado",
    );
    conferencias++;
  });
});

describe("título cancelado conta como se não existisse", () => {
  it("um título cancelado, sozinho → a_faturar (mesmo raciocínio de arquivado)", () => {
    expect(situacaoFinanceira([titulo({ status: "cancelado", totalRecebido: 1000 })])).toBe(
      "a_faturar",
    );
    conferencias++;
  });

  it("todos os títulos cancelados → volta a a_faturar", () => {
    expect(
      situacaoFinanceira([
        titulo({ status: "cancelado" }),
        titulo({ status: "cancelado", totalRecebido: 500 }),
      ]),
    ).toBe("a_faturar");
    conferencias++;
  });

  it("um cancelado + um pago → quitado (o cancelado não pesa em nada)", () => {
    expect(
      situacaoFinanceira([
        titulo({ status: "cancelado", totalRecebido: 1000 }),
        titulo({ status: "pago", totalRecebido: 500 }),
      ]),
    ).toBe("quitado");
    conferencias++;
  });
});

describe("título arquivado também não conta — mesma regra de título ativo", () => {
  it("um título pago, porém arquivado, sozinho → a_faturar", () => {
    expect(
      situacaoFinanceira([
        titulo({ status: "pago", totalRecebido: 1000, arquivado_em: new Date() }),
      ]),
    ).toBe("a_faturar");
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    // CLAUDE.md §3, item 4: não basta nenhuma ter falhado. Se uma exceção
    // pulou verificações, o número não bate e o arquivo reprova.
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
