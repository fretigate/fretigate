import { describe, expect, it } from "vitest";
import { calcularTotaisDoRelatorio } from "@/lib/utils/totais-relatorio";
import type { ServicoParaRelatorio } from "@/lib/servicos/relatorios";

/**
 * `calcularTotaisDoRelatorio` (item 7, Tarefa 3, segundo commit) — os dois
 * totais da tela de montagem. Pura, sem banco. `docs/planos/
 * item-7-relatorio.md`, "somar é diferente de cobrar": rigor total
 * (`CLAUDE.md` §2) — dinheiro.
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 9;

function servico(sobrescreve: Partial<ServicoParaRelatorio> = {}): ServicoParaRelatorio {
  return {
    id: crypto.randomUUID(),
    dataServico: new Date("2026-08-05T12:00:00.000Z"),
    origemTexto: "Fortaleza",
    destinoTexto: "Sobral",
    cargaTexto: "Grãos",
    valor: 10000,
    statusOperacional: "finalizado",
    ...sobrescreve,
  };
}

describe("calcularTotaisDoRelatorio", () => {
  it("soma só os marcados, ignora os desmarcados", () => {
    const a = servico({ valor: 10000 });
    const b = servico({ valor: 20000 });
    const resultado = calcularTotaisDoRelatorio([a, b], new Set([a.id]), false);
    expect(resultado.totalDocumento).toBe(10000);
    conferencias++;
  });

  it("sem em_andamento marcado, os dois totais são iguais — nunca divergem", () => {
    const a = servico({ valor: 10000, statusOperacional: "finalizado" });
    const resultado = calcularTotaisDoRelatorio([a], new Set([a.id]), true);
    expect(resultado.totalDocumento).toBe(10000);
    conferencias++;
    expect(resultado.totalCobravel).toBe(10000);
    conferencias++;
    expect(resultado.divergem).toBe(false);
    conferencias++;
  });

  it("em_andamento soma no documento, mas nunca no cobrável — diverge só com cobrança ativa", () => {
    const finalizado = servico({ valor: 10000, statusOperacional: "finalizado" });
    const emAndamento = servico({ valor: 20000, statusOperacional: "em_andamento" });
    const marcados = new Set([finalizado.id, emAndamento.id]);

    const semCobranca = calcularTotaisDoRelatorio([finalizado, emAndamento], marcados, false);
    expect(semCobranca.totalDocumento).toBe(30000);
    conferencias++;
    // Sem "Gerar cobrança" ativo, a divergência não é exibida — não existe
    // "cobrável" para comparar ainda.
    expect(semCobranca.divergem).toBe(false);
    conferencias++;

    const comCobranca = calcularTotaisDoRelatorio([finalizado, emAndamento], marcados, true);
    expect(comCobranca.totalDocumento).toBe(30000);
    conferencias++;
    expect(comCobranca.totalCobravel).toBe(10000);
    conferencias++;
    expect(comCobranca.divergem).toBe(true);
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
