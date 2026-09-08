# PWA — instalável, com convite de instalação

Pendência antiga que nunca virou item da ordem de construção. Três decisões
do fundador, tomadas em 07/09/2026 e registradas abaixo, junto do custo que
sustenta cada uma — nenhuma delas era escolha de quem escreve o código.

## Contexto

**Não encontrei, por busca direta, o texto que registra esta pendência em
`docs/especificacao.md`.** Procurado por "PWA", "instalável", "manifest",
"offline", "service worker", "adicionar à tela" — em todos os `docs/*.md`,
`CLAUDE.md` e no histórico inteiro do git (`git log -S`, todas as datas).
Nada bate. Não é bloqueio para este plano — a premissa ("produto é web, com
opção de instalar") já está implícita no que **já está decidido**: o
`CLAUDE.md` §5 fixa a stack como Next.js + Vercel, só web, sem app de loja
em lugar nenhum do §12 ("O que NÃO construir"). Mas registrando a busca
vazia, porque **"registrado na especificação" e "decidido numa conversa
anterior, nunca escrito"** são duas afirmações diferentes (`CLAUDE.md` §2,
"decisão que só vive na conversa não sobrevive à conversa") — se o texto
existir em algum lugar que esta busca não alcançou, é só apontar.

**O que "instalável" exige de verdade, confirmado agora (não da memória —
pesquisado):**

- **Manifesto web** (`manifest.webmanifest`) — nome, ícones, cor de tema,
  `display: "standalone"`. O Next.js App Router tem convenção própria:
  um arquivo `src/app/manifest.ts` que devolve o objeto, e o próprio
  framework gera o arquivo e liga a tag `<link>` no `<head>` — não precisa
  de rota manual.
- **Ícones em vários tamanhos e propósitos** — não é um ícone só,
  redimensionado:
  - `192×192` e `512×512`, propósito `"any"` — os dois obrigatórios do
    manifesto.
  - `512×512` **dedicado**, propósito `"maskable"` — arquivo **separado**
    do `"any"`, não o mesmo reaproveitado: o Android recorta o ícone
    instalado em círculo, esquadro arredondado ou outras formas
    (`adaptive icon`), e só o conteúdo dentro dos **80% centrais** (um
    círculo de ~409px dentro do quadro de 512px) sobrevive ao recorte —
    o resto pode ser cortado dependendo do aparelho. Um ícone "any" usado
    como "maskable" sem essa margem corre o risco da marca ficar cortada
    em metade dos Androids do mercado.
  - `180×180` — `apple-touch-icon`, o ícone do iOS. iOS não tem conceito de
    "maskable"; usa cantos arredondados fixos, aplicados pelo próprio
    sistema por cima do quadrado enviado.
  - Favicon comum (`.ico` ou PNG pequeno) para a aba do navegador — hoje o
    produto não tem nenhum (`public/` só tem `marca/fretigate.png`, a
    logomarca com texto, servida no login e nas telas de fora de sessão).
- **Comportamento ao abrir em janela própria** — `display: "standalone"`
  no manifesto tira a barra de endereço no Android; no iOS, quem faz esse
  papel é a meta tag `apple-mobile-web-app-capable` (o Next.js gera isso
  pelo campo `appleWebApp` do objeto `metadata`, já usado em
  `src/app/layout.tsx`) — sem ela, o app abre dentro do Safari normal, com
  barra de endereço, mesmo depois de instalado pela Tela de Início.
- **HTTPS** — já cumprido, o produto está em produção na Vercel.

**O que a marca em `referencia/marca/` tem, e o que falta.** Os quatro
arquivos ali (`LOGOMARCA ... sem fundo.png`) são a **logomarca completa**
— texto + símbolo, `1920×394px`, formato retangular alongado. Não serve
pra ícone quadrado: um ícone de app precisa do **símbolo sozinho**
("FG" dentro de uma forma), não a palavra "FretiGate" ao lado. A única
fonte que mostra o símbolo isolado está dentro de uma folha de exploração
do Design (`referencia/Design/Manual de Marca/ChatGPT Image ... (2).png`)
— um quadro comparativo com o símbolo em três fundos (preto, branco,
verde) e um selo circular verde no rodapé, tudo dentro da mesma imagem
composta, não como arquivos isolados. **Isso é lacuna de fonte, registrada
abaixo em "O que precisa chegar ao Design"** — não bloqueia decidir o
resto deste plano, mas bloqueia gerar os arquivos finais de ícone.

## Decisão 1 — Offline: instalável sem funcionar sem internet, ou funcionar de verdade

**Caminho A — Instalável, exige conexão para usar (mas abre mesmo sem sinal, e avisa).**

> **Corrigido na construção (07/09/2026) — ver "Pendência — cache do app
> shell e tela de sem conexão", mais abaixo.** Este quadro descreve a
> decisão como ficou no dia em que foi tomada. Na prática, "abre mesmo sem
> sinal" e "service worker pequeno" (linhas abaixo) esbarraram em duas
> coisas que só apareceram ao construir: cachear a tela de verdade exigiria
> guardar dado de sessão no navegador, e a tela alternativa (um aviso
> estático) seria, ela mesma, uma tela nova — o que a própria lista de "sem
> mudança na arquitetura" logo abaixo já dizia que Caminho A não teria.
> **A Tarefa 1 construída não tem service worker nenhum**; o texto abaixo
> fica como registro da decisão original, não como descrição do que existe.

- O que entra: o manifesto, os ícones, as meta tags — e nada mais na forma
  como o produto guarda dado. Toda leitura e escrita continua exatamente
  como hoje: Server Action falando direto com o Postgres, a cada toque.
- Um `service worker` **não é mais exigido** pelo Chrome só para mostrar o
  convite de instalação (mudou nas versões 108/112, pesquisado agora — antes
  exigia um SW com `fetch()` registrado) — mas continua sendo a prática
  recomendada, porque é ele quem guarda em cache os arquivos do "app shell"
  (o HTML/CSS/JS de abrir a tela), então a tela **abre** mesmo sem sinal —
  só as ações que precisam do servidor (entrar, ver frete, salvar) falham,
  com a mensagem de erro que já existe hoje para qualquer falha de rede.
  iOS nunca exigiu nenhum service worker para instalar.
- **Sem mudança na arquitetura do produto.** Nenhum dado novo em
  IndexedDB, nenhuma fila de sincronização, nenhuma tela nova.
- Custo de construção: **baixo**. Poucos arquivos novos
  (`manifest.ts`, os ícones, um service worker pequeno — pode ser só
  "coloca a casca da tela em cache", sem lógica de sincronismo nenhuma),
  sem tocar em nenhuma tela ou fluxo existente.

**Caminho B — Funciona offline de verdade (lança frete no pátio, sem sinal, sincroniza depois).**

- Exige uma camada de dado **local no aparelho** (IndexedDB, ou uma
  biblioteca própria em cima dele) que guarda o que a pessoa digitou
  enquanto não há rede, mais uma fila de "isto ainda não chegou ao
  servidor", mais o que fazer quando a rede volta — e mais o que fazer
  quando dois lançamentos colidem (dois motoristas com o mesmo aparelho
  compartilhado, dois usuários da mesma empresa editando o mesmo frete
  fora de ordem).
- **Isto não é acréscimo — é trocar a arquitetura do produto inteiro** de
  "sempre fala com o servidor" para "local primeiro, sincroniza depois".
  Toda regra que hoje só existe no servidor no momento de salvar —
  `resolverMunicipio`, a validação de schema, o isolamento por
  `empresa_id` via RLS, a sugestão de valor — precisaria de uma versão que
  funciona sem servidor, ou o produto aceita que "salvo" e "sincronizado"
  viram dois estados diferentes, com aviso próprio para cada um ("frete
  guardado no aparelho, ainda não enviado").
- Ordem de grandeza maior de esforço — não é uma tarefa, não é um item;
  toca em praticamente tudo o que já foi construído, e teria que virar uma
  sequência própria de itens na ordem de construção, não algo dentro do
  item do PWA.
- Risco permanente: o produto passa a existir em dois modos (online e
  offline) para sempre, e cada funcionalidade nova daqui pra frente
  precisa ser pensada nos dois.

**Decisão do fundador, 07/09/2026: Caminho A.** Nas palavras dele: "o
caminho B troca a arquitetura do produto inteiro, e toda regra que hoje
vive no servidor precisaria de uma versão sem servidor. Isso não é um
item, é um projeto." E o caso real que motivou o produto não pede
offline: "o Pedro lançava fretes depois, no escritório, porque o sistema
era chato — não porque estava sem sinal. O problema que o produto resolve
é atrito, não cobertura." **Gatilho de saída registrado, para não decidir
de novo por suposição:** se aparecer gente tentando lançar frete numa área
sem cobertura nenhuma de verdade (não só sinal fraco), o Caminho B volta à
mesa — com dado do uso real, não com esta conversa.

## Decisão 2 — O convite para instalar

**iPhone e Android convidam de jeitos diferentes, confirmado agora:**

- **Android/Chrome** dispara um evento de navegador
  (`beforeinstallprompt`) quando o app já cumpre os critérios de
  instalação. Dá pra **capturar esse evento e guardar**, impedindo o
  aviso genérico do próprio Chrome (`preventDefault()`), e mostrar um
  botão próprio que, ao ser tocado, dispara o mesmo prompt guardado
  (`prompt()`) — o usuário vê o diálogo nativo do Android, só que
  disparado pelo nosso botão, no nosso momento.
- **iPhone/Safari nunca dispara esse evento — não existe, em nenhuma
  versão do iOS.** O único caminho de instalar é manual: a pessoa toca no
  ícone de Compartilhar do Safari e escolhe "Adicionar à Tela de Início".
  Não tem como abrir esse menu por código; o máximo que dá pra fazer é
  **mostrar a instrução** (o ícone de Compartilhar, os dois toques) para
  quem estiver no Safari e ainda não tiver instalado.
- **Os dois se detectam sem adivinhar:** se o app já está rodando
  instalado, `window.matchMedia('(display-mode: standalone)').matches`
  é `true` nos dois sistemas, e `window.navigator.standalone === true` é
  a checagem própria do iOS (não existe em Android, mas não atrapalha
  perguntar). O convite nunca aparece para quem já instalou.

**Decisão do fundador, 07/09/2026: usa a família FretiNews, e o escopo já
foi estendido — não é mais pergunta.** A família (lilás, "comunicação da
plataforma com o usuário", **dispensável com um `×`, nunca janela modal**,
já definida em `docs/estilo.md`/`docs/componentes.md`) tinha, antes desta
decisão, escopo documentado **fechado**: "cartão FretiNews na dashboard,
lista de Novidades e detalhe da mensagem". Nas palavras do fundador: "o
argumento está certo: o convite é a plataforma falando com o usuário, que
é exatamente o que a superfície lilás significa. Não é dado dele nem
confirmação de ação. E ser o primeiro uso real dela é bom — nasce no caso
mais simples." **`docs/componentes.md` 08 e `docs/estilo.md` § Família
FretiNews já foram atualizados** com a extensão do escopo, no mesmo commit
deste plano — vai para o Design como aviso de extensão de escopo, não como
pergunta.

**Onde e quando aparece, sem interromper nada:**

- Só na **dashboard** — o mesmo lugar reservado ao cartão FretiNews em
  `docs/componentes.md`. Nunca flutuante por cima de outra tela, nunca no
  meio de lançar um frete, nunca como diálogo.
- Só quando: (a) o app **não está instalado** (checagem acima) e (b) a
  pessoa **não dispensou antes** — guardado em `localStorage` do
  aparelho. **Decisão do fundador: `localStorage`, confirmado** — "é
  preferência de interface, não regra de negócio." Consequência
  explícita, aceita e desejada por ele: a dispensa **não atravessa
  aparelhos** — quem dispensar no celular volta a ver o convite no
  computador, porque são contextos de instalação diferentes.
- No Android, o cartão tem um botão que dispara o prompt nativo guardado.
- No iPhone, o cartão mostra a instrução (ícone de Compartilhar → "Adicionar
  à Tela de Início") — sem botão que finge instalar, porque não existe
  esse gatilho no iOS.
- Um `×` discreto dispensa para sempre (naquele aparelho), mesmo padrão do
  FretiNews.

## O que muda

**Tarefa 1 — Manifesto, ícones e meta tags.** `src/app/manifest.ts`
(convenção do Next.js), os arquivos de ícone em `public/` (192, 512,
512-maskable, 180 apple-touch-icon, favicon), e o campo `appleWebApp` em
`metadata` (`src/app/layout.tsx`) para o comportamento de janela própria
no iOS. Sem tocar em nenhuma tela existente. **Se o símbolo isolado do
Design não tiver chegado quando esta tarefa for construída**, os ícones
nascem do recorte da folha de exploração (ver "O que precisa chegar ao
Design") — provisório, registrado em comentário no código e neste plano,
trocado sem aviso quando o arquivo definitivo chegar.

**Corrigido na construção (07/09/2026), achado do `/revisar`: esta tarefa
NÃO inclui o service worker.** A frase original acima previa "um service
worker mínimo, só para cache do app shell". Na construção, isso virou duas
coisas ao mesmo tempo — nenhuma delas cabia numa tarefa de "custo baixo" —
e as duas foram cortadas por decisão do fundador. Ver "Pendência — cache do
app shell e tela de sem conexão" abaixo.

**Tarefa 2 — O cartão de convite.** Componente novo
(`CartaoConviteDeInstalacao`, ou nome equivalente), usando os tokens já
definidos da família FretiNews. Detecta instalado/não instalado e
Android/iOS, guarda a dispensa, mostra o botão (Android) ou a instrução
(iOS). Entra na dashboard, no lugar já reservado ao FretiNews em
`docs/componentes.md`.

*(Se a Decisão 1 for o Caminho B — offline de verdade —, este plano para
aqui: a arquitetura de dado local vira investigação própria, não uma
Tarefa 3 deste documento.)*

## Pendência — cache do app shell e tela de sem conexão

**Cortada da Tarefa 1 na construção (07/09/2026), decisão do fundador,
achado do `/revisar`.** A frase original da Tarefa 1 ("um service worker
mínimo, só para cache do app shell... a tela abre mesmo sem sinal") juntava
duas coisas que não cabem em "custo baixo":

1. **Cachear a tela de verdade esbarra em dado de sessão.** Toda tela do
   produto é renderizada no servidor a partir da sessão (`empresa_id`) —
   guardar essa resposta em cache no navegador arriscaria mostrar, num
   aparelho compartilhado, tela de uma empresa depois que outra pessoa loga
   com outra conta. Mesma classe de risco que o isolamento entre empresas
   (`CLAUDE.md` §3) existe para evitar, só que na camada do navegador em vez
   do banco — não é caso de "corrige e segue", é decisão de arquitetura.
2. **A alternativa construída na sessão — uma tela estática "Sem conexão"
   fora do pipeline do Next.js** — não tem essa exposição (é pública, sem
   dado nenhum), mas é uma tela nova, com cor, tipografia e botão próprios,
   e nenhum dos três foi decidido: nem por Design, nem pelo fundador. Fora
   do inventário de `docs/componentes.md`, fora da lista fechada de telas
   sem barra de navegação do `CLAUDE.md` §8, com fonte que nem carregaria
   de verdade offline (Archivo vem do Google Fonts).

**Se um dia isso valer a pena — plano próprio**, com Design definindo a tela
de sem conexão (cor, texto, botão, dentro do inventário) e uma decisão
explícita sobre até onde cachear sem tocar em dado de sessão (por exemplo:
só a tela de `/entrar`, pública, como pouso mínimo — não a tela real que a
pessoa queria abrir). Até lá, o produto não tem service worker: nem
manifesto nem os dois sistemas exigem um para a instalação funcionar (ver
"O que 'instalável' exige de verdade", acima) — só ficou faltando "abrir
mesmo sem sinal", que nunca foi MVP (`docs/especificacao.md` §9, item 18).

## O que precisa chegar ao Design

**Pedido, não pergunta: o símbolo isolado, em arquivo próprio, antes de
gerar os ícones finais.** Hoje o único lugar onde o símbolo "FG" aparece
sozinho (sem o texto "FretiGate" ao lado) é dentro da folha de exploração
composta (`referencia/Design/Manual de Marca/ChatGPT Image 5 de ago. de
2026, 05_08_48 (2).png`) — um quadro com o símbolo em três fundos (preto,
branco, verde) e um selo circular no rodapé, tudo junto na mesma imagem,
com a margem clara do papel de exploração ao redor. Para o ícone
`maskable` (80% de margem central) o candidato mais próximo já pronto é o
**selo circular verde com o "FG" branco**, no rodapé daquela folha — é o
único dos quatro tratamentos já desenhado com margem generosa ao redor do
símbolo.

**Decisão do fundador, 07/09/2026, sobre o que fazer enquanto o Design não
responde:** "ícone de app é a cara do produto na tela inicial — vale o
arquivo certo. Se ele demorar, constrói com o recorte e registra como
provisório." Ou seja: não é bloqueio de construção — se o símbolo isolado
não chegar a tempo da Tarefa 1, o recorte da folha de exploração vira o
ícone provisório, publicado, com o registro explícito de que é provisório
(neste plano e no código, comentário na Tarefa 1) até o Design entregar o
arquivo definitivo.

**Aviso, já aplicado — não é mais pergunta para o Design responder:** a
extensão do escopo fechado da família FretiNews (`docs/componentes.md` 08,
`docs/estilo.md` § Família FretiNews) para incluir o convite de
instalação, decidida na Decisão 2 acima. Os dois documentos já foram
atualizados no mesmo commit deste plano.

**Aconteceu: o símbolo isolado não chegou a tempo da Tarefa 1 (07/09/2026).**
Os quatro arquivos em `public/icones/` e `public/favicon.ico` nasceram do
recorte do selo circular verde descrito acima — provisório, registrado em
comentário em `src/app/manifest.ts`. Troca sem aviso quando o Design
entregar o arquivo definitivo.

## Onde entra na ordem de construção — confirmado

**Item 18 — "PWA: instalável, com convite de instalação"**, marcado
**MVP** (diferente de 12/14/15/16/17, que são "depois do lançamento"),
construído **depois de fechar o item 13** (assinatura — falta só a Tarefa
2) e **antes de ligar qualquer anúncio pago**. Já incluído em
`docs/especificacao.md` §9. Confirmado pelo fundador, 07/09/2026, com a
razão proposta: metade do público-alvo (motorista e dono de transportadora
usando o celular no pátio) ganha o atalho de instalação desde o primeiro
dia de tráfego pago, em vez de descobrir depois — diferente de descobrir
só depois de o anúncio já estar rodando.

## Teste novo

Sem suíte automatizada nova — mesmo precedente já registrado em
`CLAUDE.md` §14 ("Entradas de navegação não têm cobertura automatizada") e
nas últimas tarefas de tela. Verificação manual: instalar de verdade num
Android e num iPhone (não só emular no navegador — os critérios reais de
instalabilidade e o comportamento do `beforeinstallprompt` só se
confirmam no aparelho), conferir o ícone nos dois, conferir que o convite
some depois de dispensado e não volta, e que instalar de verdade também
faz o convite sumir.
