import type { SituacaoFinanceira } from "@/lib/servicos/titulos";

/**
 * Etiqueta de situação financeira — `docs/estilo.md`, "Etiqueta de
 * situação" (10.5px/700/`.1em` maiúsculas, único valor para as quatro,
 * "incluindo Parcial — que mantém o fundo próprio (`#FBF1DF`), só igualou a
 * tipografia"). A faturar e Quitado usam token de cor já existente em
 * `globals.css` (`--color-a-faturar`, `--color-acao` — docs/estilo.md:
 * "...tinta de link/valor 'Quitado'"). Faturado reaproveita
 * `--color-tinta-apoio` (`#6E7770`) como placeholder — decisão do fundador,
 * item 4 Tarefa 1: "o protótipo usar neutra é sinal de que o estado não foi
 * pensado", cor própria pedida ao Design.
 *
 * O protótipo de referência (`referencia/.../Tela 2 e 3 - Dashboard e Meus
 * fretes.dc.html`) lista "Parcial" em `#B3401A` nesta tela — diferente do
 * par `--color-parcial-apoio`/`--color-parcial-fundo` que `docs/estilo.md`
 * define como regra geral (a frase acima, "incluindo Parcial"). Sigo a
 * regra escrita (`CLAUDE.md` §13: protótipo é evidência corroborante,
 * nunca autoridade, quando em conflito com o documento) — pedido de
 * confirmação registrado ao Design junto da cor de Faturado.
 */

const CONFIGURACAO: Record<
  SituacaoFinanceira,
  { texto: string; classeTexto: string; comFundo?: boolean }
> = {
  a_faturar: { texto: "A faturar", classeTexto: "text-a-faturar" },
  faturado: { texto: "Faturado", classeTexto: "text-tinta-apoio" },
  parcial: { texto: "Parcial", classeTexto: "text-parcial-apoio", comFundo: true },
  quitado: { texto: "Quitado", classeTexto: "text-acao" },
};

/** O texto de cada situação, sem a etiqueta — para o chip de filtro "Situação" (Meus fretes, item 4 Tarefa 2). */
export function rotuloSituacao(situacao: SituacaoFinanceira): string {
  return CONFIGURACAO[situacao].texto;
}

export function EtiquetaSituacao({ situacao }: { situacao: SituacaoFinanceira }) {
  const config = CONFIGURACAO[situacao];
  return (
    <span
      className={[
        "inline-flex w-fit items-center text-etiqueta font-bold uppercase leading-[1] tracking-[.1em]",
        config.classeTexto,
        config.comFundo ? "rounded-etiqueta bg-parcial-fundo px-8 py-4" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {config.texto}
    </span>
  );
}
