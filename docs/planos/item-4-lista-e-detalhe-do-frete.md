# Plano — item 4: Lista de fretes e detalhe do frete

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 3 (lançamento de frete) fechou no commit `89ec22e`. `Servico` e
`TituloReceber` existem, com dado de verdade nascendo a cada frete lançado.
O item 4 é a primeira tela que **lê** esse dado — e por isso destrava um
conjunto de telas que ficaram deliberadamente incompletas até aqui:

- **"Ver o frete"** no aviso do sistema pós-lançamento, cortado na tarefa 3
  do item 3 — a decisão está no plano daquele item, não em comentário no
  código; `src/app/(app)/fretes/AvisoFreteSalvo.tsx` hoje só mostra
  "Já recebi".
- **Resumo e histórico** nos perfis de cliente, caminhão e motorista,
  cortados nas tarefas 5 e 7 do item 2. Verificado arquivo por arquivo, não
  por analogia (`CLAUDE.md` §13): `caminhoes/[id]/page.tsx` cita "itens
  3/4/7" no comentário; `clientes/[id]/page.tsx` e
  `motoristas/[id]/page.tsx` citam **item 3** (agora fechado) e **item 4**
  não aparece no texto deles — mas a leitura é a mesma: a dependência que
  os cortou (`Servico`/`TituloReceber` existirem) já está resolvida.
- **Ordenações** nas listas de Clientes, Caminhões e Motoristas
  (`docs/especificacao.md` §4.7) — e com elas o **chip de ordenação**
  (`docs/componentes.md`, "Chips de seleção"), que hoje não aparece porque
  só existe uma opção ("mais recente").
- O apoio "· R$ X em aberto" da linha Clientes em "Mais"
  (`src/app/(app)/mais/page.tsx`), com comentário próprio no arquivo
  apontando para este item — mas **não entra nesta fatia** (ver "O que
  fica de fora").
- As **barras dos últimos 6 meses** da dashboard vão levar a esta lista
  filtrada por período — é trabalho do **item 8** (dashboard ainda não
  construída), citado aqui só para a lista já nascer com o filtro de
  período que aquele link vai precisar, não para eu construir o link.

É grande e mistura naturezas parecidas com o item 3 (leitura derivada,
tela de lista, tela de detalhe, edição reaproveitando uma tela existente,
retrofit em cinco telas já construídas) — fatiado em 6 tarefas, cada uma
um commit, pela mesma razão daquele plano.

---

## O que fica de fora desta vez (decisões de escopo, com razão)

**Regra geral:** qualquer botão do inventário cuja ação de fundo ainda não
existe fica de fora — não entra desabilitado, não entra "para depois"
dentro do código; simplesmente não é construído agora, e a tela por trás
dele espera pelo item certo. `docs/componentes.md` já teria mostrado esse
padrão nos perfis de cliente/caminhão/motorista, e é o mesmo aqui.

- **Enviar ordem no WhatsApp · Marcar como finalizado · anexar
  comprovante** — item 5 ("Ordem de serviço: enviar ordem, finalizar,
  comprovante", `docs/especificacao.md` §9). São as três ações que mudam
  `status_operacional`/`ordem_enviada_em`/`comprovante_url` — nenhuma tem
  serviço de backend ainda.
- **Faturar frete · Ver relatório** — dependem do item 7 (Relatório do
  cliente): "Faturar" é o atalho para a montagem do relatório com cobrança
  marcada, "Ver relatório" abre um documento que ainda não existe.
- **Marcar recebido** (deslizar na lista **e** botão secundário no
  detalhe) · **Cobrar no WhatsApp** — item 6 (Título a receber e
  Cobranças, "incluindo recebimento parcial"). É literalmente a ação de
  cobrar que o item 6 existe para construir; nada de bom em duplicar por
  fora.
- **Consequência aceita, não bug:** com essas três ações de fora, o único
  jeito de um frete sair de "A faturar" nesta fatia continua sendo o
  "Já recebi" do item 3 — que já cria título **pago**. Então, na prática,
  até o item 6 existir, um frete só é visto em **A faturar** ou
  **Quitado**; **Faturado** e **Parcial** ficam sem caminho de criação
  pela interface, mas a derivação (`docs/especificacao.md` §7) cobre os
  quatro estados igual, prontos para quando o item 6 os alimentar.
- **km no período e R$/km do perfil do caminhão** (`docs/especificacao.md`
  §4.7) — **entra** nesta fatia (ver Tarefa 6): é soma/razão sobre
  `Servico.km`, campo que já existe e não depende de `DistanciaRota`
  (item 12). Registrado aqui só para não confundir com o item 12, que
  segue de fora.
- **"A receber" e "Vencido" — em qualquer lugar do produto, não só no
  resumo do cliente.** Achado ao corrigir a fórmula de "a receber" no
  `/revisar`: os dois dependem de título **em aberto**, e até o item 6
  existir o único jeito de um título nascer é "Já recebi", que já cria
  **pago**. Um número que só pode ser zero não é dado incompleto — é dado
  que ainda não pode existir, e mostrá-lo é a mesma classe de engano que
  o `CLAUDE.md` §8 já proíbe para número incompleto. Isso corta três
  coisas, registradas junto em `docs/especificacao.md` §4.7:
  - resumo do cliente nasce com **dois** números (já rodado · recebido no
    período), não quatro — Tarefa 6;
  - a ordenação "maior valor em aberto" nasce sem servir — os clientes
    ordenam só por "mais recente"/"maior valor total" nesta fatia,
    "maior valor em aberto" some do chip até o item 6 — Tarefa 5;
  - o apoio "· R$ X em aberto" da linha Clientes em "Mais"
    (`src/app/(app)/mais/page.tsx`, comentário já aponta para este item)
    continua cortado — não entra nesta fatia.
  Os três voltam juntos no item 6, quando título em aberto passar a
  existir de verdade.
- **Frete com adiantamento pago e sem saldo lançado ainda** — a derivação
  do §7 (Tarefa 1) não cobre esse caso: comparar `integral` e a soma dos
  títulos ativos contra `Servico.valor` fica para o item 6, que é quem
  cria título não-integral pela primeira vez. Não alcançável nesta fatia
  (só "Já recebi", sempre integral, existe) — decidir a regra sem o caso
  na frente seria decidir no escuro.

---

## Decisões do fundador, sobre os três pontos em aberto

1. **"Lançar frete para/com este cliente/caminhão/motorista" — aprovado,
   incluir as três.** Ficaram de fora por uma dependência que já não
   existe, e servem ao critério central do produto: o frete nascer com o
   mínimo de digitação. Entram na Tarefa 6.

2. **Resumo do motorista — aprovado o par (fretes no período · valor no
   período), com um cuidado no rótulo.** "Valor rodado" pode ler como
   quanto o motorista **ganhou**, e não é isso: é o valor dos fretes que
   ele levou, que é dinheiro do dono, não do motorista. O rótulo escolhido
   é **"Valor transportado"** — descreve o que foi carregado, não uma
   remuneração. `docs/especificacao.md` continua usando "maior valor
   rodado" para o critério de ordenação (não é este plano quem decide o
   texto daquele documento); só o rótulo exibido **no resumo do perfil**
   muda para evitar a leitura de salário.

3. **Cor da etiqueta "Faturado" — construir com a neutra por ora, é
   lacuna, não decisão final.** O fundador discorda da neutra: "Faturado"
   é o estado onde o dinheiro está **parado esperando o cliente** — o
   único dos quatro que depende de alguém de fora e por isso o mais
   importante de destacar, não o de esconder atrás de uma cor que passa
   despercebida. O protótipo usar neutra é sinal de que o estado não foi
   pensado, não de que a neutra foi escolhida de propósito. Cor é domínio
   do Design (`CLAUDE.md` §13) — construo com `#6E7770` nesta fatia e
   registro o pedido de revisão com este argumento (ver "O que precisa
   chegar ao Design", abaixo). Se o Design confirmar a neutra com motivo
   próprio, fica; senão, troca numa linha quando a cor certa vier.

---

## O que precisa chegar ao Design

- **Cor da etiqueta "Faturado".** Hoje sem cor própria em
  `docs/estilo.md`; construída com a tinta de apoio (`#6E7770`) por não
  haver outra definida. Pedido, com o argumento do fundador: na sequência
  A faturar → Faturado → Quitado, "Faturado" é o único estado que depende
  do cliente e o que representa dinheiro parado — merece destaque, não a
  cor que mais passa despercebida no inventário. Precisa de uma cor
  própria em `docs/estilo.md`, na tabela de "Etiqueta de situação".

- **Quantas casas decimais o R$/km do perfil do caminhão mostra.**
  `resumoDoCaminhao` (Tarefa 1) devolve a razão sem arredondar — decisão do
  fundador, 20/08/2026 (`CLAUDE.md` §7): cálculo é serviço, casas decimais
  são tela. Ainda sem regra em `docs/estilo.md`; quando a Tarefa 6 construir
  a tela do perfil do caminhão, usa duas casas por não haver outra definida,
  e pede confirmação.

- **Nome do cliente na linha de "Meus fretes" não linka para o perfil dele
  — `docs/navegacao.md` pede, a medida não permite.** Achado do `/revisar`
  na Tarefa 2 (21/08/2026): uma primeira versão dava ao nome um link próprio
  para o perfil do cliente, com a linha inteira linkando para o frete por
  baixo (link "esticado", sem aninhar `<a>`). Medido no navegador: o alvo de
  toque do nome ficava em **~178×19,5px**, contra o mínimo de **48px** do
  §8 — o cartão de **78px** de altura não tem espaço para dois alvos de
  48px empilhados sem o do nome invadir a linha de apoio/situação. Decisão
  do fundador, revertendo a primeira versão no mesmo dia: um alvo de 19px
  dentro de um cartão já tocável faz o dedo errar — quem mira o frete e
  passa perto do nome cai no perfil por engano, erro silencioso, repetido a
  cada toque. Removido; o caminho para o perfil do cliente continua sendo
  Mais → Clientes. Se o Design achar como acomodar os dois alvos na mesma
  linha, revisita — com a medida acima, não como se a exigência do
  `docs/navegacao.md` nunca tivesse existido.

- **Como o frete cancelado se distingue na lista, no detalhe e no
  histórico.** Frete cancelado (`status_operacional`) continua aparecendo em
  "Meus fretes" e no histórico do perfil (decisão do fundador, 20/08/2026,
  `docs/especificacao.md` §7) — só sai das somas dos resumos, nunca das
  telas. Não existe hoje uma etiqueta de "cancelado" em `docs/estilo.md` (a
  lista de "Etiqueta de situação" fecha em A FATURAR/FATURADO/PARCIAL/
  QUITADO/VENCIDO/BOLETO) — pedido ao Design: como marcar visualmente essa
  linha, quando a Tarefa 2/6 construir a tela.

  **Ampliado na Tarefa 3, achado do segundo `/revisar`:** o detalhe do frete
  também não distingue — um frete cancelado abre com a etiqueta "A faturar"
  igual a um em andamento, porque `situacaoFinanceira` não enxerga
  `status_operacional` (só título). O pedido ao Design acima vale também
  para esta tela, não só lista e histórico.

---

## Tarefa 1 — Backend: situação financeira derivada e leituras em lote

Só serviço e testes, sem tela — mesmo raciocínio da Tarefa 1 do item 3: é
o que dá para testar sozinho e carrega o risco de cálculo errado.

**`situacaoFinanceira(titulos)`** (`src/lib/servicos/titulos.ts`, função
pura, sem acesso a banco) — implementa `docs/especificacao.md` §7 exatamente,
**nesta ordem** (corrigida em 20/08/2026, achado do `/revisar`: a primeira
redação checava "existe título não pago" antes de "algum dinheiro entrou",
e "Parcial" nunca era alcançado):

1. Filtra os títulos para só os **ativos** (`arquivado_em == null` e
   `status !== "cancelado"`) — o resto do cálculo só olha esses.
2. Nenhum ativo → `"a_faturar"`.
3. Todos os ativos pagos (e existe ao menos um) → `"quitado"`.
4. Algum ativo pago **ou** com `valor_recebido > 0` (dinheiro já entrou), e
   ainda falta pagar algo → `"parcial"` — cobre tanto um título com
   recebimento parcial quanto um frete com mais de um título (adiantamento
   pago + saldo aberto).
5. Nenhum ativo pago nem parcialmente recebido → `"faturado"`.

Testada isoladamente, sem banco — é lógica pura, e testar direto é mais
barato e mais preciso que montar cenário no Postgres para cada combinação.

**Leitura em lote, para não virar N+1:**
- `listarServicosComSituacao(empresaId, filtros?)` — troca `listarServicos`
  na tela de lista: uma consulta para os serviços, uma para todos os
  títulos daqueles serviços (`servico_id IN (...)`), agrupa em memória e
  aplica `situacaoFinanceira`. `filtros` aceita o que a Tarefa 2 precisar
  (período, cliente, situação) — decidido dentro daquela tarefa, não
  antes: `CLAUDE.md` §6, "nada de arquivo para depois".
- `buscarServicoComTitulos(empresaId, id)` — para o detalhe (Tarefa 3): o
  `Servico` mais a lista de títulos associados (hoje, no máximo um).

**Frete cancelado (`status_operacional`) não entra em nenhuma das somas
abaixo** — decisão do fundador, 20/08/2026, achado do segundo `/revisar`,
registrada em `docs/especificacao.md` §7 junto da situação financeira
derivada: ele não vai acontecer (diferente de `em_andamento`, que conta —
achado do quinto `/revisar`, a tese do produto é o frete nascer na ordem,
`CLAUDE.md` §1), e somar infla o número que decide preço. Continua
aparecendo na lista e no histórico do perfil — sai das somas, não das
telas. Como ele se distingue visualmente é pedido em aberto ao Design (ver
"O que precisa chegar ao Design"), não existe hoje etiqueta de "cancelado"
em `docs/estilo.md`.

**Resumos para os perfis (Tarefa 6), cada um também livre de N+1:**
- `resumoFinanceiroDoCliente(empresaId, clienteId, periodo)` — **dois
  números, não quatro:** já rodado (soma de `Servico.valor` no período,
  excluindo frete cancelado) · recebido no período (soma de
  `valor_recebido` com `data_pagamento` no período, excluindo título
  cancelado). **Sem "A receber" nem "Vencido" nesta fatia** — os dois
  dependem de título **em aberto**, e até o item 6 existir o único jeito
  de um título nascer é "Já recebi", que já cria **pago**; um número que
  só pode ser zero é a mesma classe de engano que número incompleto
  (`CLAUDE.md` §8, regra 10 de `docs/especificacao.md` §8, e a nota nova
  em `docs/especificacao.md` §4.7). Os dois entram no item 6, junto do
  resto da tela de Cobranças.
- `resumoDoCaminhao(empresaId, veiculoId, periodo)` — `kmPeriodoMetros`,
  soma de `Servico.km`, **em metros, inteiro** (`CLAUDE.md` §7 — distância
  guardada ou somada é sempre metros; a tela converte para quilômetros na
  exibição, decisão do fundador depois de uma primeira versão que devolvia
  já em quilômetros, float) · `rsPorKm` (razão entre valor **em reais** e km
  **em quilômetros**, calculada só na função, nunca gravada — é aqui que o
  float cabe, por ser razão; `Servico.valor` é centavos, então a função
  divide por 100 antes de dividir por km — achado do quarto `/revisar`: sem
  essa conversão o retorno seria centavos-por-km, não os R$/km que a tela
  espera) — os dois só sobre fretes que têm km preenchido, dos
  dois lados da divisão (achado do `/revisar`: numerador e denominador
  precisam vir do MESMO conjunto, senão o R$/km sai inflado). Retorna também
  `fretesComKm`/`fretesNoPeriodo`, para a Tarefa 6 poder exibir a cobertura
  quando nem todo frete do período tem km (`CLAUDE.md` §8, regra 10 de
  `docs/especificacao.md` §8).
- `resumoDoMotorista(empresaId, motoristaId, periodo)` — fretes no período
  (contagem, excluindo cancelado) · **valor transportado** no período (soma
  de `Servico.valor`, excluindo cancelado — rótulo escolhido pelo fundador
  para não ler como remuneração do motorista, ver "Decisões do fundador"
  acima).
- `listarServicosDoCliente/DoCaminhao/DoMotorista(empresaId, id)` — para o
  histórico de cada perfil, mesma técnica de leitura em lote de
  `listarServicosComSituacao` (nunca uma consulta por linha) — **e cada
  linha vem com a situação financeira também**, decisão do fundador,
  20/08/2026: toda linha de frete no produto já mostra a etiqueta de
  situação (lista, detalhe), o histórico do perfil não seria exceção.
  **Ordena por `data_servico`** (quando o frete aconteceu), não por
  `criado_em` (quando foi lançado no sistema) — mesmo critério da lista
  "Meus fretes" (Tarefa 2); `criado_em desc` desempata dentro do mesmo dia.
  Frete cancelado continua aparecendo aqui — só sai das somas dos resumos
  acima, nunca da lista. Como ele se distingue na linha (etiqueta, cor,
  outro tratamento) é pedido em aberto ao Design (ver abaixo) — não existe
  hoje etiqueta de "cancelado" em `docs/estilo.md`.

**Teto de exibição do histórico (Tarefa 6): 5 linhas.** Mesma conta de
`CHIPS_DE_HISTORICO` em `src/lib/servicos/servicos.ts` — é o que cabe acima
do teclado sem rolar, mesmo motivo das cinco sugestões de município.
Confirmado pelo fundador, 20/08/2026. **Não é o número do rótulo da
pílula** — "Ver todos os N" mostra o **total real** do histórico daquele
perfil (`docs/componentes.md`, "Ver todos os 34"/"ver todos os 9" são
exemplos de conteúdo, não um teto fixo); 5 é só quantas linhas aparecem
antes da pílula substituir o resto.

**Testes** (`tests/situacao-financeira.test.ts` para a função pura, mais
extensão de `tests/servicos.test.ts`/`tests/titulos.test.ts` para as
leituras): os quatro estados de `situacaoFinanceira`, incluindo título
cancelado (conta como inexistente) e o caso de dois títulos (um pago, um
aberto → Parcial); `listarServicosComSituacao` sem N+1 perceptível (medir
número de consultas, não só o resultado); os três resumos com valor
conhecido plantado; isolamento entre empresas nas leituras novas
(`CLAUDE.md` §3). Contagem de verificações que reprova por número menor
que o esperado, mesmo mecanismo de `CLAUDE.md` §3, item 4 — já convenção
do projeto além dos testes de isolamento (`tests/isolamento/
privilegios.test.ts`, `tests/varredura-de-segredo.test.ts`).

---

## Tarefa 2 — Lista "Meus fretes"

Substitui a tela provisória (`src/app/(app)/fretes/page.tsx`).
`docs/especificacao.md` não tem seção própria para esta lista ainda —
sigo `docs/componentes.md` linha 360 e o protótipo (evidência
corroborante) para o conteúdo.

**Volume — esta lista não é como `ListaClientes.tsx`.** `CLAUDE.md` §1
mantém clientes/caminhões/motoristas pequenos por natureza (4 a 10
veículos); frete acumula sem teto, ano após ano (`CLAUDE.md` §10,
"ilimitado"). Filtrar a tabela inteira no cliente, como as listas de
cadastro fazem, não escala. **Decisão do fundador, 20/08/2026:** a tela
carrega os **50 mais recentes** por padrão (nunca o mês corrente — um mês
com duas linhas ao lado de um anterior com trinta esconderia justamente o
que a pessoa acabou de lançar), com o chip de Período trazendo uma janela
diferente sob pedido. Busca e o restante dos filtros operam sobre o que
está carregado; trocar Período dispara nova consulta ao servidor, não um
filtro em cima do que já veio.

**O filtro de Período precisa funcionar por parâmetro de URL, não só por
toque no chip** — registrado aqui porque quem vai precisar disso é o
**item 8** (dashboard, ainda não construída): "as barras dos últimos 6
meses levam a Fretes filtrado naquele período" (`docs/especificacao.md`
§4.6) é um link de fora chegando já filtrado, não alguém abrindo a folha
de período depois de entrar na tela.

**Conteúdo** (`docs/componentes.md`, "Meus fretes" — variante **04**
Pílula em linha para nenhuma ação aqui; a lista **não tem ação de rodapé**,
por regra de Listas na seção "Posição"):
- Busca única (cliente, rota, placa do caminhão, apelido, motorista),
  reaproveitando `CampoBusca` como em `ListaClientes.tsx`, mas filtrando
  só o que está carregado (ver "Volume" acima) — não a tabela inteira.
- Chips de filtro (`docs/componentes.md`, "Chips de seleção › Filtro", 40px
  · raio 999 · `13px/600`): **Período · Cliente · Situação**. Cada um abre
  uma folha (`FolhaDeBusca`/`FolhaDeCalendario`, já existem) e mostra o
  valor escolhido quando ativo.
- Total contextual abaixo dos chips (quantidade + valor da seleção atual).
- Linhas agrupadas por data, cabeçalho de data em texto puro (não é
  botão). Linha: `LinhaDeLista` estendida com a etiqueta de situação
  (`docs/estilo.md`, "Etiqueta de situação", `10.5px/700/.1em`, cores
  conforme "Decisões do fundador" acima — Faturado em `#6E7770` por ora).
- Estado vazio: sem frete nenhum → convite **"lançar o primeiro frete"**
  — texto já registrado em `docs/especificacao.md` ("O que o corte da
  importação deixa em tela"), que também registra que já foi pedido ao
  Design; uso o texto de lá, não invento outro. A tela provisória de hoje
  ("Ainda não", sem ação) só era aceitável **enquanto Lançar frete não
  existia** (`CLAUDE.md` §8) — o item 3 fechou essa lacuna, então o
  convite sem ação deixa de valer aqui · sem resultado de busca/filtro
  (mesmo padrão de `ListaClientes.tsx`).

**Fica de fora:** deslizar para "Marcar recebido" (item 6, ver acima) —
a linha não ganha o gesto de arraste nesta fatia.

**"Ver o frete"** (`AvisoFreteSalvo.tsx`) passa a linkar para
`/fretes/[id]` (Tarefa 3), fechando a pendência registrada no item 3.

---

## Tarefa 3 — Detalhe do frete

`docs/componentes.md` linha 361 e "Auditoria da regra de posição" (linha
349: "campos → comprovante → ações, sem lista depois" — comprovante
fica de fora aqui, ver acima, então a ordem desta fatia é campos → ações).

**Conteúdo:** cabeçalho (cliente, rota, valor, situação — mesma etiqueta
da lista), linhas de campo (`LinhaDePerfil`, 56px, já existe): **telefone**
(`docs/componentes.md` linha 177 exige esta linha explicitamente e exige a
palavra **"adicionar"** quando vazia, nomeando esta linha em particular —
mostra o telefone do motorista; tocável para abrir a conversa fica de
fora, mesma lacuna já registrada nos perfis de cliente e motorista, não
construída em lugar nenhum ainda), tipo de operação, caminhão, motorista,
data, origem, destino, carga, km — os demais campos, sem regra própria
escrita, aparecem vazios sem rótulo extra (não é editável na hora, é
detalhe; toca e vai para Editar, Tarefa 4).

**Ações desta fatia** (variante **02** Secundária e **03** Texto):
- **Editar frete** (secundária) → `/fretes/[id]/editar` (Tarefa 4).
- **Arquivar frete** (texto, destrutiva, `#B3401A`) → `arquivarServico`,
  já existe desde o item 3.

**Sem principal nesta fatia.** A principal "de verdade" desta tela muda
com a situação (Enviar ordem · Faturar frete · Ver relatório,
`docs/componentes.md` linha 361) — as três dependem dos itens 5/6/7.
Construir uma que não faz nada quebra uma regra mais forte
(`docs/componentes.md`, "Falta de dado": nunca um botão que não leva a
lugar nenhum). Não é caso isolado no inventário — a linha 373 já registra
um detalhe **sem** principal (perfil do caminhão, "sem principal · Editar
no cabeçalho"), então ficar sem principal por ora tem precedente real, não
é exceção inventada por este plano. Fica **Editar frete** como a ação de
maior destaque (variante **02**, no topo do bloco) até os itens 5/6/7
devolverem a principal de verdade — mesmo espírito do estado provisório já
aceito para a tela de Fretes inteira em 09/08/2026 (`CLAUDE.md` §8).

---

## Tarefa 4 — Lançar frete ganha edição e pré-seleção

`TelaLancarFrete.tsx`/`fretes/novo/page.tsx` (item 3) só sabem **criar**,
sempre pré-preenchidos com o último serviço da empresa. `editarServico`
(`src/lib/servicos/servicos.ts`) já existe desde o item 3, mas nunca foi
chamado por nenhuma tela — esta tarefa é a primeira vez que o caminho de
edição fica alcançável pela interface, e isso muda premissas que o código
de criação escreveu quando só existia um caminho. Duas capacidades novas,
mais dois achados de projeto — tudo no mesmo arquivo por tocarem a mesma
tela.

### Como a tela sabe o modo

`TelaLancarFrete` ganha uma prop nova, `edicao?`, com o id do frete e os
campos que hoje nascem vazios na criação (`destinoTexto`, `cargaTexto`,
`km`, `valorCentavos`, `dataServico`) — presente, é edição; ausente, é
criação, sem mudança de comportamento. Fica separada de `padrao` (que
continua servindo só ao pré-preenchimento por "último frete", usado nos
dois modos) para não sobrecarregar o significado de uma prop com dois
papéis diferentes.

Mesmo padrão já usado em `FormularioCliente.tsx`/`editarClienteAction`
(`ehEdicao = cliente !== undefined`, `acao = ehEdicao ?
editarClienteAction.bind(null, cliente.id) : criarClienteAction`, botão
"Salvar alterações"): `editarServicoAction` (novo, mesmo arquivo de
`criarServicoAction`) recebe `servicoId` como primeiro argumento, o mesmo
`comoUsuario` de sempre; a tela troca `useActionState(criarServicoAction,
...)` por `useActionState(edicao ? editarServicoAction.bind(null,
edicao.servicoId) : criarServicoAction, ...)`. Botão vira "Salvar
alterações" (mesmo texto que Clientes já usa). Ao salvar, redireciona para
`/fretes/[id]` (detalhe) — nunca para `/fretes?criado=`, que é o aviso
"Já recebi" e é só de criação.

Rota nova `src/app/(app)/fretes/[id]/editar/page.tsx`, mesmo padrão de
`clientes/[id]/editar`: carrega `buscarServicoComTitulos` (Tarefa 1) —
`notFound()` se não existir ou estiver arquivado —, monta `padrao` com os
valores do próprio `Servico` (não "último lançado") e `edicao` com o
resto.

### Município — sem caso especial

`normalizarEntrada` (`servicos.ts`) roda para editar exatamente como roda
para criar: resolve `origem_texto`/`destino_texto` de novo, sempre, mesmo
que o texto não tenha mudado. **Decisão: não construir um desvio "só
resolve se o texto mudou".** `resolverMunicipio` é função pura contra uma
tabela fixa (a base do IBGE) — mesmo texto, mesmo resultado, sempre; re-
resolver um texto inalterado é indistinguível, na prática, de pular a
resolução. A única situação em que os dois caminhos dariam resultado
diferente é a base de municípios mudar entre a criação e a edição do
mesmo frete — o que hoje não acontece (dado fixo, `CLAUDE.md` §9) — e,
se um dia acontecer (correção de nome de município, por exemplo), o
comportamento certo É re-resolver com o dado novo, não preservar uma
resolução desatualizada. Decisão do fundador, 22/08/2026: concorda, sem
caso especial, com este raciocínio registrado para não ser reaberto por
dúvida.

### As quatro conferências de empresa — referência arquivada é aceita quando não muda

`normalizarEntrada` confere cliente/tipo/caminhão/motorista contra a
empresa e recusa qualquer um arquivado (`CLAUDE.md` §3) — construído
quando só existia o caminho de criação, e o próprio comentário do código
registra a premissa: "aqui é sempre a criação de uma referência NOVA".
Essa premissa deixa de valer nesta tarefa.

**O caso real:** um cliente é arquivado; semanas depois é preciso corrigir
um erro de digitação na carga de um frete antigo daquele mesmo cliente.
Reusar `normalizarEntrada` sem ajuste bloquearia esse salvar inteiro —
"Selecione um cliente válido" — mesmo sem tocar no campo Cliente, porque o
id (que sempre viaja no formulário, tocado ou não) não passa mais na
checagem de arquivado.

**Decisão do fundador, 22/08/2026: aceitar a referência antiga sem exigir
troca.** `normalizarEntrada` passa a receber o `Servico` atual (nulo na
criação); para cliente/caminhão/motorista, a checagem de "não arquivado"
só roda quando o id **mudou** em relação ao que já estava gravado. Trocar
para uma referência diferente continua exigindo uma ativa, igual à
criação; manter a que já existia continua aceita mesmo arquivada — mesmo
espírito do precedente de `veiculo_habitual_id` (`src/lib/servicos/
motoristas.ts`) que o comentário atual já cita, agora também aplicado
aqui. O comentário de `normalizarEntrada` é reescrito nesta tarefa para
não afirmar mais "sempre uma referência nova".

### Frete com título já lançado

`criarTituloJaRecebi` copia `valor` e `cliente_id` do `Servico` na hora de
criar o título e nunca mais sincroniza. A especificação (§8.5) já dizia
que "título pago não é editado", mas nada cobria editar o **frete por
trás** de um título já lançado — deixar os dois campos livres permitiria
o frete mostrar um valor e o título registrar outro, sem nada acusar a
divergência.

**Decisão do fundador, 22/08/2026, registrada em `docs/especificacao.md`
§8, item 12: `valor` e `cliente_id` travam quando o frete tem título
ativo** (mesmo critério de "ativo" do §7: não arquivado e `status !==
"cancelado"` — hoje, na prática, todo título existente é sempre "pago",
único caminho é "Já recebi"). Os outros sete campos (caminhão, motorista,
data, origem, destino, carga, km) continuam livres — não têm reflexo em
`TituloReceber`. Destrava se todos os títulos do frete estiverem
cancelados.

**Trava em duas camadas, não só na tela.** Servidor:
`conferirEdicaoContraTitulo` (novo, `src/lib/servicos/titulos.ts` — é onde
mora a definição de "título ativo" e `criarTituloJaRecebi`, não em
`servicos.ts`, que não conhece `TituloReceber`) compara `valor`/
`cliente_id` recebidos contra o `Servico` atual quando existe título
ativo, e recusa a diferença — chamada por `editarServicoAction` antes de
`editarServico`. Tela: os dois campos ficam desabilitados (`LinhaRecolhida`
do Cliente sem `onClick`; o toque no valor do cabeçalho não abre o
teclado), com uma linha explicando o motivo e o caminho — "Frete já
recebido — para alterar valor ou cliente, estorne o título" (texto sujeito
a ajuste do Design; estorno é o item 6, ainda não construído, então hoje
não há link nenhum atrás dessa frase, só a explicação). Sem a trava do
servidor, desabilitar só a tela seria proteção de aparência — um pedido
formado por fora do formulário chegaria do mesmo jeito.

### Pré-seleção pelos três pills

Aprovada (ver "Decisões do fundador", item 1, no topo deste plano).
`fretes/novo` aceita `?cliente=<id>` / `?caminhao=<id>` / `?motorista=<id>`
via `searchParams` (mesmo padrão de `fretes/page.tsx`,
`clientes/novo/page.tsx`); quando presente, substitui o pré-preenchimento
de "último lançado" **só naquele campo** (os outros dois continuam vindo
do último serviço). O identificador da URL é resolvido pelo
`buscar<Entidade>` já escopado por `db(empresaId)` (mesma função que
`criarServico`/`normalizarEntrada` já usam) antes de virar valor
pré-preenchido — nunca usado direto (`CLAUDE.md` §3; achado do `/revisar`
na Tarefa 2: parâmetro de URL que vira consulta precisa ser validado). Id
que não pertence à empresa, ou de registro arquivado, cai no mesmo
comportamento de hoje (nenhuma pré-seleção, campo vazio). Usado pelos três
pills da Tarefa 6.

Não interage com o modo edição — são rotas diferentes (`/fretes/novo` com
`?cliente=` vs. `/fretes/[id]/editar`), nunca as duas ao mesmo tempo.

---

## Tarefa 5 — Ordenações nas listas de cadastro, e o chip aparece

`docs/especificacao.md` §4.7: **Clientes** por mais recente · maior valor
em aberto · maior valor total. **Caminhões e Motoristas** por mais
recente · mais fretes · maior valor rodado. "A linha mostra o dado da
ordenação escolhida."

**Clientes nasce com dois critérios, não três.** "Maior valor em aberto"
depende de título em aberto — mesmo motivo do resumo do cliente (Tarefa 1
e Tarefa 6): até o item 6 existir, todo cliente tem valor em aberto zero,
e ordenar por um número sempre igual não ordena nada
(`docs/especificacao.md` §4.7, nota nova). Nesta fatia, Clientes ordena
por **mais recente** · **maior valor total** — "maior valor em aberto"
entra no item 6. Caminhões e Motoristas não têm esse problema: "mais
fretes" e "maior valor rodado" vêm de `Servico`, não de título, e
funcionam desde já — os dois nascem com os três critérios completos.

**Componente novo — chip de ordenação** (`docs/componentes.md`, "Chips de
seleção › Ordenação": 40px · raio 999 · `13px/600` · largura máx. `148px`,
uma linha com reticências; neutro mostra "Ordenar por", escolhido mostra
o critério em `#E4E9E5`/`#1B6B3A` peso 700). Não existe hoje um chip
nessa medida no código (`ChipEscolha.tsx` é a variante Escolha, 48px,
outra medida) — nasce aqui, no primeiro uso real, não antes. Abre uma
folha curta com os critérios de cada lista (reaproveita `FolhaInferior`,
já existe).

**Nas três listas** (`ListaClientes.tsx`/`ListaCaminhoes.tsx`/
`ListaMotoristas.tsx`, que hoje ordenam só por `criado_em desc` do
`listarClientes`/etc.): passam a receber os valores derivados de
`Servico` (valor total, contagem de fretes, valor rodado — das leituras
da Tarefa 1, adaptadas por entidade) e a reordenar no cliente ao trocar o
critério — mesmo padrão da busca local já existente, mesmo motivo
(`CLAUDE.md` §1). A linha (`apoio` de `LinhaDeLista`) troca a cidade/placa
pelo valor do critério ativo quando ele não é "mais recente".

O chip só aparece quando há **mais de uma opção** — hoje ele não aparece
porque só existe "mais recente"; com as outras, aparece nas três listas ao
mesmo tempo, nesta tarefa (duas opções em Clientes, três em Caminhões e
Motoristas).

---

## Tarefa 6 — Resumo e histórico nos três perfis

`docs/especificacao.md` §4.7, um perfil por vez (podem ser três commits
se cada um for grande o bastante para valer a pena separar — decido ao
sentir o tamanho de cada um durante a construção, registrado no diário).

**Lacuna conhecida, registrada no quinto `/revisar` da Tarefa 1: qual é o
período padrão dos três resumos** (mês corrente, últimos 30 dias, outro
recorte) antes de alguém tocar no filtro — `Periodo` (Tarefa 1) só aceita o
intervalo já resolvido, e `docs/especificacao.md` §4.7 diz apenas que há
"filtro de período que recalcula", sem valor inicial. Decide aqui, não
antes.

**Perfil do cliente** (`clientes/[id]/page.tsx`): resumo com **dois**
números — já rodado · recebido no período (sem "A receber" nem "Vencido"
nesta fatia, ver Tarefa 1) —, filtro de período que recalcula os dois; só
**já rodado** é tocável, levando à lista de fretes filtrada (Tarefa 2) —
"recebido" nunca foi um dos tocáveis, nem na versão completa do resumo
(`docs/especificacao.md` §4.7: "os três primeiros tocáveis", e "recebido"
é o quarto); histórico de fretes (`LinhaDeLista` por frete, pílula
"Ver todos os N" — N é o total real do histórico daquele cliente, teto de
exibição em 5 linhas antes da pílula, ver Tarefa 1); pílula **Lançar frete
para este cliente** no fim do histórico.

**Perfil do caminhão** (`caminhoes/[id]/page.tsx`): km no período e R$/km,
exibidos só quando houver km preenchido (`docs/especificacao.md` §4.7 —
número incompleto não aparece como completo, `CLAUDE.md` §8); histórico;
pílula **Lançar frete com este caminhão**. **Sincroniza o inventário
junto:** `docs/componentes.md` linha 373 hoje lista só "sem principal ·
Editar no cabeçalho" para esta tela — não é pedido ao Design, é o
repositório sincronizando o inventário com uma decisão que
`docs/especificacao.md` §4.7 já registra (`CLAUDE.md` §13, "Estado... é do
repositório").

**Perfil do motorista** (`motoristas/[id]/page.tsx`): resumo com fretes no
período e **valor transportado** no período (não "valor rodado" — ver
"Decisões do fundador"); histórico; **Lançar frete com este motorista**
como a ação **principal** da tela (variante **01**, não pílula —
`docs/componentes.md` linha 374 já a define assim) — a mesma ação que o
comentário do arquivo já cita como pendente "por depender do item 3", que
fechou.

Os três continuam **sem** "Gerar relatório"/"Cobrar no WhatsApp" (cliente)
e sem qualquer coisa que dependa dos itens 5/6/7 — mesma régua desta
fatia inteira.

---

## Verificação (cada tarefa, antes do commit)

- `npm run lint`, `npx tsc --noEmit`, `npm run build` — verdes.
- `npm test` **local** verde (contra o banco de desenvolvimento) — não
  basta por si só (`CLAUDE.md` §2, "suíte verde" ≠ "esteira verde").
  Esteira confirmada verde via `/onde-paramos` antes do próximo commit.
- `/auditar-tela` nas telas novas/alteradas de cada tarefa.
- `/revisar` ao fim de cada tarefa, antes de pedir o commit (`CLAUDE.md`
  §2).
- Fluxo completo no navegador: lançar frete → ver na lista → abrir
  detalhe → editar → arquivar; trocar ordenação nas três listas de
  cadastro; abrir os três perfis e conferir resumo/histórico.
- **Tarefa 4, casos que só existem porque a edição virou alcançável:**
  editar um frete sem título (tudo livre, inclusive valor e cliente);
  clicar "Já recebi" e então tentar editar esse mesmo frete (valor e
  cliente travados na tela **e** recusados se forçados por fora dela);
  arquivar um cliente/caminhão/motorista e editar um frete antigo dele sem
  trocar essa referência (salva); tentar trocar essa mesma referência por
  outra arquivada (recusa, igual à criação); os três `?cliente=`/
  `?caminhao=`/`?motorista=` em `/fretes/novo`, com id válido, de outra
  empresa e inexistente.
- Nenhum cronômetro-portão nesta fatia — a meta dos 30 segundos é do
  lançamento (item 3), não desta leitura.
