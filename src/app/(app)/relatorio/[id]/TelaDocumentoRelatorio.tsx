"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CabecalhoDeDetalhe } from "@/components/ui/CabecalhoDeDetalhe";
import { Botao } from "@/components/ui/Botao";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";

/**
 * Documento A4 (item 7, Tarefa 3, segundo commit) —
 * `docs/especificacao.md` §4.4: "Ações: Compartilhar no WhatsApp
 * (principal) · Baixar PDF · Imprimir."
 *
 * `corpoHtml` já vem pronto do servidor (`page.tsx`, mesma marcação do
 * gerador) — este componente só desenha a escala (`scale(0.466)`,
 * `docs/estilo.md` § Impresso) e as três ações.
 */

type Props = {
  clienteNome: string;
  numero: string;
  corpoHtml: string;
  /** `null` só na janela improvável entre criar o relatório e o PDF terminar de gerar — hoje inalcançável (a tela só existe depois de `gerarRelatorioAction` ter sucesso). */
  urlPdf: string | null;
  /** `/relatorio?cliente=X` — volta pra montagem com o mesmo cliente, não a tela zerada. */
  hrefVoltar: string;
};

const LARGURA_A4 = 794;
const ALTURA_A4 = 1123;
const ESCALA = 0.466;

export function TelaDocumentoRelatorio({ clienteNome, numero, corpoHtml, urlPdf, hrefVoltar }: Props) {
  const searchParams = useSearchParams();
  const [compartilhando, setCompartilhando] = useState(false);
  // `?semPix=1` chega da tela de montagem (`gerarDeVerdade`, achado do
  // segundo `/revisar`): o aviso de sucesso-sem-chave precisa sobreviver à
  // navegação, e `setState` na tela que a navegação abandona não sobrevive.
  // Lido uma vez, na primeira renderização — `searchParams` não muda depois
  // que esta tela monta.
  const [aviso, setAviso] = useState<string | null>(() =>
    searchParams.get("semPix") === "1" ? "Relatório gerado sem a chave Pix." : null,
  );

  function nomeArquivo(): string {
    return `relatorio-${numero}-${clienteNome.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  }

  /**
   * `<a download>` sozinho não funciona aqui — achado do segundo `/revisar`:
   * `urlPdf` é um link assinado do Supabase, de outra origem, e o navegador
   * ignora o atributo `download` fora da própria origem (ele só navega para
   * o PDF em vez de baixar). Busca o arquivo como blob e baixa a partir de
   * uma URL de objeto, que é sempre da própria origem — mesma técnica que
   * `compartilhar` já usa para montar o `File` do compartilhamento nativo.
   */
  async function baixarBlob(bytes: Blob) {
    const url = URL.createObjectURL(bytes);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo();
    link.rel = "noopener";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function baixar() {
    if (!urlPdf) return;
    const resposta = await fetch(urlPdf);
    await baixarBlob(await resposta.blob());
  }

  function imprimir() {
    if (!urlPdf) return;
    window.open(urlPdf, "_blank", "noopener,noreferrer");
  }

  async function compartilhar() {
    if (!urlPdf) return;
    setCompartilhando(true);
    try {
      const resposta = await fetch(urlPdf);
      const bytes = await resposta.blob();
      const arquivo = new File([bytes], nomeArquivo(), { type: "application/pdf" });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: `Relatório nº ${numero}` });
      } else {
        await baixarBlob(bytes);
        setAviso("Seu navegador não compartilha arquivo direto — o PDF foi baixado.");
      }
    } catch (erro) {
      // Cancelar o compartilhamento nativo não é erro.
      if (erro instanceof Error && erro.name === "AbortError") return;
      await baixar();
      setAviso("Não deu para compartilhar agora — o PDF foi baixado.");
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <CabecalhoDeDetalhe href={hrefVoltar} rotulo={`${clienteNome} · Relatório nº ${numero}`} />

      <div className="flex flex-1 flex-col items-center gap-22 px-16">
        <div
          className="flex-none overflow-hidden bg-white"
          style={{ width: LARGURA_A4 * ESCALA, height: ALTURA_A4 * ESCALA }}
        >
          <div
            style={{ width: LARGURA_A4, transform: `scale(${ESCALA})`, transformOrigin: "top left" }}
            // A mesma marcação do gerador de PDF (`page.tsx`) — o HTML já vem
            // pronto e escapado (`escaparHtml`, `moldeDocumentoA4.ts`/
            // `corpoRelatorio.ts`), nunca dado do usuário direto aqui.
            dangerouslySetInnerHTML={{ __html: corpoHtml }}
          />
        </div>

        <div className="flex w-full max-w-[370px] flex-col gap-10">
          <Botao variante="principal" carregando={compartilhando} onClick={compartilhar} distribuido>
            Compartilhar no WhatsApp
          </Botao>
          <div className="flex gap-10">
            <div className="flex-1">
              <Botao variante="secundaria" onClick={baixar}>
                Baixar PDF
              </Botao>
            </div>
            <div className="flex-1">
              <Botao variante="secundaria" onClick={imprimir}>
                Imprimir
              </Botao>
            </div>
          </div>
        </div>
      </div>

      {aviso ? <AvisoDoSistema mensagem={aviso} onSumir={() => setAviso(null)} /> : null}
    </main>
  );
}
