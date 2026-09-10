import { exigirSessao } from "@/lib/auth/sessao";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";

/**
 * Assinatura vencida (item 13, Tarefa 3 — `docs/planos/
 * item-13-tarefa-3-telas-de-assinatura.md`). É para onde `comoUsuario`/
 * `comoDono` (`src/lib/auth/acao.ts`) redirecionam quando `status_assinatura`
 * é `vencida`/`encerrada` — o portão de escrita da Tarefa 2 já existia
 * apontando pra cá; até este commit, caía em 404.
 *
 * **Sem "Renovar assinatura" nesta construção** — decisão do fundador: o
 * botão levaria à área de assinante da Kiwify, e o formato desse link ainda
 * não foi confirmado (`docs/planos/item-13-tarefa-3-telas-de-assinatura.md`,
 * "Perguntas ainda em aberto", item 2). Nasce quando o link existir, mesmo
 * critério já usado para "Baixar meus dados" (abaixo).
 *
 * **Sem "Baixar meus dados"** — decisão do fundador, já registrada no plano:
 * botão sem mecanismo por trás é o que `CLAUDE.md` §8 proíbe, e aqui seria
 * pior (pessoa com a assinatura vencida tocando em algo que não responde). O
 * caminho que existe de verdade — pedir a exportação pelo e-mail de contato,
 * já prometido nos Termos — vira texto.
 *
 * **Página inteira só exige sessão, nunca dono** — dono e operador chegam
 * aqui (`(app)/layout.tsx` já barra quem não tem sessão nenhuma). Leitura
 * segue liberada sob `vencida` (`CLAUDE.md` §10), e um operador que esbarrar
 * no bloqueio de escrita também precisa saber por quê — só ele não gerencia
 * pagamento, então o conteúdo muda por papel em vez de barrar a tela
 * inteira.
 *
 * **Textos abaixo são propostos, a confirmar com o fundador/Design** — mesmo
 * padrão já usado em `/ativar-assinatura` (item 13, Tarefa 1).
 */

const CONTATO = process.env.EMAIL_RESPOSTA;

if (!CONTATO) {
  throw new Error(
    "EMAIL_RESPOSTA não está definida. É o e-mail mostrado nesta tela para " +
      "quem quer exportar os dados com a assinatura vencida.",
  );
}

export default async function Pagina() {
  const sessao = await exigirSessao();

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="flex items-center gap-10 pb-4" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <BotaoVoltar href="/" />
        <span
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Assinatura vencida
        </span>
      </div>

      <div className="rounded-campo bg-vencido-fundo px-16 py-16">
        <p className="text-apoio font-medium leading-[1.5] text-vencido-apoio">
          A assinatura da sua empresa venceu. Novos lançamentos ficam
          pausados até a renovação — mas leitura e exportação continuam
          funcionando por 90 dias.
        </p>
      </div>

      {sessao.papel === "dono" ? (
        <p className="text-apoio font-medium leading-[1.5] text-tinta-apoio">
          Quer levar seus dados agora? Pede a exportação pelo nosso e-mail de
          contato: {CONTATO}.
        </p>
      ) : (
        <p className="text-apoio font-medium leading-[1.5] text-tinta-apoio">
          Fale com o dono da empresa — só ele consegue renovar a assinatura.
        </p>
      )}
    </main>
  );
}
