# Plano — item 2: Cadastros

**Aprovado pelo fundador em 09/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada em
`docs/diario.md`.

## Contexto

O item 1 fechou (commit `ad17c16`): empresa, usuário, login e isolamento. O item
2 é a base sobre a qual o item 3 (lançar frete em 30 segundos) se apoia — sem
cliente, caminhão, motorista, tipo de operação e município cadastrados, a tela
central do produto não tem o que escolher.

> **Por que a regra do §2 nasceu junto deste plano.** A primeira versão dele foi
> aprovada e **se perdeu inteira** ao fechar a aba, porque só existia na
> conversa. O que está aqui foi reconstruído a partir de `docs/especificacao.md`,
> `docs/navegacao.md`, `docs/componentes.md`, do `CLAUDE.md` e do código do item
> 1. A numeração das tarefas pode não bater com a da primeira aprovação.

---

## Os três ajustes pedidos pelo fundador

**1. A seed não roda em `postinstall`.** A Vercel roda `npm install` a cada
publicação, então um `postinstall` tentaria conectar ao banco durante o *build*
— e o build da Vercel não tem, hoje, nenhuma das URLs de banco garantidas (é a
pendência "CONFERIR ANTES DE PUBLICAR" do `CLAUDE.md` §14). Ou a publicação
quebra, ou grava 5.570 linhas onde não devia. Fica comando explícito
(`npm run seed:municipios`), chamado à mão e por um passo próprio da esteira,
com o motivo escrito no topo do arquivo da seed e no `package.json`.

**2. Empresa nova nasce com "Frete" ativo.** `src/lib/servicos/cadastro.ts` foi
escrito na tarefa 8 do item 1, antes de `TipoOperacao` existir, e hoje cria só
Empresa e Usuário. Entra na tarefa 2, **dentro da mesma transação que cria a
Empresa** — não num passo seguinte, senão volta a existir empresa sem tipo
quando algo falhar no meio.

**O que fazer com as empresas de teste já criadas:** preenchimento na própria
migration, um `INSERT ... SELECT` sobre a tabela `empresa` com `ON CONFLICT DO
NOTHING`. Roda como `postgres` (a migration já roda assim) e resolve a classe
inteira do problema em vez de se apoiar em "não tem dado real ainda". As outras
duas saídas foram descartadas: **não fazer nada** deixaria as contas do banco de
desenvolvimento num estado que produção nunca terá — justamente o estado em que
a gente testa; e **criar o tipo na hora de ler** é caminho de leitura que
escreve, precisaria de permissão de escrita numa consulta e esconderia o defeito
em vez de fechá-lo.

**3. O prazo herdado precisa ter de onde herdar.** Decisão: **trazer só a coluna
`prazo_padrao_dias` da Empresa nesta rodada**, com o valor 15.

| | Trazer a coluna agora | Cliente se comportar diferente até o item 10 |
|---|---|---|
| Custo agora | 1 coluna no schema + 1 linha na migration | texto e comportamento provisórios no formulário e no perfil |
| Custo no item 10 | ligar a tela de Configurações à coluna | trocar texto, comportamento e refazer o teste dos dois |
| O que a tela diz | "Vazio usa o padrão da empresa (15 dias)" — verdade | ou mente, ou some a herança que a especificação exige |

O número 15 já estava vigente em `docs/componentes.md` ("Números de regra de
produto"), que diz que esses números vêm da especificação — só que a
especificação nunca os escreveu. Esta rodada registra o 15 em
`docs/especificacao.md` §6. **Nenhum outro campo do item 10 entra**
(`patio_*`, `chave_pix`, `dados_bancarios`, `modelo_mensagem_*`): esses
continuam sem quem leia, e coluna sem leitor é peso morto.

## As duas confirmações

**A seed grava pela conexão das migrations (`DIRECT_URL`), nunca pela da
aplicação.** É decisão de segurança, não conveniência: `fretigate_app` recebe
**só `SELECT`** em `municipio`. Município é dado de referência global — nenhuma
tela do produto escreve ali, e a garantia disso não é disciplina, é a ausência
do `GRANT`. A seed também não passa por `db()`: `db()` exige contexto de
empresa, e município não tem empresa.

**O campo de nome normalizado entra na tabela.** Três razões, em ordem de peso:
(1) a **mesma função** de normalização escreve a coluna e normaliza o que o
usuário digita na busca — uma função só nos dois lados é o que garante que eles
casem; (2) buscar com `unaccent()` na hora da consulta não usa índice, e a busca
de município do item 3 acontece **enquanto a pessoa digita**, dentro da meta de
30 segundos; (3) `unaccent` é extensão do Postgres, e depender de extensão para
o caminho crítico amarra ao provedor.

---

## Tarefa 0 — escopo e documentação (commit próprio, antes de qualquer código)

Está inteiro em `docs/especificacao.md` §9 ("O que é MVP"), no `CLAUDE.md` §2 e
§13, e nas entidades do §6. Em resumo:

- **MVP: 10 itens a construir** — 2, 3, 4, 5, 6, 7, 8, 10, 11 e 13. Despesas
  (11) entra; 12, 14, 15, 16 e 17 ficam para depois do lançamento.
- **Item 9 é parcialmente MVP:** as ações de WhatsApp entram com texto fixo; só
  a tela de editar os modelos sai.
- **A medição dos 10% é do item 3**, não do 2 — ela mede fretes.
- **`ativo` sai de `Veiculo` e `Motorista`;** fica em `TipoOperacao`, onde
  significa outra coisa.
- **`categoria_cnh` e `ano` não entram.**
- **Regra nova:** plano aprovado é commitado antes de a construção começar.
- **Precisão nova de precedência:** a especificação decide quais campos
  existem; o `componentes.md` decide como o campo é apresentado — e ele não põe
  tela nenhuma no mundo.
- **Padrão novo:** quando uma regra parece precisar de exceção, procure primeiro
  a solução mais precisa que não precisa dela.
- **`Municipio` é exceção declarada à regra do `id`** — a chave é o
  `codigo_ibge`.

## Tarefa 1 — Municípios: tabela, seed conferida e a função de busca

**Modelo** — `Municipio`, com `codigo_ibge Int @id`, `nome`, `uf`,
`nome_normalizado`, `latitude`, `longitude`, `criado_em`, `atualizado_em`,
`arquivado_em` (município extinto some da busca sem sumir do histórico). Índice
de prefixo em `nome_normalizado` com `text_pattern_ops` — sem isso a busca do
item 3 não usa índice.

**Migration** — tabela, `ENABLE`/`FORCE` RLS, política `municipio_leitura`
com as **duas** cláusulas do §9 — `USING (true) WITH CHECK (false)`, lê tudo e
grava nada —, `GRANT SELECT` só a `fretigate_app`, e a chave estrangeira de
`empresa.municipio_id`. Sem exceção ao §9: a forma óbvia (`FOR SELECT`) pediria
uma, e esta é mais rígida que ela.

**Dados** — `prisma/seed/municipios.json` (comitado) e
`prisma/seed/PROCEDENCIA.md`: de onde veio, data do download, licença, o
endereço exato e **quantos registros aquele download trazia**.

**Seed** — `prisma/seed/municipios.ts`: confere **antes de gravar** e **recusa
carregar** se algo falhar; grava com `createMany({ skipDuplicates: true })` (sem
SQL cru, idempotente); confere **depois**. A contagem é comparada com a que o
arquivo declara, dentro de uma faixa de sanidade — **nunca 5.570 cravado**, que
faria a seed parar de carregar no dia em que o IBGE mudasse a conta. Abre o
próprio cliente com `DIRECT_URL` — mesmo caminho que os testes já usam, e fora
de `src/`, então a trava de ESLint não é afetada.

**Comando** — `npm run seed:municipios`, nunca `postinstall`. Passo novo no
`ci.yml`, depois de `prisma migrate deploy` e antes de `npm test`.

**Busca** — `src/lib/utils/texto.ts` com `normalizarParaBusca`, usada pela seed
e pela consulta. `src/lib/servicos/municipios.ts` com `buscarMunicipios` e
`resolverMunicipio` — **a única porta** por onde texto vira município, para o
item 3 e a medição dos 10% terem um lugar só para instrumentar.

**Testes** — `municipio` entra nas exceções de
`tests/isolamento/schema.test.ts`; `tests/municipios.test.ts` confere contagem,
coordenadas, a normalização casando com a função, e que `fretigate_app` **lê e
não grava**, com contraste e contagem de verificações (§3).

## Tarefa 2 — Tipo de operação, e toda empresa nascendo com "Frete"

`TipoOperacao` (`nome`, `slug`, `ativo`, `ordem`, único por `empresa_id` +
`slug`), com RLS, política de isolamento (`USING` **e** `WITH CHECK`) e
`GRANT SELECT, INSERT, UPDATE` — nunca `DELETE`.

`src/lib/servicos/tipos-de-operacao.ts` guarda os quatro iniciais e a função que
os cria; `cadastro.ts` a chama dentro do `emTransacao` que já cria a Empresa.
Preenchimento das empresas existentes na própria migration.

Testes: o cadastro cria os quatro com Frete ativo (não só "criou alguma coisa");
a empresa A não enxerga tipo da empresa B.

## Tarefa 3 — Cliente: dados, documento e o prazo herdado

`Cliente` com os campos do §6 e `arquivado_em`. Três garantias no banco:

- `UNIQUE (empresa_id, documento) WHERE arquivado_em IS NULL`;
- `CHECK cliente_documento_formato`, espelhando `empresa_cnpj_formato`;
- `documento` nulo, nunca `''`.

`src/lib/utils/documento.ts` — normalizar e validar CPF/CNPJ com
`cpf-cnpj-validator`. É arquivo novo porque a correção do CNPJ (`ffc8e1e`) mexeu
só em schema, migration e documentos: **não existe código de validação ainda**.
O item 10 reusa.

`Empresa.prazo_padrao_dias Int @default(15)`, com as linhas existentes
preenchidas na migration. `src/lib/servicos/clientes.ts` com listar (as três
ordenações), buscar, criar, editar e arquivar — tudo por `db(empresaId)`.

## Tarefa 4 — A casca do app: barra de navegação e tela "Mais"

`src/app/(app)/layout.tsx` com a barra (`docs/componentes.md` §10) e a folga de
rolagem `max(138px, env(safe-area-inset-bottom) + 132px)` — valor único, sem
folga própria de tela.

**Os quatro ícones que faltam** (clientes, motoristas, importar, conta) são
**exportados para `docs/icones/`**, no padrão da família — `viewBox` 24×24,
`fill="none"`, traço `1.8px`, `stroke="currentColor"`, sem `transform` —, e o
`docs/componentes.md` deixa de dizer que eles "ainda não foram exportados". O
desenho sai do protótipo em `referencia/`; o que atravessa é o valor, nunca o
código (`referencia/LEIA-ME.md`).

**A tela "Mais" nasce só com as linhas que têm destino**; cada item seguinte
acrescenta a sua. Linha que leva a lugar nenhum é pior que linha ausente.

**O (+) fica ativo e verde, e abre o cadastro de cliente — provisoriamente.**
Decisão do fundador, 09/08/2026: não inventa cor de desabilitado que documento
nenhum define, não muda a geometria da barra duas vezes (a folga de 138px é
medida a partir do topo do (+)), e o botão cumpre o que promete — criar alguma
coisa. **No item 3 ele passa a abrir Lançar frete**, e isso fica marcado como
provisório no próprio código, com essa frase: provisório sem prazo escrito vira
permanente.

## Tarefa 5 — Clientes: lista, perfil e formulário

Peças novas em `src/components/ui`, **uma vez, reusadas por Motoristas depois**:
linha de lista, campo de busca, chip de ordenação, pílula de cabeçalho, estado
vazio e folha inferior. Nenhum valor fora de `docs/estilo.md`.

**O resumo do perfil (já rodado · a receber · vencido · recebido) e o histórico
de fretes ficam para o item 4**, porque dependem de `Servico` e
`TituloReceber` — não é convite nem estado vazio, é bloco que ainda não tem
fonte.

## Tarefa 6 — Caminhões: completo

**Mudou no meio da rodada.** O plano previa só a tabela, porque o formulário não
existia. A quinta exportação do Design, de 09/08/2026, entregou a especificação
dele — e com ela a tarefa passa a fechar Caminhões inteiro: **tabela, lista,
perfil e formulário**.

`Veiculo` (`placa`, `apelido`, `tipo`), com `CHECK` de que ao menos um entre
placa e apelido está preenchido, RLS e concessões.

Telas conforme o inventário: principal **Cadastrar caminhão** / **Salvar
alterações**, **desabilitada até ter apelido ou placa** — os dois identificam o
caminhão, e quem só sabe a placa cadastra pela placa —, chips de escolha para
**TIPO**, e **Arquivar caminhão** em texto no fim. **Sem campo de ano.**

Duas condições, decididas pelo fundador:

1. **O formulário é montado com as peças criadas na tarefa 5** — mesmos campos,
   chips e botões de Cliente. Consistência por construção, não por conferência
   depois.
2. **Rodar `/auditar-tela`** nele contra o inventário.

Um cuidado que a exportação trouxe junto e vale aqui: como o caminhão pode ser
cadastrado só pela placa, **nenhuma tela lê `apelido` direto para nomeá-lo** —
existe um jeito único de dizer o nome do caminhão (apelido se houver, senão a
placa em maiúsculas), usado no aviso, na linha da lista, no cabeçalho do perfil
e no filtro de fretes. Sem isso, um caminhão cadastrado só com placa aparece
sem nome em toda lista.

Fica pedido ao Design que o protótipo e o marcador do `docs/navegacao.md`
acompanhem — **não bloqueia**, é acerto de documentação.

### O registro de como isso apareceu, que não se perde

**Conferido no protótipo em 09/08/2026: o formulário de caminhão não existia.**

| Tela do protótipo | Estados | Campos digitáveis | Salvar |
|---|---|---|---|
| `TelaClientes.dc.html` | lista · perfil · **formulário** | 3 | Salvar cliente / Salvar alterações |
| `TelaMotoristas.dc.html` | lista · perfil · **formulário** | 2 | Salvar motorista / Salvar alterações |
| `TelaCaminhoes.dc.html` | lista · perfil | **0** | **nenhum** |

A tela de Caminhões tem lista e perfil completos — inclusive "Editar caminhão" e
"Arquivar caminhão" no fim do perfil —, mas **o Editar não leva a lugar nenhum**:
o próprio protótipo responde, ao ser tocado, *"Editar caminhão — formulário
ainda não desenhado"* (`TelaCaminhoes.dc.html:353`). Não há o que interpretar.

Enquanto assim esteve, a tarefa entregaria só a tabela — e o problema era maior
que uma tela faltando: as **duas** portas de criar um caminhão estavam sem
desenho (o formulário e a folha de cadastro rápido do lançamento), o que travava
`veiculo_habitual` no motorista e a escolha de caminhão no **item 3**.

**A quinta exportação do Design resolveu uma das duas**, entregando o formulário
— com "Sem campo de ano" escrito, batendo com a decisão do fundador no mesmo
dia. **A folha de cadastro rápido de caminhão continua sem desenho**, mas ela
nasce dentro do lançamento de frete (item 3), então não bloqueia esta rodada.

## Tarefa 7 — Motoristas: dados e telas

`Motorista` (`nome`, `telefone`, `documento`, `veiculo_habitual_id`), com as
mesmas regras de documento do Cliente, e as telas de lista, perfil e formulário
reusando as peças da tarefa 5. "Lançar frete com este motorista" fica para o
item 3.

---

## O que NÃO entra nesta rodada

`DistanciaRota` (item 12 — tabela sem quem escreva hoje), `Convite`, os demais
campos de Empresa do item 10, e a folha de cadastro rápido e a folha do campo
que falta — as duas nascem dentro do lançamento de frete, item 3.

## Verificação

1. `npm run lint` e `npm test` verdes — a suíte de isolamento cresce junto: cada
   tabela nova entra no teste de vazamento (leitura cruzada negada), no de
   schema (RLS ativado, forçado e com política) e no de privilégios.
2. `npm run seed:municipios` no banco de desenvolvimento: 5.570 linhas, e rodar
   de novo não duplica nada. Depois, arrancar duas linhas do arquivo e conferir
   que a seed **recusa** carregar em vez de gravar incompleto.
3. A esteira do GitHub passa com o passo novo da seed, no projeto de teste.
4. `npm run dev` e percorrer no modo celular: entrar → Mais → Clientes → + Novo
   → salvar → perfil → Editar → Arquivar → sumiu da lista. O mesmo em
   Motoristas. Nada fica embaixo da barra; alvo de toque das linhas passa de
   48px.
5. Duas contas em abas separadas, cada uma com seus clientes: nenhuma enxerga o
   cliente da outra em lista, busca ou acesso direto pela URL.
6. `/revisar` ao fim de cada tarefa, antes de pedir o commit.
