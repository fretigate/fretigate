# Plano — item 13, Tarefa 3 (continuação): tela de Planos + upgrade de dentro do produto

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Continuação de `docs/planos/item-13-tarefa-3-telas-de-assinatura.md`, que já
tinha decidido conteúdo, acesso e layout das quatro telas de assinatura, mas
ficou travada em "Planos" por falta dos links de checkout reais. O fundador
deu os dois links nesta sessão:

- Mensal: `https://pay.kiwify.com.br/xHd3Ef5`
- Anual: `https://pay.kiwify.com.br/CC4c1vO`

**Só "Planos" nesta tarefa.** "Minha assinatura" fica de fora — decisão do
fundador, 18/09/2026: o botão de gerenciar cobrança depende da área do
assinante da Kiwify, ainda não confirmada (pergunta 2 do plano anterior,
segue em aberto).

## 1. A tela `/planos`

Nível 2 (`docs/navegacao.md` § Regras de navegação): superfície clara, sem
barra de navegação flutuante própria, `BotaoVoltar` no topo — mesmo padrão de
`/assinatura-vencida` e `/limite-do-gratuito`, já construídas.

**Acesso: só o dono** (`exigirDono()`, `SemPermissao` → `notFound()` — mesmo
padrão de `/conta`). Decisão já registrada no plano anterior: é dinheiro e
contrato da empresa.

**Conteúdo** (`docs/componentes.md` linha 502): principal **Assinar o
anual**, secundária **Assinar o mensal**. Anual R$ 1.164 em destaque, Mensal
R$ 197. **Sem o número do parcelamento por enquanto** — ver o achado abaixo.

**Os dois botões chamam `abrirLinkExterno` no `onClick`, nunca `href`
comum** — mesmo padrão de `AcaoCobrarNoWhatsApp.tsx`: sem isso, o link quebra
do mesmo jeito que o convite quebrava no app instalado (`CLAUDE.md` §14,
"Convite por WhatsApp não entrega direto no app instalado do iPhone").

**Os links vêm de duas variáveis de ambiente novas** — `KIWIFY_CHECKOUT_URL_MENSAL`/
`KIWIFY_CHECKOUT_URL_ANUAL`. O link só existe DEPOIS que o dono toca em
"Assinar" — não é montado direto por esta página (ver seção 2, abaixo, para
o motivo). `TelaPlanos.tsx` chama a Server Action `gerarLinkDeCheckoutAction`
(`./acoes.ts`), que cria o pedido de upgrade e devolve a URL pronta;
`prepararJanelaExterna` (`src/lib/utils/link-externo.ts`), não
`abrirLinkExterno` direto — mesmo padrão de `FormularioConvite.tsx`: a
janela abre em branco, síncrona com o toque, antes do `await` da Server
Action, e só depois é redirecionada para a URL real. Sem isso, o link quebra
do mesmo jeito que o convite quebrava no app instalado (`CLAUDE.md` §14,
"Convite por WhatsApp não entrega direto no app instalado do iPhone").

## Achado com destaque: o checkout real cobra juro no parcelamento

`CLAUDE.md` §10 dizia "12x de R$ 97,00 — mesmo total, parcelado". Abri os
dois links de checkout de verdade antes de escrever qualquer preço na tela
(pedido do fundador: "confirma que o número na tela é o que a Kiwify
realmente cobra") — o link do Mensal bate (R$ 197,00/mês). **O do Anual
não**: o seletor de parcelas vem pré-selecionado em **12x de R$ 120,38**
(total R$ 1.444,56), marcado "\*Parcelamento com acréscimo". R$ 1.164,00
só aparece como a opção "à vista" (1x) do mesmo seletor — quase R$ 281 de
diferença sobre o total, que a pessoa só descobriria pagando.

Corrigido em `CLAUDE.md` §10 e `docs/navegacao.md` (o valor parcelado passa
a ser 12x de R$ 120,38, com a ressalva de que não é o mesmo total). **A
tela de Planos nasce sem o número do parcelamento** — decisão do fundador,
18/09/2026: ele vai conferir no painel da Kiwify se dá para configurar sem
juro antes de decidir o que a tela mostra. Quando essa resposta vier, a
tela ganha a linha do parcelamento (sem juro, se der; "com juros", se não
der — nunca escondido).

## 2. O mecanismo do `s1` no webhook — upgrade de dentro do produto

Já desenhado em `docs/planos/item-13-assinatura.md` ("Upgrade de dentro do
produto"), nunca implementado — o webhook hoje ignora qualquer rastreio e
trata todo `order_approved` como Fluxo B.

**O campo já está confirmado, não suposto.** O payload real capturado via
"Testar Webhook" (03/09/2026, já salvo em `tests/verificacao-kiwify.test.ts`,
`PAYLOAD_REAL_DE_TESTE`) já tem `TrackingParameters.s1` — só não estava
declarado no `schemaWebhook`, então a leitura nunca acontecia. O que
continua sem medir: que uma compra de verdade, feita pelo link de `/planos`
(com `s1` preenchido), chegue com esse mesmo valor no mesmo campo — só o
formato (com `s1: null`) foi confirmado até hoje. Mesma categoria da
fórmula da assinatura (`CLAUDE.md` §14) — fecha só com uma compra real.

### O achado do `/revisar` — duas voltas até chegar na versão certa

A **primeira** versão desta tarefa mandava o `empresa_id` **cru** no `s1`.
O `/revisar` (18/09/2026) apontou o problema: `s1` viaja na querystring da
URL de checkout, que a própria pessoa que paga pode editar antes de
completar a compra — contra `CLAUDE.md` §3, "`empresa_id` vem sempre da
sessão autenticada no servidor... nunca de URL, formulário, header ou
body". O golpe que isso abria: pagar com o `empresa_id` de **outra**
empresa no `s1` e depois pedir reembolso — o webhook de estorno marcaria a
assinatura daquela empresa como `vencida`, sem ela ter feito nada. Rigor
total (`CLAUDE.md` §2) — decisão do fundador: implementar antes do commit.

A **segunda** volta trocou o `empresa_id` cru por um valor **assinado**
(HMAC-SHA256, com prazo). Um segundo passe do `/revisar` apontou que isso
não fechava o achado na essência: o identificador continuava vindo do
corpo do webhook, nunca de uma sessão — só ficava mais difícil de forjar.
O padrão que o próprio `CLAUDE.md` §9 já usa para "não sei a empresa
ainda" (`Convite`/`fretigate_convite`) nunca transporta o identificador —
resolve ele NO BANCO, por um token opaco.

**A versão final, terceira volta, é essa: um token opaco, sem informação
nenhuma de empresa embutida.**
- `SolicitacaoUpgrade` (entidade nova, `docs/especificacao.md`) — tabela de
  domínio normal, isolada como qualquer outra: nasce quando o dono, logado,
  toca em "Assinar", com `empresa_id` da sessão. `token` aleatório (mesmo
  gerador de `gerarTokenDePagamento`, 32 bytes hex), `expira_em` (48h à
  frente), `usado_em` (nulo até reivindicada).
- `reivindicar_solicitacao_upgrade` (`SECURITY DEFINER`, papel
  `fretigate_pagamento`) — reivindicação atômica, uso único e com prazo,
  mesmo desenho de `reivindicar_pagamento`. Não recebe nem devolve nada
  além do `empresa_id`, e só devolve isso se a reivindicação valer.
- `src/lib/servicos/pagamentos.ts`: `criarSolicitacaoUpgrade(empresaId)`
  (cria o pedido) e `resolverUpgradePorToken(token, dados)` (reivindica e,
  se achar, chama `atualizarAssinaturaPorUpgrade` — que muda `plano`/
  `periodicidade`/`status_assinatura`/`gateway_assinante_id` direto na
  `Empresa`, sem criar `PagamentoPendente` nem mandar e-mail de ativação).
- `src/app/api/webhooks/kiwify/route.ts`: no evento `order_approved`, se
  `s1` vier, chama `resolverUpgradePorToken` com o token cru — nenhum
  `empresa_id` passa pela rota em momento nenhum. Se resolver, responde
  `ok`. Se não (token vencido, já usado, ou nunca existiu), cai no caminho
  de hoje (Fluxo B), inalterado.
- `src/app/(app)/planos/acoes.ts`: `gerarLinkDeCheckoutAction`, embrulhada
  por `comoDonoSemPortao` (`src/lib/auth/acao.ts`, novo — segunda exceção
  nomeada do envelope, mesma ideia de `comoUsuarioLeitura`: `comoDono`
  bloqueia escrita sob assinatura vencida, e é exatamente quem está
  vencida que precisa gerar este link para poder pagar).

**O segredo `UPGRADE_S1_SECRET` da segunda volta não existe mais** — um
token opaco não precisa de assinatura, só de ser difícil de adivinhar
(256 bits de entropia, mesma força dos outros tokens do produto).

## 3. Quando o `s1` não bate com empresa nenhuma — nota do fundador

**Decisão nova, pedida pelo fundador ao aprovar o plano anterior:** cair no
Fluxo B quando o `s1` não bate é o comportamento certo (nunca perder o
pagamento de vista, e dá à pessoa um caminho de entrada) — mas isso, na
prática, manda um e-mail de "crie sua conta" para alguém que **já tem
conta**. É sinal de que algo saiu errado (link velho, bug, id copiado
errado), mesmo com a saída funcionando, e o comando de visibilidade que já
existe (`scripts/pagamentos-pendentes.mts`) precisa mostrar isso.

**Mecanismo:** `PagamentoPendente` ganha uma coluna nova,
`s1_sem_correspondencia` (texto, nula) — grava o TOKEN que chegou em `s1`
mas não resolveu upgrade nenhum (vencido, já usado, ou nunca existiu).
Nula no caso comum do Fluxo B (venda direta, sem `s1`). Só diagnóstico,
nunca usado para achar a empresa de novo (a tentativa já falhou antes
deste registro nascer). Texto, não `uuid` — o `s1`, desde a versão final
do mecanismo, nunca carrega um `empresa_id`.

- Migration nova, seguindo `20260807090000_reverter_cadastro_incompleto`
  como modelo para alterar uma função `SECURITY DEFINER` já existente
  (`DROP FUNCTION` + `CREATE FUNCTION` com o novo parâmetro, `GRANT`/
  `REVOKE`/`OWNER` de novo — nenhuma migration deste projeto tinha
  precisado estender uma função depois de criada; este é o primeiro caso,
  e seguir o precedente do reversor evita inventar um padrão novo). A
  mesma migration cria `solicitacao_upgrade` e `reivindicar_solicitacao_upgrade`
  (seção 2, acima).
- `registrar_pagamento_pendente` ganha o parâmetro
  `p_s1_sem_correspondencia text DEFAULT NULL` (append no fim — chamada
  existente continua funcionando sem passar o novo argumento).
- `src/lib/db/index.ts` (`registrarPagamentoPendente`) e
  `src/lib/servicos/pagamentos.ts` (`registrarPagamento`) passam o campo
  adiante.
- `scripts/pagamentos-pendentes.mts`: a listagem ganha um aviso
  (`⚠️ CHEGOU COM s1=<token> — pode já ter conta`) quando o campo não é
  nulo. Mostrado por inteiro (não mascarado) — o token já está morto neste
  ponto, não é credencial que ainda abre nada.

## Testes

- `tests/pagamentos.test.ts`: `atualizarAssinaturaPorUpgrade` — empresa
  gratuita existente vira `pago` com periodicidade/status/gateway certos;
  `empresa_id` inexistente devolve `false` sem quebrar.
  `criarSolicitacaoUpgrade` → `resolverUpgradePorToken` — round-trip
  completo (o token que a tela geraria resolve para a mesma empresa e
  aplica o upgrade); um token já reivindicado não resolve de novo (uso
  único, mesmo reenviando o mesmo webhook); um token vencido não resolve,
  mesmo existindo de verdade; token que nunca existiu devolve `false`.
  Contraste do fallback: `registrarPagamento` grava
  `s1_sem_correspondencia` com o token recebido.
- `tests/isolamento/vazamento.test.ts`/`schema.test.ts`: `solicitacao_upgrade`
  entra no laço genérico de isolamento (é tabela de domínio normal, mesma
  prova que qualquer outra) e ganha a segunda política
  (`solicitacao_upgrade_reivindicacao`, só para `fretigate_pagamento`).
- `tests/protecao-de-acoes.test.ts`/`bloqueio-de-escrita.test.ts`:
  `comoDonoSemPortao` entra como envelope reconhecido, com a mesma lista
  fechada por igualdade exata que `comoUsuarioLeitura` já tinha.
- **`tests/webhook-kiwify-upgrade.test.ts` (novo, 18/09/2026) — o
  contraste que faltava na camada certa.** Achado ao responder uma
  pergunta do fundador antes do commit: nenhum teste desta lista acima
  chama a ROTA (`api/webhooks/kiwify/route.ts`) — todos chamam
  `resolverUpgradePorToken`/`criarSolicitacaoUpgrade` direto, do serviço.
  Isso significa que nada reprovaria se alguém revertesse `route.ts` para
  tratar `s1` como `empresa_id` cru (a primeira versão, rejeitada) — a
  regressão exata para a v1 passaria pela suíte inteira sem ser notada,
  porque a rota nunca era exercitada. **Medido, não suposto**: reintroduzi
  a v1 de propósito em `route.ts`, rodei este teste novo — reprovou,
  exatamente na afirmação de que a empresa não devia virar `pago` —,
  revertido para o mecanismo de token, roda verde. `next/headers` (a
  trava de rate limit da rota chama) precisa de mock, mesmo padrão de
  `tests/bloqueio-de-escrita.test.ts`; `mandarEmailDeAtivacao` também é
  mockado, para não disparar e-mail de verdade pela Resend (`CLAUDE.md`
  §5).

## Lacunas registradas pelo `/revisar`, não corrigidas nesta tarefa

- **Nenhum rastro de pagamento nasce no caminho de upgrade** —
  diferente do Fluxo B (`PagamentoPendente`), um upgrade bem-sucedido só
  muda colunas de `Empresa`; `order_id`, valor pago e dados do comprador
  não ficam registrados em lugar nenhum, e `scripts/pagamentos-pendentes.mts`
  não os enxerga. Isto já era assim no desenho original
  (`docs/planos/item-13-assinatura.md`, "atualiza a empresa... direto",
  sem criar registro), não uma escolha desta tarefa — mas o `/revisar`
  está certo que é uma lacuna de verdade para reconciliação financeira.
  Fica para o fundador decidir se vale um registro próprio de auditoria.
- **`s1` é o mesmo parâmetro de rastreio de afiliado da Kiwify.** Se o
  programa de afiliado (item 17) for ligado um dia, há conflito de uso do
  mesmo slot — quem ligar o afiliado precisa reexaminar isto primeiro.
- **Preço na tela é constante no código** (`ANUAL_CENTAVOS`/
  `MENSAL_CENTAVOS`, `TelaPlanos.tsx`) — se o preço mudar no painel da
  Kiwify, a tela não acompanha sozinha. Mesmo padrão já aceito para outros
  números de regra de produto (`docs/componentes.md`, "Números de regra de
  produto") — citação do valor decidido em `CLAUDE.md` §10, não uma fonte
  viva.
- **Reentrega do mesmo `order_approved` de um upgrade já bem-sucedido —
  corrigido o que isso causa de verdade, achado do quarto passe do
  `/revisar`: a primeira explicação (registrada aqui no terceiro passe)
  dizia "cria uma segunda empresa", e não foi conferida contra o código
  antes de escrita (`CLAUDE.md` §2, "explicação plausível não é explicação
  verificada").** O que acontece de verdade, lendo `ativarAssinatura`
  (`pagamentos.ts`) e `criarEmpresaEDono`: o token de `SolicitacaoUpgrade`
  é de uso único — a primeira entrega resolve e consome. Se a Kiwify
  reentregar o mesmo evento (reentrega "até 5 vezes" em caso de falha,
  `CLAUDE.md` §14), a segunda tentativa não resolve o upgrade (token já
  usado), cai no Fluxo B e cria um `PagamentoPendente` **com o mesmo
  `gateway_assinante_id`** que a empresa já upgradeada acabou de gravar. A
  pessoa recebe "crie sua conta" e clica: `reivindicarPagamento` marca o
  token como `aceito` **antes** de `criarEmpresaEDono` rodar; `tx.empresa.create`
  então falha na restrição `UNIQUE` de `gateway_assinante_id` (já
  pertence à empresa real) e devolve "Não deu para criar a conta agora" —
  mas o token já ficou `aceito`, não `pendente`. Resultado: **nenhuma
  segunda empresa nasce, mas quem pagou fica sem conta nova (não
  precisava de uma) e sem retry nenhum que funcione** — o link mostra
  "esta conta já foi criada" (`buscarConfirmacaoDeCompra`), o que também
  não é verdade. Só acontece se a resposta da primeira entrega não
  confirmar sucesso para a Kiwify (rede, timeout) — janela estreita, mas
  real. **Decisão final do fundador, 18/09/2026: lacuna aceita, não
  corrigida.** Incômodo (e-mail de ativação redundante), não risco —
  nenhuma segunda empresa nasce, nenhum pagamento se perde, e a saída
  existe (a pessoa vê "já existe uma conta com esse e-mail" e ignora o
  e-mail). Fechar direito pediria guardar `transacao_externa` em
  `SolicitacaoUpgrade` e checar antes de cair no Fluxo B — não vale a
  complexidade a mais para este risco.
- **Validade de 48 horas do `SolicitacaoUpgrade`** — número da construção
  (Pix/boleto podem demorar mais que isso para compensar), nunca
  confirmado pelo fundador. Se estourar, cai no Fluxo B (mesmo
  comportamento do item acima). Fica registrado para confirmação.
- **Teste de dono/`rolbypassrls` das funções de `fretigate_pagamento` da
  Tarefa 1 (`reivindicar_pagamento` etc.) — lacuna herdada, não desta
  função.** Corrigido para `reivindicar_solicitacao_upgrade` nesta
  tarefa (`tests/pagamentos.test.ts`, seção "8." — prova, com o mesmo
  padrão de `reverter_cadastro_incompleto`/`localizar_convite_por_token`,
  que o dono da função não ignora RLS por atributo). As funções mais
  antigas de `fretigate_pagamento` (Tarefa 1) continuam sem esse teste —
  vale fechar as duas linhas juntas se o fundador achar que compensa
  agora.
- **`BotaoVoltar` de `/planos` sempre leva a `/mais`**, mas a única origem
  real hoje é `/limite-do-gratuito` (a pílula em Mais ainda não existe,
  ver abaixo) — quem chega de lá e toca em voltar cai numa tela onde não
  estava. `/limite-do-gratuito` já resolve o mesmo problema recebendo
  `voltar` por query; `/planos` poderia herdar o mesmo padrão quando tiver
  mais de uma origem real.

## Fora do escopo — registrado, não esquecido

- **Minha assinatura** — fica para quando a área de assinante da Kiwify
  estiver confirmada.
- **Confirmar juro-zero no parcelamento** — o fundador vai conferir no
  painel da Kiwify. Até lá, a tela não mostra o número do parcelamento.
- **A compra de teste real** — nota do fundador: uma compra só, pelo link
  de `/planos`, fecha três pendências de uma vez — a fórmula da assinatura
  (`CLAUDE.md` §14, nunca medida contra uma entrega real), o `s1` (que o
  campo realmente chega preenchido como o formato promete), e o fluxo
  inteiro de pagamento ponta a ponta. Fica para quando a tela estiver no
  ar — o fundador já disse que faz.
- **A pílula "Assinar e liberar a frota" em Mais** — ainda não existe no
  código (`src/app/(app)/mais/page.tsx` não tem essa linha, achado ao
  planejar esta tarefa — `docs/componentes.md` linha 491 e
  `docs/navegacao.md` linha 20 já a descrevem, mas ninguém construiu).
  `/planos` fica alcançável só por `/limite-do-gratuito` e URL direta até
  ela nascer — mesma "janela curta" já aceita antes.
