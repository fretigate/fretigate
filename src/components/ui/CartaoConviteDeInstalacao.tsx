"use client";

import { useState, useSyncExternalStore } from "react";
import { useMontadoNoCliente } from "@/lib/utils/montado";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import {
  assinarPromptDeInstalacao,
  obterInstaladoNestaSessao,
  obterPromptDeInstalacao,
} from "@/lib/utils/instalacao-pwa";

/**
 * Item 18, Tarefa 2 (`docs/planos/pwa-instalavel-e-convite-de-instalacao.md`,
 * Decisão 2) — primeiro uso real da família FretiNews (`docs/componentes.md`
 * 08, `docs/estilo.md` § Família FretiNews), antes mesmo de Novidades
 * existir. Só entra na dashboard, no lugar já reservado a ela
 * (`docs/componentes.md`, linha da tabela "Dashboard").
 *
 * Só aparece quando (a) o app não está instalado — checado sem adivinhar,
 * pelos três sinais que não dependem um do outro (`display-mode: standalone`
 * cobre os dois sistemas quando a janela já abre instalada;
 * `navigator.standalone` é a confirmação própria do iOS; `appinstalled`
 * cobre instalar **durante esta mesma aba**, caso em que os dois primeiros
 * continuam falsos — a aba onde se tocou instalar não vira standalone
 * sozinha) — e (b) a pessoa não dispensou antes **neste aparelho**
 * (`localStorage` — decisão do fundador: preferência de interface, não regra
 * de negócio, então a dispensa não atravessa aparelho).
 *
 * **Sem `useEffect` para detectar o ambiente** — mesmo motivo de
 * `useMontadoNoCliente` (`src/lib/utils/montado.ts`): o lint
 * `react-hooks/set-state-in-effect` recusa `setState` direto no corpo de um
 * efeito. As leituras de `window` abaixo são derivadas durante a
 * renderização, guardadas por `montado`, não por um efeito.
 *
 * **Raio, tipografia e o respiro reservado ao × sem confirmação do Design**
 * — mesma lacuna já registrada em `docs/estilo.md` § Formas para o cartão de
 * resumo do perfil e a miniatura de comprovante: usa `rounded-campo` (18px) e
 * o par rótulo/título/apoio de `LinhaDePendencia`, os precedentes mais
 * próximos (mesmo cartão informativo, vizinho dele na própria dashboard), não
 * valores novos inventados. Ver `docs/estilo.md` para o registro completo,
 * inclusive o `pr-56` abaixo — reserva de espaço para o × (48px de alvo de
 * toque, `CLAUDE.md` §8) mais 8px de respiro (escala de espaçamento), não um
 * terceiro valor solto.
 */

const CHAVE_DISPENSA = "fretigate:convite-instalacao:dispensado";

export function CartaoConviteDeInstalacao() {
  const montado = useMontadoNoCliente();
  const [dispensadoNestaSessao, setDispensadoNestaSessao] = useState(false);
  const [aguardandoRespostaDoUsuario, setAguardandoRespostaDoUsuario] = useState(false);
  const promptDeInstalacao = useSyncExternalStore(
    assinarPromptDeInstalacao,
    obterPromptDeInstalacao,
    () => null,
  );
  const instaladoNestaSessao = useSyncExternalStore(
    assinarPromptDeInstalacao,
    obterInstaladoNestaSessao,
    () => false,
  );

  if (!montado) return null;

  const janelaJaInstalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  if (janelaJaInstalada || instaladoNestaSessao) return null;

  let dispensadoNoAparelho = false;
  try {
    dispensadoNoAparelho = window.localStorage.getItem(CHAVE_DISPENSA) === "1";
  } catch {
    // localStorage indisponível (aba privada, bloqueio de terceiros) —
    // trata como não dispensado. É preferência de interface, não regra de
    // negócio (ver comentário acima): falhar mostrando o convite é o lado
    // seguro, nunca o contrário.
  }
  if (dispensadoNoAparelho || dispensadoNestaSessao) return null;

  const ua = window.navigator.userAgent;
  const ehIOS = /iphone|ipad|ipod/i.test(ua);
  const ehAndroid = /android/i.test(ua);

  const mostrarAndroid = ehAndroid && promptDeInstalacao !== null;
  const mostrarIOS = ehIOS;
  if (!mostrarAndroid && !mostrarIOS) return null;

  function aoDispensar() {
    try {
      window.localStorage.setItem(CHAVE_DISPENSA, "1");
    } catch {
      // Mesma tolerância da leitura acima — sem `localStorage`, a dispensa
      // só vale para esta sessão (o componente já sai do DOM pelo estado).
    }
    setDispensadoNestaSessao(true);
  }

  async function aoTocarInstalar() {
    const evento = promptDeInstalacao;
    if (!evento) return;
    setAguardandoRespostaDoUsuario(true);
    try {
      await evento.prompt();
      // O resultado (`accepted`/`dismissed`) não muda nada aqui — quem
      // decide que instalou de verdade é `appinstalled`
      // (`instalacao-pwa.ts`), não a resposta do diálogo. Se `dismissed`,
      // cancelar não é dispensar (decisão do fundador): o mesmo evento
      // guardado continua servindo pra um novo toque, e o cartão inteiro
      // (não só o botão) continua na tela.
      await evento.userChoice;
    } finally {
      setAguardandoRespostaDoUsuario(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-10 rounded-campo bg-fretinews-fundo py-16 pl-18 pr-56">
      <button
        type="button"
        aria-label="Dispensar"
        onClick={aoDispensar}
        className="absolute right-0 top-0 flex h-48 w-48 items-center justify-center text-fretinews-apoio"
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6 18 18M18 6 6 18" />
        </svg>
      </button>

      <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-fretinews-apoio">
        FretiNews
      </span>
      <span className="text-nome-recolhida font-bold text-fretinews-titulo">
        Instale o FretiGate no aparelho
      </span>

      {mostrarAndroid ? (
        <>
          <span className="text-apoio font-medium text-fretinews-apoio">
            Abre direto da tela de início, sem passar pelo navegador.
          </span>
          <PilulaEmLinha
            onClick={aoTocarInstalar}
            carregando={aguardandoRespostaDoUsuario}
            className="w-fit"
          >
            Instalar o FretiGate
          </PilulaEmLinha>
        </>
      ) : (
        <span className="text-apoio font-medium text-fretinews-apoio">
          Toque em{" "}
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="inline -translate-y-1"
            aria-hidden="true"
          >
            <path d="M12 14.5V3.2M8.2 7.5 12 3.7l3.8 3.8M5.7 16.86v0.9a0.9 0.9 0 0 0 0.9 0.9h10.8a0.9 0.9 0 0 0 0.9-0.9v-0.9" />
          </svg>{" "}
          Compartilhar e, em seguida, em &quot;Adicionar à Tela de Início&quot;.
        </span>
      )}
    </div>
  );
}
