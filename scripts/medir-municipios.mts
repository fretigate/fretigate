/**
 * A medição dos 10% (`docs/especificacao.md` §9, item 3), por linha de
 * comando:
 *
 *     npm run medir:municipios -- --empresa=<id>
 *
 * Investigação, não portão — imprime e sai, nunca falha o processo (quem
 * decide o que fazer com o número é quem lê). Este número é de USO REAL, de
 * uma empresa de verdade. É diferente do aviso que roda dentro de `npm test`
 * (`tests/regressao-resolucao-municipios.test.ts`), que mede uma lista fixa
 * — não dado de cliente — para pegar regressão na resolução em si. Ver
 * `docs/especificacao.md`, "A medição que o item 3 precisa entregar".
 *
 * FICA FORA DE `/src` DE PROPÓSITO, junto de `scripts/seed`: é ferramenta de
 * operação, não código que atende pedido de usuário (`CLAUDE.md` §6).
 *
 * PRECISA DE `--import tsx` PARA RODAR — o Node (24 aqui) já executa
 * TypeScript direto, mas só remove a sintaxe de tipos: ele NÃO lê o `paths`
 * do `tsconfig.json`, então `@/lib/...` sem isso vira `ERR_MODULE_NOT_FOUND`
 * (medido, não suposto, antes de decidir instalar o `tsx`). Com
 * `--import tsx`, o mesmo atalho que o resto do projeto usa passa a
 * resolver — e a alternativa, reimplementar a busca de município direto
 * aqui, abriria um segundo caminho para o mesmo dado que `resolverMunicipio`
 * já resolve, o que o `CLAUDE.md` §3 proíbe.
 *
 * PRECISA TAMBÉM DE `--conditions=react-server` (item 5, Tarefa 6,
 * 25/08/2026) — `@/lib/db` importa `"server-only"`, e sem essa condição o
 * pacote resolve para a versão que lança sempre (`node_modules/server-only`
 * só vira no-op sob a condição `react-server`, a mesma que o Next.js ativa
 * no bundler). Sem a flag, o sintoma é "This module cannot be imported from
 * a Client Component module" — não fala de condição nem de flag nenhuma; se
 * aparecer, é isso, não falta de `tsx`.
 *
 * Passa por `db(empresaId)` como a função que chama por baixo
 * (`medirResolucaoDeMunicipios`) — fretes são dado de cliente, e o filtro de
 * empresa nunca é opcional, nem para ferramenta interna.
 *
 * FECHA A CONEXÃO ANTES DE SAIR — `db()` usa um cliente por processo
 * (`src/lib/db/index.ts`, pensado para servidor de vida longa), e este é um
 * processo curto. Esperado (não medido): sem fechar, a conexão fica presa
 * até o sistema operacional ou o pooler notarem que o processo morreu, não
 * até este comando terminar. Achado em 18/08/2026 (`docs/diario.md`)
 * investigando suíte local instável — mesma classe de defeito, script
 * diferente. Mesmo padrão do
 * `finally` de `scripts/seed/municipios.mts` (que já fechava certo, com um
 * `PrismaClient` próprio dela — este arquivo usa o `db()` compartilhado, daí
 * `fecharConexao()` em vez de `$disconnect()` direto).
 */

import { medirResolucaoDeMunicipios } from "@/lib/servicos/medicao-municipios";
import { fecharConexao } from "@/lib/db";

function parar(motivo: string): never {
  console.error(`\n  ${motivo}\n`);
  process.exit(1);
}

function imprimirLista(titulo: string, itens: { texto: string; ocorrencias: number }[]) {
  if (itens.length === 0) {
    console.log(`  ${titulo}: nenhum.\n`);
    return;
  }
  console.log(`  ${titulo} (${itens.length} texto(s) distinto(s), mais frequente primeiro):`);
  for (const item of itens) {
    console.log(`    ${item.ocorrencias}x  ${item.texto}`);
  }
  console.log("");
}

const argumento = process.argv.find((a) => a.startsWith("--empresa="));
const empresaId = argumento?.slice("--empresa=".length);

if (!empresaId) {
  parar(
    "Falta o identificador da empresa.\n  Uso: npm run medir:municipios -- --empresa=<id>",
  );
}

try {
  const resultado = await medirResolucaoDeMunicipios(empresaId);

  if (resultado.situacao === "amostra_insuficiente") {
    console.log(
      `\n  Só ${resultado.totalElegivel} texto(s) de origem/destino elegível(is) — ` +
        `abaixo do piso de ${resultado.piso}. Não dá para tirar percentual daqui: ` +
        "base pequena demais, um texto não resolvido vira número alto sem " +
        "significar nada.\n",
    );
  } else {
    const { totalElegivel, totalFalho, percentual, ambiguos, naoEncontrados } = resultado;

    console.log(
      `\n  ${totalFalho} de ${totalElegivel} (${percentual.toFixed(1)}%) sem município ` +
        `resolvido — limite é 10%.\n`,
    );

    imprimirLista("Ambíguo — a sugestão de município não chamou atenção", ambiguos);
    imprimirLista(
      "Não encontrado — erro de digitação, apelido local ou falha da busca",
      naoEncontrados,
    );
  }
} finally {
  // Sem `process.exit` aqui — mesmo motivo do `finally` da seed: engoliria
  // uma exceção que estivesse subindo.
  await fecharConexao();
}
