# Plano — reduz a concorrência do teste de numeração de `Relatorio`

**Nota de processo.** Este arquivo foi escrito antes de editar
`tests/relatorios.test.ts`, mas sem uma aprovação separada do fundador entre
os dois passos — o pedido já veio com o número e o motivo definidos na
conversa. Mesmo assim é desvio da letra do `CLAUDE.md` §2 item 1 ("Plano
aprovado é commitado antes de a construção começar"), mesmo padrão que
`docs/planos/teto-de-tempo-no-teste-de-medicao-completa.md` e
`docs/planos/correcao-pool-esteira-vermelha.md` já registraram sobre si
mesmos. Achado do `/revisar`, aceito.

## O problema

`tests/relatorios.test.ts`, teste "concorrência: criações simultâneas da
mesma empresa nunca colidem no numero", reprovou a esteira no commit
`5fd6700` (28/08/2026, 21:21 UTC) com `PrismaClientKnownRequestError P2028`
— a mesma assinatura já vista no commit `36554ef`, **no mesmo dia**
(28/08/2026, 07:13 UTC — não "dois dias antes", erro de conta corrigido
depois do `/revisar`): "A commit cannot be executed on an expired
transaction" (limite de 5000ms da transação interativa do Prisma).

## A investigação

**Hipótese descartada: não é o mesmo caso de `tests/medicao-municipios.test.ts`
("2. medição completa", `docs/planos/teto-de-tempo-no-teste-de-medicao-completa.md`).**
Naquele caso o teste só falhava sob a esteira desacelerando (~3× o tempo
local, medido); rodando local, sozinho, nunca tinha falhado.

Cronômetro local (`npx tsx`, mesmo cenário do teste: 1 empresa, 1 cliente,
1 frete, N chamadas simultâneas de `criarRelatorio`, tempo individual do
início ao fim de cada uma):

| QUANTIDADE | Rodada | A chamada mais lenta da fila |
|---|---|---|
| 8 (atual) | 1 | 4.683ms — passou, sem folga |
| 8 (atual) | 2 | **5.478ms — reproduziu o erro de verdade, local, sem esteira** |
| 8 (atual) | 3 | 8.405ms — passou, bem acima do limite |
| 4 (proposto) | 1 a 5 | 2.318 / 2.468 / 2.549 / 2.403 / 2.543ms — estável, sem falha |

Reproduzir o erro **local, sozinho, sem nenhuma desaceleração de esteira**,
numa de três tentativas, é o dado que decide: a margem já não existe em
condição normal. Não é "margem apertada que a esteira aperta mais" — é fila
que já não cabe no teto sozinha.

**O mecanismo não foi identificado — e a primeira explicação escrita aqui
estava errada, achado do `/revisar`.** A primeira versão deste plano
afirmava que `criarRelatorio` faz duas conferências (`buscarCliente`,
`servico.findMany`) antes de entrar na fila, contra uma só
(`buscarUsuario`) do teste equivalente que nunca falha
(`tests/servicos.test.ts`, mesmo formato, mesma QUANTIDADE = 8) — e que essa
diferença explicava por que só este teste estourava. **Era o oposto,
confirmado lendo o código**: `criarServico` chama `buscarUsuario`
(`src/lib/servicos/servicos.ts:249`) e, dentro de `normalizarEntrada`,
`buscarCliente` (`:134`) e `buscarTipoOperacao` (`:140`) — **três**
consultas nesse caminho, com `dadosMinimos` do teste preenchendo os dois
campos obrigatórios. `criarRelatorio` faz **duas**
(`src/lib/servicos/relatorios.ts:111,114`). A explicação passou pelo
fundador e por Claude sem que nenhum dos dois abrisse o código para
confirmar; só o `/revisar` pegou, por ler o código sem o raciocínio que já
tinha convencido quem escreveu (`CLAUDE.md` §2, "explicação plausível não é
explicação verificada", 29/08/2026).

**O que fica, então, é só o dado medido:** com QUANTIDADE = 8 a fila estoura
o teto em condição local normal, 1 de 3 tentativas; com QUANTIDADE = 4, não
estoura em 5 de 5. O porquê deste teste especificamente — e não do
equivalente que nunca falhou, apesar de fazer mais consultas antes da fila —
continua sem explicação confirmada.

## Decisão do fundador

**Reduz a concorrência do teste — QUANTIDADE de 8 para 4 —, e não é tapar
sintoma.** O teste não existe para medir desempenho sob oito pedidos
simultâneos; existe para provar que a numeração sequencial não repete sob
concorrência (`CLAUDE.md` §3, "concorrência real"). Isso se prova com quatro
tão bem quanto com oito — se dois pedidos simultâneos pudessem gerar número
repetido, quatro já pegariam. A decisão não depende de saber o mecanismo: o
dado medido (8 falha, 4 não) já basta para escolher o número.

**Não muda o código de produto.** Tirar `buscarCliente`/`servico.findMany`
de antes da fila seria mudar `criarRelatorio` para um teste caber; as duas
conferências estão ali por decisão de segurança (`CLAUDE.md` §3), não por
acidente de desempenho.

**Ressalva, para não confundir depois:** a margem medida com QUANTIDADE = 4
(~2,3-2,5s contra o teto de 5s, ≈2×) é mais folgada que a de QUANTIDADE = 8,
mas **menor que o fator de desaceleração de esteira já medido (~3×)** — se
esse fator se aplicar também a este teste (ainda não confirmado; as duas
falhas reais observadas ficaram só ~1,2× acima do teto, não ~3×), uma
esteira muito ruim ainda poderia estourar. Não é motivo para não fazer a
correção agora — o problema medido e confirmado (fila sem margem nenhuma
local) está resolvido —, mas se isto voltar a acontecer depois da correção,
a causa é a desaceleração de esteira empilhada por cima, não a mesma causa
de novo, e pede tratamento igual ao de "2. medição completa" (teto próprio),
não reduzir a concorrência de novo.

## O que muda

1. `tests/relatorios.test.ts` — `QUANTIDADE` de 8 para 4 no teste de
   concorrência da numeração, com o dado medido escrito no comentário
   (mecanismo declarado como não identificado, hipótese descartada
   nomeada — não a explicação errada).
2. `CLAUDE.md` §2 — registra os três formatos distintos de "vermelho sem
   defeito de código" já vistos (pool esgotado, margem contra desaceleração,
   fila serializada longa demais), com a pergunta que separa um do outro; e
   registra, à parte, o padrão da explicação não verificada que este plano
   carregou na primeira versão.
3. `docs/diario.md` — entrada da sessão, e atualização das duas entradas de
   28/08/2026 que ainda diziam "esteira disparada, ainda rodando" sobre
   commits cujo resultado já é conhecido (`5fd6700`: failure; `ff6534c`:
   success) — `CLAUDE.md` §2 item 9.

## Verificação

1. `npx vitest run tests/relatorios.test.ts` local — verde.
2. `npm run lint`, `npx tsc --noEmit` local.
3. `/revisar` antes do commit — rodou, achou seis divergências (erro de
   transcrição do diff, mecanismo invertido, erro de data, duas entradas de
   diário desatualizadas, afirmação de proporção sem contagem, e este plano
   sem aprovação separada); corrigidas nesta versão.
4. Esteira: confirma no push, via `/onde-paramos` da próxima sessão.

## Arquivos

- `tests/relatorios.test.ts`
- `CLAUDE.md`
- `docs/diario.md`
- `docs/planos/reduz-concorrencia-teste-numeracao-relatorio.md` (este arquivo)
