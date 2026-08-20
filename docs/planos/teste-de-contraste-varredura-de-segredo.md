# Plano — teste de contraste permanente da varredura de segredo

**Escrito depois da construção, não antes.** O pedido veio explícito e
detalhado do fundador, na própria conversa que motivou a construção — plano
retroativo, contra a letra de `CLAUDE.md` §2 item 1 ("Plano antes de código,
sempre"), achado pelo `/revisar`. Registrado aqui para o arquivo existir, não
para justificar a ordem. Mesmo padrão já visto nesta sessão em
`docs/planos/teto-de-tempo-no-teste-de-medicao-completa.md`.

## O problema

A tarefa 4 da auditoria de segurança (`docs/planos/auditoria-4-varredura-de-segredo.md`)
ficou com uma pendência desde 18/08/2026: o `.gitleaks.toml` estava provado
por verificação manual, feita uma vez dentro daquela sessão (seis controles
plantados e retestados, `docs/diario.md`) — não por teste que roda de novo a
cada execução da suíte. `CLAUDE.md` §3 já exige isso para o isolamento entre
empresas; o fundador confirmou que a mesma exigência vale aqui.

## O pedido do fundador, literal

1. O teste roda o binário real do gitleaks, nunca reimplementa a regra em
   código — motivo: duas vezes, nesta mesma regra, o raciocínio sobre o que a
   regex deveria fazer estava errado, e só a ferramenta pegou (`docs/diario.md`,
   18/08/2026). Reimplementar testaria de novo o mesmo entendimento que já
   falhou.
2. Os casos incluem os dois disfarces que passaram antes da correção — não só
   a versão final da regra:
   - senha real terminada em `:senha` (criava a subcadeia do placeholder
     dentro do próprio campo);
   - senha real seguida de `?p=:senha@` depois do endereço (a comparação era
     contra a URL inteira, não contra o campo capturado).
   Sem eles, o teste cobriria só a versão de hoje e não impediria alguém
   reintroduzir a antiga.
3. Mais os casos que devem passar: o placeholder exato, maiúsculo e
   minúsculo.
4. Se o binário não estiver disponível, o teste falha alto com mensagem
   clara — nunca pula em silêncio. Na esteira, reaproveita o binário que o
   passo de varredura já baixa.
5. Contagem de verificações, como `CLAUDE.md` §3 exige.
6. Espera a esteira do commit anterior confirmar antes de qualquer envio.
   `/revisar` antes do commit.

## O desenho

**O contraste** (`CLAUDE.md` §3, item 1, aplicado aqui pela primeira vez fora
de RLS): cada caso roda duas vezes — com a regra "pura" (o `.gitleaks.toml`
real do repositório, com a seção `[rules.allowlist]` cortada do texto em
tempo de teste) e com a configuração real (regra + isenção). Sem a regra
pura, um "isento" no teste normal não provaria nada: podia ser isento de
verdade, ou um caso que a regra nunca alcança, como se a proteção nunca
tivesse existido.

Medido, não suposto, antes de decidir a asserção de cada caso:

| Caso | Regra pura | Configuração real |
|---|---|---|
| placeholder minúsculo (`senha`) | acha, `Secret = "senha"` | isento |
| placeholder maiúsculo (`SENHA`) | acha, `Secret = "SENHA"` | isento |
| disfarce 1 (`:senha` no campo) | **não casa** (o campo exclui `:`) | não casa (mesmo resultado) |
| disfarce 2 (`?p=:senha@` depois do host) | acha, `Secret` = senha real | acha, `Secret` = senha real (não isenta) |

O disfarce 1 é o caso que exige mais cuidado: hoje, a regra corrigida
simplesmente não casa esse formato — não é mais "casa e é isentado por
engano", é "não casa" (a exclusão de `:` do campo da senha quebra o
casamento antes de chegar à isenção). A regra pura e a configuração real dão
o mesmo resultado (zero achados) pelo mesmo motivo, e é essa igualdade —
não a presença de um achado — que o teste confere.

## Achado sobre a ferramenta, não sobre a regra

**Medido durante a construção, registrado para não ser redescoberto:** o
gitleaks não casa a regra de conexão contra texto no formato `${NOME}`
(sintaxe de interpolação/variável), mesmo com todos os outros ingredientes
do padrão presentes — confirmado isolando `$`, `{`, `}` e o texto ao redor em
casos de controle separados. A primeira versão da fixture do disfarce 2
escrevia a senha disfarçada com esse formato num template literal só, e o
arquivo de teste passava despercebido pela própria varredura que ele
testa — não porque a exceção do placeholder funcionasse (a senha plantada
não é `senha`/`SENHA`), mas por essa heurística não documentada do gitleaks.

Isso não é garantia da nossa regra, é comportamento observado do binário, que
pode mudar numa atualização sem aviso — por isso não se apoiou nele. A
fixture do disfarce 2 foi reescrita por concatenação (protocolo, usuário e
host em constantes separadas, nunca adjacentes ao ponto de formar
`protocolo://usuário:senha@host` como texto contíguo no arquivo fonte), o
que fecha a questão por construção: nenhum trecho do arquivo `.ts` forma o
padrão, independente de qual heurística o gitleaks aplicar. Confirmado
rodando o binário real contra o arquivo já commitado: zero achados.

## Versão do binário

O teste fixa a mesma versão que a esteira baixa (`8.30.1`,
`.github/workflows/ci.yml`) e recusa qualquer binário que responda a
`version` com um valor diferente — candidato rejeitado, não aceito por
engano. Mesmo espírito do `node-version: 24` fixo. Sem isso, `GITLEAKS_BIN`
ou o PATH local podiam resolver para outra versão, o teste passar, e ninguém
saber contra qual gitleaks — o `useDefault = true` do `.gitleaks.toml` herda
o conjunto de regras padrão da versão que rodou.

## Como localiza o binário

Ordem: `GITLEAKS_BIN` (override explícito) → `<raiz>/gitleaks` (onde a
esteira já baixa, sem extensão — convenção Linux) → `<raiz>/gitleaks.exe`
(mesma convenção, para quem baixou o binário do Windows na raiz para testar
localmente) → `gitleaks` no PATH. Testado localmente, com o binário real:

- `GITLEAKS_BIN` apontando para um binário fora do repositório — funciona.
- `<raiz>/gitleaks.exe` — funciona.
- `<raiz>/gitleaks` (sem extensão) — falha no Windows local (`ENOENT`; o
  Windows não executa um binário sem extensão reconhecida sem shell). Este é
  exatamente o candidato que a esteira Linux usa de verdade (mesmo nome, sem
  extensão, com `chmod +x`), e só é confirmado por ela — não há como testar
  esse caminho específico numa máquina Windows.
- `gitleaks` resolvido pelo PATH — funciona.
- Ausência total (nenhum dos quatro) — falha alto, com mensagem clara
  listando as quatro tentativas, nenhum teste roda.

## Verificação

1. `npx vitest run tests/varredura-de-segredo.test.ts` local — 10/10.
2. Suíte inteira (`GITLEAKS_BIN=<binário local> npm test`) — 208/208.
3. `npm run lint`, `npx tsc --noEmit` local.
4. `/revisar` antes do commit — rodado, achados corrigidos nesta mesma
   sessão, sem novo passe (mesma classe já vista: precisão de texto do
   diário, plano retroativo).
5. Esteira: confirma no push, via `/onde-paramos` da próxima sessão.

## Arquivos

- `tests/varredura-de-segredo.test.ts` (novo)
- `.gitignore` (ignora o binário do gitleaks baixado na raiz para teste local)
- `CLAUDE.md` §4 (registra o mecanismo)
- `docs/diario.md`
