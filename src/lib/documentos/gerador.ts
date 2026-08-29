import "server-only";
import { enviarRelatorioAoStorage } from "./armazenamento";
import type { CabecalhoEmpresaDocumento } from "./moldeDocumentoA4";
import { montarMoldeDocumentoA4 } from "./moldeDocumentoA4";
import type { CorpoRelatorioProps } from "./corpoRelatorio";
import { montarCorpoRelatorio } from "./corpoRelatorio";
import { estiloDeFontesEmbutidas } from "./fontesEmbutidas";
import { abrirNavegador } from "./navegador";

/**
 * O gerador de documento — `CLAUDE.md` §9: "Gerador de documento é
 * genérico. Recebe o tipo e os dados, com cabeçalho da empresa fixo e corpo
 * variando. Não escreva um gerador só para o relatório — recibo, romaneio e
 * proposta virão depois." Hoje só `"relatorio"` tem corpo implementado
 * (`corpoRelatorio.ts`); o parâmetro `tipo` já existe para quando os outros
 * chegarem, sem mudar a assinatura desta função.
 *
 * Item 7, Tarefa 2 (`docs/planos/item-7-relatorio.md`) — construída ANTES da
 * tela de montagem (Tarefa 3) de propósito: "precisa estar de pé e testada
 * antes da tela de montagem ser construída em cima dela."
 *
 * **Sem React/JSX** — achado ao medir contra o Next.js de verdade: a
 * primeira versão usava componentes React e `react-dom/server`, e o
 * `next dev` recusou importar (Server Action/Route Handler rodam sob a
 * condição `react-server`, que `react-dom/server` não suporta por desenho
 * do próprio React). `moldeDocumentoA4.ts`/`corpoRelatorio.ts` montam HTML
 * por template string; ver o comentário no topo de `moldeDocumentoA4.ts`.
 */

export type DadosDocumentoRelatorio = {
  numero: string;
  /** Já formatado — "5 de agosto de 2026" (`formatarDiaDaSemanaDataEAno` ou equivalente). */
  emissao: string;
  empresa: CabecalhoEmpresaDocumento;
  notaDeRodape: string;
  corpo: CorpoRelatorioProps;
};

/** Exportado para a prévia em tela do Documento A4 (item 7, Tarefa 3, segundo commit) montar o mesmo molde — só o servidor importa este módulo (`server-only`), então isto nunca chega ao navegador direto: quem usa é `page.tsx`, repassando como prop de texto simples. */
export const TITULO_RELATORIO = "RELATÓRIO DE SERVIÇOS";

/** Exportada para teste (`tests/documentos/gerador.test.ts`) — confere a marcação e as fontes embutidas sem precisar abrir um Chromium. */
export function montarHtmlRelatorio(dados: DadosDocumentoRelatorio): string {
  const corpo = montarMoldeDocumentoA4({
    empresa: dados.empresa,
    titulo: TITULO_RELATORIO,
    numero: dados.numero,
    emissao: dados.emissao,
    notaDeRodape: dados.notaDeRodape,
    corpoHtml: montarCorpoRelatorio(dados.corpo),
  });

  return `<!doctype html><html><head><meta charset="utf-8"><style>${estiloDeFontesEmbutidas()}</style></head><body>${corpo}</body></html>`;
}

/**
 * Página A4 a 96dpi (`docs/estilo.md` § Impresso: "794 × 1123px a 96 dpi").
 * `page.pdf({width,height})` já entende pixel CSS — não precisa converter
 * para polegada/milímetro à mão.
 */
const LARGURA_PAGINA_PX = "794px";
const ALTURA_PAGINA_PX = "1123px";

/**
 * Exportada para teste — gera o PDF sem CHAMAR o storage. **Não elimina a
 * dependência de `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`**: este arquivo
 * importa `enviarRelatorioAoStorage` (linha 4), e `armazenamento.ts` lança
 * as duas variáveis faltando **no carregamento do módulo** (`CLAUDE.md` §5,
 * "todo módulo que precisa de uma variável obrigatória falha alto") — logo
 * qualquer teste que importe `gerador.ts`, mesmo só para chamar esta função,
 * já precisa das duas definidas no ambiente. Achado do segundo `/revisar`,
 * 28/08/2026 — a versão anterior deste comentário afirmava o contrário.
 * Pula no Windows — ver `navegador.ts`.
 */
export async function imprimirPdf(html: string): Promise<Buffer> {
  const navegador = await abrirNavegador();
  try {
    const pagina = await navegador.newPage();
    // "networkidle0/2" não existe para `setContent` (só faz sentido em
    // navegação de verdade) — tudo aqui já é inline (fontes em data: URI),
    // então "load" já garante que o documento terminou de montar.
    await pagina.setContent(html, { waitUntil: "load" });
    const pdf = await pagina.pdf({
      width: LARGURA_PAGINA_PX,
      height: ALTURA_PAGINA_PX,
      // Sem isto o Chromium descarta fundo/cor de fio na impressão — o
      // documento sairia sem nenhum dos fios de `docs/estilo.md` § Impresso.
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await navegador.close();
  }
}

export type TipoDocumento = "relatorio";

/**
 * O ponto de entrada genérico. Gera o PDF e grava no storage — devolve os
 * dois: `pdf` para quem precisar dos bytes na hora (teste, por exemplo) e
 * `caminho` para quem for persistir (`Relatorio.pdf_url`, Tarefa 3).
 *
 * **Requisito explícito para a Tarefa 3, não feito aqui de propósito:**
 * `next.config.ts` precisa ganhar `outputFileTracingIncludes` para a rota
 * (Server Action ou API) que primeiro importar esta função — sem isso, o
 * binário do Chromium (`node_modules/@sparticuz/chromium/bin/chromium.br`)
 * não embarca na função publicada na Vercel (achado da medição,
 * `docs/planos/item-7-relatorio.md`). Não foi feito nesta tarefa porque a
 * chave da configuração é o CAMINHO DA ROTA que chama — e nenhuma rota
 * chama esta função ainda (Tarefa 2 é "cedo e isolada" de propósito).
 * Escrever a chave agora, apontando para um caminho que não existe, seria
 * texto que parece proteger e não protege (`CLAUDE.md` §3, mesma classe de
 * erro do `ALTER DEFAULT PRIVILEGES`). `npm test`/`npm run build` não
 * dependem dessa configuração — ela só importa no build de produção da
 * Vercel, então nada aqui esconde a lacuna localmente.
 *
 * **Requisito irmão, mesma rota — rate limit (`CLAUDE.md` §4, "toda rota
 * que gere custo... geração de PDF").** Achado do segundo `/revisar` da
 * mesma tarefa, 28/08/2026: cada chamada abre um Chromium inteiro (≈2,9s
 * frio, medição do plano) — custo real por pedido, não hipotético. Mesma
 * razão de não implementar agora (não existe rota) e mesmo lugar de
 * registro (`CLAUDE.md` §14, junto do `outputFileTracingIncludes` acima).
 */
export async function gerarDocumento(
  empresaId: string,
  tipo: TipoDocumento,
  dados: DadosDocumentoRelatorio,
): Promise<{ pdf: Buffer; caminho: string }> {
  // `tipo` só tem um valor hoje — o `switch` existe para o dia em que
  // "recibo"/"romaneio"/"proposta" chegarem (CLAUDE.md §9), não para
  // decidir nada agora.
  switch (tipo) {
    case "relatorio": {
      const html = montarHtmlRelatorio(dados);
      const pdf = await imprimirPdf(html);
      const caminho = await enviarRelatorioAoStorage(empresaId, pdf);
      return { pdf, caminho };
    }
  }
}
