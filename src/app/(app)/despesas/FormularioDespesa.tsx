"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { ChipEscolha } from "@/components/ui/ChipEscolha";
import { FolhaDeCalendario } from "@/components/ui/FolhaDeCalendario";
import { TecladoNumerico } from "@/components/ui/TecladoNumerico";
import { deslocarDias, formatarDiaDaSemanaDataEAno } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { CATEGORIAS_DESPESA } from "@/lib/utils/despesa";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { BotaoArquivarDespesa } from "./BotaoArquivarDespesa";
import { criarDespesaAction, editarDespesaAction, type EstadoDespesa } from "./acoes";

const ESTADO_INICIAL: EstadoDespesa = {};

/** As seis categorias fixas — sem "Outro", que abre o campo de texto livre. */
const CATEGORIAS_FIXAS: readonly string[] = CATEGORIAS_DESPESA.slice(0, -1);

type Caminhao = { id: string; apelido: string | null; placa: string | null };

type Despesa = {
  id: string;
  /** "AAAA-MM-DD" em Fortaleza. */
  data: string;
  categoria: string | null;
  valorCentavos: number;
  descricao: string | null;
  veiculoId: string | null;
};

type Props = {
  hoje: string;
  caminhoes: Caminhao[];
  despesa?: Despesa;
};

/**
 * Cadastro / edição de despesa (item 11) — `docs/componentes.md` linha 478:
 * principal Salvar despesa, teclado numérico próprio para o valor, chips de
 * categoria e de vínculo.
 *
 * **Salvar e Arquivar rolam com o formulário, como em todo outro cadastro**
 * (`docs/componentes.md`, "Posição": "Formulários: o salvar fica no fim do
 * formulário, rolando junto. Destrutiva logo abaixo, em texto") — corrigido
 * do desenho original desta tarefa, que copiava o rodapé fixo de
 * `TelaLancarFrete.tsx` para os dois botões (achado do `/revisar`: a
 * "Exceção" documentada é só sobre o teclado numérico nunca cobrir o
 * Salvar, não sobre fixar o bloco de ações inteiro). **Só o teclado
 * numérico** vira um bloco `flex-none` fora da área rolável quando aberto —
 * como ele nunca sobrepõe por cima de nada (é irmão da área rolável, não
 * `position: absolute`), o Salvar nunca fica coberto por construção, sem
 * precisar sair do fluxo normal.
 *
 * **Dona da tela inteira, cabeçalho incluído** — só porque o cabeçalho + o
 * corpo + o teclado (quando aberto) formam uma coluna flex só, dentro de um
 * `<form>` só, para o `FormData` sair inteiro; diferente de
 * cliente/caminhão/motorista (cabeçalho em `page.tsx`, formulário à parte)
 * só por essa mecânica, não por regra de posição diferente.
 *
 * **Data trava contra o futuro** (`travarEmHoje` no calendário, mesmo padrão
 * de `FolhaDeRecebimento`) — decisão do fundador, 01/09/2026 (`docs/planos/
 * item-11-despesas.md`): despesa é fato que já aconteceu, diferente do
 * frete, cuja ordem nasce antes da execução.
 *
 * **Vínculo é só a caminhão, por chip** (decisão 1 do plano; chip, não
 * `FolhaDeBusca`, por `docs/componentes.md` linha 478 — "chips de categoria
 * e de vínculo", achado do `/revisar`) — mesmo mecanismo de `ChipEscolha`
 * da categoria, "Sem vínculo" como primeira opção. **O texto de apoio não
 * promete R$/km por caminhão** — achado do `/revisar`: a primeira versão
 * dizia "ajuda a ver o custo dele", contradizendo a decisão 3 do plano (o
 * vínculo é só informativo, não altera `resumoDoCaminhao`).
 */
export function FormularioDespesa({ hoje, caminhoes, despesa }: Props) {
  const ehEdicao = despesa !== undefined;
  const acao = ehEdicao ? editarDespesaAction.bind(null, despesa.id) : criarDespesaAction;
  const [estado, formAction, pending] = useActionState(acao, ESTADO_INICIAL);

  const [valorCentavos, setValorCentavos] = useState(despesa?.valorCentavos ?? 0);
  const [data, setData] = useState(despesa?.data ?? hoje);

  const categoriaJaFixa = despesa?.categoria && CATEGORIAS_FIXAS.includes(despesa.categoria);
  const [categoria, setCategoria] = useState(
    despesa?.categoria ? (categoriaJaFixa ? despesa.categoria : "Outro") : "",
  );
  const [categoriaOutro, setCategoriaOutro] = useState(
    despesa?.categoria && !categoriaJaFixa ? despesa.categoria : "",
  );

  const [descricao, setDescricao] = useState(despesa?.descricao ?? "");
  const [veiculoId, setVeiculoId] = useState(despesa?.veiculoId ?? "");

  const [tecladoAberto, setTecladoAberto] = useState(false);
  const [calendarioAberto, setCalendarioAberto] = useState(false);

  function alterar(definir: (valor: string) => void) {
    return (evento: ChangeEvent<HTMLInputElement>) => definir(evento.target.value);
  }

  const ontem = deslocarDias(hoje, -1);

  const categoriaValida = categoria !== "Outro" || categoriaOutro.trim().length > 0;
  const podeSalvar = valorCentavos > 0 && categoriaValida;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-papel">
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="data" value={data} />
        <input type="hidden" name="valorCentavos" value={valorCentavos} />
        <input
          type="hidden"
          name="categoria"
          value={categoria === "Outro" ? categoriaOutro.trim() : categoria}
        />
        <input type="hidden" name="veiculoId" value={veiculoId} />

        <div
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-16"
          style={{ paddingTop: "var(--area-segura-topo)", paddingBottom: "var(--folga-rolagem)" }}
        >
          <div className="mb-8 flex items-center gap-10">
            <BotaoVoltar href="/despesas" />
            <span className="min-w-0 flex-1 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
              {ehEdicao ? "Editar despesa" : "Nova despesa"}
            </span>
          </div>

          <div className="flex flex-col gap-10 rounded-cartao-escuro bg-tinta px-22 py-18">
            <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-white/45">
              Valor da despesa
            </span>
            <button
              type="button"
              onClick={() => setTecladoAberto(true)}
              className="text-left text-heroi font-extrabold leading-[1] tracking-[-0.035em] text-white [font-variant-numeric:tabular-nums]"
            >
              R$ {formatarCentavos(valorCentavos)}
            </button>
          </div>
          {estado.erros?.valorCentavos ? (
            <span className="px-4 text-apoio font-medium text-vencido">
              {estado.erros.valorCentavos}
            </span>
          ) : null}

          <span className="px-4 pt-14 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Categoria
          </span>
          <div role="radiogroup" aria-label="Categoria da despesa" className="flex flex-wrap gap-8 px-4">
            {CATEGORIAS_DESPESA.map((opcao) => (
              <ChipEscolha
                key={opcao}
                selecionado={categoria === opcao}
                onClick={() => setCategoria(opcao)}
              >
                {opcao}
              </ChipEscolha>
            ))}
          </div>
          {categoria === "Outro" ? (
            <div className="px-4">
              <CampoTexto
                placeholder="Qual categoria?"
                value={categoriaOutro}
                autoFocus
                onChange={alterar(setCategoriaOutro)}
              />
            </div>
          ) : null}

          <span className="px-4 pt-14 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Quando e o quê
          </span>
          <div className="flex flex-col gap-6">
            <div role="radiogroup" aria-label="Data da despesa" className="flex flex-wrap gap-8">
              <ChipEscolha selecionado={data === hoje} onClick={() => setData(hoje)}>
                Hoje
              </ChipEscolha>
              <ChipEscolha selecionado={data === ontem} onClick={() => setData(ontem)}>
                Ontem
              </ChipEscolha>
              <ChipEscolha
                selecionado={data !== hoje && data !== ontem}
                onClick={() => setCalendarioAberto(true)}
              >
                {data !== hoje && data !== ontem ? formatarDiaDaSemanaDataEAno(data) : "Outra data"}
              </ChipEscolha>
            </div>
            <CampoTexto
              rotulo="Descrição"
              name="descricao"
              placeholder="O que foi"
              value={descricao}
              onChange={alterar(setDescricao)}
            />
          </div>

          <span className="px-4 pt-14 pb-6 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
            Vínculo — opcional
          </span>
          <span className="px-4 pb-6 text-apoio font-medium text-tinta-apoio">
            Sem vínculo, a despesa entra só no lucro do mês.
          </span>
          <div role="radiogroup" aria-label="Vínculo com caminhão" className="flex flex-wrap gap-8">
            <ChipEscolha selecionado={veiculoId === ""} onClick={() => setVeiculoId("")}>
              Sem vínculo
            </ChipEscolha>
            {caminhoes.map((c) => (
              <ChipEscolha
                key={c.id}
                selecionado={veiculoId === c.id}
                onClick={() => setVeiculoId(c.id)}
              >
                {nomeCaminhao(c)}
              </ChipEscolha>
            ))}
          </div>

          {estado.erros?.data ? (
            <span className="px-4 text-apoio font-medium text-vencido">{estado.erros.data}</span>
          ) : null}
          {estado.erroGeral ? (
            <span className="px-4 pt-8 text-apoio font-medium text-vencido">{estado.erroGeral}</span>
          ) : null}

          <Botao
            variante="principal"
            type="submit"
            carregando={pending}
            disabled={!podeSalvar}
            className="mt-16"
          >
            {ehEdicao ? "Salvar alterações" : "Salvar despesa"}
          </Botao>
          {ehEdicao ? <BotaoArquivarDespesa id={despesa.id} /> : null}
        </div>

        {/* Bloco fora do fluxo rolável só quando o teclado está aberto —
            `docs/componentes.md`, "Posição", exceção: "o salvar nunca fica
            coberto... sobe junto, acima do teclado". Irmão da área rolável
            (nunca `position: absolute` sobre ela), então o teclado nunca
            cobre o Salvar: ele empurra a área rolável, que continua
            mostrando Salvar/Arquivar ao rolar — não sobrepõe por cima de
            nada. */}
        {tecladoAberto ? (
          <div
            className="flex-none bg-separacao"
            style={{ paddingBottom: "var(--ancora-rodape-acoes)" }}
          >
            <TecladoNumerico
              valorCentavos={valorCentavos}
              onAlterar={setValorCentavos}
              onPronto={() => setTecladoAberto(false)}
            />
          </div>
        ) : null}
      </form>

      {calendarioAberto ? (
        <FolhaDeCalendario
          hoje={hoje}
          escolhida={data}
          titulo="Data da despesa"
          travarEmHoje
          onEscolher={(dia) => {
            setData(dia);
            setCalendarioAberto(false);
          }}
          onFechar={() => setCalendarioAberto(false)}
        />
      ) : null}
    </div>
  );
}
