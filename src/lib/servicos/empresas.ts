import { cnpj as validadorCnpj } from "cpf-cnpj-validator";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { normalizarDocumento } from "@/lib/utils/documento";
import { resolverMunicipio } from "@/lib/servicos/municipios";

/**
 * Empresa: leitura completa e as duas telas do item 10 (Conta da empresa,
 * Configurações) — tudo por `db(empresaId)`, a única porta de acesso a
 * dados (`CLAUDE.md` §3).
 *
 * `salvarChavePix` (item 6, Tarefa 5, primeiro escritor de `Empresa` fora do
 * cadastro) continua existindo — é o atalho pontual que `salvarChavePixAction`
 * chama, e não muda com esta tarefa (`docs/planos/
 * item-10-configuracoes-conta-e-usuarios.md`, decisão 7): a tela completa
 * (`atualizarContaDaEmpresa`, abaixo) e o atalho escrevem no mesmo campo, com
 * portas diferentes para motivos diferentes.
 */

const CAMPOS = {
  id: true,
  nome_fantasia: true,
  razao_social: true,
  cnpj: true,
  telefone: true,
  email: true,
  endereco: true,
  municipio_id: true,
  logo_url: true,
  chave_pix: true,
  patio_endereco: true,
  patio_municipio_id: true,
  patio_municipio: { select: { nome: true, uf: true } },
  prazo_padrao_dias: true,
  proximo_numero_relatorio: true,
} as const;

/** Leitura completa — Conta da empresa e Configurações (item 10, Tarefa 1). */
export function buscarEmpresa(empresaId: string) {
  return db(empresaId).empresa.findUnique({ where: { id: empresaId }, select: CAMPOS });
}

/**
 * "Falta a chave Pix da sua empresa" (`docs/componentes.md` §12) — grava a
 * chave ao confirmar a folha. Texto livre, sem validação de formato: chave
 * Pix pode ser CPF, CNPJ, e-mail, telefone ou aleatória — recusar uma válida
 * é pior que aceitar uma torta (`docs/planos/item-6-titulo-e-cobrancas.md`,
 * Tarefa 5).
 */
export async function salvarChavePix(empresaId: string, chavePix: string): Promise<void> {
  await db(empresaId).empresa.update({
    where: { id: empresaId },
    data: { chave_pix: chavePix },
  });
}

export type DadosContaDaEmpresa = {
  razaoSocial?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  chavePix?: string | null;
  logoUrl?: string | null;
};

/**
 * CNPJ da Empresa, e só CNPJ — diferente de `documentoValido`
 * (`src/lib/utils/documento.ts`), que aceita CPF ou CNPJ para Cliente e
 * Motorista, pessoa física ou jurídica. A transportadora é sempre pessoa
 * jurídica. Mesma normalização (`cnpj.strip`, maiúsculo, sem pontuação —
 * `docs/especificacao.md`, entidade Empresa) e o mesmo formato alfanumérico
 * da Receita que a restrição `empresa_cnpj_formato` já garante no banco.
 */
function normalizarCnpjOuNulo(bruto: string | null | undefined): string | null {
  if (!bruto?.trim()) return null;
  const normalizado = normalizarDocumento(bruto);
  if (normalizado.length !== 14 || !validadorCnpj.isValid(normalizado)) {
    throw new Error("CNPJ inválido.");
  }
  return normalizado;
}

/** `empresa_cnpj_key` — a restrição `@unique` do schema. */
function ehCnpjDuplicado(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/**
 * A tela "Conta da empresa" (item 10, Tarefa 2) — generaliza `salvarChavePix`
 * para o formulário inteiro: razão social, CNPJ, endereço, telefone, e-mail,
 * chave Pix, logo. `nome_fantasia` fica fora — é definido no cadastro e não
 * reaparece aqui (`docs/especificacao.md` §4.9 não lista "nome da empresa"
 * entre os campos desta tela).
 *
 * `logoUrl` chega já processada — o pipeline de upload (item 10, Tarefa 2)
 * mora em `src/lib/servicos/comprovantes.ts`-style, fora desta função; aqui
 * só grava o caminho.
 *
 * **Campo omitido não é tocado** — achado do `/revisar`, decisão do
 * fundador, 31/08/2026: mesmo guarda `!== undefined` de `atualizarConfiguracoes`
 * (abaixo), por consistência entre as duas funções irmãs desta tarefa.
 *
 * **CNPJ duplicado nunca sobe o erro cru do banco** — `docs/especificacao.md`,
 * entidade Empresa: "Mensagem de erro: 'já existe uma conta com esse CNPJ'.
 * Nunca o erro do banco." Mesmo padrão de `criarCliente`/`editarCliente`
 * (`clientes.ts`) para `documento` duplicado.
 */
export async function atualizarContaDaEmpresa(empresaId: string, dados: DadosContaDaEmpresa) {
  try {
    return await db(empresaId).empresa.update({
      where: { id: empresaId },
      data: {
        ...(dados.razaoSocial !== undefined && { razao_social: dados.razaoSocial?.trim() || null }),
        ...(dados.cnpj !== undefined && { cnpj: normalizarCnpjOuNulo(dados.cnpj) }),
        ...(dados.endereco !== undefined && { endereco: dados.endereco?.trim() || null }),
        ...(dados.telefone !== undefined && { telefone: dados.telefone?.trim() || null }),
        ...(dados.email !== undefined && { email: dados.email?.trim() || null }),
        ...(dados.chavePix !== undefined && { chave_pix: dados.chavePix?.trim() || null }),
        ...(dados.logoUrl !== undefined && { logo_url: dados.logoUrl?.trim() || null }),
      },
      select: CAMPOS,
    });
  } catch (erro) {
    if (ehCnpjDuplicado(erro)) throw new Error("Já existe uma conta com esse CNPJ.");
    throw erro;
  }
}

export type DadosConfiguracoes = {
  patioEndereco?: string | null;
  prazoPadraoDias?: number;
  proximoNumeroRelatorio?: number;
};

/** 0 é à vista (comum em frete de carga); acima de 90 é quase sempre engano de dígito (300 no lugar de 30). */
const PRAZO_MINIMO_DIAS = 0;
const PRAZO_MAXIMO_DIAS = 90;

/**
 * A tela "Configurações" (item 10, Tarefa 3) — pátio, prazo padrão de
 * vencimento e a numeração do relatório.
 *
 * **A numeração só aumenta** (decisão do fundador, 31/08/2026 —
 * `docs/planos/item-10-configuracoes-conta-e-usuarios.md`, decisão 5):
 * baixar o número faria dois relatórios nascerem com o mesmo `numero`
 * (`Relatorio.numero`, contador que `criarRelatorio` incrementa —
 * `docs/planos/item-7-relatorio.md`, Tarefa 1). Mensagem amigável nomeando o
 * número atual, nunca o erro de restrição do banco.
 *
 * **O piso é conferido e gravado numa única instrução, não em dois passos**
 * (achado do `/revisar`, decisão do fundador, 31/08/2026): a primeira versão
 * lia o valor atual e gravava o novo em duas chamadas de `db()` separadas —
 * um `criarRelatorio` correndo entre a leitura e a escrita podia incrementar
 * o contador no meio, e a escrita desta função sobrescreveria com um valor
 * já ultrapassado, quebrando `@@unique([empresa_id, numero])` na próxima
 * geração de relatório. `updateMany` com o piso na própria cláusula `WHERE`
 * faz o banco conferir e gravar atomicamente — mesmo princípio do contador
 * de `criarRelatorio`, só que aqui é "não decrescer" em vez de "incrementar".
 *
 * **`patioMunicipioId` nunca é entrada externa** (item 10, Tarefa 3, decisão
 * do fundador, 01/09/2026) — só nasce de `resolverMunicipio` rodando aqui
 * dentro, sobre `patioEndereco`. Mesmo princípio de `empresa_id` vir sempre
 * de um lugar controlado, nunca de input externo (`CLAUDE.md` §3), aplicado
 * ao município: o Postgres não confere se um id de fora corresponde a um
 * município que existe de verdade (só a FK, que sobe erro cru). Resolução
 * `ambigua` ou `nao_encontrada` grava o texto do mesmo jeito e não mexe no
 * município — nunca bloqueia o salvar, mesma regra do frete
 * (`resolverMunicipio`, `docs/especificacao.md` §6).
 */
export async function atualizarConfiguracoes(empresaId: string, dados: DadosConfiguracoes) {
  if (dados.prazoPadraoDias !== undefined) {
    if (
      !Number.isInteger(dados.prazoPadraoDias) ||
      dados.prazoPadraoDias < PRAZO_MINIMO_DIAS ||
      dados.prazoPadraoDias > PRAZO_MAXIMO_DIAS
    ) {
      throw new Error(
        `O prazo padrão precisa estar entre ${PRAZO_MINIMO_DIAS} e ${PRAZO_MAXIMO_DIAS} dias.`,
      );
    }
  }

  if (dados.proximoNumeroRelatorio !== undefined) {
    const resultado = await db(empresaId).empresa.updateMany({
      where: { id: empresaId, proximo_numero_relatorio: { lte: dados.proximoNumeroRelatorio } },
      data: { proximo_numero_relatorio: dados.proximoNumeroRelatorio },
    });
    if (resultado.count === 0) {
      const atual = await db(empresaId).empresa.findUnique({
        where: { id: empresaId },
        select: { proximo_numero_relatorio: true },
      });
      if (!atual) throw new Error("Empresa não encontrada.");
      throw new Error(
        `O próximo número não pode ser menor que ${atual.proximo_numero_relatorio} — já foi usado até aqui.`,
      );
    }
  }

  const patioEndereco = dados.patioEndereco !== undefined ? dados.patioEndereco?.trim() || null : undefined;
  const patioMunicipio =
    patioEndereco !== undefined && patioEndereco !== null
      ? await resolverMunicipio(empresaId, patioEndereco)
      : null;

  // `proximo_numero_relatorio` NÃO entra aqui — já foi gravado, com o piso
  // conferido atomicamente, no `updateMany` acima. Gravá-lo de novo aqui
  // (achado do segundo `/revisar`, 31/08/2026) desfazia a própria proteção:
  // um `criarRelatorio` incrementando o contador entre as duas escritas teria
  // o incremento sobrescrito por este valor já ultrapassado.
  return db(empresaId).empresa.update({
    where: { id: empresaId },
    data: {
      ...(patioEndereco !== undefined && { patio_endereco: patioEndereco }),
      ...(patioEndereco !== undefined && {
        patio_municipio_id:
          patioMunicipio?.situacao === "resolvido" ? patioMunicipio.municipio.codigo_ibge : null,
      }),
      ...(dados.prazoPadraoDias !== undefined && { prazo_padrao_dias: dados.prazoPadraoDias }),
    },
    select: CAMPOS,
  });
}
