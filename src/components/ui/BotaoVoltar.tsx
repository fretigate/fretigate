import Link from "next/link";

/**
 * A seta de "Voltar" sozinha (sem o rótulo em eyebrow de
 * `CabecalhoDeDetalhe.tsx`, que é para tela de detalhe de entidade) —
 * extraída no item 10, Tarefa 2, achado do `/revisar` (segunda volta):
 * `(app)/conta/page.tsx` e `(auth)/termos/page.tsx` tinham o mesmo bloco
 * copiado (`CLAUDE.md` §8, "Proibido copiar componente"). Só estas duas
 * chamadas foram trocadas — o uso mais antigo (`clientes/[id]/editar/
 * page.tsx`) fica como estava, fora do escopo daquela tarefa (`CLAUDE.md`
 * §2, "não refatore o que não faz parte da tarefa"). **`despesas/page.tsx`
 * e `despesas/FormularioDespesa.tsx` passaram a usar este componente no
 * item 11** — achado do `/revisar` daquela tarefa: a primeira versão do
 * formulário tinha copiado o mesmo bloco à mão, em vez de importar daqui.
 */
export function BotaoVoltar({ href, className = "" }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Voltar"
      className={`-ml-10 flex h-44 w-44 flex-none items-center justify-center ${className}`}
    >
      <svg width={12} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15.6 4.35 8.4 12l7.2 7.65"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
