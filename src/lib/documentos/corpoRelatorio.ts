import { escaparHtml } from "@/lib/utils/html";
import { FIO_DE_LINHA, FIO_FORTE, FIO_MOLDURA, FONTE_ARCHIVO, FONTE_AZERET_MONO, TINTA_APOIO } from "./estiloImpresso";

/**
 * O corpo do documento "Relatório" — a parte que varia dentro do
 * `moldeDocumentoA4.ts` (`CLAUDE.md` §9). `docs/especificacao.md` §4.4:
 * "Cliente e período coberto · Tabela: data · rota · descrição da carga ·
 * valor · Total em destaque · Sem cobrança: termina no total. Com cobrança:
 * acrescenta vencimento e chave Pix no rodapé."
 *
 * Template string por HTML — mesma decisão e mesmo motivo de
 * `moldeDocumentoA4.ts` (ver o comentário lá: `react-dom/server` não roda
 * dentro de Server Action/Route Handler, medido contra o Next.js de
 * verdade). Todo campo passa por `escaparHtml` antes de entrar no HTML.
 *
 * **Sem "tipo de chave" nem dado bancário** — a versão do protótipo
 * (`referencia/.../DocumentoA4.dc.html`) mostra "Chave CNPJ" e "Banco do
 * Nordeste · Ag. 0142 · C/C 88.421-0", nenhum dos dois com campo
 * correspondente em `Empresa` (só existe `chave_pix`, texto livre — `CLAUDE.md`
 * §7, entidade Empresa). Protótipo é evidência corroborante, nunca autoridade
 * (`CLAUDE.md` §13) — campo que só existe em desenho é proposta, não decisão.
 * O bloco de Pix mostra só o que o schema tem, mesmo tratamento que
 * `montarMensagemCobranca` já dá à mesma chave (`src/lib/servicos/
 * mensagens.ts`: "Pix: {valor cru}", sem subtítulo de tipo).
 */

export type LinhaFreteDocumento = {
  /** "02/07" — já formatado. */
  data: string;
  /** `formatarRota` (`src/lib/utils/rota.ts`), ou "—" se nem origem nem destino existirem. */
  rota: string;
  /** Descrição da carga, ou "—" se vazia. */
  carga: string;
  /** `formatarCentavos` (`src/lib/utils/dinheiro.ts`) — sem o prefixo "R$". */
  valor: string;
};

export type DadosCobrancaDocumento = {
  /** Já formatado — "20/08/2026". */
  vencimento: string;
  /**
   * `Empresa.chave_pix`, cru — texto livre, sem tipo nem formatação própria.
   * `null` quando a empresa não tem chave cadastrada — exceção do §12
   * (`docs/componentes.md`): "Gerar relatório" com cobrança ativa não
   * bloqueia por falta de Pix, o documento sai só sem o bloco de pagamento
   * (item 7, Tarefa 3). Diferente do `cobranca` do molde inteiro ser `null`
   * — aqui o vencimento continua aparecendo, só a coluna do Pix some.
   */
  chavePix: string | null;
};

export type CorpoRelatorioProps = {
  cliente: string;
  /** "CNPJ 08.771.203/0001-44 · Sobral/CE", ou `null`. */
  clienteDocumento: string | null;
  /** "1 a 31 de julho de 2026" — já formatado. */
  periodo: string;
  linhas: LinhaFreteDocumento[];
  /** `formatarCentavos` do `Relatorio.valor_total` — sem o prefixo "R$". */
  total: string;
  /** `null` = "Gerar cobrança" não estava marcado; o documento termina no total (§4.4). */
  cobranca: DadosCobrancaDocumento | null;
};

const LARGURA_COLUNA_DATA = "86px";
const LARGURA_COLUNA_CARGA = "170px";
const LARGURA_COLUNA_VALOR = "120px";
const ESTILO_ROTULO_COLUNA = `font:700 11px/1 ${FONTE_ARCHIVO};letter-spacing:.14em;color:${TINTA_APOIO}`;

function montarLinha(linha: LinhaFreteDocumento): string {
  return `<div style="display:flex;gap:0;align-items:baseline;padding:13px 0;border-bottom:${FIO_DE_LINHA}">
    <span style="flex:none;width:${LARGURA_COLUNA_DATA};font:500 14px/1.3 ${FONTE_AZERET_MONO}">${escaparHtml(linha.data)}</span>
    <span style="flex:1;min-width:0;font:500 15px/1.3 ${FONTE_ARCHIVO}">${escaparHtml(linha.rota)}</span>
    <span style="flex:none;width:${LARGURA_COLUNA_CARGA};font:400 14px/1.3 ${FONTE_ARCHIVO};color:${TINTA_APOIO}">${escaparHtml(linha.carga)}</span>
    <span style="flex:none;width:${LARGURA_COLUNA_VALOR};text-align:right;font:600 15px/1.3 ${FONTE_ARCHIVO};font-variant-numeric:tabular-nums">${escaparHtml(linha.valor)}</span>
  </div>`;
}

function montarBlocoCobranca(cobranca: DadosCobrancaDocumento): string {
  const colunaPix = cobranca.chavePix
    ? `<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px">
      <span style="font:700 11px/1 ${FONTE_ARCHIVO};letter-spacing:.16em;color:${TINTA_APOIO}">PAGAMENTO VIA PIX</span>
      <span style="display:inline-flex;align-self:flex-start;padding:9px 13px;border:${FIO_MOLDURA};font:600 15px/1.2 ${FONTE_AZERET_MONO};letter-spacing:.02em">${escaparHtml(cobranca.chavePix)}</span>
    </div>`
    : "";

  return `<div style="display:flex;gap:40px;padding:22px 0 0;border-top:${FIO_FORTE}">
    <div style="flex:none;display:flex;flex-direction:column;gap:7px">
      <span style="font:700 11px/1 ${FONTE_ARCHIVO};letter-spacing:.16em;color:${TINTA_APOIO}">VENCIMENTO</span>
      <span style="font:700 22px/1 ${FONTE_ARCHIVO};font-stretch:96%;letter-spacing:-.01em">${escaparHtml(cobranca.vencimento)}</span>
    </div>
    ${colunaPix}
  </div>`;
}

export function montarCorpoRelatorio({
  cliente,
  clienteDocumento,
  periodo,
  linhas,
  total,
  cobranca,
}: CorpoRelatorioProps): string {
  // "serviço(s)", não "frete(s)" — o documento impresso usa o vocabulário
  // formal do produto (`Servico`), diferente da interface, que sempre diz
  // "frete" (`CLAUDE.md` §8/§9). Decisão do fundador, achado do `/revisar`
  // na Tarefa 2 do item 7, 28/08/2026: o título já diz "RELATÓRIO DE
  // SERVIÇOS" — o corpo não pode falar outra língua na mesma folha.
  const contagem = `${linhas.length} ${linhas.length === 1 ? "serviço" : "serviços"}`;

  const linhaClienteDocumento = clienteDocumento
    ? `<span style="font:400 13px/1.4 ${FONTE_ARCHIVO};color:${TINTA_APOIO}">${escaparHtml(clienteDocumento)}</span>`
    : "";

  return `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding:22px 0 26px">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
        <span style="font:700 11px/1 ${FONTE_ARCHIVO};letter-spacing:.16em;color:${TINTA_APOIO}">CLIENTE</span>
        <span style="font:700 22px/1.15 ${FONTE_ARCHIVO};font-stretch:96%;letter-spacing:-.01em">${escaparHtml(cliente)}</span>
        ${linhaClienteDocumento}
      </div>
      <div style="flex:none;text-align:right;display:flex;flex-direction:column;gap:6px">
        <span style="font:700 11px/1 ${FONTE_ARCHIVO};letter-spacing:.16em;color:${TINTA_APOIO}">PERÍODO</span>
        <span style="font:600 15px/1.3 ${FONTE_ARCHIVO}">${escaparHtml(periodo)}</span>
        <span style="font:400 13px/1.4 ${FONTE_ARCHIVO};color:${TINTA_APOIO}">${contagem}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column">
      <div style="display:flex;gap:0;padding:0 0 9px;border-bottom:${FIO_FORTE}">
        <span style="${ESTILO_ROTULO_COLUNA};flex:none;width:${LARGURA_COLUNA_DATA}">DATA</span>
        <span style="${ESTILO_ROTULO_COLUNA};flex:1;min-width:0">ROTA</span>
        <span style="${ESTILO_ROTULO_COLUNA};flex:none;width:${LARGURA_COLUNA_CARGA}">CARGA</span>
        <span style="${ESTILO_ROTULO_COLUNA};flex:none;width:${LARGURA_COLUNA_VALOR};text-align:right">VALOR</span>
      </div>
      ${linhas.map(montarLinha).join("")}
    </div>

    <div style="display:flex;align-items:baseline;justify-content:flex-end;gap:20px;padding:22px 0 0;border-top:${FIO_FORTE};margin-top:-1px">
      <span style="font:700 13px/1 ${FONTE_ARCHIVO};letter-spacing:.16em">TOTAL DO PERÍODO</span>
      <span style="font:800 34px/1 ${FONTE_ARCHIVO};font-stretch:94%;letter-spacing:-.03em;font-variant-numeric:tabular-nums">R$ ${escaparHtml(total)}</span>
    </div>

    <div style="flex:1"></div>

    ${cobranca ? montarBlocoCobranca(cobranca) : ""}
  `;
}
