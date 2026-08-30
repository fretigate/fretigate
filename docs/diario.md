# Diário de execução

Onde o trabalho parou e qual é o próximo passo. Atualizado ao fim de cada
sessão. Não é histórico — para isso existe o `git log`. É só o suficiente para
retomar sem reconstruir contexto.

---

## 30/08/2026 — Reabre causa raiz da instabilidade: conexão de longa duração em `titulos.test.ts`, e o quinto formato do catálogo

Decisão do fundador, ao rodar `/onde-paramos`: a esteira do commit `1ce8ac8`
(Plano do item 8) estava vermelha, sem diagnóstico — investigar antes de
qualquer tarefa nova (`CLAUDE.md` §2). A investigação inicial (janela
recente: 2 vermelhos em 5 envios, acima do 1 em 3) achou uma correlação
medida: os quatro arquivos de teste que já falharam por instabilidade neste
período são, com folga, os quatro de maior duração de conexão `raiz` aberta
da suíte — `titulos.test.ts` (92 testes) ficou **19min26s** com a mesma
conexão aberta, mais que o dobro do segundo colocado.

**O sintoma da falha (`Error: Test timed out in 30000ms`, sem nenhuma
mensagem de baixo nível) não batia com nenhum dos quatro formatos já
catalogados no `CLAUDE.md` §2** — nem P2028, nem `ECONNRESET`. Registrado
como **quinto formato**, "timeout puro", com a distinção que o fundador
pediu: a árvore de decisão do §2 pressupõe um sintoma de baixo nível, e
aplicá-la sem ele seria escolher a correção por analogia falsa.

**Construção:** `tests/titulos.test.ts` — a conexão `raiz`, antes aberta
uma vez para o arquivo inteiro (`beforeAll`/`afterAll` no topo), passa a
abrir e fechar por bloco (17 dos 18 `describe` de nível superior; o 18º,
"cobertura", não usa `raiz`). A limpeza final ganhou conexão própria, para
não depender de nenhum bloco anterior ainda estar de pé. Plano completo,
com a medição, a hipótese, o critério de decisão e o resultado local (4
rodadas, 92/92 cada), em
`docs/planos/investiga-conexao-longa-em-titulos-test.md`.

**Achado do `/revisar`, aceito integralmente:** a contagem de arquivos com o
mesmo padrão estava errada duas vezes (13, depois 17) — a correta, conferida
à parte, é **19 dos 31**. A correlação por duração sobrevive à correção. O
plano também ganhou a explicação que faltava para as rodadas locais saírem
~2,2× mais lentas que o baseline antigo (17 conexões abrindo/fechando em vez
de 1 — custo esperado da mudança, não sintoma novo) e o registro explícito
de que a medição do limite de ociosidade do Supabase só alcançou o projeto
de **desenvolvimento**, não o de **teste** — decisão registrada de seguir
mesmo assim.

**Desvio de processo, registrado:** o plano foi aprovado no chat antes da
construção, mas não foi commitado como passo próprio antes dela começar,
como o §2 pede — plano e construção fecham no mesmo commit.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` limpos.
`titulos.test.ts` isolado, 4 rodadas seguidas, 92/92 em todas (352-368s cada,
banco de **desenvolvimento**). Não é prova definitiva — o defeito era
intermitente antes da mudança também. **Esteira: a confirmar no próximo
`/onde-paramos`** — é o próximo envio que mede de verdade.

Enquanto isso, `9f01d69` (Tarefa 1 do item 8) terminou `failure`, no mesmo
sintoma mudo, desta vez em `tests/cobrancas.test.ts` — investigado à parte,
ver a entrada seguinte.

Próximo: se a esteira confirmar (parou de travar), decidir se estende o
mesmo padrão de conexão por bloco aos outros 18 arquivos. Se não confirmar,
a hipótese cai e a investigação reabre do zero. De qualquer forma, depois
disso, a Tarefa 2 do item 8 (a tela da dashboard) continua sendo a próxima
tarefa do produto.

---

## 30/08/2026 — Tarefa 1 do item 8: Dados da dashboard

Plano do item 8 aprovado e commitado em `1ce8ac8` (29/08/2026), com quatro
decisões do fundador registradas em `docs/planos/item-8-dashboard.md`:
Rodagem mostra dado real (o km já existe desde o item 3, não depende do
item 12); a marca da empresa no cartão escuro nasce não-tocável até o item
10 construir a tela de Conta; "Fretes em andamento" leva a Fretes sem
filtro, com pedido de um quarto chip (situação operacional) ao Design; e a
sugestão de relatório dispara com 3 ou mais fretes não faturados de um mês
fechado (fuso de Fortaleza).

Esta tarefa fecha só os dados: `src/lib/servicos/dashboard.ts`, seis
funções novas — `resumoDoMes` (faturamento + comparação com o mês anterior
+ média por frete), `resumoDeRodagemDoMes` (km e R$/km, mesma forma de
`resumoDoCaminhao`), `contarFretesEmAndamento`, `contarCobrancasVencidasAgrupadas`
(mesma unidade da lista — um relatório com N títulos conta 1),
`sugerirRelatorio` e `faturamentoPorMes` (as barras dos 6 meses). Tudo
reaproveitando o filtro-base já usado em `resumoDoCaminhao`/`resumoDoMotorista`
("somar é diferente de cobrar", `CLAUDE.md` §9) — nenhuma tabela nova,
nenhuma migration. `resumoDeCobrancas`/`contarFretesAFaturar`, que a tela já
tinha prontos, não são repetidos aqui.

**Achado na construção: `sugerirRelatorio` precisa divergir de
`contarFretesAFaturar`.** Um teste (frete cancelado sem título) mostrou que
`contarFretesAFaturar` não exclui `status_operacional: "cancelado"` — e um
frete cancelado "não vai acontecer" (`CLAUDE.md` §7), então não pode
alimentar uma sugestão de gerar cobrança. Corrigido só em `sugerirRelatorio`,
com o motivo escrito no comentário; `contarFretesAFaturar` não foi tocada,
por estar fora do escopo desta tarefa — registrado aqui para não se perder,
não como pendência aberta (o comportamento dela hoje não muda nenhuma tela
existente, e mudar sem medir o efeito nas outras telas seria decisão nova).

**Instabilidade local, formato novo — não confundir com os três da esteira
já catalogados.** A suíte inteira (`npm test`, ~26 min contra o banco de
desenvolvimento) reprovou em `tests/titulos.test.ts` — arquivo sem relação
com esta tarefa — com "Connection terminated unexpectedly" /
"Client has encountered a connection error and is not queryable", nunca
timeout de transação. Rodado isolado duas vezes: passou as duas (92/92), a
segunda vez 3,7× mais lento que o normal (597s contra ~160s) — dado medido,
não suposto, de que era queda de conexão, não defeito. `CLAUDE.md` §2 ganhou
o quarto formato do catálogo, com a distinção que o fundador pediu: os três
anteriores são incidentes de **esteira**; este é da **máquina local**,
contra o banco de **desenvolvimento**, e não entra na proporção de reruns
da esteira (regra separada, sobre envios que ela recebe).

**Verificação: local.** `npx tsc --noEmit` e `npm run lint` verdes.
`tests/dashboard.test.ts` (17/17, novo) e `tests/titulos.test.ts` (92/92,
isolado) verdes contra o banco de **desenvolvimento** — decisão do
fundador de não repetir a suíte inteira, por já estar provado que o
arquivo novo e o arquivo que falhou passam sozinhos, e a esteira roda a
suíte inteira de qualquer forma no envio.

Próximo: Tarefa 2 do item 8 — a tela, substituindo o pouso provisório
(`src/app/(app)/page.tsx`) pela dashboard de verdade: cartão escuro,
quatro pastilhas, barras dos 6 meses e "Precisa de você".

---

## 29/08/2026 — Tarefa 4 do item 7: Entradas no fluxo — item 7 fecha

Última tarefa do item 7 (relatório). Liga as cinco pontas alcançáveis hoje:
perfil do cliente (principal **Gerar relatório**, cliente pré-selecionado
via `?cliente=`), estado vazio de Cobranças (já ligado na Tarefa 3, só
confirmado), detalhe do frete (principal **Ver relatório** quando o frete
pertence a algum `RelatorioServico` — via a relação, não via título, para
cobrir o `em_andamento` incluído sem cobrança), detalhe da cobrança
(secundária **Ver relatório** quando o título tem `relatorio_id`), e Mais
(nova seção Ferramentas, "Relatório do cliente"). O atalho do cartão escuro
da dashboard **não entrou** — a dashboard ainda é o pouso provisório do
item 8, sem cartão nenhum para o atalho entrar; registrado como pendente
daquele item em `docs/planos/item-7-relatorio.md`, não construído por cima
do provisório.

**Dois passes do `/revisar`, achados corrigidos antes do commit.**

Primeiro passe: inventei ícone e rótulo novos para a linha de Mais
("Relatório" sozinho, desenho à mão) sem checar que os dois já estavam
documentados — `docs/componentes.md` linha 277 já previa `barra-cobrancas.svg`
com o rótulo "Relatório do cliente". Trocado pelo que já existia.

Segundo passe achou um bug de verdade, não só texto: os links novos de "Ver
relatório" tornam alcançável um estado que antes só existia entre
`criarRelatorio` terminar e o Chromium falhar (`CLAUDE.md` §14, lacuna já
registrada na Tarefa 3) — um `Relatorio` com `pdf_url` nulo. Nesse estado, os
três botões do Documento A4 (Compartilhar, Baixar, Imprimir) viravam clique
sem ação, porque todos dependem do arquivo. Corrigido: sem `pdf_url`, a tela
mostra "Este relatório não tem PDF gerado." e um botão de verdade ("Gerar
relatório novo", volta à montagem com o cliente certo) no lugar dos três —
`CLAUDE.md` §8, nunca botão sem ação de fundo. Testado ao vivo forçando o
estado via SQL direto (Chromium não roda no Windows local). Achado exatamente
do tipo que só aparece ligando as pontas — a Tarefa 3 tinha razão ao dizer
"hoje inalcançável" quando escreveu aquilo.

Também corrigidos: dois comentários que afirmavam estado que este commit
tornou falso ("ainda não construída", "hoje inalcançável"); `docs/navegacao.md`
sem "Mais" como origem de "Relatório — montagem"; a medição de posição do
perfil do cliente em `docs/componentes.md` (remedida no DOM, 1280×720: botão
principal em `764–824`, Histórico em `898`).

**Duas decisões do fundador, depois do segundo passe:**

1. Quando o mesmo frete aparece em dois relatórios, "Ver relatório" mostra o
   **mais recente** (`orderBy criado_em desc`) — mesmo critério já usado em
   `marcaCobrado` (Tarefa 3, agrupamento de Cobranças), e é o que
   provavelmente foi enviado ao cliente por último. A lacuna "o mesmo frete
   pode entrar em mais de um relatório" (registrada na Tarefa 1, ainda sem
   decisão sobre impedir/avisar/deixar como está) ganhou esta consequência —
   registrado no mesmo lugar (`docs/planos/item-7-relatorio.md`).
2. Sem teste automatizado de tela para as quatro entradas — verificadas só
   manualmente no navegador (screenshot + clique até o destino certo). O
   projeto nunca teve suíte de tela/componente, decisão anterior a esta
   tarefa; criar a primeira agora seria escopo novo dentro da última tarefa
   de um item. A lacuna registrada com clareza em `CLAUDE.md` §14: se
   alguém trocar um `href` por engano, nada acusa hoje — nem `tsc`, nem
   `lint`, nem a suíte de serviço.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` verdes. `npm test`
— suíte inteira, 30/30 arquivos, 592 passaram, 8 puladas (Chromium não roda
no Windows). `buscarRelatorioIdDoServico` ganhou 4 casos próprios. Contra o
banco de **desenvolvimento**, não o de teste da esteira (`CLAUDE.md` §2) — a
esteira roda só depois do push, confirmação pendente na próxima sessão.

**O item 7 fecha aqui — quatro tarefas: a entidade com retrato congelado, o
gerador de PDF validado por medição publicada, a tela de montagem com o
Documento A4, e as entradas no fluxo.** Palavras do fundador, valem registrar:
o relatório substitui o Canva — o trabalho manual que ele descreveu como o da
esposa do Pedro — e era o item mais pesado do que restava. **Sete dos dez
itens do MVP prontos.** Faltam quatro: dashboard (item 8), configurações e
conta, despesas, assinatura.

**Dívida já registrada para o item 8:** o princípio "somar é diferente de
cobrar" (item 7, decisão do fundador — `docs/especificacao.md` linha 170) vai
precisar da mesma distinção na dashboard, que mostra faturamento do mês —
quanto rodou não é quanto pode cobrar. E o atalho "Gerar relatório" do
cartão escuro, adiado nesta tarefa, entra junto.

Próximo: item 8 da ordem de construção do produto (`docs/especificacao.md`
§9) — a dashboard.

---

## 29/08/2026 — Tarefa 3 do item 7, segundo commit: montagem, Documento A4 e agrupamento em Cobranças

Fecha o item 7, Tarefa 3 inteira — a tela "Relatório — montagem", a Server
Action `gerarRelatorioAction`, a tela "Documento A4", e os três requisitos
que o fundador pediu para garantir nesta rodada: os dois totais divergentes,
o agrupamento em Cobranças, e `outputFileTracingIncludes` + rate limit
(`docs/planos/item-7-relatorio.md`).

**Tela de montagem** (`src/app/(app)/relatorio/`): cliente e período viajam
pela URL (mesmo padrão de Cobranças/Meus fretes — trocar qualquer um pede
fretes diferentes ao servidor). Sem período na URL, o padrão é **mês
passado** — evidência corroborante do protótipo (`TelaRelatorio.dc.html`,
`CLAUDE.md` §13), diferente do padrão "mês atual" dos resumos de perfil.
Nova função `resolverPeriodoDoRelatorio` (`src/lib/utils/periodo.ts`),
mesmo formato de `resolverPeriodoDoPerfil` mas com esse padrão diferente e
sem o modo "sem fim" de `"todos"` (nunca é opção aqui). Cada linha
desmarcável, tudo marcado por padrão. "Gerar cobrança" revela forma prevista
(Boleto/Outro) e vencimento editável (`FolhaDeCalendario`, mesmo padrão de
`FolhaDeFaturamento`).

**Os dois totais** — `calcularTotaisDoRelatorio`
(`src/lib/utils/totais-relatorio.ts`, função pura, testada): total do
documento soma tudo marcado, total cobrável soma só o `finalizado`; os dois
aparecem juntos só quando divergem de verdade (cobrança ativa + algum
`em_andamento` marcado).

**Documento A4** (`src/app/(app)/relatorio/[id]/`): reconstrói a mesma
marcação do gerador de PDF a partir do banco — `buscarDadosParaPreviaDocumento`
(nova, `relatorios.ts`), extraída de dentro de `gerarRelatorio` para as duas
pontas (gerar o PDF, mostrar a prévia) usarem a mesma montagem, nunca duas
implementações do mesmo desenho (`CLAUDE.md` §8). Ações: Compartilhar no
WhatsApp (Web Share API com o arquivo, cai para baixar sem suporte) · Baixar
PDF · Imprimir.

**Agrupamento em Cobranças** (`docs/especificacao.md` §4.5) — a peça que mais
cresceu durante a construção. `agruparPorRelatorio`
(`src/lib/servicos/cobrancas-situacao.ts`, pura, testada) junta títulos do
mesmo `relatorio_id` numa linha só, valor somado, preservando a posição do
primeiro membro na lista. Perguntando "como ela recebe o dinheiro dali"
apareceu uma peça que a regra escrita não cobria: **sem "Marcar recebido" na
linha agrupada** — registrar contra um só dos N títulos receberia uma fração
em silêncio (`CLAUDE.md` §2, rigor total). Decisão do fundador: um chevron
expande a linha e revela cada título como uma linha normal, com o próprio
deslizar que já funciona — peça nova, `LinhaCobrancaAgrupada.tsx`. "Cobrar no
WhatsApp" continua na linha agrupada e registra em TODOS os títulos do grupo
no mesmo instante (`registrarCobrancaEnviadaEmGrupo`, `titulos.ts` — tudo ou
nada, testado: um título inválido no meio recusa o grupo inteiro, nenhum
fica gravado). `AcaoCobrarNoWhatsApp` generalizada de `tituloId: string` para
`tituloIds: string[]` (extensão, não duplicação — os dois call sites
antigos passam `[id]`).

**O achado que motivou tudo, vale registrar como método:** o caminho de
receber já existia — pela tela de Fretes, frete por frete — só não na tela
onde a pendência aparece. Isso só apareceu perguntando "como ela faz isso"
durante a construção; nenhum teste automatizado teria achado, porque
tecnicamente o dinheiro sempre teve um caminho.

**`outputFileTracingIncludes` + rate limit** — os dois aplicados nesta
tarefa: `next.config.ts` ganhou a chave para `/relatorio`;
`travaDeGerarRelatorio` (`src/lib/servicos/trava-de-relatorio.ts`, 10 por 5
minutos, número aprovado pelo fundador na sessão) roda antes de gerar.
`CLAUDE.md` §14 atualizado — o que faltava era só a rota existir, e agora
existe; falta só a confirmação em produção de verdade.

**Erro achado e corrigido durante a construção, vale registrar.** Escrevi
`formatarPeriodoDeCobranca` do zero, sem checar que já existia — comitada
no primeiro commit da Tarefa 3. Pior: minha versão estava errada — li "o
formatador **some** com o ano" (`docs/planos/item-7-relatorio.md`) como
"**soma** o ano" (adiciona), quando "some" ali é do verbo *sumir*
("desaparece com o ano" — omite, não adiciona). A versão já existente,
correta, ficou; a minha foi removida. Dois agentes de pesquisa despachados
na sessão erraram ao afirmar que a função "não existia" — não confirmei
antes de escrever por cima.

**Peça extraída, não copiada:** `LinhaRecolhida` (linha "RÓTULO · valor ·
seta", nascida em "Lançar frete") virou componente próprio
(`src/components/ui/LinhaRecolhida.tsx`) no segundo uso real — mesmo
critério de `Etiqueta`/`EtiquetaSituacao.tsx` (`CLAUDE.md` §6).

**Pendências registradas ao Design** (`docs/planos/item-7-relatorio.md`,
"O que precisa chegar ao Design"): o tratamento visual do chevron (medido
contra o CSS compilado — alvo de 48×78px — mas não confirmado ao vivo num
navegador autenticado, sem conta de teste à mão nesta sessão); como o grupo
aberto se distingue visualmente das outras linhas (hoje só recuo + rótulo,
nenhuma cor nova); a etiqueta de `em_andamento` na prévia (mesma lacuna já
registrada no item 4 para "cancelado").

**Dois passes do `/revisar`, achados corrigidos antes do commit.** O
primeiro (12 divergências + 6 lacunas) corrigiu o teto de 50 cortando
relatório ao meio (`completarGruposDeRelatorio`), a mesma checagem de
WhatsApp faltando no boleto/recebidas do caminho agrupado, e estendeu
`LinhaDeLista` em vez de duplicar `LinhaCobrancaAgrupada` (`CLAUDE.md` §8) —
maior fix, seis telas conferidas. O segundo (9 divergências + 7 lacunas)
achou uma regressão do primeiro: `cobrancas/[id]/page.tsx` (Server
Component) passava uma closure (`(ids) => registrarCobrancaEnviadaAction
(ids[0])`) como prop para o Client Component `AcaoCobrarNoWhatsApp` —
closure não atravessa a fronteira de serialização do RSC, a tela de detalhe
da cobrança quebraria ao renderizar. Corrigido eliminando a ação de
um-título-só: `registrarCobrancaEnviadaEmGrupoAction` (já aceita
`tituloIds: string[]`) serve os dois casos, código morto removido
(`registrarCobrancaEnviada`/`registrarCobrancaEnviadaAction`). Também deste
passe: `marcaCobrado` do grupo pegava só `itens[0]` em vez do envio mais
recente (terceira ocorrência do padrão "regra fala de todos os itens da
coleção, código olha um", `CLAUDE.md` §2); `limitadoA50` ficava errado
depois da completude do grupo (`listarCobrancas` agora devolve `{ titulos,
cortado }`, `cortado` calculado antes de completar); "Baixar PDF" não
baixava de verdade (URL assinada é de outra origem, `<a download>` não
funciona cross-origin — corrigido buscando o PDF como blob); o aviso "sem
chave Pix" era perdido porque `setAviso` + `router.push` na mesma função
abandonava a tela que mostraria o aviso — agora viaja pela URL
(`?semPix=1`) até o Documento A4.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` verdes. `npm test`
— suíte inteira, 30/30 arquivos, **588 passaram, 8 puladas** (Chromium não
roda no Windows — mesma lacuna já registrada em `CLAUDE.md` §14). Contra o
banco de **desenvolvimento**, não o de teste da esteira (`CLAUDE.md` §2,
"suíte verde local ≠ esteira verde") — a esteira roda só depois do push,
confirmação pendente na próxima sessão.

Próximo: item 7, Tarefa 4 — "Entradas no fluxo" (liga as pontas que
`docs/navegacao.md` já marca com ⚠️: perfil do cliente, estado vazio de
Cobranças, detalhe do frete, detalhe da cobrança, Mais, dashboard).

---

## 29/08/2026 — Esteira vermelha do commit `5fd6700`, investigada: fila serializada, não instabilidade genérica

**Achado ao rodar `/onde-paramos`:** o commit `5fd6700` (só plano/comentário,
sem código de produto) tinha run próprio com `conclusion: failure`, sem
diagnóstico registrado — bloqueio, por `.claude/commands/onde-paramos.md`.
Investigado antes de qualquer tarefa nova, a pedido do fundador.

**Diagnóstico, medido antes de decidir.** `tests/relatorios.test.ts`,
"concorrência: criações simultâneas da mesma empresa nunca colidem no
numero", reprovou com `PrismaClientKnownRequestError P2028` — mesma
assinatura do commit `36554ef`, **no mesmo dia** (28/08/2026). A hipótese
inicial (mesmo caso de "2. medição completa", `docs/planos/teto-de-tempo-
no-teste-de-medicao-completa.md`) foi **descartada por medição**: reproduzi
o erro LOCAL, sozinho, sem esteira e sem desaceleração nenhuma, numa de três
tentativas (5.478ms contra o teto de 5.000ms da transação interativa do
Prisma) — diferente do caso de "medição completa", que nunca falhou local
sozinho. **O mecanismo não foi identificado.** A primeira hipótese escrita
aqui ("criarRelatorio faz mais consultas antes da fila que o equivalente
que nunca falha") foi derrubada pelo `/revisar`, lendo o código: é o
oposto — `criarServico` (`tests/servicos.test.ts`) faz três consultas nesse
caminho contra as duas de `criarRelatorio`. Fica só o dado medido: 8 falha
1 em 3, 4 não falha em 5 de 5. Detalhe completo, com a tabela de medição e
a correção da hipótese descartada, em
`docs/planos/reduz-concorrencia-teste-numeracao-relatorio.md`.

**Correção: QUANTIDADE de 8 para 4 no teste**, decisão do fundador — não é
tapar sintoma, o teste existe para provar que a numeração não repete sob
concorrência, e isso se prova com quatro tão bem quanto com oito. Não mexe
em código de produto: as duas conferências ficam onde estão, por decisão de
segurança (`CLAUDE.md` §3). Margem medida com 4: ~2,3-2,5s contra o teto de
5s, estável em cinco rodadas locais.

**`CLAUDE.md` §2 ganhou dois registros novos:** o catálogo dos três formatos
de "vermelho sem defeito de código" já vistos (pool esgotado, margem contra
desaceleração, fila serializada) com a pergunta que separa um do outro; e,
à parte, o padrão da explicação causal não verificada — achado do
`/revisar` nesta mesma tarefa, não só uma nota sobre CI.

**Contagem de reruns (`CLAUDE.md` §2):** commit `5fd6700` é a segunda
ocorrência da mesma assinatura de erro no mesmo teste (a primeira foi
`36554ef`, mais cedo no mesmo dia). Não computei a proporção histórica
completa (reruns antigos não aparecem mais em `gh run list` — o rerun
reescreve o mesmo run para `success` — e contá-los exige vasculhar o
diário inteiro atrás de cada linha já registrada); fica como pendência
separada, se o fundador quiser o número exato.

**Verificação: local.** `npx vitest run tests/relatorios.test.ts` (32
passed + 5 skipped no Windows), `npm run lint`, `npx tsc --noEmit` verdes.
Esteira: a confirmar na próxima sessão.

Próximo: Tarefa 3 do item 7, segundo commit — Tela "Relatório — montagem" +
`gerarRelatorioAction` + tela "Documento A4", mais os requisitos que só
fazem sentido quando a rota existir (`outputFileTracingIncludes`, rate
limit, `CLAUDE.md` §14) e o agrupamento por `relatorio_id` em Cobranças.

---

## 28/08/2026 — Tarefa 3 do item 7, primeiro commit: `gerarRelatorio` (servidor)

**Dividida em dois commits**, como o plano já previa ("a geração num, a tela
noutro"). Este fecha a metade de servidor: `gerarRelatorio`
(`src/lib/servicos/relatorios.ts`) — orquestra `criarRelatorio` (Tarefa 1),
cria um `TituloReceber` por frete `finalizado` quando "Gerar cobrança" está
ativo (reaproveitando `faturarServico`, que ganhou `relatorioId` opcional),
chama o gerador de PDF (Tarefa 2) e grava `pdf_url`/`gerou_cobranca`. Junto:
janela "últimos 30 dias" (`periodo.ts`, `FolhaDePeriodo`), a variação de
período na mensagem de cobrança de vários fretes (`montarMensagemCobranca`,
`{periodo}` registrado em `docs/especificacao.md` §9), `listarServicosParaRelatorio`
(prévia da montagem), `gerarUrlRelatorio` (URL assinada de leitura) e o
suporte a "sem chave Pix" no corpo do documento (`corpoRelatorio.ts`).

**`/revisar` rodou três passes — registro porque o fundador pediu para
destacar o padrão, não só o resultado.** Os dois primeiros trouxeram achados
de dinheiro, que mudavam comportamento:

- **1º passe:** cabeçalho do documento usava `nome_fantasia` em vez de razão
  social (`docs/especificacao.md` §4.4 exige a segunda); e o achado mais
  sério — `faturarServico` gravava `relatorio_id` confiando que quem chama
  já conferiu, contrariando `CLAUDE.md` §3 ao pé da letra ("a proteção mora
  onde o dado é gravado, nunca em quem chama") — mesmo raciocínio já visto
  para `veiculo_habitual_id` e a política de RLS. Os dois corrigidos, com
  teste de recusa novo.
- **2º passe:** `gerou_cobranca: true` e o bloco de vencimento/Pix do
  documento saíam mesmo quando **zero títulos nasceram** da geração (todo
  frete incluído já estava faturado fora dali) — o papel prometeria uma
  cobrança que não existe, com vencimento que podia discordar do título
  antigo. Corrigido: os dois só acontecem se pelo menos um título nasceu de
  verdade (`algumTituloCriado`). Também achou um bug de teste real (o
  `afterAll` de `relatorios.test.ts` não limpava `titulo_receber`, que teria
  quebrado a limpeza na esteira — os testes que criam título pulam no
  Windows, então nunca apareceu aqui) e comentários que a própria mudança
  tinha deixado desatualizados.
- **3º passe:** só achou texto — nenhum achado que mudasse comportamento.
  **O critério funcionou como desenhado: os passes pararam quando pararam de
  aparecer achados de dinheiro/comportamento**, não por contagem arbitrária.

**Registrado como requisito explícito do segundo commit, não só observação**
(pedido do fundador): `gerarRelatorio` já grava vários `TituloReceber` com o
mesmo `relatorio_id`, mas `ListaCobrancas`/`resumoDeCobrancas` ainda não os
agrupam numa linha só — contradiz `docs/especificacao.md` §4.5 no *dado*,
mesmo hoje inalcançável pela tela. Ver `docs/planos/item-7-relatorio.md`.
Mesmo precedente do `comoDono`: peça de um item só, com uso previsto e
datado no próximo commit — não abstração especulativa.

**Verificação: local.** `npx tsc --noEmit` e `npm run lint` verdes.
`tests/mensagens.test.ts`, `tests/data-fortaleza.test.ts`,
`tests/periodo.test.ts`, `tests/documentos/gerador.test.ts`,
`tests/titulos.test.ts` (88/88) e `tests/relatorios.test.ts` (32 passed + 5
skipped no Windows — Chromium, `CLAUDE.md` §14) verdes. **Esteira: `success`,
confirmada na sessão seguinte** (`CLAUDE.md` §2 item 9 — atualizado aqui, não
em commit próprio).

Próximo: Tarefa 3 do item 7, segundo commit — Tela "Relatório — montagem" +
`gerarRelatorioAction` + tela "Documento A4", mais os requisitos que só
fazem sentido quando a rota existir (`outputFileTracingIncludes`, rate
limit, `CLAUDE.md` §14) e o agrupamento por `relatorio_id` em Cobranças.

---

## 28/08/2026 — Esteira: rerun por instabilidade, e plano do item 7 atualizado — funde Tarefa 3 e Tarefa 4

**Rerun por instabilidade, registrado por `CLAUDE.md` §2.** A esteira do
commit `36554ef` (Tarefa 1 do item 7) tinha ficado `failure` — achado ao
rodar `/onde-paramos`: `tests/relatorios.test.ts`, o teste de concorrência da
numeração sequencial, estourou `PrismaClientKnownRequestError P2028`
("A commit cannot be executed on an expired transaction" — 5717ms contra um
limite de 5000ms), o mesmo padrão de timeout de pool/transação já
documentado. `gh run rerun --failed`, disparado só depois de o run do
commit seguinte (`4a70311`) terminar (nunca dois em voo ao mesmo tempo,
`CLAUDE.md` §2) — **sucesso** na segunda tentativa, confirmando instabilidade,
não defeito.

**Plano do item 7 atualizado, antes de começar a Tarefa 3.** Ao planejar a
construção, ficou claro que a antiga Tarefa 3 ("Tela — montagem") não podia
ficar sozinha: um botão principal chamando o servidor sem função real por
trás é a mesma armadilha da `FolhaDePix` no item 6, e aqui seria pior — não
haveria nem para onde navegar depois de gerar. **Decisão do fundador: funde
a antiga Tarefa 3 com a antiga Tarefa 4** (motivo dele: "montagem, geração e
documento são um fluxo só — a pessoa monta, gera e vê. Cortar no meio cria
dois pedaços que não funcionam sozinhos"), com a ressalva de dividir em dois
commits durante a construção se ficar claro que dá — a geração num, a tela
noutro, mesmo padrão dos três perfis do item 4 e da base da Tarefa 5 do item
6.

Renumeração: nova Tarefa 3 = tela de montagem + `gerarRelatorio` + tela
"Documento A4"; antiga Tarefa 5 ("Entradas no fluxo") vira Tarefa 4.
**Referências cruzadas conferidas e corrigidas em código e schema, não só no
plano** — pedido explícito do fundador, pela mesma armadilha quase repetida
na renumeração do item 6: `CLAUDE.md` §14 (duas pendências "quem construir a
Tarefa 4"), `prisma/schema.prisma` (comentário do `model Relatorio`), e seis
comentários em `src/lib/documentos/` (`gerador.ts`, `moldeDocumentoA4.ts`,
`fontesEmbutidas.ts`, `estiloImpresso.ts`, `armazenamento.ts` ×2) e
`src/lib/servicos/relatorios.ts` ×2.

**Duas decisões já registradas no plano, para não perder na construção:**
- Os dois totais (o do documento e o que vira título) aparecem **juntos, ao
  vivo**, quando um frete `em_andamento` incluído os fizer divergir — não é
  acabamento visual, é dinheiro: sem isso, quem gera um relatório com frete
  em andamento acha que cobrou tudo, e só descobre o contrário quando o
  cliente pagar a menos.
- A geração leva **~3 segundos no caso comum** (função "fria" do gerador de
  PDF, medido no plano) — o desenho assume isso como normal, não como
  exceção rara. O estado carregando do botão "Gerar relatório" deveria
  comunicar isso, não só girar (pendência de confirmação do Design sobre o
  texto exato, já registrada no plano).

**Verificação: local.** Só documentação/comentário, nenhum código de
produto mudou — `npx tsc --noEmit` e `npm run lint` verdes. **Esteira:
`failure`, confirmada na sessão seguinte e investigada — ver entrada de
29/08/2026 acima** (`CLAUDE.md` §2 item 9 — atualizado aqui, não em commit
próprio).

Próximo: Tarefa 3 do item 7 — Tela "Relatório — montagem" + gerar relatório
+ tela "Documento A4".

---

## 28/08/2026 — Tarefa 2 do item 7: Gerador de PDF

`src/lib/documentos/` — `gerador.ts` (ponto de entrada genérico, `CLAUDE.md`
§9), `moldeDocumentoA4.ts`/`corpoRelatorio.ts` (a marcação, por template
string), `navegador.ts` (Puppeteer isolado), `armazenamento.ts` (upload ao
balde `relatorios`, migration `20260828070000_balde_relatorios_storage`),
`fontesEmbutidas.ts` + `fontes/` (Archivo, Azeret Mono e um subconjunto de
Inter de 736 bytes, só para os dois glifos que o Archivo não tem — `→` e
`✓`, medido com `fontTools`/`fontkit`, não suposto; procedência completa em
`fontes/PROCEDENCIA.md`). `src/lib/utils/html.ts` (`escaparHtml`) nasceu
junto. Motor: `puppeteer-core` + `@sparticuz/chromium`, exatamente como a
medição do plano validou.

**Um episódio de origem não esclarecida, registrado como o fundador pediu —
sem inventar certeza.** No meio da sessão, os arquivos acima apareceram
reescritos no disco (React/JSX virou template string) sem nenhuma edição
minha visível no meu próprio histórico de ferramentas. Investigação: a
sessão irmã do mesmo computador negou (confirmado por mensagem direta —
trabalhou só no projeto LETRAR); toda a árvore de processos da máquina
(node, vite, chrome-devtools-mcp) rastreada até esse mesmo projeto ou até
navegador/apps sem relação; `git reflog` sem operação estranha; nenhum
`next dev` do FRETIGATE rodando. **Não foi possível identificar a origem.**
A hipótese mais compatível com as evidências, levantada pelo fundador: a
própria sessão fez a correção, num jeito que não ficou visível no que este
agente enxerga do próprio histórico — sessão longa, muitas ferramentas.
**Reforço encontrado depois, no fechamento da tarefa:** um segundo arquivo do
mesmo episódio, `tests/protecao-server-only.test.ts`, apareceu também
reescrito — registrando `armazenamento.ts`/`navegador.ts`/`gerador.ts` na
lista de arquivos protegidos por `import "server-only"`, exatamente como a
regra escrita no próprio arquivo de teste manda fazer ("arquivo novo com
`server-only` entra na lista no mesmo commit"). Quem editou conhecia a regra
e a seguiu — o que pesa mais para "é a própria sessão trabalhando" do que
para intervenção externa: um agente de fora não teria motivo para conhecer
(nem seguir) uma convenção interna deste projeto, escrita num comentário de
um arquivo de teste específico. Decisão do fundador, 28/08/2026: manter o
código, por três razões — (1)
resolve um problema real e verificável (`react-dom/server` não carrega
dentro de Server Action/Route Handler do App Router, condição
`react-server` do próprio React, medida contra o `next dev` de verdade,
numa rota descartável criada e removida na mesma sessão); (2) passa em
tipos, lint e testes contra o estado atual; (3) reverter voltaria a uma
versão que quebraria na Tarefa 4, quando a rota existir. Condição anexada:
auditar `escaparHtml` a fundo antes de aceitar — feito, com teste de
regressão (payload `<script>`, atributo `src`, campos de texto livre):
nenhuma lacuna encontrada, todo campo de usuário passa pelo escape.

**Dois passes do `/revisar`, nenhum achado de rigor total — fecha no
segundo, por regra do §2.**

Primeiro passe, seis divergências e quatro lacunas — decisões do fundador:
- `CLAUDE.md` §14 dizia que `enviarComprovante` era "o primeiro e hoje
  único" escritor de storage — corrigido (é o segundo agora).
- `outputFileTracingIncludes` para o Chromium/fontes: mantido fora de
  `next.config.ts` (a chave depende de uma rota que não existe), mas
  cruzado com a lista "CONFERIR ANTES DE PUBLICAR" do §14.
- URL assinada de leitura do PDF: **movida da Tarefa 2 para a Tarefa 4** no
  plano — sem chamador, construir agora seria a mesma armadilha da
  `FolhaDePix` no item 6 (peça sem uso, não testável de verdade).
- Cores literais (`#3C443E`/`#6E7770`) em vez das constantes
  `TINTA_APOIO`/`TINTA_TERCIARIA`: corrigido.
- Valores de layout do protótipo sem entrada em `docs/estilo.md`: aceito
  como precedente já coberto por `PlacaBadge.tsx`.
- Título "RELATÓRIO DE SERVIÇOS": mantido, registrado como decisão (não
  pergunta) no plano — vocabulário do produto (`Servico`), não do ramo.
- Sem paginação: registrado como lacuna, **medido de verdade** (Chromium
  real, via o navegador desta sessão, não estimado de cabeça) — cabem 16
  fretes sem bloco de cobrança, 14 com — é caso normal do produto, não
  borda, por pedido explícito do fundador.
- `logoUrl` sem caminho de rede: lacuna registrada, hoje inalcançável (sem
  upload de logo no produto).
- Comentário de `armazenamento.ts` prometendo uma cadeia de proteção via
  `criarRelatorio` que não está de fato encadeada: corrigido para não
  afirmar o que ainda não existe.

Segundo passe, seis divergências e três lacunas — decisões do fundador:
- Rótulo "TOTAL DO PERÍODO" em `13px/700` (peso de "Título do documento",
  não de "rótulo de bloco"): **exceção deliberada**, registrada em
  `docs/estilo.md` § Impresso — o bloco introduz o número-herói da página,
  função diferente de um rótulo comum.
- Título "de Serviços" com corpo dizendo "fretes": **corrigido** — o corpo
  passa a dizer "serviço(s)" também. `CLAUDE.md` §8/§9 ganharam a exceção
  nomeada: dentro do documento impresso é "serviço"; na interface continua
  "frete", sem mudança.
- Rate limit na futura rota que gera PDF (`CLAUDE.md` §4): registrado junto
  do `outputFileTracingIncludes`, mesmo lugar, mesma razão de esperar a
  rota existir.
- "Nº do documento" em Archivo: **trocado para Azeret Mono** — mesma regra
  da placa do caminhão (número identificador, lido caractere por
  caractere, citado por telefone). Registrado em `docs/estilo.md`.
- Dois comentários imprecisos que eu mesmo escrevi (sobre `imprimirPdf` não
  precisar do Supabase, e sobre `armazenamento.test.ts` supor um chamador
  que não existe): corrigidos.

**Verificação: local.** `npm run lint`, `npx tsc --noEmit` verdes. `npm test`
local rodou contra o Supabase de desenvolvimento de verdade três vezes nesta
sessão: a primeira, antes das correções dos dois passes de `/revisar`,
528/528 (3 puladas, Windows); a segunda, já com parte das correções, teve 6
falhas isoladas em `tests/servicos.test.ts` (arquivo sem relação nenhuma com
esta tarefa, todas por "unable to start a transaction in the given time" —
timeout de transação, mesmo padrão de instabilidade de pool já documentado
no `CLAUDE.md` §2); o arquivo sozinho, rodado de novo, passou limpo
(53/53) — confirmado transitório, não regressão. A terceira, depois de
todas as correções acima aplicadas, **533/533** (3 puladas, Windows) —
esta é a que vale para o commit. Esteira ainda não disparada: commit e push
seguem este registro.

Próximo: Tarefa 3 do item 7 — Tela "Relatório — montagem".

---

## 28/08/2026 — Tarefa 1 do item 7: Fundamentos — a entidade Relatorio e o que ela amarra

`model Relatorio` e `model RelatorioServico` (migration
`20260828060000_relatorio_fundamentos`), `Empresa.proximo_numero_relatorio`
(mesmo padrão atômico de `proximo_numero_servico`), e a FK de
`titulo_receber.relatorio_id` — pendência aberta desde o item 3 (tarefa 3),
fechada aqui. `src/lib/servicos/relatorios.ts`: `criarRelatorio` e
`buscarRelatorio`, tudo por `db(empresaId)`/`emTransacao(empresaId)`.

**Retrato congelado — decisão do fundador, achado do primeiro `/revisar`.**
A primeira versão de `RelatorioServico` só linkava o frete (`relatorio_id`,
`servico_id`). `docs/especificacao.md` §4.4/§8 regra 6 dizem que "o
relatório fica gravado com os valores da época" — e `Servico` continua
editável enquanto não tiver título ativo (§8 regra 12), então um relatório
sem retrato próprio mudaria de conteúdo por baixo do cliente que já o
recebeu. `RelatorioServico` ganhou `data_servico`, `origem_texto`,
`destino_texto`, `carga_texto` e `valor` — cópia do que a tabela do
documento exibe, gravada uma vez, nunca recalculada. Provado com teste
próprio: editar o `Servico` depois de gerado o relatório não muda a linha
já gravada.

**`criarRelatorio` recusa, nunca confia em quem chama — decisão do
fundador, achado do primeiro `/revisar`.** A função grava dinheiro
(`valor_total`), e a tela de montagem (Tarefa 3) não será o único chamador
possível — mesmo princípio do `CLAUDE.md` §3, de a proteção morar onde a
gravação acontece. Recusa: lista de fretes vazia; período com data final
antes da inicial; frete de outra empresa, de outro cliente, `cancelado`,
arquivado, ou com `data_servico` fora do período. `em_andamento` **passa** —
"em andamento entra na lista, mas não aceita cobrança" é decisão de
Tarefa 3/4, não do que pode aparecer no documento. Levado também para
`docs/especificacao.md` §4.4 ("somar é diferente de cobrar"), que ainda não
tinha o princípio por fora do plano.

**Dois passes do `/revisar`.** Primeiro: três divergências — as duas acima
(retrato congelado, aceito integralmente; e a validação em lote, aceita) e
um comentário do schema afirmando como fato um comportamento da Tarefa 4
que ainda não existe (corrigido para linguagem de expectativa, `CLAUDE.md`
§13). Mais uma lacuna sobre `titulo_receber.relatorio_id` ainda sem
chamador — registrada como requisito explícito no plano da Tarefa 4, não
como código pendente desta tarefa.

Segundo passe: três divergências, todas de precisão de documento/comentário
— a frase acima sobre "somar é diferente de cobrar" ainda fora de
`docs/especificacao.md` (corrigida); uma linha do plano prometendo um teste
de "a FK de `relatorio_id` recusando..." que descrevia errado o que o teste
prova (é `buscarRelatorio`, código, não a FK do banco — `CLAUDE.md` §3: "o
Postgres não aplica RLS ao verificar chave estrangeira"; corrigida); e o
comentário do schema de `RelatorioServico` afirmando uma "conferência"
contra a empresa para `relatorio_id` que não existe nem faz falta —
`relatorio_id` nasce da criação aninhada do próprio `Relatorio` na mesma
chamada, nunca é entrada externa (comentário corrigido, sem mudança de
código). Duas lacunas registradas no plano, com a nuance do fundador: o
mesmo frete pode entrar em mais de um relatório (cobrar duas vezes já é
bloqueado pelo índice único de título, item 6; o que sobra é o mesmo frete
aparecer em dois documentos enviados ao cliente — comportamento, não
detalhe técnico); e `Relatorio.pdf_url` (caminho ou URL assinada?) —
`Servico.comprovante_url` já resolveu essa mesma pergunta e a Tarefa 2
deve reaproveitar, não decidir de novo.

**Verificação: local.** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes. `npm test` local rodou **duas vezes** nesta sessão — antes e depois
das correções dos dois passes de `/revisar` — 506/506 as duas vezes, contra
o Supabase de desenvolvimento de verdade. Esteira ainda não disparada:
commit e push seguem este registro.

Próximo: Tarefa 2 do item 7 — Gerador de PDF.

---

## 28/08/2026 — plano do item 7, aprovado: Relatório do cliente, PDF e compartilhamento

Item 6 fechado (commit `8b7d894`). Planejamento do item 7 antes de qualquer
código, conforme `CLAUDE.md` §2.

**Medição real na Vercel, pedida pelo fundador antes de decidir a
arquitetura do PDF** (dois experimentos descartáveis, nunca commitados,
projetos Vercel apagados depois): navegador invisível (headless Chromium,
`puppeteer-core` + `@sparticuz/chromium`) funciona, sem precisar da versão
enxuta do pacote. Tempo: ≈2,9s "frio" (o caso comum — o dono gera relatório
cerca de uma vez por semana) · ≈0,4s "quente". Achado real de fonte: a seta
(`→`) que `formatarRota` usa não vem na fonte carregada por Google Fonts —
corrigida auto-hospedando os arquivos de fonte, sem chamada de rede na hora
de gerar.

**Duas decisões do fundador, trazidas com o caso na frente:**

1. **Frete cancelado nunca entra na montagem do relatório; frete em
   andamento entra, mas não aceita a marca de cobrança** — princípio
   registrado: "somar é diferente de cobrar" (`em_andamento` conta nas
   somas desde o item 4, mas cobrar exige serviço já prestado). Vai também
   para `docs/especificacao.md`, e volta no item 8 (dashboard). **Exigência,
   não só lacuna de Design:** quando isso deixar o total do documento e o
   total cobrável divergirem, os dois números aparecem ao vivo na tela de
   montagem, antes de gerar — só o tratamento visual fica em aberto.
2. **Mensagem de cobrança com vários fretes do mesmo relatório** cita o
   **período** no lugar da rota ("dos fretes de agosto" / "de 20/08 a
   10/09") — nunca a contagem. Frete único continua citando a rota, sem
   mudança.

Plano completo em `docs/planos/item-7-relatorio.md`, cinco tarefas:
fundamentos (entidade `Relatorio`, `RelatorioServico`, fecha a FK pendente
de `titulo_receber.relatorio_id` desde o item 3) · gerador de PDF (cedo e
isolado, a pedido do fundador — testado antes da tela de montagem existir)
· tela de montagem · geração do relatório + Documento A4 · entradas no
fluxo (Fretes, Cobranças, perfil do cliente, dashboard, Mais).

**Verificação:** nenhum código de produto ainda — só o documento do plano.
Os dois experimentos de medição rodaram fora do repositório (nunca
commitados) e foram desfeitos por completo (projetos Vercel removidos,
árvore local revertida) antes deste commit.

**Esteira confirmada verde**, no commit `f72206a` (que grava esta entrada) —
`gh run list`, `conclusion: success`. Corrigido aqui, junto do próximo
commit real (`CLAUDE.md` §2, item 9): quando este parágrafo foi escrito
ainda dizia "disparada, ainda rodando, sem confirmação", e o status já era
conhecido antes do commit seguinte.

Próximo: Tarefa 1 do item 7 — Fundamentos: a entidade `Relatorio` e o que
ela amarra.

---

## 27/08/2026 — Tarefa 7 do item 6: "A receber" e "Vencido" nos perfis

Fecha a pendência deixada de propósito no item 4 e no item 6 — plano
detalhado em `docs/planos/item-6-titulo-e-cobrancas.md`, commitado antes da
construção (`2dd7462`).

**Construído:**

- `resumoFinanceiroDoCliente` (`titulos.ts`) passa de dois números para
  quatro. Decisão do fundador, antes de escrever código: "a receber" e
  "vencido" são **situação atual, sempre** — não respondem ao chip de
  período, mesmo princípio já valendo em Cobranças/dashboard. Só "já rodado"
  e "recebido no período" continuam respondendo ao período.
- `valorEmAbertoPorCliente` (nova, `titulos.ts`) — saldo em aberto de todos
  os clientes de uma vez, para o critério de ordenação novo e o apoio da
  lista.
- `ListaClientes`: terceiro critério "Maior valor em aberto"; apoio "R$ X em
  aberto" **sem** "no total" — decisão registrada em `docs/especificacao.md`
  §4.7: o qualificador existe para distinguir dois recortes do mesmo número
  (vida inteira × período), e "valor em aberto" só tem um recorte em todo o
  produto.
- Perfil do cliente: `ResumoDoPerfil` ganha grade de duas linhas — em cima
  os que respondem ao período (já rodado, recebido), embaixo os de situação
  atual (a receber, vencido). "A receber"/"Vencido" levam a
  `/cobrancas?situacao=...&periodo=todos&cliente=<id>` (sem período de
  verdade — `periodo=todos` só tira o teto de 50, achado do primeiro
  `/revisar`).
- "Mais > Clientes" reaproveita `resumoDeCobrancas(...).aReceber` para o
  total da empresa — não duplica a lógica de saldo.
- `cobrancas/page.tsx` aceita `?cliente=` para semear o filtro que já existe
  (validado por formato de UUID, achado do primeiro `/revisar`); busca o
  nome do cliente inicial mesmo sem título na situação aberta (achado do
  segundo `/revisar` — sem isso, "Vencido" com R$ 0,00 abria o chip "ativo"
  com rótulo neutro "Cliente").

**Achados do primeiro `/revisar`, todos corrigidos no mesmo passe:**

- Links de "A receber"/"Vencido" sem `periodo=todos` cortavam a lista em 50
  títulos de TODA a empresa antes de filtrar por cliente — o número do
  perfil podia discordar da tela que ele mesmo abre. Corrigido, e resolveu
  junto os dois achados derivados (aviso "50 que vencem antes" sumindo sem
  explicação; chip "ativo" com rótulo neutro).
- `cliente` da URL sem validação, diferente de `situacao`/`periodo` — o
  valor nunca chega ao banco (filtro só no navegador), então não é o mesmo
  risco que motivou a regra do `CLAUDE.md` §4 para consultas; corrigido por
  consistência mesmo assim, com o motivo escrito para não parecer risco de
  injeção que não havia.
- `docs/componentes.md` ("os três primeiros números do resumo são
  tocáveis") não descrevia mais a tela — a grade de duas linhas trocou a
  ordem de leitura. Corrigido para nomear os três, não contar posição.

**Segundo `/revisar`, todos corrigidos no mesmo passe (nenhum abriu
terceiro — nenhum achado novo de rigor total):**

- Duas regras gerais do §4.7 ("todo critério de ordenação... leva 'no
  total'"; "resumo do perfil é sempre do período") ficaram contradizendo as
  exceções escritas no mesmo diff. Corrigido com um parágrafo de exceção
  explícito, para não ser aplicado por analogia depois.
- A mesma frase "os três primeiros são tocáveis" sobrevivia em
  `docs/especificacao.md` — só `componentes.md` tinha sido corrigido no
  primeiro passe.
- **Rigor total (dinheiro):** três leituras diferentes de "em aberto"
  (`resumoDeCobrancas`, `resumoFinanceiroDoCliente.aReceber`,
  `valorEmAbertoPorCliente`) sem teste medindo uma contra a outra. Corrigido
  com teste novo (`tests/cobrancas.test.ts`, bloco 3b) — as três batem
  exatamente, contra um valor de verdade, não só entre si.
- Achado real (não só de texto): "Vencido" com R$ 0,00 podia abrir Cobranças
  filtrado para um cliente sem nenhum título vencido — chip "ativo" com
  rótulo neutro "Cliente". Corrigido (ver acima).
- `docs/componentes.md` afirmava como fato o tratamento visual da grade de
  duas linhas — corrigido para marcar como provisório, mesmo padrão da
  Folha de Estorno (item 6, Tarefa 6).

**Lacunas registradas, não corrigidas — decisão de domínio do Design:**

- "Vencido" não anuncia no rótulo que é recorte de "A receber" no resumo do
  perfil (§4.5 exige isso só nos três números do topo de Cobranças).
- Raio/cor do cartão de resumo (lacuna já aberta em `docs/estilo.md`) ganhou
  um quarto caso: a segunda linha, o vão entre elas, e um rótulo
  diferenciando as duas.

**Pedido ao Design** (`docs/componentes.md`/`docs/estilo.md`, as duas lacunas
acima): confirmar o tratamento visual da grade de duas linhas do resumo do
cliente, e decidir se "Vencido" precisa de rótulo próprio anunciando que é
recorte de "A receber".

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes. Suíte completa: 477/477 (era 476/476 antes desta tarefa — 5 testes
novos em `tests/titulos.test.ts` (85/85, `CONFERENCIAS_ESPERADAS` 80 → 85) e
1 teste novo em `tests/cobrancas.test.ts` (28/28, `CONFERENCIAS_ESPERADAS`
26 → 27) para a leitura cruzada de "em aberto"). Testado ao vivo no
navegador: os três critérios de ordenação, o apoio "R$ X em aberto", as
duas linhas do resumo com os links corretos, o deep-link para Cobranças já
filtrado (com e sem cobrança na situação), o apoio em "Mais", e a validação
do `?cliente=` recusando entrada malformada sem quebrar a tela — medido por
`getBoundingClientRect` em viewport mobile (375px), sem rolagem horizontal,
todos os alvos ≥48px.

**Esteira do commit anterior (`11a4654`), rerun confirmado verde nesta
sessão** — ver entrada abaixo.

Próximo: item 7 da ordem de construção do produto (`docs/especificacao.md`
§9) — Relatório.

---

## 27/08/2026 — instabilidade na esteira do commit `11a4654`, rerun disparado

Achado ao rodar `/onde-paramos`: a esteira do commit `11a4654` (Tarefa 5 do
item 6, segundo commit) estava com `conclusion: "failure"`, sem diagnóstico
registrado. Investigado antes de qualquer tarefa nova, como pedido.

**O que falhou.** `npm test`, dentro de `tests/servicos.test.ts`, duas
reprovações:

1. `estatisticasPorMotorista — bate exatamente com resumoDoMotorista...` —
   `PrismaClientKnownRequestError: Transaction API error: Unable to start a
   transaction in the given time.`
2. `cobertura > rodou todas as verificações previstas` — `expected 51 to be
   52`. Consequência da primeira, não um defeito à parte: é o contador de
   verificações do `CLAUDE.md` §3 item 4, e ficou uma a menos porque o teste
   1 estourou a exceção antes de completar a própria checagem.

**Classificação: instabilidade conhecida do pool/transação (`CLAUDE.md` §2),
não defeito de código.** O arquivo inteiro (53 testes) levou **366 segundos**
nessa execução, com cada teste individual entre **2 e 17 segundos** — muito
acima do normal (a mesma classe de lentidão geral já registrada em 18-20/08,
não um teste reagindo diferente do resto).

**O commit seguinte (`748c669`, Tarefa 6 — Estorno) já tinha rodado e
confirmou verde** (`gh run view 33111565488`, `conclusion: success`) sem
tocar nesse teste — o mesmo arquivo passou limpo no commit imediatamente
depois, o que reforça instabilidade e não regressão.

**Proporção, contando a partir da correção de 20/08/2026 (commit `a28263f`,
onde a contagem reiniciou):** 33 envios confirmados (`93085a7` até `748c669`,
`gh run list`), com **1 falha por defeito real** (`868a653`, corrigida por
código no commit seguinte `d2d3005` — teste de criação sequencial de fretes
estourando timeout, não instabilidade de pool) e **esta é a primeira falha
classificada como instabilidade desde o reset**. **1 rerun em 33 envios** —
bem abaixo do 1-em-10 que o fundador definiu como ruído tolerável. Não abre
investigação de causa raiz.

Rerun disparado (`gh run rerun 33101066666 --failed`) só depois de confirmar
que `748c669` já tinha terminado — sem risco de cancelar a execução em fila
(`CLAUDE.md` §2, fila de reruns). Confirmou verde (`gh run view 33101066666`,
`conclusion: success`) — `main` está com todos os commits confirmados.

---

## 27/08/2026 — Tarefa 6 do item 6: Estorno

Fecha a promessa que a Tarefa 4 do item 4 já fazia na tela de Editar frete
("Estorne o título para corrigir") e que até agora não dava para cumprir —
plano em `docs/planos/item-6-titulo-e-cobrancas.md`, decisão 4.

**Construído:**

- `estornarTitulo` (`src/lib/servicos/titulos.ts`) — cancela o título
  (`status: "cancelado"`, nunca apagado — `CLAUDE.md` §7), aceita título
  `aberto` ou `pago` (`docs/especificacao.md` §8, item 5), recusa título já
  cancelado, de outra empresa, arquivado, ou de frete arquivado. Duas
  camadas: checagem amigável + `status: { not: "cancelado" }` no próprio
  `UPDATE`, que o Postgres serializa sob concorrência real.
- Migration `20260827090000_estorno_indice_exclui_cancelado` — o índice
  único parcial `titulo_receber_um_integral_por_servico` passa a excluir
  `status = 'cancelado'`. Sem ela, refaturar depois de um estorno esbarraria
  no índice antigo e falharia com "Este frete já foi faturado" — mentira,
  já que o título anterior está cancelado. Achado já registrado na Tarefa 1
  (`docs/planos`), corrigido aqui.
- `estornarTituloAction` (`fretes/acoes.ts`), `AcaoEstornar.tsx` e
  `FolhaDeEstorno.tsx` (novos, `src/components/ui`) — botão texto
  destrutiva "Estornar cobrança" no fim do bloco de ações do detalhe da
  cobrança, some com frete arquivado (mesmo critério de "Marcar
  recebido"/"Cobrar no WhatsApp"); abre a folha de confirmação, que lista
  as três consequências e só sucede com o toque em "Estornar" dentro dela.
  Sucesso navega para `/cobrancas` (o detalhe passa a devolver 404 para o
  título cancelado).
- `cobrancas/[id]/page.tsx`: título cancelado cai em `notFound()`, mesmo
  tratamento de arquivado — resolve a lacuna gêmea registrada no `/revisar`
  da Tarefa 4 ("o que a Tarefa 6 precisa decidir sobre título fora de
  circulação no detalhe da cobrança").

**Decisões do fundador, nesta sessão (27/08/2026):**

- **A confirmação é `FolhaInferior`**, não modal nem componente genérico
  novo — "já é o padrão do produto pra 'algo sobe de baixo, você decide, e
  volta'". Conteúdo ditado pelo fundador: título "Estornar esta cobrança?";
  três consequências em frase curta, a segunda ("o que já foi recebido
  deixa de contar") só quando há recebimento; principal **Estornar** e
  texto **Agora não**.
- **"Estornar" fica no vocabulário** — fecha a pendência aberta desde a
  Tarefa 4 do item 4 (`docs/planos/item-4-lista-e-detalhe-do-frete.md`):
  "é a palavra do ramo, o dono da transportadora usa, e não é termo de
  sistema."
- **Estornar cobrança bloqueia com frete arquivado**, por consistência com
  "Marcar recebido"/"Cobrar no WhatsApp": "frete arquivado é frete fora de
  circulação; agir sobre a cobrança dele é caminho que ninguém decidiu
  abrir. E é melhor errar pro lado de menos ação numa operação destrutiva."
- **"O histórico registra" (decisão 4 do plano) significa só que a linha
  não é apagada (§7)** — não um registro de autoria. Estorno não grava quem
  estornou nem quando, além do `atualizado_em` que todo `UPDATE` já grava.
  Registrado no plano para não ser lido como mais do que é; se um dia
  incomodar (duas pessoas na mesma conta), é decisão própria.

**Achados do primeiro `/revisar`, todos corrigidos no mesmo passe:**

- `docs/especificacao.md` e `prisma/schema.prisma` ainda diziam "um frete
  tem no máximo um título integral" — deixou de ser verdade (cancelado +
  ativo convivem depois do estorno). Corrigido para "... **ativo**", frase
  que o próprio plano já usava.
- A docstring de `faturarServico` descrevia a lacuna do índice como
  pendente, apontando para uma "Tarefa 7" que nunca existiu com esse
  número — reescrita para dizer que está resolvida, apontando para
  `estornarTitulo` e a migration.
- Três comentários (`fretes/[id]/page.tsx`, `titulos.ts` ×2) justificavam
  usar `.find()` em vez de examinar a lista inteira com "hoje um frete tem
  no máximo um título" — o `.find()` continua certo (filtra por status),
  só a frase ficou imprecisa. Corrigida nos três lugares.
- Minha própria docstring nova em `cobrancas/[id]/page.tsx` afirmava que
  "o histórico continua acessível pelo detalhe do frete" — o detalhe do
  frete não mostra nada sobre título cancelado nenhum. Reescrita para não
  prometer uma tela que não existe: a linha sobrevive no banco (§7), sem
  superfície de interface que a mostre hoje.
- A docstring de `AcaoEstornar.tsx` comparava com `arquivarServicoAction`
  (`redirect()` no servidor) como se fosse o mesmo mecanismo de
  `router.push` no cliente — são diferentes (a folha de confirmação exige
  decidir a navegação depois de um `await` no cliente). Corrigida a
  citação; testado ao vivo no navegador, os dois funcionam.
- `docs/componentes.md`/`docs/navegacao.md` foram editados direto pelo
  repositório — o `/revisar` apontou que o §13 do `CLAUDE.md` reserva
  "Desenho" (o que uma tela contém) para o Design, e o próprio plano desta
  tarefa já dizia isso. Decisão do fundador: o conteúdo é dele (ditado
  nesta sessão), mas medida e tratamento visual são inferência da
  construção (copiando `FolhaDeCampoUnico`), não resposta do Design — as
  duas entradas ficam marcadas **provisório** em `docs/componentes.md`, e
  entram na lista de pedido ao Design abaixo.

**Segundo `/revisar`:** sem divergências.

**Pedido ao Design** (`docs/componentes.md`, linha "Folha de estorno" e
linha "Detalhe da cobrança"):

1. Variante destrutiva de botão principal — hoje a cor de ação é sempre
   verde; a folha usa a principal normal para "Estornar" até existir uma.
2. Confirmar medida e tratamento visual da Folha de estorno — o conteúdo é
   do fundador, a construção só copiou o corpo de `FolhaDeCampoUnico`.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run
build` verdes. `tests/titulos.test.ts`: 80/80 (era 70 antes desta tarefa —
10 testes novos, bloco 14). Uma rodada da suíte completa acusou
"Transaction API error: Unable to start a transaction in the given time"
no teste de concorrência do estorno — mesma classe de instabilidade do
pooler já registrada em 18-20/08; isolado (`-t "14. estornarTitulo"`)
passou de primeira, e a suíte completa rodada de novo em seguida deu
80/80 limpo. Testado também ao vivo no navegador, banco de desenvolvimento
real: estornar título pago → 404 no link antigo → frete volta a "A
faturar" → refaturar com sucesso. Esteira deste commit ainda não
confirmada.

Próximo: Tarefa 7 do item 6 — "A receber" e "Vencido" nos perfis.

---

## 27/08/2026 — Tarefa 5 do item 6, segundo commit: a tela (Cobrar no WhatsApp)

Segunda metade da Tarefa 5 — a tela que aciona a base do commit anterior:
pílula "Cobrar no WhatsApp" na lista, secundária no detalhe, aviso "Enviei" /
"Ainda não", "cobrado há X dias por Y", histórico "Cobranças enviadas", e a
regra do boleto na interface.

**Construído:**

- `AcaoCobrarNoWhatsApp.tsx` (novo, `src/components/ui`) — componente único
  para os dois lugares (pílula em linha na lista, secundária no detalhe),
  mesmo padrão de `AcaoMarcarRecebido`. Resolve telefone do cliente
  ausente/inválido (bloqueia, `FolhaDeTelefone`) e chave Pix ausente (não
  bloqueia, `FolhaDePix`, decisão 2) — telefone primeiro quando os dois
  faltam.
- `registrarCobrancaEnviadaAction`, `salvarChavePixAction`
  (`fretes/acoes.ts`) — ao lado das outras ações de título/cobrança.
- `LinhaDeLista` ganhou `rodape` — terceira linha fora do alvo de navegação
  (nunca aninhada em `<a>`/`<button>`), para a pílula e a marca "cobrado há X
  dias" na lista de Cobranças.
- `textoCobradoHa` (`cobrancas-situacao.ts`) — mesma conta de dias de
  Fortaleza que `textoDoPrazo`.
- "Cobranças enviadas" no detalhe — histórico estático (sem `LinhaDeLista`:
  não há destino para navegar a partir de um envio).
- `buscarClientesPorIds`/`buscarCliente` passam a trazer telefone onde
  faltava.

**Achado do primeiro `/revisar`, o que importa — bug real de posicionamento.**
A pílula em linha nasce dentro do `rodape` de `LinhaDeLista`, que pode estar
dentro de `DeslizarParaRevelar` — e esse componente aplica `transform:
translateX(...)` no `<div>` que envolve a linha inteira, **sempre**, mesmo
parado (`translateX(0px)` continua sendo um `transform`). Um ancestral com
`transform` vira o "viewport" de qualquer elemento `fixed` dentro dele —
exatamente o problema que `FolhaInferior.tsx` registra ter conferido que não
existia (Tarefa 1 do item 5, 23/08/2026: medido que não havia
`transform`/`filter`/`perspective`/`will-change` em nenhum ancestral, do
layout raiz até `globals.css`). A linha que desliza (Tarefa 3 do item 6,
26/08/2026) criou esse ancestral depois — sem que a verificação de 23/08 fosse
refeita, porque nada avisa quando um componente novo introduz `transform`.
Corrigido levando as folhas/avisos de `AcaoCobrarNoWhatsApp` para
`document.body` via `createPortal`.

**Padrão a reconferir, registrado a pedido do fundador:** toda vez que um
componente novo aplicar `transform`/`filter`/`perspective`/`will-change` a um
ancestral — mesmo condicionalmente, mesmo em valor "neutro" como
`translateX(0px)` — a garantia de `FolhaInferior.tsx` ("nenhum ancestral tem
isso") precisa ser reconferida, porque foi medida uma vez, num estado da
árvore que não é mais o de hoje. É o mesmo padrão que `CLAUDE.md` §2 já nomeia
("texto que está certo só por coincidência de estado envelhece calado"),
aplicado a uma verificação de CSS em vez de uma frase.

Outros achados do primeiro `/revisar`, corrigidos: tamanho de fonte inventado
(`11.5px` → `text-apoio`, já usado ao lado); citação errada num comentário;
`min-h-56` inventado para a linha de "Cobranças enviadas" (removido — a linha
usa só o padding).

**Segundo `/revisar`:** nome de quem cobrou, no histórico de "Cobranças
enviadas", estava em tratamento Primário (`text-nome-linha`/`text-tinta`) —
`docs/estilo.md` classifica essa linha como Terciário; corrigido para
`text-apoio`/`text-tinta-apoio`. Achado do fundador ao decidir: "competiria
visualmente com o dado da cobrança, que é o que a linha existe pra mostrar."
Três documentos ainda diziam "Cobrar no WhatsApp" pendente
(`docs/navegacao.md`, `docs/especificacao.md` ×2) — corrigidos para o estado
atual (`CLAUDE.md` §13).

**Lacunas registradas, não corrigidas:**

- Aviso "Mandou a cobrança pro cliente?" não nomeia o cliente, diferente do
  único exemplo documentado ("Cobrou o Frigorífico São Luiz?"). Decisão do
  fundador: mantém genérico, consistente com "Mandou a ordem pro motorista?"
  já em produção — o exemplo documentado nomeava porque foi escrito pensando
  numa tela só, antes do segundo gatilho existir. Registrado em
  `docs/componentes.md` §07 para o Design confirmar.
- Vencimento nulo na mensagem de cobrança viraria "Vencimento: " órfão —
  inalcançável hoje (só `faturarServico` cria título aberto, sempre com
  vencimento), mesma classe de "inalcançável hoje" que `grupoDaCobranca` já
  aceita sem tratamento extra.
- Texto de apoio da folha de telefone no gatilho de cobrança — provisório,
  mesma categoria da `FolhaDePix` no commit anterior.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes. Suíte completa: 461/461 (era 459/459 antes desta tarefa — dois testes
novos, `textoCobradoHa`, pedidos pelo fundador no segundo `/revisar`: função
nova com conta de dias de Fortaleza, fuso que já mordeu duas vezes neste
projeto). Esteira deste commit ainda não confirmada.

Próximo: Tarefa 6 do item 6 — Estorno.

---

## 27/08/2026 — Tarefa 5 do item 6, primeiro commit: a base (chave Pix, mensagem, histórico de cobrança)

Primeira metade da Tarefa 5 fundida ("Cobrar no WhatsApp, chave Pix e o texto
da cobrança") — a base, sem a tela. Corte em dois commits, como o próprio
plano já registrava como opção.

**Construído:**

- Migration `20260827080000_cobranca_enviada_e_chave_pix`: `empresa.chave_pix`
  (texto, nulável, sem validação de formato) e a tabela `cobranca_enviada`
  (`titulo_id` · `usuario_id` · `enviado_em` · `empresa_id`), com RLS
  `ENABLE`+`FORCE`, política de isolamento, `GRANT SELECT, INSERT` (sem
  `DELETE`, sem `UPDATE` — nada muda depois de gravado).
- `montarMensagemCobranca` (`src/lib/servicos/mensagens.ts`) — o molde
  aprovado pelo fundador em 26/08/2026, mesma regra de blocos de
  `montarMensagemOrdem`.
- `registrarCobrancaEnviada`, `ultimoEnvioPorTitulo`, `listarEnviosDoTitulo`
  (`src/lib/servicos/titulos.ts`) — grava a confirmação de "Enviei" (com
  conferência de FK e recusa de título pago/cancelado/arquivado/boleto), e as
  duas leituras que a tela vai usar (marca "cobrado há X dias por Y" em lote,
  e o histórico do detalhe).
- `salvarChavePix` (`src/lib/servicos/empresas.ts`, novo arquivo — primeiro
  escritor de campo de Empresa fora do cadastro).
- `FolhaDePix.tsx` — a folha "Falta a chave Pix da sua empresa".

**Achado do primeiro `/revisar`, corrigido:** `FolhaDePix` tinha nascido cópia
de `FolhaDeTelefone` (`CLAUDE.md` §8). Extraído o miolo comum para
`FolhaDeCampoUnico.tsx` — `FolhaDeTelefone` virou um wrapper fino em cima
dele, sem mudar a API que os três chamadores já em produção usam (verificado
ao vivo: telefone ausente → erro de validação → salvar → "85999998888" salvo
no cadastro, sem regressão).

**Outros achados do primeiro `/revisar`, corrigidos:**

- `npx prisma format` tinha realinhado `arquivado_em` em seis models que a
  tarefa não toca (Cliente, Veiculo, Motorista, Servico, TituloReceber,
  Recebimento) — `git checkout` + reaplicação manual das 5 edições, sem rodar
  o formatador de novo. Diff agora só toca o que a tarefa mexeu.
- `registrarCobrancaEnviada` aceitava título com `forma_pagamento_prevista =
  "boleto"` — boleto nunca cobra por WhatsApp (`docs/especificacao.md` §4.5,
  §8 item 11). Adicionada a recusa, com teste.
- `docs/componentes.md` §12 e `docs/especificacao.md` (Empresa) ainda
  afirmavam o estado antigo (só uma exceção de "Agora não"; `chave_pix`
  "ninguém lê ainda") — corrigidos para o estado que este commit cria.

**Segundo `/revisar`: sem divergências.** Lacunas registradas, não corrigidas
agora:

- Nenhuma das exportações desta tarefa tem chamador ainda — esperado, é a
  metade "base" do corte; a tela é o próximo commit.
- O teste de `vencido` no fuso de Fortaleza (exigido no plano) só é possível
  quando o cálculo de `vencido` existir — na tela, reaproveitando
  `grupoDaCobranca`.
- Três decisões de redação que pedem confirmação do fundador, marcadas
  abaixo.
- `cobranca_enviada.arquivado_em` sem caminho que arquive — mesmo estado que
  `Recebimento` já tem hoje, não é regressão desta tarefa.

**Pedido ao Design:** `docs/componentes.md` §12 ganhou a segunda exceção de
"Agora não" (relatório com Pix + Cobrar no WhatsApp sem Pix) e a entrada
correspondente em "Ainda não construídos" — correção de estado do
repositório, avisada aqui.

**A confirmar com o fundador** (decisão de produto/redação, não escolhida
sozinha):

1. Sem rota, a frase da mensagem vira "Passando pra lembrar do frete." — o
   molde aprovado só mostra a versão com `{rota}`.
2. Textos da `FolhaDePix` (apoio, placeholder do campo) — provisórios, sem
   documento, mesma categoria já aceita para a folha de faturamento.
3. Mensagem de recusa do boleto em `registrarCobrancaEnviada` — texto de
   produto novo, também provisório.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes. Suíte completa: 459/459 (era 458/458 antes desta tarefa — um teste
novo por cada bloco). Esteira deste commit confirmada verde (`gh run list`,
commit `d419842`).

Próximo: segunda metade da Tarefa 5 — a tela (pílula "Cobrar no WhatsApp" na
lista e secundária no detalhe, aviso "Enviei"/"Ainda não", "cobrado há X dias
por Y", histórico "Cobranças enviadas", a regra do boleto na interface, e a
folha de telefone com "Salvar e cobrar").

---

## 27/08/2026 — Fusão das Tarefas 5 e 6 do item 6, plano atualizado

Antes de construir a Tarefa 5 ("Chave Pix e o texto da cobrança"), a conferência
de onde `FolhaDePix` seria usada achou que ela nasceria sem gatilho real — os
dois lugares que a acionam ("Cobrar no WhatsApp", antiga Tarefa 6, e "Gerar
relatório com Pix", item 7) ainda não existem. É o mesmo problema que
`CLAUDE.md` §6 proíbe ("sem camada sem dois casos de uso reais"), e diferente
do precedente do item 5, onde `FolhaDeTelefone` e `montarMensagemOrdem`
nasceram na mesma tarefa que seu gatilho real.

**Decisão do fundador:** funde as Tarefas 5 e 6 numa só — "Tarefa 5: Cobrar no
WhatsApp, chave Pix e o texto da cobrança" —, pelo mesmo precedente que achou o
problema: a Tarefa 2 do item 5 já tinha construído `mensagens.ts` junto do seu
gatilho real, no mesmo commit. As antigas Tarefa 7 (Estorno) e Tarefa 8
("A receber"/"Vencido" nos perfis) recuam para Tarefa 6 e Tarefa 7.

`docs/planos/item-6-titulo-e-cobrancas.md` atualizado: a seção da Tarefa 5
fundida, com o motivo da fusão e o aviso do fundador de que a tarefa fica
grande (migration dupla, mensagem, folha nova, botão em duas telas, aviso,
histórico, regra do boleto) e pode ser cortada em dois commits durante a
construção — base e tela —, mesmo precedente dos três perfis do item 4
(Tarefa 6). Todas as referências cruzadas às Tarefas 6/7/8 dentro do plano
foram renumeradas junto, inclusive a armadilha do índice único do estorno
(antiga Tarefa 7, agora Tarefa 6).

Próximo: Tarefa 5 do item 6 — Cobrar no WhatsApp, chave Pix e o texto da
cobrança.

---

## 27/08/2026 — Tarefa 4 do item 6: Detalhe da cobrança

Fecha o link provisório de "Cobranças" — a lista ganhou `href` na linha
(`ListaCobrancas.tsx`), levando a `src/app/(app)/cobrancas/[id]/page.tsx`
(novo). Mockup real encontrado em `referencia/.../TelaCobrancas.dc.html`
(estados `detalhe`/`parcial`) serviu de evidência corroborante para o layout,
que nenhuma tela do produto tinha construído ainda.

**Layout:** cabeçalho (Voltar · "Cobrança") → resumo (cliente · referência ·
valor · prazo colorido) → campos (Vencimento · Situação · Forma) → **ação**
principal (Marcar recebido / Receber o resto / Recebido ✓ desabilitada,
reaproveitando `registrarRecebimentoAction` e `FolhaDeRecebimento`, sem
action nova) → Fretes incluídos (sempre 1 linha hoje — o agrupamento por
relatório é item 7).

**Decisões do fundador ao aprovar o plano:** sem chave Pix (Tarefa 5); sem
edição de "forma prevista" (a única consequência, mostrar/esconder "Cobrar
no WhatsApp", é da Tarefa 6); nome do cliente não é link na linha da lista
(mesma medida de 48px do item 4, sem precisar remedir — é o mesmo
`LinhaDeLista`); e o pior caso da exigência de altura corrigido para
**parcial COM vencido ao mesmo tempo**, não parcial isolado.

**Quatro passes do `/revisar`**, todos com achado real (nenhum fechou vazio):

1. Reduziu escopo do resumo (a marca virou só o prazo, sem tarjas — decisão
   do fundador) e confirmou a extração de `textoDoPrazo`/`CLASSE_DO_PRAZO`
   para `cobrancas-situacao.ts`.
2. **Achado de dinheiro**: o resumo mostrava a data do *vencimento* como se
   fosse a do *recebimento*, para um título faturado e só depois pago — lista
   e detalhe discordavam. Corrigido com `ultimoRecebimentoEm` (nova, em
   `titulos.ts`, com dois testes em `tests/titulos.test.ts`, bloco 11).
   Também corrigiu um `MarcaDaCobranca` com consumidor único (desfeita a
   extração — virou função local de novo) e uma variante de `LinhaDeLista`
   sem consumidor nenhum (removida).
3. **Achado sério**: a generalização de `AcaoMarcarRecebido` tinha um
   `return null` antecipado que quebrava o próprio contrato ("sempre
   montado") — um recebimento integral no detalhe do FRETE matava o aviso de
   sucesso antes de aparecer. Corrigido e **verificado ao vivo**: o aviso
   agora sobrevive ao `router.refresh()`, medido com precisão de
   milissegundos via `performance.now()` no navegador (as duas primeiras
   tentativas de medir isso deram falso positivo de bug, por causa da
   latência das próprias ferramentas de automação — só a medição por
   relógio do navegador provou certo). Também moveu `registrarRecebimentoAction`
   de import direto para prop `registrar` (componente de `/components/ui`
   não pode depender de `/app`), e extraiu `CabecalhoDeDetalhe.tsx` (o
   cabeçalho tinha virado cópia literal do detalhe do frete).
4. Achou a citação de linha corrigida no passe 2 errada de novo (a inserção
   em `docs/componentes.md` deslocou 15 linhas, não 12 — corrigido desta vez
   conferindo por `grep`, não de cabeça), e um comentário com pedido ao
   Design apagado sem querer no passe 2 (restaurado, ver abaixo).

**Discordância registrada, não aplicada**: o quarto passe marcou o alvo de
44px do "Voltar" como abaixo do mínimo de 48px — mas `docs/componentes.md`
já documenta 44px como o alvo de "voltar, fechar", separado do 48px do (+).
Não é divergência.

**Correções de estado no repositório** (`CLAUDE.md` §13): `docs/navegacao.md`
(linhas 19, 40, 93) e `docs/especificacao.md` §4.7 não afirmam mais que o
nome do cliente abre o perfil dele em linha de frete ou cobrança — a
Cobranças nunca teve esse link (decidido sem remedir, mesmo componente já
medido no item 4); a frase geral ficou presa ao único caso que existia
quando foi escrita. `docs/navegacao.md` linha 29 ganhou o destino que
faltava (Fretes incluídos → Detalhe do frete). `docs/componentes.md` ganhou
o registro da medição real de altura (não só a do mockup).

**Pedido ao Design:**

1. **Reaberto, da Tarefa 3**: confirmação de posição da etiqueta "Parcial"
   na linha de Cobranças — nunca respondido, e um comentário que carregava
   esse pedido quase se perdeu nesta tarefa (restaurado).
2. **Novo**: o prazo no resumo do detalhe da cobrança reaproveita o
   tratamento da lista (`text-apoio`, minúsculo, colorido). O mockup desenha
   maiúsculo e em negrito, sem essa cor de fundo — qual dos dois vale para o
   resumo do detalhe, que `docs/estilo.md` não nomeia?
3. Medidas visuais de `DeslizarParaRevelar` (herdado da Tarefa 3, ainda sem
   resposta).

**Lacunas registradas, não corrigidas agora** (todas inalcançáveis hoje ou
decisões de navegação do produto inteiro, não desta tela): "Voltar" do
detalhe não preserva o filtro da lista de origem; título arquivado cai em
`notFound()` (o detalhe do frete lê arquivado de propósito); `grupoDaCobranca`
não tem ramo para `status = "cancelado"` — as duas últimas revisitam junto
do estorno, Tarefa 7. Rótulos e textos do resumo (Vencimento/Situação/Forma
e as variações de texto) vêm só do mockup, não de `docs/componentes.md` —
mesma categoria já aceita para a folha de faturamento.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes a cada rodada de correção (quatro passes do `/revisar`). `npm test`
local completo: 438/438 antes do segundo passe, 440/440 depois (dois testes
novos de `ultimoRecebimentoEm`). Verificado ao vivo no navegador: faturar com
vencimento no passado → recebimento parcial → detalhe mostra "Parcial ·
recebeu X, falta Y" e "venceu há N dias" juntos (o pior caso) → medido com
`getBoundingClientRect`, ação principal em `533–593px` contra o topo do (+)
em `711,5px` (viewport 375×812), folga de `≈119px` → completar o
recebimento → lista e detalhe concordam em "recebido em 27 ago" (a data
real, não o vencimento) → "Recebido ✓" desabilitado. Esteira deste commit
ainda não confirmada — ver `/onde-paramos`.

Próximo: Tarefa 5 do item 6 — Chave Pix e o texto da cobrança.

---

## 26/08/2026 — Tarefa 3 do item 6: Folha de recebimento e recebimento parcial

Fecha o que a Tarefa 2 deixou pendente: até aqui, o único jeito de dinheiro
entrar era "Já recebi" (integral, na hora). Agora um título aberto pode
receber em partes, com data e forma escolhidas, e o produto ganha o primeiro
mecanismo de **deslizar para revelar uma ação**.

**Recebimento vira entidade própria** (decisão 6 do plano, já registrada):
migration `20260826070000_recebimento_e_derivacao_de_titulo` cria a tabela
`recebimento` (RLS, política, `GRANT`, sem `DELETE`) e remove de
`titulo_receber` os três campos que guardavam isso antes
(`valor_recebido`/`data_pagamento`/`forma_pagamento`) — um título pode ser
recebido em mais de uma vez, e um campo escalar sobrescreveria o recebimento
anterior sem nada avisar. Backfill na própria migration preserva os
recebimentos que "Já recebi" já tinha gravado, com `usuario_id` aproximado
por `Servico.criado_por_usuario_id` (não existe, e nunca existiu, registro de
quem deu baixa num título — ver "Pendências" abaixo).

**A garantia contra dinheiro demais mora no banco, não em código.** A soma
dos recebimentos de um título nunca pode passar do valor dele, mesmo sob
concorrência real (dois toques em "Confirmar recebimento", ou o mesmo em duas
abas) — quem garante é `registrar_recebimento`, função de banco que trava a
linha do título (`FOR UPDATE`) pela duração da transação antes de somar e
gravar. Fechada com `REVOKE EXECUTE ... FROM PUBLIC` na própria migration
(`CLAUDE.md` §3). `src/lib/db/index.ts` ganhou `registrarRecebimentoAtomico`,
o único lugar fora de `/tests` com SQL cru para chamá-la.

`src/lib/servicos/titulos.ts`: `registrarRecebimento` (confere posse do
título, status `aberto`, saldo, frete não arquivado e data não-futura antes
de chamar a função de banco), `buscarTituloReceber`, `totalRecebidoPorTitulo`.
`criarTituloJaRecebi` passou a criar título e recebimento juntos (`create`
aninhado). `situacaoFinanceira`/`comSituacaoEmLote`/`resumoFinanceiroDoCliente`/
`buscarServicoComTitulos` migrados para ler de `Recebimento`.
`src/lib/servicos/cobrancas.ts` (`resumoDeCobrancas`/`listarCobrancas`) segue
o mesmo caminho — "Recebidas" busca pelo `Recebimento` mais recente de cada
título, não mais por um campo do título.

**Interface nova:** `FolhaDeRecebimento.tsx` (valor editável com teclado
numérico, pré-preenchido com o saldo; chips Hoje/Ontem/Outra data; chips de
forma — Pix/Dinheiro/Transferência/Boleto/Outro, com campo livre para
"Outro"); `DeslizarParaRevelar.tsx` (o gesto em si, por ponteiro, sem
biblioteca); `AcaoMarcarRecebido.tsx` (secundária no detalhe do frete,
quando há título aberto e o frete não está arquivado); a marca **Parcial**
na linha de Cobranças. `LinhaDeLista` ganhou a prop `aoDeslizar`, usada em
Meus fretes e em Cobranças.

**Decisão do fundador, durante a tarefa: as duas listas abrem a mesma folha
ao deslizar — nenhuma marca recebido na hora.** `docs/navegacao.md`
registrava um comportamento diferente para Meus fretes ("marca recebido na
hora") — corrigido para "Deslizar → folha de recebimento", o mesmo texto que
já valia para Cobranças. Palavras do fundador: "o mesmo gesto com efeitos
diferentes em duas telas é pior que nome duplicado... e o risco decide:
marcar recebido na hora é gravar dinheiro por um gesto que pode ser
acidental — deslizar acontece rolando a lista." **Pedido ao Design**: a
correção do texto de `docs/navegacao.md` (linha da tela Fretes), e as
medidas visuais de `DeslizarParaRevelar` (largura do painel, tipografia do
rótulo), que hoje são escolha de engenharia registrada em comentário, sem
linha em `docs/estilo.md`.

**Achados do `/revisar`, corrigidos ao longo de três passes** (o segundo e o
terceiro exigidos porque o primeiro e o segundo trouxeram achados de rigor
total — dinheiro e teste que não media o que afirmava):

- "Recebidas" usava `TituloReceber.atualizado_em` como aproximação da data
  do recebimento — verdade só quando ninguém backdata, e a própria folha
  oferece "Ontem"/"Outra data" para backdatar. Reescrito para buscar pela
  data real do `Recebimento` (o mais recente de cada título), em duas
  consultas (`groupBy` para achar e ordenar os títulos pagos, depois buscar
  os da página resultante) — Prisma não agrega `MAX` de uma relação dentro
  de `where`/`orderBy`.
- Qualquer falha em `registrarRecebimentoAtomico` virava "Valor maior que o
  saldo em aberto" — uma falha de rede ou de pool ganharia essa causa
  específica sem ter sido essa a causa. `traduzirFalhaDeRecebimento` agora só
  traduz as duas mensagens exatas que a função de banco levanta
  (`titulo_invalido`/`saldo_insuficiente`); qualquer outro erro sobe como
  está.
- Recebimento no futuro não tinha teto nem no schema nem no serviço, e
  "Outra data" abre o mesmo calendário genérico que a data do frete usa (que
  permite futuro de propósito). `registrarRecebimento` recusa
  `data > agora`; `FolhaDeCalendario` ganhou a prop `travarEmHoje` (esconde
  "Amanhã", trava mês seguinte e dias futuros) — só usada por
  `FolhaDeRecebimento`, os outros quatro usos do componente continuam iguais.
- Frete arquivado com título aberto: a secundária do detalhe escondia
  "Marcar recebido", mas Cobranças e o próprio serviço não conferiam —
  fechado dentro de `registrarRecebimento` (o único lugar por onde as duas
  telas passam), não só na tela.
- Dois testes que não mediam o que afirmavam: o de concorrência de
  `registrarRecebimento` podia passar pelo motivo errado (a checagem
  amigável pega a mesma causa com a mesma mensagem, sem provar que a
  tradução da função de banco funciona) — resolvido com um teste puro e
  determinístico de `traduzirFalhaDeRecebimento`, exportada só para isso. O
  de ordenação de "Recebidas" plantava um título só e não provava ordem
  nenhuma — resolvido com três títulos fora de ordem de criação, verificando
  a saída do mais recente ao mais antigo e o corte do teto de 50.
- `CampoTocavel.tsx` extraído: `FolhaDeFaturamento` e `FolhaDeRecebimento`
  tinham a mesma classe do campo tocável (valor/vencimento) copiada à mão.
- Textos de aviso unificados: as três telas que confirmam a mesma ação
  diziam "Frete recebido"/"Cobrança recebida"/"Recebimento parcial
  registrado" — agora "Recebimento registrado"/"Recebimento parcial
  registrado" nas três.

**Três decisões do fundador, depois de eu mostrar o resultado pronto**
(registradas com o motivo em
`docs/planos/item-6-titulo-e-cobrancas.md`, Tarefa 3):

1. Nunca aceitar valor maior que o saldo — a mensagem de recusa passou a
   dizer o saldo em reais (`"...(R$ X,XX)."`), não só a frase genérica.
2. O teto do campo de valor na folha é o saldo, não o valor cheio do frete —
   `FolhaDeRecebimento` agora trava o próprio teclado nisso, antes do
   servidor precisar recusar.
3. "Já recebi" grava um `Recebimento`, com a mesma regra de qualquer outro
   recebimento — já era assim desde o código (`criarTituloJaRecebi` cria
   título e recebimento no mesmo `create`), e o fundador confirmou a decisão
   com o motivo (evitar "recebido no mês" mentindo, e evitar dois caminhos
   de dinheiro com regras diferentes).

**Backfill do `usuario_id`, confirmado**: são títulos de teste, sem cliente
real — a aproximação por `Servico.criado_por_usuario_id` fica como está.

**Quarta decisão do fundador, buraco da Tarefa 2 corrigido nesta tarefa —
não esperou a Tarefa 4.** Achado no terceiro `/revisar`: um frete arquivado
depois de faturado (título ainda aberto — `arquivarServico` não trava isso e
não toca o título) continuava contando em "A receber"/"Vencido" na tela de
Cobranças, e o deslizar continuava oferecendo "Marcar recebido" — ação que
`registrarRecebimento` já recusa, mas o botão não deveria nem aparecer.
Palavras do fundador, sobre por que corrigir agora em vez de levar para a
Tarefa 4 (Detalhe da cobrança): "é dinheiro: 'A receber' e 'Vencido' mostram
valor de frete arquivado, na tela que existe justamente para responder
quanto há a receber. Não é botão inconveniente, é número errado... você tem
o contexto na mão agora; deixar para a tarefa 4 é recarregar tudo e
arriscar escapar. E é filtro na consulta, não redesenho." Resolvido com
`servico: { arquivado_em: null }` no `where` de `resumoDeCobrancas` e de
`listarCobrancas` (situações em aberto) — a cobrança some da lista e das
somas, e o botão de deslizar deixa de existir junto, sem precisar de lógica
própria para escondê-lo. **Não se estende a "Recebidas"**: dinheiro que já
entrou continua tendo entrado, mesmo que o frete seja arquivado depois —
arquivar não apaga histórico (`CLAUDE.md` §7).

**Pendência registrada, sem decisão necessária agora**: as medidas visuais
de `DeslizarParaRevelar` (largura do painel, tipografia do rótulo) —
pendentes de confirmação do Design, registradas em comentário no próprio
arquivo. Fundador confirmou: fica como lacuna.

Um título `pago` sem nenhum `Recebimento` ativo (hoje inalcançável — todo
caminho de produção que marca `pago` também grava o recebimento)
desapareceria de "Recebidas", porque a busca agora parte do `Recebimento`.
Registrado para quando o item 7 (estorno) ou qualquer outro caminho novo
tocar esse estado.

Achado do quarto `/revisar`: uma cobrança em "Recebidas" cujo frete foi
arquivado DEPOIS de recebida continua na lista (por decisão, acima), com a
`referencia` (rota + dia) montada normalmente a partir do frete arquivado —
nenhum documento diz se essa linha deveria se anunciar como "frete
arquivado" de algum jeito, ou se é indistinguível de propósito. Lacuna de
Design, não de dinheiro; registrada para quando alguém notar na prática.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes, conferidos de novo depois de cada rodada de correção (quatro passes
do `/revisar`, mais os quatro ajustes pedidos pelo fundador). `npm test`
local completo: 431/431 antes das correções do `/revisar`, 436/436 depois
dos três primeiros passes; `titulos.test.ts` sozinho (59/59) depois dos três
ajustes de mensagem/teto/"Já recebi" — as mensagens de erro mudaram, os
testes foram atualizados junto. **A rodada final, depois de excluir frete
arquivado das somas de Cobranças (quarta decisão): completa outra vez,
437/437** — a mais recente, a que vale como estado atual. Verificado também
ao vivo no navegador (dev): faturar → recebimento
parcial → marca "Parcial" → deslizar revela "Marcar recebido" → folha
pré-preenchida com o saldo → confirma → "Quitado", com o aviso correto em
cada passo. Esteira deste commit ainda não confirmada — ver `/onde-paramos`.

Próximo: Tarefa 4 do item 6 — Detalhe da cobrança.

---

## 26/08/2026 — Tarefa 2 do item 6: Tela de Cobranças

Substitui a provisória que estava em `/cobrancas` desde o item 4. Agora a tela
lê de verdade: os três números do topo (**A receber · Desse, vencido ·
Recebido em <mês>**), os filtros Situação · Período · Cliente, a lista
agrupada em **Vencidas · Vence hoje · A vencer** e o estado vazio que diz o
que destrava a tela.

`src/lib/servicos/cobrancas.ts` (`resumoDeCobrancas`, `listarCobrancas`,
`contarFretesAFaturar`), `src/lib/servicos/cobrancas-situacao.ts`,
`src/app/(app)/cobrancas/ListaCobrancas.tsx` e a página. Sem migration:
`titulo_receber` já tem todos os campos desde o item 3.

**Cinco decisões do fundador, commitadas no plano antes do código
(`888e9bf`)**, com os motivos escritos lá: período conta pelo vencimento; a
tela abre **sem filtro de período** (o mesmo motivo da lista de fretes, e pior
aqui — a cobrança vencida em junho é justamente a que precisa aparecer); chip
**Recebidas** com o quarto grupo; dentro de Recebidas o período conta pela
**data do recebimento**, porque título de "Já recebi" não tem vencimento; e a
linha só vira tocável na Tarefa 4, quando o detalhe existir.

**Título parcial: a linha ficou na Tarefa 3, o número entrou agora.** O estado
é inalcançável hoje, mas o código que soma se escreve nesta tarefa — "A
receber" e "Vencido" somam o **saldo**, e o já recebido entra em "Recebido no
mês". Medido com o título parcial semeado direto no banco
(`tests/cobrancas.test.ts`), porque nenhuma função de produção cria esse
estado até a Tarefa 3.

**Por que existem dois arquivos de serviço, e não um.** `ListaCobrancas` é
Client Component; importar rótulos e a regra de grupo de `cobrancas.ts`
puxaria `@/lib/db` para o navegador. O `import "server-only"` que `db` ganhou
no item 5, Tarefa 6, **reprovou o `npm run build` na hora**, apontando a
cadeia inteira — a proteção fez o que existe para fazer, no primeiro caso real
depois de construída. A resposta foi separar o puro
(`cobrancas-situacao.ts`) do que toca o banco, nunca afrouxar a proteção.

**Achados do `/revisar`, primeiro passe — sete divergências e seis lacunas.**
Quatro corrigidas na hora, três decididas pelo fundador:

- **O estado vazio saía antes dos chips**, e este era o grave: uma empresa que
  só usou "Já recebi" (tudo pago, nada em aberto) abria Cobranças com
  "Recebido no mês" mostrando dinheiro no topo e **nenhum chip para chegar até
  ele** — exatamente o buraco que a decisão 3 (chip "Recebidas") existe para
  fechar, reaberto por outro lado. O vazio passou a ocupar o lugar da lista,
  nunca o da tela.
- **"Ver os N fretes" podia mentir no número.** A contagem exigia frete
  **finalizado**; o link abre "Meus fretes" filtrado por **A faturar**, que lá
  sai de `situacaoFinanceira` e não olha `status_operacional` — o botão dizia
  4 e a lista abria com 7. Decisão do fundador: contar pelo mesmo critério da
  lista, e o texto dizer **"N fretes a faturar"** (o rótulo que a lista já usa,
  reconhecível na chegada). O princípio é o mesmo já registrado em
  `PERIODO_SEM_FIM` (22/08): o número nunca discorda da tela que ele abre.
  **Quem garante isso daqui em diante é um teste que mede uma consulta contra
  a outra** — não a leitura de que "parecem iguais", que foi justamente o que
  falhou aqui.
- **Rótulos do topo em 11px.** `docs/estilo.md` ("Conflitos resolvidos" 3)
  registra exceção de **9px** para estes três, "só ali" — eu tinha juntado o
  tamanho da regra geral com o rastreio da exceção. Token próprio
  (`--text-eyebrow-topo-cobrancas`), com o "só ali" escrito no nome.
- **O chip de Situação parecia desligado** mostrando "Em aberto". Esta tela
  nunca fica sem situação aplicada (não existe "Todas" entre as quatro), e um
  chip neutro mentiria sobre o que está em vigor: passou a aparecer sempre
  como escolhido.
- **A marca "Boleto" reescrevia as classes da etiqueta de situação** —
  `CLAUDE.md` §8. A forma da etiqueta virou componente (`Etiqueta`, em
  `EtiquetaSituacao.tsx`) e as duas usam a mesma; `docs/estilo.md` já listava
  "BOLETO" entre elas, "todas iguais".
- **Nome do cliente levando ao perfil** (`docs/navegacao.md`) — **não
  construído**, decisão do fundador: a linha é estática hoje, mas na Tarefa 4
  ela inteira vira tocável, e volta o problema já medido no item 4 (dois alvos
  de 48px não cabem em 78px de altura). Seria construir para desconstruir.
  Decide junto com a Tarefa 4.
- **Pastilha "Vencido" (`#F6E6DD`)** — o achado do primeiro passe, decidido
  errado por culpa minha e corrigido no segundo. Ver o bloco abaixo.

**O erro do primeiro passe, e como ele quase virou decisão de produto.** Ao
levar o achado da pastilha ao fundador, afirmei que os três números eram
"texto solto, como no protótipo" — e ele decidiu manter, com a leitura de que
`docs/estilo.md` provavelmente falava da dashboard. **O protótipo mostra o
contrário**: os três ficam em pastilhas (`padding:13px 11px`,
`border-radius:20px`), com fundo `#F0EDE6` nas laterais e **`#F6E6DD` no
"DESSE, VENCIDO"**, exatamente a cor que a folha de estilo registra. O segundo
`/revisar` achou, o protótipo foi aberto e conferido, e a construção passou a
seguir documento e evidência, que concordavam entre si o tempo todo.

É a mesma classe que `CLAUDE.md` §13 nomeia — **afirmação de medição sobre
coisa que não foi medida engana justamente por dizer que foi**. Aqui a vítima
não foi um documento: foi uma decisão do fundador, tomada sobre uma premissa
falsa que eu apresentei como observação. Registrado para não repetir:
**afirmação sobre o que o protótipo mostra se confere abrindo o arquivo, antes
de virar argumento — nunca de memória do que se leu no começo da tarefa.**

**Lacunas conhecidas, registradas e não corrigidas** (`CLAUDE.md` §2 item 7,
terceira categoria):

- **A "frase de resumo" de `docs/estilo.md` (linha 117) não foi construída**,
  decisão do fundador: o rótulo **"Desse, vencido"** já diz o que ela diria,
  em duas palavras em vez de uma linha, e ela repetiria os dois números que
  estão logo acima. Provavelmente nasceu num protótipo sem esse rótulo. Se o
  Design achar que precisa, ele diz.
- **Tamanho do número do topo**: usei `text-valor-lista` (20/800), que a folha
  define para valor **na lista**; nenhuma linha dela nomeia o número do topo
  de Cobranças. O protótipo usa **17/800 com `wdth 94%` e o "R$" em 10px
  separado** — não seguido porque 17px não existe como token e criar um seria
  valor fora do sistema (`CLAUDE.md` §8: pergunte). Junto disso,
  `docs/estilo.md` (linha 443) manda "encolhimento por faixa de dígitos para
  valores muito altos", apontando para uma seção "Cobranças 5i" que **não
  existe** em `docs/componentes.md` — construído sem encolhimento nenhum: o
  valor muito alto quebra em duas linhas dentro da pastilha, que é o que o §8
  permite, mas não necessariamente o que o Design quer. Achado do segundo
  `/revisar`.
- **Rótulo do terceiro número**: `docs/especificacao.md` §4.5 escreve
  "Recebido no mês"; a tela escreve **"Recebido em agosto"**, seguindo o
  protótipo ("RECEBIDO EM AGOSTO"). `docs/componentes.md`, dono do rótulo pelo
  §13, não decide o caso.
- **Texto de apoio do estado vazio** ("Você tem N fretes a faturar. Faturar um
  frete cria a cobrança dele." / "Suas cobranças aparecem aqui quando você
  faturar um frete.") não está em documento nenhum — `docs/componentes.md`
  registra só os botões de "Cobranças vazia".
- **Cor de "BOLETO"**: `text-tinta-fraca` (`#A8AFA9`); o protótipo usa
  `#6E7770`. Nenhum documento decide o caso.
- **Textos de prazo que não estão em documento nenhum**: "venceu ontem",
  "venceu há N dias", "vence hoje", "vence amanhã", "vence em 12 ago",
  "recebido em 5 ago", "sem vencimento", e o rótulo "Recebidas em agosto de
  2026" — o protótipo escreve "RECEBIDAS EM AGOSTO", sem ano; o ano entrou
  porque a tela abre sem filtro de período e pode listar dois anos juntos.
- **Total contextual com a lista cortada no teto de 50**: o dinheiro exibido
  soma só as 50 carregadas. Mesma lacuna herdada de "Meus fretes"; §4.5 pede
  "total contextual que recalcula" sem dizer se é o do recorte ou o do
  conjunto inteiro. **O texto do corte, esse, foi corrigido**: dizia "50 mais
  recentes", copiado de "Meus fretes", mas aqui as abertas vêm ordenadas por
  **vencimento crescente** — as 50 exibidas são as que vencem antes, não as
  mais recentes. Passou a dizer "50 que vencem antes", e "50 mais recentes" só
  em Recebidas, que é a única situação ordenada por data. Achado do segundo
  `/revisar`.
- **`FolhaDeOrdenacao` ficou com nome preso ao primeiro uso** — agora serve
  também ao chip "Situação" (prop `titulo`). Renomear para `FolhaDeOpcoes`
  tocaria as três telas de cadastro, fora do escopo desta tarefa.
- **Sem verificação de tela**, igual à Tarefa 1: não existe teste de
  componente no projeto e não há como autenticar numa sessão de navegador a
  partir daqui. O que foi medido é a regra, no banco de verdade.

**Pedido ao Design** (`CLAUDE.md` §13, o lado do repositório não substitui
avisar o Design): confirmar a frase de resumo, o tamanho do número do topo e a
regra de encolhimento que aponta para uma seção inexistente, o rótulo
"Recebido em agosto", a cor de "BOLETO", os textos de prazo e o texto do
estado vazio. **"Gerar relatório" no estado vazio entra no item 7**, como o plano já
previa — hoje a tela usa a neutra "Ver os N fretes", que existe e leva a
Fretes filtrado.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes. `npm test` local **419/419** contra o Supabase de desenvolvimento —
398 anteriores mais 21 desta tarefa. Esteira deste commit ainda não
confirmada — ver `/onde-paramos`.

Próximo: Tarefa 3 do item 6 — Folha de recebimento e recebimento parcial
(migration da tabela `recebimento`, "Marcar recebido" no detalhe do frete e a
marca **Parcial** na linha de Cobranças).

---

## 26/08/2026 — Tarefa 1 do item 6: Faturar frete

O primeiro caminho do produto a criar uma cobrança **em aberto**. Até aqui, o
único jeito de um título nascer era "Já recebi", que já cria pago — por isso
"A receber"/"Vencido" eram zero em toda tela e a etiqueta **Faturado** era
inalcançável na prática.

`faturarServico` (`src/lib/servicos/titulos.ts`), a folha
`FolhaDeFaturamento` e a principal "Faturar frete" no detalhe do frete
(`AcaoFaturarFrete.tsx`), que aparece no estado "finalizado e sem cobrança".
Sem migration: `titulo_receber` já tinha todos os campos desde o item 3, e
`vencimento`/`forma_pagamento_prevista`/`status` nunca tinham sido
preenchidos por ninguém.

**Plano do item inteiro commitado antes (`12385fc`)**, com seis decisões do
fundador registradas antes de qualquer código —
`docs/planos/item-6-titulo-e-cobrancas.md`.

**A folha não fatura direto, e o motivo é do fundador:** o vencimento define
quando aquilo vira "vencido" na tela, e errar significa cobrar antes da hora
ou tarde demais. O prazo do cadastro é **padrão, não verdade daquele frete**
— cliente pede prazo maior num mês, combina diferente numa carga. É o
terceiro dos três níveis de prazo do §4.7, que nunca tinha existido em
código.

**Achados do `/revisar`, primeiro passe — duas divergências e sete lacunas.**
Três corrigidas na hora, quatro decididas pelo fundador:

- **O arquivo de teste aparecia reescrito inteiro** (1022 linhas saindo,
  1221 entrando) numa mudança pontual — `CLAUDE.md` §2 item 6. **A causa era
  minha e vale registrar para não repetir: um script em Python reescreveu o
  arquivo convertendo LF para CRLF.** O repositório guarda este arquivo em
  LF puro; `io.open(caminho, "w")` no Windows traduz `\n` para `\r\n` na
  escrita, então **toda** linha passou a diferir. Normalizado de volta;
  o diff virou 200 linhas acrescentadas e 1 alterada, que é o que de fato
  mudou. Editar arquivo do repositório por script em Python no Windows
  precisa de `newline=""` (ou escrita binária) — senão o diff mente sobre o
  tamanho da mudança e a revisão não enxerga o que importa.
- **"Faturar frete" aparecia em frete arquivado.** Esta tela lê frete
  arquivado de propósito (§7), e um arquivado pode estar finalizado e sem
  título — o botão apareceria e o toque falharia sempre com "Frete não
  encontrado". Botão sem destino é o que `CLAUDE.md` §8 proíbe, e aqui numa
  ação de dinheiro. `arquivado_em` entrou na condição.
- **A armadilha do estorno morava num comentário de código.** O índice único
  `titulo_receber_um_integral_por_servico` é
  `WHERE integral = true AND arquivado_em IS NULL` — **não exclui
  `status = 'cancelado'`**. Quando o estorno existir (Tarefa 7), refaturar
  vai falhar com mensagem mentirosa ("Este frete já foi faturado", com o
  título cancelado). Movido para a **Tarefa 7 do plano**, com a correção
  (acrescentar `AND status <> 'cancelado'` ao índice) e o motivo de não
  resolver arquivando o título estornado — seria usar `arquivado_em` como
  truque para contornar restrição, misturando dois significados de "fora do
  ar". Nas palavras do fundador, "foi a correção mais importante da rodada —
  quem construir a tarefa 7 lê o plano, não o comentário".

**Decisões do fundador nesta rodada, todas registradas no plano:**

1. **`vencimentoPadrao` fica dentro de `titulos.ts`, e o plano é que foi
   corrigido** — ele mandava criar `src/lib/servicos/vencimento.ts`.
   Vencimento de título é o mesmo assunto que título, e duas funções de uma
   linha em arquivo próprio seriam o arquivo especulativo que o §6 proíbe.
2. **"Outro" é a forma de cobrança marcada por padrão**, e o motivo ficou
   escrito no plano **e** na docstring do componente, a pedido do fundador,
   "senão alguém corrige depois achando que boleto é mais comum": boleto
   **não** exibe "Cobrar no WhatsApp" e não gera pendência (§8 item 11), então
   quem confirmasse sem prestar atenção perderia a ação de cobrar sem
   entender por quê. O padrão errado aqui não erra um campo — some com uma
   ação.
3. **Vencimento no passado é permitido.** Recusar obrigaria a mentir na data:
   faturar frete antigo com prazo já vencido é caso real, e quem faz isso
   está registrando o que aconteceu, não criando dívida nova.
4. **Conferência pedida pelo fundador junto da decisão 3** — se "cobrado há X
   dias" fica estranho num título que nasceu vencido e nunca foi cobrado.
   **Não fica: ele não aparece**, porque a marca sai de `CobrancaEnviada`,
   gravada só quando alguém responde "Enviei". Registrado na Tarefa 6 do
   plano junto do erro a não cometer — derivar "cobrado" do vencimento ou da
   data de faturamento diria "cobrado há 40 dias" para algo que ninguém
   cobrou nenhuma vez.

**Achados do `/revisar`, segundo passe — duas divergências e quatro
lacunas.** Nenhuma da primeira categoria do §2 item 7 (rigor total), então o
teto de dois passes se aplica e a tarefa fecha aqui; as que mudam
comportamento hoje foram corrigidas no próprio passe, o resto virou registro:

- **As três mensagens da trava de edição diziam "Frete já recebido", e isso
  virou mentira nesta tarefa.** Eram verdade **enquanto** "Já recebi" fosse o
  único jeito de um título nascer — ele já cria pago. `faturarServico` criou
  o primeiro título **aberto** do produto: a trava passa a disparar para
  frete **Faturado** ("existe título ativo, nenhum centavo entrou ainda",
  §7), e dizer "já recebido" ali afirma ao usuário que entrou dinheiro que
  não entrou. A regra escrita (§8 item 12) sempre falou de **título ativo**,
  nunca de recebimento — a frase é que estava presa ao único caso que
  existia. As três passaram a dizer **"Este frete já tem cobrança"**
  (`titulos.ts`, duas; `fretes/novo/TelaLancarFrete.tsx`, uma), verdadeiro
  tanto para título aberto quanto para pago. Nenhum teste dependia das
  frases antigas.
- **O vencimento aparecia sem ano na folha** ("segunda, 4 de janeiro"). O
  formatador usado é declarado, no próprio `data-fortaleza.ts`, como o da
  mensagem lida pelo **motorista** — a tela lida pelo dono leva ano. E aqui o
  ano não é enfeite: 15 dias a partir de qualquer dia da segunda quinzena de
  dezembro já caem no ano seguinte (o próprio teste desta tarefa cobre
  20/12 → 04/01), e sem ele "4 de janeiro" não distingue o janeiro que vem do
  que passou, num campo que decide quando a cobrança vira vencida. Nasceu
  `formatarDiaDaSemanaDataEAno`, com dois testes próprios.

**O que foi pedido ao Design — seis itens, enviados juntos por decisão do
fundador. Cinco são de `docs/componentes.md`; o último é de
`docs/navegacao.md`:**

1. **Folha de "Faturar frete"** — tela nova, não existe na tabela "Onde cada
   tela usa o quê" (que já tem linha própria para Folha de busca, de
   calendário e de recebimento).
2. **Os rótulos "Vencimento" e "Cobrança"** dentro dela, escritos por não
   haver de onde tirar — rótulo é decisão de produto (§2 item 5).
3. **Estorno** — ação destrutiva em texto no detalhe da cobrança, junto de
   Arquivar mas **com confirmação**, dizendo as três consequências (o frete
   volta a A faturar, o título é cancelado, o histórico registra). Item novo
   do inventário.
4. **Estado vazio de Cobranças** — `docs/componentes.md` prevê principal
   **Gerar relatório**, que é item 7 e não existe. A Tarefa 2 vai usar a
   neutra "Ver os N fretes", que existe, porque botão sem destino é proibido
   (§8). Gerar relatório entra no item 7.
5. **A cor da etiqueta "Faturado"** — achado do segundo `/revisar`.
   `EtiquetaSituacao.tsx` usa `--color-tinta-apoio` como **placeholder
   declarado** ("cor própria pedida ao Design"), decidido no item 4, Tarefa 1,
   quando o estado era **inalcançável**. Esta tarefa o torna alcançável no
   produto: o placeholder passa a aparecer para o usuário de verdade.
6. **A linha do Detalhe do frete em `docs/navegacao.md`** — "Faturar frete"
   está lá na coluna "Leva para" **sem destino**, enquanto a ação irmã tem o
   caminho descrito ("abre a Folha do campo que falta → conversa"). A folha
   nova precisa entrar ali: `CLAUDE.md` §13 dá a `navegacao.md` o escopo de
   "para onde ela leva", e desenho novo é do Design, não do repositório.

**Padrão nomeado em `CLAUDE.md` §2, a pedido do fundador:** "texto que está
certo só por coincidência de estado envelhece calado — e quem cria o estado
novo é quem tem que reler o texto". Conferido no diário antes de escrever, a
pedido dele: **já tinha acontecido uma vez**, em 23/08/2026 (Tarefa 1 do item
5, achado 5 do `/revisar`) — `docs/especificacao.md` dizia "a regra não
protege nada hoje", verdade enquanto nada usasse aquela regra. Com o "Frete
já recebido" desta tarefa são dois, que é o critério que o §2 usa para nomear
padrão em vez de registrar achado isolado.

O que o padrão pede é uma **varredura de fim de tarefa** por textos do
domínio sempre que a tarefa tornar alcançável um estado que antes não era —
e a nota já diz onde isso volta a acontecer, também a pedido do fundador: o
**item 7** (cobrança de vários fretes, contra todo texto que diz "o frete" no
singular) e o **item 13** (assinatura liga `inadimplente`/`vencida`/
`encerrada`, hoje só no schema, contra todo texto escrito supondo empresa
sempre ativa).

**Registrado no plano, não construído agora** (achado do segundo `/revisar`):
`docs/componentes.md` prevê a secundária **Marcar recebido** no detalhe do
frete, e com "Faturado" alcançável o frete faturado fica sem caminho para
registrar recebimento a partir da própria tela dele. Não entrou aqui pela
regra de sempre — a ação de fundo não existe até a Tarefa 3 —, e foi
acrescentada ao escopo da **Tarefa 3** do plano para não escapar.

**Lacuna conhecida, registrada e não corrigida** (`CLAUDE.md` §2 item 7,
terceira categoria): a folha e a principal não têm verificação de tela — não
existe teste de componente no projeto, e não há como autenticar numa sessão
de navegador a partir daqui para conferir no ar. O que foi medido é a regra
de negócio, no banco de verdade.

**Verificação: local.** `npx tsc --noEmit`, `npm run lint` e `npm run build`
verdes. `npm test` local **398/398** contra o Supabase de desenvolvimento —
384 anteriores, mais 12 da regra de faturamento e 2 do formatador de data com
ano. Esteira deste commit ainda não disparada — ver `/onde-paramos`.

Próximo: Tarefa 2 do item 6 — Tela de Cobranças (três números no topo,
filtros, lista agrupada em Vencidas · Vence hoje · A vencer, estado vazio).

---

## 25/08/2026 — Tarefa 6 do item 5: `server-only` em db e auth

`import "server-only"` no topo de `src/lib/db/index.ts` e `src/lib/auth/index.ts`
— mesma proteção que a Tarefa 4 já tinha dado a `comprovantes.ts`. Item 5
fecha aqui.

**Estendida a um terceiro arquivo, decisão do fundador ao revisar o primeiro
passe**: `src/lib/db/sem-filtro-de-empresa.ts` (a "saída de emergência" do
login, guarda `AUTH_DATABASE_URL`, único caminho por fora do filtro de
empresa) também ganhou `import "server-only"`. O plano original só citava os
outros dois; o fundador reconheceu o buraco no próprio pedido — a proteção
que este arquivo tinha (trava de lint, que não roda mais em `next build`
desde o Next 16) é exatamente o tipo de proteção acidental que esta tarefa
existe para substituir.

**A prova exigida pelo plano** (`docs/planos/item-5-ordem-de-servico.md`,
Tarefa 6): Client Component + rota temporários (`src/app/teste-server-only-temp/`)
importando `db` e `auth`, `npm run build` reproduziu o erro apontando para a
linha certa nos dois arquivos, arquivos apagados depois. Diferente da Tarefa 4
(que ficou só com essa verificação manual), esta ganhou teste automatizado
permanente — ver abaixo.

**Achado no caminho, corrigido antes do commit: `server-only` quebrava
`npm run medir:municipios`.** Medido, não suposto: o comando roda com `node
--import tsx`, sem a condição `react-server` que o Next.js ativa no bundler —
o pacote `server-only` resolve, por `exports` condicional
(`node_modules/server-only/package.json`), para `index.js` (que lança sempre)
em vez de `empty.js` nesse caso. `scripts/medir-municipios.mts` importa
`fecharConexao` de `@/lib/db`, então passou a quebrar no import, reproduzido
rodando o comando de verdade antes da correção. Corrigido acrescentando
`--conditions=react-server` só ao script `medir:municipios` do `package.json`
— ativa a mesma condição que o Next.js já ativa no build, resolvendo
`server-only` para o no-op; reproduzido de novo, depois da correção, rodando
o comando de verdade e confirmando que executa. `seed:municipios` não é
afetado: abre a própria conexão, nunca passa por `@/lib/db` (`CLAUDE.md` §6).

**Segundo passe do `/revisar`, zero divergências, três lacunas.** Uma
corrigida no próprio passe (`CLAUDE.md` §2 item 7): o cabeçalho de
`scripts/medir-municipios.mts` e a entrada "ATENÇÃO AO RODAR —
`medir:municipios`" do `CLAUDE.md` §14 só citavam a exigência de `tsx`, não a
de `--conditions=react-server` — atualizados os dois com o sintoma
("This module cannot be imported from a Client Component module", sem citar
flag nenhuma) para quem rodar o comando por fora do `npm run`.

**Teste permanente construído, decisão do fundador**: `tests/protecao-server-only.test.ts`
(novo). Duas camadas, as duas conferindo **quatro** arquivos **por nome**,
nunca por varredura (pedido explícito do fundador — arquivo sensível novo sem
proteção não deve passar despercebido só porque um `grep` não sabia dele):

- **Presença** — o próprio código-fonte de cada um dos quatro começa com
  `import "server-only";`.
- **Efeito** (o que o fundador pediu para tentar antes de aceitar a versão
  simples) — roda `node --import tsx` de verdade sobre cada arquivo, com e
  sem a condição `react-server` (a mesma que o Next.js ativa ao empacotar
  para o servidor; sem ela, é a resolução que um bundle de navegador teria).
  Contraste com uma fixture nova (`tests/fixtures/sem-server-only.ts`, sem o
  import) prova que o teste reage à proteção, não a qualquer coisa que der
  errado ao carregar um módulo.

**O quarto arquivo é `src/lib/servicos/comprovantes.ts`** — protegido desde a
Tarefa 4, ficou de fora da primeira versão da lista (que só olhava os três
desta tarefa) e entrou por achado do terceiro `/revisar` e decisão do
fundador: "é o mais sensível dos quatro, guarda a chave que ignora o
isolamento" (`SUPABASE_SERVICE_ROLE_KEY`, que ignora RLS por atributo —
`CLAUDE.md` §5). Junto dele entrou, escrita **dentro do próprio teste**, a
regra que impede o quinto de repetir o problema: todo arquivo que receber
`import "server-only"` entra nesta lista, no mesmo commit que ganha a linha.
Lista por nome só protege quem alguém escreveu nela.

**A camada de presença não é redundante — motivo medido, não suposto,
montando o teste**: `src/lib/auth/index.ts` importa
`sem-filtro-de-empresa.ts`, também protegido. Removendo a linha só de
`auth/index.ts` na mão para testar o próprio teste, o contraste de efeito
continuou "passando" — o carregamento ainda lançava o erro de `server-only`,
só que vindo de dentro do arquivo importado, não da linha que faltou.
Só a checagem de presença, por nome, pegou essa remoção. As duas camadas
ficam: efeito prova que o mecanismo funciona de ponta a ponta, presença
prova que cada arquivo carrega a própria parte, sem depender do que ele
importa.

**Lacuna recusada de propósito, decisão do fundador — não reabrir sem
reler**: a flag `--conditions=react-server` do `medir:municipios` **não**
ganha cobertura na esteira. Se ela sumir, quem descobre é quem rodar o
comando na mão, e o custo é uma mensagem de erro — não dado errado, não
vazamento, não cliente afetado. Pôr o script na esteira faria uma medição
rodar a cada envio para proteger uma ferramenta de operação rodada sob
demanda. É exatamente a calibragem do `CLAUDE.md` §2 item 7: rigor total é
para isolamento, dinheiro e dado que não volta — não para tudo.

**Verificação: local.** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes (incluindo a reprodução manual da Tarefa 6 original, com Client
Component e rota temporários, descrita acima). `npm test` local 384/384,
contra o Supabase de desenvolvimento de verdade — 370 anteriores mais 14 do
arquivo novo. Esteira do commit `432a6d9` **verde**, confirmada em 26/08/2026.

Próximo: item 6 da ordem de construção do produto
(`docs/especificacao.md` §9) — Título a receber e Cobranças, incluindo
recebimento parcial e boleto. Plano ainda não feito.

---

## 25/08/2026 — Tarefa 5 do item 5: Upload do comprovante

Pipeline completo em `src/lib/servicos/comprovantes.ts` (`enviarComprovante`):
tamanho declarado do corpo (rota `src/app/api/fretes/[id]/comprovante/route.ts`,
antes de ler o arquivo — Server Action não serviria, limite de 1 MB e sem
acesso ao `Content-Length` cru), sniff por conteúdo (`file-type`), pipeline de
imagem (`sharp` para JPEG/PNG/WEBP; `libheif-js` direto, em duas etapas, para
HEIC/HEIF — o binário pré-compilado do `sharp` não decodifica HEIC de iPhone
de verdade, medido nesta tarefa), redimensiona/recomprime sempre em JPEG,
remove EXIF, grava com nome aleatório no balde `comprovantes` (Tarefa 4).
`salvarCaminhoComprovante` (`servicos.ts`) grava o caminho. Rate limit próprio
(`trava-de-comprovante.ts`, por IP, 20/5min — número aprovado, entrou na
tabela de `docs/especificacao.md`). Tela: `AnexarComprovante.tsx`, pílula em
linha entre os campos e o bloco de ações do detalhe do frete.

**HEIC real de iPhone testado de verdade** (pendência do plano, não só
suposta): o fundador mandou uma foto real (`3024×4032`, "Alta Eficiência").
Decodificou certo via `libheif-js`, saiu `1200×1600`/153 KB/sem EXIF, e a
orientação conferida visualmente (a foto em si) saiu correta. A foto não
entrou no repositório nem ficou salva — apagada depois de conferir, é imagem
pessoal de terceiro.

**Seis passes do `/revisar`, o maior número desta tarefa até agora.** Todos os
achados de rigor total (isolamento, dado apagado, teste que engana) vieram nos
passes 2, 3 e 4 e foram corrigidos até fechar:

- O objeto do comprovante anterior era apagado ao trocar — violava
  `CLAUDE.md` §7 ("Nada é apagado"). Corrigido: o antigo fica no balde
  (órfão, registrado na lacuna de 2 GB abaixo).
- O primeiro teste de "contraste" de isolamento gravava com o papel
  `postgres` (ignora RLS por atributo, sempre) — não provava nada sobre a
  checagem de `enviarComprovante`. Removido, com o motivo escrito: esta
  proteção é a RLS de `servico`, já coberta genericamente pela suíte de
  isolamento — diferente de `gerarUrlComprovante` (Tarefa 4), que usa
  `service_role` e por isso TEM contraste próprio.
- `Content-Length` vazio/negativo/ilegível passava como "dentro do limite" —
  corrigido para checagem de formato (só dígitos).
- Frete arquivado com comprovante quebrava a tela inteira do detalhe
  (`gerarUrlComprovante` lançava, a chamada nova entrou no `Promise.all` do
  render) — corrigido: não pede URL assinada de frete arquivado.
- Rate limit contava por usuário — `docs/especificacao.md` exige por
  endereço de rede. Corrigido, mesmo padrão de `trava-de-redefinicao.ts`.
- Erro cru do Supabase Storage (escrita e leitura) e de bibliotecas
  internas (`sharp`, Prisma) podiam vazar para a tela em inglês/jargão —
  corrigido com lista fechada de mensagens seguras
  (`MENSAGENS_SEGURAS_DE_COMPROVANTE`) e `gerarUrlComprovante` devolvendo
  `null` em vez de relançar na leitura.

Os passes 5 e 6 trouxeram só citação imprecisa (linha errada, seção errada,
contagem de itens desatualizada) — corrigidos no próprio passe, sem abrir
mais um, conforme `CLAUDE.md` §2 item 7.

**Pedido ao Design** (`docs/componentes.md`, `docs/estilo.md`,
`docs/planos/item-5-ordem-de-servico.md` — todas as lacunas abaixo já
registradas nesses arquivos, não só aqui):

- Rótulo da pílula ("Anexar" / "Trocar comprovante") e a lista inteira de
  textos de aviso do upload — sem confirmação.
- Altura da miniatura (`h-180`, provisório), se recorta ou mostra a foto
  inteira, se abre em tamanho cheio ao tocar, e cor/raio da miniatura —
  tudo reaproveitado do que já existe, nada formalizado.

**Lacunas registradas, não corrigidas — decisão de domínio ou borda rara**:
trava de 2 GB por empresa ainda não soma uso (`CLAUDE.md` §14, vira tarefa
antes de ligar anúncio); dois `AvisoDoSistema` simultâneos na mesma tela;
sessão vencida no meio do envio; frete arquivado ou falha de storage na
leitura mostram "sem comprovante" mesmo quando existe um (o objeto continua
no balde, só a tela não indica); se `exigirDono()` deveria valer aqui (hoje é
`exigirSessao()`, qualquer papel — nenhuma outra escrita do frete é restrita a
dono, mas a especificação diz "para o dono").

**Achado à parte, sem ação**: `libheif-js` é LGPL-3.0 — primeira dependência
copyleft do projeto (as demais são MIT/Apache/ISC/BSD). Não há política de
licença de dependência escrita; uso server-side, sem distribuir o binário,
risco baixo, mas fica registrado por ser o primeiro caso.

**Verificação: local.** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes. `npm test` local 370/370, contra o Supabase de desenvolvimento de
verdade — rodou **duas vezes** nesta sessão: a primeira, depois de muitas
horas de sessão longa (seis passes de `/revisar`), reprovou 48 testes com
"Connection terminated unexpectedly" em três pontos — mesma classe de
instabilidade de pool já registrada em 18-19/08/2026, não defeito de código;
a segunda, imediata, 370/370. Esteira deste commit confirmada verde
(`gh run view 32919620150`, `conclusion: success`).

## 25/08/2026 — Tarefa 4 do item 5: Isolamento do Storage

Balde privado `comprovantes` (migration `20260825060000_balde_comprovantes_storage`,
aplicada em desenvolvimento) e `src/lib/servicos/comprovantes.ts`
(`gerarUrlComprovante`) — a fundação da Tarefa 5, pendência aberta desde o
item 1 (`docs/diario.md`, 08/08/2026).

**Achado no caminho, corrigido antes do commit: `REVOKE` de privilégio (o
mesmo padrão já usado para `public`) não funciona em `storage.objects`/
`storage.buckets` — essas tabelas são donas de `supabase_storage_admin`, não
de `postgres`, e revogar exige autoridade que `postgres` não tem. Medido:
`has_table_privilege` continuou `true` antes e depois do `REVOKE`, sem erro
nenhum — mesma classe do achado antigo com `ALTER DEFAULT PRIVILEGES` em
função (`CLAUDE.md` §3).** A proteção real, também medida: `postgres`
consegue criar/derrubar política de RLS nessas tabelas mesmo sem posse, e
RLS ligado sem política nenhuma já nega por padrão — a política explícita
(`objects_nega_api_publica`/`buckets_nega_api_publica`, `USING (false) WITH
CHECK (false)`) é defesa em profundidade, não a única coisa entre a API
pública e a linha. Migration corrigida para ser idempotente (`DROP POLICY IF
EXISTS` antes de cada `CREATE POLICY`) — sem isso a esteira ficaria vermelha
no primeiro `prisma migrate reset --force` seguinte, porque esse comando só
recria o schema `public`, nunca `storage`.

`tests/isolamento/storage.test.ts` (novo): RLS medido de verdade (`SET ROLE
anon`/`authenticated`/`service_role` dentro da sessão de `postgres`, contra
uma linha real), contraste com política permissiva temporária (não dá para
desligar RLS por inteiro nem derrubar só a política de deny — as duas
tentativas medidas e documentadas no arquivo), e conferência do catálogo
(`pg_policies`) provando que a política da migration é o mecanismo, não só
o padrão de RLS-sem-política do Supabase. `tests/isolamento/comprovantes.test.ts`
(novo): o contraste do §3 para a checagem de posse — chama o storage direto,
pulando `gerarUrlComprovante` de propósito, prova que SEM a checagem a
mesma chamada teria funcionado.

**Duas variáveis novas** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) —
`.env.example`, `ci.yml` (a segunda como secret `SUPABASE_SERVICE_ROLE_KEY_CI`,
criado pelo fundador), tabela de "Ambientes" do `CLAUDE.md` §5.
`tests/guarda-de-banco.ts` estendida para validar `SUPABASE_URL` contra os
projetos permitidos — a suíte passou a gravar/apagar objeto de verdade num
balde, mesmo risco que a trava já cobria para linha de banco.

**Achado do fundador, fora do que o `/revisar` pegou: a chave `service_role`
(que ignora RLS) não tinha proteção contra acabar em código que roda no
navegador — só contra um segundo cliente nascer em outro arquivo do
servidor.** `import "server-only"` em `comprovantes.ts` (pacote do próprio
Next.js: se o arquivo for arrastado para o pacote do navegador, o build
quebra antes de publicar). **Testado de verdade, não suposto**: página e
componente de mentira importando o arquivo do lado do cliente, `npm run
build` reproduziu o erro apontando para a linha certa, removidos depois.
Efeito colateral: `server-only` lança sempre fora do build do Next.js — o
Vitest quebrava ao importar `comprovantes.ts` mesmo sendo o lado servidor.
Corrigido com alias em `vitest.config.mts` para `tests/stubs/server-only.ts`
(no-op), o mesmo que o webpack do Next.js já faz para compilação de
servidor — não afrouxa a garantia, só não a testa nesse arquivo (quem testa
o lado navegador é `npm run build`).

**Registrado, não corrigido nesta tarefa**: a mesma proteção
(`server-only`) não existe em `src/lib/db/index.ts` nem `src/lib/auth/index.ts`
— hoje o build só quebraria por acidente (a biblioteca `pg` não roda em
navegador), não por uma trava pensada para isso. Decisão do fundador, ao
aprovar: vira **Tarefa 6** deste plano (`docs/planos/item-5-ordem-de-servico.md`),
depois da Tarefa 5, para não interromper esta tarefa no meio.

**60 segundos de expiração da URL assinada** — decisão do fundador,
25/08/2026, registrada em `docs/especificacao.md` (entidade Servico,
`comprovante_url`): tempo de a tela carregar a imagem, nada além disso.

**Dois passes do `/revisar`.** Primeiro passe: 11 divergências, 5 lacunas —
todas corrigidas ou fechadas por medição (achados de documentação
desatualizada, o `EXPIRACAO_URL_SEGUNDOS` sem decisão registrada — resolvido
acima —, e o achado mais sério, a migration não idempotente). Segundo passe:
5 divergências, todas de precisão de documento (nenhuma mudava
comportamento — corrigidas no mesmo passe, sem abrir um terceiro,
`CLAUDE.md` §2 item 7), e 5 lacunas — duas fechadas por medição
(`FORCE ROW LEVEL SECURITY` também não roda como `postgres`, e não faria
diferença se rodasse: só afeta o dono da tabela, nunca `anon`/`authenticated`;
tipo de conteúdo fixo é responsabilidade de quem grava — Tarefa 5 —, não de
quem lê), as outras (secret do GitHub, entrada do diário) resolvidas com o
fechamento desta tarefa.

Também corrigida uma imprecisão da entrada anterior (Tarefa 3): dizia
"esteira ainda não disparada" sobre um push já confirmado verde antes desta
sessão começar (`/onde-paramos`, `gh run list`, `conclusion: success`).

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
(incluindo a reprodução manual do vazamento de `server-only`, descrita
acima) verdes. `npm test` **local** 361/361, contra o Supabase de
desenvolvimento de verdade (banco e storage) — inclui
`tests/isolamento/comprovantes.test.ts` rodando upload/leitura reais no
balde `comprovantes`. Esteira deste commit ainda não disparada — ver
`/onde-paramos`.

Próximo: Tarefa 5 do item 5 — Upload do comprovante
(`docs/planos/item-5-ordem-de-servico.md`).

---

## 24/08/2026 — Tarefa 3 do item 5: Marcar como finalizado

`marcarServicoFinalizado` (`src/lib/servicos/servicos.ts`): única transição
válida `em_andamento → finalizado`, recusa com mensagem própria a partir de
`finalizado` ou `cancelado`. `marcarServicoFinalizadoAction`
(`src/app/(app)/fretes/acoes.ts`) e `BotaoMarcarFinalizado.tsx` (novo,
`fretes/[id]/`) — secundária que acompanha sempre que o frete estiver
`em_andamento`, qualquer que seja o estado da principal (decisão já
registrada no plano: enviar ordem e finalizar são ações independentes).
Ligado em `fretes/[id]/page.tsx`, ao lado de `AcaoOrdemDeServico`.
`docs/componentes.md` linha 415 corrigida (a secundária não "ainda não
acompanha" — agora acompanha).

`tests/servicos.test.ts`, describe 13 (+4: transição válida, recusa a
partir de finalizado, recusa a partir de cancelado, isolamento) —
`CONFERENCIAS_ESPERADAS` 45 → 49.

**`/revisar` — nove tentativas até rodar, oito derrubadas pelo mesmo `529
Overloaded` da API (sobrecarga do servidor da Anthropic, confirmado pela
mensagem do próprio erro, não sintoma do projeto).** Decisão do fundador ao
ser avisado, mantida até a nona tentativa: esperar a instabilidade passar e
tentar de novo, **sem commitar sem o passe** — a tarefa é curta e de baixo
risco, mas abrir exceção por indisponibilidade de ferramenta cria o
precedente errado (`CLAUDE.md` §2, item 7).

**Um passe, três divergências, duas lacunas — as cinco resolvidas antes do
commit.**

Divergências, todas corrigidas em `fretes/[id]/page.tsx`:
1. Comentário se contradizia: dizia que o frete finalizado/faturado "continua
   sem principal nem secundária", e a frase seguinte, no mesmo comentário,
   afirmava que **Editar frete** (secundária) "fica no bloco de ações, em
   todo estado" — o código já fazia isso certo (Editar frete fora do `if` de
   "em andamento"), só o texto lia como se sumisse também. Reescrito para
   nomear que só "Marcar como finalizado" some, nunca Editar/Arquivar.
2. Citação `docs/componentes.md` "linhas 374 e 412" apontava para uma linha
   em branco e para o separador da tabela — herdada da Tarefa 2 sem
   conferir. Corrigida para 379–390 (medição) e 427 (a linha da tabela).
3. Esta mesma entrada do diário não trazia a lista "O que foi pedido ao
   Design" para a correção de `docs/componentes.md:415` — `CLAUDE.md` §13
   exige isso a cada correção de estado feita pelo repositório. Ver abaixo.

Lacunas, resolvidas por decisão do fundador (não deixadas para os itens 6/7
— "lá a tela ganha mais botões, cada um nasceria escolhendo um dos dois
padrões; melhor o padrão existir antes"):
4. Erro de "Marcar como finalizado" aparecia como texto vermelho ao lado do
   botão, enquanto o vizinho (`AcaoOrdemDeServico`) já resolve a mesma
   classe de falha com `AvisoDoSistema` (superfície escura) — dois
   tratamentos para o mesmo tipo de mensagem na mesma tela.
5. Depois de finalizar com sucesso, nada na tela confirmava — os dois
   botões só somiam. Mesma classe do "Agora não" fechando em silêncio,
   corrigido na Tarefa 2.

Resolvidas juntas: sucesso e erro agora passam pelo mesmo `AvisoDoSistema`
("Frete finalizado" no sucesso, sem botões, some sozinho; a mensagem de
erro no lugar dele quando falha, também sem botões — o botão continua
disponível para tentar de novo). **A tela atualiza (`router.refresh()`) na
hora do sucesso, não depois do aviso sumir** — esperar deixaria "Marcar
como finalizado" visível sobre um frete já finalizado, convidando a tocar
de novo sobre estado que já mudou. Isso exigiu mudar onde
`BotaoMarcarFinalizado` monta: antes só existia dentro do `if` de "em
andamento", então o refresh o desmontaria (e o aviso morreria junto, antes
de dar tempo de ler); agora `page.tsx` o renderiza incondicionalmente, e é
o próprio componente (via a prop `emAndamento`) quem decide se o botão
aparece — o aviso é estado próprio, que sobrevive ao refresh porque o
componente nunca desmonta.

**O que foi pedido ao Design** (correção de estado feita pelo repositório,
`CLAUDE.md` §13 — a fonte do Design ainda não tem esta mudança):
`docs/componentes.md` linha 415 (Detalhe do frete: a secundária "Marcar
como finalizado" agora acompanha a principal, em vez de "ainda não
acompanha").

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes; `npm test` **local** 339/339 antes das correções do `/revisar`.
Fluxo completo no navegador depois das correções (conta nova, frete
lançado, "Marcar como finalizado" tocado): botão principal e secundária
somem na hora, aviso "Frete finalizado" sobrevive ao refresh e some
sozinho ~6s depois, sem erro no console — confirma o comportamento pedido
(tela atualiza na hora, aviso não desmonta junto do bloco de ações).
`npm test` **local** rodado de novo depois: uma reprovação em
`tests/servicos.test.ts` ("CRUD básico", teste que não toquei nesta
tarefa) na suíte inteira — isolado (`vitest run tests/servicos.test.ts`),
50/50, sem reproduzir; suíte inteira rodada uma terceira vez, 339/339
limpa. Instabilidade pontual de pool sob carga dos 21 arquivos juntos
(mesma classe já documentada no `CLAUDE.md` §2), não regressão desta
tarefa — nenhum teste novo tocado. Commit `7be07cb`, push feito — esteira
confirmada verde (`gh run list`, `conclusion: success`).

Próximo: Tarefa 4 do item 5 — Isolamento do Storage
(`docs/planos/item-5-ordem-de-servico.md`).

---

## 24/08/2026 — Tarefa 2 do item 5: mensagens.ts e "Enviar ordem no WhatsApp"

Construído conforme o plano (`docs/planos/item-5-ordem-de-servico.md`,
Tarefa 2): `montarMensagemOrdem` (`src/lib/servicos/mensagens.ts`) monta o
texto da ordem a partir de campos já resolvidos, nunca formata data dentro
da função · `formatarDiaDaSemanaEData` (`src/lib/utils/data-fortaleza.ts`) ·
`marcarOrdemEnviada` (`src/lib/servicos/servicos.ts`), idempotente · a
principal do detalhe do frete muda com o estado
(`AcaoOrdemDeServico.tsx`, novo): sem motorista → "Escolher motorista";
telefone ausente/inválido → folha do campo que falta, salva e segue
automaticamente para o WhatsApp; telefone válido → link direto. Confirmação
"Enviei"/"Ainda não" ao voltar da conversa, só depois de o link ter sido
tocado. `tests/mensagens.test.ts` (7 verificações, caso mínimo nomeado) ·
`tests/servicos.test.ts` (+3, isolamento de `marcarOrdemEnviada`) ·
`tests/data-fortaleza.test.ts` (+2).

**Antes de codar, achei uma contradição no próprio plano aprovado — trazida
ao fundador, não resolvida sozinho.** A Tarefa 2 mandava a secundária
"Marcar como finalizado" aparecer "sempre visível", e a mesma frase dizia
que a ação de fundo só nasce na Tarefa 3 — contra a regra já registrada
nesta tela ("botão cuja ação de fundo não existe não entra, nem
desabilitado"). Decisão do fundador: a regra vence, a secundária fica para
a Tarefa 3. Registrado que "sempre visível" descrevia **comportamento**
(a secundária não depende de `ordem_enviada_em` — dá para finalizar um
frete que nunca teve ordem enviada), não **momento de construir**. Plano
corrigido com a distinção antes do commit.

**Dois passes de `/revisar`.**

Primeiro passe, sete divergências — todas corrigidas: rótulo "Escolher
motorista" e o aviso "Enviei"/"Ainda não" do detalhe do frete fora do
inventário fechado (`docs/componentes.md`, sincronizado); "Agora não" na
folha de telefone fechando sem o aviso que a própria regra do §12 já exige
("Sem o telefone não dá para mandar a ordem por aqui.", corrigido);
`componentes.md` ainda listando "Enviar ordem" como não construído
(corrigido); `docs/navegacao.md` sem os dois caminhos novos (acrescentado);
citação de linha errada no comentário do `page.tsx` (349 → 374/412,
corrigida — o revisor notou que já vinha errada de antes); e
`salvarTelefoneParaOrdemAction` duplicando quase linha a linha
`salvarTelefoneMotoristaAction` de `motoristas/acoes.ts` — trocado para
reaproveitar a ação existente em vez de manter as duas.

Um dos três achados levados ao fundador nesse meio-tempo: o que a tela faz
quando `marcarOrdemEnviadaAction` falha ao gravar "Enviei". Decisão: o
aviso **não fecha sozinho** enquanto mostrar erro — troca a pergunta pelo
texto do erro, mantém os dois botões, deixa tentar de novo (a ação é
idempotente). Motivo do fundador, registrado porque é o motivo certo para
não esquecer depois: `ordem_enviada_em` é o dado que a pendência "fretes
sem ordem enviada" da dashboard vai contar (§4.6) — fechar em silêncio
faria o registro dizer o contrário do que aconteceu, e só apareceria dias
depois, sem ninguém entender por quê.

Segundo passe, sete divergências e seis lacunas. Duas correções de código,
as outras cinco de documento:

1. **O achado mais importante da tarefa.** No fluxo de telefone
   ausente/inválido, `window.open` rodava **depois** do `await` que salva o
   telefone no servidor. Em navegador de celular — o único aparelho onde
   este item existe (`CLAUDE.md` §1) — isso é bloqueado como pop-up, porque
   a pausa assíncrona quebra a cadeia de gesto confiável do toque original:
   a pessoa tocaria "Salvar e enviar ordem", o telefone salvaria, e o
   WhatsApp nunca abriria — sem erro nenhum na tela, lendo como o produto
   quebrado. **No navegador de computador isso nunca reproduz**, porque
   desktop não bloqueia `window.open` por atraso — é a segunda vez que o
   celular pega um defeito que o navegador de computador esconde (a
   primeira foi o teclado numérico cobrindo o valor, 12-13/08/2026).
   Corrigido: os dígitos do telefone já estão disponíveis sem esperar o
   servidor, então `window.open` roda primeiro (dentro do mesmo gesto de
   toque), o salvamento roda depois — **ordem é regra, não detalhe**,
   registrada em comentário no próprio código
   (`AcaoOrdemDeServico.tsx:161`) para não voltar se alguém "otimizar" a
   função movendo o `await` para cima. Testado ao vivo: `window.open`
   agora dispara antes do `await` completar.
2. **Um teste que não provava o que dizia — removido, não ajustado até
   passar.** "Nunca traz o valor do frete nem o nome do cliente" só
   verificava que o texto de `origem` saía intacto; passaria igual se a
   função inserisse valor ou cliente por conta própria. A garantia real é
   estrutural — `DadosMensagemOrdem` não tem esses campos, e isso já é
   coberto por `tsc --noEmit` a cada tarefa. Teste que confirma o que outro
   mecanismo já garante só dá falsa sensação de cobertura — removido em vez
   de reescrito para "passar de qualquer jeito", que é exatamente o defeito
   nomeado no `CLAUDE.md` §2, item 7 (rigor total).
3. Citação errada — meu comentário atribuía "nunca traz o nome do cliente"
   à §4.2, que só fala do valor; o nome do cliente é decisão do fundador
   registrada no plano. Corrigido em `mensagens.ts`.
4. `docs/especificacao.md` §9 ainda dizia "'Enviar ordem' continua sem
   construir" — corrigido.
5. `docs/navegacao.md`, linha "Modelo de ordem de serviço", listava chips
   `{motorista}` `{cliente}` que o texto real nunca usa — corrigido para o
   conjunto de verdade.
6. Aviso que não fecha sozinho com erro (decisão do fundador, acima) não
   estava registrado como exceção à regra geral "some sozinho em 6-8s" —
   registrado em `docs/componentes.md` §07, ao lado da exceção irmã do
   relatório com Pix.

Seis lacunas registradas nos documentos certos, sem bloqueio: texto do
aviso "Mandou a ordem pro motorista?" sem confirmação escrita; parâmetros
tipados de `mensagens.ts` em vez de marcadores `{}` literais (decisão do
item 9, ainda não planejado); as demais são pontos de estilo sem risco
(ícone no botão principal, non-null assertion já com precedente igual em
`clientes/[id]/page.tsx`).

**O que foi pedido ao Design** (correções de estado feitas pelo
repositório, `CLAUDE.md` §13 — a fonte do Design ainda não tem estas
mudanças): `docs/componentes.md` — linha 129/305 (onde "Enviar ordem"
dispara hoje), linha 400 (principal "Escolher motorista" e o aviso
Enviei/Ainda não no detalhe do frete), a exceção do aviso que não fecha
sozinho com erro (§07); `docs/navegacao.md` — linha 27 (Detalhe do frete,
os dois caminhos novos), linha 51 (Folha do campo que falta, novo gatilho),
linha 53 (Modelo de ordem de serviço, conjunto de variáveis corrigido).

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes; `npm test` **local** 335/335 (caiu de 336 por causa do teste
removido no achado 2 do segundo passe). Fluxo completo no navegador, duas
rodadas (antes e depois das correções do segundo passe): os três estados
da principal (Escolher motorista · folha de telefone com salvar-e-seguir ·
link direto), a mensagem montada batendo caractere a caractere com o
exemplo do plano, a confirmação Enviei/Ainda não, e — depois da correção —
falha de rede simulada em "Enviei" mantendo o aviso aberto com erro e
recuperando no toque seguinte. Esteira deste commit ainda não disparada —
ver `/onde-paramos`.

Próximo: Tarefa 3 do item 5 — Marcar como finalizado
(`docs/planos/item-5-ordem-de-servico.md`).

---

## 23/08/2026 — Tarefa 1 do item 5: telefone — normalização, validação, folha do campo que falta

Construído conforme o plano (`docs/planos/item-5-ordem-de-servico.md`,
Tarefa 1): `normalizarTelefone`/`linkWhatsapp` (`src/lib/utils/telefone.ts`,
DDI fixo em 55) · `FolhaDeTelefone`/`TelefonePerfil`
(`src/components/ui/`), primeiro consumidor real da "Folha do campo que
falta" (`docs/componentes.md` §12) · ligada nos perfis de Cliente e
Motorista, fechando as duas pendências de "telefone tocável" abertas desde
o item 2 (tarefas 5 e 7). `tests/telefone.test.ts`, 16 verificações.

**Dois passes de `/revisar` — o primeiro achou sete itens, o segundo mais
sete** (nenhum de dinheiro/isolamento; todos corrigidos, exceto os três
levados ao fundador):

1. `observacao` do cliente sendo zerado ao salvar só o telefone (a ação
   regravava o cadastro inteiro sem repassar esse campo) — corrigido.
2. Rótulo do botão "Salvar" fora do inventário fechado do §12 — trocado
   para "Salvar no cadastro" (um dos quatro já aprovados).
3. Comentário de código afirmando que a folha "segue pro WhatsApp" ao
   salvar — não é verdade nesta tarefa (é a Tarefa 2), corrigido.
4. Alvo de toque medido em 21,6px, abaixo do mínimo de 48px do
   `CLAUDE.md` §8 — corrigido com padding + margem negativa cancelando a
   caixa de fluxo (o texto não se move, o alvo cresce até a borda da
   linha); medido de novo em 49,6px.
5. `docs/especificacao.md` ainda dizia "a regra não protege nada hoje" —
   corrigido, com a data de quando isso deixou de ser verdade.
6. Citação de tarefa/linha errada entre dois documentos (a pendência do
   cliente estava atribuída à tarefa e à linha do motorista) — corrigido.
7. Apagar o campo de volta a vazio continuava mostrando erro (só a
   digitação inicial resetava o estado "tocado") — corrigido, removi
   esse estado e passei a checar só se o campo está vazio agora.
8. Depois de salvar, o servidor não era revalidado — `router.refresh()`
   acrescentado.
9. Faltava a mesma nota de "telefone tocável resolvido" no perfil do
   cliente em `docs/navegacao.md` (só tinha entrado no do motorista) —
   corrigido.

**Três achados levados ao fundador, decisão registrada:**

- **Onde a validação de telefone se aplica.** Registrado em
  `docs/especificacao.md` §9: valida no cadastro e na edição do próprio
  campo telefone; aceita o que já está salvo, mesmo inválido (não bloqueia
  salvar outro campo por causa de telefone antigo não tocado); a cobrança
  de verdade continua sendo a folha, no momento de usar. **Não construído
  nesta tarefa** — `criarClienteAction`/`editarClienteAction` e
  equivalentes de motorista continuam sem validar telefone; a decisão fica
  registrada para quando alguém construir isso.
- **Rótulo "Salvar no cadastro" é lacuna do inventário, não divergência
  corrigida.** Nenhum dos quatro rótulos do §12 foi escrito pensando no
  gatilho de telefone tocável no perfil — registrado como lacuna em
  `docs/componentes.md` §12, para o Design confirmar.
- **Bug de posicionamento em `FolhaInferior`/`FolhaDeBusca`, não desta
  tarefa.** `absolute inset-0` sem ancestral posicionado ancora no topo do
  documento, não da área visível — medido: página rolada 211px, folha
  abria 211px acima do que estava visível, descobrindo o rodapé da tela.
  Já existia no chip de Período dos perfis (`FolhaDePeriodo`) antes desta
  tarefa tocar em qualquer coisa — não é regressão. Decisão do fundador:
  trocar por `position: fixed` nos dois arquivos (`FolhaInferior.tsx`,
  `FolhaDeBusca.tsx` — implementação própria, mesmo padrão), não embrulhar
  tela por tela (o embrulho do Lançar frete resolve outro problema, o
  teclado numérico sobrepondo sem comprimir — copiar o padrão seria
  importar solução de problema errado). Conferido que não existe
  `transform`/`filter`/`perspective`/`will-change` em nenhum ancestral
  (recriaria o mesmo problema com `fixed`). Provado rolando e abrindo as
  sete telas com folha (Telefone, Ordenação, Período, Calendário, Busca,
  Cadastro rápido — as seis cobrindo 0 até a borda da viewport, medido no
  DOM; Situação não testada ao vivo — não consegui montar um frete de
  teste pela automação do teclado numérico —, mas é o mesmo componente
  `FolhaInferior` sem nenhuma sobrescrita própria). Teclado do celular:
  sem como simular o teclado nativo neste ambiente; aproximei encolhendo a
  janela de 812 para 380px de altura com a folha de telefone aberta —
  campo e botão continuaram visíveis. É evidência a favor, não prova
  definitiva — vale conferir num celular de verdade.

**Achado fora do código, registrado a pedido do fundador.** Ele respondeu a
uma rodada de decisões numerando itens ("3, 4, 5 — corrige", "a do teto de
8 caracteres...") que não existiam na minha mensagem — tinha suposto uma
lista de achados que não estava ali. Eu parei antes de agir sobre o
palpite e pedi para ele apontar o essencial; ele confirmou que o erro era
dele e que conferir antes de agir foi o comportamento certo. Salvo como
memória de sessão (`feedback_confirmar_antes_de_agir_sobre_lista_suposta`).

**O que foi pedido ao Design** (correções de estado feitas pelo
repositório, `CLAUDE.md` §13 — a fonte do Design ainda não tem essas
mudanças): `docs/componentes.md` §12 ("Onde dispara hoje", separando
construído de não construído; a lacuna do rótulo "Salvar no cadastro") e
as linhas de Perfil do cliente/Perfil do motorista (409, 411);
`docs/navegacao.md` — Perfil do motorista (linha 43) e Perfil do cliente
(linha 40) com o caminho novo de telefone tocável; "Folha do campo que
falta" (linha 51) marcada ✅; "Regras de navegação" (linha 87) com o novo
gatilho.

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes; `npm test` **local** 322/322 (roda de novo depois de cada rodada
de correção, última confirmação já com a troca `fixed`). Fluxo completo no
navegador: telefone inválido→corrigido e telefone ausente→preenchido, nos
dois perfis, persistindo de verdade (recarregado do banco); "Agora não"
com o aviso; as sete telas com folha, rolagem + abertura, medidas no DOM.
Esteira deste commit ainda não disparada — ver `/onde-paramos`.

Próximo: Tarefa 2 do item 5 — `mensagens.ts` e "Enviar ordem no WhatsApp"
no detalhe do frete (`docs/planos/item-5-ordem-de-servico.md`).

---

## 23/08/2026 — plano do item 5, aprovado: ordem de serviço, finalizar, comprovante

Item 4 fechado (commit `6e74c03`, esteira confirmada verde via
`/onde-paramos`). Planejamento do item 5 antes de qualquer código, conforme
`CLAUDE.md` §2.

**Cinco decisões levadas ao fundador antes de escrever o plano** (as opções
foram trazidas, não escolhidas sozinhas — pedido explícito dele para
telefone, estendido às outras por serem da mesma natureza):

1. DDI do link do WhatsApp fixo em 55 — produto é só Brasil.
2. Telefone salvo mas inválido reaproveita a folha do campo que falta
   (`docs/componentes.md` §12), com título e estado inicial adaptados, em
   vez de bloquear com erro seco.
3. Confirmação de envio pelo padrão "Enviei"/"Ainda não" ao voltar do
   WhatsApp, não o toque isolado gravando `ordem_enviada_em` na hora — sem
   isso, desistir de enviar registraria como enviado. Nasce aqui, o item 6
   ("Cobrar no WhatsApp") reaproveita.
4. Sem motorista no frete, o botão principal vira "Escolher motorista" em
   vez de manter o rótulo "Enviar ordem" apontando para uma tela que não
   envia nada. A alternativa (a folha do campo que falta também cobrir
   "falta motorista") foi avaliada por custo e recusada: viraria uma folha
   de escolha com gravação própria, arriscando encadear com a folha de
   telefone — três complicações por uma economia de rótulo.
5. Texto padrão da mensagem de ordem de serviço, com a regra de montagem
   (linhas condicionais, nunca linha em branco dupla) — o caso mínimo (só
   origem e destino) virou verificação obrigatória da Tarefa 2, a pedido do
   fundador.

**`{caminhao}` entrou na lista de variáveis de mensagem**
(`docs/especificacao.md` §9, exigência 2) — o rascunho do fundador citava o
caminhão, e a lista original não tinha essa variável.

**Achado ao escrever o plano: uma suposição solta no diário (20/08/2026,
"item 5 (cancelar frete)") não é decisão — `docs/especificacao.md` §9 nomeia
o item 5 só como "enviar ordem, finalizar, comprovante".** Cancelar frete
não tem item definido ainda; registrado no plano para não ser reaberto por
analogia.

Plano completo em `docs/planos/item-5-ordem-de-servico.md`, cinco tarefas:
telefone/folha do campo que falta · mensagens.ts + Enviar ordem · Marcar
como finalizado · isolamento do Storage · upload do comprovante.

**Verificação:** nenhum código de produto ainda — só os dois documentos.

Próxima sessão confirma a esteira deste commit via `/onde-paramos` antes de
começar a Tarefa 1.

Próximo: Tarefa 1 do item 5 — Telefone: normalização, validação e a folha do
campo que falta.

---

## 22/08/2026 — tarefa 6 do item 4, terceiro de três commits: resumo e histórico do perfil do motorista — fecha o item 4

Construído conforme o plano (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
Tarefa 6): resumo de fretes/valor transportado no período (`resumoDoMotorista`,
já existente desde a Tarefa 1), botão principal "Lançar frete com este
motorista" (`docs/componentes.md` linha 411, diferente da pílula em linha dos
outros dois perfis) e histórico seguindo o mesmo período, reaproveitando os
três componentes (`ChipDePeriodoPerfil`, `ResumoDoPerfil`, `HistoricoDoPerfil`)
e `listarServicosDoMotorista` já construídos — nenhuma lógica nova de backend,
só a tela. **Fecha a Tarefa 6 e o item 4 inteiro.**

**`/auditar-tela` (antes do `/revisar`) achou duas divergências, as duas
corrigidas no mesmo commit:** linha "Telefone" tocável só levando ao formulário
(contradizia `docs/componentes.md` linha 396 da época) e a tabela de auditoria
de posição ainda listando "perfil do motorista" entre as telas sem lista nem
ação — mesma classe de desatualização já corrigida para o caminhão no commit
anterior.

**A correção do telefone virou investigação de custo, a pedido do fundador,
antes de decidir construir.** Ele supunha que o produto já abria conversa de
WhatsApp em algum lugar (reaproveitável) — busquei `wa.me`/`api.whatsapp.com`
em todo o `src/` e não existe nenhum link construído; "Cobrar no WhatsApp" e
"Enviar ordem no WhatsApp" são só nomes reservados no inventário, sem código.
Achado maior: `telefone` é texto livre, sem máscara nem validação, nos dois
cadastros (schema `z.string().trim()`, sem regra de formato, em
`clientes/acoes.ts` e `motoristas/acoes.ts`). Decisão do fundador: registrar
como pendência única para o item 5 (`docs/especificacao.md` §9, "Três
exigências...", item 3) — "Enviar ordem no WhatsApp" vai enfrentar a mesma
normalização e a mesma decisão de telefone inválido, então resolver lá evita
decidir duas vezes ou herdar escolha feita sem o caso principal na frente.

**Correção dentro da própria investigação, achada pelo primeiro `/revisar`:**
minha primeira redação da pendência dizia que "formato do número" era decisão
em aberto — não é mais exata: `docs/componentes.md` §12 ("Folha do campo que
falta") já define TELEFONE como "10 ou 11 dígitos com DDD; DDD ≥ 11", com as
mensagens de erro, para os mesmos dois gatilhos (Cobrar no WhatsApp, Enviar
ordem). A regra existe por escrito, só não está implementada (busca no `src/`
não encontra a folha nem as mensagens). O que continua em aberto é só o DDI
(prefixar 55 para o link) e ligar essa validação ao "telefone tocável" dos
perfis. Corrigido em `docs/especificacao.md` §9 antes do commit.

**Dois passes de `/revisar` (o formal, via subagente) — achados só das
categorias "corrige no passe, sem abrir outro" (`CLAUDE.md` §2, item 7):**

1. Primeiro passe: citação errada (arquivo errado citado para o schema de
   telefone, "tarefa 5" em vez de "tarefa 7", `docs/navegacao.md` linha 42
   em vez de 43), contradição entre documentos (`docs/especificacao.md`
   §4.7 ainda dizia "telefone tocável" como se estivesse construído;
   `docs/navegacao.md` ainda descrevia as três ações como "pílulas",
   inclusive a do motorista, que virou botão principal neste commit) e um
   parágrafo meu que atribuía "sem lista depois" ao perfil do motorista
   quando a linha antiga não dizia isso dele.
2. Segundo passe: a correção do primeiro passe deslocou a linha "Perfil do
   motorista" de `docs/componentes.md` para 411 (não 408, contagem errada
   na primeira correção) — três citações dessa linha corrigidas em cascata
   (`page.tsx`, `docs/navegacao.md`, esta entrada); e `docs/componentes.md`
   linha 411 continuava sem marcar "telefone tocável" como pendente — é o
   documento dono do conteúdo da tela (`CLAUDE.md` §13), a marcação só
   tinha entrado em `especificacao.md`/`navegacao.md`, documentos de apoio
   para este escopo. Também corrigido: a entrada do commit anterior
   (`e9fafe8`, abaixo) ainda dizia "esteira não disparada" quando já foi
   confirmada verde nesta sessão.

Nenhum achado é dinheiro/isolamento; nenhum abriu um terceiro passe.**

**Lacunas registradas, não corrigidas:** Perfil do motorista sem linha na
tabela de níveis tipográficos de `docs/estilo.md` (Cliente e Caminhão têm);
rótulos "Fretes no período"/"Valor transportado" sem nome formal em nenhum
documento — mesma categoria do "Km e R$/km" do commit anterior.

**O que foi pedido ao Design:** três correções de estado, feitas pelo
repositório (`CLAUDE.md` §13) — `docs/navegacao.md` linhas 18 e 43 (motorista
usa botão principal, não pílula; caminho novo "Lançar frete com este
motorista → pré-selecionado"; telefone tocável marcado pendente) e
`docs/especificacao.md` §4.7 (telefone tocável marcado pendente, com
referência à §9). A fonte do Design ainda não tem essas mudanças.

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build` verdes;
`npm test` **local** 306/306 (sem teste novo — nenhuma lógica de backend nova).
Fluxo completo no navegador com dado plantado (motorista novo, frete de R$
15,00 lançado hoje via a pré-seleção `?motorista=`): resumo mostra "1"/"R$
15,00" no mês corrente, "0"/"R$ 0,00" com "Nenhum frete neste período." no mês
passado (distinto de "Nenhum frete lançado ainda." no estado vazio geral).
Esteira deste commit ainda não disparada — ver `/onde-paramos`.

Próximo: item 5 da ordem de construção do produto (`docs/especificacao.md`
§9) — **Ordem de serviço: enviar ordem, finalizar, comprovante**. Plano ainda
não aprovado — antes de construir, escrever e aprovar o plano, incluindo a
normalização de telefone e as duas decisões pendentes (DDI, tratamento de
telefone inválido) registradas nesta entrada.

## 22/08/2026 — tarefa 6 do item 4, segundo de três commits: resumo e histórico do perfil do caminhão

Construído conforme o plano (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
Tarefa 6): resumo de km/R$ por km no período — convite único ("Preencha o km
ao lançar para ver o R$/km") quando nenhum frete do período tem km, os dois
números lado a lado quando tem —, nota de cobertura parcial ("N de M fretes
com km"), pílula "Lançar frete com este caminhão" e histórico seguindo o
período, reaproveitando os três componentes construídos no primeiro commit
(`ChipDePeriodoPerfil`, `ResumoDoPerfil`, `HistoricoDoPerfil`) e as funções de
serviço já existentes desde a Tarefa 1 (`resumoDoCaminhao`,
`listarServicosDoCaminhao`) — nenhuma lógica nova de backend, só a tela.

**O risco "mesmo rótulo, recortes diferentes" do plano se confirmou**: com
dado plantado (dois fretes no mês, R$5+R$30), a lista de Caminhões ordenada
por "Maior valor transportado" mostrava "R$ 35,00" cru (vida inteira), sem
nada ao lado que distinguisse do resumo do perfil (período). Corrigido do
mesmo jeito que o cliente: `ListaCaminhoes.tsx` ganhou "no total" no apoio
do critério de valor.

**Perguntei ao fundador se o mesmo valia para "mais fretes" (o outro
critério sem qualificador), e a resposta foi sim, com uma regra nova
registrada por escrito** (`docs/especificacao.md` §4.7): número na lista de
cadastro é sempre da vida inteira e diz "no total"; número no perfil é do
período e o chip ao lado já avisa disso, sem precisar do qualificador.
Motivo do fundador: deixar só um dos dois qualificado ensina o hábito
errado — quem aprende que "no total" significa vida inteira, ao ver um
número sem ele ao lado, concluiria (errado) que é do período. `mais
fretes` em `ListaCaminhoes.tsx` também ganhou "no total". A regra vale
para as três listas de cadastro, inclusive Motoristas no terceiro commit —
não precisa ser redescoberta lá.

**Dois passes de `/revisar`:**

1. Primeiro passe: tabela de auditoria de posição (`docs/componentes.md`)
   ainda descrevia o perfil do caminhão como "sem principal, só Editar no
   cabeçalho" — descrição que parou de valer no mesmo commit. Corrigido com
   medição real no DOM (não por analogia): Resumo → Identificação → pílula
   → Histórico, mesma ordem do perfil do cliente. Também corrigida uma
   citação de linha errada no docstring da página (`docs/navegacao.md`
   linha 41 → 42, o número certo).
2. Segundo passe: a correção do primeiro passe criou uma referência cruzada
   quebrada ("a linha acima descrevia..." apontando para um texto que a
   mesma edição já tinha apagado) — corrigida.

**Lacunas registradas, não corrigidas — nenhuma é dinheiro/isolamento:**
- Casas decimais do km (`toLocaleString("pt-BR")` aqui vs `/1000` cru em
  `fretes/[id]/page.tsx`) sem regra escrita — sem risco prático hoje, porque
  km só nasce como inteiro×1000 (o campo do formulário só aceita dígitos).
- Viewport da medição de DOM (1280×720) sem convenção documentada para
  auditoria de posição — a ordem medida não depende da largura (o
  contêiner da tela é fixo em 480px), mas o processo não define um padrão.
- Rótulo "Km e R$/km" fundido numa célula só, no estado de convite — texto
  que criei no código, sem lastro em `docs/especificacao.md` nem
  `docs/componentes.md`.

**O que foi pedido ao Design:** duas correções de estado, feitas pelo
repositório (`CLAUDE.md` §13) — `docs/componentes.md` linha 382 (Perfil do
caminhão ganha a pílula) e `docs/navegacao.md` linha 42 (Caminhões — lista e
perfil, com o novo caminho "Lançar frete com este caminhão → Lançar frete
pré-selecionado"). A fonte do Design ainda não tem essas duas mudanças.

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes; `npm test` **local** 306/306 (sem teste novo — nenhuma lógica de
backend nova, só consumo de funções já testadas na Tarefa 1). Fluxo completo
no navegador com dado plantado (caminhão com um frete com km neste mês, um
sem km no mesmo mês, e mês anterior sem nenhum): convite quando não há km,
os dois números quando há, nota de cobertura parcial "1 de 2 fretes com
km", troca de período preservando o texto certo de vazio, pré-seleção do
caminhão ao tocar a pílula. **Esteira confirmada verde** neste commit
(`e9fafe8`) — checado via `/onde-paramos` na sessão seguinte.

Próximo: Tarefa 6 do item 4, terceiro commit — resumo e histórico do perfil
do motorista (fretes e valor transportado no período, ação principal
"Lançar frete com este motorista").

## 22/08/2026 — tarefa 6 do item 4, primeiro de três commits: resumo e histórico do perfil do cliente

Construído conforme o plano detalhado nesta mesma sessão
(`docs/planos/item-4-lista-e-detalhe-do-frete.md`, Tarefa 6): resumo
financeiro (já rodado · recebido no período) com chip de período — padrão
mês corrente, decisão do fundador registrada em `docs/especificacao.md`
§4.7 —, pílula "Lançar frete para este cliente", e histórico de fretes com
teto de 5 linhas. Três componentes novos, reaproveitados pelos próximos
dois commits da mesma tarefa: `ChipDePeriodoPerfil`, `ResumoDoPerfil`,
`HistoricoDoPerfil`.

**Dois passes de `/revisar`, o segundo com achados que mudaram
comportamento — os dois valem registro além do resultado:**

1. **O remendo do primeiro passe criou o problema que o segundo achou.**
   O primeiro `/revisar` achou que, sem frete no período pedido, o chip
   Cliente de "Meus fretes" mostrava o rótulo genérico em vez do nome — a
   correção óbvia (mandar o nome pela URL) resolvia o rótulo e abria um
   problema novo: nome de terceiro em query string, que a hospedagem
   (Vercel) registra em log de acesso. O segundo passe achou os dois de
   uma vez porque o remendo também não sobrevivia a trocar o período de
   dentro da tela (o estado local do cliente sobrevive, a URL não). O
   redesenho — "Meus fretes" sempre resolve o nome pelo `id`, buscando no
   banco, nunca da URL — fechou o rótulo e a privacidade juntos, e
   sobrevive à troca de período. Lição: quando a correção de um achado
   introduz dado novo trafegando por um canal (URL, neste caso), vale
   perguntar onde mais esse canal é lido antes de dar o achado por
   fechado.
2. **`totalGeral` — uma consulta a mais, decisão certa.** O histórico
   passou a seguir o período do resumo (achado do segundo passe: chip
   dizendo "Mês passado" com o histórico mostrando frete de hoje era
   contradição dentro da mesma tela). Isso abre um vazio novo — período
   sem frete, mesmo com histórico em outros meses — que pede texto
   diferente de "nunca lançou frete nenhum": "Nenhum frete neste período."
   contra "Nenhum frete lançado ainda." Sem a segunda contagem (sem filtro
   de período) para distinguir os dois casos, a pessoa acharia que o
   histórico sumiu, não que o período está vazio. Uma consulta O(1) a
   mais por essa distinção — o custo certo, não economia que valha a pena.

Outros achados corrigidos no processo: "Todos os fretes" podia somar
**menos** que "Este mês" para o mesmo cliente (um frete lançado para o dia
seguinte tem `data_servico` no futuro — a tese do produto, `CLAUDE.md` §1
— e "todos" usava a hora da requisição como fim; corrigido para
31/12/9999, depois de a primeira tentativa com a data máxima do JavaScript
quebrar a consulta em produção); alvo de toque do número "Já rodado"
abaixo de 48px; mesmo rótulo ("R$ X"), recortes diferentes entre a lista
de Clientes (total da vida) e o resumo do perfil (por período) —
`ListaClientes.tsx` ganhou "no total" no apoio; rota trocou de posição com
a data na linha do histórico (rota é Secundário, não Primário,
`docs/estilo.md`); `docs/especificacao.md` §4.7 tinha texto desatualizado
sobre a posição da pílula "Lançar frete para este cliente" (de antes da
auditoria de posição que já tinha corrigido essa tela).

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes; `npm test` **local** 306/306 (dois testes novos, um por achado de
dinheiro — o de "todos" e o de `totalGeral`). Fluxo completo no navegador,
com dado plantado (cliente com frete este mês, mês passado, e um cliente
sem frete nenhum): resumo recalculando por período, histórico seguindo o
período com os dois textos de vazio, chip do "Meus fretes" resolvendo o
nome certo mesmo com zero fretes e depois de trocar o período de dentro da
tela, alvo de toque medido em ~62,5px. Esteira deste commit confirmada
verde (`gh run list`, run 32608217330).

Próximo: Tarefa 6 do item 4, segundo commit — resumo e histórico do
perfil do caminhão (km/R$/km com convite e cobertura parcial, sincronizar
`docs/componentes.md` linha 373).

---

## 22/08/2026 — tarefa 5 do item 4: ordenações nas listas de cadastro, e o chip

Construída conforme o plano (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
Tarefa 5): três funções novas em `src/lib/servicos/servicos.ts`
(`valoresTotaisPorCliente`, `estatisticasPorCaminhao`,
`estatisticasPorMotorista`), uma consulta cada, sem N+1 — estrutural, não só
testado como ausente. `FolhaDeOrdenacao` novo, genérico sobre critérios;
`ChipFiltro` reaproveitado, sem alteração de comportamento no chamador
existente (`ListaFretes.tsx`).

**O risco central que o fundador nomeou ao aprovar o plano — o número da
lista precisa ser o MESMO cálculo que o resumo do perfil (Tarefa 1), não só
parecido — é o que os testes provam**: `tests/servicos.test.ts` (seções 7 e
8) compara `valoresTotaisPorCliente` contra `resumoFinanceiroDoCliente.
jaRodado` e `estatisticasPorMotorista` contra `resumoDoMotorista`, para o
mesmo cadastro, exigindo igualdade exata — não dois cálculos que só parecem
bater. Confirmado também no navegador, com dado real plantado e apagado
depois: os totais batiam exatamente com a soma esperada.

**Dois passes de `/revisar`, três divergências corrigidas nesta sessão:**
1. Chip de ordenação sozinho usava 40px (herdado de `ChipFiltro`); a exceção
   de `CLAUDE.md` §8 a 48px é só para chip **em fileira** (erra o vizinho,
   custo baixo) — sem vizinho, o mínimo geral vale. `ChipFiltro` ganhou a
   prop `altura` (padrão 40, chip sozinho passa `altura={48}`); `CLAUDE.md`
   §8 e `docs/componentes.md` corrigidos para dizer a distinção
   explicitamente.
2. `mb-2` (2px) fora da escala de espaçamento, nas três listas — trocado por
   `gap-8`/`gap-6` herdados do pai, sem margem própria.
3. Verificado, sem correção: em Clientes, escolher "Maior valor total" faz o
   valor substituir a cidade na linha (`docs/estilo.md` pede os dois
   convivendo) — decisão do fundador: fica como está, registrado como
   lacuna com os dois lados do argumento em
   `docs/planos/item-4-lista-e-detalhe-do-frete.md`, para o Design decidir.
   Mesma lacuna: a tabela de níveis tipográficos não cobre Caminhões/
   Motoristas (`docs/estilo.md`); e o chip não fica "ativo" ao escolher
   "Mais recente" de propósito (`docs/componentes.md`).

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build`
verdes; `npm test` **local** 299/299 (antes e depois das correções do
segundo passe). Fluxo completo no navegador: clientes/caminhões/motoristas
com dado plantado e apagado ao final, trocando os três critérios de
ordenação nas três listas, conferindo os números batendo com o esperado.
Esteira deste commit ainda não disparada — ver `/onde-paramos`.

Próximo: Tarefa 6 do item 4 — Resumo e histórico nos três perfis.

---

## 22/08/2026 — plano da tarefa 5 do item 4, detalhado: ordenações e o chip

Antes de construir, duas perguntas levadas ao fundador (`docs/planos/
item-4-lista-e-detalhe-do-frete.md`, Tarefa 5, já tinha o esboço; faltava o
desenho técnico):

1. **"Maior valor em aberto" de Clientes continua zero, estruturalmente** —
   confirmado no código (`criarTituloJaRecebi` é o único criador de título e
   sempre nasce pago) e já decidido no esboço original: fica de fora até o
   item 6. Sem mudança.
2. **O rótulo "valor rodado" também estava na especificação para o
   critério de ordenação, não só no resumo do perfil onde já tinha virado
   "transportado".** Decisão do fundador: corrige os dois lugares, mesma
   palavra — `docs/especificacao.md` §4.7 e a nota da Tarefa 4 no plano do
   item 4 (que registrava a versão antiga da decisão) foram atualizados.

**Achado ao desenhar em detalhe: o chip de ordenação não é componente
novo.** O esboço original previa um — medido contra `docs/componentes.md`,
é medida e cor **idênticas** ao `ChipFiltro.tsx` que "Meus fretes" já usa;
reaproveitado direto, só a folha que abre por baixo (`FolhaDeOrdenacao`,
genérica sobre a lista de critérios) é componente novo de fato. Mesma
regra que já corrigiu três cópias da linha de perfil no item 2.

**Pedido do fundador, incorporado ao plano: o teste central desta tarefa
não é "cada função de soma roda sem erro" — é "o número da lista e o
número do resumo do perfil (Tarefa 1/6) são o mesmo cálculo".** Cliente e
Motorista já têm um resumo existente para comparar contra
(`resumoFinanceiroDoCliente.jaRodado`, `resumoDoMotorista`); os testes
plantam fretes (incluindo um cancelado) e conferem que os dois batem
exatamente, com o mesmo filtro (cancelado fora, `em_andamento` dentro).
Caminhão não tem par direto — `resumoDoCaminhao` só expõe o numerador de
R$/km, restrito a fretes com km preenchido, filtro diferente do que a
ordenação precisa — registrado no plano para não parecer esquecimento.

Desenho completo (as três funções de leitura em lote, onde cada linha
mostra o dado, os testes) em `docs/planos/item-4-lista-e-detalhe-do-frete.md`,
Tarefa 5 — substitui o esboço anterior.

Próximo: Tarefa 5 do item 4 — Ordenações nas listas de cadastro, e o chip
aparece.

---

## 22/08/2026 — tarefa 4 do item 4: lançar frete ganha edição e pré-seleção

Rota nova `src/app/(app)/fretes/[id]/editar/page.tsx`; `TelaLancarFrete`
ganha a prop `edicao?` (id do frete + os campos que a criação não tinha) e
reusa o mesmo `<form>` para os dois modos — `editarServicoAction`
(`.bind(null, servicoId)`, mesmo padrão de `editarClienteAction`) no lugar
de `criarServicoAction`. `fretes/novo` ganha `?cliente=`/`?caminhao=`/
`?motorista=`, resolvidos e validados contra a empresa antes de virar
pré-preenchimento (mesmo cuidado do achado da Tarefa 2 com parâmetro de
URL). Botão e cabeçalho trocam de texto no modo edição ("Salvar
alterações"/"Editar frete").

**Primeiro `/revisar`: quatro divergências, seis lacunas — três achados
mudaram o desenho, não só o texto.**

1. **Referência arquivada travava a edição inteira.** `normalizarEntrada`
   recusava cliente/caminhão/motorista arquivado mesmo quando o campo não
   tinha sido tocado — arquivar um cliente travaria a edição de todo frete
   antigo dele. Corrigido: recusa arquivado só quando o id muda em relação
   ao que já estava gravado (mesmo espírito do `veiculo_habitual_id`).
2. **Frete com título ativo podia divergir do valor recebido.** Não havia
   trava nenhuma para editar `valor`/`cliente_id` de um frete já pago —
   decisão do fundador, registrada em `docs/especificacao.md` §8, item 12:
   trava os dois campos, os outros sete continuam livres.
3. **A trava inicial (`conferirEdicaoContraTitulo`) era uma checagem
   separada, antes da gravação — corrida real com "Já recebi" concorrente.**
   Achado do próprio `/revisar`. Refeita como `editarServicoComProtecaoDeTitulo`
   (`titulos.ts`): a condição vira parte do próprio `UPDATE`
   (`condicaoDeGravacao`, `editarServico`), não uma consulta antes dele.
   Decisão do fundador: fechar só o lado da edição agora — a janela que
   sobra (`criarTituloJaRecebi` lendo o valor antigo um instante antes da
   gravação) está registrada por escrito, sequência exata, no plano e no
   código — não como "risco aceito" genérico.

As outras: sincronizar `docs/componentes.md`/`docs/navegacao.md` com o
rótulo novo e a rota de edição; `editarServico` passou a recusar frete
arquivado (mesma mensagem de "não encontrado"). Três lacunas registradas
para o Design (cor do estado travado, texto do aviso com "estornar" —
palavra fora do vocabulário) e uma lacuna técnica (tipo_operacao_id
inalcançável hoje, só um tipo ativo por empresa).

**Segundo `/revisar`: quatro divergências de precisão de texto, cinco
lacunas — nenhuma mudou comportamento, nada abriu terceiro passe
(`CLAUDE.md` §2).** Citação errada duas vezes ("CLAUDE.md §2, por que 20 e
não 1" — esse texto vive em `.claude/commands/onde-paramos.md`, não em
CLAUDE.md; corrigido nos dois lugares que citavam errado); comentário no
CLAUDE.md ainda nomeava `conferirEdicaoContraTitulo`, já substituída;
plano dizia que pré-seleção inválida cai em "campo vazio", quando o código
(certo) cai no pré-preenchimento normal por último frete. Lacunas: rótulo
do cabeçalho ainda dizia "Lançar frete" no modo edição (corrigido — "Editar
frete"); as duas mensagens de erro do servidor também usam "estornar"
(mesmo pedido ao Design, ampliado); `km` não-múltiplo-de-1000 na edição e
arquivamento concorrente durante edição — os dois registrados como lacuna,
hoje inalcançáveis/janela mais estreita que a do título, nenhum dos dois é
dinheiro nem isolamento entre empresas.

**Padrão nomeado em `CLAUDE.md` §2, a pedido do fundador:** a mesma classe
de erro ("a regra vale para todos os itens de uma coleção, o código olha
um só") já tinha aparecido no `/onde-paramos` (checava só o run mais
recente) — a segunda vez, agora em `conferirEdicaoContraTitulo`
(`findFirst` em vez de checar todos os títulos). Registrado por escrito
para ser procurado de propósito da próxima vez, sempre que um código
decidir "existe X"/"todos são Y" a partir de uma coleção.

**Verificação — local:** `npm run lint`, `npx tsc --noEmit`, `npm run
build` — três verdes, depois de cada passe. `npm test` **local** — 290/290
(278 anteriores + 12 novos: quatro em `servicos.test.ts` sobre referência
arquivada aceita na edição, seis em `titulos.test.ts` sobre
`editarServicoComProtecaoDeTitulo` — incluindo o caso de dois títulos, um
cancelado e um ativo, que prova a correção do achado 3 acima — mais dois
de robustez). Fluxo completo testado no navegador: lançar frete → editar
sem título (todos os campos livres) → "Já recebi" → editar com título
ativo (Cliente e valor travados na tela, com o motivo explicado) → forçar
valor por fora do campo disabled → recusado pelo servidor, com a
mensagem certa, nenhum dado gravado → editar só a carga com título ativo
→ aceito. Pré-seleção por `?cliente=` testada com id válido, malformado e
inexistente — sem quebrar em nenhum dos três. Dados de verificação
arquivados no banco de desenvolvimento ao final. Esteira deste commit
ainda não disparada — ver `/onde-paramos`.

Próximo: Tarefa 5 do item 4 — Ordenações nas listas de cadastro, e o chip
aparece.

---

## 22/08/2026 — plano da tarefa 4 do item 4, detalhado: edição e pré-seleção

`editarServico` existe desde o item 3 mas nunca foi chamado por nenhuma
tela — planejar a Tarefa 4 (`docs/planos/item-4-lista-e-detalhe-do-frete.md`)
é a primeira vez que o caminho de edição fica alcançável pela interface, e
isso quebrou duas premissas que o código de criação escreveu quando só
existia um caminho. As duas, mais um terceiro ponto sem risco, foram
levadas ao fundador antes de começar a construção (`CLAUDE.md` §2).

**Decisão 1 — frete com título ativo trava `valor` e `cliente_id`.**
`criarTituloJaRecebi` copia os dois do `Servico` ao nascer e nunca mais
sincroniza; deixar os dois livres na edição permitiria o frete mostrar um
valor e o título registrar outro, sem nada acusar a diferença — dinheiro,
rigor total (`CLAUDE.md` §2). Registrado em `docs/especificacao.md` §8,
item 12. Trava em duas camadas: servidor (`conferirEdicaoContraTitulo`,
novo em `titulos.ts`) e tela (campos desabilitados, com o motivo escrito).
Destrava se todos os títulos do frete forem cancelados.

**Decisão 2 — referência arquivada (cliente/caminhão/motorista) é aceita na
edição quando o id não muda.** `normalizarEntrada` recusa arquivado nas
quatro referências desde a tarefa 7 do item 2, com a premissa escrita no
próprio código: "aqui é sempre a criação de uma referência NOVA". Sem
ajuste, arquivar um cliente travaria a edição de **todo** frete antigo
dele, mesmo para corrigir outro campo. Passa a recusar arquivado só quando
o id mudou em relação ao que já estava gravado — mesmo espírito do
precedente de `veiculo_habitual_id` que o próprio comentário já cita. O
comentário de `normalizarEntrada` será reescrito na construção da tarefa,
não hoje (é comentário de código, muda junto do código).

**Terceiro ponto, sem decisão necessária — resolução de município.**
`resolverMunicipio` roda de novo a cada edição, mesmo com o texto
inalterado; confirmado que não precisa de um desvio "só resolve se
mudou", porque é função pura contra tabela fixa — mesmo texto, mesmo
resultado, sempre. Raciocínio completo registrado no plano, para não ser
reaberto por dúvida se alguém ler o código e estranhar a ausência do
desvio.

Desenho completo (como a tela sabe o modo, as duas travas, a pré-seleção
pelos três pills) na Tarefa 4 do plano, substituindo o esboço anterior.

Próximo: Tarefa 4 do item 4 — Lançar frete ganha edição e pré-seleção.

---

## 22/08/2026 — tarefa 3 do item 4: detalhe do frete

Nova rota `src/app/(app)/fretes/[id]/page.tsx` — server component, busca
`buscarServicoComTitulos` (Tarefa 1) mais cliente, tipo de operação, caminhão
e motorista em paralelo. Cabeçalho: "TIPO · data" (terciário), nome do
cliente (26px), rota, valor (46px) e `EtiquetaSituacao` — sem principal
nesta fatia, mesmo precedente do perfil do caminhão. Nove linhas de campo
com `LinhaDePerfil`; ações no fim: **Editar frete** (secundária,
`/fretes/[id]/editar`, que só a Tarefa 4 constrói — 404 até lá, como o
próprio plano já previa) e **Arquivar frete** (texto destrutiva, nova
`arquivarServicoAction`). Fecha as duas pendências registradas no plano: o
link provisório de "Meus fretes" e o "Ver o frete" do aviso pós-lançamento
(`AvisoFreteSalvo.tsx`, que ganhou a segunda pílula).

**`LinhaDePerfil` ganhou `semAdicionarQuandoVazio`** (achado do primeiro
`/revisar`): o componente sempre mostrava "adicionar" em campo vazio, mas
`docs/componentes.md` linha 177 só nomeia essa palavra para os três perfis e
para TELEFONE nesta tela — os outros oito campos, sem essa regra escrita,
agora aparecem em branco quando vazios. Confirmado no navegador que os
outros três perfis (cliente, caminhão, motorista) continuam mostrando
"adicionar" normalmente, sem a prop nova.

**Decisão do fundador, 22/08/2026:** campo preenchido do detalhe não é
tocável — só o botão "Editar frete" leva à edição, igual aos outros três
perfis. Pergunta levantada pela segunda passagem do `/revisar`, que leu o
plano ("toca e vai para Editar") como exigindo toda linha tocável; a leitura
oposta (só o botão) também cabia no texto, então foi para decisão do
fundador em vez de escolhida sozinha.

**Primeiro passe do `/revisar`: quatro divergências, corrigidas no mesmo
passe.** Além do `semAdicionarQuandoVazio` acima: valor 46px sem `wdth 94%`/
`ls -.03em` (achado também do `/auditar-tela`, que rodou antes); valor e
`EtiquetaSituacao` na mesma linha flex, sem truncamento — separados em duas
linhas, o que também resolve o vazamento de texto para frete de valor alto;
`arquivarServicoAction` repassava `id` ao serviço sem schema — ganhou
`z.string().uuid()`, mesmo padrão de `criarTituloJaRecebiAction` no mesmo
arquivo.

**Segundo passe: uma divergência de comentário, corrigida — o resto foi a
pergunta acima e lacunas.** O código afirmava que o link provisório de
Editar estava "registrado... no diário", antes de esta entrada existir
(`CLAUDE.md` §13: afirmação sobre o que não foi feito ainda). Corrigido para
citar o próprio plano aprovado, que já escreve esse destino para a Tarefa 3.

**Lacunas registradas, não corrigidas (nenhuma bloqueia a tarefa):**
- rótulo de seção "Detalhes" sem documento que o defina;
- "Frete" aparece duas vezes perto do topo (rótulo da tela + "FRETE · data");
  data por extenso ("22 de agosto de 2026") é formato escolhido aqui;
- destino do "adicionar" de Telefone sem telefone cadastrado (leva ao
  cadastro do motorista) e sem motorista nenhum (leva a Editar frete) — sem
  regra escrita;
- `km` sem separador de milhar na exibição — hoje inalcançável (só existe
  caminho de criação em múltiplos de 1000), registrado para quando outro
  caminho (edição, importação) puder gravar valor diferente;
- frete arquivado continua abrindo por URL direta e oferece "Arquivar" de
  novo (sobrescreve a data) — mesmo padrão pré-existente dos outros três
  perfis, não é regressão desta tarefa;
- frete cancelado no detalhe mostra "A faturar" sem distinção visual —
  ampliei o pedido já registrado ao Design (lista/histórico) para incluir o
  detalhe (`docs/planos/item-4-lista-e-detalhe-do-frete.md`);
- "Voltar" sempre para `/fretes` — a segunda origem que `docs/navegacao.md`
  registra (histórico do perfil do cliente) só existe na Tarefa 6.

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build` —
verdes, depois de cada passe. `npm test` **local** — 278/278 (mesma
contagem da tarefa anterior; nada de backend novo, a Tarefa 1 já cobre
`buscarServicoComTitulos`/`arquivarServico`). Fluxo completo testado no
navegador: criar conta → lançar frete completo → abrir detalhe (campos
preenchidos, "Editar frete"/"Arquivar frete" presentes e não tocáveis nos
campos) → lançar frete sem caminhão/motorista/origem/destino/carga/km →
abrir detalhe (oito campos em branco, só Telefone com "adicionar") →
arquivar os dois, mais cliente/caminhão/motorista de teste, pelo fluxo do
produto. Confirmado que "Ver o frete" no aviso e a linha da lista levam ao
mesmo id e que a lista deixa de ter link morto — critério de fechamento da
tarefa. Dados de verificação arquivados no banco de desenvolvimento (não há
hoje mecanismo de exclusão de conta pelo produto — `CLAUDE.md` §14 —, então
a empresa e o usuário de teste continuam existindo, só sem dado ativo).

Próximo: Tarefa 4 do item 4 — Lançar frete ganha edição e pré-seleção.

---

## 21/08/2026 — tarefa 2 do item 4: lista "Meus fretes"

Substitui a tela provisória (`src/app/(app)/fretes/page.tsx`). Componentes
novos: `EtiquetaSituacao`, `ChipFiltro`, `FolhaDePeriodo` (janelas prontas +
personalizado, em duas etapas de calendário), `FolhaDeSituacao`. A linha do
frete **não** nasceu componente à parte — `LinhaDeLista` (já usada por
Clientes/Motoristas/Caminhões) ganhou uma segunda variante de conteúdo
(`valorCentavos`/`situacao`), achado do primeiro `/revisar` (ver abaixo).
`FolhaDeBusca` ganhou `onNovo` opcional (o chip "Cliente" só filtra, não
cadastra) e `FolhaDeCalendario` ganhou `fecharAoEscolher`/`titulo` (para o
intervalo personalizado escolher duas datas em sequência sem fechar a folha
inteira na primeira). Backend: `listarServicosComSituacao` ganhou
`periodo`/`limite`; `buscarClientesPorIds`/`buscarCaminhoesPorIds`/
`buscarMotoristasPorIds` (incluindo arquivado, para o nome aparecer mesmo
num frete antigo).

**Decisão do fundador, 21/08/2026:** o chip Período abre janelas prontas
(Este mês · Mês passado · Todos os fretes) mais "Personalizado" — as duas
opções que a pergunta trazia, decisão de ir com as duas.

**Achado da verificação manual no navegador, não do `/revisar`:** o estado
vazio mostrava "Nenhum frete lançado ainda" (com o convite de lançar o
primeiro) quando o filtro de Período ativo devolvia zero — mesmo a empresa
já tendo frete em outro período. Só o teste automatizado não pegaria isso
(não existe teste de tela ainda); apareceu usando de verdade. Corrigido:
o convite de "nenhum frete ainda" só aparece sem nenhum período escolhido;
com período ativo e zero resultado, vira "Nenhum frete com esse filtro" —
mesma mensagem que busca/cliente/situação já usam.

**`/auditar-tela` achou quatro divergências, todas "valor fora do sistema"
— corrigidas no mesmo passe** (categoria que não abre passe extra,
`CLAUDE.md` §2): faltava o "Título de tela" ("Meus fretes", 20/700,
`docs/estilo.md`); o valor da linha sem `tabular-nums` (números
desalinhavam na coluna); o placeholder do campo de busca era longo — o
documento nomeia "Buscar frete" como exemplo desta própria tela; e o chip
de filtro sem o ícone `seta-chip.svg` que `docs/estilo.md`/`docs/componentes.md`
exigem para ele.

**Primeiro passe do `/revisar`: dez divergências, cinco lacunas.** Nove
corrigidas no mesmo passe (contradição doc×código, valor fora do sistema,
botão fora do inventário) — teto de 50 lido pela string da URL em vez do
`Periodo` resolvido (um `?periodo=` desconhecido tirava o teto e lia a
tabela inteira); mesmo problema no estado vazio; `LinhaDeFrete` duplicando
`LinhaDeLista` em vez de estendê-la (§8, "componente existe uma vez");
`px-16`/`px-20` da tela com título de página; `gap-4`→`gap-7` e ícone do
chip; alturas de "item de folha" (`FolhaDePeriodo`/`FolhaDeSituacao` usavam
a medida de linha de lista, não a de item de folha); busca varrendo só
`nomeCaminhao()` (apelido OU placa) em vez dos dois. Cinco lacunas
registradas (não corrigidas): paginação de "Todos os fretes"; frete
cancelado sem distinção visual (já pendente desde a Tarefa 1); chip de
Período sem estado carregando; textos novos sem documento; `cliente_id`
não resolvido é caso hoje inalcançável.

**Dois achados exigiram decisão do fundador, não correção automática:**

- **Link de `/fretes/${id}` (Tarefa 3 ainda não existe — 404 até lá):**
  mantido, registrado como provisório com prazo (Tarefa 3, próxima da
  fila). Decisão do fundador — não é o mesmo caso do (+) da barra (aquele
  apontava para uma tela que já existia; este ainda não tem destino
  nenhum).
- **Nome do cliente linkando para o perfil dele** (`docs/navegacao.md`),
  com a linha inteira linkando para o frete por baixo (link "esticado",
  sem aninhar `<a>`): medido no navegador — alvo de toque do nome em
  **~178×19,5px**, contra o mínimo de **48px** do `CLAUDE.md` §8, sem
  espaço no cartão de 78px para os dois. **Decisão do fundador: removido.**
  Alvo pequeno num cartão já tocável faz o dedo errar (mira o frete, cai no
  cliente). O caminho para o perfil continua por Mais → Clientes.
  Registrado em "O que precisa chegar ao Design"
  (`docs/planos/item-4-lista-e-detalhe-do-frete.md`) com a medida, para o
  Design decidir se há como acomodar os dois alvos.

**Segundo passe do `/revisar`: seis divergências corrigidas, uma levada ao
fundador, quatro lacunas.** Duas eram rigor total (dinheiro — `CLAUDE.md`
§2) e por isso corrigidas sem discussão: o total contextual ("N fretes ·
R$ X") somava frete **cancelado** junto (`docs/especificacao.md` §7 já
exclui cancelado de todo resumo derivado — este total é o mesmo tipo de
soma, só ainda não tinha sido nomeado ali); e o mesmo total, na visão
padrão sem período escolhido, somava só os 50 mais recentes e mostrava como
se fosse o total de verdade — agora troca para "50 mais recentes" quando o
teto corta e nenhum filtro de cliente/situação/busca está ativo. Mais
quatro corrigidas no mesmo passe: `de`/`ate` do período personalizado sem
validar formato (um valor digitado à mão virava `Invalid Date` e ainda
tirava o teto — mesma regra de validação já usada em `fretes/acoes.ts`,
agora testada contra o banco também em `tests/titulos.test.ts`); botão do
estado vazio dizia "Lançar frete" em vez do texto exato já registrado em
`docs/especificacao.md` ("lançar o primeiro frete"); ícone do chip de
Período com cor própria inventada (`docs/estilo.md` não dá cor a
`seta-chip.svg` — só à seta de linha — e a regra geral é herdar
`currentColor` do botão) e traço renderizando fino demais (~1,23px em vez
de 1,8px — fechado com `vector-effect="non-scaling-stroke"`);
`docs/navegacao.md` ainda afirmava o link do nome que a Tarefa 2 removeu —
marcado com ⚠️.

**Levado ao fundador — decidido no mesmo dia:** `docs/estilo.md` documenta
o chip de filtro em 40px, e `CLAUDE.md` §8 exigia mínimo de 48px para
"controle isolado", sem distinguir chip em fileira de ação isolada de
consequência ("Salvar", "Arquivar"). Contradição anterior a esta tarefa,
só visível agora porque é o primeiro chip de filtro construído. Decisão do
fundador: vale o `estilo.md` — 40px, porque o respiro entre chips numa
fileira compõe a área alcançável, e errar o vizinho custa um toque a mais,
não uma ação errada. `CLAUDE.md` §8 ganhou a exceção por escrito, para não
reabrir a cada chip novo.

**Quatro lacunas registradas, sem corrigir agora:** "Todos os fretes"
ainda sem paginação; formato do cabeçalho de grupo de data ("Hoje",
"12 de agosto") sem documento; textos de estado vazio/filtro sem
documento; teste de banco fechado para `periodo`/`limite` (adicionado
nesta correção, `tests/titulos.test.ts`, "5. período e limite").

**Verificação:** `npm run lint`, `npx tsc --noEmit`, `npm run build` — os
três verdes, depois de cada passe. `npm test` **local** — 278/278, código
de saída 0 (verde de verdade, gitleaks presente). Fluxo completo testado no
navegador nos dois passes: criar conta → lançar frete → ver na lista →
filtrar por período/cliente/situação → buscar por placa e por apelido;
depois do segundo passe, conferido de novo que frete cancelado soma fora do
total mas continua na lista, e os três riscos do link "esticado" (toque,
foco, alvo) antes de ele ser removido. Dados de verificação removidos do
banco de desenvolvimento ao final dos dois passes.

Próximo: Tarefa 3 do item 4 — Detalhe do frete.

---

## 21/08/2026 — esteira do commit `868a653` reprovou por timeout, não defeito

`gh run list` confirmou: 244 de 245 testes passaram, um só reprovou —
`listarServicosDoCliente traz os 5 mais recentes...` (`tests/titulos.test.ts`)
estourou o `testTimeout` de 30s. Mesma classe já documentada (`CLAUDE.md`
§2, "suíte verde" ≠ "esteira verde"): o teste criava 7 fretes num laço
**sequencial**, rápido o bastante contra o banco de desenvolvimento local,
lento demais contra o banco da esteira. Reescrito para criar os 7 em
paralelo (`Promise.all`), com `data_servico` explícita em cada um — a
ordenação do histórico não dependia mais de qual chegou primeiro no banco,
só do valor gravado, então paralelizar não quebra a garantia que o teste
prova. Timeout do teste também subiu para 60s, mesmo padrão já usado no
teste de N+1 do mesmo arquivo.

Também baixado nesta sessão, na máquina de quem programa: o binário do
gitleaks (8.30.1, checksum conferido), fechando o gap que fazia `npm test`
local terminar sempre vermelho por essa suíte, mesmo sem segredo nenhum no
repositório — `npm test` local confirmado 245/245, verde de verdade agora.

**Verificação:** `npm run lint`, `npx tsc --noEmit` verdes; `npx vitest run
tests/titulos.test.ts` **local**, 25/25. Esteira deste commit ainda não
disparada — ver `/onde-paramos`.

Próximo: Tarefa 2 do item 4 — Lista "Meus fretes".

---

## 20/08/2026 — tarefa 1 do item 4: situação financeira derivada e leituras em lote

Backend só, sem tela — `docs/planos/item-4-lista-e-detalhe-do-frete.md`,
Tarefa 1. `situacaoFinanceira` (função pura, `src/lib/servicos/titulos.ts`),
`listarServicosComSituacao`/`buscarServicoComTitulos` (leitura em lote, nunca
uma consulta por frete), e os três resumos dos perfis (`resumoFinanceiroDoCliente`,
`resumoDoCaminhao`, `resumoDoMotorista`) com os históricos
(`listarServicosDoCliente/DoCaminhao/DoMotorista`).

**Cinco passes do `/revisar`** — a mesma tarefa que qualquer outra teria
fechado num passe só, alongada porque cada correção abriu uma classe de
achado que ninguém tinha olhado ainda nesta sessão. **Foi esta tarefa que
motivou o teto de dois passes registrado no `CLAUDE.md` §2** — regra nova a
partir de agora, não aplicada retroativamente aqui.

1. **Primeiro passe**, duas divergências: `resumoDoCaminhao` dividia o valor
   de TODOS os fretes do período pelo km só dos que tinham km, inflando o
   R$/km (`CLAUDE.md` §8, "com dado parcial, exibir a cobertura"); e um
   teste de isolamento usava um `randomUUID()` que não era caminhão de
   ninguém — passaria de qualquer jeito, não provava nada (`CLAUDE.md` §3).
   Corrigidos: numerador e denominador passaram a vir do mesmo conjunto de
   fretes, e o teste passou a usar um caminhão real de outra empresa.
2. **Segundo passe**, achado maior: o teste de N+1 media
   `pg_stat_database.xact_commit`, que soma commit de TODAS as sessões do
   banco de teste compartilhado (autovacuum incluso) — saiu 8 num cenário
   que deveria ser ~2, ruído de fundo, não sinal. Reescrito para comparar o
   custo de listar poucos fretes contra muitos (crescimento, não teto
   absoluto). Também: `resumoDoCaminhao` não expunha quantos fretes do
   período tinham km (`fretesComKm`/`fretesNoPeriodo`, para a tela cumprir
   "exibir a cobertura"); faltavam testes de isolamento para
   `resumoFinanceiroDoCliente`/`resumoDoMotorista`/históricos de
   caminhão/motorista; e nasceu a primeira versão da decisão "frete
   cancelado não conta nas somas" (`docs/especificacao.md` §7) e "histórico
   do perfil ordena por `data_servico`, não `criado_em`" — as duas do
   fundador, decididas na hora por serem mais baratas de decidir agora do
   que descobrir quando o item 5 (cancelar frete) for construído.
3. **Terceiro passe**, achado sério na própria correção do segundo: a nova
   medição de N+1 interceptava `Pool.prototype.query`, mas o adaptador do
   Prisma sempre abre a transação com `pool.connect()` e consulta pelo
   `PoolClient` emprestado — `Pool.prototype.query` nunca é chamado nesse
   caminho, e as duas contagens saíam zero, o que teria passado mesmo com
   N+1 de verdade. Corrigido para `Client.prototype.query` (o que o
   `PoolClient` de fato é por baixo), com verificação de que a contagem não
   fica em zero. Também achado: `listarServicosComSituacao` continuava
   ordenando por `criado_em`, enquanto o texto que eu mesmo tinha acabado de
   escrever afirmava (errado) que ela concordava com o histórico; e eu tinha
   escrito "com a etiqueta de cancelado" em `docs/especificacao.md` como se
   fosse decidido — não existe essa etiqueta em `docs/estilo.md`, e o
   próprio fundador reconheceu o pedido dele como a origem do erro.
4. **Quarto passe**, focado na correção da etiqueta (acima) — mais uma
   ocorrência da mesma frase escapou para o texto do plano; corrigida.
5. **Quinto passe**, um achado de rigor total: `resumoDoCaminhao` filtrava
   `km: { not: null }`, que aceita `km = 0` como "tem km" — um frete com
   km zero entraria no numerador sem contribuir nada ao denominador, a
   MESMA inflação do bug do primeiro passe, só disfarçada. Corrigido para
   `km: { gt: 0 }`. Também: o teste de N+1 disparava 16 conexões
   simultâneas (acima do teto de 8 já validado pela concorrência de
   `criarServico`, risco da mesma instabilidade de pool já documentada);
   reduzido para 8. E o diário não registrava `lint`/`tsc`/`build`, só
   `npm test` — corrigido.

**Decisões do fundador ao longo dos passes:**
- Frete cancelado (`status_operacional`) não conta em nenhuma soma derivada
  dele (já rodado, km, R$/km, fretes/valor do motorista) — **porque não vai
  acontecer**, não porque "ainda não aconteceu" (correção do quinto passe:
  a frase original também valeria, ao pé da letra, para um frete
  `em_andamento`, e não é essa a régua — ver o item abaixo). Continua na
  lista e no histórico do perfil — sai das somas, não das telas. Registrado
  em `docs/especificacao.md` §7, junto da situação financeira.
- **Frete `em_andamento` CONTA nas somas** — decisão confirmada no quinto
  passe: a tese do produto (`CLAUDE.md` §1) é o frete nascer no momento da
  ordem; se a ordem lançada não contasse, o painel ficaria vazio até
  alguém voltar para marcar como finalizado — o próprio trabalho de
  reconstrução que o produto existe para eliminar. `cancelado` é
  diferente de "ainda não terminou": ele não vai acontecer; `em_andamento`
  vai.
- Histórico do perfil e "Meus fretes" ordenam por `data_servico` (quando o
  frete aconteceu), com `criado_em` como desempate — nunca por `criado_em`
  sozinho, que embaralharia a ordem quando alguém lança dias depois.
- `kmPeriodoMetros` (soma de km do resumo do caminhão) é metros, inteiro —
  não quilômetros em float. A exceção do `CLAUDE.md` §7 (métrica calculada
  na exibição pode ser float) vale só para a RAZÃO (`rsPorKm`), nunca para
  uma soma de distância — mesmo raciocínio que fez `Servico.km` nascer em
  metros no item 3. Eu tinha estendido a exceção errado da primeira vez;
  perguntei antes de estender de novo, e foi a pergunta certa.
- `recebidoNoPeriodo` (resumo do cliente) NÃO exclui título de frete
  cancelado, de propósito — dinheiro recebido é fato, independente do frete
  depois ser cancelado. Cancelamento afeta o que foi operado, não o que foi
  recebido.
- Histórico do perfil mostra a situação financeira de cada linha, como
  qualquer linha de frete no produto.

**Pendências registradas para o Design** (`docs/planos/item-4-lista-e-detalhe-do-frete.md`,
"O que precisa chegar ao Design"): cor da etiqueta "Faturado"; quantas casas
decimais o R$/km mostra; como o frete cancelado se distingue visualmente na
lista/histórico (não existe etiqueta de "cancelado" hoje).

**Lacuna conhecida, não bloqueante** (registrada na Tarefa 6 do plano): qual
é o período padrão dos três resumos de perfil (mês corrente, últimos 30
dias, outro recorte) antes de alguém tocar no filtro — `Periodo` só aceita
o intervalo já resolvido; decide quando a Tarefa 6 construir a tela.

**Verificação:** `npm run lint`, `npx tsc --noEmit` e `npm run build` — os
três verdes. `npm test` **local** — os 235 testes de código do produto
passam; o comando termina em falha (código de saída 1) porque
`tests/varredura-de-segredo.test.ts` não encontra o binário do gitleaks
**nesta máquina** (gap conhecido, sem relação com esta tarefa, `CLAUDE.md`
§4 — falha alta de propósito, nunca pula). Não é "suíte verde" no sentido do
`CLAUDE.md` §2: o processo sai com erro; achado do quarto `/revisar`, que
pegou a entrada anterior deste parágrafo dizendo as duas coisas ao mesmo
tempo. A esteira do commit anterior (`1b5e301`, ainda rodando quando a
sessão abriu) já terminou — `success`, conferido por `gh run list` nesta
sessão. Esteira desta tarefa ainda não disparada (push pendente) — ver
`/onde-paramos` na próxima sessão.

Próximo: Tarefa 2 do item 4 — Lista "Meus fretes".

---

## 20/08/2026 — plano do item 4 (Lista de fretes e detalhe do frete), em 6 tarefas

Plano aprovado pelo fundador, commitado antes da construção começar
(`CLAUDE.md` §2) — `docs/planos/item-4-lista-e-detalhe-do-frete.md`.

Fatiado em 6 tarefas, mesma razão do item 3: leitura derivada (situação
financeira), lista, detalhe, edição reaproveitando uma tela existente, e
retrofit em cinco telas já construídas (perfis de cliente/caminhão/
motorista, listas de cadastro) que ficaram com pendência apontando para
este item desde os itens 2 e 3.

**Três decisões do fundador sobre o plano, registradas no próprio
arquivo:** incluir os três pills "Lançar frete para/com este X" (a
dependência que os cortou no item 2 já não existe); o resumo do motorista
usa o rótulo **"Valor transportado"**, não "valor rodado" — para não ler
como remuneração do motorista, já que o valor é do dono; a etiqueta
"Faturado" nasce com a cor neutra por não ter cor própria em
`docs/estilo.md`, mas é lacuna registrada para o Design — o fundador
discorda da neutra (é o estado onde o dinheiro fica parado esperando o
cliente, o mais importante de destacar, não o de esconder).

**`/revisar` achou bug de lógica de domínio — classe nova, primeira desta
natureza na sessão (as anteriores eram precisão de texto/diário).** A
derivação da situação financeira, do jeito que o plano descrevia,
checava "existe título não pago" antes de "algum dinheiro entrou",
e por isso "Parcial" nunca era alcançado — um frete com um título pago
e outro em aberto (adiantamento + saldo) cairia em "Faturado", escondendo
que dinheiro já tinha entrado. Mais dois achados de correção, não só de
texto: `Servico.km` é guardado em metros, e a razão R$/km do resumo do
caminhão dividia sem converter; e "Vencido" no resumo do cliente nunca
sairia de zero nesta fatia, porque `TituloReceber.vencimento` só passa a
ser preenchido a partir do item 6 (hoje todo título nasce via "Já recebi",
sempre pago, sempre sem vencimento) — `CLAUDE.md` §8, número que nunca
sai de zero é dado incompleto disfarçado de completo.

**Decisão do fundador sobre a derivação corrigida, registrada em
`docs/especificacao.md` §7** (nova ordem, que resolve o bug de raiz):
título cancelado conta como se não existisse (mesmo raciocínio de
arquivado — se todos os títulos do serviço estiverem cancelados, volta a
"A faturar"); um frete com dinheiro parcial ou com um título pago e outro
aberto é sempre "Parcial", nunca "Faturado" — dizer "Faturado" quando
dinheiro já entrou esconde o que a situação existe para mostrar. "Vencido"
sai do resumo do cliente nesta fatia, e entra no item 6, junto do resto de
Cobranças. Teto de "Ver todos" confirmado em 5 — mesma conta das cinco
sugestões de município, o que cabe acima do teclado sem rolar.

Achados menores aceitos e corrigidos no mesmo passe: faltava a linha
TELEFONE no detalhe do frete (`docs/componentes.md` exige); "Lançar frete
com este motorista" é a ação **principal** do perfil do motorista, não
pílula; "Lançar frete com este caminhão" não estava no inventário do
perfil do caminhão — o plano já prevê sincronizar `docs/componentes.md`
junto da Tarefa 6, por ser decisão já registrada em `docs/especificacao.md`
§4.7 (`CLAUDE.md` §13, sincronizar estado é do repositório).

`/revisar` roda de novo antes do commit — mesma classe de achado
(lógica de domínio), corrigida uma vez, exige confirmação de que a
correção não abriu outro problema, não só repetição do já resolvido.

**Segundo passe do `/revisar` achou mais quatro divergências e quatro
lacunas — a maior parte causada pela própria correção do primeiro
passe.** Ao tirar "Vencido" do §7 sem tocar no §4.7, os dois documentos
passaram a se contradizer sobre quantos números o resumo do cliente tem;
corrigido com uma nota nova no §4.7. Ao corrigir a fórmula de "a receber"
(devia somar só o que falta, não o valor cheio de um título com
recebimento parcial), percebi que "a receber" é **também** sempre zero
nesta fatia, pela mesma razão do "Vencido" — só "Já recebi" cria título, e
ele já nasce pago. **Decisão do fundador:** tira "a receber" também; o
resumo do cliente fica com dois números (já rodado · recebido no
período). A mesma razão corta a ordenação "maior valor em aberto" de
Clientes (Tarefa 5, fica só "mais recente"/"maior valor total" nesta
fatia) e o apoio "· R$ X em aberto" da linha Clientes em "Mais" — os três
voltam juntos no item 6. Outros achados corrigidos: "os três tocáveis"
virou "recebido" tocável por engano (nunca foi; corrigido para só "já
rodado"); "Ver todos os 5" confundia o teto de exibição (5, sua resposta)
com o número do rótulo, que é o total real do histórico; faltava a
palavra "adicionar" na linha TELEFONE, que o inventário exige nomeando
essa linha; o texto do estado vazio de "Meus fretes" já está registrado em
`docs/especificacao.md` ("lançar o primeiro frete", já pedido ao Design) —
uso esse, não invento outro; verifiquei os três arquivos de perfil
individualmente em vez de generalizar por analogia (`motoristas/[id]/
page.tsx` cita item 3, não item 4; `AvisoFreteSalvo.tsx` não tem comentário
nenhum sobre o corte do "Ver o frete" — só o plano do item 3 registra
isso). Rejeitado: o achado sobre a cor "Faturado" — o revisor não vê a
conversa, e a neutra foi decisão explícita sua, não omissão.

**Decisão do fundador sobre volume da lista "Meus fretes"** (lacuna nova,
sem documento que decidisse): carrega os 50 mais recentes por padrão —
nunca o mês corrente, que esconderia o que acabou de ser lançado atrás de
um mês anterior maior —, com o chip de Período trazendo outra janela sob
pedido. Registrado que o filtro de período precisa funcionar por
parâmetro de URL, não só por toque no chip, porque o item 8 (barras da
dashboard) vai depender disso. O caso de adiantamento pago sem saldo
lançado (derivaria "Quitado" errado) fica como lacuna registrada para o
item 6 resolver — não alcançável nesta fatia, decidir agora seria decidir
no escuro.

Esta rodada de achados é a mesma classe da anterior (lógica de
domínio/consistência entre documentos) mais precisão de texto já vista
hoje — corrigida, sem novo passe.

Próximo: Tarefa 1 do item 4 — situação financeira derivada e leituras em
lote, só backend.

---

## 20/08/2026 — teste de contraste permanente da varredura de segredo (fecha a tarefa 4 da auditoria)

Última pendência da tarefa 4 da auditoria de segurança
(`docs/planos/auditoria-4-varredura-de-segredo.md`), aberta em 18/08/2026: o
`.gitleaks.toml` estava provado por verificação manual, feita uma vez dentro
daquela sessão — não por teste que roda de novo a cada execução da suíte.
Pedido explícito do fundador, na conversa; plano escrito depois da
construção, por achado do `/revisar` — ver
`docs/planos/teste-de-contraste-varredura-de-segredo.md`.

**Roda o binário real, nunca reimplementa a regra.** Motivo registrado na
própria sessão de 18/08 (acima): duas vezes o raciocínio sobre o que a regex
deveria fazer estava errado, e só rodar a ferramenta de verdade contra um
caso plantado revelou o erro. Um teste que reimplementasse "o que a regra
deveria cobrir" testaria de novo o mesmo entendimento que já falhou duas
vezes — por isso `tests/varredura-de-segredo.test.ts` **localiza e chama** o
binário `gitleaks` de verdade contra o `.gitleaks.toml` real do repositório,
lido do arquivo — nunca uma cópia. Ele não baixa nada: procura em quatro
lugares (abaixo) e falha alto se não achar. Recusa também qualquer binário
que não seja exatamente a versão fixa da esteira (`8.30.1`,
`.github/workflows/ci.yml`) — comparação explícita contra a saída de
`gitleaks version`, não "aceita o que responder".

**Os dois disfarces que passaram, não só a versão final da regra** (pedido
do fundador) — cada um plantado como fixture e conferido contra a
configuração real:

- **Disfarce 1** — senha real terminada em `:senha` (a subcadeia nascia
  dentro do próprio campo). Medido: com a correção que exclui `:` do campo
  da senha, este formato **deixa de casar com a regra inteira** — não é
  mais "casa e é isentado por engano", é "não casa". A regra "pura" (sem a
  lista de isenção) confirma isso: dá zero achados também, igual à
  configuração real — as duas concordam, e é essa igualdade que o teste
  verifica.
- **Disfarce 2** — senha real seguida de `?p=:senha@` depois do endereço (a
  comparação era contra a URL inteira, não contra o campo capturado). A
  regra pura CAPTURA a senha real (`Secret` no relatório do gitleaks bate
  com o valor plantado); a configuração real reprova esse mesmo achado —
  prova de que a isenção não silencia o que não é, de fato, o placeholder.

**O contraste** (`CLAUDE.md` §3, item 1, aplicado aqui pela primeira vez fora
de RLS): cada caso roda duas vezes — regra "pura" (sem a seção
`[rules.allowlist]`, cortada do texto do `.gitleaks.toml` real em tempo de
teste) e configuração real. Sem a regra pura, um "isento" no teste normal não
provaria nada: podia ser isento de verdade, ou um caso que a regra nunca
alcança, como se a proteção nunca tivesse existido. Os placeholders exatos
(`senha`, `SENHA`) também entram, nos dois lados: a regra pura confirma que
os reconhece como conexão com senha (prova que a regra alcança o formato), a
configuração real confirma que ficam isentos.

**Achado sobre a ferramenta, não sobre a regra — registrado para não ser
redescoberto.** O gitleaks não casa a regra de conexão contra texto no
formato `${NOME}` (sintaxe de interpolação), mesmo com todos os outros
ingredientes do padrão presentes — medido isolando `$`, `{`, `}` e o texto
ao redor em casos de controle separados, não suposto. A primeira versão da
fixture do disfarce 2 escrevia a senha disfarçada nesse formato, num
template literal só, e o próprio arquivo de teste passava despercebido pela
varredura que ele testa — não pela isenção do placeholder (a senha plantada
não é `senha`/`SENHA`), mas por essa heurística não documentada do gitleaks.
Achado do `/revisar` (abaixo). Corrigido reescrevendo a fixture por
concatenação — protocolo, usuário e host em constantes separadas, nunca
formando `protocolo://usuário:senha@host` como texto contíguo no arquivo
fonte — o que fecha por construção, sem depender de qual heurística o
binário aplicar. Confirmado rodando o binário real contra o arquivo já
commitado: zero achados.

**Falha alta se o binário não estiver disponível — nunca pula em
silêncio**, mesmo mecanismo do §3 sobre teste que não distingue "passou" de
"não rodou". Localiza o binário em ordem: `GITLEAKS_BIN` (override),
`<raiz>/gitleaks` (onde a esteira já baixa, antes de `npm test` rodar),
`<raiz>/gitleaks.exe` (convenção local no Windows), `gitleaks` no PATH.
Testado localmente, com o binário real: `GITLEAKS_BIN` funciona,
`<raiz>/gitleaks.exe` funciona, `gitleaks` pelo PATH funciona, e a ausência
total falha alto com mensagem clara listando as quatro tentativas.
`<raiz>/gitleaks` (sem extensão) — o candidato que a esteira Linux de fato
usa — falha no Windows local (`ENOENT`, o Windows não executa binário sem
extensão reconhecida sem shell); só a própria esteira confirma esse
caminho, por ser específico do binário Linux.

Contagem de verificações (§3, item 4): 9 conferências, mais a verificação de
cobertura.

Verificação — local: `npx vitest run tests/varredura-de-segredo.test.ts`
(10/10, binário Windows baixado à parte para o teste, checksum conferido
contra o mesmo `_checksums.txt` da esteira), suíte inteira
(`GITLEAKS_BIN=<binário local> npm test`, 208/208), `npm run lint`, `npx tsc
--noEmit` — os quatro limpos. Esteira do commit `93085a7`: confirmada
verde (9m9s, todos os passos, inclusive "Varredura de segredo") — já
sabida antes do próximo commit começar, então esta entrada reflete o
estado real, não "pendente" (`CLAUDE.md` §2, item 9).

**`/revisar` achou quatro divergências e duas lacunas.** Uma divergência
(o disfarce 2 disparava a própria varredura, por causa da heurística
`${...}` acima) foi contestada com medição — o revisor só tem `Read`,
`Grep`, `Glob`, sem como rodar a ferramenta, e raciocinou sobre a regex do
mesmo jeito que já errou duas vezes nesta regra; medido com o binário real,
o arquivo commitado dava zero achados. Mesmo assim, a fundação da
desconfiança era real (heurística não documentada) — corrigida por
construção, não só justificada. As outras três divergências (diário
afirmando que o teste "baixa" o binário e confere versão, quando não fazia
nem uma coisa nem outra; a frase contraditória sobre "quatro caminhos
testados"; falta de plano em `docs/planos/`) e as duas lacunas (versão do
gitleaks não fixada; `CLAUDE.md` §4 sem plano que o listasse) foram aceitas
e corrigidas nesta mesma sessão, sem novo passe — mesma classe já vista
(precisão de texto do diário, §13; plano retroativo, já visto nesta sessão
na tarefa do teto de tempo).

As quatro tarefas da auditoria de segurança de 15/08/2026 estão concluídas.

Próximo: item 4 da ordem de construção do produto — **Lista de fretes e
detalhe do frete** (`docs/especificacao.md` §9).

---

## 20/08/2026 — processo de esteira: rerun ganha contagem e fila, `/onde-paramos` ganha janela maior, teto de tempo no teste mais pesado

Pedido do fundador, ao revisar o fechamento da sessão anterior: aceitar
`gh run rerun --failed` como mitigação da instabilidade (registrada em
18-19/08/2026, `docs/diario.md`, suspeita do pooler de transação do
Supabase) não dispensa medir a frequência — sem contar, não dá para saber se
é ruído tolerável ou sintoma. Referência do fundador: 1 rerun em 10 envios é
ruído; 1 em 3 vira prioridade de investigar a causa raiz.

**Um commit só para quatro correções — decisão do fundador contra a regra
geral do §2 ("uma tarefa por vez"), registrada para não virar precedente
solto.** A convenção de rerun, a fila de reruns, os dois buracos do
`/onde-paramos` e o timeout do teste nasceram do mesmo incidente desta
sessão e se explicam juntos — separar em quatro commits obrigaria cada um a
recontar o mesmo achado para fazer sentido sozinho. Não é o padrão daqui
para frente: tarefas sem essa relação continuam uma por commit.

**Achado ao aplicar a própria convenção — o `/onde-paramos` tinha dois
buracos, não um:**

1. O comando só lia a entrada mais recente do diário. A pendência
   "construir o teste de contraste permanente da varredura de segredo"
   (18/08, tarefa 4 da auditoria de segurança) ficou invisível: três
   entradas mais novas (correções de pool de conexão, investigação de
   instabilidade) não a mencionavam e não tinham "Próximo" próprio, e a
   resposta deste comando na sessão anterior reportou o item 4 (Lista de
   fretes) como próxima tarefa, por cima dela.
2. O comando só olhava `gh run list --branch main --limit 1` — o run mais
   recente. A esteira do commit `e183de5` reprovou (mesma assinatura
   abaixo) e nunca foi revista: dois commits seguintes (`e5fd7dc`,
   `c0a5773`) geraram runs próprios, então o vermelho de `e183de5` nunca
   apareceu como "o mais recente" para ninguém checar. Ficou parado um dia
   inteiro sem ninguém saber.

**Correção dos dois, em `.claude/commands/onde-paramos.md`:**

- Passo 1 agora rastreia o "Próximo:" mais recente do diário e confirma se
  alguma entrada mais nova já fechou aquela pendência, em vez de parar na
  entrada do topo.
- Passo 5 agora pede `--limit 20` (cobre com folga o pior caso já visto,
  cinco commits vermelhos seguidos em 14-18/08) e varre a lista inteira por
  qualquer `conclusion: "failure"` ainda não corrigido (um rerun
  bem-sucedido reescreve o mesmo run para `success`) — não só o commit do
  topo.

**A mesma assinatura de instabilidade, três vezes em quatro envios desde a
correção de concorrência de 18/08 (`cb6834e`)** — `0cbe399` verde;
`e183de5`, `e5fd7dc` e `c0a5773` vermelhos, todos em
`tests/medicao-municipios.test.ts`, sempre o mesmo bloco ("2. medição
completa"), sempre `Test timed out in 30000ms`. **3 em 4 — acima do limite
de 1 em 3 que o fundador definiu para virar prioridade de investigar.**
("Envio" = execução que de fato rodou, não commit — `CLAUDE.md` §2; os
quatro contados aqui são as quatro únicas execuções da esteira no período,
confirmado com `gh run list`.)

Reruns desta sessão, um por linha, como a própria convenção acima exige:

- `e183de5` — 20/08/2026 — vermelho desde o dia anterior, sem rerun até
  agora. Rerun disparado nesta sessão, confirmou verde.
- `c0a5773` — 20/08/2026 — vermelho no push desta sessão. Rerun disparado
  nesta sessão (depois do de `e183de5` terminar, ver achado de método
  abaixo), confirmou verde.

**Achado de método, no processo do próprio rerun:** os dois reruns desta
sessão foram disparados em sequência sem esperar o primeiro terminar, e
caíram na mesma fila de concorrência fixa da esteira
(`cancel-in-progress`, 18/08) — o segundo cancelou o primeiro, que precisou
ser disparado de novo. Registrado em `CLAUDE.md` §2: rerun espera o
anterior terminar antes do próximo, nunca dois em voo ao mesmo tempo.

**Por que sempre este teste — investigado, não só registrado.** Medido
local (cronômetro por teste) e comparado com os tempos individuais da
esteira ruim de hoje (`c0a5773`, que imprime cada teste separado):

| Teste | Local | Esteira (run ruim) | Fator |
|---|---|---|---|
| 1. abaixo do piso | 2,9s | 8,7s | ≈3,0× |
| 2. medição completa | 11,7s | estourou em 30,0s | ≥2,6× |
| 3. mais de dez textos únicos | 7,1s | 20,5s | ≈2,9× |

Os três desaceleram pelo mesmo fator (≈2,9-3,0×) — a instabilidade continua
genérica, não é este teste reagindo diferente do resto. O que muda é a
margem: "2. medição completa" é o mais pesado do arquivo (21 criações de
`Servico`, cada uma com resolução de município) e por isso o único cuja
margem local (2,6×) já é menor que o próprio fator de desaceleração — os
outros dois têm margem de 4,2× e 10,4×, e por isso nunca estouraram.

**O que esta investigação prova, e o que não prova — distinção pedida pelo
fundador.** Prova por que ESTE teste é o único do arquivo que estoura:
margem menor que o fator de desaceleração já visto. **Não prova por que a
esteira desacelera ≈3×** — essa causa continua sendo a "suspeita de
comportamento do pooler de transação do Supabase", não confirmada desde
18/08. Corrigir a margem deste teste resolve o sintoma que a proporção de
reruns mediu; não fecha a pergunta da causa raiz.

**Correção: timeout de 60s só neste teste** (`tests/medicao-municipios.test.ts`,
constante `TIMEOUT_MEDICAO_COMPLETA`), não no `testTimeout` global — mantém
os outros testes como sentinela real de travamento, em vez de mascarar
travamento de verdade com um prazo maior em todo lugar. Comentário no
código registra o que o número significa, a pedido do fundador: se estourar
mesmo com 60s, não é margem — é regressão de desempenho, e aumentar o
número de novo esconderia o problema em vez de corrigi-lo. Plano retroativo
em `docs/planos/teto-de-tempo-no-teste-de-medicao-completa.md` — achado do
`/revisar`: o código chegou antes do plano.

**Decisão do fundador: aceita o teto de 60s por ora, com a contagem
reiniciando a partir deste commit** — os 3 reruns em 4 envios valem para o
período 18-20/08, antes desta correção. Mas a hipótese do pooler segue não
confirmada: **se a proporção voltar a passar de 1 em 3 mesmo com os 60s, a
causa é outra, não a mesma, e a investigação da causa raiz abre então** —
não é o mesmo achado se repetindo, é sinal de que o teto não era a
correção.

Verificação — local: `npx vitest run tests/medicao-municipios.test.ts`
(4/4, 22,5s), `npm run lint`, `npx tsc --noEmit`, os três limpos. Esteira:
pendente, confirma no próximo `/onde-paramos`.

Próximo: construir o teste de contraste permanente da varredura de segredo
(tarefa 4 da auditoria de segurança, 18/08/2026) — a pendência que motivou
a correção do item 1 acima. Só depois disso o item 4 (Lista de fretes)
volta a ser o próximo.

---

## 19/08/2026 — teto de pool em `medirResolucaoDeMunicipios`, código de produto

Implementa `docs/planos/teto-de-pool-em-medicao-de-municipios.md` (commit
`6fa82d7`): a mesma proteção de blocos de dez já aplicada aos testes
(`docs/diario.md`, 18/08) agora no código de produto —
`medirResolucaoDeMunicipios` resolve `textosUnicos` em blocos de dez em vez
de um `Promise.all` sem teto, prevenindo estouro do pool numa empresa real
com muitos textos de origem/destino não resolvidos.

**Diverge do plano já commitado, de propósito — não reeditado.** O plano
afirmava que os testes que chamam a função continuariam "sem alteração...
nenhum dos dois tem hoje mais de dez textos únicos não resolvidos de uma
vez". O `/revisar` apontou que isso deixaria o próprio laço de blocos sem
cobertura — um fatiamento errado, ou a volta a `Promise.all` sem teto,
passaria sem nenhum teste acusar. Acrescentado
`tests/medicao-municipios.test.ts`, seção 3: treze `Servico`, 26 textos
únicos não resolvidos, cruzando duas fronteiras de bloco (dez, dez, seis).

**Segunda rodada do `/revisar`, dois achados corrigidos antes do commit:**

- O teste novo criava os treze `Servico` em sequência, um `await` por vez —
  18,9s local, perto demais do `testTimeout` global de 30s. Na esteira
  (latência maior que o banco de desenvolvimento), estourou por timeout.
  Corrigido para blocos de cinco — mesmo padrão do resto do arquivo — caiu
  para 6,7-7,5s.
- O teste reescrevia o bloco de cinco à mão, em vez de usar a função
  compartilhada — contradizia a decisão já escrita no próprio arquivo
  (`tests/medicao-municipios.test.ts:77-91`) de manter o teto **dentro da
  função**, não em cada chamador, para não ter dois tetos envelhecendo
  separados. Extraído `criarServicosComExtras` (recebe uma lista de `extra`,
  um por Serviço); `criarServicos` (mesmo `extra` para todas as chamadas)
  virou um wrapper dela.

**Verificação — local e esteira, as duas.** Local: `npm run lint`, `npx tsc
--noEmit` limpos; suíte inteira, duas rodadas depois da correção final,
198/198 (176s, 162s — dentro da faixa normal). Esteira: duas rodadas de
branch de verificação, PR fechado sem mesclar em cada uma — a primeira (PR
#7, commit `c1e0513`, antes da correção do teste sequencial) reprovou por
timeout no teste novo, exatamente o achado acima; a segunda, depois das duas
correções do `/revisar` (PR #8, commit `c7fb191`), confirmou verde (`gh run
view`, `conclusion: success`).

`npm run lint`, `npx tsc --noEmit` verdes na árvore final (restaurada do
commit verificado `c7fb191` para `main`, depois de fechar a branch de
teste).

**A esteira do push para `main` (commit `e5fd7dc`), checada na sessão
seguinte, reprovou uma vez — investigado, motivo alheio a esta tarefa.**
`npm test` estourou o `testTimeout` de 30s em
`tests/medicao-municipios.test.ts:143` ("2. medição completa..."), teste que
esta tarefa não tocou. A suíte inteira levou 389s — bem acima da faixa
normal (158-172s) e dentro da faixa "instável" já registrada em 18/08
(`docs/diario.md`, "fecha o cliente de banco ao fim de processo curto"):
todos os testes ficaram de 5 a 10× mais lentos que o normal
(`tests/servicos.test.ts`, por exemplo, 118,6s para 21 testes, contra a
faixa de 600-700ms por teste vista em `tests/isolamento/vazamento.test.ts`
no mesmo run) — assinatura de lentidão geral, não de um teste com lógica
quebrada. Confirmado com `gh run rerun --failed` no mesmo commit, sem
nenhuma mudança de código: `npm test` passou limpo (7m35s no total). `main`
está verde. Mesma classe de instabilidade do episódio de 18/08, cuja causa
raiz não foi fechada por completo (suspeita de comportamento do pooler de
transação do Supabase) — trazido ao fundador como achado, decisão em aberto
sobre investir mais agora ou aceitar o rerun manual como mitigação por ora.

**Correção, 20/08/2026 — "main está verde" acima enganava.** Era verdade
sobre `e5fd7dc`, o único commit checado; não era verdade sobre `main` como
um todo. Naquele exato momento `e183de5` (o commit imediatamente anterior)
estava vermelho, sem ninguém ter olhado — só descobrimos ao investigar a
proporção de reruns na sessão seguinte (`docs/diario.md`, entrada de
20/08). O motivo é o mesmo achado que corrigiu o `/onde-paramos` nessa
sessão: o comando só olhava o run mais recente, e `e183de5` nunca foi "o
mais recente" para ninguém checar depois que `e5fd7dc` e `c0a5773` geraram
runs próprios. Classe de erro do `CLAUDE.md` §13 — afirmação que engana por
dizer o que não era mais verdade.

---

## 18/08/2026 — fecha o cliente de banco ao fim de processo curto

Achado investigando a instabilidade local da tarefa anterior (entrada
abaixo) — o fundador pediu para parar e investigar antes de fechar aquela
tarefa, porque a suíte é a defesa que o projeto inteiro apoia, e
intermitente ela deixa de distinguir "quebrou" de "falhou de novo". Plano:
`docs/planos/fecha-cliente-de-banco.md`.

`src/lib/db/index.ts` cacheia `clienteBase` em `globalThis` — "um cliente
por processo, não um por pedido" — e nunca o fecha. Certo para um servidor
(processo longo); todo processo **curto** que usa `db()` abre e nunca fecha.
Achados dois: a suíte de testes e `scripts/medir-municipios.mts` (a seed já
fechava certo, com seu próprio cliente). `fecharConexao()` nova, exportada;
`tests/fecha-cliente-de-banco.ts` fecha ao fim de cada arquivo de teste
(`setupFiles`); `medir-municipios.mts` ganha o mesmo `try/finally` que a
seed já tinha.

**Três coisas verdadeiras ao mesmo tempo — pedido do fundador para não
deixar colapsar numa só, porque cada uma sozinha engana de um jeito
diferente:**

1. **O fechamento explícito é certo por princípio, independente da causa.**
   Processo que abre conexão e não fecha é defeito — não precisava provar
   que era A causa da instabilidade para valer a pena corrigir.
2. **O resultado é real e medido.** Seis rodadas da suíte completa,
   seguidas, sem pausa, depois da correção: as seis limpas (198/198),
   duração consistente (158-172s). Antes: duas falhas em cinco tentativas,
   sempre mais lentas (267-424s), em posições diferentes da suíte (uma vez
   perto do fim, uma vez no primeiro teste) — o que já descartava "sempre
   no mesmo lugar" (ordem) e "sempre no fim" (desgaste numa rodada só).

   As seis rodadas acima foram medidas numa árvore que também tinha a
   mudança **ainda não commitada** da tarefa "teto de pool em
   `medicao-municipios.ts`" (entrada anterior a esta) — contra "uma tarefa
   por vez". Achado pelo `/revisar`. Remedido isolando só esta tarefa (`git
   stash` das mudanças da outra): três rodadas seguidas, `git status` limpo
   de resto, 197/197 nas três, 146-155s — mesma faixa de duração, resultado
   se sustenta sem a mistura.
3. **A causa raiz não está provada — e não fica registrada como se
   estivesse.** Conferido depois da correção, inclusive esperando 15s: as
   dez conexões `fretigate_app` continuam aparecendo em
   `pg_stat_activity`. Investigando os PIDs: são as MESMAS dez, com 17-18
   minutos de vida no momento medido, alternando entre `active` e `idle` a
   cada rodada — não contagem crescendo. Tem a forma de comportamento
   normal do pooler de transação do Supabase (conjunto de conexões de
   fundo, reaproveitadas entre sessões de cliente diferentes), não de
   vazamento acumulando. Fechar essa dúvida por completo exigiria acesso à
   configuração do pooler do lado do Supabase, fora do alcance desta
   investigação.

**O sintoma para a próxima vez, registrado a pedido do fundador:** rodada de
suíte que demora bem mais que o normal é o primeiro sinal — antes de olhar
qual teste falhou. As rodadas instáveis mediram 267-424s; as limpas,
158-172s. O teste que reprova muda de posição entre tentativas; a duração,
não.

`npm run lint`, `npx tsc --noEmit` verdes, na árvore isolada desta tarefa.
Local: nove rodadas completas da suíte no total (seis contaminadas + três
isoladas, ambas limpas — ver item 2 acima). Esteira: push de verificação
numa branch de teste isolada (PR #6, commit `1ba8eb7`), confirmado verde
(`gh run view`, `conclusion: success`) — PR fechado sem mesclar, branch de
teste apagada dos dois lados.

---

## 18/08/2026 — processo revisado: A + B não bloqueante, C fica de reforço — e o achado que corrigiu a própria revisão

Pedido do fundador, depois de um dia de uso da regra criada mais cedo
(esperar o resultado real da esteira em toda tarefa, 5-7 minutos): custa
mais do que resolve. Plano:
`docs/planos/revisa-processo-para-A-mais-B-nao-bloqueante.md`.

- **`.claude/commands/onde-paramos.md`** — ganha um passo novo, conferindo a
  esteira de verdade do commit mais recente. Se estiver vermelha, isso é
  dito antes de "última tarefa concluída" — mesma prioridade que já existia
  para divergência entre diário e `git status`; a ordem entre as duas, se
  as duas acontecerem juntas, ficou escrita (divergência primeiro, muda o
  que é "onde paramos" antes de qualquer outra leitura fazer sentido).
- **`CLAUDE.md` §2, item 9** — reescrito: a tarefa fecha sem esperar o
  resultado, mas o fechamento tem que dizer explicitamente "esteira
  disparada, ainda rodando, sem confirmação". O histórico da decisão
  original fica registrado, com a revisão explicada ao lado.
- **`CLAUDE.md` §2, item 10** — o exemplo de mensagem de fechamento muda
  para refletir isso.
- **`CLAUDE.md` §14** — a entrada de branch protection ganha "reforço
  disponível, não descartada", e a referência ao item 9 corrigida.

C (branch protection) continua para depois do lançamento do MVP — não
antecipada.

**`/revisar` achou que `gh run list --branch main --limit 1` sozinho não
prova nada — e tinha razão.** Ele devolve o run mais recente da branch, sem
amarrar ao commit certo: um push muito recente, cujo run ainda não apareceu
na lista, faria o comando devolver o resultado do commit **anterior**,
relatado como se fosse do atual — confiança falsa, a mesma classe que o
`CLAUDE.md` §3 já nomeia. Corrigido: o passo agora pede `--json
headSha,conclusion,status` e compara o `headSha` (SHA **completo**, nunca a
forma abreviada de `git log --oneline`) contra `origin/main` — não o HEAD
local: os dois podem divergir (commit feito mas push falhou, por exemplo),
e é o que está em `origin/main` que a esteira de verdade testou. Se não
bater, ou o run ainda estiver `in_progress`, ou não existir nenhum — a
resposta diz "ainda sem confirmação", nunca inventa um veredito. `gh`
autenticado também virou dependência registrada — dentro do próprio
`.claude/commands/onde-paramos.md`, não no `CLAUDE.md` §14 (que é sobre
dependência de código, `tsx`; esta é de comando, lugar diferente) — mesmo
espírito: se faltar de forma permanente, a checagem para de rodar em
silêncio.

**Contradição achada entre o item 9 novo e um parágrafo antigo do mesmo
item — corrigida.** O parágrafo "a entrada do diário se atualiza antes do
commit final, nunca depois" foi escrito para a versão anterior da regra
(que esperava o resultado dentro da própria tarefa) e, ao pé da letra,
contradizia a versão nova (que fecha sem esperar — não existe "depois",
dentro da mesma tarefa, para atualizar). Reescrito: a atualização do
diário vale **se** o status real já for conhecido antes do próximo commit
(por ter sido checado, ou porque o `/onde-paramos` já rodou) — não é uma
exigência de esperar disfarçada, é só não deixar um registro desatualizado
quando a informação certa já está à mão.

**O achado maior desta rodada não veio do `/revisar` — veio de verificar
esta própria tarefa na esteira de verdade, o que a tarefa pede para
fazer.** Ver a entrada "duas execuções da esteira se destruíram" (mais
abaixo): o commit da tarefa anterior (teto de pool), empurrado direto pra
`main`, reprovou por um motivo que não tinha nada a ver com o código —
achado e corrigido antes desta tarefa, em commit próprio
(`cb6834e`), já em `main`.

**Segunda rodada de `/revisar`, depois de a tarefa de concorrência
(entrada mais abaixo) já ter sido commitada — mais três achados:**

- **Um segundo trecho do item 9 ainda presumia "antes de fechar"**: "se o
  defeito for da própria tarefa, a correção entra como parte dela, antes
  de fechar" — mas não há como saber isso antes de fechar, se a tarefa
  fecha sem esperar. Reescrito para valer "sempre que o vermelho for
  descoberto", não só antes do fechamento.
- **Os cinco desfechos do passo novo não cobriam todo valor que o `gh run
  list` devolve** (`queued`, `timed_out`, `action_required`, `skipped`,
  etc.). Trocado por um desfecho-padrão: qualquer coisa que não seja
  explicitamente "success" ou "failure" com o SHA batendo cai em "ainda
  sem confirmação" — sem tentar enumerar cada valor possível.
- A entrada do diário original desta tarefa (esta) tinha sido apagada por
  engano ao separar o commit da revisão de processo do commit da correção
  de concorrência — os dois foram pedidos e investigados juntos, mas são
  tarefas diferentes (§2, "uma tarefa por vez"). Restaurada aqui.

---

## 18/08/2026 — duas execuções da esteira se destruíram, e a correção é impedir a concorrência, não pedir disciplina

Achado ao verificar a tarefa do teto de pool (entrada "o teto de pool
aplicado aos dois testes que faltavam", mais abaixo) na esteira de verdade:
o commit `81e806f`, empurrado direto para `main`, reprovou —
mas com erros sem relação nenhuma com o código: `relation "municipio" does
not exist`, `table "motorista" does not exist`, `permission denied for
schema public`.

**Diagnóstico.** Dois commits seguidos (`81e806f` às 20:21:58, e o próximo,
só de documentação, às 20:23:07) dispararam duas execuções da esteira ao
mesmo tempo, contra o **mesmo** projeto de teste do Supabase — só existe um
(`CLAUDE.md` §5). Cada execução roda `prisma migrate reset --force`, que
derruba e recria o schema inteiro. Uma delas resetou o schema no meio da
outra ainda testando — tabela que a segunda esperava já tinha sumido de
baixo dela. O código da tarefa estava correto (já provado antes, isolado,
numa branch de teste); o vermelho era só as duas execuções brigando pelo
mesmo banco.

**A correção pedida pelo fundador: impedir a concorrência, não confiar em
disciplina de espaçar commits.** Plano:
`docs/planos/impede-concorrencia-na-esteira.md`.

- **`.github/workflows/ci.yml` ganhou `concurrency`, com `group` FIXO** (não
  por branch) **e `cancel-in-progress: true`.** Toda execução desta esteira,
  de qualquer branch, entra no mesmo grupo — uma execução nova cancela a
  anterior em vez de rodar junto. Custo: zero em dinheiro (recurso nativo do
  GitHub Actions); o único efeito colateral é que dois PRs de verdade,
  simultâneos, brigariam pela mesma vez em vez de rodar em paralelo —
  **limitação conhecida, aceita**: hoje só uma pessoa (mais este agente)
  trabalha de cada vez, então isso nunca cancela trabalho de verdade. Fica
  registrado para reabrir se o time crescer.
- **O cancelamento sozinho não bastava — pesquisado, não suposto** (o
  comportamento documentado do runner do GitHub Actions, não uma medição
  direta forçando um cancelamento). O runner só manda sinal de
  encerramento para o processo de topo de um passo (o `bash` do `run:`);
  um processo filho (o `node`/`npx` falando com o Postgres) não recebe
  nada, e pode continuar conectado por até dez segundos depois do
  cancelamento — tempo suficiente para segurar um lock que travaria o
  próximo `migrate reset --force`, esperando uma conexão que já devia ter
  morrido.
- **`tests/encerra-conexoes-anteriores.ts`** — passo novo, logo antes do
  `migrate reset`, que mata as conexões dos quatro papéis do produto
  (`CLAUDE.md` §9) no projeto de teste — nunca papéis internos do
  Supabase. Testado que o papel `postgres` tem privilégio para isso
  (`pg_terminate_backend`) — medido contra o banco de **desenvolvimento**,
  com uma conexão própria de teste, não suposto; a prova contra o projeto
  de **teste** de verdade é o push de verificação, abaixo. Confere o
  resultado de cada sinal e espera a conexão sumir antes de seguir — não
  só conta linhas devolvidas. Mesma trava de `guarda-do-reset.ts`: só roda
  contra o projeto de teste, nunca desenvolvimento.

**Enquanto isso não existia** (é dizer: para qualquer sessão antes deste
commit), vale a regra provisória do fundador: **esperar a esteira do envio
anterior terminar antes do próximo push** — não para fechar a tarefa (item
9 continua sem esperar isso), só para não empurrar o commit seguinte em
cima de uma execução ainda rodando.

---

## 18/08/2026 — limitação conhecida, registrada: blocos de pool sem folga

Decisão do fundador, ao fechar a tarefa do teto de pool: os blocos de cinco
aplicados hoje (`tests/regressao-resolucao-municipios.test.ts`,
`tests/medicao-municipios.test.ts`) e o precedente de dez
(`tests/isolamento/vazamento.test.ts`) usam o pool **até o limite exato**,
sem conexão de folga para nenhuma outra consulta em voo no mesmo momento.
Não corrigido — é o mesmo padrão já aceito no precedente, não um defeito
novo. **Registrado como limitação conhecida**: se a esteira ficar instável
nesses arquivos especificamente (não nos outros), este é o primeiro lugar a
olhar.

---

## 18/08/2026 — o teto de pool aplicado aos dois testes que faltavam

Pedido do fundador, imediatamente depois da correção de
`tests/regressao-resolucao-municipios.test.ts`: os outros dois arquivos
achados no mesmo levantamento (entrada anterior) — acima do limite, não
alterados na hora — também corrigidos. Plano:
`docs/planos/corrige-teto-de-pool-nos-testes-restantes.md`.

**A afirmação "cada `criarServico` pede duas conexões" da entrada anterior
estava mais larga do que o medido — achado pelo `/revisar`, aceito.** Só
vale quando `origem_texto` **e** `destino_texto` chegam preenchidos; a
resolução só roda para o campo que existe
(`src/lib/servicos/servicos.ts:125-131`). Reconferido chamada a chamada:

- `tests/medicao-municipios.test.ts` — das quatro chamadas de
  `criarServicos`, **duas preenchem os dois campos** (quantidade 2, pico 4;
  quantidade 10, pico **20** — a que realmente estourava) e **duas
  preenchem só um** (quantidade 7 e quantidade 3, picos 7 e 3). Só a de
  quantidade 10 estourava sozinha, mas a função compartilhada passa a
  rodar em blocos de cinco **dentro dela mesma**, do jeito conservador (não
  sabe de antemão o que cada chamada vai preencher), o que protege as
  quatro de hoje e qualquer quantidade futura sem precisar recalcular por
  chamada.
- `tests/servicos.test.ts` — **revertido para o original.** O teste de
  concorrência do contador `numero` usa `dadosMinimos(e)`, que nunca
  preenche origem/destino — cada `criarServico` ali usa **uma** conexão,
  não duas; oito simultâneas pedem até oito no pico, dentro do pool de
  dez. Nunca esteve quebrado. O bloco de cinco que eu tinha aplicado era
  uma correção não pedida, apoiada numa conta errada, que reduzia sem
  necessidade a concorrência real que o teste existe para medir
  (`CLAUDE.md` §2, "correção que não foi pedida precisa do mesmo cuidado
  que a que foi").

**Diverge do plano já commitado, de propósito — não reeditado.**
`docs/planos/corrige-teto-de-pool-nos-testes-restantes.md` (§"O que muda")
diz que `tests/servicos.test.ts` passaria a rodar em blocos de cinco; a
construção real foi reverter o arquivo, pelo motivo acima, achado só
durante a construção. O texto do plano também mantém "cada `criarServico`
pede duas conexões" sem a ressalva (só quando os dois campos vêm
preenchidos) — plano fica como foi escrito, a ressalva vive aqui e no
comentário do código.

`npm run lint`, `npx tsc --noEmit`, `npm test` (os dois arquivos e a suíte
inteira) verdes — **local**. Confirmado também na **esteira**: branch de
teste, PR, suíte inteira verde, 5m58s. PR fechado sem merge, branch
apagada.

---

## 18/08/2026 — a esteira estava vermelha há cinco commits, e "suíte verde" local não avisava

Achado ao verificar a tarefa 4 na esteira de verdade (entrada abaixo): `main`
vinha falhando desde 14/08/2026, cinco commits seguidos, sem que nenhuma
entrada do diário registrasse isso — todas diziam "`npm test` (N testes)
verdes".

**Plano escrito depois da construção, não antes** — divergência do
`CLAUDE.md` §2 achada pelo `/revisar` e aceita: a sessão foi conduzida
turno a turno em conversa, sem plano commitado antes de eu editar código.
Registrado em `docs/planos/correcao-pool-esteira-vermelha.md`, com a nota
no topo explicando a ordem invertida.

**Diagnóstico, pedido pelo fundador antes de qualquer correção.** Commit
`89ec22e` (14/08/2026, "Tarefa 4 do item 3: medição dos 10%, comando e
regressão fixa") introduziu `tests/regressao-resolucao-municipios.test.ts`,
cujo `beforeAll` criava 21 `Servico` de uma vez, em paralelo
(`Promise.all`). O pool do driver (`pg-pool`, padrão do `PrismaPg`, não
sobrescrito em `src/lib/db/index.ts`) tem **dez** conexões — confirmado lendo
`node_modules/pg-pool/index.js`, não suposto. Vinte e uma chamadas
simultâneas estouram isso: algumas falham com `P2028 (Unable to start a
transaction in the given time)`, `Promise.all` rejeita na primeira e o
`beforeAll` lança — mas as chamadas que ainda estavam em voo **não são
canceladas**, continuam rodando sozinhas. Uma delas terminava e inseria um
`Servico` **depois** de o `afterAll` já ter rodado `DELETE FROM servico` —
daí a violação de chave estrangeira ao tentar apagar o `Cliente` em seguida.
Os dois erros observados eram o mesmo defeito, em duas fases.

**Por que "verde" local não via isso.** `.env` desta máquina aponta para o
projeto de **desenvolvimento** (`ysldmzvszjxdgcbtaurh`); a esteira fala com
o projeto de **teste** (`qutzsvrkaqvpluqxbhmp`, `CLAUDE.md` §5) — bancos
diferentes, pressão de pool diferente. `npm test` local não tinha motivo
para reproduzir o esgotamento. Regra nova no `CLAUDE.md` §2 sobre isso: toda
afirmação de verificação precisa dizer local ou esteira, nunca só "verde".

**Correção do defeito — e um erro de conta na primeira tentativa, achado
pelo `/revisar`.** Primeira versão: blocos de dez, mesmo número do
precedente (`tests/isolamento/vazamento.test.ts`, "dez, e não vinte"). O
`/revisar` (segundo passe) achou que a conta estava errada:
`criarServico` chama `normalizarEntrada`
(`src/lib/servicos/servicos.ts:128-130`), que resolve origem e destino em
paralelo, cada um seu próprio `db()` — **cada `criarServico` pede duas
conexões ao mesmo tempo, não uma.** Um bloco de dez chamadas pedia até vinte
conexões no pico, o mesmo estouro que o bloco existia para evitar, só
escondido atrás de um número que parecia certo. **Corrigido para blocos de
cinco** (5 × 2 = 10, a mesma margem do precedente). `npm run lint`, `npx tsc
--noEmit` e `npm test` (só este arquivo) verdes — **local**. Confirmado
também na **esteira**: branch de teste, PR (push direto não aciona nada — a
esteira só ouve `main`), suíte inteira verde, 8m30s. PR fechado sem merge,
branch apagada (`CLAUDE.md` §2, item 9).

**Outros arquivos com o mesmo formato, checados a pedido do fundador**
(`grep` por `Promise.all`/`Array.from({ length` em `tests/**`, exaustivo, não
por amostra) — **recontados com o fator de duas conexões por `criarServico`**,
não só pelo número de chamadas:

- `tests/medicao-municipios.test.ts` — usa a mesma `criarServico`; o maior
  uso pede exatamente dez chamadas em paralelo, ou seja, **até vinte
  conexões no pico** — acima do limite pela mesma conta que corrigiu o
  arquivo desta tarefa. Não alterado — fica para o fundador decidir.
- `tests/servicos.test.ts` — 8 chamadas × 2 = **até 16 no pico**, também
  acima do limite correto. Não alterado.
- `tests/titulos.test.ts` — 2 chamadas via `Promise.allSettled`, de
  `criarTituloJaRecebi`, que não passa por `normalizarEntrada` — sem risco.
- `tests/isolamento/vazamento.test.ts` — o precedente, dez chamadas de UMA
  conexão cada (`db().empresa.findMany`, sem resolução de município) —
  continua correto como está.

**Lacuna achada no mesmo levantamento, fora de `tests/`:**
`src/lib/servicos/medicao-municipios.ts:98` tem o mesmo formato
(`Promise.all` sem teto sobre `resolverMunicipio`) em **código de
produto**, usado por `scripts/medir-municipios.mts` contra uma empresa
real — se ela acumular muitos textos únicos não resolvidos, o mesmo
esgotamento pode acontecer contra o banco que a ferramenta apontar. Não
corrigido — ferramenta manual, sob demanda, urgência menor; fica para o
fundador decidir. Plano completo, incluindo os números exatos de cada
achado: `docs/planos/correcao-pool-esteira-vermelha.md`.

**O buraco de processo — decidido.** Três opções trazidas (leve:
`/onde-paramos` confere a esteira; média: fechamento de tarefa espera e
afirma o resultado real; pesada: branch protection no GitHub). Fundador
escolheu as duas pontas: **média agora**, **pesada depois do lançamento do
MVP**. A média virou regra escrita — `CLAUDE.md` §2, item 9 (novo): push faz
parte do commit aprovado, e a tarefa não fecha até a esteira confirmar,
espera o resultado de verdade, nunca só avisa que disparou. A pesada entrou
em `CLAUDE.md` §14, com o gatilho (lançamento do MVP) e o motivo do porquê
não agora (hoje é push direto, sem PR; a proteção exigiria PR para toda
mudança, todo dia — custo que só compensa depois que o ritmo diário de
mudança cai).

---

## 18/08/2026 — tarefa 4 da auditoria: a varredura de segredo vira mecanismo na esteira

Última das quatro tarefas abertas pela auditoria de 15/08/2026. Plano
aprovado e commitado antes da construção:
`docs/planos/auditoria-4-varredura-de-segredo.md`.

**Ferramenta.** `gitleaks`, binário próprio baixado do GitHub Releases,
versão fixa (8.30.1, não "latest"), com checksum SHA-256 conferido contra o
arquivo publicado pelo próprio projeto antes de executar qualquer coisa.
Descartadas: GitHub Advanced Security (paga para repositório privado) e
`gitleaks-action` (amarraria a esteira ao comportamento e licenciamento de
uma Action de terceiro).

**O achado que mudou o desenho.** A configuração padrão do gitleaks **não
pega** o segredo mais provável deste projeto — uma URL de conexão com senha
embutida (`DATABASE_URL`/`DIRECT_URL`/`AUTH_DATABASE_URL`). Medido num
repositório descartável: `BETTER_AUTH_SECRET=<hex aleatório>` é pego pela
regra padrão (`generic-api-key`); `AUTH_DATABASE_URL="postgres://usuario:
<senha aleatória>@host/db"` passa limpo, porque a regra padrão exige um token
isolado e a URL tem `:`, `/`, `@` no meio. Corrigido com uma regra própria em
`.gitleaks.toml` (raiz do repositório, lida sozinha) para qualquer
`protocolo://usuario:senha@host` — não só `postgres://`, para não abrir nova
rodada de auditoria quando entrar outro serviço.

**Os dois pedidos do fundador, os dois medidos, não só implementados:**

- **A exceção do placeholder `senha`/`SENHA`** (as quatro ocorrências reais
  em `docs/diario.md` e `tests/guarda-de-banco.test.ts`) é por **igualdade
  exata do campo inteiro da senha**, nunca por conter a palavra — testado
  nos dois lados: o campo exato `senha` fica isento; o mesmo texto embutido
  numa senha maior (`Senha` + resto aleatório) reprova. "Contém" teria
  reaberto exatamente o buraco que a regra existe para fechar.
- **Falha de download reprova, nunca passa em silêncio.** `curl -f` nos dois
  downloads (sem isso, um erro HTTP grava o corpo do erro no arquivo e o
  curl sai com sucesso mesmo assim), `set -euo pipefail` explícito no bloco
  (não confia no padrão do executor da esteira), checksum conferido antes de
  extrair ou rodar qualquer coisa.

**Custo do histórico inteiro, medido:** 80 commits, ~3,9 MB, escaneados em
0,75 a 1,03 segundos a cada execução. Reavaliar (trocar para escanear só o
intervalo do push atual) quando este passo especificamente ficar lento de
verdade — não por um número de commits escolhido de antemão. Mesmo padrão do
`CLAUDE.md` §9 sobre a distância geodésica.

**Percalço no caminho — o próprio plano tropeçou na regra que descreve.** Para
documentar a medição da seção acima, o plano continha exemplos de string
aleatória com a FORMA de segredo (para ilustrar o que passa e o que não
passa). Depois de commitado, a varredura contra o histórico real achou essas
três linhas — o plano descrevendo o mecanismo tropeçou nele mesmo. **O plano
fica como foi aprovado e commitado** — plano já commitado não se reedita
(mesmo padrão desta entrada, tarefa 3, sobre a contagem errada). As três
linhas do commit antigo, imutável, ficam cobertas por `.gitleaksignore`, uma
entrada por fingerprint exato (commit + arquivo + regra + linha), com o
motivo escrito no próprio arquivo — citando corretamente `CLAUDE.md` §3
(migration aplicada não se edita), não o §9 que a primeira versão desta
entrada citou por engano.

**`/revisar` achou uma divergência real, duas de precisão de texto e três
lacunas.** Trazidas ao fundador, e as duas primeiras já pedidas por ele antes
mesmo do revisor rodar (as duas exigências da aprovação do plano):

- **A exceção não era, de fato, por igualdade exata — era por subcadeia.**
  A regra própria aceitava `:` dentro do campo da senha
  (`[^\s@/'"]{3,200}}`); como o `allowlist` procura `:senha@` como texto
  dentro do achado inteiro, uma senha real terminada em `:senha` (ex.:
  `postgresql://user:aB9x7Kp2Qz:senha@host/db`) cria essa subcadeia sem
  a senha *ser* "senha" — e passava isenta. **Medido, não só apontado**:
  plantei esse caso exato num repositório descartável e ele passou limpo
  antes da correção. Corrigido excluindo `:` também do campo da senha (a
  mesma exclusão que o campo do usuário já tinha) — com isso só existe um
  `:` antes do `@` naquela posição, e a subcadeia só pode ser o campo
  inteiro. Retestado nos três lados: o disfarce (`xsenha`) volta a
  reprovar, o placeholder exato (`senha`) continua isento, e a senha
  aleatória de controle continua reprovando.
- **A lista de literais tinha seis palavras, mas só duas ocorrem de
  verdade** (`senha`, `SENHA`) — as outras quatro (`sua-senha`,
  `SUA-SENHA`, `password`, `PASSWORD`) eram especulação, "para o caso de
  precisar", e nenhuma bate com o que o próprio `CLAUDE.md` §4 descreve.
  Cortadas as quatro. Lista agora bate exatamente com o texto do
  `CLAUDE.md` e com o que existe hoje no repositório.
- Duas afirmações de "cobre exatamente isto" eram mais estreitas do que a
  regra de fato casa (a prosa descrevendo o próprio mecanismo, no plano e
  no `.gitleaks.toml`, também casa com o padrão e fica isenta pelo mesmo
  motivo — o campo ali também é literalmente "senha"). Reescritas para não
  prometer uma lista exaustiva que não é.
- **Lacuna aceita e fechada:** se `.gitleaks.toml` sumisse do lugar
  esperado (movido, renomeado), o gitleaks cairia sozinho na configuração
  padrão — sem a regra própria — e a esteira passaria verde do mesmo jeito.
  O passo da esteira ganhou `test -f .gitleaks.toml` antes de rodar, e
  `--config .gitleaks.toml` explícito em vez de depender da busca
  automática.
- **Lacuna aceita e fechada:** nem `CLAUDE.md` nem o plano diziam quem pode
  acrescentar linha em `.gitleaksignore` nem sob qual critério — o
  `.gitleaks.toml` já dizia isso de si mesmo, o `.gitleaksignore` não.
  `CLAUDE.md` §4 ganhou um parágrafo tratando os dois arquivos com a mesma
  regra: achado real e motivo escrito, nunca item especulativo.
  Registrado aqui: a lacuna existia porque a tabela "Arquivos que a tarefa
  toca" do plano (§9) não lista `.gitleaksignore` — não é enunciada de novo
  no plano, mesmo padrão de não reeditar plano já commitado.
- Lacuna aceita, sem ação: o revisor não conseguiu, só lendo, confirmar que
  os três fingerprints do `.gitleaksignore` batem exatamente com os achados
  do commit `4b7748d` (não sobra nem falta nenhum). Já verificado por fora,
  com a ferramenta de verdade: histórico completo escaneado depois de todas
  as correções acima — limpo, sem achado, sem alarme.

Varredura local (binário Windows equivalente, mesma versão e configuração)
contra o histórico real, depois de todas as correções acima: limpa, sem
alarme falso. `npm run lint` inalterado (nenhum arquivo de app tocado).
Sintaxe do `ci.yml` conferida por parser YAML.

**Segundo `/revisar`, rodado por a correção acima ser classe nova (mudou a
lógica central da regra, `CLAUDE.md` §2) — achou que a correção não tinha
fechado o problema, só um sintoma dele.**

- **A comparação continuava por subcadeia do achado inteiro, não por
  igualdade do campo da senha.** A correção anterior fechou o disfarce
  *dentro* do campo da senha, mas não tocou a causa: o `allowlist` do
  gitleaks compara contra o texto inteiro que a regra capturou, e o final
  da regra (`@[^\s/'"]+`, o "host") aceitava `@` e `:` livres — texto
  depois do host (query string, path) podia conter `:senha@` de novo,
  isentando uma senha real anterior. **Medido, não só apontado**: plantei
  uma URL com senha real de alta entropia, seguida de um parâmetro de
  consulta que só por coincidência de texto reproduzia o padrão do
  placeholder mais adiante — e passou isento antes desta correção.

  Corrigido na raiz, não remendando mais um sintoma: a regra ganhou um
  grupo de captura só para o campo da senha
  (`:([^\s:@/'"]{3,200})@`) e `secretGroup = 1`, que diz ao gitleaks para
  tratar **só esse grupo** como "o segredo" — é contra esse texto isolado,
  nunca a URL inteira, que a lista de isenção compara agora, com
  `^(senha|SENHA)$` (âncoras de início e fim, igualdade de verdade, não
  mais busca de subcadeia). O host também ficou restrito a caractere de
  nome de host/porta (sem `@`/`/` livre) — por realismo, não como a defesa
  contra o disfarce; a defesa é o `secretGroup` isolando o campo antes da
  comparação.

  **Seis controles plantados e retestados depois da correção** (repositório
  descartável): senha real disfarçada por texto depois do host → reprova;
  placeholder exato `senha`/`SENHA` (minúsculo e maiúsculo) → isento;
  disfarce dentro do próprio campo → não casa a regra (mesmo resultado da
  correção anterior); senha real genérica → reprova; usuário literalmente
  chamado `senha` com senha real de verdade depois → reprova (o
  `secretGroup` ignora o campo do usuário, só olha a senha). Os seis
  bateram com o esperado.

- **A tarefa estava sendo dada como concluída sem o item 6 do "Como eu sei
  que terminou" do plano** (push real numa branch de teste, confirmando a
  esteira de verdade) — e o `CLAUDE.md` §4 afirmava em tom de fato já em
  vigor que "a esteira roda `gitleaks`... e falha o build se achar um",
  quando o passo nunca rodou uma vez de verdade. Aceito, e **feito**: push
  numa branch de teste, PR para acionar `pull_request` (push direto não
  dispara — a esteira só ouve `main`), autorizado pelo fundador. O passo de
  varredura passou de verdade. Achados só possíveis rodando contra o
  GitHub real, não local: faltava `-v` no comando (sem ele, um achado
  reprovaria sem dizer onde) e a própria entrada do diário descrevendo o
  achado 2 continha a forma exata do exemplo que descrevia — mesmo
  problema do plano, de novo, corrigido do mesmo jeito (exemplo reescrito
  sem a forma de segredo). PR fechado sem merge, branch de teste apagada;
  `CLAUDE.md` §4 corrigido para "confirmado", não "pendente".
- **Lacuna aceita, mas sem ação nesta entrada:** o revisor não tinha, no
  diff que recebeu, o parágrafo do `CLAUDE.md` §4 sobre a impressão digital
  do `.gitleaksignore` envelhecer com o commit (a seção seguinte) — pedido
  do fundador, chegou depois do diff ter sido capturado para o segundo
  passe. Mesma classe do parágrafo anterior (governança de documentação),
  não abriu terceiro passe.
- **Lacuna aceita, verificada de outro jeito:** dúvida se a versão fixa do
  gitleaks (8.30.1) aceita `[rules.allowlist]` no singular. Não é dúvida —
  é o que os seis controles acima, rodados com o binário real da mesma
  versão, já provam: a chave funciona, teria reprovado o teste de
  placeholder se não funcionasse.
- **Decisão para o fundador, não decidida aqui:** o `CLAUDE.md` §3 exige
  teste de contraste **permanente**, dentro do repositório, para o
  isolamento entre empresas — algo que reprova sozinho se a proteção for
  enfraquecida por acidente numa mudança futura. Esta tarefa só tem
  contraste **manual, fora do repositório**, feito nesta sessão. Não decidi
  sozinho se uma trava de segurança desta natureza (ferramenta de
  terceiro + configuração própria) precisa do mesmo tipo de teste
  permanente que o isolamento de banco tem, ou se a verificação manual
  desta sessão é suficiente — fica para o fundador decidir.

**O item 6 do plano está cumprido — a varredura de segredo em si está
provada.** Achado à parte, fora do escopo desta tarefa, que apareceu só por
rodar a esteira de verdade: o resto do pipeline daquele PR falhou por um
defeito não relacionado, já presente em `main` antes deste PR (esteira
vermelha desde 14/08/2026) — diagnosticado e corrigido em entrada própria,
acima.

**Ainda falta, decidido mas não construído:** o teste de contraste
permanente para este mecanismo (`CLAUDE.md` §3 exige isso para o
isolamento; o fundador confirmou que vale o mesmo aqui, com o binário real
do gitleaks, não reimplementação). Fica para a próxima tarefa.

Próximo: construir o teste de contraste permanente da varredura de segredo.
Só depois disso as quatro tarefas da auditoria de 15/08/2026 estão
concluídas e o item 4 (Lista de fretes) volta a ser o próximo.

---

## 18/08/2026 — tarefa 3 da auditoria: o mecanismo de sessão vira envelope provado por teste

Pedido do fundador: mecanismo de sessão para ação de servidor — hoje
sobrevivia por acidente feliz (`empresaId` só existe na sessão), não por
trava; `exigirDono()` nunca rodou uma vez, e nenhum teste passava por sessão
de verdade. Plano aprovado e commitado antes da construção:
`docs/planos/auditoria-3-mecanismo-de-sessao.md`.

**Opções trazidas antes de escolher, mesmo tratamento que o `db()` teve.**
Três mecanismos apresentados — só teste; teste + envelope; os dois mais
middleware do Next.js. Escolhida a segunda: envelope sozinho é trava sem
prova, teste sozinho só avisa depois. Middleware recusado por não distinguir
dono de operador, exatamente o caso que motivou a tarefa.

**O risco levantado, e a resposta.** A primeira ideia para tornar
`exigirSessao()`/`exigirDono()` testáveis — um parâmetro opcional de
cabeçalhos — foi apontada como o formato exato de uma porta dos fundos: se
alcançável de uma rota real, contornaria a sessão inteira. Resposta:
`exigirSessao()`/`exigirDono()` não ganharam parâmetro nenhum — continuam
zero-argumento, sempre lendo `next/headers`. A lógica de verdade (achar
sessão pelo cabeçalho, checar `arquivado_em`, checar papel) foi para
`src/lib/auth/sessao-por-cabecalho.ts`, que recebe `Headers` como argumento
comum — sem fabricar sessão nenhuma, continua exigindo cookie válido — e cuja
importação é travada pelo `eslint.config.mjs`, só para `src/lib/auth`, mesmo
mecanismo que já tranca `bancoSemFiltroDeEmpresa` (tarefa 2). `tests/` fica
fora do escopo da regra pelo mesmo motivo que `/tests` já pode SQL cru (§3).

**O envelope.** `src/lib/auth/acao.ts` — `comoUsuario`/`comoDono` entregam
`sessao` como primeiro parâmetro da ação; a escolha do envelope É a
declaração de "esta ação exige dono", sem lista separada para manter. As 17
ações de hoje (3 em `clientes`, 3 em `caminhoes`, 3 em `motoristas`, 8 em
`fretes`) passam a usar `comoUsuario` — o plano previa 16, contando `fretes`
por estimar (marcado "conferir contagem exata na construção" no próprio
plano); a contagem real, 8, veio a somar 17, achado pelo `/revisar`. Duas
exceções, comentadas no próprio código: `sairDaConta` (sessão pode já ter
vencido) e `criarConta` (cria a empresa; sessão não existe ainda).

**Os dois testes novos.** `tests/protecao-de-acoes.test.ts` varre `src/**`
sozinho (sem lista de arquivo à mão), acha todo arquivo `"use server"`, e
confere por AST que cada exportação usa um dos dois envelopes — as duas
exceções conferidas por igualdade exata nos dois sentidos.
`tests/sessao-e-papel.test.ts` semeia empresa com dono e operador de
verdade, loga os dois via `auth.api.signInEmail` (cookie real, sem
simulação), e prova: os dois conseguem sessão comum; só dono passa em
`exigirDonoPorCabecalho`; operador recebe `SemPermissao` — o contraste; sem
cookie, `SemSessao` nos dois, inclusive na versão "dono" (ausência de sessão
vem antes do papel). Mais uma checagem por AST: o corpo de
`exigirSessao`/`exigirDono` em `sessao.ts` é literalmente `return
xPorCabecalho(await headers());` e nada mais — fecha o intervalo entre o que
o teste exercita e o que roda em produção, já que `next/headers` não funciona
dentro do Vitest.

**Prova de que a trava de importação reprova de verdade.** Arquivo temporário
em `src/app/(app)/` importando `sessaoPorCabecalho` — reprovou com as duas
mensagens (path e pattern), apagado depois, lint voltou a passar limpo.

**Fluxo completo testado no navegador**, pedido do fundador porque o teste
estrutural só confere que o envelope existe, não que a ação continua
funcionando — mudança mecânica em 5 arquivos é onde escapa uma que perdeu o
caminho: criar conta, criar cliente, editar cliente, arquivar cliente,
cadastro rápido de cliente/caminhão/motorista dentro de Lançar frete,
sugestão de município, salvar frete, "Já recebi" — todos via `npm run dev`
de verdade, sem erro de servidor, só um 401 esperado (senha ainda não
cadastrada, na primeira tentativa de login). Dado de teste apagado do banco
de desenvolvimento depois.

`npm run lint`, `npm run build` e a suíte inteira (`npm run test`, 16
arquivos, 197 testes) verdes.

**`/revisar` achou três divergências e duas lacunas.** Trazidas ao fundador
item a item:

- **O teste estrutural aprovava em silêncio forma de exportação que não
  reconhecia** (`export { nome }`, `export default`, função `default`
  anônima) — contradizia a própria frase escrita no `CLAUDE.md` ("confere que
  cada exportação usa um dos dois envelopes"). Aceito e corrigido:
  `classificarExports` (`tests/protecao-de-acoes.test.ts`) não pula mais
  nenhuma forma — qualquer uma não reconhecida cai em `"sem-envelope"` e
  reprova, a menos que esteja na lista de exceção. Contraste medido na hora:
  um arquivo `"use server"` de prova com `export { acaoQualquer }` sem
  envelope reprovou pelo motivo certo, apagado depois.
- Contagem errada — "16 ações" no diário e no plano, o número real é 17
  (`fretes` tem 8, não 7; o próprio plano já marcava isso como "conferir na
  construção"). Corrigido aqui (sem reescrever o plano já commitado, mesmo
  padrão da entrada de 18/08 anterior).
- **`comoDono` sem uso em produção — aceito como desenho, não corrigido.**
  Decisão do fundador, registrada em `CLAUDE.md` §6 como exceção declarada:
  não é abstração especulativa (a que ninguém sabe se funciona) — é a metade
  de um mecanismo que só existe em par com `comoUsuario`. Sem ela, o teste
  estrutural não teria como distinguir ação comum de ação de dono, e a lista
  de exceção viraria, na prática, a lista de ações de dono escrita à mão —
  o problema que este desenho evita. E nasce medido: `tests/sessao-e-papel.test.ts`
  prova com login real que barra operador e deixa dono passar, antes de
  qualquer tela usá-lo.
- **Ação de servidor inline (`"use server"` dentro do corpo da função) fica
  fora das duas travas — aceito como limitação conhecida**, mesmo tratamento
  das duas de `sem-filtro-de-empresa` (tarefa 2). Registrado com o sintoma,
  não só o fato, em três lugares — `CLAUDE.md` §9,
  `tests/protecao-de-acoes.test.ts` e `src/lib/auth/acao.ts` —: quem escrever
  a primeira ação assim está fora da proteção do mecanismo, e nada avisa se
  esquecer o envelope.
- O quinto achado (o revisor não consegue confirmar, só lendo arquivo, que
  `export const x = comoUsuario(...)` compila e roda como Server Action de
  verdade) não é lacuna — é limite do método dele. Já verificado por fora:
  `npm run build` e o fluxo completo no navegador, acima.

Próximo: tarefa 4 da auditoria (entrada de 15/08/2026, abaixo) — varredura de
segredo na esteira, hoje disciplina, não mecanismo.

---

## 18/08/2026 — tarefa 2 da auditoria: a trava de importação vira regra de verdade

Pedido do fundador: `src/lib/db/sem-filtro-de-empresa.ts:34` afirmava que a
trava de importação "existe para o erro aparecer no build" — e ela não estava
em lugar nenhum do `eslint.config.mjs`. Afirmação de mecanismo sobre coisa que
não existe, a classe que o `CLAUDE.md` §13 chama de pior tipo de erro de
documento. Plano aprovado e commitado antes da construção:
`docs/planos/auditoria-2-trava-de-importacao.md`.

**Duas regras novas no ESLint**, no mesmo mecanismo que já protegia SQL cru
(`no-restricted-imports` + `no-restricted-syntax`, tarefa 9): uma bane
importar `sem-filtro-de-empresa` fora de `src/lib/auth`, outra bane construir
`PrismaClient` próprio (o import de `@prisma/adapter-pg` e a sintaxe `new
PrismaClient(...)` em si) fora de `src/lib/db`.

**O conflito encontrado e a decisão do fundador.** `scripts/seed/municipios.mts`
constrói o próprio `PrismaClient`, por fora de `db()`, por desenho (`CLAUDE.md`
§6, §9 — município não tem `empresa_id`). A regra de cliente próprio, ao pé da
letra, bloquearia esse arquivo. Perguntado antes de escolher: o fundador optou
por uma exceção nomeada, só para este arquivo, escrita e justificada no
`eslint.config.mjs` — não um "liga tudo de novo".

**Achado durante a verificação, que derrubou um critério do plano.** O plano
pedia confirmar, com `npm run build`, que o Next.js roda o ESLint durante o
build. Medido criando um arquivo violando a trava e rodando o build com ele: o
build passou limpo, sem etapa de lint nenhuma. **A partir do Next.js 16, `next
lint` e a opção `eslint` do `next.config.ts` foram removidos** — confirmado em
`node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`.
A garantia real é `npm run lint`, rodado pela esteira a cada `push` para
`main` e a cada pull request (`.github/workflows/ci.yml`), não o build. O
comentário do arquivo e o do `eslint.config.mjs` foram escritos para dizer
isso, não o que o plano supunha.

**`/revisar` achou quatro divergências e três lacunas.** Trazidas ao fundador
item a item:

- Diário sem entrada da tarefa — esta entrada.
- O comentário apontando "ver o diário" antes de ele existir — resolvido
  junto.
- O critério do plano sobre `next build` rodar ESLint, contradito pela
  medição acima, sem registro em nenhum documento — registrado aqui, sem
  reescrever o plano já commitado (mesmo padrão da entrada de 18/08 anterior).
- A regra de `sem-filtro-de-empresa` abria `src/lib/db` inteiro (pedido
  original do fundador, por analogia com a exceção de SQL cru), o que
  deixava o comentário original do arquivo ("⛔ SÓ src/lib/auth PODE
  IMPORTAR") mais restrito do que a regra de verdade — e abriria uma
  reexportação silenciosa via `src/lib/db/index.ts`. **Corrigido apertando a
  regra, não afrouxando o comentário**: a exceção de `sem-filtro-de-empresa`
  passou a ser só de `src/lib/auth`. As duas exceções têm motivos diferentes
  — `src/lib/db` é exceção de SQL cru porque é a camada de acesso a dados; o
  cliente sem filtro é trabalho exclusivo do login, sem motivo para existir
  em mais nenhum arquivo de `src/lib/db`. Medido depois do aperto: nada em
  `src/lib/db` importava o arquivo hoje, e um arquivo de teste criado ali de
  propósito para violar a regra reprovou.
- Wording impreciso ("a cada commit" em vez de "a cada push para main"),
  corrigido.
- Duas lacunas aceitas como limitação conhecida, sem ação: o seletor de
  `new PrismaClient(...)` não pega import renomeado (ninguém renomeia hoje);
  e `.mts`/`.mjs`/`.js` dentro de `/src` ficam fora do escopo das quatro
  travas — herdado da regra de SQL cru já existente, mexer alargaria as duas
  juntas, fora do pedido desta tarefa.

**Prova de que a trava reprova de verdade** (o `/revisar` não consegue medir
isso, só tem `Read`/`Grep`/`Glob`): três arquivos temporários criados um de
cada vez — importando `sem-filtro-de-empresa` fora de `auth`/`db`, construindo
`PrismaClient` fora de `db`, e importando `sem-filtro-de-empresa` de **dentro**
de `src/lib/db` (o caso que motivou o aperto) — os três reprovaram com
mensagem clara, apagados logo depois, com o lint voltando a passar limpo.
Controles positivos depois do aperto: `src/lib/auth/index.ts`,
`scripts/seed/municipios.mts`, `src/lib/db/index.ts` e o próprio
`sem-filtro-de-empresa.ts` continuam passando.

Próximo: tarefa 3 da auditoria (entrada de 15/08/2026, acima) — mecanismo de
sessão para ação de servidor, hoje sobrevivendo por acidente feliz, não por
trava.

---

## 18/08/2026 — publica os Termos e a Política de Privacidade, sem bloqueio de lançamento

Pedido do fundador: os Termos de uso e a Política de Privacidade estavam em
rascunho desde a tarefa 8 (07/08/2026), marcados como BLOQUEIO DE LANÇAMENTO
no `CLAUDE.md` §14 — nem a forma do aceite nem a redação tinham passado por
revisão jurídica. Decisão: publicar agora, com um acréscimo, e tirar a
revisão jurídica do caminho do lançamento. Plano aprovado e commitado antes
da construção: `docs/planos/publica-termos-sem-bloqueio.md`.

**O parágrafo novo, e por que não podia esperar.** A Política de Privacidade
ganhou uma cláusula autorizando uso agregado e anonimizado dos dados
lançados no sistema, para melhorar o produto e produzir informação de
mercado (médias de valor por rota, volume por região, comportamento de
mercado) — explícito que esse agregado **pode** ser publicado ou
compartilhado, inclusive como material de divulgação; o que nunca sai é
dado que identifique empresa, cliente, motorista ou frete. A empresa pode
pedir, pelo e-mail de contato, que seus dados deixem de ser usados dessa
forma — atendido à mão até existir mecanismo próprio. Esse parágrafo entrou
nesta data e não podia esperar a revisão jurídica do resto: a LGPD não se
aplica retroativamente — dado coletado sem essa cláusula não pode passar a
ser usado assim depois. O resto que a revisão jurídica ainda vai cobrir
(retenção, direitos de titulares terceiros, transferência internacional,
alteração dos termos, limitação de responsabilidade) vale do aceite em
diante, então pode esperar.

**`termos_versao` deixou de ser provisório.** Passa a guardar a **data de
publicação** da versão do texto (`"2026-08-18"`), não um número sequencial —
decisão do fundador: responde direto "quando essa versão passou a valer"
sem precisar consultar outro lugar. Toda Empresa que aceitar esta versão
grava a mesma data; `termos_aceitos_em` continua sendo o momento em que cada
Empresa aceitou, e os dois podem divergir. Registrado em
`src/lib/servicos/cadastro.ts` e em `docs/especificacao.md`: uma versão
futura ganha data nova e vale só a partir do próprio aceite — não retroage
sobre quem já aceitou esta. **A regra completa: só cláusula nova ou alterada
conta como versão nova** e exige aceite de novo de quem já tinha aceitado;
correção de redação que não muda o que o texto autoriza não conta.

**O aviso "Rascunho" saiu da tela `/termos`, e nada entrou no lugar.**
Decisão do fundador: se a decisão é publicar, este é o texto vigente, e um
aviso de "isto pode não valer" na tela onde o cliente aceita é pior do que
qualquer imprecisão do texto em si. A pendência de revisão jurídica continua
registrada no `CLAUDE.md` §14 — ela some da tela, não do registro.

**`/revisar` achou quatro divergências e três lacunas, todas aceitas e
corrigidas antes do commit** (mesma classe — precisão do texto publicado e
do registro em `CLAUDE.md`/especificação —, sem novo passe, por decisão do
fundador):

- O parágrafo novo se contradizia com dois outros do mesmo documento
  ("não os usa para nenhum outro fim" / "nunca para outro fim"), publicados
  no mesmo aceite. Corrigido com a ressalva "salvo o uso agregado e
  anonimizado descrito na Política de privacidade" nos dois lugares.
- A pendência nova do `CLAUDE.md` §14 citava os 90 dias do §10 como se
  fossem do **cancelamento** voluntário; o §10 fala de assinatura
  **vencida** (pagamento que falhou) — situação diferente. Corrigido, e a
  lacuna que isso revelou virou item novo na lista de decisões em aberto:
  ninguém decidiu o prazo de retenção para quem cancela por conta própria.
- O plano foi escrito prometendo "commitado antes de a construção
  começar", mas ficou para entrar junto do código — corrigido: vai num
  commit próprio, antes deste.
- A pendência nova do §14 contava só três promessas do texto (exportação,
  cancelamento, retenção); a palavra "exclusão" no parágrafo novo era uma
  quarta que ficou de fora — e colidia com o §7 ("nada é apagado"), sem
  mecanismo nenhum por trás. Trocada por "deixar de ser usado dessa forma"
  (oposição, não exclusão), e as quatro promessas entraram na pendência.
- Se o agregado podia ser compartilhado com terceiros ou só uso interno
  não estava decidido — resolvido acima, explícito no texto.

**Banco de desenvolvimento limpo.** As quatro Empresas que existiam lá
(`Transportadora Teste`, `Transportes Teste Lancamento`, `Transport`,
`Teste Verificacao`) tinham aceitado a versão provisória, que não continha
a cláusula nova — pela regra de reaceite acima, isso não conta como aceite
desta versão. Apagadas as quatro e tudo que dependia delas (usuário,
clientes, caminhões, motoristas, fretes, sessão de login), na ordem que
respeita as travas de integridade referencial do §3
(`servico` → `motorista` → `veiculo` → `cliente` → `usuario` → `empresa`).
Conferido depois: nenhuma Empresa ficou com a versão antiga, e nenhuma
sobrou fora da lista das quatro. Banco de teste (usado pela esteira) não
precisou de limpeza — os testes semeiam e apagam os próprios dados a cada
execução, com valores literais próprios.

**Três pendências novas registradas no `CLAUDE.md` §14**, sem bloquear
lançamento: a revisão jurídica da forma de aceite e da redação, agora
marcada para depois do primeiro cliente pagante; uma pendência com prazo
legal — o texto promete exportação, cancelamento, retenção de leitura por
90 dias depois de a assinatura **vencer**, e oposição ao uso agregado, e
nenhuma das quatro tem mecanismo automático no produto hoje (a exportação é
a mais urgente, por ter prazo legal de resposta sob a LGPD); e o prazo de
retenção para quem **cancela por conta própria** (diferente do vencimento),
que o texto promete mas nenhum documento define.

Próximo: tarefa 2 da auditoria de segurança (entrada de 15/08/2026, abaixo)
— a trava de importação do cliente sem filtro de empresa vira regra de
verdade no `eslint.config.mjs`, hoje só frase em
`sem-filtro-de-empresa.ts:34`.

---

## 16/08/2026 — ajusta o espaço entre a marca e o título

Pedido do fundador: aplicar um documento novo do Design (revisão de
`referencia/Design/Marca nas telas de autenticacao.html`, mesmo arquivo da
tarefa de 14/08/2026, conteúdo atualizado). Plano aprovado e commitado antes
da construção:
`docs/planos/ajusta-espaco-entre-marca-e-titulo.md`.

**O que mudou.** A distância entre a marca e o título deixa de reaproveitar
"entre seções verticais" (24px, valor único para as cinco telas) e ganha
número próprio: **140px** em Entrar, Criar conta, Esqueci a senha e Redefinir
senha (com os estados que herdam a rota — Recuperação enviada, Link
expirado, a trava de consulta de `redefinir-senha`); **16px** só em Termos
(modo cadastro). Largura da marca (140px) e respiro do topo (66px) não
mudaram. Os dois valores novos entram como lacuna aberta em
`docs/estilo.md`, mesmo tratamento que a largura já tinha.

**A contradição do documento — pedido ao Design.** O texto do documento
afirma que os 140px valem "nas cinco telas — inclusive Termos". Medido
pixel a pixel dentro do próprio arquivo, a tela de Termos do mockup mostra
16px, não 140px. Eu medi e trouxe a divergência em vez de escolher; o
fundador decidiu que vale a medida, não o texto — Termos fica com o espaço
menor, diferente das outras quatro. **Vai para a lista "o que foi pedido ao
Design"**: corrigir o texto do documento na fonte, para a próxima entrega
não repetir a divergência entre o que ele afirma e o que ele desenha.

**O portão do teclado — medido, condição cumprida antes de commitar.** Proxy
de teclado (viewport 375×400, o mesmo encolhimento que um teclado aberto
causa) nas telas que foram para 140px:

- **Entrar** — campo Senha em foco visível, botão Entrar alcançável rolando,
  alturas intactas (campo 56px, botão 60px).
- **Criar conta** (a mais exposta — cinco campos, aceite dos Termos, botão) —
  campo Telefone em foco visível (top 171,8 / bottom 227,8, dentro dos
  400px), botão Criar conta alcançável (top 247,98 / bottom 307,98),
  alturas intactas.
- **Esqueci a senha** — campo E-mail em foco visível, botão alcançável,
  alturas intactas.
- **Redefinir senha, estado "link expirado"** (o único alcançável sem um
  código de redefinição real) — conteúdo mais curto que os três acima, passa
  com folga. O estado "link válido" (campo Senha nova) não foi medido
  diretamente — teria exigido gerar um código real de redefinição — mas tem
  menos conteúdo que Esqueci a senha, que já passou com folga.

Nenhuma tela apertou. Nenhum valor foi ajustado por conta própria.

**`/revisar` achou quatro divergências e três lacunas, quatro aceitas e
corrigidas antes do commit** (mesma classe — precisão de texto e registro no
diário —, sem novo passe, por decisão do fundador): a entrada do diário
faltava, o pedido ao Design não estava registrado, `docs/estilo.md` e o
comentário de `Marca.tsx` diziam "quatro telas com subtítulo" quando nenhuma
das quatro tem subtítulo construído (só o mockup desenha, e isso já estava
registrado como não-construído), e `referencia/LEIA-ME.md` ainda descrevia o
documento como origem de um valor só, de 14/08. As outras duas lacunas —
estados herdados sem decisão própria, e `mb-140` fora da escala — ficam
resolvidas por este parágrafo e pela nota já existente de que o valor é
lacuna de propósito, não esquecimento.

Esta tarefa não fazia parte da ordem das quatro tarefas técnicas da
auditoria de segurança (entrada de 15/08/2026, abaixo) — foi pedido à parte
do fundador. Próximo: retoma a tarefa 2 daquela auditoria (trava de
importação do cliente sem filtro de empresa), na ordem já decidida.

---

## 15/08/2026 — auditoria de segurança e as quatro tarefas que ela abriu

Pedido do fundador: auditoria das cinco classes de proteção do produto —
isolamento no banco, permissão decidida no navegador, acesso a dado alheio por
identificador, segredo no código, entrada não tratada —, separando o que é
estrutural do que depende de alguém lembrar. A auditoria em si não é
documento — viveu na conversa, e o que fica registrado é o que ela abriu:
quatro tarefas, nesta ordem, decidida pelo fundador para entrar **antes** do
item 4 (Lista de fretes), que era o próximo. Razão: as quatro são sobre
proteção que já deveria existir, e os itens 5 e 6 da ordem de construção criam
tabela nova — exatamente onde a política errada da tarefa 1 passaria em verde.

1. **O teste de RLS lê a política, não a conta.** Achado da auditoria: uma
   tabela nova com a política copiada de `municipio` (`USING (true)`) passa em
   verde nos seis arquivos de teste hoje, porque `schema.test.ts` só exige "pelo
   menos uma política" — nunca lê o que ela diz. E os sete blocos de
   `vazamento.test.ts` (um por tabela, escrito à mão) significam que tabela
   nova sem bloco novo não falha nada.

   Plano aprovado e commitado: `docs/planos/auditoria-1-teste-le-a-politica.md`.
   **Medido antes de desenhar**, não deduzido: leitura de `pg_policies` no
   banco de desenvolvimento revelou que política `PERMISSIVE` se combina com
   OU — duas políticas na mesma tabela significam "passa se qualquer uma
   deixar". Isso muda a correção: verificar "existe uma política boa" resolve
   só metade, porque uma política ruim **acrescentada** ao lado da boa abre a
   tabela sem apagar nada. A regra certa é "não existe nenhuma ruim" — os seis
   campos de cada política (nome, papéis, permissiva/restritiva, comando,
   `USING`, `WITH CHECK`) comparados por igualdade exata contra o catálogo.

   Acréscimo do fundador ao plano: a tabela de sondagem do contraste (que
   nasce com política aberta de propósito, para provar que o teste novo
   reprova) precisa ser derrubada mesmo se a medição falhar no meio —
   `DROP TABLE IF EXISTS` em duas camadas (`finally` da criação-e-medição, e
   `afterAll` do arquivo), não uma só, porque cada uma cobre uma janela de
   falha diferente.

   **Achado durante a construção, que corrigiu o `CLAUDE.md` §9.** Antes de
   escrever a comparação de campos, medi o que o parágrafo do §9 afirmava —
   "sem `WITH CHECK`, a leitura fica travada e a escrita não" — com duas
   tentativas de `INSERT` reais, como `fretigate_app`, contra tabelas de
   sondagem criadas e derrubadas na hora:

   - `USING (empresa_id = contexto)` **sem** `WITH CHECK`: o `INSERT` gravando
     `empresa_id` de outra empresa foi **recusado**. O Postgres deriva o
     `WITH CHECK` do `USING` quando ele falta, em política `ALL` — a frase do
     §9 estava errada nesse caso específico.
   - `USING (true)` (a cópia de `municipio`) **sem** `WITH CHECK`: o mesmo
     `INSERT` foi **aceito**. O perigo é o `USING` aberto, não a ausência do
     segundo campo isolada.

   O §9 foi corrigido para o mecanismo medido, mantendo a exigência de
   `WITH CHECK` explícito por convenção do projeto (o que as 14 políticas de
   hoje já fazem), não por necessidade técnica — decisão do fundador, para não
   deixar uma migration futura escrever só `USING`, certa por sorte porque o
   `USING` também estava certo, indistinguível do caso perigoso sem ler o
   texto da política. O teste segue como planejado, sem mudança de desenho.

   **Construída, testada e revisada.** `tests/isolamento/schema.test.ts`
   compara os seis campos de cada política contra o catálogo (com o
   contraste: uma tabela de sondagem, política aberta de verdade, derrubada
   em duas camadas). `tests/isolamento/vazamento.test.ts` trocou os sete
   blocos escritos à mão por um laço guiado pelo catálogo, com as duas travas
   — tabela declarada (trava 1) e tabela semeada (trava 2). Suíte inteira
   verde: 179 testes, 14 arquivos. Lint e checagem de tipo limpos.

   **`/revisar` achou cinco coisas, todas aceitas.** A primeira versão da
   correção do §9 dizia que `USING` e `WITH CHECK` precisam ser "idênticos" —
   frase larga demais: contradizia o próprio §2, que já registra a política
   de `municipio` (`USING (true) WITH CHECK (false)`) como a solução
   *correta*. Corrigido: a exigência é as duas cláusulas **explícitas**, não
   iguais — política de isolamento leva o mesmo texto nas duas por decisão de
   desenho, `municipio` é a exceção assimétrica de propósito, e as duas
   cumprem "explícito" igualmente. O comentário equivalente em
   `schema.test.ts` já estava certo; foi o `CLAUDE.md` que preciso alinhar. A
   tabela de sondagem em `schema.test.ts` ganhou marca de execução (mesma
   técnica de `A`/`B` em `vazamento.test.ts`) — sem ela, duas execuções da
   suíte ao mesmo tempo derrubariam a sondagem uma da outra, e o teste
   reprovaria pelo motivo errado. E este parágrafo mesmo: a versão anterior
   dizia "ainda não construída" sobre uma tarefa que, no momento em que o
   diff foi mostrado, já estava construída e testada — o diário registra onde
   o trabalho parou, e dizer o contrário do que o commit contém quebra
   exatamente essa função.

2. Trava de importação do cliente sem filtro de empresa: existe hoje só como
   frase em `sem-filtro-de-empresa.ts:34`, não em `eslint.config.mjs`. Vira
   regra de verdade, mais uma contra construir cliente de banco próprio fora
   de `src/lib/db`. Se algo impedir, a frase sai e o motivo fica escrito.

3. Mecanismo de sessão para ação de servidor — hoje sobrevive por acidente
   feliz (`empresaId` só existe na sessão), não por trava. Opções de desenho
   trazidas ao fundador antes de escolher, mesmo tratamento que o `db()` teve
   para o filtro de empresa. Mais: teste de sessão e papel, incluindo
   `exigirDono` (nunca rodou uma vez) e `sairDaConta` (única ação sem
   `exigirSessao()`).

4. Passo de varredura de segredo na esteira — hoje a limpeza do histórico é
   disciplina, não mecanismo.

**As duas pendências da auditoria entram em commit próprio**, antes das quatro
tarefas técnicas — decisão do fundador, pelo mesmo motivo que o §2 do
`CLAUDE.md` já registra sobre plano perdido: esperar custa risco por um
commit barato. Cabeçalhos de segurança (`Content-Security-Policy` e
correlatos — nenhum hoje, nem `next.config.ts` nem `middleware`) e o registro
de que os três canais que saem do escape do React — PDF, WhatsApp, importação
por IA — ainda não existem no produto: quando cada um nascer, a auditoria
daquela classe se refaz, não se presume herdada.

Próximo: construir a tarefa 1 (plano já aprovado), depois 2, 3 e 4, na ordem —
uma por vez, cada uma testada e commitada antes da seguinte (`CLAUDE.md` §2).
O item 4 (Lista de fretes) volta a ser o próximo depois das quatro.

---

## 14/08/2026 — a marca do FretiGate no topo das telas de fora de sessão

Plano aprovado e commitado antes da construção:
`docs/planos/marca-nas-telas-de-fora-de-sessao.md`.

Cinco telas passaram a abrir com a marca centralizada — Entrar, Criar conta,
Esqueci a senha, Redefinir senha e Termos no modo cadastro —, mais os estados
**Recuperação enviada** e **link expirado**, que herdam por dividirem rota.
Componente único, `src/components/auth/Marca.tsx`. A marca entra dentro dos
66px de área segura que toda tela já reserva, e o conteúdo desce ≈53px a
partir dela. `public/` nasceu neste commit (não existia), com
`public/marca/fretigate.png` — **cópia** de `referencia/marca/LOGOMARCA
colorida sem fundo.png`, não import de lá, para o `referencia/LEIA-ME.md`
continuar verdadeiro quando diz que nada daquela pasta é importado por
`src/`. O preço é que trocar a marca é trocar as duas, e isso está escrito lá.

**Construção provisória, e é a parte que mais importa registrar.** Decisão de
tela é do Design (`CLAUDE.md` §13), e os três valores vieram do documento
dele, que se marca a si mesmo como aproximação não confirmada. Só um deles
não tem lastro na folha de estilo — a largura de 140px —, e ele entrou como
**lacuna aberta** em `docs/estilo.md`, no mesmo formato do precedente da
margem inferior padrão. Os 24px até o título estão na escala; os 66px do topo
são a área segura que já existia, confirmada pelo fundador.

**O que foi pedido ao Design** (`CLAUDE.md` §13 — correção de estado feita
aqui entra também nesta lista): largura definitiva da marca · distância dela
até o título · confirmação do respiro do topo · se o título passa a
`28px/800` · se entra o subtítulo — as duas últimas o mockup dele desenha e
**não** foram construídas, porque não foram pedidas e o título contradiria a
folha de estilo · se sai uma versão vetorial da marca, hoje só PNG · e se
Aceitar convite leva a marca do FretiGate junto da marca da empresa que
convidou.

**Medido, não deduzido**, com o navegador em 375×812: largura 140px, topo da
marca em 66px, marca→título 24px, desvio de centralização 0,1px, papel
`rgb(250,248,244)`. Deslocamento acumulado de layout **zero** — as dimensões
intrínsecas (1920×394) reservam o espaço antes de a imagem chegar, e o Next
serve uma versão de 384px, não os 1920 originais. `/termos` sem
`?de=cadastro` não tem marca, e o título volta aos 66px.

**Teclado, a conferência que o fundador pediu.** Proxy: viewport encolhida
para 375×400, que é o que um teclado aberto faz com a área visível. Em Criar
conta, com o último campo em foco, o campo fica inteiro visível e o botão
"Criar conta" fica alcançável rolando — e nada encolheu para caber
(`CLAUDE.md` §8): botão ainda 60px, campos ainda 56px, altura total da página
idêntica à de 812px de viewport. **É proxy, não celular de verdade** — a
conferência final no aparelho é do fundador.

**Achados do `/revisar`, corrigidos antes do commit** (sete, todos aceitos):
a seção nova que eu tinha escrito em `docs/componentes.md` era **desenho**, e
desenho é do Design — o plano previa só as linhas da tabela, e eu tinha feito
mais do que ele dizia; a seção foi apagada e ficaram as sete linhas marcadas
como provisórias. O diário estava sem esta lista de pedidos ao Design. Eu
tinha escrito "as cinco telas sem barra", e a lista fechada de telas sem
barra tem **seis** (inclui Aceitar convite) — número certo com rótulo errado,
em dois documentos. `docs/estilo.md` passou a se contradizer: a linha "nenhuma
cor além destas aparece no produto" contra o `#0C311B` da marca — resolvido
tornando a frase **precisa** (ela sempre falou de cor escolhida e escrita em
CSS, nunca de cor dentro de imagem), não abrindo exceção, e com a condição
escrita de que, se a marca virar SVG no código, aquele verde precisa entrar
na tabela antes. O `.gitignore` tinha a mesma frase que eu corrigi no
`LEIA-ME` e não corrigi lá ("o que o app usa sao os .png exportados") — é o
`CLAUDE.md` §6, que nomeia o `.gitignore` como lugar de conferir. O documento
do Design só existia na pasta de downloads do fundador, sendo a única fonte
dos 140px — commitado em `referencia/Design/`, com a razão de ele ficar
versionado apesar de ser bundle escrita no `LEIA-ME`. E eu tinha afirmado que
Aceitar convite não leva a marca "porque são coisas diferentes", quando
ninguém decidiu isso — virou pergunta ao Design.

Próximo: item 4 — **Lista de fretes e detalhe do frete**
(`docs/especificacao.md` §9), que já era o próximo antes desta tarefa entrar.

## 14/08/2026 — tarefa 4 do item 3 fecha: medição dos 10%, duas ferramentas

Última tarefa do item 3 (`docs/planos/item-3-lancamento-frete.md`). Duas
ferramentas: `npm run medir:municipios -- --empresa=<id>` (uso real, por
empresa) e `tests/regressao-resolucao-municipios.test.ts` (dentro de
`npm test`, contra uma lista fixa de 41 textos — nunca dado de cliente).
Ambas chamam `medirResolucaoDeMunicipios` (`src/lib/servicos/medicao-
municipios.ts`), que reaproveita `resolverMunicipio` sem reimplementar nada.

**Dois passes de `/revisar`, e os dois acharam classe nova — por isso dois,
não laço** (`CLAUDE.md` §2). O primeiro achou quatro coisas reais: a unidade
de contagem era "campo" no código e "frete" na especificação (mantido
campo — origem vem pré-preenchida, destino é digitado, são problemas
diferentes, e contar por frete esconderia qual dos dois falhou); o passo da
esteira, como planejado ("rodar contra a empresa de teste"), não sobrevive
ao próprio desenho da suíte, que semeia e apaga cada empresa a cada arquivo
— virou teste fixo, dentro de `npm test`; `scripts/` como pasta nova não
tinha exceção no `CLAUDE.md` §6; e `--empresa=<id>` como argumento de
terminal não tinha nota nenhuma sobre a regra do §3.

O segundo passe (depois de aplicar o primeiro) achou seis coisas novas —
prova de que valia rodar de novo: a nota que eu tinha acrescentado ao §3
enfraquecia a regra em vez de fortalecer (tirada; a explicação inteira ficou
só no §6, sobre o que `/scripts` é); o plano estava sendo reformulado no
mesmo commit que o implementava (fica em commit separado, plano primeiro);
uma data errada (uma decisão de 09/08 sobre "frete" ganhou o texto de
"campo" sem trocar a data); `municipios.json` citando o caminho antigo do
gerador; um comentário esquecido em `src/lib/servicos/municipios.ts`; e a
árvore do §6 quebrando a frase no lugar errado. Mais um achado, o mais
importante dos dois passes: a lista fixa de regressão reaproveitava o
limite de 10% pensado para uso real, e numa lista de 41 itens isso quase não
detecta nada — uma falha nova sobe de 3 para 4 (9,8%), ainda abaixo do
limite. Trocado por "desvio do número de falhas esperado", que é o critério
que faz sentido para uma lista com contagem conhecida.

**A seed de municípios mudou de `/prisma/seed` para `/scripts/seed`**, no
mesmo commit que criou `/scripts` — mesma classe de ferramenta operacional
que o comando de medição, e ficar em `/prisma` era falta de nome próprio,
não decisão. Toda referência viva foi atualizada (`package.json`,
`prisma/schema.prisma`, `tests/municipios.test.ts`,
`docs/especificacao.md`, os próprios arquivos da seed); `docs/diario.md` e
`docs/planos/item-2-cadastros.md` **não** — são registro do que era
verdade naquele momento, e editar isso apagaria a diferença entre o
decidido e o que mudou depois.

Item 3 fecha aqui inteiro. Próximo: item 4 — **Lista de fretes e detalhe do
frete** (`docs/especificacao.md` §9).

## 14/08/2026 — tarefa 2 do item 3 fecha: cronômetro medido, 26 segundos

A tarefa 2 (tela de lançamento) tinha o código commitado desde 11/08/2026,
mas o portão de saída — cronometrar os 30 segundos no celular de verdade —
nunca tinha sido medido com número nenhum. As três entradas seguintes (12,
13 e 14/08, abaixo) são achados e correções de UX encontrados **tentando**
medir, não a medição em si; a mais recente terminava com uma pendência sem
resposta, sobre se rolar de volta para editar o valor (depois da correção do
cartão fixo, mesmo dia) incomodava.

Medido agora pelo fundador, no celular, com cliente/caminhão/motorista já
cadastrados: **26 segundos em média**, dentro da meta do §1. Onde o tempo
foi: digitar o valor, e digitar origem/destino. A pendência da rolagem está
resolvida, não só registrada — "o cartão do valor rolou junto normal, como
é pra ser", sem atrito.

Tarefa 2 fecha aqui. Próxima: tarefa 3 do item 3 — aviso do sistema com
"Já recebi" (`docs/planos/item-3-lancamento-frete.md`, Tarefa 3).

## 14/08/2026 — tarefa 3 do item 3: aviso do sistema e "Já recebi"

Plano de execução aprovado na conversa (não commitado à parte — a Tarefa 3
já estava descrita em `docs/planos/item-3-lancamento-frete.md`, aprovado em
11/08/2026; esta sessão só operacionalizou o schema/arquivos que faltavam).

**"Novo frete" — decisão do fundador, revertida na mesma sessão por regra
escrita.** O pedido original trocava o segundo botão do aviso de "Ver o
frete" (adiado para o item 4) por "Novo frete", pensando em economizar o
toque de quem lança fretes em sequência. `docs/navegacao.md` linha 88 já
tem a regra oposta, escrita antes desta tarefa: "O (+) abre Lançar frete de
qualquer lugar. **Não existe botão flutuante separado de novo frete**." O
fundador reverteu ao ver a regra: o (+) já fica permanente e visível na
mesma tela onde o aviso aparece, então não é toque perdido, é o toque
previsto. Fica só **"Já recebi"**, como o plano original previa.

**Achados do `/revisar`, corrigidos antes do commit:**

- `criarTituloJaRecebiAction` recebia `servicoId` sem schema — `CLAUDE.md`
  §4 ("toda entrada validada no servidor, com schema"), mesma classe já
  corrigida na Tarefa 2 para o cadastro rápido. Ganhou `z.object({
  servicoId: z.string().uuid() })`.
- `criarTituloReceber` era um primitivo genérico exportado ("o item 6
  também vai usar") sem segundo chamador real — `CLAUDE.md` §6, "nada de
  arquivo para depois". Dobrado para dentro de `criarTituloJaRecebi`; o
  item 6 ganha a própria função quando existir.
- **A corrida na recusa de segundo título — o achado mais sério.** A
  checagem original (`buscarTituloPorServico` antes do `create`) tem
  janela de corrida sob concorrência real: dois pedidos simultâneos passam
  os dois pela checagem antes de qualquer `INSERT` terminar. Contra
  exatamente o cenário que motivou o pedido do fundador (o aviso reaberto
  por navegação/recarga, permitindo um segundo toque em "Já recebi").

  A correção não podia ser "um título por frete" — `CLAUDE.md` §9 e
  `docs/especificacao.md` preveem mais de um título por frete (adiantamento
  + saldo, item 6). A distinção que importa é *o que* o título representa,
  não *quantos* existem: **`integral`** (`Boolean`, nova coluna) diz se um
  título cobre o valor inteiro do frete, em oposição a uma fração dele.
  Nomeado pelo significado, não pelo mecanismo — a primeira tentativa
  (`via_ja_recebi`) nomeava o botão, e o fundador pediu a correção: o campo
  precisa continuar certo no dia em que outro caminho, não só "Já recebi",
  criar um título integral. Significado registrado em
  `docs/especificacao.md`, entidade TituloReceber.

  Garantia em banco, não em código: índice único parcial
  `titulo_receber_um_integral_por_servico` em `(servico_id) WHERE integral
  = true AND arquivado_em IS NULL` (migration
  `20260814150000_titulo_integral_unico_por_frete`) — mesma técnica de
  `Cliente.documento`. `criarTituloJaRecebi` mantém a checagem rápida
  (`buscarTituloPorServico`, resposta melhor no caso comum) e traduz o erro
  de unicidade do Postgres (`P2002`, mesmo padrão de
  `ehDocumentoDuplicado` em `clientes.ts`) para a mesma mensagem —
  garantindo mesmo quando os dois pedidos passam pela checagem rápida ao
  mesmo tempo. `tests/titulos.test.ts` mede isso com concorrência real
  (`Promise.allSettled`, duas chamadas simultâneas, conferido pelo banco:
  exatamente um título) — não duas chamadas em sequência, que não provariam
  nada (mesmo princípio do teste de `numero` em `tests/servicos.test.ts`).

**Pendências registradas, não corrigidas:**

- `relatorio_id` em `titulo_receber` nasce sem chave estrangeira — a
  tabela `Relatorio` só existe no item 7. Quem construir o item 7 adiciona
  a FK por migration própria.
- Redação das mensagens do aviso ("Este frete já tem título lançado.") não
  está em nenhum documento — mesma situação de toda mensagem de erro já
  registrada em tarefas anteriores. Pedido ao Design.
- **Animação de entrada do aviso do sistema — decisão do fundador, deixar
  sem.** `docs/componentes.md`/`docs/estilo.md` mencionam um deslocamento
  de 18px na entrada, mas nenhum documento define duração, curva ou
  direção. `AvisoDoSistema` entra sem nenhuma animação (aparece seco).
  Fundador: aviso seco não é defeito, e animação não formalizada seria
  valor inventado (`CLAUDE.md` §8). Fica como pedido ao Design formalizar
  a animação como token — aí sim entra no componente.

## 14/08/2026 — correção: cartão fixo em "Lançar frete" durante a rolagem

Plano aprovado e commitado em 13/08/2026:
`docs/planos/correcao-cartao-fixo-lancar-frete.md`.

Achado do fundador, testando no celular: o cartão escuro do topo (data +
valor) ficava fixo durante a rolagem, enquanto o resto do conteúdo
(Motorista, Origem, Destino, Salvar frete) rolava normalmente. Investigação
antes do plano confirmou que não era regressão da tarefa de 13/08 (teclado
mostrando o valor) — a estrutura de três blocos já nascia assim na criação
da tela, 11/08/2026 (entrada acima, agora com nota de desatualização).

**O que mudou** (`TelaLancarFrete.tsx`): o cartão escuro saiu do bloco fixo
que existia fora do formulário e passou a ser o primeiro item dentro do
bloco rolável, junto de Cliente/Caminhão/Motorista/Origem/Destino/Carga/Km.
A folga do topo (antes `pt-66`, fixo) passou a usar
`var(--area-segura-topo)`, a mesma técnica de toda outra tela do produto. O
rodapé (teclado numérico + "Salvar frete") não mudou — continua fora da
área de rolagem, por ser a única exceção documentada em
`docs/componentes.md`, "Posição".

**Divergência do plano, achada pelo `/revisar`:** o plano mandava `mb-20`
no cartão, para "preservar a distância visual atual" (20px). Medido no
navegador: `mb-20` somado ao `gap-6` do container dá **26px**, não 20 — a
conta do plano estava errada. `mb-14` + `gap-6` = 20px, batendo com o gap
original (`py-20` do bloco rolável de antes). O código ficou com `mb-14`,
que cumpre o que o plano queria dizer; o valor escrito no plano não. Fica
registrado aqui, como o próprio plano manda quando a construção diverge
dele.

**Lacuna achada pelo `/revisar`, virou pedido ao Design:** o protótipo em
`referencia/` constrói o cabeçalho exatamente como o código **era** —
fixo, fora do bloco rolável. É evidência corroborante, nunca autoridade
(`CLAUDE.md` §13), e o fundador já tinha reportado o cabeçalho fixo como
defeito antes desta investigação — sinal mais direto que o protótipo. Ainda
assim, fica pendente confirmar com o Design: se o cabeçalho fixo foi desenho
deliberado que nunca virou regra escrita em `docs/componentes.md`, o motivo
importa e pode pedir reavaliação; se não foi, o protótipo precisa ser
atualizado para acompanhar.

**Verificado no navegador** (`lint`, `tsc --noEmit`, `npm test` — 158/158 —,
e inspeção visual em viewport de celular): o cartão sai de cena ao rolar
para baixo (só uma tira escura de ~8px permanece visível) e reaparece
inteiro ao rolar de volta ao topo; o gap entre o cartão e "Cliente" mede
20px, igual ao original; tocar no valor ainda abre o teclado numérico
mostrando o valor sendo digitado (correção de 13/08 intacta); "Trocar"
ainda abre a folha de calendário por cima do cartão; "Salvar frete"
continua fixo no rodapé em qualquer posição de rolagem.

**Pendência de UX, o fundador pediu para observar:** com o cartão rolando,
o campo de valor — o mais tocado da tela — deixa de estar sempre à mão.
Antes, bastava tocar; agora, se a tela já estiver rolada para baixo (por
exemplo, depois de preencher Motorista/Origem/Destino), corrigir o valor
exige rolar de volta ao topo primeiro. No fluxo natural de uso (abrir a
tela → tocar no valor, que é a segunda coisa visível → preencher o resto)
isso não custa nada, porque o cartão ainda está no topo na primeira vez que
se toca nele. O custo aparece só ao **voltar** a editar o valor depois de já
ter rolado — um caso plausível (perceber um erro de digitação tarde) mas
não o caminho principal. Não consegui testar esse ponto com um gesto de
rolagem real de dedo: o clique/scroll da ferramenta de automação ficou
instável nesta sessão (todo clique virava seleção de texto em vez de toque),
e a rolagem foi verificada programaticamente (`scrollTop`), não por gesto.
Recomendo conferir no celular de verdade antes de considerar isto fechado —
é exatamente o tipo de atrito que só aparece usando com o polegar, e a
métrica do §1 (30 segundos) é sensível a isso.

## 13/08/2026 — correção: teclado escondendo o valor e botão "Salvar frete" apertado no canto

Plano aprovado e commitado antes da construção:
`docs/planos/correcao-teclado-e-botao-lancar-frete.md`.

Continuação do achado de 12/08/2026 (abaixo): o teclado numérico sobreposto
de Lançar frete cobre a tela quase inteira no celular, escondendo o valor
grande do cabeçalho — quem digita não vê o que está digitando. Numa segunda
captura, o fundador também circulou o botão "Salvar frete", com o problema
"a frase 'Salvar frete' e o valor estão no canto do botão, não está com
design legal" — rótulo e valor colados nas bordas, sem respiro.

**O que mudou:**

1. O valor sendo digitado passa a aparecer dentro do próprio teclado
   (`TecladoNumerico.tsx`), no lugar do rótulo fixo "Valor do frete".
2. Enquanto o teclado está aberto, o valor grande do cabeçalho escuro
   (`TelaLancarFrete.tsx`) para de renderizar — o valor existe visível em um
   lugar só de cada vez, por código, não por coincidência de tamanho de
   tela (a captura original mostrava uma fatia do valor do cabeçalho ainda
   cortada, visível por cima do teclado).
3. `Botao.tsx` ganhou a prop `distribuido`, que aplica o padding lateral já
   documentado (`24`/`22`, `docs/componentes.md` "01"/"02") a um botão de
   largura total cujo conteúdo fica nas duas pontas em vez de centralizado
   — caso que a regra escrita não previa. "Salvar frete" passou a usar essa
   prop em vez de padding solto na instância.

**Achado do `/revisar`, corrigido antes do commit:** o valor dentro do
teclado tinha entrado no tamanho de "linha recolhida" (`16.5px/700`,
Secundário) — só porque, no momento em que o teclado está aberto, aquele
valor é o único visível na tela e assumiu o papel do valor principal
(`docs/estilo.md` § Tipografia: "valor em dinheiro... não perdem peso em
nenhuma tela"). Testado no navegador com o valor-teto (`R$ 999.999,99`,
`TETO_CENTAVOS`): `text-heroi-detalhe` (46px) quebra em duas linhas nessa
largura; `text-nome-destaque` (26px/800, `docs/estilo.md`) cabe inteiro ao
lado do "Pronto" sem quebrar — é o tamanho já documentado usado.

**Pedido ao Design — três itens, ainda sem resposta:**

1. A regra de padding lateral de `docs/componentes.md` ("01 — Principal" /
   "02 — Secundária") não cobre botão de largura total com conteúdo
   distribuído nas duas pontas (hoje só prevê texto único centralizado).
2. O cabeçalho do teclado numérico de Lançar frete passou a mostrar o valor
   sendo digitado em vez do rótulo fixo "Valor do frete" — não está descrito
   em `docs/componentes.md` nem em `docs/navegacao.md`.
3. O tamanho desse valor (`text-nome-destaque`, 26px/800) foi escolhido por
   ser o maior já documentado que coubesse na linha sem quebrar — não por
   ter sido desenhado para este caso.

`.claude/launch.json` (arquivo de configuração da ferramenta de preview,
gerado por máquina — presente desde 12/08/2026) entrou no `.gitignore`
nesta tarefa: estava sem rastrear havia dias, sujando o `git status` para
sempre.

## 12/08/2026 — correção: login pelo celular era recusado (origem não confiável)

Plano aprovado e commitado antes da construção: `docs/planos/
login-origem-confiavel.md`.

O fundador reportou mensagem genérica ao errar a senha em `/entrar`, pelo
celular — e corrigiu a própria investigação inicial: o problema não era a
mensagem, era o **login sendo barrado**. Causa confirmada por leitura do
código-fonte instalado (`node_modules/better-auth`): o `better-auth` valida
a origem de todo `POST`, inclusive `/sign-in/email`, contra uma lista de
origens confiáveis — mecanismo **separado** do `allowedDevOrigins` do
Next.js (aquele só protege `/_next/*`). Por padrão a única origem confiável
é o `baseURL` (`NEXT_PUBLIC_APP_URL`, `http://localhost:3000`); um login
pelo celular batia em `403 INVALID_ORIGIN` antes mesmo de conferir a senha.

**A lição maior que o defeito, achada pelo `/revisar` — e errada na
primeira tentativa de escrever ela.** A primeira versão do conserto
(`src/lib/auth/index.ts`) copiou a técnica de `next.config.ts` — um
padrão de texto com `*` (`"192.168.*.*"`) — achando que fosse a mesma
proteção já resolvida ali. Não é: o padrão confiava em **qualquer origem
começando com "192.168." e terminando nos segmentos certos**, inclusive
um domínio de verdade (`192.168.atacante.com` bate, se alguém já tiver
`atacante.com` e criar esse subdomínio).

O primeiro registro deste achado, aqui mesmo, disse que o mecanismo do
Next.js (`matchWildcardDomain`, que compara por segmento de host) era
"seguro contra domínio disfarçado" ao contrário do glob de texto livre do
`better-auth`. **Essa distinção também estava errada**, e o próprio
`/revisar` achou o mesmo furo em `next.config.ts` na sequência: um
domínio de 4 partes (`192.168.evil.com`) tem exatamente os 4 segmentos
que o padrão espera, e "comparar por segmento" não exige que o segmento
seja numérico — "evil" satisfaz um `*` tão bem quanto "168". Lição errada
registrada é pior que lição nenhuma; por isso a correção fica aqui, não
só uma nota nova por cima.

**A lição certa, mais simples e mais geral que as duas versões
anteriores:** curinga em texto nunca é o mesmo que verificar formato. Se
o que importa é "isto é um endereço de rede local", a única forma segura
é conferir que é um endereço — não que o texto se parece com um. Os dois
lugares corrigidos (`src/lib/auth/index.ts`, com uma função que valida o
host por regex de IP; `next.config.ts`, computando os endereços de
verdade desta máquina via `os.networkInterfaces()` a cada início do
servidor) param de comparar texto e passam a verificar o formato. Mesma
família do §9/`postgres` (`CLAUDE.md` §2): parecia conferido, duas vezes
na mesma sessão, e não era — a segunda vez sendo o próprio registro desta
lição.

**Nova regra no `CLAUDE.md` §2**, do mesmo achado: uma correção "de
propósito próprio" — não pedida, feita "já que estou aqui" — passou a ter
o mesmo defeito que qualquer decisão de produto tem quando ninguém
confere: checar `error.status === 401` além do código exato (para
resistir a resposta sem JSON válido) rotularia uma falha de sessão do
servidor com senha **certa** como "senha incorreta" — pior que a mensagem
genérica que a correção queria melhorar. Revertido; fica só o código
exato, como já era antes.

**Também corrigido, achado pelo `/revisar`:** `src/components/auth/
PedidoDeRecuperacao.tsx` (Esqueci a senha) tinha a mesma falta de
`try`/`catch` das outras duas telas — ficou de fora do escopo original por
não ter sido olhada.

**Pendência menor registrada, não corrigida:** a mensagem nova "Sem
conexão com o servidor. Confere sua internet e tenta de novo." não está em
nenhum documento — mesma situação de toda mensagem de erro já existente
nestas telas, nenhuma delas especificada individualmente em
`docs/componentes.md`.

Verificado direto contra o servidor: login pelo endereço da rede local
(`http://192.168.1.10:3000`) com senha certa entra, com senha errada
mostra a mensagem certa; login por `localhost:3000` continua funcionando;
uma origem estranha de verdade (`https://evil.com`) continua recusada —
a faixa privada não abriu mais do que devia.

### Segundo passe do `/revisar` — dois ajustes mecânicos, e um achado grave à parte

`docs/planos/login-origem-confiavel.md` tinha sido escrito já com a
correção do curinga dentro dele — errado: plano é o que foi aprovado
**antes** da construção, congelado; o que mudou durante (o curinga, o
401 revertido, a extensão a `PedidoDeRecuperacao.tsx`) é divergência, e
divergência mora aqui no diário, não reescrita para dentro do plano.
Corrigido: o arquivo agora reflete exatamente o que foi aprovado.

"Confira sua internet" virou "Confere sua internet" — a frase misturava
tratamento (`confira`, imperativo de "você"; `tenta`, imperativo de "tu")
dentro da mesma mensagem, contra o tom já estabelecido em toda mensagem de
erro do produto ("Tenta de novo em instantes", sempre "tu").

**Achado grave, fora do escopo original desta correção — decisão do
fundador: corrigir na mesma sessão, não deixar pendência.** O
`allowedDevOrigins` de `next.config.ts` (a correção anterior, para os
recursos `/_next/*`) tinha a **mesma classe de furo** que o
`trustedOrigins` teve — ver a lição reescrita acima. Corrigido: em vez de
qualquer padrão de texto, `next.config.ts` agora computa os endereços
IPv4 de verdade desta máquina (`os.networkInterfaces()`) a cada início do
servidor. Deixar só um dos dois corrigido faria a próxima sessão ver
`next.config.ts` "corrigido" e concluir, errado, que aquilo protege.

### Terceiro passe do `/revisar` — pendência menor registrada

`trustedOrigins` (`src/lib/auth/index.ts`) fixa a porta `3000` e só cobre
`192.168.x.x`/`10.x.x.x`. Hoje bate certo com o projeto (porta de
desenvolvimento sempre 3000, `.claude/launch.json`; as duas faixas cobrem
a maioria das redes domésticas/escritório) — decisão do fundador,
12/08/2026: deixar assim, sem corrigir agora, mas registrado — se um dia
rodar em outra porta ou numa rede `172.16–31.x.x`, o login volta a ser
recusado com a mensagem genérica, e é este parágrafo que explica o porquê.

---

## 12/08/2026 — achado: teclado numérico esconde o valor em Lançar frete (celular)

Testando no celular o cronômetro dos 30 segundos (o portão de saída da
tarefa 2 do item 3, commit `2d7ae9c` — ver a entrada abaixo), o fundador
achou que o valor digitado fica escondido enquanto se usa o teclado
numérico sobreposto de Lançar frete. **Não investigado nem corrigido
ainda** — só registrado para não se perder. A tarefa 2 **continua aberta**:
o commit já feito não fecha a tarefa até o cronômetro medir os 30 segundos
de verdade, e este achado é o que está travando essa medição agora.

### Como testar no celular — vale toda vez que for cronometrar

Precisa dos dois de novo a cada sessão nova de teste (nenhum dos dois é
permanente sozinho):

1. **Subir o servidor de desenvolvimento ouvindo a rede, não só a própria
   máquina**: `npm run dev -- -H 0.0.0.0` (já é o comando configurado em
   `.claude/launch.json`, roda sozinho ao abrir o preview).
2. **Achar o endereço desta máquina na rede local** (muda se trocar de
   rede): no PowerShell, `Get-NetIPAddress -AddressFamily IPv4 | Where-
   Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress
   -notlike '169.254.*' }`.
3. No celular, **mesma rede Wi-Fi** desta máquina, abrir
   `http://<endereço-do-passo-2>:3000`.

`next.config.ts` (`allowedDevOrigins`) e `src/lib/auth/index.ts`
(`trustedOrigins`) calculam o endereço desta máquina sozinhos a cada
início do servidor — não precisa mexer em nenhum dos dois ao trocar de
rede, só o passo 2 muda (ver a entrada de 12/08/2026, "Login pelo celular
era recusado", mais abaixo, para o porquê). Se a página não abrir, pode
ser o Firewall do Windows bloqueando a porta 3000 na rede local — liberar
manualmente se acontecer.

### 13/08/2026 — evidência real do aparelho: captura de tela

O fundador mandou uma captura de tela do iPhone de verdade, testando o
cronômetro (`/fretes/novo`, "Hoje · qui, 13 de agosto", teclado numérico
do valor aberto). **Ainda não diagnosticado — só a evidência registrada,
para não se perder antes do `/clear`:**

- **O teclado numérico cobre pelo menos parte do cartão escuro do valor.**
  Na captura, só um fragmento dos dígitos do valor aparece, cortado bem
  na borda de cima do painel do teclado ("Valor do frete" / "Pronto") —
  o cartão escuro (`LANÇAR FRETE` · data · valor · sugestão) parece
  fatiado pelo teclado, não só o meio rolável das seis linhas por baixo
  dele. Isso é diferente do que o layout foi desenhado para fazer
  (`src/app/(app)/fretes/novo/TelaLancarFrete.tsx`): o teclado é
  `position: absolute` com `bottom-full` dentro de um `<div
  className="relative flex-none">` que é **irmão** do cartão escuro
  (ambos filhos do `<div className="... flex h-dvh flex-col ...">`
  raiz), então na teoria ele só deveria cobrir o que está **atrás dele
  mesmo** (o rodapé, e o que estiver logo acima por causa do
  `bottom-full`) — nunca o cartão escuro, que é outro irmão, mais acima
  na coluna. Testado no navegador do computador (emulando celular) sem
  reproduzir esse recorte — só apareceu no aparelho de verdade.

  **Hipóteses ainda não conferidas, nenhuma confirmada:**
  - `h-dvh` no Safari do iPhone pode recalcular de um jeito que o teste
    em navegador emulado não reproduz (a unidade `dvh` reage à barra de
    endereço do Safari escondendo/aparecendo, e o teclado sobreposto
    sendo `position: absolute` dentro da própria coluna pode interagir
    com isso de um jeito que só aparece com o toolbar de verdade do
    Safari, não no emulador).
  - Pode haver algum campo de texto nativo (`<input>`) com foco antes de
    abrir o teclado numérico, fazendo o teclado **de verdade** do iOS
    também abrir por baixo/ao mesmo tempo, encolhendo a área visível
    além do que o layout previu.
  - Não descartado: pode ser só um efeito da captura de tela em si (o
    momento exato do toque), não um recorte real e persistente — precisa
    confirmar se acontece toda vez ou só naquele instante.

- **"Além do erro no botão"** — o fundador circulou o botão "Salvar
  frete" na captura e mencionou um erro ali, **sem detalhar qual**. Fica
  como pergunta em aberto para a próxima sessão: o que exatamente
  acontece ao tocar nele nesse estado (não responde? erro visível? outra
  coisa?).

**Caminho mais confiável para fechar isto**: conectar o iPhone a um Mac e
usar o Safari Web Inspector (menu Develop) para inspecionar a tela ao
vivo — as ferramentas de navegador deste agente já se mostraram pouco
confiáveis para testar toque/viewport real neste projeto (ver a
investigação dos chips de "Como você conheceu o FretiGate", mais abaixo,
12/08/2026), então testar só pelo emulador de novo tem chance de não
reproduzir o defeito de novo.

**Próxima:** perguntar ao fundador o que é "o erro no botão", e investigar
o recorte do teclado sobre o valor — de preferência com acesso a
inspeção de verdade do aparelho. Só depois medir o cronômetro e fechar a
tarefa 2.

---

## 12/08/2026 — melhoria: revelar senha em Entrar e Criar conta

Plano aprovado e commitado antes da construção: `docs/planos/
melhoria-revelar-senha.md`.

Pedido do fundador, testando o app no celular: os campos de senha de
**Entrar** e **Criar conta** precisavam do botão "Mostrar"/"Ocultar" que
**Redefinir senha** já tinha desde a tarefa 8. A peça já existia
(`CampoTexto.tsx`, prop `revelavel`) — só faltava ligá-la nos outros dois
lugares.

**Duas conferências que o fundador pediu antes de aprovar, e que viraram
correção real:**

- **Alvo de toque do botão embutido: 44px, não 48px.** Mesma classe do
  achado 10 da tarefa 2 (o "Trocar" da data em Lançar frete), mas aqui a
  causa é diferente: o botão usa a variante "texto" (03) do inventário, que
  é `44px` em **todo** o app (Fechar, Cancelar, Arquivar — mais de uma
  dúzia de lugares), documentada assim de propósito. Corrigido só neste
  controle específico (`h-48!` em `CampoTexto.tsx`), sem tocar em
  `Botao.tsx` nem nos outros usos da variante — aqui o botão-texto é o
  controle inteiro de um campo, não uma ação secundária de rodapé, e por
  isso não tem a folga que os outros usos têm.
- **A senha revelada não voltava a ficar oculta depois de um erro.** Achado
  real, não hipótese: `revelado` é `useState` interno do `CampoTexto`, sem
  nada que o reseta quando o formulário ao redor re-renderiza — uma senha
  mostrada continuava mostrada depois de uma tentativa falha, nas
  **três** telas com `revelavel`, incluindo Redefinir senha (que já tinha
  esse defeito antes deste pedido). Corrigido nas três com um contador de
  tentativas por formulário, passado como `key` do `CampoTexto` da senha —
  trocar a `key` remonta só o campo (reseta `revelado`, preserva o valor
  digitado, que é controlado pelo formulário, não pelo `CampoTexto`). O
  contador só avança no caminho de erro nos três formulários — em
  `FormularioCriarConta.tsx` a primeira versão avançava em qualquer envio
  (inclusive sucesso), corrigido no `/revisar` para ficar igual aos outros
  dois.

"Não apagar a senha em caso de erro no login" já era o comportamento de
`FormularioEntrar.tsx` — nenhum branch de erro chamava `setSenha("")`.
Confirmado por leitura, sem mudança de código.

### `/revisar` — a edição em `componentes.md`, com o raciocínio certo

O primeiro passe apontou `docs/componentes.md` linhas 395/396 editadas
direto pelo repositório como uma divergência do §13 ("Desenho... continua
sendo do Design"). A correção não foi desfazer a edição — foi corrigir o
raciocínio: o §13 não diz "`componentes.md` é do Design", diz "o
repositório mantém o **estado**; o Design decide **desenho novo**". Ligar
`revelavel` — uma variante que já existe no inventário — em mais duas
telas é estado (a mesma variante, outro lugar), não desenho novo. A edição
fica. Vai para a lista do Design mesmo assim (abaixo), porque a fonte dele
precisa saber, mesmo quando o repositório está certo em editar.

### Pergunta de fundo para o Design, não pendência solta

Duas exceções ao alvo mínimo de 48px em duas tarefas seguidas — "Trocar"
(tarefa 2 do item 3) e "Mostrar"/"Ocultar" (aqui) — enquanto o resto da
variante "texto" (Fechar, Cancelar, Arquivar) segue em 44px. Duas exceções
seguidas é sinal de que a **regra** precisa de decisão, não de mais
exceção. Três saídas possíveis, nenhuma escolhida aqui:
1. a variante "texto" sobe para 48px em todo o app;
2. a regra do alvo mínimo passa a distinguir controle isolado (like este e
   o "Trocar") de ação secundária de rodapé (Fechar, Cancelar) — hoje só
   distingue link em frase corrida;
3. as exceções já aplicadas viram parte formal do inventário, com raio e
   contexto documentados, e o resto continua 44px.

### O que precisa chegar ao Design

- Confirmar "com revelar" nas linhas de Entrar e Criar conta em
  `docs/componentes.md` (estado sincronizado pelo repositório, não desenho
  novo — ver acima).
- A pergunta de fundo acima (44 × 48px na variante "texto"), com as duas
  exceções já aplicadas como evidência.

Verificado no navegador nas três telas: botão aparece, alterna
Mostrar/Ocultar, mede 48px de altura, e volta a "Mostrar" sozinho depois de
um envio com erro — em Entrar, com o campo continuando preenchido.

---

## 11/08/2026 — tarefa 2 do item 3: a tela de Lançar frete

Fecha a tarefa 2 do item 3 (`docs/planos/item-3-lancamento-frete.md`): a tela
que materializa a tese do produto. Seis peças novas — `FolhaInferior`,
`TecladoNumerico`, `FolhaDeCalendario`, `FolhaDeBusca`, `CadastroRapido` (para
cliente, caminhão e motorista) — mais a tela em si (`src/app/(app)/fretes/
novo/`), com cabeçalho fixo (data + valor), meio rolável (as seis linhas + km)
e rodapé fixo (a exceção documentada em `docs/componentes.md`, "Posição": o
teclado numérico é sobreposição, e o salvar nunca fica coberto). O (+) da
barra passou a abrir esta tela, como o item 2 já previa.

> **Desatualizado em 14/08/2026:** "cabeçalho fixo" deixou de ser verdade —
> ver a entrada de 14/08/2026, "cartão fixo em Lançar frete durante a
> rolagem", abaixo. Só o rodapé continua sendo a exceção que não rola.

**Data não estava na lista de seis linhas do plano** (cliente, caminhão,
motorista, origem, destino, carga) mas é obrigatória para salvar
(`docs/especificacao.md` §4.1) — construída no cabeçalho escuro, junto do
valor, seguindo o protótipo de referência (evidência corroborante, `CLAUDE.md`
§13) por não haver seção própria em `docs/componentes.md`.

**Tipo de operação não aparece na tela**: só existe um ativo no MVP
("Frete"), então o servidor resolve sozinho (`buscarTipoOperacaoAtivo`) — sem
campo para escolher o que não há o que escolher.

### `/revisar` — 12 divergências e 5 lacunas, tudo corrigido ou registrado

Primeiro passe achou 12 divergências. O fundador decidiu corrigir 9 delas mais
duas lacunas, e resolveu os três achados mais abertos na hora:

- **Km era gravado sem converter para metros** — `CLAUDE.md` §7 e o
  comentário do model `Servico` exigem metros; a conversão (×1000) agora
  acontece em `src/app/(app)/fretes/acoes.ts`, no mesmo lugar que já
  normaliza o resto da entrada.
- **Cadastro rápido sem schema no servidor** — as três ações
  (`criarClienteRapidoAction`/`criarCaminhaoRapidoAction`/
  `criarMotoristaRapidoAction`) agora validam com `zod`, mesma regra de
  `prazo_pagamento_dias` que `clientes/acoes.ts` já usa, e `tipo` restrito ao
  inventário de `TIPOS_VEICULO`.
- **`autoFocus` na busca abria o teclado sozinho** — contra o texto exato da
  especificação. Removido.
- **Círculo de iniciais no caminhão** — regra é só de cliente/motorista
  (`ListaCaminhoes.tsx` já registra a decisão contrária). `LinhaDeLista`
  ganhou `iniciais` opcional; quem decide quem ganha o círculo agora é quem
  monta a lista (`TelaLancarFrete.tsx`), não o componente da folha.
- **Sombra no teclado numérico** — removida; sombra é exclusiva do aviso do
  sistema.
- **Fonte fora do sistema e alvo de toque pequeno no "Trocar"** — trocado
  para `text-etiqueta` (10.5px, o menor token que existe) e `min-h-48`.
- **Pré-preenchia com cliente/caminhão/motorista arquivado** — a tela mostrava
  "Escolher cliente" mas mandava o id arquivado do mesmo jeito. Corrigido em
  `page.tsx`: só entra em `padrao` quem está na lista ativa.
- **Fuso horário — o achado mais grave.** "Hoje/Ontem/Amanhã" e o calendário
  usavam `Date` local (`getDate`, `new Date(ano,mes,dia)`), que lê o fuso de
  quem roda o código, não o de Fortaleza que `CLAUDE.md` §7 exige. O teste
  manual passou por coincidência — a máquina de teste também estava em
  UTC-3 — e em produção (Vercel, UTC) "hoje" viraria "ontem" depois das 21h.
  Criado `src/lib/utils/data-fortaleza.ts`: todo dia vira uma string
  `"AAAA-MM-DD"` extraída com `Intl.DateTimeFormat` de fuso nomeado, e toda
  aritmética de calendário usa `Date.UTC`/`getUTC*`, nunca os métodos locais.
  `tests/data-fortaleza.test.ts` roda a suíte inteira com `TZ=UTC` (fuso
  diferente do de quem escreveu isto e do de Fortaleza) e prova o caso exato
  da virada — 02h30 UTC ainda é 23h30 do dia anterior em Fortaleza — para não
  passar por coincidência de novo.
- **Erro de campo em silêncio** — `criarServicoAction` já roteava o erro para
  `veiculoId`/`motoristaId`/`valorCentavos`/`dataServico`, mas a tela só
  mostrava `clienteId` e o erro geral. Os quatro agora aparecem.
- **Chips de destino e carga: 5, não 8** — mesmo teto de `SUGESTOES` em
  `src/lib/servicos/municipios.ts`, mesmo motivo (cabe acima do teclado).

**Dois achados resolvidos na hora pelo fundador, sem precisar de Design:**

- **Raio da folha inferior: 22px, não 28px.** `docs/componentes.md` §11/§12
  escrevem `28px 28px 0 0`; `docs/estilo.md` § Formas diz `22px`. Mesmo
  conflito já resolvido antes para o respiro da barra e a elevação do (+), e
  a mesma resolução vale: quem manda em raio é o `estilo.md`. `componentes.md`
  precisa ser corrigido pelo Design — pendência abaixo.
- **Pílula "Última vez neste trecho" — pílula em linha (04), não pílula
  sobre escuro (05).** A 05 é exclusiva do cartão preto da dashboard e do
  aviso do sistema; a 04 já serve para elemento tocável em conteúdo, que é
  o que a sugestão é. `PilulaSobreEscuro.tsx`, criado nesta tarefa, foi
  removido por ficar sem nenhum uso real depois da correção.

**Uma investigada e descartada:** a cor `#3C443E` ("chip de sugestão") no §
Cores de `estilo.md` é formalizada (linha de tabela, não citação solta), mas
só define a **tinta do texto**, não altura/fundo/raio — não há componente
"chip de sugestão" completo em lugar nenhum do inventário. Mantido o padrão
dos chips existentes (pílula em linha); registrado como lacuna abaixo, não
corrigido, por não haver o que implementar sem inventar medida.

Segundo passe do `/revisar` **não rodou** — todas as nove correções são da
mesma classe já vista no primeiro passe (`CLAUDE.md` §2).

### Lacunas registradas, não corrigidas

- Estilo exato da pílula de sugestão de valor sobre o cartão escuro — sem
  variante fechada em `componentes.md`; o que existe hoje (pílula em linha
  padrão) é decisão provisória do fundador, não pendência de Design.
- Encolhimento do número-herói do valor por quantidade de dígitos — citado em
  `estilo.md` § Conflitos, remete a uma seção que não existe mais em
  `componentes.md`. Não implementado.
- "Chips de escolha" citados para a Folha de busca em "Onde cada tela usa o
  quê" — a folha construída não tem nenhum, e o documento não diz o que eles
  selecionariam.

### Pendências para o Design

- Unificar `docs/componentes.md` §11/§12 (`28px 28px 0 0`) com
  `docs/estilo.md` § Formas (`22px`) para "folha inferior (topo)" — o código
  segue o `estilo.md`.
- `docs/componentes.md` §11, linha 282: remover "Categoria da CNH" do
  cadastro rápido de motorista (achado no plano, 11/08/2026 — o campo não
  existe na entidade `Motorista`).
- `docs/navegacao.md` linha 18 diverge de `docs/especificacao.md` §4.1 sobre
  origem/destino/carga usarem folha de busca ou não (achado no plano).

**Cronômetro dos 30 segundos — pendente, é o portão de saída da tarefa.**
Fluxo completo testado no navegador (lançar do zero com cadastro rápido nos
três campos, chips de destino/carga, sugestão de valor, calendário,
município não resolvido, salvar e recarregar com pré-preenchimento), mas a
medição de verdade precisa do celular do fundador — não fecha sem ela.

**Próxima:** cronometrar no celular; se bater a meta, tarefa 2 fecha e a
tarefa 3 (aviso do sistema + "Já recebi") começa.

---

## 11/08/2026 — tarefa 1 do item 3: Servico, e a esteira passou a provar as migrations do zero

Fecha a tarefa 1 do item 3, conforme `docs/planos/item-3-lancamento-frete.md`
— só backend: schema, RLS, serviço, testes. Sem tela ainda (tarefa 2).

`Servico` (`docs/especificacao.md` §6): `numero` sequencial por empresa via
contador atômico (`Empresa.proximo_numero_servico`, incrementado dentro do
`emTransacao` que grava o serviço — nunca `MAX(numero)+1`), as quatro
conferências de FK (`cliente_id`, `veiculo_id`, `motorista_id`,
`tipo_operacao_id`, mais `criado_por_usuario_id` como quinta, achada pelo
`/revisar`), e resolução de município via `resolverMunicipio`, nunca
bloqueando o salvar. `src/lib/servicos/servicos.ts`, `tests/servicos.test.ts`
(20 conferências), `vazamento.test.ts` estendido.

**Quatro decisões do fundador, tomadas na revisão desta tarefa:**
- **`km` é guardado em metros**, sem exceção ao `CLAUDE.md` §7, mesmo sendo o
  número digitado à mão — para não conviver em unidades diferentes com a
  futura `distancia_m` (item 12). A tela converte na exibição/edição.
- **Tipo de operação inativo é recusado** ao lançar frete — `ativo` é escopo
  de produto, aceitar seria criar frete de um ramo que a empresa não opera.
- **Cliente/caminhão/motorista arquivado é recusado para um frete NOVO** —
  diferente do precedente de `veiculo_habitual_id` (vínculo já existente).
- **Valor zero ou negativo continua recusado** — decisão reversível: frete de
  cortesia é hipótese, valor zero por engano é o caso provável.

### Achado 1 — checksum de migration divergente do commitado

`prisma migrate dev` recusou rodar: o checksum de
`20260809021500_municipio_tabela_de_referencia` gravado no banco de
desenvolvimento não bate com o arquivo commitado — foi editado depois de
aplicado, antes do commit. Sem efeito de schema (conferido coluna a coluna,
índice, RLS, GRANT — tudo idêntico). Migration nova aplicada por
`prisma migrate deploy` (que não faz essa checagem), não por `migrate dev`.

### Achado 2 — a esteira nunca tinha subido o banco do zero, e isso escondia dois problemas

A pedido do fundador, rodei `prisma migrate reset --force` contra o projeto
de teste (autorização explícita, dado sem cliente real) para provar que as
16 (agora 17) migrations aplicam em sequência a partir de nada. Achado 1
acima é um deles. O segundo, mais sério:

**`ALTER DEFAULT PRIVILEGES ... ON FUNCTIONS ... FROM PUBLIC` nunca fechou
função nenhuma** — nem no banco recriado, nem no de desenvolvimento, que
nunca foi resetado. Medido com uma função criada de verdade e
`has_function_privilege`, em seis variações do comando. O Postgres concede
`EXECUTE` a `PUBLIC` em toda função nova, sempre; isso não passa pelo
mecanismo de privilégio padrão do jeito que tabela passa. A única proteção
real, também medida, é `REVOKE EXECUTE` direto na função, na mesma migration
que a cria — é o que já protegia `reverter_cadastro_incompleto` desde a
tarefa 8, e por isso ela nunca esteve exposta.

Registrado como regra no `CLAUDE.md` §3. A migration
`20260808052831_fecha_execucao_de_funcao_para_public`, que nunca funcionou,
foi **removida** (não só comentário corrigido) pela migration nova
`20260811120000_remove_default_privileges_de_funcao_que_nao_funciona` —
migration aplicada não se edita, e comando que parece proteger e não protege
é pior que não ter nenhum.

`tests/isolamento/privilegios.test.ts` reescrito para medir acesso de
verdade (cria tabela/função de teste, mede com `has_table_privilege`/
`has_function_privilege`) em vez de conferir se um comando foi registrado no
catálogo — o defeito que deixou isto passar despercebido até agora. Não
existe mais checagem de "função futura": é impossível de satisfazer (função
nova sempre nasce aberta), e um teste que reprova sempre ensina a ignorar
vermelho tanto quanto um que nunca reprova. A garantia de função passou a
ser sobre as que **existem**.

### `ci.yml`: `migrate deploy` → `migrate reset --force`

A esteira agora derruba o schema do projeto de teste e reaplica todas as
migrations a cada execução, não só o que faltava — é a prova permanente do
achado 2, em vez de uma conferência manual que ninguém repetiria. Custo:
esteira mais lenta (reconstrói o banco inteiro, incluindo os 5.570
municípios, a cada envio).

Trava nova, própria para este passo (`tests/guarda-do-reset.ts`,
`validarSoTeste` em `guarda-de-banco.ts`): a trava geral aprova desenvolvimento
OU teste, correta para `npm test` (só aplica migration/semeia). `migrate
reset --force` derruba o schema inteiro — um secret apontado para
desenvolvimento por engano passaria a apagá-lo. A trava nova aprova só o
projeto de teste.

### `/revisar`, segundo passe (classe nova — achado de privilégio nunca visto)

Achou, e todos corrigidos no mesmo commit: comentário de `km` ainda dizia
quilômetros num lugar e metros em outro; `CLAUDE.md` §4 citava o fechamento
de função por `ALTER DEFAULT PRIVILEGES` (tarefa 9c) como vigente; teste de
"tabela futura" sem contraste (nada provava que ele conseguiria acusar um
vazamento); semeadura de `Servico` em `vazamento.test.ts` usava
`INSERT...SELECT` de `JOIN`, que grava zero linhas em silêncio se vier
vazio — trocado por ids gerados na aplicação, como `A`/`B` já faziam.
`Empresa.proximo_numero_servico` não constava em `docs/especificacao.md` —
acrescentado.

**Próxima: tarefa 2 do item 3 — a tela de lançamento**, com o cronômetro dos
30 segundos como portão de saída (não fecha sem medir no celular).

---

## 11/08/2026 — plano do item 3: Lançamento de frete

Plano aprovado pelo fundador e commitado antes da construção começar
(`CLAUDE.md` §2): `docs/planos/item-3-lancamento-frete.md`. Corta o item em
4 tarefas — `Servico` e as quatro conferências de FK · tela de lançamento
com as três peças novas (folha inferior, folha de busca, cadastro rápido),
incluindo a sugestão de valor e o cronômetro dos 30 segundos como portão
da própria tarefa · aviso do sistema com "Já recebi" · medição dos 10% de
município não resolvido. Folha do campo que falta fica de fora desta
fatia — seus gatilhos pertencem aos itens 5, 6 e 7.

**Duas correções do fundador na aprovação:**
- **Categoria da CNH sai do cadastro rápido de motorista** — não existe na
  entidade `Motorista`, cortada em 09/08 junto com "Ano" do caminhão.
  `docs/componentes.md` ainda lista; pendente de envio ao Design.
- **Origem nunca vem preenchida do endereço da empresa** — o cadastro
  (criar conta) não pergunta endereço, então `Empresa.endereco` é sempre
  nulo para empresa nova. Corrigido no plano: origem pré-preenche com a
  origem do último frete lançado, mesmo mecanismo de cliente/caminhão/
  motorista. O pátio cadastrado (item 10) substitui isso quando existir.

**Pendente de envio ao Design** (seção própria no plano): a correção da
Categoria da CNH acima, mais a divergência entre `docs/navegacao.md`
(seis linhas abrem folha de busca) e `docs/especificacao.md` §4.1 (origem/
destino/carga têm mecanismo próprio, sem folha) — o plano seguiu a
especificação, mas os dois documentos precisam concordar.

**Próxima: tarefa 1 do item 3 — `Servico`: tabela, estados, as quatro
conferências de FK, resolução de município.**

---

## 11/08/2026 — tarefa 7: Motoristas — dados e telas

Fecha a tarefa 7 do item 2, e com ela **o item 2 inteiro** (cliente, veículo,
motorista, tipo de operação, municípios — `docs/especificacao.md` §9).

`Motorista` (`nome`, `telefone`, `documento`, `veiculo_habitual_id`), com as
mesmas regras de documento do Cliente, e as três telas (lista, perfil,
formulário) montadas com as peças da tarefa 5. RLS, política de isolamento e
`GRANT` (sem `DELETE`) no mesmo commit da tabela.

### O achado que virou regra permanente, antes de escrever código

Validar `veiculo_habitual_id` expôs que o Postgres não aplica RLS ao checar
chave estrangeira: gravar ali o identificador de um caminhão de outra empresa
passaria pelo banco sem erro. Isso não é peculiaridade deste campo — é um
furo em **toda** referência entre tabelas de domínio (frete → cliente/
caminhão/motorista, título → frete, no que vier depois). Virou regra no
`CLAUDE.md` §3, commitada e aprovada **antes** da construção
(`docs/planos/item-2-cadastros.md`, tarefa 7): toda referência desse tipo
precisa de conferência no serviço e de teste próprio. `src/lib/servicos/
motoristas.ts` confere que o caminhão pertence à mesma empresa via
`buscarCaminhao` (que filtra por empresa mas **não** por arquivado — de
propósito, ver abaixo), e `tests/motoristas.test.ts` prova a recusa entre
empresas.

### Iniciais: regra de empresa, decisão do fundador

Motorista usa a mesma regra de `Cliente` (círculo de iniciais da lista), não
a regra de pessoa reservada a `Usuario` — as duas coincidem para nome de
pessoa digitado normalmente, e divergem só quando o nome vem todo em
maiúsculas (a regra de empresa lê a primeira palavra como sigla: "EVA SOUZA"
→ "EVA", não "ES"). Consequência aceita, não motivo para implementar a regra
de pessoa agora, que continua sem nenhum código.

Por servir Cliente e Motorista, `iniciaisEmpresa` virou `iniciais` —
`src/lib/utils/iniciais.ts`, `src/app/(app)/clientes/ListaClientes.tsx` e
`docs/componentes.md` § "Iniciais da empresa" atualizados juntos.

### Caminhão habitual arquivado: continua vinculado, marcado nos três lugares

Se o caminhão habitual de um motorista é arquivado depois do vínculo, ele
**continua** aparecendo — no perfil, no chip do formulário de edição e agora
também na linha da lista —, sempre com "(arquivado)" ao lado do nome. Decisão
do fundador: sumir o vínculo em silêncio faria a pessoa achar que o caminhão
ainda existe.

### O que o `/auditar-tela` e o `/revisar` encontraram, corrigido na mesma tarefa

Todas da mesma classe — comentário impreciso ou componente copiado, sem
mudança de comportamento além do decidido:

- **`LinhaDado` copiado pela terceira vez** (Cliente → Caminhão → Motorista),
  contra `CLAUDE.md` §8 ("componente existe uma vez"). Unificado em
  `src/components/ui/LinhaDePerfil.tsx`; os três perfis foram reescritos para
  importar dali. Corrigido nesta tarefa, e não deixado para a próxima, porque
  foi esta tarefa que criou a terceira cópia — deixar para depois criaria a
  quarta.
- **Comentário de `iniciais.ts`/`componentes.md` afirmando que as duas regras
  "dão o mesmo resultado"** — falso para nome digitado em maiúsculas
  (contraexemplo acima). Reescrito com o fato exato, não a aproximação.
- **Comentário de `motoristas.ts` dizendo que `buscarCaminhao` devolve nulo
  para caminhão arquivado** — falso; ele filtra só por empresa, de propósito
  (é o que permite o caminhão arquivado continuar vinculável). O comentário
  mentia sobre o próprio motivo da regra.
- **"Cadastrar caminhão" nomeando duas ações diferentes** (navegar ao
  formulário, no estado vazio, **e** gravar, no botão principal do
  formulário) — mesmo defeito que "Cadastrar motorista" teria repetido.
  `CLAUDE.md` §8: "uma ação, um nome". Padronizado nos três cadastros:
  **"Cadastrar X"** sempre navega até o formulário (estado vazio, pílula
  "+ Novo"), **"Salvar X"** sempre grava (botão principal do formulário, modo
  criação — "Salvar alterações" já cobria a edição). Cliente já estava certo;
  Caminhão e Motorista foram corrigidos junto, com `docs/componentes.md`
  linhas 376–377 atualizadas. Caminhão está errado desde a tarefa 6 — mesma
  classe do `LinhaDado`, corrigido aqui em vez de esperar uma tarefa própria.

### Divergência do protótipo

`TelaMotoristas.dc.html` tem um campo de CNH e um segundo campo de nome que
não existem na especificação. Não incorporados — mesmo padrão das tarefas 5
e 6 (`CLAUDE.md` §13: protótipo é evidência, a especificação decide os
campos).

### O que precisa chegar ao Design

- **Texto do estado vazio de Motoristas** — não estava desenhado; construído
  seguindo o padrão de Clientes/Caminhões.
- **O convite "Cadastre um caminhão para vincular aqui."**, no formulário sem
  caminhão cadastrado — não tocável, de propósito: navegar para
  `/caminhoes/novo` perderia o que já foi digitado no formulário de
  motorista, mesmo motivo da lacuna registrada para os Termos no cadastro
  (§14 do `CLAUDE.md`).
- **Os nomes "Salvar caminhão" e "Salvar motorista"** no botão principal do
  formulário (antes "Cadastrar X" nos dois) — a fonte do Design ainda diz o
  nome antigo.
- **Telefone tocável e "Lançar frete com este motorista"**, que
  `docs/navegacao.md` linha 42 já descreve para o perfil do motorista, ficam
  de fora desta rodada — dependem de `Servico` (item 3). Mesma lacuna já
  aceita para "Gerar relatório"/"Cobrar no WhatsApp" no perfil do cliente,
  tarefa 5.

### O que ficou provado rodando

- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (125
  testes, 9 arquivos — `tests/motoristas.test.ts` novo com 15 conferências,
  `tests/isolamento/vazamento.test.ts` estendido para `motorista`) verdes,
  antes e depois das correções do `/auditar-tela`/`/revisar`;
- fluxo completo no navegador: Mais → Motoristas (vazio, só "Cadastrar
  motorista") → + Novo → documento inválido recusado com erro abaixo do
  campo → corrigido → caminhão habitual escolhido por chip → salvar (vai
  para a lista) → perfil → Editar → caminhão habitual arquivado em outra aba
  → volta a aparecer marcado "(arquivado)" no perfil, no formulário e na
  lista → Arquivar motorista → sumiu da lista. Os três perfis (Cliente,
  Caminhão, Motorista) reconferidos depois da unificação do `LinhaDePerfil`.

**Próxima: item 3 — Lançamento de frete.** Precisa de plano novo em
`docs/planos/` (`CLAUDE.md` §2) — este arquivo (`item-2-cadastros.md`) fecha
com esta tarefa.

---

## 10/08/2026 — tarefa 6: Caminhões — tabela, lista, perfil e formulário

Fecha a tarefa 6 do item 2, e com ela as duas telas que o plano registrava como
pendentes desde 09/08/2026 (`docs/planos/item-2-cadastros.md`, tarefa 6): a
tabela `Veiculo` e o formulário de caminhão, que o protótipo nunca chegou a
desenhar.

**Modelo `Veiculo`** — `placa`, `apelido`, `tipo` (`arquivado_em`, sem `ativo`
e sem `ano`, pelos motivos já registrados em `docs/especificacao.md`). RLS,
política de isolamento e `GRANT` no mesmo commit da tabela, como toda tabela
de domínio. `CHECK veiculo_apelido_ou_placa` é a segunda garantia — a primeira
é `normalizarEntrada` em `src/lib/servicos/caminhoes.ts` — para quem grava por
fora do serviço.

### A decisão que voltou para o fundador: as opções do chip TIPO

Nenhum documento fixava a lista do chip "TIPO" — só o protótipo antigo usava
texto livre ("Truck", "Toco", "Carreta · 3 eixos"), que é evidência, não
decisão (`CLAUDE.md` §13). Perguntado antes de tocar em código.

**Decidido: cinco chips — Toco · Truck · Bitruck · Carreta · Bitrem. Campo
opcional.** Três era pouco (Bitruck é comum no segmento, Bitrem aparece em
carga a granel no Nordeste); sete era demais (VUC/3-4 são entrega urbana, fora
do público do produto). Sem "Outro" com campo livre: nada no MVP consome
`tipo` hoje, e o campo é preenchido umas dez vezes na vida de uma
transportadora — não compensa o comportamento novo. Registrado em
`docs/especificacao.md`, `docs/componentes.md` (linha 377, que só dizia "chips
de escolha para TIPO" sem definir quais) e no comentário do model `Veiculo` em
`schema.prisma`, com o motivo do corte nos três lugares.

### O bug que o build pegou, não o `tsc`

`FormularioCaminhao.tsx` ("use client") importava `TIPOS_VEICULO` direto de
`src/lib/servicos/caminhoes.ts` — e esse módulo importa `db`, que importa `pg`.
`next build` tentou levar `pg` (que usa `tls`, `util/types` do Node) para o
bundle do navegador e quebrou. `tsc --noEmit` não vê esse tipo de erro: é
Next/Turbopack decidindo o que vai para cada lado, não checagem de tipo.
Corrigido movendo `TIPOS_VEICULO` (e `nomeCaminhao`) para
`src/lib/utils/caminhao.ts` — arquivo sem `db`, seguro nos dois lados —, e
deixando em `caminhoes.ts` só o que fala com o banco. Fica registrado porque é
o tipo de erro que só aparece no build de produção, não no `dev` nem no `tsc`.

### O `/auditar-tela`: quatro divergências, uma lacuna

Todas da mesma classe — corrigidas na mesma tarefa, sem novo passe:

- **A placa saindo em Archivo em vez de Azeret Mono**, em quatro lugares:
  cabeçalho do perfil (quando não há apelido), linha "Placa" do perfil, e a
  linha da lista. `docs/estilo.md` linhas 52–54 e 93: Azeret Mono é exclusiva
  da placa, "nunca em nome". Corrigido com um componente novo,
  `src/components/ui/PlacaBadge.tsx`, com duas variantes: `escura` (branco
  sobre `#141A17`, o que a folha descreve) no perfil, `clara` (só a fonte, sem
  o par branco/escuro — o fundo já é claro) na lista. Precisão do fundador ao
  aprovar o conserto: as duas variantes existem porque a folha só descreve o
  tratamento de perfil; aplicá-lo também na lista teria trocado uma
  divergência por outra.
- **A linha de apoio do perfil (tipo do caminhão) em tinta terciária.**
  `docs/estilo.md` linha 107 classifica "placa, tipo, linhas" como conteúdo
  **secundário** (`#3C443E`) no perfil do caminhão, não terciário. Corrigido.

**Lacuna: o círculo de iniciais aplicado a caminhão sem decisão.** A regra de
`docs/componentes.md` ("Iniciais da empresa") foi escrita para o círculo da
própria empresa e estendida a Cliente por decisão registrada no diário
(10/08/2026, tarefa 5) — a primeira versão desta tarefa estendia a mesma regra
a Caminhão de novo, em silêncio. O fundador não aceitou por analogia:
"Scania branco" → "SB" e "Truck vermelho" → "TV" não distinguem nada, e a
placa em Azeret Mono já é o identificador que a pessoa reconhece. **A linha da
lista fica sem círculo por enquanto**, com apelido e a placa (badge claro) —
`ListaCaminhoes.tsx` não usa mais `LinhaDeLista` (que exige o círculo), tem a
própria marcação.

### O que precisa chegar ao Design

Editar o lado do repositório não avisa o Design sozinho — a fonte dele segue
sem a mudança até alguém contar (`CLAUDE.md` §13, regra estendida a
`docs/navegacao.md` nesta mesma tarefa). Três itens, nenhum bloqueia:

- **A lista dos cinco tipos do chip TIPO** (Toco · Truck · Bitruck · Carreta ·
  Bitrem), decisão do fundador registrada em `docs/especificacao.md` e
  `docs/componentes.md` — o Design só tinha "chips de escolha para TIPO", sem
  definir quais.
- **O formulário de caminhão como feito, e sem campo de ano** —
  `docs/navegacao.md` marcava ⬜ com "tipo + ano"; o repositório corrigiu para
  ✅ "tipo (chip)... Sem campo de ano" por ser estado/sincronização, mas quem
  precisa saber que a tela nasceu assim é o Design, não só este arquivo.
- **A lacuna do círculo de iniciais na linha de caminhão** — decidir entre sem
  círculo (o que está no ar agora) ou um ícone de caminhão igual para todos —
  "que diz o que é sem fingir identidade". Duas opções, a enviar; o fundador
  confirma quando o Design responder.

### O que ficou provado rodando

- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (106
  testes, 8 arquivos — `tests/caminhoes.test.ts` novo com 11 conferências,
  `tests/isolamento/vazamento.test.ts` estendido para `veiculo`) verdes, antes
  e depois das correções do `/auditar-tela`;
- fluxo completo no navegador: Mais → Caminhões (vazio, só "Cadastrar
  caminhão") → + Novo → cadastro só com apelido/placa → chip de TIPO → salvar
  (vai para o perfil, não para a lista — `docs/navegacao.md` linha 51, "volta
  ao perfil", diferente de Cliente) → Editar → Arquivar → sumiu da lista. Os
  dois casos (com e sem apelido) testados nos dois estados (lista e perfil).

**Próxima: tarefa 7 — Motoristas: dados e telas.**

---

## 10/08/2026 — tarefa 5: Clientes — lista, perfil e formulário

Fecha a tarefa 5 do item 2. Quatro telas novas (`/clientes`, `/clientes/novo`,
`/clientes/[id]`, `/clientes/[id]/editar`) e as quatro peças de interface que
nascem para serem reaproveitadas por Motoristas e Caminhões: `LinhaDeLista`,
`CampoBusca`, `PilulaCabecalho` (variante 06 do inventário, primeira vez em
uso) e `EstadoVazio`. A quinta peça do plano original, folha inferior, **não
nasce aqui** — decisão registrada na entrada anterior deste diário, antes de
começar a construir: as duas folhas que Clientes teria (Ordenar por, Período)
foram adiadas para os itens 3 e 4 por decisões separadas, e sobrou zero uso
real para ela.

O (+) da barra deixa de dar "página não encontrada" — `BarraDeNavegacao.tsx`
atualizado. "Mais" ganha a seção CADASTROS com a linha "Clientes", contando
quantos cadastrados (nunca "· R$ X em aberto": esse número depende de
`TituloReceber`, item 4, e §8 proíbe número incompleto).

**Perfil nasce só com identificação, dados cadastrais e Editar** — resumo
financeiro e histórico de fretes ficam para o item 4 (dependem de
`Servico`/`TituloReceber`), e por isso também não há "Gerar relatório" nem
"Cobrar no WhatsApp" ainda.

### As quatro decisões que voltaram para o fundador

**A — o município do cliente fica sempre vazio.** O plano original resolvia
`municipio_id` a partir do `endereco` digitado, reusando `resolverMunicipio`.
Não serve: essa função casa por nome **exato**, o mecanismo certo para
`origem_texto`/`destino_texto` do frete (só o nome da cidade), não para um
endereço completo — e testado na prática, "Rod. CE-440, km 12 — Sobral/CE"
nunca resolve. Revertido: `endereco` grava como texto, `municipio_id` fica
nulo. Motivo extra do fundador para não perseguir isso agora: nada no MVP lê
o município do cliente — a distância do frete vem de origem/destino do
frete, não do endereço do cliente. Registrado em `docs/especificacao.md`,
entidade Cliente: quando houver uso real, é campo próprio de cidade, não
extração de endereço livre.

**B — o campo "Observação" saiu do formulário.** Entrou só porque a coluna
existe no banco; nenhum desenho da tela — nem o protótipo de referência —
tem esse campo. Mesmo precedente do ano do caminhão e da categoria da CNH
(`docs/especificacao.md` §6, Veiculo/Motorista): coluna fica no banco como
peso morto até um desenho pedir por ela.

**C — campo vazio no perfil leva para o formulário de edição inteiro, não
para uma folha própria.** A "folha do campo que falta" que o inventário
prevê (`docs/componentes.md` 12) só nasce no item 3. Decisão provisória,
registrada em `docs/especificacao.md` §4.7 (não em comentário de código —
comentário some no próximo arquivo reescrito; decisão precisa sobreviver a
isso).

**D — as iniciais do cliente usam a regra de empresa, não a de pessoa.**
Cliente pode ser pessoa física, e o inventário reserva a regra de "pessoa" a
`Usuario`. Decisão do fundador, com motivo próprio, não cópia do protótipo
(que também usa a regra de empresa, mas protótipo é evidência, nunca
motivo): cliente de transportadora é quase sempre pessoa jurídica, e a regra
de empresa funciona bem também para pessoa física. Registrado em
`src/lib/utils/iniciais.ts` para não parecer descuido depois.

### O `/auditar-tela` e o `/revisar`, e o que os dois acharam

Oito divergências, nenhuma lacuna que não tenha virado uma das quatro
decisões acima. Todas corrigidas nesta mesma tarefa, sem segundo passe — é a
mesma classe em todos os casos (bug ou desalinhamento com o documento, nada
de arquitetura nova):

- **Bug real de dois toques, achado pelo `/revisar`, não pela suíte.**
  `Botao.tsx` espalhava `{...nativos}` **depois** do `disabled={props.disabled
  || carregando}` explícito, e `nativos` nunca descartava `disabled` — com as
  duas props passadas juntas (só `FormularioCliente.tsx` faz isso hoje;
  conferido que nenhuma das outras seis chamadas de `Botao`/`PilulaEmLinha`
  no projeto combina as duas), o `disabled` antigo vencia o `carregando`
  calculado, e o botão aceitava um segundo toque durante o envio. Corrigido
  nos dois componentes (`Botao.tsx`, `PilulaEmLinha.tsx`) — o segundo já
  nasceu com o mesmo furo nesta tarefa, copiado do primeiro.
- "Arquivar cliente" chamava o servidor sem travar o segundo toque. Corrigido
  com o mesmo padrão de `BotaoSairDaConta.tsx` (`useFormStatus`, sem
  spinner): `BotaoArquivarCliente.tsx`, componente novo.
- Campo "Prazo de pagamento" remontado à mão em vez de reusar `CampoTexto`.
  Corrigido.
- Círculo de iniciais do cliente com fundo claro/texto verde (cópia do
  protótipo) em vez de fundo `#1B6B3A`/texto branco, que é o que
  `docs/componentes.md` manda para toda linha de lista — o documento vence o
  protótipo. Corrigido.
- Subtítulo da linha "Clientes" em Mais com tamanho de letra fora de
  qualquer tabela (mistura de dois papéis documentados). Trocado pelo token
  "Total contextual". Corrigido.
- "+ Novo" do cabeçalho e "Cadastrar cliente" do estado vazio faziam a
  mesma coisa, visíveis ao mesmo tempo, quando a lista está totalmente
  vazia. Corrigido escondendo o "+ Novo" nesse estado — mesma condição do
  protótipo de referência.
- Ordem dos campos do formulário (Nome, Documento, Telefone…) contra
  `docs/navegacao.md`, que já registrava por escrito: "Telefone... entra no
  cadastro, segundo campo, antes até do documento". Corrigido.
- Três títulos de tela sem o `wdth 96%` que `docs/estilo.md` exige para
  esse papel (já em uso em cinco telas fora de sessão) — achado no
  `/auditar-tela`, corrigido junto por ser a mesma classe de divergência.

### O que ficou provado rodando

- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (91
  testes, 7 arquivos, inalterados — tarefa 5 não mexeu em isolamento) verdes,
  antes e depois das correções do `/revisar`;
- fluxo completo no navegador: Mais → Clientes (vazio, só "Cadastrar
  cliente") → + Novo → salvar (volta para a lista, "+ Novo" reaparece) →
  abrir perfil → Editar → documento inválido barra o salvar com erro sob o
  campo → corrigido, prazo próprio salvo → volta para o perfil com "Acordo
  próprio deste cliente." → Arquivar → volta para a lista vazia → Mais
  mostra "Nenhum cadastrado ainda";
- o clique simulado da ferramenta de navegador voltou a travar nesta sessão
  (mesmo sintoma da tarefa 4, não relacionado ao código) — testado com
  `form.requestSubmit()` via JavaScript em vez de clique, mesmo caminho que
  o navegador percorre num toque de verdade.

**Próxima: tarefa 6 — Caminhões: completo (tabela, lista, perfil e
formulário).**

---

## 10/08/2026 — decisão de escopo da tarefa 5: a folha inferior sai da rodada

`docs/planos/item-2-cadastros.md` lista "folha inferior" entre as peças de
interface que nasceriam na tarefa 5, junto com linha de lista, campo de busca,
pílula de cabeçalho e estado vazio. Revendo as três telas de Clientes linha por
linha antes de começar a construir, nenhuma delas usa folha inferior hoje — e
a razão não é descuido desta tarefa, é consequência de **duas decisões
anteriores, tomadas em outro contexto**, que esvaziaram os dois usos que ela
teria:

- a lista teria uma folha "Ordenar por", mas o chip que a abriria foi adiado
  para o item 3 (revisão da tarefa 3, 09/08/2026: seletor com uma opção só —
  só "mais recente" tem fonte hoje — é controle que não faz nada);
- o perfil teria uma folha "Período", mas o resumo financeiro que ela filtra
  foi adiado para o item 4 (depende de `Servico`/`TituloReceber`, que não
  existem ainda).

Sem os dois, sobra zero uso real — e o `CLAUDE.md` §6 é direto: "sem
abstração especulativa, sem camada sem dois casos de uso reais". Construir o
componente agora seria exatamente essa camada. **Decisão do fundador,
10/08/2026: a folha inferior não nasce na tarefa 5.** Nasce no item 3, com a
folha de busca e o cadastro rápido — os primeiros usos reais dela.

**As outras quatro peças continuam.** Linha de lista, campo de busca, pílula
de cabeçalho e estado vazio têm uso real dentro da própria tarefa 5 (lista e
perfil de Clientes) e são reaproveitadas depois por Motoristas e Caminhões —
o corte de uma peça não é dúvida sobre as outras três.

---

## 10/08/2026 — tarefa 4: a casca do app — barra de navegação e "Mais"

Fecha a tarefa 4 do item 2. `src/app/(app)/layout.tsx` passa a checar a
sessão uma vez, para todo o grupo `(app)` — as telas filhas (`page.tsx`,
`mais/page.tsx`) não repetem o `try/catch` de antes, só chamam
`exigirSessao()` direto: se ela falhar depois do layout já ter passado, é bug,
não o caminho esperado de "sem sessão". `BarraDeNavegacao.tsx` é a pílula
flutuante de cinco posições (`docs/componentes.md` §10), e a tela "Mais"
nasce só com o nome da empresa e "Sair da conta" — que saiu da tela Início,
onde vivia provisoriamente desde a tarefa 7 do item 1.

### As duas decisões do fundador que abriram a tarefa

**1. Fretes e Cobranças ficam ativos na barra, apontando para uma tela curta
e provisória**, em vez de esperar os itens 4 e 6 (que constroem essas telas
de verdade) ou aparecer desabilitados. Razão do fundador: a barra é estrutura
fixa de cinco posições — ao contrário de uma lista, tirar um item muda a
geometria (a folga de rolagem de toda tela é medida a partir do topo do
(+)) —, e um item desabilitado exigiria um tratamento visual que
`docs/estilo.md` não define. As telas dizem o que falta, não "em breve":
"Seus fretes aparecem aqui a partir do lançamento de frete" (item 4) e "Suas
cobranças aparecem aqui a partir do faturamento" (item 6).

**2. O (+) abre o cadastro de cliente (`/clientes/novo`) e dá "página não
encontrada" até a tarefa 5** — a próxima — **criar essa rota. Comportamento
esperado e temporário, não defeito.** Fica registrado aqui porque o fundador
pediu, para não ler o link quebrado como regressão ao testar. E mesmo depois
da tarefa 5, o (+) continua provisório: `docs/planos/item-2-cadastros.md`
(tarefa 4) manda ele passar a abrir Lançar frete só no item 3, e até lá
`docs/navegacao.md` linha 88 ("o (+) abre Lançar frete de qualquer lugar")
não é o que o botão faz. As duas janelas (até a tarefa 5, até o item 3) estão
marcadas no comentário do código, com a razão de cada uma — provisório sem
prazo escrito vira permanente.

### O `/revisar`, e o que ele achou

Nove divergências, seis lacunas. Todas de precisão de medida ou de
referência, nenhuma de arquitetura — corrigidas nesta mesma tarefa, sem
terceiro passe:

- `--margem-lateral` era um token só, calculado do inset **esquerdo**, usado
  para os dois lados da barra — em aparelho com entalhe assimétrico (girado,
  por exemplo), o lado direito receberia o valor errado. Virou dois tokens,
  `--margem-lateral-esquerda` e `--margem-lateral-direita`, cada um com o seu
  `env()`, batendo com `docs/estilo.md` § "Barra de navegação — âncora
  responsiva". Nada mais consumia o token antigo, então a troca foi segura.
- O ícone de "Início" caía no padrão de `20px` de largura por não passar
  `largura` — o documentado é `19×19px`. Corrigido.
- Cada item da barra tinha ~45,5px de alvo de toque (o `<nav>` usava
  `items-end`, então cada `<Link>` só ocupava a altura do próprio conteúdo,
  não os 57px da pílula) — abaixo do mínimo de 48px do `CLAUDE.md` §8. Tirado
  o `items-end`: os links agora esticam para os 57px inteiros, mantendo
  ícone e rótulo encostados embaixo pelo `justify-end` interno.
- O comentário do (+) só citava o prazo da tarefa 5, não o do item 3 — ver
  decisão 2 acima.
- Título de estado vazio (`text-titulo-vazio`) sem o rastreio `-.01em` que
  `docs/estilo.md` define para esse papel — adicionado.
- Tinta do texto de apoio das telas provisórias trocada de
  `tinta-apoio-forte` (reservada a corpo **fora de sessão**, por comentário
  explícito em `globals.css`) para `tinta-apoio`, o padrão de "Corpo de
  apoio" em `docs/estilo.md`.
- Dois comentários citavam "`docs/componentes.md` linha 388" para a linha de
  Mais — ficou 392 depois que esta própria tarefa acrescentou linhas à
  tabela de ícones. Corrigido para o número atual.
- Uma frase nova em `componentes.md` dizia que os ícones foram exportados
  para `icons/`; o caminho real é `docs/icones/`. Só a frase que esta tarefa
  escreveu foi corrigida — o resto do documento já usava esse atalho antes,
  e não é desta tarefa arrumar.
- `.claude/launch.json`, criado pela ferramenta de preview ao abrir o
  navegador para testar, não entra neste commit — é configuração de
  ferramenta, não parte da tarefa.

**Lacuna resolvida em 10/08/2026, pelo fundador.** As duas telas provisórias
ficam como estão: sem ação, só título e texto de apoio dizendo o que falta
para a ação existir. O `CLAUDE.md` §8 foi reescrito neste mesmo commit
(`3b7561f`) para cobrir o caso — "Estado vazio oferece a ação que destrava a
tela. Quando a ação ainda não existe, o convite é dizer o que falta para ela
existir — nunca um botão que não leva a lugar nenhum, e nunca ilustração
decorativa." Não é mais uma pendência.

### O que ficou provado rodando

- os cinco destinos da barra renderizam e destacam o item ativo certo
  (testado por navegação direta de URL — o clique simulado da ferramenta de
  navegador travou de forma geral nesta sessão, inclusive em botões sem
  relação com esta tarefa, então não é sinal de defeito no código);
- `/clientes/novo` dá 404, como esperado;
- "Sair da conta" funciona a partir de Mais;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (91
  testes, 7 arquivos, inalterados) verdes.

**Próxima: tarefa 5 — Clientes: lista, perfil e formulário.**

---

## 09/08/2026 — tarefa 3: Cliente, o documento validado e a ordenação adiada

Fecha a tarefa 3 do item 2. A tabela `cliente` existe: nome, documento
(CPF/CNPJ), telefone, email, endereço, município, prazo de pagamento (nulo =
herda de `Empresa.prazo_padrao_dias`, que também nasce aqui, valendo 15) e
observação. `src/lib/servicos/clientes.ts` tem listar, buscar, criar, editar
e arquivar, tudo por `db(empresaId)`.

**Documento validado de verdade, não só formatado.** `src/lib/utils/documento.ts`
usa `cpf-cnpj-validator` (2.1.2), que calcula o dígito verificador tanto do CPF
quanto do CNPJ **alfanumérico** (Nota Técnica RFB 49/2024) — o mesmo formato
que `empresa_cnpj_formato` já cobria só por regex, sem conferir o dígito.
Documento com dígito errado **recusa o salvar** (decisão do fundador, ver
abaixo); campo vazio continua funcionando, porque só `nome` é obrigatório.

**Único por empresa, só entre os não arquivados.** A trava
`UNIQUE (empresa_id, documento) WHERE arquivado_em IS NULL` é índice parcial —
o Prisma não modela isso, então existe só na migration
(`20260809060000_cliente_e_prazo_padrao`), com o mesmo comentário de aviso que
já existe para RLS no topo do `schema.prisma`. Arquivar libera o documento
para recadastro, ao contrário do CNPJ da Empresa (que é trava anti-abuso e
continua presa).

**Migration aplicada por fora do `prisma migrate dev`.** O comando recusou
criar o scaffold: o banco de desenvolvimento tinha um checksum divergente para
`20260809021500_municipio_tabela_de_referencia` (arquivo editado depois de
aplicado, antes desta sessão — não é coisa desta tarefa) e `migrate dev` só
resolve isso com `migrate reset`, que apagaria os 5.570 municípios e todo dado
de desenvolvimento. Em vez de rodar `reset`, o SQL desta migration foi escrito
à mão seguindo o padrão das anteriores, aplicado direto pela conexão das
migrations, e registrado em `_prisma_migrations` com o checksum sha256 do
arquivo — o mesmo que o Prisma teria calculado. `prisma migrate status`
confirma "up to date" depois disso. **A esteira (CI) aplica normal**, porque o
banco de teste nunca viu esta migration antes.

**Pendência que sobra, não desta tarefa:** o checksum divergente de
`20260809021500_municipio_tabela_de_referencia` continua lá — qualquer
`prisma migrate dev --create-only` futuro na minha máquina vai recusar do
mesmo jeito, e o instinto de "resolver" com `migrate reset` apagaria a seed de
município. Fica registrado para não ser surpresa na próxima tarefa; conserto
correto ainda não decidido.

### O `/revisar`, e as duas decisões que voltaram para o fundador

Uma divergência e três lacunas. A divergência: `listarClientes` só ordena por
"mais recente", e o comentário do código emprestava a razão de adiamento do
resumo do perfil (que espera `Servico`/`TituloReceber`, tarefa 5) para as
**ordenações**, que o plano nunca isentou — `docs/planos/item-2-cadastros.md`
pedia as três, e `docs/componentes.md` já usa "maior valor em aberto" como
exemplo do chip. Levado ao fundador porque as outras duas ordenações
literalmente não têm como ser calculadas sem `Servico`/`TituloReceber` (item
3).

**Decidido:** a tarefa 3 fecha só com "mais recente" — as outras duas ficam
pendentes do item 3. E mais: **o chip de ordenação nem nasce na tarefa 5**,
porque seletor com uma alternativa só não faz nada. Registrado em
`docs/planos/item-2-cadastros.md`, tarefa 5, para quem construir a tela não
reabrir a pergunta.

**Documento com dígito verificador errado: bloqueia o salvar.** A ressalva de
"atrapalhar o cadastro de 30 segundos" não se aplica — o documento é opcional,
quem está com pressa não digita nada; o bloqueio só atinge quem digitou um
número e digitou errado, e documento errado pararia no relatório que o
cliente da transportadora recebe. A forma já está decidida por
`docs/estilo.md`/`componentes.md` (campo de texto): o erro aparece **abaixo do
campo**, nunca como mensagem geral no fim do formulário — isso é trabalho da
tarefa 5, esta tarefa só lança o `Error` com a mensagem.

As outras duas lacunas — schema de entrada para os campos que hoje só passam
por `trim()`, e as três mensagens de erro fora de `docs/componentes.md` —
aceitas como está: apontam para a tarefa 5, que é quem constrói a Server
Action e a tela de verdade (mesmo padrão de `cadastro.ts`: o schema `zod` vive
na Action, não no serviço).

### O que ficou provado rodando

- só `nome` é obrigatório; documento e prazo ficam nulos, nunca `''`;
- CPF e CNPJ alfanumérico válidos são aceitos e normalizados (maiúsculo, sem
  pontuação); dígito verificador errado recusa, nos dois formatos;
- documento único por empresa entre os não arquivados; duas empresas podem
  repetir o mesmo documento; arquivar libera para recadastro;
- listar devolve só os não arquivados, mais recente primeiro; buscar e editar
  funcionam; empresa A não busca nem lista cliente da empresa B;
- a extensão de `tests/isolamento/vazamento.test.ts` prova que o Cliente da
  empresa B é invisível pela mesma política de isolamento do resto do
  domínio;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (91 testes,
  7 arquivos) verdes.

**Sem terceiro passe.** As quatro lacunas/divergência viraram decisão do
fundador ou apontamento para a tarefa 5, não código novo nesta tarefa — não há
classe nova de achado para justificar rodar de novo.

**Próxima: tarefa 4 — A casca do app: barra de navegação e tela "Mais".**

---

## 09/08/2026 — tarefa 2: tipo de operação, e o furo do primeiro cliente fechado

Fecha a tarefa 2 do item 2. Toda empresa nova passa a nascer com os quatro
`TipoOperacao` (Frete ativo; Reboque, Guincho e Mudança inativos), criados na
**mesma transação** que cria a `Empresa` — o furo que o fundador descreveu ao
abrir a tarefa: sem isso, o primeiro cliente que assinar abriria o lançamento
de frete com o campo de tipo de operação vazio.

`src/lib/servicos/tipos-de-operacao.ts` guarda os quatro e a função que os
cria, recebendo o `tx` da mesma transação — não abre uma segunda. `cadastro.ts`
chama essa função logo depois de `tx.empresa.create`, dentro do `emTransacao`
que já existia. A migration preenche as empresas que já existiam antes da
tabela nascer, com `INSERT ... SELECT ... ON CONFLICT DO NOTHING`, como o plano
previa.

### O defeito achado ao escrever o teste, não em revisão

A chave estrangeira de `tipo_operacao` para `empresa` nasceu `ON DELETE
RESTRICT`, seguindo o padrão do resto do domínio. **Isso quebra a reversão de
cadastro incompleto.** `reverter_cadastro_incompleto` apaga a `Empresa` órfã
quando o passo 2 do cadastro (criar o `Usuario`) falha depois do passo 1 já ter
sido gravado — e agora toda `Empresa`, órfã ou não, nasce com quatro
`TipoOperacao` apontando para ela. Com `RESTRICT`, esse `DELETE` seria recusado
pelas próprias linhas que a tarefa acabou de criar, e a reversão — que existe
exatamente para o caso em que algo falha no meio — falharia ela mesma.

Não apareceu em leitura de código: apareceu ao estender `tests/cadastro.test.ts`
para que `criarEmpresa` (o helper que espelha o mecanismo real) também criasse
os quatro tipos, e o teste de reversão passou a semear o cenário de verdade.
Rodar a chamada real (`reverterCadastroIncompleto`) contra dados reais é o que
teria travado com um erro de chave estrangeira — a mesma lição do §3: teste que
mede o resultado, não só declara o mecanismo, é o que pega isto.

**Corrigido para `ON DELETE CASCADE`.** É seguro porque a guarda `NOT EXISTS
(... usuario ...)` dentro da função continua inteira — ela decide **se** a
Empresa pode ser apagada; o `CASCADE` só muda o que acontece com quem depende
dela depois que essa decisão já foi tomada.

> Esta seção descrevia aqui uma concessão nova a `fretigate_reversor`
> (`SELECT`/`DELETE` em `tipo_operacao`), com o motivo "o `CASCADE` é um
> `DELETE` de verdade, sujeito a privilégio". **Era suposição, não medição, e o
> `/revisar` pegou.** A história certa está na seção seguinte: medido, o
> `CASCADE` não precisa de concessão nenhuma, e a linha foi removida da
> migration antes do commit. Corrigido aqui em vez de apagado, porque apagar
> faria parecer que o erro nunca existiu — e o diário registra onde o trabalho
> parou, erro incluído.

A correção foi provada, não só declarada: `tests/cadastro.test.ts` confirma
**antes** da reversão que os quatro `TipoOperacao` da empresa órfã existem, e
**depois** que sumiram junto — e que os da outra empresa (a que tem dono de
verdade) continuam intactos, prova de que o `CASCADE` atingiu só quem devia.

### O `/revisar`, e o `GRANT` que eu tinha dado sem precisar

Rodado antes do commit, como manda o §2. Três divergências e duas lacunas —
todas do mesmo fio: eu tinha concedido `SELECT, DELETE` em `tipo_operacao` ao
papel `fretigate_reversor`, junto com a correção do `CASCADE`, achando que o
`CASCADE` precisava disso para funcionar. O revisor duvidou, com uma frase
exata: *"precisa ser medido, não deduzido"*.

**Medi, e ele estava certo.** Escrevi um teste que revoga o privilégio de
`fretigate_reversor` em `tipo_operacao`, semeia uma empresa órfã de verdade com
os quatro tipos, e chama `reverterCadastroIncompleto` sem nenhum grant novo.
**Passou.** A ação referencial do Postgres (`ON DELETE CASCADE`) roda por fora
do privilégio e da política de RLS do papel que disparou o `DELETE` na tabela
pai — não é "mais um `DELETE` comum" sujeito às mesmas regras, e por isso não
precisa de concessão nenhuma. Removido o `GRANT`; `fretigate_reversor` continua
com o alcance mínimo já documentado no `CLAUDE.md` §9 (`empresa` e `usuario`,
nada mais) — **sem precisar mudar aquela tabela**, porque a correção certa foi
não ter ampliado o papel, não atualizar a lista depois de ampliar.

Isso também resolveu, de graça, a segunda divergência: o comentário da migration
de 07/08 que diz "este papel não enxerga nenhuma outra tabela do produto"
continua verdadeiro, porque o `GRANT` que o desmentiria nunca ficou.

**A terceira divergência exigiu decisão de verdade, não só medição.** O
`CASCADE` apaga fisicamente linhas de `tipo_operacao` — uma tabela de domínio,
com `arquivado_em` — e o `CLAUDE.md` §7 fecha a exceção de "nada é apagado"
dizendo que nenhuma outra tabela a ganha "sem passar pela mesma pergunta:
alguém chegou a ver isto?". A exceção original cobria só `Empresa`. Respondida
a pergunta para `TipoOperacao`: os quatro nascem **na mesma transação** que a
`Empresa`, então uma empresa que nunca existiu de verdade também nunca teve
tipo visto por ninguém — não existe "Frete" que alguém tenha visto para uma
empresa que ninguém viu. A exceção do §7 foi **estendida**, com essa resposta
escrita, não só o `CASCADE` deixado quieto no schema.

**A lacuna do `id` do backfill foi documentada, não corrigida** — o Postgres
deste projeto (17.6) não tem gerador de uuid v7 nativo nem por extensão
(conferido: só `uuid-ossp` e `pgcrypto`, até v4/v5), e escrever um gerador de
v7 em SQL para 4 linhas por empresa, uma vez, seria mais código que o problema
pede. Sem custo real: nada lê `id` de `TipoOperacao` esperando ordem
cronológica — quem faz isso é `ordem` (exibição) e `criado_em` (tempo), os dois
certos.

### O que ficou provado rodando

- os quatro nascem certos — nome, slug, `ativo` e `ordem` — e só "Frete" ativo;
- a reversão de cadastro incompleto continua funcionando com `TipoOperacao` no
  meio, e some junto quando a empresa órfã é apagada — **sem nenhum privilégio
  novo** para o papel que reverte, medido com o grant revogado de propósito;
- empresa A não enxerga o `TipoOperacao` da empresa B, mesma política de
  isolamento do resto do domínio;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (74 testes,
  6 arquivos) verdes, em execução limpa — duas rodadas no meio do caminho
  falharam por conexão esgotada, causada pelos próprios scripts manuais desta
  sessão de investigação, não pelo código; confirmado ao repetir limpo.

**Sem terceiro passe.** Os cinco achados são a mesma classe já vista na tarefa
1 — afirmação de mecanismo de segurança sem medir, e regra escrita imprecisa
demais para o caso real. O critério do §2 é a classe, não a quantidade: corrige
e commita.

**Próxima: tarefa 3 — Cliente: dados, documento e o prazo herdado.**

---

## 09/08/2026 — tarefa 1: os 5.570 municípios, a porta única e a seed que atualiza

Fecha a tarefa 1 do item 2. A tabela `municipio` existe, está carregada com os
**5.570 municípios**, e `resolverMunicipio` é a porta única por onde texto vira
município — é nela que a medição dos 10% do item 3 vai se apoiar.

### A fonte dos dados: duas, oficiais, cruzadas

O plano aprovado não dizia de onde viriam os dados com coordenada. Resolvido
com **duas fontes do IBGE**, cada uma no que ela é autoridade:

| Fonte | Decide | Por quê |
|---|---|---|
| Localidades do Brasil 2022 (arquivo geográfico) | **coordenada da sede** | a sede é a praça central, para onde o caminhão vai; o centro geométrico de um município grande cai no mato |
| API de Localidades do IBGE | **nome e UF** | o arquivo geográfico é fotografia de 2022 e envelhece no nome |

O cruzamento achou **uma** divergência: `5203500` era "Bom Jesus" no arquivo
geográfico e é **"Bom Jesus de Goiás"** na API. A API venceu. Nome errado é
município que o usuário digita e não encontra.

**Fernando de Noronha (2605459) fica de fora**, declarado como exceção
**nomeada** no gerador: o IBGE o classifica como distrito estadual, não
município — é por isso que a conta oficial é 5.570 e a API devolve 5.571. É
ilha, sem estrada. Qualquer *outro* código sem sede **interrompe a geração**:
exceção que vale para um código conhecido é decisão; exceção que vale para "o
que não bater" é buraco.

Tudo em `prisma/seed/PROCEDENCIA.md`, com endereço, data, licença e método.

### Três desvios do plano aprovado, autorizados pelo fundador

1. **`importFileExtension = "ts"`** no gerador do Prisma. A seed roda no Node
   puro, fora do empacotador, e sem isso o Node não carrega o cliente gerado.
   A alternativa era instalar mais uma ferramenta; esta linha faz o mesmo com
   **zero dependência nova**. Conferido: lint, tipos, build e a suíte passam.
2. **`prisma/seed/gerar-municipios.mjs` é comitado.** O plano previa só o
   arquivo de dados e a procedência. Procedência que afirma um cruzamento que
   ninguém consegue refazer é promessa, não procedência.
3. **A conferência da ordem virou parte da migration** (ver abaixo).

### As duas correções pedidas pelo fundador, e o que elas mudaram

**A seed ATUALIZA, não pula.** `createMany({ skipDuplicates: true })` sozinho
nunca propaga correção do IBGE — e a divergência do "Bom Jesus" já provava que
correção existe. A seed agora lê o que está no banco, compara, insere os novos,
**atualiza só as linhas que mudaram de verdade** e relata cada uma. Custo
medido: uma consulta a mais, ~1s.

Três guardas, e as três estão testadas na máquina, não supostas:

- **teto de 100 alterações.** Acima dele a seed **não grava nada**, lista o que
  mudaria e exige `-- --forcar`. A conferência de formato recusa arquivo
  *malformado*, mas não recusa arquivo *válido e errado* — e o sintoma desse é
  sempre muitas linhas mudando de uma vez. Inserção não entra no teto: a
  primeira carga são 5.570, e inserir nunca apaga nada.
- **`arquivado_em` nunca é tocado.** Recarregar a fonte não ressuscita município
  que alguém arquivou.
- **município que sumiu da fonte é relatado, nunca apagado** (§7).

**A ordem da chave estrangeira.** A ligação `empresa.municipio_id` nasce na
migration, mas a tabela só recebe as 5.570 linhas quando a seed roda — ou seja,
a ligação é criada contra uma tabela **vazia**. Conferido no banco de
desenvolvimento: **0 empresas, 0 com `municipio_id`**. O projeto de teste não é
alcançável desta máquina (credencial só existe como secret do GitHub), então a
saída não foi "conferi, confia": **a migration confere sozinha**, com mensagem
que diz o que fazer, onde quer que ela rode — desenvolvimento, esteira e
produção quando existir.

### Um defeito encontrado no próprio código desta tarefa

`prisma.$transaction([...])` com muitas atualizações **estourou o tempo limite
padrão do Prisma** (5 s) contra o Supabase: 150 atualizações levaram 5,1 s e a
transação expirou no meio. Apareceu porque o teto foi testado de verdade, com
150 linhas estragadas de propósito — não apareceria em revisão de código. A
correção mantém a atomicidade (metade atualizada é pior que nenhuma) e passa a
declarar o tempo limite em função da quantidade.

### O que foi provado rodando, não lido

- carga: 5.570 no banco, 27 UFs, nenhuma coordenada nula, zerada ou fora do Brasil;
- rodar a seed de novo: **0 novos, 0 alterados**;
- duas linhas estragadas: corrigidas e **relatadas uma a uma**;
- 150 estragadas: **recusa, nada gravado, código de saída 1**; com `--forcar`, corrige;
- duas linhas arrancadas do arquivo: **recusa**, com a contagem declarada contra a trazida;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (71 testes) verdes.

### Decisões menores que ficam registradas

- **`Municipio` sem `empresa_id` entrou na lista de exceções** de
  `tests/isolamento/schema.test.ts`, com o motivo. A lista é conferida por
  igualdade exata.
- **A política é `USING (true) WITH CHECK (false)`** — as duas cláusulas do §9,
  sem exceção. O teste confere no **catálogo** (`pg_policies`), não no arquivo
  da migration: é o catálogo que recusa.
- **`latitude`/`longitude` são `Float`.** Não contradiz o §7, que proíbe
  dinheiro em decimal flutuante — coordenada nunca é somada nem comparada por
  igualdade contábil.
- **`normalizarParaBusca` usa `\p{Mn}`**, a categoria do Unicode, e não um
  intervalo de códigos escrito à mão: o outro jeito obrigaria a colar
  caracteres invisíveis dentro do código.
- **A seed não tem trava de banco**, ao contrário da suíte de testes — e é de
  propósito: ela **precisa** rodar em produção. O que a torna segura em
  qualquer banco é nunca apagar e nunca sobrescrever em massa sem autorização.
  Tudo isso está em `docs/especificacao.md` §6, não só aqui.

### O que o `/revisar` achou, e o que mudou por causa dele

Duas divergências e seis lacunas. Todas aceitas, uma com correção diferente da
proposta. As que merecem registro:

- **Citei o `CLAUDE.md` §5 para uma regra que não está lá.** O comentário da
  seed e o da esteira diziam "nunca roda em `postinstall` (`CLAUDE.md` §5)" —
  e `postinstall` não aparece no §5 nem em canto nenhum do `CLAUDE.md`. A regra
  mora em `docs/especificacao.md` §6. É a classe que o §13 nomeia: afirmação
  que engana justamente por parecer verificada.
- **O teto de 100 e o `--forcar` só existiam no diário.** O revisor apontou que
  **o diário não põe regra em vigor** — ele registra onde o trabalho parou. O
  comportamento inteiro da seed (atualiza em vez de pular, teto, `arquivado_em`
  intocado, sumiço relatado e não apagado) foi para `docs/especificacao.md` §6.
- **Dois números que eu tinha escolhido sozinho viraram decisão do fundador:**
  o mínimo de letras da busca e a quantidade de sugestões.
- **O revisor duvidou de uma frase correta do §9**, e a resposta foi corrigir a
  frase. Ver abaixo.

### As decisões que o fundador tomou em cima dos achados

- **Duas letras para começar a buscar**, com o motivo registrado: na maioria
  das vezes ninguém digita ali, porque os destinos já usados com aquele cliente
  aparecem como chips. Quem digita é o caso do destino novo — e com três letras
  existe um instante de "não aparece nada" que confunde justamente quem já saiu
  do caminho rápido.
- **Cinco sugestões, não oito.** Com o teclado aberto cabem umas cinco linhas
  acima dele; oito rola ou empurra conteúdo, e **lista que precisa rolar
  enquanto a pessoa digita é pior que digitar mais uma letra**. Construído com
  cinco; **fica pedido ao Design formalizar** em `docs/componentes.md`.
- **Nunca chutar município ambíguo, confirmado** — e com uma observação que
  faltava: a ambiguidade **se resolve sozinha no fluxo normal**, porque a lista
  de sugestões mostra a UF. Quem digita "Bom Jesus" escolhe entre "Bom
  Jesus/GO" e "Bom Jesus/PI". O não resolvido só sobra quando ninguém escolhe.
- **A medição do item 3 passa a separar dois motivos**, e isso mudou código:
  `resolverMunicipio` não devolve mais "o município ou nada", devolve
  **`resolvido`, `ambiguo` ou `nao_encontrado`**. "12% não resolvido" sozinho
  não diz o que consertar, e os dois casos pedem correções opostas — ambíguo é
  conserto de **tela** (a sugestão não chamou atenção); não encontrado é
  conserto de **dado ou da normalização**. Registrado em
  `docs/especificacao.md` §9.
- **O §9 do `CLAUDE.md` dizia que `postgres` "não roda no produto"**, o que é
  verdade no sentido pretendido e falso ao pé da letra — as migrations sempre
  rodaram com ele contra produção, e agora a seed também. Passou a dizer **"não
  atende pedido de usuário"**.

  E o princípio ficou registrado no §2, porque vale para além deste caso:
  **confusão de quem lê é evidência sobre o texto, não sobre o leitor.** Se
  quem leu só o documento ficou em dúvida, a frase está imprecisa mesmo estando
  correta — explicação não fica no documento, e a próxima pessoa tropeça no
  mesmo lugar.

### O segundo passe do `/revisar`, e a regra que ele corrigiu

O fundador pediu um passe extra, e o critério dele **refinou o §2**: o primeiro
passe tinha achado só lacunas do tipo "valor sem documento", mas
`resolverMunicipio` **mudou de contrato** por decisão dele — forma nova de
código, não correção da mesma classe. Vale um par de olhos que não viu essa
forma. Achou.

**Eu tinha escrito, em três lugares, uma afirmação falsa sobre uma proteção.** A
migration, a especificação §6 e o comentário do schema diziam que a proibição de
escrever em `municipio` ficava em "dois lugares" — a ausência do `GRANT` **e** a
política —, e que "qualquer escrita que chegasse aqui seria recusada pela
política". Conferido no banco: `postgres` tem `rolbypassrls = true`, é dono da
tabela, e `FORCE` não muda isso. **A seed só grava porque passa por cima da
política**, não porque ela permita. A frase era verdadeira para a aplicação e
falsa justamente para o único papel que escreve ali.

**A saída não foi um papel novo, e o fundador explicou por quê.** A recomendação
era criar um `fretigate_semeador` sem esse poder, por analogia com o
`fretigate_reversor`. **O precedente não se aplica:** o reversor roda **no
caminho de execução**, durante o pedido do usuário; a seed é **comando de
operação**, mesma classe da migration — e migration roda como `postgres` e
sempre vai rodar. A regra não estava sendo contornada; **ela nunca falou desse
caso**.

Então a solução precisa foi escrever a regra certa, aplicando o padrão que já
estava no §2:

> **Nenhuma conexão que atende pedido de usuário ignora RLS.** Comando de
> operação — migration e seed — roda como `postgres`, e é assim por desenho.

O que separa os dois casos é **quem chama**, e isso ficou escrito junto: o
reversor é disparado pelo usuário; migration e seed, por quem opera.

**A lacuna do alcance da seed fechou por regra, não por papel.** Nada impedia a
próxima seed de tocar tabela com dado de cliente. Um papel restrito fecharia só
para a seed e **moveria o problema**, porque as migrations continuam podendo
tudo. A regra entrou no §3: **seed só toca tabela de referência global**, e a
lista dessas tabelas **não é reescrita** — é a das exceções de
`tests/isolamento/schema.test.ts`, que já existe e é executada. Duas listas
divergem, e a que envelhece é sempre a que ninguém roda.

**As outras três**, todas aceitas: os dois números da busca saíram do diário
para a especificação §6 (mesma correção que o teto de 100 recebeu no primeiro
passe — o diário registra onde o trabalho parou, não põe regra em vigor); o
comentário do contraste no teste passou a dizer que ali `postgres` é **controle
do experimento**, não jeito certo de gravar; e ficou **decidido** que só entra
na conta dos 10% o frete que **tem texto** de origem ou destino — frete sem
destino nunca teve o que resolver, e contá-lo faria o indicador subir sozinho.

### Pendências novas

- **Produção precisa da seed rodada à mão** antes do primeiro uso, senão o
  campo de município nasce vazio para o cliente pagante e origem/destino de
  todo frete ficam como texto livre. Registrada no `CLAUDE.md` §14, com o que
  rodar, quando e o que acontece se esquecer.
- **Ao Design: formalizar as cinco sugestões** de município em
  `docs/componentes.md`. É valor de tela, e o dono daquele documento é o Design
  (§13). Não bloqueia — o número já está decidido.

**Próxima: tarefa 2 — Tipo de operação, e toda empresa nascendo com "Frete".**

---

## 09/08/2026 — item 2 começa: escopo do MVP corrigido, e o formulário de caminhão não existe

Plano do item 2 aprovado e commitado em **`docs/planos/item-2-cadastros.md`** —
é o primeiro plano a seguir a regra nova do `CLAUDE.md` §2, que nasceu neste
mesmo dia e pelo pior motivo: a **primeira versão do plano se perdeu inteira**
ao fechar a aba, porque só existia na conversa. Mesma classe de problema que
este diário existe para resolver.

### O escopo do MVP, corrigido pelo fundador

**São 10 itens a construir** (o item 1 já fechou): 2, 3, 4, 5, 6, 7, 8, 10, 11
e 13. **Despesas (item 11) entra** — é o item mais barato da ordem de
construção, e sem ele o card de Lucro nunca sai do estado de convite, deixando
a dashboard com dois dos quatro cards vazios.

**Item 9 é parcialmente MVP**, e isso ficou escrito para ninguém tratar o item
inteiro como adiado: **Enviar ordem no WhatsApp** e **Cobrar no WhatsApp**
entram, com texto padrão fixo; só a tela de editar os dois modelos sai. Os dois
textos passam pelo fundador antes de virar código, e moram num arquivo só, já
com as variáveis no formato final.

**Ficam para depois do lançamento:** 12, 14, 15, 16, 17.

**A importação (15) é adiada, não removida**, e isso tem consequência em tela:
ela segue desenhada no atalho do cartão escuro da dashboard, na linha de Mais e
no estado vazio de Meus fretes — onde é a **saída principal**. Os dois primeiros
simplesmente não nascem; o terceiro **precisa de convite novo** (lançar o
primeiro frete), senão vira estado vazio sem saída. Registrado em
`docs/especificacao.md` §9.

**A distinção entre os dois cards de convite**, para não reabrir: *Rodagem* no
estado de convite é aceitável porque depende de um **campo opcional que o
usuário preenche**; *Lucro* não era, porque dependia de uma **funcionalidade
que não existiria**.

O item 12 pode esperar porque **o dado não se perde**: origem e destino são
guardados como referência de município, e o valor do frete também — então
distância e R$/km são deriváveis retroativamente. A parte **irrecuperável** é
origem e destino resolverem para município de verdade; se ficarem como texto
livre, nada é derivável nem depois. Daí a medição dos **10%** (piso de 20
fretes, e o aviso mostrando *quais* textos não resolveram), que ficou escrita
no **item 3**, não no 2 — ela mede fretes, e fretes só existem no item 3.

### O formulário de caminhão não foi desenhado — o Design se enganou

O Design respondeu que quatro dos cinco pedidos já estavam feitos em rodadas
anteriores, e o formulário de Caminhões era um deles. **Não é.** Conferido no
protótipo, que é a origem dos dois documentos de tela:

| Tela do protótipo | Estados | Campos digitáveis | Salvar |
|---|---|---|---|
| `TelaClientes.dc.html` | lista · perfil · **formulário** | 3 | Salvar cliente |
| `TelaMotoristas.dc.html` | lista · perfil · **formulário** | 2 | Salvar motorista |
| `TelaCaminhoes.dc.html` | lista · perfil | **0** | **nenhum** |

O perfil do caminhão tem "Editar caminhão" e "Arquivar caminhão" no fim, e o
**Editar não leva a lugar nenhum**. A prova que encerra a discussão está escrita
dentro do próprio protótipo, na resposta ao toque
(`TelaCaminhoes.dc.html:353`):

> `editar: () => this.avisar('Editar caminhão — formulário ainda não desenhado.')`

Não é interpretação de documento, não é analogia entre telas: é o próprio Design
dizendo, no arquivo dele, que a tela não existe.

**De onde veio o engano** — duas linhas do `docs/componentes.md`, e a segunda é
a perigosa: o agrupamento "Cadastro / edição (cliente, **caminhão**,
motorista)", que junta os três por analogia; e a "Auditoria da regra de
posição", que lista "formulários de cliente/**caminhão**/motorista/despesa"
entre os **conferidos no DOM** — auditoria que não podia ter medido o que não
existe. `docs/navegacao.md` está certo nas duas linhas ("lista e perfil ✅",
"Formulário de caminhão ⬜"), e o "ano" que ele descreve nesse formulário não
existe em canto nenhum do protótipo.

Isso virou regra no `CLAUDE.md` §13: **o `componentes.md` não põe tela no
mundo** — quem decide se a tela existe é o protótipo, e o marcador ✅/⬜ do
`navegacao.md` acompanha ele.

**Consequência maior que uma tela faltando:** as **duas** portas de criar um
caminhão estão sem desenho (o formulário e a folha de cadastro rápido do
lançamento). Sem nenhuma das duas não existe caminho para cadastrar caminhão no
produto — trava o `veiculo_habitual` do motorista e trava a escolha de caminhão
no **item 3**. Por isso a tarefa de Caminhões desta rodada entrega **só a
tabela**.

### A quinta exportação do Design chegou no meio da tarefa — e mudou a regra

`docs/componentes.md` mudou sozinho enquanto a tarefa 0 era escrita. Conferida
antes de commitar, como as quatro anteriores.

**O que ela entregou de bom:** o **formulário de caminhão**, especificado —
"Cadastrar caminhão" / "Salvar alterações", desabilitado até ter **apelido ou
placa**, chips para TIPO, "Arquivar caminhão" no fim, e **"Sem campo de ano"**
escrito com todas as letras, batendo com a decisão tomada horas antes. Também
separou cadastro de cliente e de motorista em linhas próprias, **corrigiu a
própria auditoria** (registrando que "auditoria por analogia não é auditoria") e
trouxe regras de construção úteis: um acessor único por campo, um jeito único de
nomear o caminhão quando só há placa, e a distinção entre "nunca editado" e "o
usuário apagou".

**O que ela desfez: oito decisões já tomadas.** A lista fechada de telas sem
barra (com "Link expirado" e "Primeiro acesso" de volta, recusados por escrito
no dia anterior) · a margem provisória dos Termos no modo Ajustes (**terceira**
perda do mesmo parágrafo) · a numeração 11 duplicada de novo · o rótulo do botão
principal · a cor do "adicionar" (`#5C6660`, recusado explicitamente) · a
exceção do Pix, que voltou a bloquear · a distinção de "ação composta" na regra
de Nome · e o título "Falta a chave Pix da sua empresa".

**E ela contradiz a si mesma** — duas seções descrevendo o mesmo padrão, com o
rótulo do botão e a cor do "adicionar" em desacordo dentro do mesmo arquivo.

As oito foram **reaplicadas à mão**, exatamente como decididas em 07 e 08/08; as
duas contradições internas resolvidas pela decisão anterior, não por escolha de
quem escreve. O conteúdo genuinamente novo ficou, com as regras de construção
recolhidas numa seção própria ("Uma leitura só de cada campo") em vez da seção
11 duplicada. A tabela-resumo de gatilhos que a exportação trouxe foi
descartada: o que ela dizia contradizia as decisões que a seção 12 já carrega.

**Por isso a regra do §13 mudou.** O repositório passa a ser o dono de
`docs/componentes.md` e `docs/estilo.md`; o Design entrega **só as seções
novas**, e o fundador encaixa. Motivo: cinco exportações, cinco reversões das
mesmas decisões — e a quinta chegando contradizendo a si mesma é sinal de que a
fonte do Design já tem duas versões do mesmo conteúdo. **Reaplicar à mão trata o
sintoma; parar de sobrescrever trata a causa.**

**A tarefa 6 mudou de escopo por causa disso:** de "só a tabela" para
**Caminhões completo** — tabela, lista, perfil e formulário. O protótipo e o
marcador do `navegacao.md` ainda não acompanham, mas isso não bloqueia: quem
define o que a tela contém é o `componentes.md`, e **o protótipo é evidência
corroborante, nunca autoridade** (registrado no §13). O formulário é montado com
as peças da tarefa 5 — consistência por construção — e passa pelo
`/auditar-tela`.

### Pendências pedidas ao Design nesta rodada

- ~~**Formulário de caminhão**~~ — **entregue** na quinta exportação, já sem o
  campo `ano`.
- ~~**Correção das duas linhas da auditoria**~~ — **corrigida** pela própria
  exportação, com o motivo registrado.
- **Folha de cadastro rápido de caminhão** — a outra porta de criar caminhão,
  ainda `⬜`. Não bloqueia esta rodada: ela nasce dentro do lançamento de frete
  (item 3).
- **`Categoria da CNH` sai** da folha de cadastro rápido de motorista. Não
  alimenta cálculo, relatório, cobrança ou ordem, e essa folha existe para pedir
  o mínimo durante o lançamento, onde cada campo briga com os 30 segundos. Sem
  esse pedido, a próxima entrega o traz de volta.
- **O protótipo e o marcador `⬜` do `docs/navegacao.md`** precisam acompanhar o
  formulário de caminhão. Acerto de documentação — não bloqueia.
- **A partir de agora, só seções novas** — nunca o arquivo inteiro (§13).
- **Convite novo para o estado vazio de Meus fretes.** Com a importação adiada,
  a saída principal daquela tela sumiu, e o convite passa a ser **lançar o
  primeiro frete**. É o único dos três lugares que não se resolve apagando uma
  linha (ver `docs/especificacao.md` §9, "O que o corte da importação deixa em
  tela").

### Decisões de modelo que a tarefa 0 registrou

- **`ativo` sai de `Veiculo` e de `Motorista`** — arquivar é o único mecanismo.
  Dois mecanismos para "sumiu da lista" divergem em algum filtro, e hoje nenhuma
  tela tem botão de desligar. O `ativo` de `TipoOperacao` **fica**: ali não é
  estado de registro, é quais ramos do produto estão ligados.
- **`Empresa.prazo_padrao_dias` entra agora, com 15**, antes da tela que o edita
  (item 10). Exceção consciente ao "coluna sem tela que a preencha é peso
  morto": ela já tem **quem a leia** no item 2 — o cliente com prazo vazio
  precisa dizer de onde herda. O 15 já estava vigente no `componentes.md` e
  nunca tinha sido escrito na especificação.
- **A seed de municípios nunca roda em `postinstall`**, e grava pela conexão das
  migrations. `fretigate_app` fica só com `SELECT` em `municipio`.
- **`Municipio` é exceção declarada à regra do `id`** — a chave é o
  `codigo_ibge`. Ficou escrita junto da exceção que ela já tinha (`empresa_id`),
  porque as duas vêm da mesma natureza: não é dado do usuário, é tabela oficial
  de referência. Criar um `id` ao lado custaria mais que a exceção, e o custo
  não ficaria na tabela de município: **todo lugar que guarda "o município"** —
  cliente, empresa, origem e destino do frete — teria que escolher qual dos dois
  guardar, e uns guardariam um e outros o outro.
- **O (+) da barra fica ativo e abre o cadastro de cliente, provisoriamente.**
  Não inventa cor de desabilitado que documento nenhum define, e não muda a
  geometria da barra duas vezes (a folga de 138px é medida do topo do (+)).
  **No item 3 ele passa a abrir Lançar frete** — marcado como provisório no
  código também, porque provisório sem prazo escrito vira permanente.

### O que o `/revisar` achou nesta tarefa, e o que mudou por causa dele

Seis achados, todos aceitos. Três merecem registro:

- **Eu repeti, na seção `Veiculo`, o defeito que este commit existe para
  nomear:** justifiquei tirar o `ativo` dizendo "como o formulário desenhado
  oferece". O formulário não existe — o "Arquivar" está no **perfil**. Foi
  também o revisor que achou a frase do protótipo citada acima, que eu não tinha
  visto.
- **Declarar desvio no documento errado não põe desvio em vigor.** A exceção ao
  §9 estava escrita só na especificação, e quem manda é o `CLAUDE.md`. Ao voltar
  para escrevê-la no lugar certo, apareceu a saída que **não precisa de
  exceção**: `USING (true) WITH CHECK (false)` cumpre as duas cláusulas do §9 e
  é mais rígida que a versão com exceção. Virou padrão no §2 — *quando uma regra
  parece precisar de exceção, procure primeiro a solução mais precisa que não
  precisa dela*.
- **"~5.570" tinha virado 5.570 cravado, e condição de recusa da seed.**
  Município novo é criado por lei estadual: no dia em que o IBGE mudasse a
  conta, a seed pararia de carregar — o oposto do que ela protege. Passa a
  conferir contra a quantidade que o próprio arquivo declara, registrada na
  procedência junto da data do download.

Os outros três: os quatro ícones que faltam passam a ser **exportados para
`docs/icones/`** (nenhum documento autorizava tirá-los do protótipo direto), o
(+) desabilitado virou a pergunta que gerou a decisão acima, e os textos de
WhatsApp vão para `src/lib/servicos/mensagens.ts` — `src/lib/mensagens/` não
existe na estrutura de pastas do §6.

### Estado da árvore

A alteração do `docs/especificacao.md` que já estava sem commit (regras de
`documento` de Cliente e Motorista — formato e unicidade parcial por empresa)
entra neste mesmo commit: é documentação do item 2, escrita antes desta sessão.

`docs/componentes.md` entra **num commit próprio, antes deste** — a exportação
do Design com as oito restaurações, pela regra que ela mesma acabou de fazer
mudar.

---

## 08/08/2026 — exportação do Design conferida antes de commitar (a quarta com problema)

Enquanto a tarefa 10 fechava, `docs/componentes.md` e `docs/navegacao.md`
mudaram sozinhos — uma exportação do Design chegando por fora desta sessão.
Pelo `CLAUDE.md` §13 ela entra em commit próprio, antes de código de tarefa.
Antes de commitar, conferida com o mesmo rigor das três anteriores (regra de
posição revertida, login por WhatsApp de volta, prazo do link para 1 hora,
exceção de barra apagada) — porque, junto com aquelas, esta é a **quarta**.

### O que ela apagou, que tinha sido acrescentado à mão

- **O parágrafo de exceção da barra do `CLAUDE.md` §8**, em
  `docs/componentes.md`. Ele já vinha marcado, por escrito, como reaplicado à
  mão porque a exportação de 07/08/2026 não trazia: "(Esta nota não vem nas
  exportações do Design de 07/08/2026 — reaplicada aqui...)". Esta
  exportação apagou de novo — é a mesma perda de antes, pela segunda vez.
- **O parágrafo sobre Termos no modo Ajustes** (mesma vizinhança do anterior),
  que dizia que os dois modos de `/termos` usam a margem provisória do
  cadastro **enquanto Ajustes não existir**. Apagado, e o que entrou no lugar
  contradiz — ver abaixo.
- **A seção inteira "Lacunas registradas — tarefa 8, fatia 2"**, com duas
  coisas que só existiam ali: o detalhe de acessibilidade do `ChipEscolha`
  usado como aba (`role="radio"`, não `role="tab"`, pendente do Design
  desenhar aba de verdade — não sobrou em nenhum outro lugar do arquivo,
  conferido) e o registro de que a seção "Campo de texto" nunca veio em
  nenhuma exportação. **Conferido: a seção "Campo de texto" continua sem
  existir no arquivo** — a pendência foi apagada, o problema que ela
  rastreava não foi resolvido.

### O que contradiz decisão já registrada

- A seção nova "Barra de navegação: exceção fora de sessão" acrescenta
  **Link expirado** e **Primeiro acesso** à lista de telas sem barra. O
  `CLAUDE.md` §8 registra essa lista como **fechada**: "tela nova sem barra
  entra aqui só com decisão explícita, não por analogia." Nenhuma das duas
  entrou por decisão do fundador — e "Primeiro acesso" nem é claramente "fora
  de sessão" pela própria definição do §8: a pessoa já tem conta criada e
  login feito nesse ponto.
- A mesma seção afirma que **Termos vindo de Ajustes "ganha barra"** — direto
  contra o parágrafo que a própria exportação apagou (item acima) e contra o
  `CLAUDE.md` §8, que diz que nenhum dos dois modos de `/termos` tem barra de
  verdade **até Ajustes existir**.

### O que veio corrompido

- **`docs/navegacao.md`** — o título "## Regras de navegação" saiu partido: a
  pílula nova foi inserida no meio do texto do título, deixando "## Regras"
  como título e "de navegação" sobrando sozinho numa linha, sem sentido.
  Defeito mecânico, não de conteúdo — **corrigido à mão nesta sessão**,
  restaurando o título e mantendo o conteúdo novo.
- **`docs/componentes.md`** — colisão de numeração e duplicação de conteúdo.
  A seção nova entrou como **"## 11 — Folha de campo faltante"**, mas já
  existem, mais abaixo, **"## 11 — Cadastro rápido"** (conteúdo antigo,
  intocado) e **"## 12 — Folha do campo que falta"** — que descreve o
  **mesmo padrão** (folha curta ao tocar ação com campo faltante), com
  detalhes que não batem com a seção nova:
  - a seção 12 (antiga) diz que o botão principal usa **o nome da ação
    original** ("Cobrar no WhatsApp"); a seção 11 (nova) diz que o botão diz
    **para onde a ação segue** ("Salvar e cobrar", "Salvar e enviar ordem") —
    regras diferentes para a mesma peça;
  - a seção 12 lista três gatilhos, incluindo "Gerar relatório com Pix sem
    chave Pix"; a seção 11 lista dois gatilhos mais "campo vazio no perfil do
    cliente" e **não menciona o gatilho do Pix**.
  Duas seções, mesmo número, descrevendo a mesma coisa de dois jeitos que não
  concordam entre si. **Não corrigido** — não é defeito mecânico, é decisão
  de conteúdo (ver pendências abaixo).

### As três pendências, resolvidas pelo fundador (08/08/2026)

1. **Lista de telas sem barra**: recusada a ampliação. `docs/componentes.md`
   voltou aos sete itens já aceitos (os seis do `CLAUDE.md` §8 mais
   "Recuperação enviada", que já estava na lista antes desta exportação —
   ver `ffc8e1e`). "Link expirado" e "Primeiro acesso" saíram; nenhum dos
   dois entrou por decisão explícita do fundador, e o §8 proíbe ampliar por
   analogia.
2. **Termos no modo Ajustes**: mantida a decisão já registrada. O parágrafo
   apagado pela exportação foi reaplicado à mão em `docs/componentes.md`: os
   dois modos de `/termos` seguem usando a margem provisória do modo
   cadastro até Ajustes existir; o documento não volta a prometer barra que
   não existe.
3. **Seções 11/12 duplicadas**: unificadas em uma só, na posição 12 (a
   posição 11 pertence a "Cadastro rápido", conteúdo antigo e intocado). O
   conteúdo unificado ficou assim, por decisão do fundador:
   - o rótulo do botão principal diz **para onde a ação leva** ("Salvar e
     cobrar", "Salvar e enviar ordem", "Salvar e gerar relatório", "Salvar
     no cadastro") — repetir o nome da ação original passaria a impressão de
     que a primeira tentativa falhou. Isso não abre exceção na regra "uma
     ação, um nome" (`docs/componentes.md` "Regras"): a regra vale para a
     **mesma ação** em lugares diferentes, e "Salvar e cobrar" é **ação
     composta** — salva e continua outra —, não a mesma ação de "Cobrar no
     WhatsApp" com nome trocado. A regra ganhou essa distinção por escrito;
   - a lista de gatilhos ficou com os **quatro**, porque nenhuma das duas
     versões estava completa sozinha: Cobrar no WhatsApp sem telefone do
     cliente · Enviar ordem sem telefone do motorista · Gerar relatório
     **com cobrança marcada** sem chave Pix da empresa (relatório sem
     cobrança não pede Pix) · campo vazio tocável no perfil. O gatilho do
     Pix também é o único que **não bloqueia**: "Agora não" gera o
     relatório do mesmo jeito, sem a chave, com aviso curto do sistema —
     bloquear seria pior, o cliente ainda pode pagar por boleto ou
     transferência;
   - a cor do "adicionar" no perfil ficou em `#1B6B3A` como **texto**, não
     como fundo preenchido — a exclusividade do verde sólido (`docs/
     componentes.md` "Regras") é sobre fundo, não sobre cor de texto, e
     verde como texto já marca elemento tocável em outros lugares do
     inventário (pílula em linha, pílula de cabeçalho, chip selecionado).
     `#5C6660` foi descartado por ser a cor de desabilitado — o oposto
     semântico de um campo tocável.
   `docs/navegacao.md` ganhou o gatilho do Pix/relatório que faltava na
   frase equivalente da seção "Regras de navegação", pela mesma razão.

### Pendências pedidas ao Design (fonte), acumuladas — conferir a cada exportação nova

- O parágrafo de exceção da barra do `CLAUDE.md` §8 precisa **vir** na
  exportação, não ser reaplicado à mão a cada vez — já é a segunda perda
  desse parágrafo específico. O parágrafo de "Termos no modo Ajustes" é um
  parágrafo à parte, vizinho dele, e essa foi a primeira vez que ele se
  perdeu — os dois pedidos ao Design são independentes, não a mesma conta.
- A seção "Campo de texto" nunca veio em exportação nenhuma desde
  07/08/2026.
- O defeito mecânico de título partido (este, em `docs/navegacao.md`) —
  registrar para conferir se o próximo lote vem limpo ou repete o problema.
- A seção "Folha de campo faltante" perdeu o gatilho de "Gerar relatório
  sem chave Pix" ao ser reexportada — a fonte do Design precisa incluir os
  quatro gatilhos (telefone do cliente, telefone do motorista, Pix do
  relatório, campo vazio no perfil), senão a próxima exportação apaga de
  novo.

### O que não mudou de conteúdo, e por isso não entrou nas listas acima

A seção nova "Folha de campo faltante" em `docs/componentes.md`, fora a
colisão de número e a divergência de detalhe já registradas, e a linha nova
em `docs/navegacao.md` ("Folha de campo faltante não é tela...") — conteúdo
aditivo, sem contradição encontrada além do já listado.

---

## 08/08/2026 — tarefa 10 fechada: as duas correções de documento do item 1, e o item 1 concluído

**Fechada.** As duas pendências que a tarefa 10 herdou da fila do item 1 —
texto solto no `docs/navegacao.md` e um desvio não documentado no
`docs/especificacao.md` — foram conferidas, e as duas já estavam corrigidas,
resolvidas ao longo do próprio item 1 em vez de esperar por uma tarefa
dedicada:

- **`docs/navegacao.md`, tela `Entrar`** — não fala mais em código por
  WhatsApp; a linha diz "**E-mail e senha** → Primeiro acesso · Criar conta ·
  Esqueci a senha. O app nunca envia mensagem sozinho, então não há código
  por WhatsApp", sem `⚠️` (conferido: nenhum `⚠️` resta no arquivo inteiro).
  Veio pela segunda exportação do Design, na tarefa 8 fatia 2.
- **`docs/especificacao.md` §6, `Usuario`** — já registra por escrito que
  `senha_hash` não existe, com o motivo (Better Auth guarda o hash em
  `account`, provedor `credential`). O desvio apontado na tarefa 3 está
  documentado, não só corrigido no código.

Também conferido, fora da fila formal da tarefa 10 mas do mesmo tipo: nenhum
resíduo de "Nome da transportadora" sobra em `docs/navegacao.md`,
`docs/especificacao.md` ou `docs/componentes.md` — só o uso correto do termo
em contexto de marketing, previsto pelo próprio vocabulário do `CLAUDE.md` §8.

**A pendência do Storage (isolamento do `storage.objects`, balde privado, URL
assinada) continua em aberto** — ela nunca fez parte desta fila: o diário já a
registrava como pendência **fora do item 1**, porque depende do item 5
(upload) existir. Sem mudança aqui.

Com isso, **o item 1 da ordem de construção (`docs/especificacao.md` §9) está
concluído** — as dez tarefas fecharam.

### Próximo — item 2: cadastros

Cliente, veículo, motorista, tipo de operação e municípios — a base sobre a
qual o item 3 (lançamento de frete) se apoia.

**As duas bibliotecas já foram aprovadas pelo fundador** (08/08/2026, nada
instalado ainda): fonte dos municípios — `kelvins/municipios-brasileiros`
(MIT, derivado do IBGE, 5.570 registros com latitude/longitude do centro,
seed estática comitada, não dependência de runtime) — e validação de
CPF/CNPJ — pacote `cpf-cnpj-validator` (zero dependências, adaptador Zod,
já atualizado para o CNPJ alfanumérico da Receita).

**Duas exigências já registradas para a seed de municípios**, a valer quando
ela for escrita: (1) conferência na carga — contagem de 5.570, nenhuma
coordenada nula/zerada, todas dentro dos limites do Brasil, a seed recusa se
algo falhar em vez de carregar dado ruim; (2) procedência registrada no
repositório — de onde veio o arquivo, data do download, licença.

**A correção do CNPJ para o formato alfanumérico da Receita já fechou**,
commit `ffc8e1e`, 08/08/2026 — normalização, trava de unicidade reforçada
por `CHECK` no banco (`empresa_cnpj_formato`, testado em 7 casos) e
confirmação de que o CPF não muda. Ver entrada própria mais abaixo (a que
fechava a tarefa 10) para o detalhe original, e a entrada da exportação do
Design logo acima para o que ficou pendente antes do plano do item 2 poder
começar.

**Pendente com o Design, registrado antes de começar:** o formulário de
cadastro/edição de Caminhão ainda não foi desenhado. `docs/navegacao.md` tem
a linha "Caminhões — lista e perfil", e `docs/componentes.md` só cobre a linha
da lista (apelido · placa · tipo) e o padrão de lista compartilhado com
Clientes — ao contrário de Cliente, nenhum dos dois documentos tem a tela de
cadastro/edição do caminhão em si. Já pedido ao Design pelo fundador. Bloqueia
só a parte de `Veiculo` do item 2 — Cliente, Motorista, TipoOperacao e
Municipio seguem sem depender disto.

---

## 08/08/2026 — a esteira falhou por falta de `RESEND_API_KEY`, e por que só `BETTER_AUTH_SECRET` virou secret do GitHub

Primeira execução real do `ci.yml` (tarefa 9): as 25 verificações de
isolamento passaram, e `tests/cadastro.test.ts` nem chegou a rodar — parou ao
carregar, por falta de `RESEND_API_KEY`. **Falhou pelo motivo certo**: o
teste não manda e-mail, só precisa que o módulo carregue, mas
`src/lib/auth/email.ts` lança erro no carregamento se a variável faltar (a
mesma defesa que protege a publicação — ver "Ambientes" no `CLAUDE.md` §5).

Resolvido com cinco variáveis a mais no `.env` que a esteira monta:
`RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_RESPOSTA`, `BETTER_AUTH_SECRET` e
`NEXT_PUBLIC_APP_URL` — nenhuma delas precisa de valor real, porque nenhum
teste da suíte manda e-mail de verdade nem depende do domínio de produção.

**Por que só `BETTER_AUTH_SECRET` virou secret do GitHub, e as outras quatro
ficaram fixas no `ci.yml`:** o perigo funcional dos cinco é o mesmo — zero,
porque nenhum protege dado real no projeto de teste. A diferença é a *forma*
do valor. Endereço de e-mail e URL não parecem segredo para ninguém,
inclusive para um scanner automático. `BETTER_AUTH_SECRET` parece — é uma
string de alta entropia, do tipo que o scanner de segredo do próprio GitHub
(e qualquer ferramenta parecida) foi feito para achar. Deixar essa forma
fixa no repositório, mesmo inofensiva, teria dois custos: um alerta que
dispara sem motivo real, e o hábito de aprender a ignorar esse alerta
específico — que é exatamente o hábito que faz um alerta de verdade passar
despercebido depois. Mover um valor para secret custa um cadastro de um
minuto; o alerta falso ensinando a ignorar custa mais caro, e não tem como
desfazer depois de instalado. Decisão do fundador, 08/08/2026.

---

## 08/08/2026 — caractere especial em senha, terceira rodada: heredoc sem aspas no `ci.yml`

Ao escrever `.github/workflows/ci.yml` (tarefa 9), o passo que grava as três
URLs de conexão num `.env` usava `cat <<EOF > .env` sem aspas no delimitador.
Sem aspas, o shell interpreta `$` e crase dentro do heredoc — se qualquer
senha tivesse um desses caracteres, o `.env` sairia com um valor diferente da
credencial de verdade, ou pior, tentaria executar um comando embutido nela.
Achado pelo `/revisar`, não visto na escrita.

**Terceira vez que caractere especial em senha custa uma rodada neste
projeto:** os colchetes `[senha]` copiados do painel do Supabase (tarefa 2,
ver "Percalço no caminho, para não repetir" mais abaixo), a advertência que já
existe em `.env.example` ("a senha, se tiver caractere especial, precisa ir
codificada para URL"), e agora este heredoc. Corrigido para
`cat <<'EOF' > .env` — delimitador entre aspas simples desliga toda
interpretação do shell dentro do bloco, e o valor gravado passa a ser sempre o
literal que veio do secret.

---

## 08/08/2026 — preparação da tarefa 9: projeto de teste no Supabase, e a pegadinha da pausa

Antes do primeiro passo da tarefa 9 — a suíte de isolamento sai do banco de
desenvolvimento e passa a rodar contra um projeto próprio, só de teste, na
esteira do GitHub Actions — conferido na documentação do Supabase: **cabe no
plano gratuito**. O limite é 2 projetos ativos por organização, e o FretiGate
hoje usa 1. Sem custo novo.

**A pegadinha, registrada para não custar meia hora de investigação depois:**
projeto gratuito do Supabase pausa sozinho depois de **7 dias sem atividade
suficiente** — a própria documentação diz que poucas consultas por dia ao
longo da semana evitam a pausa. Chega aviso por e-mail uma semana antes, e
depois de pausado a restauração é **só manual, pelo painel do Supabase** —
não existe endpoint de API nem comando de CLI para isso, então a esteira não
se recupera sozinha.

Como a esteira roda a cada push, na prática isso só acontece se ficar **mais
de uma semana sem nenhum commit**. Quando acontecer: a esteira falha com erro
de conexão recusada, e esse erro **parece defeito no código ou na
migration** — não é. Primeiro lugar a olhar, antes de investigar qualquer
outra coisa: painel do Supabase → projeto de teste → botão de retomar o
projeto.

---

## 08/08/2026 — tarefa 8 (fatia 2): Entrar, Esqueci a senha, Redefinir senha, Termos

**Fechada** — fecha o ciclo de recuperação de senha por inteiro: o e-mail
chega, o link abre a tela certa, a senha é redefinida e a pessoa já entra com
ela. Três commits: duas exportações do Design chegaram no meio da tarefa, e
as duas tiveram que entrar sozinhas, antes do código (`CLAUDE.md` §13).

### O que entrou

- `src/app/(auth)/entrar/` — e-mail e senha, com a trava do Better Auth e a
  mensagem certa por tipo de erro.
- `src/app/(auth)/esqueci-a-senha/` + `src/components/auth/
  PedidoDeRecuperacao.tsx` — pedido do link e confirmação, reaproveitados
  também no reenvio a partir do link vencido.
- `src/app/(auth)/redefinir-senha/` — a tela que o link do e-mail abre.
  Campo único de senha, com revelar (Mostrar/Ocultar). Link vencido: bloco
  de alerta explicando que a conta e os fretes seguem intactos.
- `src/app/(auth)/termos/` — Termos e Política, texto marcado como rascunho,
  duas abas (reaproveitando `ChipEscolha` — sem componente de aba ainda).
- `src/lib/servicos/trava-de-redefinicao.ts` (limite de consulta ao código,
  por custo) · `src/components/ui/PilulaEmLinha.tsx` (peça 04 do inventário,
  primeira vez em uso) · `CampoTexto.tsx` ganhou a variação "revelar".
- Senha mínima passou a ser **6 caracteres**, fixada em `src/lib/auth/
  index.ts` — decisão nova desta tarefa, não existia antes.
- `Sair da conta` e sessão vencida agora vão para `/entrar` (antes iam para
  `/criar-conta`, porque `/entrar` ainda não existia).

### A decisão mais cara: o e-mail nunca sai do servidor

O plano original guardava o e-mail na própria URL do link de recuperação,
para o "mandar de novo" funcionar num toque só. O fundador travou: endereço
na URL vira registro de servidor e histórico de navegador, e o `CLAUDE.md`
§4 proíbe dado pessoal em log. Investigação, antes de escrever qualquer
código: o Better Auth guarda o código de recuperação numa tabela ligada ao
usuário, e ela não é apagada no instante em que vence — só como efeito
colateral de alguém consultar QUALQUER código, de qualquer pessoa. Ou seja,
o servidor geralmente ainda consegue descobrir a quem um código vencido
pertencia, contanto que a consulta não passe primeiro pela rota própria do
Better Auth (que apaga o código vencido antes de dar a chance de olhar).
Solução: `sendResetPassword` (`src/lib/auth/index.ts`) manda o link direto
para `/redefinir-senha?token=...`, nunca pela rota da biblioteca. A tela
resolve o e-mail no servidor (`src/lib/servicos/redefinicao-de-senha.ts`) e
só entrega para o navegador dentro dos próprios dados da página — nunca a
URL. Quando o servidor não consegue mais achar (código já usado, ou varrido
por outra consulta), a tela cai para pedir o e-mail de novo — o plano B que
o fundador já tinha aprovado para esse caso.

### Duas exportações do Design chegaram no meio, e as duas pararam a tarefa

A primeira substituiu `docs/navegacao.md` e `docs/componentes.md` por
inteiro. Trouxe conteúdo real para telas que eu tinha improvisado (nomes de
botão, o papel tipográfico "Corpo de texto fora de sessão") — e contradisse
duas decisões que a conversa tinha acabado de fechar: o nome do botão de
reenvio, e se a tela de confirmação tem alguma saída. O fundador resolveu na
hora: um campo de senha só (não "senha" + "repetir senha" — "quem erra
digitando erra duas vezes"), nome unificado em **"Mandar link novo"** em
toda parte, e as **2 horas** de validade do link mantidas — a exportação
mencionava 1 hora, mas prazo é regra de produto da tarefa 7, com motivo
registrado, e `componentes.md` manda no que a tela contém, não nisso.

A segunda exportação sincronizou essas decisões de volta nos dois documentos
— e trouxe "senha mínima: 6 caracteres" como se já fosse regra registrada.
Não era: conferido, não estava em `docs/especificacao.md` em lugar nenhum.
Perguntado, o fundador confirmou 6 como a regra real — primeira vez que ela
existe no produto, e entrou junto desta tarefa (`src/lib/auth/index.ts`,
`docs/especificacao.md`).

Cada exportação virou commit próprio, nunca junto do código que dependia
dela — CLAUDE.md §13, seguido as duas vezes.

### `/auditar-tela` e `/revisar`

`/auditar-tela` em Esqueci a senha, antes da primeira exportação chegar,
achou dois problemas: erro de campo ("E-mail inválido") solto embaixo do
botão em vez de preso ao próprio campo, e "Voltar pra entrada" sobrevivendo
à tela de confirmação, que a documentação da época não listava para lá. Os
dois corrigidos.

`/revisar` no fim achou, entre outros: peso de fonte errado nos parágrafos
de Termos (400 em vez de 600), a Política prometendo "remoção" de dado
(contradiz `CLAUDE.md` §7 — trocado por "exportação"), duas lacunas do
Design registradas só em comentário de código, nunca em `docs/`, e a
consulta de `/redefinir-senha` sem trava nenhuma (virou
`trava-de-redefinicao.ts` — por custo de rota sem limite, não por
adivinhação do código).

### Pendências, registradas nos documentos, não só aqui

- Duas lacunas do Design em `docs/componentes.md`: abas via `ChipEscolha`
  (sem componente de aba de verdade ainda) e a seção "Campo de texto", que
  nenhuma das duas exportações trouxe de volta.
- `CLAUDE.md` §14 ganhou um item somado ao bloqueio de lançamento já
  existente: tocar em "Termos de uso" no meio do cadastro navega para longe
  e perde o formulário preenchido. A correção certa é abrir os Termos por
  cima do formulário (folha/modal), não guardar rascunho — não construída
  nesta fatia.
- Bloqueio de lançamento (forma do aceite e redação dos Termos, sem revisão
  jurídica) continua de pé, sem mudança.

### Próxima

Tarefa 9 — travas de ESLint e SQL cru na integração contínua, mais duas
sub-tarefas já registradas: 9b (teste permanente da trava de banco) e 9c
(privilégio de execução de função para `anon`/`authenticated`, achado na
tarefa 8). Lista completa perto do fim deste diário, na entrada mais antiga
("Tarefas restantes do item 1").

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
9d. **`privilegios.test.ts` só confere ausência, nunca presença.** Achado
    no `/revisar` da tarefa 9c: as verificações de "tabela/função futura não
    nasce aberta" conferem que `anon`/`authenticated`/`PUBLIC` NÃO aparecem no
    privilégio padrão — nunca que `service_role` aparece, que é o que o
    `CLAUDE.md` §4 promete ("service_role continua com privilégio, decisão,
    não esquecimento"). Hoje isso só foi confirmado à mão, por consulta direta
    ao banco (`{postgres=X/postgres,service_role=X/postgres}`), não por teste
    que rode de novo amanhã. Vale para os dois — tabela (`padraoFuturo`) e
    função (`padraoFuturoFuncao`) — porque o buraco é o mesmo padrão nos dois
    lugares, não uma regressão desta tarefa. Adiado de propósito: mesma
    correção, um teste só, depois que alguém decidir a forma (provavelmente
    uma verificação extra dentro de cada `it` já existente, não um `it` novo).
10. ~~Correções nos documentos~~ — RESOLVIDO em 08/08/2026, ver entrada no
    topo deste arquivo. A pendência do Storage segue em aberto, fora do item
    1 (ver "Pendências fora do item 1" logo abaixo)

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
