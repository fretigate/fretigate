# Botões e avisos — inventário fechado

Seis variantes de botão, mais o estado carregando, o aviso do sistema, a família FretiNews, os ícones e a barra de navegação. Nenhuma tela pode usar nada fora daqui: sem cor nova, sem altura nova, sem nome novo. Chips de seleção não são botões e estão no fim.

## Regras

- **Falta de dado.** O produto **nunca acusa cadastro incompleto**. Campo vazio aparece vazio e tocável no perfil; a falta só vira folha no momento em que impede uma ação (**12**). Sem selo de "incompleto", sem barra de progresso de cadastro, sem lembrete.

- **Vocabulário.** Dentro do produto é **"empresa"**, nunca "transportadora" — o `tipo_operacao` já prevê guincho e reboque, e o rótulo não pode prender o produto a um ramo. "Transportadora" segue valendo na página de vendas e nos anúncios, onde serve para qualificar quem compra.

- **Verde sólido.** `#1B6B3A` preenchido é exclusivo da **ação principal** — mais o (+) da barra e o círculo de iniciais da empresa. Nenhum chip, de filtro ou de escolha, usa verde sólido: selecionado é sempre `#E4E9E5` com texto `#1B6B3A`.
- **Hierarquia.** Uma principal por tela, sempre a ação que avança o dinheiro ou o estado. Nunca duas verdes na mesma tela. Telas de consulta (dashboard, listas) não têm principal — o (+) da barra é chrome global, não ação de tela.
- **Nome.** Uma ação, um nome: **Gerar relatório** quando cria, **Ver relatório** quando já existe. Nunca “Relatório” sozinho. Igual para Faturar frete · Marcar recebido · Receber o resto · Cobrar no WhatsApp · Editar frete · Arquivar frete. A regra vale para a **mesma ação** em lugares diferentes — não impede uma **ação composta**, que salva e continua outra, de ter nome próprio: o principal da folha de campo faltante (**12**) não repete "Cobrar no WhatsApp", diz "Salvar e cobrar", porque salvar-e-cobrar não é a mesma ação que só cobrar, e o nome diz para onde ela leva.
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

**Lacuna — texto do aviso de confirmação ao voltar do WhatsApp, gatilho "Enviar ordem".** O único exemplo documentado desta família com pergunta + Enviei/Ainda não é "Cobrou o Frigorífico São Luiz?" (Cobranças, item 6, ainda não construído). "Enviar ordem" (detalhe do frete, Tarefa 2 do item 5, 23/08/2026) é o primeiro uso real construído, e usa "Mandou a ordem pro motorista?" por inferência do mesmo padrão — nomear o destinatário, terminar em interrogação —, sem confirmação escrita para este texto específico. Registrado para o Design confirmar, mesmo padrão da lacuna do rótulo "Salvar no cadastro" (§12).

**Lacuna — textos de aviso do upload de comprovante (item 5, Tarefa 5,
25/08/2026, achado do quarto `/revisar`).** Nenhum destes tem confirmação
do Design: "Não deu para enviar agora." (`AnexarComprovante.tsx`, erro
genérico e falha de storage — `comprovantes.ts`), "O arquivo passa de
10 MB.", "Envie uma foto em JPEG, PNG, WEBP ou HEIC.", "Envie um arquivo.",
"Imagem grande demais.", "Não deu para abrir a imagem.", "Frete inválido.",
"Sessão inválida.", "Frete não encontrado." (chega à tela via
`gerarUrlComprovante`/`enviarComprovante`, exibida como aviso quando o
upload falha), e a mensagem de trava, já registrada com o número aprovado
em `docs/especificacao.md` § "Trava de tentativas". Mesmo padrão da lacuna
acima ("Enviar ordem") — registrado para o Design confirmar, não bloqueia.
**Achado do sexto `/revisar`:** "Envie uma foto em JPEG, PNG, WEBP ou
HEIC." não cita HEIF, embora o tipo já seja aceito (`CLAUDE.md` §4) — fica
junto desta lacuna, não corrigido agora: o texto certo (enumerar HEIF
também, ou dizer só "HEIC") é decisão do Design, mesma resposta das
outras.

**Exceção — "Enviei" que falha ao gravar não some sozinho.** Decisão do
fundador, Tarefa 2 do item 5 (23/08/2026), achado do primeiro `/revisar`
desta tarefa: `ordem_enviada_em` é o dado que a pendência "fretes sem ordem
enviada" da dashboard vai usar (§4.6) — se a gravação falhar e o aviso
sumir pelo temporizador normal (regra acima, "some sozinho em 6s/8s"), a
pessoa acredita que registrou quando não registrou, e só descobre quando a
dashboard acusar de novo, sem entender por quê. Por isso, só neste gatilho,
enquanto o toque em "Enviei" estiver mostrando erro no lugar da pergunta, o
temporizador não fecha o aviso — a mensagem some só por "Ainda não" ou por
um "Enviei" que finalmente funcione. Mesma classe de exceção já registrada
para o relatório com Pix (abaixo), por motivo diferente: lá o bloqueio seria
pior que seguir; aqui, o fechamento silencioso seria pior que insistir.


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

Quando não há logo cadastrada, o círculo mostra as iniciais da empresa. **Regra única**, usada na dashboard, em Mais, em Conta da empresa, no convite e no cabeçalho do relatório A4 — e também na linha de lista de Cliente e Motorista (decisão do fundador, tarefas 5 e 7: as duas regras coincidem para nome de pessoa digitado normalmente, e divergem só quando o nome vem todo em maiúsculas — caso em que esta regra lê a primeira palavra como sigla, mostrando até três letras em vez de duas. Consequência aceita, não motivo para criar agora a regra de pessoa, que ainda não existe em código). Por servir mais que a empresa, o código chama a função só de `iniciais`, não `iniciaisEmpresa`:

```js
const iniciais = nome => {
  const p = String(nome || '').trim().split(/\s+/);
  const sigla = p[0] && p[0] === p[0].toUpperCase() && p[0].length <= 3;
  return (sigla ? p[0] : p.slice(0, 2).map(w => w[0]).join('')).toUpperCase();
};
```

Se a primeira palavra já é uma sigla em caixa alta de até 3 letras, ela **é** a inicial — senão, a primeira letra das duas primeiras palavras. Assim "AP Transportes" → **AP** (não "AT"), "AP Transportes Rodoviários Ltda" → **AP**, "Transportes São Jorge" → **TS**, "JBS" → **JBS**.

Esta é a regra da **empresa**. **Pessoa é outra regra**: sempre a primeira letra dos dois primeiros nomes — "Antônio Pereira" → AP, "Sandra do escritório" → SD. As duas coexistem na tela de Usuários (badge da empresa no topo, badge de cada pessoa nas linhas) e não podem ser trocadas uma pela outra.

Círculo: `30px` no cartão da dashboard · `40px` em linha de lista · `48px` em Mais · `56px` em Conta e no convite · `46px` quadrado de raio 6 no A4. Fundo `#1B6B3A` com texto branco (contorno preto no A4, que é impresso), `letter-spacing:.02em`.

## Uma leitura só de cada campo

Regras de construção que valem para toda tela que exibe **e** usa o mesmo campo
— nasceram da folha do campo que falta (**12**), mas não são só dela.

**Uma leitura só do dado, dentro de cada tela.** O detalhe do frete lia o telefone por dois caminhos — o gate consultava o que a folha gravou, a linha e a nota consultavam o cadastro estático — e o app abria a conversa dizendo, na mesma tela, que não tinha número. A regra: o telefone é lido por **um acessor único** (`telDe(nome)`), em que o valor gravado pela folha vence o cadastro. Toda tela que exibe e usa o mesmo campo lê pelo mesmo lugar; duas leituras separadas sempre acabam discordando.

Vale nas três telas que têm o padrão: `telDe()` no detalhe do frete, `campoDe()` no perfil do cliente e no do motorista. O contrato é o mesmo em todas — o valor gravado pela folha vence o cadastro, e **exibição, cor, estado tocável e ação leem pelo mesmo acessor**. Um `salvar` que só fecha a folha, com a exibição lendo o cadastro estático, deixa o aviso "Salvo no cadastro" mentindo.

**Um campo, um destino de escrita.** A folha e o formulário de edição gravam no mesmo lugar (`state.campos`), e o formulário **lê pelo mesmo acessor** ao abrir. Sem isso o formulário abre vazio com o campo que a folha acabou de gravar — e "Salvar alterações" apaga silenciosamente o valor que o usuário digitou um toque antes. Quatro leitores do mesmo campo no perfil: a linha, a cor, o estado tocável e o formulário; todos pelo acessor.

**O acessor precisa saber dizer "removido".** `undefined` significa *nunca editado* e cai no cadastro; `''` significa *o usuário apagou* e vence o cadastro. Guardar contra string vazia (`salvo !== ''`) faz o valor apagado ressuscitar do array na próxima leitura — o aviso "atualizado" mente na direção oposta, e a pílula "Cobrar no WhatsApp" segue ativa para um número que já não existe. Vale nas três telas.

**Identidade do caminhão.** Um caminhão pode ser cadastrado só pela placa, então **nenhuma tela lê `apelido` direto para nomeá-lo**: existe um helper `identidade(c)` — apelido se houver, senão a placa em maiúsculas. Usado no aviso de cadastro, na linha da lista, no cabeçalho do perfil e no filtro de fretes. Sem ele, habilitar o salvar por placa cria um caminhão cujo título é string vazia: o aviso vira " entrou na frota." e a linha da lista aparece sem nome. É a mesma classe de defeito de "um campo, um acessor" — quando a condição de salvar muda, todo leitor daquele campo muda junto.

**A palavra é sempre "adicionar".** Nos três perfis (cliente, motorista, caminhão) e na linha TELEFONE do detalhe do frete. Não existe "não preenchido", "não preenchida" nem "não preenchido no cadastro" — três redações para o mesmo estado fazem parecer três estados diferentes.

## Números de regra de produto

**Prazo, limite e número de regra vêm da especificação, não do desenho.** O `componentes.md` manda no que a tela contém — texto, rótulo, ordem, variante — mas nunca inventa nem "arredonda" um valor de regra. Quando um número desses aparece em tela, ele é citação: se a especificação mudar, a tela muda atrás dela.

| Número | Valor | Onde aparece |
|---|---|---|
| Validade do link de recuperação | **2 horas** | Recuperação enviada · Link expirado. O usuário pode não abrir o e-mail na hora |
| Senha mínima | 6 caracteres | Redefinir senha · Criar conta |
| Prazo padrão de vencimento | 15 dias | Configurações · perfil do cliente (herdado) |

## Barra de navegação: exceção fora de sessão

A barra de navegação é permanente **dentro** da sessão. Fora dela, não existe — quem ainda não entrou não tem para onde a barra levar, e mostrá-la vira atalho para pular o cadastro. Já aconteceu: a tela de Termos herdou a barra no modo cadastro e dava para chegar em Fretes sem criar conta.

**Sem barra:** Entrar · Criar conta · Esqueci a senha (e o estado **Recuperação enviada**, mesma rota) · Redefinir senha (e o estado **Redefinir senha — link expirado**, mesma rota) · Termos **vindo do cadastro** · Aceitar convite. As seis rotas são as do `CLAUDE.md` §8 — lista fechada, tela nova sem barra entra aqui só com decisão explícita, não por analogia; os dois estados citados entre parênteses não contam como rota nova, porque `TelaRedefinirSenha` e `PedidoDeRecuperacao` já documentam os dois como estados de um componente só, não telas.

**Com barra:** todo o resto. Termos **vindo de Ajustes**, na regra final, também ganha barra — mas Ajustes ainda não existe, então os dois modos de `/termos` usam por enquanto a mesma margem provisória do modo cadastro, sem barra nenhuma para reservar folga contra. Não é o valor final do modo Ajustes; corrigir quando Ajustes for construído.

A distinção não é a tela, é a **origem**: o mesmo componente de Termos aparece dos dois jeitos, e quem decide é a prop `origem`. Nenhuma tela fora de sessão reserva a folga de rolagem de `138px` — sem barra, o conteúdo termina no respiro normal de `40px`.

## Corpo de texto fora de sessão

As telas de fora de sessão (entrar, criar conta, recuperação, redefinir senha, termos, aceitar convite) precisam de um papel que não existia: **parágrafo de leitura**, mais longo que um subtítulo e sem ser rótulo.

| Papel | Valor | Onde |
|---|---|---|
| Corpo fora de sessão | `15px / 500 / 1.5`, `#3C443E`, `text-wrap: pretty` | parágrafos de explicação em Entrar, Criar conta, Recuperação enviada, Redefinir senha |
| Corpo sobre alerta | `15px / 500 / 1.5`, `#8A5237` sobre `#F6E6DD` | link expirado — mesma métrica, tinta de alerta |

É a mesma métrica do subtítulo dessas telas, de propósito: subtítulo e corpo são o mesmo papel visual, o que muda é a extensão. Dentro do app o corpo de apoio segue em `13–14px`, porque divide espaço com dado; fora de sessão não há dado na tela, então o texto pode ser o elemento principal.

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
| `clientes.svg` | Linha "Clientes" em Mais | 20×20px | 1.8px |
| `motoristas.svg` | Linha "Motoristas" em Mais | 20×20px | 1.8px |
| `importar.svg` | Linha "Importar fretes" em Mais | 20×20px | 1.8px |
| `conta.svg` | Linha "Conta da empresa" em Mais | 20×20px | 1.8px |

Os quatro ícones que faltavam nas linhas de **Mais** — clientes (dois bustos), motoristas (um busto), importar (seta para baixo com base) e conta (casa) — foram exportados para `docs/icones/` na tarefa 4 (09/08/2026), no mesmo desenho da família. **Não existe ícone de microfone** — o botão "Ditar" foi removido do Lançar frete sem substituto.

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


## 11 — Cadastro rápido

Folha curta que abre pelo **"+ Novo"** dentro da folha de busca, durante o lançamento de frete. Existe para cliente, caminhão e motorista — origem, destino e carga continuam sendo só um nome, criado direto na busca sem folha.

**Só o nome é obrigatório.** Os outros campos são pedidos, não exigidos: obrigar no meio do lançamento briga com a meta de 30 segundos, e quem pular fica coberto pela folha do momento da ação (**12**).

| Cadastro | Campos |
|---|---|
| Cliente | **Nome** · Telefone · Prazo de pagamento (vazio herda o padrão da empresa) |
| Caminhão | **Apelido** · Placa · Tipo |
| Motorista | **Nome** · Telefone · Categoria da CNH |

- folha inferior padrão: raio `28px 28px 0 0` · fundo `#FAF8F4` · alça `38×4` em `#DAD5CA` · overlay `rgba(20,26,23,.42)`
- campos: `78px` de altura mínima, rótulo `11px/700/.16em` em `#6E7770`, valor `17px/600`
- principal **Cadastrar e usar** — salva e **volta ao lançamento com o item já escolhido**, sem passo extra
- texto neutra **Cancelar**
- a folha de busca fecha junto: quem tocou em "+ Novo" queria voltar ao frete, não à lista

**Não existe marca de cadastro incompleto.** O formulário curto pede o mínimo de propósito; marcar o resultado como incompleto acusa a pessoa de um erro que ela não cometeu, e com vinte cadastros pela metade todo perfil vira repreensão.

## 12 — Folha do campo que falta

**A falta aparece no momento em que atrapalha, não antes.** Quando a pessoa toca numa ação que precisa de um campo não preenchido, abre uma folha curta pedindo **só aquele campo** — e a ação continua sozinha depois de salvar. Não interrompe: completa.

| Medida | Valor |
|---|---|
| Folha | `border-radius: 28px 28px 0 0` · `padding: 16px 20px 40px` · fundo `#FAF8F4` sobre `rgba(20,26,23,.42)` · alça `38×4` em `#DAD5CA` |
| Título | `21px / 800 / 1.15` em `#141A17` — nomeia quem falta: "Falta o telefone de Lojas Miranda"; quando quem falta é a própria empresa, não um cliente ou motorista, o título muda de sujeito: "Falta a chave Pix da sua empresa" |
| Apoio | `14px / 500 / 1.45` em `#3C443E` — diz por que o app precisa e que é uma vez só |
| Campo | o mesmo do formulário: `min-height 78px`, raio `18`, rótulo `11px/.16em` |
| Principal | 60px, e o rótulo **diz para onde a ação segue**: "Salvar e cobrar", "Salvar e enviar ordem", "Salvar e gerar relatório", "Salvar no cadastro" — repetir o nome da ação original faz parecer que a primeira tentativa falhou |
| Escape | "Agora não" em texto neutro `#6E7770`, 44px — fecha sem salvar e **sem executar a ação**, exceto no relatório com Pix (ver abaixo) |

**Onde dispara hoje:** telefone tocável, ausente ou inválido, no perfil do cliente e no perfil do motorista (`FolhaDeTelefone`, Tarefa 1 do item 5, 23/08/2026) · "Enviar ordem no WhatsApp" sem telefone do motorista, no detalhe do frete (Tarefa 2 do item 5, 23/08/2026 — ao salvar, segue automaticamente para a conversa). **Ainda não construídos:** "Cobrar no WhatsApp" sem telefone do cliente (Cobranças, lista e detalhe) · "Gerar relatório" **com a opção "gerar cobrança" marcada** e sem chave Pix da empresa — relatório sem cobrança não pede Pix · qualquer campo vazio tocado no perfil do cliente além de telefone (Documento, Endereço, E-mail continuam levando ao formulário de edição, `LinhaDePerfil` com `href`, não abrem esta folha).

**Lacuna — rótulo do principal para o gatilho de telefone tocável no perfil, sem ação de continuação.** A linha "Principal" acima já lista "Salvar no cadastro" entre os quatro rótulos aprovados, mas nenhum dos quatro foi escrito pensando neste gatilho especificamente — a lista original nomeava só Cobrar no WhatsApp, Enviar ordem e Gerar relatório. `TelefonePerfil` (Tarefa 1) usa "Salvar no cadastro" por ser o mais próximo (salva e fecha, sem "seguir" para lugar nenhum), mas é inferência, não confirmação escrita para este caso — registrado para o Design confirmar.

**Validação antes de salvar.** Telefone inválido salvo abre o WhatsApp em nada, e a culpa cai no produto — então a folha valida no próprio campo, usando o estado de erro do inventário: fundo `#F6E6DD`, rótulo `#B3401A`, e uma linha de `13px / 600 / 1.4` em `#B3401A` abaixo do campo dizendo o que está errado. A principal só habilita quando passa.

| Campo | Regra | Mensagem |
|---|---|---|
| TELEFONE | 10 ou 11 dígitos com DDD; DDD ≥ 11 | "Faltam dígitos. Com DDD são 10 ou 11." · "Número comprido demais…" · "Esse DDD não existe." |
| E-MAIL | tem `@` e domínio com ponto | "Falta o @ ou o final do endereço." |
| Demais | qualquer texto não vazio | — |

A validação começa a falar **depois do primeiro dígito**, nunca com o campo vazio: campo vazio é o estado inicial esperado, não erro.

**"Agora não" fecha o ciclo com aviso.** Sem ele a pessoa toca numa ação e nada acontece, o que lê como defeito. Ao fechar sem salvar, o aviso do sistema (superfície escura) diz o porquê: **"Sem o telefone não dá para cobrar por aqui."** · **"Sem o telefone não dá para mandar a ordem por aqui."** · no perfil, para campo não essencial, "Campo continua vazio. Dá para preencher quando precisar."

**Exceção: o relatório com cobrança não bloqueia.** Bloquear seria pior aqui — quem tocou "Gerar relatório" queria o documento, e o cliente ainda pode pagar por boleto ou transferência sem a chave Pix. Por isso, só neste gatilho, "Agora não" **não cancela a ação**: o relatório é gerado do mesmo jeito, sem a chave, e o aviso do sistema é curto: **"Relatório gerado sem a chave Pix."**

**Fonte única do dado.** O telefone de cliente vive em `CLIENTES` (TelaClientes) e o de motorista em `MOTORISTAS` (TelaMotoristas). Os mapas `TELEFONES` e `TEL_MOTORISTA` das outras telas são **espelhos** desses cadastros, não uma segunda verdade: esvaziar um sem esvaziar o outro faz o app se contradizer em dois toques — a mesma classe de defeito das iniciais da empresa e dos dias da semana. Quem entra sem telefone é **Lojas Miranda** (cliente) e **Cícero** (motorista), nas duas pontas.

**No perfil, campo vazio aparece vazio e tocável:** um **"adicionar"** em `#1B6B3A` no lugar do valor, com a mesma métrica do valor preenchido. A exclusividade do verde sólido ("Regras" acima) é sobre **fundo preenchido**, não sobre cor de texto — verde como texto já marca elemento tocável em outros lugares do inventário (pílula em linha, pílula de cabeçalho, chip selecionado), e é isso que o "adicionar" precisa comunicar. Nunca `#5C6660`: é a cor de desabilitado, o oposto semântico de um campo tocável. Não é aviso — é o campo sendo acessível.

## Chips de seleção

Controles de estado, não ações. Não entram na regra de hierarquia e nunca ficam no bloco de ações do rodapé.

| Item | Definição |
|---|---|
| Filtro | 40px · raio 999 · `13px/600` · largura máx. `148px`, uma linha só com reticências — neutro `#F0EDE6`/`#6E7770`, selecionado `#E4E9E5`/`#1B6B3A` em 700, mostrando o valor escolhido. **Nunca verde sólido** — esse é exclusivo da ação principal. |
| Escolha | 48px · raio 999 · `15px/600` — não escolhido `#F0EDE6`/`#141A17`, escolhido `#E4E9E5`/`#1B6B3A` em 700. **Nunca verde sólido** — nenhum chip usa. |
| Ordenação | mesma medida do filtro — **48px** (não 40 — é sempre um chip sozinho na fileira, sem vizinho para absorver o erro de toque; `CLAUDE.md` §8) · raio 999 · `13px/600`, largura máx. `148px`. Neutro mostra **Ordenar por**; escolhido mostra o critério (`Maior valor em aberto`) em `#E4E9E5`/`#1B6B3A` peso 700. Só nas listas de cadastro: Clientes, Caminhões, Motoristas |
| Variável | 44px · raio 999 · `13.5px/700` · `#E4E9E5`/`#1B6B3A` |

**Lacuna — chip de Período sozinho fora de "Meus fretes" (Tarefa 6 do item
4, 22/08/2026) não tem linha própria aqui.** Os três perfis usam o chip
Filtro (`ChipFiltro`) para Período, sozinho na fileira — mesma regra geral
do `CLAUDE.md` §8 ("chip sozinho segue os 48px", corrigida na Tarefa 5),
aplicada com `altura={48}`. Esta tabela só nomeia "Ordenação" para o caso
de chip sozinho a 48px; "Filtro" continua descrito só em 40px. Registrado
para o Design decidir, mesma categoria da lacuna irmã de `docs/estilo.md`
("Onde cada nível cai", Caminhões/Motoristas).

## Auditoria da regra de posição

Conferido no DOM em todas as telas, contra a regra vigente. **Nenhuma tela tem barra de ação fixa.** Os únicos dois elementos em posição absoluta ao pé da tela são o teclado numérico de **Lançar frete** e o de **vencimento** no relatório — a exceção prevista; medi o salvar em `774–834` contra o teclado terminando em `758`, sem sobreposição.

Duas telas violavam a ordem interna (ações **antes** de listas) e foram corrigidas:

| Tela | Era | Ficou |
|---|---|---|
| Perfil do cliente | ações no fim, depois do histórico (`1493` vs `1096`) | resumo → campos → **ações** (`1096`) → histórico (`1182`) |
| Detalhe da cobrança | ações depois de FRETES INCLUÍDOS **e** de COBRANÇAS ENVIADAS | resumo → campos → forma prevista → **ações** (`688`) → fretes incluídos (`834`) → cobranças enviadas (`1063`) |

No detalhe da cobrança a regra tem um requisito somado: **a ação principal fica visível sem rolar.** A dobra útil é o topo do (+), em `774`. Medido com `scrollTop: 0`: principal em `688–748` no estado vencido e nos mesmos `688–748` no estado **parcial**, que é o pior caso (a linha SITUAÇÃO ganha saldo recebido e restante). O cap de 3 linhas em FRETES INCLUÍDOS existe para isso, mas não bastava — havia duas listas acima das ações, não uma.

**Detalhe da cobrança, medido na tela construída (item 6, Tarefa 4,
27/08/2026)** — os números acima (`688–748`, dobra `774`) são do mockup do
Design; esta medição é da página real, em `viewport 375×812` (celular, não os
`1280×720` usados nas remedições de perfil abaixo). **O pior caso corrigido
pelo fundador ao aprovar o plano: parcial COM vencido ao mesmo tempo**, não
parcial isolado — a marca de prazo (vencida) e a linha SITUAÇÃO (recebeu X,
falta Y) crescem juntas nesse caso. Medido com `scrollTop: 0`, cobrança
faturada há 17 dias com R$ 40 de R$ 100 já recebidos: resumo em `124`,
VENCIMENTO em `299`, SITUAÇÃO em `374`, a principal ("Receber o resto") em
`533–593`, FRETES INCLUÍDOS em `619`. **A dobra é o topo do (+)**, não a
barra (`CLAUDE.md` §8: a folga se mede "a partir do topo do (+), que sobe
acima da linha da barra") — medido neste viewport, o topo do (+) fica em
`711,5` (a barra em si começa em `729`, mas o círculo do botão sobe `17,5px`
acima dela). A principal fica inteira acima do (+), com folga de `≈119px`.

Corretas sem mudança: detalhe do frete (campos → comprovante → ações, sem lista depois), formulários de **cliente**, **motorista** e **despesa** (salvar no fim, arquivar em texto abaixo), listas (sem bloco de ação), estados vazios (ação dentro do conteúdo).

**Correção desta auditoria.** A versão anterior listava o formulário de **caminhão** entre os conferidos. Ele não existia quando a medição foi feita — a linha afirmava verificação de uma tela ausente, o que engana mais que uma lacuna, porque quem lê "conferido" para de conferir. O formulário existe agora e segue a regra (salvar no fim do conteúdo rolável, arquivar em texto abaixo), mas fica registrado **por que** o erro aconteceu: a auditoria foi escrita por analogia entre as três telas de cadastro, não por medição de cada uma. **Auditoria por analogia não é auditoria** — cada linha aqui vale só para a tela que foi de fato aberta e medida.

**Perfil do caminhão, remedido na Tarefa 6 do item 4, segundo commit
(22/08/2026).** Até este commit a tela só tinha identificação, e por isso
constava na linha "Corretas sem mudança" acima como "sem principal, só
Editar no cabeçalho". Essa descrição parou de valer no mesmo commit que
acrescentou o resumo de km/R$ por km e a pílula em linha "Lançar frete com
este caminhão" — por isso saiu daquela linha e ganha medição própria aqui,
em vez de continuar afirmando o que já não é verdade. Medido no DOM
(`getBoundingClientRect`, viewport 1280×720, `scrollTop: 0`): Resumo em
`197`, Identificação em `313`, a pílula em `539–577`, Histórico em `603` —
mesma ordem da regra (resumo → campos → **ação** → histórico), igual ao
perfil do cliente. Segue sem principal (nenhum botão verde sólido na
tela).

**Perfil do motorista, remedido na Tarefa 6 do item 4, terceiro commit
(22/08/2026).** Até este commit a tela só tinha identificação (sem resumo,
sem ação, sem histórico), e por isso constava na linha "Corretas sem
mudança" acima, sem parêntese próprio — não havia lista nem ação para medir
contra a regra de posição. Isso deixa de valer no mesmo commit que
acrescentou o resumo de fretes/valor transportado e o botão principal
"Lançar frete com este motorista": a tela ganha lista (Histórico) e ação
pela primeira vez, então sai daquela linha e ganha medição própria aqui, em
vez de continuar listada como se ainda não tivesse nenhuma das duas. Medido
no DOM
(`getBoundingClientRect`, viewport 1280×720, `scrollTop: 0`): Resumo em
`197`, Identificação em `295`, o botão principal em `523–583`, Histórico em
`609` — mesma ordem da regra (resumo → campos → **ação** → histórico),
igual aos outros dois perfis.

## Onde cada tela usa o quê

Regra de hierarquia: **uma principal por tela**, sempre a ação que avança o dinheiro ou o estado. Telas de nível 1 (dashboard e listas) não têm principal — o (+) da barra é chrome, não ação de tela.

| Tela | Botões |
|---|---|
| Dashboard | sem principal · 2× pílula sobre escuro (**Gerar relatório** · **Importar fretes**) · pastilhas, pendências, barras do gráfico e cartão FretiNews são superfícies tocáveis, não botões · × discreto para dispensar o FretiNews · aviso do sistema com **Desfazer** |
| Meus fretes | sem principal · chip de filtro (Período · Cliente · Situação) · deslizar revela **Marcar recebido** · aviso do sistema depois de salvar |
| Detalhe do frete | principal **muda com a situação**: em andamento, sem motorista → **Escolher motorista** (leva a Editar frete); em andamento, com motorista → **Enviar ordem no WhatsApp**, com aviso do sistema **Enviei** / **Ainda não** ao voltar da conversa (Tarefa 2 do item 5) — em andamento, qualquer que seja o estado da principal, acompanha a secundária **Marcar como finalizado** (Tarefa 3 do item 5, 24/08/2026); finalizado e sem cobrança → **Faturar frete**; já faturado → **Ver relatório** · secundárias **Marcar recebido** + **Editar frete** · texto destrutiva **Arquivar frete** · pílula em linha para anexar comprovante |
| Lançar frete | principal **Salvar frete** — na edição, **Salvar alterações** (com o valor no próprio botão nos dois casos) · linhas recolhidas abrem folha de busca · teclado numérico próprio sobreposto · aviso do sistema depois de salvar (só na criação), com **Já recebi** / **Ver o frete** · com título ativo, Cliente e o valor ficam travados, sem abrir folha/teclado |
| Folha de busca | pílula de cabeçalho **+ Novo** / **+ Cadastrar** · texto neutra **Fechar** · chips de escolha |
| Folha de calendário | chips de atalho **Hoje** · **Ontem** · **Amanhã** · células de dia 48px · duas setas de mês de 44px |
| Cobranças | sem principal · pílula em linha **Cobrar no WhatsApp** · deslizar revela **Marcar recebido** · aviso do sistema no retorno do WhatsApp, com **Enviei** / **Ainda não** |
| Detalhe da cobrança | principal **Marcar recebido** / **Receber o resto** / desabilitada **Recebido ✓** · secundárias **Cobrar no WhatsApp** + **Ver relatório** · pílula em linha **ver todos os 9** |
| Cobranças vazia | principal **Gerar relatório** · texto neutra **Ver os 4 fretes** |
| Folha de recebimento | principal **Confirmar recebimento** · chips de data e de forma de pagamento · pílula em linha **Valor todo** |
| Relatório — montagem | principal **Gerar relatório**, com estado carregando · chips de período · linha de prévia desmarcável · chips **Boleto** / **Outro** ao ativar a cobrança |
| Documento A4 | principal **Compartilhar no WhatsApp** · secundárias **Baixar PDF** + **Imprimir** |
| Clientes / Caminhões / Motoristas — lista | sem principal · pílula de cabeçalho **+ Novo** · chip de ordenação **Ordenar por** |
| Perfil do cliente | principal **Gerar relatório** · **Editar** como pílula de cabeçalho · pílula em linha **Cobrar no WhatsApp** (só com valor em aberto) · pílulas **Ver todos os 34** e **Lançar frete para este cliente** · os três primeiros números do resumo são tocáveis · telefone tocável abre a conversa, ou a Folha do campo que falta (§12) se ausente/inválido — resolvido na Tarefa 1 do item 5, 23/08/2026 |
| Perfil do caminhão | sem principal · **Editar** no cabeçalho · km e R$/km só aparecem com km preenchido; sem km, convite curto · pílula em linha **Lançar frete com este caminhão** |
| Perfil do motorista | principal **Lançar frete com este motorista** · **Editar** no cabeçalho · telefone tocável abre a conversa, ou a Folha do campo que falta (§12) se ausente/inválido — resolvido na Tarefa 1 do item 5, 23/08/2026 |
| Cadastro / edição de cliente | principal **Salvar cliente** / **Salvar alterações**, desabilitada até ter nome · texto destrutiva **Arquivar cliente** no fim do formulário rolável |
| Cadastro / edição de motorista | principal **Salvar motorista** / **Salvar alterações**, desabilitada até ter nome · texto destrutiva **Arquivar motorista** no fim |
| Cadastro / edição de caminhão | principal **Salvar caminhão** / **Salvar alterações**, desabilitada até ter **apelido ou placa** — os dois identificam o caminhão, e quem só sabe a placa cadastra pela placa · chips de escolha para **TIPO** — **Toco · Truck · Bitruck · Carreta · Bitrem**, campo opcional, decisão do fundador em 10/08/2026 (`docs/especificacao.md`, entidade Veiculo) · texto destrutiva **Arquivar caminhão** no fim. **Sem campo de ano**: não alimenta cálculo, relatório, cobrança nem ordem |
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
| Entrar | **marca no topo** (provisória, pendente do Design — a lacuna e o que falta ele definir estão em `docs/estilo.md`) · campos **E-MAIL** e **SENHA** (com **revelar**, decisão do fundador em 12/08/2026 — mesma variante de Redefinir senha) · principal **Entrar**, com estado carregando · secundária **Criar conta** · texto neutra **Esqueci a senha**. Login é e-mail e senha; o app **nunca** envia mensagem sozinho, então não existe código por WhatsApp aqui |
| Criar conta | **marca no topo** (provisória) · campos **NOME DA EMPRESA** · **E-MAIL** · **SENHA** (com **revelar**, decisão do fundador em 12/08/2026) · **SEU NOME** (obrigatório — é o que distingue os dois usuários no "cobrado por" e na tela de Usuários; o nome da empresa ali deixaria os dois idênticos justamente na tela que existe para diferenciá-los) · **SEU TELEFONE** (contato para o cliente, não login) · principal **Criar conta** · secundária **Já tenho conta** · chips da única pergunta de pesquisa do produto + campo livre · links para Termos |
| Esqueci a senha | **marca no topo** (provisória) · campo **E-MAIL DA CONTA** · principal **Mandar link novo** (mesmo nome em Recuperação enviada e Link expirado — é a mesma ação nas três) · secundária **Voltar pra entrada**. Recuperação por e-mail, nunca por WhatsApp |
| Recuperação enviada | **marca no topo** (provisória — mesma rota de Esqueci a senha, então herda) · sem campos · principal **Mandar link novo** (reenviar — mesmo nome da ação em Link expirado) · secundária **Voltar pra entrada** · pílula em linha **Usar outro e-mail** · corpo explicando que o link vale 2 horas e o que fazer se não chegar. Era a tela sem saída nenhuma |
| Redefinir senha — link válido | **marca no topo** (provisória) · campo único **SENHA NOVA** com **revelar** (variante do inventário — sem "repetir a senha": conferir digitando duas vezes no escuro erra mais que ver uma vez) · principal **Salvar senha e entrar**, que habilita com 6+ caracteres · **sem voltar e sem secundária**: quem chegou pelo link do e-mail não tem tela anterior · sem barra de navegação |
| Redefinir senha — link expirado | **marca no topo** (provisória — mesma rota de link válido, então herda) · sem campos · principal **Mandar link novo** · secundária **Voltar pra entrada** · bloco de corpo sobre `#F6E6DD` dizendo que o link vale 2 horas e que a conta e os fretes seguem intactos · **não pede o e-mail de novo** — o link já identifica a conta |
| Termos e privacidade | **marca no topo só no modo cadastro** (provisória; vindo de Ajustes não tem — mesma distinção por origem da seção "Barra de navegação: exceção fora de sessão") · duas abas · vindo do cadastro termina em principal **Li e aceito**; vindo de Ajustes é só leitura · **sem barra** no modo cadastro |
| Termos e privacidade — abas | **lacuna registrada:** as duas abas usam pílula de cabeçalho como se fossem filtro, e não há variante de aba no inventário. Funciona, mas é empréstimo: pílula de cabeçalho é ação, aba é navegação entre irmãos. Enquanto não houver variante própria, fica assim e não deve ser copiada para outra tela |
| Planos | principal **Assinar o anual** · secundária **Assinar o mensal** · o anual mostra parcelamento e economia |
| Minha assinatura | secundárias **Trocar de plano** + **Ver recibos** · texto destrutiva **Cancelar assinatura** |
| Limite do gratuito | principal **Ver os planos** · texto neutra **Depois** · nada do que já existe é bloqueado |
| Assinatura vencida | principal **Renovar assinatura** · secundária **Baixar meus dados** · leitura e exportação seguem funcionando |
| Primeiro acesso | **duas secundárias em pé de igualdade**: **Trazer os fretes que já fiz** + **Começar do zero** — nenhuma é destaque da outra, então nenhuma é a principal |
| Guia de progresso (dashboard) | até três linhas tocáveis, cada uma sumindo ao ser cumprida; o bloco inteiro desaparece ao completar |

---

## Conflitos

Nada divergindo entre telas neste momento. As medidas da barra divergiam entre este documento e a folha de estilo (respiro `12`/`11` contra `11`/`11`, elevação `18` contra `17,5`, dobra `101` contra `100,5`): o documento arredondava, e o valor vigente é o **medido no DOM** — `11`/`11`, `17,5` e `100,5`. Os três valores de folga de rolagem (`132`, `142`, `150`) e as duas espessuras da barra (`1.7` e `1.8`) foram unificados — o valor vigente está registrado acima.
