"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

/**
 * Deslizar para revelar uma ação — item 6, Tarefa 3. Primeiro gesto de
 * deslizar do produto: `docs/componentes.md` já previa "deslizar revela
 * Marcar recebido" em Meus fretes e em Cobranças, mas nenhuma linha
 * deslizava ainda.
 *
 * **As duas listas abrem a mesma folha, nunca marcam na hora** — decisão do
 * fundador, 26/08/2026, ao planejar esta tarefa: `docs/navegacao.md`
 * registrava um comportamento diferente para "Meus fretes" ("marca
 * recebido na hora") e outro para "Cobranças" ("abre a folha de
 * recebimento"). Palavras do fundador: "o mesmo gesto com efeitos
 * diferentes em duas telas é pior que nome duplicado — o gesto não tem
 * rótulo, então a pessoa não tem como saber o que vai acontecer antes de
 * fazer. E o risco decide: marcar recebido na hora é gravar dinheiro por um
 * gesto que pode ser acidental (deslizar acontece rolando a lista) — e
 * desfazer seria estornar, que nem existe ainda. A folha custa pouco: vem
 * preenchida com o valor cheio e a data de hoje, então quem só quer
 * confirmar toca uma vez." Correção pedida ao Design em
 * `docs/navegacao.md` (a linha de Fretes estava errada), não lacuna.
 *
 * Painel verde (`--color-acao`) com o ícone `confirmar.svg`
 * (`docs/estilo.md`, 19×15px, traço 2.4px), atrás da linha, revelado ao
 * arrastar para a esquerda. **Largura do painel, distância de arraste e o
 * que acontece com outras linhas abertas ao mesmo tempo são escolhas de
 * engenharia**, sem medida no protótipo — pedido de confirmação visual ao
 * Design junto do resto desta tarefa.
 *
 * **Ponteiro (`PointerEvent`), não biblioteca de gestos** — o projeto não
 * tem dependência disso (`package.json`), e a interação é simples o
 * bastante (arrastar horizontal, soltar, testar limiar) para não justificar
 * uma.
 *
 * **Um toque na linha enquanto o painel está aberto fecha o painel, sem
 * navegar** — sem isto, o primeiro toque para fechar acabaria abrindo o
 * frete/cobrança por engano, exatamente o tipo de ação sem querer que a
 * decisão acima existe para evitar.
 */

const LARGURA_PAINEL = 108;
const LIMIAR_ABERTURA = LARGURA_PAINEL / 2;

type Props = {
  rotulo: string;
  onRevelar: () => void;
  children: ReactNode;
};

export function DeslizarParaRevelar({ rotulo, onRevelar, children }: Props) {
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const arraste = useRef<{ inicioX: number; inicioDeslocamento: number } | null>(null);

  function aoIniciar(evento: PointerEvent<HTMLDivElement>) {
    arraste.current = { inicioX: evento.clientX, inicioDeslocamento: deslocamento };
    setArrastando(true);
  }

  function aoMover(evento: PointerEvent<HTMLDivElement>) {
    if (!arraste.current) return;
    const delta = evento.clientX - arraste.current.inicioX;
    const proximo = Math.min(0, Math.max(-LARGURA_PAINEL, arraste.current.inicioDeslocamento + delta));
    setDeslocamento(proximo);
  }

  function aoSoltar() {
    if (!arraste.current) return;
    arraste.current = null;
    setArrastando(false);
    setDeslocamento((atual) => (atual <= -LIMIAR_ABERTURA ? -LARGURA_PAINEL : 0));
  }

  function tocarPainel() {
    setDeslocamento(0);
    onRevelar();
  }

  return (
    <div className="relative overflow-hidden rounded-linha">
      <button
        type="button"
        onClick={tocarPainel}
        aria-label={rotulo}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-4 bg-acao text-white"
        style={{ width: LARGURA_PAINEL }}
      >
        <svg width={19} height={15} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.516 12.095 9.537 17.116 19.485 6.979"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-bold leading-[1]">{rotulo}</span>
      </button>
      <div
        onPointerDown={aoIniciar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onClickCapture={(evento) => {
          // Fecha em vez de navegar — ver o comentário acima.
          if (deslocamento !== 0) {
            evento.preventDefault();
            evento.stopPropagation();
            setDeslocamento(0);
          }
        }}
        style={{
          transform: `translateX(${deslocamento}px)`,
          touchAction: "pan-y",
        }}
        className={`relative ${arrastando ? "" : "transition-transform duration-150"}`}
      >
        {children}
      </div>
    </div>
  );
}
