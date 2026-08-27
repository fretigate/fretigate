/**
 * Textos padrão enviados por WhatsApp — `CLAUDE.md` §6 (regra de negócio mora
 * em `/lib/servicos`) e `docs/especificacao.md` §9, exigência 2 (arquivo
 * único para os textos, já com as variáveis no formato final). Aprovado pelo
 * fundador antes de virar código (`docs/planos/item-5-ordem-de-servico.md`,
 * Tarefa 2, decisão 5).
 */

export type DadosMensagemOrdem = {
  empresa: string;
  /**
   * Já formatado — "segunda, 25 de agosto"
   * (`src/lib/utils/data-fortaleza.ts`, `formatarDiaDaSemanaEData`). Esta
   * função nunca formata data — separação já usada no resto do produto
   * entre serviço (monta o texto) e exibição (formata o valor).
   */
  diaEData: string;
  origem?: string | null;
  destino?: string | null;
  carga?: string | null;
  caminhao?: string | null;
};

const FRASE_FINAL = "Manda uma foto do embarque quando carregar.";

/**
 * Ordem de serviço enviada ao motorista — `docs/especificacao.md` §9,
 * exigência 1: curto, direto, nunca com cara de sistema. Nunca traz o valor
 * do frete (§4.2: "a mensagem não traz o valor") nem o nome do cliente
 * (decisão do fundador, `docs/planos/item-5-ordem-de-servico.md`, Tarefa 2 —
 * "o motorista não precisa saber para quem é"; §4.2 não fala do cliente,
 * citação corrigida no segundo `/revisar` desta tarefa).
 *
 * As quatro linhas do meio (Origem/Destino/Carga/Caminhão) só entram se o
 * campo correspondente tiver valor — rótulo e linha desaparecem juntos.
 * Nunca duas quebras de linha em branco seguidas: os três blocos (cabeçalho
 * · campos presentes · frase final) se juntam com exatamente uma linha em
 * branco entre blocos não vazios — se o bloco do meio ficar sem nenhuma
 * linha, o resultado é cabeçalho, uma linha em branco, frase final.
 */
export function montarMensagemOrdem(dados: DadosMensagemOrdem): string {
  const cabecalho = `${dados.empresa}\nFrete de ${dados.diaEData}`;

  const campos = [
    dados.origem ? `Origem: ${dados.origem}` : null,
    dados.destino ? `Destino: ${dados.destino}` : null,
    dados.carga ? `Carga: ${dados.carga}` : null,
    dados.caminhao ? `Caminhão: ${dados.caminhao}` : null,
  ].filter((linha): linha is string => linha !== null);

  return [cabecalho, campos.join("\n"), FRASE_FINAL]
    .filter((bloco) => bloco.length > 0)
    .join("\n\n");
}

export type DadosMensagemCobranca = {
  empresa: string;
  cliente: string;
  /** `formatarRota` (`src/lib/utils/rota.ts`) — só o que existir, pode ser nulo. */
  rota: string | null;
  /** Já formatado — "2.400,00" (`formatarCentavos`), sem o prefixo "R$": a função entrega o prefixo. */
  valor: string;
  /** Já formatado — "sexta, 5 de setembro" (`formatarDiaDaSemanaEData`). Esta função nunca formata data. */
  vencimento: string;
  /** Muda só a linha do vencimento ("Vencimento:" vira "Venceu") — o resto do texto não muda (decisão do fundador, 26/08/2026). */
  vencido: boolean;
  /** `Empresa.chave_pix` — o bloco inteiro some quando nulo, não só a linha. */
  pix: string | null;
};

const FRASE_FINAL_COBRANCA = "Se já tiver pago, pode desconsiderar. Obrigado!";

/**
 * Cobrança por WhatsApp (item 6, Tarefa 5 —
 * `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 1) — o texto aprovado
 * pelo fundador em 26/08/2026, mesma regra de blocos de `montarMensagemOrdem`
 * (nunca duas quebras seguidas, bloco ausente some inteiro).
 *
 * **A empresa sozinha na primeira linha** — o cliente recebe de número
 * desconhecido e precisa saber de quem é antes de abrir. **"Se já tiver
 * pago, pode desconsiderar."** — cobrança e pagamento se cruzam; sem a
 * frase, quem já pagou lê como se a empresa não tivesse visto o dinheiro.
 *
 * **Sem `{rota}`, a frase perde só a menção da rota** ("Passando pra lembrar
 * do frete.") — diferente do bloco do Pix, que some inteiro: a frase em si
 * não é um rótulo órfão, continua fazendo sentido sem o trecho da rota.
 */
export function montarMensagemCobranca(dados: DadosMensagemCobranca): string {
  const linhaVencimento = dados.vencido
    ? `Venceu ${dados.vencimento}`
    : `Vencimento: ${dados.vencimento}`;

  const blocos = [
    dados.empresa,
    `Oi, ${dados.cliente}. Tudo bem?`,
    dados.rota ? `Passando pra lembrar do frete ${dados.rota}.` : "Passando pra lembrar do frete.",
    `Valor: R$ ${dados.valor}\n${linhaVencimento}`,
    dados.pix ? `Pix: ${dados.pix}` : null,
    FRASE_FINAL_COBRANCA,
  ].filter((bloco): bloco is string => bloco !== null);

  return blocos.join("\n\n");
}
