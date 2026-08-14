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
 * Passa por `db(empresaId)` como a função que chama por baixo
 * (`medirResolucaoDeMunicipios`) — fretes são dado de cliente, e o filtro de
 * empresa nunca é opcional, nem para ferramenta interna.
 */

import { medirResolucaoDeMunicipios } from "@/lib/servicos/medicao-municipios";

function parar(motivo: string): never {
  console.error(`\n  ${motivo}\n`);
  process.exit(1);
}

const argumento = process.argv.find((a) => a.startsWith("--empresa="));
const empresaId = argumento?.slice("--empresa=".length);

if (!empresaId) {
  parar(
    "Falta o identificador da empresa.\n  Uso: npm run medir:municipios -- --empresa=<id>",
  );
}

const resultado = await medirResolucaoDeMunicipios(empresaId);

if (resultado.situacao === "amostra_insuficiente") {
  console.log(
    `\n  Só ${resultado.totalElegivel} texto(s) de origem/destino elegível(is) — ` +
      `abaixo do piso de ${resultado.piso}. Não dá para tirar percentual daqui: ` +
      "base pequena demais, um texto não resolvido vira número alto sem " +
      "significar nada.\n",
  );
  process.exit(0);
}

const { totalElegivel, totalFalho, percentual, ambiguos, naoEncontrados } = resultado;

console.log(
  `\n  ${totalFalho} de ${totalElegivel} (${percentual.toFixed(1)}%) sem município ` +
    `resolvido — limite é 10%.\n`,
);

function imprimirLista(titulo: string, itens: typeof ambiguos) {
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

imprimirLista("Ambíguo — a sugestão de município não chamou atenção", ambiguos);
imprimirLista("Não encontrado — erro de digitação, apelido local ou falha da busca", naoEncontrados);
