import { LinhaDeLista } from "./LinhaDeLista";
import { diaEmFortaleza } from "@/lib/utils/data-fortaleza";
import { formatarDataCurta } from "@/lib/utils/periodo";
import { formatarRota } from "@/lib/utils/rota";
import type { SituacaoFinanceira } from "@/lib/servicos/titulos";

/**
 * Histórico dos três perfis (Tarefa 6, item 4) — único componente,
 * reaproveitado por Cliente/Caminhão/Motorista (`CLAUDE.md` §8):
 * `listarServicosDoCliente/DoCaminhao/DoMotorista` (`titulos.ts`) devolvem o
 * mesmo formato para os três, já filtrado pelo período do resumo.
 *
 * **Data como `nome` (âncora), rota como `apoio`** — decisão do fundador,
 * segundo `/revisar` da Tarefa 6 (22/08/2026), sem padrão documentado para
 * este caso: o cliente/caminhão/motorista já é o contexto da tela inteira,
 * então não sobra "nome de identidade" por linha — o que se procura num
 * histórico é "quando foi", não "de quem". `docs/estilo.md` também classifica
 * rota como Secundário ("contexto do dado"), nunca Primário; a leitura
 * anterior (rota em `nome`, tratamento Primário) contrariava isso. Mesmo
 * padrão de "Meus fretes" para `apoio` — `?? undefined`, sem travessão: o
 * slot já é opcional, então uma rota ausente só deixa o espaço em branco.
 *
 * **Sem pílula "Ver todos" nesta fatia** — decisão do fundador, planejamento
 * da Tarefa 6, 22/08/2026 (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
 * "O que precisa chegar ao Design"): ela só levaria a algo de verdade no
 * perfil do cliente ("Meus fretes" filtrado por cliente já existe);
 * caminhão e motorista não têm filtro equivalente ainda, e nascer só num
 * dos três ensina uma affordance que não existe nos outros dois. Quando
 * `total` (já filtrado pelo período) for maior que as linhas mostradas,
 * uma nota de texto sem toque evita que a tela pareça mostrar o histórico
 * completo daquele período.
 *
 * **Dois vazios, dois textos** — decisão do fundador, mesmo achado: "nenhum
 * frete lançado ainda" (o cadastro nunca teve frete nenhum) é uma situação
 * diferente de "nenhum frete neste período" (tem histórico, só não neste
 * recorte) — `totalGeral` (sem filtro de período) é o que distingue os
 * dois.
 */

export type ServicoDoHistorico = {
  id: string;
  origem_texto: string | null;
  destino_texto: string | null;
  valor: number;
  situacao_financeira: SituacaoFinanceira;
  data_servico: Date;
};

type Props = {
  servicos: ServicoDoHistorico[];
  /** Total já filtrado pelo período — usado pela nota "Mostrando N de M". */
  total: number;
  /** Total sem filtro de período — só para escolher o texto do vazio. */
  totalGeral: number;
};

export function HistoricoDoPerfil({ servicos, total, totalGeral }: Props) {
  return (
    <div className="flex flex-col gap-6 pt-26">
      <span className="px-4 text-eyebrow font-bold uppercase tracking-[.16em] text-tinta-apoio">
        Histórico
      </span>
      {servicos.length === 0 ? (
        <span className="px-4 text-apoio font-medium text-tinta-apoio-forte">
          {totalGeral === 0 ? "Nenhum frete lançado ainda." : "Nenhum frete neste período."}
        </span>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {servicos.map((servico) => (
              <LinhaDeLista
                key={servico.id}
                href={`/fretes/${servico.id}`}
                nome={formatarDataCurta(diaEmFortaleza(servico.data_servico))}
                apoio={formatarRota(servico.origem_texto, servico.destino_texto) ?? undefined}
                valorCentavos={servico.valor}
                situacao={servico.situacao_financeira}
              />
            ))}
          </div>
          {total > servicos.length ? (
            <span className="px-4 text-total-contextual font-medium text-tinta-apoio">
              Mostrando os {servicos.length} mais recentes de {total}.
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
