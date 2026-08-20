# Plano — teto de tempo próprio no teste "2. medição completa"

**Escrito depois da construção, não antes.** A investigação e a aprovação do
número aconteceram na própria conversa que motivou a correção — plano
retroativo, contra a letra de `CLAUDE.md` §2 item 1 ("Plano antes de código,
sempre"), achado pelo `/revisar`. Registrado aqui para o arquivo existir, não
para justificar a ordem.

## O problema

`tests/medicao-municipios.test.ts`, teste "2. medição completa", reprovou a
esteira três vezes em quatro envios desde a correção de concorrência de
18/08 (`cb6834e`) — commits `e183de5`, `e5fd7dc`, `c0a5773` — sempre com
`Test timed out in 30000ms`, sempre no mesmo bloco. Um desses vermelhos
(`e183de5`) ficou um dia inteiro sem ninguém ver, porque nenhum commit
seguinte apontava para ele (achado à parte, corrigido em
`.claude/commands/onde-paramos.md` no mesmo commit desta correção).

## A investigação

Cronômetro local (`npx vitest run tests/medicao-municipios.test.ts
--reporter=verbose`) contra os tempos individuais da esteira ruim do dia
(`c0a5773`, que imprime cada teste separado):

| Teste | Local | Esteira (run ruim) | Fator |
|---|---|---|---|
| 1. abaixo do piso | 2,9s | 8,7s | ≈3,0× |
| 2. medição completa | 11,7s | estourou em 30,0s | ≥2,6× |
| 3. mais de dez textos únicos | 7,1s | 20,5s | ≈2,9× |

Os três testes desaceleram pelo mesmo fator (≈2,9-3,0×) numa esteira ruim —
não é "2. medição completa" reagindo diferente do resto. A diferença é a
margem: é o teste mais pesado do arquivo (21 criações de `Servico`, cada uma
com resolução de município), com folga local de só 2,6× sobre o
`testTimeout` global de 30s — menor que o próprio fator de desaceleração já
observado. Os outros dois têm margem de 4,2× e 10,4×, e por isso nunca
estouraram sob o mesmo fator.

**O que esta investigação prova, e o que não prova.** Prova por que ESTE
teste é o único do arquivo que estoura: margem menor que o fator de
desaceleração. **Não prova por que a esteira desacelera ≈3×** — essa causa
continua sendo a "suspeita de comportamento do pooler de transação do
Supabase", não confirmada desde 18/08 (`docs/diario.md`). Corrigir a margem
deste teste resolve o sintoma que a proporção de reruns mediu; não fecha a
pergunta da causa raiz.

## O que muda

`tests/medicao-municipios.test.ts` ganha uma constante
`TIMEOUT_MEDICAO_COMPLETA = 60_000` e passa como terceiro argumento só do
`it()` de "2. medição completa" — não no `testTimeout` global do
`vitest.config.mts`, que continua em 30s para todo o resto, como sentinela
real de travamento. Comentário no código explica o número (baseline local,
fator de desaceleração medido, margem escolhida) e deixa escrito que um novo
estouro com 60s é regressão de desempenho, não falta de margem — não deve
virar motivo para aumentar o número de novo sem investigar.

## Decisão do fundador sobre a causa raiz

Aceito o teto de 60s como correção do sintoma, com a contagem de reruns
reiniciando a partir deste commit (`CLAUDE.md` §2). Se a proporção voltar a
passar de 1 em 3 mesmo com os 60s, a causa é outra — a hipótese do pooler
não se confirma só porque este teste parou de estourar, e a investigação da
causa raiz abre então.

## Verificação

1. `npx vitest run tests/medicao-municipios.test.ts` local — 4/4.
2. `npm run lint`, `npx tsc --noEmit` local.
3. `/revisar` antes do commit.
4. Esteira: confirma no push, via `/onde-paramos` da próxima sessão.

## Arquivos

- `tests/medicao-municipios.test.ts`
- `docs/diario.md`
- `.claude/commands/onde-paramos.md` (correção relacionada, mesmo commit)
- `CLAUDE.md` (convenção de rerun, mesmo commit)
