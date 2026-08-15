# Auditoria de segurança — Tarefa 1: o teste lê a política, não a conta

Plano da tarefa 1 de quatro, saídas da auditoria de 15/08/2026. Escrito antes
de qualquer linha de código, conforme `CLAUDE.md` §2.

**Onde isto entra na ordem de construção é decisão do fundador.** As quatro
tarefas interrompem o item 4 (Lista de fretes e detalhe do frete,
`docs/especificacao.md` §9), que era o próximo. Este plano não decide isso —
só registra que a interrupção existe, para ninguém acher depois que o item 4
foi esquecido.

---

## 1. O defeito, em uma frase

`tests/isolamento/schema.test.ts` exige que toda tabela tenha **pelo menos uma
política**. Ele nunca lê o que a política diz. Uma tabela nova com a política
copiada de `municipio` — `USING (true)`, que ali é legítima porque município é
dado oficial igual para todas as empresas — passa em verde nos seis arquivos de
teste, e toda empresa enxerga toda linha.

E omitir o `WITH CHECK` tem consequência própria, escrita no `CLAUDE.md` §9:
trava a leitura e **libera a escrita** — um `INSERT` gravaria linha com o
`empresa_id` de outra empresa.

---

## 2. O que foi medido antes de desenhar (não deduzido)

Consulta de leitura ao `pg_policies` do banco de desenvolvimento, em
15/08/2026. As 14 políticas que existem hoje, com o texto **já normalizado
pelo Postgres** — que é o texto contra o qual o teste vai comparar:

| Tabela | Política | Papéis | `USING` | `WITH CHECK` |
|---|---|---|---|---|
| `empresa` | `empresa_isolamento` | `public` | `id = <contexto>` | igual |
| `usuario` | `usuario_isolamento` | `public` | `empresa_id = <contexto>` | igual |
| `usuario` | `usuario_autenticacao` | `fretigate_auth` | `true` | `true` |
| `tipo_operacao`, `cliente`, `veiculo`, `motorista`, `servico`, `titulo_receber` | `<tabela>_isolamento` | `public` | `empresa_id = <contexto>` | igual |
| `municipio` | `municipio_leitura` | `public` | `true` | `false` |
| `session`, `account`, `verification`, `rate_limit` | `<tabela>_autenticacao` | `fretigate_auth` | `true` | `true` |

Onde `<contexto>` é, literalmente:

```
(NULLIF(current_setting('app.empresa_id'::text, true), ''::text))::uuid
```

Todas são `PERMISSIVE`, todas são `cmd = ALL`.

### A descoberta que muda o desenho do teste

**Política `PERMISSIVE` se combina com OU, não com E.** Duas políticas
permissivas na mesma tabela significam "passa se qualquer uma deixar".

Isso derruba a correção óbvia. Verificar *"existe uma política que filtra por
empresa"* **não resolve o defeito** — resolve metade dele. Uma política nova,
permissiva, com `USING (true)`, acrescentada a uma tabela que já tem a de
isolamento, abre a tabela inteira **sem apagar nada**: a de isolamento continua
lá, intacta, e um teste que procurasse por ela a acharia e aprovaria.

Então a regra certa não é "existe uma boa". É **"não existe nenhuma ruim"** —
toda política de toda tabela precisa ser conferida, uma a uma, e bater com o
que está declarado. É a mesma escolha que o §2 do `CLAUDE.md` chama de
"solução mais precisa em vez de exceção": a versão frouxa passaria a impressão
de resolver e deixaria a porta que mais provavelmente vai ser usada.

---

## 3. Fatia 1 — `schema.test.ts` passa a ler a política

Substitui a verificação "tem pelo menos uma política" por uma **comparação de
igualdade exata** entre o que está declarado no teste e o que existe no
catálogo do Postgres.

A técnica não é nova neste projeto: é a mesma da lista `SEM_EMPRESA_ID` no
próprio arquivo e das concessões em `privilegios.test.ts` — declarar a
expectativa e comparar por igualdade **nos dois sentidos**, para que política
nova falhe *e* política que sumiu falhe também.

**O que passa a ser conferido, por política:** nome, papéis, permissiva ou
restritiva, comando alcançado, texto do `USING` e texto do `WITH CHECK`. Os
seis campos, não um resumo deles.

**Como a expectativa é escrita, para não virar 14 blocos copiados:** uma função
monta a política de isolamento a partir do nome da tabela e da coluna de escopo
(`id` na `empresa`, `empresa_id` no resto). As quatro exceções — `municipio` e
as três de autenticação, mais a segunda política de `usuario` — são declaradas
à mão, cada uma com o motivo escrito ao lado, como já é o padrão do arquivo.

**O efeito prático:** tabela de domínio nova exige uma linha na declaração. Se
a migration escreveu `USING (true)`, ou esqueceu o `WITH CHECK`, ou trocou a
coluna, a linha declarada não bate com o catálogo e o teste reprova dizendo
qual é a diferença. Acrescentar a linha sem a migration certa também reprova —
a expectativa não vira permissão, porque quem manda é o banco.

### O contraste — sem ele esta fatia não prova nada (§3, item 1)

Um verificador de política que nunca viu uma política ruim não é verificador,
é esperança. Então a fatia inclui a prova de que ele **reprova**:

1. cria uma tabela de sondagem de verdade, do jeito que uma migration cria;
2. põe nela uma política permissiva `USING (true)` — exatamente o defeito que
   se quer pegar;
3. roda a mesma conferência sobre ela e mede que **é recusada**;
4. derruba a tabela no fim.

**A derrubada do fim precisa acontecer mesmo se o passo 3 falhar** —
acréscimo do fundador, 15/08/2026. Sem isso, uma falha no meio da medição
deixa a tabela de sondagem — com política aberta de propósito — parada no
banco de teste. Ela não afeta o `schema.test.ts`/`vazamento.test.ts` da
*mesma* execução, porque os dois leem o catálogo antes deste arquivo criar a
sondagem (a ordem de arquivo do Vitest não é garantida ao contrário, mas o
efeito prático é: se sobrar, ela aparece na PRÓXIMA execução, antes de ser
recriada e derrubada de novo). O sintoma seria perder tempo achando que a
correção quebrou alguma coisa, quando na verdade é lixo de uma corrida
anterior. A garantia: `DROP TABLE IF EXISTS` roda tanto num `finally` em volta
da criação-e-medição (para o caso de falhar antes de qualquer teste registrar
o `afterAll`) quanto no próprio `afterAll` do arquivo (para o caso comum, uma
asserção falhando dentro de um `it`) — as duas, não uma ou outra, porque cada
uma cobre uma janela de falha diferente. `IF EXISTS` faz a segunda chamada não
reclamar de nada já ter sido apagado pela primeira.

É o precedente que `privilegios.test.ts` já usa para tabela futura — prova de
verdade, não prova de registro. A tabela de sondagem fica fora da comparação
das tabelas do produto, pelo mesmo motivo e do mesmo jeito que lá.

---

## 4. Fatia 2 — tabela nova não entra sem prova de vazamento

Hoje `vazamento.test.ts` tem sete blocos escritos à mão, um por tabela — "o
Cliente da empresa B é invisível", "o Veiculo da empresa B é invisível", e
assim por diante. Estão todos lá porque alguém lembrou, sete vezes. Tabela
nova sem bloco novo não faz nada falhar.

**A correção troca os sete blocos repetidos por um laço guiado pelo catálogo**,
com duas travas em série. Nenhuma das duas pode ser pulada em silêncio:

**Trava 1 — a tabela precisa estar declarada.** O arquivo passa a ter um mapa
de tabelas de domínio, comparado por igualdade exata com o catálogo. Tabela
nova que ninguém declarou faz o teste reprovar, nomeando a tabela.

**Trava 2 — a tabela precisa ter sido semeada.** Para cada tabela declarada, o
laço mede duas coisas na mesma passada: que a empresa A **não** enxerga
nenhuma linha da B (a prova de vazamento), e que ela enxerga **pelo menos uma**
linha própria. A segunda é o que impede o teste de aprovar o nada: uma tabela
declarada mas não semeada devolve zero linhas dos dois lados, e "zero linhas da
B" pareceria aprovação. Com a trava, isso reprova dizendo que a tabela não foi
semeada.

Ou seja: tabela nova → declara (senão reprova) → semeia (senão reprova) → e só
então a prova de vazamento roda de verdade, sozinha, sem ninguém escrever
asserção nenhuma. Hoje são dez linhas de bloco à mão que alguém pode escrever
errado; passa a ser uma linha de declaração e uma de semente, com o resto
automático.

**O laço passa pelo `db()`, não por SQL cru.** Isso é de propósito: assim ele
prova as duas coisas de uma vez — que o RLS recusa **e** que a camada de acesso
a dados define o contexto. Um laço em SQL cru provaria só a primeira.

**O que fica de pé, e por quê.** Os blocos que continuam escritos à mão são os
que testam **formato de operação**, não tabela: buscar pelo id, buscar pelo
e-mail único (o caminho que mais escapa de revisão), alterar em massa, gravar
na empresa errada. Esses não se repetem por tabela e não viram laço — cada um
mede uma forma diferente de tentar escapar. O contraste (`postgres` enxerga as
duas empresas), a concorrência com dez pedidos e os três jeitos de não ter
contexto ficam exatamente como estão.

---

## 5. O que este plano NÃO faz

- **Não mexe em migration nenhuma.** As 14 políticas de hoje estão certas — a
  medição do item 2 mostra isso. O defeito é do teste, não do banco. Se o teste
  novo acusar alguma política, aí sim vira conversa, mas não é o esperado.
- **Não mexe em `privilegios.test.ts`.** Ele já está no formato certo.
- **Não toca nas tarefas 2, 3 e 4** da auditoria. Uma tarefa por vez (§2).
- **Não acrescenta a contagem de verificações onde ela já não existe** por
  formato novo: `schema.test.ts` usa a guarda de lista não vazia que o §3 item
  4 exige, e ela continua; `vazamento.test.ts` mantém a dele.

---

## 6. O risco conhecido, escrito antes de acontecer

A comparação é contra o **texto normalizado** que o Postgres devolve. Se uma
versão futura do Postgres reformatar esse texto (trocar espaçamento, ou como
imprime a conversão de tipo), o teste reprova sem que nada de errado tenha
acontecido.

Isso é aceito, e a razão é a mesma que o `CLAUDE.md` §3 dá para ler o catálogo
em vez do schema do Prisma: o texto normalizado é **o que o banco vai executar**
na hora de recusar. Comparar contra ele é comparar contra a verdade. O custo do
falso alarme é atualizar uma constante, uma vez, com a diferença impressa na
tela; o custo da alternativa frouxa é o defeito que esta tarefa existe para
fechar. Fica registrado aqui para que, no dia em que acontecer, ninguém trate
como defeito novo nem "conserte" afrouxando a comparação.

---

## 7. Arquivos que a tarefa toca

| Arquivo | O que muda |
|---|---|
| `tests/isolamento/schema.test.ts` | a verificação de política passa a ler os seis campos, com a expectativa declarada e o contraste da tabela de sondagem |
| `tests/isolamento/vazamento.test.ts` | os sete blocos por tabela viram laço guiado pelo catálogo, com as duas travas; o resto fica |
| `docs/diario.md` | entrada da tarefa, apontando para este plano (§2) |

Nenhum arquivo de `/src`. Nenhuma migration. Nenhuma decisão de tela.

---

## 8. Como eu sei que terminou

1. `npm test` passa inteiro.
2. O contraste da fatia 1 reprova a política ruim — medido, não afirmado.
3. Uma tabela de domínio nova, sem declaração, reprova. Uma declarada sem
   semente, reprova. As duas conferidas de verdade antes de fechar.
4. `/revisar` rodado, achados trazidos item a item, e commit só depois da sua
   aprovação.
