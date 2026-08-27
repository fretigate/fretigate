# Especificação — FretiGate MVP

Salvar em `docs/especificacao.md`. Versão de 06/08/2026 — substitui a anterior
por inteiro.

Este documento existe para que nada precise ser inventado. Se uma regra, campo
ou comportamento não estiver aqui, **pergunte antes de implementar**.

---

## Vocabulário — "empresa" dentro, "transportadora" fora

**Dentro do produto, a palavra é `empresa`.** Rótulo de campo, título de tela,
texto de botão, mensagem de erro: tudo. `NOME DA EMPRESA`, `Conta da empresa`,
`Dados da empresa`.

**Na comunicação de marketing, a palavra é `transportadora`.** Site de vendas,
anúncio, e-mail de captação. É lá que falar com o ramo específico ajuda a pessoa
a se reconhecer.

**Por quê.** O `tipo_operacao` já prevê guincho e reboque desde o modelo de
dados (`CLAUDE.md` §9). Rótulo é a amarra mais barata de criar e a mais cara de
tirar: quando o primeiro guincheiro entrar, "Nome da transportadora" na tela de
cadastro diz a ele que o produto não é para ele — e nenhuma tabela precisava
mudar para isso acontecer. A entidade se chama `Empresa` no banco desde sempre;
a interface só passa a dizer a mesma coisa.

Isto **não** afrouxa a regra do §8 do `CLAUDE.md`: o vocabulário do usuário
continua sendo frete, cliente, caminhão, motorista e relatório. "Empresa" entra
nessa lista, "transportadora" sai dela — e nenhuma das duas vira "organização",
"conta" ou "entidade".

---

## 1. Quem usa

Dono de transportadora de carga pequena, 4 a 10 caminhões, no Brasil. Opera com
uma segunda pessoa (normalmente cônjuge ou administrativo). São **dois a três
usuários**, não um time.

Não é técnico. Vive no celular. Digita pouco e a contragosto.

## 2. O problema, com número real

Na transportadora que serviu de base:

- **8 fretes do mês não estavam lançados** no sistema pago.
- Motivo: cadastrar exige muita digitação e a interface não é intuitiva — "uma
  interação chata". Ele adia e lança em lote dias depois.
- Paga **mais de R$ 200/mês** por um sistema que na verdade é voltado a guincho.
- **Como ele opera:** manda a ordem ao motorista em conversa individual no
  WhatsApp ("vai pegar tal máquina em tal canto"), o motorista responde com foto
  do embarque, e dias depois ele volta conversa por conversa para reconstruir o
  que aconteceu. **O valor não está no WhatsApp** — ele lembra o que combinou com
  o cliente.
- O sistema não gera o relatório de que ele precisa, então o documento é montado
  **à mão, no Canva, impresso e preenchido a caneta**.
- Emite CT-e fora do sistema e segue cliente mesmo assim.
- Cobra por boleto quando dá — e aí o banco avisa o atraso. Nos demais, não
  recebe alerta nenhum: lembra de cabeça e confere a data no sistema.

**Conclusões que orientam o produto:**

1. O gargalo não é falta de funcionalidade. É o atrito de lançar.
2. O trabalho de reconstrução só existe porque nada foi registrado **no momento
   da ordem**, quando ele já sabia tudo. É aí que o frete deve nascer.
3. Sem o dado dentro, nenhuma outra funcionalidade vale nada.

## 3. Métricas de sucesso

> **Lançar um frete, do celular, em até 30 segundos**, com cliente, caminhão e
> motorista já cadastrados.

Secundária: **90% ou mais dos fretes do mês lançados até o dia seguinte** à
execução.

Ativação, a medir desde o primeiro cliente: **relatório gerado e compartilhado
dentro dos 7 primeiros dias.**

---

## 4. Escopo do MVP

### 4.1 Lançamento de frete

O caminho principal do produto. Serve a dois momentos com a mesma tela:
**registrar o que já aconteceu** e **criar a ordem do que vai acontecer**. A
data pode ser futura.

**Regra central:** o que já foi cadastrado uma vez **nunca mais é digitado**.

- A tela abre **com o teclado fechado** e as seis linhas visíveis em altura
  cheia: cliente, caminhão, motorista, origem, destino, carga.
- Cliente, caminhão e motorista vêm pré-preenchidos com o último usado. Tocar
  numa linha abre **folha de busca em tela cheia**, lista ordenada por uso mais
  recente, "+ Novo" no topo. **O teclado não abre sozinho** — só ao tocar no
  campo de busca.
- Tocar no valor abre o **teclado numérico sobrepondo** as linhas. As linhas
  mantêm altura definida; nada é comprimido. O botão salvar nunca fica coberto.
- **Origem** vem pré-preenchida com o pátio cadastrado, editável.
- **Destino:** chips com os destinos já usados **com aquele cliente**. Ao digitar
  um destino novo, sugestões de município aparecem abaixo do campo. **Não
  bloqueia o salvar** se não reconhecer — grava o texto e resolve depois.
- **Carga:** texto livre, com chips das cargas que o próprio usuário já digitou.
  Nenhuma lista de categorias imposta. A categoria comparável é classificada em
  segundo plano, sem ninguém esperando.
- **Km:** opcional. Vem preenchido com a distância calculada quando origem e
  destino forem reconhecidos; editável. Nunca obrigatório, nunca bloqueia.
- **Valor:** quando cliente e destino já têm histórico, mostrar sugestão tocável
  — "Última vez neste trecho: R$ 1.400". Um toque preenche. **Nunca preenche
  sozinho.** O mecanismo aceita mais de uma fonte de sugestão por desenho —
  hoje só "última vez neste trecho", com uma segunda fonte já decidida para
  fase 2 (R$/km, ver §11.1). Não construir amarrado a uma fonte só: acrescentar
  a segunda depois vira remendo.

**Obrigatório para salvar:** cliente, valor, data, tipo de operação.

**Ao salvar:** o frete nasce **A faturar** — consequência de não existir título,
não regra própria. Aparece um aviso do sistema temporário com o atalho **"Já
recebi"**, que cria um título já pago com data de hoje.

### 4.2 Ordem de serviço

O frete criado antes da execução vira ordem para o motorista.

- No detalhe do frete em andamento: **Enviar ordem no WhatsApp**. Abre a conversa
  com o telefone do motorista e a mensagem pronta, a partir de um modelo próprio.
  **Envio manual. O sistema nunca envia sozinho.** A mensagem **não traz o
  valor** — o motorista não vê quanto foi cobrado.
- **Marcar como finalizado** encerra a execução.
- **Comprovante:** campo de anexo de foto no detalhe, para o dono salvar a foto
  do embarque que o motorista mandou. Nada automático; o motorista não acessa o
  sistema.
- A dashboard mostra "fretes em andamento", indicando quantos ainda estão **sem
  ordem enviada**.

### 4.3 Importação de fretes anteriores

Serve ao acervo do primeiro mês, não ao dia a dia — o dia a dia é resolvido pela
ordem de serviço.

- O usuário cola um texto ou envia uma foto (caderno, planilha, recibo).
- O conteúdo vai a um modelo de IA que extrai os fretes encontrados.
- Resultado aparece numa **tela de revisão**, um por linha, campos editáveis.
  Cliente, caminhão e motorista reconhecidos são associados aos cadastros
  existentes; os inexistentes aparecem marcados como novos.
- **Linhas sem valor aparecem destacadas**, com o campo pronto para digitar — o
  valor frequentemente não existe no material de origem. O botão de importar
  informa quantas ainda estão sem valor.
- Cada linha desmarcável. **Nada entra no banco sem confirmação.**
- Registrar em cada frete a origem do lançamento (`manual` | `importacao`).

**A tela de revisão é o mecanismo de correção de erro, não uma cortesia.**
Importação sem revisão nunca é aceitável.

Limitada por quantidade **e por tamanho de cada importação**.

### 4.4 Relatório do cliente

O documento que hoje é feito à mão no Canva. Chama-se **relatório** em toda a
interface — é a palavra que o usuário usa. Nunca "extrato".

**Montagem:** escolher cliente e período (este mês · mês passado · últimos 30
dias · personalizado). Prévia com os fretes, cada linha desmarcável, e o
**total somando ao vivo**.

Marcação **"Gerar cobrança para estes fretes"**, **desmarcada por padrão**, com
o sistema lembrando a última escolha. Quando marcada, mostra o vencimento
calculado (editável) e a escolha entre **Boleto** e **Outro**.

**Gerar relatório é neutro: produz o PDF e não altera nada. Faturar é opcional
e separado.**

**O documento** é A4 retrato, pensado para impressão comum: legível em preto e
branco, separação por fios e peso de tipografia, nunca por blocos coloridos.
Tem escala própria, definida na seção **Impresso** da folha de estilo.

- Cabeçalho: logo, razão social, CNPJ, endereço, telefone e e-mail
- Título, número e data de emissão
- Cliente e período coberto
- Tabela: data · rota · descrição da carga · valor
- **Total em destaque**
- **Sem cobrança:** termina no total. **Com cobrança:** acrescenta vencimento e
  chave Pix no rodapé.

Marca do FretiGate discreta ou ausente — o documento sai da empresa dela e chega
no cliente dela.

**Ações:** Compartilhar no WhatsApp (principal) · Baixar PDF · Imprimir.

O documento fica gravado com os valores da época.

### 4.5 Cobranças

- Três números no topo: **A receber · Vencido · Recebido no mês**. Situação
  atual e mês corrente; **não respondem aos filtros**. **Vencido é um recorte de
  A receber**, e o rótulo deixa isso explícito.
- Filtros: Situação · Cliente · Período, com total contextual que recalcula.
- Lista agrupada por **Vencidas · Vence hoje · A vencer**.
- **Uma cobrança gerada por relatório é uma linha só**, não uma por frete.
- Ações por linha: deslizar revela **Marcar recebido**; **Cobrar no WhatsApp**
  visível na própria linha.
- Linhas já cobradas exibem **quem cobrou e quando** ("cobrado há 2 dias por
  Monalisa"). O detalhe mostra o histórico das cobranças.

**Boleto:** cobranças marcadas como boleto **não aparecem nas pendências da
dashboard e não exibem "Cobrar no WhatsApp"** — o banco já avisa. Continuam na
lista, com marca discreta. Sem isso, o alerta vira ruído e o usuário deixa de
confiar nele.

**Recebimento:** folha curta com **campo de valor editável** pré-preenchido com
o saldo, data (chips Hoje · Ontem · Outra data) e forma de pagamento. Valor
menor lança **recebimento parcial**: a cobrança fica aberta pelo resto e passa a
exibir **Parcial**.

**Cobrança por WhatsApp — sem API.** A ação abre a conversa com a mensagem
escrita a partir de um modelo editável, com variáveis de cliente, valor,
vencimento, rota e empresa. **Envio manual.** Ao voltar ao app, um aviso
temporário pergunta se foi enviada, e a resposta alimenta a marca de cobrado.

### 4.6 Dashboard

Tela inicial. Só entra número que muda o que ele faz depois de ver.

- **Cartão escuro** com a marca da empresa no respiro superior (tocável, leva à
  Conta), **faturamento do mês** em número grande, e na linha de comparação:
  variação sobre o mês anterior · **quantidade de fretes** · **média por frete**.
  Abaixo, dois atalhos: Gerar relatório · Importar fretes.
- **Quatro pastilhas tocáveis**, duas a duas: **A receber** · **Vencido** ·
  **Lucro no mês** (faturamento − despesas, com a conta como apoio) ·
  **Rodagem no mês** (km total, com R$/km como apoio).
- **Cartão de comunicação da plataforma**, na superfície lilás, só quando houver
  mensagem ativa. Dispensável por arraste horizontal — **sem revelar painel
  colorido**, para não confundir com o arraste das listas — e por um "×" visível.
  Ao dispensar, aviso "Guardado em Novidades" com Desfazer.
- **"Precisa de você"**: fretes em andamento (indicando quantos sem ordem
  enviada), fretes a faturar, cobranças vencidas, sugestão de relatório quando
  um cliente acumula fretes não faturados de um mês fechado, e **e-mail ainda
  não confirmado**. **O sistema nunca gera relatório sozinho.**
- **Barras dos últimos 6 meses**, sem eixo, legenda ou grade. **Tocáveis:** cada
  mês leva a Fretes filtrado naquele período.

**Sem filtro de data na dashboard** — "a receber" e "vencido" são situação
atual, e um filtro tornaria o significado deles ambíguo.

**Nada de pizza, medidor ou meta.**

### 4.7 Cadastros

**Clientes, Caminhões e Motoristas** seguem o mesmo padrão: lista com busca e
**seletor de ordenação**, perfil e formulário. Acessíveis por "Mais".

**O perfil do cliente NÃO é acessível tocando o nome numa linha de frete ou
cobrança** — medido e revertido no item 4 (Fretes). O item 6, Tarefa 4
(Cobranças) decidiu sem remedir: é o mesmo componente `LinhaDeLista`, com o
mesmo cartão de 78px, então a conclusão de Fretes já vale ali. O alvo de toque
do nome fica abaixo de 48px dentro desse cartão, que já é ele mesmo tocável
(leva ao frete ou à cobrança). Ver `docs/navegacao.md`, "Regras de navegação".

Ordenações: clientes por mais recente · maior valor em aberto · maior valor
total. Caminhões e motoristas por mais recente · mais fretes · maior valor
transportado. A linha mostra o dado da ordenação escolhida.

**Regra geral, decisão do fundador em 22/08/2026 (Tarefa 6 do item 4, segundo
commit): número na lista de cadastro é sempre da vida inteira do cadastro, e
o apoio da linha diz isso — "R$ X no total", "N fretes no total". Número no
resumo do perfil é sempre do período escolhido, e o chip de período ao lado
já avisa disso — nunca precisa do qualificador "no total".** Motivo: as duas
telas mostram o mesmo tipo de número (valor transportado, contagem de
fretes) em recortes diferentes (vida inteira × período), e um dos dois sem
qualificador nenhum ensina o hábito errado — a pessoa aprende que "no total"
significa vida inteira, vê um número sem ele ao lado e conclui,
incorretamente, que é do período. A regra vale para todo critério de
ordenação que apareça daqui para frente, nas três listas de cadastro
(Clientes, Caminhões, Motoristas) — não precisa ser redescoberta a cada uma.

**"Maior valor transportado", não "maior valor rodado"** — corrigido em
22/08/2026, planejamento da Tarefa 5 do item 4: mesma palavra que já valia
para o resumo do perfil do motorista (`docs/planos/item-4-lista-e-detalhe-do-
frete.md`, "Decisões do fundador"), por não ler como remuneração do
motorista — é dinheiro do dono, não salário. "Rodado" sobrevivia só no
critério de ordenação; ficar diferente do resumo do perfil, que já dizia
"transportado" para o mesmo número, seria o chip e a linha do perfil
nomeando o mesmo valor de dois jeitos.

**No item 4, "maior valor em aberto" nasce sem servir para nada — registrado
para não confundir quem for construir.** Depende de título em aberto, e até o
item 6 existir o único jeito de um título nascer é "Já recebi", que já cria
pago — então todo cliente teria "valor em aberto" zero, e ordenar por um
número sempre igual não ordena nada. As outras duas ("mais recente", "maior
valor total") não dependem de título, então funcionam desde o item 4. O
critério "maior valor em aberto" passa a valer de verdade a partir do item 6.

**Perfil do cliente:** nome e cidade; resumo com **já rodado · a receber ·
vencido · recebido no período**, com filtro de período que recalcula os
quatro, e os três primeiros tocáveis para as listas filtradas; dados
cadastrais; histórico de fretes. Ações: **Gerar relatório** (principal),
**Editar** (cabeçalho), **Cobrar no WhatsApp** (só com valor em aberto), e
**Lançar frete para este cliente**, entre os campos cadastrais e o
histórico — corrigido em 22/08/2026 (planejamento da Tarefa 6, achado do
segundo `/revisar`): a frase dizia "no fim do histórico", texto anterior à
auditoria de posição que corrigiu esta mesma tela (`docs/componentes.md`,
"Auditoria da regra de posição" — "Perfil do cliente | ações no fim,
depois do histórico → resumo → campos → **ações** → histórico") e nunca
foi atualizado depois. O texto estava desatualizado; a posição vigente é a
da auditoria.

**No item 4, o resumo nasce com só dois dos quatro números.** "A receber" e
"Vencido" dependem de título em aberto — pelo mesmo motivo do parágrafo
acima (só "Já recebi" existe, e ele já nasce pago), os dois ficam
estruturalmente em zero até o item 6 existir; um número que nunca sai de
zero é dado incompleto disfarçado de completo (`CLAUDE.md` §8, regra 10 de
`docs/especificacao.md` §8). O item 4 entrega **já rodado** e **recebido no
período** — os únicos dois que não dependem de título em aberto — com só
"já rodado" tocável (era um dos três tocáveis originais; "recebido" nunca
foi). "A receber" e "Vencido" entram no item 6, junto do resto de
Cobranças — o mesmo vale para o apoio "· R$ X em aberto" da linha Clientes
em "Mais" (`src/app/(app)/mais/page.tsx`), cortado pelo mesmo motivo.

**Campo vazio tocado no perfil do cliente, antes do item 3:** o inventário
(`docs/componentes.md` 12) manda abrir a "folha do campo que falta" — ela só
nasce no item 3 (Lançamento de frete), junto com a meta dos 30 segundos que a
justifica. Até lá, tocar em "adicionar" leva para o formulário de edição
inteiro. **Provisório, decidido na tarefa 5 (10/08/2026):** troca pela folha
de verdade quando o item 3 a construir — não antes.

**Período padrão dos três resumos (cliente, caminhão, motorista) é o mês
corrente.** Decisão do fundador, 22/08/2026, planejamento da Tarefa 6 do item
4: é como o dono pensa a operação — "quanto rodei esse mês" — e é o mesmo
recorte do card de faturamento da dashboard (item 8, §4.6). Dois lugares
mostrando o mesmo tipo de número com padrões diferentes criaria contradição
aparente entre eles. Resolvido em Fortaleza pelo mesmo mecanismo que já
corrige "hoje" no fuso local (`src/lib/utils/data-fortaleza.ts`, item 3) —
sem isso, o resumo do dia 1º de manhã mostraria o mês anterior.

**Perfil do caminhão:** apelido, placa, tipo; **km no período e R$/km**,
exibidos só quando houver km preenchido; histórico. Ação: lançar frete com este
caminhão.

**Perfil do motorista:** telefone tocável (resolvido na Tarefa 1 do item 5,
23/08/2026 — ver §9, "Três exigências...", item 3), caminhão habitual,
resumo e histórico. Ação: lançar frete com este motorista.

**Prazo de pagamento** tem três níveis: configurações da empresa → cadastro do
cliente → edição na hora de faturar. Vazio no cliente significa herdado, e a
interface mostra a origem. Rótulo: "Prazo de pagamento", com a explicação de
que é usado para calcular o vencimento ao faturar.

O padrão da empresa é **15 dias** (`Empresa.prazo_padrao_dias`, §6). Ele existe
desde o item 2, mesmo com a tela que o edita só no item 10 — senão a interface
diria "herdado" apontando para nada.

Formulários agrupados em **Identificação** e **Condição comercial**.

### 4.8 Despesas

Alimenta o card de Lucro. Lista por período, agrupada por data, com total no
topo e filtros de Período e Categoria.

Cadastro curto: data (chips Hoje · Ontem · Outra data — **nunca digitação de
data**), categoria, valor, descrição, vínculo opcional a caminhão ou frete. Só
valor e data obrigatórios.

Entrada por "Mais" e pelo card de Lucro quando ele estiver no estado de convite.

### 4.9 Configurações, conta e usuários

**Configurações:** endereço padrão do pátio, prazo padrão de vencimento, e
acesso aos **dois modelos de mensagem** (cobrança e ordem de serviço).

**Conta da empresa:** logo, razão social, CNPJ, endereço, telefone, e-mail,
chave Pix e dados bancários, com prévia do cabeçalho do relatório. Sem logo,
círculo com as **iniciais das duas primeiras palavras** do nome. Nunca ícone
genérico.

**Usuários**, dentro de Conta: lista com nome, e-mail, papel e último acesso.
Convite por e-mail ou WhatsApp, com envio manual. Convite pendente com reenviar
e cancelar. Remover acesso é ação destrutiva, **só visível para o dono**, e não
apaga histórico.

**Papéis:** Dono e Operador têm o mesmo acesso a fretes, clientes, cobranças,
relatórios e cadastros. Só o dono acessa assinatura, forma de pagamento e gestão
de usuários.

### 4.10 Novidades

Comunicação da plataforma com o usuário, na superfície lilás. Lista das
mensagens, não lidas destacadas, contador discreto no menu. Detalhe com título,
texto e no máximo uma ação. **Nenhuma mensagem interrompe o uso:** sem pop-up,
sem tela cheia, sem bloqueio.

### 4.11 Afiliados

Código e link por afiliado; empresa cadastrada pelo link fica vinculada; painel
com indicações, conversões e comissão. **Percentual e regra: em aberto.**

### 4.12 Conta, assinatura e primeiro acesso

Cadastro, login, recuperação de senha, aceitar convite, termos e privacidade.

**No cadastro, uma única pergunta declarada: "como você conheceu o FretiGate?"**
com opções tocáveis e campo livre, junto com atribuição de origem por primeiro
toque.

**As opções, decididas em 07/08/2026, nesta ordem:**

1. Anúncio no Instagram ou Facebook
2. Pesquisei no Google
3. Alguém me indicou
4. Vi outra empresa usando
5. Outro — libera campo livre

Sem TikTok (não é canal ativo hoje — entra quando existir) e sem "já
conhecia" (o produto acabou de nascer, ninguém já conhecia).

**Por que é essa lista, e não outra.** A atribuição por primeiro toque já
captura canal e campanha sozinha, sem perguntar nada — é dado de tráfego, não
resposta de formulário. A pergunta declarada existe só para o que essa
atribuição **não enxerga**: indicação de alguém e "vi outra empresa usando"
são as duas respostas que mais valem, porque nenhum outro dado do sistema as
revela. Opção que a atribuição automática já cobre é opção redundante, e não
entra.

Resposta de **"Outro" precisa ficar consultável**: grava o texto que a pessoa
digitou em `origem_declarada`, nunca o rótulo genérico "Outro" — é dali que
sai canal que ninguém previu.

**Primeiro acesso:** duas opções **em pé de igualdade** — trazer os fretes que já
fiz (importação) e começar do zero (lançamento). Nenhuma é destaque da outra.
Depois, guia de progresso no topo da dashboard com **no máximo três itens**,
sumindo conforme cumpridos. **Sem tour, sem balão, sem vídeo, sem tela de
parabéns.**

**Planos e limite:** ver §10 do CLAUDE.md. A tela de limite aparece ao tentar
cadastrar além do permitido, **não bloqueia o que já existe**, explica o que
muda e leva aos planos.

**Cadastro:** campos **NOME DA EMPRESA** · **E-MAIL** · **SENHA** · **SEU NOME**
· **SEU TELEFONE**, nessa ordem. O telefone é o contato para o cliente falar com
a empresa, **não é login** — login é e-mail e senha. `SEU NOME` é obrigatório, e
o porquê está em §6, em `Usuario`.

O rótulo é **NOME DA EMPRESA**, não "Nome da transportadora" — ver o
Vocabulário, no topo deste documento.

### E-mail transacional

O produto manda e-mail em três momentos, e só nesses três: **recuperação de
senha**, **verificação de e-mail** e **convite de usuário**. Nenhum deles é
opcional para o produto funcionar — quem perde a senha só volta por e-mail.

| | |
|---|---|
| Provedor | **Resend** |
| Domínio | `fretigate.com` |
| Subdomínio de envio | `envio.fretigate.com`, verificado |
| Remetente (`From`) | `contato@envio.fretigate.com` |
| Resposta (`Reply-To`) | `contato@fretigate.com`, no domínio raiz |
| Variáveis | `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_RESPOSTA` |

**Sai de um endereço e responde para outro, de propósito.** O subdomínio de
envio não recebe mensagem — responder ao remetente seria falar com o vazio. O
`Reply-To` aponta para `contato@` no **domínio raiz**, que a **Cloudflare Email
Routing** redireciona para a caixa de quem lê, com catch-all ativo.

O redirecionamento fica no domínio raiz, e o envio no subdomínio: as duas coisas
não se atrapalham. O `MX` de recebimento é do raiz; o `SPF` e o `DKIM` de envio
são do `envio.`, e continuam valendo sozinhos.

Cliente que perdeu a senha, recebe o link e responde *"não consegui, me ajuda"*
é comportamento comum, não caso de canto. Resposta que some é pior do que não
ter recebido o e-mail: a pessoa acha que falou com alguém.

**O endereço de resposta é variável de ambiente (`EMAIL_RESPOSTA`), nunca
literal no código.** Ele vai mudar — hoje é redirecionamento do registrador,
depois vira caixa própria. Trocar endereço de contato não pode exigir alterar
código e publicar de novo.

**Por que subdomínio separado para envio.** A reputação de envio fica isolada do
domínio principal. Se um dia sair mala direta, ela vai por outro subdomínio, e
um problema de reputação lá **não derruba a recuperação de senha**. Transacional
e marketing nunca compartilham reputação.

**O envio precisa ser conferido de verdade**, com mensagem chegando à caixa de
entrada, antes de a autenticação ser dada por pronta. Domínio verificado no
painel do provedor prova que o DNS está certo, **não** que a mensagem chega:
conteúdo, remetente e reputação também decidem. Recuperação que cai em spam é
cliente perdido em silêncio — ele não reclama, ele some.

**O Resend é subprocessador** e está declarado no `CLAUDE.md` §11.

#### E-mail não confirmado **não impede entrar**

Decisão do fundador em 07/08/2026. A verificação roda em segundo plano: a
pessoa entra e usa o produto normalmente, e o lembrete aparece como pendência
na dashboard, no bloco **"Precisa de você"**.

**Sem janela modal e sem barra permanente.** Quem acabou de pagar sem ter visto
o produto não pode esbarrar numa parede — e o domínio é novo, sem histórico de
envio, então a mensagem pode legitimamente cair em spam. Travar o acesso nesse
caso transformaria um problema de entrega em cliente perdido no primeiro
minuto, que é o pior momento possível.

A confirmação continua importando, e é por isso que ela vira pendência visível
em vez de sumir: **é ela que garante que a recuperação de senha vai funcionar
no dia em que for preciso.** O texto do lembrete diz isso, não "confirme seu
e-mail" sem motivo.

O **rótulo exato e a forma** da pendência são do Design e entram em
`docs/componentes.md` — pendente, e não bloqueia: a dashboard é o item 8 da
ordem de construção.

#### O link de recuperação

Vale **2 horas** e é de **uso único** — usado uma vez, deixa de valer. Duas
horas, e não uma, porque a pessoa pode não abrir o e-mail na hora.

O prazo é fixado no código, não herdado do padrão da biblioteca: o e-mail diz
ao cliente quanto tempo ele tem, e uma atualização da biblioteca não pode fazer
essa frase virar mentira sem ninguém tocar em nada.

#### "Confira a caixa de spam" — decidido em 07/08/2026

Medido em produção: nota 10/10 no mail-tester.com (SPF, DKIM, DMARC e conteúdo
corretos) e a mensagem chegando na caixa de entrada do Gmail, mas caindo em
spam no Outlook. Domínio novo não tem histórico de envio, e é o histórico que
o Outlook usa para decidir — não algo que configuração resolve. Vai acontecer
de novo com cliente real nas primeiras semanas.

Por isso, a tela que confirma o pedido de recuperação de senha, e onde quer
que a confirmação de cadastro apareça, **precisam trazer**: *"Não achou?
Confira a caixa de spam."* Sem essa linha, quem não vê o e-mail conclui que o
produto está quebrado, e some — o mesmo desfecho descrito acima para quem
recebe e ignora. Ver a tela `Esqueci a senha` em `docs/componentes.md`.

### Trava de tentativas

O §4 do `CLAUDE.md` exige rate limit em login, recuperação de senha e toda rota
que gere custo. Os números, aprovados em 07/08/2026:

| Onde | Limite |
|---|---|
| Entrar | **5 tentativas por minuto** |
| Mandar link de recuperação | **3 por 5 minutos** |
| Reenviar confirmação de e-mail | **3 por 5 minutos** |
| Redefinir a senha pelo link | **5 por 5 minutos** |
| Consultar o código em `/redefinir-senha` (carregar a tela) | **20 por minuto** |
| Criar conta | **5 por 10 minutos** |
| Enviar comprovante | **20 por 5 minutos** |

A contagem é por endereço de rede e por rota, e fica **no banco** — a
hospedagem roda várias instâncias, e contagem em memória viraria uma contagem
por instância. As travas de **Criar conta**, de **consultar o código em
`/redefinir-senha`** e de **Enviar comprovante** não são rota do Better Auth
(são Server Action, Server Component e rota de API, respectivamente —
`src/lib/servicos/trava-de-cadastro.ts`, `trava-de-redefinicao.ts` e
`trava-de-comprovante.ts`), mas usam a mesma tabela `rate_limit` e o mesmo
mecanismo atômico; estão aqui, e não só no código, para as listas nunca
divergirem de novo — já aconteceu três vezes.

**Contar por endereço de rede tem um efeito colateral nomeado, não
escondido** (decisão do fundador ao aprovar o número de "Enviar
comprovante", 25/08/2026): numa transportadora pequena, o escritório inteiro
sai pela mesma rede — duas pessoas anexando comprovante ao mesmo tempo
dividem a mesma cota. Com **20 por 5 minutos** isso não aperta no uso real;
fica registrado porque, se esse número um dia baixar, é este o efeito que
volta a valer a pena medir.

**A consulta do código de `/redefinir-senha` é limite de custo, não de
adivinhação.** O código tem 24 caracteres aleatórios — não é o que essa trava
tenta impedir. O que ela impede é uma rota sem limite nenhum, consultando o
banco a cada carregamento, virar vetor de carga. Por isso o número é folgado:
bem acima do que uma pessoa recarregando a própria tela bateria.

**A mensagem de travado não é um erro seco.** Quem bate no limite é, quase
sempre, cliente legítimo que errou a senha — não invasor. A tela precisa:

1. dizer **o que aconteceu**, sem jargão e sem culpa;
2. dizer **quando ele poderá tentar de novo**;
3. quando existir uma saída diferente de simplesmente esperar, oferecer ela
   ali mesmo — **e não é sempre a mesma saída.**

Escrito assim porque uma regra genérica demais já gerou exceção falsa três
vezes seguidas — a saída certa depende de qual travou:

| Onde travou | A saída, além de esperar |
|---|---|
| **Entrar** | recuperação de senha — o link "Esqueci a senha" já fica na tela |
| **Criar conta** | falar com a empresa — quem trava aqui ainda não tem conta, "esqueci a senha" não é saída para quem nunca teve senha |
| **Mandar link de recuperação · Reenviar confirmação de e-mail · Redefinir a senha pelo link** | nenhuma — esperar **é** a saída. Quem trava aqui já está dentro do próprio caminho de autoatendimento; oferecer "recuperar a senha" a quem já está recuperando a senha não ajuda, só confunde |
| **Enviar comprovante** | nenhuma — esperar **é** a saída, mesmo raciocínio da linha acima: quem travou aqui já está dentro do próprio fluxo de anexar comprovante. A foto continua na galeria do aparelho — a mensagem precisa dizer isso, não só "espere" |

Sem a saída certa, quem trava conclui que o produto está quebrado e some —
mesmo desfecho da recuperação que cai em spam. Oferecer a saída errada (ex.:
mandar quem já está redefinindo a senha para "esqueci a senha" de novo) é tão
ruim quanto não oferecer nenhuma, porque não resolve nada e ainda confunde.

---

## 5. Fora do escopo do MVP

Ver §12 do CLAUDE.md.

---

## 6. Entidades

Toda tabela tem `id`, `empresa_id`, `criado_em`, `atualizado_em` e
`arquivado_em` (nulo = ativo). Dinheiro em **centavos**; distância em
**metros**.

**As exceções, e as duas de `Municipio` vêm da mesma natureza da tabela** —
ficam juntas de propósito, para ninguém tratar uma delas como caso isolado:

- **`Empresa` não tem `empresa_id`** — o escopo dela é o próprio `id`.
- **`Municipio` não tem `empresa_id`** e **não tem `id` próprio**: ela não é
  dado do usuário, é **tabela oficial de referência, igual para todas as
  empresas**. A chave é o `codigo_ibge`, que é oficial e estável há décadas, e
  já é o que `Empresa.municipio_id` guarda hoje. Criar um `id` ao lado dele
  custaria mais que a exceção, e o custo **não ficaria na tabela de município**:
  todo lugar que guarda "o município" — cliente, empresa, origem e destino do
  frete — teria que escolher qual dos dois guardar, e uns guardariam um e
  outros o outro.

A lista de tabelas sem `empresa_id` é conferida por **igualdade exata** em
`tests/isolamento/schema.test.ts`: `municipio` precisa estar declarado lá, com
o motivo, ou a suíte reprova.

### Empresa
`nome_fantasia` · `razao_social` · `cnpj` · `telefone` · `email` · `endereco` ·
`municipio_id` · `logo_url` · `chave_pix` · `dados_bancarios` ·
`patio_endereco` · `patio_municipio_id` · `prazo_padrao_dias` ·
`proximo_numero_servico` · `modelo_mensagem_cobranca` · `modelo_mensagem_ordem` ·
`plano` · `periodicidade` · `status_assinatura` · `afiliado_id` ·
`origem_cadastro` · `origem_declarada` · `termos_aceitos_em` · `termos_versao`

**`proximo_numero_servico`** — contador interno, nunca exibido. Começa em 1;
é dele que sai o `numero` sequencial de cada `Servico` da empresa (tarefa 1 do
item 3, `docs/planos/item-3-lancamento-frete.md`).

**`plano`** — `gratuito` | `pago`.

**`periodicidade`** — `mensal` | `anual`. **Nula no gratuito.** Existe separada
do plano porque é preciso saber quem está no mensal para oferecer o anual, e
para a comissão do afiliado.

**`status_assinatura`** — quatro valores, e a diferença entre os dois do meio é
deliberada:

| Valor | O que acontece |
|---|---|
| `ativa` | Acesso completo. |
| `inadimplente` | O pagamento falhou e está em retentativa. **Acesso continua liberado**, com aviso para atualizar a forma de pagamento. Bloquear aqui empurra para fora quem não escolheu sair. |
| `vencida` | Retentativa esgotada. **Escrita bloqueada**; leitura e exportação mantidas por 90 dias (§10 do `CLAUDE.md`). |
| `encerrada` | Passados os 90 dias. |

**Plano gratuito fica sempre `ativa`.** Isso não é convenção: é restrição no
banco (`empresa_plano_coerente`), junto com "gratuito não tem periodicidade" e
"pago tem periodicidade". Empresa gratuita inadimplente não quer dizer nada, e
a tela de cobrança não saberia desenhar.

**`cnpj` é único no produto**, e nulo é permitido porque o CNPJ é preenchido
depois, na Conta da empresa. É trava anti-abuso: sem ela, dá para abrir várias
contas gratuitas e driblar o limite de 1 caminhão.

- **Empresa arquivada NÃO libera o CNPJ.** A restrição vale sobre todas as
  linhas. Liberar no arquivamento reabriria exatamente o buraco — bastaria
  arquivar e cadastrar de novo. Quem volta **desarquiva** a linha que já existe,
  que é o que o §7 do `CLAUDE.md` já manda ao dizer que nada é apagado.
- **Guardar só letra e número, maiúsculo, sem pontuação — nunca só dígito.**
  Sem normalizar, `12.345.678/0001-90` e `12345678000190` passam as duas pela
  restrição e a trava não vale nada. E desde 31/07/2026 a Receita emite CNPJ
  **alfanumérico** para inscrição nova — 12 primeiras posições podem ter
  letra (A-Z), os 2 dígitos verificadores finais continuam só número —
  então "só dígito" recusaria CNPJ novo e válido. O CPF não muda: continua
  só numérico, 11 dígitos. O formato é garantido também no banco, pela
  restrição `empresa_cnpj_formato`.
- **Guardar nulo, nunca `''`.** Vazio colide com vazio; nulo não colide com
  nulo. Duas empresas sem CNPJ preenchido são normais.
- Mensagem de erro: **"já existe uma conta com esse CNPJ"**. Nunca o erro do
  banco.

**`prazo_padrao_dias` vale 15**, e é obrigatório (nunca nulo). É o topo dos três
níveis de prazo do §4.7 — empresa → cliente → edição ao faturar —, e é dele que
o `Cliente.prazo_pagamento_dias` vazio herda.

O número 15 já estava vigente em `docs/componentes.md` ("Números de regra de
produto"), que diz que valores de regra vêm daqui — só que aqui nunca tinham
sido escritos. Registrado em 09/08/2026 para fechar essa lacuna.

**A coluna entra no item 2, antes da tela que a edita (item 10)**, e é exceção
consciente ao critério de "coluna sem tela que a preencha é peso morto": ela
já tem **quem a leia** no item 2 — o formulário e o perfil do cliente precisam
dizer "vazio usa o padrão da empresa (15 dias)", e sem a coluna essa frase
apontaria para nada. Os outros campos de Empresa do item 10 (`patio_*`,
`dados_bancarios`, `modelo_mensagem_*`, `afiliado_id`) continuam fora: esses
ninguém lê ainda.

**`chave_pix` saiu desta lista em 27/08/2026 (item 6, Tarefa 5)** — mesma
exceção, adiantada pelo mesmo motivo: a coluna ganhou o primeiro leitor
(`montarMensagemCobranca`, `src/lib/servicos/mensagens.ts`) e um lugar
mínimo de preencher (a "folha do campo que falta", `FolhaDePix.tsx`) antes
da tela que editaria o resto da Conta da empresa (item 10). Frase que
descrevia o estado por um caso que deixou de ser o único — "esses ninguém lê
ainda" não vale mais para este campo (`CLAUDE.md` §2, sobre texto que
envelhece calado quando um estado novo passa a existir).

**`termos_aceitos_em` e `termos_versao`** são obrigatórios — o aceite acontece
no cadastro, então não existe Empresa sem aceite.

**A forma do aceite, decidida em 07/08/2026:** texto acima do botão **Criar
conta** — "Ao criar conta, você aceita os Termos de uso e a Política de
privacidade", com os dois nomes como link — em vez de caixa de marcação. Saiu
do `/auditar-tela`: o checkbox não estava em nenhum documento e o alvo de
toque dele (16px) furava o mínimo de 48px do `CLAUDE.md` §8. Clicar em
**Criar conta** é o aceite.

**Publicado em 18/08/2026** (ver `CLAUDE.md` §14): a forma de aceite acima e
a redação dos Termos e da Política de Privacidade foram ao ar por decisão do
fundador, com a revisão jurídica das duas coisas virando pendência — sem
bloquear lançamento — para depois do primeiro cliente pagante. `termos_versao`
guarda a **data de publicação** da versão do texto aceita
(`src/lib/servicos/cadastro.ts`), não um identificador provisório: toda
Empresa que aceitar a mesma versão grava a mesma data ali, distinta de
`termos_aceitos_em` (o momento em que aquela Empresa aceitou). Uma versão
futura do texto ganha data nova e vale só a partir do próprio aceite — não
retroage sobre quem já aceitou a anterior.

**Nem toda mudança no texto conta como versão nova.** Cláusula nova ou
alterada — algo que muda o que o texto autoriza — exige aceite novo de quem
já tinha aceitado: data nova em `termos_versao` e um fluxo de reaceite que
ainda não existe. Correção de redação que não muda o que o texto autoriza
(erro de digitação, clareza de frase) não precisa de aceite novo.

### Usuario
`nome` · `email` · `papel` (`dono` | `operador`) · `ultimo_acesso_em`

**`nome` é obrigatório e é coletado no cadastro**, no campo **SEU NOME**, que
fica **antes de SEU TELEFONE** na tela Criar conta. Primeiro nome basta.

Não é firula: é o que distingue os dois usuários no registro de "cobrado por" e
na tela de Usuários. Preencher com o nome da empresa deixaria os dois iguais na
tela que existe justamente para diferenciá-los, e deixar a coluna aceitar nulo
empurraria o problema para toda tela que exibe quem fez o quê.

**`senha_hash` não existe.** O Better Auth guarda o hash na tabela `account`,
com o provedor `credential`. O `CLAUDE.md` §4 continua atendido — hash forte,
nunca reversível, nunca em log.

**Senha mínima: 6 caracteres.** Decidido em 08/08/2026 — `minPasswordLength`
em `src/lib/auth/index.ts`, não o padrão da biblioteca (8), para o número
não mudar sozinho numa atualização. Vale em Criar conta e em Redefinir
senha, e a mensagem de erro das duas telas lê este valor do próprio
Better Auth (`ctx.password.config.minPasswordLength`), então as duas nunca
divergem entre si.

### Convite
`email` · `nome` · `papel` · `token` · `status` · `enviado_em` · `aceito_em`

### Municipio
Tabela global, base do IBGE, 5.570 registros.
`codigo_ibge` · `nome` · `uf` · `nome_normalizado` (para busca sem acento) ·
`latitude` · `longitude`

**`codigo_ibge` é a própria chave da tabela** — é identificador estável, oficial
e já é o que `Empresa.municipio_id` guarda.

**`nome_normalizado` é coluna, não cálculo na hora da consulta.** Três razões,
em ordem de peso: a **mesma função** de normalização escreve a coluna e trata o
que o usuário digitou, e é isso que garante que os dois casem; `unaccent()` na
consulta não usa índice, e a busca de município do item 3 acontece **enquanto a
pessoa digita**, dentro da meta de 30 segundos; e `unaccent` é extensão do
Postgres — depender de extensão no caminho crítico amarra ao provedor.

**Latitude e longitude entram desde já**, mesmo com o item 12 adiado, porque a
conferência exigida da carga ("nenhuma coordenada nula ou zerada, todas dentro
dos limites do Brasil") não existe se as coordenadas não entrarem: não se
confere o que não se carrega.

**Quem escreve nesta tabela é a seed, pela conexão das migrations — nunca a
aplicação.** `fretigate_app` recebe **só `SELECT`**, e a proibição de a
**aplicação** escrever fica em **dois lugares**: a ausência do `GRANT` de
`INSERT`/`UPDATE`, e a política `municipio_leitura`, que é
`USING (true) WITH CHECK (false)` — lê tudo, grava nada.

**Até onde essa proteção vai, dito com precisão.** A política recusa a escrita
de **todo papel sujeito a ela** — hoje `fretigate_app`, e qualquer papel que
venha depois. Ela **não** recusa a da conexão das migrations, que é o papel
`postgres` e ignora RLS por atributo; nem `ENABLE` nem `FORCE` mudam isso. É por
essa conexão que as 5.570 linhas entram.

Isso é desenho, não brecha, e a regra que o governa está no `CLAUDE.md` §9:
**nenhuma conexão que atende pedido de usuário ignora RLS** — comando de
operação (migration e seed) roda como `postgres`. O que separa os dois casos é
**quem chama**: o `fretigate_reversor` existe porque
`reverter_cadastro_incompleto` roda durante o pedido do usuário; a seed é
chamada por quem opera, ao publicar.

As duas cláusulas do `CLAUDE.md` §9 estão lá, sem exceção nenhuma. A forma óbvia
(`FOR SELECT USING (true)`) teria pedido exceção, porque política `FOR SELECT`
não aceita `WITH CHECK` — e a forma escolhida é mais rígida que ela, não mais
frouxa. Quem confere é `tests/municipios.test.ts`, com contraste.

**A seed é comitada, com procedência registrada** (`scripts/seed/`): de onde veio
o arquivo, data do download, licença e **quantos registros aquele download
trazia**. Ela **confere antes de gravar** e **recusa carregar** se algo falhar,
em vez de gravar dado ruim: UF entre as 27, nome não vazio, coordenada não nula,
não zerada e dentro dos limites do Brasil, e a contagem batendo com a que o
próprio arquivo declara, dentro de uma faixa de sanidade que pega arquivo
truncado.

**A conferência de contagem não usa 5.570 fixo**, e isso é de propósito:
município novo é criado por lei estadual, então o número muda de vez em quando.
Um número cravado no código faria a seed **parar de carregar** no dia em que o
IBGE mudasse a conta — o oposto do que ela existe para proteger. Quem manda é a
quantidade declarada junto do arquivo; trocar o arquivo é trocar os dois no
mesmo commit.

**A seed nunca roda em `postinstall`.** A Vercel roda `npm install` a cada
publicação: um `postinstall` tentaria conectar ao banco durante o build, e ou
quebra a publicação ou grava no banco errado. É comando explícito
(`npm run seed:municipios`), chamado à mão e por um passo próprio da esteira.

**A seed ATUALIZA o que mudou, não pula o que já existe.** Decidido pelo
fundador em 09/08/2026, e o motivo é que município é dado oficial: a fonte
manda. Só inserir e pular duplicados deixaria uma correção do IBGE — nome ou
coordenada — sem propagar nunca, e **ninguém ficaria sabendo**. Isso não é
hipótese: o cruzamento das duas fontes já achou um nome desatualizado
("Bom Jesus", hoje "Bom Jesus de Goiás").

Ela lê o que está no banco, compara, insere os novos, atualiza **só as linhas
que mudaram de verdade** e **relata cada uma**. Rodar de novo sem mudança na
fonte não escreve nada.

Três guardas, e nenhuma é opcional:

- **Teto de 100 alterações.** Acima dele a seed **não grava nada**, lista o que
  mudaria e exige `npm run seed:municipios -- --forcar`. A conferência de
  formato acima recusa arquivo **malformado**, mas não recusa arquivo **válido
  e errado** — edição antiga, download trocado —, e o sintoma desse é sempre o
  mesmo: muitas linhas mudando de uma vez. Correção real do IBGE é punhado.
  **Inserção não entra no teto**: a primeira carga são 5.570 de uma vez, e
  inserir nunca apaga nada.
- **`arquivado_em` nunca é tocado.** Recarregar a fonte não ressuscita município
  que alguém arquivou.
- **Município que sumiu da fonte é relatado, nunca apagado** (§7 do
  `CLAUDE.md`). Arquivar é decisão do fundador, não efeito de recarregar um
  arquivo.

**A seed não tem trava de banco**, ao contrário da suíte de testes
(`tests/guarda-de-banco.ts`), e isso é de propósito: ela **precisa** rodar em
produção — sem ela, o campo de município nasce vazio para o cliente pagante. O
que a torna segura em qualquer banco é nunca apagar e nunca sobrescrever em
massa sem autorização explícita.

### A busca de município

Os dois números abaixo foram decididos pelo fundador em 09/08/2026, na tarefa 1
do item 2. Estão aqui, e não só no código, porque valor que só existe em
comentário é valor que ninguém encontra quando precisa mudá-lo.

**Duas letras para começar a buscar.** Com uma letra só, "a" traz centenas de
municípios e nenhum é o que a pessoa quer — é ida ao banco a cada tecla, dentro
dos 30 segundos do §1, para devolver ruído.

E **não são três**, que seria o reflexo: na maioria das vezes **ninguém digita
aqui**, porque os destinos já usados com aquele cliente aparecem como chips.
Quem chega a digitar é o caso do destino novo — e com três letras existe um
instante de "não aparece nada" que confunde justamente quem já saiu do caminho
rápido.

**Cinco sugestões.** O número vem do teclado aberto: acima dele cabem umas cinco
linhas. Oito rolaria ou empurraria conteúdo, e **lista que precisa rolar
enquanto a pessoa digita é pior que digitar mais uma letra**.

> **Pendente de formalização pelo Design** em `docs/componentes.md`. É valor de
> tela, e o dono daquele documento é o Design (`CLAUDE.md` §13). O número já
> está decidido e construído; falta ele entrar no inventário.

### DistanciaRota
Cache. Calculada uma vez por par, nunca por frete.
`origem_municipio_id` · `destino_municipio_id` · `distancia_m` · `calculado_em`

### Cliente
`nome` · `documento` · `telefone` · `email` · `endereco` · `municipio_id` ·
`prazo_pagamento_dias` (nulo = herda da empresa) · `observacao`
**Só `nome` é obrigatório.**

**`observacao` existe na coluna, não em tela nenhuma** (tarefa 5, 10/08/2026).
Mesmo precedente de `categoria_cnh` (Motorista, abaixo) e do ano do caminhão
(Veiculo, abaixo): nenhum desenho — nem o protótipo de referência — inclui o
campo no formulário de cliente. Fica no banco como peso morto até um desenho
pedir por ele; nenhuma tela cria a leitura por analogia com a entidade.

**`municipio_id` fica sempre nulo** (tarefa 5, 10/08/2026). O texto de
`endereco` é guardado, mas nada resolve o município a partir dele: a função de
resolução (`src/lib/servicos/municipios.ts`) casa por nome **exato**, o
mecanismo certo para `Servico.origem_texto`/`destino_texto` (onde a pessoa
digita só o nome da cidade), não para um endereço completo. E nada no MVP lê o
município do cliente — a distância do frete vem de origem/destino do frete
(§9, `DistanciaRota`), não do endereço do cliente. Quando houver uso real, é
um campo próprio de cidade no formulário, não extração de endereço livre.

`documento` é CPF ou CNPJ, pessoa física ou jurídica — o cliente da
transportadora pode ser qualquer um dos dois. Regras de formato idênticas às
de `Empresa.cnpj` acima, e pela mesma razão: **guardar só letra e número,
maiúsculo, sem pontuação**, com CNPJ podendo trazer letra nas 12 primeiras
posições (formato alfanumérico da Receita) e CPF sempre 11 dígitos
numéricos. **Guardar nulo, nunca `''`.**

`documento` é **único por empresa quando preenchido**, mas só entre os
clientes **não arquivados** — a trava é `UNIQUE (empresa_id, documento) WHERE
arquivado_em IS NULL`, não uma restrição comum. Duas diferenças da regra de
`Empresa.cnpj`, e as duas têm motivo:

- **Aqui o arquivamento libera o documento; na Empresa, não.** O CNPJ da
  Empresa continua preso depois de arquivada porque a trava ali é
  anti-abuso — existe para impedir conta gratuita em série, e liberar no
  arquivamento reabriria o buraco. Aqui não há abuso a evitar: cliente
  arquivado que a pessoa tenta recadastrar é o caso comum, e recusar um
  registro que ela não enxerga mais na lista é o defeito, não a proteção.
- **Aqui é por empresa; na Empresa, é global.** Duas empresas diferentes
  podem ter o mesmo cliente cadastrado sem conflito — o RLS já as separa.

### Veiculo
`placa` · `apelido` · `tipo`
Só `apelido` **ou** `placa` é obrigatório.

**`tipo` é chip de escolha única, entre cinco: Toco · Truck · Bitruck ·
Carreta · Bitrem** (decisão do fundador, tarefa 6, 10/08/2026). Campo
opcional — quem tem caminhão fora da lista deixa vazio, e isso não é
degradação: nada no produto hoje consome este dado (não alimenta cálculo,
relatório, cobrança nem ordem), então forçar uma classificação errada custaria
mais do que deixar vazio. Sem opção "Outro" com campo de texto: seria
comportamento novo, exigiria desenho do Design, e o campo é preenchido umas
dez vezes na vida inteira de uma transportadora — não compensa.

O corte de cinco, e não outro número: três (Toco/Truck/Carreta) é pouco —
Bitruck é comum no segmento e Bitrem aparece em carga a granel no Nordeste.
Sete (incluindo VUC e 3/4) é demais — essas categorias são de entrega urbana,
e o público do produto faz frete regional e interestadual.

**Reexaminar esta lista no dia em que algo passar a consumir `tipo`** —
agrupamento por tipo em relatório de análise, por exemplo. Até lá, os cinco
valores acima são a lista inteira.

**Não tem `ativo`** (decisão de 09/08/2026, item 2). Sumir da lista é
`arquivado_em` preenchido — o único mecanismo, como a regra de negócio 4 já
descreve e como o **perfil do caminhão** oferece ("Arquivar caminhão", no fim).
Manter os dois seria **dois mecanismos para a mesma frase**, e dois mecanismos
para "sumiu da lista" divergem em algum filtro mais cedo ou mais tarde; hoje
nenhuma tela tem botão de desligar, então a coluna ficaria sem quem preencha e
sem quem leia. Se um dia aparecer a necessidade de desligar temporariamente
(caminhão na oficina), é **campo próprio, com motivo e período** — nunca um
`ativo` genérico.

**`ano` não existe**, e não é esquecimento: `docs/navegacao.md` descreve o
formulário de caminhão como "apelido + placa + tipo + ano", mas esse formulário
**nunca foi desenhado** — o próprio protótipo responde, ao tocar em Editar,
*"Editar caminhão — formulário ainda não desenhado"* — e o campo não aparece em
canto nenhum dele. Ver o `CLAUDE.md` §13: campo que só existe em documento de
tela é proposta, não decisão.

### Motorista
`nome` · `telefone` · `documento` · `veiculo_habitual_id`
**Só `nome` é obrigatório.**

`documento` segue exatamente a mesma regra de formato e de unicidade do
`documento` de Cliente acima, pelo mesmo motivo.

**Não tem `ativo`**, pela mesma razão do `Veiculo` acima — arquivar é o único
mecanismo.

**Não tem `categoria_cnh`** (decisão de 09/08/2026). Ela aparece na folha de
cadastro rápido do `docs/componentes.md`, mas não alimenta cálculo, relatório,
cobrança nem ordem — e essa folha existe justamente para pedir o mínimo durante
o lançamento, onde cada campo briga com a meta de 30 segundos.

### TipoOperacao
`nome` · `slug` · `ativo` · `ordem`
Toda empresa nasce com `Frete` ativo. `Reboque`, `Guincho` e `Mudança` existem
inativos.

**Aqui o `ativo` fica, e não é inconsistência com `Veiculo` e `Motorista`, que
não têm.** Ali `ativo` seria estado de um registro do usuário — a mesma coisa
que arquivar diz. Aqui ele é outra coisa: **quais ramos do produto estão
ligados** para aquela empresa. É configuração de escopo, não arquivamento, e é
o que permite o `tipo_operacao` existir no modelo desde já com o MVP entregando
só a experiência de transportadora de carga (`CLAUDE.md` §12).

**Toda empresa nasce com os quatro, na mesma transação que cria a Empresa.**
Não é um passo seguinte: se fosse, uma falha no meio deixaria empresa sem tipo
nenhum, e o primeiro frete não teria o que escolher num campo obrigatório
(§4.1). Quem faz é `src/lib/servicos/cadastro.ts`.

### Servico
A entidade central. Chama-se `Servico`, não `Frete`, para comportar outros ramos.
Na interface do MVP aparece como "Frete".

`numero` (sequencial por empresa) · `tipo_operacao_id` · `cliente_id` ·
`veiculo_id` · `motorista_id` · `data_servico` (pode ser futura) ·
`origem_texto` · `origem_municipio_id` · `destino_texto` ·
`destino_municipio_id` · `carga_texto` · `carga_categoria` · `valor` ·
`km` (opcional) · `distancia_m` (derivada) · `status_operacional` ·
`origem_lancamento` (`manual` | `importacao`) · `ordem_enviada_em` ·
`comprovante_url` · `criado_por_usuario_id`

`comprovante_url` guarda o **caminho** dentro do balde privado `comprovantes`
(item 5, Tarefa 4), nunca uma URL — quem lê pede uma URL assinada nova a cada
vez (`gerarUrlComprovante`, `src/lib/servicos/comprovantes.ts`), com
**60 segundos de validade**. O número é curto de propósito e por um motivo
só: a URL existe para a tela carregar a imagem na hora, nunca para ficar
guardada ou compartilhada — 60s é tempo de sobra para isso e pouco tempo de
sobra para qualquer outro uso. Decisão do fundador, 25/08/2026.

**Obrigatórios:** `cliente_id`, `valor`, `data_servico`, `tipo_operacao_id`.

`origem_texto` e `destino_texto` guardam sempre o que o usuário digitou. O
`municipio_id` é resolvido quando possível, **sem bloquear o salvar**.

### TituloReceber
**Entidade própria, não campo no serviço.**
`servico_id` · `cliente_id` · `valor` · `vencimento` ·
`forma_pagamento_prevista` (`boleto` | `outro`) · `status` (`aberto` | `pago` |
`cancelado`) · `relatorio_id` · `integral`

`integral` diz se **este título cobre o valor inteiro do frete**, em oposição
a uma fração dele — adiantamento ou saldo. Um frete tem no máximo um título
integral; pode ter qualquer número de títulos não integrais. O campo descreve
o título, não como ele nasceu: "Já recebi" sempre cria um título integral,
mas qualquer outro caminho que também cubra o frete inteiro (sem passar por
adiantamento) é igualmente integral.

**O que entrou de fato não mora aqui** — ver `Recebimento`, abaixo (item 6,
Tarefa 3). Até essa tarefa, três campos escalares (`valor_recebido` ·
`data_pagamento` · `forma_pagamento`) guardavam o recebimento direto nesta
entidade; saíram porque um título pode ser recebido em mais de uma vez
(adiantamento + saldo, ou dois parciais), e um campo único sobrescreveria o
recebimento anterior sem nada avisar (`CLAUDE.md` §9).

### Recebimento
Um recebimento de verdade — item 6, Tarefa 3. Entidade própria, não campo em
`TituloReceber`: cada recebimento é um fato que aconteceu numa data, com uma
forma, e um título pode acumular vários.
`titulo_id` · `valor` · `data` · `forma` · `usuario_id`

`forma` é texto livre, sem inventário fechado no banco — a lista fechada
(Pix · Dinheiro · Transferência · Boleto · Outro) é da interface. Nasce nulo
em "Já recebi", que não pergunta isso.

A soma dos recebimentos de um título nunca passa do valor dele — garantido
pelo banco (função `registrar_recebimento`), não por checagem em código.

`data` nunca é futura — recebimento é registro de um fato que já aconteceu,
nunca uma data que ainda vai chegar. Diferente de `TituloReceber.vencimento`,
que pode ser passado ou futuro de propósito.

### CobrancaEnviada
Histórico. Sem isso, dois usuários cobram o mesmo cliente na mesma semana.
`titulo_id` · `usuario_id` · `enviado_em`

### Despesa
`data` · `categoria` · `valor` · `descricao` · `veiculo_id` · `servico_id`

### Relatorio
`cliente_id` · `numero` · `data_inicial` · `data_final` · `valor_total` ·
`gerou_cobranca` · `gerado_em` · `pdf_url`

### Novidade / NovidadeLeitura
`Novidade`: `titulo` · `texto` · `acao_rotulo` · `acao_url` · `publico_alvo` ·
`ativa_de` · `ativa_ate`
`NovidadeLeitura`: `novidade_id` · `empresa_id` · `lida_em` · `dispensada_em`

### Afiliado / Indicacao
`Afiliado`: `nome` · `email` · `codigo` · `percentual_comissao` · `chave_pix`
`Indicacao`: `afiliado_id` · `empresa_id` · `status` · `data_conversao` ·
`comissao_valor` · `comissao_paga_em`

---

## 7. Estados

### Serviço — operacional
```
em_andamento  →  finalizado
      ↓
  cancelado
```
Frete criado como ordem permanece `em_andamento` até ser finalizado.

### Situação financeira — DERIVADA, nunca armazenada

**Não crie campos `faturado` e `quitado` no serviço.**

| Situação | Como se calcula |
|---|---|
| A faturar | Não existe título ativo para o serviço |
| Faturado | Existe título ativo, nenhum centavo entrou ainda |
| Parcial | Algum dinheiro já entrou, e ainda falta |
| Quitado | Todos os títulos ativos do serviço estão pagos |

**Título ativo** = não arquivado (§7 do `CLAUDE.md`, "nada é apagado") **e**
`status !== "cancelado"`. Um título cancelado não conta para nada — mesmo
raciocínio de um arquivado: se todos os títulos do serviço estiverem
cancelados, o serviço volta a **A faturar**, porque de fato não há cobrança
em aberto.

**A ordem de avaliação importa, e é esta — decidido em 20/08/2026, achado do
`/revisar` no plano do item 4** (a primeira redação checava "existe título
não pago" antes de "algum dinheiro entrou", e isso nunca deixava "Parcial"
ser alcançado):

1. Nenhum título ativo → **A faturar**.
2. Todos os títulos ativos pagos (e existe ao menos um) → **Quitado**.
3. Algum dinheiro já entrou — existe título ativo **pago** ou com algum
   `Recebimento` registrado contra ele — e ainda falta pagar algo →
   **Parcial**. Cobre tanto o recebimento parcial de um único
   título quanto o frete com mais de um título (ex.: adiantamento pago +
   saldo em aberto) — dizer "Faturado" quando dinheiro já entrou esconderia
   exatamente o que a situação existe para mostrar.
4. Nenhum dinheiro entrou (nenhum título ativo pago nem parcialmente
   recebido) → **Faturado**.

**Frete cancelado (`Servico.status_operacional`) não conta nas somas
derivadas dele** — decisão do fundador, 20/08/2026, achado do segundo
`/revisar` no plano do item 4: "já rodado" (resumo do cliente), km e R$/km
(resumo do caminhão), e fretes/valor transportado (resumo do motorista) todos
excluem frete cancelado. Somar infla o número que decide preço.

**A razão é "não vai acontecer", não "ainda não aconteceu"** — corrigido em
20/08/2026, achado do quinto `/revisar`: a redação original dizia "ele não
aconteceu", o que também valeria, ao pé da letra, para um frete
`em_andamento` (uma ordem lançada para daqui a alguns dias também "ainda não
aconteceu"). Não é essa a régua. `em_andamento` **conta** nas somas — é a
tese do produto (`CLAUDE.md` §1): o frete nasce no momento da ordem, e se a
ordem lançada não contasse, o painel ficaria vazio até alguém voltar para
marcar como finalizado, que é exatamente o trabalho de reconstrução que o
produto existe para eliminar. `cancelado` é diferente: ele não vai
acontecer, e é só por isso que sai das somas.

**Continua aparecendo na lista e no histórico do perfil** — sai das somas,
não das telas, porque `CLAUDE.md` §7 ("nada é apagado") também vale para o
que um frete cancelado já foi. Como ele é exibido na linha (etiqueta
própria, cor do texto, ou outro tratamento) ainda não está definido — não
existe hoje uma etiqueta de "cancelado" em `docs/estilo.md`; pedido registrado
para o Design junto do plano do item 4, mesmo padrão da cor de "Faturado".

Esta regra é sobre `status_operacional`, um campo diferente da situação
financeira acima (que deriva de `TituloReceber.status`) — um frete pode estar
cancelado e ainda ter título associado; a situação financeira dele continua
calculada normalmente pelas quatro regras acima, só as somas por período é
que excluem o frete.

**Frete arquivado com título ainda em aberto não conta em "A receber" nem em
"Vencido" (tela de Cobranças, item 6, Tarefa 3)** — decisão do fundador,
26/08/2026, achado do terceiro `/revisar`: `arquivarServico` não trava nem
toca o título, então um frete arquivado depois de faturado continuava
contando dinheiro em aberto numa tela que existe para responder "quanto há a
receber", e continuava oferecendo a ação de registrar recebimento contra ele.
Palavras do fundador: "não é botão inconveniente, é número errado."
`resumoDeCobrancas`/`listarCobrancas` (`src/lib/servicos/cobrancas.ts`)
excluem pelo `servico_id` do título.

**Não se estende a "Recebidas" nem a "Recebido no mês"** — dinheiro que já
entrou continua tendo entrado, mesmo que o frete seja arquivado depois
(`CLAUDE.md` §7, nada é apagado). É a mesma distinção do parágrafo acima
("sai das somas, não das telas/histórico"), aplicada ao lado já recebido em
vez de ao lado cancelado.

### Como um serviço vira título
1. **Automático:** ao gerar relatório com a marcação de cobrança ativa.
   Vencimento = data do relatório + prazo do cliente.
2. **Manual:** título criado direto no serviço (adiantamento, ou "Já recebi").

---

## 8. Regras de negócio

1. Nenhuma consulta ao banco sem filtro por `empresa_id`.
2. `numero` do serviço e do relatório são sequenciais **por empresa**, a partir
   de 1. Não existe numeração inicial configurável.
3. Serviço com título pago não é excluído. Exclusão é arquivamento.
4. Cliente, veículo ou motorista com serviço vinculado é arquivado — some das
   listas de seleção, permanece no histórico.
5. Título pago não é editado. Para corrigir, estorna e cria outro.
6. Relatório gerado guarda os valores da época.
7. Importação nunca grava sem confirmação do usuário.
8. Assinatura vencida bloqueia escrita, mantém leitura e exportação por 90 dias.
9. **O sistema nunca gera relatório, nunca envia mensagem e nunca fatura por
   conta própria.**
10. Número derivado de dado incompleto não é exibido como se fosse completo:
    Lucro sem despesa e R$/km sem km mostram convite; com dado parcial, exibem a
    cobertura.
11. Cobrança marcada como boleto não gera pendência nem ação de cobrar.
12. **Frete com título ativo trava a edição de `valor` e `cliente_id`** — são
    os dois campos que o título copia do serviço ao nascer (`TituloReceber.
    valor`/`cliente_id`, "Já recebi"); deixar os dois livres deixaria o frete
    dizer um valor e o título registrar outro, sem nada acusar a diferença.
    Os demais campos (caminhão, motorista, data, origem, destino, carga, km)
    continuam livres — não têm reflexo no título. Destrava quando todos os
    títulos do frete estão cancelados (mesmo critério de "título ativo" do
    §7): sem título ativo, não há dinheiro amarrado ao valor antigo. Para
    corrigir com o título ainda ativo, o caminho é estornar — item 6, ainda
    não construído. Decisão do fundador, 22/08/2026, achada ao planejar a
    edição de frete (item 4, tarefa 4).

---

## 9. Ordem de construção

1. Base: empresa, usuário, login, **isolamento por `empresa_id`** ✔ concluído
2. Cadastros: cliente, veículo, motorista, tipo de operação, municípios
3. **Lançamento de frete** — cronometrar contra os 30 segundos
4. Lista de fretes e detalhe do frete
5. Ordem de serviço: enviar ordem, finalizar, comprovante
6. Título a receber e Cobranças, incluindo recebimento parcial e boleto
7. Relatório do cliente, PDF e compartilhamento
8. Dashboard
9. Cobrança por WhatsApp e os dois modelos de mensagem — **parcialmente no MVP**
10. Configurações, conta da empresa e usuários
11. Despesas
12. Distância por rota e R$/km — *depois do lançamento*
13. Assinatura, plano gratuito, limites e tela de limite
14. Primeiro acesso — *depois do lançamento*
15. Importação de fretes — *depois do lançamento* *(depende da decisão de modelo)*
16. Novidades — *depois do lançamento*
17. Afiliados — *depois do lançamento*

Nada de 5 em diante começa antes de 1 a 4 funcionar de verdade.

### O que é MVP, decidido em 09/08/2026

**São 10 itens a construir** — o item 1 já fechou, então sobram **2, 3, 4, 5, 6,
7, 8, 10, 11 e 13**.

**Despesas (item 11) entra**, e o motivo fica escrito: é o item mais barato da
ordem de construção — lista, formulário e filtros, sem integração e sem decisão
em aberto —, e **sem ele o card de Lucro nunca sai do estado de convite**,
deixando a dashboard com dois dos quatro cards vazios. O usuário real também
listou o valor líquido entre as informações principais.

**A distinção entre os dois cards em estado de convite**, para não virar dúvida
depois: **Rodagem** no estado de convite é aceitável, porque depende de um
**campo opcional que o usuário preenche** (o km); **Lucro** no estado de convite
não era, porque dependia de uma **funcionalidade que não existiria**. Essa
diferença é o que trouxe Despesas para o MVP e o que mantém o item 12 fora.

**Item 9 é parcialmente MVP** — não trate o item inteiro como adiado. Entram no
MVP as ações **Enviar ordem no WhatsApp** (é a tese do produto: o frete nascendo
no momento da ordem) e **Cobrar no WhatsApp** (é a ação principal da tela de
Cobranças), as duas com **texto padrão fixo, não editável**. Sai só a **tela de
editar os dois modelos**. As duas ações são construídas dentro dos itens 5 e 6,
onde as telas já as preveem — por isso a conta de 10 itens não muda.

Três exigências para quando os itens 5 e 6 chegarem:

1. **Os dois textos padrão passam pelo fundador antes de virar código.** Eles
   saem em nome da empresa do cliente e serão lidos por cliente e motorista de
   verdade: curtos, diretos, no jeito de quem manda mensagem de trabalho pelo
   WhatsApp, **nunca com cara de sistema**. O da ordem **não traz o valor do
   frete** (§4.2).
2. **Os textos moram num arquivo só** (`src/lib/servicos/mensagens.ts` — é onde
   o `CLAUDE.md` §6 manda regra de negócio morar), já com
   as variáveis no formato final — `{cliente}` `{valor}` `{vencimento}`
   `{rota}` `{empresa}` `{motorista}` `{carga}` `{origem}` `{destino}`
   `{data}` `{caminhao}` `{pix}`. Quando a tela de edição entrar, é **ligar o
   campo ao que já existe**, não refazer.

   `{caminhao}` entrou em 23/08/2026, planejamento do item 5: o texto da
   ordem de serviço precisa identificar o caminhão para o motorista (nome +
   placa, mesmo formato de `nomeCaminhao`), e não havia variável para isso
   na lista original.

   `{pix}` entrou em 26/08/2026, planejamento do item 6, pelo mesmo motivo e
   por decisão do fundador: a mensagem de cobrança precisa dizer **como
   pagar** — sem a chave, o cliente lê o valor e o vencimento e não sabe para
   onde mandar o dinheiro, que é o pior defeito possível numa cobrança. Sai
   de `Empresa.chave_pix`, e o bloco inteiro some quando a empresa não tem
   chave cadastrada (`docs/planos/item-6-titulo-e-cobrancas.md`, decisões 1
   e 2).

   **Lacuna, achada no `/revisar` da Tarefa 2 do item 5 (23/08/2026):**
   `montarMensagemOrdem` (a primeira função de `mensagens.ts` a existir de
   verdade) recebe parâmetros tipados (`origem`, `destino`, `carga`,
   `caminhao`, `diaEData`), nunca o marcador literal `{origem}` dentro do
   texto — a montagem já resolve o valor antes de chamar a função (`CLAUDE.md`
   §6: nunca formata dentro da função de montagem). Não está escrito se
   "formato final" acima exige o marcador `{}` sobrevivendo no texto (para o
   editor do item 9 fazer busca-e-substituição em cima dele) ou só o
   **conjunto de variáveis aceitas** — o que `montarMensagemOrdem` já cumpre.
   Registrado para decidir quando o item 9 (tela de editar o modelo) for
   planejado; não bloqueia a construção deste item.
3. **`telefone` é texto livre, sem máscara nem validação, nos dois cadastros
   que o alimentam (cliente e motorista) — hoje.** Confirmado no código: o
   schema de entrada (`z.string().trim()`, sem regra de formato) em
   `src/app/(app)/clientes/acoes.ts:35,83` e
   `src/app/(app)/motoristas/acoes.ts:36,69`, e a gravação
   (`dados.telefone?.trim() || null`, sem checagem) em
   `src/lib/servicos/clientes.ts:60` e `src/lib/servicos/motoristas.ts:66`.
   Achado na Tarefa 6 do item 4, terceiro commit (22/08/2026), auditando a
   lacuna "telefone tocável". **Isto é maior que o toque na tela: "Enviar
   ordem no WhatsApp" só chega ao motorista de verdade se o número salvo for
   um número de verdade, e hoje nada garante isso** — quem planejar o item 5
   trata como parte do escopo, não como detalhe a resolver na hora.

   **A regra de formato já existe por escrito — só não está implementada.**
   `docs/componentes.md` §12 ("Folha do campo que falta") já define TELEFONE
   como "10 ou 11 dígitos com DDD; DDD ≥ 11", com as três mensagens de erro
   ("Faltam dígitos...", "Número comprido demais...", "Esse DDD não
   existe.") — desenhado para validar antes de "Cobrar no WhatsApp" e
   "Enviar ordem", os dois gatilhos que a mesma folha já prevê. **Em
   22/08/2026, quando este parágrafo foi escrito, nenhum dos dois estava
   construído** (busca no `src/` não encontrava a folha nem as mensagens),
   então a regra não protegia nada — mas ela existia, e corrigir isto aqui
   evitou a próxima sessão decidir de novo o que já tinha sido decidido.
   **Desde a Tarefa 1 do item 5 (23/08/2026) isso mudou, e mudou de novo na
   Tarefa 2 (23/08/2026) e na Tarefa 5 do item 6 (27/08/2026):** a folha e a
   validação existem e protegem o gatilho de telefone tocável nos perfis
   (Tarefa 1), o gatilho "Enviar ordem" no detalhe do frete (Tarefa 2,
   `AcaoOrdemDeServico.tsx`) **e** o gatilho "Cobrar no WhatsApp" em
   Cobranças (Tarefa 5 do item 6, `AcaoCobrarNoWhatsApp.tsx`) — os três
   gatilhos que este parágrafo previa estão construídos. ~~O que falta
   decidir é só o DDI~~ — também resolvido na Tarefa 1: fixo em 55 (ver a
   lista logo abaixo).

   Duas coisas ficavam pendentes até o item 5 chegar — **as duas resolvidas
   na Tarefa 1 do item 5 (23/08/2026)**:
   - ~~DDI do link de WhatsApp~~ — fixo em 55, nunca perguntado (produto é só
     Brasil, `CLAUDE.md` §1/§12). `linkWhatsapp` em `src/lib/utils/telefone.ts`.
   - ~~Ligar a validação já escrita ao "telefone tocável abre a conversa"~~
     nos perfis — `normalizarTelefone` (mesmo arquivo) implementa a regra ao
     pé da letra, e `FolhaDeTelefone`/`TelefonePerfil`
     (`src/components/ui/`) são o primeiro consumidor real da "Folha do
     campo que falta" descrita em `docs/componentes.md` §12.

   "Telefone tocável abre a conversa", pendente nos perfis de Cliente (desde
   a Tarefa 5 do item 2, que construiu o perfil sem tratamento especial de
   telefone — sem bullet própria no plano; só nomeada quando a Tarefa 7 do
   mesmo item disse "mesma lacuna do Cliente" sobre a versão do motorista,
   `docs/planos/item-2-cadastros.md:336`, corrigindo aqui a citação errada
   de linha para o perfil de Motorista) e Motorista (desde a tarefa 6 do
   item 4, terceiro commit), **também resolvido na
   mesma Tarefa** — telefone válido vira link de verdade para o WhatsApp;
   ausente ou inválido abre `FolhaDeTelefone` em vez de navegar ao
   formulário. Só o terceiro ponto que motivou este parágrafo — "Enviar
   ordem no WhatsApp" no detalhe do frete, com a mensagem pronta — segue
   pendente, para a Tarefa 2 do item 5
   (`docs/planos/item-5-ordem-de-servico.md`).

   **Onde a validação de formato do telefone se aplica — decisão do
   fundador, 23/08/2026, na revisão da Tarefa 1.** A pergunta surgiu ao
   decidir se `salvarTelefoneClienteAction`/`salvarTelefoneMotoristaAction`
   (as ações novas que a Tarefa 1 construiu para a folha) deviam ser
   substituídas pelas ações já existentes (`editarClienteAction`/
   `editarMotoristaAction`, do formulário de edição normal) — o que exigiria
   validar telefone ali também. A resposta:

   - **No cadastro** (criar cliente/motorista) **e na edição do próprio
     campo telefone**, o valor precisa sair válido — `normalizarTelefone`
     recusa, com o erro no campo, igual à folha.
   - **O que já está salvo aceita, mesmo inválido.** Abrir o cadastro para
     corrigir o nome e o sistema recusar por causa de um telefone antigo que
     a pessoa nem tocou seria punir por dado antigo — mesmo princípio já
     aplicado no Cadastro rápido (`docs/componentes.md` §11): "a falta
     aparece no momento em que atrapalha, não antes."
   - **A cobrança de verdade continua sendo a Folha do campo que falta**, no
     momento de usar (telefone tocável nos perfis, Enviar ordem e Cobrar no
     WhatsApp, todos já construídos) — não o formulário de cadastro.

   **Não construído nesta tarefa.** `criarClienteAction`/`editarClienteAction`
   e os equivalentes de motorista continuam sem validar telefone hoje — a
   regra acima é a decisão de produto para quando alguém construir essa
   validação nos dois formulários, não construída na Tarefa 1 (que só
   resolveu o gatilho da folha). Registrado aqui para não decidir de novo.

**Ficam para depois do lançamento:** 12, 14, 15, 16, 17, e a tela de edição de
modelo do item 9.

### Por que o item 12 pode esperar sem perder nada

**Distância e R$/km são deriváveis retroativamente sobre todo o histórico.**
Origem e destino são guardados como **referência de município** (§6), e o valor
do frete também — então o dia em que o item 12 entrar, ele **nasce cheio, não
vazio**. Ninguém precisa antecipá-lo, e ninguém precisa de campo novo no frete
para preservar o dado.

**A parte irrecuperável, e por isso é exigência dura dos itens 2 e 3:** origem e
destino **precisam resolver para município de verdade**, não ficar como texto
livre. Se ficarem só como texto, nada é derivável — nem depois. Guardar o texto
original continua obrigatório (§6, `Servico`); o que não pode faltar é a
resolução ao lado dele.

### O que o corte da importação deixa em tela

**A importação (item 15) está adiada, não removida** — volta depois do
lançamento. Isso importa porque ela continua **desenhada em pelo menos três
lugares**, e cada um deles viraria tela apontando para nada se ninguém
registrasse o corte:

| Onde | O que está desenhado | O que fazer enquanto não voltar |
|---|---|---|
| **Dashboard**, cartão escuro (§4.6) | atalho **Importar fretes**, ao lado de Gerar relatório | o atalho não nasce; o cartão fica com um só |
| **Mais** (§4.7) | linha **Importar fretes**, em FERRAMENTAS | a linha não nasce — vale a regra de que Mais só tem linha com destino |
| **Meus fretes**, estado vazio | oferece a importação como **saída principal** | **precisa de convite novo** — ver abaixo |

**O estado vazio de Meus fretes é o único que não se resolve apagando uma
linha.** Ele existe para dar o próximo passo a quem ainda não tem frete nenhum,
e hoje esse passo é "trazer os fretes que já fiz". Sem a importação, a tela
ficaria sem saída — que é exatamente o defeito que o `CLAUDE.md` §8 nomeia
("estado vazio é convite para agir, nunca ilustração decorativa"). O convite
passa a ser **lançar o primeiro frete**. Já pedido ao Design.

Quando o item 15 voltar, as três superfícies voltam com ele: o atalho, a linha
e a importação como segunda saída do estado vazio — sem redesenhar nada, porque
o desenho continua existindo.

### A medição que o item 3 precisa entregar

**Quantos textos de origem/destino ficam sem município resolvido.** A medição
é do **item 3**, não do 2: ela mede fretes lançados, e fretes só existem a
partir do item 3. O item 2 entrega a **porta única** por onde texto vira
município (`resolverMunicipio`, `src/lib/servicos/municipios.ts`) — é nela que
a medição se pluga.

- **A unidade é o campo, não o frete.** Um frete tem origem e destino, e são
  problemas diferentes: a origem vem **pré-preenchida** com a do último frete
  lançado (§4.1), o destino é **digitado**. Contar "o frete" como uma falha só
  esconde qual dos dois é o problema — um frete com origem resolvida e destino
  ambíguo tem um acerto e uma falha, não uma falha genérica. Corrigido em
  14/08/2026: a primeira versão deste documento contava por frete; a
  implementação (`src/lib/servicos/medicao-municipios.ts`) sempre contou por
  campo, e o texto foi corrigido para bater com a decisão certa, não a
  implementação revertida.
- **Limite: acima de 10%** dos campos com texto sem município resolvido. Uma em
  cada dez rotas já distorce o R$/km quando o item 12 nascer, e é cedo o
  bastante para corrigir antes de o histórico ficar grande.
- **Piso de 20 campos com texto elegíveis.** Abaixo disso, um texto não
  resolvido vira porcentagem alta sem significar nada. Como a maioria dos
  fretes preenche origem e destino, isso costuma corresponder a pouco mais de
  10 fretes lançados — mas quem manda é a contagem de campos, não de fretes.
- **O aviso mostra quais textos não resolveram**, não só o número. "12% sem
  município" não diz o que fazer; "12%, e Juazeiro do Norte e Picos aparecem
  mais" diz onde a resolução está falhando.
- **A medição separa os dois motivos de não resolver**, e isso é obrigatório.
  Decidido pelo fundador em 09/08/2026: "12% não resolvido" sozinho não diz o
  que consertar, porque os dois casos pedem correções opostas.

  | Motivo | O que aconteceu | O que consertar |
  |---|---|---|
  | **ambíguo** | o texto casa com vários municípios ("Bom Jesus") | **a tela.** A lista de sugestões mostra a UF, então no fluxo normal a pessoa escolhe entre "Bom Jesus/GO" e "Bom Jesus/PI" e a ambiguidade se resolve sozinha. Sobrar ambíguo quer dizer que **a sugestão não chamou atenção** |
  | **não encontrado** | o texto não casa com nada | **o dado ou a normalização.** Erro de digitação, apelido local ("Juá"), ou a função de busca falhando |

  `resolverMunicipio` já devolve o motivo (`resolvido`, `ambiguo`,
  `nao_encontrado`) desde o item 2 — a medição do item 3 só precisa contar.
- **Só entra na conta quem TEM texto.** Decidido pelo fundador em 09/08/2026,
  sobre frete — a unidade virou campo em 14/08/2026 (acima), mas a decisão em
  si não mudou: campo vazio **nunca teve o que resolver**, e contá-lo faria o
  indicador subir sozinho, sem que nada estivesse falhando — o pior tipo de
  número, porque manda consertar o que não está quebrado. Campo vazio não é
  resolução malsucedida: é ausência de tentativa.

Motivo, registrado junto: quando o número sobe, **o defeito está na resolução,
não no usuário** — é ela que precisa ser corrigida. Melhor descobrir com dez
fretes do que com mil.

**Duas ferramentas, dois números, e eles não são a mesma coisa.**

- **Uso real** — `npm run medir:municipios -- --empresa=<id>`
  (`scripts/medir-municipios.mts`). Roda contra os fretes de uma empresa de
  verdade. É o único número que fala de uso real, e só existe quando existir
  cliente.
- **Regressão da resolução** — `tests/regressao-resolucao-municipios.test.ts`,
  dentro de `npm test`, a cada execução da esteira. Roda contra uma **lista
  fixa** de 41 textos, escrita uma vez em 14/08/2026 para representar como
  gente de verdade digita (nome sem acento, formato "Cidade/UF", abreviação,
  erro de digitação comum, nome ambíguo em vários estados) — nunca dado de
  cliente, porque o projeto de teste não recebe isso (`CLAUDE.md` §5). A
  lista não muda para o teste ficar mais fácil ou mais difícil: mudar a lista
  é mudar a régua. O que ela mede é se `resolverMunicipio` piorou desde
  ontem, não como as empresas estão digitando hoje.

**Os 10% do limite acima são sobre uso real — a lista fixa usa outro
critério, e é de propósito.** Corrigido em 14/08/2026: a primeira versão
reaproveitava o mesmo limite de 10% para a lista fixa, e numa lista de 41
itens isso não detecta quase nada — uma falha nova sobe de 3 para 4 (9,8%),
ainda abaixo do limite; só a partir de duas falhas novas o aviso dispara. Uma
lista fixa não precisa de limiar percentual: o número de falhas esperadas é
**conhecido** (3, hoje), e qualquer desvio — para mais ou para menos — é
regressão ou correção na resolução, não ruído de amostra. O critério da lista
fixa é **desvio do esperado**, não percentual; `console.warn`, nunca falha o
build (decisão do fundador, 14/08/2026: esteira vermelha por indicador de
qualidade de dado ensina a ignorar vermelho).

Quem ler o aviso da esteira daqui a três meses e achar que é dado de cliente,
ou achar que segue os mesmos 10% do uso real, vai tirar a conclusão errada —
por isso a distinção fica escrita aqui, não só no comentário do teste.

---

## 10. Decisões em aberto

Ver §14 do CLAUDE.md.

---

## 11. Fase 2 — decidido, não construído agora

Registrado para não se perder, e para a tela de Lançar frete (§4.1) não
nascer de um jeito que feche a porta para isto depois. Nada aqui entra na
ordem de construção do §9.

### 11.1 Sugestão de valor por R$/km

Segunda fonte para o mecanismo de sugestão do campo Valor em §4.1 — não é
funcionalidade nova, é uma segunda fonte para um mecanismo que já existe.
Distância e R$/km já estão no modelo de dados (`DistanciaRota`, §6); o campo
de valor já tem o mecanismo de sugestão tocável.

Quando origem e destino estiverem definidos e não houver histórico daquele
trecho com aquele cliente, o campo de valor sugere um preço calculado pelo
R$/km derivado do histórico do próprio usuário — **nunca** de uma tabela que
ele precise cadastrar e manter.

Ordem das sugestões: última vez neste trecho → pelo seu R$/km → nenhuma.

### 11.2 Mapa do mês

Fora da tela de Lançar frete, definitivamente. Ela tem meta de 30 segundos
(CLAUDE.md §1), e mapa carregando ali cobra peso e espera contra a única
métrica que manda no produto. Mapa de uma rota também mostra ao dono o que
ele já sabe: ele dirige aquele trecho toda semana.

O que entra em fase 2 é outro mapa: o **do mês** — todas as rotas rodadas no
período, desenhadas juntas, na dashboard ou em tela própria. Isso ele nunca
viu. É o formato da operação dele: para onde a frota está puxando, qual
cliente concentra o movimento.

**Razão comercial, parte da decisão:** a venda é 100% por anúncio e sem
demonstração — o criativo é a experiência do produto para quem compra. Uma
linha entre duas cidades não impressiona; uma teia de rotas cobrindo o
estado, com o faturamento do mês ao lado, sim.

**Caminho de validação:** o mapa do mês pode ser testado como criativo antes
de existir no produto — desenhado no Design e usado em anúncio. Se converter
melhor que os outros criativos, vale construir; se não, economizou o
trabalho.
