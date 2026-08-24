"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { marcarServicoFinalizadoAction } from "../acoes";

/**
 * Secundária do detalhe do frete, fatia "em andamento" (item 5, Tarefa 3,
 * `docs/planos/item-5-ordem-de-servico.md`) — aparece sempre que o frete
 * estiver `em_andamento`, qualquer que seja o estado da principal (Escolher
 * motorista / Enviar ordem no WhatsApp): marcar como finalizado e enviar a
 * ordem são ações independentes, dá para finalizar um frete que nunca teve
 * ordem enviada. Sem confirmação extra — nenhum documento pede uma, e o
 * estado carregando + toque ignorado já evita duplo toque (`CLAUDE.md` §8).
 *
 * **Sempre montado, mesmo fora de `em_andamento`** — achado do `/revisar`,
 * decisão do fundador: a tela atualiza (`router.refresh()`) na hora do
 * sucesso, não depois do aviso sumir (esperar deixaria o botão visível
 * sobre um frete já finalizado, convidando a tocar de novo sobre estado que
 * já mudou). Mas `AvisoDoSistema` é sobreposição ancorada, não pertence ao
 * bloco de ações — não pode sumir com ele. Se este componente só montasse
 * dentro do `if (em_andamento)` de `page.tsx`, o refresh o desmontaria (o
 * pai para de renderizá-lo) e o aviso "Frete finalizado" morreria junto,
 * antes de a pessoa conseguir ler. Por isso `page.tsx` renderiza este
 * componente incondicionalmente, e é ele mesmo — via `emAndamento` — quem
 * decide se o botão aparece; o aviso é estado próprio, que sobrevive ao
 * refresh porque o componente nunca desmonta.
 *
 * **Sucesso e erro pelo mesmo `AvisoDoSistema`** (achado do `/revisar`,
 * mesma decisão): antes, o erro aparecia como texto vermelho ao lado do
 * botão, um segundo tratamento para a mesma classe de falha que o vizinho
 * (`AcaoOrdemDeServico.tsx`) já resolve com o aviso escuro — duas
 * superfícies para o mesmo tipo de mensagem no mesmo lugar. Erro não tem
 * botões (sem confirmação de retorno como o WhatsApp): some sozinho, e o
 * botão continua disponível para tentar de novo.
 */

type Props = { servicoId: string; emAndamento: boolean };

export function BotaoMarcarFinalizado({ servicoId, emAndamento }: Props) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function finalizar() {
    setCarregando(true);
    try {
      const resultado = await marcarServicoFinalizadoAction(servicoId);
      if (!resultado.ok) {
        setAviso(resultado.erro);
        return;
      }
      setAviso("Frete finalizado");
      router.refresh();
    } catch {
      setAviso("Não deu para salvar agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {emAndamento ? (
        <Botao variante="secundaria" carregando={carregando} onClick={finalizar}>
          Marcar como finalizado
        </Botao>
      ) : null}
      {aviso ? <AvisoDoSistema mensagem={aviso} onSumir={() => setAviso(null)} /> : null}
    </>
  );
}
