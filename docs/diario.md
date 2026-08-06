# Diário de execução

Onde o trabalho parou e qual é o próximo passo. Atualizado ao fim de cada
sessão. Não é histórico — para isso existe o `git log`. É só o suficiente para
retomar sem reconstruir contexto.

---

## 06/08/2026 — tarefa 2: risco técnico do isolamento derrubado

**A pergunta que travava o plano foi respondida: sim, funciona.** O
`$transaction([set_config, consulta])` mantém as duas instruções na mesma
conexão do pool de transação do Supabase, e o valor **não** sobrevive ao fim do
pedido. A camada 2 do isolamento (RLS) segue como estava desenhada.

### Como foi provado

Ler depois e ver vazio não provaria nada — a leitura seguinte pode cair em
outra conexão física. A prova identificou a conexão pelo `pg_backend_pid()` e
foi procurar leituras **no mesmo pid**.

| | Resultado |
|---|---|
| As duas instruções na mesma conexão | a consulta leu o que o `set_config` gravou |
| Valor sobrevive ao pedido? | 60 leituras soltas, **todas as 60 na mesma conexão física**, nenhuma enxergou empresa_id |
| Concorrência | 40 pedidos simultâneos em 10 conexões físicas, **zero** leram a empresa de outro |
| Contraste com `local=false` | vazou nas 60 leituras seguintes |

O contraste importa: ele mostra que o terceiro parâmetro `true` é o que faz o
trabalho, não enfeite. Com `false` o valor vira estado de sessão, e sessão no
pool é reaproveitada pelo pedido de outra empresa. O resíduo desse teste foi
limpo e conferido.

### A armadilha que quase virou conclusão errada

Na primeira execução a prova **reprovou**, e a culpa era da prova, não do banco.

No Postgres, uma variável personalizada como `app.empresa_id`, depois de usada
uma vez na sessão, **não deixa de existir: ela volta a valer string vazia**.
A verificação estava escrita como "tem que ser nulo", e string vazia não é
nulo. Conferido com uma variável de nome inédito: antes de tudo lê `NULL`,
dentro da transação lê o valor, depois do commit lê `''`.

**Consequência direta para a tarefa 4:** a política de RLS precisa **falhar
fechada com string vazia**, não só com nulo. Uma política que só teste `IS NULL`
deixa passar o estado "sem empresa" mais comum que existe em produção — o de
uma conexão reaproveitada. Isso não é detalhe de teste, é requisito da política.

### O que ficou no repositório

Prisma 7.9.1 com `@prisma/adapter-pg`, `prisma/schema.prisma` (só a conexão,
nenhuma tabela ainda) e `prisma.config.ts`.

**O Prisma 7 mudou de forma relevante em relação ao 6:** as URLs de conexão
saíram do schema e foram para `prisma.config.ts`, o cliente passou a exigir um
adaptador de driver, e o `.env` não é mais lido sozinho — daí o
`process.loadEnvFile()` no início do arquivo de configuração.

Os roteiros da prova eram temporários e foram apagados. Viram teste de verdade
na **tarefa 6**, e o desenho a repetir é: identificar a conexão pelo
`pg_backend_pid()`, procurar leituras no mesmo pid, incluir o contraste com
`local=false`, e tratar `''` e `NULL` como o mesmo estado "sem empresa".

### Percalço no caminho, para não repetir

As duas strings de conexão vieram do painel do Supabase com a senha ainda entre
colchetes — `[senha]`. Os colchetes são a marcação de "preencha aqui" e não
fazem parte da senha; com eles, o Postgres recusa com
`password authentication failed`. O usuário do pool também não é `postgres`, e
sim `postgres.<project_ref>` — esse já veio certo.

### Próximo passo — tarefa 3

Schema de `Empresa`, `Usuario` e as tabelas do Better Auth. Nada mais bloqueia.

---

## 06/08/2026 — backup do banco virou pendência aberta

O banco existe a partir de hoje. O `CLAUDE.md` §4 exige **backup do banco
configurado antes do primeiro cliente pagante**, e até agora essa exigência
estava adormecida por falta de banco. Agora está correndo.

**Não está resolvido. Não bloqueia a tarefa 2**, mas bloqueia cobrar o primeiro
cliente.

### O que precisa ser decidido

- **O que o plano atual do Supabase já dá**, de fato — retenção e frequência.
  Conferir no painel, não supor.
- **Se a retenção padrão basta.** O dado aqui é o faturamento da transportadora.
  Perder uma semana de lançamento é perder dinheiro que o cliente não consegue
  reconstruir — ele lança justamente porque não lembra.
- **Se vale point-in-time recovery.** Backup diário só recupera até o último
  retrato; PITR recupera até o minuto. A diferença aparece no dia em que uma
  migration errada apaga dado às 15h e o retrato é das 3h da manhã.

### O que não conta como resolvido

**Backup que nunca foi restaurado não é backup.** A pendência só fecha depois
de uma restauração de teste, feita e conferida uma vez. Configurar e confiar é
o modo mais comum de descobrir que não funciona no pior dia possível.

---

## 06/08/2026 — acesso de leitura ao Supabase pelo MCP

O MCP do Supabase está ligado nesta máquina para que o assistente consiga
**olhar** o banco. É ferramenta de conferência, não caminho de alteração.

### Como está configurado

| | |
|---|---|
| Modo | `read_only=true` |
| Escopo | um projeto só, `project_ref=ysldmzvszjxdgcbtaurh` |
| Alcance | configuração local, presa a esta pasta e a esta máquina |
| Onde | `C:\Users\Jarvis\.claude.json`. **Não é arquivo do repositório** |

Ligar de novo em outra máquina:

```
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?read_only=true&project_ref=ysldmzvszjxdgcbtaurh"
```

Depois, autorizar com `/mcp` — é OAuth no navegador, e só o fundador faz.

### Para que serve

Conferir, e nada além disso:

- se o schema no banco é o que a migration diz que é;
- se o RLS está **ativo e forçado** em cada tabela — forçado importa, porque
  sem isso o dono da tabela ignora a política e o isolamento do `CLAUDE.md` §3
  cai sem ninguém perceber;
- se as políticas existem e são as esperadas;
- na tarefa 2, o comportamento do `set_config` no pool de transação: se o valor
  de `app.empresa_id` realmente **não sobrevive entre pedidos**.

### Para que NÃO serve

**Nenhuma alteração de banco passa pelo MCP.** Migration é sempre pelo Prisma e
sempre commitada.

A razão não é desconfiança da ferramenta, é rastreabilidade. Alteração feita
por MCP não deixa arquivo, não entra em revisão e não é reproduzível: o banco
de produção passa a ter um estado que nenhum arquivo do repositório explica, e
a próxima migration é escrita em cima de uma suposição errada. `read_only=true`
transforma essa regra em impossibilidade, em vez de deixá-la como boa intenção.

O escopo por projeto tem o mesmo espírito: mesmo em leitura, não há motivo para
o assistente enxergar outros projetos da conta.

**Estado agora:** configurado, `Needs authentication`. Só passa a funcionar
depois do `/mcp`.

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

### ~~Próximo passo — tarefa 2~~ — CONCLUÍDA

Era conectar o Prisma ao Supabase e derrubar o risco técnico do plano: provar
que `$transaction([set_config, consulta])` funciona no pool de transação e que
o valor de `app.empresa_id` não sobrevive entre pedidos.

**Feito, e a resposta foi sim.** O bloqueio das credenciais também caiu. Ver a
entrada de 06/08/2026 no topo deste arquivo, com os números da prova e com o
achado sobre string vazia que muda a política de RLS da tarefa 4.

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

- **Backup do banco** — ~~passa a valer quando o banco existir~~. **Já está
  correndo.** Ver a entrada de 06/08/2026 no topo deste arquivo.
- **Isolamento do Storage** (item 5, quando entrar upload): balde privado,
  caminho não é autorização, URL assinada gerada no servidor depois de conferir
  a posse, RLS em `storage.objects` com falha fechada. Vai para o `CLAUDE.md`
  §4 na tarefa 10.
- **`next dev` escreve um bloco no fim do `CLAUDE.md`** a cada execução.
  Desligável com `agentRules: false` no `next.config.ts`. Decisão do fundador,
  ainda não tomada.
