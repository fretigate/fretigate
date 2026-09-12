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
para quem reabrir o assunto depois. **A construção em si (tela-hub,
renomear a barra, tirar a linha de Mais) ainda não começou** — este plano
só registra o que foi decidido; vira tarefa própria quando entrar na ordem
de construção.

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

## O que falta para este plano virar tarefa

A escolha já foi feita (acima). Falta só abrir a tarefa de construção —
nenhuma linha de código desta mudança entrou ainda.
