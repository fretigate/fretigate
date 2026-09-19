import { afterEach, describe, expect, it, vi } from "vitest";
import { prepararJanelaExterna } from "@/lib/utils/link-externo";

/**
 * `prepararJanelaExterna` — os quatro caminhos, com uma janela falsa
 * (`docs/planos/corrige-link-externo-segundo-toque.md`).
 *
 * **O que este arquivo prova, e o que não prova.** Prova a **lógica de
 * decisão**: o que o mecanismo pede ao navegador, o que ele devolve, e que
 * ele nunca navega para site de terceiro com a janela ainda ligada ao app.
 * **Não prova o comportamento do navegador.** O defeito que motivou o plano —
 * `window.open` com `noopener` devolve `null` mas abre a aba — é de navegador
 * de verdade, e foi medido à mão no Chrome (19/09/2026), com o código real
 * empacotado; uma janela falsa nunca reproduziria isso. O que este teste
 * segura é o outro lado: que o código não volte a pedir `noopener` (a
 * chamada tem que ser exatamente `("", "_blank")`) e que a guarda de falha
 * fechada continue existindo. Nenhum teste aqui mede o app instalado do
 * iPhone — só o fundador consegue.
 *
 * **Sensibilidade medida, não suposta:** com a guarda removida de
 * `link-externo.ts`, o teste "corte que não pega" reprova; com `noopener`
 * de volta na chamada, "navegador comum" reprova (as duas mutações foram
 * feitas à mão e revertidas em 19/09/2026).
 */

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 6;

type JanelaFalsa = {
  opener: unknown;
  location: { href: string };
  close: ReturnType<typeof vi.fn>;
};

/** Como vem de `window.open("", "_blank")`: ligada a quem abriu, e o vínculo pode ser cortado. */
function janelaComum(): JanelaFalsa {
  return { opener: { dono: "app" }, location: { href: "about:blank" }, close: vi.fn() };
}

/** Um navegador que ignora `opener = null` — o setter existe e não faz nada. */
function janelaQueIgnoraOCorte(): JanelaFalsa {
  const janela = { location: { href: "about:blank" }, close: vi.fn() } as JanelaFalsa;
  Object.defineProperty(janela, "opener", { get: () => ({ dono: "app" }), set: () => {} });
  return janela;
}

function instalarWindow(opcoes: {
  standaloneLegadoIOS?: boolean;
  standaloneMediaQuery?: boolean;
  janela: JanelaFalsa | null;
}) {
  const abrir = vi.fn(() => opcoes.janela);
  vi.stubGlobal("window", {
    open: abrir,
    navigator: { standalone: opcoes.standaloneLegadoIOS === true },
    matchMedia: () => ({ matches: opcoes.standaloneMediaQuery === true }),
  });
  return abrir;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prepararJanelaExterna", () => {
  it("navegador comum: abre sem noopener, corta o vínculo ANTES de navegar, depois navega", () => {
    const janela = janelaComum();
    const abrir = instalarWindow({ janela });

    const preparada = prepararJanelaExterna();

    // Exatamente estes dois argumentos — um terceiro (`"noopener,…"`) faria o
    // navegador devolver `null` e deixar a aba em branco para sempre.
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith("", "_blank");
    // O corte acontece na preparação, antes de qualquer `await` do chamador.
    expect(janela.opener).toBeNull();
    expect(janela.location.href).toBe("about:blank");

    const resultado = preparada.redirecionarPara("https://pay.exemplo.com/plano");

    expect(resultado).toBe("navegou");
    expect(janela.location.href).toBe("https://pay.exemplo.com/plano");
    conferencias++;
  });

  it("navegador comum: fechar() fecha a aba que foi aberta", () => {
    const janela = janelaComum();
    instalarWindow({ janela });

    prepararJanelaExterna().fechar();

    expect(janela.close).toHaveBeenCalledTimes(1);
    conferencias++;
  });

  it("app instalado (navigator.standalone): não abre nada e pede o segundo toque", () => {
    const abrir = instalarWindow({ standaloneLegadoIOS: true, janela: janelaComum() });

    const preparada = prepararJanelaExterna();

    expect(abrir).not.toHaveBeenCalled();
    expect(preparada.redirecionarPara("https://pay.exemplo.com/plano")).toBe("precisa-de-toque");
    expect(() => preparada.fechar()).not.toThrow();
    conferencias++;
  });

  it("app instalado (media query display-mode): mesmo caminho", () => {
    const abrir = instalarWindow({ standaloneMediaQuery: true, janela: janelaComum() });

    const preparada = prepararJanelaExterna();

    expect(abrir).not.toHaveBeenCalled();
    expect(preparada.redirecionarPara("https://pay.exemplo.com/plano")).toBe("precisa-de-toque");
    conferencias++;
  });

  it("aba bloqueada pelo navegador: pede o segundo toque, sem navegar nada", () => {
    const abrir = instalarWindow({ janela: null });

    const preparada = prepararJanelaExterna();

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(preparada.redirecionarPara("https://pay.exemplo.com/plano")).toBe("precisa-de-toque");
    expect(() => preparada.fechar()).not.toThrow();
    conferencias++;
  });

  it("corte que não pega: fecha a aba e NÃO navega para site de terceiro com a ligação viva", () => {
    const janela = janelaQueIgnoraOCorte();
    instalarWindow({ janela });

    const preparada = prepararJanelaExterna();
    const resultado = preparada.redirecionarPara("https://pay.exemplo.com/plano");

    expect(resultado).toBe("precisa-de-toque");
    expect(janela.close).toHaveBeenCalledTimes(1);
    // A prova que importa: a aba nunca saiu do `about:blank` de origem.
    expect(janela.location.href).toBe("about:blank");
    conferencias++;
  });
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
