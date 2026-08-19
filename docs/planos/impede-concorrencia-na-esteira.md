# Plano — impede duas execuções da esteira ao mesmo tempo

**Escrito depois da construção, não antes** — mesma divergência já
registrada em `docs/planos/correcao-pool-esteira-vermelha.md`: a
investigação e a construção foram conduzidas turno a turno em conversa,
pedidas pelo fundador com o problema já bem definido.

## O defeito, medido

Verificando a tarefa do teto de pool na esteira de verdade (ver
`docs/diario.md`, "duas execuções da esteira se destruíram"): o commit
`81e806f`, empurrado direto para `main`, reprovou com erros sem relação com
o código (`relation "municipio" does not exist`, `permission denied for
schema public`). Duas execuções da esteira, disparadas por dois commits
poucos minutos um do outro, rodaram ao mesmo tempo contra o **mesmo**
projeto de teste do Supabase — só existe um. Cada execução faz `prisma
migrate reset --force` (derruba e recria o schema inteiro); uma resetou o
schema no meio da outra ainda testando.

**A correção certa não é disciplina — é impedir a concorrência**, decisão
do fundador. A regra provisória (esperar a esteira anterior terminar antes
do próximo push) fica só até o mecanismo existir.

## O mecanismo

### 1 — `concurrency` do GitHub Actions

`.github/workflows/ci.yml` ganha:

```yaml
concurrency:
  group: esteira-banco-de-teste-unico
  cancel-in-progress: true
```

Grupo **fixo**, não por branch (`github.ref`) — de propósito. O problema
não é duas execuções da MESMA branch se sobrepondo, é duas execuções de
QUALQUER branch (push em `main`, PR de branch de teste) disputando o mesmo
banco. Um grupo fixo faz qualquer execução nova cancelar a anterior,
não importa a origem.

**Custo:** zero em dinheiro — recurso nativo do GitHub Actions, sem plugin
de terceiro. **Limitação conhecida, aceita:** hoje só uma pessoa (o
fundador, mais este agente) empurra código por vez — o grupo fixo nunca
cancela trabalho de verdade. Se um dia mais gente trabalhar ao mesmo tempo,
PRs paralelos disputariam o mesmo projeto de teste e se cancelariam um ao
outro — nesse ponto o desenho certo provavelmente é mais de um projeto de
teste (um por execução), não mexer neste grupo.

### 2 — O detalhe que o fundador pediu para conferir: cancelamento no meio pode deixar conexão presa

**Pesquisado, não suposto** — não é medição direta (não forcei um
cancelamento e observei; é o comportamento documentado do próprio GitHub) —
antes de decidir se precisava de algo a mais: pesquisei o comportamento do
runner do GitHub Actions. Ele manda
SIGINT/SIGTERM só para o processo de TOPO de um passo (o `bash` do `run:`)
— processos filhos (o `node`/`npx` que fala com o Postgres) não recebem
sinal nenhum, e só morrem quando a árvore inteira é destruída à força, até
10 segundos depois. Nesse intervalo, a conexão de rede com o Supabase pode
continuar aberta do lado do banco, no meio de qualquer transação —
inclusive `DROP SCHEMA`. Isso pode travar o `migrate reset --force` da
PRÓXIMA execução, esperando uma conexão que já devia ter morrido.

`prisma migrate reset` sozinho **não cobre isso**: para PostgreSQL ele
derruba o SCHEMA (não a database — Supabase não permite; confirmado, não
suposto), o que exige lock exclusivo nos objetos dele. Uma conexão presa
segurando esse lock trava o `DROP SCHEMA`, não é ignorada por ele.

**Correção: `tests/encerra-conexoes-anteriores.ts`**, passo novo antes do
`migrate reset`, que:
1. Mata (`pg_terminate_backend`) toda conexão do projeto de teste, exceto a
   própria — restrita aos quatro papéis do produto (`postgres`,
   `fretigate_app`, `fretigate_auth`, `fretigate_reversor`, `CLAUDE.md`
   §9), nunca papéis internos do Supabase (pooler, PostgREST, Auth).
2. **Confere o resultado de cada sinal** — `pg_terminate_backend` devolve
   `false` sem erro quando não consegue; contar linhas devolvidas não prova
   nada.
3. **Espera até confirmar** que cada conexão sinalizada de fato sumiu de
   `pg_stat_activity` (limite de 10s) — o sinal é assíncrono, não é
   imediato.
4. **Falha alto** se alguma conexão não sinalizar sucesso ou não morrer
   dentro do limite — seguir para o `migrate reset` sabendo que uma conexão
   ainda está lá seria a mesma classe de confiança falsa que motivou esta
   tarefa inteira.

Testado (contra desenvolvimento, com uma conexão própria de teste, antes de
escrever o script de verdade) que o papel `postgres` do Supabase tem
privilégio para `pg_terminate_backend` — confirmado, não suposto. O que
ainda falta: a prova de que o passo roda certo contra o projeto de TESTE de
verdade, na esteira — item da Verificação abaixo.

**Limitação conhecida, aceita: o script não distingue "conexão órfã de
execução cancelada" de "conexão legítima em uso agora".** Mata qualquer
conexão dos quatro papéis, sem checar idade nem estado. O `concurrency`
(item 1) reduz a chance de existir uma conexão legítima concorrente no
momento em que este passo roda — quando ele roda, o GitHub já decidiu que
esta é a execução ativa, então qualquer outra conexão desses papéis já
deveria ter sido cancelada — mas não elimina por completo (alguém usando o
editor SQL do Supabase com um desses papéis, por exemplo, embora
`CLAUDE.md` §5 já diga que o projeto de teste não tem esse uso). Não
corrigido: distinguir isso exigiria heurística de idade/estado que troca
uma garantia simples por uma suposição nova.

## O que NÃO muda

- `prisma migrate reset --force` continua sendo o mecanismo de reset em si
  — este plano só garante que ele começa sem lock alheio no caminho.
- Nenhuma mudança nos papéis ou privilégios do banco além de confirmar (não
  conceder) que `postgres` já tinha o que precisava.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`.
2. Push de verificação numa branch de teste, PR, esteira real confirmando
   antes do commit final — pedido explícito do fundador para esta tarefa
   especificamente (é ela que constrói o mecanismo; a regra geral do
   `CLAUDE.md` §2, item 9, de não esperar, é sobre tarefas depois de o
   mecanismo já existir). É a única prova real de que
   `pg_terminate_backend` funciona contra o projeto de teste, não só
   contra desenvolvimento.
3. `/revisar` antes do commit.

## Arquivos

- `.github/workflows/ci.yml`
- `tests/encerra-conexoes-anteriores.ts` (novo)
- `tests/guarda-de-banco.ts` (comentário de `validarSoTeste` atualizado —
  ganhou um segundo chamador)
- `docs/diario.md`
