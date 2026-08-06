import { defineConfig } from "prisma/config";

// A partir do Prisma 7 a URL de conexão sai do schema e vem para cá, e o
// Prisma não lê mais o `.env` sozinho. `process.loadEnvFile()` é do próprio
// Node (24 aqui) — não precisa de dependência para isso.
process.loadEnvFile();

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
