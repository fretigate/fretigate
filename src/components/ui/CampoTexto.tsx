import type { InputHTMLAttributes } from "react";

/**
 * Campo de texto de formulário — especificação do Design em
 * `docs/componentes.md` § "12 — Campo de texto" (exportação commitada junto
 * com esta tarefa). Rótulo `11px/1/700`, `ls .16em`, maiúsculas, acima do
 * campo; mensagem de erro `13px/1.4/500`, tinta `#B3401A`, abaixo do campo,
 * no lugar do texto de apoio; texto digitado e placeholder `16–17px/600/1`.
 * Altura 56–60 (conflito 1, sem decisão — aqui 56), raio `18`, padding
 * lateral `16`, desabilitado `#F4F1EB`/`#5C6660`.
 *
 * SEM CONTORNO — "o app não tem borda em lugar nenhum" (mesmo documento).
 * Foco e erro eram os conflitos 2 e 3; RESOLVIDOS em 07/08/2026 com os
 * valores que a própria nota do Design já propunha: foco escurece o fundo
 * para `--color-principal-desabilitado` (`#E4E0D6`, o pressionado da família
 * de neutros — nenhuma cor nova); erro usa `--color-vencido-fundo`
 * (`#F6E6DD`, o mesmo tom da pastilha "Vencido"). **A mensagem de erro
 * abaixo do campo é obrigatória** — erro nunca é sinalizado só pela cor do
 * fundo. Conferido campo a campo contra a especificação do Design depois
 * dela chegar: uma diferença encontrada e corrigida (fundo do desabilitado
 * não estava definido; agora é `--color-secundario-desabilitado`).
 */

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Sem rótulo, o campo vira só o `placeholder` — hoje só o campo livre de
   * "Outro" na pergunta de origem. É exceção deliberada à regra "rótulo
   * acima do campo, sempre" de `docs/componentes.md` (decisão do fundador,
   * 07/08/2026): campo secundário, revelado só depois de escolher "Outro",
   * onde o rótulo repetiria o que o chip já disse.
   */
  rotulo?: string;
  erro?: string;
};

export function CampoTexto({ rotulo, erro, id, className, ...resto }: Props) {
  const campoId = id ?? resto.name;

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
      <input
        id={campoId}
        aria-invalid={erro ? true : undefined}
        className={[
          "h-56 rounded-campo px-16 text-campo font-semibold leading-[1] text-tinta placeholder:text-tinta-apoio outline-none disabled:bg-secundario-desabilitado disabled:text-tinta-desabilitada",
          erro ? "bg-vencido-fundo" : "bg-separacao focus:bg-principal-desabilitado",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...resto}
      />
      {/* docs/componentes.md "Rótulo, apoio e erro": mensagem de erro é
          13px/1.4/500 — `text-apoio` já dá 13px/1.4, falta o peso. */}
      {erro ? <span className="text-apoio font-medium text-vencido">{erro}</span> : null}
    </div>
  );
}
