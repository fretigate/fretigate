/**
 * Fecha o `clienteBase` (`src/lib/db`) ao fim de CADA arquivo de teste.
 *
 * POR QUE ISTO EXISTE
 * `clienteBase` é um cliente por processo (cacheado em `globalThis`,
 * `src/lib/db/index.ts`), pensado para o servidor em execução — lá o
 * processo é longo, e o pool existe exatamente para ficar aberto. A suíte de
 * testes não é esse caso: com `isolate: true` (padrão do vitest, não
 * sobrescrito em `vitest.config.mts`), cada arquivo de teste roda num
 * contexto isolado, com o próprio `globalThis` — ou seja, cada arquivo cria
 * o SEU `clienteBase`, com o SEU pool de dez conexões, e nada fechava esse
 * pool quando o arquivo terminava.
 *
 * O fechamento é certo por princípio, independente da causa: processo curto
 * que abre conexão e não fecha é defeito, não precisa provar que é A causa de
 * alguma instabilidade para valer a pena corrigir. O resultado medido depois
 * desta correção está em `docs/diario.md` e em
 * `docs/planos/fecha-cliente-de-banco.md` — junto com o que continua SEM
 * prova: as mesmas dez conexões `fretigate_app` persistem em
 * `pg_stat_activity` mesmo depois da correção, alternando entre `active` e
 * `idle`, com a forma de reuso normal do pooler de transação do Supabase, não
 * de vazamento acumulando. Este arquivo não afirma qual das duas é a causa da
 * instabilidade que motivou a investigação — só fecha o que é certo fechar de
 * qualquer forma.
 *
 * Roda como `setupFiles`, junto de `tests/guarda-de-banco.ts` — registrado
 * DEPOIS dele na lista de `vitest.config.mts`, mas a ORDEM entre os dois não
 * importa para o que este arquivo faz: ele só registra um `afterAll` global
 * para o arquivo de teste corrente, não fecha nada na hora que é importado.
 */

import { afterAll } from "vitest";
import { fecharConexao } from "@/lib/db";

afterAll(async () => {
  await fecharConexao();
});
