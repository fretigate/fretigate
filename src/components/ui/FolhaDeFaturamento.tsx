"use client";

import { useState } from "react";
import { Botao } from "./Botao";
import { ChipEscolha } from "./ChipEscolha";
import { FolhaInferior } from "./FolhaInferior";
import { FolhaDeCalendario } from "./FolhaDeCalendario";
import { formatarDiaDaSemanaDataEAno } from "@/lib/utils/data-fortaleza";

/**
 * Folha de "Faturar frete" (item 6, Tarefa 1 —
 * `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 3). Nasce
 * **pré-preenchida** com o vencimento calculado pelo prazo do cliente, e
 * quem não quiser mudar confirma e segue.
 *
 * **Por que não fatura direto**, nas palavras do fundador (26/08/2026): o
 * vencimento define quando aquilo vira "vencido" na tela, e errar significa
 * cobrar antes da hora ou tarde demais. E o prazo do cadastro é **padrão,
 * não verdade daquele frete** — cliente pede prazo maior num mês, combina
 * diferente numa carga.
 *
 * É o **terceiro** dos três níveis de prazo de `docs/especificacao.md` §4.7
 * (empresa → cliente → edição ao faturar); os dois primeiros chegam já
 * resolvidos em `vencimentoInicial` (`vencimentoPadrao`,
 * `src/lib/servicos/titulos.ts`).
 *
 * **O dia é `"AAAA-MM-DD"` no fuso de Fortaleza o tempo todo**, nunca um
 * `Date` local — mesma regra de `FolhaDeCalendario` e do resto do produto
 * (`src/lib/utils/data-fortaleza.ts`).
 *
 * O calendário substitui esta folha enquanto está aberto (não empilha duas
 * sobreposições), mesmo padrão de `FolhaDePeriodo`.
 *
 * **"Outro" vem marcado por padrão, e isto NÃO é escolha arbitrária — não
 * troque para "Boleto" por parecer mais comum.** Decisão do fundador,
 * 26/08/2026 (`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 1), achado
 * do `/revisar`: cobrança marcada como boleto **não** exibe "Cobrar no
 * WhatsApp" e não gera pendência na dashboard (`docs/especificacao.md` §8
 * item 11 e §4.5 — o banco já avisa o atraso). Com "Boleto" pré-marcado,
 * quem confirmasse sem prestar atenção perderia a ação de cobrar e não
 * entenderia por quê: o botão simplesmente não estaria lá. O padrão errado
 * aqui não erra um campo, some com uma ação.
 *
 * **Vencimento no passado é permitido de propósito** (mesma decisão): o
 * calendário navega meses para trás sem limite. Faturar um frete antigo cujo
 * prazo já venceu é caso real — quem faz isso está registrando o que
 * aconteceu, não criando dívida nova —, e recusar obrigaria a mentir na
 * data. A cobrança nasce vencida, e é isso que a tela deve mostrar.
 */

export type FormaPrevista = "boleto" | "outro";

type Props = {
  /** Hoje em Fortaleza (`"AAAA-MM-DD"`) — o calendário precisa para marcar o dia atual. */
  hoje: string;
  vencimentoInicial: string;
  /**
   * Devolve o erro em vez de lançar, e a folha o mostra **dentro dela
   * mesma** — mesmo padrão de `FolhaDeTelefone.onSalvar`, e aqui é
   * obrigatório, não estilo: `AvisoDoSistema` é `z-50` e `FolhaInferior` é
   * `z-[80]`, então um aviso do sistema disparado com a folha aberta ficaria
   * **atrás** dela, invisível. Fechar a folha para mostrar o aviso seria
   * pior — jogaria fora o vencimento e a forma já escolhidos, a mesma perda
   * que o `CLAUDE.md` §14 registra para o cadastro interrompido.
   */
  onFaturar: (dados: {
    vencimento: string;
    formaPrevista: FormaPrevista;
  }) => Promise<{ ok: true } | { ok: false; erro: string }>;
  onFechar: () => void;
};

const FORMAS: { valor: FormaPrevista; rotulo: string }[] = [
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "outro", rotulo: "Outro" },
];

export function FolhaDeFaturamento({ hoje, vencimentoInicial, onFaturar, onFechar }: Props) {
  const [vencimento, setVencimento] = useState(vencimentoInicial);
  const [formaPrevista, setFormaPrevista] = useState<FormaPrevista>("outro");
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const [faturando, setFaturando] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | undefined>();

  if (calendarioAberto) {
    return (
      <FolhaDeCalendario
        hoje={hoje}
        escolhida={vencimento}
        titulo="Vencimento"
        onEscolher={(dia) => {
          setVencimento(dia);
          setCalendarioAberto(false);
        }}
        onFechar={() => setCalendarioAberto(false)}
      />
    );
  }

  async function faturar() {
    setFaturando(true);
    setErroServidor(undefined);
    try {
      const resultado = await onFaturar({ vencimento, formaPrevista });
      // Quem fecha a folha no sucesso é o chamador (que também atualiza a
      // tela). Aqui só resta o caminho do erro.
      if (!resultado.ok) setErroServidor(resultado.erro);
    } finally {
      setFaturando(false);
    }
  }

  return (
    <FolhaInferior titulo="Faturar frete" onFechar={onFechar}>
      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Vencimento
        </span>
        <button
          type="button"
          onClick={() => setCalendarioAberto(true)}
          className="flex min-h-64 items-center rounded-campo bg-separacao px-16 text-nome-recolhida font-semibold text-tinta"
        >
          {formatarDiaDaSemanaDataEAno(vencimento)}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
          Cobrança
        </span>
        <div role="radiogroup" aria-label="Forma de cobrança" className="flex gap-8">
          {FORMAS.map((forma) => (
            <ChipEscolha
              key={forma.valor}
              selecionado={formaPrevista === forma.valor}
              onClick={() => setFormaPrevista(forma.valor)}
            >
              {forma.rotulo}
            </ChipEscolha>
          ))}
        </div>
      </div>

      {erroServidor ? (
        <span className="text-apoio font-medium text-vencido">{erroServidor}</span>
      ) : null}
      <Botao variante="principal" carregando={faturando} onClick={faturar}>
        Faturar frete
      </Botao>
    </FolhaInferior>
  );
}
