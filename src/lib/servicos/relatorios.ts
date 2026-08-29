import { uuidv7 } from "uuidv7";
import { db, emTransacao } from "@/lib/db";
import type { FormaPagamentoPrevista } from "@/lib/generated/prisma/client";
import { buscarCliente } from "@/lib/servicos/clientes";
import { faturarServico } from "@/lib/servicos/titulos";
import { gerarDocumento } from "@/lib/documentos/gerador";
import { assinarUrlRelatorio } from "@/lib/documentos/armazenamento";
import {
  diaEmFortaleza,
  formatarDataNumerica,
  formatarDataPorExtenso,
  formatarPeriodoDoDocumento,
} from "@/lib/utils/data-fortaleza";
import { formatarCentavos } from "@/lib/utils/dinheiro";
import { formatarDocumento, tipoDocumento } from "@/lib/utils/documento";
import { formatarRota } from "@/lib/utils/rota";

/**
 * Relatorio (item 7, Tarefa 1 — `docs/planos/item-7-relatorio.md`,
 * "Fundamentos: a entidade Relatorio e o que ela amarra"): a entidade, o
 * contador atômico de `numero`, o retrato congelado de cada frete incluído
 * e as duas conferências de FK contra a empresa (`cliente_id`, e cada
 * `servico_id` de `RelatorioServico`) — tudo por
 * `db(empresaId)`/`emTransacao(empresaId)`, a única porta de acesso a dados
 * (`CLAUDE.md` §3).
 *
 * `criarRelatorio` é a fundação da Tarefa 3 (fundida com a antiga Tarefa 4,
 * decisão do fundador, 28/08/2026): grava a entidade e o que ela amarra,
 * nada mais. O gerador de PDF (Tarefa 2) e `gerarRelatorio` — a ação
 * completa, que também cria título quando "Gerar cobrança" está ativo e
 * grava `pdf_url` — estão mais abaixo, neste mesmo arquivo. A tela de
 * montagem (a última peça da Tarefa 3) ainda não existe.
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
 * `buscarTituloReceber`. `gerarRelatorio` (abaixo) usa isto antes de gravar
 * `titulo_receber.relatorio_id` — e `faturarServico` (`titulos.ts`) confere
 * de novo, direto por `db(empresaId)`, sem importar esta função: importar
 * criaria um ciclo (`relatorios.ts` já importa `faturarServico` de lá).
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

/** "0142" — o número do documento (`docs/estilo.md` § Impresso, "Nº {numero}"), sempre 4 dígitos. */
export function formatarNumeroRelatorio(numero: number): string {
  return numero.toString().padStart(4, "0");
}

export type ServicoParaRelatorio = {
  id: string;
  dataServico: Date;
  origemTexto: string | null;
  destinoTexto: string | null;
  cargaTexto: string | null;
  valor: number;
  statusOperacional: "em_andamento" | "finalizado" | "cancelado";
};

/**
 * Fretes elegíveis para relatório de um cliente num período — a prévia da
 * montagem (Tarefa 3) usa esta lista para o que aparece na tela, antes de
 * qualquer coisa ser criada.
 *
 * **O mesmo filtro de `criarRelatorio`** (acima) — cancelado nunca entra,
 * arquivado nunca entra, só do cliente e do período — só que aqui como
 * consulta direta, não como validação de uma lista de ids já escolhida.
 * Duplicado de propósito, não reaproveitado: `criarRelatorio` já está
 * testado e comitado (Tarefa 1), e `CLAUDE.md` §2 pede não refatorar o que
 * não faz parte da tarefa. **Se a regra de elegibilidade mudar, os dois
 * lugares precisam mudar juntos** — registrado aqui para não passar
 * despercebido, mesma classe de risco que o `CLAUDE.md` já nomeia para
 * texto duplicado.
 *
 * `em_andamento` entra na lista — a decisão "somar é diferente de cobrar"
 * (`docs/planos/item-7-relatorio.md`) é da montagem/`gerarRelatorio`
 * (abaixo), não deste filtro: aqui só decide o que nunca deveria aparecer em
 * documento nenhum.
 */
export async function listarServicosParaRelatorio(
  empresaId: string,
  clienteId: string,
  periodo: { inicio: Date; fim: Date },
): Promise<ServicoParaRelatorio[]> {
  const servicos = await db(empresaId).servico.findMany({
    where: {
      cliente_id: clienteId,
      status_operacional: { not: "cancelado" },
      arquivado_em: null,
      data_servico: { gte: periodo.inicio, lte: periodo.fim },
    },
    select: {
      id: true,
      data_servico: true,
      origem_texto: true,
      destino_texto: true,
      carga_texto: true,
      valor: true,
      status_operacional: true,
    },
    orderBy: { data_servico: "asc" },
  });

  return servicos.map((s) => ({
    id: s.id,
    dataServico: s.data_servico,
    origemTexto: s.origem_texto,
    destinoTexto: s.destino_texto,
    cargaTexto: s.carga_texto,
    valor: s.valor,
    statusOperacional: s.status_operacional,
  }));
}

/**
 * URL assinada para LER o PDF do relatório (item 7, Tarefa 3 — movida da
 * Tarefa 2 de propósito: só aqui existe pela primeira vez quem precisa ler,
 * a tela "Documento A4"). Mesmo padrão de `gerarUrlComprovante`
 * (`src/lib/servicos/comprovantes.ts`, item 5 Tarefa 4): confere posse
 * (`buscarRelatorio`) antes de assinar — nunca confia em quem chama
 * (`CLAUDE.md` §3). Diferente de `gerarUrlComprovante` (que devolve `null`
 * numa falha, porque é só uma miniatura opcional), esta função lança: aqui a
 * leitura É o conteúdo da tela, não um detalhe que pode faltar em silêncio.
 */
export async function gerarUrlRelatorio(empresaId: string, relatorioId: string): Promise<string> {
  const relatorio = await buscarRelatorio(empresaId, relatorioId);
  if (!relatorio) throw new Error("Relatório não encontrado.");
  if (!relatorio.pdf_url) throw new Error("Este relatório ainda não tem documento gerado.");

  const url = await assinarUrlRelatorio(relatorio.pdf_url);
  if (!url) throw new Error("Não deu para abrir o relatório agora.");
  return url;
}

function diaCurtoDoDocumento(instante: Date): string {
  const [, mes, diaDoMes] = diaEmFortaleza(instante).split("-");
  return `${diaDoMes}/${mes}`;
}

export type DadosGerarRelatorio = {
  clienteId: string;
  dataInicial: Date;
  dataFinal: Date;
  servicoIds: string[];
  gerarCobranca: boolean;
  /** Obrigatório quando `gerarCobranca` é `true`. */
  vencimento?: Date;
  /** Obrigatório quando `gerarCobranca` é `true`. */
  formaPrevista?: FormaPagamentoPrevista;
};

/**
 * A ação completa de "Gerar relatório" (item 7, Tarefa 3 — `docs/planos/
 * item-7-relatorio.md`, "A ação de gerar"). Em ordem:
 *
 * 1. `criarRelatorio` (Tarefa 1, acima) — cria `Relatorio` + `RelatorioServico`,
 *    numeração sequencial, retrato congelado. Transação própria e curta.
 * 2. Se `gerarCobranca`: um `TituloReceber` por frete `finalizado` incluído,
 *    via `faturarServico` (reaproveitado — "sem alterar sua forma, só
 *    passando o `relatorio_id` junto"). `em_andamento` nunca vira título —
 *    filtrado aqui, não em `faturarServico`, que não sabe nada de relatório
 *    (decisão do fundador, "somar é diferente de cobrar"). Um frete já
 *    faturado fora deste relatório (índice único de `faturarServico`) é
 *    pulado, não interrompe o resto — "detalhe menor, mecânico, não
 *    política", já registrado como decisão de construção no plano.
 * 3. Monta o HTML e gera o PDF (`gerarDocumento`, Tarefa 2), grava
 *    `pdf_url`.
 *
 * **`gerou_cobranca` e o bloco de cobrança do documento seguem
 * `algumTituloCriado`, nunca `dados.gerarCobranca` sozinho** — achado do
 * segundo `/revisar`, decisão do fundador, 28/08/2026: se todo frete
 * `finalizado` incluído já estava faturado fora deste relatório (passo 2
 * pula todos), gravar `true` e imprimir vencimento/Pix cobraria, em papel,
 * um valor sem título nascido desta geração — e o vencimento impresso
 * poderia discordar do vencimento real do título antigo. Isso é diferente
 * de `em_andamento`: aquele soma no total do documento por desenho (§4.4);
 * este é o caso em que a cobrança pedida não produziu nada novo.
 *
 * **Não é uma única transação de banco cobrindo os três passos** — decisão
 * de construção: o passo 3 chama um Chromium externo (~2,9s medido,
 * `docs/planos/item-7-relatorio.md`), e o projeto já mediu o preço de
 * transação longa sob concorrência (`docs/diario.md`, 18/08/2026: `P2028`,
 * timeout de transação contra o pool do projeto de teste). Seria o mesmo
 * risco, maior. Se a geração do PDF falhar depois do passo 2, o `Relatorio`
 * e os títulos já criados permanecem, com `pdf_url` nulo — mesma classe de
 * estado parcial que qualquer fluxo de duas etapas (banco + serviço
 * externo) já aceita no produto (`enviarComprovante`, por exemplo). Não
 * existe hoje um "tentar de novo"; fica registrado como lacuna, mesma
 * categoria das já listadas no plano.
 *
 * **Conferência de FK antes de gravar `relatorio_id` em título** —
 * `CLAUDE.md` §3, requisito explícito do plano: mesmo tendo acabado de criar
 * o `Relatorio` nesta mesma chamada, `buscarRelatorio` confere de novo — a
 * proteção mora onde o dado é gravado, nunca em quem chama antes.
 */
export async function gerarRelatorio(empresaId: string, dados: DadosGerarRelatorio) {
  if (dados.gerarCobranca && (!dados.vencimento || !dados.formaPrevista)) {
    throw new Error("Informe o vencimento e a forma de cobrança.");
  }

  const relatorio = await criarRelatorio(empresaId, {
    clienteId: dados.clienteId,
    dataInicial: dados.dataInicial,
    dataFinal: dados.dataFinal,
    servicoIds: dados.servicoIds,
  });

  const relatorioConferido = await buscarRelatorio(empresaId, relatorio.id);
  if (!relatorioConferido) throw new Error("Não deu para gerar o relatório agora.");

  // **Governa o bloco de cobrança do documento e `gerou_cobranca` — nunca
  // `dados.gerarCobranca` sozinho** (achado do segundo `/revisar`, decisão
  // do fundador, 28/08/2026): se todo frete `finalizado` incluído já estava
  // faturado fora deste relatório, o laço abaixo pula todos e nenhum título
  // nasce. Gravar `gerou_cobranca: true` e imprimir vencimento/Pix nesse
  // caso cobraria, em papel, um valor sem título correspondente **desta
  // geração** — e o vencimento impresso poderia discordar do vencimento
  // real do título antigo. O documento só promete cobrança quando pelo
  // menos uma nasceu de verdade.
  let algumTituloCriado = false;
  if (dados.gerarCobranca) {
    // Só finalizado — em_andamento soma no documento (já gravado em
    // `RelatorioServico` por `criarRelatorio`) mas nunca vira título.
    const finalizados = await db(empresaId).servico.findMany({
      where: { id: { in: dados.servicoIds }, status_operacional: "finalizado" },
      select: { id: true },
    });
    for (const servico of finalizados) {
      try {
        await faturarServico(empresaId, servico.id, {
          vencimento: dados.vencimento!,
          formaPrevista: dados.formaPrevista!,
          relatorioId: relatorioConferido.id,
        });
        algumTituloCriado = true;
      } catch (erro) {
        // Já faturado fora deste relatório — pula, não interrompe o resto
        // (decisão de construção pré-aprovada no plano).
        if (!(erro instanceof Error && erro.message === "Este frete já foi faturado.")) throw erro;
      }
    }
  }

  const [cliente, empresa, linhasDocumento] = await Promise.all([
    buscarCliente(empresaId, dados.clienteId),
    db(empresaId).empresa.findUnique({
      where: { id: empresaId },
      select: {
        nome_fantasia: true,
        razao_social: true,
        cnpj: true,
        telefone: true,
        email: true,
        endereco: true,
        logo_url: true,
        chave_pix: true,
      },
    }),
    db(empresaId).relatorioServico.findMany({
      where: { relatorio_id: relatorio.id },
      orderBy: { data_servico: "asc" },
      select: { data_servico: true, origem_texto: true, destino_texto: true, carga_texto: true, valor: true },
    }),
  ]);
  // Os dois já foram conferidos contra a empresa: `cliente` por `criarRelatorio`
  // (que já recusaria um `clienteId` inválido) e `empresa` é a própria
  // empresa da sessão — `null` aqui só numa corrida improvável, nunca a
  // regra.
  if (!cliente || !empresa) throw new Error("Não deu para gerar o relatório agora.");

  // Cabeçalho do documento exige razão social, não nome fantasia
  // (`docs/especificacao.md` §4.4: "logo, razão social, CNPJ..."; `docs/
  // estilo.md` § Impresso nomeia a linha "Razão social"). Reserva para
  // `nome_fantasia` só porque `razao_social` é opcional no schema — uma
  // empresa que nunca preencheu não pode ficar com o cabeçalho vazio.
  // **O mesmo nome resolvido vai para a nota de rodapé** (achado do segundo
  // `/revisar`): a primeira versão usava `nome_fantasia` ali e `razao_social`
  // no cabeçalho — a mesma folha mostrando dois nomes diferentes da mesma
  // empresa, quando os dois campos estão preenchidos.
  const nomeDoDocumento = empresa.razao_social ?? empresa.nome_fantasia;

  const cnpjParte = empresa.cnpj ? `CNPJ ${formatarDocumento(empresa.cnpj)}` : null;
  const linhaDados =
    [cnpjParte, empresa.endereco].filter((v): v is string => Boolean(v)).join(" · ") || null;
  const linhaContato =
    [empresa.telefone, empresa.email].filter((v): v is string => Boolean(v)).join(" · ") || null;

  const clienteDocumento = cliente.documento
    ? `${tipoDocumento(cliente.documento) === "cnpj" ? "CNPJ" : "CPF"} ${formatarDocumento(cliente.documento)}`
    : null;

  const { caminho } = await gerarDocumento(empresaId, "relatorio", {
    numero: formatarNumeroRelatorio(relatorio.numero),
    emissao: formatarDataPorExtenso(diaEmFortaleza(relatorio.gerado_em)),
    empresa: { nome: nomeDoDocumento, linhaDados, linhaContato, logoUrl: empresa.logo_url },
    notaDeRodape: `Documento emitido por ${nomeDoDocumento} · confira os valores e fale com a gente em caso de divergência.`,
    corpo: {
      cliente: cliente.nome,
      clienteDocumento,
      periodo: formatarPeriodoDoDocumento(relatorio.data_inicial, relatorio.data_final),
      linhas: linhasDocumento.map((s) => ({
        data: diaCurtoDoDocumento(s.data_servico),
        rota: formatarRota(s.origem_texto, s.destino_texto) ?? "—",
        carga: s.carga_texto ?? "—",
        valor: formatarCentavos(s.valor),
      })),
      total: formatarCentavos(relatorio.valor_total),
      cobranca: algumTituloCriado
        ? {
            vencimento: formatarDataNumerica(diaEmFortaleza(dados.vencimento!)),
            // Exceção do §12 (`docs/componentes.md`): sem chave Pix, o
            // relatório sai do mesmo jeito, só sem essa coluna
            // (`corpoRelatorio.ts`, `montarBlocoCobranca`) — quem chama
            // decide se avisa ("Relatório gerado sem a chave Pix.").
            chavePix: empresa.chave_pix,
          }
        : null,
    },
  });

  return db(empresaId).relatorio.update({
    where: { id: relatorio.id },
    data: { pdf_url: caminho, gerou_cobranca: algumTituloCriado },
    select: CAMPOS,
  });
}
