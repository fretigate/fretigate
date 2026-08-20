# Plano — fecha o cliente de banco ao fim de processo curto

**Escrito depois da construção, não antes** — mesma divergência já registrada
em `docs/planos/correcao-pool-esteira-vermelha.md` e
`docs/planos/impede-concorrencia-na-esteira.md`: a investigação e a correção
foram conduzidas turno a turno em conversa, pedidas pelo fundador com o
problema já sendo descoberto ao vivo.

## O que motivou

Verificando a tarefa "teto de pool em `medicao-municipios.ts`", a suíte
completa local ficou instável (`P2028`, a mesma classe de erro que derrubou
a esteira, agora contra o banco de **desenvolvimento**). Investigação:
`src/lib/db/index.ts` cacheia `clienteBase` (o `PrismaClient`/pool
compartilhado) em `globalThis` — "um cliente por processo, não um por
pedido" — e **nunca o fecha explicitamente**. Isso é inofensivo num servidor
de verdade (processo longo, o pool existe para durar), mas todo processo
**curto** que usa `db()` — a suíte de testes, o comando
`scripts/medir-municipios.mts` — abre o cliente e termina sem nunca chamar
`$disconnect()`.

## As três coisas que são verdade ao mesmo tempo — nenhuma cancela a outra

1. **O fechamento explícito é certo por princípio, independente da causa.**
   Processo que abre conexão e não fecha é defeito — não precisa provar que
   é A causa da instabilidade para valer a pena corrigir.
2. **O resultado é real e medido.** Seis rodadas da suíte completa, seguidas,
   sem pausa, depois da correção: as seis limpas (198/198), duração
   consistente (158-172s). Antes da correção: duas falhas em cinco
   tentativas, sempre mais lentas (267-424s) e em posições diferentes da
   suíte (uma vez perto do fim, uma vez no primeiro teste) — o que já
   descartava "sempre no mesmo lugar" (ordem) e "sempre no fim" (desgaste
   dentro de uma rodada só).
3. **A causa raiz não está provada, e não fica sendo tratada como se
   estivesse.** Conferido depois da correção: as dez conexões
   `fretigate_app` continuam aparecendo em `pg_stat_activity` depois de
   cada rodada — inclusive depois de 15s de espera. Investigando os PIDs:
   são as MESMAS dez conexões, com 17-18 minutos de vida no momento em que
   foram medidas, alternando entre `active` e `idle` a cada rodada — não
   contagem crescendo. Isso tem a forma de comportamento normal do pooler
   de transação do Supabase (mantém um conjunto de conexões de fundo,
   reaproveitadas entre sessões de cliente diferentes), não de vazamento
   acumulando. Fechar essa dúvida por completo exigiria acesso à
   configuração do pooler do lado do Supabase, que esta investigação não
   tinha.

## O sintoma para a próxima vez

**Rodada de suíte que demora bem mais que o normal é o primeiro sinal —
antes de olhar qual teste falhou.** As rodadas instáveis mediram 267-424s;
as limpas, 158-172s. Se a suíte voltar a ficar lenta assim, é esse o dado
para olhar primeiro, não o teste específico que reprovou (que mudou de
posição entre as tentativas e não é o ponto).

## O que muda

- **`src/lib/db/index.ts`** — `fecharConexao()`, nova função exportada, que
  chama `clienteBase.$disconnect()`.
- **`tests/fecha-cliente-de-banco.ts`** (novo) — registra `afterAll(() =>
  fecharConexao())`, incluído em `setupFiles` do `vitest.config.mts`. Roda
  uma vez por arquivo de teste isolado (vitest isola módulo por arquivo por
  padrão — `isolate` não é sobrescrito neste projeto), fechando o cliente
  daquele arquivo antes do próximo começar.
- **`scripts/medir-municipios.mts`** — ganha o mesmo padrão que
  `scripts/seed/municipios.mts` já usa: `try { ... } finally { await
  fecharConexao(); }`, removendo os `process.exit()` que hoje matam o
  processo sem fechar nada (e, no caminho de sucesso normal, deixavam o
  processo sem nunca terminar sozinho, porque o pool aberto mantém o loop
  de eventos vivo).

## O que NÃO muda

- `clienteBase` continua sendo um cliente por processo em produção — isto
  não mexe no comportamento do servidor, só em processos curtos.
- A seed (`scripts/seed/municipios.mts`) não muda — já fechava certo, com
  seu próprio `PrismaClient`, fora de `db()`.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`.
2. Seis rodadas seguidas de `npm test` completo, local — já feitas, as seis
   limpas.
3. Push de verificação numa branch de teste, PR, esteira real confirmando
   antes do commit final.
4. `/revisar` antes do commit.

## Arquivos

- `src/lib/db/index.ts`
- `tests/fecha-cliente-de-banco.ts` (novo)
- `vitest.config.mts`
- `scripts/medir-municipios.mts`
- `docs/diario.md`
