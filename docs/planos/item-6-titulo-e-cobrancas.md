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
`empresa.chave_pix` (Tarefa 5) e a tabela `cobranca_enviada` (Tarefa 6).

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
- `src/lib/servicos/vencimento.ts` (novo): o cálculo dos três níveis —
  `Cliente.prazo_pagamento_dias` ?? `Empresa.prazo_padrao_dias`, somado à data
  de hoje **no fuso de Fortaleza** (`diaEmFortaleza`, nunca UTC cru: um frete
  faturado às 22h de Fortaleza é 01h UTC do dia seguinte, e o vencimento
  sairia um dia adiantado).
- `src/components/ui/FolhaDeFaturamento.tsx` (novo): vencimento pré-preenchido
  e editável (reaproveita `FolhaDeCalendario`), chips **Boleto** / **Outro**
  (`ChipEscolha`, já existe), principal **Faturar frete**.
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

### Tarefa 4 — Detalhe da cobrança

- `src/app/(app)/cobrancas/[id]/page.tsx` (novo).
- Ordem já medida pelo Design (`docs/componentes.md`): resumo → campos → forma
  prevista → **ações** → fretes incluídos → cobranças enviadas.
- **Requisito somado, medido e não estimado:** a ação principal fica visível
  sem rolar, no pior caso (estado **parcial**, em que a linha SITUAÇÃO ganha
  saldo recebido e restante). Medir com `getBoundingClientRect` e
  `scrollTop: 0`, nunca a olho.
- Principal **Marcar recebido** / **Receber o resto** / **Recebido ✓**
  desabilitada, conforme o estado.
- Secundária **Ver relatório** fica de fora (item 7), pela mesma regra de botão
  sem destino.

### Tarefa 5 — Chave Pix e o texto da cobrança

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
- Testes: o molde com e sem Pix, com e sem rota, vencido e a vencer — que a
  linha "Venceu" só aparece quando passou, no fuso de Fortaleza.

### Tarefa 6 — Cobrar no WhatsApp: histórico, aviso e a regra do boleto

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
- **Boleto não exibe "Cobrar no WhatsApp"** (§8 item 11) — continua na lista,
  com marca discreta.
- Sem telefone do cliente: **folha do campo que falta**, com principal
  **"Salvar e cobrar"** — `FolhaDeTelefone` já nasceu genérica para isto
  (`rotuloBotao`/`apoio`), sem refazer.

### Tarefa 7 — Estorno

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

### Tarefa 8 — "A receber" e "Vencido" nos perfis

Fecha a pendência deixada de propósito no item 4.

- `resumoFinanceiroDoCliente` passa de dois números para **quatro** — a razão
  registrada para deixá-los fora ("um número que só pode ser zero") deixa de
  valer nesta tarefa, e a docstring diz isso.
- O apoio "· R$ X em aberto" na linha da lista de Clientes
  (`docs/especificacao.md` §4.7), também adiado pelo mesmo motivo.
- Atualizar `docs/navegacao.md` e `docs/especificacao.md` onde eles dizem
  "entram no item 6" — o estado é do repositório (`CLAUDE.md` §13), e o pedido
  ao Design entra no diário.

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
