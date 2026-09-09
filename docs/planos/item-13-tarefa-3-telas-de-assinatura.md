# Plano — Tarefa 3 do item 13: as quatro telas de assinatura

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

**Depende da Tarefa 2 (o portão de escrita) estar construída antes** —
decisão do fundador, `docs/planos/item-13-tarefa-2-portao-de-escrita.md`:
"a tela de Assinatura vencida existe pra explicar por que a pessoa não
consegue escrever — se o portão não existir, ela explica algo que não
acontece, e você não teria como testar de verdade." Esta é a antiga
"Tarefa 2" do item 13 — renumerada quando o portão de escrita foi achado e
inserido antes dela (ver `docs/planos/item-13-assinatura.md`).

## Contexto

Continuação de `docs/planos/item-13-assinatura.md`. A Tarefa 1 (o caminho do
pagamento até a conta) está construída desde 03/09/2026 — migration, papel
`fretigate_pagamento`, rota de webhook, `/ativar-assinatura`. Esta tarefa
nunca foi construída: `docs/diario.md` perdeu essa pendência entre 07 e
08/09/2026 (ver a entrada "Corrige o `/onde-paramos`", commit `40130b7`), e
uma entrada seguinte tratou o item 13 como se já estivesse para trás na
ordem. Achado pelo fundador, não pelo comando.

As quatro telas já estão desenhadas (`docs/navegacao.md` linhas 64-67,
`docs/componentes.md` linhas 502-505) e o preço já está certo (R$ 197/mês,
R$ 1.164/ano, `CLAUDE.md` §10). Nenhuma das quatro tem rota construída hoje —
conferido: nenhum arquivo em `src/app` corresponde a nenhuma delas, e
`docs/componentes.md` linha 486 registra "Minha assinatura" ainda sem link em
Conta da empresa.

## Princípio que atravessa as quatro telas — do fundador, nesta sessão

**O checkout é da Kiwify — a tela de Planos leva para fora do produto. O que
fica nosso é o estado, os limites e as telas.** Isso não é só sobre onde o
pagamento acontece; é o critério que decide, tela por tela, o que cada botão
faz:

- Se a ação é **cobrar, mostrar fatura, ou mudar a forma de pagamento**, ela é
  da Kiwify — o botão leva para lá, nunca reconstrói essa tela dentro do
  FretiGate.
- Se a ação é **mostrar o que a empresa tem direito a fazer hoje** (plano,
  quantos caminhões/usuários já usa, se pode escrever ou só ler), ela é nossa
  — vem do banco do FretiGate, nunca de uma chamada à Kiwify na hora.

É o mesmo raciocínio já registrado em `docs/planos/item-13-assinatura.md`
("Só Kiwify — nenhuma abstração de múltiplos gateways agora... o que garante
trocar de gateway depois não é uma camada de abstração... é o estado, os
limites e as telas serem do FretiGate, não da Kiwify"). Esta tarefa é onde
esse princípio vira código pela primeira vez — cada decisão abaixo foi
tomada perguntando de qual lado da linha ela cai.

## Cobertura dos quatro estados de `StatusAssinatura`

O schema (`prisma/schema.prisma`, comentário do enum) já define o que cada
estado significa:

| Estado | Acesso | Tela que trata dele |
|---|---|---|
| `ativa` | completo | **Minha assinatura** (estado normal) |
| `inadimplente` | completo, com aviso para atualizar a forma de pagamento | **Minha assinatura** (mesma tela, com o aviso) |
| `vencida` | escrita bloqueada (Tarefa 2); leitura e exportação por 90 dias | **Assinatura vencida** |
| `encerrada` | (schema não diz — nada usa este valor ainda) | **nenhuma** |

**`encerrada` é estado que ninguém alcança hoje — não é lacuna do Design, é
lacuna de mecanismo.** Conferido no código, não suposto: `"encerrada"` existe
no `enum StatusAssinatura` e nos três tipos de união
(`criar-empresa-e-dono.ts`, `route.ts` do webhook, `pagamentos.ts`), mas
**nenhuma linha do produto atribui esse valor** — nenhum evento do webhook
mapeia para `encerrada`, e não existe job nem comando que avance uma empresa
de `vencida` para `encerrada` depois dos 90 dias. Isso combina com uma
pendência já registrada em `CLAUDE.md` §14 ("prazo de retenção... depois de
cancelamento voluntário") e com o próprio comentário do schema, que descreve
`encerrada` sem nenhum consumidor apontado.

**Não corrijo isso nesta tarefa** — construir o mecanismo que avança o estado
(um job agendado, ou um comando de operação como `medir:municipios`) é
trabalho novo, fora do escopo de "construir as quatro telas já desenhadas", e
não foi pedido. Fica registrado como lacuna, mesmo critério do
`CLAUDE.md` §14: quando o mecanismo existir, a tela que mostra `encerrada`
entra em pauta — hoje seria tela sem estado para mostrar.

## Lacuna que veio à tona ao conferir a cobertura: "próxima cobrança" e "cartão" não existem no schema

`docs/navegacao.md` linha 65 descreve o conteúdo de Minha assinatura como
"Plano, próxima cobrança, cartão, acessos". **Nenhum desses dois primeiros
dados existe em lugar nenhum do produto** — `Empresa` guarda `plano`,
`periodicidade`, `status_assinatura`, `gateway_assinante_id`; nada de data da
próxima cobrança nem de forma de pagamento. O webhook da Kiwify também nunca
manda isso hoje (conferido em `verificacao-kiwify.ts`: `Customer`, `Product`,
`Commissions`, `Subscription.plan.frequency`, `subscription_id` — nada de
cartão ou de data de cobrança).

**Mesmo caso já catalogado em `CLAUDE.md` §13**: "campo desenhado que não
existe na entidade é proposta, não decisão — pare e pergunte, nunca crie a
coluna por analogia" (o precedente foi "Categoria da CNH" e "Ano do
caminhão"). Aqui o campo nem é nosso para criar — é dado que só a Kiwify tem.

**Decidido pelo fundador: não mostra "próxima cobrança"/"cartão", com uma
correção à minha própria pergunta.** Não é "não mostrar se não tiver o
dado" — é "não inventa nem promete: se o webhook não traz o dado, a tela
não mostra" (mesma regra do `CLAUDE.md` §8, item 10 — "número incompleto
não é exibido"). O que a tela mostra, com dado que já existe: **plano,
estado e valor** — já responde a pergunta que importa ("estou pagando
quanto e até quando"). Para o resto — cartão, cancelar, trocar forma de
pagamento —, a tela tem um caminho para a Kiwify, que é onde esse dado mora
de verdade. **Registrada a divergência**: `docs/navegacao.md` linha 65
descreve uma tela que supunha gateway direto (nosso, guardando cartão e
data de cobrança) — não é o caso aqui, e a linha precisa de correção quando
este plano fechar (`CLAUDE.md` §13, "correção de estado" é do
repositório).

## As quatro telas

Todas de **Nível 2** (`docs/navegacao.md` § Regras de navegação): superfície
**clara** (nunca lilás — a família FretiNews tem escopo fechado,
`docs/estilo.md` § Família FretiNews, e assinatura/cobrança não está na
lista), com `BotaoVoltar` no canto superior esquerdo, sem barra de
navegação flutuante própria (a barra global de nível 1 não aparece em telas
de nível 2, mesmo padrão de Cadastro de cliente/Configurações).

**Acesso, decidido pelo fundador: só o dono, com uma exceção.** Planos,
Minha assinatura e Assinatura vencida são do dono — "é dinheiro e é o
contrato da empresa, mesmo critério de Conta e Configurações", e
`docs/especificacao.md` §4.9 já reserva assinatura e forma de pagamento a
ele. **Limite do gratuito é diferente, e por um motivo prático**: quem
esbarra no limite pode ser o operador (ele tenta cadastrar o segundo
caminhão, e alguém precisa dizer por quê não deu) — ver a seção própria da
tela, abaixo, com o conteúdo dividido por papel. **Assinatura vencida
também precisa do mesmo tratamento dual**, decidido na mesma resposta: se o
operador tentar usar o produto com a assinatura vencida, ele também precisa
saber por quê — "explica e manda falar com o dono, sem o caminho de pagar".
Detalhado na seção da tela, abaixo.

### 1. Planos — `/planos`

**Conteúdo** (`docs/componentes.md` linha 502): principal **Assinar o
anual**, secundária **Assinar o mensal**, o anual mostra parcelamento
(12x de R$ 97) e economia.

**Os dois botões são link externo para o checkout da Kiwify — nunca ação de
servidor.** Cada um usa a URL de checkout real do plano (mensal/anual),
configurada na Kiwify, com o parâmetro de rastreio `s1` embutido igual ao
`empresa_id` da sessão — o mesmo mecanismo que `docs/planos/
item-13-assinatura.md` já desenhou em "Upgrade de dentro do produto": todo
acesso a `/planos` de dentro do produto é alguém já logado, então **todo**
link de checkout gerado aqui carrega `s1`, sem exceção. Isso é o que faz o
webhook de `order_approved` reconhecer a compra como upgrade de uma empresa
existente, em vez de abrir um `PagamentoPendente` novo.

**A CONFIRMAR ANTES DE CONSTRUIR — as duas URLs de checkout reais.** Não
estão em nenhum lugar do repositório (conferido: `.env.example` só tem
`KIWIFY_WEBHOOK_TOKEN`). Preciso que o fundador copie, do painel da Kiwify,
o link de checkout de cada plano (Mensal, Anual) — viram duas variáveis de
ambiente novas (nome sugerido: `KIWIFY_CHECKOUT_URL_MENSAL`/
`KIWIFY_CHECKOUT_URL_ANUAL`), somadas à tabela de ambientes do `CLAUDE.md`
§5 nas três colunas (minha máquina, esteira — valor fixo, não aponta para
checkout de verdade — e Vercel, com os links reais).

**Acesso: só o dono** (decisão acima). A pílula "Assinar e liberar a frota"
em **Mais** (`docs/componentes.md` linha 491) precisa da mesma restrição —
hoje o documento não a marca "só para o dono" como marca o cartão de
identidade da mesma tela; corrijo essa linha junto deste plano, mesma
lógica de "correção de estado" do `CLAUDE.md` §13. Um operador em **Mais**
não vê a pílula; se esbarrar num limite tentando cadastrar algo, cai na
tela de Limite do gratuito (abaixo), que já sabe tratar os dois papéis.

### 2. Minha assinatura — `/conta/assinatura`

**Conteúdo** (`docs/componentes.md` linha 503, com a lacuna de "próxima
cobrança"/"cartão" já decidida acima): plano atual (gratuito/pago +
periodicidade), estado (`ativa`/`inadimplente`, com aviso quando
`inadimplente` — texto ainda não desenhado, ver abaixo), acessos em uso
(quantos caminhões e usuários a empresa tem, contra o limite do plano).
Secundárias **Trocar de plano** (`href="/planos"`, navegação interna) e
**Ver recibos**; texto destrutiva **Cancelar assinatura**.

**A CONFIRMAR ANTES DE CONSTRUIR — "Ver recibos" e "Cancelar assinatura" são
link para a área de assinante da própria Kiwify, e o formato dessa URL não
está medido.** Nenhuma pesquisa anterior do item 13 (`docs/planos/
item-13-assinatura.md`, `corrige-webhook-kiwify.md`) capturou isso — só o
formato do webhook foi confirmado contra entrega real. Duas perguntas
amarradas, para o fundador confirmar contra a própria conta Kiwify antes de
eu escrever o link: (a) existe uma área de assinante própria (tipo "Área de
Membros" ou painel do comprador) onde a pessoa vê recibo e cancela sozinha?
(b) se existe, o link é o mesmo para todo mundo, ou precisa de um
identificador por comprador (e, se precisar, de onde ele vem — o mesmo
`gateway_assinante_id` que já temos, ou outra coisa)? Sem essa resposta, os
dois botões não têm para onde apontar — não vou supor um formato de URL.

**Texto do aviso para `inadimplente` — não desenhado em lugar nenhum.** As
quatro telas do Design cobrem `ativa` (implícito, é o estado sem aviso) e
`vencida` (tela própria), mas nenhum documento tem o texto do aviso dentro
de Minha assinatura para quando o pagamento falhou e está em retentativa.
Proponho, para aprovação — não como decisão já tomada: um bloco de aviso
(mesmo tratamento de `#F6E6DD` já usado em "Vencido" e em "Redefinir
senha — link expirado", claro, nunca escuro nem lilás) dizendo algo como "A
última cobrança não passou. A Kiwify vai tentar de novo — se não conseguir,
o acesso de escrita pausa." Fica marcado como pedido de confirmação ao
Design, mesmo padrão já usado para `/ativar-assinatura` (item 13, Tarefa 1).

### 3. Limite do gratuito — `/limite-do-gratuito?tipo=`

**Conteúdo** (`docs/componentes.md` linha 504): principal **Ver os planos**
(→ `/planos`), texto neutra **Depois** (volta para onde a pessoa estava,
sem bloquear nada do que já existe — `docs/navegacao.md` linha 66).

**Construída genérica, parametrizada por `tipo`, porque a Tarefa 4 precisa
disto — ver a seção própria abaixo.** `docs/navegacao.md` só desenha o
gatilho de caminhão ("Tentar cadastrar o segundo caminhão"); o corpo da
tela para usuário e para importação **não tem texto escrito em lugar
nenhum**. Construo a tela com um mapa de textos por tipo
(`CAMINHAO`/`USUARIO`), com o texto de caminhão sendo o único já aprovado
("Você já tem 1 caminhão no plano gratuito" — frase minha, a confirmar) e
o de usuário como proposta a aprovar junto deste plano. **Importação fica
de fora do mapa por enquanto** — o item 15 (Importação de fretes) ainda não
foi construído (`docs/especificacao.md` §9: "depois do lançamento"), não
existe o que teria disparado o terceiro tipo hoje.

**Acesso, decidido pelo fundador: dono e operador, com conteúdo diferente
por papel.** Quem esbarra no limite pode ser qualquer um dos dois — o
operador tenta cadastrar o segundo caminhão e precisa saber por quê não
deu. A tela recebe o papel da sessão (`sessao.papel`, já disponível pelo
envelope `comoUsuario`) e mostra:

- **Para o dono:** o texto do limite (por `tipo`) + principal **Ver os
  planos** (→ `/planos`) + texto neutra **Depois**.
- **Para o operador:** o mesmo texto do limite + uma saída própria, sem o
  caminho de assinar — "Fale com o dono da empresa" (texto exato a
  confirmar com o Design), + texto neutra **Depois**. **Sem** o botão "Ver
  os planos": ele não pode completar a assinatura, e um botão que não leva
  a lugar nenhum para quem o vê é exatamente o que `CLAUDE.md` §8 proíbe.

Por isso a tela nasce com dois conjuntos de conteúdo por `tipo`, não um —
custo pequeno de construir agora, e evita retrabalho quando a Tarefa 4
ligar o gatilho de verdade.

### 4. Assinatura vencida — `/assinatura-vencida`

**Conteúdo** (`docs/componentes.md` linha 505): principal **Renovar
assinatura**, secundária **Baixar meus dados** (nome do botão — ver
divergência abaixo), corpo explicando que leitura e exportação seguem
funcionando.

**"Renovar assinatura" tem a mesma lacuna de URL de "Ver recibos"/"Cancelar
assinatura" acima** — precisa de um link para a Kiwify atualizar a forma de
pagamento, formato não medido. Mesma pergunta, mesma resposta serve para os
três.

**Decidido pelo fundador: não construir o botão de exportação.** "Botão que
não faz nada é o que a regra proíbe — e aqui é pior que nas outras vezes: a
pessoa está com a assinatura vencida, quer os dados dela de volta, e toca
em algo que não responde." No lugar do botão, o corpo da tela diz o caminho
que já existe: pedir a exportação pelo e-mail de contato — exatamente o que
os Termos publicados já prometem ("a empresa pode pedir a exportação dos
seus dados a qualquer momento pelo e-mail de contato"). O botão nasce
quando o mecanismo de exportação existir, não antes. **Isto tem prazo
legal** (`CLAUDE.md` §14) — não é acabamento visual, é obrigação já
assumida ao publicar os Termos; registrado de novo aqui para não se perder
outra vez.

**Divergência encontrada ao escrever esta seção, respondida pelo
fundador — mantém a decisão acima.** `docs/componentes.md` linha 505 chama
o botão de **"Baixar meus dados"** (a exportação completa de LGPD, sem
mecanismo); `docs/navegacao.md` linha 67 chama o mesmo destino de **"Baixar
meus relatórios"** — recurso mais estreito (uma lista dos PDFs já gerados,
que já existem com `pdf_url`, item 7), também não construído, mas menor.
**Mantido: sem botão, nas duas leituras.** Na palavra do fundador: a lista
de relatórios "resolve menos do que promete — quem está com a assinatura
vencida quer os dados dela de volta (clientes, fretes, cobranças), e os
relatórios são só um recorte, do que ela pensou em gerar antes." A
divergência em si — dois documentos descrevendo coisas diferentes para o
mesmo destino — **vai ao Design perguntar qual era a intenção**, entra na
lista de "o que foi pedido ao Design" (abaixo). A leitura estreita
(lista de relatórios já gerados) fica registrada como candidata mais
barata para o dia em que a exportação completa demorar demais para
construir — não decidida agora.

**Acesso: dual, mesmo tratamento de Limite do gratuito, decidido pelo
fundador.** Um operador que tentar usar o produto com a assinatura vencida
"também precisa saber por quê" — mesma tela, sem o caminho de pagar:

- **Para o dono:** conteúdo completo — corpo, **Renovar assinatura**, e o
  texto de exportação por e-mail (acima).
- **Para o operador:** o mesmo corpo explicando o bloqueio, mas **sem**
  "Renovar assinatura" — ele não gerencia pagamento. Texto próprio pedindo
  para falar com o dono, mesmo padrão de Limite do gratuito.

## O que a Tarefa 4 vai precisar desta Tarefa 3

A Tarefa 4 (limite do plano gratuito — antiga Tarefa 3, renumerada,
`docs/planos/item-13-assinatura.md`) manda a pessoa para
`/limite-do-gratuito?tipo=` no momento em que ela esbarra num teto do
plano gratuito (`CLAUDE.md` §10: 1 caminhão, 1 usuário, 5 importações no
total). Para isso funcionar, esta Tarefa 3 entrega:

1. **A rota `/limite-do-gratuito` genérica, recebendo `tipo` como
   parâmetro** (`CAMINHAO` | `USUARIO` — ver abaixo), com texto e destino
   variando por tipo, mas o mesmo layout e os mesmos dois botões
   (`docs/componentes.md` linha 504) para os dois.
2. **Só dois dos três tipos são construíveis agora.** Conferido no código:
   nenhuma tabela ou contador de importação existe hoje (`Servico` não tem
   nada equivalente, e o item 15, Importação de fretes, ainda está "depois
   do lançamento" — `docs/especificacao.md` §9). A Tarefa 4, quando vier,
   só tem onde prender o limite de **caminhão** (`Veiculo`, já existe,
   contagem simples por `empresa_id`) e de **usuário** (`Usuario`, mesma
   coisa). **O limite de importação fica sem gatilho até o item 15 nascer**
   — quem construir o item 15 é quem vai acrescentar o terceiro tipo ao
   mapa desta tela, reaproveitando o que já existir, não reabrindo esta
   tarefa.
3. **O texto de cada tipo precisa estar aprovado antes da Tarefa 4
   construir o bloqueio** — hoje só o de caminhão tem indício de texto
   (`docs/navegacao.md` linha 66, "Tentar cadastrar o segundo caminhão"). O
   de usuário nasce como proposta nesta Tarefa 3 (ver acima), para não
   deixar a Tarefa 4 escrevendo copy nova por conta própria depois.
4. **O papel (dono/operador) já vem tratado nesta Tarefa 3** — a Tarefa 4
   só chama a mesma rota; ela não precisa decidir mais nada sobre quem vê
   o quê.

## Fora do escopo desta tarefa — registrado, não esquecido

- O portão de escrita para assinatura `vencida` — **Tarefa 2, separada,
  construída antes desta** (`docs/planos/
  item-13-tarefa-2-portao-de-escrita.md`). Esta Tarefa 3 só constrói a
  tela que explica o bloqueio; quem bloqueia de verdade é a Tarefa 2.
- O mecanismo que avança `vencida` → `encerrada` depois de 90 dias
  (lacuna, seção "Cobertura dos quatro estados", acima).
- Qualquer mecanismo de exportação de dados automática (`CLAUDE.md` §14,
  pendência com prazo legal já registrada, maior que esta tarefa) — a
  saída provisória é o e-mail de contato, já prometido nos Termos.
- A Tarefa 4 em si (bloqueio dos limites do plano gratuito) — esta tarefa
  só entrega a tela de destino que ela vai usar.
- Correção de estado em dois documentos, a fazer junto do commit deste
  plano (`CLAUDE.md` §13, "o repositório é dono de corrigir estado"):
  `docs/navegacao.md` linha 65 (tira "próxima cobrança"/"cartão" do
  conteúdo de Minha assinatura) e linha 491 de `docs/componentes.md`
  (marca a pílula "Assinar e liberar a frota" como só do dono).
- O aviso ao Design sobre o texto de `inadimplente` em Minha assinatura, o
  texto de "Limite do gratuito" para usuário e para o operador, o texto
  "fale com o dono" em Assinatura vencida, e a divergência "Baixar meus
  dados"/"Baixar meus relatórios" — entram na lista de "o que foi pedido
  ao Design" quando este plano fechar (`CLAUDE.md` §13).

## Decisões do fundador nesta sessão — para não reabrir por analogia

1. **Minha assinatura mostra só o que existe** — plano, estado, valor.
   Nada de "próxima cobrança"/"cartão". Caminho para a Kiwify resolve o
   resto. `docs/navegacao.md` diverge e será corrigido.
2. **Acesso: Planos, Minha assinatura e Assinatura vencida são só do
   dono** — mesmo critério de Conta/Configurações, `docs/especificacao.md`
   §4.9. **Limite do gratuito e Assinatura vencida são as duas exceções**:
   aparecem também para o operador, com conteúdo próprio (sem o caminho de
   pagar, com "fale com o dono").
3. **"Baixar meus dados" não vira botão nesta tarefa**, nas duas leituras
   possíveis do nome (dados completos ou só relatórios) — o texto explica
   o caminho por e-mail, já prometido nos Termos. O botão nasce quando a
   exportação existir.

## Perguntas ainda em aberto, sem as quais não dá para construir

1. **As duas URLs de checkout reais (Mensal, Anual)** — preciso que o
   fundador copie do painel da Kiwify, para as variáveis de ambiente
   novas (`KIWIFY_CHECKOUT_URL_MENSAL`/`_ANUAL`).
2. **Existe área de assinante própria da Kiwify para recibo, cancelamento
   e atualização de forma de pagamento?** Se sim, qual o formato do link
   (por comprador, ou fixo)? Sem isso, "Ver recibos", "Cancelar
   assinatura" e "Renovar assinatura" não têm para onde apontar.
3. **Os textos propostos** — o aviso de `inadimplente` em Minha
   assinatura, o corpo de "Limite do gratuito" para usuário e para o
   operador, e o texto "fale com o dono" em Assinatura vencida para o
   operador — aprovar, ajustar, ou mandar para o Design decidir?
