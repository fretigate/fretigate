# Auditoria de segurança — Tarefa 3: mecanismo de sessão para ação de servidor

Plano da tarefa 3 de quatro, saídas da auditoria de 15/08/2026. Escrito antes
de qualquer linha de código, conforme `CLAUDE.md` §2.

---

## 1. O defeito, em uma frase

Toda ação de servidor (`"use server"`) começa com `const sessao = await
exigirSessao();`, escrito à mão, ação por ação. Hoje isso "funciona" porque
não existe outro jeito de conseguir `empresaId` — mas é sorte, não trava:
nada impede uma ação nova de esquecer a linha, e nada garante que uma ação
que devesse ser só do dono (`exigirDono()`) não seja escrita com a versão
comum por engano. `exigirDono()` nunca rodou uma vez em produção — nenhuma
tela de dono existe ainda — e nenhum teste de hoje passa por sessão de
verdade: toda a cobertura desse trecho é manual, pelo navegador
(`tests/cadastro.test.ts:17-23` documenta isso explicitamente).

Medido antes de desenhar: 17 ações de servidor existem hoje, em 6 arquivos —
16 delas chamam `exigirSessao()` como primeira linha; `sairDaConta`
(`src/app/(app)/acoes.ts`) não chama nada (o próprio Better Auth trata sessão
ausente); `criarConta` (`src/lib/servicos/cadastro.ts`) não pode chamar —
cria a empresa, e nesse instante ainda não existe sessão para exigir.

---

## 2. A pergunta trazida ao fundador, e as duas respostas

**Qual mecanismo.** Três opções trazidas: só um teste que lê o código; teste +
um envelope obrigatório; as duas mais uma barreira de middleware do Next.js.
Escolhida a segunda — teste **e** envelope, juntos, no mesmo commit. O
envelope sozinho é trava sem prova; o teste sozinho só avisa depois que já
aconteceu. Middleware recusado: cobre só "tem sessão", não distingue dono de
operador, que é exatamente o caso que motivou a tarefa.

**Como provar sem abrir uma porta dos fundos.** A primeira ideia — dar a
`exigirSessao()`/`exigirDono()` um parâmetro opcional de cabeçalhos, para o
teste poder chamar sem uma requisição real — foi apontada como perigosa: um
parâmetro que aceita cabeçalho de fora é o formato exato de uma porta dos
fundos, e se alcançável de uma rota real, contornaria a sessão inteira.
Resposta: **`exigirSessao()`/`exigirDono()` não ganham parâmetro nenhum** —
continuam exatamente como hoje, sempre lendo o cabeçalho real do pedido. A
lógica de verdade (achar a sessão pelo cabeçalho, checar `arquivado_em`,
checar o papel) muda de arquivo, para um que só `src/lib/auth` e `tests`
podem importar — mesmo mecanismo que já tranca `bancoSemFiltroDeEmpresa`
(tarefa 2). Detalhe em §4.

---

## 3. O envelope

Arquivo novo `src/lib/auth/acao.ts`:

```ts
export function comoUsuario<A extends unknown[], R>(
  acao: (sessao: Autenticado, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const sessao = await exigirSessao();
    return acao(sessao, ...args);
  };
}

export function comoDono<A extends unknown[], R>(
  acao: (sessao: Autenticado, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const sessao = await exigirDono();
    return acao(sessao, ...args);
  };
}
```

A ação nasce recebendo `sessao` como primeiro parâmetro — não escreve a
verificação, não tem como esquecer a linha porque não existe linha para
esquecer. A escolha de qual envelope usar **é** a declaração de "esta ação
exige dono": não existe lista separada para eu manter dizendo quais ações são
de dono, o próprio código já diz.

**As 16 ações de hoje passam a usar `comoUsuario`**, em `clientes/acoes.ts`
(3), `caminhoes/acoes.ts` (3), `motoristas/acoes.ts` (3), `fretes/acoes.ts`
(8, conferir contagem exata na construção). Muda só a abertura de cada uma —
de `export async function xAction(...) { const sessao = await exigirSessao();
...}` para `export const xAction = comoUsuario(async (sessao, ...) => {...});`
— o corpo, o que cada ação faz, não muda. Nenhuma usa `comoDono` ainda:
nenhuma tela de dono existe (mecanismo estreia no item 10, `CLAUDE.md` §12
confirma que desktop/itens futuros não entram agora).

**Duas exceções, com o motivo escrito ao lado, e nada mais:**

- `sairDaConta` — sessão pode já ter vencido; o `auth.api.signOut` trata isso.
- `criarConta` — cria a empresa; sessão não existe nesse momento.

---

## 4. Onde a lógica de verdade mora, e a trava de importação

Arquivo novo `src/lib/auth/sessao-por-cabecalho.ts`:

```ts
export async function sessaoPorCabecalho(cabecalhos: Headers): Promise<Autenticado | null> { ... }
export async function exigirSessaoPorCabecalho(cabecalhos: Headers): Promise<Autenticado> { ... }
export async function exigirDonoPorCabecalho(cabecalhos: Headers): Promise<Autenticado> { ... }
```

Contém a lógica que hoje está em `sessao.ts` (achar a sessão via
`auth.api.getSession({ headers: cabecalhos })`, recusar usuário arquivado,
checar papel) — só que recebendo o cabeçalho como argumento comum, do mesmo
jeito que o próprio Better Auth já aceita. **Não fabrica sessão nenhuma**:
continua exigindo um cookie de sessão de verdade, válido; só muda de onde o
`Headers` vem.

`src/lib/auth/sessao.ts` fica com a API pública **idêntica à de hoje**
(`Autenticado`, `SemSessao`, `SemPermissao`, `sessaoAtual`, `exigirSessao`,
`exigirDono` — mesmos nomes, mesmo caminho de import, os ~20 arquivos que já
importam daqui não mudam uma linha) — só que por dentro vira casca de uma
linha:

```ts
export async function exigirSessao(): Promise<Autenticado> {
  return exigirSessaoPorCabecalho(await headers());
}
```

**A trava:** `sessao-por-cabecalho.ts` só pode ser importado por
`src/lib/auth` — mesma regra que já existe para `sem-filtro-de-empresa.ts`
(tarefa 2), nova entrada em `eslint.config.mjs`, mesmo bloco de `src/**`.
`tests/` fica fora de `src/**`, então nunca esteve no escopo dessa restrição
— é o mesmo motivo pelo qual `/tests` já pode SQL cru hoje (`CLAUDE.md` §3).
Nenhum arquivo em `src/app/**` — onde toda ação de servidor mora — consegue
importar o núcleo; se tentasse, `npm run lint` reprovaria a cada `push`.

---

## 5. A prova de que a trava reprova de verdade

Mesmo procedimento da tarefa 2 (`CLAUDE.md` §13: trava que nunca reprovou não
provou nada):

1. Criar um arquivo temporário dentro de `src/app/(app)/` importando
   `sessaoPorCabecalho` de `@/lib/auth/sessao-por-cabecalho`. Rodar `npm run
   lint`, conferir que reprova com mensagem clara. Apagar o arquivo mesmo se
   o passo falhar no meio.
2. Rodar `npm run lint` de novo e conferir limpo — a reprovação era da trava
   nova, não de outra coisa quebrada.
3. Controle positivo: `src/lib/auth/sessao.ts` (o único chamador de
   produção) continua passando.

---

## 6. Os dois testes novos

**Estrutural — `tests/protecao-de-acoes.test.ts`.** Varre `src/**/*.ts`
(mesmo `globalIgnores` do `eslint.config.mjs`, sem lista de arquivo à mão) e,
para cada arquivo cuja primeira instrução é a diretiva `"use server"`, lê a
árvore sintática (pacote `typescript`, já dependência do projeto — sem
regex) e classifica cada exportação de valor (função ou `const` com `call
expression`) em três grupos: envolvida por `comoUsuario`, envolvida por
`comoDono`, ou nem uma nem outra. O terceiro grupo só pode conter os dois
nomes da exceção (§3), **conferidos por igualdade exata nos dois sentidos** —
mesma técnica de `tests/isolamento/schema.test.ts`: reprova se sobrar
exportação fora da lista, e reprova também se a lista tiver nome que já foi
envolvido (exceção que não devia mais existir).

**Comportamento — `tests/sessao-e-papel.test.ts`.** Semeia uma empresa de
verdade com um usuário dono e um usuário operador (mesmo padrão de
`tests/cadastro.test.ts`: `auth.$context.internalAdapter`, senha real com
hash), loga os dois de verdade via `auth.api.signInEmail(...)` para conseguir
um cookie de sessão genuíno, monta `Headers` com ele e chama
`exigirSessaoPorCabecalho`/`exigirDonoPorCabecalho` (o núcleo de §4)
diretamente — sem servidor HTTP, sem simulação de cookie. Verificações:

- dono e operador, os dois, conseguem sessão comum (`exigirSessaoPorCabecalho`).
- só dono passa em `exigirDonoPorCabecalho`; operador recebe `SemPermissao`.
- sem cookie nenhum, os dois recebem `SemSessao` (inclusive
  `exigirDonoPorCabecalho` — a ausência de sessão vem antes da checagem de
  papel).
- checagem estrutural extra, no mesmo arquivo ou no de estrutura: o corpo de
  `exigirSessao`/`exigirDono` em `sessao.ts` chama
  `exigirSessaoPorCabecalho`/`exigirDonoPorCabecalho` com o cabeçalho do
  pedido e nada mais — fecha o intervalo entre "o que o teste exercitou" e "o
  que roda em produção", já que `headers()` do Next.js não pode ser chamado
  de dentro do Vitest.

Cada teste conta quantas verificações rodou e reprova se rodaram menos que o
esperado (`CLAUDE.md` §3, item 4) — mesmo cuidado que motivou a tarefa 1.

---

## 7. O que este plano NÃO faz

- Não cria nenhuma tela ou ação de dono — `comoDono` nasce sem uso em
  produção, provado só pelo teste (§6). Fica pronto para o item 10 usar.
- Não muda o que nenhuma ação faz — só a abertura de cada uma.
- Não mexe em middleware do Next.js — opção recusada em §2.
- Não toca na tarefa 4 da auditoria (varredura de segredo na esteira). Uma
  tarefa por vez (`CLAUDE.md` §2).

---

## 8. Arquivos que a tarefa toca

| Arquivo | O que muda |
|---|---|
| `src/lib/auth/sessao-por-cabecalho.ts` | **novo** — a lógica de verdade, cabeçalho explícito |
| `src/lib/auth/sessao.ts` | vira casca fina sobre o arquivo acima; API pública idêntica |
| `src/lib/auth/acao.ts` | **novo** — `comoUsuario`, `comoDono` |
| `src/app/(app)/clientes/acoes.ts` | 3 ações passam a usar `comoUsuario` |
| `src/app/(app)/caminhoes/acoes.ts` | 3 ações passam a usar `comoUsuario` |
| `src/app/(app)/motoristas/acoes.ts` | 3 ações passam a usar `comoUsuario` |
| `src/app/(app)/fretes/acoes.ts` | 8 ações passam a usar `comoUsuario` |
| `src/app/(app)/acoes.ts` | comentário explicando a exceção de `sairDaConta` |
| `src/lib/servicos/cadastro.ts` | comentário explicando a exceção de `criarConta` |
| `eslint.config.mjs` | trava de importação de `sessao-por-cabecalho`, mesmo padrão da tarefa 2 |
| `tests/protecao-de-acoes.test.ts` | **novo** — teste estrutural |
| `tests/sessao-e-papel.test.ts` | **novo** — teste de comportamento real |
| `CLAUDE.md` §9 | parágrafo novo documentando o mecanismo, mesmo padrão da explicação de `db()` |
| `docs/diario.md` | entrada da tarefa, apontando para este plano |

Nenhuma migration. Nenhuma decisão de tela.

---

## 9. Como eu sei que terminou

1. As 16 ações usam `comoUsuario`; as duas exceções têm comentário
   justificando, e nenhuma outra existe.
2. A trava de importação de `sessao-por-cabecalho` reprova de verdade (§5,
   medido, arquivo de prova apagado depois).
3. `tests/protecao-de-acoes.test.ts` reprova se eu (de propósito, durante a
   construção) remover o envelope de uma ação e voltar a reprovar depois de
   desfazer — prova de que o teste enxerga a classe de defeito que motivou a
   tarefa.
4. `tests/sessao-e-papel.test.ts` passa com sessão real de dono e de
   operador, e reprova se eu trocar `exigirDonoPorCabecalho` por
   `exigirSessaoPorCabecalho` de propósito (mesma prova de contraste).
5. `npm run lint`, `npm run build` e a suíte inteira (`npm run test`) verdes.
6. `/revisar` rodado, achados trazidos item a item, commit só depois da sua
   aprovação.
