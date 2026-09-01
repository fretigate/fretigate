"use client";

import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { useUploadDeImagem } from "@/lib/utils/useUploadDeImagem";

/**
 * Pílula em linha para anexar comprovante — detalhe do frete, entre os
 * campos e o bloco de ações (item 5, Tarefa 5,
 * `docs/planos/item-5-ordem-de-servico.md`; posição já definida em
 * `docs/componentes.md`: "campos → comprovante → ações, sem lista
 * depois"). **Desenho de dentro da pílula sem folha própria no Design
 * ainda** — lacuna registrada no plano ("O que precisa chegar ao Design").
 * Construído com o mais próximo que já existe: `PilulaEmLinha`, com um
 * `<input type="file">` nativo por trás, escondido — é a folha do próprio
 * sistema (câmera/galeria) quem decide como escolher a foto, não este
 * componente.
 *
 * A orquestração do envio (limpeza do `<input>`, `fetch`, erro,
 * `router.refresh()`) mora em `useUploadDeImagem` (`src/lib/utils/
 * useUploadDeImagem.ts`), extraída no item 10, Tarefa 2 quando
 * `UploadLogo.tsx` (logo da empresa) virou o segundo caso de uso do mesmo
 * mecanismo — achado do `/revisar`, `CLAUDE.md` §8 ("Proibido copiar
 * componente").
 *
 * `urlAssinada` vem do servidor (`gerarUrlComprovante`,
 * `src/lib/servicos/comprovantes.ts`), gerada de novo a cada carregamento
 * da página — expira em 60s (tempo só de a tela carregar a imagem, decisão
 * do fundador registrada no comentário daquela função). O `<img>` já
 * carregado continua visível depois da expiração; só recarregar a MESMA URL
 * falharia, e nada aqui tenta isso — o próximo carregamento da tela pede
 * uma URL nova.
 *
 * Sem `capture` no `<input>` — achado do `/revisar`: `capture="environment"`
 * força a câmera, mas o comprovante já existe como foto na galeria (o
 * motorista manda pelo WhatsApp, o dono anexa aqui — `docs/especificacao.md`
 * §4.2). Quem escolhe entre câmera e galeria é a folha nativa do sistema,
 * como o comentário acima já dizia — o `capture` da versão anterior
 * contrariava a própria frase.
 *
 * `h-180` na miniatura é **provisório, registrado como lacuna para o
 * Design** (decisão do fundador, 25/08/2026): `docs/estilo.md` não define
 * altura de imagem — nenhum valor aqui é "do sistema" ainda. O mesmo
 * pedido cobre a outra pendência da peça, junto: se a miniatura deve
 * recortar (`object-cover`, como está) ou mostrar a foto inteira, e se deve
 * abrir em tamanho cheio ao tocar — nenhuma das duas está decidida.
 */

type Props = {
  servicoId: string;
  urlAssinada: string | null;
};

const TIPOS_ACEITOS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function AnexarComprovante({ servicoId, urlAssinada }: Props) {
  const { inputRef, enviando, erro, setErro, aoEscolherArquivo } = useUploadDeImagem(
    `/api/fretes/${servicoId}/comprovante`,
  );

  return (
    <div className="flex flex-col gap-10">
      {urlAssinada ? (
        // URL assinada externa e temporária (60s) — não é um recurso do
        // próprio domínio para o next/image otimizar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlAssinada}
          alt="Comprovante do frete"
          className="h-180 w-full rounded-campo bg-separacao object-cover"
        />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS}
        hidden
        onChange={aoEscolherArquivo}
      />
      <PilulaEmLinha carregando={enviando} onClick={() => inputRef.current?.click()}>
        {urlAssinada ? "Trocar comprovante" : "Anexar comprovante"}
      </PilulaEmLinha>
      {erro ? <AvisoDoSistema mensagem={erro} onSumir={() => setErro(null)} /> : null}
    </div>
  );
}
