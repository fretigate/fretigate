import { describe, expect, it } from "vitest";
import { resolverPeriodoDaUrl, resolverLimiteDaLista, rotuloDoPeriodo } from "@/lib/utils/periodo";
import { diaEmFortaleza, instanteDoDiaEmFortaleza, deslocarMes } from "@/lib/utils/data-fortaleza";

/**
 * Filtro de Período da lista "Meus fretes" (item 4, Tarefa 2) — função pura,
 * sem banco. Todo instante calculado em cima de `diaEmFortaleza(new
 * Date())`, então os testes recalculam a mesma referência em vez de
 * cravar uma data fixa (o "hoje" de quem roda o teste nunca é o mesmo dia
 * duas vezes).
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 21;

describe("resolverPeriodoDaUrl", () => {
  it("sem janela nenhuma → sem filtro (null)", () => {
    expect(resolverPeriodoDaUrl(undefined, undefined, undefined)).toBeNull();
    conferencias++;
  });

  it("todos → sem filtro (null), mesmo sendo escolha explícita", () => {
    expect(resolverPeriodoDaUrl("todos", undefined, undefined)).toBeNull();
    conferencias++;
  });

  it("mes-atual → do primeiro ao último instante do mês corrente, em Fortaleza", () => {
    const hoje = diaEmFortaleza(new Date());
    const primeiroDiaDoMes = `${hoje.slice(0, 7)}-01`;
    const primeiroDiaMesSeguinte = deslocarMes(primeiroDiaDoMes, 1);

    const periodo = resolverPeriodoDaUrl("mes-atual", undefined, undefined);
    expect(periodo).not.toBeNull();
    expect(periodo!.inicio.getTime()).toBe(instanteDoDiaEmFortaleza(primeiroDiaDoMes).getTime());
    expect(periodo!.fim.getTime()).toBe(
      instanteDoDiaEmFortaleza(primeiroDiaMesSeguinte).getTime() - 1,
    );
    conferencias++;
  });

  it("mes-passado → do primeiro ao último instante do mês anterior", () => {
    const hoje = diaEmFortaleza(new Date());
    const primeiroDiaDoMesAtual = `${hoje.slice(0, 7)}-01`;
    const primeiroDiaDoMesPassado = deslocarMes(primeiroDiaDoMesAtual, -1);

    const periodo = resolverPeriodoDaUrl("mes-passado", undefined, undefined);
    expect(periodo).not.toBeNull();
    expect(periodo!.inicio.getTime()).toBe(
      instanteDoDiaEmFortaleza(primeiroDiaDoMesPassado).getTime(),
    );
    expect(periodo!.fim.getTime()).toBe(
      instanteDoDiaEmFortaleza(primeiroDiaDoMesAtual).getTime() - 1,
    );
    conferencias++;
  });

  it("personalizado com de/ate → intervalo inclusive dos dois dias", () => {
    const periodo = resolverPeriodoDaUrl("personalizado", "2026-01-10", "2026-01-15");
    expect(periodo).not.toBeNull();
    expect(periodo!.inicio.getTime()).toBe(instanteDoDiaEmFortaleza("2026-01-10").getTime());
    // Inclusive do dia 15 inteiro — fim é o instante antes do dia 16 começar.
    expect(periodo!.fim.getTime()).toBe(instanteDoDiaEmFortaleza("2026-01-16").getTime() - 1);
    conferencias++;
  });

  it("personalizado sem de/ate → sem filtro (null)", () => {
    expect(resolverPeriodoDaUrl("personalizado", undefined, undefined)).toBeNull();
    conferencias++;
  });

  it("valor desconhecido de janela → sem filtro (null), mesmo comportamento do padrão", () => {
    expect(resolverPeriodoDaUrl("qualquer-coisa", undefined, undefined)).toBeNull();
    conferencias++;
  });

  /**
   * Achado do segundo `/revisar`: `de`/`ate` chegam da URL como texto
   * arbitrário. Sem validar o formato, `new Date("qualquer-coisa")` (dentro
   * de `instanteDoDiaEmFortaleza`) produz `Invalid Date` — e um `Periodo`
   * com `Invalid Date` ainda é não-nulo, o que faz `resolverLimiteDaLista`
   * tirar o teto de 50 mesmo sem período de verdade.
   */
  it("personalizado com de/ate em formato inválido → sem filtro (null), não Invalid Date", () => {
    expect(resolverPeriodoDaUrl("personalizado", "10/01/2026", "15/01/2026")).toBeNull();
    expect(resolverPeriodoDaUrl("personalizado", "qualquer-coisa", "2026-01-15")).toBeNull();
    expect(resolverPeriodoDaUrl("personalizado", "2026-01-10", "outra-coisa")).toBeNull();
    conferencias++;
  });
});

describe("resolverLimiteDaLista", () => {
  it("sem janela, sem período resolvido → 50 (o teto padrão)", () => {
    expect(resolverLimiteDaLista(undefined, null)).toBe(50);
    conferencias++;
  });

  it("'todos' tira o teto mesmo sem período resolvido — é escolha explícita", () => {
    expect(resolverLimiteDaLista("todos", null)).toBeUndefined();
    conferencias++;
  });

  it("janela com período de verdade resolvido (mes-atual) tira o teto", () => {
    const periodo = resolverPeriodoDaUrl("mes-atual", undefined, undefined);
    expect(resolverLimiteDaLista("mes-atual", periodo)).toBeUndefined();
    conferencias++;
  });

  /**
   * Achado do `/revisar` (Tarefa 2, 21/08/2026): antes, qualquer `janela`
   * truthy tirava o teto sozinha — um `?periodo=` desconhecido (nunca
   * deveria acontecer pela UI, mas a URL é editável à mão) caía em
   * `resolverPeriodoDaUrl` → sem filtro de data, e em `resolverLimiteDaLista`
   * → sem teto: a consulta lia a tabela inteira, sem filtro nenhum. Agora o
   * teto só cai quando existe período de verdade (ou "todos" explícito).
   */
  it("valor de janela desconhecido, sem período resolvido → 50, não sem teto", () => {
    const periodo = resolverPeriodoDaUrl("qualquer-coisa", undefined, undefined);
    expect(periodo).toBeNull();
    expect(resolverLimiteDaLista("qualquer-coisa", periodo)).toBe(50);
    conferencias++;
  });

  it("'personalizado' sem de/ate válidos → 50, não sem teto (mesma causa do achado acima)", () => {
    const periodo = resolverPeriodoDaUrl("personalizado", undefined, undefined);
    expect(periodo).toBeNull();
    expect(resolverLimiteDaLista("personalizado", periodo)).toBe(50);
    conferencias++;
  });

  it("'personalizado' com de/ate em formato inválido → 50, não sem teto", () => {
    const periodo = resolverPeriodoDaUrl("personalizado", "10/01/2026", "15/01/2026");
    expect(periodo).toBeNull();
    expect(resolverLimiteDaLista("personalizado", periodo)).toBe(50);
    conferencias++;
  });
});

describe("rotuloDoPeriodo", () => {
  it("sem janela → null (chip mostra 'Período', neutro)", () => {
    expect(rotuloDoPeriodo(undefined, undefined, undefined)).toBeNull();
    conferencias++;
  });

  it("mes-atual → 'Este mês'", () => {
    expect(rotuloDoPeriodo("mes-atual", undefined, undefined)).toBe("Este mês");
    conferencias++;
  });

  it("mes-passado → 'Mês passado'", () => {
    expect(rotuloDoPeriodo("mes-passado", undefined, undefined)).toBe("Mês passado");
    conferencias++;
  });

  it("todos → 'Todos os fretes'", () => {
    expect(rotuloDoPeriodo("todos", undefined, undefined)).toBe("Todos os fretes");
    conferencias++;
  });

  it("personalizado com de/ate → intervalo curto formatado", () => {
    expect(rotuloDoPeriodo("personalizado", "2026-01-10", "2026-01-15")).toBe("10 jan – 15 jan");
    conferencias++;
  });

  it("personalizado sem de/ate → null", () => {
    expect(rotuloDoPeriodo("personalizado", undefined, undefined)).toBeNull();
    conferencias++;
  });

  it("personalizado com de/ate em formato inválido → null, não 'NaN de undefined'", () => {
    expect(rotuloDoPeriodo("personalizado", "10/01/2026", "15/01/2026")).toBeNull();
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
