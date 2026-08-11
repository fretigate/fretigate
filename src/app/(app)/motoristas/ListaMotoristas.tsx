"use client";

import { useMemo, useState } from "react";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { Botao } from "@/components/ui/Botao";
import { iniciais } from "@/lib/utils/iniciais";
import { normalizarParaBusca } from "@/lib/utils/texto";

/**
 * Lista de motoristas — mesmo padrão de busca de `ListaClientes.tsx` (tarefa
 * 5). O círculo de iniciais usa a regra de empresa (decisão do fundador,
 * tarefa 7): as duas regras dão o mesmo resultado para nome de pessoa, e a
 * regra de pessoa reservada a `Usuario` ainda não existe em código
 * (`src/lib/utils/iniciais.ts`).
 */

type Motorista = {
  id: string;
  nome: string;
  veiculoHabitual: string | null;
};

export function ListaMotoristas({ motoristas }: { motoristas: Motorista[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = normalizarParaBusca(busca);
    if (!termo) return motoristas;
    return motoristas.filter(
      (m) =>
        normalizarParaBusca(m.nome).includes(termo) ||
        normalizarParaBusca(m.veiculoHabitual ?? "").includes(termo),
    );
  }, [busca, motoristas]);

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
    <div className="flex flex-col gap-6">
      <CampoBusca
        placeholder="Buscar motorista"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        className="mb-8"
      />

      {filtrados.map((motorista) => (
        <LinhaDeLista
          key={motorista.id}
          href={`/motoristas/${motorista.id}`}
          iniciais={iniciais(motorista.nome)}
          nome={motorista.nome}
          apoio={motorista.veiculoHabitual ?? undefined}
        />
      ))}

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
    </div>
  );
}
