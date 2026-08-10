import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";

/**
 * Pouso mínimo pós-login — só o nome da empresa.
 *
 * PROVISÓRIO, de propósito: dashboard de verdade é o item 8 da ordem de
 * construção (`docs/especificacao.md` §9), ainda bem mais à frente. Isto
 * existe só para não mandar quem acabou de criar conta para uma tela sem
 * nada.
 *
 * "Sair da conta" saiu daqui na tarefa 4 — mora em Mais agora, que é onde
 * `docs/componentes.md` (linha 392) prevê o botão. A sessão já foi checada
 * pelo layout deste grupo; `exigirSessao()` aqui só busca o `empresaId`.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();

  const empresa = await db(sessao.empresaId).empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { nome_fantasia: true },
  });

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{
        paddingTop: "var(--area-segura-topo)",
        paddingBottom: "var(--folga-rolagem)",
      }}
    >
      {/* docs/estilo.md linha 109: "nome da empresa (19/800)". */}
      <p className="text-nome-empresa font-extrabold text-tinta">
        {empresa?.nome_fantasia}
      </p>
    </main>
  );
}
