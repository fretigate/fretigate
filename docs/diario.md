# Diário de execução

Onde o trabalho parou e qual é o próximo passo. Atualizado ao fim de cada
sessão. Não é histórico — para isso existe o `git log`. É só o suficiente para
retomar sem reconstruir contexto.

---

## 06/08/2026 — reorganização das pastas

Fora da ordem de construção. Feito agora justamente porque quase não existe
código: mover três arquivos custa nada, mover trinta custa uma tarde.

**Estado:** concluído. `next build`, `eslint` e `next dev` passando. Árvore
limpa. O próximo passo continua sendo a **tarefa 2**, descrita abaixo.

### O que mudou

| Antes | Depois |
|---|---|
| `app/` | `src/app/` |
| `LOGO/` | `referencia/marca/` |
| `@/` apontava para a raiz | aponta para `src/` |

Junto: `referencia/LEIA-ME.md` novo, dizendo que ali nada roda; `CLAUDE.md` §6
reescrito com a árvore nova e com a lista do que é obrigado a ficar na raiz.

### O que foi conferido, e como

**A pasta fantasma.** O Next.js só lê `src/app` **se não existir `app/` na
raiz** — se as duas existirem ele usa a da raiz e ignora a de `src/` sem dar
erro nenhum. Conferir que a pasta sumiu prova pouco. O que foi feito: uma linha
visível foi acrescentada em `src/app/page.tsx`, o servidor subiu e a linha
apareceu no navegador. Isso prova qual pasta está no ar. A linha foi removida
em seguida.

**As regras de ignorar.** Os caminhos do `.gitignore` que começam com `/` são
presos à raiz, então `/lib/generated/` deixou de valer no instante em que a
pasta virou `src/lib/`. Sem correção, o cliente que o Prisma vai gerar na
tarefa 5 — dezenas de MB — entraria no repositório. Foram criados
`src/lib/generated/teste.txt` e `referencia/marca/_old/teste.png`; o
`git add -A` em ensaio não enxergou nenhum dos dois. Os arquivos de teste foram
apagados.

**Nenhum `.env` no commit.** Conferido na lista de arquivos antes de gravar.

**O Tailwind não precisou de nada.** Ele varre o projeto a partir da raiz, não
a partir de onde o arquivo CSS está — conferido no pacote instalado
(`@tailwindcss/postcss`, opção `base`, padrão = diretório de trabalho). A nota
da documentação do Next sobre ajustar `tailwind.config.js` ao usar `src/` é da
versão 3, que nem tem esse arquivo aqui.

### O que ficou na raiz, e por quê

Ferramenta procura configuração na raiz e em nenhum outro lugar. `next.config.ts`
fora da raiz é ignorado **em silêncio**, que é o pior tipo de quebra. A lista
completa está no `CLAUDE.md` §6. O caso que ainda vai aparecer: **`public/` fica
na raiz, nunca dentro de `src/`** — a documentação do Next é explícita.

---

## 06/08/2026 — item 1 da ordem de construção

**Estado:** tarefa 1 de 10 concluída. Nada pela metade. Árvore limpa.

O plano completo do item 1 está aprovado e descrito em
`C:\Users\Jarvis\.claude\plans\li-o-claude-md-e-sequential-chipmunk.md`.

### Feito

| Commit | O que entrou |
|---|---|
| `6acee37` | Commit inicial: documentação, marca e referência (78 arquivos, 16,6 MB) |
| `b9cca09` | `docs/navegacao.md` e `docs/componentes.md` |
| `9a60ca0` | Decisão da distância entre municípios (§9 e §14 do `CLAUDE.md`) |
| `1afcf49` | **Tarefa 1** — Next 16.3, React 19.2, TypeScript, Tailwind 4 e o sistema visual de `docs/estilo.md` em `app/globals.css` (hoje `src/app/globals.css`) |
| `f316f60` | Correção do inventário de componentes e as duas lacunas marcadas |

### Próximo passo — tarefa 2

Conectar o Prisma ao Supabase e **derrubar o risco técnico do plano**: provar
que `$transaction([set_config, consulta])` funciona no pool de transação do
Supabase e que o valor de `app.empresa_id` **não sobrevive entre pedidos**.

Se isso não funcionar, a camada 2 do isolamento (Row-Level Security) muda de
forma. As camadas 0, 1, 3 e 4 seguem iguais. É por isso que essa prova vem
antes de qualquer código depender dela.

**Bloqueado esperando credenciais do Supabase.** O fundador precisa criar o
projeto e pegar, em Project Settings › Database, duas strings de conexão:

- **Transaction pooler**, porta 6543 → `DATABASE_URL`
- **Direct connection**, porta 5432 → `DIRECT_URL`

Vão num arquivo `.env` na raiz, usando `.env.example` como modelo. O `.env`
está no `.gitignore` e nunca é commitado.

### Tarefas restantes do item 1

3. Schema de `Empresa`, `Usuario` e tabelas do Better Auth
4. RLS com falha fechada em migration SQL
5. `lib/db` — cliente escopado, extensão, saída de emergência
6. **Testes de isolamento** (vêm antes de qualquer tela, de propósito)
7. Better Auth e `lib/auth` com rate limit
8. Telas de Entrar, Criar conta, Esqueci a senha e Termos — **ver bloqueio**
9. Travas de ESLint e SQL cru na integração contínua
10. Correções nos documentos e a pendência do Storage

### Bloqueios conhecidos

**Tarefa 8 está travada pelo `docs/componentes.md`.** O documento marca que as
telas de Entrar, criar conta e Termos ainda não estão na tabela "Onde cada tela
usa o quê", e manda perguntar antes de construir qualquer tela ausente dela —
o `CLAUDE.md` §8 proíbe botão fora do inventário. As tarefas 2 a 7 não desenham
tela e seguem sem depender disso.

Falta também, no mesmo documento, a especificação de ícones: tamanho por
contexto, espessura de traço, gap, alinhamento e a regra de que o traço herda a
cor do texto.

### Decisões tomadas nesta sessão

- **Login por e-mail e senha**, não por código no WhatsApp. `docs/navegacao.md`
  linhas 49-51 descrevem telefone e código, o que exige envio automático por
  API de WhatsApp — proibido pelo `CLAUDE.md` §12. Correção do documento na
  tarefa 10.
- **Aceite dos termos já no cadastro**, com texto provisório. `Empresa` ganha
  `termos_aceitos_em` e `termos_versao`.
- **Supabase** como banco, porque o §5 pede storage do provedor do banco com
  URL assinada — um fornecedor só, e RLS de primeira classe.
- **`Usuario` não terá `senha_hash`.** O Better Auth guarda o hash na tabela
  `account`. Desvio do §6 da especificação, a corrigir na tarefa 10.
- **E-mail é único no produto**, não por empresa. A mesma pessoa em duas
  transportadoras precisaria de dois e-mails.
- **Escala de espaçamento em pixel** (`--spacing: 1px`): `p-16` vale 16px, como
  a folha de estilo escreve. Não é o padrão do Tailwind.

### Pendências fora do item 1

- **Backup do banco**, exigido pelo `CLAUDE.md` §4 antes do primeiro cliente
  pagante. Passa a valer no momento em que o banco existir — ou seja, a partir
  da tarefa 2.
- **Isolamento do Storage** (item 5, quando entrar upload): balde privado,
  caminho não é autorização, URL assinada gerada no servidor depois de conferir
  a posse, RLS em `storage.objects` com falha fechada. Vai para o `CLAUDE.md`
  §4 na tarefa 10.
- **`next dev` escreve um bloco no fim do `CLAUDE.md`** a cada execução.
  Desligável com `agentRules: false` no `next.config.ts`. Decisão do fundador,
  ainda não tomada.
