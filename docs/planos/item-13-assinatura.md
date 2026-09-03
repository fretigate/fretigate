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
                                    // configuração da Tarefa 2, não desta).
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

### A exceção ao isolamento — a primeira desde `municipio`, por motivo diferente

`pagamento_pendente` é a **primeira tabela do produto fora do isolamento
por empresa desde `municipio`** — `tests/isolamento/schema.test.ts` só
conhece seis nomes na lista de tabelas sem `empresa_id`
(`session`/`account`/`verification`/`empresa`/`rate_limit`/`municipio`),
conferida por **igualdade exata**: tabela nova sem `empresa_id` que não
está nessa lista reprova a suíte sozinha, de propósito (`CLAUDE.md` §3).

**O motivo é diferente do de `municipio`, e vale registrado assim, não por
analogia**: `municipio` está fora porque é dado global, o mesmo dono (o
IBGE) para sempre — a política `municipio_leitura` (`USING (true) WITH
CHECK (false)`) existe porque a ausência de `empresa_id` é permanente e
por desenho. `pagamento_pendente` está fora porque é **dado que ainda não
tem dono** — a ausência é temporária, dura só até `reivindicar_pagamento`
gravar o `empresa_id` (o campo é nullable exatamente por isso). As duas
são "tabela sem `empresa_id`" pela letra do teste, mas por razões opostas:
uma nunca vai ter dono, a outra está esperando o dela nascer.

**Requisito de construção, Tarefa 1 — os dois lugares que o teste
confere, os dois precisam da entrada nova:**
- `SEM_EMPRESA_ID` (`tests/isolamento/schema.test.ts`) ganha
  `pagamento_pendente`, com o motivo escrito acima (ausência temporária,
  não permanente) — sem essa entrada a suíte reprova sozinha, é o próprio
  mecanismo fazendo o que promete.
- `POLITICAS_ESPERADAS` ganha a política de `pagamento_pendente` (`USING
  (true) WITH CHECK (true)`, restrita a `fretigate_pagamento`), mesma
  forma de declaração já usada para `convite_busca_por_token` e
  `municipio_leitura`, logo abaixo delas no mesmo objeto.

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

| Evento Kiwify | Ação |
|---|---|
| `compra_aprovada` | `registrar_pagamento_pendente` (se `tracking.s1` vier vazio — venda nova, sem empresa) **ou** atualiza `status_assinatura`/`plano` da empresa apontada por `s1` (se vier preenchido — upgrade de dentro do produto, ver seção abaixo) |
| `subscription_renewed` | Empresa já existe (busca por `empresa_id` guardado em `PagamentoPendente.empresa_id` ou pelo `s1`) — `status_assinatura` volta a `ativa` se estava `inadimplente` |
| `subscription_late` | `status_assinatura` → `inadimplente` |
| `subscription_canceled` | `status_assinatura` → `vencida` (inicia os 90 dias, §10 `CLAUDE.md`) |
| `compra_reembolsada` / `chargeback` | Se ainda `pendente`: `estornar_pagamento_pendente` (caso 4). Se já `aceito`: mesmo tratamento de `subscription_canceled` |

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

**Tarefa 2 — Telas dentro do produto: Planos, Minha assinatura, Limite do
gratuito, Assinatura vencida.** Design já tem as quatro desenhadas
(`docs/navegacao.md`, linhas 64-67), preço corrigido para R$ 840 (acima) —
sem bloqueio de decisão de produto agora. O que falta antes de construir:
o produto/oferta de cada periodicidade configurado na Kiwify com o valor
certo (R$ 149 mensal, R$ 840 anual), para os links de checkout que a tela
"Planos" gera existirem de verdade.

**Tarefa 3 — Limite do plano gratuito.** Bloquear o segundo caminhão
(`CLAUDE.md` §10), o segundo usuário, a sexta importação — cada limite já
está na tabela do §10, falta o ponto de bloqueio em cada fluxo e a tela
"Limite do gratuito" (Tarefa 2) como saída. Não detalhada aqui — depende
da Tarefa 2 estar pronta (é para lá que o limite manda a pessoa).

## Decisões fechadas, 03/09/2026 — não reabrir por analogia

1. **Preço do anual: R$ 840.** É o publicado (`CLAUDE.md` §10); R$ 990 era
   a recomendação do fundador na conversa, nunca a decisão — corrigido em
   `docs/navegacao.md` e em `CLAUDE.md` §14 (a pendência "revisão do valor
   do plano anual" está marcada resolvida).
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

## Lacunas registradas, não corrigidas agora

- Autenticidade do webhook (assinatura/token) — mecanismo exato a
  confirmar contra um envio de teste real da Kiwify antes de escrever a
  rota.
- Estado parcial: se `reivindicar_pagamento` suceder e a criação da
  Empresa falhar logo depois — mesma classe de risco já aceita em
  `aceitarConvite` (`usuarios.ts`) e em `gerarRelatorio` (item 7): raro,
  sem transação cobrindo as duas conexões, não resolvido agora.
- Texto exato do e-mail parcial mascarado (`an***@gmail.com` é proposta
  desta tarefa, não confirmado pelo Design) e da tela de confirmação de
  compra — pedido ao Design.
- `documento_comprador` guardado sem consumidor além do comando de
  visibilidade (caso 1) — mesmo critério já usado para `dados_bancarios`
  (`CLAUDE.md` §14): existe porque a Kiwify manda, sem tela própria por
  enquanto.
