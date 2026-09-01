import { notFound } from "next/navigation";
import { exigirDono, SemPermissao } from "@/lib/auth/sessao";
import { buscarEmpresa } from "@/lib/servicos/empresas";
import { gerarUrlLogo } from "@/lib/servicos/logo";
import { listarUsuarios, listarConvitesPendentes } from "@/lib/servicos/usuarios";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { iniciais } from "@/lib/utils/iniciais";
import { ListaUsuarios } from "./ListaUsuarios";

/**
 * Usuários — lista (item 10, Tarefa 4 — `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 4"). Chega de "Conta
 * da empresa"; `docs/componentes.md`: "sem principal · pílula de cabeçalho
 * + Convidar · pílulas em linha Reenviar e Ver o que ela recebe · texto
 * destrutiva Cancelar no convite pendente".
 *
 * **Página inteira exige o dono** (`exigirDono()`) — mesma decisão 1 do
 * plano já aplicada em `/conta` e `/configuracoes`: quem chegasse aqui por
 * URL direta veria nome, e-mail e papel de toda a equipe.
 *
 * **Badge da empresa no topo** (`docs/componentes.md`, "Iniciais da
 * empresa": "56px em Conta e no convite... coexistem na tela de Usuários,
 * badge da empresa no topo, badge de cada pessoa nas linhas"). Mesma
 * renderização de `UploadLogo.tsx` (logo ou iniciais, 56px), sem a parte de
 * upload — esta tela só mostra, nunca troca a logo.
 *
 * **`ultimo_acesso_em` fica fora da lista, de propósito** — nada escreve
 * nesse campo hoje (lacuna registrada em `CLAUDE.md` §14); mostrar qualquer
 * texto sobre ele afirmaria um dado que o sistema não tem.
 */
export default async function Pagina() {
  let sessao;
  try {
    sessao = await exigirDono();
  } catch (erro) {
    if (erro instanceof SemPermissao) notFound();
    throw erro;
  }

  const [empresa, urlLogo, usuarios, convites] = await Promise.all([
    buscarEmpresa(sessao.empresaId),
    gerarUrlLogo(sessao.empresaId),
    listarUsuarios(sessao.empresaId),
    listarConvitesPendentes(sessao.empresaId),
  ]);
  if (!empresa) notFound();

  const nomeEmpresa = empresa.nome_fantasia ?? "";

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-4"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <BotaoVoltar href="/conta" />
        <span
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Usuários
        </span>
        <PilulaCabecalho href="/conta/usuarios/novo">+ Convidar</PilulaCabecalho>
      </div>

      <div className="flex flex-col gap-20 px-20">
        <div className="flex items-center gap-14">
          {urlLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlLogo}
              alt=""
              className="h-56 w-56 flex-none rounded-pilula bg-separacao object-cover"
            />
          ) : (
            <div className="flex h-56 w-56 flex-none items-center justify-center rounded-pilula bg-acao text-[16px] font-bold tracking-[.02em] text-white">
              {iniciais(nomeEmpresa)}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-nome-empresa font-extrabold text-tinta">
            {nomeEmpresa}
          </span>
        </div>

        <ListaUsuarios
          usuarios={usuarios.map((u) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            papel: u.papel,
          }))}
          convites={convites.map((c) => ({
            id: c.id,
            nome: c.nome,
            telefone: c.telefone,
            token: c.token,
          }))}
          empresaNome={nomeEmpresa}
        />
      </div>
    </main>
  );
}
