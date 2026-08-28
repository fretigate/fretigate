/**
 * Escapa texto para entrar com segurança dentro de marcação HTML montada por
 * template string (`src/lib/documentos/`) — a proteção que o JSX/React dá de
 * graça para todo texto de criança, e que este projeto perde ao montar HTML
 * por concatenação. Todo campo que vem de dado do usuário (nome do cliente,
 * descrição de carga, chave Pix, razão social...) precisa passar por aqui
 * antes de entrar no molde do documento — sem isso, um nome de cliente com
 * `<`/`&` quebraria a estrutura do HTML e corromperia visualmente o PDF que
 * vai para o cliente de verdade.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
