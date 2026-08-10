import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { sairDaConta } from "../acoes";
import { BotaoSairDaConta } from "../BotaoSairDaConta";

/**
 * Mais — `docs/navegacao.md` linha 20, `docs/componentes.md` linha 392.
 *
 * PROVISÓRIA: nasce só com o nome da empresa e "Sair da conta", porque
 * nenhuma outra tela do menu existe ainda (Clientes, Caminhões, Motoristas,
 * Relatório, Despesas, Importar, Novidades, Configurações, Usuários, Conta).
 * "A tela 'Mais' nasce só com as linhas que têm destino; cada item seguinte
 * acrescenta a sua" (`docs/planos/item-2-cadastros.md`, tarefa 4) — por isso
 * as seções CADASTROS/FERRAMENTAS/AJUSTES ainda não aparecem.
 *
 * O nome da empresa também não é tocável ainda: o cartão de identidade
 * (`docs/componentes.md` linha 392) leva à tela de Conta, que é item 10 e
 * não existe. Vira o cartão de verdade quando essa tela nascer.
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
      <p className="text-nome-empresa font-extrabold text-tinta">
        {empresa?.nome_fantasia}
      </p>

      <form action={sairDaConta}>
        <BotaoSairDaConta />
      </form>
    </main>
  );
}
