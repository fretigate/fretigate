# Auditoria de segurança — Tarefa 2: a trava de importação vira regra de verdade

Plano da tarefa 2 de quatro, saídas da auditoria de 15/08/2026. Escrito antes
de qualquer linha de código, conforme `CLAUDE.md` §2.

---

## 1. O defeito, em uma frase

`src/lib/db/sem-filtro-de-empresa.ts:34` afirma: "A trava de importação
(tarefa 9) existe para o erro aparecer no build". Ela não existe em lugar
nenhum do `eslint.config.mjs`. É afirmação de mecanismo sobre coisa que não
existe — a classe que o `CLAUDE.md` §13 nomeia como o pior tipo de erro de
documento, porque engana justamente por dizer que foi medida.

Duas travas faltam, as duas pedidas pelo fundador:

1. Barrar importar `sem-filtro-de-empresa` fora de `src/lib/auth` e
   `src/lib/db`.
2. Barrar construir cliente de banco próprio (`new PrismaClient`, com o
   adaptador `@prisma/adapter-pg`) fora de `src/lib/db`. Hoje nada impede, e o
   único guardião é o RLS — que recusa devolvendo zero linhas, não com erro
   claro. Quem escrevesse essa consulta veria lista vazia e procuraria o
   defeito no lugar errado.

---

## 2. O conflito encontrado, e a decisão do fundador sobre ele

`scripts/seed/municipios.mts` constrói o próprio `PrismaClient` com
`PrismaPg` (linhas 33-34 e 196-198), por fora de `src/lib/db`, falando com
`DIRECT_URL` em vez de `DATABASE_URL`. Isso é decisão registrada, não
descuido: `municipio` não tem `empresa_id`, então a seed não passa por
`db()` (`CLAUDE.md` §6, §9). A regra 2, ao pé da letra, bloquearia esse
arquivo — e a seed **precisa continuar funcionando**.

Perguntado antes de escolher (conforme pedido): o fundador decidiu por uma
**exceção nomeada, só para este arquivo**, escrita e justificada no
`eslint.config.mjs`, no mesmo padrão que já existe para `src/lib/db/**`. A
regra 2 continua valendo de verdade para todo o resto de `src/**` e
`scripts/**`, incluindo `scripts/medir-municipios.mts` — que já usa `db()`
corretamente e não precisa de exceção nenhuma.

---

## 3. O mecanismo

Duas regras do ESLint já existem no arquivo para a trava de SQL cru
(`CLAUDE.md` §3, tarefa 9): `no-restricted-imports` (bane importar `pg`) e
`no-restricted-syntax` (bane `$queryRaw`/`$executeRaw`), com escopo
`src/**` + `scripts/**` e uma exceção para `src/lib/db/**`. As duas regras
novas entram nesse mesmo par, sem trocar de mecanismo:

- **Regra 1** (`sem-filtro-de-empresa`) → `no-restricted-imports`, banindo o
  caminho `@/lib/db/sem-filtro-de-empresa` (o único jeito de importar,
  porque `@/` é a convenção do projeto — §6) mais um `pattern` que pega
  qualquer import relativo que termine em `sem-filtro-de-empresa`, de
  defesa em profundidade.
- **Regra 2** (cliente próprio) → duas partes, porque "construir" tem dois
  sintomas diferentes:
  - `no-restricted-imports` banindo `@prisma/adapter-pg` — é o único jeito
    de dar um `connectionString` a um `PrismaClient` neste projeto (Prisma
    7 exige adaptador; não há outro caminho de conexão no código hoje).
  - `no-restricted-syntax` banindo a sintaxe `new PrismaClient(...)`
    diretamente — mais preciso que o import sozinho, porque mede a
    construção em si, não um proxy dela.

### Como o escopo fica, por pasta

| Pasta | `pg` cru | `@prisma/adapter-pg` / `new PrismaClient` | `sem-filtro-de-empresa` |
|---|---|---|---|
| `src/lib/db/**` | permitido (já era) | permitido — é onde o cliente mora | permitido — é onde ele mora |
| `src/lib/auth/**` | **banido** | **banido** — só importa o cliente já pronto | permitido — é o único outro lugar que usa |
| `scripts/seed/municipios.mts` | **banido** (não usa, mas a regra continua) | permitido — exceção nomeada desta tarefa | **banido** (não usa, sem motivo para abrir) |
| resto de `src/**` e `scripts/**` | **banido** (já era) | **banido** | **banido** |

**Por que a exceção do `no-restricted-syntax` para a semente não muda a
mensagem do `pg` cru.** Cada regra do ESLint é sobrescrita por chave, não
por bloco inteiro — um bloco que só redefine `no-restricted-imports` não
apaga o `no-restricted-syntax` herdado do bloco geral. É o que permite
`src/lib/auth/**` continuar banido de SQL cru e de construir cliente
mesmo abrindo só a importação de `sem-filtro-de-empresa`, e o que permite a
semente abrir só a construção do cliente sem abrir SQL cru junto. Escrever
os dois blocos de exceção como "liga tudo de novo" (como o de
`src/lib/db/**` já faz) teria devolvido a essas duas pastas permissões que
elas não precisam e que a regra 2 existe para negar.

### O texto das mensagens de erro

Cada regra nova aponta o caminho certo, não só recusa — mensagem clara é
parte do pedido ("confirma que reprova com mensagem clara"):

- Cliente próprio: *"Cliente de banco só se constrói em src/lib/db — em
  nenhum outro lugar (CLAUDE.md §3, tarefa 2 da auditoria)."*
- `sem-filtro-de-empresa`: *"bancoSemFiltroDeEmpresa só pode ser importado
  por src/lib/auth (o login) e src/lib/db (onde ele mora) — veja o
  comentário no arquivo."*

---

## 4. O comentário que sai

`src/lib/db/sem-filtro-de-empresa.ts:34` deixa de dizer que a trava "existe
para o erro aparecer no build" como afirmação solta — passa a apontar para
o bloco do `eslint.config.mjs` que a implementa, do mesmo jeito que o
comentário do arquivo já cita a tarefa 9 para a trava de SQL cru. A frase
só volta a ser afirmação de mecanismo depois de o mecanismo existir e ser
medido (§5).

---

## 5. A prova de que a trava reprova de verdade

Trava que nunca reprovou não provou nada. Depois de escrever as regras:

1. Criar um arquivo temporário fora de `src/lib/auth` e `src/lib/db` (ex.:
   `src/lib/servicos/_teste_trava_import.ts`) importando
   `bancoSemFiltroDeEmpresa` de `@/lib/db/sem-filtro-de-empresa`. Rodar
   `npm run lint` e conferir que reprova, citando o arquivo e a mensagem
   acima.
2. Criar um segundo arquivo temporário fora de `src/lib/db` (ex.:
   `src/lib/servicos/_teste_trava_cliente.ts`) importando
   `@prisma/adapter-pg` e chamando `new PrismaClient(...)`. Rodar
   `npm run lint` e conferir que reprova — e conferir os dois sintomas
   separados (import e construção), não só um.
3. Apagar os dois arquivos de teste **mesmo se o passo 1 ou 2 falhar no
   meio** — o mesmo cuidado que `tests/isolamento/schema.test.ts` já tem
   com a tabela de sondagem (§3, item 1 daquele plano): um arquivo de teste
   esquecido no repositório por uma falha no meio da verificação seria
   achado depois como se fosse código de verdade.
4. Depois de apagar, rodar `npm run lint` mais uma vez e conferir que passa
   limpo — prova de que a reprovação era da trava nova, não de outra coisa
   já quebrada no projeto.
5. Rodar `npm run lint` sobre o estado real do repositório (sem arquivos de
   teste) e conferir dois controles positivos: `src/lib/auth/index.ts`
   (que importa `sem-filtro-de-empresa` de verdade) continua passando, e
   `scripts/seed/municipios.mts` (a exceção) continua passando.
6. `npm run build` para confirmar que o Next.js roda o ESLint durante o
   build (não há `eslint: { ignoreDuringBuilds: true }` em
   `next.config.ts`) — é a frase "o erro aparecer no build" sendo
   verdadeira de fato, não só no `npm run lint` isolado.

---

## 6. O que este plano NÃO faz

- Não mexe nas regras já existentes de `pg` cru / `$queryRaw` — só
  acrescenta as duas novas ao lado delas, sem afrouxar as de hoje.
- Não mexe em `scripts/medir-municipios.mts`, `scripts/seed/gerar-municipios.mjs`
  nem em `prisma.config.ts` — nenhum dos três precisa de exceção (o
  primeiro já usa `db()`; o segundo não fala com banco; o terceiro fica na
  raiz, fora do escopo das regras).
- Não toca nas tarefas 1, 3 e 4 da auditoria. Uma tarefa por vez (§2).

---

## 7. Arquivos que a tarefa toca

| Arquivo | O que muda |
|---|---|
| `eslint.config.mjs` | as duas regras novas, com a exceção nomeada da semente |
| `src/lib/db/sem-filtro-de-empresa.ts` | comentário da linha 34 passa a apontar para o mecanismo real |
| `docs/diario.md` | entrada da tarefa, apontando para este plano (§2) |

Nenhuma migration. Nenhuma decisão de tela.

---

## 8. Como eu sei que terminou

1. As duas regras existem no `eslint.config.mjs`, com mensagem clara.
2. Os dois testes de reprovação (§5, passos 1-2) reprovaram de verdade,
   medido, e os arquivos temporários foram apagados — inclusive se algo
   tivesse falhado no meio.
3. Os dois controles positivos (`src/lib/auth/index.ts`,
   `scripts/seed/municipios.mts`) continuam passando no lint real.
4. `npm run build` confirma que o ESLint roda durante o build.
5. `/revisar` rodado, achados trazidos item a item, e commit só depois da
   sua aprovação.
