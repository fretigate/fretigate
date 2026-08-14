import type { Metadata } from "next";
import { Marca } from "@/components/auth/Marca";
import { ConteudoTermos } from "./ConteudoTermos";

export const metadata: Metadata = {
  title: "Termos de uso e privacidade — FretiGate",
};

// docs/componentes.md linha 412: duas abas · vindo do cadastro termina em
// principal "Li e aceito" · vindo de Ajustes é só leitura · sem barra no
// modo cadastro.
//
// O modo "vindo de Ajustes" existe no código (sem o botão, conteúdo só
// leitura) mas ainda não tem nenhum link real apontando pra ele — Conta da
// empresa/Ajustes não existe (fica para outra tarefa, ordem de construção
// em docs/especificacao.md §9). Por isso as duas variações usam a mesma
// margem sem barra por enquanto: não existe barra de navegação construída
// ainda para reservar folga contra.
export default async function Page(props: PageProps<"/termos">) {
  const parametros = await props.searchParams;
  const deCadastro = parametros.de === "cadastro";

  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      {/* Só no modo cadastro. A marca é para quem ainda está decidindo
          confiar no produto; vindo de Ajustes a pessoa já está dentro da
          sessão, já viu a marca e a tela é só leitura. */}
      {deCadastro ? <Marca /> : null}
      <h1
        className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        Termos e privacidade
      </h1>
      <ConteudoTermos deCadastro={deCadastro} />
    </main>
  );
}
