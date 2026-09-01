"use client";

import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { useUploadDeImagem } from "@/lib/utils/useUploadDeImagem";

/**
 * Upload da logo — Conta da empresa (item 10, Tarefa 2). A orquestração do
 * envio (limpeza do `<input>`, `fetch`, erro, `router.refresh()`) mora em
 * `useUploadDeImagem` (`src/lib/utils/useUploadDeImagem.ts`), a mesma que
 * `AnexarComprovante.tsx` usa — extraída nesta tarefa, achado do `/revisar`
 * (segunda volta): a primeira versão deste arquivo tinha copiado o mecanismo
 * inteiro (`CLAUDE.md` §8, "Proibido copiar componente"). Sem `capture` no
 * `<input>`, mesma razão de `AnexarComprovante.tsx` — a folha nativa do
 * sistema decide câmera ou galeria.
 *
 * Círculo 56px — `docs/componentes.md`, "Iniciais da empresa": "Círculo: ...
 * 56px em Conta e no convite". `urlAssinada` vem de `gerarUrlLogo`
 * (`src/lib/servicos/logo.ts`), 60s de validade — mesma razão da URL do
 * comprovante: só precisa durar o tempo de a tela carregar a imagem.
 */

type Props = {
  urlAssinada: string | null;
  iniciais: string;
};

const TIPOS_ACEITOS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function UploadLogo({ urlAssinada, iniciais }: Props) {
  const { inputRef, enviando, erro, setErro, aoEscolherArquivo } = useUploadDeImagem("/api/conta/logo");

  return (
    <div className="flex items-center gap-14">
      {urlAssinada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlAssinada}
          alt="Logo da empresa"
          className="h-56 w-56 flex-none rounded-pilula bg-separacao object-cover"
        />
      ) : (
        <div className="flex h-56 w-56 flex-none items-center justify-center rounded-pilula bg-acao text-[16px] font-bold tracking-[.02em] text-white">
          {iniciais}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS}
        hidden
        onChange={aoEscolherArquivo}
      />
      <PilulaEmLinha carregando={enviando} onClick={() => inputRef.current?.click()}>
        {urlAssinada ? "Trocar logo" : "Adicionar logo"}
      </PilulaEmLinha>
      {erro ? <AvisoDoSistema mensagem={erro} onSumir={() => setErro(null)} /> : null}
    </div>
  );
}
