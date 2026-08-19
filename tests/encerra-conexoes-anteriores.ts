/**
 * Encerra qualquer conexão que tenha sobrado de uma execução anterior da
 * esteira, antes de `prisma migrate reset --force`
 * (`.github/workflows/ci.yml`).
 *
 * POR QUE ISTO EXISTE
 * A esteira ganhou `concurrency: cancel-in-progress` (`.github/workflows/
 * ci.yml`): duas execuções em cima do mesmo commit — ou de commits em
 * sequência rápida — cancelam uma a outra em vez de rodar ao mesmo tempo
 * contra o mesmo projeto de teste. Medido, não suposto, no dia em que isso
 * NÃO existia (18/08/2026): duas execuções reais rodaram `prisma migrate
 * reset --force` com poucos minutos de diferença contra o mesmo banco, e
 * uma pegou o schema pela metade da outra — "relation does not exist",
 * "permission denied for schema public" — vermelho que não tinha nada a
 * ver com o código sendo testado.
 *
 * O CANCELAMENTO SOZINHO NÃO BASTA. O runner do GitHub Actions manda
 * SIGINT/SIGTERM só para o processo de topo do passo (o `bash` do `run:`) —
 * processos filhos (o `node`/`npx` que fala com o Postgres) não recebem
 * sinal nenhum, e só morrem quando a árvore inteira é destruída à força,
 * até 10 segundos depois. Nesse intervalo, a conexão com o Supabase (rede,
 * não processo local) pode continuar aberta do lado do banco, seja qual for
 * a transação que estivesse em andamento — inclusive `DROP SCHEMA` ou
 * `CREATE TABLE` no meio. Isso pode segurar um lock que trava o próximo
 * `migrate reset --force`, esperando uma conexão que já devia ter morrido.
 *
 * SÓ AS CONEXÕES DO PRÓPRIO FRETIGATE — não "toda conexão do banco".
 * O projeto do Supabase tem serviços próprios (pooler, PostgREST, Auth
 * interno) que também podem manter conexão aberta com o banco, sob papéis
 * que não são nenhum dos quatro do `CLAUDE.md` §9. Matar isso não é
 * "órfã de execução anterior" — é mexer em coisa que não é nossa, sem
 * necessidade nenhuma para o problema que este script resolve. O filtro é
 * por `usename`, restrito aos quatro papéis que a aplicação usa.
 *
 * A GARANTIA É CONFERIDA, NÃO SUPOSTA. `pg_terminate_backend` só manda o
 * sinal — devolve `false` (sem erro) quando não consegue, e mesmo quando
 * devolve `true` a conexão não morre na hora, é assíncrono. Um script que
 * contasse linhas devolvidas e chamasse isso de "encerrado" estaria na
 * mesma classe de teste que aprova sem ter medido nada (`CLAUDE.md` §3,
 * item 4). Por isso: confere o resultado de cada sinal, e espera (com
 * limite) até nenhuma delas aparecer mais em `pg_stat_activity` antes de
 * devolver sucesso — se alguma continuar presa depois do limite, o passo
 * FALHA. Falhar aqui, com mensagem clara, é melhor que seguir para o
 * `migrate reset` sabendo que uma conexão ainda está lá.
 *
 * Mesma trava do `guarda-do-reset.ts`: só roda contra o projeto de teste,
 * nunca desenvolvimento — matar conexão de quem está programando seria
 * pior que o problema que isto resolve.
 */

import { Client } from "pg";
import { validarSoTeste } from "./guarda-de-banco.ts";

validarSoTeste(process.env);

// As quatro conexões que o produto usa (CLAUDE.md §9) — nunca os papéis
// internos do próprio Supabase, que não são problema nosso para encerrar.
const PAPEIS_DO_FRETIGATE = [
  "postgres",
  "fretigate_app",
  "fretigate_auth",
  "fretigate_reversor",
];

const LIMITE_DE_ESPERA_MS = 10_000;
const INTERVALO_DE_POLL_MS = 250;

function dormir(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  const { rows: sinalizadas } = await client.query<{
    pid: number;
    usename: string;
    sinal_enviado: boolean;
  }>(
    `SELECT pid, usename, pg_terminate_backend(pid) AS sinal_enviado
     FROM pg_stat_activity
     WHERE datname = current_database()
       AND pid <> pg_backend_pid()
       AND usename = ANY($1)`,
    [PAPEIS_DO_FRETIGATE],
  );

  if (sinalizadas.length === 0) {
    console.log("[encerra-conexoes-anteriores] nenhuma conexão órfã encontrada.");
  } else {
    const semSinal = sinalizadas.filter((r) => !r.sinal_enviado);
    if (semSinal.length > 0) {
      throw new Error(
        `pg_terminate_backend recusou ${semSinal.length} conexão(ões): ` +
          `pid ${semSinal.map((r) => r.pid).join(", ")}. Não seguindo para o ` +
          "migrate reset com conexão presa.",
      );
    }

    const pidsAlvo = sinalizadas.map((r) => r.pid);
    console.log(
      `[encerra-conexoes-anteriores] sinal de encerramento enviado a ` +
        `${pidsAlvo.length} conexão(ões): pid ${pidsAlvo.join(", ")}. Confirmando...`,
    );

    const prazo = Date.now() + LIMITE_DE_ESPERA_MS;
    let restantes = pidsAlvo;
    while (restantes.length > 0 && Date.now() < prazo) {
      await dormir(INTERVALO_DE_POLL_MS);
      const { rows } = await client.query<{ pid: number }>(
        `SELECT pid FROM pg_stat_activity WHERE pid = ANY($1)`,
        [restantes],
      );
      restantes = rows.map((r) => r.pid);
    }

    if (restantes.length > 0) {
      throw new Error(
        `${restantes.length} conexão(ões) não morreram dentro de ` +
          `${LIMITE_DE_ESPERA_MS}ms depois do sinal: pid ${restantes.join(", ")}. ` +
          "Não seguindo para o migrate reset com conexão presa.",
      );
    }

    console.log(
      `[encerra-conexoes-anteriores] confirmado: ${pidsAlvo.length} conexão(ões) encerrada(s).`,
    );
  }
} finally {
  await client.end();
}
