"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { linkWhatsapp, normalizarTelefone } from "@/lib/utils/telefone";
import { prepararJanelaExterna } from "@/lib/utils/link-externo";
import { linkDeAceiteDoConvite } from "@/lib/utils/convite";
import { montarMensagemConvite } from "@/lib/servicos/mensagens";
import { criarConviteAction } from "../acoes";

/**
 * Formulário de convite (item 10, Tarefa 4). Nome + WhatsApp, prévia da
 * mensagem ao vivo, principal "Mandar convite no WhatsApp".
 *
 * **Mecanismo do toque único, achado do fundador ao aprovar o plano — o
 * ponto mais delicado da tarefa.** O link do WhatsApp
 * (`/aceitar-convite?token=...`) só existe depois que o servidor cria o
 * `Convite` e gera o token — diferente de Cobrar no WhatsApp/Enviar ordem,
 * onde a mensagem inteira já está pronta antes do toque, e por isso
 * `abrirLinkExterno` roda sempre antes do primeiro `await`. Aqui não dá: o
 * dado que falta só existe DEPOIS do `await`. A saída, sem abrir mão do
 * toque único nem do gerador de token continuar no servidor
 * (`crypto.randomBytes`, `gerarTokenDeConvite` em `usuarios.ts` — gerar no
 * cliente enfraqueceria a garantia de token imprevisível):
 * `prepararJanelaExterna()` (`src/lib/utils/link-externo.ts`) — em
 * navegador comum, abre uma aba em branco **antes** do `await` (ainda
 * dentro da cadeia de gesto do toque) e a redireciona depois; em standalone
 * não abre nada agora, só guarda a intenção e navega a própria janela
 * quando o link estiver pronto — mesmo raciocínio de
 * `AcaoOrdemDeServico.tsx`/`AcaoCobrarNoWhatsApp.tsx` (achado do fundador,
 * app instalado no iPhone, 12/09/2026): uma aba `_blank` aberta agora e
 * redirecionada depois ainda faz o WebKit abrir o Safari de verdade para
 * hospedá-la, o mesmo defeito por outro caminho.
 *
 * **Testado com emulação de celular no Browser pane; o fundador confirma no
 * aparelho dele antes de considerar o mecanismo fechado** — o caminho de
 * navegador comum já tinha um defeito real de navegador de celular
 * corrigido antes (`AcaoOrdemDeServico.tsx`, achado do `/revisar` na Tarefa
 * 2 do item 5), e emulação de desktop não reproduz nem aquele bloqueio nem
 * o de standalone no iOS de verdade (`CLAUDE.md` §1: "quem mede é ele, no
 * aparelho dele"). **Não declarado corrigido** para o caso standalone até
 * essa confirmação.
 *
 * Se o navegador ainda assim bloquear a aba (`janela === null` — pode
 * acontecer mesmo com a técnica, em navegador comum configurado para
 * bloquear tudo; nunca acontece em standalone, que não abre aba nenhuma), o
 * convite já foi criado e continua acessível pela lista, em "Ver o que ela
 * recebe" — nunca se perde, só a abertura automática falha.
 */
export function FormularioConvite({ empresaNome }: { empresaNome: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [erroTelefone, setErroTelefone] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | undefined>();
  const [criando, setCriando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (criando) return;

    setErroNome(undefined);
    setErroTelefone(undefined);
    setErroGeral(undefined);

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErroNome("Diga o nome da pessoa.");
      return;
    }
    const normalizado = normalizarTelefone(telefone);
    if (!normalizado.ok) {
      setErroTelefone(normalizado.erro);
      return;
    }

    setCriando(true);

    // ORDEM É REGRA, NÃO DETALHE — a janela se prepara aqui, antes do
    // `await` logo abaixo, dentro da mesma cadeia de gesto do toque que
    // chamou `enviar`.
    const janela = prepararJanelaExterna();

    try {
      const resultado = await criarConviteAction({ nome: nomeLimpo, telefone: telefone.trim() });
      if (!resultado.ok) {
        janela?.fechar();
        setErroGeral(resultado.erro);
        setCriando(false);
        return;
      }

      if (janela) {
        const mensagem = montarMensagemConvite({
          nomeConvidado: resultado.convite.nome,
          nomeEmpresa: empresaNome,
          link: linkDeAceiteDoConvite(resultado.convite.token),
        });
        janela.redirecionarPara(linkWhatsapp(normalizado.digitos, mensagem));
      }

      router.push("/conta/usuarios");
    } catch {
      janela?.fechar();
      setErroGeral("Não deu para criar o convite agora.");
      setCriando(false);
    }
  }

  const previa = montarMensagemConvite({
    nomeConvidado: nome.trim() || "___",
    nomeEmpresa: empresaNome,
    link: null,
  });

  return (
    <form onSubmit={enviar} className="mt-16 flex flex-col gap-16">
      <CampoTexto
        rotulo="Nome"
        name="nome"
        value={nome}
        erro={erroNome}
        onChange={(evento: ChangeEvent<HTMLInputElement>) => setNome(evento.target.value)}
      />
      <CampoTexto
        rotulo="WhatsApp"
        name="telefone"
        type="tel"
        autoComplete="tel"
        value={telefone}
        erro={erroTelefone}
        onChange={(evento: ChangeEvent<HTMLInputElement>) => setTelefone(evento.target.value)}
      />

      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Prévia da mensagem
        </span>
        <div className="whitespace-pre-wrap rounded-campo bg-separacao px-16 py-14 text-apoio font-medium text-tinta">
          {previa}
        </div>
      </div>

      {erroGeral ? <span className="text-apoio font-medium text-vencido">{erroGeral}</span> : null}

      <Botao variante="principal" type="submit" carregando={criando}>
        Mandar convite no WhatsApp
      </Botao>
    </form>
  );
}
