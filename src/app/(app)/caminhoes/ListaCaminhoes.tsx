"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { PlacaBadge } from "@/components/ui/PlacaBadge";
import { Botao } from "@/components/ui/Botao";
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
 */

type Caminhao = {
  id: string;
  apelido: string | null;
  placa: string | null;
  tipo: string | null;
};

export function ListaCaminhoes({ caminhoes }: { caminhoes: Caminhao[] }) {
  const [busca, setBusca] = useState("");

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
    <div className="flex flex-col gap-6">
      <CampoBusca
        placeholder="Buscar caminhão"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        className="mb-8"
      />

      {filtrados.map((caminhao) => (
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
            {caminhao.tipo ? (
              <span className="truncate text-apoio font-medium text-tinta-apoio-forte">
                {caminhao.tipo}
              </span>
            ) : null}
          </span>
        </Link>
      ))}

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
    </div>
  );
}
