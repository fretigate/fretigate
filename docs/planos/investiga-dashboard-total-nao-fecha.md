# Plano: por que `dashboard.total` nunca fecha

Pedido do fundador, 12/09/2026, depois de puxar os logs de produção da
instrumentação (`src/lib/utils/medir-tempo.ts`, `docs/diario.md`,
12/09/2026). Investigação — este arquivo não muda código, só decide o que
medir a seguir.

## O sintoma

`src/app/(app)/page.tsx:86-120` embrulha a maior parte das consultas da
dashboard num `medir("dashboard.total", () => Promise.all([...]))` — a
exceção é `dashboard.clienteSugerido` (`page.tsx:126-132`), que só roda
**depois**, condicionada ao resultado de `sugerirRelatorio`: não dá para
buscar o nome do cliente sugerido antes de saber quem foi sugerido, então
essa consulta nunca poderia estar dentro do mesmo `Promise.all`. As
consultas **de dentro** aparecem nos logs de produção, sozinhas —
`dashboard.empresa`, `dashboard.usuario`, `dashboard.somaDoMes[...]`,
`dashboard.rodagem.*` — mas a medição que as envolve, `dashboard.total`,
**nunca aparece**, em nenhuma das consultas feitas aos logs (duas janelas
puxadas, ~1h40 no total, filtros diferentes — "medir" e um texto mais
específico — e busca direta pela string exata "dashboard.total": zero
ocorrências nas duas).

Isso só é possível se o `finally` de `medir` (que é onde o log sai) nunca
roda para essa chamada específica, ou se o log roda e se perde antes de
chegar aonde eu consigo consultar.

## O que já foi conferido, e o que isso descarta

- **Não existe `maxDuration` configurado** — nem em `page.tsx`, nem em
  `next.config.ts`, nem em `vercel.json` (`{"framework":"nextjs","regions":
  ["gru1"]}`, sem chave de função). A função roda no limite **padrão** do
  plano Vercel — o valor exato não foi confirmado aqui (teria que ser lido
  no painel, aba Functions/Settings, ou medido; não suposto de memória,
  `CLAUDE.md` §2).
- **Nenhum log de nível `error`/`fatal` na mesma janela** (`vercel logs
  --level error`, 3h, zero linhas). Um timeout de função geralmente sobe um
  log próprio da plataforma ("Task timed out...") — a ausência não prova
  que não houve timeout (a Vercel pode não repetir esse log em toda
  consulta), mas pesa contra a hipótese, não a favor.
- **Toda linha `[medir] dashboard.*` que já vimos carrega
  `responseStatusCode: 200`** — o pedido que gerou aquela consulta terminou
  com sucesso, do ponto de vista do metadado que a Vercel anexa ao log.
  Isso é indício, não prova: não está confirmado se esse campo reflete o
  status **final** do pedido (só decidido depois que a resposta inteira sai)
  ou um valor provisório.

**Nenhuma das três checagens acima fecha a pergunta.** Faltam meios de
distinguir as três hipóteses do fundador.

## As hipóteses, e por que a instrumentação de hoje não escolhe entre elas

1. **Tempo limite da função mata o processo antes do `finally` rodar.**
2. **O pedido é cancelado** (a pessoa navega para outro lugar, ou o celular
   troca de app) — o servidor pode continuar processando mesmo sem cliente
   do outro lado, ou a Vercel pode encerrar a execução ao detectar a
   desconexão; não sei qual dos dois este ambiente faz.
3. **O código nunca chega a chamar `medir("dashboard.total", ...)`.**
   **Já teria como estar descartada**, mas não com confiança total: as
   consultas de dentro do `Promise.all` só executam porque estão dentro da
   função que `medir("dashboard.total", ...)` recebe como argumento — se
   elas rodam, a chamada externa já foi feita. O que resta em aberto é uma
   hipótese vizinha, não esta: será que o problema é o **log em si**, não o
   código?
4. **(Hipótese somada nesta investigação, não do fundador) — o log se perde,
   sem o pedido ter falhado.** `medir` é a mesma função para o pai e para
   os filhos; não há razão de código para ela falhar só na chamada de fora.
   Mas as chamadas de dentro do `Promise.all` resolvem quase juntas, e a
   chamada de fora é a **última linha `[medir]` do grupo que o `Promise.all`
   produz** — se o coletor de log da Vercel tiver algum limite por invocação
   (linhas, tamanho, ordem), essa posição é candidata natural a ser cortada.
   **Não é a última linha do pedido inteiro**: quando existe sugestão de
   relatório, `dashboard.clienteSugerido` (`page.tsx`) roda depois, sozinha,
   fora do `Promise.all` — só a posição dentro do grupo do `Promise.all`
   importa para esta hipótese, não a ordem do pedido como um todo. Indistinguível
   de "o pedido falhou de verdade" sem uma forma de agrupar todas as linhas
   de UM pedido e olhar se o padrão se repete.

**O que falta, e por isso nenhuma das quatro está decidida:** não existe
hoje nenhum jeito de agrupar as linhas `[medir]` de um mesmo carregamento da
dashboard. Cada linha sai solta — sem `requestId` nem qualquer marca em
comum —, então não dá para responder "este pedido teve os 22 filhos do
grupo e não teve o pai" nem "este pedido não teve nem os filhos" (o que
apontaria para a página nunca ter sido aberta de verdade, ou ter sido
cortada antes até de começar).

**O "22" acima é derivado do código de hoje, não fixo — reconferir se
`page.tsx`/`dashboard.ts` mudarem de novo.** Contagem, depois do conserto
de "Fora deste plano" (abaixo): `dashboard.empresa` (1) + `dashboard.usuario`
(1) + `resumoDoMes` (1, só o mês anterior — o atual é reaproveitado) +
`resumoDeLucroDoMes` (1, só despesas) + `resumoDeRodagemDoMes` (2) +
`resumoDeCobrancas` (5) + `contarFretesAFaturar` (1) +
`contarFretesEmAndamento` (2) + `contarCobrancasVencidasAgrupadas` (1) +
`sugerirRelatorio` (1) + `faturamentoPorMes` (5, só os cinco meses que não
são o atual) = 21 linhas disparadas de dentro do `Promise.all`, mais a
linha compartilhada `dashboard.somaDoMes[mesAtual]` (disparada por
`iniciarSomaDoMesAtual`, fora do `Promise.all` mas no mesmo grupo — ver
seção abaixo, "`dashboard.total` continua envolvendo todas as consultas")
= 22.

## O que precisa ser acrescentado

Três pontos de medição novos, pensados para se excluírem — cada um decide
uma pergunta que as outras não decidem:

1. **Um identificador por pedido, indo em toda linha `[medir]` daquele
   pedido.** Gerado uma vez no topo de `Pagina()` (`crypto.randomUUID()`
   truncado, ou um contador simples — não precisa ser globalmente único,
   só distinguir pedidos próximos no tempo) e passado para `medir` como
   parâmetro extra, ou embutido no próprio rótulo
   (`dashboard.total[${id}]`). Com isso dá para agrupar todas as linhas de
   UM carregamento e responder, por amostra real: "quantos pedidos têm
   todos os filhos e não têm o pai" — se for **zero ou raro**, aponta para
   perda de log (hipótese 4); se for a **maioria**, aponta para o pedido
   não terminando de verdade (hipóteses 1 ou 2).
2. **Uma linha de log logo depois do `Promise.all` resolver, fora do
   `medir`** — por exemplo `console.log('[dashboard] pronto', id)` na linha
   seguinte ao fechamento do `await medir("dashboard.total", ...)`. Se essa
   linha aparecer nos logs mas `dashboard.total` daquele mesmo pedido não
   aparecer, o problema é specific do `finally` daquela chamada (ou de como
   aquele rótulo específico é tratado no pipeline de log) — não do pedido
   inteiro. Se as duas faltarem juntas, o problema é mais cedo.
3. **Cruzar com a duração real da invocação, do lado da Vercel** — via
   `vercel inspect <url-do-pedido>` (se a interface expuser por pedido) ou
   o painel de Observability/Functions, que mostra duração e status por
   invocação, independente do que o código loga. Se a duração real for
   próxima do teto da função (o valor a confirmar, ver acima), aponta para
   timeout (hipótese 1). Se for curta (perto da soma dos filhos que já
   vemos, uns poucos segundos) e mesmo assim faltar o log, timeout sai da
   mesa e sobra cancelamento (2) ou perda de log (4).

**Por que os três juntos, não um só:** o identificador (1) prova SE existe
um padrão (falta sistemática do pai) sem dizer POR QUÊ; o marcador (2)
localiza se a causa é antes ou depois do `Promise.all` resolver; a duração
real (3) é o único dos três que fala com uma fonte **fora** do nosso
próprio código, então é o que decide entre "nosso log falhou" e "o pedido
falhou" sem depender de o nosso mecanismo de medir estar certo.

## Passo a passo (depois de aprovado)

1. `medir-tempo.ts`: aceitar um identificador opcional de pedido, incluído
   no rótulo do log (ex.: `[medir] ${rotulo} ${duracaoMs}ms id=${id}`) —
   mudança pequena, sem trocar a assinatura para quem já chama sem ele.
2. `page.tsx`: gerar o identificador no topo de `Pagina()`, passar para
   todas as chamadas de `medir` desta rota, e acrescentar o marcador do
   item 2 acima logo após o `Promise.all`.
3. Publicar, esperar tráfego real (mesma janela de uso que já gerou os
   números de hoje deve bastar — poucas dezenas de carregamentos).
4. Puxar os logs de novo, agrupar por identificador, e responder: quantos
   grupos têm todos os filhos e não têm o pai? Quantos têm o marcador do
   item 2 sem ter `dashboard.total`?

   **Cuidado ao agrupar — nem toda linha `[medir] cobrancas.*` é da
   dashboard.** `resumoDeCobrancas` e `contarFretesAFaturar`
   (`src/lib/servicos/cobrancas.ts`) também são chamadas por `/cobrancas` e
   `/mais` (`src/app/(app)/cobrancas/page.tsx`,
   `src/app/(app)/mais/page.tsx`), sem `idPedido` — essas rotas não fazem
   parte desta investigação. Uma linha `[medir] cobrancas.resumo.*` **sem**
   `id=` no log não é sinal de perda de log da dashboard; é uma dessas
   outras rotas. Só entram no agrupamento as linhas que já carregam `id=`.
5. Cruzar um punhado desses pedidos com a duração real da invocação
   (Vercel), para decidir entre timeout e cancelamento nos casos que
   sobrarem.
6. Decidir a correção só depois disso — não faz sentido desenhar um
   conserto para "timeout" se a medição apontar "log perdido".

## Removida quando a pergunta fechar

Assim como o resto de `medir-tempo.ts` (comentário do próprio arquivo:
"sai do código, ou vira permanente, decisão do fundador"), o identificador
e o marcador extra são diagnóstico temporário — não ficam no código depois
que esta pergunta tiver resposta, a menos que o fundador decida manter a
correlação por pedido como coisa permanente.

## `dashboard.total` continua envolvendo todas as consultas, mesmo depois do conserto em paralelo

Lacuna apontada pelo `/revisar`: a tarefa paralela (seção abaixo, "Fora
deste plano" — `docs/planos/
remove-consultas-repetidas-tipo-operacao-e-soma-do-mes.md`) muda `page.tsx`
para chamar `iniciarSomaDoMesAtual` **antes** de
`medir("dashboard.total", ...)` começar a contar — o disparo da consulta da
soma do mês corrente não fica mais estritamente **dentro** do
`Promise.all` que este plano descreve na abertura ("embrulha todas as
consultas da dashboard"). Isso muda a frase, não a garantia: `resumoDoMes`,
`resumoDeLucroDoMes` e `faturamentoPorMes` continuam esperando essa mesma
promessa **por dentro**, e as três continuam dentro do `Promise.all` que
`dashboard.total` mede — a duração de `dashboard.total` ainda cobre o tempo
de espera daquela consulta, só o **instante em que ela começa a rodar** é
uma fração de segundo antes do relógio de `dashboard.total` começar a
contar. Para o agrupamento por `idPedido` (item 1 de "O que precisa ser
acrescentado"), o efeito prático é: a linha `dashboard.somaDoMes[mesAtual]`
de um pedido pode aparecer no log um instante antes das outras linhas do
mesmo grupo — não é sinal de que ela pertence a outro pedido, nem de que
`dashboard.total` deixou de cobri-la. Nenhuma das quatro hipóteses muda por
causa disso.

## Fora deste plano, de propósito

Os dois achados de consulta repetida (`servico.tipoOperacao.buscarPorId`
buscado duas vezes ao salvar frete, `dashboard.somaDoMes` chamado três
vezes com números de produção — 30ms e ~102-469ms por chamada,
respectivamente) **não entram aqui**. São correções já diagnosticadas, com
causa conhecida e conserto direto (reaproveitar o resultado já buscado em
vez de buscar de novo) — não pedem investigação, só execução. Misturar as
duas nesta tarefa juntaria um problema aberto (por que o total não fecha)
com um problema já fechado (o que fazer com as consultas repetidas),
dificultando saber depois qual conserto resolveu o quê. Recomendado como
tarefa própria, podendo andar em paralelo com esta — não depende do
resultado desta investigação para começar.
