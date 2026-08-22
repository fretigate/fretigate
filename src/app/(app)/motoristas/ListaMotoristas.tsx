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
 * Lista de motoristas — mesmo padrão de busca de `ListaClientes.tsx` (tarefa
 * 5). O círculo de iniciais usa a regra de empresa (decisão do fundador,
 * tarefa 7): as duas regras dão o mesmo resultado para nome de pessoa, e a
 * regra de pessoa reservada a `Usuario` ainda não existe em código
 * (`src/lib/utils/iniciais.ts`).
 *
 * **Ordenação (item 4, Tarefa 5):** três critérios completos desde já —
 * mesma razão de `ListaCaminhoes.tsx`, "mais fretes"/"maior valor
 * transportado" vêm de `Servico`, sem depender de título em aberto.
 */

type Motorista = {
  id: string;
  nome: string;
  veiculoHabitual: string | null;
  /** `estatisticasPorMotorista` — fretes cancelados fora. */
  fretes: number;
  valorTransportadoCentavos: number;
};

type CriterioOrdenacao = "recente" | "fretes" | "valor";

const CRITERIOS: CriterioDeOrdenacao<CriterioOrdenacao>[] = [
  { valor: "recente", rotulo: "Mais recente" },
  { valor: "fretes", rotulo: "Mais fretes" },
  { valor: "valor", rotulo: "Maior valor transportado" },
];

export function ListaMotoristas({ motoristas }: { motoristas: Motorista[] }) {
  const [busca, setBusca] = useState("");
  const [criterio, setCriterio] = useState<CriterioOrdenacao>("recente");
  const [folhaAberta, setFolhaAberta] = useState(false);

  const filtrados = useMemo(() => {
    const termo = normalizarParaBusca(busca);
    if (!termo) return motoristas;
    return motoristas.filter(
      (m) =>
        normalizarParaBusca(m.nome).includes(termo) ||
        normalizarParaBusca(m.veiculoHabitual ?? "").includes(termo),
    );
  }, [busca, motoristas]);

  // "recente" preserva a ordem do servidor — sem reordenar. `sort` estável:
  // empate preserva essa ordem, sem desempate escrito à mão.
  const ordenados = useMemo(() => {
    if (criterio === "recente") return filtrados;
    if (criterio === "fretes") return [...filtrados].sort((a, b) => b.fretes - a.fretes);
    return [...filtrados].sort(
      (a, b) => b.valorTransportadoCentavos - a.valorTransportadoCentavos,
    );
  }, [filtrados, criterio]);

  const rotuloCriterioAtivo =
    criterio === "fretes"
      ? "Mais fretes"
      : criterio === "valor"
        ? "Maior valor transportado"
        : "Ordenar por";

  if (motoristas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum motorista cadastrado ainda."
        texto="Cadastre quem dirige pra escolher rápido na hora de lançar o frete. Só o nome é obrigatório — o resto entra quando precisar."
        acao={
          <Botao variante="principal" href="/motoristas/novo">
            Cadastrar motorista
          </Botao>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CampoBusca
        placeholder="Buscar motorista"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
      />

      <div className="flex gap-8 overflow-x-auto">
        <ChipFiltro
          rotulo={rotuloCriterioAtivo}
          ativo={criterio !== "recente"}
          altura={48}
          onClick={() => setFolhaAberta(true)}
        />
      </div>

      <div className="flex flex-col gap-6">
        {ordenados.map((motorista) => {
          const dadoDoCriterio =
            criterio === "fretes"
              ? `${motorista.fretes} ${motorista.fretes === 1 ? "frete" : "fretes"}`
              : criterio === "valor"
                ? `R$ ${formatarCentavos(motorista.valorTransportadoCentavos)}`
                : (motorista.veiculoHabitual ?? undefined);

          return (
            <LinhaDeLista
              key={motorista.id}
              href={`/motoristas/${motorista.id}`}
              iniciais={iniciais(motorista.nome)}
              nome={motorista.nome}
              apoio={dadoDoCriterio}
            />
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-start gap-14 px-4 pt-30">
          <span className="text-apoio font-medium text-tinta-apoio-forte">
            Nenhum motorista com esse nome.
          </span>
          <PilulaEmLinha href={`/motoristas/novo?nome=${encodeURIComponent(busca.trim())}`}>
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
