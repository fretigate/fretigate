/**
 * Normalização de texto para busca.
 *
 * ESTA FUNÇÃO É ÚNICA DE PROPÓSITO. Ela escreve a coluna `nome_normalizado` de
 * `municipio` (pela seed) **e** trata o que o usuário digita na busca. É essa
 * unicidade que garante que os dois lados casem: duas normalizações parecidas,
 * escritas em lugares diferentes, divergem no primeiro caso torto — e o defeito
 * aparece como "o município existe mas não aparece na busca", que é dos mais
 * caros de diagnosticar.
 *
 * Se um dia a regra mudar, ela muda aqui e a seed roda de novo. Nunca só de um
 * lado.
 */

/**
 * As marcas de acento que o NFD deixa soltas.
 *
 * `\p{Mn}` é a categoria do próprio Unicode ("marca que não ocupa espaço"), e
 * não um intervalo de códigos escrito à mão. Os dois funcionam; este se lê, e
 * o outro obrigaria a colar caracteres invisíveis dentro do código — ninguém
 * revisa o que não enxerga.
 */
const MARCAS_DE_ACENTO = /\p{Mn}/gu;

/** Tudo que não é letra sem acento nem número. */
const NAO_ALFANUMERICO = /[^a-z0-9]+/g;

/**
 * Minúsculo, sem acento, sem pontuação, com um espaço entre palavras.
 *
 *   "Alta Floresta D'Oeste"  ->  "alta floresta d oeste"
 *   "Mogi-Guaçu"             ->  "mogi guacu"
 *   "  SÃO   PAULO  "        ->  "sao paulo"
 *
 * A pontuação vira espaço, e não nada: colar as palavras faria "Mogi-Guaçu"
 * virar "mogiguacu", que ninguém digita.
 */
export function normalizarParaBusca(texto: string): string {
  return (
    texto
      // NFD separa a letra do acento: "á" vira "a" seguido da marca de acento.
      .normalize("NFD")
      .toLowerCase()
      // E aqui a marca solta é descartada.
      .replace(MARCAS_DE_ACENTO, "")
      .replace(NAO_ALFANUMERICO, " ")
      .trim()
  );
}
