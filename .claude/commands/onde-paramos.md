---
description: Diz onde o trabalho parou e qual é a próxima tarefa, em até cinco linhas
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git status:*)
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

## O que responder

Exatamente estes três pontos, **em no máximo cinco linhas no total**:

- **Última tarefa concluída** — qual foi, e o commit.
- **Pendente** — o que ficou em aberto ou bloqueado, incluindo passo manual que
  depende do fundador. Se houver bloqueio, ele vem antes de tudo.
- **Próxima** — qual é a próxima tarefa, pelo número e pelo nome.

## Regras

- **Cinco linhas é o limite, não a meta.** Se couber em três, use três.
- Sem preâmbulo, sem título, sem repetir a pergunta.
- Se o diário e o `git status` discordarem — árvore suja, commit que o diário
  não menciona — **diga isso primeiro**, porque muda o que é "onde paramos".
- Não proponha plano, não sugira o próximo passo em detalhe, não comece a
  trabalhar. A pergunta é só "onde paramos".
- Linguagem do fundador: ele não é desenvolvedor. Nome de tarefa, não de arquivo.
