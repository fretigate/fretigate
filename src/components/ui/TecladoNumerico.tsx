"use client";

import { formatarCentavos } from "@/lib/utils/dinheiro";

/**
 * Teclado numérico sobreposto — só para o campo Valor do Lançamento de frete
 * (`docs/componentes.md`, "Auditoria da regra de posição": exceção
 * documentada, salvar nunca fica coberto). Grade 3 colunas, tecla `52px`
 * raio `14px` (`docs/estilo.md` § Formas), fundo do painel `#F0EDE6`
 * (`docs/estilo.md`, cor "Separação... fundo do teclado numérico").
 *
 * Trabalha sempre em centavos inteiros (`CLAUDE.md` §7) — a vírgula da tecla
 * é só o desenho do protótipo de referência (`referencia/`), sem efeito: o
 * separador decimal já é implícito na conversão de centavos para reais.
 *
 * O cabeçalho mostra o valor sendo digitado, não um rótulo fixo: em telas de
 * celular este teclado cobre a tela quase inteira, incluindo o valor grande
 * do cabeçalho escuro que abriu ele — sem isto, quem digita não vê o que
 * está digitando (achado do fundador, `docs/diario.md`, 12–13/08/2026).
 */

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"] as const;

/** R$ 999.999,99 — teto generoso para frete de carga, sem risco de estouro. */
const TETO_CENTAVOS = 99_999_999;

type Props = {
  valorCentavos: number;
  onAlterar: (centavos: number) => void;
  onPronto: () => void;
  className?: string;
};

export function TecladoNumerico({ valorCentavos, onAlterar, onPronto, className }: Props) {
  function tocar(tecla: string) {
    if (tecla === ",") return;
    if (tecla === "⌫") {
      onAlterar(Math.floor(valorCentavos / 10));
      return;
    }
    const proximo = valorCentavos * 10 + Number(tecla);
    if (proximo <= TETO_CENTAVOS) onAlterar(proximo);
  }

  return (
    // Sem sombra — `docs/estilo.md` § Formas: "só existe em um lugar: o
    // aviso do sistema". Nenhum outro elemento tem sombra.
    <div className={["bg-separacao px-8 pt-10 pb-12", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between px-10 pb-10">
        <span className="text-nome-destaque font-extrabold tracking-[-0.015em] text-tinta [font-variant-numeric:tabular-nums]">
          R$ {formatarCentavos(valorCentavos)}
        </span>
        <button
          type="button"
          onClick={onPronto}
          className="h-44 px-6 text-[15px] font-bold leading-[1] text-acao active:text-acao-pressionada"
        >
          Pronto
        </button>
      </div>
      <div className="grid grid-cols-3 gap-8">
        {TECLAS.map((tecla) => (
          <button
            key={tecla}
            type="button"
            onClick={() => tocar(tecla)}
            aria-label={tecla === "⌫" ? "Apagar" : tecla}
            className="h-52 rounded-tecla bg-papel text-[26px] font-medium leading-[1] text-tinta active:bg-principal-desabilitado"
          >
            {tecla}
          </button>
        ))}
      </div>
    </div>
  );
}
