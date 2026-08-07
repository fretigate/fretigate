# Botões e avisos — inventário fechado

Seis variantes de botão, mais o estado carregando, o aviso do sistema, a família FretiNews, os ícones e a barra de navegação. Nenhuma tela pode usar nada fora daqui: sem cor nova, sem altura nova, sem nome novo. Chips de seleção não são botões e estão no fim.

## Regras

- **Verde sólido.** `#1B6B3A` preenchido é exclusivo da **ação principal** — mais o (+) da barra e o círculo de iniciais da empresa. Nenhum chip, de filtro ou de escolha, usa verde sólido: selecionado é sempre `#E4E9E5` com texto `#1B6B3A`.
- **Hierarquia.** Uma principal por tela, sempre a ação que avança o dinheiro ou o estado. Nunca duas verdes na mesma tela. Telas de consulta (dashboard, listas) não têm principal — o (+) da barra é chrome global, não ação de tela.
- **Nome.** Uma ação, um nome: **Gerar relatório** quando cria, **Ver relatório** quando já existe. Nunca “Relatório” sozinho. Igual para Faturar frete · Marcar recebido · Receber o resto · Cobrar no WhatsApp · Editar frete · Arquivar frete.
- **Posição.** **Nenhuma tela tem barra de ação fixa.** Só a barra de navegação flutua sobre o conteúdo — ela pode, porque é escura, fina e sempre a mesma; um bloco de botões claros sobre fundo claro corta o texto de trás e lê como defeito. A ordem interna do bloco continua: principal → secundárias lado a lado → destrutiva em texto.
  - **Detalhe** (frete, cobrança, cliente, caminhão, motorista): bloco de ações **dentro do conteúdo rolável**, depois do resumo e dos campos, **antes** de qualquer lista ou histórico. Rola junto com a página.
  - **Formulários**: o salvar fica no fim do formulário, rolando junto. Destrutiva logo abaixo, em texto.
  - **Listas**: sem bloco de ação. Criar é o (+) da barra ou a pílula de cabeçalho.
  - **Estados vazios**: ação principal dentro do conteúdo, como o resto.
  - **Exceção:** o teclado numérico é sobreposição, e nesse caso o **salvar nunca fica coberto** — ele sobe junto, acima do teclado.


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
- ancorado `left/right 16 · bottom max(112px, …)` — acima do topo do (+), com espaço para o deslocamento de 18px da entrada. **É a única coisa além da barra que flutua**, e pode porque é escuro, temporário e some sozinho
- flutua sobre o conteúdo, **nunca ocupa lugar no fluxo**, nunca empurra a lista
- some sozinho em `6s` (sem botões) ou `8s` (com botões)
- botões: variante **05**, `flex:1`, gap `10`


## 08 — Família FretiNews

A terceira superfície do produto. **Superfície clara = dado do usuário · superfície escura = mensagem do sistema · lilás = comunicação da plataforma.** Escopo fechado: cartão FretiNews na dashboard, lista de Novidades e detalhe da mensagem. Nunca em dado, ação, cobrança ou frete.

**Medidas**

- superfície `#EDEBFA`
- título `#2C2555` — contraste **11.89:1**
- apoio, rótulo, ponto e traço do × `#5B4FA8` — **5.71:1**
- medidos pela fórmula WCAG, mesmo padrão do texto desabilitado
- lida perde o lilás e volta para `#F0EDE6`: o peso e o ponto marcam o estado, não a cor
- **Três tons, só.** `#8B82C4` saiu por dar 2.93:1 no × — abaixo do mínimo de 3:1 para controle


## Iniciais da empresa

Quando não há logo cadastrada, o círculo mostra as iniciais da empresa. **Regra única**, usada na dashboard, em Mais, em Conta da empresa, no convite e no cabeçalho do relatório A4:

```js
const iniciaisEmpresa = nome => {
  const p = String(nome || '').trim().split(/\s+/);
  const sigla = p[0] && p[0] === p[0].toUpperCase() && p[0].length <= 3;
  return (sigla ? p[0] : p.slice(0, 2).map(w => w[0]).join('')).toUpperCase();
};
```

Se a primeira palavra já é uma sigla em caixa alta de até 3 letras, ela **é** a inicial — senão, a primeira letra das duas primeiras palavras. Assim "AP Transportes" → **AP** (não "AT"), "AP Transportes Rodoviários Ltda" → **AP**, "Transportes São Jorge" → **TS**, "JBS" → **JBS**.

Vale para a empresa. **Pessoa é outra regra**: sempre a primeira letra dos dois primeiros nomes — "Antônio Pereira" → AP, "Sandra do escritório" → SD. As duas coexistem na tela de Usuários (badge da empresa no topo, badge de cada pessoa nas linhas) e não podem ser trocadas uma pela outra.

Círculo: `30px` no cartão da dashboard · `40px` em linha de lista · `48px` em Mais · `56px` em Conta e no convite · `46px` quadrado de raio 6 no A4. Fundo `#1B6B3A` com texto branco (contorno preto no A4, que é impresso), `letter-spacing:.02em`.

## 09 — Ícones

Uma família só: traçado, sem preenchimento, cantos arredondados — desenhados à mão no próprio SVG (sem biblioteca externa, para não misturar espessura de traço). Exportados em `icons/*.svg`, viewBox quadrado `0 0 24 24`, sem width/height fixos, `fill="none"`, sem nenhum `transform` (o que está escrito em `stroke-width` é o que renderiza).

**Tamanho por contexto**

- **Ao lado de texto**, dentro de um controle: o ícone acompanha o tamanho do rótulo — `14px` em pílula em linha (`12.5px` de texto), `15–17px` em campo de busca (`16px`), `19–21px` em item de menu e da barra.
- **Isolado**, sem rótulo: `19–24px`, sempre dentro de um alvo de toque de `44px` (voltar, fechar) ou `48px` (o (+) da barra). O alvo nunca encolhe com o ícone.
- **Seta de afordância** (indica que a linha abre algo): `7–8×12–14px`, o menor da família, em `#A8AFA9` — é sinal, não conteúdo.

**Espessura**

- `1.6–2.2px` conforme o tamanho: quanto menor o ícone, mais fino o traço, para o peso ótico ficar igual.
- Os quatro ícones da barra ficam em `1.8px` — **valor único**, porque aparecem lado a lado no mesmo tamanho. O (+) mantém `2.8px` por ser maior e isolado no círculo.

**Gap, alinhamento e cor**

- Gap entre ícone e rótulo: `7px` para ícone ≤14px, `10px` para >17px, `12–14px` em linha de lista e item de menu.
- Alinhamento sempre `align-items:center` com o rótulo, e `flex:none` no ícone — ele nunca é comprimido quando o texto é longo.
- **O traço herda a cor do texto**: nos arquivos exportados, `stroke="currentColor"`. Assim o ícone acompanha automaticamente o estado do controle (normal, pressionado, desabilitado, ativo na barra) sem uma segunda regra de cor.

| Arquivo | Usado em | Tamanho | Espessura |
|---|---|---|---|
| `seta-linha.svg` | Seta de linha recolhida (Lançar frete), pendência da dashboard, item de menu, linha de lista tocável | 7–8×12–14px | 2px |
| `seta-chip.svg` | Seta de chip de filtro e de ordenação | 11×7px | 1.8px |
| `voltar.svg` | Topo de toda tela de nível 2 e de folha | 12×20px | 2.2px |
| `busca.svg` | Campo de busca das listas e das folhas de escolha | 15–17px | 1.9px |
| `whatsapp.svg` | Pílula em linha "Cobrar no WhatsApp", "Enviar ordem no WhatsApp" | 14px | 1.6px |
| `confirmar.svg` | Painel verde ao deslizar uma linha | 19×15px | 2.4px |
| `tendencia.svg` | Comparação com o mês anterior, no cartão da dashboard | 13×13px | 2px |
| `barra-inicio.svg` | Item "Início" da barra | 19×19px | 1.8px |
| `barra-fretes.svg` | Item "Fretes" da barra · linha "Caminhões" em Mais | 21×19px | 1.8px |
| `barra-novo.svg` | Item central (+) da barra | 24–26px | 2.8px |
| `barra-cobrancas.svg` | Item "Cobranças" da barra · linha "Relatório do cliente" em Mais | 20×19px | 1.8px |
| `barra-mais.svg` | Item "Mais" da barra · linha "Configurações" em Mais | 20×19px | 1.8px |

Quatro ícones nasceram nas linhas de **Mais** e ainda não foram exportados para `icons/`: clientes (dois bustos), motoristas (um busto), importar (seta para baixo com base) e conta (casa). Todos em `20×20px`, `1.8px`, no mesmo desenho da família. **Não existe ícone de microfone** — o botão "Ditar" foi removido do Lançar frete sem substituto.

## 10 — Barra de navegação

Global e permanente: aparece em toda tela de nível 1 e continua nas telas de detalhe. **É a única coisa que flutua sobre o conteúdo** — e pode, porque é escura, fina e sempre a mesma. Um bloco de botões claros sobre fundo claro não flutua nunca.

**Medidas** (medidas no DOM, não estimadas)

- pílula `57px` de altura · raio `999` · fundo `#141A17` · padding `0 4px`
- respiro interno **`11px` em cima e embaixo** — igualados de propósito; antes o topo tinha 18px e a barra parecia desequilibrada
- ícone `19–21px` e rótulo `10.5px` com gap `5px`; item ativo em `#7FCB9B` peso 700, inativo em `rgba(255,255,255,.5)` peso 600
- **(+)** `48×48` · sobe **`17,5px`** acima da linha da pílula · fundo `#1B6B3A` · rótulo "Novo" em branco
- distância da borda inferior: `max(26px, calc(env(safe-area-inset-bottom) + 20px))` — `max()`, não fallback, porque `env()` vale `0px` em navegador e um fallback nunca dispararia
- margem lateral: `max(16px, calc(env(safe-area-inset-left/right) + 16px))`

**Folga de rolagem — valor único**

Do topo do (+) até a base da tela são **`100,5px`** — medido no DOM, não calculado. Todo conteúdo rolável reserva **`max(138px, calc(env(safe-area-inset-bottom) + 132px))`** no fim: os 100,5px mais `37,5px` de respiro, para o último item chegar a ficar folgado acima da barra em vez de encostado nela.

Esse valor era `132`, `142` e `150` em telas diferentes — os três foram unificados no valor acima, em todas as telas. O **aviso do sistema** ancora em `max(112px, …)`, acima do topo do (+) e com espaço para o deslocamento de 18px da animação de entrada.


## Chips de seleção

Controles de estado, não ações. Não entram na regra de hierarquia e nunca ficam no bloco de ações do rodapé.

| Item | Definição |
|---|---|
| Filtro | 40px · raio 999 · `13px/600` · largura máx. `148px`, uma linha só com reticências — neutro `#F0EDE6`/`#6E7770`, selecionado `#E4E9E5`/`#1B6B3A` em 700, mostrando o valor escolhido. **Nunca verde sólido** — esse é exclusivo da ação principal. |
| Escolha | 48px · raio 999 · `15px/600` — não escolhido `#F0EDE6`/`#141A17`, escolhido `#E4E9E5`/`#1B6B3A` em 700. **Nunca verde sólido** — nenhum chip usa. |
| Ordenação | mesma medida do filtro — 40px · raio 999 · `13px/600`, largura máx. `148px`. Neutro mostra **Ordenar por**; escolhido mostra o critério (`Maior valor em aberto`) em `#E4E9E5`/`#1B6B3A` peso 700. Só nas listas de cadastro: Clientes, Caminhões, Motoristas |
| Variável | 44px · raio 999 · `13.5px/700` · `#E4E9E5`/`#1B6B3A` |

## Auditoria da regra de posição

Conferido no DOM em todas as telas, contra a regra vigente. **Nenhuma tela tem barra de ação fixa.** Os únicos dois elementos em posição absoluta ao pé da tela são o teclado numérico de **Lançar frete** e o de **vencimento** no relatório — a exceção prevista; medi o salvar em `774–834` contra o teclado terminando em `758`, sem sobreposição.

Duas telas violavam a ordem interna (ações **antes** de listas) e foram corrigidas:

| Tela | Era | Ficou |
|---|---|---|
| Perfil do cliente | ações no fim, depois do histórico (`1493` vs `1096`) | resumo → campos → **ações** (`1096`) → histórico (`1182`) |
| Detalhe da cobrança | ações depois de FRETES INCLUÍDOS **e** de COBRANÇAS ENVIADAS | resumo → campos → forma prevista → **ações** (`688`) → fretes incluídos (`834`) → cobranças enviadas (`1063`) |

No detalhe da cobrança a regra tem um requisito somado: **a ação principal fica visível sem rolar.** A dobra útil é o topo do (+), em `774`. Medido com `scrollTop: 0`: principal em `688–748` no estado vencido e nos mesmos `688–748` no estado **parcial**, que é o pior caso (a linha SITUAÇÃO ganha saldo recebido e restante). O cap de 3 linhas em FRETES INCLUÍDOS existe para isso, mas não bastava — havia duas listas acima das ações, não uma.

Corretas sem mudança: detalhe do frete (campos → comprovante → ações, sem lista depois), perfil do motorista, perfil do caminhão (sem principal, só Editar no cabeçalho), formulários de cliente/caminhão/motorista/despesa (salvar no fim, arquivar em texto abaixo), listas (sem bloco de ação), estados vazios (ação dentro do conteúdo).

## Onde cada tela usa o quê

Regra de hierarquia: **uma principal por tela**, sempre a ação que avança o dinheiro ou o estado. Telas de nível 1 (dashboard e listas) não têm principal — o (+) da barra é chrome, não ação de tela.

| Tela | Botões |
|---|---|
| Dashboard | sem principal · 2× pílula sobre escuro (**Gerar relatório** · **Importar fretes**) · pastilhas, pendências, barras do gráfico e cartão FretiNews são superfícies tocáveis, não botões · × discreto para dispensar o FretiNews · aviso do sistema com **Desfazer** |
| Meus fretes | sem principal · chip de filtro (Período · Cliente · Situação) · deslizar revela **Marcar recebido** · aviso do sistema depois de salvar |
| Detalhe do frete | principal **muda com a situação**: em andamento → **Enviar ordem no WhatsApp** (com secundária **Marcar como finalizado**); finalizado e sem cobrança → **Faturar frete**; já faturado → **Ver relatório** · secundárias **Marcar recebido** + **Editar frete** · texto destrutiva **Arquivar frete** · pílula em linha para anexar comprovante |
| Lançar frete | principal **Salvar frete** (com o valor no próprio botão) · linhas recolhidas abrem folha de busca · teclado numérico próprio sobreposto · aviso do sistema depois de salvar, com **Já recebi** / **Ver o frete** |
| Folha de busca | pílula de cabeçalho **+ Novo** / **+ Cadastrar** · texto neutra **Fechar** · chips de escolha |
| Folha de calendário | chips de atalho **Hoje** · **Ontem** · **Amanhã** · células de dia 48px · duas setas de mês de 44px |
| Cobranças | sem principal · pílula em linha **Cobrar no WhatsApp** · deslizar revela **Marcar recebido** · aviso do sistema no retorno do WhatsApp, com **Enviei** / **Ainda não** |
| Detalhe da cobrança | principal **Marcar recebido** / **Receber o resto** / desabilitada **Recebido ✓** · secundárias **Cobrar no WhatsApp** + **Ver relatório** · pílula em linha **ver todos os 9** |
| Cobranças vazia | principal **Gerar relatório** · texto neutra **Ver os 4 fretes** |
| Folha de recebimento | principal **Confirmar recebimento** · chips de data e de forma de pagamento · pílula em linha **Valor todo** |
| Relatório — montagem | principal **Gerar relatório**, com estado carregando · chips de período · linha de prévia desmarcável · chips **Boleto** / **Outro** ao ativar a cobrança |
| Documento A4 | principal **Compartilhar no WhatsApp** · secundárias **Baixar PDF** + **Imprimir** |
| Clientes / Caminhões / Motoristas — lista | sem principal · pílula de cabeçalho **+ Novo** · chip de ordenação **Ordenar por** |
| Perfil do cliente | principal **Gerar relatório** · **Editar** como pílula de cabeçalho · pílula em linha **Cobrar no WhatsApp** (só com valor em aberto) · pílulas **Ver todos os 34** e **Lançar frete para este cliente** · os três primeiros números do resumo são tocáveis |
| Perfil do caminhão | sem principal · **Editar** no cabeçalho · km e R$/km só aparecem com km preenchido; sem km, convite curto |
| Perfil do motorista | principal **Lançar frete com este motorista** · **Editar** no cabeçalho · telefone tocável abre a conversa |
| Cadastro / edição (cliente, caminhão, motorista) | principal **Salvar cliente** / **Salvar alterações**, desabilitada até ter nome · texto destrutiva **Arquivar** no fim do formulário rolável |
| Despesas — lista | sem principal · pílula de cabeçalho **+ Nova** · chips de Período e Categoria |
| Despesas — cadastro | principal **Salvar despesa** · teclado numérico próprio para o valor · chips de categoria e de vínculo |
| Despesas — vazia | principal **Lançar a primeira despesa** · explica que o Lucro aparece quando houver despesa |
| Importar — entrada | duas secundárias em pé de igualdade: **Colar as mensagens** + **Mandar foto do caderno** · nenhuma é destaque da outra |
| Importar — revisão | principal **Importar os 9**, dizendo quantas linhas seguem sem valor · linha desmarcável, campo de valor editável na hora |
| Importar — nada reconhecido | secundárias **Tentar de novo** + **Lançar na mão** · orientação do que tentar |
| Configurações | sem principal · linhas de OPERAÇÃO e MENSAGENS abrem os dois modelos |
| Modelo de cobrança | principal **Salvar modelo** · chips de variável {cliente} {valor} {vencimento} {rota} {empresa} · prévia abaixo do campo |
| Modelo de ordem de serviço | principal **Salvar modelo** · chips {motorista} {cliente} {carga} {origem} {destino} {data} — **sem {valor}**, o motorista não vê o preço |
| Conta da empresa | principal **Salvar dados** · linhas para Usuários, Minha assinatura e Termos · prévia do cabeçalho do relatório · texto destrutiva **Sair da conta** |
| Usuários — lista | sem principal · pílula de cabeçalho **+ Convidar** · pílulas em linha **Reenviar** e **Ver o que ela recebe** · texto destrutiva **Cancelar** no convite pendente |
| Usuários — convite | principal **Mandar convite no WhatsApp** · prévia da mensagem |
| Usuários — detalhe | texto destrutiva **Remover acesso**, visível só para o dono; o acesso do dono não é removível |
| Aceitar convite | principal **Entrar na conta** · texto neutra **Não conheço essa empresa** · sem barra de navegação: quem abre ainda não está dentro do app |
| Mais | sem principal · cartão de identidade tocável · pílula em linha **Assinar e liberar a frota** no plano gratuito · texto destrutiva **Sair da conta** |
| Novidades — lista | sem principal · linha não lida em lilás com ponto; lida volta ao claro |
| Novidades — detalhe | no máximo **uma** ação por mensagem, como principal |
| Entrar | campos **E-MAIL** e **SENHA** · principal **Entrar**, com estado carregando · secundária **Criar conta** · texto neutra **Esqueci a senha**. Login é e-mail e senha; o app **nunca** envia mensagem sozinho, então não existe código por WhatsApp aqui |
| Criar conta | campos **NOME DA TRANSPORTADORA** · **E-MAIL** · **SENHA** · **SEU TELEFONE** (o telefone é para o cliente falar com ela, não para login) · principal **Criar conta** · secundária **Já tenho conta** · chips da única pergunta de pesquisa do produto + campo livre · links para Termos |
| Esqueci a senha | campo **E-MAIL DA CONTA** · principal **Mandar link de recuperação** · secundária **Voltar pra entrada**. Recuperação por e-mail, nunca por WhatsApp |
| Termos e privacidade | duas abas · vindo do cadastro termina em principal **Li e aceito**; vindo de Ajustes é só leitura · **sem barra** no modo cadastro |
| Planos | principal **Assinar o anual** · secundária **Assinar o mensal** · o anual mostra parcelamento e economia |
| Minha assinatura | secundárias **Trocar de plano** + **Ver recibos** · texto destrutiva **Cancelar assinatura** |
| Limite do gratuito | principal **Ver os planos** · texto neutra **Depois** · nada do que já existe é bloqueado |
| Assinatura vencida | principal **Renovar assinatura** · secundária **Baixar meus dados** · leitura e exportação seguem funcionando |
| Primeiro acesso | **duas secundárias em pé de igualdade**: **Trazer os fretes que já fiz** + **Começar do zero** — nenhuma é destaque da outra, então nenhuma é a principal |
| Guia de progresso (dashboard) | até três linhas tocáveis, cada uma sumindo ao ser cumprida; o bloco inteiro desaparece ao completar |

---

## Conflitos

Nada divergindo entre telas neste momento. As medidas da barra divergiam entre este documento e a folha de estilo (respiro `12`/`11` contra `11`/`11`, elevação `18` contra `17,5`, dobra `101` contra `100,5`): o documento arredondava, e o valor vigente é o **medido no DOM** — `11`/`11`, `17,5` e `100,5`. Os três valores de folga de rolagem (`132`, `142`, `150`) e as duas espessuras da barra (`1.7` e `1.8`) foram unificados — o valor vigente está registrado acima.
