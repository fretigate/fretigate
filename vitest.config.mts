import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Os testes de isolamento falam com o BANCO DE VERDADE, com os papéis de
// verdade. Rodar contra um dobrê provaria que o dobrê funciona.
process.loadEnvFile();

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],

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
