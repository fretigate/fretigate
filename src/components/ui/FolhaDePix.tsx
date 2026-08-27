"use client";

import { FolhaDeCampoUnico } from "./FolhaDeCampoUnico";

/**
 * "Folha do campo que falta" (`docs/componentes.md` §12) para a chave Pix da
 * empresa — item 6, Tarefa 5. Reaproveita o miolo de `FolhaDeCampoUnico`
 * (o mesmo de `FolhaDeTelefone`), com a única diferença que o Pix pede: sem
 * validação de formato nenhuma — CPF, CNPJ, e-mail, telefone ou aleatória, e
 * recusar uma válida é pior que aceitar uma torta
 * (`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 5). Só existe o estado
 * "ausente": o campo nunca nasce pré-preenchido com um valor inválido, então
 * não há a distinção ausente/inválido que `FolhaDeTelefone` tem — o título é
 * sempre o mesmo.
 *
 * **"Agora não" não cancela a ação de fundo — diferente da regra geral do
 * §12.** Decisão do fundador (`docs/planos/item-6-titulo-e-cobrancas.md`,
 * decisão 2), pelo mesmo motivo já registrado para "Gerar relatório com
 * Pix" (`docs/componentes.md`, "Exceção: o relatório com cobrança não
 * bloqueia"): quem tocou "Cobrar no WhatsApp" quer cobrar, e o cliente ainda
 * pode pagar por transferência ou boleto — a mensagem sai sem o bloco do
 * Pix. Esta folha não decide isso sozinha: `onFechar` é responsabilidade de
 * quem chama, que aqui segue com o envio em vez de só fechar.
 */

type ResultadoSalvarPix = { ok: true } | { ok: false; erro: string };

type Props = {
  /** "Salvar e cobrar" — o rótulo diz para onde a ação segue (`docs/componentes.md` §12). */
  rotuloBotao: string;
  onSalvar: (chavePix: string) => Promise<ResultadoSalvarPix>;
  onFechar: () => void;
};

export function FolhaDePix({ rotuloBotao, onSalvar, onFechar }: Props) {
  return (
    <FolhaDeCampoUnico
      titulo="Falta a chave Pix da sua empresa"
      apoio="Aparece na mensagem de cobrança, para o cliente saber para onde mandar o dinheiro. Fica salva na conta da empresa."
      rotuloCampo="Chave Pix"
      placeholderCampo="CPF, CNPJ, e-mail, telefone ou aleatória"
      valorInicial=""
      validar={(valorDigitado) =>
        valorDigitado.trim() ? { ok: true, valor: valorDigitado.trim() } : { ok: false }
      }
      rotuloBotao={rotuloBotao}
      onSalvar={onSalvar}
      onFechar={onFechar}
    />
  );
}
