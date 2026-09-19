---
description: Diz onde o trabalho parou e qual é a próxima tarefa, em até cinco linhas
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git status:*), Bash(gh run list:*), Bash(vercel ls:*)
---

Responda **onde o trabalho parou**. Não comece nada.

## Onde olhar

1. `docs/diario.md` — a entrada mais recente está no **topo**, mas ela sozinha
   não decide a pendência: pode ser um desvio (instabilidade investigada,
   defeito achado ao verificar outra tarefa) que nunca teve "Próximo" próprio.

   **Ache o "Próximo:" mais recente do diário** — a primeira ocorrência de
   cima para baixo (`Grep` no arquivo inteiro) — e confira se alguma entrada
   **mais nova que ele** (acima, mais perto do topo) diz que aquela
   pendência fechou. Se nenhuma disser, é essa a pendência real, mesmo que
   as entradas mais recentes tratem de outro assunto. Só suba para o
   "Próximo" anterior se o mais recente já tiver sido fechado por uma
   entrada posterior.

   **Se a pendência nomeia um artefato concreto** (arquivo, teste, migration,
   comando) — não uma decisão —, confira a existência dele no repositório
   (`Glob`/`Grep`) antes de responder. É o jeito mais barato de saber se ela
   foi fechada sem o diário dizer, ou se ainda está mesmo em aberto.

   Se a busca não convergir — nenhum "Próximo" recente, ou o fechamento
   ficar ambíguo depois de subir mais de duas entradas — **pare e diga isso**
   em vez de supor.

   Registrado em 20/08/2026: a pendência "construir o teste de contraste
   permanente da varredura de segredo" (18/08) ficou invisível numa resposta
   deste comando porque três entradas mais novas (correções de pool de
   conexão, instabilidade da esteira) não a mencionavam e não tinham
   "Próximo" próprio — a leitura parou no topo e reportou o item seguinte da
   ordem de construção como se fosse o próximo passo, por cima de uma
   pendência ainda aberta.

   **Segunda vez, formato diferente do mesmo defeito — registrado em
   08/09/2026.** A Tarefa 2 do item 13 (as telas de assinatura dentro do
   produto — Planos, Minha assinatura, Limite do gratuito, Assinatura
   vencida) nunca foi construída — só a Tarefa 1 (`docs/planos/
   item-13-assinatura.md` só tem uma seção "Tarefa 1 — construída",
   nenhuma para as Tarefas 2 e 3). As entradas de publicação de 07/09/2026
   repetiam, cada uma, "ainda não a Tarefa 2 do item 13" — até a entrada
   seguinte do mesmo dia ("Corrige a desambiguação...") parar de repetir o
   aviso, sem nunca fechar a pendência. A entrada depois dela (plano do
   item 18, mesmo dia) tratou isso como se já estivesse resolvido: "Item 18
   confirmado, MVP, depois do item 13" — tratando o item 13 como concluído
   por suposição, não por verificação.

   **Não é o mesmo furo de 20/08 — é o caso que a correção daquele dia não
   cobria.** Lá, o "Próximo" certo ainda existia no arquivo, só velho demais
   para a busca padrão alcançar; a regra acima (subir até achar o
   fechamento) resolve isso. Aqui o "Próximo" **nunca voltou a mencionar a
   pendência** — ela não ficou pendente na lista, ela desapareceu do texto,
   e uma entrada seguinte declarou o item concluído sem checar (`CLAUDE.md`
   §2, "explicação plausível não é explicação verificada", mesma classe de
   erro, agora sobre o estado de um item da ordem de construção).

   **Verificação obrigatória, sempre que o "Próximo" encontrado tratar um
   item numerado como concluído, fechado ou "para trás" na ordem** (frases
   como "depois do item N", "item N fecha", "próximo é o item N+1"): abrir
   o plano de N em `docs/planos/` e conferir que **toda** Tarefa listada
   nele tem seção própria de fechamento ("Tarefa X — construída" ou
   equivalente) — não só a primeira. Tarefa sem essa marca é tarefa não
   feita, mesmo que nenhuma entrada recente do diário fale dela.
2. A ordem de construção do item em andamento — a lista de tarefas restantes, no
   fim da entrada mais antiga do diário.
3. `docs/especificacao.md` §9 — a ordem de construção do produto, para saber em
   que item do produto estamos.
4. `git log --oneline -5` e `git status --short` — para confirmar que o diário
   bate com a realidade da árvore.
5. **A esteira — do commit mais recente de `main`, E de qualquer commit
   recente que ainda esteja vermelho sem ninguém ter visto** — diário e
   `git log` não dizem isso: "suíte verde" no diário é local, contra outro
   banco (`CLAUDE.md` §2, "suíte verde" ≠ "esteira verde"); só a esteira
   confirma a esteira.

   Rode: `gh run list --branch main --limit 20 --json headSha,conclusion,status`

   **Por que 20, e não 1.** Um push novo gera um run novo — se ele passar, o
   run vermelho de um commit anterior sai da posição "mais recente" e um
   comando que olhasse só o topo nunca mais o veria, mesmo que ninguém tenha
   corrigido nem revisto nada. Foi exatamente assim que a esteira do commit
   `e183de5` (20/08/2026) ficou um dia inteiro vermelha, sem rerun e sem
   registro, invisível para quem só perguntava pelo "run mais recente" —
   dois commits depois (`e5fd7dc`, `c0a5773`) já tinham runs próprios.
   Vinte cobre com folga o pior caso já visto (cinco commits vermelhos
   seguidos, 14 a 18/08).

   **Dois usos do mesmo resultado — não confunda um pelo outro:**

   (a) **O commit mais recente.** Amarre ao commit certo — não confie em "o
   primeiro item da lista". Compare o `headSha` do item cujo `headSha` bate
   com o SHA **completo** de `origin/main` — `git log origin/main -1
   --format=%H`, **não** o HEAD local (`git log -1`): os dois podem divergir
   (commit feito mas push falhou, por exemplo), e é o que está em
   `origin/main` que a esteira de verdade testou. (O ref local de
   `origin/main` fica atualizado sozinho depois de um `git push`
   bem-sucedido desta mesma máquina — não precisa de `git fetch` à parte no
   fluxo normal.) Nunca `git log --oneline`, que mostra a forma abreviada e
   nunca bateria com o `headSha`. Se não baterem, o run daquele commit ainda
   não apareceu (push muito recente) — trate como "ainda sem confirmação",
   nunca relate o status de um commit anterior como se fosse do atual.
   Aplique os cinco desfechos abaixo a este item.

   (b) **Qualquer execução não resolvida na lista inteira**, não só no item
   (a). Percorra os 20 e separe todo item com `status: "completed"` e
   `conclusion` **diferente de `"success"`** — inclui `"failure"` e também
   `"cancelled"`: um cancelamento nunca prova que aquele commit passou (é
   rotina só quando é o run mais recente, sendo substituído por um push
   seguinte — item (a) acima; um cancelamento **de um commit antigo**, como
   os dois vistos em 20/08/2026 ao disparar reruns em sequência, não prova
   nada sobre esse commit). Cada item achado é uma execução que **continua
   sem confirmar sucesso** (um rerun bem-sucedido reescreve o `conclusion`
   do mesmo run para `"success"`, então qualquer coisa diferente disso na
   lista nunca foi corrigida nem revista). Se achar algum **além** do
   commit mais recente já coberto por (a), é um buraco do mesmo tipo do
   `e183de5` — relate mesmo que o commit não seja o do topo, mesmo que
   commits seguintes tenham passado. Se a lista de 20 terminar sem nenhum
   `"success"` confirmado, diga que a checagem não alcançou um verde
   conhecido dentro da janela, em vez de presumir que está tudo bem antes
   dela.

   Cinco desfechos possíveis para o item (a), cada um com resposta própria:
   - **`conclusion: "success"` e o SHA bate** — esteira verde, confirmada.
   - **`conclusion: "failure"` e o SHA bate** — esteira vermelha. Bloqueio,
     ver regra abaixo.
   - **`conclusion: "cancelled"` e o SHA bate** — a esteira ganhou
     `concurrency: cancel-in-progress` (`.github/workflows/ci.yml`): um push
     seguinte cancela a execução do commit anterior, de propósito — isso é
     **rotina**, não falha. Mas também não prova que o código passa: trate
     como "ainda sem confirmação", igual a `in_progress`.
   - **`status: "in_progress"`, ou SHA não bate, ou nenhum run listado, ou
     qualquer outro valor não listado acima** (`queued`, `timed_out`,
     `action_required`, `skipped`, ou qualquer status novo que o GitHub
     venha a criar) — ainda sem confirmação. Diga isso explicitamente
     ("esteira ainda não confirmada") — não é bloqueio, mas também não é
     "verde". Não tenta enumerar todo valor possível do `gh run list` —
     qualquer coisa que não seja explicitamente "success" ou "failure" com
     o SHA batendo cai aqui, de propósito.
   - **O comando falhou** (sem `gh`, sem rede, sem autenticação) — não
     bloqueia a resposta, mas diga que não deu para checar. **`gh`
     autenticado é dependência deste passo** — se faltar de forma
     permanente numa máquina, a checagem para de rodar em silêncio, e é
     exatamente a janela que este passo existe para fechar. Nenhuma sessão
     guarda estado da anterior para contar quantas vezes isso já
     aconteceu — quem nota o padrão, se `gh` faltar repetidamente, é o
     fundador lendo várias respostas ao longo do tempo, não este comando.
6. **A publicação na Vercel — do commit mais recente de `main`, E de
   qualquer commit recente cujo deploy de produção ainda esteja com erro,
   sem ninguém ter visto.** Esteira verde não é publicação no ar: são dois
   sistemas diferentes, medindo coisas diferentes — a esteira do GitHub
   fala com o projeto de teste do Supabase e nunca fala com a Vercel.

   Registrado em 18/09/2026: o commit `10b7b7e` (Tarefa 3 do item 13) tinha
   esteira **verde**, e mesmo assim a produção ficou uma hora inteira sem
   publicar `/planos` — o build da Vercel quebrou por variável de ambiente
   faltando (`CLAUDE.md` §14), e ninguém percebeu até o fundador tentar
   abrir a tela e ver 404. É a mesma classe do buraco do `e183de5`
   (20/08/2026, item 5 acima): falha real, sinal verde em todo lugar que
   alguém olhava, porque ninguém olhava o lugar certo.

   Rode: `vercel ls --prod --scope freti-gate --format json`

   **Por que `--scope freti-gate` explícito, e não confiar em `vercel
   switch` já ter sido rodado antes.** O escopo padrão da CLI é estado
   global desta máquina, não deste comando — se ninguém rodou `vercel
   switch` nesta sessão, `vercel ls` sem `--scope` pode responder sobre a
   conta pessoal, vazia, em vez do time `freti-gate`. `--scope` na própria
   chamada não depende de nenhum passo anterior ter acontecido.

   O JSON traz uma lista de deploys de produção, mais recente primeiro,
   cada um com `state` (`READY`, `ERROR`, `BUILDING`, `INITIALIZING`,
   `QUEUED`, `CANCELED`) e `meta.githubCommitSha`. **Reduza a lista a um
   item por commit** — para cada `githubCommitSha` distinto, o de maior
   `createdAt` (o primeiro que aparecer, já que a lista vem ordenada) —
   porque um commit pode ter mais de um deploy (o que falhou e o redeploy
   que corrigiu), e só o mais recente de cada commit importa: um redeploy
   bem-sucedido não apaga o registro do que falhou antes, diferente de um
   rerun do GitHub Actions, que reescreve o `conclusion` do mesmo run.

   Dois usos do resultado reduzido, mesma lógica do item 5:

   (a) **O commit mais recente.** Ache, na lista reduzida, o item cujo
   `githubCommitSha` bate com `git log origin/main -1 --format=%H`.
   - `state: "READY"` — publicado, confirmado.
   - `state: "ERROR"` — build quebrou, nada foi ao ar. Bloqueio: alguém
     pode estar testando ou usando uma versão de produção mais velha que o
     commit mais recente, sem saber.
   - `state: "BUILDING"`/`"INITIALIZING"`/`"QUEUED"`, ou nenhum deploy
     encontrado para esse SHA — ainda sem confirmação (push muito recente).
   - `state: "CANCELED"` — trate como sem confirmação, mesmo raciocínio do
     `cancelled` da esteira.

   (b) **Qualquer commit, além do mais recente, cujo deploy mais recente
   (já reduzido) tenha `state: "ERROR"`.** É um buraco do mesmo tipo do
   `10b7b7e` — relate mesmo que commits seguintes tenham publicado bem,
   porque a pergunta "quem usou o produto entre o commit quebrado e a
   correção" não se responde sozinha.

   **O comando falhou** (sem `vercel`, sem rede, sem login) — não bloqueia
   a resposta, mas diga que não deu para checar a publicação. Mesma
   dependência de ferramenta autenticada que o item 5 já assume para `gh`.

## O que responder

Exatamente estes três pontos, **em no máximo cinco linhas no total**:

- **Última tarefa concluída** — qual foi, e o commit.
- **Pendente** — o que ficou em aberto ou bloqueado, incluindo passo manual que
  depende do fundador. Se houver bloqueio, ele vem antes de tudo.
- **Próxima** — qual é a próxima tarefa, pelo número e pelo nome.

## Regras

- **Cinco linhas é o limite, não a meta — mas cede diante de vermelho não
  resolvido.** Se couber em três, use três. Vermelho da esteira sem
  confirmação de sucesso é a informação mais importante que este comando
  dá — nunca é cortado para caber no limite. Se o item 5(b) achar mais
  vermelhos do que cabe nas cinco linhas, diga quantos são ao todo e liste
  os mais recentes; nunca omita um vermelho em silêncio só para respeitar a
  contagem de linhas.
- Sem preâmbulo, sem título, sem repetir a pergunta.
- **Ordem quando mais de uma coisa precisar vir "primeiro":** (1) diário e
  `git status` discordando — muda o que é "onde paramos" antes de qualquer
  outra leitura fazer sentido; (2) esteira vermelha e/ou publicação na
  Vercel com erro — do commit mais recente ou de um commit mais antigo
  ainda não resolvido, os quatro casos na mesma prioridade; (3) o resto.
  Cada uma só aparece se acontecer; nunca todas de uma vez em situação
  normal.
- Se o diário e o `git status` discordarem — árvore suja, commit que o diário
  não menciona — **diga isso primeiro**, porque muda o que é "onde paramos".
- **Se a esteira estiver vermelha OU a publicação na Vercel tiver `ERROR`
  — do commit mais recente OU de um commit mais antigo que a busca dos
  itens 5(b)/6(b) achou —, diga isso logo em seguida** (depois de eventual
  divergência diário/`git status`, antes de "última tarefa concluída") —
  ninguém deveria empilhar trabalho novo em cima de `main` quebrado, ou
  usar/mostrar um produto publicado com uma versão mais velha que o último
  commit, sem saber (`CLAUDE.md` §2, item 9). Um vermelho de commit antigo
  (5b/6b) é sempre dito, mesmo que o commit mais recente esteja verde/
  publicado — é exatamente o caso que passava despercebido antes desta
  correção (esteira: `e183de5`, 20/08; Vercel: `10b7b7e`, 18/09). **Os
  dois sinais são independentes** — esteira vermelha não implica Vercel
  quebrada, nem o contrário; relate cada um pelo que ele mede. Para cada
  vermelho achado (esteira ou Vercel), dois casos:
  - **O diário já tem o diagnóstico** (mesmo que de motivo alheio à
    próxima tarefa) — diga o motivo. Não é bloqueio por si só: o item 9
    já decidiu que motivo alheio não trava a próxima tarefa, só precisa
    ser sabido.
  - **O diário não tem diagnóstico nenhum** — isso, sim, é bloqueio: diga
    que precisa investigar antes de qualquer tarefa nova, porque ainda não
    dá para saber se o defeito é da própria esteira/publicação, de uma
    tarefa anterior, ou de motivo alheio.
- Não proponha plano, não sugira o próximo passo em detalhe, não comece a
  trabalhar. A pergunta é só "onde paramos".
- Linguagem do fundador: ele não é desenvolvedor. Nome de tarefa, não de arquivo.
