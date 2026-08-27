# Plano — item 6: Título a receber e Cobranças

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 5 (ordem de serviço) fechou no commit `432a6d9`, esteira verde.

Hoje o dinheiro só existe no produto por **um** caminho: o botão "Já recebi"
do detalhe do frete, que cria um `TituloReceber` **já pago** e integral
(`criarTituloJaRecebi`, `src/lib/servicos/titulos.ts`). Não existe cobrança
**em aberto** — e é por isso que:

- "A receber" e "Vencido" não aparecem no resumo do perfil do cliente
  (`resumoFinanceiroDoCliente` devolve dois números, não quatro — decisão
  registrada no item 4, Tarefa 6: "um número que só pode ser zero é dado
  incompleto disfarçado de completo");
- a etiqueta **Faturado** de `situacaoFinanceira` é inalcançável na prática
  (exige título ativo com nenhum centavo recebido — que nenhum caminho de
  hoje produz);
- `/cobrancas` é uma tela provisória desde o item 4;
- o estorno prometido por `docs/especificacao.md` §8 item 12 ("o caminho é
  estornar — item 6, ainda não construído") não existe, e a tela de Editar
  frete manda o usuário fazer uma coisa que não dá para fazer.

Este item é o que faz o dinheiro poder ficar **pendente**: faturar, acompanhar
o que vence, cobrar, receber (inclusive só um pedaço) e estornar.

`prisma/schema.prisma` já tem a tabela `titulo_receber` inteira, com RLS,
política e `GRANT` desde o item 3 (`20260814140000_titulo_receber`) — os
campos `vencimento`, `forma_pagamento_prevista`, `status`, `data_pagamento`,
`forma_pagamento` nascem nulos e nunca foram preenchidos. Três migrations novas
são necessárias, e só três: a tabela `recebimento` (Tarefa 3, decisão 6),
`empresa.chave_pix` e a tabela `cobranca_enviada` (as duas na Tarefa 5).

---

## Decisões tomadas nesta rodada (26/08/2026), antes de escrever código

Registradas aqui porque `CLAUDE.md` §2 pede: decisão de produto vem do
fundador, não do mais provável.

### 1. Texto padrão da cobrança — aprovado pelo fundador

Exigência de `docs/especificacao.md` §9, item 1 (o texto passa pelo fundador
antes de virar código), cumprida em 26/08/2026. O molde:

```
{empresa}

Oi, {cliente}. Tudo bem?

Passando pra lembrar do frete {rota}.

Valor: R$ {valor}
Vencimento: {vencimento}

Pix: {pix}

Se já tiver pago, pode desconsiderar. Obrigado!
```

Preenchido, com Pix cadastrado:

```
Transportes Silva

Oi, Frigorífico São Luiz. Tudo bem?

Passando pra lembrar do frete Fortaleza → Sobral.

Valor: R$ 2.400,00
Vencimento: sexta, 5 de setembro

Pix: 12.345.678/0001-90

Se já tiver pago, pode desconsiderar. Obrigado!
```

**As razões de cada escolha, para não serem reabertas por analogia:**

- **A empresa sozinha na primeira linha** (exigência do fundador): o cliente
  recebe de número desconhecido e precisa saber de quem é antes de abrir.
  Mesmo cabeçalho da ordem de serviço (`montarMensagemOrdem`).
- **"Se já tiver pago, pode desconsiderar."** Cobrança e pagamento se cruzam.
  Sem essa frase, quem já pagou lê a mensagem como se a empresa não tivesse
  visto o dinheiro dele — a mensagem passa a custar relação em vez de trazer
  caixa.
- **Vencimento com dia da semana** ("sexta, 5 de setembro"), reaproveitando
  `formatarDiaDaSemanaEData` (`src/lib/utils/data-fortaleza.ts`). O dia da
  semana diz na hora se dá tempo, sem contar no calendário.
- **Blocos separados por uma linha em branco, bloco ausente some inteiro** —
  mesma regra de montagem já provada em `montarMensagemOrdem`: nunca duas
  quebras seguidas, nunca rótulo órfão ("Pix: —").

**Vencido muda uma linha, e só uma** (decisão do fundador, 26/08/2026): quando
o vencimento já passou, `Vencimento: sexta, 5 de setembro` vira
`Venceu sexta, 5 de setembro`. O resto do texto não muda.

O fundador perguntou se o tom aguenta uma cobrança vencida há semanas
("passando pra lembrar" pode soar leve demais) e pediu recomendação. **A
recomendação foi manter, e o fundador aceitou.** Dois motivos:

1. A palavra "Venceu" já carrega o peso — a frase de cima não precisa
   endurecer para a mensagem dizer que está atrasado.
2. `docs/especificacao.md` (entidade Empresa) prevê **um** campo
   `modelo_mensagem_cobranca`, singular. Um texto que varia de tom conforme a
   situação vira dois textos — e no dia em que o item 9 (tela de editar o
   modelo) existir, o usuário edita um e o outro segue diferente, sem nada
   avisar. Mesma classe de problema do §9 do `CLAUDE.md` sobre duas fontes de
   verdade que divergem.

Quanto endurecer com um cliente atrasado é decisão de relacionamento
comercial: quem conhece o cliente é o dono, não o produto.

**`{pix}` entra na lista de variáveis de `docs/especificacao.md` §9** — não
existia antes, mesmo caminho de `{caminhao}` no item 5. Commitado junto deste
plano.

### 2. `Empresa.chave_pix` nasce agora, com a folha do campo que falta

A especificação prevê `chave_pix` na entidade Empresa, mas o campo estava
explicitamente adiado para o item 10, com a justificativa registrada de que
"esses ninguém lê ainda" (`docs/especificacao.md`, entidade Empresa, último
parágrafo sobre `prazo_padrao_dias`). Este item cria o primeiro leitor.

O precedente é o próprio `prazo_padrao_dias`, que nasceu no item 2 antes da
tela que o edita — **com uma diferença que importa**: aquele tinha um padrão
útil (15 dias), e `chave_pix` nasceria vazia para todo mundo, sem nenhum lugar
onde preencher até o item 10. "Pix quando houver" seria, na prática, "nunca
há", e a cobrança sairia sem dizer como pagar.

**Decisão do fundador:** cria a coluna agora **e** um lugar mínimo de
preencher — a **folha do campo que falta** (`docs/componentes.md` §12), que já
está documentada para exatamente este gatilho ("Gerar relatório com cobrança
sem chave Pix da empresa", listada entre os gatilhos ainda não construídos, e
com o título já escrito: *"Falta a chave Pix da sua empresa"*). Zero tela
nova, e a pessoa preenche uma vez, no momento em que precisa.

**A diferença deste gatilho para o do relatório fica registrada:** no
relatório, "Agora não" **não cancela a ação** — o PDF sai sem a chave
(`docs/componentes.md`, "Exceção: o relatório com cobrança não bloqueia").
Aqui vale o mesmo, e pelo mesmo motivo: quem tocou "Cobrar no WhatsApp"
quer cobrar, e o cliente ainda pode pagar por transferência ou boleto. A
mensagem sai sem o bloco do Pix, exatamente como o molde já prevê.

### 3. Faturar frete abre uma folha curta, pré-preenchida

Não fatura direto. A folha vem com o vencimento já calculado pelo prazo do
cliente e a forma prevista escolhida; quem não quiser mudar confirma e segue.

**O motivo, nas palavras do fundador:** o vencimento define quando aquilo vira
"vencido" na tela, e errar significa cobrar antes da hora ou tarde demais. E o
prazo do cadastro é **padrão, não verdade daquele frete** — cliente pede prazo
maior num mês, combina diferente numa carga.

Isso confirma os três níveis já previstos em `docs/especificacao.md` §4.7:
empresa (`prazo_padrao_dias`, 15) → cliente (`prazo_pagamento_dias`, nulo
herda) → **edição ao faturar** (este). O terceiro nível nunca tinha existido
em código.

### 4. Estorno: destrutiva em texto, no detalhe da cobrança, com confirmação

Fica junto de Arquivar, seguindo o precedente de "Arquivar frete" e "Arquivar
cliente" — mas **com confirmação antes**, diferente de arquivar, e a
confirmação diz o que acontece:

- o frete volta a **A faturar**;
- o título é **cancelado** (`status = "cancelado"`, nunca apagado — §7);
- o histórico registra.

**"O histórico registra" precisa, para não ser lido como mais do que é —
achado do `/revisar` na Tarefa 6, confirmado pelo fundador (27/08/2026):
significa só que a linha não é apagada (§7), não um registro de autoria.**
O estorno não grava quem estornou nem quando, além do `atualizado_em` que
todo `UPDATE` já grava — não existe tela nem consulta que mostre "estornado
por X em Y". Um registro de autoria seria tabela nova, que ninguém pediu
para esta tarefa. Se um dia isso incomodar — duas pessoas com acesso à
mesma conta, uma estornando sem a outra saber —, é decisão própria, não
herdada por analogia com esta nota.

**Vai ao Design como item novo do inventário de `docs/componentes.md`** — é um
botão que não está lá, e `CLAUDE.md` §8 proíbe botão fora do inventário. Entra
na lista de "o que foi pedido ao Design" do diário da tarefa.

### 5. Formas de pagamento — lista fechada, mais "Outro" com campo livre

**Pix · Dinheiro · Transferência · Boleto · Outro.** Pix primeiro, por ser o
mais usado.

**"Outro" precisa existir** (decisão do fundador): cheque e depósito ainda
aparecem nesse mercado, e sem ele a pessoa escolhe errado só para fechar a
folha — o que seria pior que não ter o dado, porque um dado errado não se
distingue de um certo depois.

`TituloReceber.forma_pagamento` continua **texto livre** no banco (o comentário
do model já diz "sem inventário fechado ainda") — a lista fechada é da
interface, e "Outro" grava o que a pessoa escreveu. Não vira `enum` agora: um
`enum` com um valor "outro" que carrega texto por fora seria duas fontes para o
mesmo fato.

---

### 6. Recebimento vira entidade própria — decisão do fundador, 26/08/2026

**O problema que a motivou:** dois recebimentos parciais no mesmo título
sobrescreveriam a data e a forma do primeiro. `TituloReceber` tem
`valor_recebido` (um número), `data_pagamento` (uma data) e `forma_pagamento`
(um texto). Recebi R$ 1.000 em Pix dia 5 e R$ 1.400 em dinheiro dia 20: o valor
soma certo (R$ 2.400), mas a data vira 20 e a forma vira "dinheiro" — **o
primeiro recebimento deixa de existir como fato**.

**As palavras do fundador, porque nomeiam o critério para a próxima vez:** "o
dado some em silêncio. O total continua certo, ninguém percebe que a data e a
forma do primeiro pagamento foram sobrescritas, e quando alguém perguntar
'quando ele pagou os primeiros mil', não tem como reconstruir. É o mesmo
raciocínio da resolução de município: dado não gravado na hora não volta
depois. Uma migration a mais contra dado perdido para sempre."

**Entidade `Recebimento`:** `titulo_id` · `valor` (centavos, inteiro) · `data` ·
`forma` · `usuario_id` · `empresa_id`, com RLS, política e `GRANT` no mesmo
commit (`CLAUDE.md` §3).

**Consequência que esta decisão arrasta, e que precisa ser dita agora:** os três
campos do título (`valor_recebido`, `data_pagamento`, `forma_pagamento`) **saem
da tabela**, não viram cache dela. Mantê-los ao lado de `Recebimento` seria
exatamente as duas fontes de verdade que o `CLAUDE.md` §9 proíbe ("duas fontes
de verdade divergem e o cliente vê frete quitado com boleto aberto") — o mesmo
raciocínio que já vale para a situação financeira. Tudo passa a derivar dos
recebimentos.

Isso faz a Tarefa 3 crescer, e o plano assume isso em vez de descobrir no meio:

- `criarTituloJaRecebi` passa a criar título **e** recebimento na mesma
  transação (hoje grava `valor_recebido`/`data_pagamento` direto na linha do
  título).
- `situacaoFinanceira` deixa de ler `valor_recebido` do título e passa a
  receber os recebimentos — continua função pura, sem acesso a banco.
- `comSituacaoEmLote` e `resumoFinanceiroDoCliente` passam a agregar
  `Recebimento`, mantendo a leitura **em lote** (nunca uma consulta por linha,
  pelo motivo medido em 18-20/08).
- O contraste do §3 vale para a tabela nova, como para qualquer outra.

**A Tarefa 1 não depende disso** e segue como está: ela cria título em aberto,
sem nenhum centavo recebido.

---

## O que fica de fora desta vez

- **Gerar relatório e o título automático por relatório** — item 7. A
  especificação §7 ("Como um serviço vira título") lista dois caminhos; este
  item constrói só o **manual** (faturar direto no frete). `relatorio_id`
  continua nulo em todo título, como já está.
- **"Uma cobrança gerada por relatório é uma linha só"** (§4.5) — no item 6
  toda cobrança é de um frete só, então uma linha é um título. O agrupamento
  nasce no item 7, e é lá que se decide o que a linha `{rota}` da mensagem diz
  quando a cobrança cobre vários fretes (registrado nesta rodada, decisão do
  fundador: "decide lá, com o caso na frente").
- **Tela de editar o modelo de mensagem de cobrança** — item 9, MVP parcial
  (`docs/especificacao.md` §9): entra só o texto fixo, exatamente como a ordem
  de serviço no item 5.
- **Pendências da dashboard** ("cobranças vencidas") — item 8. A regra do
  boleto (§8 item 11: boleto não gera pendência) é construída aqui na parte que
  cabe aqui: **boleto não exibe "Cobrar no WhatsApp"**. A parte da pendência
  fica para o item 8.
- **Tela de Configurações que edita a chave Pix** — item 10. Aqui entra só a
  coluna e a folha do campo que falta (decisão 2).
- **Assinatura vencida bloqueando escrita** — item 13.

---

## As tarefas

### Tarefa 1 — Faturar frete: a folha e o título em aberto

**Sem migration.** `titulo_receber` já tem todos os campos.

- `src/lib/servicos/titulos.ts`: `faturarServico(empresaId, servicoId, {
  vencimento, formaPrevista })` — cria `TituloReceber` com `status: "aberto"`,
  `integral: true`, `valor_recebido: null`, `cliente_id`/`valor` derivados do
  próprio `Servico` (nunca do formulário — mesma razão de
  `criarTituloJaRecebi`, e o que o §8 item 12 protege).
  - Conferência de FK contra a empresa em `servico_id`, o único identificador
    que chega de fora (`CLAUDE.md` §3).
  - O índice único parcial `titulo_receber_um_integral_por_servico` já recusa
    o segundo integral sob concorrência — traduzir `P2002` para a mesma
    mensagem, como `criarTituloJaRecebi` faz.
  - Recusa frete não finalizado e frete arquivado.
- `vencimentoPadrao`, **dentro de `src/lib/servicos/titulos.ts`** — o cálculo
  dos dois primeiros níveis: `Cliente.prazo_pagamento_dias` ??
  `Empresa.prazo_padrao_dias`, somado à data de hoje **no fuso de Fortaleza**
  (`diaEmFortaleza`, nunca UTC cru: um frete faturado às 22h de Fortaleza é
  01h UTC do dia seguinte, e o vencimento sairia um dia adiantado). O
  terceiro nível é a própria folha.

  **Correção do plano, decisão do fundador em 26/08/2026, achado do
  `/revisar`:** a primeira versão desta linha mandava criar
  `src/lib/servicos/vencimento.ts`. O plano é que estava errado — vencimento
  de título é o mesmo assunto que título, e duas funções de uma linha num
  arquivo só delas seriam o arquivo especulativo que o `CLAUDE.md` §6
  proíbe. Registrado em vez de corrigido em silêncio para não ser reaberto
  por quem comparar o plano com o código.
- `src/components/ui/FolhaDeFaturamento.tsx` (novo): vencimento pré-preenchido
  e editável (reaproveita `FolhaDeCalendario`), chips **Boleto** / **Outro**
  (`ChipEscolha`, já existe), principal **Faturar frete**.

  **"Outro" vem marcado por padrão — decisão do fundador, 26/08/2026, achado
  do `/revisar`, e o motivo fica escrito para ninguém "corrigir" depois
  achando que boleto é mais comum:** cobrança marcada como boleto **não**
  exibe "Cobrar no WhatsApp" e não gera pendência na dashboard
  (`docs/especificacao.md` §8 item 11 e §4.5 — o banco já avisa o atraso).
  Com "Boleto" pré-marcado, quem confirmasse sem prestar atenção perderia a
  ação de cobrar **e não entenderia por quê** — o botão simplesmente não
  estaria lá. O padrão errado aqui não erra um campo: some com uma ação.

  **Vencimento no passado é permitido — decisão do fundador, 26/08/2026**,
  mesma rodada. Recusar obrigaria a mentir na data: faturar um frete antigo
  cujo prazo já venceu é caso real, e quem faz isso está **registrando o que
  aconteceu, não criando dívida nova**. A cobrança nasce vencida, e é isso
  mesmo que a tela deve mostrar.
- `src/app/(app)/fretes/[id]/`: o botão principal passa a ser **Faturar frete**
  quando o frete está finalizado e sem título ativo — o rótulo que
  `docs/componentes.md` já prevê para esse estado.
- Testes: cálculo do vencimento nos três níveis e na virada de dia de
  Fortaleza; recusa do segundo título; isolamento entre empresas no
  `servico_id`; a etiqueta do frete virando **Faturado**.

### Tarefa 2 — Tela de Cobranças

Substitui a provisória de `src/app/(app)/cobrancas/page.tsx`.

- `src/lib/servicos/cobrancas.ts` (novo): `listarCobrancas` com os filtros de
  §4.5 (situação · cliente · período) e os **três números do topo** — A receber
  · Vencido · Recebido no mês. Os três **não respondem aos filtros** (§4.5), e
  **Vencido é um recorte de A receber**, com o rótulo dizendo isso.
  - Leitura em lote, nunca uma consulta por linha — mesma regra que
    `comSituacaoEmLote` já segue, e pelo mesmo motivo medido em 18-20/08.
- Agrupamento **Vencidas · Vence hoje · A vencer**, com "hoje" no fuso de
  Fortaleza.
- **Estado vazio:** `docs/componentes.md` prevê principal **Gerar relatório**,
  que é item 7 e não existe. `CLAUDE.md` §8 proíbe botão que não leva a lugar
  nenhum e manda dizer o que falta para a ação existir. Nesta tarefa o estado
  vazio usa a neutra **Ver os N fretes** (que existe e leva a Fretes filtrado
  por A faturar) e o texto diz o que destrava a tela. **Gerar relatório entra
  no item 7**, e fica registrado no diário como pedido ao Design.
- Total contextual que recalcula com os filtros (§4.5).

**Decisões do fundador, 26/08/2026, ao planejar esta tarefa.** As quatro
primeiras confirmam a recomendação apresentada; a quinta responde uma pergunta
que o chip "Recebidas" criou.

1. **O filtro de Período conta pelo vencimento** — é a data que a tela inteira
   já usa para agrupar.

2. **A tela abre sem filtro de período** (a situação abre em "Em aberto"). Não
   é preferência de layout, e o motivo fica escrito porque já valeu uma vez:
   **é o mesmo da lista de fretes** (item 4, Tarefa 2) — abrir no mês esconde
   justamente o que mais importa. Lá o que sumia era o frete recém-lançado;
   **aqui é pior**, porque a cobrança vencida em junho é exatamente a que
   precisa aparecer, e um padrão "este mês" a esconderia em agosto. O protótipo
   abre em "Este mês" (`referencia/.../TelaCobrancas.dc.html`, `periodo: 'Este
   mês'`) — evidência corroborante, nunca autoridade (`CLAUDE.md` §13).

3. **Entra o chip "Recebidas", com um quarto grupo "Recebidas em <mês>"**, que
   só aparece quando essa situação está escolhida. `docs/especificacao.md` §4.5
   nomeia três grupos; o quarto vem do protótipo e da necessidade: sem ele, o
   número "Recebido no mês" do topo não leva a lugar nenhum, e todo título
   criado por "Já recebi" (item 3) não aparece em Cobranças em canto nenhum.

4. **Dentro de "Recebidas", o período conta pela data do recebimento
   (`data_pagamento`), não pelo vencimento — e o motivo fica escrito aqui
   porque sem ele isso parece inconsistência.** Título criado por
   `criarTituloJaRecebi` nasce `pago` **sem vencimento nenhum**: o campo é
   nulo. Contar por vencimento dentro de "Recebidas" faria esses títulos
   sumirem dos dois lados — não caem em Vencidas/Vence hoje/A vencer (não têm
   vencimento) e também não passariam pelo filtro de período. A exceção existe
   para o número do topo e a lista dizerem a mesma coisa, não por conveniência.

5. **A linha só vira tocável na Tarefa 4**, quando o detalhe da cobrança
   existir. Linha que não leva a lugar nenhum é o que `CLAUDE.md` §8 proíbe, e
   adiantar meio detalhe aqui quebraria "uma tarefa por vez".

**Título parcialmente recebido: a LINHA fica na Tarefa 3, o NÚMERO não pode
esperar.** Pergunta do fundador ao aprovar: um título parcial está em aberto e
tem dinheiro dentro — aparece nos dois grupos ou só em aberto? A inclinação
dele, **só em aberto** (ainda é cobrança pendente), fica registrada como a
direção, mas a decisão da linha pertence à **Tarefa 3**: hoje esse estado é
**inalcançável** — o único caminho que preenche `valor_recebido` é
`criarTituloJaRecebi`, que preenche o valor inteiro e marca `pago`
(`CLAUDE.md` §2, item 7, terceira categoria).

O que não pode esperar é **a soma dos três números do topo**, porque o código
que soma se escreve nesta tarefa e ficaria errado no dia da Tarefa 3 **sem nada
avisar** — a mesma classe de problema do `CLAUDE.md` §2 ("texto que está certo
só por coincidência de estado envelhece calado"), aqui em código e em dinheiro.
A regra é a inclinação acima aplicada ao número: **"A receber" e "Vencido"
somam o SALDO** (valor menos o que já entrou) e **o pedaço já recebido entra em
"Recebido no mês"** — nada contado duas vezes, nada sumindo. Hoje o resultado é
idêntico ao de somar o valor cheio (todo título aberto tem `valor_recebido`
nulo), então isto não muda número nenhum visível agora; muda no dia em que o
parcial existir. Em lote, sem consulta por linha: soma dos valores menos soma
do já recebido, duas agregações, nunca uma por título. **O teste desta tarefa
mede o parcial mesmo sem caminho na interface**, semeando o título direto no
banco (`/tests` fala com o banco de verdade) — senão a regra fica escrita e não
medida.

### Tarefa 3 — Folha de recebimento e recebimento parcial

**Migration:** tabela `recebimento` (decisão 6), com `ENABLE` + `FORCE ROW
LEVEL SECURITY`, política com `USING` e `WITH CHECK` explícitos, `GRANT` a
`fretigate_app` sem `DELETE`, índice em `empresa_id`, e declaração em
`POLITICAS_ESPERADAS` (`tests/isolamento/schema.test.ts`). **Conferência de FK
de `titulo_id` contra a empresa no serviço** — o Postgres não aplica RLS ao
verificar chave estrangeira (`CLAUDE.md` §3), com teste próprio.

Na mesma migration, os três campos derivados saem de `titulo_receber`
(`valor_recebido`, `data_pagamento`, `forma_pagamento`) — decisão 6, para não
conviverem com a nova tabela como segunda fonte de verdade.

- `src/components/ui/FolhaDeRecebimento.tsx` (novo): campo de valor editável
  pré-preenchido com o saldo (`TecladoNumerico`, já existe), chips de data
  **Hoje · Ontem · Outra data**, chips de forma (decisão 5), pílula em linha
  **Valor todo**, principal **Confirmar recebimento**.
- `registrarRecebimento`: grava um `Recebimento` e, na mesma transação, ajusta
  `TituloReceber.status` — soma dos recebimentos igual ao valor do título →
  `pago`; menor → continua `aberto`, e a situação do frete passa a **Parcial**.
  - **Recusa valor maior que o saldo e valor zero ou negativo**, no servidor.
  - **O saldo é calculado dentro da gravação, não numa consulta antes dela** —
    mesma classe de corrida que `editarServicoComProtecaoDeTitulo` já fechou
    na Tarefa 4 do item 4: dois recebimentos simultâneos que leem o mesmo
    saldo antes de qualquer `INSERT` terminar receberiam a mais, cada um
    achando que cabia.
  - `criarTituloJaRecebi`, `situacaoFinanceira`, `comSituacaoEmLote` e
    `resumoFinanceiroDoCliente` migram para `Recebimento` nesta tarefa
    (decisão 6).
  - **Título pago não é editado** (§8 item 5) — a folha não abre para título
    já pago; a principal do detalhe vira **Recebido ✓** desabilitada.
- Deslizar revela **Marcar recebido** na lista de Cobranças e em Meus fretes
  (`docs/componentes.md` já prevê os dois).
- **Secundária "Marcar recebido" no detalhe do frete** — achado do segundo
  `/revisar` da Tarefa 1 (26/08/2026), registrado aqui para não escapar do
  escopo. `docs/componentes.md` (linha 447) prevê essa secundária no detalhe,
  e a partir da Tarefa 1 o estado **Faturado** existe de verdade — sem ela, o
  frete faturado fica sem nenhum caminho para registrar recebimento a partir
  da própria tela dele. Não foi construída na Tarefa 1 pela regra de sempre
  (a ação de fundo não existia ainda); nasce aqui, junto da folha.

**Três decisões do fundador, tomadas depois do código escrito, ao revisar o
resultado da tarefa (26/08/2026) — registradas aqui com o motivo, não só no
código:**

1. **Nunca aceitar valor maior que o saldo — nem por engano, nem como
   "crédito" para o cliente.** A mensagem de recusa diz o saldo em reais
   (`"Valor maior que o saldo em aberto (R$ X,XX)."`), para a pessoa corrigir
   na hora, sem precisar calcular de cabeça quanto falta. Palavras do
   fundador: "aceitar mais cria um estado que não tem nome no produto — não
   é quitado nem aberto, e nenhuma tela sabe mostrar. Ela corrige na hora e
   você não grava dado que ninguém sabe ler." Continua existindo uma segunda
   mensagem, sem o valor, só na corrida real entre dois recebimentos
   simultâneos (`traduzirFalhaDeRecebimento`, `src/lib/servicos/titulos.ts`)
   — ali, buscar o saldo de novo só para a mensagem não compensaria o
   round-trip extra num caminho quase inatingível.
2. **O teto do campo de valor na folha é o saldo, não o valor cheio do
   frete.** `TecladoNumerico` já tinha um teto genérico
   (`TETO_CENTAVOS`, um valor grande, para nunca estourar o tipo numérico);
   `FolhaDeRecebimento` agora trava o próprio antes disso, no saldo. Mesmo
   raciocínio da decisão 1: "o saldo é o que falta, e é o número que a folha
   já mostra" — travar aqui evita o vaivém de digitar demais, confirmar e só
   então ler o erro do servidor.
3. **"Já recebi" grava um `Recebimento`, com a mesma regra de qualquer outro
   recebimento — não é um caminho à parte.** Já era assim desde que esta
   tarefa começou (`criarTituloJaRecebi` cria título e recebimento no mesmo
   `create` aninhado), e o fundador confirmou a decisão com o motivo, para
   não ser vista como acidente de implementação: "sem isso, 'recebido no
   mês' mente no primeiro mês real de uso, e é o número que eu olho para
   saber quanto entrou. E a inconsistência é pior que o buraco: um caminho
   grava recebimento e o outro não — a mesma informação existe ou não
   dependendo de como o dinheiro entrou, e ninguém consegue explicar isso
   depois."

**Backfill da migration, confirmado.** A migration
(`20260826070000_recebimento_e_derivacao_de_titulo`) precisou aproximar
`usuario_id` dos recebimentos pré-existentes por `Servico.
criado_por_usuario_id` (não existe, e nunca existiu, registro de quem deu
baixa num título "Já recebi" antes desta tarefa). Perguntado se essa
aproximação seria aceitável, o fundador respondeu: "os títulos existentes
são de teste, sem cliente real: se der migration simples, faz; se não, apaga
e recomeça. Não existe banco de produção ainda." A migration simples
funcionou (aplicada, suíte completa verde) — fica como está, sem reescrever.

**Quarta decisão do fundador: buraco da Tarefa 2 (Cobranças não excluía
frete arquivado das somas) corrigido nesta tarefa, não levado para a
Tarefa 4.** Achado do terceiro `/revisar`: `arquivarServico` não trava nem
toca o título — um frete arquivado com título ainda aberto continuava
contando em "A receber"/"Vencido", e o deslizar continuava oferecendo
"Marcar recebido" para uma ação que `registrarRecebimento` já recusa. O
fundador decidiu corrigir na hora, não adiar: "é dinheiro: 'A receber' e
'Vencido' mostram valor de frete arquivado, na tela que existe justamente
para responder quanto há a receber. Não é botão inconveniente, é número
errado... você tem o contexto na mão agora; deixar para a tarefa 4 é
recarregar tudo e arriscar escapar. E é filtro na consulta, não redesenho."
`resumoDeCobrancas` e `listarCobrancas` (situações em aberto) ganharam
`servico: { arquivado_em: null }` no `where` — a cobrança some da lista e
das somas, e o botão de deslizar deixa de existir junto, sem precisar de
lógica própria para escondê-lo. **Não se estende a "Recebidas"**: dinheiro
já recebido continua contando, mesmo que o frete seja arquivado depois —
arquivar não apaga histórico (`CLAUDE.md` §7).

### Tarefa 4 — Detalhe da cobrança

Planejamento detalhado em 26/08/2026 (achado de mockup real: os estados
`detalhe` e `parcial` de `referencia/.../TelaCobrancas.dc.html` já desenham
esta tela — evidência corroborante, não usada até agora por ninguém ter
procurado).

- `src/app/(app)/cobrancas/[id]/page.tsx` (novo), mesma estrutura do detalhe
  do frete.
- Ordem já medida pelo Design (`docs/componentes.md`): resumo (cliente ·
  referência · valor · marca de prazo/parcial) → campos (VENCIMENTO ·
  SITUAÇÃO · FORMA) → **ações** → fretes incluídos.
- **Requisito somado, medido e não estimado:** a ação principal fica visível
  sem rolar, no pior caso — **e o pior caso é parcial COM vencido ao mesmo
  tempo**, não parcial isolado (correção do fundador, 26/08/2026, ao aprovar
  este plano): as duas condições são independentes (`grupoDaCobranca` e
  `parcial` não se excluem) e coexistem quando um título vencido já recebeu
  parte. A marca de prazo (vencida) e a linha SITUAÇÃO (recebeu X, falta Y)
  crescem juntas nesse caso — é ele que precisa ser medido, não só o parcial
  sozinho. Medir com `getBoundingClientRect` e `scrollTop: 0`, nunca a olho.
- Principal **Marcar recebido** / **Receber o resto** / **Recebido ✓**
  desabilitada, conforme o estado — reaproveita `registrarRecebimentoAction` +
  `FolhaDeRecebimento`, sem action nova.
- Secundária **Ver relatório** e **Cobrar no WhatsApp** ficam de fora (item 7
  e Tarefa 5), pela mesma regra de botão sem destino.

**Decisões tomadas ao planejar, aprovadas pelo fundador em 26/08/2026:**

1. **A linha da lista vira tocável** (`href` em `LinhaDeLista`, dentro de
   `ListaCobrancas.tsx`) — adiado de propósito na Tarefa 2 para não construir
   meio detalhe.
2. **Nome do cliente não é link à parte.** Mesma medida do item 4 (alvo de
   48px não cabe no cartão de 78px de `LinhaDeLista`) — é o mesmo componente,
   então a conclusão vale sem remedir. Corrige duas afirmações que ficaram
   desatualizadas quando essa decisão nasceu para "Meus fretes" e não foi
   replicada para Cobranças: `docs/navegacao.md` linhas 19 e 93, e
   `docs/especificacao.md` §4.7 ("tocando o nome em qualquer linha de frete ou
   de cobrança"). Viram nome sem link, igual ao que já vale para Meus fretes.
3. **Deslizar → fechar a folha sem receber**: testado ao vivo no navegador
   antes deste plano — a linha continua normal, o painel fecha, nada some.
   Não é defeito hoje; reconferido depois do `href` entrar (a combinação
   already existe em "Meus fretes" desde a Tarefa 3, não é interação nova).
4. **Campos VENCIMENTO/SITUAÇÃO/FORMA reaproveitam `LinhaDePerfil`**, sem
   `href` — não são editáveis nesta tarefa. FORMA some quando
   `forma_pagamento_prevista` é nulo (título nascido de "Já recebi", que nunca
   pergunta isso).
5. **Sem linha PIX** — `Empresa.chave_pix` só nasce na Tarefa 5; mostrar o
   rótulo sem dado seria pior que não mostrar.
6. **"Trocar forma prevista" (Boleto/Outro) fica de fora desta tarefa,
   confirmado pelo fundador** — o mockup desenha como editável, mas nem o
   plano nem `titulos.ts` prevêem essa ação, e sua única consequência (mostrar
   ou esconder "Cobrar no WhatsApp", `docs/especificacao.md` §8 item 11) é da
   Tarefa 5. Mostra só como texto, dentro do campo FORMA.
7. **FRETES INCLUÍDOS reaproveita `LinhaDeLista`**, do mesmo jeito que
   `HistoricoDoPerfil` já faz (data como `nome`, rota como `apoio`,
   `valorCentavos`, `situacao`) — sempre 1 linha hoje (agrupamento por
   relatório é item 7), sem pílula "ver todos".
8. **COBRANÇAS ENVIADAS não entra** — a tabela `cobranca_enviada` é Tarefa 5.
9. **`textoDoPrazo`/`CLASSE_DO_PRAZO` saem de `ListaCobrancas.tsx` para
   `cobrancas-situacao.ts`**, reaproveitados pela lista e pelo detalhe — nunca
   copiados (mesmo princípio que já corrigiu três cópias de `LinhaDePerfil`
   no item 2). A composição visual inteira (tarjas Boleto/Parcial + prazo),
   batizada `MarcaDaCobranca`, **não** virou componente à parte: o resumo do
   detalhe mostra só o prazo (decisão do fundador, achado do segundo
   `/revisar`), então só a lista usa a composição completa — fica como
   função local em `ListaCobrancas.tsx`, e só as duas funções puras é que são
   genuinamente compartilhadas.

**Achados do `/revisar` (27/08/2026), todos aceitos pelo fundador:**

- **Rigor total, dinheiro:** o resumo do detalhe passava `vencimento` como a
  data de "recebido em X" para um título já pago — para um título que foi
  faturado (ganhou vencimento) e só depois recebido, isso afirmaria que o
  dinheiro entrou num dia em que não entrou. Corrigido para buscar a data real
  do último `Recebimento` (mesma consulta que `listarCobrancas` já faz para
  "Recebidas", só que para um título). Verificado ao vivo: título faturado com
  vencimento 10/08, recebido em 27/08 — lista e detalhe agora concordam em
  "recebido em 27 ago".
- **`AcaoDetalheCobranca.tsx` era cópia de `AcaoMarcarRecebido.tsx`**
  (`CLAUDE.md` §8). Generalizado: `AcaoMarcarRecebido` mudou de
  `fretes/[id]/` para `src/components/ui/`, ganhou `variante` ("secundaria"
  default, "principal" para o detalhe da cobrança) e as props
  `jaRecebeuAlgo`/`jaRecebido` (rótulo "Receber o resto" e o estado
  desabilitado "Recebido ✓", que só a cobrança usa). O detalhe do frete não
  mudou de comportamento — não passa as duas props novas, então continua
  sempre "Marcar recebido", nunca desabilitado.
- **`docs/navegacao.md` linha 40** (Perfil do cliente) ainda afirmava o link
  pelo nome que as linhas 17/19/93 já tinham corrigido — quarta ocorrência
  esquecida. Corrigida.
- **Fraseado errado em `docs/navegacao.md` linha 93 e `docs/especificacao.md`
  §4.7**: diziam "medido e revertido"/"confirmado" também para Cobranças,
  mas nada foi medido nem revertido ali — a decisão 2 (acima) já é clara que a
  conclusão vale sem remedir, e a linha nunca teve o link para reverter.
  `CLAUDE.md` §13: "afirmação de medição sobre coisa que não existe é o pior
  tipo de erro de documento". Reescrito para separar o que foi medido (Fretes)
  do que foi decidido sem medir de novo (Cobranças).
- **Marca do resumo simplificada** (decisão do fundador): mostra só o prazo
  colorido, sem as tarjas Boleto/Parcial que a lista usa — SITUAÇÃO e FORMA,
  logo abaixo, já dizem o mesmo, e o espaço ali é o mais caro da tela (é o que
  precisa caber a ação principal sem rolar).
- **`docs/componentes.md`, "Auditoria da regra de posição"** ganhou o
  registro da medição real (não só a do mockup): viewport 375×812, pior caso
  parcial+vencido, principal em `533–593` contra o topo do (+) em `711,5`.
- **`docs/navegacao.md` linha 29** ganhou o destino que faltava: FRETES
  INCLUÍDOS → Detalhe do frete.
- **Lacuna registrada, não corrigida agora** (decisão do fundador): "Voltar"
  do detalhe sempre manda para `/cobrancas` sem filtro — quem entra vindo de
  "Recebidas" ou "Vencidas" volta para "Em aberto". Não é regra escrita em
  lugar nenhum, e preservar o filtro ao voltar é uma pergunta de navegação do
  produto inteiro (a mesma existe em Meus fretes e nas listas de cadastro),
  não só desta tela — decidir uma vez, não aqui.
- **Lacuna registrada, não corrigida agora**: os rótulos VENCIMENTO/SITUAÇÃO/
  FORMA e os textos de cada estado vêm só do mockup, não de
  `docs/componentes.md` — mesma categoria já aceita para os rótulos da folha
  de faturamento (Tarefa 1): decisão provisória de produto, sem bloquear.

**Segundo passe do `/revisar` (27/08/2026):**

- **A generalização de `AcaoMarcarRecebido` tinha um `if (!podeReceber &&
  !jaRecebido) return null;` que quebrava o próprio contrato do componente**
  ("sempre montado, mesmo quando o botão não aparece", para o aviso de
  sucesso sobreviver ao `router.refresh()`). Para o detalhe do FRETE — que
  nunca passa `jaRecebido` —, um recebimento **integral** torna `podeReceber`
  falso e o `return null` matava o componente inteiro antes de chegar no
  aviso, derrubando junto o "Recebimento registrado" no instante em que ele
  devia aparecer. Rigor total (dinheiro/UX de confirmação): removido o
  `return` antecipado, voltando à mesma estrutura de sempre (botão OU nada OU
  desabilitado, e o resto do JSX sempre alcançável).
- **`MarcaDaCobranca` ficou com um consumidor só** depois da simplificação do
  resumo (achado do primeiro passe) — a lista continua usando a composição
  inteira (tarjas + prazo), mas o detalhe passou a montar só o prazo. Sem um
  segundo consumidor real, o componente separado violava `CLAUDE.md` §6
  ("sem camada sem dois casos de uso reais"). Desfeito: `MarcaDaCobranca`
  voltou a ser função local em `ListaCobrancas.tsx`; só `textoDoPrazo`/
  `CLASSE_DO_PRAZO` (as duas funções puras, essas sim com dois consumidores
  reais) continuam em `cobrancas-situacao.ts`.
- **Citações de linha de `docs/componentes.md` (432, 437) ficaram desatualizadas**
  pela própria inserção desta tarefa na "Auditoria da regra de posição" (+12
  linhas, deslocando tudo abaixo). Corrigidas nos arquivos que este commit
  toca (`AcaoMarcarRecebido.tsx`, `fretes/[id]/page.tsx`, este plano) — as
  citações em arquivos que a tarefa não tocou (ex.: `FolhaDeCalendario.tsx`,
  `mais/page.tsx`) não entram, mesmo precedente já registrado em
  `docs/diario.md` ("só a frase que esta tarefa escreveu foi corrigida — o
  resto do documento já usava esse atalho antes, e não é desta tarefa
  arrumar").
- **A régua da medição de altura estava errada**: usei o topo da barra
  (`729`) como a dobra; a regra escrita (`CLAUDE.md` §8) é o topo do **(+)**,
  que sobe acima da linha da barra. Remedido: o círculo do (+) começa em
  `711,5` neste viewport (a barra em si em `729`, o botão sobe `17,5px`
  acima). A conclusão não muda (a principal continua toda acima), só a folga
  registrada — de `136px` (errado) para `≈119px` (contra a referência certa).
- **`ultimoRecebimentoEm` extraída para `titulos.ts`**, em vez de ficar como
  consulta solta na página — a mesma regra ("recebido" é a data do
  `Recebimento`, nunca o vencimento) já existia em `listarCobrancas`, e uma
  segunda cópia em `cobrancas/[id]/page.tsx` seria a mesma duplicação que o
  primeiro passe já tinha corrigido para `referenciaDoServico`. Ganhou dois
  testes em `tests/titulos.test.ts` (bloco 11) — nenhum, o do detalhe, e o de
  dois recebimentos fora de ordem, provando que a função acha a data mais
  recente, não a última gravada.
- **`LinhaDeLista.PropsEstatica` (nem link nem botão) ficou sem nenhum
  consumidor real** assim que a linha de Cobranças ganhou `href` — o próprio
  comentário da variante já dizia que ela era "a linha de Cobranças até a
  Tarefa 4". `CLAUDE.md` §6 ("sem camada sem dois casos de uso reais")
  também vale para uma variante de tipo, não só para componente inteiro:
  removida a variante e o ramo de render que ela alimentava; `LinhaDeLista`
  agora exige `href` ou `onClick` sempre.
- **Lacuna registrada, não corrigida agora**: um título arquivado cai em
  `notFound()` no detalhe da cobrança, enquanto o detalhe do frete lê
  registro arquivado de propósito (§7, "nada é apagado"). Nenhum documento
  decide qual dos dois vale para cobrança, e o caso é inalcançável hoje
  (nada arquiva título até o estorno, Tarefa 6) — revisitar lá.
- **Não é achado, é convenção já existente**: `docs/navegacao.md` e
  `docs/componentes.md` marcam a tela ✅ com secundárias (Cobrar no WhatsApp,
  Ver relatório) que a Tarefa 4 não constrói. O ✅ já significava "design
  especificado", não "construído", antes desta tarefa (a própria linha
  "Detalhe da cobrança ✅" já existia assim); não é uma contradição nova.

**Terceiro passe do `/revisar` (27/08/2026):**

- **As citações de linha corrigidas no segundo passe estavam erradas de
  novo** — a inserção desta tarefa em `docs/componentes.md` deslocou tudo
  abaixo em **15** linhas, não 12 (a edição cresceu ao corrigir a referência
  da dobra, no mesmo passe). Corrigido por `grep` direto no arquivo atual
  (447/452), não por aritmética — a mesma conta errada duas vezes é sinal de
  não confiar em contar linha por cabeça.
- **`AcaoMarcarRecebido` (em `src/components/ui`) importava
  `registrarRecebimentoAction` de `src/app` — único arquivo da pasta que
  alcançava `app`.** `CLAUDE.md` §6: `/components/ui` é "componentes base",
  não amarrados a domínio. Corrigido para o mesmo padrão que
  `FolhaDeRecebimento` (um nível abaixo) já usa: a ação vira prop
  (`registrar`), injetada por cada chamador (`fretes/[id]/page.tsx` e
  `cobrancas/[id]/page.tsx` passam a mesma `registrarRecebimentoAction`, sem
  duplicar nada).
- **O cabeçalho do detalhe da cobrança (seta de Voltar + eyebrow) era cópia
  literal do detalhe do frete** — `CLAUDE.md` §8, "proibido copiar
  componente". Extraído para `CabecalhoDeDetalhe.tsx`, usado pelos dois. As
  outras telas de detalhe com o mesmo bloco (fora do escopo desta tarefa)
  não entraram — mesmo critério do §2, "não refatore o que não faz parte da
  tarefa".
- **Discordância registrada, não aplicada**: o `/revisar` apontou o alvo de
  44px do "Voltar" como abaixo do mínimo de 48px do `CLAUDE.md` §8. Mas
  `docs/componentes.md` (§ "Ícone", linha sobre alvo isolado) já documenta
  44px como o alvo de "voltar, fechar", separado do 48px do (+) — é o padrão
  usado pelo detalhe do frete, copiado de propósito. Não é divergência.
- **Lacuna nova, registrada**: `grupoDaCobranca` não tem ramo para
  `status = "cancelado"` — um título cancelado cairia nos ramos de
  vencimento (mostraria "Vencida"/"Em aberto" para algo que não é cobrança
  ativa). Inalcançável hoje (nada cancela título até o estorno, Tarefa 6);
  revisitar junto da lacuna do arquivado, acima — as duas são a mesma
  pergunta (o que a Tarefa 6 precisa decidir sobre título fora de circulação
  no detalhe da cobrança).

**Quarto passe do `/revisar` (27/08/2026):**

- **Um comentário apagado por engano no segundo passe carregava um pedido ao
  Design ainda em aberto** — "confirmação de posição da etiqueta Parcial",
  da Tarefa 3, nunca respondido e não registrado em nenhum outro documento.
  Ao reescrever `MarcaDaCobranca` como função local (desfazendo a extração
  do segundo passe), a frase caiu. Restaurada, com a ressalva de que ainda
  está sem resposta — entra na lista de "pedido ao Design" desta tarefa,
  abaixo, para não se perder de novo.
- **Lacuna registrada**: o prazo no resumo do detalhe (`text-apoio
  font-medium`, minúsculo, cor do grupo) segue o mesmo tratamento da lista.
  O mockup desenha esse mesmo texto em `700 12px`, maiúsculo, sem cor de
  fundo — diferente do que a lista usa. `docs/estilo.md` não nomeia um
  papel para este texto no resumo do detalhe (só "valor" e "nome" como
  Primário). Fica como está (reaproveita o tratamento já existente da
  lista) até o Design decidir se o resumo do detalhe merece um tratamento
  próprio.
- **A entrada do diário desta tarefa, com a lista de pedidos ao Design
  (as duas lacunas acima), é escrita ao fechar** — CLAUDE.md §13 exige isso
  antes do commit, não durante a construção.

### Tarefa 5 — Cobrar no WhatsApp, chave Pix e o texto da cobrança

**Fusão decidida pelo fundador em 27/08/2026, ao planejar a tarefa**: o plano
original separava esta tarefa (chave Pix e o texto) de "Cobrar no WhatsApp"
(a antiga Tarefa 6). Ao detalhar a construção, ficou claro que `FolhaDePix`
nasceria sem nenhum gatilho real — os dois lugares que a acionam ("Cobrar no
WhatsApp" e "Gerar relatório com Pix") ainda não existiam, um deles só
nascendo na tarefa seguinte. É o mesmo problema que `CLAUDE.md` §6 proíbe
("sem camada sem dois casos de uso reais"), e o precedente mais próximo já
tinha resolvido junto: a Tarefa 2 do item 5 construiu `mensagens.ts`
(`montarMensagemOrdem`) na mesma tarefa que seu gatilho real ("Enviar ordem
no WhatsApp"), nunca em separado. As duas tarefas viram uma.

**Aviso do fundador, registrado para quem construir:** esta tarefa fica
grande — migration com duas coisas (`chave_pix` e `cobranca_enviada`),
mensagem, folha nova, botão em duas telas, aviso de confirmação, histórico e
a regra do boleto. Do tamanho de uma tarefa de tela cheia. **Se durante a
construção ficar claro que dá para cortar em dois commits — a base
(migrations, `mensagens.ts`, `FolhaDePix`) e a tela (o botão, o aviso, o
histórico) —, vale fazer**, como já aconteceu com os três perfis do item 4
(Tarefa 6, um commit por perfil). Não é obrigatório partir; é permissão
registrada antecipadamente, para não parecer desvio do plano se acontecer.

- **Migration:** `empresa.chave_pix` (texto, nulável). Sem `enum`, sem
  validação de formato: chave Pix pode ser CPF, CNPJ, e-mail, telefone ou
  aleatória, e recusar uma válida é pior que aceitar uma torta.
- `src/lib/servicos/mensagens.ts`: `montarMensagemCobranca`, com o texto
  aprovado na decisão 1 e a mesma regra de blocos de `montarMensagemOrdem`.
  Recebe parâmetros já formatados (valor, vencimento, rota) — a função nunca
  formata, mesma separação já vigente.
- `src/components/ui/FolhaDePix.tsx` (novo, ou `FolhaDeTelefone` generalizada
  se a diferença couber em props): título **"Falta a chave Pix da sua
  empresa"**, já escrito em `docs/componentes.md` §12. "Agora não" **não
  cancela a ação** (decisão 2).
- Testes do molde da mensagem: com e sem Pix, com e sem rota, vencido e a
  vencer — que a linha "Venceu" só aparece quando passou, no fuso de
  Fortaleza.
- **Migration:** tabela `cobranca_enviada` (`titulo_id` · `usuario_id` ·
  `enviado_em` · `empresa_id`), com `ENABLE` + `FORCE ROW LEVEL SECURITY`,
  política de isolamento com `USING` **e** `WITH CHECK` explícitos, `GRANT` a
  `fretigate_app` sem `DELETE`, e índice em `empresa_id` — tudo no mesmo
  commit (`CLAUDE.md` §3).
  - **Conferência de FK no serviço:** `titulo_id` precisa ser conferido contra
    a empresa antes de gravar — o Postgres não aplica RLS ao verificar chave
    estrangeira (`CLAUDE.md` §3), e isso tem teste próprio.
  - Declarar `cobranca_enviada` em `POLITICAS_ESPERADAS`
    (`tests/isolamento/schema.test.ts`), ou a suíte reprova — que é o
    comportamento querido.
- Ação **Cobrar no WhatsApp**: pílula em linha na lista, secundária no
  detalhe.
- **Aviso "Enviei" / "Ainda não" ao voltar da conversa**, o mesmo padrão já
  construído no item 5 (`AcaoOrdemDeServico.tsx`) — só a resposta "Enviei"
  grava `CobrancaEnviada`. Sem isso, tocar e desistir registraria como
  cobrado.
- Linhas já cobradas exibem **quem cobrou e quando** ("cobrado há 2 dias por
  Monalisa"); o detalhe mostra o histórico.

  **Conferência pedida pelo fundador ao permitir vencimento no passado
  (Tarefa 1, decisão de 26/08/2026): a marca não pode ficar estranha num
  título que nasceu vencido e nunca foi cobrado.** A resposta é que ela
  **não aparece**, e o motivo tem que continuar sendo esse: "cobrado há X
  dias" sai de `CobrancaEnviada` — uma linha que só existe quando alguém
  respondeu "Enviei" ao voltar do WhatsApp. Título nunca cobrado não tem
  nenhuma linha, então não tem o que exibir; a linha mostra só a situação
  (Vencida) e o valor.

  **O erro a não cometer, que é o que a conferência protege:** derivar
  "cobrado" de qualquer outra coisa — a data de faturamento, o vencimento,
  ou "está vencido há tanto tempo". Um título que nasce vencido tem
  vencimento no passado **desde o primeiro instante**, então qualquer
  derivação desse tipo diria "cobrado há 40 dias" para algo que ninguém
  cobrou nenhuma vez. A única fonte de "cobrado" é `CobrancaEnviada`.
- **Boleto não exibe "Cobrar no WhatsApp"** (§8 item 11) — continua na lista,
  com marca discreta.
- Sem telefone do cliente: **folha do campo que falta**, com principal
  **"Salvar e cobrar"** — `FolhaDeTelefone` já nasceu genérica para isto
  (`rotuloBotao`/`apoio`), sem refazer.

### Tarefa 6 — Estorno

**Migration obrigatória, achada na Tarefa 1 e registrada aqui para quem
construir esta ler — não só na docstring de `faturarServico`.** O índice único
parcial `titulo_receber_um_integral_por_servico`
(`20260814150000_titulo_integral_unico_por_frete`) é
`WHERE integral = true AND arquivado_em IS NULL` — **não exclui
`status = 'cancelado'`**. Sem mexer nele, o estorno cancela o título e o frete
volta a "A faturar" na tela, mas **refaturar falha**: a leitura de
`faturarServico` deixa passar (procura só título ativo) e o banco recusa com
erro de unicidade, traduzido para "Este frete já foi faturado" — mentira, já
que o anterior está cancelado. A correção é acrescentar `AND status <>
'cancelado'` ao índice, fazendo-o dizer o que a regra diz: **no máximo um
título integral ativo por frete**.

**Não resolver arquivando o título estornado.** Arquivar liberaria o índice
sem mexer nele, mas usaria `arquivado_em` como truque para contornar uma
restrição, misturando dois significados diferentes de "fora do ar" (§7:
arquivar é a exclusão do usuário; cancelar é o estorno). O teste da tarefa
prova o ciclo inteiro: faturar → estornar → **refaturar**.

**Decisão do fundador sobre a confirmação, 27/08/2026.** Folha inferior — o
mesmo componente já usado no resto do produto (`FolhaInferior`), não um
componente de confirmação genérico novo, nem janela modal: "já é o padrão do
produto pra 'algo sobe de baixo, você decide, e volta'. A pessoa já conhece o
gesto, e não exige componente novo." Conteúdo: título "Estornar esta
cobrança?"; as consequências em frases curtas, uma por linha ("O frete volta
para A faturar" · "O que já foi recebido deixa de contar", só quando há
recebimento — "mostrar isso numa cobrança sem nenhum recebimento diz algo que
não se aplica, e assusta à toa" · "Não tem como desfazer"); ações principal
**Estornar** e texto **Agora não**, mesmo par das outras folhas.

**Lacuna registrada para o Design, a pedido do fundador**: a principal aqui é
destrutiva, diferente do resto do produto — a cor de ação sempre foi verde, e
o inventário não tem uma variante destrutiva de botão principal. Constrói
com a principal normal (verde) e pergunta ao Design.

**Primeiro caso de confirmação antes de ação destrutiva no produto** — fica
registrado por escrito porque muda o precedente: Arquivar frete e Arquivar
cliente agem direto, sem perguntar antes. Se o Design decidir depois que
Arquivar também deveria confirmar, isso vira tarefa própria — não herdada
por analogia com esta.

- `estornarTitulo`: `status: "cancelado"`, nunca apagado (§7). O frete volta a
  **A faturar** sozinho, porque a situação é derivada — nenhum campo de frete
  muda (`CLAUDE.md` §9).
- Destrutiva em texto no detalhe da cobrança, **com confirmação** que diz as
  três consequências (decisão 4).
- **Fecha a promessa do §8 item 12**: a mensagem de erro de Editar frete já
  manda "Estorne o título para corrigir" — a partir daqui isso é verdade.
- Título **pago** também pode ser estornado (§8 item 5: "Título pago não é
  editado. Para corrigir, estorna e cria outro") — a confirmação diz que o
  dinheiro registrado deixa de contar.
- Item novo do inventário → Design, registrado no diário.

### Tarefa 7 — "A receber" e "Vencido" nos perfis

Fecha a pendência deixada de propósito no item 4 e no item 6.

**Decisão do fundador, 27/08/2026, antes de escrever código — "A receber" e
"Vencido" são situação atual, sempre, no perfil do cliente e na lista de
Clientes.** Não respondem ao chip de período — mesmo princípio já decidido
para Cobranças e a dashboard (`docs/especificacao.md` §4.6: "'a receber' e
'vencido' são situação atual, e um filtro tornaria o significado deles
ambíguo"). A frase do §4.7 ("com filtro de período que recalcula os quatro")
está errada e é corrigida nesta tarefa: só **já rodado** e **recebido no
período** respondem ao chip; **a receber** e **vencido** não.

**Consultas**

- `resumoFinanceiroDoCliente` (`titulos.ts`) passa de dois números para
  quatro. Ganha um parâmetro `hoje: string`, mesmo padrão de
  `resumoDeCobrancas`. `aReceber`/`vencido` são duas consultas cada (total do
  título aberto + total já recebido desses títulos), escopadas por
  `cliente_id`, servico ativo — mesmo desenho de `resumoDeCobrancas`
  (`cobrancas.ts`), só que por um cliente em vez da empresa inteira. Seis
  consultas paralelas ao todo (as duas já existentes + quatro novas).
- `valorEmAbertoPorCliente` (nova, `titulos.ts`) — saldo em aberto de **todos**
  os clientes de uma vez, para ordenar a lista e montar o apoio. Duas
  consultas: os títulos abertos com serviço ativo (`id`, `cliente_id`,
  `valor`), e `totalRecebidoPorTitulo` sobre os ids encontrados — reduzidas em
  memória por `cliente_id`. Nunca uma consulta por cliente.
- "Mais > Clientes" reaproveita `resumoDeCobrancas(empresaId, hoje).aReceber`
  para o total da empresa (`"7 cadastrados · R$ 12.080 em aberto"`,
  `referencia/.../TelaMais.dc.html`) — não escreve uma segunda função para o
  mesmo número.

**Interface**

- `ListaClientes`: terceiro critério de ordenação, "Maior valor em aberto"
  (`docs/especificacao.md` §4.7 já lista os três; `docs/componentes.md` linha
  369 já usa esse rótulo como exemplo — só o código ficava para trás). Mesmo
  padrão de três critérios que Caminhões já usa.
- Apoio da linha, com esse critério ativo: **"R$ X em aberto"**, sem "no
  total". **Decisão registrada, para não virar exceção por analogia depois:**
  o qualificador "no total" existe para distinguir o número da vida inteira
  (lista) do número por período (perfil) do MESMO conceito (`docs/
  especificacao.md` §4.7, regra geral de 22/08/2026) — "valor transportado" e
  "fretes" têm as duas versões, e por isso precisam do qualificador. "Valor
  em aberto" não tem versão por período em lugar nenhum (decisão acima: é
  situação atual, sempre, tanto na lista quanto no perfil) — não existe o
  outro recorte para confundir, então não existe qualificador para escrever.
  Se um dia "valor em aberto" ganhar uma versão por período, esta decisão se
  reabre — não se herda por analogia.
- Perfil do cliente: `ResumoDoPerfil` ganha uma segunda linha — grade de duas
  linhas de dois números, não uma fileira de quatro. Em cima, os que
  respondem ao chip de período (já rodado, recebido no período); embaixo, os
  de situação atual (a receber, vencido). Decisão do fundador: a separação
  não é estética — carrega a informação de que a linha de cima muda ao trocar
  o período e a de baixo não. Embaralhados, a pessoa troca o período, vê dois
  números mudarem e dois pararem, e lê como travamento. Rótulo/tratamento
  visual da segunda linha ficam **provisórios**, registrados como lacuna para
  o Design confirmar, com este motivo — mesmo tratamento já dado à Folha de
  Estorno (item 6, Tarefa 6).
- "A receber" e "Vencido" tocáveis (dos "três primeiros tocáveis" do §4.7)
  levam a `/cobrancas?situacao=em_aberto&cliente=<id>` e
  `?situacao=vencidas&cliente=<id>` — **sem** `periodo=`, coerente com serem
  situação atual. `cobrancas/page.tsx` ganha `?cliente=` na URL só para
  semear o filtro que já existe (`ListaCobrancas`, `clienteFiltro`) — o
  filtro em si continua no navegador, sem nova consulta ao servidor (mesmo
  desenho já documentado: "Cliente filtra no navegador, sobre o que já
  veio").

**Textos que ficam errados com este item, corrigidos aqui — achado ao revisar
o pedido do fundador (27/08/2026): o motivo da ausência de "Cobrar no
WhatsApp" no perfil do cliente muda de natureza, de falta de dado para
escopo, e o texto velho engana quem procurar "por que não tem Cobrar aqui"
sem saber que trocou.**

- `src/app/(app)/clientes/[id]/page.tsx` (docstring): dizia que "Gerar
  relatório" e "Cobrar no WhatsApp" ficam de fora pela mesma razão (dado que
  só existe a partir do item 6/7). Deixa de ser verdade para o segundo: o
  dado (valor em aberto) passa a existir nesta tarefa. Reescrita para separar
  os dois motivos — "Gerar relatório" continua esperando o item 7; "Cobrar no
  WhatsApp" não é construído nesta tarefa por não estar no escopo pedido, não
  por falta de dado.
- `src/app/(app)/clientes/ListaClientes.tsx` (docstring): a mesma classe de
  frase ("no item 4, maior valor em aberto nasce sem servir") — corrigida ao
  implementar o terceiro critério, não deixada para trás.
- **Não corrigido, e trazido como achado separado, não pedido**: `docs/
  navegacao.md` linha 40 (Perfil do cliente) já lista "Gerar relatório →
  Relatório preenchido" e "Cobrar no WhatsApp → conversa" como destinos da
  tela marcada ✅, embora nenhum dos dois exista. Não é a mesma classe de
  erro (não é uma razão-de-ausência ficando velha; é o link aparecendo pronto
  antes de existir) e não estava no que foi pedido — decisão de corrigir ou
  não fica com o fundador.

---

## O que este item exige de teste, além do de sempre

O `CLAUDE.md` §2 item 7 chama de **rigor total** dinheiro e dado que não volta.
Este item inteiro é dinheiro. Em particular:

- **Isolamento entre empresas** em `recebimento` e `cobranca_enviada` (as duas
  tabelas novas) e na conferência de FK de `titulo_id` nas duas — com o
  contraste do §3, que prova o vazamento com a proteção desligada.
- **Soma que entra em "A receber" / "Vencido" / "Recebido no mês"** — título
  cancelado não conta, título arquivado não conta, e "vencido" é recorte de "a
  receber", nunca uma soma independente que pode divergir.
- **Recebimento parcial**: acumular, nunca sobrescrever o valor; recusar valor
  acima do saldo; a situação do frete atravessando A faturar → Faturado →
  Parcial → Quitado.
- **Virada de dia no fuso de Fortaleza** em vencimento, "vence hoje" e
  "Venceu" na mensagem — três lugares onde UTC cru erra por um dia.
- **Contagem de verificações** em todo teste novo (§3, item 4).
