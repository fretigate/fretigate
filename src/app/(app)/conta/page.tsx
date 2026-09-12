import { notFound } from "next/navigation";
import { exigirDono, SemPermissao } from "@/lib/auth/sessao";
import { buscarEmpresa } from "@/lib/servicos/empresas";
import { gerarUrlLogo } from "@/lib/servicos/logo";
import { TITULO_RELATORIO } from "@/lib/documentos/gerador";
import { montarCabecalhoDocumentoA4 } from "@/lib/documentos/moldeDocumentoA4";
import { formatarNumeroRelatorio } from "@/lib/servicos/relatorios";
import { diaEmFortaleza, formatarDataPorExtenso } from "@/lib/utils/data-fortaleza";
import { formatarDocumento } from "@/lib/utils/documento";
import { iniciais } from "@/lib/utils/iniciais";
import { AvisoSalvo } from "@/components/ui/AvisoSalvo";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { ItemMenu } from "@/components/ui/ItemMenu";
import { sairDaConta } from "../acoes";
import { BotaoSairDaConta } from "../BotaoSairDaConta";
import { FormularioContaDaEmpresa } from "./FormularioContaDaEmpresa";
import { UploadLogo } from "./UploadLogo";

/**
 * Conta da empresa (item 10, Tarefa 2 — `docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`). `docs/componentes.md` linha
 * 486: principal **Salvar dados** · Minha assinatura e Termos · prévia do
 * cabeçalho do relatório · texto destrutiva **Sair da conta**.
 *
 * **Fundida com a antiga tela "Configurações" em 12/09/2026** (`docs/planos/
 * fusao-configuracoes-e-conta-da-empresa.md`) — pátio, prazo padrão de
 * vencimento e numeração do relatório passam a viver aqui dentro, no segundo
 * bloco de `FormularioContaDaEmpresa`. **"Usuários" saiu daqui e virou item
 * próprio na seção AJUSTES de `mais/page.tsx`** — mesma rota
 * (`/conta/usuarios`), só muda de onde se chega até ela. **"Minha
 * assinatura" continua de fora**, sem destino até o item 13: linkar para uma
 * rota que ainda não existe seria o mesmo 404 que `CLAUDE.md` §8 já proíbe
 * (o precedente exato: a pastilha Lucro da dashboard só apontou para
 * `/despesas` depois de a página nascer, item 8).
 *
 * **Página inteira exige o dono** (`exigirDono()`, não só as ações) —
 * decisão 1 do plano: um operador que chegasse aqui por URL direta veria
 * CNPJ, chave Pix e o resto da identidade financeira da empresa antes mesmo
 * de tentar salvar qualquer coisa. `SemPermissao` vira `notFound()` — a
 * mesma resposta de "não existe", sem entalhar "existe mas você não pode
 * ver" (`(app)/layout.tsx` já trata `SemSessao`, redirecionando para
 * `/entrar` antes de qualquer página deste grupo renderizar).
 */

/**
 * `CSS zoom`, não `transform: scale()` — achado do `/revisar` (segunda
 * volta): a primeira versão usava `transform` dentro de uma caixa de altura
 * FIXA com `overflow:hidden` (mesma técnica de `TelaDocumentoRelatorio.tsx`,
 * onde funciona porque a página A4 inteira TEM altura fixa, 1123px).
 * Cabeçalho não tem altura fixa — razão social comprida quebra em duas
 * linhas, endereço/contato compridos crescem —, e uma altura chutada com
 * `overflow:hidden` cortaria esse conteúdo no meio, contra `CLAUDE.md` §8
 * ("Nenhum texto vaza do seu campo... com a altura crescendo" / "Nada
 * encolhe para caber conteúdo"). `zoom` (diferente de `transform`) encolhe a
 * própria caixa de layout, não só a pintura — a altura renderizada já sai
 * proporcional ao conteúdo de verdade, sem precisar adivinhar nem cortar.
 * Suportado nos engines que o produto roda (Chromium/Android, Safari 16.4+).
 */
const ESCALA_PREVIA = 0.4;

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  let sessao;
  try {
    sessao = await exigirDono();
  } catch (erro) {
    if (erro instanceof SemPermissao) notFound();
    throw erro;
  }

  const { salvo } = await searchParams;
  const [empresa, urlLogo] = await Promise.all([
    buscarEmpresa(sessao.empresaId),
    gerarUrlLogo(sessao.empresaId),
  ]);
  if (!empresa) notFound();

  const nomeDoDocumento = empresa.razao_social ?? empresa.nome_fantasia ?? "";
  const cnpjParte = empresa.cnpj ? `CNPJ ${formatarDocumento(empresa.cnpj)}` : null;
  const linhaDados =
    [cnpjParte, empresa.endereco].filter((v): v is string => Boolean(v)).join(" · ") || null;
  const linhaContato =
    [empresa.telefone, empresa.email].filter((v): v is string => Boolean(v)).join(" · ") || null;

  // Prévia — reaproveita a mesma marcação do documento de verdade
  // (`montarCabecalhoDocumentoA4`, extraída de `moldeDocumentoA4.ts` nesta
  // tarefa). A logo usa a URL assinada (a tela tem rede — diferente do
  // Chromium do gerador, que precisa da versão em `data:` URI,
  // `logoComoDataUri`), e o número mostrado é o próximo de verdade, não um
  // valor inventado.
  const cabecalhoHtml = montarCabecalhoDocumentoA4({
    empresa: { nome: nomeDoDocumento, linhaDados, linhaContato, logoUrl: urlLogo },
    titulo: TITULO_RELATORIO,
    numero: formatarNumeroRelatorio(empresa.proximo_numero_relatorio),
    emissao: formatarDataPorExtenso(diaEmFortaleza(new Date())),
  });

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
          Conta da empresa
        </span>
      </div>

      {/* `nome_fantasia`, não `nomeDoDocumento` — achado do `/revisar`:
          dashboard e Mais calculam as iniciais do círculo sempre a partir
          de `nome_fantasia` (`CLAUDE.md`/`docs/componentes.md`, "regra
          única"); usar `razao_social` aqui faria a MESMA empresa mostrar
          duas siglas diferentes, uma no app, outra na prévia do documento
          logo abaixo — que é onde `nomeDoDocumento` continua certo, porque
          reproduz o que o PDF de verdade mostra (`relatorios.ts`, mesma
          fórmula). */}
      <UploadLogo urlAssinada={urlLogo} iniciais={iniciais(empresa.nome_fantasia ?? "")} />

      <FormularioContaDaEmpresa
        empresa={{
          razao_social: empresa.razao_social,
          cnpj: empresa.cnpj,
          endereco: empresa.endereco,
          telefone: empresa.telefone,
          email: empresa.email,
          chave_pix: empresa.chave_pix,
          patio_endereco: empresa.patio_endereco,
          prazo_padrao_dias: empresa.prazo_padrao_dias,
          proximo_numero_relatorio: empresa.proximo_numero_relatorio,
        }}
      />

      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Prévia do cabeçalho do relatório
        </span>
        <div
          className="overflow-hidden rounded-campo bg-white p-16"
          style={{ zoom: ESCALA_PREVIA }}
          dangerouslySetInnerHTML={{ __html: cabecalhoHtml }}
        />
      </div>

      {/* Ícone provisório e rótulo sem lastro em documento — registrado em
          `docs/planos/item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 2
          — achados do `/revisar`". "Termos e privacidade", não "Termos de
          uso e privacidade": bate com o `<h1>` da própria tela de destino
          (`(auth)/termos/page.tsx`) — achado do segundo `/revisar`, a
          primeira versão usava um terceiro texto (`docs/componentes.md:486`
          diz só "Termos"), violando "uma ação, um nome" (`CLAUDE.md` §8). */}
      {/* "Usuários" saiu daqui em 12/09/2026 (fusão com Configurações) — vira
          item próprio na seção AJUSTES de `mais/page.tsx`, mesmo ícone
          provisório reaproveitado de lá. */}
      <ItemMenu href="/termos" nome="Termos e privacidade">
        <path d="M6.06 8.4h11.88M6.06 12h11.88M6.06 15.6h7.56M6.9 4.8h10.2a2.1 2.1 0 0 1 2.1 2.1v10.2a2.1 2.1 0 0 1 -2.1 2.1H6.9a2.1 2.1 0 0 1 -2.1 -2.1V6.9a2.1 2.1 0 0 1 2.1 -2.1Z" />
      </ItemMenu>

      <form action={sairDaConta}>
        <BotaoSairDaConta />
      </form>

      {/* Lacuna registrada, decisão do fundador (12/09/2026): esta tela pode
          mostrar dois `AvisoDoSistema` ao mesmo tempo — este e o erro de
          upload da logo (`UploadLogo.tsx`), os dois `fixed` na mesma âncora
          — se o upload falhar bem perto de "Salvar dados" ser tocado. Caso
          raro, sem tratamento por enquanto. */}
      {salvo ? <AvisoSalvo mensagem="Dados salvos" path="/conta" /> : null}
    </main>
  );
}
