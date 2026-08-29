import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  deslocarDias,
  deslocarMes,
  diaDaSemana,
  diaEmFortaleza,
  diasNoMes,
  formatarDiaDaSemanaEData,
  formatarDiaDaSemanaDataEAno,
  formatarDataPorExtenso,
  formatarDataNumerica,
  formatarPeriodoDeCobranca,
  formatarPeriodoDoDocumento,
  instanteDoDiaEmFortaleza,
} from "@/lib/utils/data-fortaleza";

/**
 * Prova o achado do `/revisar` na Tarefa 2 do item 3: a tela de Lançar frete
 * calculava "Hoje"/"Ontem"/"Amanhã" com os métodos locais de `Date`
 * (`getDate`, `new Date(ano, mes, dia)`), que dependem do fuso de quem roda
 * o código — não do fuso de Fortaleza que `CLAUDE.md` §7 exige. O teste
 * manual passou porque a máquina de teste também estava em UTC-3, a mesma
 * hora de Fortaleza: verde pelo motivo errado, o mesmo defeito da
 * "confusão de quem lê" registrada no `CLAUDE.md` §2.
 *
 * Por isso a suíte inteira roda com `TZ=UTC` — um fuso genuinely diferente
 * do de quem escreveu isto (America/Sao_Paulo) e do de Fortaleza — para que
 * uma regressão futura para os métodos locais **não passe por coincidência
 * de novo**. `src/lib/utils/data-fortaleza.ts` usa só `Intl.DateTimeFormat`
 * com fuso nomeado e aritmética em UTC puro (`Date.UTC`/`getUTC*`), então o
 * resultado não deveria mudar nem um pouco com essa troca — é exatamente
 * isso que os testes abaixo verificam.
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 26;

beforeAll(() => {
  vi.stubEnv("TZ", "UTC");
});

afterAll(() => {
  vi.unstubAllEnvs();
  expect(conferencias).toBeGreaterThanOrEqual(CONFERENCIAS_ESPERADAS);
});

describe("diaEmFortaleza", () => {
  it("depois das 21h de Fortaleza, o dia em UTC já virou amanhã — e o de Fortaleza não pode", () => {
    // 2026-08-11T23:30 em Fortaleza (UTC-3) = 2026-08-12T02:30Z: em UTC já é
    // dia 12, mas em Fortaleza ainda são 23h30 do dia 11.
    expect(diaEmFortaleza(new Date("2026-08-12T02:30:00.000Z"))).toBe("2026-08-11");
    conferencias++;

    // Meia hora depois (2026-08-12T00:00 em Fortaleza = T03:00Z), virou o dia.
    expect(diaEmFortaleza(new Date("2026-08-12T03:00:00.000Z"))).toBe("2026-08-12");
    conferencias++;
  });

  it("perto da meia-noite UTC, o dia em Fortaleza ainda é o de ontem", () => {
    // 2026-08-11T23:59Z é 2026-08-11T20:59 em Fortaleza — mesmo dia dos dois
    // lados aqui, o caso que importa é sempre o da virada em UTC, não nesta.
    // O caso realmente arriscado é o inverso: logo depois da meia-noite UTC,
    // Fortaleza ainda está na tarde do dia anterior.
    expect(diaEmFortaleza(new Date("2026-08-11T01:00:00.000Z"))).toBe("2026-08-10");
    conferencias++;
  });

  it("é o inverso exato de instanteDoDiaEmFortaleza", () => {
    expect(diaEmFortaleza(instanteDoDiaEmFortaleza("2026-08-11"))).toBe("2026-08-11");
    conferencias++;
    expect(diaEmFortaleza(instanteDoDiaEmFortaleza("2026-01-01"))).toBe("2026-01-01");
    conferencias++;
  });
});

describe("deslocarDias", () => {
  it("soma e subtrai dias, inclusive virando mês e ano", () => {
    expect(deslocarDias("2026-08-11", -1)).toBe("2026-08-10");
    conferencias++;
    expect(deslocarDias("2026-08-11", 1)).toBe("2026-08-12");
    conferencias++;
    expect(deslocarDias("2026-01-01", -1)).toBe("2025-12-31");
    conferencias++;
    expect(deslocarDias("2026-02-28", 1)).toBe("2026-03-01"); // 2026 não é bissexto
    conferencias++;
  });
});

describe("diaDaSemana, deslocarMes e diasNoMes", () => {
  it("11/08/2026 é uma terça-feira", () => {
    expect(diaDaSemana("2026-08-11")).toBe(2); // 0 = domingo
    conferencias++;
  });

  it("navega mês e conta dias corretamente", () => {
    expect(deslocarMes("2026-08-01", 1)).toBe("2026-09-01");
    conferencias++;
    expect(deslocarMes("2026-01-01", -1)).toBe("2025-12-01");
    conferencias++;
    expect(diasNoMes("2026-02-01")).toBe(28);
    conferencias++;
    expect(diasNoMes("2024-02-01")).toBe(29); // 2024 é bissexto
    conferencias++;
  });
});

describe("formatarDiaDaSemanaEData", () => {
  it("dia da semana + dia do mês, sem ano — para a mensagem da ordem (item 5, Tarefa 2)", () => {
    // 11/08/2026 é terça-feira (mesma data do teste de diaDaSemana acima).
    expect(formatarDiaDaSemanaEData(new Date("2026-08-11T12:00:00.000Z"))).toBe("terça, 11 de agosto");
    conferencias++;
  });

  it("usa o dia de Fortaleza, não o de UTC — mesma virada de diaEmFortaleza", () => {
    // 2026-08-12T02:30Z ainda é 23h30 do dia 11 em Fortaleza.
    expect(formatarDiaDaSemanaEData(new Date("2026-08-12T02:30:00.000Z"))).toBe("terça, 11 de agosto");
    conferencias++;
  });
});

describe("formatarDiaDaSemanaDataEAno", () => {
  it("dia da semana + dia do mês + ano — o vencimento da folha de faturar (item 6, Tarefa 1)", () => {
    // 11/08/2026 é terça-feira, a mesma data dos testes acima.
    expect(formatarDiaDaSemanaDataEAno("2026-08-11")).toBe("terça, 11 de agosto de 2026");
    conferencias++;
  });

  /**
   * O motivo de este formatador existir, e não é enfeite: 15 dias a partir
   * de qualquer dia da segunda quinzena de dezembro já caem no ano seguinte.
   * Sem ano, "segunda, 4 de janeiro" não distingue o janeiro que vem do que
   * passou — num campo que decide quando a cobrança vira vencida.
   */
  it("mostra o ano seguinte quando o vencimento cruza o ano", () => {
    expect(formatarDiaDaSemanaDataEAno("2027-01-04")).toBe("segunda, 4 de janeiro de 2027");
    conferencias++;
  });
});

describe("formatarDataPorExtenso", () => {
  it("dia do mês + ano, sem dia da semana — a emissão do documento impresso (item 7)", () => {
    expect(formatarDataPorExtenso("2026-08-05")).toBe("5 de agosto de 2026");
    conferencias++;
  });
});

describe("formatarDataNumerica", () => {
  it("dd/mm/aaaa — o vencimento do bloco de cobrança no documento impresso (item 7)", () => {
    expect(formatarDataNumerica("2026-08-20")).toBe("20/08/2026");
    conferencias++;
  });
});

describe("formatarPeriodoDeCobranca", () => {
  it("período dentro de um mês só — só o nome do mês, sem dia nem ano", () => {
    expect(
      formatarPeriodoDeCobranca(new Date("2026-08-01T03:00:00.000Z"), new Date("2026-08-31T03:00:00.000Z")),
    ).toBe("agosto");
    conferencias++;
  });

  it("período atravessando meses — dd/mm a dd/mm", () => {
    expect(
      formatarPeriodoDeCobranca(new Date("2026-08-20T03:00:00.000Z"), new Date("2026-09-10T03:00:00.000Z")),
    ).toBe("20/08 a 10/09");
    conferencias++;
  });

  it("usa o dia de Fortaleza para decidir o mês, não o de UTC", () => {
    // 2026-08-31T23:30 em Fortaleza = 2026-09-01T02:30Z: em UTC já é
    // setembro, mas em Fortaleza ainda é agosto — os dois extremos precisam
    // cair no mesmo mês de Fortaleza para o resultado ser só "agosto".
    expect(
      formatarPeriodoDeCobranca(new Date("2026-08-01T12:00:00.000Z"), new Date("2026-09-01T02:30:00.000Z")),
    ).toBe("agosto");
    conferencias++;
  });
});

describe("formatarPeriodoDoDocumento", () => {
  it("mesmo mês — dia a dia, um mês e ano só", () => {
    expect(
      formatarPeriodoDoDocumento(new Date("2026-07-01T03:00:00.000Z"), new Date("2026-07-31T03:00:00.000Z")),
    ).toBe("1 a 31 de julho de 2026");
    conferencias++;
  });

  it("atravessando mês, mesmo ano — mês por extenso nas duas pontas", () => {
    expect(
      formatarPeriodoDoDocumento(new Date("2026-08-20T03:00:00.000Z"), new Date("2026-09-10T03:00:00.000Z")),
    ).toBe("20 de agosto a 10 de setembro de 2026");
    conferencias++;
  });

  it("atravessando ano — ano em cada ponta, nunca só no fim", () => {
    expect(
      formatarPeriodoDoDocumento(new Date("2026-12-20T03:00:00.000Z"), new Date("2027-01-10T03:00:00.000Z")),
    ).toBe("20 de dezembro de 2026 a 10 de janeiro de 2027");
    conferencias++;
  });
});
