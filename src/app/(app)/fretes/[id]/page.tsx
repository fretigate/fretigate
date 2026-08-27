import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { buscarServicoComTitulos, vencimentoPadrao } from "@/lib/servicos/titulos";
import { buscarCliente } from "@/lib/servicos/clientes";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import { buscarTipoOperacao } from "@/lib/servicos/tipos-de-operacao";
import { montarMensagemOrdem } from "@/lib/servicos/mensagens";
import { gerarUrlComprovante } from "@/lib/servicos/comprovantes";
import { Botao } from "@/components/ui/Botao";
import { CabecalhoDeDetalhe } from "@/components/ui/CabecalhoDeDetalhe";
import { EtiquetaSituacao } from "@/components/ui/EtiquetaSituacao";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { diaEmFortaleza, formatarDiaDaSemanaEData } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { BotaoArquivarFrete } from "../BotaoArquivarFrete";
import { registrarRecebimentoAction } from "../acoes";
import { AcaoOrdemDeServico } from "./AcaoOrdemDeServico";
import { AcaoFaturarFrete } from "./AcaoFaturarFrete";
import { AcaoMarcarRecebido } from "@/components/ui/AcaoMarcarRecebido";
import { BotaoMarcarFinalizado } from "./BotaoMarcarFinalizado";
import { AnexarComprovante } from "./AnexarComprovante";

/**
 * Detalhe do frete (item 4, Tarefa 3; principal da fatia "em andamento" no
 * item 5, Tarefa 2 — `docs/planos/item-5-ordem-de-servico.md`). Fecha o link
 * provisório de "Meus fretes" (`ListaFretes.tsx`) e o "Ver o frete" do aviso
 * pós-lançamento (`AvisoFreteSalvo.tsx`), os dois cortados por depender desta
 * tela.
 *
 * **Principal só na fatia "em andamento"**, e muda com o estado do frete
 * (`AcaoOrdemDeServico.tsx`): sem motorista → "Escolher motorista"; com
 * motorista, telefone ausente/inválido → abre a folha de telefone; telefone
 * válido → link real do WhatsApp com a ordem pronta. **"Marcar como
 * finalizado"** (`BotaoMarcarFinalizado.tsx`, item 5, Tarefa 3) acompanha
 * sempre que o frete estiver "em andamento", qualquer que seja o estado da
 * principal — são ações independentes (dá para finalizar um frete que nunca
 * teve ordem enviada). **Finalizado e sem cobrança → "Faturar frete"**
 * (`AcaoFaturarFrete.tsx`, item 6, Tarefa 1). **Já faturado** continua sem
 * principal: o rótulo previsto ali é "Ver relatório", que é o item 7 —
 * mesmo precedente já registrado para o perfil do caminhão, "sem principal"
 * (`docs/componentes.md` linhas 379–390 e 427): **botão cuja ação de fundo
 * não existe não entra, nem desabilitado.** Isso não vale para **Editar
 * frete** (secundária) nem **Arquivar frete** (texto destrutiva) — os dois
 * ficam no bloco de ações, no fim, em todo estado, sempre com ação de fundo
 * válida — nunca um botão que não leva a lugar nenhum.
 *
 * `BotaoMarcarFinalizado` é renderizado **incondicionalmente** (fora do
 * `if` de "em andamento"), e é ele mesmo quem decide se o botão aparece —
 * ver o comentário no próprio arquivo para o motivo (o aviso de sucesso não
 * pode desmontar junto do bloco de ações quando a tela atualiza).
 *
 * Campos sem regra própria escrita (tudo exceto Telefone, que
 * `docs/componentes.md` linha 177 exige "adicionar" quando vazio) usam
 * `semAdicionarQuandoVazio` — achado do `/revisar`: a linha 177 só nomeia
 * Telefone para esta tela, e o plano pede "aparecem vazios sem rótulo
 * extra" para os demais, não "adicionar".
 *
 * Editar frete e o "adicionar" de Telefone sem motorista levam a
 * `/fretes/[id]/editar`, construída na Tarefa 4
 * (`docs/planos/item-4-lista-e-detalhe-do-frete.md`).
 */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDataPorExtenso(dia: string): string {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  return `${diaDoMes} de ${MESES[mes - 1]} de ${ano}`;
}

/** Mesma lógica de `formatarRota` em `fretes/page.tsx` — só o que existir. */
function formatarRota(origem: string | null, destino: string | null): string | null {
  if (origem && destino) return `${origem} → ${destino}`;
  return origem || destino || null;
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const servico = await buscarServicoComTitulos(sessao.empresaId, id);
  if (!servico) notFound();

  const [cliente, tipoOperacao, caminhao, motorista, empresa, urlComprovante] = await Promise.all([
    buscarCliente(sessao.empresaId, servico.cliente_id),
    buscarTipoOperacao(sessao.empresaId, servico.tipo_operacao_id),
    servico.veiculo_id ? buscarCaminhao(sessao.empresaId, servico.veiculo_id) : null,
    servico.motorista_id ? buscarMotorista(sessao.empresaId, servico.motorista_id) : null,
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      // `prazo_padrao_dias` é o topo dos três níveis de prazo
      // (`docs/especificacao.md` §4.7) — de onde `Cliente.
      // prazo_pagamento_dias` nulo herda, para sugerir o vencimento ao
      // faturar (item 6, Tarefa 1).
      select: { nome_fantasia: true, prazo_padrao_dias: true },
    }),
    // `gerarUrlComprovante` lança para frete arquivado (mesma mensagem de
    // "não encontrado" de `buscarServico`) — mas ESTA tela lê frete
    // arquivado normalmente, sem checagem nenhuma até aqui (§7: "nada é
    // apagado", o registro continua existindo e sendo lido). Achado do
    // `/revisar`: chamar direto quebraria a tela inteira num frete
    // arquivado que já tinha comprovante. `null` para arquivado — o
    // comprovante anexado antes de arquivar fica sem miniatura nesta
    // leitura; não é perda de dado (o objeto continua no balde, o caminho
    // continua no `Servico`), só a exibição que este item não cobre.
    servico.arquivado_em ? null : gerarUrlComprovante(sessao.empresaId, id),
  ]);

  const rota = formatarRota(servico.origem_texto, servico.destino_texto);
  const data = formatarDataPorExtenso(diaEmFortaleza(servico.data_servico));
  const tipoNome = tipoOperacao?.nome ?? "Frete";

  // "Finalizado e sem cobrança" (`docs/componentes.md`) — `situacao_financeira`
  // é derivada de TODOS os títulos do frete (`situacaoFinanceira`), não de um
  // escolhido por acaso, então "a_faturar" já é exatamente "nenhum título
  // ativo" (`CLAUDE.md` §2, sobre regra que vale para a coleção inteira).
  //
  // **`arquivado_em` entra na condição** — achado do `/revisar`: esta tela lê
  // frete arquivado de propósito (§7, "nada é apagado"; ver o comentário de
  // `gerarUrlComprovante` acima), e um frete arquivado pode perfeitamente
  // estar finalizado e sem título. Sem esta linha, ele exibiria "Faturar
  // frete" e o toque falharia sempre com "Frete não encontrado."
  // (`faturarServico` recusa arquivado) — um botão que não leva a lugar
  // nenhum, que é o que `CLAUDE.md` §8 proíbe, numa ação de dinheiro.
  const podeFaturar =
    !servico.arquivado_em &&
    servico.status_operacional === "finalizado" &&
    servico.situacao_financeira === "a_faturar";

  // Secundária "Marcar recebido" (item 6, Tarefa 3 —
  // `docs/componentes.md` linha 447): aparece com título **aberto** —
  // "faturado" ou "parcial". "Quitado" não tem mais saldo para receber, e
  // "a_faturar" não tem título nenhum. Hoje um frete tem no máximo um
  // título (índice único parcial da migration `20260814150000`), então o
  // `find` abaixo não escolhe entre vários — é só a forma de achar o único
  // que existe.
  //
  // **`!servico.arquivado_em` entra na condição** — mesmo motivo de
  // `podeFaturar`, achado do `/revisar`: esta tela lê frete arquivado de
  // propósito (§7), e um frete arquivado com título aberto (arquivar não
  // arquiva o título — `arquivarServico`, `src/lib/servicos/servicos.ts`)
  // mostraria "Marcar recebido" levando a registrar dinheiro contra um
  // frete que já saiu de circulação.
  const tituloAberto = !servico.arquivado_em
    ? servico.titulos.find((t) => t.status === "aberto")
    : undefined;
  const hoje = diaEmFortaleza(new Date());
  const vencimentoInicial = vencimentoPadrao(
    hoje,
    cliente?.prazo_pagamento_dias ?? null,
    empresa!.prazo_padrao_dias,
  );

  const mensagemOrdem = montarMensagemOrdem({
    empresa: empresa!.nome_fantasia,
    diaEData: formatarDiaDaSemanaEData(servico.data_servico),
    origem: servico.origem_texto,
    destino: servico.destino_texto,
    carga: servico.carga_texto,
    caminhao: caminhao ? nomeCaminhao(caminhao) : null,
  });

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <CabecalhoDeDetalhe href="/fretes" rotulo="Frete" />

      <div className="flex flex-col px-20">
        {/* Terciário — docs/estilo.md linha 115: "'FRETE · data'". */}
        <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          {tipoNome.toUpperCase()} · {data}
        </span>
        <span
          className="mt-4 text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          {cliente?.nome ?? "Cliente"}
        </span>
        {rota ? (
          <span className="mt-4 text-apoio font-normal text-tinta-apoio-forte">{rota}</span>
        ) : null}

        {/* Primário — docs/estilo.md linha 115: "valor 46px + nome 26px".
            Situação em linha própria abaixo — achado do `/revisar`: valor e
            etiqueta na mesma linha, sem truncamento, deixava o valor vazar
            para um frete de dígitos altos (`CLAUDE.md` §8). */}
        <span
          className="mt-14 text-heroi-detalhe font-extrabold leading-[1] tracking-[-0.03em] tabular-nums text-tinta"
          style={{ fontVariationSettings: "'wdth' 94" }}
        >
          R$ {formatarCentavos(servico.valor)}
        </span>
        <div className="mt-8">
          <EtiquetaSituacao situacao={servico.situacao_financeira} />
        </div>

        <span className="px-4 pt-26 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Detalhes
        </span>
        <div className="flex flex-col gap-4">
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Tipo"
            valor={tipoOperacao?.nome ?? null}
            semAdicionarQuandoVazio
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Caminhão"
            valor={caminhao ? nomeCaminhao(caminhao) : null}
            semAdicionarQuandoVazio
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Motorista"
            valor={motorista?.nome ?? null}
            semAdicionarQuandoVazio
          />
          {/* Telefone é o do motorista, não um campo do frete — "adicionar"
              leva ao cadastro dele, não a Editar frete (docs/componentes.md
              linha 177 nomeia esta linha explicitamente, por isso é a única
              das nove sem `semAdicionarQuandoVazio`). Sem motorista
              escolhido, não há de quem mostrar o telefone: leva a Editar
              frete, para escolher um. */}
          <LinhaDePerfil
            href={motorista ? `/motoristas/${motorista.id}/editar` : `/fretes/${id}/editar`}
            rotulo="Telefone"
            valor={motorista?.telefone ?? null}
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Data"
            valor={data}
            semAdicionarQuandoVazio
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Origem"
            valor={servico.origem_texto}
            semAdicionarQuandoVazio
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Destino"
            valor={servico.destino_texto}
            semAdicionarQuandoVazio
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Carga"
            valor={servico.carga_texto}
            semAdicionarQuandoVazio
          />
          <LinhaDePerfil
            href={`/fretes/${id}/editar`}
            rotulo="Km"
            valor={servico.km ? `${servico.km / 1000} km` : null}
            semAdicionarQuandoVazio
          />
        </div>

        {/* mt-22 — "entre seções verticais: 22–26px" (docs/estilo.md); era
            mt-18 (fora da faixa), achado do quinto passe do `/revisar`. */}
        <div className="mt-22">
          <AnexarComprovante servicoId={id} urlAssinada={urlComprovante} />
        </div>

        <div className="mt-26 flex flex-col gap-10">
          {servico.status_operacional === "em_andamento" ? (
            <AcaoOrdemDeServico
              servicoId={id}
              motorista={
                motorista ? { id: motorista.id, nome: motorista.nome, telefone: motorista.telefone } : null
              }
              mensagem={mensagemOrdem}
            />
          ) : null}
          <BotaoMarcarFinalizado
            servicoId={id}
            emAndamento={servico.status_operacional === "em_andamento"}
          />
          <AcaoFaturarFrete
            servicoId={id}
            podeFaturar={podeFaturar}
            hoje={hoje}
            vencimentoInicial={vencimentoInicial}
          />
          <AcaoMarcarRecebido
            podeReceber={tituloAberto !== undefined}
            tituloId={tituloAberto?.id}
            saldoCentavos={tituloAberto ? tituloAberto.valor - tituloAberto.totalRecebido : 0}
            hoje={hoje}
            registrar={registrarRecebimentoAction}
          />
          <Botao variante="secundaria" href={`/fretes/${id}/editar`}>
            Editar frete
          </Botao>
          <form>
            <BotaoArquivarFrete id={id} />
          </form>
        </div>
      </div>
    </main>
  );
}
