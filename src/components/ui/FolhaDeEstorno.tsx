"use client";

import { useState } from "react";
import { Botao } from "./Botao";
import { FolhaInferior } from "./FolhaInferior";

/**
 * Confirmação do Estorno (item 6, Tarefa 6 —
 * `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 4). **Primeiro caso de
 * confirmação antes de ação destrutiva no produto** — "Arquivar frete" e
 * "Arquivar cliente" agem direto, sem perguntar antes
 * (`BotaoArquivarFrete.tsx`, `BotaoArquivarCliente.tsx`). Decisão do
 * fundador, 27/08/2026: reaproveita a folha inferior comum (mesmo gesto já
 * conhecido — "algo sobe de baixo, você decide, e volta"), não um componente
 * de confirmação genérico novo, nem janela modal. Se o Design decidir depois
 * que Arquivar também deveria confirmar, isso vira tarefa própria — não
 * herdada por analogia.
 *
 * **A segunda consequência só aparece com dinheiro já recebido** — mostrar
 * "o que já foi recebido deixa de contar" numa cobrança sem nenhum
 * recebimento afirmaria algo que não se aplica.
 *
 * **Lacuna registrada para o Design confirmar** (decisão do fundador): a
 * variante `principal` do `Botao` não tem tratamento para ação destrutiva —
 * a cor de ação sempre foi verde, em toda tela do produto. Esta folha usa a
 * `principal` normal (verde) para "Estornar", não vermelha — até o Design
 * decidir se existe (ou não) uma variante destrutiva de botão principal.
 *
 * Erro fica dentro da folha, nunca em `AvisoDoSistema` — mesmo motivo do
 * resto do arquivo (`FolhaDeRecebimento`, `FolhaDeFaturamento`):
 * `AvisoDoSistema` é `z-50`, `FolhaInferior` é `z-[80]`.
 */

type Props = {
  /** Recebido > 0 no título — mostra a segunda consequência quando `true`. */
  jaRecebeuAlgo: boolean;
  onEstornar: () => Promise<{ ok: true } | { ok: false; erro: string }>;
  onFechar: () => void;
};

export function FolhaDeEstorno({ jaRecebeuAlgo, onEstornar, onFechar }: Props) {
  const [estornando, setEstornando] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | undefined>();

  async function estornar() {
    setEstornando(true);
    setErroServidor(undefined);
    try {
      const resultado = await onEstornar();
      // Quem fecha a folha no sucesso é o chamador — mesmo padrão de
      // `FolhaDeFaturamento.onFaturar`. Aqui só resta o caminho do erro.
      if (!resultado.ok) setErroServidor(resultado.erro);
    } finally {
      setEstornando(false);
    }
  }

  return (
    <FolhaInferior titulo="Estornar esta cobrança?" onFechar={onFechar}>
      <ul className="flex flex-col gap-6">
        <li className="text-apoio font-medium text-tinta-apoio-forte">
          O frete volta para A faturar
        </li>
        {jaRecebeuAlgo ? (
          <li className="text-apoio font-medium text-tinta-apoio-forte">
            O que já foi recebido deixa de contar
          </li>
        ) : null}
        <li className="text-apoio font-medium text-tinta-apoio-forte">Não tem como desfazer</li>
      </ul>

      {erroServidor ? (
        <span className="text-apoio font-medium text-vencido">{erroServidor}</span>
      ) : null}
      <Botao variante="principal" carregando={estornando} onClick={estornar}>
        Estornar
      </Botao>
      <Botao variante="texto" onClick={onFechar}>
        Agora não
      </Botao>
    </FolhaInferior>
  );
}
