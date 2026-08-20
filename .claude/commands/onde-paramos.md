---
description: Diz onde o trabalho parou e qual é a próxima tarefa, em até cinco linhas
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git status:*), Bash(gh run list:*)
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
  outra leitura fazer sentido; (2) esteira vermelha — do commit mais recente
  ou de um commit mais antigo ainda não resolvido, os dois na mesma
  prioridade; (3) o resto. Cada uma só aparece se acontecer; nunca as três
  de uma vez em situação normal.
- Se o diário e o `git status` discordarem — árvore suja, commit que o diário
  não menciona — **diga isso primeiro**, porque muda o que é "onde paramos".
- **Se a esteira estiver vermelha — do commit mais recente OU de um commit
  mais antigo que a busca do item 5(b) achou —, diga isso logo em seguida**
  (depois de eventual divergência diário/`git status`, antes de "última
  tarefa concluída") — ninguém deveria empilhar trabalho novo em cima de
  `main` quebrado sem saber, mesmo quando não bloqueia (`CLAUDE.md` §2,
  item 9). Um vermelho de commit antigo (5b) é sempre dito, mesmo que o
  commit mais recente (5a) esteja verde — é exatamente o caso que passava
  despercebido antes desta correção. Para cada vermelho achado, dois casos:
  - **O diário já tem o diagnóstico** (mesmo que de motivo alheio à
    próxima tarefa) — diga o motivo. Não é bloqueio por si só: o item 9
    já decidiu que motivo alheio não trava a próxima tarefa, só precisa
    ser sabido.
  - **O diário não tem diagnóstico nenhum** — isso, sim, é bloqueio: diga
    que precisa investigar antes de qualquer tarefa nova, porque ainda não
    dá para saber se o defeito é da própria esteira, de uma tarefa
    anterior, ou de motivo alheio.
- Não proponha plano, não sugira o próximo passo em detalhe, não comece a
  trabalhar. A pergunta é só "onde paramos".
- Linguagem do fundador: ele não é desenvolvedor. Nome de tarefa, não de arquivo.
