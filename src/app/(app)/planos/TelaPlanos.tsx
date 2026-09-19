"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
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
 * padrão de `FormularioConvite.tsx` (achado do `/revisar`, 18/09/2026): a
 * janela abre EM BRANCO, síncrona com o toque, antes do `await` da Server
 * Action — só depois ela é redirecionada para a URL real. Sem isso, o
 * navegador de celular trata a abertura como não vinda de um gesto do
 * usuário (a pausa assíncrona quebra a cadeia de confiança do toque) e
 * bloqueia, ou (no app instalado) abre o Safari por fora para hospedar uma
 * aba que o standalone não tem onde pôr.
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

export function TelaPlanos() {
  const [carregando, setCarregando] = useState<"mensal" | "anual" | null>(null);
  const [erro, setErro] = useState<string | undefined>();

  async function assinar(plano: "mensal" | "anual") {
    if (carregando) return;
    setErro(undefined);
    setCarregando(plano);

    // ORDEM É REGRA, NÃO DETALHE — a janela se prepara aqui, antes do
    // `await` logo abaixo, dentro da mesma cadeia de gesto do toque.
    const janela = prepararJanelaExterna();

    try {
      const resultado = await gerarLinkDeCheckoutAction(plano);
      if (!resultado.ok) {
        janela?.fechar();
        setErro(resultado.erro);
        return;
      }
      if (janela) {
        janela.redirecionarPara(resultado.url);
      }
    } catch {
      janela?.fechar();
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
    </div>
  );
}
