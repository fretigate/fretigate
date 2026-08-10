import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { listarClientes } from "@/lib/servicos/clientes";
import { ItemMenu } from "@/components/ui/ItemMenu";
import { sairDaConta } from "../acoes";
import { BotaoSairDaConta } from "../BotaoSairDaConta";

/**
 * Mais — `docs/navegacao.md` linha 20, `docs/componentes.md` linha 392.
 *
 * PROVISÓRIA: nasce com o nome da empresa, "Sair da conta" e agora a seção
 * CADASTROS com a linha "Clientes" (tarefa 5) — Caminhões e Motoristas ainda
 * não existem (tarefas 6/7), nem Relatório, Despesas, Importar, Novidades,
 * Configurações, Usuários, Conta. "A tela 'Mais' nasce só com as linhas que
 * têm destino; cada item seguinte acrescenta a sua"
 * (`docs/planos/item-2-cadastros.md`, tarefa 4).
 *
 * O nome da empresa também não é tocável ainda: o cartão de identidade
 * (`docs/componentes.md` linha 392) leva à tela de Conta, que é item 10 e
 * não existe. Vira o cartão de verdade quando essa tela nascer.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();

  const [empresa, clientes] = await Promise.all([
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { nome_fantasia: true },
    }),
    listarClientes(sessao.empresaId),
  ]);

  // O protótipo (referencia/TelaMais.dc.html) também mostra "· R$ X em
  // aberto" no apoio desta linha — fora daqui de propósito: esse número
  // depende de TituloReceber, que só nasce no item 4, e o CLAUDE.md §8 é
  // direto sobre número incompleto ("mostram convite, não valor").
  const subtituloClientes =
    clientes.length === 0
      ? "Nenhum cadastrado ainda"
      : `${clientes.length} ${clientes.length === 1 ? "cadastrado" : "cadastrados"}`;

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

      <div className="flex flex-col gap-6">
        <span className="px-4 pb-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Cadastros
        </span>
        <ItemMenu href="/clientes" nome="Clientes" apoio={subtituloClientes}>
          <circle cx="9.84" cy="8.76" r="2.88" />
          <path d="M4.8 17.76c0.54 -2.52 2.61 -3.96 5.04 -3.96s4.5 1.44 5.04 3.96M15.06 6.24a2.88 2.88 0 0 1 0 5.04M16.68 14.16c1.44 0.63 2.34 1.89 2.61 3.6" />
        </ItemMenu>
      </div>

      <form action={sairDaConta}>
        <BotaoSairDaConta />
      </form>
    </main>
  );
}
