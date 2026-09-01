import { z } from "zod";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { buscarCliente } from "@/lib/servicos/clientes";
import { buscarEmpresa } from "@/lib/servicos/empresas";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import {
  buscarUltimaOrigemPreenchida,
  buscarUltimoServico,
  listarCaminhoesPorUsoRecente,
  listarCargasRecentes,
  listarClientesPorUsoRecente,
  listarDestinosDoCliente,
  listarMotoristasPorUsoRecente,
  origemPadraoDoLancamento,
} from "@/lib/servicos/servicos";
import { nomeCaminhao, TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { TelaLancarFrete } from "./TelaLancarFrete";

const SCHEMA_ID = z.string().uuid();

/**
 * Resolve um id de pré-seleção vindo da URL (Tarefa 4) contra a empresa da
 * sessão — nunca usado direto (`CLAUDE.md` §3; achado do `/revisar` na
 * Tarefa 2: parâmetro de URL que vira consulta precisa ser validado). Id
 * malformado, de outra empresa, ou de registro arquivado: mesmo
 * comportamento de nenhuma pré-seleção — cai no pré-preenchimento por
 * "último frete", como hoje.
 */
async function resolverPreSelecao<T extends { id: string; arquivado_em: Date | null }>(
  buscar: (empresaId: string, id: string) => Promise<T | null>,
  empresaId: string,
  idBruto: string | undefined,
): Promise<string | null> {
  if (!idBruto) return null;
  const validado = SCHEMA_ID.safeParse(idBruto);
  if (!validado.success) return null;
  const entidade = await buscar(empresaId, validado.data);
  return entidade && !entidade.arquivado_em ? entidade.id : null;
}

/**
 * Lançar frete — `docs/planos/item-3-lancamento-frete.md`, Tarefa 2. Chega
 * do (+) da barra, de qualquer tela (`docs/navegacao.md` linha 18), ou dos
 * três pills "Lançar frete para/com este X" (item 4, Tarefa 6), com
 * `?cliente=`/`?caminhao=`/`?motorista=` na URL.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; caminhao?: string; motorista?: string }>;
}) {
  const sessao = await exigirSessao();
  const parametros = await searchParams;

  const [
    clientes,
    caminhoes,
    motoristas,
    cargasRecentes,
    ultimoServico,
    ultimaOrigemPreenchida,
    empresa,
    clienteIdPreSelecionado,
    veiculoIdPreSelecionado,
    motoristaIdPreSelecionado,
  ] = await Promise.all([
    listarClientesPorUsoRecente(sessao.empresaId),
    listarCaminhoesPorUsoRecente(sessao.empresaId),
    listarMotoristasPorUsoRecente(sessao.empresaId),
    listarCargasRecentes(sessao.empresaId),
    buscarUltimoServico(sessao.empresaId),
    // Nunca em série depois de `buscarUltimoServico` — é mais uma consulta
    // concorrente no mesmo Promise.all, não uma segunda ida ao banco que
    // atrasaria a tela toda vez, só no caso raro (item 10, Tarefa 3).
    buscarUltimaOrigemPreenchida(sessao.empresaId),
    buscarEmpresa(sessao.empresaId),
    resolverPreSelecao(buscarCliente, sessao.empresaId, parametros.cliente),
    resolverPreSelecao(buscarCaminhao, sessao.empresaId, parametros.caminhao),
    resolverPreSelecao(buscarMotorista, sessao.empresaId, parametros.motorista),
  ]);

  /**
   * Não pré-preenche com cliente/caminhão/motorista arquivado depois do
   * último frete — não é esconder o campo, é não sugerir quem não pode ser
   * usado num frete novo (`src/lib/servicos/servicos.ts`, `normalizarEntrada`
   * recusaria do mesmo jeito). As três listas já vêm sem arquivado
   * (`listarClientes`/`listarCaminhoes`/`listarMotoristas`), então "está na
   * lista" já é a verificação. Achado do `/revisar` na Tarefa 2: antes a
   * tela mostrava "Escolher cliente" mas enviava o id arquivado do mesmo
   * jeito.
   */
  const clienteIdValido = clientes.some((c) => c.id === ultimoServico?.cliente_id)
    ? (ultimoServico?.cliente_id ?? null)
    : null;
  const veiculoIdValido = caminhoes.some((c) => c.id === ultimoServico?.veiculo_id)
    ? (ultimoServico?.veiculo_id ?? null)
    : null;
  const motoristaIdValido = motoristas.some((m) => m.id === ultimoServico?.motorista_id)
    ? (ultimoServico?.motorista_id ?? null)
    : null;

  /**
   * A pré-seleção da URL (Tarefa 4) substitui o pré-preenchimento de
   * "último frete" **só no campo que ela preenche** — os outros dois
   * continuam vindo do último serviço, como hoje.
   */
  const clienteId = clienteIdPreSelecionado ?? clienteIdValido;
  const veiculoId = veiculoIdPreSelecionado ?? veiculoIdValido;
  const motoristaId = motoristaIdPreSelecionado ?? motoristaIdValido;

  const destinosIniciais = clienteId
    ? await listarDestinosDoCliente(sessao.empresaId, clienteId)
    : [];

  return (
    <TelaLancarFrete
      hojeYMD={diaEmFortaleza(new Date())}
      clientes={clientes.map((c) => ({
        id: c.id,
        nome: c.nome,
        apoio: c.municipio ? `${c.municipio.nome}/${c.municipio.uf}` : undefined,
      }))}
      caminhoes={caminhoes.map((c) => ({
        id: c.id,
        nome: nomeCaminhao(c),
        apoio: [c.placa, TIPOS_VEICULO.find((t) => t.valor === c.tipo)?.rotulo]
          .filter(Boolean)
          .join(" · ") || undefined,
      }))}
      motoristas={motoristas.map((m) => ({
        id: m.id,
        nome: m.nome,
        apoio: m.telefone ?? undefined,
      }))}
      cargasRecentes={cargasRecentes}
      destinosIniciais={destinosIniciais}
      padrao={{
        clienteId,
        veiculoId,
        motoristaId,
        origemTexto: origemPadraoDoLancamento({
          ultimaOrigemPreenchida: ultimaOrigemPreenchida?.origem_texto ?? null,
          patioEndereco: empresa?.patio_endereco ?? null,
        }),
      }}
    />
  );
}
