/**
 * A placa do caminhão — `docs/estilo.md` linhas 52–54 e 93: Azeret Mono é
 * exclusiva da placa ("nunca em nome, nunca em corpo de texto"), `11px/500`,
 * `ls .06em`.
 *
 * Duas variantes, decididas pelo fundador na revisão da tarefa 6: no perfil
 * (`escura`), o tratamento é o que a folha descreve — branco sobre `#141A17`.
 * Na linha de lista (`clara`), sobre fundo já claro, o branco não se aplica;
 * só a família de fonte se mantém.
 *
 * Altura e padding não têm token formal em `docs/estilo.md` — mesmo caso de
 * `CampoTexto.tsx` (ver o comentário lá): ficam registrados aqui, com raio
 * reaproveitado de `--radius-etiqueta` (12px, a única forma pequena já no
 * sistema), até o Design formalizar um valor próprio.
 */
type Props = {
  placa: string;
  variante: "escura" | "clara";
};

export function PlacaBadge({ placa, variante }: Props) {
  return (
    <span
      className={[
        "inline-flex h-24 items-center rounded-etiqueta px-8 font-mono text-placa font-medium uppercase tracking-[.06em]",
        variante === "escura" ? "bg-tinta text-white" : "text-tinta",
      ].join(" ")}
    >
      {placa}
    </span>
  );
}
