import type { Metadata } from "next";
import type { ReactNode } from "react";
import { z } from "zod";
import { Botao } from "@/components/ui/Botao";
import { buscarConfirmacaoDeCompra } from "@/lib/servicos/pagamentos";
import { travaDeAtivacaoDeAssinatura } from "@/lib/servicos/trava-de-ativacao";
import { formatarHorarioFortaleza } from "@/lib/utils/mensagem-trava";
import { MENSAGEM_PAGAMENTO_INDISPONIVEL, MENSAGEM_PAGAMENTO_JA_ATIVADO } from "@/lib/utils/pagamento";
import { TelaAtivarAssinatura } from "./TelaAtivarAssinatura";

export const metadata: Metadata = {
  title: "Ativar assinatura — FretiGate",
};

const schemaToken = z.string().min(1);

/**
 * `(auth)/ativar-assinatura` — item 13, Tarefa 1 (`docs/planos/
 * item-13-assinatura.md`). Mesmo esqueleto de `(auth)/aceitar-convite`:
 * página pública, sem barra de navegação, token na URL.
 *
 * **Dois casos de indisponível, não um** — diferente do convite, que junta
 * os quatro motivos numa mensagem só. Aqui:
 * - **já reivindicado** (`situacao: "ja_reivindicado"`) → saída acionável,
 *   a pessoa provavelmente já tem conta e senha.
 * - **qualquer outro motivo** (token ausente/inexistente/estornado, ou taxa
 *   de consulta excedida) → mensagem genérica, mesmo motivo do convite:
 *   distinguir revelaria informação (por exemplo, que um pagamento
 *   específico foi estornado).
 *
 * Sem `<Marca />` do FretiGate — mesma decisão do convite
 * (`docs/planos/item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 4"):
 * quem chega aqui pagou pela Kiwify, não pelo produto — não há marca de
 * empresa nenhuma para reconhecer, e a confirmação de compra (e-mail
 * parcial + data, abaixo) já cumpre o papel de dizer "isto é seu".
 */
function Pagina({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col px-20 pt-[var(--area-segura-topo)] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]">
      {children}
    </main>
  );
}

function TelaIndisponivel({ mensagem, saida }: { mensagem: string; saida?: ReactNode }) {
  return (
    <div className="mt-40 flex flex-col gap-24">
      <p className="text-corpo-fora-sessao text-pretty font-medium leading-[1.5] text-tinta-apoio-forte">
        {mensagem}
      </p>
      {saida}
    </div>
  );
}

export default async function Page(props: PageProps<"/ativar-assinatura">) {
  const parametros = await props.searchParams;
  const resultadoToken = schemaToken.safeParse(parametros.token);
  const token = resultadoToken.success ? resultadoToken.data : null;

  if (!token) {
    return (
      <Pagina>
        <TelaIndisponivel mensagem={MENSAGEM_PAGAMENTO_INDISPONIVEL} />
      </Pagina>
    );
  }

  // Trava de custo, não de adivinhação (`trava-de-ativacao.ts`): o token em
  // si tem entropia alta demais para valer a pena adivinhar.
  const trava = await travaDeAtivacaoDeAssinatura();
  if (!trava.permitido) {
    const horario = formatarHorarioFortaleza(trava.tentarNovoEm);
    return (
      <Pagina>
        <TelaIndisponivel mensagem={`Muitas consultas por aqui. Tenta de novo às ${horario}.`} />
      </Pagina>
    );
  }

  const confirmacao = await buscarConfirmacaoDeCompra(token);

  if (confirmacao.situacao === "ja_reivindicado") {
    return (
      <Pagina>
        <TelaIndisponivel
          mensagem={MENSAGEM_PAGAMENTO_JA_ATIVADO}
          saida={
            <Botao variante="principal" href="/entrar">
              Entrar
            </Botao>
          }
        />
      </Pagina>
    );
  }

  if (confirmacao.situacao === "indisponivel") {
    return (
      <Pagina>
        <TelaIndisponivel mensagem={MENSAGEM_PAGAMENTO_INDISPONIVEL} />
      </Pagina>
    );
  }

  return (
    <Pagina>
      <TelaAtivarAssinatura
        token={token}
        emailParcial={confirmacao.emailParcial}
        data={confirmacao.data}
      />
    </Pagina>
  );
}
