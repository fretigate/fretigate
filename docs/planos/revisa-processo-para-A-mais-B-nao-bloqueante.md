# Plano — revisão do processo da esteira: A + B (não bloqueante), C fica de reforço

Pedido do fundador, depois de um dia de uso da regra criada mais cedo
(`docs/planos/correcao-pool-esteira-vermelha.md`, `CLAUDE.md` §2 item 9
original): esperar o resultado real da esteira antes de fechar toda tarefa
(5-7 minutos) custa mais do que resolve. Revisão: opção "A" (o
`/onde-paramos` confere a esteira de verdade) combinada com a versão **que
não espera** da "B" (o fechamento de tarefa afirma "esteira disparada, ainda
rodando, sem confirmação" e segue). "C" (branch protection) continua
registrada em `CLAUDE.md` §14, como reforço disponível — não escolhida
agora, não descartada.

## O raciocínio, por trás da revisão

A regra original resolvia o problema (main vermelho sem ninguém notar)
esperando toda vez. Isso é mais forte do que o necessário: o problema real
não era "a esteira demora a rodar" — era "ninguém olhava o resultado depois
de disparar". A janela que a versão não-bloqueante abre (a esteira pode
reprovar depois da sessão já ter fechado) só é um problema se **ninguém
verificar antes da próxima tarefa começar** — e é exatamente isso que o
`/onde-paramos` passa a fazer, sempre, antes de qualquer trabalho novo. A
combinação fecha o mesmo buraco sem o custo fixo em toda tarefa.

## O que muda

- **`.claude/commands/onde-paramos.md`** — ganha um passo novo: `gh run
  list --branch main --limit 1`, conferindo se o commit mais recente
  passou. Se a esteira estiver vermelha, isso é dito **antes** de "última
  tarefa concluída" — mesma prioridade que já existia para divergência
  entre diário e `git status`. Se o comando `gh` falhar (sem autenticação,
  sem rede), a resposta diz que não deu para checar — nunca omite a
  checagem em silêncio.
- **`CLAUDE.md` §2, item 9** — reescrito: a tarefa fecha sem esperar o
  resultado, mas o fechamento tem que dizer explicitamente que a esteira
  ainda não foi confirmada. O histórico da decisão original fica registrado
  (não apagado), com a revisão do mesmo dia explicada ao lado.
- **`CLAUDE.md` §2, item 10** — o exemplo de mensagem de fechamento muda
  para refletir "esteira disparada, ainda rodando, sem confirmação" em vez
  de "esteira verde" (que exigiria ter esperado).
- **`CLAUDE.md` §14** — a entrada de branch protection ganha a frase
  "reforço disponível, não descartada", e a referência ao item 9 é
  corrigida (não fala mais em "esperar a esteira").

## O que NÃO muda

- Push continua fazendo parte do commit aprovado (item 9, primeira frase) —
  isso não é o que estava caro, é a esteira ter algo para rodar.
- Se a esteira ficar vermelha depois do push, o procedimento (conserta por
  cima, nunca reescreve o commit aprovado) continua o mesmo, já escrito no
  item 9.
- C continua sendo a decisão para depois do lançamento do MVP — não
  antecipada.

## Verificação

Não há código de aplicação para testar — são dois arquivos de
configuração/instrução (`onde-paramos.md`, `CLAUDE.md`). Verificação é
ler os dois depois de escritos, conferindo que a regra nova é
inequívoca — e, na prática, a primeira vez que `/onde-paramos` rodar depois
deste commit.

## Arquivos

- `.claude/commands/onde-paramos.md`
- `CLAUDE.md`
- `docs/diario.md`
