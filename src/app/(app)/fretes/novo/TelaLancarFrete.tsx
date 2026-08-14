"use client";

import { useActionState, useEffect, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { FolhaDeBusca, type ItemFolhaDeBusca } from "@/components/ui/FolhaDeBusca";
import { FolhaDeCalendario } from "@/components/ui/FolhaDeCalendario";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { TecladoNumerico } from "@/components/ui/TecladoNumerico";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { deslocarDias, diaDaSemana } from "@/lib/utils/data-fortaleza";
import { iniciais } from "@/lib/utils/iniciais";
import type { Municipio } from "@/lib/servicos/municipios";
import { CadastroRapido, type TipoCadastroRapido } from "../CadastroRapido";
import {
  buscarMunicipiosAction,
  buscarSugestaoDeValorAction,
  criarServicoAction,
  listarDestinosDoClienteAction,
  type EstadoServico,
} from "../acoes";

/**
 * Lançar frete — `docs/planos/item-3-lancamento-frete.md`, Tarefa 2.
 *
 * O cartão do cabeçalho rola junto com o resto do conteúdo, como em
 * qualquer formulário do produto. Só o rodapé (teclado numérico +
 * "Salvar frete") é a EXCEÇÃO documentada em `docs/componentes.md`,
 * "Posição": "o teclado numérico é sobreposição, e o salvar nunca fica
 * coberto — ele sobe junto, acima do teclado." Por isso, e só por isso,
 * este formulário (e Despesas, depois) tem rodapé que não rola — nenhum
 * outro bloco da tela ganha essa exceção.
 */

type ItemEntidade = { id: string; nome: string; apoio?: string };

type Props = {
  /** "AAAA-MM-DD" no fuso de Fortaleza — nunca `Date` local (ver o topo do arquivo). */
  hojeYMD: string;
  clientes: ItemEntidade[];
  caminhoes: ItemEntidade[];
  motoristas: ItemEntidade[];
  cargasRecentes: string[];
  destinosIniciais: string[];
  padrao: {
    clienteId: string | null;
    veiculoId: string | null;
    motoristaId: string | null;
    origemTexto: string;
  };
};

const DIA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** `dia`/`hoje` são "AAAA-MM-DD" no fuso de Fortaleza — nunca `Date` local. */
function rotuloData(dia: string, hoje: string): string {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  const corpo = `${DIA_SEMANA[diaDaSemana(dia)]}, ${diaDoMes} de ${MES_NOME[mes - 1]}`;

  if (dia === hoje) return `Hoje · ${corpo}`;
  if (dia === deslocarDias(hoje, -1)) return `Ontem · ${corpo}`;
  if (dia === deslocarDias(hoje, 1)) return `Amanhã · ${corpo}`;
  const anoHoje = Number(hoje.slice(0, 4));
  const sufixoAno = ano !== anoHoje ? ` de ${ano}` : "";
  return corpo.charAt(0).toUpperCase() + corpo.slice(1) + sufixoAno;
}

function LinhaRecolhida({ rotulo, valor, onClick }: { rotulo: string; valor: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-60 items-center gap-12 rounded-campo bg-separacao px-18 text-left active:bg-principal-desabilitado"
    >
      <span className="w-82 flex-none text-[11px] font-bold uppercase leading-[1] tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      <span className="min-w-0 flex-1 truncate text-nome-recolhida font-bold text-tinta">{valor}</span>
      <svg width={8} height={14} viewBox="0 0 8 14" fill="none" className="flex-none" aria-hidden="true">
        <path
          d="M1.4 1.4 6.6 7l-5.2 5.6"
          stroke="#A8AFA9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function LinhaEditavel({
  rotulo,
  nome,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  rotulo: string;
  nome: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <div className="flex min-h-60 items-center gap-12 rounded-campo bg-separacao px-18">
      <span className="w-82 flex-none text-[11px] font-bold uppercase leading-[1] tracking-[.16em] text-tinta-apoio">
        {rotulo}
      </span>
      <input
        name={nome}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="min-w-0 flex-1 bg-transparent text-nome-recolhida font-bold leading-[1.2] text-tinta outline-none placeholder:font-medium placeholder:text-tinta-fraca"
      />
    </div>
  );
}

function LinhaDeChips({ itens, onEscolher }: { itens: string[]; onEscolher: (valor: string) => void }) {
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-8 px-4">
      {itens.map((item) => (
        <PilulaEmLinha key={item} onClick={() => onEscolher(item)}>
          {item}
        </PilulaEmLinha>
      ))}
    </div>
  );
}

const ESTADO_INICIAL: EstadoServico = {};

export function TelaLancarFrete({
  hojeYMD,
  clientes,
  caminhoes,
  motoristas,
  cargasRecentes,
  destinosIniciais,
  padrao,
}: Props) {
  const hoje = hojeYMD;

  const [listaClientes, setListaClientes] = useState<ItemEntidade[]>(clientes);
  const [listaCaminhoes, setListaCaminhoes] = useState<ItemEntidade[]>(caminhoes);
  const [listaMotoristas, setListaMotoristas] = useState<ItemEntidade[]>(motoristas);

  const [clienteId, setClienteId] = useState(padrao.clienteId ?? "");
  const [veiculoId, setVeiculoId] = useState(padrao.veiculoId ?? "");
  const [motoristaId, setMotoristaId] = useState(padrao.motoristaId ?? "");
  const [origemTexto, setOrigemTexto] = useState(padrao.origemTexto);
  const [destinoTexto, setDestinoTexto] = useState("");
  const [cargaTexto, setCargaTexto] = useState("");
  const [km, setKm] = useState("");
  const [valorCentavos, setValorCentavos] = useState(0);
  const [dataEscolhida, setDataEscolhida] = useState(hoje);

  const [destinosDoCliente, setDestinosDoCliente] = useState(destinosIniciais);
  const [municipiosSugeridos, setMunicipiosSugeridos] = useState<Municipio[]>([]);
  const [sugestaoValor, setSugestaoValor] = useState<number | null>(null);

  const [folhaAberta, setFolhaAberta] = useState<TipoCadastroRapido | null>(null);
  const [nomeParaCadastro, setNomeParaCadastro] = useState("");
  const [cadastroRapidoAberto, setCadastroRapidoAberto] = useState<TipoCadastroRapido | null>(null);
  const [tecladoAberto, setTecladoAberto] = useState(false);
  const [calendarioAberto, setCalendarioAberto] = useState(false);

  const [estado, formAction, salvando] = useActionState(criarServicoAction, ESTADO_INICIAL);

  useEffect(() => {
    let cancelado = false;
    listarDestinosDoClienteAction(clienteId).then((destinos) => {
      if (!cancelado) setDestinosDoCliente(destinos);
    });
    return () => {
      cancelado = true;
    };
  }, [clienteId]);

  useEffect(() => {
    let cancelado = false;
    const termo = destinoTexto.trim();
    const temporizador = setTimeout(() => {
      if (termo.length < 2) {
        if (!cancelado) setMunicipiosSugeridos([]);
        return;
      }
      buscarMunicipiosAction(destinoTexto).then((lista) => {
        if (!cancelado) setMunicipiosSugeridos(lista);
      });
    }, 200);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [destinoTexto]);

  useEffect(() => {
    let cancelado = false;
    buscarSugestaoDeValorAction(clienteId, destinoTexto).then((valor) => {
      if (!cancelado) setSugestaoValor(valor);
    });
    return () => {
      cancelado = true;
    };
  }, [clienteId, destinoTexto]);

  const nomeCliente = listaClientes.find((c) => c.id === clienteId)?.nome ?? "Escolher cliente";
  const nomeVeiculo = listaCaminhoes.find((c) => c.id === veiculoId)?.nome ?? "Escolher caminhão";
  const nomeMotorista = listaMotoristas.find((c) => c.id === motoristaId)?.nome ?? "Escolher motorista";

  function abrirFolha(tipo: TipoCadastroRapido) {
    setFolhaAberta(tipo);
    setTecladoAberto(false);
    setCalendarioAberto(false);
  }

  function itensDaFolha(): ItemFolhaDeBusca[] {
    // O círculo de iniciais é regra de cliente/motorista, nunca de caminhão
    // (ver o comentário em `LinhaDeLista.tsx`) — só os dois primeiros ganham
    // `iniciais` aqui.
    if (folhaAberta === "cliente") {
      return listaClientes.map((c) => ({ ...c, iniciais: iniciais(c.nome) }));
    }
    if (folhaAberta === "caminhao") return listaCaminhoes;
    if (folhaAberta === "motorista") {
      return listaMotoristas.map((m) => ({ ...m, iniciais: iniciais(m.nome) }));
    }
    return [];
  }

  function selecionarNaFolha(id: string) {
    if (folhaAberta === "cliente") setClienteId(id);
    if (folhaAberta === "caminhao") setVeiculoId(id);
    if (folhaAberta === "motorista") setMotoristaId(id);
    setFolhaAberta(null);
  }

  function abrirCadastroRapido(nomeDigitado: string) {
    setNomeParaCadastro(nomeDigitado);
    setCadastroRapidoAberto(folhaAberta);
  }

  function itemCriado(item: ItemEntidade) {
    if (cadastroRapidoAberto === "cliente") {
      setListaClientes((atual) => [item, ...atual]);
      setClienteId(item.id);
    } else if (cadastroRapidoAberto === "caminhao") {
      setListaCaminhoes((atual) => [item, ...atual]);
      setVeiculoId(item.id);
    } else if (cadastroRapidoAberto === "motorista") {
      setListaMotoristas((atual) => [item, ...atual]);
      setMotoristaId(item.id);
    }
    setCadastroRapidoAberto(null);
    setFolhaAberta(null);
  }

  const TITULOS_FOLHA: Record<TipoCadastroRapido, string> = {
    cliente: "Escolher cliente",
    caminhao: "Escolher caminhão",
    motorista: "Escolher motorista",
  };
  const PLACEHOLDERS_FOLHA: Record<TipoCadastroRapido, string> = {
    cliente: "Buscar cliente",
    caminhao: "Buscar caminhão",
    motorista: "Buscar motorista",
  };

  const temSugestao = sugestaoValor !== null && sugestaoValor > 0 && valorCentavos === 0;
  const municipiosParaMostrar: Municipio[] = municipiosSugeridos.filter(
    (m) => `${m.nome}/${m.uf}` !== destinoTexto.trim(),
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-papel">
      {/* Um `<form>` só, para o `FormData` sair inteiro — mas com o meio
          rolável e o rodapé fixo como filhos irmãos (a exceção do topo do
          arquivo), não um bloco só que rola inteiro. */}
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="veiculoId" value={veiculoId} />
        <input type="hidden" name="motoristaId" value={motoristaId} />
        <input type="hidden" name="dataServico" value={dataEscolhida} />
        <input type="hidden" name="valorCentavos" value={valorCentavos} />

        {/* Cabeçalho escuro + as seis linhas + km — `docs/especificacao.md`
            §4.1. Tudo rola junto; só o rodapé (abaixo) fica fora do fluxo. */}
        <div
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-16 pb-20"
          style={{ paddingTop: "var(--area-segura-topo)" }}
        >
          {/* Cabeçalho escuro — data e valor, `docs/estilo.md`: "Lançar frete | valor 60px no cartão escuro". */}
          <div className="mb-14 flex flex-col rounded-cartao-escuro bg-tinta px-22 pt-18 pb-20">
            <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-white/45">
              Lançar frete
            </span>
            <button
              type="button"
              onClick={() => {
                setCalendarioAberto(true);
                setTecladoAberto(false);
                setFolhaAberta(null);
              }}
              className="-mx-8 mt-2 flex min-h-48 items-center gap-8 px-8 text-left"
            >
              <span className="text-[15px] font-semibold leading-[1] text-white">
                {rotuloData(dataEscolhida, hoje)}
              </span>
              <span className="text-etiqueta font-bold uppercase leading-[1] tracking-[.1em] text-amarelo">
                Trocar
              </span>
            </button>

            {/* Escondido enquanto o teclado está aberto — ele já mostra o
                mesmo valor no próprio cabeçalho (`TecladoNumerico.tsx`), e o
                teclado cobre esta linha na maioria das telas de celular de
                qualquer forma. O valor existe visível em um lugar só de cada
                vez, por código, não por coincidência de tamanho de tela
                (achado do fundador, `docs/diario.md`, 12–13/08/2026). */}
            {!tecladoAberto ? (
              <button
                type="button"
                onClick={() => {
                  setTecladoAberto(true);
                  setFolhaAberta(null);
                  setCalendarioAberto(false);
                }}
                className="mt-18 flex items-baseline gap-10 text-left"
              >
                <span className="text-[24px] font-bold leading-[1] text-white/45">R$</span>
                <span className="min-w-0 flex-1 text-heroi font-extrabold leading-[1] tracking-[-0.035em] text-white [font-variant-numeric:tabular-nums]">
                  {formatarCentavos(valorCentavos)}
                </span>
              </button>
            ) : null}

            {temSugestao ? (
              <PilulaEmLinha className="mt-14 self-start" onClick={() => setValorCentavos(sugestaoValor)}>
                Última vez neste trecho: R$ {formatarCentavos(sugestaoValor)}
              </PilulaEmLinha>
            ) : null}
          </div>

          <LinhaRecolhida rotulo="Cliente" valor={nomeCliente} onClick={() => abrirFolha("cliente")} />
          {estado.erros?.clienteId ? (
            <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.clienteId}</span>
          ) : null}
          <LinhaRecolhida rotulo="Caminhão" valor={nomeVeiculo} onClick={() => abrirFolha("caminhao")} />
          {estado.erros?.veiculoId ? (
            <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.veiculoId}</span>
          ) : null}
          <LinhaRecolhida rotulo="Motorista" valor={nomeMotorista} onClick={() => abrirFolha("motorista")} />
          {estado.erros?.motoristaId ? (
            <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.motoristaId}</span>
          ) : null}

          <LinhaEditavel
            rotulo="Origem"
            nome="origemTexto"
            value={origemTexto}
            onChange={setOrigemTexto}
            placeholder="De onde sai"
          />

          <LinhaEditavel
            rotulo="Destino"
            nome="destinoTexto"
            value={destinoTexto}
            onChange={setDestinoTexto}
            placeholder="Para onde vai"
          />
          <LinhaDeChips itens={destinosDoCliente} onEscolher={setDestinoTexto} />
          {municipiosParaMostrar.length > 0 ? (
            <div className="flex flex-col gap-6 px-4">
              <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
                Município reconhecido
              </span>
              <div className="flex flex-wrap gap-8">
                {municipiosParaMostrar.map((m) => (
                  <PilulaEmLinha
                    key={m.codigo_ibge}
                    onClick={() => setDestinoTexto(`${m.nome}/${m.uf}`)}
                  >
                    {m.nome}/{m.uf}
                  </PilulaEmLinha>
                ))}
              </div>
            </div>
          ) : null}

          <LinhaEditavel
            rotulo="Carga"
            nome="cargaTexto"
            value={cargaTexto}
            onChange={setCargaTexto}
            placeholder="O que vai na carga"
          />
          <LinhaDeChips itens={cargasRecentes} onEscolher={setCargaTexto} />

          <LinhaEditavel
            rotulo="Km"
            nome="km"
            value={km}
            onChange={(valor) => setKm(valor.replace(/[^\d]/g, ""))}
            placeholder="opcional"
            inputMode="numeric"
          />

          {estado.erros?.valorCentavos ? (
            <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.valorCentavos}</span>
          ) : null}
          {estado.erros?.dataServico ? (
            <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.dataServico}</span>
          ) : null}
          {estado.erroGeral ? (
            <span className="px-4 pt-8 text-apoio font-medium text-vencido">{estado.erroGeral}</span>
          ) : null}
        </div>

        {/* Rodapé fixo — ver comentário no topo do arquivo. */}
        <div className="relative flex-none">
          {tecladoAberto ? (
            <TecladoNumerico
              valorCentavos={valorCentavos}
              onAlterar={setValorCentavos}
              onPronto={() => setTecladoAberto(false)}
              className="absolute inset-x-0 bottom-full"
            />
          ) : null}
          <div className="px-20 pt-16" style={{ paddingBottom: "var(--ancora-rodape-acoes)" }}>
            <Botao
              variante="principal"
              type="submit"
              carregando={salvando}
              disabled={!clienteId}
              distribuido
            >
              <span className="flex-1 text-left">Salvar frete</span>
              <span className="text-[19px] font-extrabold leading-[1] text-white/75 [font-variant-numeric:tabular-nums]">
                R$ {formatarCentavos(valorCentavos)}
              </span>
            </Botao>
          </div>
        </div>
      </form>

      {calendarioAberto ? (
        <FolhaDeCalendario
          hoje={hoje}
          escolhida={dataEscolhida}
          onEscolher={setDataEscolhida}
          onFechar={() => setCalendarioAberto(false)}
        />
      ) : null}

      {folhaAberta ? (
        <FolhaDeBusca
          titulo={TITULOS_FOLHA[folhaAberta]}
          placeholder={PLACEHOLDERS_FOLHA[folhaAberta]}
          itens={itensDaFolha()}
          onSelecionar={selecionarNaFolha}
          onNovo={abrirCadastroRapido}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {cadastroRapidoAberto ? (
        <CadastroRapido
          tipo={cadastroRapidoAberto}
          nomeInicial={nomeParaCadastro}
          onCriado={itemCriado}
          onCancelar={() => setCadastroRapidoAberto(null)}
        />
      ) : null}
    </div>
  );
}
