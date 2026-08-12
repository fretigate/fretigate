/**
 * Dia (sem hora) no fuso de Fortaleza — `CLAUDE.md` §7: "Data e hora em UTC.
 * Exibidas no fuso de Fortaleza." Usado pela tela de Lançar frete
 * (`docs/planos/item-3-lancamento-frete.md`, Tarefa 2): "Hoje" precisa
 * continuar sendo hoje em Fortaleza até a meia-noite **de lá**, não a de UTC
 * — sem isso, depois das 21h de Fortaleza (meia-noite de Fortaleza é 3h UTC),
 * um servidor rodando em UTC (a Vercel, por exemplo) já vê o dia seguinte, e
 * "Hoje" mostraria a data errada. Achado do `/revisar` na Tarefa 2: o teste
 * manual passou por coincidência de fuso (a máquina de teste também estava
 * em UTC-3) — ver `tests/data-fortaleza.test.ts`.
 *
 * A extração do dia usa `Intl.DateTimeFormat` com o fuso **nomeado**, nunca
 * um deslocamento escrito à mão — é o padrão já usado em
 * `src/lib/utils/mensagem-trava.ts`. A reconstrução do instante (sentido
 * contrário) pode usar um deslocamento fixo de -03:00 porque Fortaleza não
 * tem horário de verão desde que o Brasil o aboliu, em 2019 — não há mais de
 * um deslocamento possível para verificar.
 *
 * Toda a aritmética de calendário (dia seguinte, navegação de mês, dias no
 * mês) é feita em UTC puro (`Date.UTC`/`getUTC*`), nunca com os métodos
 * locais (`getDate`, `new Date(ano, mes, dia)`) — locais dependem do fuso de
 * quem roda o código, e é exatamente essa dependência que este arquivo
 * existe para eliminar.
 */

const FUSO_FORTALEZA = "America/Fortaleza";

const EXTRATOR = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_FORTALEZA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** O dia (`"AAAA-MM-DD"`) que `instante` representa em Fortaleza. */
export function diaEmFortaleza(instante: Date): string {
  return EXTRATOR.format(instante);
}

/**
 * O instante da meia-noite **de Fortaleza** daquele dia — não meia-noite
 * UTC, que seria 21h da véspera em Fortaleza.
 */
export function instanteDoDiaEmFortaleza(dia: string): Date {
  return new Date(`${dia}T03:00:00.000Z`);
}

function dataUtcDoDia(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

function diaDaDataUtc(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Soma `n` dias (pode ser negativo) a um dia `"AAAA-MM-DD"`. */
export function deslocarDias(dia: string, n: number): string {
  const data = dataUtcDoDia(dia);
  data.setUTCDate(data.getUTCDate() + n);
  return diaDaDataUtc(data);
}

/** Dia da semana de `dia` (`"AAAA-MM-DD"`) — 0 = domingo … 6 = sábado. */
export function diaDaSemana(dia: string): number {
  return dataUtcDoDia(dia).getUTCDay();
}

/** Primeiro dia do mês `n` meses depois (ou antes, se negativo) do mês de `dia`. */
export function deslocarMes(dia: string, n: number): string {
  const [ano, mes] = dia.split("-").map(Number);
  return diaDaDataUtc(new Date(Date.UTC(ano, mes - 1 + n, 1)));
}

/** Quantos dias tem o mês de `dia` (`"AAAA-MM-DD"`). */
export function diasNoMes(dia: string): number {
  const [ano, mes] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}
