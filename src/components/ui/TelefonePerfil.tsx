"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvisoDoSistema } from "./AvisoDoSistema";
import { FolhaDeTelefone } from "./FolhaDeTelefone";
import { linkWhatsapp, normalizarTelefone, type ResultadoSalvarTelefone } from "@/lib/utils/telefone";

/**
 * A célula de valor da linha Telefone no Perfil do Cliente e no Perfil do
 * Motorista (`docs/planos/item-5-ordem-de-servico.md`, Tarefa 1) — liga as
 * duas pendências "telefone tocável", registradas desde a Tarefa 5 (Cliente)
 * e a Tarefa 7 (Motorista) do item 2 (`docs/especificacao.md` §9, "Três
 * exigências...", item 3).
 *
 * Válido → link de verdade para o WhatsApp (`linkWhatsapp`, sem texto pronto
 * — é só "chamar", não "enviar ordem", que é a Tarefa 2). Ausente ou
 * inválido → abre `FolhaDeTelefone` em vez de uma conversa que não vai a
 * lugar nenhum; "Agora não" mostra o aviso genérico de campo vazio do perfil
 * (`docs/componentes.md` §12) — a mesma frase cobre também o caso de valor
 * inválido: da perspectiva de quem toca, um telefone que não abre conversa
 * nenhuma se comporta como vazio, mesmo tendo algo escrito.
 */

type Props = {
  nome: string;
  telefone: string | null;
  salvar: (telefone: string) => Promise<ResultadoSalvarTelefone>;
};

const APOIO = "Serve para abrir a conversa certa no WhatsApp — pedimos uma vez, fica salvo no cadastro.";

export function TelefonePerfil({ nome, telefone, salvar }: Props) {
  const router = useRouter();
  const [valorAtual, setValorAtual] = useState(telefone ?? "");
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [avisoVisivel, setAvisoVisivel] = useState(false);

  const normalizado = normalizarTelefone(valorAtual);

  // `-my-14 py-14` estende o alvo de toque até a borda da linha (mesma
  // altura de `LinhaDePerfil`, que já mede ≥48px com esse padding) sem
  // mudar a posição visual do texto — margem negativa cancela o padding
  // extra na caixa de fluxo, então a linha não cresce (`CLAUDE.md` §8,
  // "Alvo de toque mínimo 48px"; medido no DOM: sem isto, o alvo tinha só
  // 21.6px, a altura da linha de texto).
  if (normalizado.ok) {
    return (
      <a
        href={linkWhatsapp(normalizado.digitos)}
        target="_blank"
        rel="noopener noreferrer"
        className="-my-14 min-w-0 flex-1 py-14 text-campo font-semibold leading-[1.35] text-tinta [overflow-wrap:anywhere]"
      >
        {valorAtual}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setFolhaAberta(true)}
        className={[
          "-my-14 min-w-0 flex-1 py-14 text-left text-campo font-semibold leading-[1.35] [overflow-wrap:anywhere]",
          valorAtual ? "text-tinta" : "text-acao",
        ].join(" ")}
      >
        {valorAtual || "adicionar"}
      </button>

      {folhaAberta ? (
        <FolhaDeTelefone
          nome={nome}
          valorAtual={valorAtual}
          rotuloBotao="Salvar no cadastro"
          apoio={APOIO}
          onFechar={() => {
            setFolhaAberta(false);
            setAvisoVisivel(true);
          }}
          onSalvar={async (novoTelefone) => {
            const resultado = await salvar(novoTelefone);
            if (resultado.ok) {
              setValorAtual(novoTelefone);
              setFolhaAberta(false);
              // Sem isto, o cache de roteador do Next.js podia devolver a
              // versão antiga do servidor ao navegar de volta para esta
              // tela (o estado local já mostra certo, mas o servidor não
              // sabe disso) — achado do segundo `/revisar`.
              router.refresh();
            }
            return resultado;
          }}
        />
      ) : null}

      {avisoVisivel ? (
        <AvisoDoSistema
          mensagem="Campo continua vazio. Dá para preencher quando precisar."
          onSumir={() => setAvisoVisivel(false)}
        />
      ) : null}
    </>
  );
}
