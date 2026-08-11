import Link from "next/link";
import { PlacaBadge } from "./PlacaBadge";

/**
 * Uma linha de dado no perfil (Cliente, Caminhão, Motorista) — rótulo à
 * esquerda, valor à direita. Campo vazio mostra "adicionar" em verde,
 * tocável, nunca "não preenchido" (`docs/componentes.md` § "A palavra é
 * sempre 'adicionar'"). `mono` troca o valor por `PlacaBadge` — placa nunca
 * é texto comum (`docs/estilo.md` linhas 52–54, 93).
 *
 * Nasceu como função local em `clientes/[id]/page.tsx` (tarefa 5) e foi
 * copiada para `caminhoes/[id]/page.tsx` (tarefa 6) e `motoristas/[id]/
 * page.tsx` (tarefa 7) — a terceira cópia do mesmo componente, proibida pelo
 * `CLAUDE.md` §8 ("componente existe uma vez"). Unificada na correção da
 * tarefa 7 (`docs/planos/item-2-cadastros.md`), com os três perfis
 * reescritos para importar daqui.
 */

type Props = {
  href: string;
  rotulo: string;
  valor: string | null;
  mono?: boolean;
};

export function LinhaDePerfil({ href, rotulo, valor, mono }: Props) {
  return (
    <div className="flex items-start gap-12 rounded-campo bg-separacao px-18 py-14">
      <span className="w-96 flex-none pt-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      {valor && mono ? (
        <PlacaBadge placa={valor} variante="escura" />
      ) : valor ? (
        <span className="min-w-0 flex-1 text-campo leading-[1.35] font-semibold text-tinta [overflow-wrap:anywhere]">
          {valor}
        </span>
      ) : (
        <Link
          href={href}
          className="min-w-0 flex-1 text-campo font-semibold leading-[1.35] text-acao"
        >
          adicionar
        </Link>
      )}
    </div>
  );
}
