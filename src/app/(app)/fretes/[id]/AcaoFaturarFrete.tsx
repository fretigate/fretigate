"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { FolhaDeFaturamento } from "@/components/ui/FolhaDeFaturamento";
import { faturarServicoAction } from "../acoes";

/**
 * Principal do detalhe do frete na fatia "finalizado e sem cobrança"
 * (item 6, Tarefa 1) — o rótulo que `docs/componentes.md` já previa para
 * esse estado, e que até aqui não existia porque a ação de fundo não
 * existia ("botão cuja ação de fundo não existe não entra, nem
 * desabilitado").
 *
 * **Sempre montado, mesmo quando o botão não aparece** — mesmo desenho e
 * mesmo motivo de `BotaoMarcarFinalizado.tsx` (item 5, Tarefa 3): a tela
 * atualiza (`router.refresh()`) no instante do sucesso, e o pai deixa de
 * renderizar esta fatia (o frete deixou de estar "sem cobrança"). Se este
 * componente só montasse dentro daquele `if`, o refresh o desmontaria e o
 * aviso "Frete faturado" morreria antes de a pessoa conseguir ler. Por isso
 * `page.tsx` o renderiza incondicionalmente, e é `podeFaturar` que decide
 * se o botão aparece.
 *
 * **Erro fica dentro da folha, sucesso vira aviso do sistema.** A folha
 * (`z-[80]`) cobre o aviso (`z-50`), então erro por aviso seria erro
 * invisível — ver a prop `onFaturar` de `FolhaDeFaturamento`.
 */

type Props = {
  servicoId: string;
  podeFaturar: boolean;
  /** Hoje em Fortaleza (`"AAAA-MM-DD"`), calculado no servidor. */
  hoje: string;
  /** Vencimento sugerido (`vencimentoPadrao`, `src/lib/servicos/titulos.ts`). */
  vencimentoInicial: string;
};

export function AcaoFaturarFrete({ servicoId, podeFaturar, hoje, vencimentoInicial }: Props) {
  const router = useRouter();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      {podeFaturar ? (
        <Botao variante="principal" onClick={() => setFolhaAberta(true)}>
          Faturar frete
        </Botao>
      ) : null}

      {folhaAberta ? (
        <FolhaDeFaturamento
          hoje={hoje}
          vencimentoInicial={vencimentoInicial}
          onFechar={() => setFolhaAberta(false)}
          onFaturar={async ({ vencimento, formaPrevista }) => {
            try {
              const resultado = await faturarServicoAction({
                servicoId,
                vencimento,
                formaPrevista,
              });
              if (!resultado.ok) return resultado;
              setFolhaAberta(false);
              setAviso("Frete faturado");
              router.refresh();
              return { ok: true as const };
            } catch {
              // A ação pode nunca chegar ao servidor (rede ou sessão caiu),
              // e isso rejeita a promise em vez de devolver `{ ok: false }`
              // — sem este `catch`, o botão travaria em carregando para
              // sempre, sem erro visível. Medido ao vivo no item 5, Tarefa 2
              // (`AcaoOrdemDeServico.tsx`).
              return { ok: false as const, erro: "Não deu para salvar agora." };
            }
          }}
        />
      ) : null}

      {aviso ? <AvisoDoSistema mensagem={aviso} onSumir={() => setAviso(null)} /> : null}
    </>
  );
}
