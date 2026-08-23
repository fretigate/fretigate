"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { ChipFiltro } from "@/components/ui/ChipFiltro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { FolhaDeOrdenacao, type CriterioDeOrdenacao } from "@/components/ui/FolhaDeOrdenacao";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { PlacaBadge } from "@/components/ui/PlacaBadge";
import { Botao } from "@/components/ui/Botao";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { nomeCaminhao } from "@/lib/utils/caminhao";
import { normalizarParaBusca } from "@/lib/utils/texto";

/**
 * Lista de caminhões — mesmo padrão de busca de `ListaClientes.tsx` (tarefa
 * 5), mas **sem `LinhaDeLista`**: aquele componente exige um círculo de
 * iniciais, e a regra de iniciais (`docs/componentes.md` "Iniciais da
 * empresa") foi escrita para empresa e estendida a cliente por decisão
 * registrada — nunca a caminhão. "Scania branco" → "SB" não distingue nada, e
 * a placa em Azeret Mono já é o identificador reconhecível. Decisão do
 * fundador, revisão da tarefa 6: linha sem círculo por enquanto, com apelido
 * e placa. Lacuna registrada em `docs/diario.md` para o Design decidir entre
 * sem círculo ou ícone de caminhão igual para todos.
 *
 * **Ordenação (item 4, Tarefa 5):** três critérios completos desde já —
 * "mais fretes" e "maior valor transportado" vêm de `Servico`, não de
 * título em aberto, então não têm o mesmo problema de Clientes
 * (`docs/especificacao.md` §4.7).
 */

type Caminhao = {
  id: string;
  apelido: string | null;
  placa: string | null;
  tipo: string | null;
  /** `estatisticasPorCaminhao` — fretes cancelados fora. */
  fretes: number;
  valorTransportadoCentavos: number;
};

type CriterioOrdenacao = "recente" | "fretes" | "valor";

const CRITERIOS: CriterioDeOrdenacao<CriterioOrdenacao>[] = [
  { valor: "recente", rotulo: "Mais recente" },
  { valor: "fretes", rotulo: "Mais fretes" },
  { valor: "valor", rotulo: "Maior valor transportado" },
];

export function ListaCaminhoes({ caminhoes }: { caminhoes: Caminhao[] }) {
  const [busca, setBusca] = useState("");
  const [criterio, setCriterio] = useState<CriterioOrdenacao>("recente");
  const [folhaAberta, setFolhaAberta] = useState(false);

  const filtrados = useMemo(() => {
    const termo = normalizarParaBusca(busca);
    if (!termo) return caminhoes;
    return caminhoes.filter(
      (c) =>
        normalizarParaBusca(c.apelido ?? "").includes(termo) ||
        normalizarParaBusca(c.placa ?? "").includes(termo) ||
        normalizarParaBusca(c.tipo ?? "").includes(termo),
    );
  }, [busca, caminhoes]);

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

  if (caminhoes.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum caminhão cadastrado ainda."
        texto="Cadastre a frota pra escolher rápido na hora de lançar o frete. Apelido ou placa já bastam — o resto entra quando precisar."
        acao={
          <Botao variante="principal" href="/caminhoes/novo">
            Cadastrar caminhão
          </Botao>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CampoBusca
        placeholder="Buscar caminhão"
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
        {ordenados.map((caminhao) => {
          // Com "mais recente" escolhido, volta a mostrar `tipo` — os outros
          // dois critérios substituem esse espaço pelo próprio dado da
          // ordenação, mesma troca que Clientes já faz no `apoio`.
          const dadoDoCriterio =
            criterio === "fretes"
              ? `${caminhao.fretes} ${caminhao.fretes === 1 ? "frete" : "fretes"} no total`
              : criterio === "valor"
                ? `R$ ${formatarCentavos(caminhao.valorTransportadoCentavos)} no total`
                : caminhao.tipo;

          return (
            <Link
              key={caminhao.id}
              href={`/caminhoes/${caminhao.id}`}
              aria-label={nomeCaminhao(caminhao)}
              className="flex min-h-78 flex-col justify-center gap-6 rounded-linha bg-separacao px-18 py-14 text-left active:bg-principal-desabilitado"
            >
              {caminhao.apelido ? (
                <span className="truncate text-nome-linha font-bold text-tinta">{caminhao.apelido}</span>
              ) : null}
              <span className="flex items-center gap-8">
                {caminhao.placa ? <PlacaBadge placa={caminhao.placa} variante="clara" /> : null}
                {dadoDoCriterio ? (
                  <span className="truncate text-apoio font-medium text-tinta-apoio-forte">
                    {dadoDoCriterio}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-start gap-14 px-4 pt-30">
          <span className="text-apoio font-medium text-tinta-apoio-forte">
            Nenhum caminhão com esse nome.
          </span>
          <PilulaEmLinha href={`/caminhoes/novo?apelido=${encodeURIComponent(busca.trim())}`}>
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
