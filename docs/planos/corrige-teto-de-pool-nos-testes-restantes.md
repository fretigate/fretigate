# Plano — aplica o teto de pool correto nos dois testes que faltavam

Pedido do fundador, depois de commitada a correção de
`tests/regressao-resolucao-municipios.test.ts`
(`docs/planos/correcao-pool-esteira-vermelha.md`): os outros dois arquivos
que criam `Servico` em paralelo — achados no mesmo levantamento, registrados
no diário mas não alterados — também estouram o pool, pela mesma conta (cada
`criarServico` pede **duas** conexões ao mesmo tempo, via `normalizarEntrada`
resolvendo origem e destino em paralelo).

## O que muda

- **`tests/medicao-municipios.test.ts`** — a função compartilhada
  `criarServicos(e, quantidade, extra)` (linha 76) passa a rodar em blocos
  de **cinco**, dentro da própria função, não em cada lugar que a chama.
  Isso protege as quatro chamadas de hoje (2, 10, 7, 3) **e** qualquer
  chamada futura com quantidade maior — o risco que a entrada do diário já
  tinha registrado como "reabriria a mesma classe sem nenhum aviso".
- **`tests/servicos.test.ts`** — o bloco inline de 8 criações simultâneas
  (linha 307) passa a rodar em blocos de cinco, mesmo padrão.

Nenhuma mudança de comportamento visível nos testes — mesmas asserções,
mesmos dados, só a forma de criar em paralelo.

## Por que blocos de cinco, não outro número

Mesma conta já usada em `tests/regressao-resolucao-municipios.test.ts`: o
pool tem dez conexões (`pg-pool`, padrão), cada `criarServico` usa até duas
ao mesmo tempo (`src/lib/servicos/servicos.ts:128-130`), então 5 × 2 = 10 é
o maior bloco que nunca estoura. Comentário citando essa conta entra nos
dois arquivos, no mesmo formato já usado no primeiro.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`.
2. `npm test` local (os dois arquivos, mais a suíte inteira — nada mais
   deveria mudar).
3. Push de verificação numa branch de teste, PR, esteira real confirmando
   antes do commit final (`CLAUDE.md` §2, item 9).
4. `/revisar` antes do commit.

## Arquivos

- `tests/medicao-municipios.test.ts`
- `tests/servicos.test.ts`
- `docs/diario.md`
