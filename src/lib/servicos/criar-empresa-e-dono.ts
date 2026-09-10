import { auth } from "@/lib/auth";
import { emTransacao, reverterCadastroIncompleto } from "@/lib/db";
import { criarUsuarioDono } from "./criar-usuario-dono";
import { criarTiposDeOperacaoIniciais } from "./tipos-de-operacao";

/**
 * O valor é a data de publicação da versão do texto dos Termos e da
 * Política de Privacidade (`src/app/(auth)/termos/ConteudoTermos.tsx`) —
 * não um número sequencial. Toda Empresa que aceitar esta versão grava a
 * mesma data aqui; `termos_aceitos_em`, abaixo, é o momento em que aquela
 * Empresa aceitou, e os dois podem divergir. Empresas que já aceitaram esta
 * não são reescritas retroativamente quando a próxima versão nascer.
 *
 * Nem toda mudança no texto muda esta data: só cláusula nova ou alterada
 * exige aceite novo de quem já tinha aceitado (data nova aqui, e um fluxo
 * de reaceite que ainda não existe). Correção de redação que não muda o que
 * o texto autoriza — erro de digitação, clareza de frase — não precisa.
 *
 * Publicado em 18/08/2026 com revisão jurídica pendente, sem bloqueio de
 * lançamento (CLAUDE.md §14) — decisão do fundador.
 *
 * **Vale para os dois caminhos de entrada do produto** — cadastro gratuito
 * e a conta que nasce de um pagamento (item 13). Aceitar os Termos do
 * FretiGate na Kiwify não é a mesma coisa que aceitar os do FretiGate: são
 * contratos diferentes, e por isso a tela `/ativar-assinatura` pede o
 * mesmo aceite do cadastro comum, não dispensa.
 *
 * **Data avançada para 03/09/2026 (item 13, Tarefa 1)** — a Kiwify entrou
 * na lista de subprocessadores (`ConteudoTermos.tsx`, `CLAUDE.md` §11):
 * cláusula nova o bastante para mudar o que o texto autoriza (quem tem
 * acesso a dado de quem paga pelo Fluxo B), mesma regra do parágrafo
 * acima. Sem empresa nenhuma ainda tendo aceitado a versão anterior de
 * verdade (zero clientes pagantes), não há reaceite a resolver agora.
 */
export const VERSAO_TERMOS_PUBLICADA = "2026-09-03";

export type DadosCriarEmpresaEDono = {
  empresaId: string;
  nomeEmpresa: string;
  telefone: string | null;
  origemDeclarada: string | null;
  /** `gratuito` (cadastro comum) ou `pago` (item 13 — nasce direto
   * assinante, pelo link de reivindicação de pagamento). */
  plano: "gratuito" | "pago";
  /** Nula no gratuito — mesma restrição do banco (`empresa_plano_coerente`). */
  periodicidade: "mensal" | "anual" | null;
  statusAssinatura: "ativa" | "inadimplente" | "vencida" | "encerrada";
  /** Kiwify `subscription_id` — nulo no gratuito. */
  gatewayAssinanteId: string | null;
  /**
   * Duplo uso, os dois de propósito: vira o e-mail de login do Usuário dono
   * (abaixo) **e** o `Empresa.email` — o e-mail de contato que aparece no
   * cabeçalho do relatório (`docs/especificacao.md` §4.4, "Cabeçalho: ...
   * telefone e e-mail"). Junto de `telefone`, acima: os dois campos de
   * contato de quem cria a conta nascem copiados para a Empresa (corrigido
   * em 10/09/2026 — antes só `telefone` era copiado, `email` não).
   * `docs/especificacao.md`, seção "Cadastro", já dizia que o telefone "é o
   * contato para o cliente falar com a empresa, não é login" — mas essa
   * frase nunca foi espelhada para o e-mail, deixando a mesma pergunta
   * (o que este campo vira, dentro da Empresa) sem resposta escrita para o
   * segundo campo do mesmo formulário.
   * Motivo (decisão do fundador, 10/09/2026): no caso comum, quem cria a
   * conta é o dono da transportadora, e o contato dele é o contato dela —
   * nascer preenchido erra a favor de menos campo vazio no primeiro uso. A
   * pessoa corrige em Conta da empresa se um dia forem diferentes (segundo
   * sócio, telefone comercial próprio etc.). Os dois caminhos de entrada
   * (`cadastro.ts`, `pagamentos.ts`) já normalizam para minúsculo antes de
   * chegar aqui — esta função grava como recebe, sem normalizar de novo.
   */
  email: string;
  nomeDono: string;
  senha: string;
};

/**
 * Cria a Empresa (+ os quatro `TipoOperacao`) e o Usuário dono, na mesma
 * transação, com reversão se a segunda metade falhar — extraído de
 * `cadastro.ts` no item 13 (`docs/planos/item-13-assinatura.md`, Tarefa 1)
 * para servir aos dois caminhos de entrada do produto: o cadastro gratuito
 * (`cadastro.ts`, `criarConta`) e a conta que nasce de um pagamento já
 * feito (`pagamentos.ts`, `ativarAssinatura`). O mecanismo é o mesmo dos
 * dois — só o que entra em `plano`/`periodicidade`/`statusAssinatura`/
 * `gatewayAssinanteId` muda.
 *
 * SEM `"use server"` de propósito: isto não é uma ação que uma tela chama
 * direto — é reaproveitado por dentro de duas ações diferentes. Um arquivo
 * `"use server"` só pode exportar função assíncrona (Next.js), e as duas
 * ações que chamam esta função já são o ponto de entrada certo para
 * `tests/protecao-de-acoes.test.ts` varrer.
 */
export async function criarEmpresaEDono(
  dados: DadosCriarEmpresaEDono,
): Promise<{ usuarioId: string } | { erro: string }> {
  const ctx = await auth.$context;

  try {
    await emTransacao(dados.empresaId, async (tx) => {
      await tx.empresa.create({
        data: {
          id: dados.empresaId,
          nome_fantasia: dados.nomeEmpresa,
          telefone: dados.telefone,
          email: dados.email,
          origem_declarada: dados.origemDeclarada,
          termos_aceitos_em: new Date(),
          termos_versao: VERSAO_TERMOS_PUBLICADA,
          plano: dados.plano,
          periodicidade: dados.periodicidade,
          status_assinatura: dados.statusAssinatura,
          gateway_assinante_id: dados.gatewayAssinanteId,
        },
      });
      await criarTiposDeOperacaoIniciais(tx, dados.empresaId);
    });
  } catch (erroEmpresa) {
    // Nunca o objeto de erro cru: o `create` do Prisma pode ecoar de volta os
    // dados enviados (nome_fantasia, telefone, email) na mensagem de
    // validação — só nome do erro e o id gerado, nunca dado pessoal (§4).
    console.error(
      "[criarEmpresaEDono] falha ao criar empresa",
      dados.empresaId,
      erroEmpresa instanceof Error ? erroEmpresa.name : "erro desconhecido",
    );
    return { erro: "Não deu para criar a conta agora. Tenta de novo em instantes." };
  }

  try {
    const usuarioCriado = await criarUsuarioDono(ctx, {
      email: dados.email,
      nome: dados.nomeDono,
      empresaId: dados.empresaId,
      senha: dados.senha,
    });
    return { usuarioId: usuarioCriado.id };
  } catch (erroUsuario) {
    // A empresa nunca teve usuário: nunca existiu de verdade (CLAUDE.md §7).
    await reverterCadastroIncompleto(dados.empresaId).catch((erroLimpeza) => {
      console.error(
        "[criarEmpresaEDono] falha ao reverter empresa orfa",
        dados.empresaId,
        erroLimpeza instanceof Error ? erroLimpeza.name : "erro desconhecido",
      );
    });
    console.error(
      "[criarEmpresaEDono] falha ao criar usuario apos empresa",
      dados.empresaId,
      erroUsuario instanceof Error ? erroUsuario.name : "erro desconhecido",
    );
    return {
      erro: "Não deu para criar a conta agora. Tenta de novo — o que você já preencheu continua aqui.",
    };
  }
}
