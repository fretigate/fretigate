import { iniciais } from "@/lib/utils/iniciais";
import { escaparHtml } from "@/lib/utils/html";
import { FIO_FORTE, FONTE_ARCHIVO, FONTE_AZERET_MONO, TINTA_APOIO, TINTA_MARCA_DISCRETA, TINTA_PRINCIPAL, TINTA_TERCIARIA } from "./estiloImpresso";

/**
 * O molde genérico do documento A4 — `CLAUDE.md` §9: "Gerador de documento é
 * genérico... cabeçalho da empresa fixo e corpo variando." Esta função monta
 * o cabeçalho fixo (logo/iniciais, razão social, dados da empresa, título do
 * documento, número, emissão) e o rodapé fixo (nota + marca FretiGate) em
 * volta de um `corpoHtml` já pronto — qualquer tipo de documento futuro
 * (recibo, romaneio, proposta, `docs/especificacao.md` §9) reaproveita este
 * molde, só trocando `titulo` e `corpoHtml`. Hoje só `corpoRelatorio.ts`
 * existe como corpo.
 *
 * **Template string, não JSX/React — decisão corrigida na própria Tarefa 2,
 * depois de medir contra o Next.js de verdade.** A primeira versão usava
 * componentes React e `renderToStaticMarkup` (`react-dom/server`); o
 * `next dev` real recusou a importar (`app/api/.../route.ts`): "You're
 * importing a component that imports react-dom/server. To fix it, render or
 * return the content directly as a Server Component instead" — Server
 * Action e Route Handler do App Router rodam sob a condição `react-server`,
 * e `react-dom/server` se recusa a carregar nela por desenho do próprio
 * React (medido com uma rota de teste descartável, removida depois). Uma
 * função que devolve string comum não tem esse problema, e continua sendo
 * **uma implementação só** (`CLAUDE.md` §8): a Tarefa 4 (prévia em tela)
 * chama a mesma função e injeta o resultado com `dangerouslySetInnerHTML`,
 * em vez de compor via `children` do React.
 *
 * **Todo campo escapado com `escaparHtml`** — a proteção que o JSX dava de
 * graça (texto de criança nunca vira marcação) precisa ser feita à mão numa
 * função que monta HTML por concatenação. Nome de empresa, CNPJ, telefone —
 * tudo dado do usuário, tudo passa por `escaparHtml` antes de entrar no
 * molde.
 *
 * Marcação e medidas vêm de `referencia/Design/Protótipo clicável de fretes/
 * DocumentoA4.dc.html` (evidência corroborante, `CLAUDE.md` §13) mais
 * `docs/estilo.md` § Impresso (autoridade) e `docs/especificacao.md` §4.4
 * (conteúdo obrigatório do cabeçalho: "logo, razão social, CNPJ, endereço,
 * telefone e e-mail").
 */

export type CabecalhoEmpresaDocumento = {
  nome: string;
  /** "CNPJ 12.345.678/0001-90 · Av. Dom José, 1240 — Centro, Sobral/CE", ou `null` se a empresa não tem nada disso preenchido. */
  linhaDados: string | null;
  /** "(88) 99612-4400 · financeiro@aptransportes.com.br", ou `null`. */
  linhaContato: string | null;
  logoUrl: string | null;
};

export type MoldeDocumentoA4Props = {
  empresa: CabecalhoEmpresaDocumento;
  /** "RELATÓRIO DE SERVIÇOS" — maiúsculas, é a própria tela que decide o texto. */
  titulo: string;
  numero: string;
  /** Já formatado — "5 de agosto de 2026". */
  emissao: string;
  /** "Documento emitido por {empresa} · confira os valores e fale com a gente em caso de divergência." */
  notaDeRodape: string;
  corpoHtml: string;
};

function circuloIniciais(nome: string): string {
  return `<span style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:999px;border:${FIO_FORTE};flex:none;font:700 16px/1 ${FONTE_ARCHIVO};letter-spacing:.02em;color:${TINTA_PRINCIPAL}">${escaparHtml(iniciais(nome))}</span>`;
}

// O "Nº {numero}" sai em Azeret Mono, não Archivo — mesma regra da placa do
// caminhão (`docs/estilo.md` § Impresso, "Número do documento"): número
// identificador, lido caractere por caractere e citado por telefone ("o
// relatório 12"), não texto corrido. Decisão do fundador, achado do
// `/revisar` na Tarefa 2 do item 7, 28/08/2026.
export function montarMoldeDocumentoA4({
  empresa,
  titulo,
  numero,
  emissao,
  notaDeRodape,
  corpoHtml,
}: MoldeDocumentoA4Props): string {
  const logoOuIniciais = empresa.logoUrl
    ? `<img src="${escaparHtml(empresa.logoUrl)}" alt="" style="width:46px;height:46px;border-radius:999px;object-fit:cover;flex:none">`
    : circuloIniciais(empresa.nome);

  const linhaDadosContato =
    empresa.linhaDados || empresa.linhaContato
      ? `<span style="font:400 12px/1.45 ${FONTE_ARCHIVO};color:${TINTA_APOIO}">${[empresa.linhaDados, empresa.linhaContato]
          .filter((v): v is string => Boolean(v))
          .map(escaparHtml)
          .join("<br>")}</span>`
      : "";

  return `<div style="width:794px;height:1123px;box-sizing:border-box;padding:64px 56px;background:#FFFFFF;color:${TINTA_PRINCIPAL};font-family:${FONTE_ARCHIVO};display:flex;flex-direction:column">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:32px;padding-bottom:22px;border-bottom:${FIO_FORTE}">
      <div style="display:flex;align-items:center;gap:14px;min-width:0">
        ${logoOuIniciais}
        <div style="min-width:0;display:flex;flex-direction:column;gap:5px">
          <span style="font:700 21px/1.15 ${FONTE_ARCHIVO};font-stretch:96%;letter-spacing:-.01em">${escaparHtml(empresa.nome)}</span>
          ${linhaDadosContato}
        </div>
      </div>
      <div style="flex:none;text-align:right;display:flex;flex-direction:column;gap:6px">
        <span style="font:700 13px/1 ${FONTE_ARCHIVO};letter-spacing:.16em">${escaparHtml(titulo)}</span>
        <span style="font:500 13px/1.4 ${FONTE_AZERET_MONO};color:${TINTA_APOIO}">Nº ${escaparHtml(numero)}</span>
        <span style="font:400 12px/1.4 ${FONTE_ARCHIVO};color:${TINTA_APOIO}">Emitido em ${escaparHtml(emissao)}</span>
      </div>
    </div>
    ${corpoHtml}
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding-top:20px">
      <span style="font:400 11px/1.4 ${FONTE_ARCHIVO};color:${TINTA_TERCIARIA}">${escaparHtml(notaDeRodape)}</span>
      <span style="flex:none;font:500 10px/1 ${FONTE_ARCHIVO};letter-spacing:.14em;color:${TINTA_MARCA_DISCRETA}">FRETIGATE</span>
    </div>
  </div>`;
}
