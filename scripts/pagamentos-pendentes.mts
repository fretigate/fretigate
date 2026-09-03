/**
 * Visibilidade de pagamentos que ainda não viraram conta (item 13, caso 1
 * do plano — `docs/planos/item-13-assinatura.md`) e reenvio do e-mail de
 * ativação:
 *
 *     npm run pagamentos:pendentes                    lista
 *     npm run pagamentos:pendentes -- --reenviar=<id>  reenvia o e-mail
 *
 * Investigação e operação, não portão — mesma classe de
 * `scripts/medir-municipios.mts`: fica fora de `/src`, é ferramenta rodada
 * por um humano que já escolheu o que quer ver (`CLAUDE.md` §6), nunca
 * parte do produto publicado.
 *
 * POR QUE ISTO EXISTE: `PagamentoPendente` nasce sem empresa — antes do
 * clique, não há dono nenhum para ver uma tela dentro do produto (a
 * diferença central em relação ao convite, que já tem um dono vendo a lista
 * pendente em `/conta/usuarios`). Este comando é a única visibilidade do
 * lado do FretiGate — para "pagou e nunca clicou" (caso 1) e, desde que o
 * e-mail de ativação virou o único caminho de entrega confirmado (decisão
 * do fundador, 03/09/2026), também para "o e-mail nunca saiu" ou "saiu e
 * pode ter caído em spam".
 *
 * FALA PELA CONEXÃO DAS MIGRATIONS (`DIRECT_URL`) PARA A LISTAGEM, NUNCA
 * PELA DA APLICAÇÃO — mesmo desenho de `scripts/seed/municipios.mts`.
 * `fretigate_app` não tem NENHUM privilégio direto em `pagamento_pendente`
 * (só as funções `SECURITY DEFINER`, restritas ao que cada uma faz) — não
 * é ausência de disciplina, é o desenho: ver a fila inteira, com e-mail e
 * documento, é ação de quem já está de fora de qualquer contexto de
 * empresa, do mesmo jeito que ler `municipio` inteiro é.
 *
 * MOSTRA O E-MAIL COMPLETO, NUNCA MASCARADO — decisão do fundador,
 * 03/09/2026, e não a mesma regra de `/ativar-assinatura` (que mascara,
 * `mascararEmail` em `pagamentos.ts`) aplicada por analogia. São dois
 * motivos diferentes: a tela pública é alcançável por qualquer um que
 * tenha o link — inclusive alguém que não é quem pagou (caso 3 do plano).
 * Este comando só o fundador roda, contra o próprio terminal; ele já é o
 * controlador desses dados, e é o e-mail completo que permite identificar
 * quem pagou e não entrou — mascarar aqui tornaria o comando inútil para o
 * próprio motivo de existir. Não "corrigir" um pelo outro por analogia.
 *
 * O REENVIO já passa pela conexão normal (`@/lib/servicos/pagamentos`,
 * `mandarEmailDeAtivacao`) — é a MESMA função que a rota do webhook chama,
 * reaproveitada, não reimplementada: manda o e-mail de novo com o MESMO
 * token (nunca gera um segundo), e registra `email_enviado_em`.
 *
 * PRECISA DE `--import tsx` E `--conditions=react-server` — mesmo motivo de
 * `medir-municipios.mts`: `@/lib/servicos/pagamentos` importa `@/lib/db`,
 * que tem `"server-only"`.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/lib/generated/prisma/client.ts";
import { mandarEmailDeAtivacao } from "../src/lib/servicos/pagamentos.ts";
import { fecharConexao } from "../src/lib/db/index.ts";

function parar(motivo: string): never {
  console.error(`\n  ${motivo}\n`);
  process.exit(1);
}

const URL_DIRETA = process.env.DIRECT_URL;
if (!URL_DIRETA) {
  parar(
    "DIRECT_URL não está definida. É a conexão das migrations — a mesma que " +
      "este comando usa para listar (fretigate_app não tem acesso direto a " +
      "pagamento_pendente, só pelas funções SECURITY DEFINER).",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL_DIRETA }) });

function horasDesde(data: Date): string {
  const horas = (Date.now() - data.getTime()) / (1000 * 60 * 60);
  if (horas < 1) return "menos de 1h";
  if (horas < 48) return `${Math.round(horas)}h`;
  return `${Math.round(horas / 24)} dias`;
}

async function listar() {
  const pendentes = await prisma.pagamentoPendente.findMany({
    where: { status: "pendente" },
    orderBy: { recebido_em: "asc" },
    select: {
      id: true,
      email_comprador: true,
      nome_comprador: true,
      periodicidade: true,
      valor_centavos: true,
      recebido_em: true,
      email_enviado_em: true,
    },
  });

  if (pendentes.length === 0) {
    console.log("\n  Nenhum pagamento pendente sem conta. Tudo reivindicado.\n");
    return;
  }

  console.log(`\n  ${pendentes.length} pagamento(s) pendente(s), mais antigo primeiro:\n`);
  for (const p of pendentes) {
    const situacaoEmail = p.email_enviado_em
      ? `e-mail enviado há ${horasDesde(p.email_enviado_em)}`
      : "⚠️  E-MAIL NUNCA SAIU";
    const valor = (p.valor_centavos / 100).toFixed(2).replace(".", ",");
    console.log(
      `  ${p.id}\n` +
        `    ${p.nome_comprador} <${p.email_comprador}> — ${p.periodicidade}, R$ ${valor}\n` +
        `    recebido há ${horasDesde(p.recebido_em)} — ${situacaoEmail}\n`,
    );
  }
  console.log(
    "  Reenviar o e-mail de um deles:\n" +
      "    npm run pagamentos:pendentes -- --reenviar=<id>\n",
  );
}

async function reenviar(id: string) {
  const pagamento = await prisma.pagamentoPendente.findUnique({
    where: { id },
    select: { id: true, token: true, email_comprador: true, status: true },
  });

  if (!pagamento) parar(`Nenhum pagamento pendente com o id ${id}.`);
  if (pagamento.status !== "pendente") {
    parar(
      `Este pagamento não está mais pendente (status: ${pagamento.status}) — ` +
        "reenviar não faz sentido: ou já virou conta, ou foi estornado.",
    );
  }

  await mandarEmailDeAtivacao({
    id: pagamento.id,
    token: pagamento.token,
    emailComprador: pagamento.email_comprador,
  });
  console.log(`\n  E-mail reenviado para ${pagamento.email_comprador}.\n`);
}

const argumentoReenviar = process.argv.find((a) => a.startsWith("--reenviar="));

try {
  if (argumentoReenviar) {
    await reenviar(argumentoReenviar.slice("--reenviar=".length));
  } else {
    await listar();
  }
} finally {
  // Duas conexões abertas quando reenvia: a deste script (DIRECT_URL, só
  // leitura) e a compartilhada de `@/lib/db` (fretigate_app, usada por
  // dentro de `mandarEmailDeAtivacao`) — as duas precisam fechar, mesmo
  // motivo de `scripts/medir-municipios.mts`: processo curto que não fecha
  // deixa a conexão presa até o pooler notar que o processo morreu.
  await prisma.$disconnect();
  await fecharConexao();
}
