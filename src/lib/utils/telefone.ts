/**
 * Telefone de `Cliente`/`Motorista` — normaliza, valida e monta o link do
 * WhatsApp. Função pura, sem banco — mesmo padrão de `caminhao.ts`: precisa
 * ser segura para um componente `"use client"` importar sem puxar `pg` para
 * o navegador.
 *
 * O que já está salvo hoje é texto livre, sem máscara nem validação
 * (`docs/especificacao.md` §9, "Três exigências..."). `normalizarTelefone`
 * lida com esse texto exatamente como lida com o que vier de um campo novo —
 * ela sempre extrai só os dígitos antes de validar, então não importa se o
 * texto de entrada tem parênteses, traço, espaço, ou nenhum deles.
 */

export type ResultadoTelefone = { ok: true; digitos: string } | { ok: false; erro: string };

/** Resultado de gravar o telefone (`FolhaDeTelefone`/ações de servidor) — sem `digitos`, só se salvou ou não. */
export type ResultadoSalvarTelefone = { ok: true } | { ok: false; erro: string };

const DDI_BRASIL = "55";

/**
 * Regra escrita em `docs/componentes.md` §12, tabela de validação da "Folha
 * do campo que falta": 10 ou 11 dígitos com DDD; DDD (dois primeiros
 * dígitos) ≥ 11 — não existe DDD de 00 a 10 no Brasil. As três mensagens são
 * as três já definidas ali, nenhuma quarta inventada aqui.
 */
export function normalizarTelefone(bruto: string): ResultadoTelefone {
  const digitos = bruto.replace(/\D/g, "");

  if (digitos.length < 10) {
    return { ok: false, erro: "Faltam dígitos. Com DDD são 10 ou 11." };
  }
  if (digitos.length > 11) {
    return { ok: false, erro: "Número comprido demais…" };
  }
  if (Number(digitos.slice(0, 2)) < 11) {
    return { ok: false, erro: "Esse DDD não existe." };
  }
  return { ok: true, digitos };
}

/**
 * `https://wa.me/55{digitos}` — DDI fixo em 55, nunca perguntado (produto é
 * só Brasil, `CLAUDE.md` §1/§12). Sem `texto`, é só "chamar" (telefone
 * tocável do perfil); com `texto`, abre a conversa já com a mensagem pronta
 * (Enviar ordem, item 5 Tarefa 2 · Cobrar no WhatsApp, item 6).
 */
export function linkWhatsapp(digitos: string, texto?: string): string {
  const base = `https://wa.me/${DDI_BRASIL}${digitos}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}
