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

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * "segunda, 25 de agosto" — dia da semana + dia do mês, sem ano. Para a
 * mensagem da ordem de serviço (`src/lib/servicos/mensagens.ts`, item 5
 * Tarefa 2), lida pelo motorista — não é o mesmo formatador de
 * `formatarDataPorExtenso` (abaixo, sem dia da semana e com ano, lido pelo
 * dono na tela): leitores diferentes, formatos diferentes (`docs/planos/
 * item-5-ordem-de-servico.md`, Tarefa 2).
 */
export function formatarDiaDaSemanaEData(instante: Date): string {
  const dia = diaEmFortaleza(instante);
  const [, mes, diaDoMes] = dia.split("-").map(Number);
  return `${DIAS_SEMANA[diaDaSemana(dia)]}, ${diaDoMes} de ${MESES[mes - 1]}`;
}

/**
 * "segunda, 4 de janeiro de 2027" — o de cima **com ano**, e recebendo o dia
 * `"AAAA-MM-DD"` direto, não um `Date`.
 *
 * **O ano não é enfeite aqui, e é por isso que este formatador existe
 * separado** (item 6, Tarefa 1, achado do segundo `/revisar`): nasceu para o
 * vencimento da folha de faturar (`FolhaDeFaturamento`) — vencimento cruza o
 * ano no caso comum, 15 dias a partir de qualquer dia da segunda quinzena de
 * dezembro já cai em janeiro, e sem ano "segunda, 4 de janeiro" não distingue
 * o janeiro que vem do que passou, num campo que decide quando a cobrança
 * vira **vencida**. O detalhe da cobrança (item 6, Tarefa 4) reaproveita o
 * mesmo formatador para exibir o vencimento já gravado — mesmo leitor (o
 * dono), mesmo motivo do ano importar.
 *
 * Segue a distinção que este arquivo já registra logo acima — leitores
 * diferentes, formatos diferentes: a mensagem lida pelo **motorista** não
 * leva ano (frete é de agora), a tela lida pelo **dono** leva.
 */
export function formatarDiaDaSemanaDataEAno(dia: string): string {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  return `${DIAS_SEMANA[diaDaSemana(dia)]}, ${diaDoMes} de ${MESES[mes - 1]} de ${ano}`;
}

/**
 * "5 de agosto de 2026" — dia do mês + ano, sem dia da semana. Nasceu para a
 * data de emissão do documento impresso (item 7, `gerador.ts`: "'Emitido em
 * {emissao}'"), lida em papel formal — diferente de `formatarDiaDaSemanaEData`
 * (mensagem de WhatsApp, informal) e de `formatarDiaDaSemanaDataEAno`
 * (vencimento, que precisa do dia da semana para orientar "hoje é terça,
 * vence sexta"). Promovida para cá no mesmo commit, de uma cópia idêntica
 * que só existia local em `fretes/[id]/page.tsx` (detalhe do frete, item 4)
 * — `CLAUDE.md` §8, "componente existe uma vez".
 */
export function formatarDataPorExtenso(dia: string): string {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  return `${diaDoMes} de ${MESES[mes - 1]} de ${ano}`;
}

/**
 * "20/08/2026" — o vencimento do bloco de cobrança do documento impresso
 * (`corpoRelatorio.ts`, `DadosCobrancaDocumento.vencimento`: "já formatado").
 * Numérico de propósito, diferente dos formatadores por extenso acima — é
 * lido em papel, rápido, junto do valor e da chave Pix, não em frase.
 */
export function formatarDataNumerica(dia: string): string {
  const [ano, mes, diaDoMes] = dia.split("-");
  return `${diaDoMes}/${mes}/${ano}`;
}

/**
 * "agosto" (período dentro de um mês só) ou "20/08 a 10/09" (atravessando
 * meses) — a variação de `montarMensagemCobranca` para uma cobrança que
 * cobre vários fretes de um relatório (item 7, `docs/planos/
 * item-7-relatorio.md`, "Mensagem de cobrança quando o relatório junta
 * vários fretes"): "Passando pra lembrar dos fretes de {período}." no lugar
 * da rota, porque a rota não faz sentido para mais de um frete.
 *
 * **Atravessando ano, o formato curto some com o ano em cada ponta** — o
 * próprio plano registra isto como extrapolação da construção, não decisão
 * do fundador, e pede para o Design confirmar outro formato se quiser.
 */
export function formatarPeriodoDeCobranca(dataInicial: Date, dataFinal: Date): string {
  const inicio = diaEmFortaleza(dataInicial);
  const fim = diaEmFortaleza(dataFinal);
  const [anoInicio, mesInicio] = inicio.split("-").map(Number);
  const [anoFim, mesFim] = fim.split("-").map(Number);

  if (anoInicio === anoFim && mesInicio === mesFim) return MESES[mesInicio - 1];

  const curto = (dia: string) => {
    const [, mes, diaDoMes] = dia.split("-");
    return `${diaDoMes}/${mes}`;
  };
  return `${curto(inicio)} a ${curto(fim)}`;
}

/**
 * "1 a 31 de julho de 2026" (mesmo mês) · "20 de agosto a 10 de setembro de
 * 2026" (atravessando mês) · "20 de dezembro de 2026 a 10 de janeiro de
 * 2027" (atravessando ano) — o "Cliente e período coberto" do documento
 * impresso (`docs/especificacao.md` §4.4, `corpoRelatorio.ts`). Diferente de
 * `formatarPeriodoDeCobranca` (a linha compacta da mensagem de WhatsApp):
 * este sempre nomeia o mês por extenso nas duas pontas quando elas
 * divergem, porque aqui o período é o próprio conteúdo do documento formal,
 * não uma referência de passagem numa frase.
 */
export function formatarPeriodoDoDocumento(dataInicial: Date, dataFinal: Date): string {
  const inicio = diaEmFortaleza(dataInicial);
  const fim = diaEmFortaleza(dataFinal);
  const [anoInicio, mesInicio, diaInicio] = inicio.split("-").map(Number);
  const [anoFim, mesFim, diaFim] = fim.split("-").map(Number);

  if (anoInicio === anoFim && mesInicio === mesFim) {
    return `${diaInicio} a ${diaFim} de ${MESES[mesInicio - 1]} de ${anoInicio}`;
  }
  if (anoInicio === anoFim) {
    return `${diaInicio} de ${MESES[mesInicio - 1]} a ${diaFim} de ${MESES[mesFim - 1]} de ${anoInicio}`;
  }
  return `${diaInicio} de ${MESES[mesInicio - 1]} de ${anoInicio} a ${diaFim} de ${MESES[mesFim - 1]} de ${anoFim}`;
}

