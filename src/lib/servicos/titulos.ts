import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { buscarServico } from "@/lib/servicos/servicos";

/**
 * TituloReceber: criar (via "Já recebi") e buscar por serviço — tudo por
 * `db(empresaId)`, a única porta de acesso a dados (`CLAUDE.md` §3).
 *
 * Sem primitivo genérico "criar título com qualquer status/data": a versão
 * anterior tinha um `criarTituloReceber` exportado, para "o item 6 também
 * usar" — achado do `/revisar`, `CLAUDE.md` §6 ("nada de arquivo para
 * depois... sem abstração especulativa"), já que o único chamador real era
 * `criarTituloJaRecebi`. Quando o item 6 (título automático via relatório)
 * existir, ele ganha a própria função — com as regras que aquele caso pedir,
 * não as que este adivinhou.
 */

const CAMPOS = {
  id: true,
  servico_id: true,
  cliente_id: true,
  valor: true,
  valor_recebido: true,
  vencimento: true,
  forma_pagamento_prevista: true,
  status: true,
  data_pagamento: true,
  forma_pagamento: true,
  relatorio_id: true,
  integral: true,
  criado_em: true,
  arquivado_em: true,
} as const;

/**
 * Um título por frete — não existe hoje caminho de estorno, então um segundo
 * título para o mesmo `servico_id` só pode ser engano (toque duplicado que
 * escapou do `carregando`, ou o aviso reaberto por navegação/recarga antes
 * do parâmetro sumir da URL). Cobre qualquer status, não só `pago`.
 */
export function buscarTituloPorServico(empresaId: string, servicoId: string) {
  return db(empresaId).tituloReceber.findFirst({
    where: { servico_id: servicoId, arquivado_em: null },
    select: CAMPOS,
  });
}

/** `titulo_receber_um_integral_por_servico` — o índice único parcial da migration. */
function ehTituloIntegralDuplicado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/**
 * "Já recebi" (`docs/planos/item-3-lancamento-frete.md`, Tarefa 3): cria um
 * `TituloReceber` já pago e **integral** (cobre o frete inteiro —
 * `docs/especificacao.md`, entidade TituloReceber), com `cliente_id` e
 * `valor` derivados do próprio `Servico` — nunca de input do usuário, pela
 * mesma razão de `criado_por_usuario_id` nunca vir do formulário.
 *
 * **Só uma conferência de FK aqui, não duas** (`CLAUDE.md` §3): `servico_id`
 * é o único identificador que chega de fora, então é o único que precisa de
 * `buscarServico` escopado por empresa. `cliente_id` nunca é escolhido —
 * vem de `servico.cliente_id`, que já foi conferido contra a empresa quando
 * o próprio `Servico` foi criado (`criarServico`, `src/lib/servicos/
 * servicos.ts`) e não muda por fora de `editarServico` (que confere de
 * novo). Conferir de novo aqui checaria uma invariante que já é garantida
 * em outro lugar, não uma entrada nova.
 *
 * **A recusa de um segundo título tem duas camadas.** `buscarTituloPorServico`
 * é o caminho rápido — cobre o caso comum e dá o erro certo sem round-trip
 * extra. Quem garante de verdade é o índice único parcial
 * (`titulo_receber_um_integral_por_servico`, migration
 * `20260814150000_titulo_integral_unico_por_frete`): sob concorrência real
 * (duas abas, ou o aviso reaberto exatamente na janela de corrida), os dois
 * pedidos podem passar pela checagem acima antes de qualquer `INSERT`
 * terminar — é o banco, não este `if`, que recusa o segundo, e
 * `ehTituloIntegralDuplicado` traduz esse erro para a mesma mensagem.
 *
 * `data_pagamento` é o instante do toque (`new Date()`), não um dia
 * escolhido em calendário — não passa por `instanteDoDiaEmFortaleza`, que é
 * só para "AAAA-MM-DD" digitado. `vencimento`, `forma_pagamento_prevista`,
 * `forma_pagamento` e `relatorio_id` ficam nulos: ninguém pergunta isso
 * nesta tela.
 */
export async function criarTituloJaRecebi(empresaId: string, servicoId: string) {
  const servico = await buscarServico(empresaId, servicoId);
  if (!servico || servico.arquivado_em) throw new Error("Selecione um frete válido.");

  const existente = await buscarTituloPorServico(empresaId, servicoId);
  if (existente) throw new Error("Este frete já tem título lançado.");

  try {
    return await db(empresaId).tituloReceber.create({
      data: {
        servico_id: servico.id,
        cliente_id: servico.cliente_id,
        valor: servico.valor,
        valor_recebido: servico.valor,
        status: "pago",
        integral: true,
        data_pagamento: new Date(),
        empresa_id: empresaId,
      },
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehTituloIntegralDuplicado(erro)) {
      throw new Error("Este frete já tem título lançado.");
    }
    throw erro;
  }
}
