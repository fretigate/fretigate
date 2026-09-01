"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * O miolo do upload de imagem pelo navegador — extraído de
 * `AnexarComprovante.tsx` no item 10, Tarefa 2, achado do `/revisar`
 * (segunda volta): `UploadLogo.tsx` (logo da empresa) tinha copiado o
 * mesmo `<input type="file">` escondido, a mesma limpeza de valor, o mesmo
 * `fetch`+`FormData`+tratamento de erro+`router.refresh()` — só o endpoint e
 * os rótulos mudavam (`CLAUDE.md` §8, "Proibido copiar componente"). Cada
 * chamador continua dono da própria apresentação (miniatura retangular vs.
 * círculo de avatar, rótulos, tipos aceitos) — só a orquestração é
 * compartilhada.
 */
export function useUploadDeImagem(endpoint: string) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa já aqui — sem isto, escolher o MESMO arquivo de novo depois de
    // um erro não dispara `onChange` (o navegador só notifica troca de
    // valor).
    evento.target.value = "";
    if (!arquivo) return;

    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      const resposta = await fetch(endpoint, { method: "POST", body: formData });
      const corpo: { erro?: string } | null = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.erro ?? "Não deu para enviar agora.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Não deu para enviar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return { inputRef, enviando, erro, setErro, aoEscolherArquivo };
}
