"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { FolhaDeBusca, type ItemFolhaDeBusca } from "@/components/ui/FolhaDeBusca";
import { FolhaDePeriodo, type JanelaEscolhida } from "@/components/ui/FolhaDePeriodo";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { deslocarDias } from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";

/**
 * "Despesas" (item 11) — `docs/componentes.md` linha 478 ("Despesas —
 * lista", deslocada em 13/09/2026 pela linha nova "Financeiro"): sem
 * principal, pílula de cabeçalho **+ Nova**, chips de Período e Categoria. Total no
 * topo (`docs/especificacao.md` §4.8). Mesmo esqueleto de `ListaFretes.tsx`
 * (busca ausente aqui, de propósito: nem `docs/especificacao.md` nem
 * `docs/componentes.md` pedem campo de busca nesta lista).
 *
 * **Só o chip Período dispara consulta nova ao servidor** — mesma decisão
 * de "Meus fretes" (item 4, Tarefa 2). **Categoria filtra o que já está
 * carregado, com itens construídos a partir das despesas do período** (não
 * uma lista fixa) — decisão do fundador, 01/09/2026 (`docs/planos/
 * item-11-despesas.md`, decisão 2 e o achado sobre a lista crescer):
 * `Despesa.categoria` é texto livre ("Outro" grava o que a pessoa digitou,
 * nunca a palavra "Outro"), então uma lista fixa de filtro perderia
 * categoria digitada; `FolhaDeBusca` já tem busca embutida, cobrindo o caso
 * de a lista de categorias crescer. Mesma técnica do chip "Cliente" em
 * `ListaFretes.tsx` (`clientesUnicos`).
 */

export type DespesaParaLista = {
  id: string;
  /** "AAAA-MM-DD" em Fortaleza — para agrupar por dia. */
  dia: string;
  categoria: string | null;
  valorCentavos: number;
  descricao: string | null;
  veiculoNome: string | null;
};

type Props = {
  despesas: DespesaParaLista[];
  hoje: string;
  janelaAtual: string | undefined;
  filtroDePeriodoAtivo: boolean;
  limitadoA50: boolean;
  rotuloPeriodo: string | null;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function rotuloDoGrupo(dia: string, hoje: string, ontem: string): string {
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  const anoHoje = Number(hoje.slice(0, 4));
  const sufixoAno = ano !== anoHoje ? ` de ${ano}` : "";
  return `${diaDoMes} de ${MESES[mes - 1]}${sufixoAno}`;
}

function nomeELinhaDeApoio(d: DespesaParaLista): { nome: string; apoio: string | undefined } {
  if (d.descricao) {
    return {
      nome: d.descricao,
      apoio: [d.categoria, d.veiculoNome].filter(Boolean).join(" · ") || undefined,
    };
  }
  return { nome: d.categoria ?? "Despesa", apoio: d.veiculoNome ?? undefined };
}

export function ListaDespesas({
  despesas,
  hoje,
  janelaAtual,
  filtroDePeriodoAtivo,
  limitadoA50,
  rotuloPeriodo,
}: Props) {
  const router = useRouter();
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | undefined>(undefined);
  const [folhaAberta, setFolhaAberta] = useState<"periodo" | "categoria" | null>(null);

  const categoriasUnicas = useMemo<ItemFolhaDeBusca[]>(() => {
    const vistas = new Set<string>();
    const itens: ItemFolhaDeBusca[] = [];
    for (const d of despesas) {
      if (d.categoria && !vistas.has(d.categoria)) {
        vistas.add(d.categoria);
        itens.push({ id: d.categoria, nome: d.categoria });
      }
    }
    return itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [despesas]);

  const filtradas = useMemo(
    () => despesas.filter((d) => !categoriaFiltro || d.categoria === categoriaFiltro),
    [despesas, categoriaFiltro],
  );

  // Já vem ordenado (data desc) do servidor — só agrupa em sequência, nunca
  // reordena (mesmo padrão de `ListaFretes.tsx`).
  const grupos = useMemo(() => {
    const resultado: { dia: string; itens: DespesaParaLista[] }[] = [];
    for (const d of filtradas) {
      const ultimo = resultado[resultado.length - 1];
      if (ultimo && ultimo.dia === d.dia) ultimo.itens.push(d);
      else resultado.push({ dia: d.dia, itens: [d] });
    }
    return resultado;
  }, [filtradas]);

  const valorTotal = filtradas.reduce((soma, d) => soma + d.valorCentavos, 0);

  function aplicarJanela(janela: JanelaEscolhida) {
    const parametros = new URLSearchParams();
    if (janela.tipo === "personalizado") {
      parametros.set("periodo", "personalizado");
      parametros.set("de", janela.de);
      parametros.set("ate", janela.ate);
    } else {
      parametros.set("periodo", janela.tipo);
    }
    setFolhaAberta(null);
    router.push(`/despesas?${parametros.toString()}`);
  }

  // Mesmo cuidado de `ListaFretes.tsx`: `despesas` já vem filtrada pelo
  // período no servidor — zero com período ativo não é "nunca lançou
  // despesa", é "nenhuma despesa neste período".
  if (despesas.length === 0 && !filtroDePeriodoAtivo) {
    return (
      <EstadoVazio
        titulo="Nenhuma despesa lançada"
        texto="O lucro aparece quando houver despesa lançada."
        acao={
          <Botao variante="principal" href="/despesas/nova">
            Lançar a primeira despesa
          </Botao>
        }
      />
    );
  }

  const ontem = deslocarDias(hoje, -1);

  return (
    <div className="flex flex-col gap-14">
      <div className="flex gap-8 overflow-x-auto">
        <ChipFiltro
          rotulo={rotuloPeriodo ?? "Período"}
          ativo={rotuloPeriodo !== null}
          onClick={() => setFolhaAberta("periodo")}
        />
        <ChipFiltro
          rotulo={categoriaFiltro ?? "Categoria"}
          ativo={categoriaFiltro !== undefined}
          onClick={() => setFolhaAberta("categoria")}
        />
      </div>

      <span className="text-total-contextual font-medium text-tinta-apoio">
        {limitadoA50 && !categoriaFiltro
          ? "50 mais recentes"
          : `${filtradas.length} ${filtradas.length === 1 ? "despesa" : "despesas"}`}{" "}
        · R$ {formatarCentavos(valorTotal)}
      </span>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-start gap-14 px-4 pt-30">
          <span className="text-apoio font-medium text-tinta-apoio-forte">
            Nenhuma despesa com esse filtro.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-20">
          {grupos.map((grupo) => (
            <div key={grupo.dia} className="flex flex-col gap-8">
              <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
                {rotuloDoGrupo(grupo.dia, hoje, ontem)}
              </span>
              <div className="flex flex-col gap-6">
                {grupo.itens.map((d) => {
                  const { nome, apoio } = nomeELinhaDeApoio(d);
                  return (
                    <LinhaDeLista
                      key={d.id}
                      href={`/despesas/${d.id}`}
                      nome={nome}
                      apoio={apoio}
                      valorCentavos={d.valorCentavos}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {folhaAberta === "periodo" ? (
        <FolhaDePeriodo
          hoje={hoje}
          janelaAtual={janelaAtual}
          rotuloTodos="Todas as despesas"
          onEscolher={aplicarJanela}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}

      {folhaAberta === "categoria" ? (
        <FolhaDeBusca
          titulo="Categoria"
          placeholder="Buscar categoria"
          itens={categoriasUnicas}
          onSelecionar={(id) => {
            setCategoriaFiltro(id);
            setFolhaAberta(null);
          }}
          onFechar={() => setFolhaAberta(null)}
        />
      ) : null}
    </div>
  );
}
