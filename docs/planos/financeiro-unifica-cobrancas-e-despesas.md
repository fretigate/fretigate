# Plano — Cobranças e Despesas virarem "Financeiro" na barra

Pedido do fundador: Cobranças e Despesas virarem uma coisa só, chamada
"Financeiro", na posição que hoje é Cobranças na barra de navegação. Motivo
dado: os dois são dinheiro, e hoje um está na barra e o outro escondido em
Mais — como se fossem naturezas diferentes, sem razão para isso.

**Este pedido nasceu numa conversa e quase se perdeu** — foi pedido antes
desta sessão, nenhum plano chegou a ser escrito, e não há registro dele no
diário nem em `docs/`. É o mesmo problema que `CLAUDE.md` §2 já registra
("um plano aprovado do item 2 se perdeu inteiro ao fechar a aba"): decisão
que só vive na conversa não sobrevive à conversa. Por isso este plano
existe como arquivo antes de qualquer linha de código mudar, mesmo ainda sem
decisão final sobre como as duas telas convivem — o que falta decidir está
isolado na seção "As opções", abaixo.

**A barra continua com cinco posições** — isto é renomeação do item
existente (ícone e rótulo), não mudança de geometria. O mecanismo de
`BarraDeNavegacao.tsx` (`estaAtivo`, `ItemBarra`) não muda.

## Decisão do fundador (12/09/2026)

**Opção A — hub com duas entradas.** Motivo, nas palavras do fundador: "é a
menor mudança, reaproveita mecanismo que já existe, e não mexe nas duas
telas. A Opção C tem um 'não' já escrito no caminho — e reabrir uma decisão
registrada por conveniência é o contrário do que o projeto faz. A B é tela
nova de verdade, e o resumo combinado é decisão de produto que não vale
tomar agora."

- **O nível extra de navegação** (barra → hub → tela, o custo real da
  Opção A) fica **registrado para observar, não corrigido por suposição**:
  "se incomodar no uso, a gente reconsidera — mas com o produto rodando,
  não por suposição."
- **Pergunta 2 — a linha "Despesas" sai de Mais.** Confirmado: "seu
  critério está certo: manter os dois caminhos criaria exceção sem
  motivo."
- **Pergunta 3 — os três números continuam só de cobrança**, e o hub nasce
  **sem** resumo próprio. "Se fizer falta, o Design decide depois."

Isto fecha as três perguntas e a escolha entre opções — o resto deste
arquivo guarda o raciocínio por trás (as opções descartadas, e por quê), útil
para quem reabrir o assunto depois. **A construção em si (tela-hub, renomear
a barra, tirar a linha de Mais) foi feita em 13/09/2026** — ver "Passo a
passo de construção", abaixo. Até essa data, este parágrafo dizia "ainda não
começou"; achado do segundo `/revisar` da mesma tarefa que construiu: o
parágrafo continuou afirmando o estado anterior depois do código já ter
entrado (`CLAUDE.md` §2, "corrigir o código no meio de escrever a correção
do documento deixa o documento descrevendo o estado anterior").

## O que já existe hoje

- **Cobranças** (`/cobrancas`) — tela própria, na barra. Três números no
  topo (A receber · Desse, vencido · Recebido no mês), sempre da empresa
  inteira, sem responder a filtro. Lista com chips de situação e período.
- **Despesas** (`/despesas`) — tela própria, **sem** presença na barra.
  Chega por uma linha em Mais › Ferramentas, e pelo card "Lucro" da
  dashboard. Lista com filtro de período (servidor) e categoria (cliente).
  **Tem, sim, um número de resumo no topo** — "N despesas · R$ X" (o total
  do que está filtrado no momento) — correção do `/revisar`: a primeira
  versão deste plano dizia "sem números de resumo", o que era falso
  (`ListaDespesas.tsx`, logo acima dos chips de filtro). Diferente dos três
  números de Cobranças, aqui é um só, e responde ao filtro em vez de ser
  fixo.
- **Dashboard** linka para as duas, em quatro lugares, não três — a
  primeira versão deste plano esqueceu o quarto: "A receber" → `/cobrancas`;
  "Vencido" → `/cobrancas?situacao=vencidas`; a pendência "N cobranças
  vencidas" (quando existir, acima do resumo) → `/cobrancas`; "Lucro" →
  `/despesas` (dois lugares: card cheio e convite de estado vazio).
- **Mecanismos de interface que já existem e podem ser reaproveitados:**
  `ItemMenu` (lista de linhas com destino e ícone — é o que monta a tela
  Mais inteira); `ChipFiltro` (chip de filtro dentro de uma lista já
  carregada — situação em Cobranças, categoria em Despesas); `PilulaCabecalho`
  (botão no cabeçalho, ex. "+ Nova" em Despesas).
- **O que não existe: nenhum componente de aba (*tab*) de verdade** —
  correção do `/revisar`, que achou o que a primeira versão deste plano
  não tinha visto: `docs/componentes.md:501` já registra a lacuna, na tela
  "Termos e privacidade": as duas abas de lá usam a pílula de cabeçalho
  como se fossem aba, e o próprio documento diz "não há variante de aba no
  inventário... Enquanto não houver variante própria, fica assim e **não
  deve ser copiada para outra tela**". Isso pesa direto contra a Opção C
  abaixo — ela repetiria exatamente esse empréstimo, contra uma decisão que
  já existe.

## As opções

Três jeitos de organizar o que fica dentro de "Financeiro", cada um com o
que implica. Nenhum foi escolhido — é a decisão que falta.

### Opção A — Hub com duas entradas (reaproveita `ItemMenu`, mesmo padrão de Mais)

Financeiro abre uma tela pequena, no mesmo molde de Mais: duas linhas,
"Cobranças" e "Despesas", cada uma levando à tela que já existe, **sem
mudar nenhuma das duas**. Só nasce uma tela nova (o hub) e a barra passa a
apontar para ela.

- **Implica:** a menor mudança possível. Nenhuma tela existente é tocada;
  só uma tela nova (curta) e a troca do destino/rótulo/ícone da barra.
- **Risco:** baixo — é composição de peças que já existem (`ItemMenu`),
  sem inventar interação nova.
- **Custo de manutenção:** a navegação ganha mais um nível (barra → hub →
  tela) para chegar ao mesmo lugar que hoje é direto (barra → Cobranças).

### Opção B — Lista única combinada (cobrança e despesa juntas, como entrada e saída)

Financeiro mostra uma lista só, com lançamentos de cobrança e de despesa
juntos, provavelmente diferenciados por sinal ou cor (entrada/saída).

- **Implica:** tela nova de verdade, não reaproveitamento — layout de linha
  que hoje não existe (a linha de Cobranças e a de Despesas têm formatos
  diferentes), filtro que precisa decidir como situação (de cobrança) e
  categoria (de despesa) convivem no mesmo chip ou em chips separados, e uma
  definição nova de "resumo do mês" que misturaria dinheiro que entrou com
  dinheiro que saiu — a mesma classe de decisão que `CLAUDE.md` §9 protege
  com cuidado ("situação financeira é derivada, nunca armazenada"; aqui
  seria um novo número derivado, não um campo, mas ainda uma definição de
  produto que pede decisão explícita, não inferência).
- **Risco:** o mais alto das três — é a opção que o fundador já havia
  apontado, ao responder a pergunta deste plano, como "mudança mais
  profunda, telas novas".
- **Custo de manutenção:** mais alto — duas fontes de dados (títulos e
  despesas) coexistindo numa única consulta/lista daqui para frente.

### Opção C — Chips trocando a lista, dentro da mesma tela

Uma tela só, com chips no topo — "Cobranças" / "Despesas" — no estilo
visual de `ChipFiltro`, e escolher um chip troca qual lista aparece abaixo.

- **Implica:** parece reaproveitar `ChipFiltro`, mas o uso seria diferente
  do que esse componente faz hoje: hoje um chip **filtra dentro dos dados
  já carregados** (situação, período, categoria — tudo sobre a MESMA
  lista); aqui o chip **trocaria qual consulta ao servidor roda** — troca de
  fonte de dados, não filtro sobre uma fonte só. Visualmente reaproveita o
  chip; como mecanismo de navegação, é comportamento novo. **E é o mesmo
  empréstimo que `docs/componentes.md:501` já registrou e recusou de
  propósito** — lá, a pílula de cabeçalho faz o papel de aba em "Termos e
  privacidade", e o documento diz explicitamente que isso "não deve ser
  copiada para outra tela" enquanto não existir uma variante de aba de
  verdade. Esta opção repetiria exatamente esse empréstimo, contra uma
  decisão já escrita — não é uma opção neutra entre as três, é a que já
  tem um "não" registrado no caminho.
- **Risco:** médio — o componente visual existe, o comportamento não.
- **Custo de manutenção:** parecido com a Opção A (as duas listas
  continuam separadas por baixo), mas sem o nível extra de navegação — ao
  custo de um componente com uma responsabilidade que hoje ele não tem.

## As três perguntas do fundador, respondidas por opção

**1. Para onde vão os links da dashboard ("a receber"/"vencido" → Cobranças,
"lucro" → Despesas)?**

- Opção A: continuam levando a lugares diferentes — só a URL muda de
  `/cobrancas` para algo como `/financeiro/cobrancas` (os parâmetros de
  filtro que já existem, como `?situacao=vencidas`, seguem intactos).
- Opção B: os três precisariam abrir a mesma tela, cada um pré-filtrado
  para seu recorte (ex.: `/financeiro?ver=vencidas`) — exige que a lista
  combinada suporte os mesmos filtros que as duas telas de hoje suportam
  separadas.
- Opção C: igual à B, trocando o parâmetro por qual chip abre selecionado.

**2. A linha "Despesas" em Mais sai, ou continua como atalho?**

Minha recomendação, para as três opções: **sai.** Hoje Cobranças não tem
linha em Mais porque já está na barra — o mesmo critério, aplicado de
volta, diz que Despesas não precisa de uma linha em Mais no dia em que
passar a ser alcançável pela barra. Manter os dois caminhos não quebra
nada, mas criaria a primeira exceção a esse critério sem motivo dado. Fica
para o fundador confirmar — é decisão de navegação, não só técnica.

**3. Os três números do topo de Cobranças — continuam só de cobrança, ou
o Financeiro mostra um resumo combinado?**

- Opção A: continuam só de cobrança, sem nenhuma mudança — é a tela de
  hoje, intacta. O hub pode ganhar (ou não) um resumo próprio acima das
  duas linhas — isso é decisão de Design (abaixo), não teria por que travar
  esta tarefa.
- Opção B: por definição, os números teriam que misturar entrada e saída —
  é a decisão de produto mais pesada das três perguntas, porque define o
  que "resumo financeiro" passa a significar no produto. Precisaria do
  fundador decidindo o número exato (lucro do mês? saldo? os dois lados
  lado a lado?), não só do Design desenhando.
- Opção C: mesma resposta da A para as duas listas por baixo; se o
  fundador quiser um resumo combinado no topo da tela com chips, é a mesma
  decisão pesada da B.

## O que precisa ir ao Design antes de construir

Correção do `/revisar`: a primeira versão deste plano dizia que o
inventário de telas e o mapa de navegação "são do Design" — ao pé da
letra, é o contrário. `CLAUDE.md` §13 diz que **o repositório é o dono**
de `docs/componentes.md`, `docs/estilo.md` e `docs/navegacao.md`; o Design
não exporta mais o arquivo inteiro, entrega só o **desenho** — como diff de
seção, que o fundador encaixa. O que precisa ir ao Design não é "editar
esses arquivos", é a decisão visual/de fluxo que uma edição desses arquivos
viria registrar depois:

- **Qualquer opção:** o ícone da barra para "Financeiro" — hoje o item usa
  o desenho de Cobranças (`barra-cobrancas.svg`); continua servindo, ou o
  Design quer um novo que represente as duas coisas juntas?
- **Opção A:** o conteúdo da tela-hub (título, ordem das duas linhas, se
  mostra algum número de apoio em cada linha — o precedente que existe hoje
  em Mais é o "R$ X em aberto" da linha **Clientes**, não de uma linha
  Cobranças, que não existe em Mais; o Design decide se algo parecido faz
  sentido aqui).
- **Opção C:** por já existir uma decisão registrada contra esse
  empréstimo (`docs/componentes.md:501`, acima), só valeria a pena levar ao
  Design se o fundador quiser reabrir aquela decisão — não é um desenho
  novo, é pedir para revisitar um "não" já escrito.
- **Opções B e C, se o resumo combinado for adiante:** os números exatos
  do resumo e seus rótulos — mesmo cuidado que os três números de
  Cobranças já tiveram (`docs/estilo.md`, "Conflitos resolvidos").
- **Decisão da pergunta 2** (linha "Despesas" em Mais) — muda
  `docs/navegacao.md`; quem edita o arquivo é o repositório (§13), mas a
  decisão de tirar ou manter a linha é do fundador, com o Design registrando
  o desenho se algo visual mudar.

## Construção

Feita em 13/09/2026 — ver "Passo a passo", abaixo. Até essa data, esta seção
dizia "O que falta para este plano virar tarefa: a escolha já foi feita,
falta só abrir a tarefa — nenhuma linha de código entrou ainda"; corrigida
pelo mesmo motivo do parágrafo lá em cima.

## Passo a passo de construção (executado em 13/09/2026)

1. `financeiro/page.tsx` — tela nova, hub sem resumo próprio, duas linhas
   (`ItemMenu`, mesmo componente de Mais): "Cobranças" → `/cobrancas`,
   "Despesas" → `/despesas`. Ícone das duas reaproveita `barra-cobrancas.svg`
   — mesmo precedente já usado para "Despesas" em Mais (nenhum ícone próprio
   existe para nenhuma das duas; decisão do fundador de 01/09/2026 de não
   travar tarefa em decisão visual pequena).
2. `BarraDeNavegacao.tsx`: o item que apontava para `/cobrancas` com rótulo
   "Cobranças" passou a apontar para `/financeiro` com rótulo "Financeiro" —
   mesmo ícone (pergunta ao Design, em aberto).
3. `mais/page.tsx`: linha "Despesas" removida da seção FERRAMENTAS —
   resposta do fundador à pergunta 2, "sai".
4. **Rotas de Cobranças e Despesas não mudaram** (`/cobrancas`, `/despesas`
   continuam exatamente onde estavam) — decisão tomada ao construir, não
   antecipada por este plano: a resposta à pergunta 1 tinha especulado "a
   URL muda para algo como `/financeiro/cobrancas`", mas isso contradiria a
   própria definição da Opção A ("nenhuma tela existente é tocada") e
   exigiria mexer nos dois arquivos, em todo link que já aponta para eles
   (dashboard, perfil do cliente, WhatsApp de cobrança) e no
   destaque-de-aba da barra. Manter as rotas como estão é, além de menor
   risco, consistente com o precedente que "Mais" já estabelece: suas
   telas-filhas (`/clientes`, `/despesas` até aqui) nunca viveram
   aninhadas sob `/mais`, e a barra também não fica marcada como ativa
   nelas — o mesmo passa a valer para "Financeiro" e suas duas.
5. **Voltar de Despesas mudou de `/mais` para `/financeiro`**
   (`despesas/page.tsx`) — consequência direta de Despesas ter saído de
   Mais; sem essa troca, "Voltar" levaria a um lugar de onde não existe
   mais caminho para chegar aqui.
6. `docs/navegacao.md`, `docs/componentes.md`, `docs/estilo.md` e
   `docs/especificacao.md` atualizados só no que é **estado** (rota,
   rótulo, de onde se chega) — o layout do hub em si segue sem confirmação
   do Design.

## Achados do `/revisar`, corrigidos no mesmo passe (13/09/2026)

A primeira versão desta construção tinha "Cobranças não ganhou Voltar"
registrado como observação, apoiada em "a Opção A foi aprovada como
'nenhuma tela existente é tocada'". O `/revisar` corrigiu isso: virar tela
de nível 2 (só alcançável pelo hub) coloca Cobranças sob uma regra já
escrita e nunca opcional — `docs/componentes.md` linha 269, "`voltar.svg` no
topo de toda tela de nível 2" —, não sob uma decisão de produto nova. Seguir
"nenhuma tela é tocada" ao pé da letra aqui teria deixado a única tela de
nível 2 do produto sem Voltar, contradizendo uma regra existente em nome de
uma frase do plano que não previa essa consequência. Corrigido:
`cobrancas/page.tsx` ganhou `<BotaoVoltar href="/financeiro" />`, mesmo
padrão de Despesas.

Também corrigidos, mesma categoria (contradição documento/código ou citação
errada, `CLAUDE.md` §2, "corrige no passe"):

- `financeiro/page.tsx` chamava `exigirSessao()` sem usar o retorno —
  redundante e uma ida a mais ao banco por carregamento: `layout.tsx` já
  garante que nenhuma tela deste grupo renderiza sem sessão. Removida.
- O comentário do ícone reaproveitado em `financeiro/page.tsx` citava
  `docs/componentes.md` linha 277 como fonte da decisão "nenhum ícone
  próprio existe, não travar tarefa em decisão pequena" — essa linha só
  lista arquivo/uso/tamanho, não motivo nenhum; a decisão de verdade está em
  `docs/planos/item-11-despesas.md`. Citação corrigida.
- `docs/estilo.md` e `docs/especificacao.md` §4.8 ainda diziam "Cobranças"/
  "Mais" nos dois lugares que citam de onde a tela ou o ícone são
  alcançados — ficaram desatualizados pela própria mudança desta tarefa
  (`CLAUDE.md` §2, "quem cria o estado novo é quem relê o texto"). Os dois
  corrigidos.
- `BarraDeNavegacao.tsx`: o comentário do topo dizia "Fretes e Cobranças
  apontam para telas provisórias" — verdade em 09/08/2026, falso desde que
  as duas foram construídas, e agora também sem o rótulo "Cobranças" existir
  na barra. Reescrito para não ficar preso ao caso único.
- `docs/componentes.md`, "Onde cada tela usa o quê": faltava a linha
  "Financeiro" — toda tela do inventário tem uma, incluindo "Mais", que é o
  mesmo tipo de tela (hub sem principal).

**Não corrigido, registrado como lacuna — decisão de rota que ficou
diferente da resposta 1 do plano.** A resposta à pergunta 1 (acima)
especulava "a URL muda para algo como `/financeiro/cobrancas`"; a
construção manteve `/cobrancas` e `/despesas` como estavam, por ser
consistente com "nenhuma tela existente é tocada" (a definição da própria
Opção A) e com o precedente de "Mais" (suas telas-filhas nunca vivem
aninhadas sob `/mais`). O `/revisar` apontou que isso é uma decisão que
diverge do que o plano aprovado dizia, sem ter sido levada ao fundador antes
de construir — registrado aqui para ele confirmar ou pedir o contrário, não
desfeito por conta própria.

**Precisão do segundo `/revisar`, 13/09/2026, sobre este último ponto**: a
seção "Decisão do fundador" (acima) fecha só a Opção A e as perguntas 2 e 3
— nunca decide a URL, em nenhum dos dois sentidos. "`/financeiro/cobrancas`"
era só a análise de quem escreveu o plano, respondendo à pergunta 1, nunca
aprovada nem recusada pelo fundador. Não é "a construção divergiu do
aprovado" — é pergunta que nunca teve resposta, e devia ter sido feita antes
de escolher, não decidida durante a construção.

**Decisão do fundador, 13/09/2026: confirmado, mantém `/cobrancas` e
`/despesas` sem aninhar.** Motivo, nas palavras dele: "os dois endereços já
existem, já foram compartilhados, e mudar quebra qualquer link salvo — sem
ganho nenhum, porque o hub já agrupa na navegação." Lacuna fechada — a
escolha feita na construção (acima) é a decisão final, não provisória.

## Segundo passe do `/revisar` (13/09/2026)

Quatro divergências, cinco lacunas. Corrigidas no mesmo passe (mesma
categoria do primeiro — contradição documento/documento, texto que a
própria correção do primeiro passe deixou incompleto):

- Este arquivo (linhas 42-45 e antiga "O que falta para este plano virar
  tarefa") continuava dizendo "a construção ainda não começou"/"nenhuma
  linha de código entrou", no mesmo commit em que a seção "Passo a passo de
  construção" foi acrescentada — `CLAUDE.md` §2: corrigir código no meio de
  escrever a correção do documento e não reler o texto contra o código que
  passou a existir. Reescrito.
- `docs/estilo.md` linha 666 tinha uma segunda menção a "Cobranças" na barra
  (a primeira, linha 597, já tinha sido corrigida no primeiro passe) —
  corrigida.
- `docs/navegacao.md`: as linhas de Cobranças e Despesas viviam dentro da
  tabela "## Mais — cadastros", com "Chega de: Financeiro" — cabeçalho da
  seção contradizendo a própria linha, achado que o primeiro passe não tinha
  visto. Corrigido com seção própria, "## Financeiro — cobranças e
  despesas", logo depois de "Mais — cadastros".
- Essa mesma edição deslocou (de novo) as linhas de `docs/navegacao.md`
  abaixo do ponto de inserção — as sete citações de linha já corrigidas no
  primeiro passe (`caminhoes/[id]/editar/page.tsx`, `caminhoes/novo/
  page.tsx`, `caminhoes/acoes.ts`, `despesas/page.tsx`, `despesas/
  acoes.ts`, `despesas/nova/page.tsx`, `despesas/[id]/page.tsx`) e três
  citações de `docs/componentes.md` que a inserção da linha "Financeiro"
  tinha deslocado sem eu ter visto no primeiro passe
  (`despesas/FormularioDespesa.tsx`, duas · `despesas/ListaDespesas.tsx`,
  uma) foram reconferidas contra o estado final dos dois arquivos e
  corrigidas juntas.

**Não corrigido, verificado por medição e considerado não-achado**: o
`/revisar` apontou que o rótulo "Financeiro" (mais longo que "Cobranças")
podia não caber no menor piso da barra (320px, `docs/estilo.md` linha
270-272) sem medição. Medido com `canvas.measureText` no mesmo
`font-family`/tamanho da barra (Archivo, 10.5px, pesos 600 e 700, a fonte
real do produto — `src/app/layout.tsx`): "Financeiro" mede 51,4px (600) /
53,3px (700), **mais estreito** que "Cobranças" (53,0px / 54,8px), que já
estava em produção nesse mesmo espaço. Não é suposição — é a mesma medida,
com o texto novo no lugar do antigo.

**Não corrigido, em desacordo com o achado**: o `/revisar` apontou que
`<BotaoVoltar href="/financeiro">` fixo em Cobranças/Despesas contradiz
`docs/navegacao.md` linha 92 ("Voltar... leva de volta à origem"), já que as
duas são alcançadas por mais caminhos que só o hub (pastilhas da dashboard,
perfil do cliente). Discordo: é o padrão já usado em todo o produto, não uma
exceção nova desta tarefa — `CabecalhoDeDetalhe href="/fretes"` em
`fretes/[id]/page.tsx` já é fixo, mesmo "Detalhe do frete" chegando de duas
origens (Fretes e histórico do perfil do cliente, `docs/navegacao.md` linha
27); Despesas já tinha `Voltar` fixo para `/mais` antes desta tarefa, mesmo
sendo alcançada também pelo card de Lucro da dashboard. "Leva de volta à
origem" já é interpretado no produto inteiro como "leva ao caminho
canônico", não "lembra de onde a pessoa veio" — não construído aqui, e
mudar isso para Cobranças/Despesas sozinhas criaria a exceção, não o
contrário. Fica registrado para o fundador decidir se quer revisitar o
padrão inteiro — não é decisão para tomar sozinho numa tela só.
