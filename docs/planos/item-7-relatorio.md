# Plano — item 7: Relatório do cliente, PDF e compartilhamento

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 6 fechou no commit `8b7d894`, esteira verde.

Hoje o dinheiro só nasce por **um** caminho: faturar direto no frete (item 6,
Tarefa 1). O segundo caminho previsto em `docs/especificacao.md` §7 ("Como um
serviço vira título") — automático, ao gerar relatório — não existe. E o
documento em si (o que hoje o dono faz à mão no Canva, `CLAUDE.md` §1) também
não existe: nenhuma linha de código, nenhuma tabela.

O banco já deixou um lugar reservado: `titulo_receber.relatorio_id` nasceu no
item 3 como identificador solto, **sem chave estrangeira**, com o aviso
escrito no próprio schema (`prisma/schema.prisma`, `model TituloReceber`):
"quem construir o item 7 adiciona a FK por migration própria." Este plano
fecha essa pendência na Tarefa 1.

As telas já estão desenhadas — `docs/componentes.md` ("Relatório —
montagem", "Documento A4", a folha de campo faltante para chave Pix) e
`docs/navegacao.md` (linhas 30-31, e os `⚠️` que apontam pra cá em Fretes,
Cobranças e perfil do cliente). Não há desenho para inventar, só construir.

## A medição que veio antes deste plano

`CLAUDE.md` §2 pede decisão por medição, não por dedução, e este item tinha
uma peça técnica sem precedente no produto: o PDF do relatório precisa sair
**idêntico** à prévia que a pessoa vê na tela (`docs/estilo.md`, seção
"Impresso — só o documento A4" — fonte específica, fios finos, espaçamento em
milímetro). O fundador pediu a medição real, publicada na Vercel, antes de
decidir a arquitetura — feita em 27-28/08/2026, com dois experimentos
descartáveis (nunca commitados, projetos Vercel apagados depois).

**Abordagem escolhida: navegador invisível (headless Chromium) rodando na
própria função do servidor**, via `puppeteer-core` + `@sparticuz/chromium`.
Renderiza a mesma marcação da prévia da tela e imprime em PDF — sem
contratar nenhum serviço de terceiro (não entra subprocessador novo na
política de privacidade), sem custo mensal extra.

**O que a medição encontrou:**

1. **Funciona, e coube no tamanho que a Vercel aceita** sem precisar da
   versão "enxuta" do pacote (`@sparticuz/chromium-min`, que exigiria hospedar
   o binário do Chromium à parte). A versão completa bastou.
2. **Tempo — dois casos, não um:**
   - Função "fria" (nenhuma chamada recente — **o caso comum deste produto**:
     o dono gera relatório cerca de uma vez por semana, então a função quase
     sempre estará fria, não é o caso raro): **≈ 2,9 segundos**.
   - Função "quente" (chamada recente, o servidor ainda de pé): **≈ 0,4
     segundos**.

   **Isto muda o desenho da tela de montagem (Tarefa 3):** o estado
   carregando do botão **Gerar relatório** já é regra do produto
   (`CLAUDE.md` §8), mas ele precisa aguentar ~3 segundos como caso normal,
   não como exceção rara — vale conferir com o Design se o carregando padrão
   comunica isso bem, ou se este botão específico merece um texto próprio
   ("Gerando o documento..." em vez do spinner mudo). Registrado como
   pendência de confirmação do Design, não decidido aqui.
3. **Achado real, não hipotético: a fonte (Archivo, via Google Fonts) não
   traz todo caractere que o produto usa.** Testado com os símbolos que
   aparecem de verdade no código-fonte hoje (fora acentos comuns, esses
   provados OK): de oito símbolos, dois faltam —
   - **`→` (seta, U+2192)** — usada por `formatarRota`
     (`src/lib/utils/rota.ts`), que o relatório reaproveita para a coluna
     Rota. **Sem correção, toda rota do PDF sairia com um quadrado vazio no
     lugar da seta.**
   - **`✓` (check, U+2713)** — só em rótulo de botão da tela (`AcaoMarcarRecebido.tsx`,
     "Recebido ✓"), nunca em texto do relatório. Não afeta este item, mas
     confirma que a fonte tem buracos reais — motivo a mais para a correção
     abaixo não ficar restrita à seta.
   - **Passam sem problema:** ponto médio `·`, travessão `—`, meia-risca `–`,
     reticências `…`, indicador ordinal `º`, chevron `›`.

   **Correção decidida (Tarefa 2): auto-hospedar os arquivos da fonte**
   (baixados uma vez, guardados no repositório), em vez de depender de uma
   chamada de rede ao Google Fonts a cada geração de PDF — mais rápido, sem
   depender do Google estar no ar, e cobrindo explicitamente os caracteres
   que faltavam.
4. **Achado de infraestrutura, sem relação com o PDF:** o primeiro projeto
   Vercel criado para o teste travou de forma reproduzível em reenvios
   seguintes (a build nunca chegava a começar, minutos parado) depois de uma
   tentativa automática da CLI de conectar o repositório do GitHub, que
   falhou por falta de autorização. Um projeto novo, do zero, não teve o
   problema. **Não é um risco para a construção real** (que nunca passa por
   `vercel deploy` na CLI — vai direto pelo GitHub Actions/push, como todo
   commit já vai), mas fica registrado caso a mesma CLI seja usada de novo
   para depurar algo.

## Decisões tomadas nesta rodada (28/08/2026), antes de escrever código

### Frete em andamento entra na lista; frete cancelado, nunca

Achado ao revisar este plano: a montagem (Tarefa 3) ia mostrar "qualquer
situação financeira" sem distinguir situação **operacional** — e um frete
`em_andamento` (o caminhão ainda na estrada) ou `cancelado` também são
"qualquer situação".

**Cancelado nunca entra na lista.** Mesmo motivo de já sair de toda soma
derivada desde o item 4 (`docs/especificacao.md` §7: "a razão é 'não vai
acontecer', não 'ainda não aconteceu'") — um frete cancelado num documento
que vai para o cliente só gera pergunta, nunca informação.

**Em andamento entra na lista, mas não aceita a marca de cobrança.** O
relatório serve a dois usos, e é isso que resolve o conflito:

- **Como conferência do mês**, o dono quer ver o período inteiro — inclusive
  o frete que está rodando agora. Tirá-lo da lista faria o total do
  relatório discordar do total que a tela de Fretes já mostra para o mesmo
  período (que conta `em_andamento`, item 4).
- **Como cobrança**, só se cobra o que já foi prestado. Frete que ainda não
  chegou é serviço não prestado — cobrar por ele é contestável.

Por isso: a linha aparece na lista, com uma marca indicando que está em
andamento, e permanece **desmarcável do documento** como qualquer outra —
mas não aceita a marca de cobrança: quando "Gerar cobrança para estes
fretes" está ativo, um frete em andamento incluído no documento **não gera
título**, mesmo que continue somando no total do documento.

**Exigência, não só lacuna — decisão do fundador, 28/08/2026:** quando algum
frete em andamento estiver incluído com "Gerar cobrança" ativo, o total do
documento e o total que efetivamente vira título divergem, e **os dois
números aparecem na própria tela de montagem, ao vivo, antes de gerar** —
nunca só depois, no documento pronto. Sem isso, quem gera um relatório de
R$ 12.000 com R$ 9.400 cobrável manda o documento achando que cobrou tudo.
Isto não é opcional nem fica para o Design decidir **se** aparece — só
**como** aparece (dois números lado a lado, uma nota abaixo do total, ou
outro tratamento) é lacuna de tratamento visual, registrada no pedido ao
Design da Tarefa 3.

**O princípio, para não ser reaberto por analogia** (palavras do fundador,
registrar porque "vai voltar"): **somar é diferente de cobrar.** O item 4
decidiu que `em_andamento` conta nas somas porque o frete nasce no momento
da ordem (`CLAUDE.md` §1). Cobrar é outra pergunta, e exige que o serviço já
tenha sido prestado — as duas decisões não se contradizem, respondem
perguntas diferentes. Esta tarefa também leva o princípio para
`docs/especificacao.md` (§4.4 ou §7, o que fizer mais sentido no momento de
escrever), não só para este plano — é o tipo de regra que o `CLAUDE.md` §2
pede para não ficar presa só na conversa.

**Onde isto vai voltar, e já dá para saber** (fundador, mesma rodada): o
item 8 (Dashboard) mostra faturamento do mês, e vai precisar da mesma
distinção — quanto rodou (soma, inclui `em_andamento`) não é quanto pode
cobrar. Quem construir o item 8 revisita este princípio, não reabre a
pergunta do zero.

Isto **fecha** o "ponto em aberto" que a primeira versão deste plano deixava
para a Tarefa 3: com `em_andamento` nunca virando título e `cancelado` nunca
aparecendo, não sobra frete incluído no documento que a marcação de
cobrança possa tentar faturar sem poder.

### Mensagem de cobrança quando o relatório junta vários fretes

`docs/especificacao.md` §4.5 exige: "uma cobrança gerada por relatório é uma
linha só, não uma por frete." O item 6 já constrói `montarMensagemCobranca`
com a linha "Passando pra lembrar do frete {rota}." — certa para **um**
frete, mas sem sentido para uma cobrança que cobre vários.

**Decisão do fundador:** no lugar da rota, a linha passa a citar o
**período** do relatório — é a unidade que já organiza a montagem (por
cliente e período), e é como se fala por telefone. Contar quantos fretes
daria uma informação que o cliente já confere no PDF anexo, e criaria mais
uma variação para manter.

- **Um frete só** (relatório com uma linha, ou o faturamento manual do item
  6): comportamento **inalterado** — "Passando pra lembrar do frete
  {rota}." O singular nunca vira "os fretes" com um item.
- **Dois ou mais fretes:** "Passando pra lembrar dos fretes de {período}."
  - Período dentro de um mês só: **nome do mês** — "dos fretes de agosto."
  - Período atravessando meses: **dd/mm a dd/mm** — "dos fretes de 20/08 a
    10/09." (Atravessando ano, o formatador some com o ano em cada ponta,
    para não ficar ambíguo — extrapolação de implementação, não pedida
    explicitamente; registrar se o Design quiser outro formato.)

Reaproveita `src/lib/utils/data-fortaleza.ts` (mesma família de
`formatarDiaDaSemanaEData`) para o novo formatador de período — não cria
arquivo próprio, mesmo racional do item 6 sobre `vencimentoPadrao` não
merecer arquivo separado.

`docs/especificacao.md` §9 (lista de variáveis do molde) ganha esta variação
registrada junto do código, mesmo padrão de `{pix}` no item 6.

## O que fica de fora desta vez

- **Sugestão de relatório na dashboard** ("cliente acumula fretes não
  faturados de um mês fechado") — item 8. Este item só constrói o gerador; a
  heurística que dispara a pendência é do dashboard.
- **Tela de editar o modelo/numeração do relatório** — item 10
  (Configurações). Aqui a numeração só incrementa; não há tela para mudar o
  ponto de partida.
- **Recibo, romaneio, proposta** — o gerador nasce genérico (`CLAUDE.md` §9),
  mas só o relatório tem corpo implementado agora.
- **Trava de 2 GB de armazenamento por empresa** — pendência já registrada
  no `CLAUDE.md` §14 desde o item 5 (comprovante), e o relatório é o segundo
  escritor de storage do produto. Mesmo "não urgente com zero clientes
  pagantes" de lá — não bloqueia esta tarefa, mas cresce a mesma pendência
  (mais um tipo de arquivo somando espaço).
- **API de rotas / distância real** — item 12, sem relação com este.

---

## As tarefas

### Tarefa 1 — Fundamentos: a entidade Relatorio e o que ela amarra

- `model Relatorio` (`prisma/schema.prisma`): `cliente_id`, `numero`,
  `data_inicial`, `data_final`, `valor_total` (centavos, `CLAUDE.md` §7),
  `gerou_cobranca`, `gerado_em`, `pdf_url`, mais `empresa_id` e os três
  campos padrão (`criado_em`/`atualizado_em`/`arquivado_em`, `CLAUDE.md`
  §7). RLS igual a toda tabela de domínio (`USING`/`WITH CHECK` explícitos,
  os três jeitos de negar do `CLAUDE.md` §9).
- **`model RelatorioServico`** (novo, não previsto no resumo de campos de
  `docs/especificacao.md` — mesma situação de `TituloReceber` ter mais
  campos reais do que o resumo da entidade lista): `relatorio_id`,
  `servico_id`, `empresa_id`. Guarda **quais fretes exatamente** entraram no
  relatório — necessário porque cada linha da montagem é desmarcável
  (`docs/especificacao.md` §4.4): sem esta tabela não dá para saber depois
  se um frete específico ficou de fora por estar fora do período ou porque
  alguém desmarcou a linha, nem resolver "Ver relatório" a partir de um
  frete. RLS igual às demais; índice único em `(relatorio_id, servico_id)`
  para não duplicar a mesma linha.

  **Retrato congelado — acrescentado na construção, achado do `/revisar`,
  decisão do fundador, 28/08/2026:** a versão acima só linkava o frete, sem
  copiar nada dele. `docs/especificacao.md` §4.4 diz "o documento fica
  gravado com os valores da época", e §8 regra 6 repete a mesma regra — mas
  `Servico` continua editável enquanto não tiver título ativo (§8 regra 12),
  então um relatório sem retrato próprio mudaria de conteúdo por baixo do
  cliente que já recebeu o PDF. `RelatorioServico` ganhou `data_servico`,
  `origem_texto`, `destino_texto`, `carga_texto` e `valor` — cópia exata do
  que a tabela do documento exibe (§4.4: "data · rota · descrição da carga ·
  valor"), gravada uma vez, nunca recalculada. `servico_id` continua
  existindo, para comparar com o dado ao vivo ou resolver "Ver relatório" a
  partir do frete.
- **Fecha a pendência do item 3:** `titulo_receber.relatorio_id` ganha a
  chave estrangeira para `relatorio.id` (`onDelete: Restrict`, mesmo padrão
  do resto do domínio), como o próprio comentário no schema já previa.
- `Empresa.proximo_numero_relatorio` — mesmo padrão de
  `proximo_numero_servico` (contador atômico, começa em 1, incrementado na
  mesma transação que cria o relatório).
- **Conferência de FK contra a empresa** (`CLAUDE.md` §3, o Postgres não
  aplica RLS em chave estrangeira) em toda referência nova: `cliente_id` do
  relatório, `servico_id` de cada linha de `RelatorioServico`,
  `relatorio_id` do título.
- **`criarRelatorio` recusa, nunca confia em quem chama — acrescentado na
  construção, achado do `/revisar`, decisão do fundador, 28/08/2026:** a
  versão inicial só conferia FK (cliente e serviço pertencerem à empresa).
  Como a função grava dinheiro (`valor_total`) e a Tarefa 3 (montagem) não
  será o único chamador possível (itens 9 e 15 podem gerar relatório por
  outro caminho), a proteção mora na função, não na tela que a chama —
  mesmo princípio do `CLAUDE.md` §3. `criarRelatorio` recusa: lista de
  fretes vazia; período com data final antes da inicial; frete de outra
  empresa, de outro cliente, `cancelado`, arquivado, ou com `data_servico`
  fora do período informado. `em_andamento` **passa** — a decisão "em
  andamento entra na lista, mas não aceita cobrança" (acima) é sobre a
  Tarefa 3/4, não sobre o que pode aparecer no documento.
- Testes: isolamento (contraste, concorrência, os três jeitos de negar) nas
  duas tabelas novas; a numeração sequencial por empresa sob concorrência
  (mesmo teste que já existe para `Servico.numero`); `buscarRelatorio`
  recusando (devolvendo nulo) um relatório de outra empresa — a peça de
  código que vai proteger `relatorio_id` do título quando a Tarefa 3
  gravar nele, já que a FK do banco sozinha não filtra por empresa
  (`CLAUDE.md` §3: "o Postgres não aplica RLS ao verificar chave
  estrangeira"); cada recusa acima, com um teste próprio; o retrato
  congelado provado editando o `Servico` depois de gerado o relatório e
  conferindo que a linha gravada não mudou.

**Lacunas registradas na Tarefa 1, não corrigidas agora — achado do segundo
`/revisar`, 28/08/2026:**

- **O mesmo frete pode entrar em mais de um relatório.** Cobrar duas vezes já
  não acontece — o índice único de título (item 6) recusa o segundo título
  integral para o mesmo frete. O que sobra não é técnico: o mesmo frete pode
  aparecer em dois documentos **enviados ao cliente**, e isso gera pergunta
  dele. Não decidido se deve ser impedido, avisado, ou deixado como está.

  **Ganhou consequência na Tarefa 4 (29/08/2026), decisão do fundador:**
  "Ver relatório" no detalhe do frete (`buscarRelatorioIdDoServico`,
  `src/lib/servicos/relatorios.ts`) precisava escolher qual dos dois
  documentos mostrar quando os dois existem — antes disso a lacuna acima era
  registro sem consequência definida. Escolhe o **mais recente**
  (`orderBy criado_em desc`), pelo mesmo critério já usado em
  `marcaCobrado` (agrupamento de Cobranças, 29/08/2026): consistência com
  precedente do próprio projeto, e o mais recente é o que provavelmente foi
  enviado ao cliente por último. A pergunta em aberto acima (impedir/avisar/
  deixar como está) continua sem resposta — isto só decide qual dos dois a
  tela de leitura mostra, não se o segundo deveria ter sido criado.
- **`Relatorio.pdf_url` — caminho ou URL assinada?** Ainda sempre nulo nesta
  tarefa (só a Tarefa 2/4 escrevem nele), então não decidido agora. Mas
  `Servico.comprovante_url` já resolveu a mesma pergunta (`docs/
  especificacao.md` §6): guarda o **caminho** no balde privado, e a URL
  assinada é gerada na hora, com expiração (`CLAUDE.md` §4). Quem construir
  a Tarefa 2 reaproveita esse padrão em vez de decidir de novo, a menos que
  surja um motivo concreto para divergir.

### Tarefa 2 — Gerador de PDF (a peça que a medição validou)

Cedo e isolada de propósito — decisão do fundador: precisa estar de pé e
testada antes da tela de montagem ser construída em cima dela.

- `src/lib/documentos/` (nova pasta, `CLAUDE.md` §6). Função genérica —
  recebe **tipo** e **dados**, cabeçalho da empresa fixo, corpo variando
  (`CLAUDE.md` §9): só o tipo `"relatorio"` tem corpo implementado agora,
  mas a função não tem nome nem parâmetro específico de relatório.
- Fontes auto-hospedadas: baixar uma vez os arquivos de Archivo (variável,
  eixo `wdth`, `wght` 400-800) e Azeret Mono (400-600) cobrindo os
  caracteres achados na medição (`→`, `✓`, e o alfabeto latino comum) e
  guardar em `src/lib/documentos/fontes/`. Sem chamada de rede durante a
  geração — nem ao Google Fonts, nem a qualquer outro lugar.
- Motor: `puppeteer-core` + `@sparticuz/chromium`, exatamente como medido.
  `next.config.ts` ganha `outputFileTracingIncludes` para a rota que gera o
  PDF — sem isso o binário do Chromium não embarca na função (achado da
  medição, § acima).
- A marcação HTML do documento é a **mesma** que a Tarefa 3 usa para a
  prévia em tela (`DocumentoA4`) — nunca duas implementações do mesmo
  desenho (`CLAUDE.md` §8, "componente existe uma vez"). Esta tarefa entrega
  a marcação **e** a função que a imprime em PDF; a Tarefa 3 é quem constrói
  a tela que a exibe.
- Upload do PDF gerado ao storage — mesmo padrão de `comprovantes.ts` (item
  5): nome de arquivo aleatório, fora de pasta pública (balde `relatorios`,
  migration `20260828070000_balde_relatorios_storage`).

  **A URL assinada de leitura NÃO nasce aqui — decisão do fundador, achado do
  `/revisar`, 28/08/2026.** Esta redação original prometia "URL assinada com
  expiração" na Tarefa 2, mas foi escrita antes de a Tarefa 2 existir de
  verdade: hoje não há nenhum chamador que precise LER o PDF (só gravar).
  Construir a leitura sem quem a use seria a mesma armadilha da `FolhaDePix`
  no item 6 Tarefa 5 — peça pronta, sem uso, não testável de verdade. Mudou
  para requisito explícito da Tarefa 3, abaixo — provavelmente reaproveitando
  o padrão de `gerarUrlComprovante` (`src/lib/servicos/comprovantes.ts`, item
  5 Tarefa 4): caminho gravado no banco, URL assinada gerada na hora da
  leitura, nunca guardada.
- Testes: o PDF sai válido (cabeçalho de arquivo, tamanho não vazio); os
  caracteres achados na medição (`→` em particular) saem corretos — não dá
  para abrir um PDF em teste automatizado e "olhar", mas dá para conferir
  que a fonte embutida no PDF cobre aqueles pontos de código, ou gerar com
  dado de teste que force `formatarRota` e comparar contra uma referência
  conhecida; tempo de geração dentro do que a medição encontrou (não deixar
  regredir para o caminho antigo — Google Fonts por rede — sem ninguém
  notar).

**Correção na própria construção, medida contra o Next.js de verdade — a
marcação NÃO é componente React.** A primeira versão desta tarefa escreveu
`MoldeDocumentoA4`/`CorpoRelatorio` como componentes React, impressos via
`renderToStaticMarkup` (`react-dom/server`). Uma rota de teste descartável
(`src/app/api/testegerador`, criada e removida na mesma sessão) mostrou o
`next dev` real recusando importar: "You're importing a component that
imports react-dom/server. To fix it, render or return the content directly
as a Server Component instead" — Server Action e Route Handler do App
Router rodam sob a condição `react-server`, que `react-dom/server` recusa
por desenho do próprio React. A correção: `moldeDocumentoA4.ts`/
`corpoRelatorio.ts` montam HTML por template string, sem React. **"Nunca
duas implementações do mesmo desenho" continua valendo** — é a mesma função
que a Tarefa 3 chama para a prévia em tela, só que ela injeta o resultado
com `dangerouslySetInnerHTML` em vez de compor via `children` do React.
Toda string interpolada passa por `escaparHtml` (`src/lib/utils/html.ts`,
nova nesta tarefa) — a proteção contra marcação quebrada/injetada que o JSX
dava de graça e uma função por concatenação precisa fazer à mão. Confirmado
de novo, pela mesma rota descartável, que a versão corrigida carrega sem
erro dentro do Next.js real, e que `escaparHtml` funciona (nome de empresa
com `&`/`<`/`>` saiu escapado no HTML produzido).

**O título impresso é "RELATÓRIO DE SERVIÇOS" — decisão do fundador, achado
do `/revisar`, 28/08/2026, não pergunta em aberto.** O texto só existia no
protótipo (`referencia/.../DocumentoA4.dc.html`), nunca escrito em
`docs/especificacao.md`/`docs/estilo.md` — o `/revisar` apontou a lacuna. O
motivo de manter "serviços", e não "fretes": é o vocabulário do produto, não
do ramo — a entidade se chama `Servico`, não `Frete`, justamente para
comportar guincho e reboque depois sem reescrever nada (`CLAUDE.md` §9), e
`tipo_operacao` já existe no schema para isso. Um título "de fretes" prenderia
o documento a um ramo só, a mesma armadilha que fez "Nome da transportadora"
virar "Nome da empresa" em toda a interface (`CLAUDE.md` §8). Vai ao Design
como confirmação da decisão, não como pergunta aberta.

**Segundo `/revisar` da mesma tarefa: o corpo também muda para "serviço(s)",
não só o título.** A contagem (`corpoRelatorio.ts`, "N fretes") ainda dizia
"frete" sob um título "de Serviços" — o produto falando duas línguas na
mesma folha, na frente do cliente do cliente. Corrigido para "serviço(s)" no
corpo inteiro. **A exceção vale só dentro do documento impresso** — a
interface do produto continua dizendo "frete" em toda tela, sem mudança
nenhuma (`CLAUDE.md` §8, exceção nomeada).

**Lacunas registradas na Tarefa 2, não corrigidas agora — achado do
`/revisar`, 28/08/2026:**

- **Sem paginação — medido, não estimado, e é caso normal, não borda.** A
  página é altura fixa (`docs/estilo.md` § Impresso: 1123px) e a tabela de
  fretes nunca quebra em página nova. Medido de verdade (Chromium real, via
  o navegador desta sessão, não conta de cabeça): **sem bloco de cobrança,
  cabem 16 fretes na página — o 17º já ultrapassa a borda inferior. Com
  bloco de cobrança (vencimento + Pix no rodapé), o limite cai para 14 — o
  15º ultrapassa.** Um cliente com frete quase diário e relatório mensal
  passa desse número no mês comum, não só no excepcional — é exatamente por
  isso que o fundador pediu destaque: não é a mesma classe de lacuna que "o
  mesmo frete em dois relatórios" (acima, na Tarefa 1), rara e de política;
  esta acontece na operação normal de um cliente ativo. Nada em
  `docs/estilo.md`, `docs/especificacao.md` §4.4 ou neste plano decide o que
  fazer (múltiplas páginas do mesmo PDF? limitar linhas com aviso na
  montagem? encolher a fonte da tabela?) — decisão de Design/produto para a
  Tarefa 3, não técnica.
- **`logoUrl` sem caminho de rede.** `montarMoldeDocumentoA4` grava
  `<img src>` direto quando a empresa tem logo — mas o Chromium do gerador
  roda isolado, sem rede (é por isso que as fontes foram embutidas em
  `data:` URI, `fontesEmbutidas.ts`). Hoje inalcançável: nenhum upload de
  logo existe no produto (`Empresa.logo_url` nunca é preenchido). Quem
  construir a tela de upload de logo revisita este ponto — provavelmente
  embutindo os bytes da logo em `data:` URI também, mesmo padrão das fontes.
- **`outputFileTracingIncludes` e o risco de tracing das fontes** — já
  registrado em `CLAUDE.md` §14, "CONFERIR ANTES DE PUBLICAR", não repetido
  aqui para não ter duas fontes da mesma pendência.

### Tarefa 3 — Tela "Relatório — montagem" + gerar relatório + tela "Documento A4"

**Fundida com a antiga Tarefa 4 — decisão do fundador, 28/08/2026,** achado
ao planejar a construção: um botão principal que chama o servidor não pode
ficar sem função real por trás — é a mesma armadilha da `FolhaDePix` no item
6 (peça pronta, sem uso, não testável de verdade), e aqui seria pior, porque
não haveria nem para onde navegar depois de gerar (a tela "Documento A4" era
da antiga Tarefa 4). O motivo de fundo, nas palavras do fundador: montagem,
geração e documento são um fluxo só — a pessoa monta, gera e vê. Cortar no
meio cria dois pedaços que não funcionam sozinhos. **Se durante a construção
ficar claro que dá para dividir em dois commits, dividir** — a geração num, a
tela noutro, mesmo padrão que já funcionou nos três perfis do item 4 e na
base da Tarefa 5 do item 6.

**A tela de montagem:**

- Escolher cliente e período (chips: este mês · mês passado · últimos 30
  dias · personalizado — `docs/especificacao.md` §4.4).
- Prévia com os fretes do cliente no período, cada linha desmarcável, total
  somando ao vivo. **Mostra qualquer situação financeira** — "Gerar
  relatório" é neutro, não filtra por já faturado ou não
  (`docs/especificacao.md` §4.4: "Gerar relatório é neutro: produz o PDF e
  não altera nada"). **Mas filtra por situação operacional** (decisão acima,
  "somar é diferente de cobrar"): a consulta nunca traz frete `cancelado`;
  frete `em_andamento` entra na lista com uma marca própria (rótulo/etiqueta
  a confirmar com o Design — não existe hoje em `docs/estilo.md`, mesma
  lacuna já registrada para a etiqueta de cancelado no item 4).
- Marcação **"Gerar cobrança para estes fretes"**, desmarcada por padrão,
  sistema lembra a última escolha. Quando marcada: vencimento calculado
  (editável, mesmo `vencimentoPadrao` do item 6), chips **Boleto** /
  **Outro**, e as linhas `em_andamento` incluídas mostram que não entram na
  cobrança (mesma decisão) — sem impedir que continuem marcadas para o
  documento.
- **Quando a cobrança estiver ativa e algum `em_andamento` estiver incluído,
  a tela mostra os dois totais ao vivo — o do documento e o que vira
  título** (decisão do fundador, acima — exigência, não lacuna: só o
  tratamento visual fica para o Design, não o "se aparece"). Sem frete
  `em_andamento` incluído, os dois totais coincidem e não há nada a
  distinguir na tela.
- Principal **Gerar relatório**, com estado carregando (§8) — desabilitado
  quando zero linhas estiverem marcadas (documento sem fretes não faz
  sentido, mesmo racional de outros principais desabilitados por dado
  incompleto).

**A ação de gerar:**

- **Requisito explícito, não opcional — movido da Tarefa 2** (achado do
  `/revisar`, decisão do fundador, 28/08/2026): a URL assinada para LER o PDF
  do balde `relatorios` nasce aqui, não na Tarefa 2 — é aqui que existe pela
  primeira vez quem precisa ler (a tela "Documento A4", abaixo). Mesmo padrão
  de `gerarUrlComprovante` (`src/lib/servicos/comprovantes.ts`, item 5 Tarefa
  4): confere posse (`buscarRelatorio(empresaId, relatorio.id)`) antes de
  assinar, caminho vem de `Relatorio.pdf_url`, URL curta e gerada na hora,
  nunca guardada.
- **Requisito explícito, não opcional** (`CLAUDE.md` §3 — achado do
  `/revisar` na Tarefa 1, 28/08/2026): antes de gravar `titulo_receber.
  relatorio_id`, confira com `buscarRelatorio(empresaId, relatorio.id)`
  que o relatório pertence à empresa — mesma exigência de toda referência
  nova, já que o Postgres não aplica RLS na checagem de FK. Como
  `gerarRelatorio` acabou de criar o `Relatorio` na própria transação, a
  conferência é sobre o valor que a própria função gerou, não sobre
  entrada externa — mas a chamada precisa existir, com teste próprio,
  não ser assumida.
- `gerarRelatorio(empresaId, {clienteId, dataInicial, dataFinal,
  servicoIds, gerarCobranca, vencimento, formaPrevista})` — dentro de uma
  transação: incrementa `proximo_numero_relatorio`, grava `Relatorio` +
  as linhas de `RelatorioServico`, e se `gerarCobranca`:
  - **Um `TituloReceber` por frete incluído** (não um título cobrindo
    vários) — reaproveita `faturarServico` do item 6 sem alterar sua
    forma, só passando o `relatorio_id` junto. Mantém 100% da lógica de
    situação financeira e de recebimento parcial do item 6 intacta:
    "uma cobrança gerada por relatório é uma linha só" é regra de
    **exibição** em Cobranças (agrupar por `relatorio_id` quando presente),
    não de dado — evita reabrir o desenho de `TituloReceber`, que hoje
    aponta para exatamente um frete (`servico_id` obrigatório).
  - **Só cria título para frete `finalizado`** — `em_andamento` nunca vira
    título (decisão acima), e `cancelado` nunca chega aqui porque a tela de
    montagem já não o lista. Não sobra frete incluído que a marcação de
    cobrança tente faturar sem poder.
  - Chama o gerador da Tarefa 2, grava `pdf_url`.
  - **Resolvido na construção, sem precisar de decisão do fundador — é
    tratar um erro esperado, não uma pergunta de política:** um frete
    `finalizado` incluído pode já ter um título ativo (faturado antes, fora
    deste relatório) — `faturarServico` recusa o segundo integral pelo
    índice único (item 6). `gerarRelatorio` pula esse frete em silêncio ao
    gerar, sem interromper o resto. **Achado do segundo `/revisar`, decisão
    do fundador, 28/08/2026, sobre uma consequência que a escolha acima
    abriu:** se TODO frete `finalizado` incluído já estava faturado fora
    deste relatório, nenhum título nasce desta geração — gravar
    `gerou_cobranca: true` e imprimir vencimento/Pix nesse caso cobraria, em
    papel, um valor sem título correspondente, com vencimento que pode
    discordar do vencimento real do título antigo. Por isso `gerou_cobranca`
    e o bloco de cobrança do documento seguem se **pelo menos um título
    nasceu de verdade nesta chamada**, nunca a marcação "Gerar cobrança"
    sozinha — o relatório sai do mesmo jeito, só sem esse bloco.
- **Requisito explícito do segundo commit, não observação** (achado do
  terceiro `/revisar`, 28/08/2026): `ListaCobrancas`/`resumoDeCobrancas`
  (item 6) precisam agrupar títulos com o mesmo `relatorio_id` numa linha
  só, com o total somado. O primeiro commit (`gerarRelatorio`,
  `src/lib/servicos/relatorios.ts`) já cria um `TituloReceber` por frete
  incluído, todos com o mesmo `relatorio_id` — sem o agrupamento, o *dado*
  contradiz `docs/especificacao.md` §4.5 ("uma cobrança gerada por
  relatório é uma linha só, não uma por frete") assim que a tela de
  montagem existir e alguém gerar a primeira cobrança de 2+ fretes. Hoje é
  peça sem uso (mesma classe do `comoDono`: "com uso previsto e datado",
  não "pode ser que precise um dia") — mas o segundo commit fecha isso,
  nunca deixa a contradição só registrada.
- `montarMensagemCobranca`: a variação de período no lugar da rota, decidida
  acima, ativada quando o título pertence a um grupo de 2+ (via
  `relatorio_id`).

**A tela "Documento A4":**

- A mesma marcação da Tarefa 2, em `scale(0.466)` (`docs/estilo.md`, seção
  Impresso). Ações: **Compartilhar no WhatsApp** (Web Share API com o
  arquivo, quando o navegador suportar; sem isso, cai para baixar) ·
  **Baixar PDF** · **Imprimir**.
- Folha de campo faltante (chave Pix) quando `gerarCobranca` estiver
  marcado e a empresa não tiver Pix cadastrado — reaproveita o componente do
  item 6 Tarefa 5; "Agora não" **não bloqueia** (mesma exceção já registrada
  em `docs/componentes.md`, linha 355 — gera sem o Pix, aviso "Relatório
  gerado sem a chave Pix.").

**Testes:** contagem/total da prévia batendo com o que `criarRelatorio`
grava; chip de período calculando as datas certas (reaproveitar o que
Cobranças/dashboard já usam, não duplicar); número sequencial sob
concorrência; o `TituloReceber` de cada frete incluído carregando
`relatorio_id`; agrupamento em Cobranças batendo com o total do relatório; a
mensagem de cobrança nos dois casos (um frete · vários fretes, dentro do mês
· atravessando mês).

### Tarefa 4 — Entradas no fluxo

Liga as pontas que `docs/navegacao.md` já marca com `⚠️` apontando pra cá:

- Perfil do cliente: **Gerar relatório** (principal, já documentado) →
  Relatório — montagem, cliente pré-selecionado.
- Estado vazio de Cobranças: **Gerar relatório** (já documentado).
- Detalhe do frete: **Ver relatório** quando o frete pertence a algum
  `RelatorioServico` → Documento A4 daquele relatório.
- Detalhe da cobrança: **Ver relatório** quando o título tem `relatorio_id`
  → Documento A4.
- Mais > Relatório do cliente (atalho de ferramentas) → Relatório —
  montagem, sem cliente pré-selecionado.
- ~~Dashboard: atalho **Gerar relatório** do cartão escuro (§4.6) → Relatório
  — montagem.~~ **Fora desta tarefa** (execução, 29/08/2026): a dashboard de
  verdade é o item 8 — hoje `src/app/(app)/page.tsx` é só o pouso provisório
  pós-login (nome da empresa, nada mais), sem cartão escuro nenhum para o
  atalho entrar. Construir por cima do provisório contradiria o próprio §12
  ("nada de arquivo 'para depois'"). Fica pendente do item 8, junto do resto
  da dashboard — não é lacuna nova, é a mesma dependência que já valia antes
  desta tarefa.
- Testes: cada entrada leva para onde `docs/navegacao.md` diz, com o filtro
  certo semeado.

---

## O que este item exige de teste, além do de sempre

`CLAUDE.md` §2 item 7 chama de **rigor total** dinheiro e dado que não
volta. Este item mexe nos dois:

- **Isolamento entre empresas** em `relatorio` e `relatorio_servico`, com o
  contraste do §3.
- **Integridade referencial conferida em código** (§3) em toda referência
  nova — `relatorio.cliente_id`, `relatorio_servico.servico_id`,
  `titulo_receber.relatorio_id`.
- **O total do relatório é a soma exata das linhas incluídas — e o total que
  vira título é a soma só das `finalizado` entre elas, nunca mais, nunca
  menos.** Os dois podem divergir de propósito quando há frete
  `em_andamento` incluído (decisão acima) — o teste prova que divergem
  **exatamente** pelo valor dos `em_andamento`, não por qualquer outro
  motivo. Mesma classe de achado do item 6 (três leituras de "em aberto" sem
  teste cruzando uma contra a outra), aplicada aqui ao `Relatorio.valor_total`
  contra a soma agrupada em Cobranças.
- **Numeração sequencial por empresa sob concorrência real** — mesmo teste
  de `Servico.numero`, agora para `Relatorio.numero`.
- **Contagem de verificações** em todo teste novo (§3, item 4).

---

## Construído na Tarefa 3, segundo commit (29/08/2026) — achado durante a construção

**O agrupamento de Cobranças por relatório revelou uma peça que a regra
escrita não previa.** `docs/especificacao.md` §4.5 diz "uma cobrança gerada
por relatório é uma linha só" — mas uma linha só, com "Marcar recebido"
apontando para qual dos N títulos? Registrar contra um só receberia uma
fração do valor em silêncio (`CLAUDE.md` §2, rigor total — dinheiro).
Decisão do fundador: a linha some numa linha só para exibição e para
"Cobrar no WhatsApp" (que registra em todos os títulos do grupo, no mesmo
instante — `registrarCobrancaEnviadaEmGrupo`, `titulos.ts`), mas **sem**
"Marcar recebido" nela — um chevron expande a linha e revela cada título
como uma linha normal, com o próprio deslizar que já existe. Peça nova:
`LinhaCobrancaAgrupada.tsx`.

**O achado que motivou tudo, vale registrar como método:** quem está em
Cobranças olhando o dinheiro não tinha como agir dali — o caminho para
receber já existia, mas só pela tela de Fretes (o frete específico →
Marcar recebido), fora da tela onde a pendência aparece. Isso só apareceu
perguntando "como ela faz isso" durante a construção — nenhum teste
automatizado teria achado, porque tecnicamente o dinheiro sempre teve um
caminho de receber, só não na tela certa.

### O que precisa chegar ao Design

- **O tratamento do chevron.** Fica dentro de uma linha que já é tocável (o
  corpo, para o Documento A4) e já tem rodapé (a pílula "Cobrar no
  WhatsApp") — mesma família de risco do item 4 ("dois alvos de 48px não
  cabem em 78px sem invadir a linha de apoio", `LinhaDeLista.tsx`), embora
  aqui os dois alvos sejam IRMÃOS (lado a lado), não empilhados como lá.
  Construído com `min-h-78` na área tocável e `w-48` no chevron, dentro de
  um `items-stretch` — o alvo do chevron sai **48×78px**, medido contra a
  escala de espaçamento do projeto (`--spacing: 1px`, `src/app/globals.css`
  — `w-48` vale exatamente 48px aqui, não a escala padrão do Tailwind).
  Ainda não confirmado ao vivo num navegador autenticado (sem conta de
  teste à mão nesta sessão) — o número está medido contra o CSS compilado,
  não visto renderizado.
- **Como o grupo aberto se distingue visualmente.** As linhas reveladas
  hoje só têm recuo (`pl-16`) e o rótulo "Fretes desta cobrança" — nenhuma
  cor nova, porque `docs/estilo.md` já registra "o app não tem borda
  nenhuma — separa por fundo", e as duas tonalidades existentes
  (`--color-separacao`/`--color-separacao-variante`) já têm outro
  significado (estado desabilitado de pílula, `PilulaCabecalho.tsx`/
  `PilulaEmLinha.tsx`). Sem confirmação, a pessoa pode não perceber que as
  linhas abaixo pertencem à cobrança acima.
- **A etiqueta de `em_andamento` na prévia da montagem** — mesma lacuna já
  registrada acima ("A tela de montagem"): sem cor/rótulo próprio em
  `docs/estilo.md`, construída com tratamento neutro por não haver outro
  definido.
- **O padrão "mês passado" quando a tela abre sem período na URL.**
  `docs/especificacao.md` §4.4 lista as quatro janelas mas não diz qual é o
  padrão — a decisão veio do protótipo (`TelaRelatorio.dc.html`), que
  `CLAUDE.md` §13 trata como evidência corroborante, nunca autoridade. Achado
  do segundo `/revisar`: aqui não existe documento pra corroborar, só o
  protótipo sozinho. Pede confirmação por escrito.
- **O rótulo da tela para quem usa.** O cabeçalho mostra "Relatório",
  `docs/estilo.md` linha 94 lista "Novo relatório" entre os títulos de tela,
  e `docs/componentes.md` chama a tela de "Relatório — montagem". Achado do
  segundo `/revisar`: nenhum documento fecha qual das três é o texto que a
  pessoa lê no topo da tela.

### Lacunas do segundo `/revisar` — registradas, não corrigidas nesta tarefa

- **O total da linha agrupada quando um dos títulos já recebeu parte —
  conferido, não é ambiguidade nova.** Pergunta do fundador: se o grupo soma
  R$ 4.200 e um título já recebeu metade, o número mostrado é o valor cheio
  ou o saldo? **É o saldo — a mesma regra do item 6, Tarefa 2, já se
  aplica.** `cobrancas/page.tsx` calcula `valorCentavos` **por título, antes
  de agrupar**: `t.valor - recebido` fora de "Recebidas" (o que falta
  entrar) e o valor recebido dentro de "Recebidas". `agruparPorRelatorio`
  soma esses valores já-saldo (`itens.reduce((soma, i) => soma +
  i.valorCentavos, 0)`) — nunca soma `t.valor` bruto. O total do grupo é
  sempre "quanto ainda falta entrar somando os N títulos", nunca "o valor
  cheio do relatório". A etiqueta "Parcial" (`algumParcial =
  itens.some(...)`) avisa que o número não é o valor total faturado, sem
  precisar de um segundo número na linha.
- **"Imprimir" não aciona impressão — é o comportamento, não uma limitação
  técnica a resolver.** O botão abre o PDF numa aba nova; quem imprime usa o
  leitor de PDF do próprio navegador dali. Não dá para chamar `window.print()`
  numa aba nova de outra origem a partir de quem abriu — a alternativa exigiria
  buscar o PDF como blob e renderizar dentro de um `<iframe>` só para
  imprimir, complexidade que o rótulo "Imprimir" não pediu para justificar.
  Fica registrado como texto que promete mais do que a ação faz — se o
  Design decidir trocar o rótulo (por "Abrir PDF", por exemplo) é decisão
  dele, não corrigida aqui.
- **Token "rodapé de ações ancorado" de `docs/estilo.md` sem reconciliar com
  o uso atual** desta tarefa — construído com o rodapé dentro do fluxo
  rolável (`CLAUDE.md` §8), sem conferir se o token descreve exatamente este
  caso ou um tratamento diferente.
- **O tratamento `desmarcado` (esmaecido + risco) da checkbox de frete** —
  peça nova de `LinhaDeLista`, sem respaldo em `docs/estilo.md` ou
  `docs/componentes.md`.
- **Duas formas de checkbox na mesma tela, sem regra documentada** — o
  círculo (`rounded-pilula`) da lista de fretes e o quadrado arredondado
  (`rounded-etiqueta`) do toggle "Gerar cobrança" usam o mesmo ícone e a
  mesma cor, formas diferentes, sem nenhum documento dizendo quando cada
  forma vale.
- **O prefixo "R$" sem combinação tipográfica documentada** — construído
  com o texto ao lado do valor, tratamento visual não conferido contra
  `docs/estilo.md`.
- **A seta de voltar da tela de montagem está fixa em `/mais`**, mas
  `docs/navegacao.md` lista 4 origens possíveis para chegar a esta tela.
  Corrigir exigiria passar a origem pela URL (mesmo padrão de `?cliente=`),
  não feito nesta tarefa.
