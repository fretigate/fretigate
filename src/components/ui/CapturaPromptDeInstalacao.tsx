"use client";

// Só o efeito colateral do import importa aqui: registra o listener do
// `beforeinstallprompt` assim que este componente monta, o mais cedo
// possível na vida da página — ver `src/lib/utils/instalacao-pwa.ts` para o
// porquê de isto não poder esperar o cartão da dashboard existir.
import "@/lib/utils/instalacao-pwa";

export function CapturaPromptDeInstalacao() {
  return null;
}
