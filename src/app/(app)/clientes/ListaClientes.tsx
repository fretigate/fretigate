"use client";

import { useMemo, useState } from "react";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { FolhaDeOrdenacao, type CriterioDeOrdenacao } from "@/components/ui/FolhaDeOrdenacao";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { Botao } from "@/components/ui/Botao";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { iniciais } from "@/lib/utils/iniciais";
import { normalizarParaBusca } from "@/lib/utils/texto";

/**
 * Lista de clientes — filtra por nome/cidade **no cliente**, sem ida ao
 * servidor a cada tecla: o volume de clientes de uma transportadora pequena
 * (4 a 10 veículos, `CLAUDE.md` §1) não pede paginação nem busca no banco
 * aqui. A busca "enquanto digita" com ida ao banco é outra — a de município,
 * em `src/lib/servicos/municipios.ts`, dentro do lançamento de frete.
 *
 * **Ordenação (item 4, Tarefa 5):** só dois critérios, não três —
 * `docs/especificacao.md` §4.7, "no item 4, maior valor em aberto nasce sem
 * servir": depende de título em aberto, que só existe pago (item 6). Nesta
 * fatia, Clientes ordena por mais recente · maior valor total.
 */

type Cliente = {
  id: string;
  nome: string;
  cidade: string | null;
  /** Soma de `Servico.valor`, fretes cancelados fora (`valoresTotaisPorCliente`). */
  valorTotalCentavos: number;
};

type CriterioOrdenacao = "recente" | "valor";

const CRITERIOS: CriterioDeOrdenacao<CriterioOrdenacao>[] = [
  { valor: "recente", rotulo: "Mais recente" },
  { valor: "valor", rotulo: "Maior valor total" },
];

export function ListaClientes({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");
  const [criterio, setCriterio] = useState<CriterioOrdenacao>("recente");
  const [folhaAberta, setFolhaAberta] = useState(false);

  const filtrados = useMemo(() => {
    const termo = normalizarParaBusca(busca);
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        normalizarParaBusca(c.nome).includes(termo) ||
        normalizarParaBusca(c.cidade ?? "").includes(termo),
    );
  }, [busca, clientes]);

  // "recente" preserva a ordem que já vem do servidor (mais recém-cadastrado
  // primeiro) — sem reordenar. `sort` é estável: empate no critério de valor
  // preserva essa mesma ordem, sem precisar de desempate escrito à mão.
  const ordenados = useMemo(() => {
    if (criterio === "recente") return filtrados;
    return [...filtrados].sort((a, b) => b.valorTotalCentavos - a.valorTotalCentavos);
  }, [filtrados, criterio]);

  if (clientes.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum cliente cadastrado ainda."
        texto="Cadastre quem você já roda pra não digitar de novo em cada frete. Só o nome é obrigatório — o resto entra quando precisar."
        acao={
          <Botao variante="principal" href="/clientes/novo">
            Cadastrar cliente
          </Botao>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CampoBusca
        placeholder="Buscar cliente"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
      />

      <div className="flex gap-8 overflow-x-auto">
        <ChipFiltro
          rotulo={criterio === "recente" ? "Ordenar por" : "Maior valor total"}
          ativo={criterio !== "recente"}
          altura={48}
          onClick={() => setFolhaAberta(true)}
        />
      </div>

      <div className="flex flex-col gap-6">
        {ordenados.map((cliente) => (
          <LinhaDeLista
            key={cliente.id}
            href={`/clientes/${cliente.id}`}
            iniciais={iniciais(cliente.nome)}
            nome={cliente.nome}
            apoio={criterio === "valor" ? `R$ ${formatarCentavos(cliente.valorTotalCentavos)}` : (cliente.cidade ?? undefined)}
          />
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-start gap-14 px-4 pt-30">
          <span className="text-apoio font-medium text-tinta-apoio-forte">
            Nenhum cliente com esse nome.
          </span>
          <PilulaEmLinha href={`/clientes/novo?nome=${encodeURIComponent(busca.trim())}`}>
            Cadastrar &quot;{busca.trim()}&quot;
          </PilulaEmLinha>
        </div>
      ) : null}

      {folhaAberta ? (
        <FolhaDeOrdenacao
          criterios={CRITERIOS}
          atual={criterio}
          onEscolher={(escolhido) => {
            setCriterio(escolhido);
            setFolhaAberta(false);
          }}
          onFechar={() => setFolhaAberta(false)}
        />
      ) : null}
    </div>
  );
}
