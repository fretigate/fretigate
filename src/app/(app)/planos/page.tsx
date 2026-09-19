import { notFound } from "next/navigation";
import { exigirDono, SemPermissao } from "@/lib/auth/sessao";
import { CabecalhoComVoltar } from "@/components/ui/CabecalhoComVoltar";
import { TelaPlanos } from "./TelaPlanos";

/**
 * Planos (item 13, Tarefa 3, continuação — `docs/planos/
 * item-13-tarefa-3-tela-de-planos.md`). Nível 2, sem barra de navegação
 * flutuante própria, `BotaoVoltar` no topo — mesmo padrão de
 * `/assinatura-vencida` e `/limite-do-gratuito`.
 *
 * **Página inteira exige o dono** (`exigirDono()`, `SemPermissao` →
 * `notFound()`) — mesmo padrão de `/conta`: é dinheiro e contrato da
 * empresa (`docs/especificacao.md` §4.9).
 *
 * **Sem o número do parcelamento do anual** — decisão do fundador,
 * 18/09/2026: o checkout real cobra juro no parcelamento (12x de
 * R$ 120,38, não os R$ 97 "sem acréscimo" que `CLAUDE.md` §10 chegou a
 * descrever — achado ao abrir o checkout de verdade, corrigido no mesmo
 * dia). O fundador vai conferir no painel da Kiwify se dá para configurar
 * sem juro antes de decidir o que a tela mostra; até lá, só os dois totais
 * (R$ 1.164 à vista, R$ 197/mês) e a economia sobre o à vista.
 *
 * **Esta página não monta o link de checkout** — diferente da primeira
 * versão desta tarefa (achado do `/revisar`, 18/09/2026): o link só existe
 * depois que o dono toca em "Assinar", porque carrega um token de uso
 * único (`SolicitacaoUpgrade`) criado na hora, nunca o `empresa_id` da
 * sessão embutido direto na URL (`CLAUDE.md` §3). `TelaPlanos` (Client
 * Component) chama `gerarLinkDeCheckoutAction` (`./acoes.ts`) no clique,
 * mesmo padrão de `FormularioConvite.tsx` (`prepararJanelaExterna`).
 */
export default async function Pagina() {
  try {
    await exigirDono();
  } catch (erro) {
    if (erro instanceof SemPermissao) notFound();
    throw erro;
  }

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <CabecalhoComVoltar href="/mais" titulo="Planos" />

      <TelaPlanos />
    </main>
  );
}
