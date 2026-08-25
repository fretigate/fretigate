import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Os testes de isolamento falam com o BANCO DE VERDADE, com os papéis de
// verdade. Rodar contra um dobrê provaria que o dobrê funciona.
process.loadEnvFile();

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Ver tests/stubs/server-only.ts — o pacote de verdade lança fora do
      // build do Next.js, e o Vitest não passa por ele.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],

    // Recusa rodar fora do projeto de desenvolvimento. Roda ANTES de cada
    // arquivo de teste ser importado, e os testes conectam no topo do módulo —
    // então é o único ponto que pega todos.
    //
    // `fecha-cliente-de-banco.ts` fecha o cliente de `src/lib/db` ao fim de
    // CADA arquivo — achado em 18/08/2026 (docs/diario.md): com `isolate:
    // true` (padrão, não sobrescrito aqui), cada arquivo cria o próprio
    // `clienteBase`, e nada fechava esse pool entre arquivos nem entre
    // execuções seguidas da suíte.
    setupFiles: ["./tests/guarda-de-banco.ts", "./tests/fecha-cliente-de-banco.ts"],

    // Um arquivo por vez. Os testes semeiam empresas no mesmo banco, e dois
    // arquivos em paralelo disputariam as mesmas linhas — o teste passaria ou
    // falharia por sorte de agendamento, que é a pior espécie de teste
    // intermitente: o que some quando você vai olhar.
    fileParallelism: false,

    // Ida e volta ao Supabase, não a um banco na mesma máquina.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
