import { redirect } from "next/navigation";
import { exigirSessao, SemSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { BotaoSairDaConta } from "./BotaoSairDaConta";
import { sairDaConta } from "./acoes";

/**
 * Pouso mínimo pós-login — nome da empresa e Sair da conta.
 *
 * PROVISÓRIO, de propósito: isto já estava no plano aprovado da tarefa 7
 * ("`src/app/page.tsx` — TEMPORÁRIO, sai na tarefa 8, quando a tela de
 * Entrar existir") e não foi feito naquela hora. Mandar quem acabou de criar
 * conta para a página de teste da instalação ("sem tela de verdade ainda")
 * parece produto quebrado — por isso entra agora, mesmo a tarefa 8 ainda não
 * ter chegado em Entrar. Dashboard de verdade é item bem mais à frente na
 * ordem de construção (`docs/especificacao.md` §9).
 *
 * SEM BARRA DE NAVEGAÇÃO, apesar de esta ser tecnicamente uma tela de nível 1
 * (`docs/componentes.md` §10: "aparece em toda tela de nível 1"). Sinalizado
 * ao fundador — os outros quatro destinos da barra (Fretes, Cobranças,
 * Novo, Mais) não existem ainda; uma barra com quatro itens mortos parece
 * pior do que nenhuma barra. Revisar quando a próxima tela de nível 1 nascer.
 */
export default async function Pagina() {
  let sessao;
  try {
    sessao = await exigirSessao();
  } catch (erro) {
    if (erro instanceof SemSessao) redirect("/criar-conta");
    throw erro;
  }

  const empresa = await db(sessao.empresaId).empresa.findUnique({
    where: { id: sessao.empresaId },
    select: { nome_fantasia: true },
  });

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{ paddingTop: "var(--area-segura-topo)" }}
    >
      {/* docs/estilo.md linha 109: "nome da empresa (19/800)". */}
      <p className="text-nome-empresa font-extrabold text-tinta">
        {empresa?.nome_fantasia}
      </p>

      <form action={sairDaConta}>
        <BotaoSairDaConta />
      </form>
    </main>
  );
}
