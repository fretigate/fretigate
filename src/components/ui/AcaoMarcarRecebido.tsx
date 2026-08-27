"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "./Botao";
import { AvisoDoSistema } from "./AvisoDoSistema";
import { FolhaDeRecebimento } from "./FolhaDeRecebimento";

/**
 * "Marcar recebido" — abre a folha de recebimento (`FolhaDeRecebimento`),
 * pré-preenchida com o saldo do título aberto. Dois consumidores, um
 * componente só (`CLAUDE.md` §8, "componente existe uma vez"):
 *
 * - **Secundária no detalhe do frete** (item 6, Tarefa 3 —
 *   `docs/componentes.md` linha 447): `variante="secundaria"`, rótulo fixo
 *   "Marcar recebido", sem estado "Recebido ✓" (o frete, quando quitado, some
 *   desta fatia — não mostra um botão desabilitado).
 * - **Principal no detalhe da cobrança** (item 6, Tarefa 4 —
 *   `docs/componentes.md` linha 452): `variante="principal"`, com os três
 *   estados do inventário — **Marcar recebido** / **Receber o resto** /
 *   **Recebido ✓** desabilitada. Nasceu como `AcaoDetalheCobranca.tsx`, cópia
 *   quase inteira deste arquivo (achado do `/revisar`, confirmado pelo
 *   fundador) — generalizado para cá em vez de mantido em duas cópias que já
 *   divergiam em três estados.
 *
 * **Sempre montado, mesmo quando o botão não aparece** — a tela atualiza
 * (`router.refresh()`) no instante do sucesso, e o pai pode deixar de
 * renderizar esta fatia com `podeReceber=true` (o título vira "pago"). Se
 * este componente só montasse condicionalmente, o refresh o desmontaria e o
 * aviso de sucesso morreria antes de a pessoa conseguir ler.
 *
 * **Erro fica dentro da folha, sucesso vira aviso do sistema** — mesmo
 * motivo de `AcaoFaturarFrete`: `FolhaInferior` (`z-[80]`) cobre
 * `AvisoDoSistema` (`z-50`).
 */

type Props = {
  /** "secundaria" (detalhe do frete, default) ou "principal" (detalhe da cobrança). */
  variante?: "principal" | "secundaria";
  podeReceber: boolean;
  /** Id do título aberto — só é lido quando `podeReceber` é `true`. */
  tituloId: string | undefined;
  /** `valor - totalRecebido` do título aberto — pré-preenche a folha. */
  saldoCentavos: number;
  /** Hoje em Fortaleza (`"AAAA-MM-DD"`), calculado no servidor. */
  hoje: string;
  /**
   * Já entrou parte deste título — o rótulo vira "Receber o resto" em vez de
   * "Marcar recebido". Só o detalhe da cobrança distingue os dois; o detalhe
   * do frete nunca passa esta prop (mesmo rótulo fixo de sempre).
   */
  jaRecebeuAlgo?: boolean;
  /**
   * Título já `pago` — mostra **Recebido ✓** desabilitado em vez de nada.
   * Só o detalhe da cobrança usa isto (`docs/componentes.md` linha 452); o
   * detalhe do frete, quando quitado, simplesmente não renderiza a
   * secundária (o rótulo previsto ali para esse estado é outro, "Ver
   * relatório" — item 7).
   */
  jaRecebido?: boolean;
  /**
   * `registrarRecebimentoAction` (`fretes/acoes.ts`), injetada pelo chamador
   * — achado do terceiro `/revisar` na Tarefa 4: um componente de
   * `src/components/ui` importando uma Server Action de `src/app` quebra a
   * separação da própria pasta (`CLAUDE.md` §6, "componentes base"). Mesmo
   * padrão que `FolhaDeRecebimento`, um nível abaixo, já usa com
   * `onConfirmar`: a ação continua morando em um lugar só
   * (`registrarRecebimentoAction`), e os dois chamadores (detalhe do frete,
   * detalhe da cobrança) passam a mesma referência, sem duplicar nada.
   */
  registrar: (entrada: {
    tituloId: string;
    valorCentavos: number;
    data: string;
    forma: string;
  }) => Promise<{ ok: true } | { ok: false; erro: string }>;
};

export function AcaoMarcarRecebido({
  variante = "secundaria",
  podeReceber,
  tituloId,
  saldoCentavos,
  hoje,
  jaRecebeuAlgo = false,
  jaRecebido = false,
  registrar,
}: Props) {
  const router = useRouter();
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      {podeReceber ? (
        <Botao variante={variante} onClick={() => setFolhaAberta(true)}>
          {jaRecebeuAlgo ? "Receber o resto" : "Marcar recebido"}
        </Botao>
      ) : jaRecebido ? (
        <Botao variante={variante} disabled>
          Recebido ✓
        </Botao>
      ) : null}

      {folhaAberta && tituloId ? (
        <FolhaDeRecebimento
          hoje={hoje}
          saldoCentavos={saldoCentavos}
          onFechar={() => setFolhaAberta(false)}
          onConfirmar={async ({ valorCentavos, data, forma }) => {
            try {
              const resultado = await registrar({
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
