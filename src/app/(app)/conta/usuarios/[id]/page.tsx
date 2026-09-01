import { notFound } from "next/navigation";
import { exigirDono, SemPermissao } from "@/lib/auth/sessao";
import { buscarUsuario } from "@/lib/servicos/usuarios";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { iniciaisPessoa } from "@/lib/utils/iniciais";
import { BotaoRemoverAcesso } from "./BotaoRemoverAcesso";
import { removerAcessoAction } from "../acoes";

const ROTULO_PAPEL: Record<"dono" | "operador", string> = { dono: "Dono", operador: "Operador" };

/**
 * Usuários — detalhe (item 10, Tarefa 4). `docs/componentes.md`: "texto
 * destrutiva Remover acesso, visível só para o dono; o acesso do dono não é
 * removível".
 *
 * **"Visível só para o dono" é sobre quem VÊ a tela** (decisão 1 do plano —
 * `exigirDono()` cobre isso), **não sobre o botão em si** — o botão some
 * quando o `papel` do ALVO é dono (nunca por comparação com quem chama:
 * `removerAcesso`, `src/lib/servicos/usuarios.ts`, já decide isso pelo
 * papel do alvo desde a Tarefa 1). Confirmação pedida pelo fundador ao
 * aprovar o plano: o dono abrindo o próprio detalhe não vê "Remover
 * acesso" — é exatamente este `usuario.papel === "dono"` que garante isso.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  let sessao;
  try {
    sessao = await exigirDono();
  } catch (erro) {
    if (erro instanceof SemPermissao) notFound();
    throw erro;
  }

  const { id } = await params;
  const usuario = await buscarUsuario(sessao.empresaId, id);
  if (!usuario) notFound();

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <BotaoVoltar href="/conta/usuarios" />
        <span className="min-w-0 flex-1 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Usuário
        </span>
      </div>

      <div className="flex flex-col px-20">
        <div className="flex items-center gap-14">
          <span className="flex h-56 w-56 flex-none items-center justify-center rounded-pilula bg-acao text-[16px] font-bold tracking-[.02em] text-white">
            {iniciaisPessoa(usuario.nome)}
          </span>
          <span
            className="min-w-0 flex-1 truncate text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta"
            style={{ fontVariationSettings: "'wdth' 96" }}
          >
            {usuario.nome}
          </span>
        </div>

        <div className="mt-26 flex flex-col gap-4">
          <LinhaDePerfil rotulo="E-mail" valor={usuario.email} semAdicionarQuandoVazio />
          <LinhaDePerfil rotulo="Papel" valor={ROTULO_PAPEL[usuario.papel]} semAdicionarQuandoVazio />
        </div>

        {usuario.papel !== "dono" ? (
          <form action={removerAcessoAction.bind(null, usuario.id)} className="mt-26">
            <BotaoRemoverAcesso />
          </form>
        ) : null}
      </div>
    </main>
  );
}
