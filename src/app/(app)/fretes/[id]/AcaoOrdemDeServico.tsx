"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { PilulaSobreEscuro } from "@/components/ui/PilulaSobreEscuro";
import { FolhaDeTelefone } from "@/components/ui/FolhaDeTelefone";
import { linkWhatsapp, normalizarTelefone } from "@/lib/utils/telefone";
import { marcarOrdemEnviadaAction } from "../acoes";
import { salvarTelefoneMotoristaAction } from "@/app/(app)/motoristas/acoes";

/**
 * Principal do detalhe do frete, fatia "em andamento" (item 5, Tarefa 2,
 * `docs/planos/item-5-ordem-de-servico.md`). Muda com o estado:
 *
 * - Sem motorista → "Escolher motorista", leva a Editar frete (decisão 4).
 * - Com motorista, telefone ausente ou inválido → "Enviar ordem no
 *   WhatsApp" abre `FolhaDeTelefone`; ao salvar, segue automaticamente para
 *   o link do WhatsApp. Cancelar ("Agora não") mostra o aviso do sistema já
 *   documentado para este gatilho (`docs/componentes.md` §12, linha 319):
 *   "Sem o telefone não dá para mandar a ordem por aqui."
 * - Com motorista e telefone válido → link de verdade, com o texto de
 *   `montarMensagemOrdem` já pronto.
 *
 * **Confirmação de envio** (decisão 3): só depois de o link ter sido tocado
 * (não em qualquer troca de aba), o retorno ao app (`visibilitychange`)
 * pergunta "Enviei" / "Ainda não". "Enviei" grava `ordem_enviada_em` — é o
 * dado que a dashboard vai usar para contar "fretes sem ordem enviada"
 * (`docs/especificacao.md` §4.6), então uma falha silenciosa aqui deixaria o
 * registro dizendo o contrário do que aconteceu. Se `marcarOrdemEnviadaAction`
 * falhar, o aviso **não fecha sozinho**: mostra o erro no lugar da pergunta e
 * deixa tocar "Enviei" de novo (a ação é idempotente — repetir é seguro).
 * "Ainda não" sempre fecha, com ou sem erro visível — é a saída explícita,
 * diferente do temporizador automático.
 */

type Props = {
  servicoId: string;
  motorista: { id: string; nome: string; telefone: string | null } | null;
  mensagem: string;
};

export function AcaoOrdemDeServico({ servicoId, motorista, mensagem }: Props) {
  const router = useRouter();
  const [telefoneAtual, setTelefoneAtual] = useState(motorista?.telefone ?? "");
  const [folhaAberta, setFolhaAberta] = useState(false);
  const [avisoSemTelefoneVisivel, setAvisoSemTelefoneVisivel] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [avisoConfirmacaoVisivel, setAvisoConfirmacaoVisivel] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | undefined>();

  // Só reabre o aviso quando o link foi tocado nesta sessão da tela — trocar
  // de aba para outra coisa qualquer, sem ter tocado "Enviar ordem", nunca
  // pergunta nada (decisão 3, `docs/planos/item-5-ordem-de-servico.md`).
  useEffect(() => {
    function aoVoltar() {
      if (tocado && document.visibilityState === "visible") {
        setTocado(false);
        setAvisoConfirmacaoVisivel(true);
      }
    }
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [tocado]);

  function fecharConfirmacao() {
    setAvisoConfirmacaoVisivel(false);
    setErroConfirmacao(undefined);
  }

  async function confirmarEnvio() {
    setConfirmando(true);
    try {
      const resultado = await marcarOrdemEnviadaAction(servicoId);
      if (!resultado.ok) {
        // Sem `fecharConfirmacao()` aqui — o achado do `/revisar` é
        // exatamente este: fechar em silêncio deixaria a pessoa achar que
        // gravou quando não gravou. O temporizador de `AvisoDoSistema` ainda
        // chama `onSumir` uma vez aos 8s; enquanto houver erro, esse chamado
        // é ignorado (ver abaixo), então o aviso só sai por "Ainda não" ou
        // por um "Enviei" que dessa vez funcione.
        setErroConfirmacao(resultado.erro);
        return;
      }
      fecharConfirmacao();
      router.refresh();
    } catch {
      // A ação de servidor pode nunca chegar ao servidor (rede caiu, sessão
      // caiu) — isso rejeita a promise em vez de devolver `{ ok: false }`.
      // Medido ao vivo nesta tarefa: sem este `catch`, a exceção não tratada
      // travava "Enviei" em carregando para sempre, sem erro visível e sem
      // jeito de tentar de novo — o mesmo risco que o `if (!resultado.ok)`
      // acima já cobre, só que por um caminho diferente.
      setErroConfirmacao("Não deu para salvar agora.");
    } finally {
      setConfirmando(false);
    }
  }

  if (!motorista) {
    return (
      <Botao variante="principal" href={`/fretes/${servicoId}/editar`}>
        Escolher motorista
      </Botao>
    );
  }

  const avisoConfirmacao = avisoConfirmacaoVisivel ? (
    <AvisoDoSistema
      mensagem={erroConfirmacao ?? "Mandou a ordem pro motorista?"}
      onSumir={() => {
        if (erroConfirmacao) return;
        fecharConfirmacao();
      }}
      botoes={
        <>
          <PilulaSobreEscuro
            dentroDoAviso
            className="flex-1"
            carregando={confirmando}
            onClick={confirmarEnvio}
          >
            Enviei
          </PilulaSobreEscuro>
          <PilulaSobreEscuro dentroDoAviso className="flex-1" onClick={fecharConfirmacao}>
            Ainda não
          </PilulaSobreEscuro>
        </>
      }
    />
  ) : null;

  const avisoSemTelefone = avisoSemTelefoneVisivel ? (
    <AvisoDoSistema
      mensagem="Sem o telefone não dá para mandar a ordem por aqui."
      onSumir={() => setAvisoSemTelefoneVisivel(false)}
    />
  ) : null;

  const normalizado = normalizarTelefone(telefoneAtual);

  if (!normalizado.ok) {
    return (
      <>
        <Botao variante="principal" onClick={() => setFolhaAberta(true)}>
          Enviar ordem no WhatsApp
        </Botao>
        {folhaAberta ? (
          <FolhaDeTelefone
            nome={motorista.nome}
            valorAtual={telefoneAtual}
            rotuloBotao="Salvar e enviar ordem"
            apoio="Serve para mandar a ordem certa no WhatsApp — fica salvo no cadastro do motorista."
            onFechar={() => {
              setFolhaAberta(false);
              setAvisoSemTelefoneVisivel(true);
            }}
            onSalvar={async (novoTelefone) => {
              // ORDEM É REGRA, NÃO DETALHE: `window.open` tem que rodar
              // ANTES do primeiro `await` desta função — nunca mova o
              // `await salvarTelefoneMotoristaAction` para cima disto.
              // Achado do segundo `/revisar` (Tarefa 2 do item 5,
              // 23-24/08/2026): navegador de celular (o único aparelho onde
              // este item existe, `CLAUDE.md` §1) bloqueia `window.open`
              // chamado depois de um `await`, porque a pausa assíncrona
              // quebra a cadeia de gesto confiável do toque original — o
              // navegador do computador nunca reproduz isso, então um teste
              // só no desktop passaria "por engano" com a ordem errada. Os
              // dígitos já estão disponíveis sem esperar o servidor — o
              // texto vai para o número certo mesmo que a gravação do
              // telefone falhe depois; só o "lembrar para a próxima vez"
              // depende do salvar.
              const digitado = normalizarTelefone(novoTelefone);
              if (digitado.ok) {
                window.open(linkWhatsapp(digitado.digitos, mensagem), "_blank", "noopener,noreferrer");
                setTocado(true);
              }
              const resultado = await salvarTelefoneMotoristaAction(motorista.id, novoTelefone);
              if (resultado.ok) {
                setTelefoneAtual(novoTelefone);
                setFolhaAberta(false);
                router.refresh();
              }
              return resultado;
            }}
          />
        ) : null}
        {avisoSemTelefone}
        {avisoConfirmacao}
      </>
    );
  }

  return (
    <>
      <Botao
        variante="principal"
        href={linkWhatsapp(normalizado.digitos, mensagem)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setTocado(true)}
      >
        Enviar ordem no WhatsApp
      </Botao>
      {avisoConfirmacao}
    </>
  );
}
