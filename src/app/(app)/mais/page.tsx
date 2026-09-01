import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { listarClientes } from "@/lib/servicos/clientes";
import { listarCaminhoes } from "@/lib/servicos/caminhoes";
import { listarMotoristas } from "@/lib/servicos/motoristas";
import { resumoDeCobrancas } from "@/lib/servicos/cobrancas";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { ItemMenu } from "@/components/ui/ItemMenu";
import { sairDaConta } from "../acoes";
import { BotaoSairDaConta } from "../BotaoSairDaConta";

/**
 * Mais — `docs/navegacao.md` linha 20, `docs/componentes.md` linha 392.
 *
 * PROVISÓRIA: nasce com o nome da empresa, "Sair da conta" e a seção
 * CADASTROS, com "Clientes" (item 2, tarefa 5), "Caminhões" (tarefa 6) e
 * "Motoristas" (tarefa 7) — e agora a seção FERRAMENTAS, com "Relatório do
 * cliente" (item 7, Tarefa 4). Falta Despesas, Importar, Novidades,
 * Configurações, Usuários, Conta. "A tela 'Mais' nasce só com as linhas que
 * têm destino; cada item seguinte acrescenta a sua" (`docs/planos/
 * item-2-cadastros.md`, tarefa 4).
 *
 * **Rótulo e ícone já previstos, não inferidos** — `docs/componentes.md`
 * linha 277: `barra-cobrancas.svg`, "linha 'Relatório do cliente' em Mais"
 * (achado do `/revisar`: a primeira versão desta tarefa tinha desenhado um
 * ícone novo e usado só "Relatório", violando a regra de nome da linha 13,
 * "nunca 'Relatório' sozinho" — sem checar que os dois já estavam
 * documentados).
 *
 * **Seção AJUSTES nasceu no item 10, Tarefa 2** — "Conta da empresa", ícone
 * `conta.svg` (`docs/componentes.md` linha 282, já previsto desde 09/08 —
 * o rótulo da linha é o mesmo daquela linha, "Conta da empresa", não só
 * "Conta"; achado do `/revisar`, mesma regra já citada acima para
 * "Relatório do cliente"), visível só para o dono (decisão 1 do plano: as
 * telas de Ajustes mexem em identidade e regra financeira da empresa). Um
 * operador nunca vê a seção — não é só esconder o link, é que `/conta` e
 * `/configuracoes` recusam quem não é dono (`exigirDono()`), então mostrar a
 * linha pra quem não pode entrar seria a mesma falha que `CLAUDE.md` §8 já
 * proíbe. **"Configurações" entrou junto da Tarefa 3 do item 10
 * (01/09/2026)** — `/configuracoes`, mesma proteção de `exigirDono()`.
 *
 * **O cartão de identidade (nome da empresa, no topo) também virou tocável
 * para o dono nesta tarefa** — `docs/componentes.md` linha 491 ("Mais |
 * ... cartão de identidade tocável") e `docs/navegacao.md`, linha Mais
 * ("Cartão de identidade → Conta"). Achado do `/revisar`: o comentário
 * antigo ("o nome da empresa também não é tocável ainda... vira o cartão de
 * verdade quando essa tela nascer") tinha sido apagado sem o código
 * correspondente ter sido escrito — a tela (`/conta`) já existe desde este
 * mesmo commit. Continua não-tocável para o operador, mesma razão da seção
 * AJUSTES.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const hoje = diaEmFortaleza(new Date());

  const [empresa, clientes, caminhoes, motoristas, resumoCobrancas] = await Promise.all([
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { nome_fantasia: true },
    }),
    listarClientes(sessao.empresaId),
    listarCaminhoes(sessao.empresaId),
    listarMotoristas(sessao.empresaId),
    resumoDeCobrancas(sessao.empresaId, hoje),
  ]);

  // O protótipo (referencia/TelaMais.dc.html) também mostra "· R$ X em
  // aberto" no apoio desta linha — ficou de fora até a Tarefa 7 do item 6,
  // porque esse número dependia de TituloReceber aberto, que só nasce no
  // item 6 (`CLAUDE.md` §8: número incompleto "mostra convite, não valor").
  // Reaproveita `resumoDeCobrancas(...).aReceber` (o mesmo "A receber" do
  // topo de Cobranças, situação atual da empresa inteira) em vez de somar
  // de novo — uma função só decide o que "em aberto" significa.
  const subtituloClientes =
    clientes.length === 0
      ? "Nenhum cadastrado ainda"
      : `${clientes.length} ${clientes.length === 1 ? "cadastrado" : "cadastrados"} · R$ ${formatarCentavos(resumoCobrancas.aReceber)} em aberto`;
  const subtituloCaminhoes =
    caminhoes.length === 0
      ? "Nenhum cadastrado ainda"
      : `${caminhoes.length} ${caminhoes.length === 1 ? "cadastrado" : "cadastrados"}`;
  const subtituloMotoristas =
    motoristas.length === 0
      ? "Nenhum cadastrado ainda"
      : `${motoristas.length} ${motoristas.length === 1 ? "cadastrado" : "cadastrados"}`;

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col gap-24 px-20"
      style={{
        paddingTop: "var(--area-segura-topo)",
        paddingBottom: "var(--folga-rolagem)",
      }}
    >
      {sessao.papel === "dono" ? (
        // `min-h-48 flex items-center`, não o truque de padding+margem
        // negativa do cartão escuro da dashboard (`(app)/page.tsx`) —
        // achado do `/revisar`, medido: só texto (sem o círculo de 30px que
        // dá altura lá) rende ~22px de linha, e um padding calculado para
        // aquele caso deixava este com ~40px de alvo, abaixo do mínimo de
        // 48px do `CLAUDE.md` §8. `min-h-48` garante o alvo não importa a
        // métrica exata da fonte.
        <Link href="/conta" className="-my-3 flex min-h-48 items-center self-start">
          <p className="text-nome-empresa font-extrabold text-tinta">{empresa?.nome_fantasia}</p>
        </Link>
      ) : (
        <p className="text-nome-empresa font-extrabold text-tinta">{empresa?.nome_fantasia}</p>
      )}

      <div className="flex flex-col gap-6">
        <span className="px-4 pb-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Cadastros
        </span>
        <ItemMenu href="/clientes" nome="Clientes" apoio={subtituloClientes}>
          <circle cx="9.84" cy="8.76" r="2.88" />
          <path d="M4.8 17.76c0.54 -2.52 2.61 -3.96 5.04 -3.96s4.5 1.44 5.04 3.96M15.06 6.24a2.88 2.88 0 0 1 0 5.04M16.68 14.16c1.44 0.63 2.34 1.89 2.61 3.6" />
        </ItemMenu>
        {/* `barra-fretes.svg` — mesmo desenho do item "Fretes" da barra,
            reaproveitado aqui por `docs/componentes.md` linha 241 ("linha
            'Caminhões' em Mais"). */}
        <ItemMenu href="/caminhoes" nome="Caminhões" apoio={subtituloCaminhoes}>
          <path d="M4.309 7.254h9.164v7.691H4.309zM13.473 9.873h3.273l2.946 2.782v2.291h-6.218z" />
          <circle cx="7.746" cy="16.746" r="1.636" />
          <circle cx="16.255" cy="16.746" r="1.636" />
        </ItemMenu>
        {/* `docs/icones/motoristas.svg` — `docs/componentes.md` linha 246. */}
        <ItemMenu href="/motoristas" nome="Motoristas" apoio={subtituloMotoristas}>
          <circle cx="12" cy="8.4" r="3.06" />
          <path d="M6.42 18.3c0.45 -2.88 2.7 -4.5 5.58 -4.5s5.13 1.62 5.58 4.5" />
        </ItemMenu>
      </div>

      <div className="flex flex-col gap-6">
        <span className="px-4 pb-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Ferramentas
        </span>
        {/* `docs/icones/barra-cobrancas.svg` — o mesmo desenho do item
            "Cobranças" da barra, reaproveitado aqui por `docs/componentes.md`
            linha 277 ("linha 'Relatório do cliente' em Mais"). */}
        <ItemMenu href="/relatorio" nome="Relatório do cliente">
          <path d="M5.16 6.24h13.68v9.18a0.9 0.9 0 0 1 -0.9 0.9H6.06a0.9 0.9 0 0 1 -0.9 -0.9V6.24ZM8.04 9.3h7.92M8.04 12.36h4.5" />
        </ItemMenu>
      </div>

      {sessao.papel === "dono" ? (
        <div className="flex flex-col gap-6">
          <span className="px-4 pb-2 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Ajustes
          </span>
          {/* `docs/icones/barra-mais.svg` — já previsto para esta linha desde
              09/08 (`docs/componentes.md` linha 278: "Item 'Mais' da barra ·
              linha 'Configurações' em Mais"). */}
          <ItemMenu href="/configuracoes" nome="Configurações">
            <path d="M6.06 8.4h11.88M6.06 12h11.88M6.06 15.6h7.56" />
          </ItemMenu>
          {/* `docs/icones/conta.svg` — `docs/componentes.md` linha 282. */}
          <ItemMenu href="/conta" nome="Conta da empresa">
            <path d="M5.34 10.2 12 5.34 18.66 10.2v8.1a0.36 0.36 0 0 1 -0.36 0.36H5.7a0.36 0.36 0 0 1 -0.36 -0.36V10.2Z" />
            <path d="M9.84 18.66v-4.68h4.32v4.68" />
          </ItemMenu>
        </div>
      ) : null}

      <form action={sairDaConta}>
        <BotaoSairDaConta />
      </form>
    </main>
  );
}
