"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { FolhaDeRecebimento } from "@/components/ui/FolhaDeRecebimento";
import { registrarRecebimentoAction } from "../acoes";

/**
 * Secundária "Marcar recebido" no detalhe do frete (item 6, Tarefa 3 —
 * `docs/componentes.md` linha 432: "já faturado → ... secundárias Marcar
 * recebido + Editar frete"). Abre a folha de recebimento
 * (`FolhaDeRecebimento`), pré-preenchida com o saldo do título aberto.
 *
 * **Sempre montado, mesmo quando o botão não aparece** — mesmo desenho e
 * mesmo motivo de `AcaoFaturarFrete.tsx`: a tela atualiza
 * (`router.refresh()`) no instante do sucesso, e o pai pode deixar de
 * renderizar esta fatia (o frete pode virar "Quitado", perdendo o título
 * aberto). Se este componente só montasse condicionalmente, o refresh o
 * desmontaria e o aviso "Recebimento registrado" morreria antes de a
 * pessoa conseguir ler.
 *
 * **Erro fica dentro da folha, sucesso vira aviso do sistema** — mesmo
 * motivo de `AcaoFaturarFrete`: `FolhaInferior` (`z-[80]`) cobre
 * `AvisoDoSistema` (`z-50`).
 */

type Props = {
  podeReceber: boolean;
  /** Id do título aberto — só é lido quando `podeReceber` é `true`. */
  tituloId: string | undefined;
  /** `valor - totalRecebido` do título aberto — pré-preenche a folha. */
  saldoCentavos: number;
  /** Hoje em Fortaleza (`"AAAA-MM-DD"`), calculado no servidor. */
  hoje: string;
};

export function AcaoMarcarRecebido({ podeReceber, tituloId, saldoCentavos, hoje }: Props) {
  const router = useRouter();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      {podeReceber ? (
        <Botao variante="secundaria" onClick={() => setFolhaAberta(true)}>
          Marcar recebido
        </Botao>
      ) : null}

      {folhaAberta && tituloId ? (
        <FolhaDeRecebimento
          hoje={hoje}
          saldoCentavos={saldoCentavos}
          onFechar={() => setFolhaAberta(false)}
          onConfirmar={async ({ valorCentavos, data, forma }) => {
            try {
              const resultado = await registrarRecebimentoAction({
                tituloId,
                valorCentavos,
                data,
                forma,
              });
              if (!resultado.ok) return resultado;
              setFolhaAberta(false);
              setAviso(
                valorCentavos < saldoCentavos ? "Recebimento parcial registrado" : "Recebimento registrado",
              );
              router.refresh();
              return { ok: true as const };
            } catch {
              // Mesma defesa de `AcaoFaturarFrete` — a ação pode nunca
              // chegar ao servidor (rede ou sessão caiu), o que rejeita a
              // promise em vez de devolver `{ ok: false }`.
              return { ok: false as const, erro: "Não deu para salvar agora." };
            }
          }}
        />
      ) : null}

      {aviso ? <AvisoDoSistema mensagem={aviso} onSumir={() => setAviso(null)} /> : null}
    </>
  );
}
