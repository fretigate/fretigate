"use client";

import { useMemo, useState } from "react";
import { CampoBusca } from "@/components/ui/CampoBusca";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { LinhaDeLista } from "@/components/ui/LinhaDeLista";
import { PilulaEmLinha } from "@/components/ui/PilulaEmLinha";
import { Botao } from "@/components/ui/Botao";
import { iniciaisEmpresa } from "@/lib/utils/iniciais";
import { normalizarParaBusca } from "@/lib/utils/texto";

/**
 * Lista de clientes — filtra por nome/cidade **no cliente**, sem ida ao
 * servidor a cada tecla: o volume de clientes de uma transportadora pequena
 * (4 a 10 veículos, `CLAUDE.md` §1) não pede paginação nem busca no banco
 * aqui. A busca "enquanto digita" com ida ao banco é outra — a de município,
 * em `src/lib/servicos/municipios.ts`, dentro do lançamento de frete.
 */

type Cliente = {
  id: string;
  nome: string;
  cidade: string | null;
};

export function ListaClientes({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = normalizarParaBusca(busca);
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        normalizarParaBusca(c.nome).includes(termo) ||
        normalizarParaBusca(c.cidade ?? "").includes(termo),
    );
  }, [busca, clientes]);

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
    <div className="flex flex-col gap-6">
      <CampoBusca
        placeholder="Buscar cliente"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        className="mb-8"
      />

      {filtrados.map((cliente) => (
        <LinhaDeLista
          key={cliente.id}
          href={`/clientes/${cliente.id}`}
          iniciais={iniciaisEmpresa(cliente.nome)}
          nome={cliente.nome}
          apoio={cliente.cidade ?? undefined}
        />
      ))}

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
    </div>
  );
}
