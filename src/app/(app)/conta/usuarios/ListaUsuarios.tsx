"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { BotaoContinuarExterno } from "@/components/ui/BotaoContinuarExterno";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { AvisoDoSistema } from "@/components/ui/AvisoDoSistema";
import { iniciaisPessoa } from "@/lib/utils/iniciais";
import { linkWhatsapp, normalizarTelefone } from "@/lib/utils/telefone";
import { abrirLinkExterno, prepararJanelaExterna } from "@/lib/utils/link-externo";
import { linkDeAceiteDoConvite } from "@/lib/utils/convite";
import { montarMensagemConvite } from "@/lib/servicos/mensagens";
import { cancelarConviteAction, reenviarConviteAction } from "./acoes";

/**
 * Corpo da lista (item 10, Tarefa 4) — duas seções: com acesso (sempre tem
 * pelo menos o dono) e convite pendente (some quando não há nenhum, não é
 * "estado vazio" — a tela inteira nunca está vazia). `docs/navegacao.md`
 * linha 61.
 *
 * **A linha do convite pendente não navega para lugar nenhum** — não existe
 * "detalhe do convite" (só de usuário com acesso). Tocar a linha faz a
 * mesma coisa que a pílula "Ver o que ela recebe": abre a própria tela
 * pública, com o token já conhecido — `LinhaDeLista` exige `href` **ou**
 * `onClick` (nunca nenhum dos dois), então o toque na linha ganhou essa
 * ação em vez de ficar sem nenhuma.
 *
 * **"Reenviar" regenera o token e reabre o WhatsApp** — mesmo mecanismo de
 * `FormularioConvite.tsx` (aba em branco antes do `await`, ver o comentário
 * lá): reenviar significa mandar de novo, não só trocar o token em
 * silêncio. Quando não há aba para redirecionar (app instalado, aba
 * bloqueada, navegador que não respeitou o corte do vínculo), o segundo
 * toque — `BotaoContinuarExterno`, em formato de pílula — toma o lugar de
 * "Reenviar" **na própria linha do convite**: é onde a pessoa acabou de
 * tocar, e é o padrão das ações daquela linha (nada de botão principal numa
 * lista, nada de bloco de ação — `docs/componentes.md`, "Listas: sem bloco
 * de ação"). Cancelar o convite tira a linha, e o botão com ela: o link dele
 * já não vale. Fica até a lista ser recarregada — o link é o do token
 * atual, então tocar de novo reenvia a mesma mensagem.
 * **Provisório**, sem confirmação do Design
 * (`docs/planos/corrige-link-externo-segundo-toque.md`).
 *
 * **Achado do `/revisar`: o estado local (`convitesAtuais`) tinha que
 * atualizar SEMPRE que `reenviarConviteAction` tivesse sucesso, não só no
 * caminho feliz.** A primeira versão só chamava `setConvitesAtuais` depois
 * de abrir o WhatsApp — o ramo de cima (telefone que não normaliza; na
 * época, também `janela` bloqueada pelo navegador) devolvia antes disso.
 * O convite já
 * tinha sido renovado no banco nesse ponto (o token velho já não vale mais
 * — é a mesma reivindicação de uso único de `aceitarConvite`), então "Ver o
 * que ela recebe" continuava abrindo o token MORTO, mostrando "Este convite
 * não está mais disponível" para um convite que seguia pendente de verdade.
 * A pessoa que tinha recebido o link original também não consegue mais
 * aceitar por ele — **o aviso avisa isso explicitamente**, não só atualiza
 * a lista em silêncio, porque descobrir que o link virou letra morta é
 * informação que a pessoa precisa para agir (mandar o link novo por outro
 * caminho), não só um detalhe técnico.
 */

type Usuario = { id: string; nome: string; email: string; papel: "dono" | "operador" };
type Convite = { id: string; nome: string; telefone: string; token: string };

function abrirPreviaDoConvite(token: string) {
  abrirLinkExterno(linkDeAceiteDoConvite(token));
}

const ROTULO_PAPEL: Record<Usuario["papel"], string> = { dono: "Dono", operador: "Operador" };

export function ListaUsuarios({
  usuarios,
  convites,
  empresaNome,
}: {
  usuarios: Usuario[];
  convites: Convite[];
  empresaNome: string;
}) {
  const [convitesAtuais, setConvitesAtuais] = useState(convites);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [linkPronto, setLinkPronto] = useState<{ conviteId: string; url: string } | null>(null);

  async function reenviar(convite: Convite) {
    if (reenviando) return;
    setReenviando(convite.id);
    setLinkPronto(null);

    // ORDEM É REGRA — a janela se prepara antes do `await`, dentro da cadeia
    // de gesto do toque (mesmo mecanismo de `FormularioConvite.tsx`). No app
    // instalado, `prepararJanelaExterna` não abre nada, e quando o link chega
    // devolve `"precisa-de-toque"` (`link-externo.ts`).
    const janela = prepararJanelaExterna();

    try {
      const resultado = await reenviarConviteAction(convite.id);
      if (!resultado.ok) {
        janela.fechar();
        setAviso(resultado.erro);
        return;
      }

      // O convite já foi renovado no banco NESTE ponto — o token antigo
      // parou de valer, então o estado local reflete isso sempre, mesmo
      // que a aba do WhatsApp não abra a seguir (achado do `/revisar`).
      setConvitesAtuais((atuais) =>
        atuais.map((c) => (c.id === convite.id ? { ...c, token: resultado.convite.token } : c)),
      );

      const normalizado = normalizarTelefone(resultado.convite.telefone);
      if (!normalizado.ok) {
        janela.fechar();
        // O link antigo já não serve mais para quem o recebeu — precisa
        // dizer isso, não só que "algo deu errado" (pedido do fundador).
        setAviso(
          'Convite renovado — o link antigo não vale mais. O WhatsApp não abriu sozinho; toque em "Ver o que ela recebe" para pegar o link novo.',
        );
        return;
      }

      const mensagem = montarMensagemConvite({
        nomeConvidado: resultado.convite.nome,
        nomeEmpresa: empresaNome,
        link: linkDeAceiteDoConvite(resultado.convite.token),
      });
      const link = linkWhatsapp(normalizado.digitos, mensagem);
      if (janela.redirecionarPara(link) === "precisa-de-toque") {
        setLinkPronto({ conviteId: convite.id, url: link });
      }
    } catch {
      janela.fechar();
      setAviso("Não deu para reenviar agora.");
    } finally {
      setReenviando(null);
    }
  }

  async function cancelar(conviteId: string) {
    if (cancelando) return;
    setCancelando(conviteId);
    try {
      const resultado = await cancelarConviteAction(conviteId);
      if (!resultado.ok) {
        setAviso(resultado.erro);
        return;
      }
      setConvitesAtuais((atuais) => atuais.filter((c) => c.id !== conviteId));
    } catch {
      setAviso("Não deu para cancelar agora.");
    } finally {
      setCancelando(null);
    }
  }

  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-col gap-8">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Com acesso
        </span>
        <div className="flex flex-col gap-6">
          {usuarios.map((usuario) => (
            <LinhaDeLista
              key={usuario.id}
              href={`/conta/usuarios/${usuario.id}`}
              iniciais={iniciaisPessoa(usuario.nome)}
              nome={usuario.nome}
              apoio={`${usuario.email} · ${ROTULO_PAPEL[usuario.papel]}`}
            />
          ))}
        </div>
      </div>

      {convitesAtuais.length > 0 ? (
        <div className="flex flex-col gap-8">
          <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Convite enviado
          </span>
          <div className="flex flex-col gap-6">
            {convitesAtuais.map((convite) => (
              <LinhaDeLista
                key={convite.id}
                onClick={() => abrirPreviaDoConvite(convite.token)}
                iniciais={iniciaisPessoa(convite.nome)}
                nome={convite.nome}
                apoio={convite.telefone}
                rodape={
                  <div className="flex flex-wrap items-center gap-10">
                    {linkPronto?.conviteId === convite.id ? (
                      <BotaoContinuarExterno formato="pilula" href={linkPronto.url} destino="whatsapp">
                        Continuar no WhatsApp
                      </BotaoContinuarExterno>
                    ) : (
                      <PilulaEmLinha carregando={reenviando === convite.id} onClick={() => reenviar(convite)}>
                        Reenviar
                      </PilulaEmLinha>
                    )}
                    <PilulaEmLinha onClick={() => abrirPreviaDoConvite(convite.token)}>
                      Ver o que ela recebe
                    </PilulaEmLinha>
                    <Botao
                      variante="texto"
                      destrutiva
                      disabled={cancelando === convite.id}
                      onClick={() => cancelar(convite.id)}
                    >
                      Cancelar
                    </Botao>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {aviso ? <AvisoDoSistema mensagem={aviso} onSumir={() => setAviso(null)} /> : null}
    </div>
  );
}
