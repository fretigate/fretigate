import type { Metadata } from "next";
import type { ReactNode } from "react";
import { z } from "zod";
import { localizarConvitePorToken } from "@/lib/db";
import { buscarEmpresa } from "@/lib/servicos/empresas";
import { gerarUrlLogo } from "@/lib/servicos/logo";
import { travaDeAceiteDeConvite } from "@/lib/servicos/trava-de-convite";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";
import { MENSAGEM_CONVITE_INDISPONIVEL } from "@/lib/utils/convite";
import { TelaAceitarConvite } from "./TelaAceitarConvite";

export const metadata: Metadata = {
  title: "Aceitar convite — FretiGate",
};

const schemaToken = z.string().min(1);

/**
 * `(auth)/aceitar-convite` — item 10, Tarefa 4 (`docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 4").
 *
 * **Sem `<Marca />` do FretiGate — decisão do fundador, 01/09/2026, com o
 * motivo escrito no plano.** Quem chega já foi convidado por alguém que
 * conhece; o que precisa reconhecer é a empresa, não o produto. Nenhum
 * estado desta tela (válido, indisponível, trava) usa a marca do produto —
 * exceção nomeada à lista de telas de fora de sessão que a levam
 * (`docs/estilo.md`).
 *
 * **Token ausente, inexistente, já aceito ou cancelado mostram a mesma
 * mensagem genérica** (`MENSAGEM_CONVITE_INDISPONIVEL`) — a regra de
 * negócio (`status !== "pendente"`) já é inteira do serviço desde a
 * Tarefa 1; esta tela só decide como apresentar a recusa, sem revelar qual
 * dos motivos foi.
 */
function Pagina({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      {children}
    </main>
  );
}

/**
 * `text-corpo-fora-sessao`, achado do segundo `/revisar` — a primeira
 * versão usava `text-campo` (16/1, pensado para valor de campo de
 * formulário, não parágrafo de leitura) com `leading-[1.4]`, fora da
 * escala de `--text-corpo-fora-sessao` (15/500/1.5). O parágrafo do topo
 * de `TelaAceitarConvite.tsx` já usa o token certo; este ficou de fora.
 */
function TelaIndisponivel({ mensagem }: { mensagem: string }) {
  return (
    <p className="mt-40 text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-tinta-apoio-forte">
      {mensagem}
    </p>
  );
}

export default async function Page(props: PageProps<"/aceitar-convite">) {
  const parametros = await props.searchParams;
  const resultadoToken = schemaToken.safeParse(parametros.token);
  const token = resultadoToken.success ? resultadoToken.data : null;

  if (!token) {
    return (
      <Pagina>
        <TelaIndisponivel mensagem={MENSAGEM_CONVITE_INDISPONIVEL} />
      </Pagina>
    );
  }

  // Trava de custo, não de adivinhação (`trava-de-convite.ts`): o token em
  // si tem entropia alta demais para valer a pena adivinhar.
  const trava = await travaDeAceiteDeConvite();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return (
      <Pagina>
        <TelaIndisponivel mensagem={`Muitas consultas por aqui. Tenta de novo às ${horario}.`} />
      </Pagina>
    );
  }

  const convite = await localizarConvitePorToken(token);
  if (!convite || convite.status !== "pendente") {
    return (
      <Pagina>
        <TelaIndisponivel mensagem={MENSAGEM_CONVITE_INDISPONIVEL} />
      </Pagina>
    );
  }

  const [empresa, urlLogo] = await Promise.all([
    buscarEmpresa(convite.empresa_id),
    gerarUrlLogo(convite.empresa_id),
  ]);
  const nomeEmpresa = empresa?.nome_fantasia ?? "";

  return (
    <Pagina>
      <TelaAceitarConvite
        token={token}
        nomeConvidado={convite.nome}
        nomeEmpresa={nomeEmpresa}
        urlLogo={urlLogo}
      />
    </Pagina>
  );
}
