# Investiga causa raiz da instabilidade: conexão única de longa duração em `titulos.test.ts`

Plano de investigação, não de tarefa do produto — reabre a causa raiz da
instabilidade catalogada no `CLAUDE.md` §2, a pedido do fundador, depois da
janela recente (2 vermelhos em 5 envios, 28-29/08) ter cruzado o 1 em 3. O
denominador e o numerador vêm de `gh run list --branch main --json
headSha,conclusion,status` no período — nunca de `git log`, pelo motivo já
registrado no `CLAUDE.md` §2 ("'Envio' é execução que de fato rodou").

**O sintoma da falha que motivou este plano é o quinto formato do catálogo
do `CLAUDE.md` §2 — não os quatro já existentes.** `titulos.test.ts` e
`cobrancas.test.ts` (commit `1ce8ac8`, 29/08/2026) reprovaram com `Error:
Test timed out in 30000ms`, sozinho — nem `P2028` (a assinatura dos formatos
1 e 3), nem `ECONNRESET`/"Connection terminated" (a assinatura do formato
4). Sem mensagem de baixo nível, a árvore de decisão do §2 não se aplica —
aplicá-la mesmo assim seria escolher a correção por analogia falsa. Este
plano é o primeiro dos dois caminhos que a medição abriu para esse sintoma
mudo (o outro é `docs/planos/margem-teste-teto-cobrancas.md`).

## O que já está medido, antes deste plano

- **O padrão.** Conferido por conta própria depois de a primeira contagem
  (13) e a correção do revisor (17) terem ficado incompletas: são **19 dos
  31** arquivos de teste que abrem um `Client` bruto do Postgres (`raiz` ou
  equivalente) e o mantêm aberto por muitos testes seguidos, não por teste —
  13 com o padrão `beforeAll`/`afterAll`, mais seis em `tests/isolamento/`
  (dois dos quais, `privilegios.test.ts` e `schema.test.ts`, abrem a conexão
  direto no topo do módulo em vez de em `beforeAll` — mesma exposição,
  forma diferente).
- **A correlação, por duração medida — não por contagem de teste.** A
  contagem de teste era um substituto imperfeito; a esteira do commit
  `1ce8ac8` imprime a duração real de cada arquivo, e é ela que decide:

  | Arquivo | Testes | Conexão aberta por |
  |---|---|---|
  | `titulos.test.ts` | 92 | **1165,7s (19min26s)** — travou |
  | `relatorios.test.ts` | 46 | 454,4s (7min34s) |
  | `servicos.test.ts` | 53 | 439,7s (7min20s) |
  | `cobrancas.test.ts` | 37 | 261,9s (4min22s) — travou |
  | *(salto de 4×)* | | |
  | `medicao-municipios.test.ts` — o 5º colocado | 4 | 65,2s |
  | *(os outros 14 arquivos do grupo de 19)* | — | entre 0,4s e 38,9s |

  Os quatro que já falharam continuam sendo, com folga, os quatro de maior
  duração — e o salto para o 5º colocado (4×) é maior que qualquer salto
  dentro dos quatro. `titulos.test.ts` sozinho passa de 2,6× o segundo
  colocado.
- **O crescimento.** `titulos.test.ts` tinha 8 testes em 20/08/2026 (commit
  `a28263f`, quando o teto de 60s foi calibrado) e tem 92 hoje — 11,5×.
  `cobrancas.test.ts` e `relatorios.test.ts` nem existiam naquela data.
- **A ressalva, medida e não escondida.** `cobrancas.test.ts`, a segunda
  falha do mesmo run, teve a conexão aberta só ~262s — bem menos que
  `titulos.test.ts`. Isso não bate perfeitamente com "duração acumulada" como
  único mecanismo — e de fato **não é o mesmo mecanismo**: medido depois (ver
  `docs/planos/margem-teste-teto-cobrancas.md`), a causa de `cobrancas.test.ts`
  era margem real do teste específico contra o próprio teto, não a duração da
  conexão do arquivo. É por isso que o sintoma mudo (achado acima) importa:
  o mesmo `Error: Test timed out` cobriu dois mecanismos diferentes, e só a
  medição de cada um, separada, revelou qual era qual.

## Hipótese a testar

A conexão `raiz` única, aberta por todo o arquivo, fica exposta tempo demais
em arquivos grandes — e algo do lado do Supabase (limite de ociosidade da
conexão direta, reciclagem de conexão) a derruba ou trava depois de um
tempo. Quebrar essa conexão em pedaços menores reduz a exposição sem reduzir
a cobertura do teste.

## O que muda — só em `titulos.test.ts`, o maior

- Remove o `beforeAll`/`afterAll` únicos que hoje abrem/fecham `raiz` para o
  arquivo inteiro (`tests/titulos.test.ts:231-285`).
- Cada um dos **17** blocos `describe` de nível superior que usam `raiz`
  ganha seu próprio `beforeAll`/`afterAll`, abrindo e fechando uma conexão
  só para aquele bloco — o 18º bloco do arquivo, `describe("cobertura")`,
  não usa `raiz` (só confere o contador de conferências) e não ganha nada.
- `criarEmpresaDeTeste` e `plantarTitulo` (funções de módulo que hoje
  fecham sobre o `raiz` de nível de arquivo) continuam lendo a mesma
  variável `let raiz` de módulo — sem mudar assinatura, só passam a apontar
  para a conexão do bloco corrente.
- A limpeza final (as dez tabelas em cascata, hoje no `afterAll` de arquivo)
  muda de lugar: roda no `afterAll` do último bloco, ou abre uma conexão
  dedicada e curta só para essa limpeza — decisão de implementação a
  confirmar durante a construção, para não depender de nenhum bloco
  anterior ainda estar de pé.

**Não mexe nos outros 18 arquivos com o mesmo padrão.** Este é o teste da
hipótese num arquivo só — estender aos outros é decisão separada, depois de
confirmar aqui.

## O que este plano explicitamente não faz

- **Não quebra `titulos.test.ts` em arquivos menores.** Isso reduziria a
  duração de cada arquivo individual e esconderia o sintoma (menos
  exposição por arquivo, por acidente de divisão) sem provar ou derrubar a
  hipótese — e a suíte continua crescendo até o próximo arquivo grande
  estourar. Instrução explícita do fundador.
- Não mexe em código de produto.
- Não reduz cobertura: o número de testes e de `it()` continua o mesmo,
  só a forma de abrir/fechar a conexão muda.

## Medição

1. **Duração hoje** — já medida acima pela esteira do `1ce8ac8` (1165,7s).
   Complementa com uma medição local isolada (`npx vitest run
   tests/titulos.test.ts`, cronometrada) como segundo ponto de referência,
   já que local e esteira têm latências diferentes (fator ≈3× já
   documentado).
2. **Se o Supabase tem limite de ociosidade configurável** — verificar no
   painel dos dois projetos (desenvolvimento e teste): Database → Connection
   pooling / Settings. Complementa com consulta direta
   (`SHOW idle_in_transaction_session_timeout;` e equivalentes) onde for
   possível. Registra o valor encontrado — ou a ausência de um limite
   visível — sem supor um número.
3. **Depois da mudança** — roda `titulos.test.ts` isolado, localmente,
   repetidas vezes (pelo menos 5) e conta quantas passam limpo. Não é prova
   definitiva (a maioria das execuções já passa hoje, o defeito é
   intermitente), mas é o sinal direcional possível de medir sem esperar a
   esteira.
4. **O próximo envio real** também mede — é o ambiente onde o problema
   apareceu de fato.

## Medição do item 2, feita antes de construir — resultado

Consultado via MCP do Supabase, que só alcança o projeto de **desenvolvimento**
(`ysldmzvszjxdgcbtaurh`) — não o de **teste** (`qutzsvrkaqvpluqxbhmp`), o que a
esteira usa de verdade. Sem credencial para consultar o de teste direto nesta
sessão; a diferença fica registrada como limite da medição, não escondida.

| Parâmetro | Valor (projeto de desenvolvimento) |
|---|---|
| `idle_in_transaction_session_timeout` | `0` — desligado, Postgres não derruba transação ociosa |
| `statement_timeout` | 2 minutos — bem acima dos 30s que travaram, não é o mecanismo |
| `tcp_keepalives_idle` | 1800s (30min) |
| `tcp_keepalives_interval` × `tcp_keepalives_count` | 60s × 9 = mais 9min depois disso |

Nada bate perto de 15-20 minutos. Pela documentação do Supabase consultada,
não há política pública de "conexão direta cai depois de N minutos de
ociosidade" documentada — o texto sobre auto-pause é de branch de preview,
não do projeto principal. **O atalho que economizaria a mudança não se
confirma** — nada configurável, do lado que consegui medir, explica um corte
por volta dos 19 minutos.

**Decisão registrada:** segue para o experimento empírico abaixo mesmo sem
medir o projeto de teste — a lacuna (falta de credencial nesta sessão para
`qutzsvrkaqvpluqxbhmp`) fica aceita, não resolvida. Se um dia a medição do
projeto de teste ficar possível e mostrar um limite que bata com os ~19
minutos, isso muda a explicação (aponta para configuração, não para o
código do teste) sem mudar o resultado prático já obtido aqui.

## Critério de decisão

- **Parou de travar** (rodadas locais e o próximo envio) — hipótese
  sobrevive. Decisão seguinte, separada e não incluída aqui: estender o
  mesmo padrão aos outros 18 arquivos.
- **Continuou travando do mesmo jeito** — hipótese cai. A causa não é a
  duração da conexão; a investigação volta à estaca zero. Não força a
  mudança a "parecer" ter funcionado.
- **O item 2 encontrar um limite de ociosidade concreto, e ele bater com os
  ~19 minutos medidos** — isso pesa a favor da hipótese mesmo antes do teste
  empírico, e pode apontar para uma correção fora do teste (por exemplo,
  keepalive na conexão, ou configuração do lado do Supabase), não
  necessariamente a reestruturação do arquivo.

## Verificação

- `npx tsc --noEmit`, `npm run lint` limpos.
- `titulos.test.ts` isolado continua com a mesma contagem de testes e de
  conferências do `CLAUDE.md` §3 item 4 — sem queda.
- Não roda a suíte inteira antes de confirmar local isolado.

### Resultado — local, quatro rodadas seguidas, `npx vitest run tests/titulos.test.ts`

`npx tsc --noEmit` e `npm run lint` limpos, uma vez, antes da primeira
rodada — não repetidos a cada rodada, porque o código não muda entre elas.

| Rodada | Resultado | Duração |
|---|---|---|
| 1 | 92/92 | 368,3s |
| 2 | 92/92 | 352,8s |
| 3 | 92/92 | 355,2s |
| 4 | 92/92 | 352,4s |

Quatro rodadas limpas, contra o banco de **desenvolvimento** — não é prova
definitiva (o defeito já era intermitente, e a maioria das execuções
passava mesmo antes da mudança), mas é o sinal direcional possível de medir
sem esperar a esteira, exatamente como o critério pedia.

**Mais lento que o baseline antigo do mesmo arquivo, e é esperado.** O
`CLAUDE.md` §2 (quarto formato do catálogo) registra ~160s como o normal do
arquivo isolado, na versão de uma conexão só. As quatro rodadas acima saem
em ~352-368s, quase 2,2× mais — não é sintoma de problema novo: a versão
nova abre e fecha 17 conexões em vez de 1, cada uma com uma ida e volta de
rede até o Supabase de desenvolvimento antes do primeiro teste do bloco
rodar. É o custo esperado da própria mudança, não desaceleração.

**Ainda sem confirmação real da esteira** — o próximo envio é quem mede de
verdade. Só depois disso a hipótese está confirmada ou derrubada.

## Pendências registradas

- Se a hipótese cair, o próximo passo volta a ser decisão do fundador, não
  suposição.
- `9f01d69` terminou (`failure`, mesmo teste de `cobrancas.test.ts` — ver
  `docs/planos/margem-teste-teto-cobrancas.md`) antes deste plano ser
  commitado. Nenhum rerun de `1ce8ac8` foi disparado nesta sessão.
- **Desvio de processo, registrado, não escondido:** este plano foi escrito
  e aprovado no chat antes da construção, mas **não foi commitado como
  passo próprio antes dela começar**, como o `CLAUDE.md` §2 pede — construção
  e plano fecham no mesmo commit. Não dá para corrigir a ordem
  retroativamente; fica registrado para não repetir.

## Decisão do fundador, 30/08/2026: não estende agora

A esteira confirmou o commit `2f57719` verde — a hipótese sobrevive. Mesmo
assim, decisão de **não estender** o padrão de conexão por bloco aos outros
18 arquivos de teste agora.

**Critério, não suposição:** a evidência que sustenta a mudança em
`titulos.test.ts` é **duração de conexão**, não "todo arquivo de teste corre
o mesmo risco". Os quatro arquivos que já falharam por instabilidade neste
período são, com folga, os quatro de maior duração de conexão aberta da
suíte — salto de **~4×** entre o quarto colocado e o quinto (medido nesta
mesma investigação, "O que já está medido, antes deste plano", acima).
Estender a mudança aos outros catorze arquivos protegeria contra um risco
que a medição não mostra que eles têm, e tem custo real e já medido: a
própria reestruturação deixou `titulos.test.ts` ~2,2× mais lento (352-368s
contra ~160s do baseline de uma conexão só, "Resultado — local", acima).

**Registrado como critério de entrada na conversa, não como regra
automática:** arquivo de teste cuja conexão de longa duração passa de **uns
250 segundos** entra na conversa para o mesmo tratamento (medir, decidir se
reestrutura). Hoje isso deixa `relatorios.test.ts`, `servicos.test.ts` e
`cobrancas.test.ts` como candidatos — quando (e se) a duração deles crescer
até essa faixa, não antes. Os outros catorze ficam de fora até chegarem lá.
O número é heurística de observação, no mesmo espírito do limiar de
`sugerirRelatorio` (item 8) — ajustável se a experiência mostrar que está
alto ou baixo demais, não regra de negócio travada.

## Segunda rodada — 01/09/2026: a hipótese de conexão por bloco cai de vez

Motivo de reabrir: proporção de vermelhos passou de 1 em 3 (`CLAUDE.md` §2)
para **3 em 5** entre 29 e 31/08 (`1ce8ac8` falha, `9f01d69` falha,
`2f57719` sucesso, `2f91a9c` falha, `d59a8b7` sucesso) — e `2f91a9c` estourou
**depois** do conserto de conexão por bloco já estar no código, no mesmo
arquivo que o conserto mudou. Duas evidências já registradas acima
descartavam a hipótese; decisão do fundador foi investigar agora, antes da
Tarefa 3 do item 10, em vez de deixar a suíte crescer mais em cima do
problema não resolvido.

### O que mudou desde 29/08 — medido, não suposto

Denominador de `gh run list --branch main --json headSha,conclusion,status`
no período, mesmo critério do `CLAUDE.md` §2 ("Envio é execução que de fato
rodou"). Cinco envios completos entram na tabela; dois do mesmo período
ficam de fora, cada um por um motivo próprio, registrado para a tabela
poder ser reconferida sem depender de outra entrada do diário:

- `765ed02` (30/08) — **excluído**: `cancelled`, cancelamento de rotina
  (`2f91a9c`, o push seguinte, superou-o antes de terminar —
  `concurrency: cancel-in-progress`, `CLAUDE.md` §2). Nunca chegou a
  concluir, não é "sucesso" nem "falha".
- `9e32173` (31/08, HEAD no momento desta investigação) — **excluído**:
  ainda `in_progress` quando esta tabela foi montada, sem `conclusion`
  final. Entra na próxima contagem quando resolver.

| Envio | Arquivos/testes | Duração total | `titulos.test.ts` | `cobrancas.test.ts` |
|---|---|---|---|---|
| `1ce8ac8` (29/08) | 30 / 600 | 2643,4s | 1165,7s — falhou | 261,9s — falhou |
| `9f01d69` (30/08) | 31 / 617 | 2433,4s | 1007,7s | 227,2s — falhou |
| `2f57719` (30/08, pós-fix) | 31 / 617 | 2486,5s | 1027,5s | 240,7s |
| `2f91a9c` (31/08, pós-fix) | 31 / 617 | 2906,7s | 1200,2s — falhou | 281,6s |
| `d59a8b7` (31/08, hoje) | 33 / 654 | 1913,5s | 765,9s | 180,2s |

3 falhas em 5 envios (60%) — acima do 1 em 3 do `CLAUDE.md` §2. É este
número, não uma impressão, que justificou reabrir a investigação antes da
Tarefa 3 do item 10.

A suíte não cresceu em linha reta — a duração total oscila 2433↔2907s com o
mesmo tamanho de suíte, e `titulos.test.ts` sozinho varia 766↔1200s (57%)
rodando exatamente o mesmo código. Isso já pesa mais para ruído de ambiente
do que para acúmulo por crescimento de suíte.

### O achado novo: não é "um teste aleatório" — é sempre o mesmo

Lido direto do log de cada execução (`gh run view --log`), a linha `FAIL`
mostra o teste exato, não só o arquivo:

- `titulos.test.ts`: **sempre** `12b. registrarCobrancaEnviadaEmGrupo — tudo
  ou nada > um título inválido no meio do grupo recusa TODOS` — em
  `1ce8ac8` e de novo em `2f91a9c`, este **depois** do conserto de conexão
  por bloco já estar no arquivo.
- `cobrancas.test.ts`: **sempre** `4. listarCobrancas > teto de 3 não corta
  um relatório de 5 fretes` — em `1ce8ac8` e `9f01d69`, nunca mais desde o
  teto próprio de 60s (`docs/planos/margem-teste-teto-cobrancas.md`,
  vigente a partir de `2f57719`). **Este já está resolvido** — mecanismo
  identificado (o teste faz trabalho real demais: 5 fretes, 5 finalizações,
  1 relatório, 5 faturamentos, 1 consulta), não é o mesmo caso do de
  `titulos.test.ts`.

O de `titulos.test.ts` continua aberto, e é **leve** — 3 títulos, 1
recebimento, 1 chamada, 1 `SELECT` de verificação. Não bate com "o teste faz
trabalho demais", o motivo que resolveu `cobrancas.test.ts`.

### A pista fora do teste, corrigida por medição — não é o que parecia

**Primeira leitura (por código, antes de medir) — errada, e o erro fica
registrado.** As únicas quatro chamadas de transação interativa do Prisma
(`emTransacao`) em `src/lib/servicos` são `cadastro.ts`, `relatorios.ts`
(`criarRelatorio`), `servicos.ts` (`criarServico`) e `titulos.ts`
(`registrarCobrancaEnviadaEmGrupo`) — e os dois testes que falharam
percorrem essas rotas. Isso levou a cogitar algo fora do teste: `emTransacao`
roda em `clienteBase`, via `DATABASE_URL` (pooler de transação do Supabase,
porta 6543), nunca tocado pelo conserto de 30/08 (que mexeu só no `raiz`,
`DIRECT_URL`). Uma leitura do corpo do teste 12b contou 6 `await` e concluiu
"o teste é leve" — e daí veio uma "contradição": a transação interativa do
Prisma teria teto próprio (≈2s para conseguir conexão, ≈5s para rodar), então
se fosse só lentidão do pooler o Prisma erraria sozinho bem antes dos 30s do
Vitest — o que não bate com o sintoma observado (silêncio total até o
timeout puro).

**O `/revisar` recusou o teto de 60s por falta de medição — e a medição
derrubou a leitura, não só o teto.** `npx vitest run tests/titulos.test.ts -t
"um título inválido..." --reporter=verbose`, isolado, local: **10,8s**, não
instantâneo. O erro: contar os `await` **literais do corpo do teste** e
ignorar que `criarEmpresaDeTeste`/`criarTituloAberto` (chamado 3×) são
funções compostas — cada uma dispara de 3 a 5 idas ao banco por dentro
(`criarServico`/`faturarServico`, via `emTransacao`; `marcarServicoFinalizado`,
via `db()`). **A contagem real é ~25-30 idas ao banco, não 6.** Com o fator
de desaceleração da esteira já documentado (~3×, medido em investigações
anteriores desta mesma suíte), isso projeta **~32s na esteira** — exatamente
onde os timeouts caíram, sem sobra nem falta.

**Isso fecha a "contradição" em vez de aprofundá-la: não há transação
interativa nenhuma perto do próprio teto de 5s — há ~25-30 transações
curtas e independentes, cada uma normal, cuja SOMA cruza os 30s do Vitest
sob a desaceleração da esteira.** Nenhuma trava de rede, nenhum pooler
hipoteticamente travado sem avisar — o mesmo mecanismo, medido, do
`cobrancas.test.ts`: soma de idas ao banco perto do teto, só que ali por
poucas operações pesadas (5 fretes × 5 etapas) e aqui por várias operações
leves encadeadas. **Registrado como o mesmo erro que o `CLAUDE.md` já
nomeia — "explicação plausível não é explicação verificada"** — com a
diferença de que aqui a medição chegou antes do commit, pelo `/revisar`,
não depois.

### Decisão do fundador, 01/09/2026: instrumentar + conter, sem pedir a credencial do banco de teste

**Por que não pedir a credencial do projeto de teste** (opção descartada
explicitamente): ela é a chave da esteira — trazê-la para investigação
manual cria um caminho de vazamento novo que hoje não existe (a proteção
atual, mais simples e mais forte, é ela nunca sair do GitHub). E o retorno
seria baixo mesmo se buscada: precisaria estar consultando
`pg_stat_activity`/`pg_locks` no instante exato de uma falha imprevisível
— na prática, não pegaria.

**O que fica, os dois juntos, de propósito — um sozinho não bastava:**
1. **Instrumentação** (`tests/titulos.test.ts`, dentro do teste 12b) — uma
   marca de tempo (`console.log`) antes e depois de cada chamada
   `await` do teste. Só no arquivo de teste, nunca em `src/`. Quando
   estourar de novo, a última marca "início" sem a "fim" correspondente no
   log da esteira aponta exatamente qual chamada estava em voo.
2. **Teto próprio de 60s** — **contenção, com baseline medido**: 10,8s
   local isolado (acima) × ~3× da esteira ≈ 32s projetado, quase o dobro de
   folga com 60s — mesmo critério de dimensionamento do
   `TIMEOUT_TETO_RELATORIO` em `cobrancas.test.ts`. Ainda é contenção, não
   correção: não reduz o número de idas ao banco, só dá margem para elas.

Os dois resolvem um conflito que nenhum dos dois sozinho resolveria: só o
teto esconderia o problema (a esteira para de mentir, mas a instrumentação
nunca teria uma falha real para revelar onde travou, se travar de novo);
só a instrumentação deixaria o ruído vermelho continuar contando contra a
proporção do §2 do `CLAUDE.md` enquanto espera. Com os dois, a esteira
fica verde e o dado continua sendo coletado.

**Critério de saída — decisão do fundador, 01/09/2026: não é prazo nem
contagem.** Um número arbitrário ("depois de N envios sem estourar") não
provaria que a causa fechou — ausência de falha é o esperado com teto
maior, não evidência de causa resolvida. O critério que já vale continua
sendo o mesmo do `cobrancas.test.ts`: **se estourar de novo mesmo com 60s,
é o teste fazendo trabalho demais** (as ~25-30 idas ao banco crescendo
ainda mais, ou a esteira ficando mais lenta), **não falta de margem** — a
correção nesse caso é reduzir o que o teste faz, não subir o teto de novo.
A instrumentação sai quando a causa fechar, não por prazo — se nunca
disparar porque nada mais estoura, ela é barata e fica.

**O gatilho que vale revisitar, não este teste isolado:** `titulos.test.ts`
(teste 12b) é o **segundo** teste da suíte com teto próprio, depois de
`cobrancas.test.ts`. Se aparecer um terceiro, deixa de ser caso a caso — a
pergunta muda de "este teste precisa de mais tempo" para "o teto global de
30s (`vitest.config.mts`, `testTimeout`) ainda serve para uma suíte que
cresceu 4× desde que foi escolhido" (`titulos.test.ts` tinha 8 testes em
20/08/2026, tem 92 hoje). Essa pergunta não é desta investigação — é do
dia em que o terceiro teste pedir teto próprio.

**Pendência em aberto, não fechada por esta decisão:** a causa raiz do
formato — por que a soma de idas ao banco fica perto do teto justamente
nestes dois testes — está explicada (mecanismo medido: soma de operações,
não fila nem trava de rede), mas **não eliminada**: continua vulnerável à
desaceleração normal da esteira. Pedir a credencial do banco de teste para
telemetria ao vivo (`pg_stat_activity`/`pg_locks`) foi considerado e
descartado: ela é a chave da esteira, trazê-la para investigação manual
cria caminho de vazamento novo, e o retorno seria baixo mesmo assim
(precisaria do instante exato de uma falha imprevisível).

## Verificação

- `npx tsc --noEmit`, `npm run lint` — limpos.
- `npx vitest run tests/titulos.test.ts` (arquivo inteiro, local, banco de
  desenvolvimento): **92/92, 405,15s**.
- `npx vitest run tests/titulos.test.ts -t "um título inválido..."`
  (isolado, `--reporter=verbose`): passou, **10,8s**, marcas de tempo
  aparecendo linha a linha como esperado.
- **Por que a rodada do arquivo inteiro (reporter padrão) não mostrou
  nenhuma marca**: o Vitest só imprime `console.log` de um teste que passa
  quando o reporter é `verbose`; no reporter padrão, só aparece para teste
  que falha — comportamento do próprio Vitest, não falha da
  instrumentação. É exatamente esse comportamento que faz a instrumentação
  funcionar no caso que importa: quando o teste **falhar** na esteira
  (reporter padrão), as marcas aparecem junto do erro.
- Sem confirmação da esteira ainda — é o próximo envio real que mede se o
  teto de 60s segura, e se a instrumentação captura algo no dia em que não
  segurar.
