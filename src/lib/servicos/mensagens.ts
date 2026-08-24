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
