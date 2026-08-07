# Diário de execução

Onde o trabalho parou e qual é o próximo passo. Atualizado ao fim de cada
sessão. Não é histórico — para isso existe o `git log`. É só o suficiente para
retomar sem reconstruir contexto.

---

## 07/08/2026 — tarefa 6: os testes de isolamento permanentes

`npm test` — **25 verificações, 2 arquivos**, rodando contra o banco de verdade
com os papéis de verdade. Vitest 4.1.

### Os dois testes

**`tests/isolamento/schema.test.ts` — a prova mecânica.** Percorre o **catálogo
do Postgres**, não o schema do Prisma: o schema diz o que queríamos, o catálogo
diz o que existe, e é no catálogo que a política vai ou não recusar. Para cada
tabela exige RLS ativado, **forçado** e pelo menos uma política. E exige que
toda tabela tenha `empresa_id` **ou** esteja numa lista de exceções conferida
por **igualdade exata** — nos dois sentidos, então tanto tabela nova sem
`empresa_id` quanto exceção que deixou de existir derrubam o teste.

É o §3 virado máquina: quem acrescentar tabela sem isolamento não passa daqui.

**`tests/isolamento/vazamento.test.ts` — a empresa A tentando alcançar a B.**
Roda pelo `lib/db`, com o papel `fretigate_app`. Cobre listar, buscar por id,
buscar **por e-mail com `findUnique`** — o caminho que mais escapa de revisão,
porque quem escreve acha que chave única dispensa filtro —, alterar, e gravar na
empresa alheia.

Os quatro requisitos do §3 estão lá: o contraste (o mesmo dado visto por
`postgres`, que ignora RLS), concorrência real compartilhando pool, os três
jeitos de não ter contexto, e a contagem de cobertura.

### A suíte foi testada contra si mesma

Suíte que nunca ficou vermelha não provou nada. Desliguei o RLS de `usuario` de
propósito e rodei de novo. **Três falhas, todas as certas:**

| Falhou | Camada que pegou |
|---|---|
| `usuario` tem RLS ativado e forçado | estrutural — o catálogo |
| o usuário da empresa B é invisível | comportamental — `findUnique` enxergou |
| gravar usuário na empresa B é recusado | comportamental — `WITH CHECK` aceitou |

As duas camadas pegaram **de forma independente**. RLS restaurado e conferido
(`rls=true forcado=true`), suíte de volta em 25/25.

### Um defeito do teste, achado pela mutação

A primeira versão usava 20 pedidos simultâneos no teste de concorrência. Com o
RLS quebrado, ele falhou com `Unable to start a transaction in the given time` —
**esgotamento do pool**, não vazamento. O pool do driver tem dez conexões; pedir
vinte transações ao mesmo tempo estoura a espera antes de qualquer consulta
rodar.

Passava por sorte de agendamento. Baixado para dez, com o motivo escrito no
código. É a mesma família dos outros erros de teste do dia: o teste medindo o
próprio estrago em vez do produto.

### Decisões

**Vitest**, com `fileParallelism: false`. Os testes semeiam empresas no mesmo
banco, e dois arquivos em paralelo disputariam linhas — o resultado dependeria
de agendamento, que é a pior espécie de teste intermitente: o que some quando
você vai olhar.

**`/tests` fora de `/src`**, registrado no `CLAUDE.md` §6. Não é código que vai
ao ar.

**Identificador próprio por execução**, derivado do relógio, para duas rodadas
simultâneas não colidirem.

### Ponto a revisitar

**Não existe banco de teste separado.** A suíte semeia e apaga no banco de
desenvolvimento. Funciona porque cada execução usa identificadores próprios e
limpa no fim, mas é frágil por natureza: teste que grava no mesmo lugar onde se
desenvolve um dia atrapalha. Quando o custo justificar, um projeto Supabase só
para teste resolve.

### Próximo passo — tarefa 7

Better Auth e `lib/auth`: sessão, exigir sessão, exigir dono, e rate limit. Com
o bloqueio já registrado — **não fecha sem um e-mail de recuperação real
chegando à caixa de entrada**.

---

## 06/08/2026 — tarefa 5: `lib/db`, o filtro que não dá para esquecer

Os dois bloqueios do inventário estão **fechados** (abaixo), e a tarefa 5 está
pronta e provada.

### Os dois bloqueios, fechados

**Bloqueio 1 — tela Entrar.** O Design corrigiu na fonte. A tabela agora diz
campos **E-MAIL** e **SENHA**, principal **Entrar**, secundária **Criar conta**,
texto **Esqueci a senha** — e registra por escrito que *"o app nunca envia
mensagem sozinho, então não existe código por WhatsApp aqui"*. `Esqueci a senha`
virou link por e-mail. Bate com o schema da tarefa 3. **A tarefa 8 está
destravada.**

**Bloqueio 2 — os três valores.** Unificados, com o `estilo.md` prevalecendo:
respiro interno `11px` em cima e embaixo, elevação do (+) `17,5px`, e `100,5px`
do topo do (+) até a base. O `componentes.md` registra que estava arredondando.
Os dois documentos agora dizem a mesma coisa, conferido linha a linha.

### O que a tarefa 5 entrega

`src/lib/db/index.ts` — **`db(empresaId)`**. Toda operação vira
`$transaction([set_config, consulta])` sozinha. Quem escreve
`banco.empresa.findMany()` não passa filtro nenhum e mesmo assim só recebe a
própria empresa. É a frase do §3 — "tem que ser impossível esquecer" — em
código.

Também: **`emTransacao()`** para várias consultas atômicas entre si, e recusa de
`empresa_id` malformado antes de chegar ao banco, só para o erro aparecer
legível em vez de virar erro de conversão de tipo três camadas abaixo.

`src/lib/db/sem-filtro-de-empresa.ts` — a saída de emergência do Better Auth.
Nome longo e feio de propósito: tem que saltar aos olhos numa revisão. **Não é
um cliente com poderes de administrador** — conecta pelo `fretigate_auth`, que
não ignora RLS e não enxerga `empresa`.

### Provado — 14 de 14 verificações

Com as conexões reais dos dois papéis, não com `postgres`. O filtro saindo
sozinho em `findMany`, `findUnique`, `count` e `updateMany`; o contraste (o
mesmo código com a outra empresa devolve a outra empresa, e só ela); escrita na
empresa alheia recusada pelo banco; `emTransacao` filtrando as duas consultas;
`empresa_id` malformado recusado, inclusive um com tentativa de injeção; e a
saída de emergência achando usuário pelo e-mail sem contexto **e falhando ao
ler `empresa`**.

### O defeito que virou regra no `CLAUDE.md` §3

A primeira execução deste teste imprimiu **"VEREDITO: o lib/db filtra sozinho"
sem ter verificado nada**. Uma exceção estourou na primeira linha e foi engolida
por um `finally` com `process.exit`, que suprime o erro. O contador de falhas
ficou em zero e a última linha dizia que estava tudo certo.

Se eu olhasse só a última linha, teria fechado a tarefa 5 como aprovada com o
banco inalcançável. Foi o terceiro teste do dia a falhar por defeito próprio, e
o único que falhou **para o lado perigoso**.

Virou regra: **§3, item 4 — todo teste conta quantas verificações executou e
reprova se forem menos que o esperado.** Aplicada já neste teste, e ela pegou um
erro na primeira tentativa: eu tinha declarado 16 esperadas e existem 14. Errou
para o lado seguro, que é o certo.

### As duas pendências, decididas

**A tela `Criar conta` ganha o campo SEU NOME**, obrigatório, antes de SEU
TELEFONE. Primeiro nome basta. Nem preencher com o nome da transportadora, nem
tornar a coluna nula: é esse campo que distingue os dois usuários no registro de
"cobrado por" e na tela de Usuários. Registrado em `docs/especificacao.md` §6.

**Chegou corrigido por exportação**, com `SEU NOME` entre SENHA e SEU TELEFONE.

### Vocabulário: "empresa" dentro do produto, "transportadora" fora

Rótulo do cadastro passa a ser **NOME DA EMPRESA**. O princípio está no topo de
`docs/especificacao.md` e resumido no `CLAUDE.md` §8.

O motivo não é estética: o `tipo_operacao` já prevê guincho e reboque desde o
modelo de dados. **Rótulo é a amarra mais barata de criar e a mais cara de
tirar** — quando o primeiro guincheiro entrar, "Nome da transportadora" na tela
de cadastro diz a ele que o produto não é para ele, e nenhuma tabela precisava
mudar para isso acontecer. A entidade se chama `Empresa` no banco desde sempre;
a interface passa a dizer a mesma coisa.

**O schema não muda.** `nome_fantasia` já é neutro.

**Pendente, e vai junto com a correção da tarefa 10:** `docs/navegacao.md` linha
50 ainda diz "Nome da transportadora". Não editei porque as linhas 49-51 desse
arquivo **já estão** na fila da tarefa 10 — descrevem login por código no
WhatsApp e recuperação por CNPJ, os dois derrubados. Corrigir só o rótulo agora
seria mexer duas vezes na mesma linha.

**Provedor de e-mail: RESOLVIDO no mesmo dia.** Resend, domínio
`fretigate.com` comprado, subdomínio `envio.fretigate.com` verificado,
remetente `contato@envio.fretigate.com`. `RESEND_API_KEY` e `EMAIL_REMETENTE`
no `.env`. Entrou no `CLAUDE.md` §5 (stack) e o Resend virou subprocessador
declarado no §11, que agora tem a tabela completa: Supabase, Vercel, Resend e o
fornecedor de IA ainda a decidir.

### 🔴 A tarefa 7 NÃO fecha sem envio conferido de verdade

Domínio verificado no painel do provedor prova que o DNS está certo — **não**
prova que a mensagem chega. Conteúdo, remetente e reputação também decidem, e
nada disso aparece no painel.

Então a tarefa 7 só é dada por pronta depois de **um e-mail de recuperação de
senha real chegar à caixa de entrada**, disparado pelo fluxo do produto e não
por um teste de API. Se cair em spam, a tarefa não está pronta, mesmo com todo
o código funcionando.

O motivo é o mesmo que está no §14: **recuperação que cai em spam é cliente
perdido em silêncio.** Ele não abre chamado, não reclama — some, e a métrica
some junto.

**Resolvido: `Reply-To` separado do remetente.** A mensagem sai de
`contato@envio.fretigate.com` e responde para `contato@fretigate.com`, no
domínio raiz, redirecionado pelo registrador para a caixa de quem lê. No Resend
não muda nada — o remetente continua sendo o do subdomínio verificado.

O endereço de resposta fica em **`EMAIL_RESPOSTA`**, variável de ambiente, nunca
literal no código: ele vai mudar quando houver caixa própria, e trocar endereço
de contato não pode exigir alterar código e publicar de novo.

**O plano B não foi preciso.** O redirecionamento está configurado na
**Cloudflare Email Routing**, com catch-all: `contato@fretigate.com` cai na
caixa do fundador. `EMAIL_RESPOSTA=contato@fretigate.com` já está no `.env`.

Com isso o risco que estava registrado aqui **fechou**: o endereço de contato é
do domínio do produto, não pessoal, e trocar para quem lê é mudar uma regra de
redirecionamento — não mexer em código nem em variável.

**A Cloudflare entrou na tabela de subprocessadores do `CLAUDE.md` §11.** Ela
passa a ver o conteúdo das respostas que chegam, e quem responde pedindo ajuda
costuma colar dado do próprio negócio na mensagem. Pela regra do próprio §11,
subprocessador novo entra na tabela **e** na política, no mesmo commit.

**O Google entrou junto na tabela.** A caixa que recebe o redirecionamento é
Gmail, e ela **armazena** o conteúdo, não só o vê passar. Se a Cloudflare entra
por ver de passagem, quem guarda entra com mais razão. **Essa dependência sai
quando existir caixa própria no domínio** — e é uma das razões para migrar.

**Catch-all fica como está, e a troca é ponto a revisitar.** O domínio é novo e
não está em lista de spam nenhuma; o problema de endereço curinga aparece
quando ele virar conhecido, e aí trocar por regras nominais (`contato@`,
`suporte@`) leva dois minutos. Por ora o ganho é maior: quem escrever para um
endereço que supôs existir não fica sem resposta.

**E o `MX` de recebimento fica no domínio raiz enquanto o `SPF`/`DKIM` de envio
fica no `envio.` — as duas coisas não se atrapalham.** Foi por isso que o envio
nasceu em subdomínio separado.

### Próximo passo — tarefa 6

Testes de isolamento permanentes: o que lê o próprio schema e o de vazamento
entre duas empresas. Agora com os quatro requisitos do §3 por escrito, incluindo
a contagem de verificações.

---

## 06/08/2026 — `docs/componentes.md` completo, e o que ele destravou

O Design preencheu a especificação de ícones, completou a tabela "Onde cada tela
usa o quê" com as 15 telas que faltavam, e a barra de navegação entrou como item
10 do inventário, com a folga de rolagem unificada num valor único.

### Destravou

**A tarefa 8 não está mais bloqueada** — era o bloqueio conhecido desde o começo
do item 1: `Entrar`, `Criar conta` e `Termos` não estavam na tabela, e o
`CLAUDE.md` §8 proíbe botão fora do inventário. Agora estão.

Duas correções que estavam na fila da **tarefa 10** já vieram resolvidas: as
duas seções numeradas 07 (agora 07 aviso do sistema, 08 FretiNews) e a tabela
final sem título próprio.

> **Decidido em 06/08/2026, e os dois viraram bloqueio formal.** O `estilo.md` e
> o `componentes.md` são **mantidos pelo Design e exportados**. Editar qualquer
> um dos dois à mão aqui é trabalho perdido: a próxima exportação reverte — foi
> exatamente o que aconteceu hoje, quando o `componentes.md` voltou sozinho a
> uma versão antiga. **As duas correções abaixo são pedidas na fonte do Design,
> não aplicadas neste repositório.**

### ✅ BLOQUEIO 1 (FECHADO) — a tela Entrar reintroduz uma decisão já derrubada

A tabela nova diz, para a tela `Entrar`:

> principal **Receber código no WhatsApp**, com estado carregando

Isso é login por código no WhatsApp, que **exige envio automático de mensagem
por API de WhatsApp** — item explicitamente proibido no `CLAUDE.md` §12. É a
mesma coisa que já tinha sido derrubada nesta sessão, quando `docs/navegacao.md`
linhas 49-51 descreviam telefone e código: a decisão registrada foi **login por
e-mail e senha**, e o schema da tarefa 3 foi construído em cima dela — `usuario`
tem `email` único, e o Better Auth guarda o hash em `account` com o provedor
`credential`.

**Decidido: o login continua e-mail e senha.** A API oficial de WhatsApp é
proibida pelo §12, e o schema da tarefa 3 já está no banco em cima dessa
decisão. **A tabela vai ser corrigida na fonte do Design.**

**Bloqueia a tarefa 8** até a correção chegar por exportação. As tarefas 5, 6, 7
e 9 não desenham tela e seguem sem depender disto.

### ✅ BLOQUEIO 2 (FECHADO) — três valores divergindo do `docs/estilo.md`

O `CLAUDE.md` §8 diz que valor sai de `docs/estilo.md`. O `componentes.md` novo
diz que as medidas dele foram tiradas do DOM, não estimadas. Nos três pontos
abaixo os dois documentos discordam:

| | `docs/estilo.md` | `docs/componentes.md` |
|---|---|---|
| Respiro interno da barra | `11px` em cima e embaixo (igual) | `12px` no topo, `11px` na base |
| Elevação do (+) | `17,5px` | `18px` |
| Topo do (+) até a base | `100,5px` | `101px` |

Os dois últimos são a mesma divergência se propagando (`26 + 57 + 17,5 = 100,5`
contra `26 + 57 + 18 = 101`).

O que **não** diverge, conferido: a folga de rolagem
(`max(138px, calc(env(safe-area-inset-bottom) + 132px))`), o aviso do sistema
(`max(112px, …)`), a área segura de 66px e a espessura de traço unificada em
1.8px. Os três valores antigos de folga (`132`, `142`, `150`) eram por tela
dentro do `componentes.md`; o `estilo.md` já tinha só o unificado.

Há também uma incoerência interna a resolver: o `componentes.md` chama o respiro
de "igualados de propósito" e em seguida dá dois números diferentes.

**Decidido: não editar o `estilo.md` aqui.** A correção é pedida na fonte do
Design, pelo mesmo motivo do bloqueio 1. O `componentes.md` foi medido no DOM,
então o provável é que o `estilo.md` tenha envelhecido — mas quem confirma isso
é o Design.

**Bloqueia qualquer tela que use a barra de navegação**, ou seja, praticamente
todas: enquanto os dois documentos discordarem, não há valor único de onde
tirar, e o §8 proíbe inventar. Não bloqueia as tarefas 5, 6, 7 e 9.

### O que mudou no que já estava escrito

- **`CLAUDE.md` §8** — a folga de rolagem passou a dizer que o valor é **único
  para todas as telas**, com o motivo (foi assim que nasceram os três valores
  que precisaram ser unificados). E ficou registrado que o salvar **sobe acima
  do teclado numérico** em vez de só "não ser coberto".
- **`/auditar-tela`** — atualizado para o inventário de dez itens numerados,
  para a tabela de telas agora completa (tela fora dela é lacuna, não licença),
  e para a seção nova "Auditoria da regra de posição", que traz requisitos
  extras por tela, como a ação principal do detalhe da cobrança ter que ficar
  visível sem rolar.

---

## 06/08/2026 — tarefa 4 (parte 2): papel da autenticação, e um buraco fechado

Migrations `20260806222818_papel_da_autenticacao` e
`20260806223138_fecha_acesso_pela_api_publica`.

### 🔴 O buraco encontrado no caminho

O Supabase concede, por **privilégio padrão**, todos os privilégios em toda
tabela nova de `public` aos papéis `anon`, `authenticated` e `service_role`.
`anon` é o papel da API REST pública, usada com a chave que **por desenho fica
no navegador**.

Tabela criada por migration do Prisma **não ganha RLS sozinha**. Resultado:
`session`, `account` e `verification` — token de sessão e hash de senha —
estavam alcançáveis por quem tivesse a chave pública do projeto.

Isso não foi procurado: apareceu ao listar quem tinha privilégio em cada tabela,
durante outra verificação. Vale como lição — **conferir o estado real do banco
encontra coisa que ler o próprio código nunca encontraria**.

Fechado em duas camadas, de propósito:

1. `REVOKE` nas tabelas que já existem, e `USAGE` no schema também.
2. `ALTER DEFAULT PRIVILEGES` para as que **ainda não existem** — sem isso, a
   próxima migration recriaria o buraco em silêncio, e o produto inteiro ainda
   está por ser escrito.
3. RLS `ENABLE` + `FORCE` também em `session`, `account` e `verification`, com
   política nomeada só para `fretigate_auth`.

`service_role` continua com privilégio. É o papel da chave secreta, que nunca
vai ao navegador, e tem `BYPASSRLS` de qualquer forma — quem tem essa chave já
tem o banco. Não é o mesmo risco.

### Os três papéis

| Papel | Enxerga | Não enxerga |
|---|---|---|
| `fretigate_app` | `empresa` e `usuario`, **só do contexto**, sem `DELETE` | `session`, `account`, `verification` |
| `fretigate_auth` | tabelas do Better Auth e `usuario` (qualquer empresa) | **nenhuma** tabela de domínio |
| `postgres` | tudo | — por isso **só migrations** |

`fretigate_auth` tem política **nomeada** em `usuario` em vez de `BYPASSRLS`,
porque no login não existe contexto de empresa: só se sabe de que empresa a
pessoa é depois de achá-la pelo e-mail. A diferença prática é auditoria — a
permissão aparece em `pg_policies` em vez de ser um atributo invisível que
desliga o motor para tudo.

### Provado

Papel por papel, em transação desfeita, tabela terminando com zero linhas: o
`app` não lê hash de senha nem sessão; o `auth` acha usuário pelo e-mail sem
contexto mas **não lê `empresa`** e não apaga usuário; e a política do `auth`
**não afrouxou nada** para o `app`, que continua enxergando um usuário e não
dois. O padrão de criar empresa foi provado nos três casos: sem contexto
recusa, com o contexto do id que vai nascer passa, com o contexto de outra
empresa recusa.

**O teste falhou duas vezes antes, e nas duas a culpa era dele.** Da segunda,
por não saber que no Postgres um comando que falha aborta a transação inteira —
todas as negações seguintes voltavam `25P02` em vez do código real, e o teste
reprovava coisa certa. Corrigido com ponto salvo por tentativa. Fica anotado
para a tarefa 6: **teste de negação precisa isolar cada tentativa**, senão mede
o próprio estrago.

### O que subiu para o `CLAUDE.md` §9

A armadilha de criar empresa com `WITH CHECK`, com o atalho errado escrito por
extenso, e a tabela dos três papéis. Não fica só aqui: quem construir a tarefa 8
lê o §9, não o diário.

---

## 06/08/2026 — tarefa 4: RLS, papel da aplicação e políticas

Migrations `20260806214555_rls_papel_da_aplicacao` e
`20260806214755_permite_assumir_o_papel_da_aplicacao`.

### 🔴 FALTA UM PASSO MANUAL, e sem ele nada disso vale

**A aplicação ainda conecta como `postgres`, e `postgres` tem
`rolbypassrls = true`.** Papel com esse atributo **ignora** política de RLS —
nem `ENABLE` nem `FORCE` mudam isso. Foi medido antes de escrever qualquer
política, e é a razão de existir um papel dedicado.

O papel `fretigate_app` já existe, com `NOBYPASSRLS`, e as políticas já
funcionam com ele (provado abaixo). Falta só ele ganhar senha e a aplicação
passar a usá-lo. **Isso não está no repositório de propósito: senha não entra
em migration versionada (§4).**

Dois passos, do fundador:

1. No editor de SQL do Supabase, com uma senha escolhida por ele:

   ```sql
   ALTER ROLE fretigate_app WITH LOGIN PASSWORD 'a-senha-escolhida';
   ```

2. No `.env`, trocar **só o usuário e a senha** de `DATABASE_URL` — host, porta
   e banco continuam iguais:

   ```
   postgresql://fretigate_app.ysldmzvszjxdgcbtaurh:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```

   `DIRECT_URL` **continua como `postgres`**: migration precisa criar tabela, e
   o papel da aplicação não pode ter esse poder.

Enquanto isso não acontecer, o banco está protegido no papel e desprotegido na
prática.

### O que a migration fez

**Papel `fretigate_app`** — `NOBYPASSRLS`, `NOLOGIN`, não é dono das tabelas.

**Privilégios deliberadamente estreitos:**

- `SELECT, INSERT, UPDATE` em `empresa` e `usuario`. **Sem `DELETE`** — o §7 diz
  que nada é apagado, e arquivar é `UPDATE`. Não conceder o privilégio
  transforma a regra em impossibilidade.
- **Nenhum privilégio** em `session`, `account` e `verification`. Elas guardam
  hash de senha e token, não têm `empresa_id`, e nenhuma política de empresa faz
  sentido nelas. Quem fala com elas é o Better Auth, por conexão separada — a
  saída de emergência da tarefa 5, restrita a `lib/auth`. Efeito: o papel da
  aplicação **não consegue ler hash de senha**, mesmo que alguém escreva a
  consulta.

**RLS `ENABLE` + `FORCE`** em `empresa` e `usuario`, com política de falha
fechada usando `nullif(current_setting('app.empresa_id', true), '')::uuid`, com
`USING` **e** `WITH CHECK`.

**`atualizado_em` ganhou valor padrão no banco.** Sem isso, todo `INSERT` em SQL
cru falhava com violação de não-nulo — o das migrations e o dos testes.

### Provado, não suposto

Tudo dentro de uma transação desfeita no fim; a tabela terminou com zero linhas.

| Verificação | Resultado |
|---|---|
| **O contraste** — como `postgres`, que ignora RLS | enxerga as **2** empresas. O vazamento existe sem a proteção |
| Com o papel da aplicação, contexto da empresa A | enxerga **1** empresa e **1** usuário, os próprios |
| Pedir a empresa B pelo id | **zero** linhas |
| Gravar usuário na empresa B (`WITH CHECK`) | recusado, `42501` |
| Alterar a empresa B | **zero** linhas afetadas |
| Contexto nulo | **zero** linhas |
| Contexto string vazia | **zero** linhas |
| Contexto inválido | erro `22P02` — fecha |
| `DELETE` na própria empresa | recusado, `42501` |
| Ler `account` com o papel da aplicação | recusado, `42501` |

O contraste é o item que dá sentido aos outros: sem ele não haveria como saber
se o teste mede alguma coisa (§3).

### Percalço

`postgres` não conseguia assumir `fretigate_app` com `SET ROLE` — sem isso, os
testes rodariam como `postgres` e passariam sempre, medindo nada. Resolvido pela
segunda migration. Migration aplicada não se edita, por isso são duas.

### Próximo passo — tarefa 5

`lib/db`: cliente escopado, extensão que injeta o filtro, `set_config` por
transação e a saída de emergência para `lib/auth`.

---

## 06/08/2026 — tarefa 3: schema de Empresa, Usuario e Better Auth

Migration `20260806212753_base_empresa_usuario_auth` aplicada. Seis tabelas no
banco: `empresa`, `usuario`, `session`, `account`, `verification` e o controle
do próprio Prisma.

### ⚠ As tabelas ainda NÃO têm RLS

`rls=off` em todas, conferido no catálogo do Postgres. **A proteção é a tarefa
4**, e o teste que a prova é a tarefa 6. Enquanto isso, o isolamento do
`CLAUDE.md` §3 não está garantido pelo banco.

É aceitável agora porque não existe dado nem código de aplicação lendo — as duas
tabelas estão com zero linhas, conferido. **Não deve ficar assim por dias, e
nenhum dado real entra antes da tarefa 4.** Se for parar, parar depois da 4, não
entre a 3 e a 4.

### Decisões tomadas nesta fatia

**`Usuario` é a tabela `user` do Better Auth**, com os campos em português. A
configuração da biblioteca (tarefa 7) faz o mapeamento por `user.fields`:
`name`→`nome`, `emailVerified`→`email_verificado`, `image`→`avatar_url`,
`createdAt`→`criado_em`, `updatedAt`→`atualizado_em`. O §7 pede domínio em
português, e usuário é domínio.

**`session`, `account` e `verification` ficam em inglês, campo por campo.** Não
são domínio, e renomear infraestrutura de biblioteca só cria atrito em toda
atualização. Os campos saíram de `@better-auth/core/dist/db/get-tables.mjs`,
lidos do pacote instalado — nenhum escrito de memória.

**Nome de tabela e coluna em minúsculo com underscore.** As políticas da tarefa
4 são SQL escrito à mão, e identificador em maiúsculo obrigaria aspas em toda
linha — que é onde o erro de digitação se esconde.

**`empresa_id` é `uuid`, não texto.** É a coluna que a política vai comparar com
`nullif(current_setting('app.empresa_id', true), '')::uuid` (§9). Conferido no
banco: `usuario.empresa_id -> uuid`.

**`usuario.id` é texto, não uuid.** Quem gera esse identificador é o Better
Auth, com o formato dele. Forçar uuid criaria dependência da configuração da
tarefa 7 para a migration da tarefa 3 funcionar.

**`termos_aceitos_em` e `termos_versao` são obrigatórios.** O aceite acontece no
cadastro, então não existe `Empresa` sem aceite. A regra fica no banco, não só
na tela.

### As duas pendências foram fechadas no mesmo dia

Migration `20260806213650_planos_status_e_cnpj_unico`. Os valores vieram do
fundador e estão em `docs/especificacao.md` §6.

- `plano` — `gratuito` | `pago`
- `periodicidade` — `mensal` | `anual`, nula no gratuito. **Campo novo**, que o
  §6 não previa: é preciso saber quem está no mensal para oferecer o anual e
  para a comissão do afiliado.
- `status_assinatura` — `ativa` | `inadimplente` | `vencida` | `encerrada`
- `cnpj` — único, nulo permitido

**Duas restrições no banco, não só no documento.** `empresa_plano_coerente`
(gratuito sempre ativa e sem periodicidade; pago sempre com periodicidade) e
`empresa_cnpj_key`. Escritas à mão na migration — o Prisma não modela `CHECK`.

**Decisão que o fundador delegou: empresa arquivada NÃO libera o CNPJ.** Índice
parcial por `arquivado_em` reabriria o buraco que a restrição existe para
fechar — bastaria arquivar e cadastrar de novo para zerar o plano gratuito.
Restrição simples também não tem significado que muda com o estado de outra
coluna. Quem volta desarquiva a linha que já existe.

### Conferido que as restrições recusam, não só que existem

Todos os casos, dentro de uma transação desfeita no fim — a tabela continua com
zero linhas. Gratuito com periodicidade, gratuito inadimplente, gratuito
vencida e pago sem periodicidade: recusados. CNPJ repetido: recusado. CNPJ da
empresa arquivada: recusado. Duas empresas sem CNPJ: aceitas.

**A primeira versão desse teste passou pelo motivo errado** — as recusas vinham
de um erro de digitação no próprio teste (`42703`, coluna inexistente), não das
restrições. Foi corrigido para exigir que a recusa venha da restrição
**esperada**, pelo nome. É exatamente o defeito que o `CLAUDE.md` §3 manda
evitar, e apareceu no mesmo dia em que a regra foi escrita.

### Achado para a tarefa 4

**`atualizado_em` não tem valor padrão no banco** — quem preenche é o Prisma, na
aplicação. Todo `INSERT` em SQL cru precisa informar a coluna, ou falha com
violação de não-nulo. Vale para as migrations e para os testes de isolamento.
Candidato a ganhar `@default(now())` junto do `@updatedAt` na tarefa 4.

### Fora desta fatia, de propósito

`Convite` (item 10), `Municipio` (item 2, por isso `municipio_id` fica sem
chave estrangeira), e os campos de `Empresa` que pertencem a itens posteriores
— `patio_*`, `prazo_padrao_dias`, `chave_pix`, `dados_bancarios`,
`modelo_mensagem_*`, `afiliado_id`. Coluna sem tela que a preencha é peso morto.

**A tabela `rateLimit` do Better Auth não entrou.** Ela só existe quando o rate
limit usa armazenamento em banco, que é a decisão da tarefa 7 (§4 exige rate
limit, e contador em memória não funciona em serverless). Entra lá, com RLS no
mesmo commit, conforme o §3.

### Conferência

Feita **direto no catálogo do Postgres**, não no que o Prisma reportou: tabelas,
colunas, tipos, o enum `papel_usuario` e a contagem de linhas.

**O MCP do Supabase não pôde ser usado** — continua em `Needs authentication`. A
autorização por `/mcp` ainda não foi concluída. A conferência foi feita por
consulta de leitura pela mesma conexão da aplicação.

### Próximo passo — tarefa 4

RLS: papel da aplicação sem `BYPASSRLS`, `ENABLE` e `FORCE ROW LEVEL SECURITY`,
e as políticas com `USING` e `WITH CHECK`, em SQL na migration. O requisito de
falha fechada está no `CLAUDE.md` §9.

---

## 06/08/2026 — tarefa 2: risco técnico do isolamento derrubado

**A pergunta que travava o plano foi respondida: sim, funciona.** O
`$transaction([set_config, consulta])` mantém as duas instruções na mesma
conexão do pool de transação do Supabase, e o valor **não** sobrevive ao fim do
pedido. A camada 2 do isolamento (RLS) segue como estava desenhada.

### Como foi provado

Ler depois e ver vazio não provaria nada — a leitura seguinte pode cair em
outra conexão física. A prova identificou a conexão pelo `pg_backend_pid()` e
foi procurar leituras **no mesmo pid**.

| | Resultado |
|---|---|
| As duas instruções na mesma conexão | a consulta leu o que o `set_config` gravou |
| Valor sobrevive ao pedido? | 60 leituras soltas, **todas as 60 na mesma conexão física**, nenhuma enxergou empresa_id |
| Concorrência | 40 pedidos simultâneos em 10 conexões físicas, **zero** leram a empresa de outro |
| Contraste com `local=false` | vazou nas 60 leituras seguintes |

O contraste importa: ele mostra que o terceiro parâmetro `true` é o que faz o
trabalho, não enfeite. Com `false` o valor vira estado de sessão, e sessão no
pool é reaproveitada pelo pedido de outra empresa. O resíduo desse teste foi
limpo e conferido.

### A armadilha que quase virou conclusão errada

Na primeira execução a prova **reprovou**, e a culpa era da prova, não do banco.

No Postgres, uma variável personalizada como `app.empresa_id`, depois de usada
uma vez na sessão, **não deixa de existir: ela volta a valer string vazia**.
A verificação estava escrita como "tem que ser nulo", e string vazia não é
nulo. Conferido com uma variável de nome inédito: antes de tudo lê `NULL`,
dentro da transação lê o valor, depois do commit lê `''`.

**Consequência direta para a tarefa 4:** a política de RLS precisa **falhar
fechada com string vazia**, não só com nulo. Uma política que só teste `IS NULL`
deixa passar o estado "sem empresa" mais comum que existe em produção — o de
uma conexão reaproveitada. Isso não é detalhe de teste, é requisito da política.

> Este requisito **subiu para o `CLAUDE.md` §9**, junto das demais decisões de
> arquitetura, e as exigências da suíte de testes permanente subiram para o §3.
> A fonte da regra é o `CLAUDE.md`, que é lido em toda sessão. O que está aqui é
> só o registro de onde ela veio.

### O que ficou no repositório

Prisma 7.9.1 com `@prisma/adapter-pg`, `prisma/schema.prisma` (só a conexão,
nenhuma tabela ainda) e `prisma.config.ts`.

**O Prisma 7 mudou de forma relevante em relação ao 6:** as URLs de conexão
saíram do schema e foram para `prisma.config.ts`, o cliente passou a exigir um
adaptador de driver, e o `.env` não é mais lido sozinho — daí o
`process.loadEnvFile()` no início do arquivo de configuração.

Os roteiros da prova eram temporários e foram apagados. Viram teste de verdade
na **tarefa 6**, e o desenho a repetir é: identificar a conexão pelo
`pg_backend_pid()`, procurar leituras no mesmo pid, incluir o contraste com
`local=false`, e tratar `''` e `NULL` como o mesmo estado "sem empresa".

### Percalço no caminho, para não repetir

As duas strings de conexão vieram do painel do Supabase com a senha ainda entre
colchetes — `[senha]`. Os colchetes são a marcação de "preencha aqui" e não
fazem parte da senha; com eles, o Postgres recusa com
`password authentication failed`. O usuário do pool também não é `postgres`, e
sim `postgres.<project_ref>` — esse já veio certo.

### Próximo passo — tarefa 3

Schema de `Empresa`, `Usuario` e as tabelas do Better Auth. Nada mais bloqueia.

---

## 06/08/2026 — backup do banco virou pendência aberta

O banco existe a partir de hoje. O `CLAUDE.md` §4 exige **backup do banco
configurado antes do primeiro cliente pagante**, e até agora essa exigência
estava adormecida por falta de banco. Agora está correndo.

**Não está resolvido. Não bloqueia a tarefa 2**, mas bloqueia cobrar o primeiro
cliente.

### O que precisa ser decidido

- **O que o plano atual do Supabase já dá**, de fato — retenção e frequência.
  Conferir no painel, não supor.
- **Se a retenção padrão basta.** O dado aqui é o faturamento da transportadora.
  Perder uma semana de lançamento é perder dinheiro que o cliente não consegue
  reconstruir — ele lança justamente porque não lembra.
- **Se vale point-in-time recovery.** Backup diário só recupera até o último
  retrato; PITR recupera até o minuto. A diferença aparece no dia em que uma
  migration errada apaga dado às 15h e o retrato é das 3h da manhã.

### O que não conta como resolvido

**Backup que nunca foi restaurado não é backup.** A pendência só fecha depois
de uma restauração de teste, feita e conferida uma vez. Configurar e confiar é
o modo mais comum de descobrir que não funciona no pior dia possível.

---

## 06/08/2026 — acesso de leitura ao Supabase pelo MCP

O MCP do Supabase está ligado nesta máquina para que o assistente consiga
**olhar** o banco. É ferramenta de conferência, não caminho de alteração.

### Como está configurado

| | |
|---|---|
| Modo | `read_only=true` |
| Escopo | um projeto só, `project_ref=ysldmzvszjxdgcbtaurh` |
| Alcance | configuração local, presa a esta pasta e a esta máquina |
| Onde | `C:\Users\Jarvis\.claude.json`. **Não é arquivo do repositório** |

Ligar de novo em outra máquina:

```
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?read_only=true&project_ref=ysldmzvszjxdgcbtaurh"
```

Depois, autorizar com `/mcp` — é OAuth no navegador, e só o fundador faz.

### Para que serve

Conferir, e nada além disso:

- se o schema no banco é o que a migration diz que é;
- se o RLS está **ativo e forçado** em cada tabela — forçado importa, porque
  sem isso o dono da tabela ignora a política e o isolamento do `CLAUDE.md` §3
  cai sem ninguém perceber;
- se as políticas existem e são as esperadas;
- na tarefa 2, o comportamento do `set_config` no pool de transação: se o valor
  de `app.empresa_id` realmente **não sobrevive entre pedidos**.

### Para que NÃO serve

**Nenhuma alteração de banco passa pelo MCP.** Migration é sempre pelo Prisma e
sempre commitada.

A razão não é desconfiança da ferramenta, é rastreabilidade. Alteração feita
por MCP não deixa arquivo, não entra em revisão e não é reproduzível: o banco
de produção passa a ter um estado que nenhum arquivo do repositório explica, e
a próxima migration é escrita em cima de uma suposição errada. `read_only=true`
transforma essa regra em impossibilidade, em vez de deixá-la como boa intenção.

O escopo por projeto tem o mesmo espírito: mesmo em leitura, não há motivo para
o assistente enxergar outros projetos da conta.

**Estado agora:** configurado, `Needs authentication`. Só passa a funcionar
depois do `/mcp`.

---

## 06/08/2026 — reorganização das pastas

Fora da ordem de construção. Feito agora justamente porque quase não existe
código: mover três arquivos custa nada, mover trinta custa uma tarde.

**Estado:** concluído. `next build`, `eslint` e `next dev` passando. Árvore
limpa. O próximo passo continua sendo a **tarefa 2**, descrita abaixo.

### O que mudou

| Antes | Depois |
|---|---|
| `app/` | `src/app/` |
| `LOGO/` | `referencia/marca/` |
| `@/` apontava para a raiz | aponta para `src/` |

Junto: `referencia/LEIA-ME.md` novo, dizendo que ali nada roda; `CLAUDE.md` §6
reescrito com a árvore nova e com a lista do que é obrigado a ficar na raiz.

### O que foi conferido, e como

**A pasta fantasma.** O Next.js só lê `src/app` **se não existir `app/` na
raiz** — se as duas existirem ele usa a da raiz e ignora a de `src/` sem dar
erro nenhum. Conferir que a pasta sumiu prova pouco. O que foi feito: uma linha
visível foi acrescentada em `src/app/page.tsx`, o servidor subiu e a linha
apareceu no navegador. Isso prova qual pasta está no ar. A linha foi removida
em seguida.

**As regras de ignorar.** Os caminhos do `.gitignore` que começam com `/` são
presos à raiz, então `/lib/generated/` deixou de valer no instante em que a
pasta virou `src/lib/`. Sem correção, o cliente que o Prisma vai gerar na
tarefa 5 — dezenas de MB — entraria no repositório. Foram criados
`src/lib/generated/teste.txt` e `referencia/marca/_old/teste.png`; o
`git add -A` em ensaio não enxergou nenhum dos dois. Os arquivos de teste foram
apagados.

**Nenhum `.env` no commit.** Conferido na lista de arquivos antes de gravar.

**O Tailwind não precisou de nada.** Ele varre o projeto a partir da raiz, não
a partir de onde o arquivo CSS está — conferido no pacote instalado
(`@tailwindcss/postcss`, opção `base`, padrão = diretório de trabalho). A nota
da documentação do Next sobre ajustar `tailwind.config.js` ao usar `src/` é da
versão 3, que nem tem esse arquivo aqui.

### O que ficou na raiz, e por quê

Ferramenta procura configuração na raiz e em nenhum outro lugar. `next.config.ts`
fora da raiz é ignorado **em silêncio**, que é o pior tipo de quebra. A lista
completa está no `CLAUDE.md` §6. O caso que ainda vai aparecer: **`public/` fica
na raiz, nunca dentro de `src/`** — a documentação do Next é explícita.

---

## 06/08/2026 — item 1 da ordem de construção

**Estado:** tarefa 1 de 10 concluída. Nada pela metade. Árvore limpa.

O plano completo do item 1 está aprovado e descrito em
`C:\Users\Jarvis\.claude\plans\li-o-claude-md-e-sequential-chipmunk.md`.

### Feito

| Commit | O que entrou |
|---|---|
| `6acee37` | Commit inicial: documentação, marca e referência (78 arquivos, 16,6 MB) |
| `b9cca09` | `docs/navegacao.md` e `docs/componentes.md` |
| `9a60ca0` | Decisão da distância entre municípios (§9 e §14 do `CLAUDE.md`) |
| `1afcf49` | **Tarefa 1** — Next 16.3, React 19.2, TypeScript, Tailwind 4 e o sistema visual de `docs/estilo.md` em `app/globals.css` (hoje `src/app/globals.css`) |
| `f316f60` | Correção do inventário de componentes e as duas lacunas marcadas |

### ~~Próximo passo — tarefa 2~~ — CONCLUÍDA

Era conectar o Prisma ao Supabase e derrubar o risco técnico do plano: provar
que `$transaction([set_config, consulta])` funciona no pool de transação e que
o valor de `app.empresa_id` não sobrevive entre pedidos.

**Feito, e a resposta foi sim.** O bloqueio das credenciais também caiu. Ver a
entrada de 06/08/2026 no topo deste arquivo, com os números da prova e com o
achado sobre string vazia que muda a política de RLS da tarefa 4.

### Tarefas restantes do item 1

3. Schema de `Empresa`, `Usuario` e tabelas do Better Auth
4. RLS com falha fechada em migration SQL
5. `lib/db` — cliente escopado, extensão, saída de emergência
6. **Testes de isolamento** (vêm antes de qualquer tela, de propósito)
7. Better Auth e `lib/auth` com rate limit
8. Telas de Entrar, Criar conta, Esqueci a senha e Termos — **ver bloqueio**
9. Travas de ESLint e SQL cru na integração contínua
10. Correções nos documentos e a pendência do Storage

### Bloqueios conhecidos

~~**Tarefa 8 está travada pelo `docs/componentes.md`**~~ — **resolvido.** O
Design completou a tabela "Onde cada tela usa o quê" e a especificação de
ícones. Ver a entrada de 06/08/2026 no topo deste arquivo.

**A tarefa 8 continua bloqueada, mas por outro motivo:** a tabela nova descreve
a tela `Entrar` com **"Receber código no WhatsApp"**, que exige envio automático
por API de WhatsApp — proibido pelo `CLAUDE.md` §12, e contrário à decisão de
login por e-mail e senha em cima da qual a tarefa 3 já foi construída. Precisa
de decisão do fundador.

### Decisões tomadas nesta sessão

- **Login por e-mail e senha**, não por código no WhatsApp. `docs/navegacao.md`
  linhas 49-51 descrevem telefone e código, o que exige envio automático por
  API de WhatsApp — proibido pelo `CLAUDE.md` §12. Correção do documento na
  tarefa 10.
- **Aceite dos termos já no cadastro**, com texto provisório. `Empresa` ganha
  `termos_aceitos_em` e `termos_versao`.
- **Supabase** como banco, porque o §5 pede storage do provedor do banco com
  URL assinada — um fornecedor só, e RLS de primeira classe.
- **`Usuario` não terá `senha_hash`.** O Better Auth guarda o hash na tabela
  `account`. Desvio do §6 da especificação, a corrigir na tarefa 10.
- **E-mail é único no produto**, não por empresa. A mesma pessoa em duas
  transportadoras precisaria de dois e-mails.
- **Escala de espaçamento em pixel** (`--spacing: 1px`): `p-16` vale 16px, como
  a folha de estilo escreve. Não é o padrão do Tailwind.

### Pendências fora do item 1

- **Backup do banco** — ~~passa a valer quando o banco existir~~. **Já está
  correndo.** Ver a entrada de 06/08/2026 no topo deste arquivo.
- **Isolamento do Storage** (item 5, quando entrar upload): balde privado,
  caminho não é autorização, URL assinada gerada no servidor depois de conferir
  a posse, RLS em `storage.objects` com falha fechada. Vai para o `CLAUDE.md`
  §4 na tarefa 10.
- **`next dev` escreve um bloco no fim do `CLAUDE.md`** a cada execução.
  Desligável com `agentRules: false` no `next.config.ts`. Decisão do fundador,
  ainda não tomada.
