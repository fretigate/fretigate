import type { Metadata } from "next";
import type { ReactNode } from "react";
import { z } from "zod";
import { buscarEmailPorCodigo } from "@/lib/servicos/redefinicao-de-senha";
import { travaDeConsultaDoCodigo } from "@/lib/servicos/trava-de-redefinicao";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";
import { TelaRedefinirSenha } from "./TelaRedefinirSenha";

export const metadata: Metadata = {
  title: "Redefinir senha — FretiGate",
};

const schemaCodigo = z.string().min(1);

function Pagina({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      <h1
        className="text-titulo-tela font-bold leading-[1.1] tracking-[-.01em] text-tinta-apoio-forte"
        style={{ fontVariationSettings: "'wdth' 96" }}
      >
        Redefinir senha
      </h1>
      {children}
    </main>
  );
}

// Onde o link do e-mail de recuperação cai — `src/lib/auth/index.ts`
// (`sendResetPassword`) manda direto para cá, com o código puro, em vez de
// passar pela rota própria do Better Auth (ver o comentário lá: é assim que
// esta tela consegue descobrir a quem o código vencido pertencia, em vez de
// já ter sido apagado antes de chegar aqui).
//
// Sem barra de navegação — entra na lista fechada do CLAUDE.md §8 por
// decisão explícita do fundador (07/08/2026, tarefa 8 fatia 2): é tela de
// fora de sessão, igual às quatro que já estavam lá.
export default async function Page(props: PageProps<"/redefinir-senha">) {
  const parametros = await props.searchParams;
  const resultadoCodigo = schemaCodigo.safeParse(parametros.token);
  const codigo = resultadoCodigo.success ? resultadoCodigo.data : null;

  if (!codigo) {
    return (
      <Pagina>
        <TelaRedefinirSenha codigo={null} valido={false} email={null} />
      </Pagina>
    );
  }

  // Trava de custo, não de adivinhação (`trava-de-redefinicao.ts`): o código
  // em si tem entropia alta demais para valer a pena adivinhar.
  const trava = await travaDeConsultaDoCodigo();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return (
      <Pagina>
        <p className="mt-24 text-campo font-semibold leading-[1.4] text-tinta">
          Muitas consultas por aqui. Tenta de novo às {horario}.
        </p>
      </Pagina>
    );
  }

  const { valido, email } = await buscarEmailPorCodigo(codigo);

  return (
    <Pagina>
      <TelaRedefinirSenha codigo={codigo} valido={valido} email={email} />
    </Pagina>
  );
}
