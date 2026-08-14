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
    "src/lib/generated/**",
    "prisma/generated/**",
  ]),
  // Trava de SQL cru (CLAUDE.md §3, tarefa 9): "SQL cru só em src/lib/db e em
  // /tests. Em nenhum outro lugar." /tests fica fora de src/**, então nem
  // precisa de exceção nomeada aqui — só src/lib/db precisa.
  //
  // scripts/** entrou em 14/08/2026, junto da pasta (CLAUDE.md §6): é o outro
  // lugar de fora de src/lib/db que fala com o banco (a seed de municípios,
  // o comando de medição), e a trava vale para ele igual a qualquer outro
  // arquivo do produto.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx,mts,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "pg",
              message:
                "SQL cru só em src/lib/db e em /tests (CLAUDE.md §3).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^\\$(query|execute)Raw(Unsafe)?$/]",
          message:
            "SQL cru só em src/lib/db e em /tests (CLAUDE.md §3).",
        },
      ],
    },
  },
  {
    files: ["src/lib/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
