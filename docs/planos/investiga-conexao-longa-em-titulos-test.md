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
