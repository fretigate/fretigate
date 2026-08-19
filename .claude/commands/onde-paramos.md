---
description: Diz onde o trabalho parou e qual é a próxima tarefa, em até cinco linhas
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git status:*), Bash(gh run list:*)
---

Responda **onde o trabalho parou**. Não comece nada.

## Onde olhar

1. `docs/diario.md` — a entrada mais recente está no **topo**. É a fonte principal.
2. A ordem de construção do item em andamento — a lista de tarefas restantes, no
   fim da entrada mais antiga do diário.
3. `docs/especificacao.md` §9 — a ordem de construção do produto, para saber em
   que item do produto estamos.
4. `git log --oneline -5` e `git status --short` — para confirmar que o diário
   bate com a realidade da árvore.
5. **A esteira do commit mais recente de `main`** — diário e `git log` não
   dizem isso: "suíte verde" no diário é local, contra outro banco
   (`CLAUDE.md` §2, "suíte verde" ≠ "esteira verde"); só a esteira confirma a
   esteira.

   Rode: `gh run list --branch main --limit 1 --json headSha,conclusion,status`

   **Amarre o resultado ao commit certo — não confie em "o último da lista".**
   Compare o `headSha` devolvido (SHA **completo**, 40 caracteres) com o SHA
   **completo** de `origin/main` — `git log origin/main -1 --format=%H`,
   **não** o HEAD local (`git log -1`): os dois podem divergir (commit
   feito mas push falhou, por exemplo), e é o que está em `origin/main` que
   a esteira de verdade testou. (O ref local de `origin/main` fica
   atualizado sozinho depois de um `git push` bem-sucedido desta mesma
   máquina — não precisa de `git fetch` à parte no fluxo normal.) Nunca
   `git log --oneline`, que mostra a forma abreviada e nunca bateria com o
   `headSha`. Se não baterem, o run daquele commit ainda não apareceu (push
   muito recente) — trate como "ainda sem confirmação", nunca relate o
   status de um commit anterior como se fosse do atual.

   Cinco desfechos possíveis, cada um com resposta própria:
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

- **Cinco linhas é o limite, não a meta.** Se couber em três, use três.
- Sem preâmbulo, sem título, sem repetir a pergunta.
- **Ordem quando mais de uma coisa precisar vir "primeiro":** (1) diário e
  `git status` discordando — muda o que é "onde paramos" antes de qualquer
  outra leitura fazer sentido; (2) esteira vermelha do commit mais recente;
  (3) o resto. Cada uma só aparece se acontecer; nunca as três de uma vez
  em situação normal.
- Se o diário e o `git status` discordarem — árvore suja, commit que o diário
  não menciona — **diga isso primeiro**, porque muda o que é "onde paramos".
- **Se a esteira do commit mais recente estiver vermelha, diga isso logo em
  seguida** (depois de eventual divergência diário/`git status`, antes de
  "última tarefa concluída") — ninguém deveria empilhar trabalho novo em
  cima de `main` quebrado sem saber, mesmo quando não bloqueia (`CLAUDE.md`
  §2, item 9). Dois casos:
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
