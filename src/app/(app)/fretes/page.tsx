import { exigirSessao } from "@/lib/auth/sessao";
import { listarServicosComSituacao } from "@/lib/servicos/titulos";
import { buscarClientesPorIds } from "@/lib/servicos/clientes";
import { buscarCaminhoesPorIds } from "@/lib/servicos/caminhoes";
import { buscarMotoristasPorIds } from "@/lib/servicos/motoristas";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { normalizarParaBusca } from "@/lib/utils/texto";
import { resolverLimiteDaLista, resolverPeriodoDaUrl, rotuloDoPeriodo } from "@/lib/utils/periodo";
import { AvisoFreteSalvo } from "./AvisoFreteSalvo";
import { ListaFretes, type FreteParaLista } from "./ListaFretes";

/**
 * "Meus fretes" (item 4, Tarefa 2) — substitui a tela provisória.
 * `docs/componentes.md` linha 360 e o protótipo de referência
 * (`referencia/.../Tela 2 e 3...`, evidência corroborante — `CLAUDE.md`
 * §13) para o conteúdo; `docs/especificacao.md` ainda não tem seção própria
 * para esta lista.
 *
 * Só `periodo` (e `de`/`ate`, no caso personalizado) vira parâmetro de URL
 * — decisão do fundador, plano do item 4: "trocar Período dispara nova
 * consulta ao servidor", e o item 8 (dashboard) vai linkar direto para uma
 * janela específica. Cliente e situação são filtrados no cliente
 * (`ListaFretes`), sobre o que já veio.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string; periodo?: string; de?: string; ate?: string }>;
}) {
  const sessao = await exigirSessao();
  const { criado, periodo: janela, de, ate } = await searchParams;

  const periodo = resolverPeriodoDaUrl(janela, de, ate);
  const limite = resolverLimiteDaLista(janela, periodo);

  // `servicos.length === 50` com `limite === 50` é o sinal de corte: se vierem
  // menos que o teto, o teto não cortou nada (a empresa só tem isso mesmo).
  // Achado do segundo /revisar — o total contextual (`ListaFretes`) não pode
  // somar só os 50 mais recentes e mostrar como se fosse o total de verdade.
  const servicos = await listarServicosComSituacao(sessao.empresaId, {
    periodo: periodo ?? undefined,
    limite,
  });

  const idsClientes = [...new Set(servicos.map((s) => s.cliente_id))];
  const idsCaminhoes = [...new Set(servicos.flatMap((s) => (s.veiculo_id ? [s.veiculo_id] : [])))];
  const idsMotoristas = [
    ...new Set(servicos.flatMap((s) => (s.motorista_id ? [s.motorista_id] : []))),
  ];

  const [clientes, caminhoes, motoristas] = await Promise.all([
    buscarClientesPorIds(sessao.empresaId, idsClientes),
    buscarCaminhoesPorIds(sessao.empresaId, idsCaminhoes),
    buscarMotoristasPorIds(sessao.empresaId, idsMotoristas),
  ]);

  const nomeDoCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const caminhaoPorId = new Map(caminhoes.map((c) => [c.id, c]));
  const nomeDoMotorista = new Map(motoristas.map((m) => [m.id, m.nome]));

  const fretes: FreteParaLista[] = servicos.map((s) => {
    const cliente = nomeDoCliente.get(s.cliente_id) ?? "Cliente";
    const rota = formatarRota(s.origem_texto, s.destino_texto);
    const caminhao = s.veiculo_id ? caminhaoPorId.get(s.veiculo_id) : undefined;
    const motorista = s.motorista_id ? nomeDoMotorista.get(s.motorista_id) : undefined;

    return {
      id: s.id,
      clienteId: s.cliente_id,
      cliente,
      rota,
      valorCentavos: s.valor,
      situacao: s.situacao_financeira,
      cancelado: s.status_operacional === "cancelado",
      dia: diaEmFortaleza(s.data_servico),
      // Busca única (achado do /revisar, Tarefa 2): varre placa E apelido, não
      // `nomeCaminhao()` (que devolve só um dos dois) — senão um caminhão com
      // apelido cadastrado fica impossível de achar pela placa.
      textoBusca: normalizarParaBusca(
        [cliente, rota, caminhao?.placa, caminhao?.apelido, motorista].filter(Boolean).join(" "),
      ),
    };
  });

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      {/* Título de tela (cromo) — achado do /auditar-tela: docs/estilo.md,
          Tipografia, cita "Meus fretes" como exemplo deste papel (20/1.1,
          700, wdth 96%, ls -.01em, #3C443E). Sem seta de voltar — é aba de
          nível 1 da barra, não sub-tela de "Mais" (mesmo padrão do
          protótipo: "sem link Início no topo, a barra faz isso"). Margem do
          título em `px-20` — mesma estrutura já em produção em
          `clientes/page.tsx` (título em `px-20`, conteúdo em `px-16`
          abaixo); `docs/estilo.md` fala em "16 nas telas com cartão de
          topo, 20 nas com título de página" sem detalhar se a margem é
          uniforme ou pode variar por seção — sigo o precedente já
          existente, não uma leitura literal do texto. */}
      <div className="px-20 pb-14" style={{ paddingTop: "var(--area-segura-topo)" }}>
        <span
          className="text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Meus fretes
        </span>
      </div>

      <div className="px-16">
        <ListaFretes
          fretes={fretes}
          hoje={diaEmFortaleza(new Date())}
          janelaAtual={janela}
          filtroDePeriodoAtivo={periodo !== null}
          limitadoA50={limite === 50 && servicos.length === 50}
          rotuloPeriodo={rotuloDoPeriodo(janela, de, ate)}
        />
      </div>

      {criado ? <AvisoFreteSalvo servicoId={criado} /> : null}
    </main>
  );
}

/** "Origem → Destino" — só o que existir; nenhum dos dois é obrigatório no Lançamento. */
function formatarRota(origem: string | null, destino: string | null): string | null {
  if (origem && destino) return `${origem} → ${destino}`;
  return origem || destino || null;
}
