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
  sozinho.**

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
  enviada), fretes a faturar, cobranças vencidas, e sugestão de relatório quando
  um cliente acumula fretes não faturados de um mês fechado. **O sistema nunca
  gera relatório sozinho.**
- **Barras dos últimos 6 meses**, sem eixo, legenda ou grade. **Tocáveis:** cada
  mês leva a Fretes filtrado naquele período.

**Sem filtro de data na dashboard** — "a receber" e "vencido" são situação
atual, e um filtro tornaria o significado deles ambíguo.

**Nada de pizza, medidor ou meta.**

### 4.7 Cadastros

**Clientes, Caminhões e Motoristas** seguem o mesmo padrão: lista com busca e
**seletor de ordenação**, perfil e formulário. Acessíveis por "Mais" e, no caso
do cliente, tocando o nome em qualquer linha de frete ou cobrança.

Ordenações: clientes por mais recente · maior valor em aberto · maior valor
total. Caminhões e motoristas por mais recente · mais fretes · maior valor
rodado. A linha mostra o dado da ordenação escolhida.

**Perfil do cliente:** nome e cidade; resumo com **já rodado · a receber ·
vencido · recebido no período**, com filtro de período que recalcula os quatro,
e os três primeiros tocáveis para as listas filtradas; dados cadastrais;
histórico de fretes. Ações: **Gerar relatório** (principal), **Editar**
(cabeçalho), **Cobrar no WhatsApp** (só com valor em aberto), e **Lançar frete
para este cliente** no fim do histórico.

**Perfil do caminhão:** apelido, placa, tipo; **km no período e R$/km**,
exibidos só quando houver km preenchido; histórico. Ação: lançar frete com este
caminhão.

**Perfil do motorista:** telefone tocável, caminhão habitual, resumo e
histórico. Ação: lançar frete com este motorista.

**Prazo de pagamento** tem três níveis: configurações da empresa → cadastro do
cliente → edição na hora de faturar. Vazio no cliente significa herdado, e a
interface mostra a origem. Rótulo: "Prazo de pagamento", com a explicação de
que é usado para calcular o vencimento ao faturar.

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
`Reply-To` aponta para `contato@` no **domínio raiz**, redirecionado pelo
registrador para a caixa de quem lê.

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

---

## 5. Fora do escopo do MVP

Ver §12 do CLAUDE.md.

---

## 6. Entidades

Toda tabela tem `id`, `empresa_id`, `criado_em`, `atualizado_em` e
`arquivado_em` (nulo = ativo). Só `Empresa` e `Municipio` não têm `empresa_id`.
Dinheiro em **centavos**; distância em **metros**.

### Empresa
`nome_fantasia` · `razao_social` · `cnpj` · `telefone` · `email` · `endereco` ·
`municipio_id` · `logo_url` · `chave_pix` · `dados_bancarios` ·
`patio_endereco` · `patio_municipio_id` · `prazo_padrao_dias` ·
`modelo_mensagem_cobranca` · `modelo_mensagem_ordem` · `plano` ·
`periodicidade` · `status_assinatura` · `afiliado_id` · `origem_cadastro` ·
`origem_declarada` · `termos_aceitos_em` · `termos_versao`

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
- **Guardar só os dígitos.** Sem normalizar, `12.345.678/0001-90` e
  `12345678000190` passam as duas e a trava não vale nada.
- **Guardar nulo, nunca `''`.** Vazio colide com vazio; nulo não colide com
  nulo. Duas empresas sem CNPJ preenchido são normais.
- Mensagem de erro: **"já existe uma conta com esse CNPJ"**. Nunca o erro do
  banco.

**`termos_aceitos_em` e `termos_versao`** são obrigatórios — o aceite acontece
no cadastro, então não existe Empresa sem aceite.

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

### Convite
`email` · `nome` · `papel` · `token` · `status` · `enviado_em` · `aceito_em`

### Municipio
Tabela global, base do IBGE, ~5.570 registros.
`codigo_ibge` · `nome` · `uf` · `nome_normalizado` (para busca sem acento)

### DistanciaRota
Cache. Calculada uma vez por par, nunca por frete.
`origem_municipio_id` · `destino_municipio_id` · `distancia_m` · `calculado_em`

### Cliente
`nome` · `documento` · `telefone` · `email` · `endereco` · `municipio_id` ·
`prazo_pagamento_dias` (nulo = herda da empresa) · `observacao`
**Só `nome` é obrigatório.**

### Veiculo
`placa` · `apelido` · `tipo` · `ativo`
Só `apelido` **ou** `placa` é obrigatório.

### Motorista
`nome` · `telefone` · `documento` · `veiculo_habitual_id` · `ativo`
**Só `nome` é obrigatório.**

### TipoOperacao
`nome` · `slug` · `ativo` · `ordem`
Toda empresa nasce com `Frete` ativo. `Reboque`, `Guincho` e `Mudança` existem
inativos.

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

**Obrigatórios:** `cliente_id`, `valor`, `data_servico`, `tipo_operacao_id`.

`origem_texto` e `destino_texto` guardam sempre o que o usuário digitou. O
`municipio_id` é resolvido quando possível, **sem bloquear o salvar**.

### TituloReceber
**Entidade própria, não campo no serviço.**
`servico_id` · `cliente_id` · `valor` · `valor_recebido` · `vencimento` ·
`forma_pagamento_prevista` (`boleto` | `outro`) · `status` (`aberto` | `pago` |
`cancelado`) · `data_pagamento` · `forma_pagamento` · `relatorio_id`

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
| A faturar | Não existe título para o serviço |
| Faturado | Existe título, nada pago |
| Parcial | Recebimento parcial registrado |
| Quitado | Todos os títulos do serviço estão pagos |

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

---

## 9. Ordem de construção

1. Base: empresa, usuário, login, **isolamento por `empresa_id`**
2. Cadastros: cliente, veículo, motorista, tipo de operação, municípios
3. **Lançamento de frete** — cronometrar contra os 30 segundos
4. Lista de fretes e detalhe do frete
5. Ordem de serviço: enviar ordem, finalizar, comprovante
6. Título a receber e Cobranças, incluindo recebimento parcial e boleto
7. Relatório do cliente, PDF e compartilhamento
8. Dashboard
9. Cobrança por WhatsApp e os dois modelos de mensagem
10. Configurações, conta da empresa e usuários
11. Despesas
12. Distância por rota e R$/km
13. Assinatura, plano gratuito, limites e tela de limite
14. Primeiro acesso
15. Importação de fretes *(depende da decisão de modelo)*
16. Novidades
17. Afiliados

Nada de 5 em diante começa antes de 1 a 4 funcionar de verdade.

---

## 10. Decisões em aberto

Ver §14 do CLAUDE.md.
