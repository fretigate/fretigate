---
description: Roda o revisor no que ainda não foi commitado, antes do commit
allowed-tools: Bash(git status:*), Bash(git diff:*), Read, Grep, Glob, Agent
---

## Estado da árvore

!`git status --short`

## O que mudou nos arquivos já rastreados

!`git diff HEAD`

---

Despache o subagente **`revisor`** com o que foi capturado acima.

A captura acontece **antes de você entrar**. É de propósito: assim não é você
quem escolhe o que o revisor enxerga. Repasse o diff **como está** — não
resuma, não recorte, não explique o que você fez nem por quê. O revisor julga o
resultado, não o argumento, e é justamente por isso que ele não vê a conversa.

No prompt do subagente, inclua:

1. **O diff inteiro**, literal.
2. **Os caminhos dos arquivos novos** — as linhas marcadas com `??` no status.
   Eles não aparecem em `git diff` porque o git ainda não os rastreia. Diga a
   ele para abrir cada um com `Read`.
3. Nada mais. Sem contexto da tarefa, sem justificativa, sem o que você tentou.

Se o diff estiver grande demais para o prompt, grave em arquivo e passe o
caminho — nunca uma versão encurtada.

A gravação é feita com `git diff HEAD > <arquivo>`, coberta pelo
`Bash(git diff:*)` do frontmatter. Não é preciso ferramenta de escrita, e por
isso não há nenhuma na lista: o comando lê e despacha, não edita. Está escrito
porque a lista, sozinha, não deixa isso óbvio — e o revisor apontou a dúvida.

## Depois que ele responder

Apresente os achados **item a item**, e para cada um diga o que você aceita e o
que discorda, com o motivo. Não negocie com o revisor e não saia corrigindo
sozinho: quem decide o que fazer com cada achado é o fundador.

Se ele responder `Sem divergências`, diga isso sem enfeitar — e lembre que
lista vazia num diff só de documentação prova que ele **rodou**, não que ele
**reprova**.
