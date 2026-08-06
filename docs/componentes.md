# Botões e avisos — inventário fechado

Seis variantes de botão, mais o estado carregando e a especificação de ícones. Nenhuma tela pode usar nada fora daqui: sem cor nova, sem altura nova, sem nome novo. Chips de seleção não são botões e estão no fim.

## Regras

- **Verde sólido.** `#1B6B3A` preenchido é exclusivo da **ação principal** — mais o (+) da barra e o círculo de iniciais da empresa. Nenhum chip, de filtro ou de escolha, usa verde sólido: selecionado é sempre `#E4E9E5` com texto `#1B6B3A`.
- **Hierarquia.** Uma principal por tela, sempre a ação que avança o dinheiro ou o estado. Nunca duas verdes na mesma tela. Telas de consulta (dashboard, listas) não têm principal — o (+) da barra é chrome global, não ação de tela.
- **Nome.** Uma ação, um nome: **Gerar relatório** quando cria, **Ver relatório** quando já existe. Nunca “Relatório” sozinho. Igual para Faturar frete · Marcar recebido · Receber o resto · Cobrar no WhatsApp · Editar frete · Arquivar frete.
- **Posição.** O bloco de ações fica ancorado no rodapé, acima da barra de navegação, nesta ordem: principal → secundárias lado a lado → destrutiva em texto. Nunca no meio do conteúdo rolável.


## 01 — Principal

Verde sólido, largura total, altura fixa. A ação que avança dinheiro ou estado. Uma por tela.

**Medidas**

- altura `60` · raio `999` · largura `100%`
- padding lateral `24` (só se largura automática)
- texto `17px / 700 / line-height 1`
- normal `#1B6B3A` sobre texto `#FFFFFF`
- pressionado `#14522C`
- carregando: mesmo fundo `#1B6B3A`, texto oculto, spinner `20px` traço `2.5px` branco sobre `rgba(255,255,255,.3)`, centralizado — largura e altura travadas, toque ignorado
- desabilitado `#E4E0D6` · texto `#5C6660` (4.52:1 — antes `#A8AFA9`, 1.9:1, ilegível no sol)
- **com ícone** (só quando a ação sai do app — “Compartilhar no WhatsApp”): ícone `18px`, traço `1.6px`, gap `10px`, traço na cor do texto (`#fff`), conteúdo centralizado. Máximo um ícone, sempre antes do rótulo.


## 02 — Secundária

Fundo claro, largura total ou metade, uma altura abaixo da principal. Duas lado a lado no máximo.

**Medidas**

- altura `52` · raio `999` · largura `100%` ou `flex:1`
- padding lateral `22` (só se largura automática)
- texto `15px / 700 / 1`
- normal `#F0EDE6` · texto `#141A17`
- pressionado `#E4E0D6`
- carregando: mesmo fundo, texto oculto, spinner `18px` traço `2.5px` escuro sobre `rgba(20,26,23,.15)`
- desabilitado `#F4F1EB` · texto `#5C6660` (5.29:1 — antes `#A8AFA9`, 2.5:1)
- espaço entre duas secundárias `10`


## 03 — Texto

Sem fundo. Só para ação rara ou destrutiva — arquivar, descartar. Fica sempre por último no bloco de ações.

**Medidas**

- altura `44` — alvo mínimo de toque
- sem fundo, sem raio visível
- texto `14px / 600 / 1`
- destrutiva `#B3401A` · pressionada `#8A3314`
- neutra (rara, não destrutiva) `#6E7770` · pressionada `#141A17`
- desabilitada `#5C6660` (5.62:1 sobre o papel — antes `#C4C9C3`, 1.7:1)
- sem carregando — é sempre rara ou destrutiva, nunca uma chamada de servidor com espera visível
- é a neutra que fecha folha (**Fechar**) — nunca verde


## 04 — Pílula em linha

Pequena, dentro de linhas de lista. Uma por linha. Nunca sai da lista para o rodapé.

**Medidas**

- altura `38` · raio `999` · padding lateral `14`
- texto `12.5px / 700 / 1` · ícone `14px` · gap `7`
- normal `#E4E9E5` · texto e traço `#1B6B3A`
- pressionada `#D0E1D7`
- carregando: spinner `15px` traço `2px`, ícone e texto ocultos, largura mínima travada pra não encolher
- desabilitada `#EDEAE3` · `#5C6660` (4.96:1 — antes `#A8AFA9`, 2.2:1)
- usada também como “ver todos os 9” no fim de uma lista


## 05 — Pílula sobre escuro

Só dentro do cartão preto da dashboard e do aviso do sistema. Nunca sobre fundo claro.

**Medidas**

- altura `46` · raio `999` · padding lateral `6–14`
- texto `12.5px / 600 / 1.15`, centralizado
- normal `rgba(255,255,255,.1)` · texto `#FFFFFF`
- pressionada `rgba(255,255,255,.2)`
- carregando: spinner `16px` traço `2px` branco, texto oculto
- desabilitada `rgba(255,255,255,.06)` · texto `rgba(255,255,255,.55)` (antes .35 — quase some sobre o escuro)
- no aviso do sistema o texto sobe para `14px`


## 06 — Pílula de cabeçalho

Ação de cabeçalho de tela ou de folha — cadastrar, ver todos. Nunca verde sólida: só a principal do rodapé é verde sólida.

**Medidas**

- altura `44` · raio `999` · padding lateral `16`
- texto `13.5px / 700 / 1`
- normal `#E4E9E5` · texto `#1B6B3A`
- pressionada `#D0E1D7`
- desabilitada `#EDEAE3` · `#5C6660` (4.96:1 — antes `#A8AFA9`, 2.2:1)
- o rótulo muda com o estado: **+ Novo** sem busca, **+ Cadastrar** quando há texto novo


## 07 — Aviso do sistema

Um componente só, usado pelo “Frete salvo” e pelo “Cobrou o Frigorífico São Luiz?”. **Dado do usuário fica em superfície clara; mensagem do sistema fica em superfície escura.** As duas coisas nunca compartilham tratamento.

**Medidas**

- fundo `#141A17` — o mesmo do cartão de faturamento
- texto `14.5px / 600 / 1.4` em `#FFFFFF`
- raio `22` · padding `16 / 18`
- sombra `0 14px 34px rgba(20,26,23,.30)` + `0 3px 10px rgba(20,26,23,.16)`
- ancorado `left/right 16 · bottom 134` — acima da barra e livre do (+)
- flutua sobre o conteúdo, **nunca ocupa lugar no fluxo**, nunca empurra a lista
- some sozinho em `6s` (sem botões) ou `8s` (com botões)
- botões: variante **05**, `flex:1`, gap `10`


## 08 — Ícones

Uma família só: traçado, sem preenchimento, cantos arredondados — desenhados à mão no próprio SVG (sem biblioteca externa, para não misturar espessura de traço).


## 07 — Família FretiNews

A terceira superfície do produto. **Superfície clara = dado do usuário · superfície escura = mensagem do sistema · lilás = comunicação da plataforma.** Escopo fechado: cartão FretiNews na dashboard, lista de Novidades e detalhe da mensagem. Nunca em dado, ação, cobrança ou frete.

**Medidas**

- superfície `#EDEBFA`
- título `#2C2555` — contraste **11.89:1**
- apoio, rótulo, ponto e traço do × `#5B4FA8` — **5.71:1**
- medidos pela fórmula WCAG, mesmo padrão do texto desabilitado
- lida perde o lilás e volta para `#F0EDE6`: o peso e o ponto marcam o estado, não a cor
- **Três tons, só.** `#8B82C4` saiu por dar 2.93:1 no × — abaixo do mínimo de 3:1 para controle


## Chips de seleção

Controles de estado, não ações. Não entram na regra de hierarquia e nunca ficam no bloco de ações do rodapé.

| Item | Definição |
|---|---|
| Filtro | 40px · raio 999 · `13px/600` · largura máx. `148px`, uma linha só com reticências — neutro `#F0EDE6`/`#6E7770`, selecionado `#E4E9E5`/`#1B6B3A` em 700, mostrando o valor escolhido. **Nunca verde sólido** — esse é exclusivo da ação principal. |
| Escolha | 48px · raio 999 · `15px/600` — não escolhido `#F0EDE6`/`#141A17`, escolhido `#E4E9E5`/`#1B6B3A` em 700. **Nunca verde sólido** — nenhum chip usa. |
| Variável | 44px · raio 999 · `13.5px/700` · `#E4E9E5`/`#1B6B3A` |

| Item | Definição |
|---|---|
| Dashboard | sem principal · 2× pílula sobre escuro (Gerar relatório · Importar fretes) · pastilhas e pendências são superfícies tocáveis, não botões |
| Meus fretes | sem principal · aviso do sistema depois de salvar · (+) da barra é chrome |
| Detalhe do frete | principal **Faturar frete** ou **Ver relatório** · secundárias **Marcar recebido** + **Editar frete** · texto destrutiva **Arquivar frete** |
| Folhas de escolha | pílula de cabeçalho **+ Novo** / **+ Cadastrar** · texto neutra **Fechar** · chips de escolha |
| Cobranças | sem principal · pílula em linha **Cobrar no WhatsApp** · aviso do sistema no retorno |
| Detalhe da cobrança | principal **Marcar recebido** / **Receber o resto** / desabilitada **Recebido ✓** · secundárias **Cobrar no WhatsApp** + **Ver relatório** · pílula em linha **ver todos os 9** |
| Cobranças vazia | principal **Gerar relatório** · texto neutra **Ver os 4 fretes** |
| Modelo de mensagem | principal **Salvar modelo** · chips de variável |
| Lançar frete | principal **Salvar frete** · chips de escolha · pílula de cabeçalho na folha de busca · aviso do sistema depois de salvar (com **Já recebi** / **Novo frete**) — não existe segunda verde na tela |

