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
   remuneração.

   **Revisto em 22/08/2026, planejamento da Tarefa 5: o critério de
   ordenação muda junto, não só o resumo do perfil.** A frase original aqui
   dizia que `docs/especificacao.md` continuaria com "maior valor rodado"
   para o critério de ordenação, por não ser este plano quem decide o texto
   daquele documento. Ao planejar a Tarefa 5, o fundador decidiu o
   contrário: o chip de ordenação mostra o critério escolhido como texto
   visível na tela — diferente do resumo do perfil, que é só leitura —, e
   ler "rodado" no chip enquanto o mesmo número aparece como "transportado"
   no perfil é o mesmo dado com dois nomes. `docs/especificacao.md` §4.7 foi
   corrigido para "maior valor transportado" nos dois lugares.

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

- **Estado "travado" da tela de Lançar frete (Cliente e valor, quando o
  frete já tem título ativo) não tem cor própria no inventário.** Achado do
  `/revisar` na Tarefa 4: construído com o que já existia mais perto —
  `disabled:bg-secundario-desabilitado`/`disabled:text-tinta-desabilitada`
  (`docs/componentes.md`, hoje só para campo de texto desabilitado, não
  para linha recolhida) na linha Cliente, e `text-white/70` no valor sobre
  o cartão escuro (sem correspondência na escada de opacidade de
  `docs/estilo.md`, que vai de rótulo `.45` a nome da empresa `.82`, nem no
  único desabilitado sobre escuro do inventário, `rgba(255,255,255,.55)`,
  variante 05 de `PilulaSobreEscuro`). Pedido ao Design: uma cor própria
  para "linha recolhida desabilitada" e para "número-herói travado" — hoje
  nenhum dos dois existe em `docs/componentes.md`/`docs/estilo.md`.

- **O texto do aviso de trava ("Frete já recebido — para alterar valor ou
  cliente, estorne o título.") não está no inventário de avisos, e usa
  "estornar" — palavra fora do vocabulário de `CLAUDE.md` §8 e de
  `docs/especificacao.md`.** Achado do `/revisar` na Tarefa 4. Aponta para
  uma ação (estorno) que ainda não existe no produto — só chega no item 6.
  Construído com este texto por não haver outro definido; pedido ao
  Design: rótulo e redação finais, coerentes com o vocabulário do produto.

  **Ampliado no segundo `/revisar`:** o mesmo pedido vale para as duas
  mensagens que o servidor devolve quando a trava é forçada por fora da
  tela ("Frete já recebido: não é possível trocar o cliente/alterar o
  valor. Estorne o título para corrigir.",
  `src/lib/servicos/titulos.ts`) — usam "estornar" pelo mesmo motivo, e
  também não estão no inventário. Aparecem no campo errado
  (`estado.erros.clienteId`/`valorCentavos`), mesmo mecanismo genérico de
  erro de campo que o resto do formulário já usa, então não pedem entrada
  própria no inventário de avisos — só a mesma revisão de vocabulário do
  parágrafo acima, quando o Design responder.

- **Em Clientes, escolher "Maior valor total" faz o valor substituir a
  cidade na linha — os dois nunca aparecem juntos.** Achados do `/revisar`
  na Tarefa 5: `docs/estilo.md`, tabela "Onde cada nível cai, tela por
  tela", linha Clientes, define Primário como "nome do cliente **+ valor
  da ordenação**" e Secundário como "cidade, dado de contexto" — os dois
  deveriam conviver na linha, não se revezar. `LinhaDeLista` (variante
  clássica) só tem dois slots de texto (`nome`, `apoio`); com o critério de
  valor ativo, o valor ocupa o único slot de apoio disponível e a cidade
  some. O mesmo achado aponta um segundo furo: mesmo quando o valor
  aparece, ele sai com o tratamento tipográfico do slot `apoio`
  (terciário, `text-tinta-apoio`) — a tabela pede tratamento Primário
  (mesmo peso do nome).

  **Os dois lados do argumento, para o Design decidir:** substituir a
  cidade não é irracional — quem escolhe ordenar por valor quer ver o
  valor, e a cidade tem pouco uso ali; mas `docs/estilo.md` diz
  explicitamente que os dois convivem. Resolver dentro do escopo desta
  tarefa exigiria redesenhar `LinhaDeLista` para caber um terceiro dado
  (nome + valor Primário + cidade Secundária) — decisão de layout que este
  plano não toma sozinho. Registrado como lacuna, não corrigido nesta
  tarefa; decisão do fundador, 22/08/2026.

- **Escolher "Mais recente" explicitamente na folha de ordenação não deixa
  o chip em estado ativo.** Achado do `/revisar` na Tarefa 5:
  `docs/componentes.md`, "Chips de seleção › Ordenação", diz "Neutro mostra
  Ordenar por; escolhido mostra o critério" — mas não define se o critério
  **padrão** ("Mais recente"), escolhido de propósito na folha, conta como
  "escolhido". Hoje `ativo={criterio !== "recente"}` trata os dois casos
  (nunca tocou a folha · tocou e escolheu "Mais recente") como o mesmo
  estado neutro, então o chip não confirma visualmente que o toque surtiu
  efeito. Pedido ao Design: definir se "Mais recente" escolhido de
  propósito deveria mostrar o próprio rótulo no chip (estado ativo) ou se
  o neutro genérico é o comportamento pretendido.

- **"Meus fretes" precisa de filtro por caminhão e por motorista, além do
  de cliente que já existe.** Decisão do fundador, 22/08/2026, planejamento
  da Tarefa 6: a pílula "Ver todos os N" do histórico do perfil só funciona
  de verdade levando à lista de fretes já filtrada pelo cadastro certo — o
  chip Cliente de "Meus fretes" já existe (`docs/componentes.md` linha
  360), mas não há equivalente para Caminhão nem Motorista, e o inventário
  fechado de chips daquela tela é só Período · Cliente · Situação. Em vez
  de fazer a pílula funcionar só no perfil do cliente (o único com filtro
  pronto), o fundador decidiu que ela **não aparece em nenhum dos três
  nesta fatia** — motivo dele: "se funciona em um e não nos outros dois, a
  pessoa aprende que existe e depois não acha. Pior que não ter." Pedido ao
  Design: os dois chips novos, mesmo padrão do de Cliente. Quando
  responder, a pílula nasce nos três de uma vez, e "Ver todos os N" passa a
  levar à lista filtrada pelo cadastro certo nos três perfis.

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
Confirmado pelo fundador, 20/08/2026.

**Sem pílula "Ver todos os N" nesta fatia, nos três perfis — decisão do
fundador, planejamento da Tarefa 6, 22/08/2026** (ver "O que precisa
chegar ao Design"): a pílula só levaria a algo de verdade no perfil do
cliente ("Meus fretes" filtrado por cliente já é possível); caminhão e
motorista não têm filtro equivalente ainda. Em vez de nascer assimétrica,
não nasce em nenhum dos três — fica para quando "Meus fretes" tiver os
dois filtros que faltam. `total` (devolvido por `historicoPorEntidade`)
continua usado nesta fatia, só que sem virar link: quando `total > 5`, uma
nota de texto sem toque ("Mostrando os 5 mais recentes de N.") evita que a
tela pareça mostrar o histórico completo quando não mostra.

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

**Trava em duas camadas, não só na tela.** Tela: os dois campos ficam
desabilitados (`LinhaRecolhida` do Cliente sem `onClick`; o toque no valor
do cabeçalho não abre o teclado), com uma linha explicando o motivo e o
caminho — "Frete já recebido — para alterar valor ou cliente, estorne o
título" (texto sujeito a ajuste do Design, ver "O que precisa chegar ao
Design"; estorno é o item 6, ainda não construído). Sem a trava do
servidor, desabilitar só a tela seria proteção de aparência — um pedido
formado por fora do formulário chegaria do mesmo jeito.

**A trava do servidor é do `UPDATE`, não de uma consulta antes dele —
achado do primeiro `/revisar`.** A primeira versão desta tarefa fazia
`conferirEdicaoContraTitulo` (uma checagem separada) e só DEPOIS chamava
`editarServico`: um "Já recebi" concorrente entre as duas chamadas criava
o título com o valor antigo e a edição em andamento trocava o valor por
cima, sem nada acusar — a mesma corrida que a trava existe para fechar, só
que um nível abaixo. `editarServicoComProtecaoDeTitulo`
(`src/lib/servicos/titulos.ts`) grava a condição dentro do próprio
`UPDATE`, via `condicaoDeGravacao` (`editarServico`, `src/lib/servicos/
servicos.ts`): OU o frete não muda `cliente_id`/`valor`, OU não existe
título ativo NO INSTANTE da gravação — as duas coisas na mesma instrução
do banco, sem janela entre "checar" e "gravar".

**A janela que sobra, decisão do fundador, 22/08/2026 — fechar só o lado
da edição agora, com a sequência exata registrada, não como "risco
aceito" genérico.** `criarTituloJaRecebi` lê `servico.valor`
(`buscarServico`) ANTES de gravar o título — se essa leitura acontecer um
instante antes desta gravação committar, e o `INSERT` do título só
committar DEPOIS, o título nasce com o valor ANTIGO. Sequência exata: (1)
"Já recebi" lê `servico.valor` = 100; (2) `editarServicoComProtecaoDeTitulo`
grava `valor` = 200 — passa, porque ainda não existe título nenhum no
banco; (3) o `INSERT` de `criarTituloJaRecebi` completa, gravando
`valor: 100` (o que foi lido no passo 1, não o que está gravado agora).
Fechar por completo exigiria travar a MESMA linha do frete também dentro
de `criarTituloJaRecebi` (item 3, já em produção) — fora do escopo desta
tarefa; revisita se essa janela um dia se mostrar mais que teórica.

**"Ativo" é verificado sobre TODOS os títulos do frete, não o primeiro que
aparecer — achado do primeiro `/revisar`.** A primeira versão usava
`buscarTituloPorServico` (devolve um título só) para decidir "ativo"; com
dois títulos no mesmo frete (um cancelado, um ativo — possível desde já
pelo schema, mesmo a interface de hoje só criando um por vez),
`findFirst` podia pegar o cancelado e destravar por engano — a regra
escrita já dizia "todos os títulos", o código olhava um só.
`titulos_receber: { none: {...} } }` (Prisma, sobre a relação inteira)
fecha isso. **Mesma classe do achado que corrigiu o `/onde-paramos`**
(`.claude/commands/onde-paramos.md`, "Por que 20, e não 1." — checar só
um item de uma coleção quando a regra vale para todos ela): a segunda vez
que essa classe aparece neste projeto, as duas em dinheiro/confiabilidade
de operação — vale procurar de propósito toda vez que um código decidir
algo "existe X" a partir de uma coleção que pode ter mais de um item.
Nomeado como padrão em `CLAUDE.md` §2.

**Lacuna registrada, não corrigida agora — achado do primeiro `/revisar`:**
toda edição regrava `tipo_operacao_id` com o tipo ativo do momento
(mesma busca que a criação já fazia); um frete de tipo diferente do ativo
teria o tipo trocado em silêncio ao editar qualquer outro campo. Hoje
inalcançável — cada empresa nasce com um único tipo ativo
(`docs/especificacao.md` §9, "MVP entrega só a experiência de
transportadora de carga") — revisita quando o segundo tipo (guincho/
reboque) existir.

**Duas lacunas registradas, não corrigidas agora — achados do segundo
`/revisar`:**

- **`km` no modo edição pode virar outro número se não for múltiplo de
  1000.** `editar/page.tsx` converte `servico.km` (metros) de volta para o
  texto do campo com `String(servico.km / 1000)`; um `km` que não seja
  múltiplo exato de 1000 chegaria com casa decimal, e o filtro do próprio
  campo (`km.replace(/[^\d]/g, "")`, `TelaLancarFrete.tsx`) apaga a vírgula
  no primeiro toque, trocando o número. Hoje inalcançável — o único
  caminho que grava `km` é a criação, sempre `× 1000` exato
  (`fretes/acoes.ts`) — revisita se um caminho futuro (importação, edição
  de km em outra unidade) puder gravar um valor não múltiplo de 1000.

- **Arquivar um frete no exato instante em que ele está sendo editado não
  é impedido.** A recusa de frete arquivado (`editarServico`) é uma
  consulta (`findUnique`) separada, antes do `UPDATE` — diferente da trava
  de título, que é a condição do próprio `UPDATE` (ver acima). Um
  arquivamento concorrente, bem no meio dessas duas chamadas, ainda
  gravaria a edição. Não é a mesma classe de risco do título (não é
  dinheiro, e "nada é apagado" — `CLAUDE.md` §7 — então arquivar não
  destrói o que a edição gravou); janela mais estreita que a de "Já
  recebi" (exige o mesmo operador arquivando e editando o mesmo frete ao
  mesmo tempo). Revisita se um dia dois operadores da mesma empresa
  puderem mexer no mesmo frete ao mesmo tempo na prática (`CLAUDE.md`
  §10, hoje até 3 usuários por empresa no plano pago).

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
malformado, que não pertence à empresa, ou de registro arquivado, cai no
pré-preenchimento normal por "último frete" — o mesmo que já valeria numa
visita sem parâmetro nenhum, nunca um campo mais vazio do que uma visita
comum daria. **Corrigido nesta seção, achado do segundo `/revisar`:** a
redação original dizia "campo vazio", que não bate com o que a Tarefa 2
(`clienteIdValido` etc.) já fazia antes desta tarefa existir — só o campo
sem pré-seleção alguma já vem pré-preenchido por último frete; um id ruim
na URL não devia deixar a tela pior do que ela já era. Usado pelos três
pills da Tarefa 6.

Não interage com o modo edição — são rotas diferentes (`/fretes/novo` com
`?cliente=` vs. `/fretes/[id]/editar`), nunca as duas ao mesmo tempo.

---

## Tarefa 5 — Ordenações nas listas de cadastro, e o chip aparece

`docs/especificacao.md` §4.7 (já corrigido, 22/08/2026 — ver acima):
**Clientes** por mais recente · maior valor em aberto · maior valor total.
**Caminhões e Motoristas** por mais recente · mais fretes · maior valor
transportado. "A linha mostra o dado da ordenação escolhida."

**Clientes nasce com dois critérios, não três.** "Maior valor em aberto"
depende de título em aberto — mesmo motivo do resumo do cliente (Tarefa 1
e Tarefa 6): até o item 6 existir, todo cliente tem valor em aberto zero,
e ordenar por um número sempre igual não ordena nada
(`docs/especificacao.md` §4.7, nota nova). Nesta fatia, Clientes ordena
por **mais recente** · **maior valor total** — "maior valor em aberto"
entra no item 6. Caminhões e Motoristas não têm esse problema: "mais
fretes" e "maior valor transportado" vêm de `Servico`, não de título, e
funcionam desde já — os dois nascem com os três critérios completos.

### O chip é reaproveitado, não é componente novo

`docs/componentes.md`, "Chips de seleção › Ordenação": 40px · raio 999 ·
`13px/600` · largura máx. `148px`, uma linha com reticências; neutro
mostra "Ordenar por", escolhido mostra o critério em `#E4E9E5`/`#1B6B3A`
peso 700 — **medida idêntica, cor idêntica, comportamento idêntico ao
`ChipFiltro.tsx`** que "Meus fretes" (Tarefa 2) já usa para Período/
Cliente/Situação: um rótulo, um estado ativo/neutro, abre algo por baixo
ao tocar. A redação original desta tarefa (sketch de 20/08/2026, acima)
previa um componente novo — achado ao planejar em detalhe: seria a mesma
pílula copiada, só com outro nome, o que `CLAUDE.md` §8 proíbe
("componente existe uma vez"). Mesmo raciocínio que já corrigiu três
cópias da linha de perfil no item 2. `ChipFiltro` é usado direto, sem
alteração — só um quarto lugar que o usa, com `rotulo="Ordenar por"` no
estado neutro.

O que abre por baixo é novo: **`FolhaDeOrdenacao`**
(`src/components/ui/FolhaDeOrdenacao.tsx`), genérico sobre a lista de
critérios — mesmo padrão de linha de `FolhaDeSituacao.tsx` (`min-h-64`,
`rounded-campo`, fundo `bg-pilula`/`text-acao` quando selecionado), mas
sem hardcodar os quatro estados financeiros: recebe `criterios: {valor,
rotulo}[]`, `atual`, `onEscolher`, `onFechar`. Um componente só, três usos
— Clientes com dois critérios, Caminhões e Motoristas com os mesmos três.
Não nasce em `FolhaDeSituacao.tsx` porque aquele já é específico de
`SituacaoFinanceira`; generalizá-lo por cima misturaria dois domínios sem
necessidade — mais barato um componente pequeno novo, genérico desde o
nascimento porque já tem os três usos reais no mesmo commit (mesma régua
de `FolhaInferior`, que só virou componente-base quando teve dois usos
simultâneos).

### Leitura em lote — e por que ela precisa bater com o resumo do perfil

**O risco central desta tarefa, apontado pelo fundador ao aprovar:** o
número que ordena a lista e o número que o perfil do cadastro mostra
(Tarefa 1/6) são o **mesmo cálculo visto de dois lugares**. Se um dia
divergirem — um contando frete cancelado, o outro não — ninguém percebe
até comparar na mão, e a pessoa vê um valor na lista e outro no perfil
para o mesmo cliente. A garantia não é só "os dois calculam certo" — é
"os dois calculam **exatamente a mesma coisa**", e é isso que o teste
prova (ver "Testes", abaixo), não só que cada função roda sem erro.

Três funções novas, todas em `src/lib/servicos/servicos.ts` — mora ali,
não em `clientes.ts`/`caminhoes.ts`/`motoristas.ts`, pelo mesmo motivo já
registrado no arquivo para as leituras da Tarefa 2 do item 3: a fonte é
`Servico`, não a entidade em si. Mesmo filtro-base das somas já existentes
(`resumoFinanceiroDoCliente.jaRodado` em `titulos.ts`, `resumoDoMotorista`
acima neste arquivo): `arquivado_em: null`, `status_operacional: { not:
"cancelado" }` — frete cancelado fora, `em_andamento` dentro, sem período
(é total da vida do cadastro, não do perfil — o perfil tem filtro de
período, esta ordenação não tem, mesma leitura de `docs/especificacao.md`
§4.7 que nunca menciona período para esta lista):

```ts
export async function valoresTotaisPorCliente(
  empresaId: string,
): Promise<Map<string, number>> {
  const linhas = await db(empresaId).servico.groupBy({
    by: ["cliente_id"],
    where: { arquivado_em: null, status_operacional: { not: "cancelado" } },
    _sum: { valor: true },
  });
  return new Map(linhas.map((l) => [l.cliente_id, l._sum.valor ?? 0]));
}
```

`estatisticasPorCaminhao`/`estatisticasPorMotorista` (fretes · valor
transportado) compartilham um helper privado, `estatisticasDeFretesPor`,
diferindo só no campo de agrupamento (`veiculo_id`/`motorista_id`) — duas
cópias quase idênticas do mesmo `groupBy` seriam a mesma duplicação que o
chip evitou acima, só que em serviço em vez de componente:

```ts
async function estatisticasDeFretesPor(
  empresaId: string,
  campo: "veiculo_id" | "motorista_id",
): Promise<Map<string, { fretes: number; valorTransportadoCentavos: number }>> {
  const linhas = await db(empresaId).servico.groupBy({
    by: [campo],
    where: { arquivado_em: null, status_operacional: { not: "cancelado" } },
    _count: true,
    _sum: { valor: true },
  });
  const mapa = new Map<string, { fretes: number; valorTransportadoCentavos: number }>();
  for (const linha of linhas) {
    const id = linha[campo];
    if (!id) continue; // frete sem caminhão/motorista definido
    mapa.set(id, { fretes: linha._count, valorTransportadoCentavos: linha._sum.valor ?? 0 });
  }
  return mapa;
}

export function estatisticasPorCaminhao(empresaId: string) {
  return estatisticasDeFretesPor(empresaId, "veiculo_id");
}

export function estatisticasPorMotorista(empresaId: string) {
  return estatisticasDeFretesPor(empresaId, "motorista_id");
}
```

**Cada uma é uma consulta só, para a empresa inteira** — nunca um `groupBy`
ou resumo chamado por item da lista. Não precisa do mecanismo de contagem
de consultas que a Tarefa 1 construiu para `listarServicosComSituacao`
(interceptar `Client.prototype.query`): aquele existia porque o risco era
uma função chamada **dentro de um laço**; aqui não há laço — a função em
si já é a leitura completa, o N+1 é estruturalmente impossível, não
apenas testado como ausente.

**Cada `page.tsx` busca a lista e o mapa de valores em paralelo**
(`Promise.all`), nunca em sequência — mesmo padrão de
`resumoDoCaminhao`/`historicoPorEntidade` já usados no projeto — e junta
os dois no servidor antes de passar para o componente de cliente. Cadastro
sem frete algum não aparece no mapa (`Map.get` devolve `undefined`); a
tela trata como zero.

### Nas três telas

`ListaClientes.tsx`/`ListaCaminhoes.tsx`/`ListaMotoristas.tsx` ganham
estado local `criterio` (`useState`, default `"recente"` — mesmo padrão
não persistido da busca já existente, reseta ao sair da tela) e um
`useMemo` que reordena **depois** do filtro de busca (a busca continua
cortando o texto digitado; a ordenação decide a sequência do que sobrou).
`"recente"` preserva a ordem que já vem do servidor (`criado_em desc`) —
sem reordenar; os outros critérios ordenam decrescente pelo número
correspondente, `Array.prototype.sort` (estável — empate preserva a ordem
de chegada, sem precisar de critério de desempate escrito à mão, mesmo
raciocínio já usado em `listarClientesPorUsoRecente`).

**Onde a linha mostra o dado — cada lista tem uma casca diferente hoje, e
o encaixe muda por lista:**

- **Clientes** (`LinhaDeLista`, variante clássica): `apoio` é a cidade por
  padrão; com um critério de valor ativo, vira o valor formatado (`R$
  {formatarCentavos(...)}`) — mesma troca de conteúdo que `ListaFretes.tsx`
  já faz para o filtro de situação, aplicada aqui ao `apoio`.
- **Motoristas** (`LinhaDeLista`, variante clássica): mesma troca, `apoio`
  alterna entre o veículo habitual e "N fretes"/o valor transportado
  formatado.
- **Caminhões** (linha própria, não usa `LinhaDeLista` — decisão já
  registrada no arquivo: círculo de iniciais não faz sentido para placa):
  placa (`PlacaBadge`) continua sempre visível, como identificador; o
  `tipo` — que hoje ocupa o lugar de "apoio" ao lado da placa — vira o
  valor do critério ativo quando ele não é "mais recente"; com "mais
  recente" escolhido, volta a mostrar `tipo`.

Zero fretes é um valor válido e mostrado como tal ("0 fretes"/"R$ 0,00") —
não é "número incompleto" no sentido do `CLAUDE.md` §8 (que fala de dado
que falta), é um resultado correto para um cadastro que ainda não rodou
frete nenhum.

**O chip aparece nas três listas desde o primeiro commit desta tarefa** —
sempre há duas opções (Clientes) ou três (Caminhões, Motoristas), nunca
uma só; diferente do estado de hoje (só "mais recente"), não precisa de
lógica para escondê-lo condicionalmente.

### Testes — provar que os dois números batem, não só que cada um roda

`tests/servicos.test.ts` (mesmo arquivo de `resumoDoCaminhao`/
`resumoDoMotorista`, mesma fonte — `Servico`):

- **`valoresTotaisPorCliente` contra `resumoFinanceiroDoCliente.jaRodado`
  (`titulos.ts`), para o mesmo cliente.** Planta fretes com data espalhada
  (alguns antigos, um cancelado, um recente) e chama as duas funções — a
  nova com o cliente inteiro, a existente com um `Periodo` largo o
  suficiente para cobrir todas as datas plantadas. **Os dois números
  precisam ser idênticos.** Essa igualdade é o teste em si, não uma
  conferência a mais: se alguém um dia alterar um dos dois filtros (por
  exemplo, parar de excluir cancelado só num dos dois lugares), é este
  teste que quebra, não um teste que só confere se `valoresTotaisPorCliente`
  "roda sem erro" — esse tipo passaria mesmo com o filtro errado, contanto
  que o número batesse com o que o próprio teste esperava calcular do
  mesmo jeito errado.
- **`estatisticasPorMotorista` contra `resumoDoMotorista`, mesma técnica** —
  `valorTransportadoCentavos`/`fretes` do mapa batendo com
  `valorTransportadoNoPeriodo`/`fretesNoPeriodo` do resumo, período largo
  cobrindo os fretes plantados, mesmo motorista.
- **`estatisticasPorCaminhao` não tem um par direto para comparar —
  registrado aqui para não parecer esquecimento.** `resumoDoCaminhao`
  (Tarefa 1) não expõe "valor total transportado": seu único número de
  valor é o numerador de `rsPorKm`, deliberadamente restrito aos fretes
  **com** `km` preenchido (`km: { gt: 0 }`) — um filtro a mais, para um
  propósito diferente (razão R$/km), não o "valor transportado" que esta
  ordenação precisa (todos os fretes do caminhão, com ou sem km). Testado
  como as outras leituras de agregação do projeto: valor plantado
  conhecido, conferido contra o esperado — sem par para comparação cruzada
  porque, hoje, não existe outro lugar do produto mostrando esse mesmo
  número.
- **Frete cancelado não conta, em nenhuma das três** — teste dedicado por
  entidade: um cliente/caminhão/motorista com um frete `em_andamento` e um
  `cancelado` do mesmo valor só soma o primeiro.
- **Isolamento entre empresas** nas três funções novas (`CLAUDE.md` §3) —
  mesmo padrão de todo teste que lê por `db(empresaId)`.
- **`FolhaDeOrdenacao`** — não precisa de teste de banco (componente puro,
  sem I/O); a régua de qualidade é `/auditar-tela` nas três listas.

---

## Tarefa 6 — Resumo e histórico nos três perfis

`docs/especificacao.md` §4.7. **Última tarefa do item 4 — três commits
separados, um por perfil.** Decisão do fundador, 22/08/2026: telas
diferentes, dados diferentes, `/auditar-tela` roda em cada uma; se um perfil
tiver problema, não desfaz os outros dois já fechados — três commits
pequenos fecham melhor que um grande sendo a última tarefa do item. Não é a
tarefa dividida em três tarefas novas: é a mesma tarefa fechando em três
passos, cada um com a régua completa da seção "Verificação" abaixo
(`lint`/`tsc`/`build`, `npm test` local, `/auditar-tela` daquele perfil,
`/revisar`) antes do pedido de commit daquele passo.

**Período padrão = mês corrente**, decisão do fundador nesta sessão,
registrada em `docs/especificacao.md` §4.7: é como o dono pensa a operação
("quanto rodei esse mês"), e é o mesmo recorte do card de faturamento da
dashboard (item 8) — dois lugares com padrões diferentes criaria
contradição aparente. Resolvido com `resolverPeriodoDaUrl("mes-atual", de,
ate)` (`src/lib/utils/periodo.ts`, Tarefa 2), que já resolve "hoje" em
Fortaleza via `diaEmFortaleza(new Date())` — o mesmo mecanismo que fechou o
defeito do item 3 ("hoje" virando "ontem" depois das 21h no servidor).
Reaproveitado, não reconstruído — fecha a lacuna registrada no quinto
`/revisar` da Tarefa 1.

**Mecanismo comum às três telas:**
- `searchParams` com `periodo`/`de`/`ate`, igual "Meus fretes" — mas com um
  default que "Meus fretes" não tem: ausência de `periodo` na URL é tratada
  como `"mes-atual"` antes de chamar `resolverPeriodoDaUrl` (em "Meus
  fretes", ausência = sem filtro, 50 mais recentes). Só `?periodo=todos`
  explícito mostra o total da vida do cadastro.
- Um componente novo, único e reaproveitado nos três perfis (não três
  cópias, `CLAUDE.md` §8) — chip "Período" + `FolhaDePeriodo` +
  `router.push` para o mesmo caminho do perfil com a nova query. Reaproveita
  `FolhaDePeriodo`, `resolverPeriodoDaUrl`, `rotuloDoPeriodo`, todos já
  existentes desde a Tarefa 2.
- Chip sozinho na fileira → 48px (`ChipFiltro altura={48}`, exceção do §8
  corrigida na Tarefa 5).
- Ordem na tela (`docs/componentes.md`, "Onde cada tela usa o quê", Perfil
  do cliente): resumo (números + chip de período) → campos que já existem
  (Identificação/Condição comercial) → ação → histórico.

**Perfil do cliente** (`clientes/[id]/page.tsx`): dois números — **já
rodado** (tocável, leva a `/fretes` filtrado pelo cliente e pelo mesmo
período — não um histórico interno; `fretes/page.tsx` ganha `?cliente=`
como novo `searchParam`, só para semear o chip Cliente que já existe em
`ListaFretes.tsx`, sem criar filtro novo nem tocar no inventário) e
**recebido no período** (não tocável) — `resumoFinanceiroDoCliente`.
Histórico via `listarServicosDoCliente` (`LinhaDeLista` por frete, teto 5;
sem pílula "Ver todos" nesta fatia — ver "O que precisa chegar ao
Design"). Pílula em linha **Lançar frete para este cliente** no fim do
histórico → `/fretes/novo?cliente=<id>`. Sem "Gerar relatório"/"Cobrar no
WhatsApp" (dependem do item 6/7).

**Perfil do caminhão** (`caminhoes/[id]/page.tsx`): km (convertido para km
só na exibição) e R$/km com **duas casas decimais** (confirmado pelo
fundador — era o default já previsto "por não haver outra definida"), só
quando `resumoDoCaminhao` devolver `kmPeriodoMetros !== null`. Sem km no
período: convite **"Preencha o km ao lançar para ver o R$/km"** (convida a
preencher um campo opcional, não só informa a ausência — decisão do
fundador). Cobertura parcial (`fretesComKm < fretesNoPeriodo`): nota **"N
de M fretes com km"**. Histórico igual ao cliente. Pílula **Lançar frete
com este caminhão** → `/fretes/novo?caminhao=<id>`. **Sincroniza
`docs/componentes.md` linha 373** (hoje só lista "sem principal · Editar no
cabeçalho"; ganha a pílula) — não é pedido ao Design, é o repositório
sincronizando o inventário com uma decisão que `docs/especificacao.md` §4.7
já registra (`CLAUDE.md` §13).

**Perfil do motorista** (`motoristas/[id]/page.tsx`): resumo com fretes no
período e **valor transportado** no período (não "valor rodado" — ver
"Decisões do fundador") — `resumoDoMotorista`. **Lançar frete com este
motorista** como a ação **principal** da tela (variante **01**, não pílula
— `docs/componentes.md` linha 374 já a define assim) → `/fretes/novo?
motorista=<id>`. Histórico igual aos outros dois. `docs/estilo.md` não tem
linha própria para este perfil na tabela de níveis tipográficos — lacuna,
mesma classe da já registrada para Caminhões/Motoristas (lista) na Tarefa
5; registra e segue, não bloqueia.

Os três continuam **sem** "Gerar relatório"/"Cobrar no WhatsApp" (cliente)
e sem qualquer coisa que dependa dos itens 5/6/7 — mesma régua desta
fatia inteira.

**O histórico segue o período do resumo — decisão do fundador, achado do
segundo `/revisar` (22/08/2026), correção da primeira versão desta
tarefa.** A primeira versão do histórico ignorava o período (sempre os 5
mais recentes da vida inteira do cadastro), o que criava a mesma
contradição que a nota acima resolve entre lista e perfil — só que agora
dentro da MESMA tela: chip dizendo "Mês passado" com o histórico mostrando
frete de hoje. Motivo do fundador: "é o que a pessoa espera: filtrou, a
tela responde." `listarServicosDoCliente/DoCaminhao/DoMotorista`
(`titulos.ts`) passam a exigir `periodo`, igual aos resumos; `total`
(usado por "Mostrando N de M") também passa a ser o total **do período**,
não da vida inteira. Uma consequência somada: com período aplicado, o
histórico pode ficar vazio mesmo para um cadastro com fretes — texto
próprio, "Nenhum frete neste período.", diferente de "Nenhum frete
lançado ainda." (cadastro sem frete nenhum, em qualquer período).
Distinguidos por `totalGeral` (contagem sem filtro de período, uma
consulta a mais, sempre O(1)).

**Risco levado pelo fundador ao aprovar este plano — mesmo rótulo, recortes
diferentes — verificação obrigatória antes de fechar cada um dos três
commits.** O resumo do perfil mostra o número **por período** (mês corrente
por padrão, com o chip de período visível ao lado); a lista de cadastro
correspondente (Tarefa 5, já commitada) mostra o mesmo conceito como
**total da vida do cadastro**, sem chip nem qualificador algum — conferido
nos três arquivos: `ListaClientes.tsx` linha 104
(`` apoio={... `R$ ${formatarCentavos(valorTotalCentavos)}` } ``),
`ListaCaminhoes.tsx` linha 124 e `ListaMotoristas.tsx` linha 113, todos
`R$ X`/`N fretes` em texto puro, sem palavra que diga "total" nem período
nenhum ao lado. A mitigação do chip de período só cobre o lado do perfil —
o lado da lista, pela leitura do código, não tem nada.

**Teste no `/auditar-tela` de cada perfil, com dado plantado que torna os
dois números diferentes de propósito:** abrir a lista de cadastro ordenada
pelo critério de valor/fretes, abrir o perfil do mesmo cadastro ao lado, e
checar se dá para entender por que os números não batem, sem precisar
explicar em voz alta. **Se não der — e a leitura do código acima sugere que
não vai dar —, a correção entra no fechamento daquele commit**, mesmo
tocando um arquivo da Tarefa 5 (já commitada): fundador já autorizou, não é
reabrir a Tarefa 5, é fechar a Tarefa 6 de verdade. Provável ajuste — a
decidir durante a verificação, não antes — é o `apoio` da linha de lista
ganhar um qualificador curto (ex.: "R$ X no total"); pequeno e contido, não
uma reforma do componente.

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
