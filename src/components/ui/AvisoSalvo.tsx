"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvisoDoSistema } from "./AvisoDoSistema";

/**
 * Aviso "salvo" genérico — para telas cujo formulário de servidor redireciona
 * para si mesma em caso de sucesso (`?salvo=1`) e por isso não tinha nenhum
 * retorno visível: Configurações e Conta da empresa, achado do fundador
 * (12/09/2026), mesma classe já corrigida em "Marcar como finalizado"
 * (`BotaoMarcarFinalizado.tsx`) e em "Frete salvo" (`AvisoFreteSalvo.tsx`).
 *
 * Diferente de `AvisoFreteSalvo`, que tem botões e regra própria do domínio
 * de frete — este é só o par "mostra aviso, limpa a URL", sem nada
 * específico de tela. As duas telas que usam isto hoje bastam para não ser
 * especulação (`CLAUDE.md` §6).
 *
 * **Estado local `visivel`, não só `router.replace`** — decisão do
 * fundador, 12/09/2026: repete o mecanismo já provado de `AvisoFreteSalvo`
 * em vez de um caminho mais simples só com `replace`. Sem o estado local, o
 * aviso ficaria refém de `salvo` virar `undefined` a tempo de desmontar
 * este componente — com o estado local, o `onSumir` do timer ou do toque
 * some o aviso na hora, e o `replace` só limpa a URL por trás, sem
 * depender de reavaliação da página para a pessoa ver o aviso sumir.
 *
 * **Os textos "Configurações salvas" e "Dados salvos" são provisórios** —
 * escolha da tarefa, sem registro em `docs/componentes.md`; o fundador
 * confirmou que servem (12/09/2026), mas ficam junto das outras pendências
 * do Design até ganharem entrada própria no inventário.
 */

type Props = { mensagem: string; path: string };

export function AvisoSalvo({ mensagem, path }: Props) {
  const router = useRouter();
  const [visivel, setVisivel] = useState(true);

  function sumir() {
    setVisivel(false);
    router.replace(path);
  }

  if (!visivel) return null;

  return <AvisoDoSistema mensagem={mensagem} onSumir={sumir} />;
}
