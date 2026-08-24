import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { buscarServicoComTitulos } from "@/lib/servicos/titulos";
import { buscarCliente } from "@/lib/servicos/clientes";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import { buscarTipoOperacao } from "@/lib/servicos/tipos-de-operacao";
import { montarMensagemOrdem } from "@/lib/servicos/mensagens";
import { Botao } from "@/components/ui/Botao";
import { EtiquetaSituacao } from "@/components/ui/EtiquetaSituacao";
import { LinhaDePerfil } from "@/components/ui/LinhaDePerfil";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { diaEmFortaleza, formatarDiaDaSemanaEData } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { BotaoArquivarFrete } from "../BotaoArquivarFrete";
import { AcaoOrdemDeServico } from "./AcaoOrdemDeServico";
import { BotaoMarcarFinalizado } from "./BotaoMarcarFinalizado";

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
 * teve ordem enviada). Finalizado sem cobrança/já faturado (itens 6/7)
 * continuam sem principal, e sem "Marcar como finalizado" — mesmo
 * precedente já registrado para o perfil do caminhão, "sem principal"
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

  const [cliente, tipoOperacao, caminhao, motorista, empresa] = await Promise.all([
    buscarCliente(sessao.empresaId, servico.cliente_id),
    buscarTipoOperacao(sessao.empresaId, servico.tipo_operacao_id),
    servico.veiculo_id ? buscarCaminhao(sessao.empresaId, servico.veiculo_id) : null,
    servico.motorista_id ? buscarMotorista(sessao.empresaId, servico.motorista_id) : null,
    db(sessao.empresaId).empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { nome_fantasia: true },
    }),
  ]);

  const rota = formatarRota(servico.origem_texto, servico.destino_texto);
  const data = formatarDataPorExtenso(diaEmFortaleza(servico.data_servico));
  const tipoNome = tipoOperacao?.nome ?? "Frete";

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
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <Link
          href="/fretes"
          aria-label="Voltar"
          className="-ml-10 flex h-44 w-44 flex-none items-center justify-center"
        >
          <svg width={12} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15.6 4.35 8.4 12l7.2 7.65"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <span className="min-w-0 flex-1 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Frete
        </span>
      </div>

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
