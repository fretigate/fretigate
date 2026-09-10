# FretiGate — folha de estilo (consolidado)

Extraído das telas já feitas: dashboard, Meus fretes, detalhe do frete,
Cobranças, detalhe da cobrança, folhas, estados vazios, modelo de mensagem,
lançar frete, e da página de componentes. Nada aqui foi inventado — é o que
já está implementado. Os quatro elementos que saíam com valores diferentes
entre telas estão na seção **Conflitos resolvidos**, com a decisão aplicada.

---

## Cores

| Cor | Uso |
|---|---|
| `#FAF8F4` | Papel — fundo de toda tela |
| `#F0EDE6` | Separação — campo, chip não escolhido, linha de lista, cartão de pendência, fundo do teclado numérico |
| `#EDEAE3` | Separação (variante) — fundo de pílula desabilitada |
| `#E4E9E5` | Pílula em linha, pílula de cabeçalho e **todo chip selecionado** — filtro e escolha, com texto `#1B6B3A` |
| `#D0E1D7` | Pílula em linha/cabeçalho, pressionada |
| `#E4E0D6` | Fundo de botão principal desabilitado; também a barra mais antiga do gráfico de 6 meses |
| `#D6D1C5` | Barra do mês anterior no gráfico de 6 meses |
| `#F4F1EB` | Fundo de botão secundário desabilitado |
| `#141A17` | Tinta principal (texto) · superfície escura (cartão de faturamento, aviso do sistema) |
| `#3C443E` | Tinta de apoio forte — corpo de texto, texto sobre `#F6E6DD`/`#E4E9E5`, chip de sugestão |
| `#6E7770` | Rótulo de seção, texto de apoio, subtítulo, placeholder |
| `#A8AFA9` | Ponto de origem (mapa textual), seta de linha, rótulo interno da página de componentes |
| `#5C6660` | Texto desabilitado — único tom, testado ≥4.5:1 em todos os fundos claros onde aparece |
| `#22402F` | Texto sobre a prévia da mensagem (`#E4E9E5`) no modelo de cobrança — é conteúdo do usuário, não mensagem do sistema |
| `#1B6B3A` | **Ação** — verde rodovia. **Verde sólido é exclusivo da ação principal**: botão principal, o (+) da barra, o círculo de iniciais da empresa e a tinta de link/valor "Quitado". **Nenhum chip usa verde sólido** — selecionado é sempre `#E4E9E5` + texto `#1B6B3A` |
| `#14522C` | Ação pressionada |
| `#7FCB9B` | Único verde claro do sistema — só sobre fundo escuro (comparação de mês no cartão, item ativo da barra de navegação) |
| `#F4B723` | Amarelo faixa-de-pista — só sobre escuro: "TROCAR", sugestão de valor, aviso de offline |
| `#8A6206` | Situação "A faturar" / "vence hoje", sobre fundo claro |
| `#7A5A0B` | Texto de apoio dentro da etiqueta "Parcial" (sobre `#FBF1DF`) |
| `#FBF1DF` | Fundo da etiqueta "Parcial" na lista de cobranças; também o campo vazio em Importar fretes |
| `#B3401A` | Situação "Vencido" / destrutiva (Arquivar) |
| `#8A3314` | Destrutiva pressionada |
| `#F6E6DD` | Fundo da pastilha "Vencido" (dashboard e Cobranças) |
| `#8A5237` | Texto de apoio sobre a pastilha "Vencido" |
| `#DAD5CA` | Alça de arraste no topo de toda folha inferior |
| `#E8E4DB` | Fundo fora do celular — só na prancheta de design, nunca no app |
| `#EDEBFA` `#2C2555` `#5B4FA8` | Família FretiNews — comunicação da plataforma. Ver seção própria abaixo |
| `rgba(20,26,23,.06–.42)` | Escurecimento: fundo do overlay de folha (.42), sombra do aviso do sistema (.16/.30) |
| `rgba(255,255,255,.06–.82)` | Texto/fundo sobre a superfície escura, em opacidades crescentes conforme a hierarquia (rótulo .45 → nome da empresa .82 → texto pleno 1) |

Nenhuma cor além destas e das três da família FretiNews aparece no produto.

**A precisão, acrescentada em 14/08/2026:** esta é a lista fechada das cores
que a **interface escolhe** — cor escrita em CSS, em token ou em classe. Ela
nunca falou de cor **dentro de imagem**, e não passa a falar: a marca do
FretiGate (`public/marca/fretigate.png`) traz o verde escuro `#0C311B`, que
não está nesta tabela e não entra nela. A distinção não é conveniência para
acomodar a marca — é o que a regra sempre quis dizer. `CLAUDE.md` §8 manda
tirar daqui "cor, altura, raio, tamanho e peso de fonte", que são **decisões
de interface**; um arquivo de imagem não é decidido aqui, é recebido pronto
do Design. **Se a marca um dia virar SVG escrito no código, o `#0C311B` passa
a ser cor da interface e precisa entrar nesta tabela antes.** Escrito porque
o `/revisar` apontou que o documento estava dizendo duas coisas ao mesmo
tempo — e a saída certa era tornar a frase precisa, não abrir exceção para
ela (`CLAUDE.md` §2).

**Lacuna aberta — `#F6E6DD`/`#8A5237` como bloco de aviso, não só pastilha
(item 13, Tarefa 3 parcial, 09/09/2026, achado do `/revisar`).** A tela
Assinatura vencida (`src/app/(app)/assinatura-vencida/page.tsx`) usa o
mesmo par de cores da linha 38/39 acima como fundo de um bloco de corpo
inteiro (`rounded-campo`, `px-16 py-16`) explicando o estado — não a
pastilha pequena que a tabela documenta (dashboard e Cobranças). É o
precedente mais próximo (mesmo significado: "vencido"), reaproveitado por
analogia — igual ao padrão já usado para as demais lacunas desta folha
(altura de miniatura, barra de gráfico); fica registrado até o Design
formalizar um bloco de aviso próprio, se for o caso.

---

## Tipografia

**Archivo** variável (`wdth 75..125`, `wght 400..800`) em toda a interface.
**Azeret Mono** (`wght 400..600`) só na placa do caminhão — nunca em preço,
nunca em nome, nunca em corpo de texto.

### Três níveis por tela

Cada tela tem no máximo três níveis visíveis, e a diferença entre vizinhos é
óbvia num relance:

| Nível | O que é | Tinta | Peso |
|---|---|---|---|
| **Primário** | o que a pessoa veio ver: valor, nome do cliente, número-herói | `#141A17` | 700–800 |
| **Secundário** | contexto do dado: rota, referência, vencimento | `#3C443E` | 500–600 |
| **Terciário** | rótulo e apoio, mais o **cromo** | `#6E7770` | 500–700 |

**Cromo é mais quieto que conteúdo.** Título de tela, campo de busca, chip de
filtro e total contextual são ferramenta e vivem no terciário — nunca
competem com o dado do usuário. O que recua é ferramenta, nunca dado: valor em
dinheiro, nome do cliente e número-herói não perdem peso em nenhuma tela.

| Papel | Tamanho/entrelinha | Peso | Largura/rastreio | Onde |
|---|---|---|---|---|
| Número-herói — principal da tela | 60/1 | 800 | `wdth 92%`, `ls -.035em` | Valor do frete em Lançar frete; faturamento do mês na dashboard |
| Número-herói — leitura em detalhe | 46/1 | 800 | `wdth 94%`, `ls -.03em` | Valor no detalhe do frete e da cobrança |
| Nome em destaque (detalhe) | 26/1.1 | 800 | `wdth 96%`, `ls -.015em` | Nome do cliente no detalhe do frete/cobrança/perfil |
| Título de modelo/config | 24/1.15 | 800 | `wdth 96%` | "Modelo de cobrança" |
| Título de estado vazio | 22/1.25 | 800 | `ls -.01em` | "Ninguém te deve nada agora." |
| Título de folha | 21/1.1 | 800 | — | "Escolher cliente", "Ordenar por", "Período" |
| **Título de tela (cromo)** | **20/1.1** | **700** | `wdth 96%`, `ls -.01em`, tinta `#3C443E` | "Meus fretes", "Cobranças", "Clientes", "Novo relatório" — recuado: é ferramenta, não dado |
| Nome em linha de lista | 17/1.15 | 700 | — | Cliente em Meus fretes/Cobranças/Clientes |
| Nome em linha recolhida | 16.5/1.2 | 700 | — | Valor da linha em Lançar frete; título de pendência; linha do Mais |
| Valor em lista/detalhe (número) | 20/1 · 46/1 (herói) | 800 | tabular-nums | Valor por frete/cobrança na lista; valor no detalhe |
| Texto de campo | 16–17/1 | 600 | — | Input de origem, destino, carga, cadastro |
| Botão principal | 17/1 | 700 | — | Ver inventário de botões · com ícone: 18px, traço 1.6, gap 10 |
| Botão secundário / chip de escolha | 15/1 | 600–700 | — | Chip escolhido em 700, não-escolhido em 600 |
| **Campo de busca (cromo)** | **14/1** | **500** | — | Placeholder curto: "Buscar frete", "Buscar cliente" — abaixo do nome na lista |
| Corpo de apoio | 13–15/1.2–1.5 | 400–500 | — | Rota, subtítulo, texto de estado vazio |
| **Chip de filtro (cromo)** | **13/1** | **600–700** | — | Situação · Cliente · Período · Ordenar — abaixo do nome na lista |
| **Total contextual (cromo)** | **12/1** | **500** | tinta `#6E7770` | "12 fretes · R$ 38.420" — informação de apoio |
| Rótulo de seção (eyebrow) | 11/1, `ls .16em` | 700 | maiúsculas | "PRECISA DE VOCÊ", rótulo de linha recolhida, cabeçalho de grupo de data, rótulo de pastilha/detalhe |
| Etiqueta de situação | 10.5/1, `ls .1em` | 700 | maiúsculas | "A FATURAR", "FATURADO", "PARCIAL", "QUITADO", "VENCIDO", "BOLETO" — todas iguais |
| Placa (mono) | 11/1 | 500 | `ls .06em` | Só a placa do caminhão, branco sobre `#141A17` |

### Onde cada nível cai, tela por tela

| Tela | Primário | Secundário | Terciário (recuado) |
|---|---|---|---|
| Dashboard | faturamento 60px no cartão escuro | valores das pastilhas (25px), título de pendência | rótulos, notas das pastilhas, rótulos do gráfico |
| Meus fretes | nome do cliente (17/700) + valor (20/800) | rota, etiqueta de situação | **título, busca, chips, total** |
| Detalhe do frete | valor 46px + nome 26px | linhas de cadastro (16/600) | rótulos das linhas, "FRETE · data" |
| Lançar frete | valor 60px no cartão escuro | linha de resumo / linhas recolhidas (16.5/700) | rótulos das linhas, chip da última vez |
| Cobranças | nome do cliente + valor | referência, vencimento, etiqueta | **título, chips, total, frase de resumo** |
| Detalhe da cobrança | valor 46px + nome 26px | linhas, fretes incluídos | rótulos, histórico de envios |
| Clientes | nome do cliente + valor da ordenação | cidade, dado de contexto | **título, busca, chip de ordem, total** |
| Perfil do cliente | nome 26px + os quatro números (17/800) | linhas de cadastro | rótulos, notas, frase de resumo, chip de período |
| Perfil do caminhão | apelido 26px + números do período | placa, tipo, linhas | rótulos, notas, chip de período |
| Formulários | valor digitado (17/600) | — | rótulo do campo, texto explicativo, cabeçalho de seção |
| Mais | nome da empresa (19/800), nome de cada linha (16.5/700) | plano | subtítulos, cabeçalho de grupo |

**Lacuna — Caminhões e Motoristas (lista) não têm linha nesta tabela.**
Achado do `/revisar` na Tarefa 5 do item 4 (22/08/2026): só Clientes tem
Primário/Secundário/Terciário definidos para a lista de cadastro. O dado da
ordenação nessas duas telas (`N fretes`/`R$ X`) hoje sai em tratamento
terciário, por analogia com o que já existia (`tipo`/veículo habitual), sem
nenhuma linha desta tabela confirmar ou contradizer isso. Registrado para o
Design decidir junto da lacuna irmã (ver "O que precisa chegar ao Design" em
`docs/planos/item-4-lista-e-detalhe-do-frete.md`).

**Lacuna — Perfil do motorista não tem linha nesta tabela.** Achado do
`/revisar` na Tarefa 6 do item 4, terceiro commit (22/08/2026): Perfil do
cliente e Perfil do caminhão têm linha própria (120–121), Perfil do
motorista não, embora a tela agora mostre a mesma composição das outras
duas — nome em destaque (26px) + os dois números do resumo do período —,
construída por analogia com elas (`src/app/(app)/motoristas/[id]/page.tsx`).
Registrado para o Design decidir junto das lacunas irmãs.

**Lacuna — os rótulos do resumo do motorista não têm nome formal.** Mesmo
achado: "Fretes no período" e "Valor transportado"
(`ResumoDoPerfil`, `motoristas/[id]/page.tsx`) não estão em
`docs/especificacao.md` nem em `docs/componentes.md` — §4.7 diz só "resumo
e histórico", §7 (linha 1068) diz "fretes/valor transportado" ao falar de
regra de cálculo, não de rótulo de tela. Mesma categoria do rótulo "Km e
R$/km" do perfil do caminhão, registrado como lacuna no commit anterior.

---

## Espaçamento

Escala: **4 · 6 · 7 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 40**

- Margem lateral do conteúdo: **16–20px** (16 nas telas com cartão de topo, 20 nas com título de página)
- Entre seções verticais: **22–26px**
- Entre linhas de lista: **6px**
- Entre chips/pílulas: **7–8px**
- Padding interno de cartão/linha: **13–18px**
- Respiro do rodapé fixo (abaixo do último botão): **40px**

---

## Formas

| Raio | Elemento |
|---|---|
| `28px` | Cartão escuro de faturamento/valor |
| `22px` | Pastilha da dashboard, aviso do sistema, folha inferior (topo) |
| `20px` | Linha de lista, linha recolhida de cobrança |
| `18px` | Campo de texto, linha recolhida (Lançar frete), item de folha |
| `14px` | Tecla do teclado numérico |
| `12px` | Etiqueta "Parcial" |
| `999px` (pílula) | Todo botão/chip/pílula — principal, secundário, pílula em linha, pílula de cabeçalho, chip de filtro/escolha |

**Lacuna — o cartão de resumo dos perfis (Tarefa 6 do item 4, 22/08/2026) não
tem raio nem cor próprios nesta folha.** `ResumoDoPerfil.tsx` reaproveita
`18px` (`rounded-campo`) e o fundo `#F0EDE6` (separação), o mesmo tratamento
já usado no cartão "Condição comercial" da mesma tela — precedente mais
próximo, não um valor novo inventado — mas nenhuma linha aqui confirma ou
contradiz que "cartão de resumo" deva usar esse raio, e a coluna "Uso" da
tabela de Cores acima não lista "cartão de resumo" entre os usos de
`#F0EDE6` (campo, chip não escolhido, linha de lista, cartão de pendência,
teclado numérico). Registrado para o Design decidir, mesma categoria da
lacuna irmã acima (Caminhões/Motoristas, lista).

**Mesma lacuna, terceiro caso: a miniatura do comprovante** (item 5, Tarefa
5, 25/08/2026, achado do quinto `/revisar`). `AnexarComprovante.tsx`
reaproveita `18px` (`rounded-campo`) e `#F0EDE6` (`bg-separacao`) como fundo
atrás da imagem — mesmo precedente do parágrafo acima (reaproveitar, não
inventar), mas nem a tabela de Cores nem a de raio listam "miniatura de
imagem" entre os usos. Junta com a lacuna de altura (`h-180`, seção
"Alturas fixas" abaixo) na
mesma resposta do Design — as duas são a mesma peça.

**Mesma lacuna, quarto caso: a segunda linha do cartão de resumo do cliente**
(Tarefa 7 do item 6, 27/08/2026, achado do segundo `/revisar`). Com "a
receber"/"vencido" passando a existir de verdade, `ResumoDoPerfil.tsx` ganhou
uma segunda fileira — decisão do fundador: a linha de cima responde ao chip
de período, a de baixo é situação atual, sempre, e a separação existe para
essa diferença ficar legível, não por estética. Nem o raio/cor (já em
aberto, parágrafo acima) nem o vão entre as duas linhas (`gap-8`, reaproveita
a escala de espaçamento, não é valor novo) nem um rótulo diferenciando as
duas fileiras têm confirmação do Design — fica registrado até a próxima
resposta.

**Mesma lacuna, quinto caso: o cartão de convite de instalação** (item 18,
Tarefa 2, `CartaoConviteDeInstalacao.tsx`). Primeiro uso real da família
FretiNews — a cor está inteira nesta folha (§ Família FretiNews, abaixo), mas
três coisas do cartão em si nunca foram desenhadas, porque ele nunca existiu
antes:

- **Raio.** Reaproveita `18px` (`rounded-campo`), o precedente mais próximo
  (o mesmo cartão informativo que `LinhaDePendencia`, vizinho dele na própria
  dashboard) — mesmo critério de sempre: reaproveitar, não inventar.
- **Tipografia.** Rótulo "FRETINEWS" (`text-eyebrow`/700, mesma classe do
  eyebrow de seção já usado na dashboard), título (`text-nome-recolhida`/700)
  e texto de apoio (`text-apoio`/500) — o mesmo par que `LinhaDePendencia` já
  usa para título e apoio, com um rótulo a mais em cima. Nenhum papel
  tipográfico próprio para "cartão FretiNews" existe nesta folha nem em
  `docs/componentes.md` 08, que só define as três cores.
- **Espaço reservado ao ×.** `pr-56` no contêiner do cartão, para o texto não
  passar por baixo do botão de dispensar. Não é um valor solto: decompõe em
  `48px` (alvo de toque mínimo, `CLAUDE.md` §8 — não é desta escala) mais
  `8px` (respiro, "entre chips/pílulas" nesta escala). Achado do `/revisar`
  na construção: `56` sozinho não está na escala acima, e forçá-lo lá sem
  justificar a soma seria pior que registrar a conta.

Registrado para o Design decidir, mesma categoria dos casos acima.

**Sombra** — só existe em um lugar: o aviso do sistema.
`box-shadow: 0 14px 34px rgba(20,26,23,.30), 0 3px 10px rgba(20,26,23,.16)`.
Nenhum outro elemento tem sombra.

---

## Barra de navegação — âncora responsiva

A barra fica fixa no rodapé, mas **não por um número fixo de pixels**: ela
ancora na área segura do aparelho, para cair no mesmo lugar em qualquer
tamanho de celular.

**O padrão é `max()`, nunca o fallback do `env()`.** `env(safe-area-inset-*)`
é uma variável *definida* — num navegador comum ela vale `0px`, e o segundo
argumento (`, 6px`) só entraria em cena se o nome fosse desconhecido. Então
`calc(env(safe-area-inset-bottom, 6px) + 20px)` resulta em **20px**, não em
26px. O `max()` garante o piso do valor original, e o inset apenas **acrescenta**
em quem tem indicador de home.

| Medida | Valor |
|---|---|
| Distância do rodapé | `bottom: max(26px, calc(env(safe-area-inset-bottom) + 20px))` |
| Margem lateral | `left/right: max(16px, calc(env(safe-area-inset-left/right) + 16px))` — evita recorte por notch quando o aparelho gira |
| Aviso do sistema | `max(112px, calc(env(safe-area-inset-bottom) + 106px))` — empilha acima da barra pela mesma âncora |
| Rodapé de ações ancorado (Relatório) | `max(132px, calc(env(safe-area-inset-bottom) + 126px))` |
| Folga do fim da rolagem | `max(138px, calc(env(safe-area-inset-bottom) + 132px))` — cresce com a área segura, então o último item da lista nunca fica sob a barra em nenhum aparelho |

A barra em si é fluida: `display:flex` com os cinco itens em `flex:1`, então
ela ocupa a largura disponível e distribui igual de 320px a 430px sem nenhum
valor específico por modelo.

---

## Alturas fixas

| Elemento | Altura |
|---|---|
| Campo de texto | 56–60px (ver conflito de área segura não se aplica aqui — variação é por tela, ambas em uso) |
| Linha recolhida (Lançar frete) | 60px |
| Item de folha (lista de escolha) | mín. 64px |
| Chip de escolha grande | 48px |
| Chip de filtro (cromo) | 40px · largura máx. 148px · uma linha só, com reticências |
| Campo de busca | 48px |
| Cabeçalho de tela (barra de status) | ver **área segura** abaixo |
| Barra de navegação | **57px** de altura, respiro interno de **11px** em cima e embaixo (igual), raio `999`. **Não usa distância fixa do rodapé** — ver âncora abaixo |
| (+) central | **48px**, elevado **17,5px** acima da linha da barra (31% da altura da pílula, mesma proporção de antes) |
| Botão principal | 60px |
| Botão secundário | 52px |
| Botão texto | 44px |
| Pílula em linha | 38px |

**Lacuna aberta — altura de miniatura de imagem não é um valor formal desta
folha.** A miniatura do comprovante anexado (`AnexarComprovante.tsx`, item
5 Tarefa 5) usa `h-180` (180px) — decisão provisória do fundador,
25/08/2026, achado do `/revisar`: nenhuma linha desta tabela cobre imagem.
Valor que só existe no código é o que o §8 do `CLAUDE.md` proíbe ("nenhum
valor fora do sistema"); fica registrado aqui até o Design formalizar,
junto com as outras duas pendências da mesma peça (recortar ou mostrar a
foto inteira; abrir em tamanho cheio ao tocar — `docs/planos/
item-5-ordem-de-servico.md`, "O que precisa chegar ao Design").

**Mesma lacuna, quinto e sexto caso: as barras do gráfico de 6 meses e a
linha de "Precisa de você" (item 8, Tarefa 2, 30/08/2026, achado do
`/revisar`).** `BarrasDoGrafico` (dashboard) usa `112px` de altura máxima
(o valor que o protótipo desenha, `referencia/.../TelaFretiGate.dc.html`,
"Barras | altura máx. 112px") e raio `8 8 3 3` — nenhuma linha desta tabela
cobre barra de gráfico. `LinhaDePendencia` usa `min-h-70` (também do
protótipo: "Pendência | linha mín. 70px") — nenhuma linha cobre cartão de
pendência. As duas reaproveitam o valor do protótipo por ser o precedente
mais próximo, mesmo padrão já usado nos casos acima; fica registrado até o
Design formalizar.

**Mesma lacuna, sétimo caso: a escala da prévia do cabeçalho do relatório em
Conta da empresa (item 10, Tarefa 2, 31/08/2026).** `page.tsx` usa `zoom:
ESCALA_PREVIA` (`0.4`), não `transform: scale()` — corrigido no segundo
passe do `/revisar`: a primeira versão escalava por `transform` dentro de
uma caixa de altura FIXA chutada (`150px`) com `overflow:hidden`, que
cortaria conteúdo real (razão social comprida, contato com duas linhas),
contra `CLAUDE.md` §8. `zoom` encolhe a própria caixa de layout, não só a
pintura — sem altura chutada, sem corte. Nenhuma linha desta tabela cobre
miniatura de documento fora da tela "Documento A4" (que já tem a própria
escala, `0.466`, documentada em § Impresso, e ali a técnica de
`transform`+altura fixa é certa, porque a página A4 inteira TEM altura
fixa). `0.4` calculado contra o menor viewport que o projeto testa
(`375px`), não contra os `480px` do `max-w` — achado no navegador: a
primeira tentativa (`0.55`) cabia nos 480px mas estourava a largura em
375px, criando rolagem horizontal na página. Nem a escala nem a técnica
`zoom` estão citadas em documento nenhum do Design; fica registrado até o
Design formalizar uma prévia própria para esta tela. A cor de fundo branca
da caixa (`#FFFFFF`, exclusiva do impresso na tabela de Cores) e o
`text-[16px]` do círculo de 56px de `UploadLogo.tsx` somam à mesma lacuna.
**Mesmo valor, três usos a mais, achado do `/revisar` na Tarefa 4:**
`conta/usuarios/page.tsx` (badge da empresa, 56px), `conta/usuarios/[id]/
page.tsx` (badge da pessoa, 56px) e `TelaAceitarConvite.tsx` (badge da
empresa na tela pública, 56px) reaproveitam o mesmo `text-[16px]` — a
lacuna nomeava só `UploadLogo.tsx`, e virou afirmação incompleta assim que
um segundo, terceiro e quarto lugar passaram a usar o mesmo valor sem
confirmação — ver `docs/planos/item-10-configuracoes-conta-e-usuarios.md`, "Tarefa 2 —
achados do `/revisar`".

**De volta à Tarefa 2 do item 8 (dashboard, não a do item 10 acima) — a
mesma tarefa também deixou três tamanhos de fonte e um uso de cor sem
confirmação, achado do segundo `/revisar` daquela tarefa.** A linha de comparação do
cartão escuro ("12% · 8 fretes · média R$…") usa `14px/700` (a única fonte
é o protótipo, mesma célula "Comparação"); o círculo de iniciais da
dashboard (30px) usa `12px/700`; o rótulo do mês sob cada barra usa `11px/600`.
Nenhum dos três está na tabela de Tipografia — a mais próxima é a
eyebrow (11/700 maiúsculo), que não é o mesmo caso. E a barra do mês
corrente reaproveita `#1B6B3A` (`--color-acao`), cor já existente e
descrita na tabela de Cores só como "ação — botão principal, o (+) da
barra, o círculo de iniciais e a tinta de 'Quitado'", sem "barra de
gráfico" na lista de usos — diferente das outras duas cores do mesmo
gráfico (`#D6D1C5` e `#E4E0D6`), que já estão nomeadas para esse uso.
Nenhum valor novo foi inventado nos quatro casos: os tamanhos vêm do
protótipo e a cor já existe no sistema — mas nenhum dos quatro tem
confirmação nesta folha. Fica registrado até o Design responder.

**Nota (07/08/2026):** rótulo, apoio, erro e o tratamento de foco/erro do
Campo de texto estão em `docs/componentes.md`, seção "Rótulo, apoio e erro" —
não aqui. Esta seção só define altura. Uma versão anterior desta nota dizia
que foco e erro não tinham valor documentado nenhum; não era exato — só
tinham conflito aberto em `componentes.md`, e dois dos seis já foram
resolvidos (ver lá, "Conflitos" 2 e 3).

**Folga de rolagem.** Toda tela **com barra de navegação** reserva **138px**
no fim do conteúdo rolável — medidos a partir do topo do (+), que fica a
100,5px do fundo da tela (26 da margem + 57 da pílula + 17,5 de saliência),
com ~37px de respiro. A pílula de navegação flutua sobre o conteúdo durante a
rolagem; a folga garante que o último item chegue a ficar totalmente acima
dela. O aviso do sistema ancora em **112px** — acima do topo do (+), com
espaço para o deslocamento de 18px da animação de entrada.

**Exceção (CLAUDE.md §8, 07/08/2026):** tela sem barra de navegação — Entrar,
Criar conta, Esqueci a senha, Redefinir senha, Termos e privacidade (modo
cadastro), Aceitar convite e Ativar assinatura — não reserva essa folga,
porque não existe barra para não ficar embaixo dela. Usa margem inferior
padrão. Lista fechada; tela nova sem barra entra por decisão explícita, não
por analogia. As duas do meio entraram na tarefa 8, fatia 2 (07/08/2026) —
mesma razão das anteriores, telas de fora de sessão. **Ativar assinatura
entrou em 03/09/2026, item 13 Tarefa 1** — mesmo critério: fora de sessão,
sem conta ainda, sem para onde navegar.

Termos no **modo Ajustes** não está nesta lista — é dentro da sessão e ganha
barra. **Resolvido no item 10, Tarefa 2**: Ajustes existe agora (`/conta`,
dentro de Mais), e o modo "vindo de Ajustes" de `/termos` ganhou
`<BarraDeNavegacao />` de verdade e a folga de rolagem padrão — os dois
modos não dividem mais a margem provisória do modo cadastro.

**Lacuna aberta — "margem inferior padrão" ainda não é um valor formal
desta folha.** A tela Criar conta (`src/app/(auth)/criar-conta/page.tsx`)
usa `max(24px, calc(env(safe-area-inset-bottom) + 16px))` — mesmo formato
`max()` dos outros anchors desta seção, só que sem o respiro extra da barra.
Valor que só existe no código é o que o §8 proíbe (`CLAUDE.md`: "nenhum
valor fora do sistema"); fica registrado aqui até o Design formalizar como
token, com o mesmo nome nas próximas telas sem barra.

**Mesma lacuna, segundo valor:** a exceção de link em frase corrida
(`CLAUDE.md` §8, "Alvo de toque mínimo") pede "espaçamento entre linhas
ampliado" sem dar o número. `FormularioCriarConta.tsx` usa `leading-[1.7]`
no parágrafo de aceite dos Termos — maior que o `1.4` de `--text-apoio`, sem
ser um valor formal ainda. Mesmo destino: token quando o Design decidir.

**Mesma lacuna, terceiro valor: a largura da marca no topo das telas de fora
de sessão.** Cinco telas passaram a abrir com a marca do FretiGate
centralizada — Entrar, Criar conta, Esqueci a senha, Redefinir senha e Termos
no modo cadastro (`src/components/auth/Marca.tsx`, 14/08/2026). **Não é a
lista de telas sem barra da seção acima, que tem sete:** Aceitar convite
não está aqui — e agora é decisão, não lacuna. Decisão do fundador, item 10,
Tarefa 4 (01/09/2026): **Aceitar convite nunca leva `<Marca />`**, em nenhum
estado (válido, convite indisponível, trava). Quem chega já foi convidado
por alguém que conhece — o que precisa reconhecer é a empresa que convidou,
não o produto; pôr a marca do FretiGate no topo dividiria a atenção entre
duas identidades num momento em que só uma importa, e o FretiGate ela
conhece assim que entrar. Exceção com razão escrita, não esquecimento
(`CLAUDE.md` §2) — fecha a lacuna que este parágrafo registrava.

**Ativar assinatura também não está na lista das cinco com marca — mas
aqui é lacuna, não decisão fechada.** O código (`page.tsx`, item 13,
Tarefa 1) segue a mesma razão do convite por analogia, sem confirmação
própria do fundador ainda — diferente de Aceitar convite, que tem a razão
escrita acima. Registrado em `docs/planos/item-13-assinatura.md`, pedido
de confirmação ao Design.

A marca usa **140px de largura**, valor que **não é formal desta folha**: veio
do documento que o Design mandou (`referencia/Design/Marca nas telas de
autenticacao.html`), e o próprio documento se marca como *"Provisório —
aproximação: os três valores abaixo ainda não foram confirmados"*.

**A distância entre a marca e o título também é lacuna, e deixou de ser uma
só.** A primeira versão (14/08/2026) reaproveitava "entre seções verticais:
22–26px" com 24px, sem número próprio. O documento do Design revisado
(16/08/2026) troca isso por dois valores dedicados, nenhum dos dois com
lastro nesta folha:

- **140px** em Entrar, Criar conta, Esqueci a senha e Redefinir senha (com os
  estados que herdam a rota — Recuperação enviada, Link expirado, a trava de
  consulta). Não está na escala de espaçamento acima.
- **16px** só em Termos (modo cadastro) — está na escala como número, mas não
  é o valor de nenhuma categoria nomeada desta seção.

**O documento contradiz o próprio desenho, e o que vale é o desenho.** O
texto do documento afirma que os 140px valem "nas cinco telas — inclusive
Termos". Medido pixel a pixel dentro do mesmo arquivo
(`referencia/Design/Marca nas telas de autenticacao.html`), a tela de Termos
do mockup mostra 16px entre a marca e o título, não 140px. O fundador decidiu
em 16/08/2026 que vale a medida, não o texto — Termos fica com o espaço
menor, diferente das outras quatro — e pediu a correção na fonte ao Design,
para a próxima entrega não repetir a divergência.

O terceiro valor do conjunto tem lastro e **não** é lacuna: o topo continua
nos **66px** da área segura, sem mudança (confirmado pelo fundador em
14/08/2026 — a marca entra dentro da área segura que toda tela já reserva, e
o conteúdo desce a partir dela).

Nenhuma cor nova entrou por causa disso: a marca é **imagem**
(`public/marca/fretigate.png`), não cor escrita em CSS — ver a precisão
acrescentada ao fechamento da seção Cores.

**Falta o Design definir:** largura definitiva, distância até o título,
confirmação do respiro do topo, se o título passa a `28px/800` e se entra um
subtítulo (as duas últimas coisas o mockup desenha e **não** foram
construídas), se sai uma versão vetorial da marca — hoje só existe PNG.

**Lacuna resolvida — corpo de texto em tela de fora de sessão.** Registrada
em 07/08/2026 pelo `/auditar-tela` da tarefa 8, fatia 2 (o "Texto de campo"
16/600 estava sendo reaproveitado por aproximação para parágrafo de
leitura). A exportação do Design de 07/08/2026 trouxe o papel certo —
"Corpo de texto fora de sessão", em `docs/componentes.md`: `15px/500/1.5`,
tinta `#3C443E` (`--text-corpo-fora-sessao` em `src/app/globals.css`),
variante de alerta na tinta `#8A5237`. Aplicado em `PedidoDeRecuperacao.tsx`,
`TelaRedefinirSenha.tsx` e `ConteudoTermos.tsx`.

---

## Área segura

**Resolvido.** Valor único em toda tela: **66px** do topo (área segura do
dispositivo + 8px de respiro, com referência no iPhone com ilha dinâmica).
Aplica-se com ou sem cartão no topo. Não existe mais 52px nem 56px em
nenhuma tela.

---

## Superfícies: as três categorias

O produto tem **três** superfícies, e cada uma diz de quem é a voz:

| Superfície | De quem é a voz | Cor |
|---|---|---|
| **Clara** | dado do usuário — o frete dele, o cliente dele, o dinheiro dele | `#FAF8F4` / `#F0EDE6` |
| **Escura** | mensagem do sistema — confirmação do que ele acabou de fazer | `#141A17` |
| **Lilás** | comunicação da plataforma — o FretiGate falando com ele | família FretiNews |

As três nunca compartilham tratamento. É por isso que o aviso "Frete salvo"
não pode ser claro (viraria mais uma linha da lista) e o recado do FretiNews
não pode ser escuro (viraria confirmação de ação dele).

**Só são escuros:**
- O cartão de faturamento no topo da dashboard (`#141A17`)
- O componente único de aviso do sistema — "Frete salvo", "Cobrou o
  Frigorífico São Luiz?" (`#141A17`, com sombra)
- A barra de navegação (`#141A17`)

Nada mais é escuro. Cartões de dado (linhas de lista, campos, folhas,
pastilhas de resumo) são sempre claros, mesmo quando mostram uma situação de
alerta (Vencido usa `#F6E6DD` claro com tinta `#B3401A`, nunca um fundo
escuro).

---

## Família FretiNews — comunicação da plataforma

Três tons. **Escopo fechado:** usados exclusivamente quando o FretiGate
fala com o usuário — o cartão FretiNews na dashboard, a lista de Novidades,
o detalhe da mensagem, e o cartão de convite de instalação (item 18,
decisão do fundador, 07/09/2026, `docs/planos/
pwa-instalavel-e-convite-de-instalacao.md`: o convite também é a
plataforma falando com o usuário, não dado dele nem confirmação de uma
ação sua — primeiro uso real da superfície, antes mesmo de Novidades
existir). **Nunca** em dado do usuário, **nunca** em ação do produto,
**nunca** em estado de cobrança ou de frete.

| Cor | Uso | Contraste sobre `#EDEBFA` |
|---|---|---|
| `#EDEBFA` | Superfície — fundo do cartão FretiNews e da linha não lida | 1.11:1 sobre o papel `#FAF8F4` — diferença de superfície, nunca portadora de informação sozinha |
| `#2C2555` | Tinta principal — título da mensagem | **11.89:1** ✅ |
| `#5B4FA8` | Tinta de apoio — rótulo "FRETINEWS", texto de apoio, ponto de não lida e o traço do × de dispensar | **5.71:1** ✅ |

Medidos no navegador pela fórmula WCAG, mesmo padrão do texto desabilitado.

A razão de o lilás existir: sem ele, aviso do produto e recado da plataforma
dividiriam a mesma superfície escura, e o usuário não teria como saber se a
mensagem é consequência do que ele fez ou notícia de fora.

**Removidos por não terem uso real:** `#3F3580`, `#CBC5EF` e `#DCD8F5` foram
desenhados junto com a família mas não aparecem em nenhuma tela.

**Removido por reprovar em contraste:** `#8B82C4` fazia o traço do × de
dispensar a 2.93:1 — abaixo do mínimo de **3:1** que a WCAG exige para
componente de interface não textual, e o × é controle, não decoração. O traço
passou a usar `#5B4FA8` (5.71:1), que já existia na família — nenhum tom novo
foi criado. **A família tem três tons.**

**Cores soltas eliminadas:** `#DCEDE2` (pisca-pisca do frete salvo) virou
`#E4E9E5`, e `#F6EEDA` (campo vazio em Importar) virou `#FBF1DF` — as duas
não pertenciam a nenhuma família e agora usam o tom equivalente que já
existia.

---

## Conflitos resolvidos

Quatro elementos que saíam com valores diferentes entre telas — decisão
aplicada em todas elas:

1. **Área segura:** único valor, 66px do topo, em toda tela.
2. **Número-herói:** 60px para o principal da tela (edição ou não —
   Lançar frete e dashboard); 46px para leitura em detalhe (frete e
   cobrança). O tamanho de 56px deixou de existir. Mantida a regra de
   encolhimento por faixa de dígitos para valores muito altos (ver
   Componentes — botões e avisos / Cobranças `5i`).
3. **Rótulo de seção:** único valor, 11px/700/`.16em`. Mantida a exceção
   de 9px/`.09em` nos três números do topo de Cobranças (só ali, para caber
   três rótulos numa grade de 1/3 de tela).
4. **Etiqueta de situação:** único valor, 10.5px/700/`.1em`, incluindo
   "Parcial" — que mantém o fundo próprio (`#FBF1DF`), só igualou a
   tipografia.

---

---

## Ícones exportados

Arquivos em `icons/*.svg` — desenhados à mão, um traçado só (sem
biblioteca externa). Cada arquivo: viewBox quadrado `0 0 24 24`, sem
`width`/`height` fixos, `stroke="currentColor"` no grupo (herda a cor do
texto do botão), `fill="none"`, cantos e junções arredondados. A espessura de
traço listada abaixo já é a do desenho original — o grupo interno tem
`transform="translate(...) scale(...)"` para caber no quadrado sem distorcer
a proporção nem a espessura visual.

| Arquivo | Usado em | Tamanho no app | Espessura final |
|---|---|---|---|
| `seta-linha.svg` | Seta de linha recolhida (Lançar frete), seta de pendência (dashboard), seta de "Conta" no cabeçalho do cartão | 7–8×12–14px | 2px |
| `seta-chip.svg` | Seta de chip de filtro (Meus fretes, Cobranças) | 11×7px | 1.8px |
| `voltar.svg` | Topo de folha, detalhe do frete, detalhe da cobrança, modelo de mensagem | 12×20px | 2.2px |
| `busca.svg` | Campo de busca (Meus fretes, folha de busca em Lançar frete) | 15–17px | 1.9px |
| `whatsapp.svg` | Pílula em linha "Cobrar no WhatsApp" | 14px | 1.6px |
| `confirmar.svg` | Painel verde ao deslizar uma linha ("Marcar recebido") | 19×15px | 2.4px |
| `tendencia.svg` | Seta de comparação com o mês anterior, no cartão da dashboard | 13×13px | 2px |
| `barra-inicio.svg` | Item "Início" da barra de navegação | 19×19px | **1.8px** (unificado) |
| `barra-fretes.svg` | Item "Fretes" da barra de navegação | 21×19px | **1.8px** (unificado — era 1.7) |
| `barra-novo.svg` | Item central "+" da barra de navegação | 26×26px | 2.8px — maior, isolado no círculo, sem mudança |
| `barra-cobrancas.svg` | Item "Cobranças" da barra de navegação | 20×19px | **1.8px** (unificado — era 1.7) |
| `barra-mais.svg` | Item "Mais" da barra de navegação | 20×19px | **1.8px** (unificado) |

---

## Impresso — só o documento A4

**Estas medidas valem exclusivamente para o relatório impresso**
(`DocumentoA4`). Não são exceções à folha de estilo: são um contexto
diferente. O A4 é papel, sai da impressora comum do cliente e precisa ser
legível em preto e branco. Nada abaixo se aplica a tela; nada da escala de
tela se aplica ao impresso.

### Página
| Medida | Valor |
|---|---|
| Formato | A4 retrato — `794 × 1123px` a 96 dpi (210 × 297 mm) |
| Margens | `64px` topo/rodapé (≈17 mm) · `56px` laterais (≈15 mm) |
| Área útil | `682px` (≈180 mm) |
| Fundo | **`#FFFFFF` puro** — exclusivo do impresso; o app usa `#FAF8F4` |
| Exibição no app | A4 em `scale(0.466)` → `370 × 523px`, página inteira visível |

### Espaçamento (referência em milímetro, não na escala de 4)
`22px` entre blocos do cabeçalho · `26px` antes da tabela · `13px` de padding
vertical por linha de frete · `20–22px` acima do total e do bloco de cobrança.

### Tipografia do impresso
| Nível | Valor |
|---|---|
| Razão social | `21px/700`, `wdth 96%` (≈16 pt) |
| Dados da empresa | `12px/400` (≈9 pt) |
| Título do documento | `13px/700`, `ls .16em`, maiúsculas |
| Número do documento (Nº) | Azeret Mono `13px/500` — mesma regra da placa: número identificador, lido caractere por caractere e citado por telefone ("o relatório 12"), vai em mono. Decisão do fundador, achado do `/revisar` na Tarefa 2 do item 7, 28/08/2026 |
| Nome do cliente | `22px/700`, `wdth 96%` |
| Rótulo de coluna e de bloco | `11px/700`, `ls .14–.16em`, maiúsculas — **exceção: "TOTAL DO PERÍODO" usa o peso de "Título do documento" (`13px/700`), não este valor.** Introduz o número-herói da página (o total), função diferente de um rótulo de coluna ou de "VENCIMENTO"/"PAGAMENTO VIA PIX" — o documento impresso tem hierarquia própria, é o único lugar do produto lido em papel. Decisão do fundador, mesma tarefa acima |
| Corpo da tabela | `14–15px/500` (≈11 pt) |
| Total | `34px/800`, `wdth 94%`, tabular |
| Vencimento | `22px/700` |
| Chave Pix | Azeret Mono `15px/600` dentro de fio de `1.5px` |
| Nota de pé | `11px/400` · marca FretiGate `10px/500`, `ls .14em`, `#A8AFA9` |

### Colunas da tabela
| Coluna | Largura | Tratamento |
|---|---|---|
| Data | `86px` | Azeret Mono `14px/500` |
| Rota | flexível (≈306px) | `15px/500` |
| Carga | `170px` | `14px/400` em `#3C443E` |
| Valor | `120px` | alinhado à direita, `15px/600`, tabular |

### Fios de separação
O app não tem borda nenhuma — separa por fundo. **No impresso é o contrário**,
porque fundo colorido não sobrevive à impressão em preto e branco:

| Fio | Valor | Onde |
|---|---|---|
| Forte | `1.5px solid #141A17` | Abaixo do cabeçalho, topo e base da tabela, acima do bloco de cobrança |
| De linha | `1px solid rgba(20,26,23,.16)` | Entre fretes |
| Moldura | `1.5px solid #141A17`, sem preenchimento | Chave Pix e o círculo de iniciais |

Nenhum bloco de cor, nenhuma sombra, nenhum raio de canto no impresso.

**Correção nos arquivos.** A versão anterior envolvia os traçados num
`<g transform="translate(...) scale(...)">`, então a espessura real
renderizada era `scale × stroke-width` — diferente do valor escrito no
próprio atributo. Reexportado: o transform foi incorporado nas coordenadas
de cada traçado (path/circle recalculados ponto a ponto), sem nenhum
`transform` no arquivo final, e `stroke-width` já é o valor visual correto
— o que está escrito é exatamente o que renderiza.

Os quatro ícones da barra de navegação (Início · Fretes · Cobranças · Mais)
saíam em 1.8 / 1.7 / 1.7 / 1.8 lado a lado no mesmo tamanho — agora todos em
**1.8px**. O "+" central manteve 2.8px por ser maior e isolado no círculo.

**Não existe mais ícone de microfone** — o botão "Ditar" foi removido do
Lançar frete a pedido, sem substituto. Se voltar, desenhar como 13º arquivo
seguindo a mesma convenção.

Cor do traço: sempre herdada do texto do botão via `currentColor` — nunca uma
cor de ícone independente. Alinhamento sempre `align-items:center` com o
rótulo; gap `7px` (ícone ≤14px ao lado de texto) ou `10px` (ícone >17px).
