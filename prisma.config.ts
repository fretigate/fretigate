import { defineConfig } from "prisma/config";

// A partir do Prisma 7 a URL de conexão sai do schema e vem para cá, e o
// Prisma não lê mais o `.env` sozinho. `process.loadEnvFile()` é do próprio
// Node (24 aqui) — não precisa de dependência para isso.
//
// Condicional ao `npm_lifecycle_event`, não à existência do arquivo — e a
// diferença importa. `prisma generate` agora roda em `postinstall`
// (`package.json`), e isso acontece sem `.env` em dois lugares: a esteira,
// entre o `npm ci` e a criação do `.env` de teste (`.github/workflows/
// ci.yml`), e a Vercel, que nunca tem esse arquivo (as variáveis chegam
// direto em `process.env`, injetadas pela plataforma). Sem alguma condição,
// `process.loadEnvFile()` lança `ENOENT` e quebra a instalação inteira —
// medido, não suposto.
//
// Um guard por `existsSync(".env")` resolveria isso, mas trocaria a falha
// alta de QUALQUER comando (inclusive `prisma migrate deploy` rodado à mão,
// sem `.env`, fora da raiz) por seguir em frente com o que estiver
// exportado no terminal — a mesma classe de risco que o `CLAUDE.md` §9
// nomeia para RLS ("falha aberta", nunca fechada). `npm_lifecycle_event`
// evita essa troca: só vale `"postinstall"` quando é o próprio npm
// disparando o script (a esteira e a Vercel, os dois casos reais); um
// comando manual — `npx prisma generate` incluído — marca `"npx"`, medido,
// não `"postinstall"`, e continua caindo no `loadEnvFile()` de sempre,
// falhando alto se o `.env` não existir. `generate` não precisa de
// `DIRECT_URL` resolvida para funcionar, só do schema — medido também.
if (process.env.npm_lifecycle_event !== "postinstall") {
  process.loadEnvFile();
}

// Duas URLs, de propósito (CLAUDE.md §5, e o `.env.example` explica):
//
//   DIRECT_URL   conexão direta, porta 5432. É a que fica AQUI, porque quem
//                usa este arquivo é a migration, e migration precisa de
//                sessão — o pool de transação não garante sessão.
//
//   DATABASE_URL pool de transação, porta 6543. É por onde a aplicação fala,
//                e é entregue ao PrismaClient pelo adaptador, não por aqui.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
