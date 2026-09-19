"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { BotaoContinuarExterno } from "@/components/ui/BotaoContinuarExterno";
import { prepararJanelaExterna } from "@/lib/utils/link-externo";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { gerarLinkDeCheckoutAction } from "./acoes";

/**
 * Conteúdo de `/planos` (`docs/componentes.md` linha 502: principal
 * **Assinar o anual**, secundária **Assinar o mensal**). Client Component
 * — os dois botões chamam uma Server Action (`gerarLinkDeCheckoutAction`)
 * antes de abrir o checkout, porque o link só existe depois que o token de
 * uso único (`SolicitacaoUpgrade`) é criado.
 *
 * **`prepararJanelaExterna`, não `abrirLinkExterno` direto** — mesmo
 * padrão de `FormularioConvite.tsx`: em navegador comum, uma aba em branco
 * abre síncrona com o toque, antes do `await` da Server Action, e é
 * redirecionada para o checkout quando o link chega — um toque só. Sem isso,
 * o navegador trata a abertura depois da pausa como não vinda de um gesto do
 * usuário e bloqueia. **Quando não há aba para preparar (app instalado, aba bloqueada, navegador que não respeitou o corte do vínculo)** — o
 * mecanismo devolve `"precisa-de-toque"` e a tela mostra o segundo toque
 * (`BotaoContinuarExterno`), com o link já pronto, no lugar dos dois botões
 * "Assinar". **Provisório**: como trocar de plano depois do link gerado não
 * está desenhado (`docs/planos/corrige-link-externo-segundo-toque.md`).
 * Não medido no iPhone — só o fundador consegue medir.
 *
 * **Estado carregando obrigatório** (`CLAUDE.md` §8) — diferente da
 * primeira versão desta tela: agora os botões chamam o servidor de
 * verdade (para criar a `SolicitacaoUpgrade`), então precisam do mesmo
 * tratamento de toque repetido ignorado que qualquer outro botão que
 * grava.
 *
 * **Layout provisório, sem confirmação do Design** — mesmo tratamento já
 * aceito para o resumo do Financeiro (`docs/planos/
 * financeiro-resumo-com-numeros.md`): usa só tokens já existentes
 * (`docs/estilo.md`), nenhum valor novo.
 */

const ANUAL_CENTAVOS = 116_400;
const MENSAL_CENTAVOS = 19_700;
const ECONOMIA_CENTAVOS = MENSAL_CENTAVOS * 12 - ANUAL_CENTAVOS;

type Plano = "mensal" | "anual";

export function TelaPlanos() {
  const [carregando, setCarregando] = useState<Plano | null>(null);
  const [erro, setErro] = useState<string | undefined>();
  const [linkPronto, setLinkPronto] = useState<{ plano: Plano; url: string } | null>(null);

  async function assinar(plano: Plano) {
    if (carregando) return;
    setErro(undefined);
    setCarregando(plano);

    // ORDEM É REGRA, NÃO DETALHE — a janela se prepara aqui, antes do
    // `await` logo abaixo, dentro da mesma cadeia de gesto do toque.
    const janela = prepararJanelaExterna();

    try {
      const resultado = await gerarLinkDeCheckoutAction(plano);
      if (!resultado.ok) {
        janela.fechar();
        setErro(resultado.erro);
        return;
      }
      if (janela.redirecionarPara(resultado.url) === "precisa-de-toque") {
        setLinkPronto({ plano, url: resultado.url });
      }
    } catch {
      janela.fechar();
      setErro("Não deu para gerar o link agora.");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-4 rounded-campo bg-separacao px-16 py-16">
          <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Anual
          </span>
          <span className="text-valor-lista font-extrabold leading-[1] tabular-nums text-tinta">
            R$ {formatarCentavos(ANUAL_CENTAVOS)}
            <span className="text-apoio font-medium text-tinta-apoio"> à vista</span>
          </span>
          <span className="text-apoio font-medium text-tinta-apoio">
            Economia de R$ {formatarCentavos(ECONOMIA_CENTAVOS)} sobre pagar mês a mês.
          </span>
        </div>

        <div className="flex flex-col gap-4 rounded-campo bg-separacao px-16 py-16">
          <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Mensal
          </span>
          <span className="text-valor-lista font-extrabold leading-[1] tabular-nums text-tinta">
            R$ {formatarCentavos(MENSAL_CENTAVOS)}
            <span className="text-apoio font-medium text-tinta-apoio"> / mês</span>
          </span>
        </div>
      </div>

      {erro ? <span className="text-apoio font-medium text-vencido">{erro}</span> : null}

      {linkPronto ? (
        <BotaoContinuarExterno href={linkPronto.url} destino="navegador">
          Continuar: {linkPronto.plano}, R${" "}
          {formatarCentavos(linkPronto.plano === "anual" ? ANUAL_CENTAVOS : MENSAL_CENTAVOS)}
        </BotaoContinuarExterno>
      ) : (
        <div className="flex flex-col gap-10">
          <Botao
            variante="principal"
            carregando={carregando === "anual"}
            disabled={carregando === "mensal"}
            onClick={() => assinar("anual")}
          >
            Assinar o anual
          </Botao>
          <Botao
            variante="secundaria"
            carregando={carregando === "mensal"}
            disabled={carregando === "anual"}
            onClick={() => assinar("mensal")}
          >
            Assinar o mensal
          </Botao>
        </div>
      )}
    </div>
  );
}
