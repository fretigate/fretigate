import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth/sessao";
import { buscarCliente } from "@/lib/servicos/clientes";
import { buscarCaminhao } from "@/lib/servicos/caminhoes";
import { buscarMotorista } from "@/lib/servicos/motoristas";
import {
  listarCaminhoesPorUsoRecente,
  listarCargasRecentes,
  listarClientesPorUsoRecente,
  listarDestinosDoCliente,
  listarMotoristasPorUsoRecente,
} from "@/lib/servicos/servicos";
import { buscarServicoComTitulos } from "@/lib/servicos/titulos";
import { nomeCaminhao, TIPOS_VEICULO } from "@/lib/utils/caminhao";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { TelaLancarFrete } from "../../novo/TelaLancarFrete";

type ItemEntidade = { id: string; nome: string; apoio?: string };

/**
 * Edição de frete (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
 * Tarefa 4) — chega do "Editar frete" do detalhe.
 */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirSessao();
  const { id } = await params;

  const servico = await buscarServicoComTitulos(sessao.empresaId, id);
  if (!servico || servico.arquivado_em) notFound();

  const [
    clientes,
    caminhoes,
    motoristas,
    cargasRecentes,
    destinosIniciais,
    clienteAtual,
    caminhaoAtual,
    motoristaAtual,
  ] = await Promise.all([
    listarClientesPorUsoRecente(sessao.empresaId),
    listarCaminhoesPorUsoRecente(sessao.empresaId),
    listarMotoristasPorUsoRecente(sessao.empresaId),
    listarCargasRecentes(sessao.empresaId),
    listarDestinosDoCliente(sessao.empresaId, servico.cliente_id),
    buscarCliente(sessao.empresaId, servico.cliente_id),
    servico.veiculo_id ? buscarCaminhao(sessao.empresaId, servico.veiculo_id) : null,
    servico.motorista_id ? buscarMotorista(sessao.empresaId, servico.motorista_id) : null,
  ]);

  /**
   * As três listas vêm sem arquivado (`listarClientes`/etc. — `docs/
   * especificacao.md` §8, item 4). Se o cliente/caminhão/motorista deste
   * frete foi arquivado depois de criado, ele some da lista, e o rótulo da
   * tela cairia em "Escolher cliente" mesmo com uma referência de verdade
   * selecionada — `normalizarEntrada` aceita a referência antiga sem
   * exigir troca (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa
   * 4), mas a tela também precisa MOSTRAR o nome certo, não só aceitar o
   * id no fundo. Junta o atual na lista só para o nome aparecer — a folha
   * de busca (para TROCAR por outro) continua só com ativos, sem mudança.
   */
  const clientesParaTela: ItemEntidade[] =
    clienteAtual && !clientes.some((c) => c.id === clienteAtual.id)
      ? [
          {
            id: clienteAtual.id,
            nome: clienteAtual.nome,
            apoio: clienteAtual.municipio
              ? `${clienteAtual.municipio.nome}/${clienteAtual.municipio.uf}`
              : undefined,
          },
          ...clientes.map((c) => ({
            id: c.id,
            nome: c.nome,
            apoio: c.municipio ? `${c.municipio.nome}/${c.municipio.uf}` : undefined,
          })),
        ]
      : clientes.map((c) => ({
          id: c.id,
          nome: c.nome,
          apoio: c.municipio ? `${c.municipio.nome}/${c.municipio.uf}` : undefined,
        }));

  const caminhoesParaTela: ItemEntidade[] =
    caminhaoAtual && !caminhoes.some((c) => c.id === caminhaoAtual.id)
      ? [
          {
            id: caminhaoAtual.id,
            nome: nomeCaminhao(caminhaoAtual),
            apoio:
              [caminhaoAtual.placa, TIPOS_VEICULO.find((t) => t.valor === caminhaoAtual.tipo)?.rotulo]
                .filter(Boolean)
                .join(" · ") || undefined,
          },
          ...caminhoes.map((c) => ({
            id: c.id,
            nome: nomeCaminhao(c),
            apoio:
              [c.placa, TIPOS_VEICULO.find((t) => t.valor === c.tipo)?.rotulo]
                .filter(Boolean)
                .join(" · ") || undefined,
          })),
        ]
      : caminhoes.map((c) => ({
          id: c.id,
          nome: nomeCaminhao(c),
          apoio:
            [c.placa, TIPOS_VEICULO.find((t) => t.valor === c.tipo)?.rotulo]
              .filter(Boolean)
              .join(" · ") || undefined,
        }));

  const motoristasParaTela: ItemEntidade[] =
    motoristaAtual && !motoristas.some((m) => m.id === motoristaAtual.id)
      ? [
          { id: motoristaAtual.id, nome: motoristaAtual.nome, apoio: motoristaAtual.telefone ?? undefined },
          ...motoristas.map((m) => ({ id: m.id, nome: m.nome, apoio: m.telefone ?? undefined })),
        ]
      : motoristas.map((m) => ({ id: m.id, nome: m.nome, apoio: m.telefone ?? undefined }));

  const temTituloAtivo = servico.titulos.some((t) => t.status !== "cancelado");

  return (
    <TelaLancarFrete
      hojeYMD={diaEmFortaleza(new Date())}
      clientes={clientesParaTela}
      caminhoes={caminhoesParaTela}
      motoristas={motoristasParaTela}
      cargasRecentes={cargasRecentes}
      destinosIniciais={destinosIniciais}
      padrao={{
        clienteId: servico.cliente_id,
        veiculoId: servico.veiculo_id,
        motoristaId: servico.motorista_id,
        origemTexto: servico.origem_texto ?? "",
      }}
      edicao={{
        servicoId: servico.id,
        temTituloAtivo,
        destinoTexto: servico.destino_texto ?? "",
        cargaTexto: servico.carga_texto ?? "",
        km: servico.km != null ? String(servico.km / 1000) : "",
        valorCentavos: servico.valor,
        dataServico: diaEmFortaleza(servico.data_servico),
      }}
    />
  );
}
