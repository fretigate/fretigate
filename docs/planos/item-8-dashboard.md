# Plano — item 8: Dashboard

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 7 (relatório) fechou no commit `b58ffe9`. Sete dos dez itens do MVP
prontos — faltam dashboard (este), configurações e conta, despesas,
assinatura.

Hoje `src/app/(app)/page.tsx` é um pouso provisório: só o nome da empresa,
criado no item 1 para não mandar quem acabou de criar conta para uma tela
vazia. A dashboard de verdade é montagem, não construção de fundação — quase
todo dado que ela mostra já existe e já é calculado em outro lugar do
produto:

| O que a dashboard precisa | Já existe em |
|---|---|
| A receber · Vencido | `resumoDeCobrancas` (`src/lib/servicos/cobrancas.ts`) — já soma para a empresa inteira, não por cliente |
| Fretes a faturar | `contarFretesAFaturar` (`src/lib/servicos/cobrancas.ts`) |
| Filtro de Fretes por situação/período via URL | `?situacao=`, `?periodo=personalizado&de=&ate=` (`src/app/(app)/fretes/page.tsx`, `src/lib/utils/periodo.ts`) — o comentário do item 4 já previa "o item 8 vai linkar direto para uma janela específica" |
| Filtro de Cobranças por situação via URL | `?situacao=vencidas` (`src/app/(app)/cobrancas/page.tsx`) |
| km e R$/km com cobertura parcial | `resumoDoCaminhao` (`src/lib/servicos/servicos.ts`) — mesmo padrão de "convite só quando zero", reaproveitado aqui para a empresa inteira |
| E-mail não confirmado | `Usuario.email_verificado` (Better Auth já grava) |
| "Gerar relatório" com cliente pré-selecionado | `/relatorio?cliente=` (item 7, Tarefa 4) |

O que falta é uma camada nova de agregação **por empresa e por mês** (hoje só
existem por cliente/caminhão/motorista) e a tela em si.

## Três pendências que dependem de item futuro — como tratar cada uma

Igual ao que já aconteceu no item 7 com "Vencidos" e Pix: um card ou pendência
que aponta para algo que não existe ainda entra em **estado de convite**,
nunca em botão sem ação de fundo (`CLAUDE.md` §8).

- **Lucro no mês** — depende de `Despesa` (item 11), que não existe no
  schema. Nasce em convite: "O lucro aparece quando houver despesa lançada",
  levando a `/despesas` (que hoje mostra o próprio estado vazio explicando o
  motivo — `docs/navegacao.md` linha 47).
- **Cartão de comunicação da plataforma (FretiNews)** — depende do item 16
  (Novidades), fora do MVP. Não entra: sem mensagem ativa possível, a
  condição "só quando houver mensagem ativa" nunca é verdadeira.
- **Guia de progresso no topo** — pertence ao item 14 (Primeiro acesso),
  também fora do MVP (`docs/especificacao.md` §9: "14. Primeiro acesso —
  depois do lançamento"). Não entra nesta tarefa.

Confirmando o pedido de checar a lista de pendências inteira: **"Importar
fretes"** (atalho do cartão escuro) tem o corte **já registrado** desde
09/08/2026 (`docs/especificacao.md`, "O que o corte da importação deixa em
tela") — o cartão nasce com um atalho só, "Gerar relatório". Não é uma
pendência nova encontrada agora, é a mesma decisão de sempre chegando na
prática.

## Quatro decisões do fundador, 29/08/2026

**1. Rodagem no mês mostra dado real, mesmo padrão do perfil do caminhão —
não convite fixo.** `Servico.km` existe desde o item 3 (campo manual); o
item 12 é só o cálculo **automático** da distância, não um pré-requisito
para o campo existir. Segurar o número esconderia dado que o usuário já
digitou, e criaria uma contradição com o perfil do caminhão, que já mostra
esse mesmo tipo de número. Convite só quando **nenhum** frete do mês tem km
preenchido — mesma condição de cobertura zero que `resumoDoCaminhao` já usa.

**2. A marca da empresa, no respiro do cartão escuro, nasce não-tocável.**
"Conta da empresa" é o item 10, ainda não construído. Levar a "Mais" seria
destino de consolação — quem toca no nome da empresa espera dados dela
(CNPJ, endereço, logo), não uma lista de atalhos. Pior que não responder,
porque ensina que aquele toque não vale a pena. Vira tocável quando o item
10 construir a tela de Conta — janela curta, é o próximo item da ordem.

**3. "Fretes em andamento" leva a Fretes sem filtro** — mesmo padrão já
usado em "Pendência de cobrança → Cobranças" (`docs/navegacao.md`). Não
existe filtro por situação **operacional** em Fretes hoje (só situação
financeira: a_faturar/faturado/parcial/quitado), e o inventário de chips
daquela tela é fechado — acrescentar um quarto é decisão do Design, não
consequência da dashboard. **Registrado como pedido ao Design**, não como
pendência interna: o destino desta pendência é impreciso (a linha diz "3 em
andamento, 1 sem ordem" e leva a uma lista sem esse recorte) até que exista
um quarto chip de situação operacional em Fretes.

**4. Sugestão de relatório dispara com 3 ou mais fretes não faturados de um
mês fechado.** Um ou dois fretes esquecidos é normal (frete que entrou no
fim do mês, cliente que ainda não fechou) — avisar por isso enche "Precisa
de você" de ruído, e é o bloco mais valioso da tela: se começar a mostrar
coisa que não pede ação, a pessoa para de olhar. Três é acúmulo de verdade —
o caso que originou o produto (`CLAUDE.md` §1). **"Mês fechado" = mês civil
já encerrado**, respeitando o fuso de Fortaleza (`diaEmFortaleza`, mesmo
mecanismo já usado três vezes — sem ele, no dia 1º de manhã o servidor em
UTC ainda estaria no dia 31, e o mês que acabou de fechar não apareceria
como fechado). **O número 3 é heurística, ajustável** — não é regra de
negócio travada; se gerar ruído, sobe; se deixar passar cobrança, desce.
Registrar isso no comentário do código, não só aqui.

As quatro decisões entram em `docs/especificacao.md` §4.6 na Tarefa 2, para
não ficarem presas só neste plano (`CLAUDE.md` §2).

## O que fica de fora, e por quê (tabela igual à do item 7)

| Onde | O que falta | Motivo |
|---|---|---|
| Cartão escuro | Atalho "Importar fretes" | Item 15, adiado — corte já registrado |
| Cartão escuro | Marca tocável → Conta | Item 10, ainda não construído — nasce não-tocável |
| Pastilha Lucro | Valor real | Item 11 (Despesa), fora do schema — nasce em convite |
| Cartão FretiNews | O cartão inteiro | Item 16, fora do MVP |
| Topo da tela | Guia de progresso | Item 14, fora do MVP |
| Pendência "Fretes em andamento" | Destino filtrado | Sem quarto chip em Fretes — pedido ao Design, leva sem filtro por enquanto |

---

## As tarefas

### Tarefa 1 — Dados: o serviço de leitura da dashboard

Novo arquivo `src/lib/servicos/dashboard.ts`. Só leitura — nenhuma tabela
nova, nenhuma migration.

- **`resumoDoMes(empresaId, hoje)`** — faturamento do mês corrente (soma
  `Servico.valor`, `status_operacional: { not: "cancelado" }` — mesmo
  filtro-base de `resumoDoCaminhao`/`resumoDoMotorista`, "somar é diferente
  de cobrar", `CLAUDE.md` §9), comparação com o mês anterior (mesma soma,
  mês deslocado — `deslocarMes`), quantidade de fretes e média por frete
  (float, métrica calculada na exibição, nunca gravada — mesma exceção já
  registrada para `rsPorKm`, `CLAUDE.md` §7).
- **`resumoDeRodagemDoMes(empresaId, hoje)`** — km total do mês e R$/km,
  mesma forma de `resumoDoCaminhao` (filtro `km: { gt: 0 }`, convite —
  devolve `null` — só quando nenhum frete do mês tem km).
- **Reaproveita sem alterar:** `resumoDeCobrancas` (A receber/Vencido),
  `contarFretesAFaturar`.
- **`contarFretesEmAndamento(empresaId)`** — total de `Servico` com
  `status_operacional: "em_andamento"`, `arquivado_em: null`, e quantos
  desses têm `ordem_enviada_em: null`.
- **`contarCobrancasVencidasAgrupadas(empresaId, hoje)`** — conta na mesma
  unidade que a lista de Cobranças mostra (`docs/especificacao.md` §4.5:
  "uma cobrança gerada por relatório é uma linha só"), reaproveitando a
  mesma lógica de agrupamento por `relatorio_id` já usada em
  `agruparPorRelatorio` (`cobrancas-situacao.ts`) — nunca conta título cru,
  que infla o número de uma cobrança agrupada em N.
- **`sugerirRelatorio(empresaId, hoje)`** — entre os fretes `a_faturar`
  (mesmo filtro de `contarFretesAFaturar`) com `data_servico` antes do
  primeiro dia do mês corrente (em fuso de Fortaleza — qualquer mês já
  fechado, não só o mês passado), agrupa por cliente e devolve o cliente com
  **3 ou mais**, priorizando o de maior contagem quando mais de um
  qualificar. `null` quando nenhum cliente atinge o limiar.
- **`faturamentoPorMes(empresaId, hoje, meses = 6)`** — soma de
  `Servico.valor` (mesmo filtro-base de `resumoDoMes`) para cada um dos
  últimos 6 meses incluindo o atual, para as barras do gráfico.
- **E-mail não confirmado**: leitura direta (`db(empresaId).usuario.
  findUnique({ where: { id: sessao.usuarioId } })`), sem função própria —
  é um campo só, não uma agregação.

**Testes:** cada função nova com teste de serviço, contra o banco de
desenvolvimento (`CLAUDE.md` §2, "suíte verde" ≠ "esteira verde" — a
esteira confirma depois do push). Casos que exigem atenção:

- `resumoDoMes`/`faturamentoPorMes`: frete `cancelado` fora da soma,
  `em_andamento` dentro (mesmo contraste que os testes de `resumoDoCaminhao`
  já fazem).
- `resumoDeRodagemDoMes`: cobertura parcial (alguns fretes do mês com km,
  outros sem) e cobertura zero (convite).
- `sugerirRelatorio`: fronteira do mês fechado no fuso de Fortaleza (um
  frete no último dia do mês passado, tarde da noite em UTC, ainda dentro do
  mês fechado em Fortaleza); exatamente 2 fretes não dispara; exatamente 3
  dispara; frete `cancelado` ou já faturado não conta; dois clientes
  qualificando ao mesmo tempo escolhe o de maior contagem.
- `contarFretesEmAndamento`: frete arquivado não conta (mesmo cuidado já
  registrado em `resumoDeCobrancas` para `servico.arquivado_em`).

### Tarefa 2 — Tela: a dashboard de verdade, substituindo o pouso provisório

Reescreve `src/app/(app)/page.tsx` (ou move o pouso provisório e cria a tela
definitiva no lugar — decisão de implementação, não de produto).

- **Cartão escuro**: círculo de iniciais 30px + nome da empresa (marca
  **não-tocável**, decisão 2 acima), faturamento do mês (60px), linha de
  comparação com o mês anterior (seta + variação, `#7FCB9B`), quantidade de
  fretes, média por frete. Um atalho só: **Gerar relatório** → `/relatorio`.
- **Quatro pastilhas**: A receber → `/cobrancas` · Vencido →
  `/cobrancas?situacao=vencidas` · Lucro (convite) → `/despesas` · Rodagem
  (dado real ou convite por cobertura, decisão 1) — **não-tocável**, decisão
  do fundador, 29/08/2026: uma pastilha que responde ao toque sem levar a
  lugar nenhum é pior do que uma que não responde (as outras três sempre têm
  destino, mesmo em convite — Lucro leva a Despesas). Registrado como pedido
  ao Design, mesmo tratamento da marca da empresa (decisão 2): só vira
  tocável se e quando existir um destino de verdade para ela.
- **Barras dos últimos 6 meses**: `faturamentoPorMes`, cores por
  `docs/estilo.md` (mês corrente `#1B6B3A`, anterior `#D6D1C5`, resto
  `#E4E0D6`), cada barra tocável leva a
  `/fretes?periodo=personalizado&de=<primeiro dia>&ate=<último dia>`.
- **"Precisa de você"**, cinco linhas, cada uma só aparece quando a condição
  é verdadeira:
  - Fretes em andamento (indicando quantos sem ordem enviada) → `/fretes`
    sem filtro (decisão 3).
  - Fretes a faturar → `/fretes?situacao=a_faturar`.
  - Cobranças vencidas → `/cobrancas` sem filtro (mesmo padrão já
    documentado para esta linha em `docs/navegacao.md`).
  - Sugestão de relatório (`sugerirRelatorio`) → `/relatorio?cliente=<id>`.
  - E-mail ainda não confirmado → pílula **Reenviar e-mail**, decisão do
    fundador, 29/08/2026: um aviso sem saída contradiz o motivo de a
    verificação não bloquear o login (`docs/especificacao.md` §4, "E-mail
    não confirmado não impede entrar" — o domínio é novo e o e-mail pode
    legitimamente cair em spam). **Custo pequeno, confirmado antes de
    decidir**: nunca passa por Server Action — chama
    `authClient.sendVerificationEmail({ email: sessao.email })`
    (`src/lib/auth/cliente.ts`), o mesmo `authClient` que Entrar já usa, e
    pelo mesmo motivo documentado lá: o rate limit do Better Auth
    (`customRules["/send-verification-email"]`, 3 por 5 minutos, já
    configurado desde a tarefa 7 do item 1 e já citado em
    `docs/especificacao.md` §"Trava de tentativas") só roda quando o pedido
    passa pelo roteador HTTP de verdade — uma chamada de servidor a
    `auth.api.sendVerificationEmail(...)` (como `cadastro.ts` já faz sozinho
    no cadastro) nunca passa por ali e nunca é travada. Sem trava nova, sem
    migration nova: a proteção já existe, só falta o botão. Estado
    carregando obrigatório (`CLAUDE.md` §8) e uma mensagem amigável se a
    pessoa tocar demais (resposta 429) — texto exato pendente do Design.
- **Sem filtro de data na tela inteira** (`docs/especificacao.md` §4.6) —
  nenhum dos números acima aceita período escolhido pelo usuário.

**Textos exatos das pendências** ("3 fretes em andamento, 1 sem ordem
enviada", o texto da sugestão de relatório, etc.) seguem o mesmo padrão já
usado no produto (inferência da construção quando o Design não escreveu o
texto literal, como aconteceu na tela de montagem do relatório) — pendente
de confirmação do Design, registrado como lacuna, não bloqueia.

**Testes:** este item não tem suíte de tela/componente (decisão já registrada
no item 7, `CLAUDE.md` §14) — verificação manual no navegador, screenshot,
clique em cada pendência e pastilha até o destino certo.

---

## Lacunas registradas, não corrigidas agora

- **Pastilha Rodagem, pedido ao Design** — nasce não-tocável (decisão do
  fundador, acima). Só ganha destino se e quando o Design decidir para onde
  ela deveria levar.
- **Quarto chip de situação operacional em Fretes** — pedido ao Design,
  decisão 3. Sem ele, "Fretes em andamento" sempre leva a uma lista sem o
  recorte que a própria pendência anuncia.
- **Contagem de "cobranças vencidas" na unidade agrupada** — mesma
  observação já registrada no item 7 sobre relatório cobrindo vários
  fretes: se o critério de agrupamento mudar depois, este contador precisa
  mudar junto, não é uma segunda verdade.
