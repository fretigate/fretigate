"use client";

import { useState } from "react";
import { Botao } from "./Botao";
import { CampoTexto } from "./CampoTexto";
import { CampoTocavel } from "./CampoTocavel";
import { ChipEscolha } from "./ChipEscolha";
import { FolhaDeCalendario } from "./FolhaDeCalendario";
import { FolhaInferior } from "./FolhaInferior";
import { PilulaEmLinha } from "./PilulaEmLinha";
import { TecladoNumerico } from "./TecladoNumerico";
import { deslocarDias, formatarDiaDaSemanaDataEAno } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";

/**
 * Folha de recebimento (item 6, Tarefa 3 —
 * `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 6 e
 * `docs/especificacao.md` §4.5) — "campo de valor editável pré-preenchido
 * com o saldo, data (chips Hoje · Ontem · Outra data) e forma de
 * pagamento". Valor menor lança **recebimento parcial**: quem decide o que
 * isso significa é `registrarRecebimento` (`src/lib/servicos/titulos.ts`) e
 * a função de banco por trás dele — esta folha só coleta os três campos.
 *
 * **Três telas possíveis, a mesma folha** (mesmo padrão de
 * `FolhaDeFaturamento`): normal, o teclado numérico do valor (substitui o
 * conteúdo, não empilha), e o calendário de "Outra data". Só uma por vez.
 *
 * **Formas de pagamento — lista fechada, mais "Outro" com campo livre**
 * (decisão 5 do plano): Pix · Dinheiro · Transferência · Boleto · Outro,
 * Pix primeiro por ser o mais usado (e o padrão pré-selecionado, sem o
 * mesmo risco que fez `FolhaDeFaturamento` pré-marcar "Outro" — nenhuma
 * forma aqui esconde uma ação). "Outro" revela um campo de texto livre —
 * mesmo padrão já usado para a origem do cadastro
 * (`FormularioCriarConta.tsx`, `OUTRO_ORIGEM`): o texto digitado é o que
 * grava, nunca a palavra "Outro".
 */

const FORMAS = ["Pix", "Dinheiro", "Transferência", "Boleto", "Outro"] as const;
type Forma = (typeof FORMAS)[number];

type Props = {
  /** Hoje em Fortaleza (`"AAAA-MM-DD"`) — o calendário e os chips de data precisam. */
  hoje: string;
  /** O que falta entrar neste título — pré-preenche o valor e é o teto da pílula "Valor todo". */
  saldoCentavos: number;
  /**
   * Devolve o erro em vez de lançar, mostrado **dentro da própria folha**
   * — mesmo motivo de `FolhaDeFaturamento.onFaturar`: `AvisoDoSistema` é
   * `z-50`, `FolhaInferior` é `z-[80]`, e um erro por aviso ficaria atrás
   * da folha, invisível.
   */
  onConfirmar: (dados: {
    valorCentavos: number;
    data: string;
    forma: string;
  }) => Promise<{ ok: true } | { ok: false; erro: string }>;
  onFechar: () => void;
};

export function FolhaDeRecebimento({ hoje, saldoCentavos, onConfirmar, onFechar }: Props) {
  const [valorCentavos, setValorCentavos] = useState(saldoCentavos);
  const [data, setData] = useState(hoje);
  const [forma, setForma] = useState<Forma>("Pix");
  const [formaOutro, setFormaOutro] = useState("");
  const [tela, setTela] = useState<"normal" | "teclado" | "calendario">("normal");
  const [registrando, setRegistrando] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | undefined>();

  const ontem = deslocarDias(hoje, -1);

  if (tela === "teclado") {
    return (
      <FolhaInferior onFechar={onFechar}>
        <TecladoNumerico
          valorCentavos={valorCentavos}
          // O teto é o saldo, não o valor cheio do frete — decisão do
          // fundador, 26/08/2026 (`docs/planos/item-6-titulo-e-cobrancas.md`,
          // Tarefa 3): o saldo é o que falta entrar, e é o número que esta
          // própria folha já mostra (pré-preenchido e na pílula "Valor
          // todo"). Digitar além disso só travaria no teto sem avisar por
          // quê; o servidor recusa do mesmo jeito (`registrarRecebimento`),
          // mas travar aqui evita o vaivém de errar, confirmar e ler o erro.
          onAlterar={(centavos) => setValorCentavos(Math.min(centavos, saldoCentavos))}
          onPronto={() => setTela("normal")}
        />
      </FolhaInferior>
    );
  }

  if (tela === "calendario") {
    return (
      <FolhaDeCalendario
        hoje={hoje}
        escolhida={data}
        titulo="Data do recebimento"
        travarEmHoje
        onEscolher={(dia) => {
          setData(dia);
          setTela("normal");
        }}
        onFechar={() => setTela("normal")}
      />
    );
  }

  const formaValida = forma !== "Outro" || formaOutro.trim().length > 0;
  const podeConfirmar = valorCentavos > 0 && formaValida;

  async function confirmar() {
    if (!podeConfirmar) return;
    setRegistrando(true);
    setErroServidor(undefined);
    try {
      const resultado = await onConfirmar({
        valorCentavos,
        data,
        forma: forma === "Outro" ? formaOutro.trim() : forma,
      });
      if (!resultado.ok) setErroServidor(resultado.erro);
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <FolhaInferior titulo="Confirmar recebimento" onFechar={onFechar}>
      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Valor recebido
        </span>
        <CampoTocavel onClick={() => setTela("teclado")} tabularNums>
          R$ {formatarCentavos(valorCentavos)}
        </CampoTocavel>
        {valorCentavos !== saldoCentavos ? (
          <PilulaEmLinha onClick={() => setValorCentavos(saldoCentavos)} className="self-start">
            Valor todo
          </PilulaEmLinha>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Data
        </span>
        <div role="radiogroup" aria-label="Data do recebimento" className="flex flex-wrap gap-8">
          <ChipEscolha selecionado={data === hoje} onClick={() => setData(hoje)}>
            Hoje
          </ChipEscolha>
          <ChipEscolha selecionado={data === ontem} onClick={() => setData(ontem)}>
            Ontem
          </ChipEscolha>
          <ChipEscolha
            selecionado={data !== hoje && data !== ontem}
            onClick={() => setTela("calendario")}
          >
            {data !== hoje && data !== ontem ? formatarDiaDaSemanaDataEAno(data) : "Outra data"}
          </ChipEscolha>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Forma de pagamento
        </span>
        <div role="radiogroup" aria-label="Forma de pagamento" className="flex flex-wrap gap-8">
          {FORMAS.map((opcao) => (
            <ChipEscolha key={opcao} selecionado={forma === opcao} onClick={() => setForma(opcao)}>
              {opcao}
            </ChipEscolha>
          ))}
        </div>
        {forma === "Outro" ? (
          <CampoTexto
            placeholder="Qual forma?"
            value={formaOutro}
            autoFocus
            onChange={(evento) => setFormaOutro(evento.target.value)}
          />
        ) : null}
      </div>

      {erroServidor ? (
        <span className="text-apoio font-medium text-vencido">{erroServidor}</span>
      ) : null}
      <Botao
        variante="principal"
        carregando={registrando}
        disabled={!podeConfirmar}
        onClick={confirmar}
      >
        Confirmar recebimento
      </Botao>
    </FolhaInferior>
  );
}
