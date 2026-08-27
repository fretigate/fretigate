"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Botao } from "./Botao";
import { PilulaEmLinha } from "./PilulaEmLinha";
import { AvisoDoSistema } from "./AvisoDoSistema";
import { PilulaSobreEscuro } from "./PilulaSobreEscuro";
import { FolhaDeTelefone } from "./FolhaDeTelefone";
import { FolhaDePix } from "./FolhaDePix";
import { linkWhatsapp, normalizarTelefone } from "@/lib/utils/telefone";
import { montarMensagemCobranca, type DadosMensagemCobranca } from "@/lib/servicos/mensagens";

/**
 * "Cobrar no WhatsApp" (item 6, Tarefa 5) — pílula em linha na lista de
 * Cobranças, secundária no detalhe da cobrança (`docs/componentes.md`,
 * linhas 451-452). Dois consumidores, um componente só (`CLAUDE.md` §8),
 * mesmo padrão de `AcaoMarcarRecebido`.
 *
 * **Dois campos podem faltar, com regras diferentes** (`docs/componentes.md`
 * §12): sem telefone do cliente, a ação **bloqueia** — abre `FolhaDeTelefone`,
 * e "Agora não" fecha sem cobrar. Sem chave Pix da empresa, a ação **não
 * bloqueia** — abre `FolhaDePix`, mas "Agora não" (ou fechar de qualquer
 * jeito) segue para o WhatsApp do mesmo jeito, com a mensagem sem o bloco do
 * Pix (decisão 2, `docs/planos/item-6-titulo-e-cobrancas.md`). Quando os dois
 * faltam, o telefone é resolvido primeiro — sem número não há conversa para
 * abrir, então perguntar pelo Pix antes seria pedir um dado que talvez nunca
 * vá a lugar nenhum.
 *
 * **`chavePixEmpresa` chega como prop, sem estado local** — diferente de
 * `telefoneAtual` (que é por cliente, e só esta linha o usa). A chave Pix é
 * da empresa inteira: outras linhas da mesma lista precisam do mesmo valor,
 * e um estado local por instância divergiria da verdade assim que uma delas
 * salvasse uma chave nova. `router.refresh()`, chamado ao salvar, é quem
 * propaga o valor novo para todas — o preço é a linha que acabou de salvar
 * não reaparecer instantaneamente como "com Pix" antes do refresh completar,
 * o mesmo tipo de atraso que o resto do produto já aceita nesse padrão.
 *
 * **`window.open` antes do primeiro `await`, sempre** — mesma regra de
 * `AcaoOrdemDeServico.tsx` (achado do `/revisar` na Tarefa 2 do item 5): o
 * navegador de celular quebra a cadeia de gesto confiável do toque original
 * se `window.open` roda depois de uma pausa assíncrona.
 *
 * **As folhas e os avisos (todos `fixed`, `FolhaInferior.tsx`) vão para
 * `document.body` via `createPortal`, nunca ficam onde o JSX os escreve.**
 * Achado do `/revisar`: a pílula em linha (`variante="pilula"`) nasce dentro
 * do `rodape` de `LinhaDeLista`, que pode estar dentro de
 * `DeslizarParaRevelar` — e esse componente aplica `transform: translateX(…)`
 * no `<div>` que envolve a linha inteira, sempre, mesmo com deslocamento 0
 * (`translateX(0px)` continua sendo um `transform`). Um ancestral com
 * `transform` vira o "viewport" de qualquer `fixed` dentro dele (regra do
 * CSS, não bug de navegador) — exatamente o problema que o comentário de
 * `FolhaInferior.tsx` já registra ter conferido que não existia em nenhum
 * ancestral, e que este componente recriaria sem o portal. `document.body`
 * nunca tem `transform`, então o portal restaura a garantia.
 */

type Props = {
  variante: "pilula" | "secundaria";
  tituloId: string;
  cliente: { id: string; nome: string; telefone: string | null };
  /** As peças do molde (`montarMensagemCobranca`) que não mudam nesta tela — só `pix` varia, com `chavePixEmpresa`. */
  dadosMensagem: Omit<DadosMensagemCobranca, "pix">;
  chavePixEmpresa: string | null;
  registrar: (tituloId: string) => Promise<{ ok: true } | { ok: false; erro: string }>;
  salvarTelefoneCliente: (
    clienteId: string,
    telefone: string,
  ) => Promise<{ ok: true } | { ok: false; erro: string }>;
  salvarChavePix: (chavePix: string) => Promise<{ ok: true } | { ok: false; erro: string }>;
};

// `useSyncExternalStore` para saber se já estamos no cliente, sem o padrão
// "setState dentro de um efeito" que o `react-hooks/set-state-in-effect`
// (achado do `/revisar`) recusa — não é assinatura de nada de verdade, só o
// jeito correto de perguntar "isto já hidratou?" sem disparar um re-render em
// cascata a partir de um efeito.
function inscreverNoop() {
  return () => {};
}
function estaNoCliente() {
  return true;
}
function estaNoServidor() {
  return false;
}

function IconeWhatsapp() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4.8a7.2 7.2 0 0 0 -6.187 10.913L4.8 19.2l3.6 -1.012A7.2 7.2 0 1 0 12 4.8Z" />
    </svg>
  );
}

export function AcaoCobrarNoWhatsApp({
  variante,
  tituloId,
  cliente,
  dadosMensagem,
  chavePixEmpresa,
  registrar,
  salvarTelefoneCliente,
  salvarChavePix,
}: Props) {
  const router = useRouter();
  // `document.body` só existe no cliente — sem isto, `createPortal` (abaixo)
  // quebra a primeira renderização no servidor. As folhas/avisos nunca
  // aparecem antes do toque do usuário, então `montado` fica `false` durante
  // toda a renderização do servidor sem perder nenhum estado real.
  const montado = useSyncExternalStore(inscreverNoop, estaNoCliente, estaNoServidor);
  const [telefoneAtual, setTelefoneAtual] = useState(cliente.telefone ?? "");
  const [folhaTelefoneAberta, setFolhaTelefoneAberta] = useState(false);
  const [folhaPixAberta, setFolhaPixAberta] = useState(false);
  const [avisoSemTelefoneVisivel, setAvisoSemTelefoneVisivel] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [avisoConfirmacaoVisivel, setAvisoConfirmacaoVisivel] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | undefined>();

  // Mesmo padrão de `AcaoOrdemDeServico.tsx`: só pergunta ao voltar do
  // WhatsApp quando o link foi tocado nesta sessão da tela.
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
      const resultado = await registrar(tituloId);
      if (!resultado.ok) {
        setErroConfirmacao(resultado.erro);
        return;
      }
      fecharConfirmacao();
      router.refresh();
    } catch {
      setErroConfirmacao("Não deu para salvar agora.");
    } finally {
      setConfirmando(false);
    }
  }

  function mensagemCom(pix: string | null): string {
    return montarMensagemCobranca({ ...dadosMensagem, pix });
  }

  const avisoConfirmacao = avisoConfirmacaoVisivel ? (
    <AvisoDoSistema
      mensagem={erroConfirmacao ?? "Mandou a cobrança pro cliente?"}
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
      mensagem="Sem o telefone não dá para cobrar por aqui."
      onSumir={() => setAvisoSemTelefoneVisivel(false)}
    />
  ) : null;

  const normalizado = normalizarTelefone(telefoneAtual);

  function acionar() {
    if (!normalizado.ok) {
      setFolhaTelefoneAberta(true);
      return;
    }
    if (chavePixEmpresa === null) {
      setFolhaPixAberta(true);
      return;
    }
    window.open(linkWhatsapp(normalizado.digitos, mensagemCom(chavePixEmpresa)), "_blank", "noopener,noreferrer");
    setTocado(true);
  }

  const folhas = (
    <>
      {folhaTelefoneAberta ? (
        <FolhaDeTelefone
          nome={cliente.nome}
          valorAtual={telefoneAtual}
          rotuloBotao="Salvar e cobrar"
          apoio="Serve para cobrar o cliente no WhatsApp — fica salvo no cadastro dele."
          onFechar={() => {
            setFolhaTelefoneAberta(false);
            setAvisoSemTelefoneVisivel(true);
          }}
          onSalvar={async (novoTelefone) => {
            // ORDEM É REGRA: `window.open` (quando já dá para seguir direto)
            // roda antes do `await` — mesmo motivo de `AcaoOrdemDeServico.tsx`.
            const digitado = normalizarTelefone(novoTelefone);
            const seguirDireto = digitado.ok && chavePixEmpresa !== null;
            if (digitado.ok && seguirDireto) {
              window.open(
                linkWhatsapp(digitado.digitos, mensagemCom(chavePixEmpresa)),
                "_blank",
                "noopener,noreferrer",
              );
              setTocado(true);
            }
            const resultado = await salvarTelefoneCliente(cliente.id, novoTelefone);
            if (resultado.ok) {
              setTelefoneAtual(novoTelefone);
              setFolhaTelefoneAberta(false);
              // Telefone acabou de ficar válido, mas a chave Pix ainda falta
              // — encadeia para a folha de Pix em vez de abrir o WhatsApp
              // sem ela silenciosamente.
              if (digitado.ok && !seguirDireto) setFolhaPixAberta(true);
              router.refresh();
            }
            return resultado;
          }}
        />
      ) : null}

      {folhaPixAberta ? (
        <FolhaDePix
          rotuloBotao="Salvar e cobrar"
          onFechar={() => {
            // Exceção do §12: "Agora não" (e fechar de qualquer jeito) não
            // cancela a ação — a mensagem segue sem o bloco do Pix.
            if (normalizado.ok) {
              window.open(linkWhatsapp(normalizado.digitos, mensagemCom(null)), "_blank", "noopener,noreferrer");
              setTocado(true);
            }
            setFolhaPixAberta(false);
          }}
          onSalvar={async (chavePixDigitada) => {
            if (normalizado.ok) {
              window.open(
                linkWhatsapp(normalizado.digitos, mensagemCom(chavePixDigitada)),
                "_blank",
                "noopener,noreferrer",
              );
              setTocado(true);
            }
            const resultado = await salvarChavePix(chavePixDigitada);
            if (resultado.ok) {
              setFolhaPixAberta(false);
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

  const sobreposicoes = montado ? createPortal(folhas, document.body) : null;

  if (variante === "secundaria") {
    return (
      <>
        <Botao variante="secundaria" onClick={acionar}>
          Cobrar no WhatsApp
        </Botao>
        {sobreposicoes}
      </>
    );
  }

  return (
    <>
      <PilulaEmLinha onClick={acionar}>
        <IconeWhatsapp />
        Cobrar no WhatsApp
      </PilulaEmLinha>
      {sobreposicoes}
    </>
  );
}
