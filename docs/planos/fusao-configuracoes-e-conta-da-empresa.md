# Plano: fundir Configurações dentro de Conta da empresa

Decisão do fundador, 12/09/2026 (Opção A, das opções trazidas depois de ele
notar que "Configurações" e "Conta da empresa" se pareciam demais e nenhum
critério explicava a divisão). **Aprovado e construído em 12/09/2026** —
este arquivo registra a construção, não pede aprovação para ela começar.

**Correção, achado do segundo `/revisar`:** a primeira versão deste plano
tratava "o layout da tela fundida" (dois blocos, cabeçalhos de seção, se o
botão único muda de nome) como decisão a esperar do Design **antes** de
construir — e a construção seguiu de qualquer jeito, com esses mesmos itens
já resolvidos em código, e `docs/componentes.md`/`docs/navegacao.md`
reescritos para descrever esse resultado como fato, contradizendo este
próprio plano e o §13 (desenho é do Design, chega por diff, nunca editado
direto). Corrigido: os dois documentos voltaram a registrar só **estado**
(a rota `/configuracoes` não existe mais, os campos vieram para dentro de
Conta, Usuários mudou de onde se chega) — o **conteúdo visual específico**
(agrupamento em blocos, cabeçalho "Identidade", se "Salvar dados" continua
sendo o nome certo) fica como pedido ao Design, não como fato registrado,
até ele responder. A tela já está no ar assim porque a construção não podia
esperar uma resposta que ainda não veio — mas os documentos não afirmam mais
que essa resposta já chegou.

## A pergunta do fundador: dois blocos, dois botões — dá pra salvar só um?

**Sim, do jeito que a primeira versão deste plano estava desenhada — e por
isso ela mudou.** A primeira versão previa dois formulários independentes
(IDENTIDADE com "Salvar dados", OPERAÇÃO com "Salvar configurações"), cada um
com o próprio botão. Nesse desenho, alguém mexe num campo de cada bloco, toca
só um dos dois botões, e sai da tela achando que salvou tudo — porque a tela
inteira tem uma cara só, sem nada avisando que existem duas ações separadas
por baixo.

O precedente que eu tinha citado (`UploadLogo` + `FormularioContaDaEmpresa`
convivendo na mesma tela hoje) **não é o mesmo caso**: trocar a logo salva
sozinho, no instante em que a foto é escolhida — é upload, não "digitar e
depois lembrar de tocar em salvar". Não existe, hoje, um precedente de dois
formulários de texto com dois botões de salvar na mesma tela — eu tinha
citado o exemplo errado.

**A correção não é avisar — é tirar o segundo botão.** Os dois formulários já
escrevem no mesmo registro (`Empresa`, mesma linha, mesmo `empresaId`) —
não existe motivo de domínio para serem duas ações separadas, só o motivo de
terem nascido em duas telas diferentes. A fusão vira **um formulário só, com
os dois blocos visuais (IDENTIDADE e OPERAÇÃO, cada um com seu cabeçalho de
seção, mantendo a leitura clara) e um botão só, no fim de tudo.** Não tem como
salvar metade — ou salva a tela inteira, ou não toca em nada.

## O que muda

**A rota `/configuracoes` deixa de existir.** Os três campos que vivem lá hoje
— Pátio (`patioEndereco`), Prazo padrão de vencimento (`prazoPadraoDias`) e
Numeração do relatório (`proximoNumeroRelatorio`) — passam a viver dentro de
`/conta`, num segundo bloco visual, abaixo do bloco de identidade que já
existe lá, dentro do mesmo `<form>`.

**Uma ação de servidor só, gravando os dois grupos de campo numa transação.**
`atualizarContaDaEmpresa` e `atualizarConfiguracoes`
(`src/lib/servicos/empresas.ts`) continuam existindo como funções
separadas — cada uma valida o que já valida hoje (CNPJ, faixa do prazo, o
"não pode ser menor" da numeração) — mas a ação de servidor da tela chama as
duas dentro de `emTransacao(empresaId)`: se qualquer uma falhar, a outra não
fica gravada sozinha. É a mesma pergunta do fundador aplicada ao banco, não só
à tela — "salvou só um pedaço" não pode acontecer nem na gravação.

**Os rótulos dos dois campos de endereço já se distinguem** — achado ao
investigar: `FormularioContaDaEmpresa` já usa "Endereço" e
`FormularioConfiguracoes` já usa "Endereço do pátio" (com a legenda "Pré-
preenche a origem ao lançar frete..." embaixo). A confusão que motivou a
fusão era estar em duas telas diferentes com nome de tela parecido, não os
rótulos dos campos em si — juntos na mesma tela, a distinção já fica visível
sem precisar de texto novo.

**Usuários sai de dentro de Conta e vira item próprio na seção AJUSTES de
Mais.** A rota continua sendo `/conta/usuarios` (nada muda no código daquela
tela) — só muda de onde se chega até ela: hoje só de dentro de "Conta da
empresa"; depois, direto da tela Mais, ao lado de "Conta da empresa" (sem
"Configurações" — ela deixou de ser linha própria).

**Minha assinatura não entra nesta fusão.** É tarefa separada — a tela já
está desenhada (`docs/planos/item-13-tarefa-3-telas-de-assinatura.md`, item
13 Tarefa 3, nunca construída) e continua "sem link, à espera" dentro de
Conta até essa tarefa acontecer. Juntar as duas coisas nesta tarefa
misturaria uma correção de organização com uma funcionalidade nova que
ninguém pediu ainda.

## O que sai de Mais

Seção AJUSTES (dono) passa de duas linhas para duas linhas, mas outra
combinação:

| Antes | Depois |
|---|---|
| Configurações | ~~removida~~ |
| Conta da empresa | Conta da empresa |
| *(Usuários vivia dentro de Conta)* | Usuários |

## Passo a passo de construção (executado em 12/09/2026)

1. Unificar `FormularioContaDaEmpresa.tsx` e `FormularioConfiguracoes.tsx` num
   componente só (nome a definir — ex.: `FormularioContaDaEmpresa.tsx`
   ganhando o segundo bloco), com um único `useActionState` e um único botão
   "Salvar dados" no fim.
2. Unificar `conta/acoes.ts` e `configuracoes/acoes.ts` numa ação só: valida
   os dois grupos de campo (dois `schema.safeParse`, ou um schema combinado),
   chama `atualizarContaDaEmpresa` e `atualizarConfiguracoes` dentro de
   `emTransacao(empresaId)`, agrega os erros dos dois num `EstadoConta` só
   (`erros.razaoSocial`, `erros.patioEndereco`, etc., convivendo no mesmo
   objeto). Redirect único: `/conta?salvo=1`.
3. `conta/page.tsx` passa a buscar `empresa.patio_endereco` além dos campos
   que já busca, e passa tudo para o formulário unificado.
4. Apagar a pasta `src/app/(app)/configuracoes/` inteira (`page.tsx`,
   `FormularioConfiguracoes.tsx`, `acoes.ts`).
5. `mais/page.tsx`: remover a linha "Configurações", acrescentar a linha
   "Usuários" na seção AJUSTES (reaproveita o ícone provisório que já existe
   em `conta/page.tsx` para essa linha — nenhum ícone novo).
6. `conta/page.tsx`: remover o `ItemMenu` de "Usuários" (subiu para Mais).
7. Atualizar `docs/componentes.md` e `docs/navegacao.md` — só o que é
   **estado**: "Configurações" não existe mais como tela própria, os campos
   vieram para dentro de Conta, "Usuários" mudou de onde se chega. **O
   conteúdo visual (blocos, cabeçalho "Identidade", nome do botão) não entra
   nesses dois documentos como fato** — fica só no pedido ao Design abaixo,
   até ele responder. Corrigido nesta versão do plano: a primeira execução
   tinha escrito o conteúdo visual direto nos dois documentos, contradizendo
   este próprio passo.

## O que vai ao Design — pedido feito em 12/09/2026, resposta pendente

A tela já está construída (não podia esperar a resposta para existir), mas
os três itens abaixo continuam em aberto — nada aqui é fato até o Design
confirmar, mesmo já estando no código:

1. **O layout da tela fundida** — um formulário só, dois blocos visuais
   (o que era "Conta da empresa" e o que era "Configurações"), cada um com
   cabeçalho de seção — "Operação" já existia, "Identidade" é texto novo,
   provisório, escolhido só para a tela não ficar sem cabeçalho nenhum no
   bloco de cima. **Um botão só, no fim de tudo** — mecanismo aprovado pelo
   fundador (ver acima), mas o espaçamento entre os blocos e se "Salvar
   dados" ainda é o nome certo (agora que salva mais do que identidade)
   seguem em aberto.
2. **A posição da linha "Usuários" em Mais** — ícone (reaproveita o mesmo já
   usado em Conta hoje, ainda provisório desde 01/09/2026) e onde ela entra
   na seção AJUSTES, antes ou depois de "Conta da empresa".
3. **Confirmação de que os dois campos de endereço, lado a lado na mesma
   tela, continuam claros com os rótulos atuais** ("Endereço" / "Endereço do
   pátio") — não é pedido de rótulo novo, é conferência de que o que já
   existe funciona quando as duas telas viram uma.

Nenhum valor novo de cor ou componente foi usado — a fusão reaproveita
padrões que já existem no produto (formulário com seções internas, `ItemMenu`
em Mais). O único texto realmente novo é o cabeçalho "Identidade" (item 1
acima), e possivelmente o nome do botão único.

## Achado do `/revisar`, corrigido junto — conexão dupla dentro da transação

`atualizarConfiguracoes` chama `resolverMunicipio` para resolver o pátio, e
`resolverMunicipio` abria sua própria conexão (`db(empresaId)`, uma
`$transaction` própria) mesmo quando chamada de dentro da transação
interativa que `atualizarContaEConfiguracoes` já tinha aberto — a primeira
vez no produto que isso acontece (`servicos.ts`/`relatorios.ts`/`titulos.ts`
só usam o `tx` de fora, nunca abrem uma segunda conexão). Sob concorrência,
cada "Salvar dados" passaria a segurar duas conexões do pool ao mesmo tempo,
a mesma classe "pool esgotado" já catalogada em `CLAUDE.md` §2. Corrigido
antes do commit: `resolverMunicipio` (`src/lib/servicos/municipios.ts`) ganhou
um quarto parâmetro opcional, o cliente a usar — `db(empresaId)` por padrão,
o `tx` da transação quando chamada de dentro de uma. `atualizarConfiguracoes`
passa o `cliente` que recebeu, então tudo roda numa conexão só, de ponta a
ponta.
