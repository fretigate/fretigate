import type { Metadata } from "next";
import { Marca } from "@/components/auth/Marca";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { BarraDeNavegacao } from "@/app/(app)/BarraDeNavegacao";
import { sessaoAtual } from "@/lib/auth/sessao";
import { ConteudoTermos } from "./ConteudoTermos";

export const metadata: Metadata = {
  title: "Termos de uso e privacidade — FretiGate",
};

// docs/componentes.md linha 412: duas abas · vindo do cadastro termina em
// principal "Li e aceito" · vindo de Ajustes é só leitura · sem barra no
// modo cadastro.
//
// **O modo "vindo de Ajustes" ganhou barra de verdade e a folga de rolagem
// padrão no item 10, Tarefa 2** — `docs/componentes.md`, "Barra de
// navegação: exceção fora de sessão": "Termos vindo de Ajustes, na regra
// final, também ganha barra". Até esta tarefa os dois modos usavam a mesma
// margem provisória sem barra, porque não existia NENHUMA tela dentro da
// sessão linkando pra cá — `/conta` (Tarefa 2) é essa tela agora.
//
// **A rota continua fora de `(app)`, de propósito** — `(app)/layout.tsx`
// exige sessão para TODA página do grupo (`exigirSessao()`, redireciona sem
// ela), e o modo "vindo do cadastro" precisa continuar acessível sem sessão
// nenhuma (é chamado de `/criar-conta`, antes de a conta existir). A
// distinção não é a ROTA, é a `origem`: `<BarraDeNavegacao />` é importada e
// renderizada direto aqui, fora do layout que normalmente a fornece — o
// mesmo componente, a mesma razão pela qual `docs/componentes.md` já dizia
// "quem decide é a prop origem", agora também para a barra.
//
// **A barra só aparece com sessão de dono, não só `!deCadastro`** —
// achado do `/revisar`: `/termos` não tem `(auth)/layout.tsx` nem
// middleware nenhum checando sessão (o modo cadastro precisa continuar
// acessível sem uma). Sem essa conferência, alguém sem sessão abrindo
// `/termos` direto (sem `?de=cadastro`) veria a barra — exatamente o
// incidente já registrado em `docs/componentes.md`, "Barra de navegação:
// exceção fora de sessão" ("a tela de Termos herdou a barra no modo
// cadastro e dava para chegar em Fretes sem criar conta"), só que pelo
// caminho contrário. `sessaoAtual()` (não `exigirSessao()`) porque a
// ausência aqui é um caso normal, não erro — a tela continua de leitura sem
// sessão, só sem barra nem Voltar.
//
// **`papel === "dono"`, não só "tem sessão" — achado do segundo `/revisar`.**
// O único caminho documentado até este modo é Mais › Ajustes › Conta da
// empresa (`docs/navegacao.md`), e essa seção só existe para o dono
// (`/conta` responde `notFound()` para operador). Um operador com sessão
// abrindo `/termos` direto ganharia barra e um "Voltar" apontando pra uma
// tela que ele não pode abrir — mesma classe de botão sem destino
// alcançável que `CLAUDE.md` §8 já proíbe. Sem essa sessão específica, cai
// no mesmo modo de leitura sem barra de quem não tem sessão nenhuma.
export default async function Page(props: PageProps<"/termos">) {
  const parametros = await props.searchParams;
  const deCadastro = parametros.de === "cadastro";
  const sessao = deCadastro ? null : await sessaoAtual();
  const comBarra = sessao?.papel === "dono";

  return (
    <main
      className={
        deCadastro
          ? "mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]"
          : "mx-auto flex min-h-full max-w-[480px] flex-col px-20"
      }
      style={
        comBarra
          ? { paddingTop: "var(--area-segura-topo)", paddingBottom: "var(--folga-rolagem)" }
          : deCadastro
            ? undefined
            : { paddingTop: "var(--area-segura-topo)", paddingBottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))" }
      }
    >
      {/* Só no modo cadastro. A marca é para quem ainda está decidindo
          confiar no produto; vindo de Ajustes a pessoa já está dentro da
          sessão, já viu a marca e a tela é só leitura. */}
      {deCadastro ? <Marca compacta /> : null}
      {/* "Voltar" — achado do `/revisar`: toda tela de nível 2 tem Voltar
          (`docs/navegacao.md`, "Regras de navegação"); só existe destino
          real (`/conta`) quando há sessão de dono, mesma condição da
          barra. */}
      {comBarra ? <BotaoVoltar href="/conta" className="mb-6" /> : null}
      <h1
        className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        Termos e privacidade
      </h1>
      <ConteudoTermos deCadastro={deCadastro} />
      {comBarra ? <BarraDeNavegacao /> : null}
    </main>
  );
}
