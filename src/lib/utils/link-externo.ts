"use client";

/**
 * Abre um link externo (WhatsApp, PDF do relatório) — mesma janela quando o
 * app está rodando instalado, `_blank` quando é navegador comum.
 *
 * POR QUE ISTO EXISTE: um app `standalone` (`src/app/manifest.ts`,
 * `display: "standalone"`; `apple-mobile-web-app-capable` no iOS,
 * `src/app/layout.tsx`) não tem barra de navegador nem conceito de aba —
 * é uma janela só. Pedir uma SEGUNDA janela de navegação de dentro dela
 * (`window.open(..., "_blank")`, `target="_blank"`) não tem para onde ir: o
 * iOS resolve abrindo o Safari de verdade, por fora do app instalado, para
 * hospedar essa "nova aba". É o Safari, não o app, que resolve um link
 * `https://wa.me/...` como link universal e entrega para o WhatsApp — e ao
 * voltar do WhatsApp, quem estava na frente era o Safari, não o app: o app
 * some, e junto dele qualquer estado de JavaScript (inclusive a "flag" que
 * dispara o aviso "Enviei / Ainda não" ao voltar). Achado do fundador,
 * usando o app instalado no iPhone, 12/09/2026 — `docs/diario.md`.
 *
 * A correção é navegar na MESMA janela quando standalone: a entrega para o
 * WhatsApp (ou a abertura do PDF) acontece no nível do sistema operacional
 * antes de qualquer página carregar, então a janela atual nunca "sai do
 * lugar" de verdade — só fica em segundo plano enquanto o WhatsApp está na
 * frente, e volta exatamente como estava. Em navegador comum (não
 * instalado), `_blank` continua — já funciona hoje, abrindo o WhatsApp Web
 * numa aba separada, e trocar isso sem necessidade seria mudar o que não
 * está quebrado.
 *
 * **NÃO declarado corrigido ainda** — a detecção de "está rodando
 * standalone" só se confirma num iPhone de verdade; sem aparelho, é código
 * lido, não medido (`CLAUDE.md` §2, "medido, não suposto"). Fica pendente
 * até o fundador confirmar que o app continua em pé ao voltar do WhatsApp.
 *
 * **Android é comportamento esperado, não medido.** O modelo de app
 * instalado do Android (WebAPK, tarefa própria no sistema de atividades)
 * costuma entregar o link para o WhatsApp como uma Intent nativa dentro da
 * mesma tarefa, sem o problema de "não tem para onde abrir uma segunda
 * janela" que só existe no modelo do iOS — mas isto nunca foi testado num
 * aparelho Android real. `estaEmModoStandalone()` funciona nos dois
 * sistemas (a media query `display-mode: standalone` é padrão da web,
 * `navigator.standalone` é só o reforço do Safari antigo), e a mesma
 * correção vale para os dois — mas o Android fica como pendência de teste,
 * não como suposição de que já funciona.
 */
function estaEmModoStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const legadoIOS = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return legadoIOS || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function abrirLinkExterno(url: string): void {
  if (estaEmModoStandalone()) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Uma janela (ou a janela atual, em standalone) que ainda não sabe para onde vai. */
export type JanelaExterna = {
  /** Navega para `url` agora que ela existe. */
  redirecionarPara: (url: string) => void;
  /** Fecha a aba aberta — sem efeito em standalone, que nunca abriu uma. */
  fechar: () => void;
};

/**
 * A mesma técnica de `AcaoOrdemDeServico.tsx`/`AcaoCobrarNoWhatsApp.tsx`
 * (abrir a janela ANTES do `await`, dentro da cadeia de gesto do toque,
 * porque o link do WhatsApp só existe DEPOIS que o servidor cria o
 * `Convite`) — mas com o mesmo problema de standalone destas duas: uma aba
 * `_blank` aberta agora, redirecionada para `wa.me` depois, ainda faz o
 * WebKit abrir o Safari de verdade para hospedá-la (`abrirLinkExterno`,
 * acima, explica o mecanismo completo).
 *
 * Em standalone não existe "abrir a aba antes e redirecionar depois" —
 * não tem segunda janela para abrir. Em vez disso, esta função não abre
 * nada: guarda a intenção, e quando `redirecionarPara` for chamado (depois
 * do `await`), navega a MESMA janela — sem bloqueio de pop-up para
 * evitar, porque não é `window.open`. Devolve `null` só no caminho de
 * navegador comum, quando o navegador bloqueou a aba (`window.open`
 * devolveu `null`); em standalone nunca devolve `null` — não há bloqueio de
 * pop-up para uma navegação que não abre janela nenhuma.
 */
export function prepararJanelaExterna(): JanelaExterna | null {
  if (estaEmModoStandalone()) {
    return {
      redirecionarPara: (url) => {
        window.location.href = url;
      },
      fechar: () => {},
    };
  }

  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) return null;

  return {
    redirecionarPara: (url) => {
      janela.location.href = url;
    },
    fechar: () => janela.close(),
  };
}
