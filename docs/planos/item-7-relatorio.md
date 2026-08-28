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
para a Tarefa 4: com `em_andamento` nunca virando título e `cancelado` nunca
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
- Testes: isolamento (contraste, concorrência, os três jeitos de negar) nas
  duas tabelas novas; a numeração sequencial por empresa sob concorrência
  (mesmo teste que já existe para `Servico.numero`); a FK de
  `relatorio_id` recusando um id de relatório de outra empresa.

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
- A marcação HTML do documento é a **mesma** que a Tarefa 4 usa para a
  prévia em tela (`DocumentoA4`) — nunca duas implementações do mesmo
  desenho (`CLAUDE.md` §8, "componente existe uma vez"). Esta tarefa entrega
  a marcação **e** a função que a imprime em PDF; a Tarefa 4 é quem constrói
  a tela que a exibe.
- Upload do PDF gerado ao storage — mesmo padrão de `comprovantes.ts` (item
  5): nome de arquivo aleatório, fora de pasta pública, URL assinada com
  expiração.
- Testes: o PDF sai válido (cabeçalho de arquivo, tamanho não vazio); os
  caracteres achados na medição (`→` em particular) saem corretos — não dá
  para abrir um PDF em teste automatizado e "olhar", mas dá para conferir
  que a fonte embutida no PDF cobre aqueles pontos de código, ou gerar com
  dado de teste que force `formatarRota` e comparar contra uma referência
  conhecida; tempo de geração dentro do que a medição encontrou (não deixar
  regredir para o caminho antigo — Google Fonts por rede — sem ninguém
  notar).

### Tarefa 3 — Tela "Relatório — montagem"

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
- Testes: contagem/total batendo com o que a Tarefa 1 vai gravar; chip de
  período calculando as datas certas (reaproveitar o que Cobranças/dashboard
  já usam, não duplicar).

### Tarefa 4 — Gerar o relatório (ação) + tela "Documento A4"

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
    título (decisão acima), e `cancelado` nunca chega aqui porque a Tarefa 3
    já não o lista. Não sobra frete incluído que a marcação de cobrança
    tente faturar sem poder.
  - Chama o gerador da Tarefa 2, grava `pdf_url`.
  - **Detalhe menor, ainda sem resposta — mecânico, não de política:** um
    frete `finalizado` incluído pode já ter um título ativo (faturado antes,
    fora deste relatório) — `faturarServico` recusa o segundo integral pelo
    índice único (item 6). O que a montagem faz com esse caso (pula
    silenciosamente ao gerar, avisa, ou já chega desmarcado da cobrança na
    Tarefa 3) fica para resolver na construção, sem precisar de decisão do
    fundador — é tratar um erro esperado, não uma pergunta de política como
    a de cima.
- `ListaCobrancas`/`resumoDeCobrancas` (item 6): agrupar títulos com o
  mesmo `relatorio_id` numa linha só, com o total somado — a mudança de
  exibição que a regra acima empurra pra cá.
- `montarMensagemCobranca`: a variação de período no lugar da rota, decidida
  acima, ativada quando o título pertence a um grupo de 2+ (via
  `relatorio_id`).
- Tela "Documento A4": a mesma marcação da Tarefa 2, em `scale(0.466)`
  (`docs/estilo.md`, seção Impresso). Ações: **Compartilhar no WhatsApp**
  (Web Share API com o arquivo, quando o navegador suportar; sem isso, cai
  para baixar) · **Baixar PDF** · **Imprimir**.
- Folha de campo faltante (chave Pix) quando `gerarCobranca` estiver
  marcado e a empresa não tiver Pix cadastrado — reaproveita o componente do
  item 6 Tarefa 5; "Agora não" **não bloqueia** (mesma exceção já registrada
  em `docs/componentes.md`, linha 355 — gera sem o Pix, aviso "Relatório
  gerado sem a chave Pix.").
- Testes: número sequencial sob concorrência; o `TituloReceber` de cada
  frete incluído carregando `relatorio_id`; agrupamento em Cobranças batendo
  com o total do relatório; a mensagem de cobrança nos dois casos (um frete
  · vários fretes, dentro do mês · atravessando mês).

### Tarefa 5 — Entradas no fluxo

Liga as pontas que `docs/navegacao.md` já marca com `⚠️` apontando pra cá:

- Perfil do cliente: **Gerar relatório** (principal, já documentado) →
  Relatório — montagem, cliente pré-selecionado.
- Estado vazio de Cobranças: **Gerar relatório** (já documentado).
- Detalhe do frete: **Ver relatório** quando o frete pertence a algum
  `RelatorioServico` → Documento A4 daquele relatório.
- Detalhe da cobrança: **Ver relatório** quando o título tem `relatorio_id`
  → Documento A4.
- Mais > Relatório (atalho de ferramentas) → Relatório — montagem, sem
  cliente pré-selecionado.
- Dashboard: atalho **Gerar relatório** do cartão escuro (§4.6) → Relatório
  — montagem.
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
