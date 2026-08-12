import { exigirSessao } from "@/lib/auth/sessao";
import {
  buscarUltimoServico,
  listarCaminhoesPorUsoRecente,
  listarCargasRecentes,
  listarClientesPorUsoRecente,
  listarDestinosDoCliente,
  listarMotoristasPorUsoRecente,
} from "@/lib/servicos/servicos";
import { nomeCaminhao, TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { TelaLancarFrete } from "./TelaLancarFrete";

/**
 * Lançar frete — `docs/planos/item-3-lancamento-frete.md`, Tarefa 2. Chega
 * do (+) da barra, de qualquer tela (`docs/navegacao.md` linha 18).
 */
export default async function Pagina() {
  const sessao = await exigirSessao();

  const [clientes, caminhoes, motoristas, cargasRecentes, ultimoServico] = await Promise.all([
    listarClientesPorUsoRecente(sessao.empresaId),
    listarCaminhoesPorUsoRecente(sessao.empresaId),
    listarMotoristasPorUsoRecente(sessao.empresaId),
    listarCargasRecentes(sessao.empresaId),
    buscarUltimoServico(sessao.empresaId),
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

  const destinosIniciais = clienteIdValido
    ? await listarDestinosDoCliente(sessao.empresaId, clienteIdValido)
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
        clienteId: clienteIdValido,
        veiculoId: veiculoIdValido,
        motoristaId: motoristaIdValido,
        origemTexto: ultimoServico?.origem_texto ?? "",
      }}
    />
  );
}
