"use client";

/**
 * Guarda o `beforeinstallprompt` fora do React, num módulo só — não dentro
 * do cartão da dashboard. O evento dispara **uma vez por carregamento de
 * página**, não uma vez por montagem de componente: se o registro morasse
 * só no cartão, ele perderia o evento sempre que o login acontecesse numa
 * página diferente da dashboard (`/entrar`) — o App Router não recarrega o
 * layout raiz na navegação entre as duas, mas também não teria como
 * "religar" um evento que já passou antes do cartão existir. Por isso o
 * registro entra uma vez só, pelo layout raiz (`CapturaPromptDeInstalacao`),
 * antes de qualquer navegação para a dashboard acontecer.
 */

export interface EventoAntesDeInstalar extends Event {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let promptGuardado: EventoAntesDeInstalar | null = null;
// `display-mode: standalone` só é `true` numa janela nova, aberta depois de
// instalar — a aba onde a pessoa tocou "instalar" continua no navegador.
// `appinstalled` é o único sinal de que a instalação aconteceu **nesta
// aba**, na mesma sessão.
let instaladoNestaSessao = false;
const ouvintes = new Set<() => void>();

function notificar() {
  for (const ouvinte of ouvintes) ouvinte();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    promptGuardado = evento as EventoAntesDeInstalar;
    notificar();
  });
  window.addEventListener("appinstalled", () => {
    promptGuardado = null;
    instaladoNestaSessao = true;
    notificar();
  });
}

export function assinarPromptDeInstalacao(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function obterPromptDeInstalacao() {
  return promptGuardado;
}

export function obterInstaladoNestaSessao() {
  return instaladoNestaSessao;
}
