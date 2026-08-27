"use client";

import { FolhaDeCampoUnico } from "./FolhaDeCampoUnico";
import { normalizarTelefone, type ResultadoSalvarTelefone } from "@/lib/utils/telefone";

/**
 * "Folha do campo que falta" (`docs/componentes.md` §12), primeiro
 * consumidor real do documento — item 5, Tarefa 1. Resolve dois casos com o
 * mesmo componente, diferença só no título e no estado inicial do campo
 * (`docs/planos/item-5-ordem-de-servico.md`, decisão 2):
 *
 * - **Ausente** (`valorAtual` vazio): título "Falta o telefone de {nome}",
 *   campo vazio, sem erro até o primeiro dígito.
 * - **Inválido** (`valorAtual` é o texto salvo, que não passa em
 *   `normalizarTelefone`): título "O telefone de {nome} não parece válido",
 *   campo pré-preenchido com o valor salvo, erro já visível — para corrigir
 *   em vez de digitar do zero.
 *
 * O miolo comum a toda folha deste tipo (campo, erro, principal, "Agora
 * não") mora em `FolhaDeCampoUnico` — extraído para lá quando `FolhaDePix`
 * (item 6, Tarefa 5) nasceu cópia deste arquivo (`CLAUDE.md` §8, achado do
 * `/revisar`). Este componente só injeta o que é específico de telefone: o
 * título por estado, e `normalizarTelefone` como validação.
 */

type Props = {
  nome: string;
  valorAtual: string;
  rotuloBotao: string;
  apoio: string;
  onSalvar: (telefone: string) => Promise<ResultadoSalvarTelefone>;
  onFechar: () => void;
};

export function FolhaDeTelefone({ nome, valorAtual, rotuloBotao, apoio, onSalvar, onFechar }: Props) {
  const ausente = valorAtual.trim().length === 0;

  return (
    <FolhaDeCampoUnico
      titulo={ausente ? `Falta o telefone de ${nome}` : `O telefone de ${nome} não parece válido`}
      apoio={apoio}
      rotuloCampo="Telefone"
      placeholderCampo="Com DDD"
      tipoCampo="tel"
      valorInicial={valorAtual}
      validar={(valorDigitado) => {
        const resultado = normalizarTelefone(valorDigitado);
        // `valor` continua o texto cru digitado, não os dígitos extraídos —
        // `onSalvar` sempre recebeu o texto como está no campo (o chamador
        // decide o que fazer com ele, ver `AcaoOrdemDeServico.tsx`).
        return resultado.ok ? { ok: true, valor: valorDigitado } : { ok: false, erro: resultado.erro };
      }}
      rotuloBotao={rotuloBotao}
      onSalvar={onSalvar}
      onFechar={onFechar}
    />
  );
}
