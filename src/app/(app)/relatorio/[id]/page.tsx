import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarRelatorio, buscarDadosParaPreviaDocumento, gerarUrlRelatorio } from "@/lib/servicos/relatorios";
import { montarMoldeDocumentoA4 } from "@/lib/documentos/moldeDocumentoA4";
import { montarCorpoRelatorio } from "@/lib/documentos/corpoRelatorio";
import { TITULO_RELATORIO } from "@/lib/documentos/gerador";
import { TelaDocumentoRelatorio } from "./TelaDocumentoRelatorio";

/**
 * Documento A4 (item 7, Tarefa 3, segundo commit —
 * `docs/especificacao.md` §4.4, `docs/planos/item-7-relatorio.md`).
 *
 * **A mesma marcação do gerador** (`docs/documentos/gerador.ts`), montada
 * de novo aqui — nunca duas implementações do mesmo desenho (`CLAUDE.md`
 * §8). O HTML sai igual ao que virou PDF (mesmas funções,
 * `montarMoldeDocumentoA4`/`montarCorpoRelatorio`); só não embute as fontes
 * em `data:` URI (isso é só para o Chromium isolado do gerador, sem rede) —
 * o navegador já carrega Archivo/Azeret Mono normalmente, como em qualquer
 * outra tela do produto.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const [relatorio, dadosDocumento] = await Promise.all([
    buscarRelatorio(sessao.empresaId, id),
    buscarDadosParaPreviaDocumento(sessao.empresaId, id),
  ]);
  if (!relatorio || !dadosDocumento) notFound();

  const corpoHtml = montarMoldeDocumentoA4({
    empresa: dadosDocumento.empresa,
    titulo: TITULO_RELATORIO,
    numero: dadosDocumento.numero,
    emissao: dadosDocumento.emissao,
    notaDeRodape: dadosDocumento.notaDeRodape,
    corpoHtml: montarCorpoRelatorio(dadosDocumento.corpo),
  });

  // `pdf_url` nasce nulo só entre `criarRelatorio` e o gerador terminar
  // (mesma transação de `gerarRelatorio` — hoje inalcançável nesta tela,
  // que só existe depois de `gerarRelatorioAction` retornar com sucesso).
  const urlPdf = relatorio.pdf_url ? await gerarUrlRelatorio(sessao.empresaId, id) : null;

  return (
    <TelaDocumentoRelatorio
      clienteNome={dadosDocumento.corpo.cliente}
      numero={dadosDocumento.numero}
      corpoHtml={corpoHtml}
      urlPdf={urlPdf}
      hrefVoltar={`/relatorio?cliente=${relatorio.cliente_id}`}
    />
  );
}
