# Margem pequena no teste do teto de relatório em `listarCobrancas`

Investigação da segunda pista da causa raiz reaberta (`CLAUDE.md` §2) — o
teste `tests/cobrancas.test.ts > 4. listarCobrancas... > teto de 3 não corta
um relatório de 5 fretes ao meio` falhou duas vezes seguidas na esteira
(`1ce8ac8`, 29/08/2026, e `9f01d69`, 30/08/2026), sempre no mesmo teste
exato, sempre por `Test timed out in 30000ms`.

## Medição, antes de decidir qualquer correção

**Local, três rodadas isoladas** (`npx vitest run tests/cobrancas.test.ts -t
"teto de 3 não corta"`, banco de desenvolvimento):

| Rodada | Duração |
|---|---|
| 1 | 14.273ms |
| 2 | 13.541ms |
| 3 | 13.825ms |

Média ≈ 13.880ms. Margem local contra o teto de 30.000ms: **≈2,16×**.

**Esteira, medido direto — não inferido.** O commit `c5e2e92` (29/08/2026,
`gh run 33276818405`) é a última execução em que este teste **passou** na
esteira, e o log completo imprime a duração de cada teste do arquivo. Este
teste levou **29.273ms** — passou por **727ms**, 2,4% de folga contra o teto
de 30.000ms.

**Comparado aos vizinhos, no mesmo run, no mesmo arquivo.** O reporter do
Vitest só imprime a duração individual de teste que passa de um certo
limiar — por isso a lista abaixo tem só os 21 testes (de 37) que aparecem
com tempo próprio no log; os outros 16 não têm duração própria registrada, só
entram no total do arquivo:

| Teste | Duração (esteira, `c5e2e92`) |
|---|---|
| **teto de 3 não corta um relatório de 5 fretes ao meio** | **29.273ms** |
| o número é sempre igual ao que a lista de Fretes mostra em A faturar | 15.869ms — o 2º mais lento com duração própria no log |
| em Recebidas, três títulos com datas de recebimento diferentes... | 10.876ms |
| resumoDeCobrancas, resumoFinanceiroDoCliente e valorEmAbertoPorCliente concordam | 10.546ms |
| título cancelado devolve o frete à conta; arquivado sai dela | 9.239ms |
| (demais 16 testes com duração própria no log) | entre 3.947ms e 8.780ms |

Nenhum outro teste com duração própria passa de 16 segundos — este é quase
o dobro do segundo colocado (29.273 contra 15.869). Não afirmo posição
contra os 16 testes sem duração própria no log, por não ter o número de
cada um.

## Causa, lida no código — não suposta

`listarCobrancas` (`src/lib/servicos/cobrancas.ts:206-350`), no ramo "em
aberto": busca a página (1 consulta) e, quando algum título trazido pertence
a um `relatorio_id`, roda `completarGruposDeRelatorio` — **uma segunda
consulta**, sem teto, para trazer o resto do grupo
(`src/lib/servicos/cobrancas.ts:186-204`, comentário: "achado do `/revisar`
na Tarefa 3 do item 7, segundo commit — o teto corta títulos individuais,
sem saber que compartilham `relatorio_id`"). Mais uma consulta de
`totalRecebidoPorTitulo` fecha em três consultas sequenciais para este
caminho.

Mas a consulta extra sozinha não explica a diferença contra os vizinhos.
**A comparação certa não é "produção contra SQL direto" no frete** — os
vizinhos também criam o frete pelo caminho de produção
(`criarFrete`→`criarServico`, `tests/cobrancas.test.ts:93-103`); só o
**título** costuma ser plantado direto por SQL (`plantarTitulo`,
`tests/cobrancas.test.ts:105-113`). O que este teste faz diferente:

- **5 títulos pelo caminho de produção completo** (`marcarServicoFinalizado`
  + `faturarServico`, cada um com validação e consulta própria) em vez do
  `plantarTitulo` que a maioria dos vizinhos usa para o título — a maioria
  dos vizinhos planta 1 a 3 títulos, este planta 5, e nenhum deles pelo
  caminho curto.
- **Um `criarRelatorio` de verdade** (`src/lib/servicos/relatorios.ts:154`),
  que nenhum vizinho do mesmo `describe` chama — busca o cliente, busca os
  serviços, e roda dentro de uma transação que inclui o incremento
  sequencial de `Empresa.proximo_numero_relatorio`, a mesma operação de
  numeração já catalogada como serializada/cara em
  `docs/planos/reduz-concorrencia-teste-numeracao-relatorio.md` — aqui sem
  concorrência (é uma criação só), mas ainda assim mais uma transação
  completa na soma.
- **A consulta extra da completude**, acima.

A soma de tudo isso — não um fator isolado — é o que aparece na medição.

**Parente do formato "margem contra desaceleração" do `CLAUDE.md` §2 — mas
não o mesmo caso, e a distinção importa.** Em
`tests/medicao-municipios.test.ts`, "2. medição completa" (21/08/2026), a
margem **local** já era pequena (2,6×, nos termos do próprio catálogo) —
mas suficiente para nunca falhar sozinho; só a desaceleração da esteira
(≈3×) estourava o teto. Aqui é diferente: **29.273ms já foi medido na
própria esteira, num run que passou** — o teste não tem margem nem em
condição normal da esteira, 2,4% de folga contra um teto de 30s. Não é
"esteira lenta demais para este teste"; é "este teste já está no limite
mesmo quando a esteira se comporta normalmente". A causa de fundo é a
mesma família (um teste que faz mais trabalho sequencial que todo o resto
do arquivo), mas o diagnóstico do `medicao-municipios` — falha só sob
desaceleração, nunca sozinho — não descreve este caso.

## Opções de correção, com precedente

**A — sobe o teto só deste teste**, como `tests/medicao-municipios.test.ts`
fez (`TIMEOUT_MEDICAO_COMPLETA`, 60s, comentário registrando o número e o
porquê) — mesmo mecanismo de correção, **não** a mesma leitura de margem
(ver acima). 60s dá folga real contra os 29,3s já medidos na própria
esteira (mais de 2× o valor medido, não uma projeção por fator). Não mexe
no `testTimeout` global, os outros testes continuam sentinela real de
travamento.

**Registrado, para não reabrir a investigação do zero se voltar a
estourar:** 60s resolve **hoje**. Este teste já é quase o dobro do segundo
teste mais lento do arquivo com duração própria (29,3s contra 15,9s) — se
ele crescer mais (mais fretes, mais consultas no caminho que testa) e
voltar a estourar mesmo com 60s, a causa não é falta de margem — é o teste
fazendo trabalho demais, e a resposta é revisar o que ele faz, não subir o
teto de novo.

**B — reduz o trabalho do teste**, como a correção da numeração de
`Relatorio` fez (QUANTIDADE de 8 para 4). Aqui seria trocar parte dos 5
títulos plantados por `faturarServico` (caminho de produção) por
`plantarTitulo` (SQL direto) sempre que o teste não precisar do caminho de
produção para provar o que prova — mas o teste existe justamente para
provar que **`faturarServico`** grava `relatorio_id` corretamente e que o
teto some por título, não por frete; trocar os plantios por SQL direto
enfraqueceria exatamente o que o teste prova. Essa opção pesa menos aqui do
que pesou no caso da numeração (lá, reduzir concorrência não tirava nada do
que o teste provava).

**Decisão do fundador: opção A.** B enfraqueceria exatamente o que o teste
prova; A não mexe na garantia, só no teto.

## O que este plano não faz

- Não mexe em nenhum outro teste do arquivo.
- Não mexe em código de produto (`src/lib/servicos/cobrancas.ts`) — a
  consulta extra da completude é comportamento correto e recente (achado do
  `/revisar` da Tarefa 3 do item 7), não o alvo desta correção.
- Não dispara rerun de nada.

## Verificação

- `npx tsc --noEmit`, `npm run lint`: limpos.
- `npx vitest run tests/cobrancas.test.ts -t "teto de 3 não corta"`: 1/1,
  13.584ms (dentro do teto novo de 60.000ms, folga confortável).
- `npx vitest run tests/cobrancas.test.ts` (arquivo inteiro): 37/37 — nada
  quebrou fora do teste alvo.
- **Esteira: a confirmar no próximo `/onde-paramos`** — é o ambiente onde o
  problema apareceu de fato.
