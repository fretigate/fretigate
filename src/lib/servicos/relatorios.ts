import { uuidv7 } from "uuidv7";
import { db, emTransacao } from "@/lib/db";
import { buscarCliente } from "@/lib/servicos/clientes";

/**
 * Relatorio (item 7, Tarefa 1 — `docs/planos/item-7-relatorio.md`,
 * "Fundamentos: a entidade Relatorio e o que ela amarra"): a entidade, o
 * contador atômico de `numero`, o retrato congelado de cada frete incluído
 * e as duas conferências de FK contra a empresa (`cliente_id`, e cada
 * `servico_id` de `RelatorioServico`) — tudo por
 * `db(empresaId)`/`emTransacao(empresaId)`, a única porta de acesso a dados
 * (`CLAUDE.md` §3).
 *
 * A montagem (Tarefa 3), o gerador de PDF (Tarefa 2) e `gerarRelatorio` — a
 * ação completa, que também cria título quando "Gerar cobrança" está ativo e
 * grava `pdf_url` (Tarefa 4) — vêm depois. `criarRelatorio` é a fundação que
 * essas tarefas usam: grava a entidade e o que ela amarra, nada mais.
 */

const CAMPOS = {
  id: true,
  numero: true,
  cliente_id: true,
  data_inicial: true,
  data_final: true,
  valor_total: true,
  gerou_cobranca: true,
  gerado_em: true,
  pdf_url: true,
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * A conferência de FK para `relatorio_id` (`CLAUDE.md` §3 — o Postgres não
 * aplica RLS na checagem de chave estrangeira). Devolve `null` para
 * relatório de outra empresa, do mesmo jeito que `buscarServico`/
 * `buscarTituloReceber`. **Requisito para quem construir `gerarRelatorio`
 * (Tarefa 4)**: usar isto antes de gravar `titulo_receber.relatorio_id` —
 * hoje nenhum caminho grava esse campo, então a conferência ainda não tem
 * chamador, só a garantia testada de que ela recusa direito.
 */
export function buscarRelatorio(empresaId: string, id: string) {
  return db(empresaId).relatorio.findUnique({ where: { id }, select: CAMPOS });
}

export type DadosRelatorio = {
  clienteId: string;
  dataInicial: Date;
  dataFinal: Date;
  servicoIds: string[];
};

/**
 * Cria o `Relatorio` e as linhas de `RelatorioServico` que amarram os fretes
 * incluídos — dentro de uma transação, com o mesmo contador atômico de
 * `criarServico` (`Empresa.proximo_numero_relatorio`, nunca `MAX(numero)+1`).
 *
 * **A função recusa, nunca confia em quem chama** (decisão do fundador,
 * 28/08/2026 — `criarRelatorio` grava dinheiro, e o `CLAUDE.md` §3 já
 * estabeleceu que a proteção mora onde a gravação acontece, não em quem
 * chama; a tela de montagem, Tarefa 3, não será o único chamador — itens 9 e
 * 15 podem gerar relatório por outro caminho). Um frete só entra se:
 *
 *   - pertencer à empresa (`CLAUDE.md` §3, conferência de FK);
 *   - pertencer ao `clienteId` informado;
 *   - não estiver `cancelado` — mesmo motivo de toda soma derivada desde o
 *     item 4 (`docs/especificacao.md` §7: "a razão é 'não vai acontecer'").
 *     `em_andamento` **passa** — a montagem (Tarefa 3) decide se ele soma
 *     sem virar cobrança, isto aqui só filtra o que nunca deveria aparecer
 *     em documento nenhum;
 *   - não estiver arquivado;
 *   - tiver `data_servico` dentro de `[dataInicial, dataFinal]`.
 *
 * Além disso, `servicoIds` não pode ser vazio (documento sem frete não faz
 * sentido) e `dataFinal` não pode ser anterior a `dataInicial`.
 *
 * **`valor_total` é sempre recalculado a partir dos próprios `Servico`
 * encontrados, nunca recebido de input** — mesmo princípio de `criado_por_
 * usuario_id` nunca vir do formulário: quem decide quanto o documento vale
 * é o banco, não o que o cliente HTTP alega.
 *
 * **Retrato congelado** (`docs/especificacao.md` §4.4/§8 regra 6, decisão do
 * fundador, 28/08/2026): cada `RelatorioServico` grava uma cópia de tudo que
 * o documento A4 exibe daquele frete — data, rota, carga, valor — no
 * instante da criação. `Servico` continua editável depois (enquanto não
 * tiver título ativo, `docs/especificacao.md` §8 regra 12); o relatório já
 * gerado nunca muda de conteúdo por baixo do cliente que o recebeu. O
 * vínculo com `servico_id` permanece, para comparar com o dado ao vivo ou
 * resolver "Ver relatório" a partir do frete.
 */
export async function criarRelatorio(empresaId: string, dados: DadosRelatorio) {
  if (dados.servicoIds.length === 0) throw new Error("Selecione ao menos um frete.");
  if (dados.dataFinal < dados.dataInicial) throw new Error("Período inválido.");

  const cliente = await buscarCliente(empresaId, dados.clienteId);
  if (!cliente) throw new Error("Selecione um cliente válido.");

  const servicos = await db(empresaId).servico.findMany({
    where: { id: { in: dados.servicoIds } },
    select: {
      id: true,
      valor: true,
      data_servico: true,
      origem_texto: true,
      destino_texto: true,
      carga_texto: true,
      cliente_id: true,
      status_operacional: true,
      arquivado_em: true,
    },
  });

  const pertenceAoRelatorio = (s: (typeof servicos)[number]) =>
    s.cliente_id === dados.clienteId &&
    s.status_operacional !== "cancelado" &&
    s.arquivado_em === null &&
    s.data_servico >= dados.dataInicial &&
    s.data_servico <= dados.dataFinal;

  if (servicos.length !== dados.servicoIds.length || !servicos.every(pertenceAoRelatorio)) {
    throw new Error("Um ou mais fretes não pertencem a este relatório.");
  }

  const valorTotal = servicos.reduce((soma, s) => soma + s.valor, 0);

  return emTransacao(empresaId, async (tx) => {
    const empresaAtualizada = await tx.empresa.update({
      where: { id: empresaId },
      data: { proximo_numero_relatorio: { increment: 1 } },
      select: { proximo_numero_relatorio: true },
    });
    const numero = empresaAtualizada.proximo_numero_relatorio - 1;

    return tx.relatorio.create({
      data: {
        numero,
        cliente_id: dados.clienteId,
        data_inicial: dados.dataInicial,
        data_final: dados.dataFinal,
        valor_total: valorTotal,
        gerado_em: new Date(),
        empresa_id: empresaId,
        servicos: {
          create: servicos.map((s) => ({
            id: uuidv7(),
            servico_id: s.id,
            empresa_id: empresaId,
            data_servico: s.data_servico,
            origem_texto: s.origem_texto,
            destino_texto: s.destino_texto,
            carga_texto: s.carga_texto,
            valor: s.valor,
          })),
        },
      },
      select: CAMPOS,
    });
  });
}
