# Diário de execução

Onde o trabalho parou e qual é o próximo passo. Atualizado ao fim de cada
sessão. Não é histórico — para isso existe o `git log`. É só o suficiente para
retomar sem reconstruir contexto.

---

## 07/08/2026 — tarefa 8 (fatia 1): tela Criar conta

**Fechada** — cadastro completo (Empresa + Usuário dono, na mesma operação),
testado pelo navegador de ponta a ponta e por suíte automatizada. Entrar,
Esqueci a senha e Termos ficam para a próxima fatia, como decidido no início
da tarefa.

### O que entrou

- `src/app/(auth)/criar-conta/` — a tela: campos, chips da pergunta de
  origem, aceite dos Termos por texto (não checkbox — ver abaixo).
- `src/lib/servicos/cadastro.ts` — o Server Action, em três passos (Empresa
  → Usuário → reversão se o segundo falhar), com `src/lib/servicos/
  trava-de-cadastro.ts` (rate limit próprio, 5/10min) e
  `src/lib/servicos/criar-usuario-dono.ts` (isolando o uso de
  `ctx.internalAdapter` do Better Auth) como arquivos à parte.
- `src/components/ui/` — primeiro commit da biblioteca de componentes:
  `Botao` (três variantes do inventário fechado), `CampoTexto`, `ChipEscolha`.
- `src/app/(app)/` — pouso mínimo pós-login (nome da empresa + Sair da
  conta), provisório até Primeiro acesso existir. Substitui
  `src/app/page.tsx` (a página de teste da instalação, que também saía
  nesta tarefa e não tinha saído na 7).
- `prisma/migrations/20260807090000_reverter_cadastro_incompleto` — a função
  que reverte um cadastro incompleto, e o papel `fretigate_reversor`.
- `tests/cadastro.test.ts` — 14 conferências: cadastro normal, e-mail
  duplicado, o contraste da reversão, a guarda da função, e que a reversão
  não depende de `postgres` ignorar RLS.

### A decisão mais cara: a Empresa órfã, e como revertê-la sem furar RLS

Empresa e Usuário nascem em duas conexões diferentes (`fretigate_app` e
`fretigate_auth`, sem transação em comum — ver o comentário em
`src/lib/db/index.ts`). Se a Empresa for criada e o Usuário falhar depois,
ela fica órfã. Decisão do fundador: apagar de verdade (não arquivar) — nunca
existiu usuário apontando pra ela, então nunca existiu de verdade no produto
(`CLAUDE.md` §7 ganhou essa exceção, com essa distinção).

A primeira versão da função que faz isso rodava como `postgres`
(`SECURITY DEFINER` sem trocar o dono), e `postgres` ignora RLS —
funcionava, mas contrariava a regra central do produto ("nenhuma conexão em
execução ignora RLS"). Bloqueio do fundador: redesenhada para rodar como um
papel novo, `fretigate_reversor` — sem `BYPASSRLS`, com `set_config` dentro
da própria função, então a política de RLS é satisfeita de verdade, não
ignorada. `CLAUDE.md` §9 ganhou a explicação completa.

### `/revisar` rodou três vezes — e a lição de cada uma

Não por a tarefa não terminar (a regra da seção 2 é sobre achado de classe
nova, e cada passe achou classe nova de verdade):
1º passe achou o desenho antigo da função (bloqueio) e o uso de
`ctx.internalAdapter` sem alternativa avaliada. 2º passe, depois da
correção, achou um `GRANT CREATE` esquecido (nunca revogado) e o `wdth`
que faltava no título. 3º passe achou comentário desatualizado em
`lib/db/index.ts` (dizia que a função "não olha `app.empresa_id`" — não é
mais verdade, depois do redesenho) e confirmou que uma seção inteira de
telas de desktop já existia em `docs/componentes.md` **antes** desta
tarefa, contrariando o `CLAUDE.md` §12 — não é desta tarefa, fica
registrado aqui para alguém notar.

### O checkbox que virou texto

O `/auditar-tela` pegou dois problemas no aceite dos Termos: o checkbox não
estava em nenhum documento, e o alvo de toque dele (16px) furava o mínimo de
48px. Virou texto acima do botão ("Ao criar conta, você aceita..."), com os
nomes dos documentos como link. Isso abriu uma pergunta maior — link dentro
de frase corrida nunca alcança 48px — resolvida com uma exceção nova no
`CLAUDE.md` §8: três condições (sublinhado, entrelinha ampliada, o mesmo
documento também pelos Ajustes), todas obrigatórias.

### Pendências, registradas nos documentos, não só aqui

- **Bloqueio de lançamento** (`CLAUDE.md` §14): a forma do aceite dos Termos
  e a redação deles não passaram por revisão jurídica. Não pode ir ao ar.
- **Prazo** (`CLAUDE.md` §14): `origem_cadastro` (atribuição por primeiro
  toque) fica nulo nesta fatia — precisa existir antes de ligar os anúncios.
- `/entrar` e `/termos` ainda não existem (próxima fatia) — os links da tela
  levam a 404 hoje.
- Estilo de campo de texto: foco e erro **saíram do "falta aprovar"** nesta
  tarefa (`docs/componentes.md`, conflitos 2 e 3, resolvidos). Espaçamento
  entre campos e a margem inferior de tela sem barra continuam sem token
  formal — registrados como lacuna em `docs/estilo.md`.

### Próxima

Tarefa 8, fatia 2: Entrar, Esqueci a senha (ciclo completo de recuperação) e
Termos.

---

## 07/08/2026 — incidente: checksum divergente na migration da trava de tentativas

Ao começar a tarefa 8, `prisma migrate dev --create-only` recusou rodar:
*"a migration `20260807074414_trava_de_tentativas` foi modificada depois de
aplicada"*, propondo resetar o banco de desenvolvimento inteiro — o que não
foi feito.

**Causa:** na própria tarefa 7, o comentário final de
`prisma/migrations/20260807074414_trava_de_tentativas/migration.sql` foi
reescrito depois que a migration já tinha sido aplicada — duas versões
anteriores desse comentário prometiam garantia maior do que o teste
realmente confere, e a correção veio depois do `prisma migrate dev` que
aplicou a migration. O arquivo commitado (o que está em `git log`) nunca
mudou depois disso; só o *checksum gravado no banco* no momento da aplicação
ficou preso à versão anterior do comentário.

**Verificado antes de mexer em qualquer coisa**, campo a campo, banco de
desenvolvimento contra o `.sql` commitado: colunas de `rate_limit` (tipo,
nulidade, default), chave primária, índice único de `key`, RLS ligado e
forçado, a política `rate_limit_autenticacao` (papel, `USING`/`WITH CHECK`),
e os `GRANT`s de `fretigate_auth` — tudo bate, e nenhum privilégio extra para
`anon`/`authenticated`. Para confirmar que o método de checksum era o mesmo
do Prisma, o sha256 dos outros seis arquivos de migration foi comparado ao
valor gravado em `_prisma_migrations` — os seis batem exatamente, só o
sétimo diverge. Ou seja: a estrutura do banco está correta; só o registro do
Prisma sobre *qual versão do arquivo* rodou estava desatualizado.

**Conserto:** `UPDATE _prisma_migrations SET checksum = ...` só naquela
linha, pelo sha256 do arquivo atual — sem tocar em nenhuma tabela ou dado do
produto. `prisma migrate status` voltou a dizer "Database schema is up to
date!" depois disso.

**A lição, para não repetir:** editar o `.sql` de uma migration **depois**
dela já ter sido aplicada — mesmo só o comentário, sem mudar nenhuma
instrução — quebra a conferência de integridade do Prisma. O arquivo vira
"fonte da verdade" para quem lê o código, mas o banco guarda a impressão
digital de quem *rodou* primeiro. Se o texto de uma migration já aplicada
precisar de correção, o caminho limpo é uma migration nova só com o
comentário certo, ou aceitar o descompasso e resolvê-lo assim — nunca editar
o arquivo já aplicado sem em seguida atualizar o registro no banco.

**Por que isso importa além de hoje:** um ambiente novo (outro banco de
desenvolvimento, produção) aplica as migrations do zero, direto do arquivo —
nesse caminho o descompasso nunca apareceria, porque não há "checksum
anterior" para comparar. O risco real era só neste banco, que já tinha a
tarefa 7 aplicada com o comentário antigo. Verificado, não suposto.

---

## 07/08/2026 — tarefa 7: Better Auth, `lib/auth` e a trava de tentativas

**Tarefa fechada**, com o e-mail real testado contra três caixas.

### O resultado medido

`POST /api/auth/request-password-reset` disparado de verdade para três
endereços que o fundador passou: um de teste de entrega, um Gmail e um
Outlook.

| Onde | Resultado |
|---|---|
| mail-tester.com | **10/10** — SPF, DKIM, DMARC e conteúdo corretos |
| Gmail | caixa de entrada |
| Outlook | **caixa de spam** |

O 10/10 descarta erro de configuração: SPF, DKIM, DMARC e conteúdo já estão
certos. O Outlook usa reputação própria de domínio, separada dessas
checagens, e julga pelo **histórico de envio** — que um domínio novo ainda não
tem. É o mesmo raciocínio já registrado para o DMARC em `p=none`: domínio novo
começa sem reputação, e isso não se resolve mudando configuração, só com
envio limpo e tempo. Decisão do fundador em 07/08/2026: fechar a tarefa 7
registrando o Outlook como limitação conhecida, não como pendência.

Três desdobramentos, também decididos nesta data:

1. **Critério novo para a tarefa 8.** A tela que confirma o pedido de
   recuperação de senha precisa trazer **"Não achou? Confira a caixa de
   spam."** — o mesmo vale onde quer que a confirmação de cadastro apareça
   (hoje é a pendência de e-mail não confirmado na dashboard, cujo rótulo e
   forma ainda são do Design — ver "Pendente com o Design" mais abaixo). Vai
   acontecer com cliente real nas primeiras semanas; sem essa linha, ele
   conclui que o produto está quebrado. Registrado também em
   `docs/componentes.md`, na linha da tela `Esqueci a senha`.
2. **Ponto de reteste: antes de ligar os anúncios**, não "depois de algumas
   semanas" — é o gatilho real, porque é o momento em que cliente de verdade
   passa a criar conta e pedir recuperação de senha. Repetir o teste de
   mail-tester.com e as duas caixas nesse momento. Se o Outlook ainda cair em
   spam ali, avaliar pedir orientação de aquecimento ao Resend.
3. **A empresa de teste "Transportes Conferencia de Email" foi apagada** do
   banco de desenvolvimento — resíduo de sessão anterior, um usuário sem
   conta nem sessão vinculada, sem valor em manter.

### O que entrou

`src/lib/auth/index.ts` — a configuração do Better Auth, ligada ao banco pelo
papel `fretigate_auth`. `sessao.ts` — `exigirSessao()` e `exigirDono()`.
`email.ts` — o envio pelo Resend. E `src/app/api/auth/[...all]/route.ts`, o
endereço por onde o navegador fala com a autenticação.

A partir daqui existe "estar logado": o `empresa_id` que alimenta o filtro do
§3 passa a sair da sessão, e não de um argumento que alguém lembra de passar.

### O ponto que podia furar o isolamento, e não furou

`empresa_id` e `papel` precisam existir na sessão, e o Better Auth expõe campos
extras com `input: true` por padrão — ou seja, **preenchíveis pelo cliente**.
Deixados assim, um cadastro conseguiria mandar o `empresa_id` de outra empresa
no formulário, que é exatamente a linha que o §3 proíbe.

Os quatro campos extras estão com `input: false`. Foi conferido por tipo, não
por leitura: uma sonda de compilação confirmou que `empresa_id` e `papel`
chegam tipados na sessão e que campo inexistente falha — se a inferência
estivesse caindo em `any`, um erro de digitação passaria calado.

### O cadastro genérico está fechado, de propósito

`disableSignUp: true`. Criar conta no FretiGate é criar uma **empresa** e o
usuário dono dela na mesma transação, e o papel da autenticação não enxerga
`empresa` — o endpoint genérico gravaria usuário sem empresa, que o banco
recusa. Rota que só sabe dar erro não fica aberta. A tela de criar conta é a
tarefa 8.

### A trava de tentativas — medida, não suposta

Tabela `rate_limit` nova, e ela nasceu isolada no mesmo commit: RLS ligado,
forçado, política nomeada para `fretigate_auth`, e a exceção registrada no
teste com o motivo. Ela não tem `empresa_id` porque a contagem acontece **antes
de existir sessão** — quem tenta adivinhar senha não está logado.

No banco e não em memória porque a Vercel roda várias instâncias: com contagem
em memória o limite de 5 viraria 5 vezes o número de instâncias, e em
desenvolvimento — uma instância só — o número bateria, escondendo o defeito.

**Sete tentativas de login seguidas: 401, 401, 401, 401, 401, 429, 429.** Trava
exatamente na sexta. E as linhas foram conferidas na tabela depois, com
contagem 5 na chave do login — a contagem está no banco, não na memória do
processo.

### O que foi provado do e-mail, e o que não foi

**Provado:**

| | |
|---|---|
| DNS do envio | SPF em `send.envio.fretigate.com` (`include:amazonses.com`), DKIM em `resend._domainkey.envio.fretigate.com`, retorno de bounce no `feedback-smtp.sa-east-1` |
| DMARC | existe no domínio raiz, `p=none`, e vale para o subdomínio por herança |
| Alinhamento | tanto SPF quanto DKIM alinham com `fretigate.com` — o DMARC passa por dois caminhos, não por um |
| A corrente do produto | `POST /api/auth/request-password-reset` responde 200 e roda o envio sem erro |
| O fornecedor | o módulo `email.ts` mandou de verdade e o Resend devolveu identificador — `Reply-To` saindo de `EMAIL_RESPOSTA`, nunca literal |

**Não provado, e é o que falta para fechar:** que a mensagem **chega à caixa de
entrada**. Domínio verificado e DNS certo provam que o caminho existe, não que
o filtro aceita — conteúdo e reputação também decidem, e o domínio é novo.

### Uma observação que não bloqueia

O DMARC está em `p=none`, que é só monitoramento: um filtro que reprove o
alinhamento não recebe instrução de rejeitar. Para domínio novo é o começo
correto, e não se sobe direto para `reject`. Fica anotado para revisitar depois
que os relatórios de `rua=` mostrarem algumas semanas de envio limpo.

### Fora da tarefa, feito no mesmo dia

O repositório foi para o GitHub — `fretigate/fretigate`, privado, conferido por
consulta anônima. O endereço do remoto estava certo e a **conta** é que estava
errada: a máquina tinha guardada a credencial de `ogestorflow`, e o GitHub
responde "não existe" para repositório privado de quem não tem acesso, o que
parece endereço errado. O remoto agora carrega a conta no endereço.

A identidade de commit foi fixada **só neste repositório** para o endereço
`noreply` da conta `fretigate`. Os 28 commits anteriores ficaram como estavam,
por decisão do fundador: um e-mail só fica verificado numa conta do GitHub por
vez, então adicionar o antigo à conta nova não funcionaria.

### O que o revisor pegou, e o que virou correção

Cinco divergências. Quatro aceitas, uma recusada pelo fundador.

**O e-mail sai em texto puro, sem HTML.** A primeira versão trazia dois cinzas
e três tamanhos de fonte que não existem em documento nenhum — valor fora do
sistema, §8. A decisão do fundador não foi escolher as cores certas: foi
**tirar o HTML**. Texto puro tem nota de spam melhor, e com domínio novo isso
pesa mais que estética. Por isso o `estilo.md` não ganha seção de e-mail — não
há o que estilizar.

**`rate_limit` ganhou `criado_em` e `atualizado_em`.** O §7 não tem ressalva. O
argumento de que o `lastRequest` já marca tempo era raciocínio contra regra
escrita, e abrir exceção enfraquece uma regra absoluta: quem for acrescentar
tabela depois acha a exceção antes de achar a regra. Como a migration ainda não
tinha sido commitada, ela foi **refeita inteira** em vez de empilhar uma
segunda — uma mudança lógica, uma migration.

**Um comentário meu prometia um teste que não existia.** Na migration estava
escrito que a ausência de privilégio de `anon` era "conferida pelo teste". Não
era: nenhum teste olhava privilégio. É o defeito exato do §3, item 4 — com a
frase, ninguém vai olhar. O fundador mandou **escrever o teste**, não apagar a
frase.

### O teste novo achou duas coisas antes de existir

`tests/isolamento/privilegios.test.ts` confere a camada **antes** do RLS: RLS
decide quais linhas um papel enxerga, privilégio decide se ele alcança a
tabela. O `schema.test.ts` só olhava a primeira.

Escrevê-lo obrigou a olhar o banco de verdade, e apareceram duas coisas que
ninguém sabia:

1. **O `REVOKE USAGE ON SCHEMA public` da migration anterior não teve efeito.**
   `has_schema_privilege('anon','public','USAGE')` continua verdadeiro, porque
   o schema `public` concede USAGE ao pseudo-papel `PUBLIC`, do qual todo mundo
   faz parte — revogar de `anon` não tira o que veio por ali. **Não é buraco:**
   USAGE no schema sem privilégio em tabela não alcança dado nenhum. Mas a
   migration dá a entender que revogou, e não revogou.

2. **Os privilégios padrão do `supabase_admin` ainda concedem tudo a `anon` e
   `authenticated` em tabela futura.** A migration anterior alterou o padrão do
   `postgres`, que é quem roda as migrations — por isso a `rate_limit` nasceu
   fechada, conferido. O padrão do `supabase_admin` continua aberto e só
   morderia se alguma tabela fosse criada por ele. É arma carregada guardada,
   não tiro dado.

O teste cobre o que importa hoje: nenhuma concessão a `anon`/`authenticated` em
tabela nenhuma, e o padrão do `postgres` não deixando a próxima nascer aberta.

**Foi testado contra si mesmo.** `GRANT SELECT ON rate_limit TO anon` e a suíte
reprovou por dois caminhos independentes: a verificação de privilégio e o
**contador de verificações**, que acusou que uma verificação não chegou a
rodar. Concessão removida, 32/32 de volta.

### O que fechou a tarefa 7

Os dois endereços passados pelo fundador — **Gmail e Outlook** (o provedor
brasileiro foi cortado: os principais hoje são pagos, e abrir conta só para
isso atrasa sem ganho) — e um endereço de **mail-tester.com**, testados juntos
em 07/08/2026. Resultado no topo deste arquivo.

### Segundo passe do revisor

Ele achou três coisas, e duas estavam no arquivo que eu tinha acabado de
escrever para atender o §3 — o que é o argumento inteiro a favor de um revisor
que não vê a conversa.

**O teste de privilégio tinha o defeito que ele existe para impedir.** A
verificação de "tabela futura" percorria uma lista sem guarda contra lista
vazia, com o contador incrementando fora do laço: zero linhas e ela fechava
4 de 4 tendo comparado nada. Guarda acrescentada.

**A `rate_limit` virou a quinta tabela do papel da autenticação, e dois lugares
ainda diziam quatro.** O fundador não mandou acrescentar a quinta à lista —
mandou **trocar a lista por regra**: o papel enxerga as tabelas que existem para
autenticar e não têm `empresa_id`. A lista é fotografia, a regra é o que manda,
e quem confere é o teste que lê o catálogo. Lista enumerada envelhece a cada
tabela nova, que foi exatamente o que acabou de acontecer.

**O comentário da migration prometia mais do que o teste confere.** Segunda vez
na mesma tarefa, duas linhas abaixo da primeira correção: dizia "toda tabela
futura" onde o teste olha só o padrão do `postgres`. Agora ele separa em voz
alta o que é conferido do que não é.

### O link de recuperação, decidido

**2 horas, fixado no código**, não herdado do padrão da biblioteca — o e-mail
diz o prazo ao cliente, e uma atualização da biblioteca não pode fazer essa
frase virar mentira sozinha. Duas e não uma porque a pessoa pode não abrir o
e-mail na hora.

**Uso único, confirmado no código da biblioteca:** ao redefinir a senha o token
é consumido e a linha some de `verification`. Não foi suposto pelo nome da
função — foi lido.

### Registrado para a tarefa 8

**A tarefa 8 não fecha com o e-mail chegando.** Ela fecha com o **ciclo
inteiro**: o e-mail chega, o link abre a tela, a senha é redefinida, e a pessoa
entra com a senha nova. Hoje o link de recuperação aponta para uma tela que não
existe — ele dá 404, e isso é esperado nesta altura.

**E fecha também com a tela de link expirado**, que precisa dizer que expirou e
oferecer **reenviar em um toque**, sem a pessoa digitar o e-mail de novo. Quem
chega nessa tela já perdeu a senha uma vez; obrigá-la a recomeçar do zero é o
segundo tapa seguido.

**Pendente com o Design:** o rótulo e a forma da pendência de e-mail não
confirmado, para `docs/componentes.md`. Não bloqueia — a dashboard é o item 8.

---

## 07/08/2026 — o revisor, e três regras ditadas pelo fundador

O `/revisar` entrou em uso: subagente que enxerga o diff e os documentos e
**nunca a conversa**, porque quem escreveu passou a sessão se convencendo de
que está certo. Ver `CLAUDE.md` §2, itens 7 a 9.

### Três regras novas no CLAUDE.md — **ditadas pelo fundador**

Registrado porque o revisor não tem como saber, olhando o diff, se uma regra
nova no `CLAUDE.md` foi decidida por quem manda ou redigida por quem escreve —
e o §2 diz que decisão de produto não se inventa. Foram ditadas:

1. **SQL cru só em `src/lib/db` e em `/tests`** (§3).
2. **Precedência entre documentos** — `componentes.md` manda no que a tela
   contém, `navegacao.md` em como se chega e para onde leva (§13).
3. **Contagem de verificações exige o mecanismo, não o formato** (§3, item 4).
4. **Quantas vezes rodar o revisor** — ele roda sobre o trabalho pronto, antes
   do commit; achado da mesma classe de um já resolvido se corrige e se commita
   sem novo passe, achado de classe nova pede outro passe (§2, item 7). Existe
   para o revisar não virar laço: toda correção é diff novo, e diff novo tem
   achado novo.

A ressalva das migrations de `/prisma` também é do fundador, e o argumento
dele está registrado porque muda como a regra se lê: **não é exceção, é
precisão**. A regra mira consulta crua na aplicação; arquivo de migration é
SQL por definição.

### O despacho do `Agent` foi verificado por execução

O revisor apontou duas vezes que não conseguia confirmar, lendo a árvore, se
`Agent` em `allowed-tools` é nome válido. Ele estava certo em apontar: **a
prova existia e não estava escrita.** O despacho rodou de verdade **duas vezes
em 07/08/2026**, com o revisor devolvendo achados nas duas.

A diferença para `effort` e `disallowedTools`, removidos no mesmo commit, é
exatamente essa: lá não havia evidência nenhuma; aqui havia medição, só não
estava registrada.

**Padrão a seguir daqui em diante:** quando o revisor apontar algo que está
verificado mas não documentado, **documente** — não descarte o achado. A
verificação que só existe na cabeça de quem rodou vira configuração não
verificada assim que a sessão fecha.

### A mutação plantada de propósito

Um token de cor fora da lista fechada do `estilo.md` foi plantado no
`globals.css` e o revisor **reprovou por três caminhos independentes**: cor
fora do sistema (§8), token sem consumidor (§6) e conceito inexistente nos
documentos (§2, item 5). Mutação removida em seguida. Mesmo raciocínio da
suíte de testes: revisor que nunca reprovou não provou nada.

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

### A trava de banco — commit `470fb4f`

A suíte não só semeia: ela **apaga**. O `afterAll` roda `DELETE` sem perguntar
nada. Hoje o estrago possível é zero, porque só existe o banco de
desenvolvimento. No dia em que existir produção, um `.env` apontado para o lugar
errado — ou uma variável herdada de outro terminal — faz `npm test` apagar dado
de cliente.

A trava roda antes de qualquer arquivo de teste ser carregado, que é o único
ponto que pega todos sem depender de alguém lembrar de chamar. **Falha
fechada:** não reconhecer o endereço também recusa. O erro fácil seria "achei um
identificador e ele não está na lista, então recuso" — isso aprovaria por
omissão tudo que não tem o formato esperado. A regra é recusar por não
reconhecer, nunca aprovar por não encontrar.

A lista de projetos permitidos fica **no repositório, não no `.env`**: se a
expectativa morasse no `.env`, o mesmo engano que troca o endereço trocaria a
expectativa junto, e a trava aprovaria o desastre.

**Conferido em cinco casos — à mão, uma vez só.** Isso não é prova permanente:
nada garante que a trava continue fechando amanhã, e ela é justamente o que
impede `npm test` apagar dado de cliente. Virou tarefa própria, a 9b.

### Ponto a revisitar

**Não existe banco de teste separado.** A suíte semeia e apaga no banco de
desenvolvimento. Funciona porque cada execução usa identificadores próprios e
limpa no fim, e agora a trava acima impede que isso aconteça no lugar errado —
mas continua frágil por natureza. Quando o custo justificar, um projeto Supabase
só para teste resolve.

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

~~**Pendente, e vai junto com a correção da tarefa 10:** `docs/navegacao.md`
linha 50 ainda diz "Nome da transportadora". Não editei porque as linhas 49-51
desse arquivo **já estão** na fila da tarefa 10.~~ — **RESOLVIDO em
07/08/2026.** O rótulo foi corrigido separado do mecanismo: vocabulário errado
não é descrição vencida, e esperar a tarefa 10 deixaria o §8 sendo contrariado
por escolha. Ver a entrada de 07/08 no topo.

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
9b. **Teste permanente da trava de banco.** Hoje a trava foi conferida à mão,
    uma vez, em cinco casos — e verificação manual não roda de novo amanhã. Pelo
    mesmo argumento do `CLAUDE.md` §3 ("teste que prova hoje e não roda amanhã
    não protege contra a regressão de amanhã"), ela precisa de teste que rode
    junto com a suíte. O que se prova: endereço permitido passa, endereço
    desconhecido recusa, e **formato irreconhecível também recusa** — este
    último é o caso que separa falha fechada de falha aberta. Vai junto da
    tarefa 9 porque as duas são trava de infraestrutura, não de produto
9c. **Privilégio de execução de função, para `anon`/`authenticated`.**
    Achado na tarefa 8: o Postgres concede `EXECUTE` a `PUBLIC` por padrão em
    função nova (diferente de tabela, que já nasce fechada desde a migration
    `20260806223138_fecha_acesso_pela_api_publica`) — e `PUBLIC` alcança todo
    papel, `anon`/`authenticated` incluídos, mesmo com o `REVOKE` nomeado que
    essa migration já faz para os dois. `reverter_cadastro_incompleto`
    (tarefa 8) foi fechada na mão; a próxima função nasce aberta se alguém
    esquecer. Duas partes, as duas obrigatórias — mesmo padrão que já valeu
    para tabela, e pelo mesmo motivo: **prevenir sozinho** some quando
    alguém contorna ou esquece; **testar sozinho** só avisa depois do fato.
    - **Prevenir**: `ALTER DEFAULT PRIVILEGES ... REVOKE ALL ON FUNCTIONS
      FROM PUBLIC` (e, por clareza, de `anon`/`authenticated` também, mesmo
      que `PUBLIC` já cubra os dois) — função nova nasce fechada, do mesmo
      jeito que tabela nova já nasce.
    - **Detectar**: `tests/isolamento/privilegios.test.ts` passa a conferir
      `information_schema.routine_privileges` (função), não só
      `role_table_grants` (tabela) — mesma forma, mesmo contraste, mesma
      contagem de verificações.
10. Correções nos documentos e a pendência do Storage

### Bloqueios conhecidos

~~**Tarefa 8 está travada pelo `docs/componentes.md`**~~ — **resolvido.** O
Design completou a tabela "Onde cada tela usa o quê" e a especificação de
ícones. Ver a entrada de 06/08/2026 no topo deste arquivo.

~~**A tarefa 8 continua bloqueada, mas por outro motivo:** a tabela nova descreve
a tela `Entrar` com **"Receber código no WhatsApp"**, que exige envio automático
por API de WhatsApp — proibido pelo `CLAUDE.md` §12, e contrário à decisão de
login por e-mail e senha em cima da qual a tarefa 3 já foi construída.~~ —
**RESOLVIDO em 06/08/2026.** O Design corrigiu na fonte: `docs/componentes.md`
descreve a tela `Entrar` com campos **E-MAIL** e **SENHA**, e registra por
escrito que o app nunca envia mensagem sozinho, então não existe código por
WhatsApp ali. Conferido linha a linha. **A tarefa 8 não tem mais bloqueio.**

Sobra só um resíduo de documento, já previsto: em `docs/navegacao.md`, a linha
da tela `Entrar` ainda cita "Código no WhatsApp". Está marcada com ⚠️ ali, e o
que ⚠️ significa é que a descrição não está em vigor. Não bloqueia nada — é
correção de texto, na tarefa 10. (Aqui havia um número de linha; saiu porque
número de linha envelhece calado — duas linhas acrescentadas no topo do arquivo
já o tinham deixado errado no mesmo commit.)

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
