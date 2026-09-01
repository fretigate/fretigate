import { notFound } from "next/navigation";
import { exigirDono, SemPermissao } from "@/lib/auth/sessao";
import { buscarEmpresa } from "@/lib/servicos/empresas";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { FormularioConfiguracoes } from "./FormularioConfiguracoes";

/**
 * Configurações (item 10, Tarefa 3 — `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`). Pátio, prazo padrão de
 * vencimento e a numeração do relatório — os três campos de "OPERAÇÃO"
 * (`docs/navegacao.md` linha 45). Sem seção MENSAGENS (decisão do plano: os
 * dois modelos de mensagem não têm tela de edição construída, item 9 é MVP
 * parcial).
 *
 * **`docs/componentes.md:483` dizia "sem principal"** — descrevia a tela de
 * quando Configurações era só os dois modelos de mensagem, que ficaram fora
 * do MVP. Corrigido: a tela tem principal **Salvar configurações** — mesma
 * regra de todo formulário do produto (campo editável pede ação explícita
 * para gravar; salvar automático perderia alteração sem avisar, ou gravaria
 * meio valor enquanto a pessoa ainda digita) e mesmo critério de nomear o
 * objeto que todo outro botão de gravar do inventário já segue ("Salvar
 * cliente", "Salvar dados", "Salvar frete") — achado do `/revisar`, decisão
 * do fundador, 01/09/2026.
 *
 * **Página inteira exige o dono** (`exigirDono()`, não só a ação) — mesmo
 * padrão de `/conta` (decisão 1 do plano do item 10): os três campos mexem
 * em regra financeira da empresa (o prazo que toda cobrança futura herda, a
 * numeração que o relatório usa). `SemPermissao` vira `notFound()`.
 */
export default async function Pagina() {
  let sessao;
  try {
    sessao = await exigirDono();
  } catch (erro) {
    if (erro instanceof SemPermissao) notFound();
    throw erro;
  }

  const empresa = await buscarEmpresa(sessao.empresaId);
  if (!empresa) notFound();

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div className="flex items-center gap-10 pb-4" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <BotaoVoltar href="/mais" />
        <span
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Configurações
        </span>
      </div>

      <FormularioConfiguracoes
        configuracoes={{
          patioEndereco: empresa.patio_endereco,
          prazoPadraoDias: empresa.prazo_padrao_dias,
          proximoNumeroRelatorio: empresa.proximo_numero_relatorio,
        }}
      />
    </main>
  );
}
