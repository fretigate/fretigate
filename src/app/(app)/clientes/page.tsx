import Link from "next/link";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarClientes } from "@/lib/servicos/clientes";
import { valoresTotaisPorCliente } from "@/lib/servicos/servicos";
import { PilulaCabecalho } from "@/components/ui/PilulaCabecalho";
import { ListaClientes } from "./ListaClientes";

/**
 * Clientes — lista. `docs/navegacao.md` linha 38: chega de Mais, a linha
 * leva ao perfil, "+ Novo" leva ao cadastro. Tela de nível 2 (reaproveita o
 * ícone `voltar.svg` do topo — `docs/componentes.md` § 09).
 *
 * `valoresTotaisPorCliente` busca em paralelo com `listarClientes` (item 4,
 * Tarefa 5) — nunca em sequência, mesmo padrão já usado para
 * `resumoDoCaminhao`/`historicoPorEntidade`.
 */
export default async function Pagina() {
  const sessao = await exigirSessao();
  const [clientes, valoresTotais] = await Promise.all([
    listarClientes(sessao.empresaId),
    valoresTotaisPorCliente(sessao.empresaId),
  ]);

  return (
    <main
      className="mx-auto flex min-h-full max-w-[480px] flex-col"
      style={{ paddingBottom: "var(--folga-rolagem)" }}
    >
      <div
        className="flex items-center gap-10 px-20 pb-14"
        style={{ paddingTop: "var(--area-segura-topo)" }}
      >
        <Link
          href="/mais"
          aria-label="Voltar"
          className="-ml-10 flex h-44 w-44 flex-none items-center justify-center"
        >
          <svg width={12} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15.6 4.35 8.4 12l7.2 7.65"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <span
          className="min-w-0 flex-1 text-titulo-tela font-bold tracking-[-0.01em] text-tinta-apoio-forte"
          style={{ fontVariationSettings: "'wdth' 96" }}
        >
          Clientes
        </span>
        {/* Some quando a lista está totalmente vazia: o estado vazio já tem
            o seu próprio principal "Cadastrar cliente" — duas ações com o
            mesmo destino ao mesmo tempo repete a regra "uma ação, um nome"
            (`CLAUDE.md` §8). Mesma condição do protótipo de referência
            (`temNovoHeader: !contaVazia`). */}
        {clientes.length > 0 ? (
          <PilulaCabecalho href="/clientes/novo">+ Novo</PilulaCabecalho>
        ) : null}
      </div>

      <div className="px-16">
        <ListaClientes
          clientes={clientes.map((c) => ({
            id: c.id,
            nome: c.nome,
            cidade: c.municipio ? `${c.municipio.nome}/${c.municipio.uf}` : null,
            valorTotalCentavos: valoresTotais.get(c.id) ?? 0,
          }))}
        />
      </div>
    </main>
  );
}
