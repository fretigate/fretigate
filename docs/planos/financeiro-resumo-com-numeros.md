# Plano — Financeiro ganha números (revisão da Opção B recusada)

Pedido do fundador, 17/09/2026: usou o hub "Financeiro"
(`docs/planos/financeiro-unifica-cobrancas-e-despesas.md`, construído em
13/09/2026 como Opção A — duas linhas, sem resumo) e achou vazio demais —
ocupa uma posição da barra e não entrega informação nenhuma antes de tocar
numa das duas linhas.

**Isto não é a Opção B do plano original** (lista única combinada de
cobrança e despesa) — aquela continua recusada, pelo mesmo motivo de
12/09/2026 ("tela nova de verdade... mudança mais profunda"). É um pedido
menor e diferente: o hub ganha **números** no topo, as duas linhas
(Cobranças/Despesas) continuam existindo por baixo — mais perto de
"Opção A com resumo", que o plano original já previa como decisão de
Design em aberto ("o hub pode ganhar, ou não, um resumo próprio... se
fizer falta, o Design decide depois", decisão do fundador, 12/09/2026).
Chegou a fazer falta.

**Nenhuma linha de código muda antes deste plano ser aprovado** — mesma
regra de sempre (`CLAUDE.md` §2).

---

## 1. Quais números — três propostas

A pergunta que o fundador marcou como difícil: **um resultado só
(entrada menos saída) ou os dois lados separados?** As três propostas
abaixo respondem essa pergunta de jeitos diferentes; nenhuma foi
escolhida.

### O que já existe hoje, para servir de base

- **Cobranças** (`resumoDeCobrancas`, `src/lib/servicos/cobrancas.ts`) já
  calcula três números, sempre da empresa inteira, sempre do mês/situação
  atual, nunca respondendo a filtro: **A receber** (saldo de títulos
  abertos), **Vencido** (recorte de A receber, só o que passou do prazo),
  **Recebido no mês** (soma de `Recebimento.valor` com `Recebimento.data`
  no mês — dinheiro que **entrou de verdade**, não o valor do frete).
- **Despesas** não tem hoje um número equivalente que sirva de base — ver
  seção 2, abaixo. O número que existe na tela de Despesas é outra coisa
  (lista filtrada, não mês inteiro).
- **Dashboard** já mostra dois números que **parecem** os mesmos candidatos
  e não são: **Faturamento do mês** (soma de `Servico.valor` no mês —
  o frete conta no mês em que rodou, tenha o cliente pago ou não; "somar é
  diferente de cobrar", `CLAUDE.md` §9) e **Lucro no mês**
  (Faturamento − Despesas do mês, os dois no mesmo regime de
  competência — nenhum dos dois é dinheiro que necessariamente já entrou
  ou saiu do bolso). É essa diferença de regime — competência (dashboard)
  contra caixa (Cobranças, e qualquer número novo de Despesas) — que torna
  a pergunta difícil: um "Lucro" novo calculado sobre dinheiro que entrou e
  saiu de verdade teria o mesmo nome de efeito que o Lucro do dashboard e
  um significado diferente por baixo.

### Proposta 1 — Dois números, lado a lado, sem combinar

**Recebido no mês** (o mesmo número que já existe em Cobranças, sem
recalcular nada) e **Pago no mês** (novo — soma de `Despesa.valor` com
`Despesa.data` no mês, a versão "caixa" da despesa, hoje só existe dentro
do Lucro do dashboard misturada com faturamento — ver seção 2).

- **Responde:** "quanto entrou" e "quanto saiu", cada um sozinho — a
  mesma pergunta que Cobranças e Despesas já respondem em separado, só
  que juntas numa olhada.
- **Não mistura** entrada e saída em nenhum resultado — não existe
  "Lucro" nem "Saldo" nesta proposta, então não compete com o Lucro do
  dashboard nem precisa de rótulo que os diferencie.
- **Risco:** o mais baixo dos três — dois números que já têm definição
  clara em outro lugar do produto, só reunidos.

### Proposta 2 — Os dois números da Proposta 1, mais um terceiro que soma os dois

Os mesmos "Recebido no mês" e "Pago no mês", **mais** um terceiro —
"Saldo do mês" (Recebido − Pago, dinheiro que entrou menos dinheiro que
saiu de verdade).

- **Responde:** as duas perguntas da Proposta 1, **e** "sobrou dinheiro
  este mês, olhando só o que já entrou e já saiu" — uma pergunta que hoje
  nenhuma tela responde (Lucro do dashboard responde uma parecida, mas em
  competência, não em caixa).
- **É a proposta que mistura entrada e saída** — precisa do rótulo
  deixando claro que "Saldo do mês" é caixa, não é o "Lucro" do
  dashboard. O precedente já existe no produto para este tipo de
  cuidado (`docs/especificacao.md` §4.7: "as duas telas mostram o mesmo
  tipo de número em recortes diferentes, e um dos dois sem
  [qualificador] confundiria" — lá resolvido com "no total" contra o chip
  de período; aqui precisaria de um equivalente, tipo "Saldo do mês
  (recebido − pago)" por extenso, ou uma nota de apoio abaixo do número).
- **Risco:** médio — o número em si é simples de calcular (uma
  subtração, nunca gravada — `CLAUDE.md` §9), o risco é inteiro de
  **leitura**: é exatamente o caso que o fundador descreveu, "dois
  lugares dizendo coisas quase iguais".

### Proposta 3 — Só "Saldo do mês", sem os dois números soltos

Um número só, o resultado de Recebido − Pago, sem mostrar os dois lados
em separado.

- **Responde:** só "sobrou dinheiro este mês" — quem quiser saber quanto
  entrou ou quanto saiu precisa entrar em Cobranças ou Despesas.
- **Risco:** o mais alto — é a versão mais compacta, mas também a que
  mais se parece com "Lucro" na leitura rápida (um número só, rótulo
  parecido, tela diferente), com **menos** informação ao lado para
  diferenciar os dois. Se o fundador tiver essa leitura ao ver a tela
  pronta, é o mesmo problema que motivou a fusão de Configurações e
  Conta virar assunto — dois lugares parecidos demais, sem critério que
  explique por que são dois.

**Recomendação, sem decidir por conta própria:** Proposta 1. Não mistura
nada (então não compete com o Lucro do dashboard, não precisa de rótulo
defensivo), e os dois números já têm definição pronta — um 100%
reaproveitado, o outro é a mesma conta que o Lucro do dashboard já faz
por dentro, só isolada. Fica a decisão com o fundador — é exatamente o
tipo de escolha que `CLAUDE.md` §9 reserva para decisão de produto
explícita, não inferência.

---

## 2. De onde vêm os números — reaproveita, ou consulta nova?

- **Recebido no mês:** 100% reaproveitado. `resumoDeCobrancas` já calcula
  esse valor exatamente como qualquer proposta acima precisa — mesma
  função, chamada de novo (é uma tela diferente, carregada em outro
  pedido; não é o caso de "mesma consulta repetida no mesmo carregamento"
  que a tarefa de 12/09/2026 corrigiu). Zero query nova.
- **A receber / Vencido**, se alguma proposta os incluir depois: mesma
  situação — já vêm de `resumoDeCobrancas`.
- **Pago no mês / Despesas no mês:** **não existe hoje um número pronto
  para reaproveitar do jeito que existe para Cobranças.** Dois lugares
  parecem candidatos e nenhum serve como está:
  - O total que aparece na tela de Despesas (`ListaDespesas.tsx`,
    `valorTotal`) é calculado **no navegador**, sobre a lista que o
    servidor mandou — que fica **limitada a 50 itens quando não há
    filtro de período** (`limitadoA50`). Sem período escolhido e com mais
    de 50 despesas lançadas, esse número já não é "total do mês", é
    "total das 50 mais recentes" — não serve para um resumo que promete
    ser da empresa inteira, sempre, como os números de Cobranças.
  - A soma certa — despesas do mês inteiro, com `arquivado_em: null`,
    agregada no banco — **já existe**, mas hoje mora dentro de
    `resumoDeLucroDoMes` (`src/lib/servicos/dashboard.ts`), misturada com
    o cálculo do Lucro. É a mesma conta, só que calculada para outro fim.
  - **O que este plano propõe:** extrair essa agregação para uma função
    própria (ex. `despesasDoMes(empresaId, hoje, idPedido)`,
    provavelmente em `src/lib/servicos/despesas.ts`, mesmo padrão de
    `resumoDeCobrancas`), e fazer `resumoDeLucroDoMes` chamá-la por
    dentro, em vez de repetir a query. Financeiro chama a mesma função.
    Uma fonte só, dois chamadores — mesmo princípio que a tarefa de
    12/09/2026 já aplicou para a soma de faturamento do mês
    (`somaDoMes`/`iniciarSomaDoMesAtual`), só que aqui não precisa do
    mecanismo de "reaproveitar dentro do mesmo pedido" (são páginas
    diferentes) — só precisa não copiar a mesma query em dois arquivos.

---

## 3. As duas entradas continuam, ou a tela ganha lista?

**Proposta deste plano: continuam.** O pedido do fundador foi "números,
não só as duas entradas" — não "lista combinada". Number no topo, as
duas linhas (`ItemMenu`, "Cobranças" e "Despesas") do jeito que já estão
logo abaixo, cada uma levando para a tela própria. Isto é a menor mudança
que resolve "vazio demais": a tela para de ter zero informação antes do
toque, sem reabrir a decisão já fechada contra a Opção B (lista
combinada, com os riscos que aquele plano já registrou — formato de
linha diferente entre cobrança e despesa, filtro que teria que decidir
como situação e categoria convivem).

Se o fundador quiser reabrir a lista combinada mesmo assim, é decisão
dele — só registro que não é o que o pedido desta conversa descreveu
("O Financeiro passa a mostrar números, não só as duas entradas" lê como
resumo em cima da estrutura atual, não como tela nova).

---

## 4. O cuidado com a dashboard — como evitar "dois lugares dizendo quase a mesma coisa"

Apontado pelo fundador, com o precedente de Configurações/Conta. A defesa
que este plano propõe, além da escolha de proposta na seção 1:

- **Nomear pelo regime, não só pelo valor.** "Faturamento" e "Lucro" no
  dashboard são competência (o frete conta quando roda); "Recebido"/
  "Pago"/"Saldo" no Financeiro seriam caixa (conta quando o dinheiro
  muda de mão). Os rótulos precisam dizer isso de um jeito que não exija
  explicação — é o mesmo padrão que `docs/especificacao.md` §4.7 já
  cobra para números parecidos em recortes diferentes.
- **Nunca reaproveitar a palavra "Lucro"** para o número do Financeiro,
  mesmo se a Proposta 2 ou 3 (que somam) for a escolhida — "Lucro" já
  tem dono (o card da dashboard, competência). Um "Saldo" com definição
  diferente e nome parecido seria o próprio risco que o fundador apontou,
  só adiado para o rótulo em vez de resolvido.
- **Os links que já existem continuam saindo da dashboard, não do
  Financeiro** — "A receber"/"Vencido" → Cobranças, "Lucro" → Despesas.
  Nenhuma proposta acima muda isso; o Financeiro é mais um lugar que
  mostra números relacionados, não substitui os links existentes.

---

## 5. O que precisa ir ao Design

- **Layout do resumo escolhido** — quantos números, se em grade (como os
  três de Cobranças) ou em pastilhas (como a dashboard), se ocupam o
  topo da tela ou ficam entre o cabeçalho e as duas linhas.
- **Rótulo exato de cada número** — em especial se a Proposta 2 ou 3
  (que somam) for escolhida: o texto que diferencia "Saldo do mês" de
  "Lucro" precisa ser lido sem confundir, e isso é escolha de palavra e
  de hierarquia visual, não só de dado.
- **Se o ícone da barra ou o cabeçalho do hub mudam** — hoje reaproveita
  `barra-cobrancas.svg` e o hub não tem cabeçalho próprio além do título;
  um resumo em destaque pode pedir tratamento visual que a tela de hoje
  não tem.
- **Cor/tratamento se existir um número combinado** (Propostas 2 ou 3) —
  precisa parecer visualmente diferente do cartão escuro de Faturamento
  e da pastilha de Lucro, reforçando que não é a mesma coisa.

---

## Perguntas para o fundador, antes de qualquer código

1. **Qual das três propostas da seção 1** — ou nenhuma delas, se preferir
   outra combinação?
2. **Confirma a extração da consulta de despesas do mês** (seção 2) como
   o jeito de alimentar o número novo, em vez de reaproveitar o total da
   tela de Despesas (que hoje não é confiável para "mês inteiro, empresa
   inteira")?
3. **Confirma que as duas entradas (Cobranças/Despesas) continuam**, com
   o resumo só entrando acima delas (seção 3) — ou prefere reabrir a
   lista combinada (Opção B original)?

---

## Decisões do fundador (17/09/2026)

1. **Proposta 2** — os três números (Recebido · Pago · Sobrou), não a 1
   nem a 3. Motivo, nas palavras dele: quem abre uma tela chamada
   Financeiro quer saber **se sobrou dinheiro** — dois números soltos
   deixariam essa conta de cabeça pro usuário fazer, e é a conta que mais
   importa. A Proposta 3 (só o combinado) foi recusada pelo motivo já
   registrado na seção 1: risco de leitura mais alto, muito parecido com
   "Lucro" sem nada ao lado pra diferenciar.
2. **Extração confirmada.** "Uma fonte só, dois chamadores." O achado de
   que o total da tela de Despesas é só das 50 mais recentes (sem filtro
   de período) foi confirmado como bom achado — "número que parece total
   e não é".
3. **As duas entradas continuam.** Não reabre a lista combinada.
4. **Sobre o rótulo:** a distinção que precisa aparecer não é "caixa
   contra competência" (ninguém no produto pensa nesses termos) — é
   **dinheiro que já entrou e saiu de verdade, contra dinheiro do mês que
   ainda pode não ter chegado**. Pediu propostas de texto com essa
   leitura, antes de mandar ao Design.
5. **Construir agora, com o que existe, registrando como provisório** —
   sem esperar a resposta do Design antes de ligar os números reais.

---

## Rótulos propostos (pedido do fundador, item 4 acima)

Três conjuntos, do texto mais reaproveitado ao mais coloquial:

1. **"Recebido em {mês}" · "Pago em {mês}" · "Sobrou em {mês}".**
   "Recebido em {mês}" já é o rótulo exato que existe hoje em Cobranças
   (`cobrancas/page.tsx`, `TresNumeros`) — zero palavra nova ali. "Pago"
   espelha o mesmo tempo verbal (particípio — já aconteceu, não é
   projeção). "Sobrou" é a palavra mais crua para "o que restou depois
   de entrar e sair" — a mesma pergunta que o fundador descreveu como o
   motivo do Financeiro existir — e por ser uma palavra que não aparece
   em nenhum outro lugar do produto, não compete com "Lucro" nem
   "Faturamento" nem por acidente de vocabulário parecido.
2. **"Entrou em {mês}" · "Saiu em {mês}" · "Ficou em {mês}".** Mais
   coloquial ainda — "entrou"/"saiu" descrevem o movimento em si, "ficou"
   fecha a ideia de resto. Risco: "Entrou"/"Saiu" divergem do rótulo já
   existente em Cobranças ("Recebido em {mês}") para o **mesmo número** —
   duas telas nomeando a mesma coisa diferente, o problema oposto ao que
   este plano tenta evitar (seção 4).
3. **"Recebido no mês" · "Pago no mês" · "Saldo do mês".** Mais formal,
   mais perto da linguagem que a dashboard já usa ("Lucro no mês"). Risco
   maior: "Saldo do mês" é a mais próxima de "Lucro no mês" em forma
   (duas palavras, "do mês" no fim) — exatamente o padrão que motivou o
   cuidado do fundador.

**Escolhida para a construção, provisória: a Proposta 1** — reaproveita
o rótulo que já existe (Recebido), mantém o tempo verbal de "já
aconteceu" nos três, e "Sobrou" não empresta nome de nenhum outro número
do produto. Registrada como provisória no código e nos documentos; muda
se o Design responder com algo melhor.

---

## Enviado ao Design (17/09/2026)

Pedido, com o contexto da seção 4 explicado (a diferença a comunicar é
"dinheiro que já mudou de mão" contra "dinheiro que ainda pode não ter
chegado" — nunca os termos "caixa"/"competência"):

- Layout do resumo de três números no topo do hub Financeiro (grade,
  como em Cobranças, ou outro arranjo).
- Os rótulos dos três números — a proposta provisória em código é
  "Recebido em {mês}" · "Pago em {mês}" · "Sobrou em {mês}"; livre para
  substituir, desde que a diferença acima continue visível sem jargão.
  Nunca "Saldo" nem "Lucro" — os dois nomes já têm dono em outro lugar do
  produto.
- Se "Sobrou" (ou o que o Design escolher) precisa de tratamento visual
  próprio quando negativo (pagou mais do que recebeu) — hoje sai como
  "R$ -750,00", sem cor nem símbolo diferente.
- Ícone da barra e das duas linhas do hub (pedido já em aberto desde
  12/09/2026, sem resposta).

---

## Construção (17/09/2026)

- **`src/lib/servicos/cobrancas.ts`** — `recebidoNoMes` extraída para
  função própria; `resumoDeCobrancas` passou a chamá-la, mesmo resultado.
- **`src/lib/servicos/despesas.ts`** — `despesasDoMes` nova, mesma
  agregação que antes vivia só dentro de `resumoDeLucroDoMes`.
- **`src/lib/servicos/dashboard.ts`** — `resumoDeLucroDoMes` passou a
  chamar `despesasDoMes` em vez de repetir a consulta.
- **`src/lib/servicos/financeiro.ts`** — novo, `resumoDoFinanceiro`:
  chama `recebidoNoMes` e `despesasDoMes` em paralelo, soma o saldo
  (nunca gravado, `CLAUDE.md` §9).
- **`src/app/(app)/financeiro/page.tsx`** — volta a ter `exigirSessao()`
  (deixou de ser redundante: a tela agora lê `empresaId`); resumo de três
  pastilhas acima das duas linhas, reaproveitando o padrão visual de
  `TresNumeros` (Cobranças) — provisório, marcado no comentário do
  arquivo e nos documentos.
- **Testes:** `tests/financeiro.test.ts` novo, cobrindo a composição
  (saldo positivo, negativo, zero, isolamento entre empresas).
  `tests/despesas.test.ts`, `tests/dashboard.test.ts` e
  `tests/cobrancas.test.ts` continuam cobrindo `despesasDoMes`/
  `recebidoNoMes` por delegação (mesma implementação, chamada por dentro
  de `resumoDeLucroDoMes`/`resumoDeCobrancas`) — sem mudança de
  comportamento, `npm test` confirma.
- **Documentos** (`docs/navegacao.md`, `docs/componentes.md`,
  `docs/estilo.md`) atualizados só no que é estado, com o layout/rótulos
  marcados como provisórios — mesmo cuidado do plano da Opção A.

---

## Achados do `/revisar` (17/09/2026), corrigidos no mesmo passe

Quatro divergências, duas lacunas. `CLAUDE.md` §2, item 7: nenhum achado
é dos dois primeiros só-corrige-sempre (isolamento/dinheiro que se perde),
mas um deles — "Sobrou" mostrado como número real sem despesa lançada —
é dinheiro, então corrigido de qualquer forma, não só por caber em
"corrige no passe".

- **Componente copiado** (`CLAUDE.md` §8, "Proibido copiar componente").
  A primeira versão do resumo do Financeiro reescrevia, quase igual, o
  `TresNumeros` que já existia em `cobrancas/page.tsx` — mesma grade,
  mesma pastilha, mesma tipografia. Corrigido: extraído para
  `src/components/ui/TresNumeros.tsx`, componente único que os dois
  chamadores (Cobranças e Financeiro) usam, cada um decidindo só os
  próprios rótulos/valores/tons.
- **"Sobrou" sem despesa lançada mostrava um número, não convite**
  (`CLAUDE.md` §8, "Número incompleto não é exibido" — mesmo gatilho do
  Lucro da dashboard). Achado correto: com zero despesas no mês,
  "Sobrou em {mês}" saía igual a "Recebido em {mês}", dando a impressão
  de que nada foi gasto quando pode só significar que ninguém lançou
  ainda. Corrigido: `resumoDoFinanceiro.saldoCentavos` agora é `null`
  nesse caso (mesmo padrão de `ResumoDeLucro.lucroCentavos`), e a tela
  mostra o convite "Aparece com despesa lançada." em vez do valor.
  "Recebido"/"Pago" continuam reais mesmo em zero — são soma direta, não
  a combinação dos dois lados. `tests/financeiro.test.ts` corrigido para
  medir o comportamento certo (as duas primeiras versões afirmavam "zero
  é zero de verdade" sem essa distinção — a mesma classe de erro que
  `CLAUDE.md` §2 já nomeia, explicação que parecia certa sem ter sido
  conferida contra a regra escrita).
- **Exceção de estilo ampliada por edição direta** (`CLAUDE.md` §13:
  desenho e tratamento visual novo são do Design, chegam por diff de
  seção, nunca editados direto). A primeira versão reescreveu o "só ali"
  de `docs/estilo.md` (a exceção de 9px/`.09em` dos três números de
  Cobranças) para descrever a exceção como já valendo também para
  Financeiro — sem o Design ter decidido isso. Corrigido: o texto volta a
  registrar a exceção como decisão do Design só para Cobranças, com uma
  frase separada, explícita, de que a construção reaproveita o mesmo
  token **provisoriamente**, não que o Design ampliou o alcance da regra.
- **Plano sem commit próprio nem linha no diário antes da construção**
  (`CLAUDE.md` §2, item 1). Este plano foi escrito e a construção
  começou na mesma sessão, sem o commit do plano vir primeiro. Corrigido
  na entrega: o commit do plano (este arquivo) vai separado, antes do
  commit da construção — ver o diário.

**Lacunas, registradas, não corrigidas agora:**

- **As três pastilhas do resumo não são tocáveis, e nenhum documento
  decide se deveriam ser.** Diferente de "A receber"/"Vencido"/"Lucro" na
  dashboard (que já linkam para Cobranças/Despesas), aqui não existe
  destino nenhum definido — nem no pedido do fundador, nem no plano.
  Registrado em `docs/navegacao.md` com o mesmo tratamento já dado à
  pastilha "Rodagem" ("não-tocável, sem destino ainda"). Fica para o
  Design decidir junto do resto do layout.
- **Layout, ordem e rótulos do resumo continuam sem resposta do
  Design.** Já registrado como provisório em três documentos — o
  `/revisar` só confirmou que a lacuna está anotada corretamente, não
  trouxe achado novo aqui.
