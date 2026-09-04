import { randomBytes } from "node:crypto";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import {
  db,
  registrarPagamentoPendente as registrarPagamentoPendenteDb,
  localizarPagamentoPorToken as localizarPagamentoPorTokenDb,
  reivindicarPagamento as reivindicarPagamentoDb,
  vincularPagamentoAEmpresa,
  marcarEmailDePagamentoEnviado,
  estornarPagamentoPendente as estornarPagamentoPendenteDb,
  localizarEmpresaPorAssinanteGateway,
} from "@/lib/db";
import { auth } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";
import { linkDeAtivacaoDaAssinatura } from "@/lib/utils/pagamento";
import { criarEmpresaEDono } from "./criar-empresa-e-dono";

/**
 * O pagamento que ainda não é conta (item 13 — `docs/planos/
 * item-13-assinatura.md`, Tarefa 1). Mesma separação de `usuarios.ts`
 * (convite): a regra de negócio mora aqui, as funções de banco
 * `SECURITY DEFINER` (`src/lib/db`) só fazem a operação atômica pedida —
 * ver o comentário do `model PagamentoPendente` em `prisma/schema.prisma`
 * para o porquê da tabela inteira ficar fora do isolamento por empresa.
 */

/**
 * A credencial de reivindicação — mesmo formato de `gerarTokenDeConvite`
 * (`usuarios.ts`): 32 bytes aleatórios, `base64url` (sem `+`/`/`/`=`,
 * seguro dentro de uma URL sem escapar nada).
 */
function gerarTokenDePagamento(): string {
  return randomBytes(32).toString("base64url");
}

export type DadosPagamentoAprovado = {
  gateway: string;
  transacaoExterna: string;
  emailComprador: string;
  nomeComprador: string;
  gatewayAssinanteId: string;
  documentoComprador: string | null;
  periodicidade: "mensal" | "anual";
  valorCentavos: number;
  recebidoEm: Date;
};

/**
 * Registra um pagamento pendente — chamado pela rota de webhook quando
 * `order_approved` (gatilho "Compra aprovada") chega sem `s1` (venda que
 * não passou pelo produto, caso comum do Fluxo B: anúncio → checkout →
 * pagamento, sem cadastro no meio).
 *
 * A deduplicação por `transacaoExterna` mora dentro de
 * `registrar_pagamento_pendente` (a Kiwify reenvia webhook em caso de
 * falha na entrega) — esta função sempre devolve o token certo, gerando um
 * novo só na primeira chegada.
 *
 * **`status` vai junto do retorno, achado do `/revisar`** — a reentrega de
 * um `order_approved` já processado (a Kiwify reenvia webhook em caso de
 * falha na entrega, mesmo depois de sucesso do lado dela) cai neste mesmo
 * caminho: sem saber o `status` atual, quem chama mandaria o e-mail de
 * ativação de novo mesmo para um token já `aceito` ou `estornado` — um
 * link morto reenviado ao comprador, contradizendo o caso 4 do plano ("o
 * token morre"). `mandarEmailDeAtivacao` (rota do webhook) só roda quando
 * `status === "pendente"`.
 */
export async function registrarPagamento(
  dados: DadosPagamentoAprovado,
): Promise<{ id: string; token: string; status: "pendente" | "aceito" | "estornado" }> {
  const resultado = await registrarPagamentoPendenteDb({
    id: uuidv7(),
    token: gerarTokenDePagamento(),
    gateway: dados.gateway,
    transacaoExterna: dados.transacaoExterna,
    emailComprador: dados.emailComprador,
    nomeComprador: dados.nomeComprador,
    gatewayAssinanteId: dados.gatewayAssinanteId,
    documentoComprador: dados.documentoComprador,
    periodicidade: dados.periodicidade,
    valorCentavos: dados.valorCentavos,
    recebidoEm: dados.recebidoEm,
  });
  return { id: resultado.id, token: resultado.token, status: resultado.status };
}

/**
 * O texto do e-mail de ativação — **o único caminho de entrega confirmado**
 * do Fluxo B (decisão do fundador, 03/09/2026, `docs/planos/
 * item-13-assinatura.md`): a página de obrigado da Kiwify não carrega
 * identificador nenhum, e o e-mail automático da própria Kiwify não serve
 * para produto de integração externa — a central de ajuda deles é
 * explícita: o botão de acesso desse e-mail leva para o painel da própria
 * Kiwify, nunca para uma URL externa configurável. Texto puro, mesmo
 * motivo de `recuperacaoDeSenha`/`verificacaoDeEmail`
 * (`src/lib/auth/email.ts`) — nota de spam melhor, domínio novo.
 *
 * **Sem "confira a caixa de spam"** — decisão registrada como lacuna, não
 * esquecimento: esse texto (`docs/especificacao.md`, "Confira a caixa de
 * spam") é para uma TELA que a pessoa está olhando no momento do envio
 * (confirmação de cadastro, pedido de recuperação de senha). Aqui não há
 * tela nenhuma — o envio acontece no webhook, sem ninguém do lado de
 * dentro do produto. Colocar a frase dentro do e-mail que a pessoa precisa
 * achar não ajuda quem não o achou.
 */
export function ativacaoDeAssinatura(url: string) {
  return {
    assunto: "Seu pagamento foi aprovado — ative sua conta no FretiGate",
    texto: [
      "Recebemos a confirmação do seu pagamento.",
      "",
      "Para começar a usar o FretiGate, crie sua senha aqui:",
      url,
      "",
      "Esse link é seu, de uso único — não compartilhe com ninguém.",
      "",
      "FretiGate",
    ].join("\n"),
  };
}

/**
 * Manda o e-mail de ativação e registra o sucesso — chamada pela rota de
 * webhook logo depois de `registrarPagamento`. Propaga o erro se o envio
 * falhar (mesmo "falha alto" de `enviarEmail`, `src/lib/email`): a rota do
 * webhook decide devolver erro para a Kiwify reentregar o evento mais
 * tarde, tentando de novo — nunca engole a falha em silêncio, porque não
 * existe outro caminho de entrega hoje.
 */
export async function mandarEmailDeAtivacao(pagamento: {
  id: string;
  token: string;
  emailComprador: string;
}): Promise<void> {
  const url = linkDeAtivacaoDaAssinatura(pagamento.token);
  const { assunto, texto } = ativacaoDeAssinatura(url);
  await enviarEmail({ para: pagamento.emailComprador, assunto, texto });
  await marcarEmailDePagamentoEnviado(pagamento.id);
}

/**
 * Estorna um pagamento ainda não reivindicado — webhook de reembolso ou
 * chargeback chegando antes do clique (caso 4 do plano). `estornou: false`
 * quer dizer que o token já não estava `pendente` — quem chama (a rota do
 * webhook) trata isso como o outro caso: assinatura já existente mudando
 * de estado, via `atualizarStatusAssinaturaPorAssinanteGateway`.
 */
export async function estornarPagamento(
  transacaoExterna: string,
): Promise<{ estornou: boolean }> {
  const linhasAfetadas = await estornarPagamentoPendenteDb(transacaoExterna);
  return { estornou: linhasAfetadas > 0 };
}

/**
 * Muda `status_assinatura` de uma empresa já existente, achada pelo
 * identificador do assinante no gateway — eventos de assinatura DEPOIS do
 * primeiro pagamento (renovação, atraso, cancelamento, ou reembolso/
 * chargeback quando a empresa já existe). Devolve `false` se não achar
 * nenhuma empresa com esse identificador — a rota do webhook (achado do
 * `/revisar`: a primeira versão engolia isso em silêncio) trata `false`
 * como falha alta, devolvendo 500 para a Kiwify reentregar: uma empresa
 * cujo `subscription_canceled` some sem atualizar o status fica `ativa`
 * de graça, para sempre — é dinheiro, não pode falhar calado.
 */
export async function atualizarStatusAssinaturaPorAssinanteGateway(
  gatewayAssinanteId: string,
  novoStatus: "ativa" | "inadimplente" | "vencida" | "encerrada",
): Promise<boolean> {
  const empresa = await localizarEmpresaPorAssinanteGateway(gatewayAssinanteId);
  if (!empresa) return false;

  await db(empresa.id).empresa.update({
    where: { id: empresa.id },
    data: { status_assinatura: novoStatus },
  });
  return true;
}

export type ConfirmacaoDeCompra =
  | { situacao: "pendente"; emailParcial: string; data: Date }
  | { situacao: "ja_reivindicado" }
  | { situacao: "indisponivel" };

/**
 * E-mail parcial para a confirmação de compra (caso 3 do plano) — só o
 * suficiente para quem pagou reconhecer a própria compra, nunca o
 * suficiente para identificar a pessoa a partir do link sozinho.
 * `an***@gmail.com` — primeiros dois caracteres do usuário, domínio
 * inteiro (o domínio não identifica ninguém sozinho).
 *
 * **Só aqui — não em `scripts/pagamentos-pendentes.mts`, de propósito,
 * decisão do fundador, 03/09/2026.** São dois motivos diferentes, não um
 * só repetido: esta função existe porque `/ativar-assinatura` é alcançável
 * por QUALQUER UM que tenha o link — inclusive alguém que não é quem pagou
 * (caso 3 do plano, link vazado). O comando de operação é o oposto: só o
 * fundador o roda, contra o próprio terminal, e ele já é o controlador
 * desses dados — mascarar lá tornaria o comando inútil, porque é pelo
 * e-mail completo que se identifica quem pagou e não entrou. Não
 * "corrigir" um pelo outro por analogia — são situações diferentes, com
 * motivo escrito nos dois lugares.
 */
function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return "***";
  const visivel = usuario.slice(0, 2);
  return `${visivel}${"*".repeat(Math.max(3, usuario.length - 2))}@${dominio}`;
}

/**
 * A tela `/ativar-assinatura` — decide qual das mensagens mostrar (caso 2
 * do plano: "já reivindicado" tem saída própria, o resto é indisponível
 * genérico, mesmo motivo do convite: distinguir revelaria informação, por
 * exemplo que um pagamento específico foi estornado).
 */
export async function buscarConfirmacaoDeCompra(
  token: string,
): Promise<ConfirmacaoDeCompra> {
  const pagamento = await localizarPagamentoPorTokenDb(token);
  if (!pagamento) return { situacao: "indisponivel" };
  if (pagamento.status === "aceito") return { situacao: "ja_reivindicado" };
  if (pagamento.status !== "pendente") return { situacao: "indisponivel" };

  return {
    situacao: "pendente",
    emailParcial: mascararEmail(pagamento.email_comprador),
    data: pagamento.recebido_em,
  };
}

export type DadosAtivarAssinatura = {
  nomeEmpresa: string;
  email: string;
  senha: string;
};
export type ResultadoAtivarAssinatura = {
  usuarioId: string;
  empresaId: string;
  email: string;
};

/**
 * `(auth)/ativar-assinatura` — token válido + nome da empresa + e-mail +
 * senha → reivindica o pagamento e cria a Empresa (`plano: pago`) e o
 * Usuário dono. Mesmo esqueleto de `aceitarConvite` (`usuarios.ts`):
 * público, sem `empresaId` — é exatamente o que esta função descobre.
 *
 * **A reivindicação acontece ANTES de criar a Empresa** — mesmo motivo do
 * convite (`CLAUDE.md` §2, "verifica num passo, grava noutro"):
 * `reivindicar_pagamento` já é o `UPDATE ... WHERE status = 'pendente'`
 * atômico; a criação da empresa vem depois, já sabendo que ninguém mais
 * pode reivindicar o mesmo token.
 *
 * **`nomeEmpresa` é entrada desta função, não do `PagamentoPendente`** —
 * a Kiwify não pergunta nome de empresa no checkout, só dados do
 * comprador. `nomeDono` (o "seu nome" da Empresa) vem do
 * `nome_comprador` que a Kiwify já mandou — a pessoa não digita de novo.
 */
export async function ativarAssinatura(
  token: string,
  dados: DadosAtivarAssinatura,
): Promise<ResultadoAtivarAssinatura | { erro: string }> {
  const pagamento = await localizarPagamentoPorTokenDb(token);
  if (!pagamento || pagamento.status !== "pendente") {
    return { erro: "Este link já não está disponível." };
  }

  const nomeEmpresa = dados.nomeEmpresa.trim();
  if (!nomeEmpresa) {
    return { erro: "Diga o nome da empresa." };
  }

  const emailValidado = z.email().safeParse(dados.email.trim().toLowerCase());
  if (!emailValidado.success) {
    return { erro: "E-mail inválido." };
  }
  const email = emailValidado.data;

  const ctx = await auth.$context;
  const { minPasswordLength, maxPasswordLength } = ctx.password.config;
  if (dados.senha.length < minPasswordLength) {
    return { erro: `A senha precisa de pelo menos ${minPasswordLength} caracteres.` };
  }
  if (dados.senha.length > maxPasswordLength) {
    return { erro: `A senha pode ter no máximo ${maxPasswordLength} caracteres.` };
  }

  const existente = await ctx.internalAdapter.findUserByEmail(email);
  if (existente) {
    return { erro: "Já existe uma conta com esse e-mail." };
  }

  // Reivindica ANTES de criar a empresa (mesmo motivo do convite —
  // `CLAUDE.md` §2, "verifica num passo, grava noutro"): a partir daqui,
  // ninguém mais reivindica o mesmo token, mesmo que a criação da conta
  // falhe logo em seguida (estado parcial aceito, lacuna registrada no
  // plano — mesma classe de `aceitarConvite`).
  const reivindicado = await reivindicarPagamentoDb(token);
  if (!reivindicado) {
    return { erro: "Este link já não está disponível." };
  }

  // O `empresaId` nasce aqui, na aplicação — mesmo raciocínio do cadastro
  // comum (`CLAUDE.md` §9: "criar uma empresa exige definir o contexto
  // ANTES de inserir"). `vincularPagamentoAEmpresa`, depois, é quem liga
  // este `PagamentoPendente` à empresa que nasce dele.
  const empresaId = uuidv7();

  const resultadoConta = await criarEmpresaEDono({
    empresaId,
    nomeEmpresa,
    telefone: null,
    // Fluxo B (checkout direto) não passa pela pergunta declarada do
    // cadastro comum (§11 do CLAUDE.md) — a Kiwify não pergunta "como você
    // conheceu o FretiGate". Lacuna registrada no plano: este caminho de
    // entrada fica sem atribuição de origem.
    origemDeclarada: null,
    plano: "pago",
    periodicidade: reivindicado.periodicidade,
    statusAssinatura: "ativa",
    gatewayAssinanteId: reivindicado.gateway_assinante_id,
    email,
    nomeDono: reivindicado.nome_comprador,
    senha: dados.senha,
  });
  if ("erro" in resultadoConta) {
    return { erro: resultadoConta.erro };
  }

  // Melhor esforço — ver o comentário de `vincularPagamentoAEmpresa`
  // (`src/lib/db`): se isto falhar, a conta já existe e a pessoa entra
  // normalmente, só o rastro de auditoria fica incompleto.
  await vincularPagamentoAEmpresa(reivindicado.id, empresaId).catch((erroVinculo) => {
    console.error(
      "[ativarAssinatura] falha ao vincular pagamento a empresa",
      reivindicado.id,
      empresaId,
      erroVinculo instanceof Error ? erroVinculo.name : "erro desconhecido",
    );
  });

  return { usuarioId: resultadoConta.usuarioId, empresaId, email };
}
