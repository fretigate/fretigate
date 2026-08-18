# Plano — a esteira vermelha por esgotamento de pool, e o buraco de processo

**Escrito DEPOIS da construção, não antes — divergência do `CLAUDE.md` §2,
item 1, achada pelo `/revisar` e aceita.** A sessão foi conduzida turno a
turno pelo fundador, em conversa ("investiga e me traz", "corrige o
defeito", "aplica o mesmo limite", "resolve o buraco de processo"), e nenhum
arquivo em `docs/planos/` foi aberto antes de eu começar a editar código.
Isso é exatamente o risco que a regra existe para evitar — decisão que só
vive na conversa não sobrevive à conversa — e este arquivo existe para
fechar essa lacuna agora, documentando o que foi decidido, não para fingir
que veio antes.

## Contexto

Ao verificar a tarefa 4 da auditoria (varredura de segredo) numa esteira de
verdade, `main` estava vermelho havia cinco commits (14 a 18/08/2026), sem
que nenhuma entrada do diário tivesse percebido — todas diziam "`npm test`
verdes", que era verificação local, contra um banco diferente do que a
esteira usa.

## Diagnóstico

Commit `89ec22e` (14/08/2026) introduziu
`tests/regressao-resolucao-municipios.test.ts`, cujo `beforeAll` cria 21
`Servico` em paralelo. O pool do driver (`pg-pool`, padrão do `PrismaPg`,
não sobrescrito em `src/lib/db/index.ts`) tem dez conexões — confirmado
lendo `node_modules/pg-pool/index.js`. Isso estourava o pool do **projeto de
teste** (não o de desenvolvimento, que é o que `npm test` local usa —
`CLAUDE.md` §5), gerando `P2028` em algumas chamadas; como `Promise.all`
rejeita na primeira falha sem cancelar as demais, uma chamada "órfã"
terminava depois do `afterAll` já ter limpado, e a inserção tardia violava a
chave estrangeira ao apagar o `Cliente` — os dois erros observados eram o
mesmo defeito, em duas fases.

## A correção, e o próprio erro que ela cometeu na primeira tentativa

Primeira versão: rodar as 21 criações em blocos de dez (mesmo número já
usado em `tests/isolamento/vazamento.test.ts`, "dez, e não vinte"). O
`/revisar` achou que essa conta estava errada: `criarServico` chama
`normalizarEntrada` (`src/lib/servicos/servicos.ts:128-130`), que resolve
origem e destino em paralelo, cada um seu próprio `db()` — cada
`criarServico` pede **duas** conexões ao mesmo tempo, não uma. Um bloco de
dez chamadas pedia até vinte conexões no pico, o mesmo estouro que o bloco
existia para evitar.

**Corrigido para blocos de cinco** — 5 × 2 = 10, a mesma margem do
precedente (dez chamadas de uma conexão cada). O motivo, os dois números
(dez do pool, dois por chamada) e a referência ao precedente ficam escritos
no comentário do código, não só aqui.

## Outros testes com o mesmo formato

Levantamento exaustivo (`grep` por `Promise.all`/`Array.from({ length` em
`tests/**`):

- `tests/medicao-municipios.test.ts` — usa a mesma função `criarServico`,
  então o mesmo fator de dois conexões por chamada se aplica; o maior uso
  pede exatamente dez chamadas (`criarServicos(e, 10, ...)`), ou seja, até
  **vinte** conexões no pico — no limite errado, pela mesma conta que
  corrigiu o arquivo acima. Não alterado nesta tarefa — decisão do
  fundador se corrige agora ou só quando o uso real mudar.
- `tests/servicos.test.ts` — 8 chamadas em paralelo × 2 = até 16 no pico —
  também acima do que a conta correta permite. Não alterado.
- `tests/titulos.test.ts` — 2 chamadas via `Promise.allSettled`, a função
  chamada (`criarTituloJaRecebi`) não passa por `normalizarEntrada`; sem
  risco.
- `tests/isolamento/vazamento.test.ts` — o precedente original, dez
  chamadas de UMA conexão cada (`db().empresa.findMany`, sem resolução de
  município); continua correto como está.

**Lacuna achada no mesmo levantamento, fora de `tests/`:**
`src/lib/servicos/medicao-municipios.ts:98` — `Promise.all` sem teto sobre
`textosUnicos.map(resolverMunicipio)`, em **código de produto**, usado por
`scripts/medir-municipios.mts` (ferramenta do operador, rodada sob demanda
contra uma empresa real). Se uma empresa real acumular muitos textos únicos
não resolvidos, o mesmo esgotamento pode acontecer contra o banco que a
ferramenta apontar. Não é a mesma urgência (ferramenta manual, não
automática), e não foi corrigido — fica registrado para o fundador decidir.

## O buraco de processo

Três opções trazidas, com custo de cada uma:

- **A — leve:** `/onde-paramos` confere o status real da esteira (`gh run
  list`), não só diário e `git log`.
- **B — média:** o fechamento de tarefa espera e afirma o resultado real da
  esteira antes de declarar concluído.
- **C — pesada:** branch protection no GitHub, exigindo o check passar
  antes de qualquer coisa entrar em `main`.

Decisão do fundador: **B agora**, **C depois do lançamento do MVP** — as
duas escritas no `CLAUDE.md` (§2, item 9 novo, e §14).

## Verificação

1. `npm run lint`, `npx tsc --noEmit`, `npm test` (arquivo isolado) — local.
2. Push de verificação, numa branch de teste com PR (a esteira só ouve
   `push`/`pull_request` para `main` — push direto não aciona nada),
   confirmando que a esteira de verdade passa. Branch apagada depois.
3. `/revisar`, dois passes — o segundo achou o erro de conta (dez → vinte)
   e as lacunas de formatação/processo acima, todas corrigidas antes deste
   commit.

## Arquivos

- `tests/regressao-resolucao-municipios.test.ts`
- `CLAUDE.md` (§2: regra "suíte verde" ≠ "esteira verde", item 9 novo,
  item 10 renumerado; §14: branch protection pós-MVP)
- `docs/diario.md`
- Este arquivo, escrito depois — ver a nota no topo.
