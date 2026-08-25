// Alias de `server-only` para o Vitest — o pacote de verdade lança sempre que
// é importado fora do processo de build do Next.js (é o webpack quem troca
// o pacote real por um no-op quando compila para o SERVIDOR, e mantém a
// versão que lança quando compila para o navegador). O Vitest não passa pelo
// webpack, então sem este alias `import "server-only"` derrubaria QUALQUER
// teste que importasse `src/lib/servicos/comprovantes.ts`, mesmo rodando em
// Node — o mesmo lado (servidor) que a versão real deixaria passar.
//
// Vitest é sempre o lado servidor deste código (nunca compila para o
// navegador), então este stub reproduz exatamente o comportamento que o
// Next.js já dá em produção nesse mesmo lado — não afrouxa a garantia, só
// não a testa aqui (quem testa o lado navegador é `npm run build`, que usa o
// pacote de verdade).
export {};
