"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { PilulaSobreEscuro } from "@/components/ui/PilulaSobreEscuro";
import { criarTituloJaRecebiAction } from "./acoes";

/**
 * Aviso "Frete salvo" (`docs/planos/item-3-lancamento-frete.md`, Tarefa 3):
 * `criarServicoAction` redireciona para `/fretes?criado=<id>`, e esta tela
 * mostra o aviso enquanto esse parâmetro existir. Client component porque
 * precisa do timer de `AvisoDoSistema` e de limpar a URL depois.
 */

type Props = { servicoId: string };

export function AvisoFreteSalvo({ servicoId }: Props) {
  const router = useRouter();
  const [visivel, setVisivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  /**
   * Limpa `?criado=` da URL — sem isso, recarregar ou voltar pela navegação
   * reabre este aviso. A recusa de um segundo título para o mesmo frete não
   * depende disto (fica em `criarTituloJaRecebi`,
   * `src/lib/servicos/titulos.ts`); isto é só para o aviso não reaparecer à
   * toa.
   */
  function sumir() {
    setVisivel(false);
    router.replace("/fretes");
  }

  async function jaRecebi() {
    setSalvando(true);
    const resultado = await criarTituloJaRecebiAction(servicoId);
    setSalvando(false);
    if (!resultado.ok) {
      // "Este frete já tem título lançado." é a mensagem mais provável aqui
      // — o guard do serviço, não um erro de verdade. Substitui "Frete
      // salvo" e some sozinho, sem botão (não há mais o que fazer).
      setErro(resultado.erro);
      return;
    }
    sumir();
  }

  if (!visivel) return null;

  return (
    <AvisoDoSistema
      mensagem={erro ?? "Frete salvo"}
      onSumir={sumir}
      botoes={
        erro ? undefined : (
          <PilulaSobreEscuro
            dentroDoAviso
            className="flex-1"
            carregando={salvando}
            onClick={jaRecebi}
          >
            Já recebi
          </PilulaSobreEscuro>
        )
      }
    />
  );
}
