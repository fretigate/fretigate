"use client";

import { useState } from "react";
import { FolhaInferior } from "./FolhaInferior";
import { deslocarDias, deslocarMes, diaDaSemana, diasNoMes } from "@/lib/utils/data-fortaleza";

/**
 * Folha de calendário — escolhe a data do frete no Lançamento
 * (`docs/especificacao.md` §4.1: "obrigatório para salvar: ... data",
 * "a data pode ser futura"). Não tem seção própria em `docs/componentes.md`;
 * medidas seguem o padrão de folha inferior e o protótipo de referência
 * (`referencia/.../TelaLancarFrete.dc.html`, evidência corroborante —
 * `CLAUDE.md` §13): setas de mês `44px`, células de dia `48px`, chips de
 * atalho `38px`.
 *
 * Todo dia é uma string `"AAAA-MM-DD"` (fuso de Fortaleza, `CLAUDE.md` §7),
 * nunca um `Date` local — achado do `/revisar` na Tarefa 2: a versão
 * anterior usava `new Date(ano, mes, dia)`/`getDate()`, que lê o fuso de
 * quem roda o código, não o de Fortaleza. Ver `src/lib/utils/
 * data-fortaleza.ts` e `tests/data-fortaleza.test.ts`.
 */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  hoje: string;
  escolhida: string;
  onEscolher: (dia: string) => void;
  onFechar: () => void;
  /** "Data do frete" (Lançamento) por padrão — o filtro de Período (Meus fretes, item 4 Tarefa 2) passa "Data inicial"/"Data final". */
  titulo?: string;
  /**
   * `false` para o filtro de Período escolher duas datas em sequência
   * (`FolhaDePeriodo`): a primeira escolha avança de passo em vez de fechar
   * a folha inteira. Todo outro uso (Lançamento de frete) mantém o padrão.
   */
  fecharAoEscolher?: boolean;
  /**
   * Trava a navegação e a escolha em hoje — usado quando a data não pode
   * ser futura (`FolhaDeRecebimento`, item 6, Tarefa 3: recebimento é
   * registro de um fato que já aconteceu, `registrarRecebimento` recusa
   * data futura no servidor). `false` em todo outro uso, de propósito:
   * data do frete pode ser futura (`docs/especificacao.md` §4.1), e
   * vencimento é sempre futuro (`FolhaDeFaturamento`). Sem isto, o chip
   * "Amanhã", a seta de mês seguinte e os dias futuros ofereciam uma
   * escolha que o servidor sempre recusaria — achado do `/revisar` na
   * Tarefa 3.
   *
   * **Desabilita, nunca esconde** — achado do terceiro `/revisar`:
   * `docs/componentes.md` (linha 435) declara os três chips (Hoje · Ontem ·
   * Amanhã) como conteúdo fixo da folha, e esconder um deles mudaria o que
   * a tela contém sem passar pelo Design (`CLAUDE.md` §13). Cinza e sem
   * toque é o mesmo tratamento já usado para os dias futuros do próprio
   * calendário e para a seta de mês seguinte, duas linhas abaixo.
   */
  travarEmHoje?: boolean;
};

export function FolhaDeCalendario({
  hoje,
  escolhida,
  onEscolher,
  onFechar,
  titulo = "Data do frete",
  fecharAoEscolher = true,
  travarEmHoje = false,
}: Props) {
  const [mesExibido, setMesExibido] = useState(() => `${escolhida.slice(0, 7)}-01`);

  const [ano, mes] = mesExibido.split("-").map(Number);
  const mesPad = String(mes).padStart(2, "0");
  const primeiroDiaSemana = diaDaSemana(mesExibido);
  const totalDias = diasNoMes(mesExibido);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);
  // Comparação lexical funciona porque as duas strings são sempre
  // "AAAA-MM-01" — mesmo formato, mesmo tamanho.
  const podeAvancarMes = !travarEmHoje || mesExibido < `${hoje.slice(0, 7)}-01`;

  function escolherEFechar(dia: string) {
    onEscolher(dia);
    if (fecharAoEscolher) onFechar();
  }

  return (
    <FolhaInferior onFechar={onFechar}>
      <div className="flex items-center gap-8">
        <span className="flex-1 text-titulo-folha font-extrabold leading-[1.1] text-tinta">
          {titulo}
        </span>
        <button
          type="button"
          onClick={() => setMesExibido(deslocarMes(mesExibido, -1))}
          aria-label="Mês anterior"
          className="flex h-44 w-44 flex-none items-center justify-center rounded-pilula bg-separacao active:bg-principal-desabilitado"
        >
          <svg width={9} height={15} viewBox="0 0 8 14" fill="none" aria-hidden="true">
            <path
              d="M6.6 1.4 1.4 7l5.2 5.6"
              stroke="#141A17"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMesExibido(deslocarMes(mesExibido, 1))}
          disabled={!podeAvancarMes}
          aria-label="Mês seguinte"
          className="flex h-44 w-44 flex-none items-center justify-center rounded-pilula bg-separacao active:bg-principal-desabilitado disabled:text-tinta-desabilitada disabled:active:bg-separacao"
        >
          <svg width={9} height={15} viewBox="0 0 8 14" fill="none" aria-hidden="true">
            <path
              d="M1.4 1.4 6.6 7l-5.2 5.6"
              stroke="#141A17"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <span className="text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        {MESES[mes - 1]} de {ano}
      </span>

      <div className="grid grid-cols-7 gap-4">
        {DIAS_SEMANA.map((letra, i) => (
          <span
            key={i}
            className="flex h-24 items-center justify-center text-[10.5px] font-bold tracking-[.08em] text-tinta-fraca"
          >
            {letra}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
          <span key={`vazia-${i}`} className="h-48" />
        ))}
        {dias.map((dia) => {
          const diaStr = `${ano}-${mesPad}-${String(dia).padStart(2, "0")}`;
          const ehEscolhida = diaStr === escolhida;
          const ehHoje = !ehEscolhida && diaStr === hoje;
          const ehFuturo = travarEmHoje && diaStr > hoje;
          return (
            <button
              key={dia}
              type="button"
              onClick={() => escolherEFechar(diaStr)}
              disabled={ehFuturo}
              className={[
                "h-48 rounded-tecla text-[16px] leading-[1] [font-variant-numeric:tabular-nums]",
                ehFuturo
                  ? "bg-separacao text-tinta-desabilitada"
                  : ehEscolhida
                    ? "bg-acao font-bold text-white"
                    : ehHoje
                      ? "bg-pilula font-bold text-acao active:bg-pilula-pressionada"
                      : "bg-separacao font-semibold text-tinta active:bg-principal-desabilitado",
              ].join(" ")}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="flex gap-8">
        <button
          type="button"
          onClick={() => escolherEFechar(hoje)}
          className="h-38 rounded-pilula bg-pilula px-14 text-[12.5px] font-bold leading-[1] text-acao active:bg-pilula-pressionada"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => escolherEFechar(deslocarDias(hoje, -1))}
          className="h-38 rounded-pilula bg-pilula px-14 text-[12.5px] font-bold leading-[1] text-acao active:bg-pilula-pressionada"
        >
          Ontem
        </button>
        <button
          type="button"
          onClick={() => escolherEFechar(deslocarDias(hoje, 1))}
          disabled={travarEmHoje}
          className="h-38 rounded-pilula bg-pilula px-14 text-[12.5px] font-bold leading-[1] text-acao active:bg-pilula-pressionada disabled:bg-separacao disabled:text-tinta-desabilitada disabled:active:bg-separacao"
        >
          Amanhã
        </button>
      </div>
    </FolhaInferior>
  );
}
