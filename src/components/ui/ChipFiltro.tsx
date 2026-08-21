import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Chip de filtro — `docs/componentes.md`, "Chips de seleção › Filtro": 40px
 * · raio 999 · 13px/600 · largura máx. 148px, uma linha com reticências.
 * Neutro `#F0EDE6`/`#6E7770`; selecionado `#E4E9E5`/`#1B6B3A` peso 700,
 * mostrando o valor escolhido. **Nunca verde sólido** — exclusivo da ação
 * principal (mesma regra de `ChipEscolha`).
 *
 * Ícone `seta-chip.svg` (`docs/icones/`) — achado do `/auditar-tela` na
 * Tarefa 2: "Seta de chip de filtro e de ordenação", 11×7px, traço 1.8px
 * (`docs/estilo.md`, Ícones exportados; `docs/componentes.md`, 09 —
 * Ícones). **Sem cor própria** — corrigido no segundo `/revisar`: eu tinha
 * dado ao traço `text-tinta-fraca` (`#A8AFA9`), citando essa cor como se
 * fosse a do próprio `seta-chip.svg`; conferido de novo, `#A8AFA9` é
 * documentado para a seta de **linha** e o rótulo interno da página de
 * componentes, não para a de chip. A regra geral de `docs/estilo.md`
 * ("Cor do traço: sempre herdada do texto do botão via `currentColor` —
 * nunca uma [cor própria]") é o que vale aqui: sem `className` de cor, o
 * ícone herda `text-acao`/`text-tinta-apoio` do próprio botão, ativo ou
 * não.
 *
 * `viewBox` recortado na caixa real do traço (não o `0 0 24 24` quadrado do
 * arquivo original) + `vectorEffect="non-scaling-stroke"` no traço —
 * achado do `/revisar`: o arquivo (`docs/icones/seta-chip.svg`) é
 * `viewBox="0 0 24 24"` sem `width`/`height` fixos; um `width`/`height` não
 * quadrado (`11×7`) força escala não uniforme pelo lado menor
 * (`7/24 ≈ 0.29`), rendendo o traço a ~0.53px em vez dos 1.8px
 * documentados. O recorte aproxima a proporção do desenho da caixa de
 * saída; `non-scaling-stroke` fecha o resto — o traço passa a renderizar
 * exatamente 1.8px, ponto que `docs/componentes.md` §09 exige ao pé da
 * letra ("o que está escrito em `stroke-width` é o que renderiza"),
 * independente da escala não uniforme. **Não fecha a proporção exata do
 * desenho** (o traço em si é ~2:1, a caixa pedida é 11:7) — mesma
 * imprecisão, ainda não resolvida, existe na seta de "voltar" de
 * `clientes/page.tsx` (viewBox quadrado, `width`/`height` 12×20),
 * registrada como lacuna à parte; redesenhar o arquivo do ícone para bater
 * exato é decisão do Design, não deste componente.
 *
 * Espaçamento `gap-7` — achado do `/revisar`: ícone ≤14px usa 7px de vão
 * (`docs/estilo.md`), não `gap-4`.
 *
 * O protótipo de referência mostra este chip em 44px com fundo `#1B6B3A`
 * sólido quando ativo — contradiz a regra escrita acima ("nunca verde
 * sólido"). Sigo o documento, não o protótipo (`CLAUDE.md` §13: protótipo é
 * evidência corroborante, nunca autoridade, quando em conflito com o
 * documento).
 */

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  rotulo: ReactNode;
  ativo: boolean;
};

export function ChipFiltro({ rotulo, ativo, className, ...resto }: Props) {
  return (
    <button
      type="button"
      className={[
        "flex h-40 max-w-[148px] items-center gap-7 rounded-pilula px-16 text-chip-filtro leading-[1]",
        ativo ? "bg-pilula font-bold text-acao" : "bg-separacao font-semibold text-tinta-apoio",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...resto}
    >
      <span className="min-w-0 truncate">{rotulo}</span>
      <svg
        width={11}
        height={7}
        viewBox="3.964 7.237 16.073 8.873"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none"
        aria-hidden="true"
      >
        <path d="M4.964 8.237 12 15.11 19.037 8.237" vectorEffect="non-scaling-stroke" />
      </svg>
    </button>
  );
}
