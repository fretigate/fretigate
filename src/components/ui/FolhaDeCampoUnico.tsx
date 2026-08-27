"use client";

import { useState, type HTMLInputTypeAttribute } from "react";
import { Botao } from "./Botao";
import { CampoTexto } from "./CampoTexto";
import { FolhaInferior } from "./FolhaInferior";

/**
 * O miolo comum de toda "Folha do campo que falta" (`docs/componentes.md`
 * §12): título, apoio, um campo, erro do servidor, principal e "Agora não".
 * Extraído de `FolhaDeTelefone` (item 5, Tarefa 1) quando `FolhaDePix` (item
 * 6, Tarefa 5) nasceu cópia dela — achado do `/revisar`: a própria docstring
 * de `FolhaDeTelefone` já previa esse segundo consumidor ("genérica o
 * bastante para 'Salvar e cobrar' reaproveitar sem refazer"), e `CLAUDE.md`
 * §8 proíbe copiar componente.
 *
 * Cada chamador injeta a validação (`validar`) e o texto do campo — o que
 * varia entre telefone (dígitos, DDD) e chave Pix (texto livre, sem
 * validação nenhuma) — e o miolo cuida do resto: o gate "campo vazio nunca é
 * erro" (`docs/componentes.md` §12), o estado de salvando e o erro do
 * servidor.
 */

export type ResultadoValidacaoCampo =
  | { ok: true; valor: string }
  | { ok: false; erro?: string };

type Props = {
  titulo: string;
  apoio: string;
  rotuloCampo: string;
  placeholderCampo?: string;
  tipoCampo?: HTMLInputTypeAttribute;
  valorInicial: string;
  /**
   * Recebe o texto cru do campo a cada tecla — `ok: true` habilita o
   * principal, com `valor` sendo o que `onSalvar` recebe (pode ser o mesmo
   * texto, aparado, ou transformado, à escolha do chamador). Sem `erro`,
   * campo inválido só desabilita o botão, sem mensagem — é o caso de chave
   * Pix, que não tem formato para validar.
   */
  validar: (valorDigitado: string) => ResultadoValidacaoCampo;
  /** "diz para onde a ação segue" (`docs/componentes.md` §12). */
  rotuloBotao: string;
  onSalvar: (valorValidado: string) => Promise<{ ok: true } | { ok: false; erro: string }>;
  onFechar: () => void;
};

export function FolhaDeCampoUnico({
  titulo,
  apoio,
  rotuloCampo,
  placeholderCampo,
  tipoCampo,
  valorInicial,
  validar,
  rotuloBotao,
  onSalvar,
  onFechar,
}: Props) {
  const [valor, setValor] = useState(valorInicial);
  const [erroServidor, setErroServidor] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  const validado = validar(valor);
  // Campo vazio nunca é erro — nem no estado inicial nem depois de apagar o
  // que foi digitado (`docs/componentes.md` §12: "campo vazio é o estado
  // inicial esperado, não erro").
  const erroValidacao = valor.trim().length > 0 && !validado.ok ? validado.erro : undefined;

  async function salvar() {
    if (!validado.ok) return;
    setSalvando(true);
    setErroServidor(undefined);
    const resultado = await onSalvar(validado.valor);
    setSalvando(false);
    if (!resultado.ok) setErroServidor(resultado.erro);
  }

  return (
    <FolhaInferior titulo={titulo} onFechar={onFechar}>
      <span className="text-[14px] font-medium leading-[1.45] text-tinta-apoio-forte">{apoio}</span>
      <CampoTexto
        rotulo={rotuloCampo}
        type={tipoCampo}
        placeholder={placeholderCampo}
        value={valor}
        autoFocus
        onChange={(evento) => setValor(evento.target.value)}
        erro={erroValidacao}
      />
      {erroServidor ? (
        <span className="text-apoio font-medium text-vencido">{erroServidor}</span>
      ) : null}
      <Botao variante="principal" carregando={salvando} disabled={!validado.ok} onClick={salvar}>
        {rotuloBotao}
      </Botao>
      <Botao variante="texto" onClick={onFechar}>
        Agora não
      </Botao>
    </FolhaInferior>
  );
}
