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
 * **Ordenação:** três critérios — mais recente · maior valor em aberto ·
 * maior valor total (`docs/especificacao.md` §4.7). "Maior valor em aberto"
 * ficou de fora até a Tarefa 5 do item 4 ("nasce sem servir": depende de
 * título em aberto, que só existia pago) — passou a valer de verdade na
 * Tarefa 7 do item 6, quando título aberto nasceu de verdade (faturar
 * frete). Mesmo padrão de três critérios que Caminhões já usa.
 *
 * **"no total" no apoio, não só "R$ X"** — achado na verificação da Tarefa
 * 6 (planejamento, 22/08/2026): o mesmo cliente mostra `valorTotalCentavos`
 * aqui (vida inteira) e "Já rodado" no perfil (por período, mês corrente
 * por padrão) — dois recortes diferentes do mesmo conceito, mesmo formato
 * `R$ X`. Testado com dado plantado (R$ 1.000 este mês + R$ 5.000 no mês
 * passado): a lista mostrava "R$ 6.000,00" sem nada dizendo "total", o
 * perfil mostrava "R$ 1.000,00" ao lado do chip "Este mês" — o chip sozinho
 * não bastava para quem olhasse só a lista primeiro. O qualificador aqui
 * resolve sem precisar que o perfil carregue o peso todo da explicação.
 *
 * **"Em aberto" NÃO leva "no total"** (Tarefa 7 do item 6, 27/08/2026,
 * decisão do fundador) — o qualificador acima existe para distinguir dois
 * recortes do MESMO conceito (vida inteira × período). "Valor em aberto" só
 * tem um recorte em todo o produto: situação atual, sempre, tanto aqui
 * quanto no perfil (`resumoFinanceiroDoCliente.aReceber`) — não existe o
 * outro recorte para confundir, então não existe qualificador para
 * escrever. Se um dia "valor em aberto" ganhar uma versão por período, esta
 * decisão se reabre — não se herda por analogia.
 */

type Cliente = {
  id: string;
  nome: string;
  cidade: string | null;
  /** Soma de `Servico.valor`, fretes cancelados fora (`valoresTotaisPorCliente`). */
  valorTotalCentavos: number;
  /** Saldo em aberto, situação atual (`valorEmAbertoPorCliente`). */
  valorEmAbertoCentavos: number;
};

type CriterioOrdenacao = "recente" | "aberto" | "valor";

const CRITERIOS: CriterioDeOrdenacao<CriterioOrdenacao>[] = [
  { valor: "recente", rotulo: "Mais recente" },
  { valor: "aberto", rotulo: "Maior valor em aberto" },
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
    if (criterio === "aberto") {
      return [...filtrados].sort((a, b) => b.valorEmAbertoCentavos - a.valorEmAbertoCentavos);
    }
    return [...filtrados].sort((a, b) => b.valorTotalCentavos - a.valorTotalCentavos);
  }, [filtrados, criterio]);

  const rotuloCriterioAtivo =
    criterio === "aberto"
      ? "Maior valor em aberto"
      : criterio === "valor"
        ? "Maior valor total"
        : "Ordenar por";

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
          rotulo={rotuloCriterioAtivo}
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
            apoio={
              criterio === "valor"
                ? `R$ ${formatarCentavos(cliente.valorTotalCentavos)} no total`
                : criterio === "aberto"
                  ? `R$ ${formatarCentavos(cliente.valorEmAbertoCentavos)} em aberto`
                  : (cliente.cidade ?? undefined)
            }
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
