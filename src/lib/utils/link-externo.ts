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
export function estaEmModoStandalone(): boolean {
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

/**
 * O que aconteceu quando o link ficou pronto: `"navegou"` (a janela que já
 * estava aberta foi para o endereço) ou `"precisa-de-toque"` (não havia
 * janela para navegar — quem chamou precisa mostrar o segundo toque, com o
 * link pronto, ver `BotaoContinuarExterno`).
 */
export type ResultadoDoRedirecionamento = "navegou" | "precisa-de-toque";

/** Uma janela que ainda não sabe para onde vai — ou a falta dela. */
export type JanelaExterna = {
  /** Navega a janela para `url` agora que o link existe, se houver janela. */
  redirecionarPara: (url: string) => ResultadoDoRedirecionamento;
  /** Fecha a aba aberta — sem efeito quando não havia aba. */
  fechar: () => void;
};

const SEM_JANELA: JanelaExterna = {
  redirecionarPara: () => "precisa-de-toque",
  fechar: () => {},
};

/**
 * Para o link que só existe DEPOIS de o servidor responder (convite, checkout
 * — o token é gerado lá, nunca no cliente). Chamada dentro do gesto do toque,
 * antes do `await`.
 *
 * **Navegador comum:** abre uma aba em branco agora e a redireciona depois —
 * um toque só. **Sem `noopener` de propósito**: com `noopener`,
 * `window.open` devolve sempre `null` mas abre a aba mesmo assim, e sem a
 * janela nas mãos não há como redirecioná-la — sobrava uma aba `about:blank`
 * para sempre (medido, Chrome, 19/09/2026,
 * `docs/planos/corrige-link-externo-segundo-toque.md`). O que o `noopener`
 * protege — a página de fora sequestrar a aba do app por `window.opener` —
 * é mantido cortando o vínculo à mão, `opener = null`, ainda em branco e
 * antes de navegar (medido: a página de fora enxerga `opener` nulo).
 * **O que se perde, sabendo:** o destino recebe o domínio de origem (o
 * `noreferrer` deixa de valer nesse caminho) e a aba não fica isolada num
 * grupo de contexto separado (não medido).
 *
 * **Falha fechada:** só o Chrome de computador foi medido. Se, depois de
 * cortar, `opener` ainda não for `null` (um navegador que não respeite),
 * a aba é fechada e o caminho vira segundo toque — nunca se navega para site
 * de terceiro com a ligação viva.
 *
 * **App instalado:** não abre nada. Navegar a mesma janela depois do
 * `await` não é toque para o iOS — o segundo toque, com o link pronto, é o
 * caminho (`abrirLinkExterno`, acima, explica por que também não se abre uma
 * segunda janela). **Não medido no iPhone.**
 *
 * **Navegador que bloqueou a aba** (`window.open` devolveu `null` de
 * verdade, agora que o `noopener` não o causa mais): também segundo toque.
 */
export function prepararJanelaExterna(): JanelaExterna {
  if (estaEmModoStandalone()) return SEM_JANELA;

  const janela = window.open("", "_blank");
  if (!janela) return SEM_JANELA;

  janela.opener = null;
  if (janela.opener !== null) {
    janela.close();
    return SEM_JANELA;
  }

  return {
    redirecionarPara: (url) => {
      janela.location.href = url;
      return "navegou";
    },
    fechar: () => janela.close(),
  };
}
