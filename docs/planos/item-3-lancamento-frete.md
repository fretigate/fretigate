# Plano — item 3: Lançamento de frete

**Aprovado pelo fundador em 11/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada em
`docs/diario.md`.

## Contexto

Item 2 (cadastros) fechou no commit `d8a798e`. É a vez do item 3, o maior do
MVP: a tela que materializa a tese do produto — o frete nasce no momento da
ordem, em até 30 segundos, do celular. É grande e mistura naturezas
diferentes (entidade nova, UI nova compartilhada, medição, mecanismo de
sugestão), por isso o fundador pediu para fatiar em vez de tratar como uma
tarefa só, como as vezes anteriores.

Este plano corta em 4 tarefas, cada uma um commit. A ordem segue a
dependência real: primeiro o que não tem UI (entidade, isolamento,
resolução de município), depois a tela que consome tudo isso — incluindo a
sugestão de valor, que só existe para ajudar a bater a meta e por isso é
ajustada dentro da mesma tarefa que a mede —, depois o complemento que só
faz sentido com a tela pronta (aviso pós-salvar), por último a medição —
que só tem o que medir depois que fretes de verdade começam a ser
lançados.

**A métrica manda em tudo.** O cronômetro no celular é o portão de saída
da Tarefa 2 — ela não fecha até bater os 30 segundos.

---

## O que fica de fora desta vez (decisões de escopo, com razão)

- **Km auto-preenchido pela distância calculada, `DistanciaRota` e a função
  geodésica** — ficam para o **item 12**, que a própria
  `docs/especificacao.md` §9 registra como podendo esperar sem perder nada,
  **desde que origem e destino resolvam para município de verdade agora**.
  É exatamente essa resolução que esta fatia entrega (Tarefa 1). `Km`
  entra como campo manual opcional; o auto-preenchimento é tarefa do item
  12, quando `DistanciaRota` existir.
- **`carga_categoria`** — a coluna existe no schema (é campo decidido em
  `docs/especificacao.md` §6), mas a classificação em segundo plano fica
  sem construir nesta fatia: não há lista de categorias definida em nenhum
  documento, e nada no item 3 consome o campo. Fica sempre nulo até essa
  decisão vir — mesmo tratamento dado a `categoria_cnh` no item 2.
- **"Ver o frete" no aviso do sistema** — o aviso desta fatia mostra só
  **"Já recebi"**. "Ver o frete" leva ao detalhe do frete, que é item 4
  (ainda não existe). Mesmo padrão já aceito na tarefa 7 (telefone tocável
  e "Lançar frete com este motorista" ficaram de fora por dependerem do
  item 3; "Gerar relatório"/"Cobrar no WhatsApp" no perfil do cliente,
  mesma razão, tarefa 5).
- **Folha do campo que falta** — confirmando a pergunta do fundador: fica
  para **depois**, fora desta fatia. Os quatro gatilhos documentados em
  `docs/navegacao.md` (cobrar sem telefone, enviar ordem sem telefone do
  motorista, gerar relatório sem chave Pix, campo vazio no perfil do
  cliente) pertencem aos itens 5, 6 e 7 — nenhum vive no lançamento. O
  item 3 é quem **cria** os campos vazios (cadastro rápido só exige nome),
  mas quem **usa** a folha é uma ação futura. Constrói quando a primeira
  dessas ações nascer.
- **Folha de busca para origem/destino/carga** — `docs/navegacao.md`
  lista as seis linhas juntas ("cliente, caminhão, motorista, origem,
  destino, carga → folha de busca"), mas `docs/especificacao.md` §4.1
  descreve origem/destino/carga com um mecanismo diferente: origem é
  texto editável pré-preenchido, destino mostra chips de destinos
  anteriores **daquele cliente** com sugestão de município **abaixo do
  campo** (não em folha cheia), carga é texto livre com chips do que o
  próprio usuário já digitou. A folha de busca em tela cheia, com "+ Novo"
  no topo, serve só a **cliente, caminhão e motorista** — são os três
  campos com cadastro por trás. `docs/componentes.md` §11 confirma:
  "origem, destino e carga continuam sendo só um nome, criado direto na
  busca sem folha." Sigo a especificação, que é quem decide o conteúdo da
  tela.

Nenhuma dessas é reversão de decisão do fundador — são leituras dos
documentos já aprovados. Se alguma estiver errada, é para corrigir agora,
antes da Tarefa 1.

---

## Tarefa 1 — `Servico`: tabela, estados, as quatro conferências de FK, resolução de município

Só backend — schema, RLS, serviço, testes. Sem tela ainda: é o que dá para
testar sozinho, sem esperar UI, e é a metade que carrega o risco maior
(isolamento entre empresas).

**Schema** (`prisma/schema.prisma` + migration nova, padrão de
`20260811090000_motorista`): tabela `servico`, campos por
`docs/especificacao.md` §6 — `numero` · `tipo_operacao_id` · `cliente_id` ·
`veiculo_id` (opcional) · `motorista_id` (opcional) · `data_servico` ·
`origem_texto` · `origem_municipio_id` (opcional) · `destino_texto` ·
`destino_municipio_id` (opcional) · `carga_texto` · `carga_categoria`
(opcional, sempre nulo por ora) · `valor` · `km` (opcional) ·
`status_operacional` (enum `em_andamento`\|`finalizado`\|`cancelado`,
default `em_andamento`) · `origem_lancamento` (enum `manual`\|`importacao`,
sempre `manual` nesta fatia) · `ordem_enviada_em` (nulo por ora — item 5) ·
`comprovante_url` (nulo por ora — item 5) · `criado_por_usuario_id` (do
usuário da sessão, não input) · mais `empresa_id`/`criado_em`/
`atualizado_em`/`arquivado_em` padrão. **Sem `distancia_m`** (adiado com
`DistanciaRota`, ver acima). RLS + `GRANT` (sem `DELETE`) no mesmo commit,
igual toda tabela de domínio.

**`numero` sequencial por empresa** — contador atômico, não
`MAX(numero)+1` (que tem corrida sob concorrência). Proposta: coluna
`proximo_numero_servico` em `Empresa` (default `1`), incrementada com
`UPDATE ... SET x = x + 1 RETURNING x` dentro de `emTransacao`
(`src/lib/db/index.ts`, já existe para múltiplas queries atômicas). Teste
de concorrência prova que dois lançamentos simultâneos da mesma empresa
nunca colidem — o mesmo padrão de "concorrência real" que `CLAUDE.md` §3
exige para isolamento, aplicado aqui a uma garantia diferente (unicidade,
não vazamento).

**As quatro conferências de FK** (`CLAUDE.md` §3, achado na tarefa 7):
`cliente_id`, `veiculo_id`, `motorista_id`, `tipo_operacao_id` — cada um
checado contra a empresa antes de gravar, replicando o padrão de
`veiculo_habitual_id` em `src/lib/servicos/motoristas.ts` (chama o
`buscar<Entidade>` já existente e escopado por empresa; nulo = recusa).
`tipo_operacao_id` é obrigatório; `veiculo_id`/`motorista_id` só checam
quando preenchidos, como `veiculo_habitual_id` hoje.

**Resolução de município (a parte irrecuperável)** — usa
`resolverMunicipio`/`buscarMunicipios`, já implementados em
`src/lib/servicos/municipios.ts` desde o item 2. `criarServico`/
`editarServico` chamam `resolverMunicipio` para `origem_texto` e
`destino_texto` e gravam `origem_municipio_id`/`destino_municipio_id`
quando `situacao === "resolvido"`; **nunca bloqueia o salvar** quando
`ambiguo` ou `nao_encontrado` (`docs/especificacao.md` §4.1: "Não bloqueia
o salvar se não reconhecer — grava o texto e resolve depois"). Não
existe ainda tentativa de nova resolução automática depois (reprocessar
fretes antigos quando a base do IBGE mudar é fora de escopo aqui).

**Testes** (`tests/servicos.test.ts`, novo, padrão de
`motoristas.test.ts` — contador de conferências obrigatório):
- CRUD básico e `status_operacional` nascendo `em_andamento`.
- Recusa cruzada entre empresas para as quatro referências (cliente,
  veículo, motorista, tipo de operação) — um teste por referência.
- `numero` sob concorrência: duas criações simultâneas da mesma empresa
  não colidem.
- Frete com `origem_texto`/`destino_texto` que não resolve continua
  salvando, com o `municipio_id` correspondente nulo.
- `tests/isolamento/vazamento.test.ts` estendido: `semear()` grava um
  `servico` por empresa de teste, mais uma leitura cruzada provando zero
  vazamento.
- `schema.test.ts` e `privilegios.test.ts` são genéricos — cobrem
  `servico` sem alteração, só conferir que passam.

---

## Tarefa 2 — Tela de lançamento: as três peças novas e o teclado sobreposto

A tela em si, com as três peças reutilizáveis que ela introduz.
`docs/especificacao.md` §4.1 é quem decide o conteúdo; variantes citam
`docs/componentes.md`.

**Estrutura da tela** (teclado fechado, seis linhas em altura cheia):
- **Cliente / Caminhão / Motorista** — pré-preenchidos com o último
  `Servico` lançado pela empresa (não por usuário — mais simples e é o
  padrão útil para operação pequena). Cada linha, ao ser tocada, abre a
  **Folha de busca**.
- **Origem** — campo de texto pré-preenchido com a origem do **último
  `Servico` lançado pela empresa** (`origem_texto`/`origem_municipio_id`),
  mesmo mecanismo de cliente/caminhão/motorista — editável direto na
  linha, sem folha. **Não é `Empresa.endereco`**: o cadastro (criar conta)
  pede nome da empresa, e-mail, senha, nome e telefone do fundador, nunca
  endereço — `Empresa.endereco` fica sempre nulo para empresa nova, e
  `Empresa.municipio_id` também. Usar esse campo deixaria a origem vazia
  no primeiro frete de toda empresa, contra a meta dos 30 segundos. O
  pátio cadastrado (que `docs/especificacao.md` §4.1 prevê para isto) é
  campo do item 10 (Configurações); quando existir, substitui este
  pré-preenchimento — registrado aqui para não se perder.
- **Destino** — chips com os destinos já usados **com aquele cliente**
  (consulta a `Servico.destino_texto` distintos, filtrado por
  `cliente_id`); ao digitar texto novo, sugestões de município (via
  `buscarMunicipios`, 2 letras mínimo, 5 sugestões) aparecem abaixo do
  campo — não em folha cheia.
- **Carga** — texto livre com chips do que o próprio usuário já digitou
  (histórico de `carga_texto` da empresa).
- **Valor** — toque abre o **teclado numérico sobreposto**: linhas mantêm
  altura, nada comprime, botão salvar nunca fica coberto
  (`docs/componentes.md`, "Auditoria da regra de posição", linha 338 — a
  mesma exceção documentada, medida contra o teclado de vencimento do
  relatório).
- **Km** — campo numérico opcional, manual (auto-preenchimento adiado,
  ver acima).

**Obrigatório para salvar:** cliente, valor, data, tipo de operação
(`docs/especificacao.md` §4.1) — as mesmas quatro conferências de FK da
Tarefa 1 entram em jogo para cliente/tipo de operação (e para
veículo/motorista quando preenchidos).

**Peça nova 1 — Folha inferior (padrão genérico)** — não tem seção
própria em `docs/componentes.md` (só medidas repetidas nas seções 11 e
12): `border-radius: 28px 28px 0 0`, fundo `#FAF8F4`, alça `38×4` em
`#DAD5CA`, overlay `rgba(20,26,23,.42)`. Vira um componente-base em
`src/components/ui/` (ex.: `FolhaInferior.tsx`) usado pelas duas peças
seguintes — justificado porque as duas têm uso real e simultâneo dentro
desta mesma tarefa, não é abstração antecipando uso futuro.

**Peça nova 2 — Folha de busca** — serve só **cliente, caminhão e
motorista** (ver "o que fica de fora" acima). Lista ordenada por uso mais
recente, campo de busca (reusa `CampoBusca`, existente), linhas via
`LinhaDeLista` (existente), cabeçalho com pílula variante **06**
("+ Novo" sem texto digitado, "+ Cadastrar" com texto que não bate com
nada existente — `docs/componentes.md` seção 06), fechamento com botão
texto variante **03** ("Fechar").

**Peça nova 3 — Cadastro rápido** — `docs/componentes.md` §11, confirmado
compartilhado entre os três cadastros. Abre a partir do "+ Novo"/
"+ Cadastrar" da Folha de busca. Campos por tipo (só o nome/apelido
obrigatório):

| Cadastro | Campos |
|---|---|
| Cliente | Nome · Telefone · Prazo de pagamento |
| Caminhão | Apelido · Placa · Tipo |
| Motorista | Nome · Telefone |

**Sem Categoria da CNH.** `docs/componentes.md` §11 ainda lista o campo,
mas ele não existe na entidade `Motorista` — foi cortado em 09/08/2026
junto com "Ano" do caminhão (`docs/especificacao.md` §13), justamente por
não alimentar nada. A folha existe para pedir o mínimo; um campo que não
vira coluna não entra. Correção pendente de envio ao Design (ver seção
própria, no fim deste plano).

Botão principal variante **01** ("Cadastrar e usar" — salva e volta ao
lançamento com o item já escolhido, sem passo extra), texto variante
**03** ("Cancelar"). Reaproveita os serviços já existentes
(`criarCliente`/`criarCaminhao`/`criarMotorista`) — nenhuma lógica nova de
gravação, só a folha e o fluxo de retorno.

**Sugestão de valor pelo histórico** — quando cliente e destino têm
histórico, mostra "Última vez neste trecho: R$ X" tocável (nunca
preenche sozinho). Proponho o componente `PilulaEmLinha` (já existe em
`src/components/ui/`) para o toque — a confirmar com o Design junto com o
resto desta tarefa, já que não há variante definida em
`docs/componentes.md` para isto especificamente. O mecanismo aceita mais
de uma fonte por desenho (`docs/especificacao.md` §4.1) — só "última vez
neste trecho" nesta fatia; a segunda fonte (R$/km) é fase 2, fora de
escopo.

**Salvar** — botão principal variante **01**, com o valor no próprio
botão (`docs/componentes.md`, tabela "Onde cada tela usa o quê"). Ao
salvar, navega para a tela **Fretes** já existente (provisória, da tarefa
"Casca do app") — o item 4 (lista de fretes de verdade) substitui depois.

**Portão da tarefa, não passo separado:** antes de fechar e commitar,
cronometrar no celular contra os 30 segundos, com cliente/caminhão/
motorista já cadastrados (`docs/especificacao.md` §3). Toda decisão de
tela acima se submete a esse número. Se a sugestão de valor precisar de
ajuste para bater a meta (destacar mais o toque, mudar a régua de "quando
mostrar"), o ajuste é feito e cronometrado de novo **dentro desta mesma
tarefa** — uma tarefa que pode virar commit sem nenhuma mudança não é
tarefa. Só fecha quando o número bater.

---

## Tarefa 3 — Aviso do sistema e "Já recebi"

**Componente `AvisoDoSistema`** (novo, `src/components/ui/`) — superfície
escura (`#141A17`), texto `14.5px/600/1.4` branco, raio `22`, some sozinho
em 6s (sem botões) ou 8s (com botões). Genérico desde já porque
`docs/componentes.md` §07 já o define como "um componente só, usado pelo
'Frete salvo' e pelo [aviso de cobrança futuro]" — a forma já está
fechada, não é abstração sendo antecipada.

**Uso nesta tarefa:** "Frete salvo", com um botão variante **05**
("Já recebi", `flex:1`). Toque cria um `TituloReceber` já pago
(`status = "pago"`, `data_pagamento = hoje`, `valor = valor do Servico`).

**`TituloReceber` — schema mínimo desta fatia** (`docs/especificacao.md`
§6): `servico_id` · `cliente_id` · `valor` · `valor_recebido` ·
`vencimento` · `forma_pagamento_prevista` · `status` · `data_pagamento` ·
`forma_pagamento` · `relatorio_id` (nulo aqui — item 7). RLS + `GRANT`
próprios, igual toda tabela de domínio. **Duas referências novas para a
mesma regra do §3** (não são as "quatro" da Tarefa 1, é a mesma regra
aplicada de novo): `servico_id` e `cliente_id` — conferidos contra a
empresa antes de gravar, com teste de recusa cruzada para os dois.

**Situação financeira continua derivada** — nenhum campo `faturado`/
`quitado` em `Servico`. "A faturar" é consequência de não existir título
nenhum para aquele `servico_id`; some quando o título nasce.

**Testes** (`tests/titulos.test.ts` ou seção nova em `servicos.test.ts`):
criação de título pago via "Já recebi", recusa cruzada de `servico_id`/
`cliente_id` de outra empresa, `vazamento.test.ts` estendido para
`titulo_receber`.

---

## Tarefa 4 — Medição dos 10%

Decidido com o fundador: **duas ferramentas, papéis diferentes.**

**1. Comando interno** (`npm run medir:municipios -- --empresa=<id>`) — a
ferramenta de investigação. Usa `resolverMunicipio` para reclassificar
cada `Servico` com `origem_texto` ou `destino_texto` preenchido e
`municipio_id` correspondente nulo (só entra na conta quem **tem** texto
— campo vazio é ausência de tentativa, não falha). Imprime:
- percentual sobre o total elegível, com **piso de 20 fretes lançados**
  (abaixo disso, não imprime percentual — avisa que a base é pequena
  demais);
- separado em **ambíguo** (conserta a tela) e **não encontrado** (conserta
  o dado ou a normalização) — nunca um número só;
- a lista dos textos que falharam, **mais frequentes primeiro**.

Por empresa — nunca uma média entre empresas, que esconderia a empresa
que digita mal atrás da que digita bem.

**2. Passo na esteira que avisa, não reprova** — roda o mesmo cálculo
contra a empresa de teste (`tests/isolamento`, o único banco que a
esteira toca) a cada execução do CI. Se passar de 10% (com o piso de 20),
imprime um aviso visível no log — **não falha o build**. Decisão
explícita do fundador: esteira vermelha por indicador de qualidade de
dado ensina a ignorar vermelho, e o vermelho precisa continuar
significando isolamento e regressão quebrados. Enquanto não houver
cliente real, isto mede a consistência da própria suíte de teste — é o
que interessa agora, confirmar que a resolução funciona antes de alguém
de verdade usar.

**Exposição numa tela dentro do app** fica para quando o item 10
(Configurações) existir — decisão de lá, não desta tarefa.

---

## O que precisa chegar ao Design

Duas correções encontradas na revisão deste plano, nenhuma enviada ainda:

- **`docs/componentes.md` §11, linha 282** — remover "Categoria da CNH" do
  cadastro rápido de motorista. O campo não existe na entidade
  `Motorista` (cortado em 09/08/2026 junto com "Ano" do caminhão,
  `docs/especificacao.md` §13); a folha que serve para pedir o mínimo não
  pode listar um campo que não vira coluna.
- **`docs/navegacao.md` (linha 18) diverge de `docs/especificacao.md`
  §4.1.** A navegação lista as seis linhas da tela de lançamento juntas
  ("cliente, caminhão, motorista, origem, destino, carga → folha de
  busca"), mas a especificação descreve origem, destino e carga com um
  mecanismo próprio — texto editável, chips e sugestão de município
  abaixo do campo, nunca a folha em tela cheia — confirmado por
  `docs/componentes.md` §11 ("origem, destino e carga continuam sendo só
  um nome, criado direto na busca sem folha"). Este plano segue a
  especificação, que é quem decide o conteúdo da tela (`CLAUDE.md` §13).
  Os dois documentos precisam concordar; a divergência é do Design
  resolver, não deste plano.
- **Conferido, sem correção:** "Prazo de pagamento" no cadastro rápido de
  cliente (`docs/componentes.md` §11, linha 280) é do documento, não
  acréscimo deste plano — e corresponde a campo real
  (`Cliente.prazo_pagamento_dias`). Listado aqui para a mensagem ao
  Design fechar a auditoria da tabela inteira, não só a linha errada.

---

## Verificação (cada tarefa, antes do commit)

- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` — verdes.
- `/auditar-tela` nas telas novas da Tarefa 2 (Lançamento, Folha de busca,
  Cadastro rápido) e da Tarefa 3 (Aviso do sistema).
- `/revisar` ao fim de cada tarefa, antes de pedir o commit (`CLAUDE.md`
  §2).
- Fluxo completo no navegador, como nas tarefas anteriores: lançar frete
  do zero (cadastro rápido no meio), lançar com tudo já cadastrado,
  destino que não resolve município (não bloqueia), "Já recebi" gerando
  título.
- **Tarefa 2 não fecha sem o cronômetro de verdade no celular**, não no
  navegador do computador — é o único jeito de medir a métrica que manda
  em tudo, e é o portão da tarefa (ver acima), não um passo opcional.
