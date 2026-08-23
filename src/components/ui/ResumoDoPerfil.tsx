import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Cartão de resumo dos três perfis (Tarefa 6, item 4) — único componente,
 * reaproveitado por Cliente/Caminhão/Motorista (`CLAUDE.md` §8). Cada
 * chamador decide os números e se algum é tocável; este componente só monta
 * o cartão, o rótulo e o chip de período ao lado (`docs/estilo.md`, "Perfil
 * do cliente | nome 26px + os quatro números (17/800)" — 17/800 aqui é
 * `text-nome-linha` (17px) + `font-extrabold` (800), mesma técnica de
 * combinar token de tamanho com peso que o resto do produto já usa, não um
 * tamanho novo).
 *
 * **Número incompleto não é exibido como se fosse completo** (`CLAUDE.md`
 * §8, regra 10 de `docs/especificacao.md` §8): quando `convite` está
 * presente, ele substitui o valor — usado pelo perfil do caminhão quando o
 * período não tem km lançado.
 *
 * **O respiro vertical vive em cada célula, não no cartão por fora** —
 * achado do primeiro `/revisar` (planejamento da Tarefa 6, 22/08/2026): o
 * conteúdo de rótulo + valor sozinho mede ~34,5px (eyebrow 11px + gap 4 +
 * valor 17px/1.15), abaixo do alvo mínimo de 48px do `CLAUDE.md` §8. Um
 * `<Link>` só é tocável na própria caixa — respiro do container por fora
 * não conta. Mesmo defeito já medido e revertido no nome do cliente em
 * "Meus fretes" (`docs/navegacao.md`, "o alvo de toque do nome ficava
 * abaixo do mínimo de 48px... dentro do cartão de 78px").
 *
 * **`py-14` em cada célula, não `py-7`** — corrigido no segundo `/revisar`:
 * a primeira correção usava `py-7` (calibrado só para bater os 48px,
 * resultando em ~48,5px de célula), mas isso deixava o padding visual do
 * cartão em 7px, abaixo da faixa de 13–18px que `docs/estilo.md` (§
 * Espaçamento) define para padding interno de cartão/linha — o cartão
 * vizinho "Condição comercial", na mesma tela, usa `py-14`. `py-14` cumpre
 * as duas regras ao mesmo tempo: ~62,5px de célula (bem acima do mínimo de
 * toque) e 14px de padding (dentro da faixa documentada, mesmo valor do
 * cartão vizinho).
 */

type Numero = {
  rotulo: string;
  valor?: string;
  convite?: string;
  href?: string;
};

type Props = {
  chipPeriodo: ReactNode;
  numeros: Numero[];
  /** Nota de cobertura parcial (ex.: "3 de 5 fretes com km") — abaixo do cartão. */
  nota?: string;
};

function ConteudoDoNumero({ rotulo, valor, convite }: Numero) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      {convite ? (
        <span className="text-apoio font-medium text-tinta-apoio-forte">{convite}</span>
      ) : (
        <span className="text-nome-linha font-extrabold tabular-nums text-tinta">{valor}</span>
      )}
    </div>
  );
}

export function ResumoDoPerfil({ chipPeriodo, numeros, nota }: Props) {
  return (
    <div className="flex flex-col pt-26">
      <div className="flex items-center justify-between gap-10 px-4 pb-6">
        <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Resumo
        </span>
        {chipPeriodo}
      </div>
      <div className="flex gap-16 rounded-campo bg-separacao px-18">
        {numeros.map((numero) =>
          numero.href ? (
            <Link key={numero.rotulo} href={numero.href} className="flex min-w-0 flex-1 py-14">
              <ConteudoDoNumero {...numero} />
            </Link>
          ) : (
            <div key={numero.rotulo} className="flex min-w-0 flex-1 py-14">
              <ConteudoDoNumero {...numero} />
            </div>
          ),
        )}
      </div>
      {nota ? (
        <span className="px-4 pt-6 text-total-contextual font-medium text-tinta-apoio">
          {nota}
        </span>
      ) : null}
    </div>
  );
}
