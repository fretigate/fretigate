"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Botao } from "./Botao";

/**
 * Campo de texto de formulário. Rótulo `11px/1/700`, `ls .16em`,
 * maiúsculas, acima do campo; mensagem de erro `13px/1.4/500`, tinta
 * `#B3401A`, abaixo do campo, no lugar do texto de apoio; texto digitado e
 * placeholder `16–17px/600/1`. Altura `56`, raio `18`, padding lateral
 * `16`, desabilitado `#F4F1EB`/`#5C6660`.
 *
 * SEM CONTORNO — "o app não tem borda em lugar nenhum". Foco escurece o
 * fundo para `--color-principal-desabilitado` (`#E4E0D6`); erro usa
 * `--color-vencido-fundo` (`#F6E6DD`, o mesmo tom da pastilha "Vencido").
 * **A mensagem de erro abaixo do campo é obrigatória** — erro nunca é
 * sinalizado só pela cor do fundo.
 *
 * A exportação do Design de 07/08/2026 (tarefa 8, fatia 2) não trouxe mais
 * a seção que descrevia este componente em `docs/componentes.md` — os
 * valores acima vieram da versão anterior dela, e ficam registrados aqui
 * até a próxima exportação trazer a seção de volta.
 */

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Sem rótulo, o campo vira só o `placeholder` — hoje só o campo livre de
   * "Outro" na pergunta de origem. É exceção deliberada à regra "rótulo
   * acima do campo, sempre" (decisão do fundador, 07/08/2026): campo
   * secundário, revelado só depois de escolher "Outro", onde o rótulo
   * repetiria o que o chip já disse.
   */
  rotulo?: string;
  erro?: string;
  /**
   * O controle de Mostrar/Ocultar embutido — variante 03 (texto) neutra,
   * dentro do padding do campo. Só faz sentido com `type="password""`.
   * Decisão do fundador, 07/08/2026: um campo de senha só, sem "repetir a
   * senha" — "quem erra digitando erra duas vezes, e quem cola, cola nos
   * dois".
   */
  revelavel?: boolean;
};

export function CampoTexto({
  rotulo,
  erro,
  id,
  className,
  revelavel,
  type,
  ...resto
}: Props) {
  const [revelado, setRevelado] = useState(false);
  const campoId = id ?? resto.name;
  const tipoEfetivo = revelavel && type === "password" ? (revelado ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-[6px]">
      {rotulo ? (
        <label
          htmlFor={campoId}
          className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio"
        >
          {rotulo}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={campoId}
          type={tipoEfetivo}
          aria-invalid={erro ? true : undefined}
          className={[
            "h-56 w-full rounded-campo px-16 text-campo font-semibold leading-[1] text-tinta placeholder:text-tinta-apoio outline-none disabled:bg-secundario-desabilitado disabled:text-tinta-desabilitada",
            revelavel ? "pr-[76px]" : "",
            erro ? "bg-vencido-fundo" : "bg-separacao focus:bg-principal-desabilitado",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...resto}
        />
        {revelavel ? (
          <Botao
            variante="texto"
            type="button"
            onClick={() => setRevelado((valor) => !valor)}
            className="absolute right-16 top-1/2 -translate-y-1/2"
          >
            {revelado ? "Ocultar" : "Mostrar"}
          </Botao>
        ) : null}
      </div>
      {/* mensagem de erro: 13px/1.4/500 — `text-apoio` já dá 13px/1.4,
          falta o peso. */}
      {erro ? <span className="text-apoio font-medium text-vencido">{erro}</span> : null}
    </div>
  );
}
