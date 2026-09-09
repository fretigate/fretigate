# Plano — item 13: Assinatura, plano gratuito, limites e tela de limite

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 11 (Despesas) fechou no commit `efc26cd`. O item 12 (distância por rota e
R$/km) está marcado "depois do lançamento" (`docs/especificacao.md` §9) — o
item 13 é o próximo da ordem real de construção.

Este plano nasceu de uma sequência de decisões do fundador, nesta ordem, e o
resto do documento pressupõe todas elas:

1. **Gateway: checkout de terceiro, não gateway direto** — Kiwify. Decisão
   pelo que ela resolve pronta e o FretiGate não precisa montar: antifraude,
   retentativa de cobrança, emissão fiscal opcional pela própria plataforma,
   programa de afiliado (§4.11 da especificação, item 17 da ordem de
   construção, hoje "em aberto" e fora do MVP — ver "Achado com peso maior",
   abaixo: pode ser que o item nem precise existir).
2. **Fluxo B, não A: venda é direta ao checkout.** Anúncio → página de
   vendas → pagamento, sem cadastro no meio. O cadastro que já existe (item
   1) continua servindo só para quem entra pelo plano gratuito — são dois
   caminhos de entrada, não um substituindo o outro.
3. **A conta nasce a partir do pagamento**, por um link com identificador
   próprio (nunca por e-mail digitado no checkout — frágil, pode divergir do
   e-mail que a pessoa usaria para logar). Mesmo mecanismo do convite de
   usuário (item 10, Tarefa 4): token na URL, tela pública, conta criada a
   partir dele — reaproveitado, não reinventado.
4. **Os quatro casos de risco do link, resolvidos por analogia com o
   convite e ajustados onde a analogia quebra** — detalhe na seção
   "Os quatro casos", abaixo.

## Por que o cuidado extra — o que atravessa os quatro casos

**Este é o primeiro caminho do produto onde alguém entra sem nunca ter
passado por uma tela do FretiGate.** Cadastro (item 1) começa dentro — a
pessoa já está no site, preenchendo um formulário nosso. Convite (item 10)
também começa dentro, só que de outro jeito: alguém que já é dono manda o
link, e mesmo assim a pessoa convidada só age depois de ver de quem veio a
mensagem. Aqui não: a pessoa paga num checkout que não é nosso, para uma
empresa (Kiwify) que não é a sua, e só encontra alguma tela do FretiGate
depois — no e-mail de confirmação da compra, ou clicando num link que
ninguém deste produto mandou na hora. Cada decisão de segurança deste plano
(token único, mensagem que não confunde, dado mínimo exposto, morte do
token no estorno) vale mais aqui do que valeria em qualquer tela que já
parte de dentro — é o único lugar onde a primeira coisa que a pessoa vê do
FretiGate é uma consequência de já ter pago.

## O que a pesquisa mediu (não suposto) — resumo, com fonte

- **Pix na Kiwify não é automático.** Assinatura por Pix/boleto exige
  renovação manual a cada período — a Kiwify manda e-mail de lembrete e
  gera um novo QR code; sem Pix Automático. Isso empurra o anual pago em
  Pix para o mesmo fluxo de atraso que já existe para cartão
  (`inadimplente`/`vencida`), não é mais "cobra uma vez e pronto".
- **Taxa: 8,99% + R$2,49 por venda aprovada**, qualquer forma de pagamento,
  sem mensalidade — fonte oficial (`ajuda.kiwify.com.br`, "Quais são as
  taxas da plataforma?").
- **O webhook manda `customer.email`, `customer.id` (UUID interno,
  estável), `customer.cpf`, `status` da venda, e um bloco `tracking` com
  `s1`/`s2`/`s3`** — campos de passagem que voltam intactos no webhook,
  pensados originalmente para rastreio de afiliado, mas que servem para
  carregar um identificador nosso pelo link de checkout sem depender do
  e-mail digitado.
- **A rota de webhook é a segunda rota de API que grava estado** (a
  primeira foi `api/fretes/[id]/comprovante`, item 5). `CLAUDE.md` §9 já
  registrava essa lacuna — rota de API não tem `"use server"`, não é
  Server Action, `comoUsuario`/`comoDono` e o teste estrutural
  (`tests/protecao-de-acoes.test.ts`) não a alcançam — e já previa
  revisitar "depois da segunda ou terceira rota". É agora.

## Preço do anual — R$ 840, divergência corrigida na fonte

`docs/navegacao.md` (linha 64, "Planos") descrevia a tela desenhada pelo
Design com "Anual R$ 990 em destaque... economia de R$ 798". Decisão do
fundador, 03/09/2026: **R$ 840/ano é o preço** — o que está publicado em
`CLAUDE.md` §10. R$ 990 nunca foi decisão: era a recomendação do fundador
na própria conversa que gerou a tela (`CLAUDE.md` §14 registrava isso —
"recomendação em aberto: R$ 990" —, e §14 agora se atualiza junto deste
plano), e o Design desenhou a partir da recomendação, não da decisão
publicada.

**Corrigido em `docs/navegacao.md` neste mesmo commit** (03/09/2026: Anual
R$ 840, 12x de R$ 70,00, economia de R$ 948) — é correção de **estado**, do
tipo que o repositório já é dono de fazer sem esperar nova exportação
(`CLAUDE.md` §13: "sincronizar com decisão já registrada em outro lugar" é
do repositório, em qualquer um dos três documentos). **Isso não substitui
avisar o Design** — a fonte dele (a prancheta) continua com R$ 990 até
alguém contar; entra na lista de "o que foi pedido ao Design" quando este
item fechar. Sem essa correção, a próxima exportação da tela "Planos"
traria o número errado de volta — preço errado na tela é pior que rótulo
errado (`CLAUDE.md` §2, "confusão de quem lê é evidência sobre o texto").

## Preço, decisão do fundador — R$ 197/R$ 1.164

**Isto não é correção de documento — é o fundador mudando o que estava
decidido.** O parágrafo anterior corrigiu um documento (`docs/navegacao.md`
mostrava R$ 990 por engano, quando o decidido já era R$ 840); este aqui é
diferente: ao configurar os planos de verdade no painel da Kiwify
(03/09/2026, depois da construção da Tarefa 1), o fundador **decidiu** o
preço novo: **Mensal R$ 197, Anual R$ 1.164** (parcelável em até 12x de
R$ 97,00 — recurso padrão da Kiwify para plano acima de bimestral, não
desconto). Confirmado pelo fundador como mudança de preço de verdade, não
engano de cadastro — ver `docs/diario.md`, mesma data, para o registro
explícito da decisão.

**Isso desatualiza coisas fora deste repositório**, apontado pelo
fundador ao aprovar: a página de vendas (ainda não existe), o briefing de
marketing (fora deste repositório, não visível aqui) e a conta do
"FretiNews" sobre o desconto do anual — R$ 1.164 contra R$ 2.364
(R$ 197 × 12) é ~50,8% de desconto, não os 53% calculados sobre os
valores antigos. Nenhum desses três é corrigido aqui — nenhum existe como
arquivo neste repositório ainda; registrado para quem construir cada um
não herdar o número velho por analogia.

Atualizado em `CLAUDE.md` §10/§14, `docs/navegacao.md` ("Planos") e neste
plano (abaixo, "Decisões fechadas"). Mesmo alerta do parágrafo anterior,
de novo: avisar o Design — a fonte dele segue com R$ 990.

## Os quatro casos — requisito, com a fonte da decisão

Fechados na conversa que aprovou este plano; viram requisito de construção.

1. **Pagou e nunca clicou.** Sem tela para o dono ver (a empresa ainda não
   existe), então a visibilidade não é uma tela — é um comando de operação,
   mesma classe do `medir:municipios` (`CLAUDE.md` §6: ferramenta rodada
   por um humano que já escolheu o que quer ver, fora de `/src`, nunca
   parte do produto publicado). Lista pagamentos com token ainda pendente,
   ordenados por idade. Resolve enquanto o fundador é o único olhando —
   registrado assim de propósito, sem construir tela de administração
   maior do que o problema de hoje pede.
2. **Clicou duas vezes.** Reivindicação atômica (mesmo `updateMany` com
   `WHERE status = 'pendente'` do convite) resolve a corrida. A mensagem da
   segunda vez **não** reaproveita o texto do convite ("peça a quem te
   convidou") — não existe quem convidou aqui. Texto próprio: **"Esta conta
   já foi criada. Entre normalmente."**, com link para `/entrar`. A tela de
   indisponível deste fluxo passa a ter **dois casos com textos
   diferentes** — diferente do convite, que tem um só para os quatro
   motivos (ausente/inexistente/aceito/cancelado, de propósito, para não
   revelar qual). Aqui:
   - **já reivindicado** → "Esta conta já foi criada. Entre normalmente."
     (saída acionável — a pessoa provavelmente já tem conta e senha).
   - **qualquer outro motivo** (token inexistente, estornado, taxa de
     consulta excedida) → mensagem genérica, sem entrar em qual dos três —
     mesmo motivo do convite: distinguir revelaria informação
     (confirmaria, por exemplo, que um pagamento específico foi
     estornado).
3. **Link vazou.** Mesma proteção estrutural do convite (token de 32 bytes
   aleatórios, uso único) contra adivinhação. O que muda é a consequência
   de falhar — lá, acesso indevido a uma empresa que já existe; aqui,
   sequestro de uma assinatura paga por quem nunca a criou. Mitigação:
   a tela de reivindicação mostra a confirmação da compra antes de pedir
   senha — **só e-mail parcial e data**, nunca nome completo nem
   documento (achado do fundador ao aprovar: nome e CPF numa tela pública
   alcançável por token seria expor dado de quem pagou para quem só tem o
   link). Não impede o sequestro por criptografia — dá à pessoa certa um
   jeito de perceber, antes de preencher senha, que a compra não é dela.
4. **Estorno chega antes do clique.** O token morre — mesma atomicidade do
   caso 2 (reivindicar OU estornar, nunca os dois; quem chega primeiro
   grava, o outro falha). Estorno depois do clique é outro caso, não deste
   fluxo: a empresa já existe, e o que muda é o estado da assinatura
   (`status_assinatura`), fluxo normal de cobrança recusada/estornada —
   fora do escopo da Tarefa 1.

## Arquitetura: o pagamento que ainda não é conta

### Novo modelo — `PagamentoPendente`

Não é `Convite`: `Convite` pertence a uma empresa que já existe
(`empresa_id NOT NULL`, isolado como qualquer tabela de domínio, §3).
Este nasce **antes** de qualquer empresa — não tem dono até ser
reivindicado.

```prisma
model PagamentoPendente {
  id String @id @default(uuid(7)) @db.Uuid

  token String @unique

  gateway            String // "kiwify" — sem abstração de múltiplos
                             // gateways agora (CLAUDE.md §6, "nada de
                             // arquivo para depois"); campo de registro,
                             // não ponto de extensão.
  transacao_externa  String @unique // id da venda na Kiwify — chave de
                                     // deduplicação: a Kiwify reenvia
                                     // webhook em caso de falha, pode
                                     // haver duplicata.

  email_comprador      String
  nome_comprador       String
  documento_comprador  String? // CPF/CNPJ — guardado para suporte,
                                // NUNCA renderizado na tela pública
                                // (caso 3).

  periodicidade PeriodicidadePlano // mensal | anual — mapeado do produto/
                                    // oferta configurado na Kiwify (dois
                                    // produtos, um por periodicidade;
                                    // configuração da Tarefa 3 (renumerada
                                    // em 08/09/2026), não desta.
  valor_centavos Int

  status StatusPagamentoPendente @default(pendente) // pendente | aceito | estornado

  empresa_id String? @db.Uuid // preenchido só quando aceito
  empresa    Empresa? @relation(fields: [empresa_id], references: [id], onDelete: Restrict)

  recebido_em  DateTime  @db.Timestamptz(6) // quando o webhook de compra aprovada chegou
  aceito_em    DateTime? @db.Timestamptz(6)
  estornado_em DateTime? @db.Timestamptz(6)

  criado_em     DateTime @default(now()) @db.Timestamptz(6)
  atualizado_em DateTime @default(now()) @updatedAt @db.Timestamptz(6)

  @@map("pagamento_pendente")
}
```

Sem `arquivado_em` — o `status` já cobre o ciclo de vida inteiro
(`pendente`/`aceito`/`estornado`), mesmo raciocínio do `Convite`.

### A exceção ao isolamento — não é bem como `municipio`, e só a suíte mostrou isso

**Correção feita depois de rodar a suíte de isolamento pela primeira vez
contra a tabela nova** (achado da construção, não da conversa que aprovou
o plano — registrado aqui porque a formulação original estava errada,
`CLAUDE.md` §2, "explicação plausível não é explicação verificada"):
`pagamento_pendente` **não** é "tabela sem `empresa_id`" no sentido que
`tests/isolamento/schema.test.ts` mede — ela **tem** a coluna
(`empresa_id UUID`, nullable). `SEM_EMPRESA_ID` é para tabela sem a coluna
nenhuma (`session`/`account`/`verification`/`empresa`/`rate_limit`/
`municipio`); rodar a suíte com `pagamento_pendente` lá dentro reprovou —
o mecanismo confere presença de coluna, não se ela está sendo usada para
isolamento.

**O que de fato diferencia esta tabela é a política, não a coluna**: em vez
de `empresa_id = contexto` (a forma de toda tabela de domínio), ela tem uma
política própria e nomeada — `USING (true) WITH CHECK (true)`, restrita a
`fretigate_pagamento` — porque o acesso não é "cada empresa vê a si mesma",
é "um papel específico, sem contexto de empresa nenhum, grava e lê a tabela
inteira, com a guarda de verdade dentro de cada função `SECURITY DEFINER`
(`WHERE status = 'pendente'`)". Foi por isso que `empresa` também ganhou
uma **segunda** política (`empresa_busca_por_assinante_gateway`, também
`fretigate_pagamento`) — o mesmo padrão de tabela com mais de uma política
que `convite`/`municipio` já usam, só que em `empresa`, não numa tabela
nova.

**Requisito de construção, Tarefa 1 — os dois lugares que a suíte confere,
medidos ao rodar, não a formulação original:**
- `POLITICAS_ESPERADAS` (`tests/isolamento/schema.test.ts`) ganha a entrada
  de `pagamento_pendente` (a política acima) **e** uma segunda política em
  `empresa` (`empresa_busca_por_assinante_gateway`) — sem as duas, a suíte
  reprova sozinha, é o próprio mecanismo fazendo o que promete.
- `FORA_DO_LACO` (`tests/isolamento/vazamento.test.ts`) ganha
  `pagamento_pendente` — o laço genérico de vazamento testa tabelas
  alcançáveis por `db(empresaId)`, e `fretigate_app` não tem nenhum
  privilégio direto nesta tabela (todo acesso passa pelas funções
  `SECURITY DEFINER`); não há o que esse laço, construído sobre esse
  caminho, testar aqui. A prova de que `fretigate_pagamento` não vaza é
  outra — fica para `tests/pagamentos.test.ts` (Tarefa 1, ainda não
  escrito nesta sessão).

### RLS e função — mesmo padrão do convite, papel novo

`PagamentoPendente` não tem `empresa_id` fixo (é nulo até aceito), então a
política padrão de isolamento (`empresa_id = contexto`) não serve — não
existe contexto de empresa antes de a empresa nascer. Segue **o mesmo
desenho já usado duas vezes** (`fretigate_reversor`, `fretigate_convite`,
`CLAUDE.md` §9): um papel novo, `fretigate_pagamento`, `NOLOGIN
NOBYPASSRLS`, com política própria e nomeada, e um punhado de funções
`SECURITY DEFINER` — nunca `BYPASSRLS` genérico.

- `registrar_pagamento_pendente(...)` — chamada pela rota de webhook
  (como `fretigate_app`) quando chega `compra_aprovada`. Confere
  `transacao_externa` antes de inserir (deduplicação de reentrega da
  Kiwify) — se já existe, não insere de novo, só devolve o registro
  existente.
- `localizar_pagamento_por_token(p_token text)` — mesmo formato de
  `localizar_convite_por_token`: devolve só os campos que a tela de
  reivindicação precisa (nunca a linha inteira, nunca o documento).
- `reivindicar_pagamento(p_token text, p_empresa_id uuid)` — o
  `UPDATE ... WHERE token = $1 AND status = 'pendente'` atômico (caso 2).
  Só grava se `status` ainda for `pendente` — mesma defesa do
  `updateMany` do convite, em SQL porque quem chama ainda não tem
  `empresa_id` de contexto para passar pela política normal.
- `estornar_pagamento_pendente(p_transacao_externa text)` — chamada pelo
  webhook de reembolso/chargeback (caso 4); só grava se `status` ainda for
  `pendente` (se já foi aceito, não faz nada — vira o outro caso,
  assinatura existente mudando de estado).

Política: `USING (true) WITH CHECK (true)` restrita a `fretigate_pagamento`
— diferente de `convite_busca_por_token` (`WITH CHECK (false)`, papel só
de leitura), porque aqui o papel também grava. A escrita real continua
condicionada pelo `WHERE status = 'pendente'` **dentro de cada função**,
não pela política — mesma separação de responsabilidade que
`reverter_cadastro_incompleto` já usa (a política dá alcance, a guarda
dentro da função decide o que é seguro).

`GRANT EXECUTE` só para `fretigate_app`, nas quatro funções, com o mesmo
`REVOKE EXECUTE ... FROM PUBLIC` de toda função nova (§3 — função nasce
executável por todo mundo por padrão, `ALTER DEFAULT PRIVILEGES` nunca
fechou isso).

**Migration a escrever seguindo `20260831060000_convite_e_patio_do_frete`
como modelo linha a linha** — é o único precedente do produto para "tabela
sem contexto de empresa, com escrita por SECURITY DEFINER", e já está
testado em produção real (convite).

### A rota do webhook

`src/app/api/webhooks/kiwify/route.ts` — POST, sem sessão (quem chama é a
Kiwify, não um usuário). Mapa de eventos:

**Nome do gatilho (painel da Kiwify) × valor real no corpo
(`webhook_event_type`) — confirmado em `docs/planos/
corrige-webhook-kiwify.md`, são diferentes.** A tabela abaixo usa o valor
real, que é o que o código compara.

| Evento (`webhook_event_type`) | Gatilho no painel | Ação |
|---|---|---|
| `order_approved` | Compra aprovada | `registrar_pagamento_pendente` (se `tracking.s1` vier vazio — venda nova, sem empresa) **ou** atualiza `status_assinatura`/`plano` da empresa apontada por `s1` (se vier preenchido — upgrade de dentro do produto, ver seção abaixo) |
| `subscription_renewed` | Assinatura renovada | Empresa já existe (busca por `empresa_id` guardado em `PagamentoPendente.empresa_id` ou pelo `s1`) — `status_assinatura` volta a `ativa` se estava `inadimplente` |
| `subscription_late` | Assinatura atrasada | `status_assinatura` → `inadimplente` |
| `subscription_canceled` | Assinatura cancelada | `status_assinatura` → `vencida` (inicia os 90 dias, §10 `CLAUDE.md` — **lacuna já registrada em `CLAUDE.md` §14**: esses 90 dias valem para assinatura vencida por pagamento que falhou, e cancelamento é vontade própria; o prazo desse segundo caso ainda não foi decidido, e este mapeamento aplica o primeiro na falta do segundo) |
| `order_refunded` / `chargeback` | Reembolso / Chargeback | Se ainda `pendente`: `estornar_pagamento_pendente` (caso 4). Se já `aceito`: mesmo tratamento de `subscription_canceled` |

**A janela entre `inadimplente` e `vencida` é a da própria Kiwify (ela
cancela depois de até 5 dias de atraso, medido na pesquisa que fundamentou
este plano) — decisão do fundador, 03/09/2026: nenhuma janela própria do
FretiGate por cima.** Duas contagens de prazo para a mesma assinatura
mostrariam estado diferente em cada lugar — quem controla o pagamento
controla o prazo. **Este número é registrado como vindo do fornecedor, não
como decisão do produto**: o mapa acima (`subscription_late` →
`inadimplente`, `subscription_canceled` → `vencida`) é o requisito fixo;
os "5 dias" são comportamento medido da Kiwify hoje, não uma constante do
FretiGate — se o gateway trocar, o número muda junto, sem precisar de
decisão nova aqui.

**Autenticidade do webhook — a confirmar durante a construção, não
suposta aqui.** A Kiwify permite configurar um `token` próprio por webhook
(visto em `docs.kiwify.com.br/api-reference/webhooks/create`, campo
`token` no corpo de criação), mas o mecanismo exato de verificação na
entrega (header, corpo, assinatura) não foi confirmado nesta pesquisa — a
documentação de assinatura Ed25519 encontrada é de um produto diferente
(API de Conta Digital/banking da Kiwify, não a de vendas). Antes de
escrever a rota, confirmar contra um webhook de teste de verdade (a
própria Kiwify oferece "Testar Webhook") — nunca aceitar o payload sem
alguma verificação; se não houver assinatura disponível, o mínimo é
comparar um token compartilhado enviado em cada entrega.

**Rate limit** (`CLAUDE.md` §4): não é rota que gera custo de IA/PDF, mas é
rota pública que grava estado a partir de um payload externo — trava
básica contra abuso (payload malformado repetido, tentativa de descobrir o
formato por tentativa e erro), no mesmo espírito de `travaDeAceiteDeConvite`.

### A tela de reivindicação

`(auth)/ativar-assinatura?token=` — mesmo esqueleto de `(auth)/aceitar-convite`:
página pública, sem barra de navegação, busca por
`localizar_pagamento_por_token`, formulário de e-mail + senha (a pessoa
escolhe o e-mail da conta aqui, não o do checkout — mesmo raciocínio já
usado no convite).

Diferenças do convite:
- Mostra a confirmação da compra (caso 3): **e-mail parcial** (ex.:
  `an***@gmail.com`) **e data**, nunca nome completo nem documento.
- Duas mensagens de indisponível, não uma (caso 2) — ver acima.
- Ao concluir, **não** chama `criarUsuario` (que só anexa a uma empresa
  existente) — chama o equivalente de `criarConta`/`cadastro.ts`: cria
  Empresa **e** Usuário dono na mesma transação, com `plano: pago`,
  `periodicidade` e `status_assinatura: ativa` vindos do
  `PagamentoPendente`, em vez de `plano: gratuito`. Reaproveita
  `emTransacao`/`criarUsuarioDono`/`criarTiposDeOperacaoIniciais`
  (`src/lib/servicos/cadastro.ts`), só troca os valores de plano/status.
- Chama `reivindicar_pagamento` **antes** de criar a empresa e o usuário —
  mesmo motivo do convite (o "verifica num passo, grava noutro" já
  catalogado em `CLAUDE.md` §2): reivindicar o token é o `WHERE status =
  'pendente'` atômico; a criação da empresa vem depois, já sabendo que
  ninguém mais pode reivindicar o mesmo token.

**O mesmo link vai no e-mail de confirmação que a própria Kiwify manda** —
não é preciso reenviar por conta própria (decisão do fundador). O comando
de visibilidade (caso 1) é o único reforço do lado do FretiGate.

## Upgrade de dentro do produto — o outro caminho, mesmo checkout

O Fluxo B resolve quem chega de fora (anúncio → checkout → conta nova).
**Não resolve quem já tem conta gratuita e quer virar pago** — essa pessoa
já está logada, a empresa já existe, criar uma segunda seria o bug errado.

**Decisão da construção, não decisão de produto nova** — registrada aqui
para o fundador corrigir se discordar, mesmo padrão já usado no plano do
item 11: quando o link "Assinar" é gerado **de dentro do produto** (dono
logado, tela "Planos"), o `empresa_id` vai embutido no parâmetro de
rastreio `s1` da URL de checkout. O webhook de `compra_aprovada` chega com
`tracking.s1` preenchido — nesse caso **não** cria `PagamentoPendente` nem
manda ninguém para `/ativar-assinatura`: atualiza `plano`/`periodicidade`/
`status_assinatura` da empresa que o `s1` aponta, direto. Só quando `s1`
vem vazio (venda que não passou pelo produto — o caso do anúncio direto) é
que nasce um `PagamentoPendente` novo.

## Tarefas

**Tarefa 1 — Fundamentos: o caminho do pagamento até a conta.** Tudo
descrito acima: migration (`PagamentoPendente`, papel, quatro funções,
mais as duas entradas em `SEM_EMPRESA_ID`/`POLITICAS_ESPERADAS`), serviço
(`src/lib/servicos/pagamentos.ts`), rota de webhook com os cinco eventos
mapeados, tela `/ativar-assinatura` com os dois textos de indisponível,
comando `scripts/pagamentos-pendentes.mts` (caso 1), reaproveitamento de
`cadastro.ts` para nascer com plano pago. Testes: mesmo padrão de
`tests/usuarios.test.ts` (contraste de isolamento, os quatro casos,
deduplicação de webhook reentregue, reivindicação concorrente).

**Renumerado em 08/09/2026, ao planejar a Tarefa 2** (achado pelo fundador:
`docs/diario.md`, "Corrige o `/onde-paramos`", commit `40130b7` —
`/onde-paramos` tinha perdido a pendência da Tarefa 2 original entre 07 e
08/09). Conferindo a cobertura dos quatro estados de `StatusAssinatura`
para planejar as telas, apareceu um mecanismo que nenhuma das duas Tarefas
originais construía: o portão que bloqueia escrita sob assinatura
`vencida` (`CLAUDE.md` §10). Decisão do fundador: vira Tarefa própria,
**antes** das telas — "a tela de Assinatura vencida existe pra explicar
por que a pessoa não consegue escrever; se o portão não existir, ela
explica algo que não acontece, e não dá pra testar de verdade." A antiga
Tarefa 2 (telas) virou Tarefa 3; a antiga Tarefa 3 (limites do gratuito)
virou Tarefa 4.

**Tarefa 2 — O portão de escrita para assinatura vencida.** Mecanismo
novo, não desenhado em nenhuma tela: `comoUsuario`/`comoDono`
(`src/lib/auth/acao.ts`) passam a bloquear escrita por padrão quando
`status_assinatura` é `vencida`/`encerrada`, com um envelope irmão,
`comoUsuarioLeitura`, como exceção nomeada para as poucas ações que só
leem. Detalhado em `docs/planos/item-13-tarefa-2-portao-de-escrita.md`.

**Tarefa 3 — Telas dentro do produto: Planos, Minha assinatura, Limite do
gratuito, Assinatura vencida.** Design já tem as quatro desenhadas
(`docs/navegacao.md`, linhas 64-67), preço corrigido para R$ 197/R$ 1.164
(acima) — sem bloqueio de decisão de produto agora. **Os dois planos já
estão configurados na Kiwify** (Mensal R$ 197, Anual R$ 1.164 em até 12x) —
falta confirmar o valor real de `Subscription.plan.frequency` que cada um
manda no webhook (nenhuma fonte documentou o valor para o plano anual,
só `"monthly"` no exemplo oficial), para preencher o mapa de periodicidade
com dado medido, não suposto. Detalhada em `docs/planos/
item-13-tarefa-3-telas-de-assinatura.md`; depende da Tarefa 2 (acima)
estar pronta.

**Atualização, 05/09/2026: confirmado — `"monthly"` (Mensal) e
`"annually"` (Anual)**, lido direto da API de produtos da Kiwify
(`GET /products/{id}`), não do webhook de uma venda.
`PERIODICIDADE_POR_FREQUENCIA_KIWIFY` já está preenchido
(`src/lib/servicos/verificacao-kiwify.ts`). Ainda não confirmado: se o
webhook de uma compra de verdade carrega esse mesmo valor no mesmo campo —
ver `docs/planos/corrige-webhook-kiwify.md`.

**Tarefa 4 — Limite do plano gratuito.** Bloquear o segundo caminhão
(`CLAUDE.md` §10), o segundo usuário, a sexta importação — cada limite já
está na tabela do §10, falta o ponto de bloqueio em cada fluxo e a tela
"Limite do gratuito" (Tarefa 3) como saída. Não detalhada aqui — depende
da Tarefa 3 estar pronta (é para lá que o limite manda a pessoa). O limite
de importação fica sem gatilho até o item 15 (Importação de fretes)
nascer — ver `docs/planos/item-13-tarefa-3-telas-de-assinatura.md`.

## Decisões fechadas, 03/09/2026 — não reabrir por analogia

1. **Preço: R$ 197/mês, R$ 1.164/ano — decisão do fundador, não correção.**
   É o publicado (`CLAUDE.md` §10). R$ 990 era a recomendação do fundador
   na conversa, nunca a decisão — R$ 840 corrigiu isso. R$ 197/R$ 1.164 é
   outra coisa: o fundador decidiu mudar o preço, direto no painel da
   Kiwify, o mesmo dia. Atualizado em `docs/navegacao.md` e em `CLAUDE.md`
   §14 (a pendência "revisão do valor do plano anual" segue marcada
   resolvida, com a nota do valor final e de que foi decisão, não engano).
2. **A janela entre `inadimplente` e `vencida` é a da Kiwify, sem
   sobreposição própria** — "quem controla o pagamento controla o prazo".
   Registrado como número vindo do fornecedor (ver a nota sob a tabela de
   eventos, acima), não como constante do FretiGate.
3. **Só Kiwify — nenhuma abstração de múltiplos gateways agora**
   (`gateway: String` no modelo é registro, não ponto de extensão,
   `CLAUDE.md` §6). O que garante trocar de gateway depois não é uma
   camada de abstração construída sem o segundo gateway existir — é o
   estado da assinatura, os limites e as telas serem do FretiGate, não da
   Kiwify. Isso já basta.

## Achado com peso maior que "pergunta em aberto": o item 17 pode sobrar

**O programa de afiliado da Kiwify pode tornar o item 17 da ordem de
construção (`docs/especificacao.md` §9, "17. Afiliados — depois do
lançamento", descrito em §4.11: painel, código e link por afiliado,
"percentual e regra: em aberto") desnecessário — não só concorrente com
ele.** Se a Kiwify já rastreia indicação e paga comissão, construir isso
de novo no produto seria refazer o que o checkout entrega de graça. Não é
"dois programas convivendo" — é o programa do produto talvez não precisar
existir.

**Isso não muda nada agora.** O item 17 já está fora do MVP
("depois do lançamento"), e nada na Tarefa 1, 2 ou 3 deste plano depende
dessa resposta. Fica registrado para quando o item 17 voltar à mesa: **a
primeira pergunta, antes de desenhar qualquer tela de afiliado, é se ele
ainda faz sentido** — não "como construir", mas "vale construir".

## Tarefa 1 — construída (03/09/2026)

Migration `20260903060000_pagamento_pendente` aplicada no banco de
desenvolvimento (tabela, `Empresa.gateway_assinante_id`, papel
`fretigate_pagamento`, **sete** funções `SECURITY DEFINER` — uma a mais que
o plano original: `marcar_email_de_pagamento_enviado`, somada quando o
e-mail de ativação virou o único caminho de entrega confirmado, abaixo).
Serviço (`src/lib/servicos/pagamentos.ts`), rota de webhook
(`api/webhooks/kiwify`), tela `/ativar-assinatura` (os dois textos de
indisponível), comando `npm run pagamentos:pendentes` (lista e reenvia),
`criarEmpresaEDono` extraído de `cadastro.ts` para servir aos dois
caminhos de entrada, mecanismo de e-mail extraído de `src/lib/auth/email.ts`
para `src/lib/email` (terceiro momento de e-mail transacional — ver abaixo).
16 testes automatizados novos (`tests/pagamentos.test.ts`) + ajustes em
`tests/isolamento/schema.test.ts`, `vazamento.test.ts` e
`protecao-de-acoes.test.ts` — 180 testes verdes, local, contra o banco de
desenvolvimento. Verificado também manualmente no navegador: registrar →
listar → reenviar → clicar → criar conta (plano pago, periodicidade e
`gateway_assinante_id` certos, `PagamentoPendente` vinculado) → clicar de
novo (mensagem "já ativado").

**Dois erros que a própria construção encontrou, corrigidos antes deste
registro:**
- `reivindicar_pagamento` tentava gravar `empresa_id` antes de a Empresa
  existir — violaria a chave estrangeira. Corrigido: a função só reivindica
  o token; `vincular_pagamento_a_empresa` (função nova) grava o vínculo
  depois que a Empresa já existe.
- `estornarPagamentoPendente` (`src/lib/db`) usava `$executeRaw`, que conta
  linhas da consulta externa (`SELECT função(...)` sempre devolve uma linha),
  não o valor de dentro da função — sempre devolvia `estornou: true`, mesmo
  quando a função não tinha estornado nada. Achado pelo próprio
  `tests/pagamentos.test.ts` (item "estornar um pagamento já aceito não faz
  nada"), corrigido para `$queryRaw`, lendo o valor de verdade.

**Achado que mudou o desenho do plano, com decisão do fundador:** a
premissa "o mesmo link vai no e-mail que a Kiwify manda" não se sustentava
— medido, não suposto: a página de obrigado da Kiwify é uma URL fixa por
produto sem identificador de venda anexado, e o e-mail automático da
Kiwify leva para o painel deles, nunca para uma URL externa (a central de
ajuda da Kiwify confirma: produto de integração externa depende do
vendedor mandar o acesso). Decisão do fundador, 03/09/2026: o FretiGate
manda o próprio e-mail de ativação — **terceiro momento de e-mail
transacional** do produto (`docs/especificacao.md` §"E-mail transacional",
`CLAUDE.md` §5/§11 atualizados). A rota do webhook nunca engole falha de
envio: devolve erro para a Kiwify reentregar.

## `/revisar` — achados corrigidos antes deste registro

Primeiro passe: 15 divergências, 8 lacunas. Todas as divergências corrigidas
neste mesmo passe (nenhuma da categoria "registra e segue" — a maioria era
contradição entre o que o plano/comentário prometia e o que o código fazia,
ou afirmação imprecisa):

- Formulário de `/ativar-assinatura` não pedia o aceite dos Termos, mas
  `criarEmpresaEDono` grava `termos_aceitos_em`/`termos_versao` como se
  aceito — somado o mesmo texto/mecanismo de `FormularioCriarConta.tsx`.
  **Republicação da versão dos Termos** (03/09/2026, Kiwify entrou nos
  subprocessadores) — `VERSAO_TERMOS_PUBLICADA` avançou junto.
- Rota do webhook sem rate limit nenhum — somado `trava-de-webhook.ts`
  (60/min, mais folgado que as travas de pessoa porque quem chama é a
  Kiwify, não alguém tentando adivinhar) e a linha na tabela de travas de
  `docs/especificacao.md`.
- `vincular_pagamento_a_empresa` e `marcar_email_de_pagamento_enviado`
  gravavam sem nenhuma guarda de `status`, contradizendo o que a própria
  migration já dizia sobre onde mora a escrita segura — somadas as guardas
  (`status = 'aceito'` e `status = 'pendente'`, respectivamente).
- `ativarAssinaturaAction` não mandava e-mail de verificação — mesmo
  defeito já corrigido uma vez em `aceitarConviteAction` (dashboard
  afirmando um envio de e-mail que nunca aconteceu). Corrigido, mesmo
  padrão dos outros dois caminhos de entrada.
- `registrarPagamento` descartava o `status` devolvido pela função de
  banco — uma reentrega de `compra_aprovada` depois do token já aceito ou
  estornado reenviava o link morto. Corrigido: o e-mail só sai quando
  `status === "pendente"`.
- "Esta conta já foi criada. Entre normalmente." não tinha saída nenhuma —
  somado o botão **Entrar**, levando a `/entrar`.
- Kiwify ausente da lista de subprocessadores (`ConteudoTermos.tsx`,
  `CLAUDE.md` §11) — somada, mesma categoria de peso do Resend (dado do
  próprio cliente do FretiGate, não de terceiro).
- `net_amount` aceitava decimal e seria gravado em centavos por um cast
  que arredondaria em silêncio — trocado para `.int()`, recusa em vez de
  arredondar.
- Cinco citações/contagens desatualizadas no próprio commit ("seis
  funções" quando já eram sete, "cinco valores fixos" no `ci.yml` quando
  já eram seis, `KIWIFY_WEBHOOK_TOKEN` dizendo "a confirmar" sobre um
  teste que já existia neste mesmo commit, `termos_versao` ainda citando
  `cadastro.ts` depois de mudar de arquivo, duas vezes) — corrigidas.
- Comentário de `atualizarStatusAssinaturaPorAssinanteGateway` dizia que a
  rota "registra" quando não acha a empresa; a rota só devolvia
  `ok: true` sem fazer nada — um `subscription_canceled` que não achasse a
  empresa deixava a assinatura `ativa` para sempre, em silêncio. Corrigido
  para falha alta: HTTP 500 (a Kiwify reentrega) com log, nos quatro
  eventos de assinatura pós-primeiro-pagamento.

Um achado do revisor **não procede** — verificado antes de aceitar: ele
leu o `git status` do início da sessão de revisão como `??`
(não rastreado) para `docs/planos/item-13-assinatura.md`, mas o arquivo
está commitado desde `9b601d9` ("Plano do item 13") e aparecia `M`
(modificado) no status real desta sessão — `git log`/`git status`
conferidos de novo para confirmar.

**Os dois achados de mais peso, na palavra do fundador ao aprovar as
correções:** a conta nascendo com os Termos aceitos sem ninguém ter visto
o texto **é aceite fabricado** — e a correção puxou a republicação da
versão, porque a Kiwify entrou nos subprocessadores. E o
`subscription_canceled` deixando a assinatura `ativa` em silêncio quando
não acha a empresa **é dinheiro parando de entrar sem nada acusar** —
falhar alto é o certo.

## Duas perguntas do plano, respondidas pelo fundador — 03/09/2026

1. **`/ativar-assinatura` entra na lista fechada de telas sem barra de
   navegação.** Entra. É tela de fora de sessão, sem conta ainda, e a
   pessoa não tem para onde navegar — mesmo critério das outras seis; a
   barra pressupõe estar dentro do produto. Somada ao `CLAUDE.md` §8 e ao
   espelho em `docs/estilo.md`, com o motivo.
2. **O comando `pagamentos:pendentes` pode imprimir nome/e-mail do
   comprador no terminal, ou deveria mascarar?** Mostra completo — nunca
   mascara. É o terminal do fundador, ele é o controlador desses dados, e
   o comando existe para ele descobrir quem pagou e não entrou; mascarar
   o e-mail tornaria o comando inútil, porque é por ele que se identifica
   a pessoa. **A tela pública mascara por outro motivo, não pelo
   mesmo** — ela é alcançável por qualquer um que tenha o link, que pode
   não ser quem pagou (caso 3). São situações diferentes, e os dois
   motivos ficam escritos nos dois lugares (`pagamentos.ts`,
   `pagamentos-pendentes.mts`) — de propósito, para que ninguém "corrija"
   um pelo outro por analogia depois.

## Lacunas registradas, não corrigidas agora

- **Formato do payload e os três defeitos que ele revelou — CORRIGIDOS.**
  Tarefa própria, `docs/planos/corrige-webhook-kiwify.md` (03/09/2026,
  entrada correspondente em `docs/diario.md`) — não ficou para a Tarefa 3
  (renumerada em 08/09/2026).
  `route.ts` e a nova peça `src/lib/servicos/verificacao-kiwify.ts` usam o
  formato real (`Customer.full_name/email/CPF`, `Product.product_id`,
  `Commissions.charge_amount`, `webhook_event_type`, `subscription_id`,
  assinatura HMAC-SHA1 na querystring) — não mais o suposto. Lacunas que
  sobraram depois da correção, registradas no plano novo: a fórmula da
  assinatura nunca foi medida contra a URL/cabeçalhos de uma entrega real
  (só o corpo); o valor de `Subscription.plan.frequency` dos dois planos
  reais (R$ 197 mensal, R$ 1.164 anual) ainda não foi medido; e se
  `Commissions.charge_amount`, no plano anual parcelado, traz o total ou a
  parcela.
- Estado parcial: se `reivindicar_pagamento` suceder e a criação da
  Empresa falhar logo depois — mesma classe de risco já aceita em
  `aceitarConvite` (`usuarios.ts`) e em `gerarRelatorio` (item 7): raro,
  sem transação cobrindo as duas conexões, não resolvido agora.
- **Tela `/ativar-assinatura` sem lastro em documento do Design, e sem
  entrada em `docs/navegacao.md`/`docs/componentes.md`** — não estava
  desenhada antes deste item (diferente de "Planos"/"Minha assinatura"/
  "Limite do gratuito"/"Assinatura vencida", que já tinham desenho).
  Layout e texto seguem `TelaAceitarConvite.tsx` por analogia, registrado
  como pedido de confirmação ao Design — inclusive o formato do e-mail
  mascarado (`an***@gmail.com`) e a ausência de `<Marca />` (que
  `docs/estilo.md` trata como decisão nomeada por tela, e aqui só está no
  comentário do código, não no documento).
- **`origem_declarada` fica nulo em todo o Fluxo B** — quem entra pagando
  direto nunca vê a pergunta declarada do cadastro (`CLAUDE.md` §11). Não
  decidido se algum valor fixo ("Anúncio", por exemplo) deveria entrar
  aqui, ou se fica nulo mesmo — mesma família da pendência já registrada
  para `origem_cadastro` (`CLAUDE.md` §14).
- **`CLAUDE.md` §9 previa revisitar o padrão de rota de API que grava
  estado "depois da segunda ou terceira rota"** — esta é a segunda
  (`api/webhooks/kiwify`), e nenhum padrão comum foi decidido ainda,
  continua checagem manual caso a caso.
- `documento_comprador` guardado sem consumidor além do comando de
  visibilidade (caso 1) — mesmo critério já usado para `dados_bancarios`
  (`CLAUDE.md` §14): existe porque a Kiwify manda, sem tela própria por
  enquanto.
- **E-mail de ativação sem "confira a caixa de spam" em tela nenhuma** —
  não existe tela no momento do envio (acontece dentro do webhook, sem
  ninguém do lado de dentro do produto); o texto e o risco do Outlook
  ficaram registrados em `docs/especificacao.md` e `CLAUDE.md` §14, mas o
  lugar natural que outras mensagens desse tipo têm (uma tela que a pessoa
  está olhando) não existe aqui.

## Tarefa 2 — construída (09/09/2026)

O portão de escrita, conforme `docs/planos/item-13-tarefa-2-portao-de-escrita.md`.
`comoUsuario`/`comoDono` (`src/lib/auth/acao.ts`) passaram a checar
`status_assinatura` (`buscarStatusAssinatura`, nova, em `src/lib/servicos/
empresas.ts`) e bloquear — `redirect("/assinatura-vencida")` — quando
`vencida`/`encerrada`; `inadimplente` continua liberado. `comoUsuarioLeitura`
nasceu como o envelope irmão, sem o portão, e embrulha as três exceções
nomeadas (`buscarSugestaoDeValorAction`, `listarDestinosDoClienteAction`,
`buscarMunicipiosAction`, todas em `fretes/acoes.ts`). Nenhuma outra ação
mudou — o padrão inverteu por conta própria, sem precisar tocar as ações que
já usavam `comoUsuario`/`comoDono`.

Teste novo, `tests/bloqueio-de-escrita.test.ts`: contraste (ativa passa,
vencida bloqueia) para `comoUsuario` e `comoDono`, os quatro estados,
`comoUsuarioLeitura` nunca bloqueando, as três exceções reais funcionando sob
`vencida`, `gerarRelatorioAction` (escrita real) bloqueada, e a lista de
exceções por igualdade exata nos dois sentidos — a mesma varredura de
`tests/protecao-de-acoes.test.ts`, agora reconhecendo `comoUsuarioLeitura`
como envelope válido. 22 verificações contadas. `tests/protecao-de-acoes.test.ts`
ajustado (mesmo motivo). Suíte local inteira: 755 testes verdes, 8 pulados
(Chromium, esperado no Windows — `CLAUDE.md` §14).

**Achado do `/revisar`, corrigido no mesmo passe (categoria "contradição
entre documento e código" — `CLAUDE.md` §2):** o comentário de
`buscarStatusAssinatura` afirmava que `comoUsuario`/`comoDono` cobrem "toda
ação de escrita do produto" — falso ao pé da letra, porque as duas rotas de
API que gravam arquivo (`api/fretes/[id]/comprovante`, `api/conta/logo`)
ficam fora do envelope por desenho (`CLAUDE.md` §9, lacuna já conhecida, não
fechada por esta tarefa). Reescrito para nomear a lacuna em vez de afirmar
cobertura que não existe.

**Segundo achado, mesma categoria:** a varredura de `tests/
bloqueio-de-escrita.test.ts` que confere a lista de exceções olhava só
`src/app`, mas `comoUsuarioLeitura` é aceito como envelope válido em todo
`src/` por `tests/protecao-de-acoes.test.ts` — e já existe arquivo `"use
server"` fora de `src/app` (`src/lib/servicos/cadastro.ts`). Uma ação
`comoUsuarioLeitura` criada ali passaria despercebida pelos dois testes:
aprovada por um (é um envelope reconhecido) e invisível para o outro (a
varredura não alcançava a pasta). Corrigido para varrer `src/` inteiro,
mesmo escopo de `protecao-de-acoes.test.ts`.

**Terceiro achado — categoria "rigor total" (dinheiro), corrigido no mesmo
passe por decisão do fundador:** nenhuma das quatro ações sem sessão
(`EXCECOES` de `tests/protecao-de-acoes.test.ts`) passa pelo portão, por
desenho — mas `aceitarConviteAction` deixava alguém aceitar convite para uma
empresa `vencida` sem barreira nenhuma: a pessoa criava conta e senha para
uma conta que não conseguia fazer nada, sem saber por quê (o portão de
escrita é do dono, não dela). Decisão do fundador, 09/09/2026: `aceitarConvite`
(`src/lib/servicos/usuarios.ts`) passou a recusar quando `status_assinatura`
é `vencida`, com mensagem própria ("A assinatura desta empresa está com
pendência — fale com quem te convidou"), **sem consumir o convite** — ele
continua `pendente`, e o mesmo link volta a funcionar quando o dono
regularizar. `inadimplente` não bloqueia, mesma regra do portão.
**`encerrada` fica de fora, decisão explícita do fundador de adiar** — junto
da transição `vencida` → `encerrada` (Tarefa 3, ainda não construída). Dois
testes novos em `tests/usuarios.test.ts` (contraste vencida/inadimplente),
21 verificações contadas (era 17).

**Achado do `/revisar`, registrado como lacuna — não corrigido:** o
`redirect("/assinatura-vencida")` aponta para uma rota que só nasce na
Tarefa 3; até lá, um bloqueio de escrita em produção (alcançável desde já
pelo webhook da Kiwify) cai em 404. Já era o comportamento esperado pelo
plano ("a tela nasce na Tarefa 3, não antes") — a Tarefa 3 é a próxima da
ordem exatamente para fechar essa janela.

**Segunda lacuna registrada, não corrigida:** leitura (`comoUsuarioLeitura`
e todo Server Component) continua aberta em `encerrada`, não só em
`vencida` — nenhum documento define o que `encerrada` deveria fechar além
da escrita. Mesmo limite que o plano já nomeava como fora do escopo desta
tarefa ("o mecanismo que avança `vencida` → `encerrada` depois de 90 dias
... segue de fora daqui também").
