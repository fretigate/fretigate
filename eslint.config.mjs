import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Material de referência e documentação, não código do produto. Os
    // protótipos em referencia/ têm JSX e JS de ferramenta de design, com
    // React global e ReactDOM.render — não são para corrigir, são para
    // consultar.
    "referencia/**",
    "docs/**",
    // Cliente gerado pelo Prisma (a partir da tarefa 2).
    "lib/generated/**",
    "prisma/generated/**",
  ]),
]);

export default eslintConfig;
