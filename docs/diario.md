# Diário de execução

Onde o trabalho parou e qual é o próximo passo. Atualizado ao fim de cada
sessão. Não é histórico — para isso existe o `git log`. É só o suficiente para
retomar sem reconstruir contexto.

---

## 10/08/2026 — tarefa 5: Clientes — lista, perfil e formulário

Fecha a tarefa 5 do item 2. Quatro telas novas (`/clientes`, `/clientes/novo`,
`/clientes/[id]`, `/clientes/[id]/editar`) e as quatro peças de interface que
nascem para serem reaproveitadas por Motoristas e Caminhões: `LinhaDeLista`,
`CampoBusca`, `PilulaCabecalho` (variante 06 do inventário, primeira vez em
uso) e `EstadoVazio`. A quinta peça do plano original, folha inferior, **não
nasce aqui** — decisão registrada na entrada anterior deste diário, antes de
começar a construir: as duas folhas que Clientes teria (Ordenar por, Período)
foram adiadas para os itens 3 e 4 por decisões separadas, e sobrou zero uso
real para ela.

O (+) da barra deixa de dar "página não encontrada" — `BarraDeNavegacao.tsx`
atualizado. "Mais" ganha a seção CADASTROS com a linha "Clientes", contando
quantos cadastrados (nunca "· R$ X em aberto": esse número depende de
`TituloReceber`, item 4, e §8 proíbe número incompleto).

**Perfil nasce só com identificação, dados cadastrais e Editar** — resumo
financeiro e histórico de fretes ficam para o item 4 (dependem de
`Servico`/`TituloReceber`), e por isso também não há "Gerar relatório" nem
"Cobrar no WhatsApp" ainda.

### As quatro decisões que voltaram para o fundador

**A — o município do cliente fica sempre vazio.** O plano original resolvia
`municipio_id` a partir do `endereco` digitado, reusando `resolverMunicipio`.
Não serve: essa função casa por nome **exato**, o mecanismo certo para
`origem_texto`/`destino_texto` do frete (só o nome da cidade), não para um
endereço completo — e testado na prática, "Rod. CE-440, km 12 — Sobral/CE"
nunca resolve. Revertido: `endereco` grava como texto, `municipio_id` fica
nulo. Motivo extra do fundador para não perseguir isso agora: nada no MVP lê
o município do cliente — a distância do frete vem de origem/destino do
frete, não do endereço do cliente. Registrado em `docs/especificacao.md`,
entidade Cliente: quando houver uso real, é campo próprio de cidade, não
extração de endereço livre.

**B — o campo "Observação" saiu do formulário.** Entrou só porque a coluna
existe no banco; nenhum desenho da tela — nem o protótipo de referência —
tem esse campo. Mesmo precedente do ano do caminhão e da categoria da CNH
(`docs/especificacao.md` §6, Veiculo/Motorista): coluna fica no banco como
peso morto até um desenho pedir por ela.

**C — campo vazio no perfil leva para o formulário de edição inteiro, não
para uma folha própria.** A "folha do campo que falta" que o inventário
prevê (`docs/componentes.md` 12) só nasce no item 3. Decisão provisória,
registrada em `docs/especificacao.md` §4.7 (não em comentário de código —
comentário some no próximo arquivo reescrito; decisão precisa sobreviver a
isso).

**D — as iniciais do cliente usam a regra de empresa, não a de pessoa.**
Cliente pode ser pessoa física, e o inventário reserva a regra de "pessoa" a
`Usuario`. Decisão do fundador, com motivo próprio, não cópia do protótipo
(que também usa a regra de empresa, mas protótipo é evidência, nunca
motivo): cliente de transportadora é quase sempre pessoa jurídica, e a regra
de empresa funciona bem também para pessoa física. Registrado em
`src/lib/utils/iniciais.ts` para não parecer descuido depois.

### O `/auditar-tela` e o `/revisar`, e o que os dois acharam

Oito divergências, nenhuma lacuna que não tenha virado uma das quatro
decisões acima. Todas corrigidas nesta mesma tarefa, sem segundo passe — é a
mesma classe em todos os casos (bug ou desalinhamento com o documento, nada
de arquitetura nova):

- **Bug real de dois toques, achado pelo `/revisar`, não pela suíte.**
  `Botao.tsx` espalhava `{...nativos}` **depois** do `disabled={props.disabled
  || carregando}` explícito, e `nativos` nunca descartava `disabled` — com as
  duas props passadas juntas (só `FormularioCliente.tsx` faz isso hoje;
  conferido que nenhuma das outras seis chamadas de `Botao`/`PilulaEmLinha`
  no projeto combina as duas), o `disabled` antigo vencia o `carregando`
  calculado, e o botão aceitava um segundo toque durante o envio. Corrigido
  nos dois componentes (`Botao.tsx`, `PilulaEmLinha.tsx`) — o segundo já
  nasceu com o mesmo furo nesta tarefa, copiado do primeiro.
- "Arquivar cliente" chamava o servidor sem travar o segundo toque. Corrigido
  com o mesmo padrão de `BotaoSairDaConta.tsx` (`useFormStatus`, sem
  spinner): `BotaoArquivarCliente.tsx`, componente novo.
- Campo "Prazo de pagamento" remontado à mão em vez de reusar `CampoTexto`.
  Corrigido.
- Círculo de iniciais do cliente com fundo claro/texto verde (cópia do
  protótipo) em vez de fundo `#1B6B3A`/texto branco, que é o que
  `docs/componentes.md` manda para toda linha de lista — o documento vence o
  protótipo. Corrigido.
- Subtítulo da linha "Clientes" em Mais com tamanho de letra fora de
  qualquer tabela (mistura de dois papéis documentados). Trocado pelo token
  "Total contextual". Corrigido.
- "+ Novo" do cabeçalho e "Cadastrar cliente" do estado vazio faziam a
  mesma coisa, visíveis ao mesmo tempo, quando a lista está totalmente
  vazia. Corrigido escondendo o "+ Novo" nesse estado — mesma condição do
  protótipo de referência.
- Ordem dos campos do formulário (Nome, Documento, Telefone…) contra
  `docs/navegacao.md`, que já registrava por escrito: "Telefone... entra no
  cadastro, segundo campo, antes até do documento". Corrigido.
- Três títulos de tela sem o `wdth 96%` que `docs/estilo.md` exige para
  esse papel (já em uso em cinco telas fora de sessão) — achado no
  `/auditar-tela`, corrigido junto por ser a mesma classe de divergência.

### O que ficou provado rodando

- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (91
  testes, 7 arquivos, inalterados — tarefa 5 não mexeu em isolamento) verdes,
  antes e depois das correções do `/revisar`;
- fluxo completo no navegador: Mais → Clientes (vazio, só "Cadastrar
  cliente") → + Novo → salvar (volta para a lista, "+ Novo" reaparece) →
  abrir perfil → Editar → documento inválido barra o salvar com erro sob o
  campo → corrigido, prazo próprio salvo → volta para o perfil com "Acordo
  próprio deste cliente." → Arquivar → volta para a lista vazia → Mais
  mostra "Nenhum cadastrado ainda";
- o clique simulado da ferramenta de navegador voltou a travar nesta sessão
  (mesmo sintoma da tarefa 4, não relacionado ao código) — testado com
  `form.requestSubmit()` via JavaScript em vez de clique, mesmo caminho que
  o navegador percorre num toque de verdade.

**Próxima: tarefa 6 — Caminhões: completo (tabela, lista, perfil e
formulário).**

---

## 10/08/2026 — decisão de escopo da tarefa 5: a folha inferior sai da rodada

`docs/planos/item-2-cadastros.md` lista "folha inferior" entre as peças de
interface que nasceriam na tarefa 5, junto com linha de lista, campo de busca,
pílula de cabeçalho e estado vazio. Revendo as três telas de Clientes linha por
linha antes de começar a construir, nenhuma delas usa folha inferior hoje — e
a razão não é descuido desta tarefa, é consequência de **duas decisões
anteriores, tomadas em outro contexto**, que esvaziaram os dois usos que ela
teria:

- a lista teria uma folha "Ordenar por", mas o chip que a abriria foi adiado
  para o item 3 (revisão da tarefa 3, 09/08/2026: seletor com uma opção só —
  só "mais recente" tem fonte hoje — é controle que não faz nada);
- o perfil teria uma folha "Período", mas o resumo financeiro que ela filtra
  foi adiado para o item 4 (depende de `Servico`/`TituloReceber`, que não
  existem ainda).

Sem os dois, sobra zero uso real — e o `CLAUDE.md` §6 é direto: "sem
abstração especulativa, sem camada sem dois casos de uso reais". Construir o
componente agora seria exatamente essa camada. **Decisão do fundador,
10/08/2026: a folha inferior não nasce na tarefa 5.** Nasce no item 3, com a
folha de busca e o cadastro rápido — os primeiros usos reais dela.

**As outras quatro peças continuam.** Linha de lista, campo de busca, pílula
de cabeçalho e estado vazio têm uso real dentro da própria tarefa 5 (lista e
perfil de Clientes) e são reaproveitadas depois por Motoristas e Caminhões —
o corte de uma peça não é dúvida sobre as outras três.

---

## 10/08/2026 — tarefa 4: a casca do app — barra de navegação e "Mais"

Fecha a tarefa 4 do item 2. `src/app/(app)/layout.tsx` passa a checar a
sessão uma vez, para todo o grupo `(app)` — as telas filhas (`page.tsx`,
`mais/page.tsx`) não repetem o `try/catch` de antes, só chamam
`exigirSessao()` direto: se ela falhar depois do layout já ter passado, é bug,
não o caminho esperado de "sem sessão". `BarraDeNavegacao.tsx` é a pílula
flutuante de cinco posições (`docs/componentes.md` §10), e a tela "Mais"
nasce só com o nome da empresa e "Sair da conta" — que saiu da tela Início,
onde vivia provisoriamente desde a tarefa 7 do item 1.

### As duas decisões do fundador que abriram a tarefa

**1. Fretes e Cobranças ficam ativos na barra, apontando para uma tela curta
e provisória**, em vez de esperar os itens 4 e 6 (que constroem essas telas
de verdade) ou aparecer desabilitados. Razão do fundador: a barra é estrutura
fixa de cinco posições — ao contrário de uma lista, tirar um item muda a
geometria (a folga de rolagem de toda tela é medida a partir do topo do
(+)) —, e um item desabilitado exigiria um tratamento visual que
`docs/estilo.md` não define. As telas dizem o que falta, não "em breve":
"Seus fretes aparecem aqui a partir do lançamento de frete" (item 4) e "Suas
cobranças aparecem aqui a partir do faturamento" (item 6).

**2. O (+) abre o cadastro de cliente (`/clientes/novo`) e dá "página não
encontrada" até a tarefa 5** — a próxima — **criar essa rota. Comportamento
esperado e temporário, não defeito.** Fica registrado aqui porque o fundador
pediu, para não ler o link quebrado como regressão ao testar. E mesmo depois
da tarefa 5, o (+) continua provisório: `docs/planos/item-2-cadastros.md`
(tarefa 4) manda ele passar a abrir Lançar frete só no item 3, e até lá
`docs/navegacao.md` linha 88 ("o (+) abre Lançar frete de qualquer lugar")
não é o que o botão faz. As duas janelas (até a tarefa 5, até o item 3) estão
marcadas no comentário do código, com a razão de cada uma — provisório sem
prazo escrito vira permanente.

### O `/revisar`, e o que ele achou

Nove divergências, seis lacunas. Todas de precisão de medida ou de
referência, nenhuma de arquitetura — corrigidas nesta mesma tarefa, sem
terceiro passe:

- `--margem-lateral` era um token só, calculado do inset **esquerdo**, usado
  para os dois lados da barra — em aparelho com entalhe assimétrico (girado,
  por exemplo), o lado direito receberia o valor errado. Virou dois tokens,
  `--margem-lateral-esquerda` e `--margem-lateral-direita`, cada um com o seu
  `env()`, batendo com `docs/estilo.md` § "Barra de navegação — âncora
  responsiva". Nada mais consumia o token antigo, então a troca foi segura.
- O ícone de "Início" caía no padrão de `20px` de largura por não passar
  `largura` — o documentado é `19×19px`. Corrigido.
- Cada item da barra tinha ~45,5px de alvo de toque (o `<nav>` usava
  `items-end`, então cada `<Link>` só ocupava a altura do próprio conteúdo,
  não os 57px da pílula) — abaixo do mínimo de 48px do `CLAUDE.md` §8. Tirado
  o `items-end`: os links agora esticam para os 57px inteiros, mantendo
  ícone e rótulo encostados embaixo pelo `justify-end` interno.
- O comentário do (+) só citava o prazo da tarefa 5, não o do item 3 — ver
  decisão 2 acima.
- Título de estado vazio (`text-titulo-vazio`) sem o rastreio `-.01em` que
  `docs/estilo.md` define para esse papel — adicionado.
- Tinta do texto de apoio das telas provisórias trocada de
  `tinta-apoio-forte` (reservada a corpo **fora de sessão**, por comentário
  explícito em `globals.css`) para `tinta-apoio`, o padrão de "Corpo de
  apoio" em `docs/estilo.md`.
- Dois comentários citavam "`docs/componentes.md` linha 388" para a linha de
  Mais — ficou 392 depois que esta própria tarefa acrescentou linhas à
  tabela de ícones. Corrigido para o número atual.
- Uma frase nova em `componentes.md` dizia que os ícones foram exportados
  para `icons/`; o caminho real é `docs/icones/`. Só a frase que esta tarefa
  escreveu foi corrigida — o resto do documento já usava esse atalho antes,
  e não é desta tarefa arrumar.
- `.claude/launch.json`, criado pela ferramenta de preview ao abrir o
  navegador para testar, não entra neste commit — é configuração de
  ferramenta, não parte da tarefa.

**Lacuna resolvida em 10/08/2026, pelo fundador.** As duas telas provisórias
ficam como estão: sem ação, só título e texto de apoio dizendo o que falta
para a ação existir. O `CLAUDE.md` §8 foi reescrito neste mesmo commit
(`3b7561f`) para cobrir o caso — "Estado vazio oferece a ação que destrava a
tela. Quando a ação ainda não existe, o convite é dizer o que falta para ela
existir — nunca um botão que não leva a lugar nenhum, e nunca ilustração
decorativa." Não é mais uma pendência.

### O que ficou provado rodando

- os cinco destinos da barra renderizam e destacam o item ativo certo
  (testado por navegação direta de URL — o clique simulado da ferramenta de
  navegador travou de forma geral nesta sessão, inclusive em botões sem
  relação com esta tarefa, então não é sinal de defeito no código);
- `/clientes/novo` dá 404, como esperado;
- "Sair da conta" funciona a partir de Mais;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (91
  testes, 7 arquivos, inalterados) verdes.

**Próxima: tarefa 5 — Clientes: lista, perfil e formulário.**

---

## 09/08/2026 — tarefa 3: Cliente, o documento validado e a ordenação adiada

Fecha a tarefa 3 do item 2. A tabela `cliente` existe: nome, documento
(CPF/CNPJ), telefone, email, endereço, município, prazo de pagamento (nulo =
herda de `Empresa.prazo_padrao_dias`, que também nasce aqui, valendo 15) e
observação. `src/lib/servicos/clientes.ts` tem listar, buscar, criar, editar
e arquivar, tudo por `db(empresaId)`.

**Documento validado de verdade, não só formatado.** `src/lib/utils/documento.ts`
usa `cpf-cnpj-validator` (2.1.2), que calcula o dígito verificador tanto do CPF
quanto do CNPJ **alfanumérico** (Nota Técnica RFB 49/2024) — o mesmo formato
que `empresa_cnpj_formato` já cobria só por regex, sem conferir o dígito.
Documento com dígito errado **recusa o salvar** (decisão do fundador, ver
abaixo); campo vazio continua funcionando, porque só `nome` é obrigatório.

**Único por empresa, só entre os não arquivados.** A trava
`UNIQUE (empresa_id, documento) WHERE arquivado_em IS NULL` é índice parcial —
o Prisma não modela isso, então existe só na migration
(`20260809060000_cliente_e_prazo_padrao`), com o mesmo comentário de aviso que
já existe para RLS no topo do `schema.prisma`. Arquivar libera o documento
para recadastro, ao contrário do CNPJ da Empresa (que é trava anti-abuso e
continua presa).

**Migration aplicada por fora do `prisma migrate dev`.** O comando recusou
criar o scaffold: o banco de desenvolvimento tinha um checksum divergente para
`20260809021500_municipio_tabela_de_referencia` (arquivo editado depois de
aplicado, antes desta sessão — não é coisa desta tarefa) e `migrate dev` só
resolve isso com `migrate reset`, que apagaria os 5.570 municípios e todo dado
de desenvolvimento. Em vez de rodar `reset`, o SQL desta migration foi escrito
à mão seguindo o padrão das anteriores, aplicado direto pela conexão das
migrations, e registrado em `_prisma_migrations` com o checksum sha256 do
arquivo — o mesmo que o Prisma teria calculado. `prisma migrate status`
confirma "up to date" depois disso. **A esteira (CI) aplica normal**, porque o
banco de teste nunca viu esta migration antes.

**Pendência que sobra, não desta tarefa:** o checksum divergente de
`20260809021500_municipio_tabela_de_referencia` continua lá — qualquer
`prisma migrate dev --create-only` futuro na minha máquina vai recusar do
mesmo jeito, e o instinto de "resolver" com `migrate reset` apagaria a seed de
município. Fica registrado para não ser surpresa na próxima tarefa; conserto
correto ainda não decidido.

### O `/revisar`, e as duas decisões que voltaram para o fundador

Uma divergência e três lacunas. A divergência: `listarClientes` só ordena por
"mais recente", e o comentário do código emprestava a razão de adiamento do
resumo do perfil (que espera `Servico`/`TituloReceber`, tarefa 5) para as
**ordenações**, que o plano nunca isentou — `docs/planos/item-2-cadastros.md`
pedia as três, e `docs/componentes.md` já usa "maior valor em aberto" como
exemplo do chip. Levado ao fundador porque as outras duas ordenações
literalmente não têm como ser calculadas sem `Servico`/`TituloReceber` (item
3).

**Decidido:** a tarefa 3 fecha só com "mais recente" — as outras duas ficam
pendentes do item 3. E mais: **o chip de ordenação nem nasce na tarefa 5**,
porque seletor com uma alternativa só não faz nada. Registrado em
`docs/planos/item-2-cadastros.md`, tarefa 5, para quem construir a tela não
reabrir a pergunta.

**Documento com dígito verificador errado: bloqueia o salvar.** A ressalva de
"atrapalhar o cadastro de 30 segundos" não se aplica — o documento é opcional,
quem está com pressa não digita nada; o bloqueio só atinge quem digitou um
número e digitou errado, e documento errado pararia no relatório que o
cliente da transportadora recebe. A forma já está decidida por
`docs/estilo.md`/`componentes.md` (campo de texto): o erro aparece **abaixo do
campo**, nunca como mensagem geral no fim do formulário — isso é trabalho da
tarefa 5, esta tarefa só lança o `Error` com a mensagem.

As outras duas lacunas — schema de entrada para os campos que hoje só passam
por `trim()`, e as três mensagens de erro fora de `docs/componentes.md` —
aceitas como está: apontam para a tarefa 5, que é quem constrói a Server
Action e a tela de verdade (mesmo padrão de `cadastro.ts`: o schema `zod` vive
na Action, não no serviço).

### O que ficou provado rodando

- só `nome` é obrigatório; documento e prazo ficam nulos, nunca `''`;
- CPF e CNPJ alfanumérico válidos são aceitos e normalizados (maiúsculo, sem
  pontuação); dígito verificador errado recusa, nos dois formatos;
- documento único por empresa entre os não arquivados; duas empresas podem
  repetir o mesmo documento; arquivar libera para recadastro;
- listar devolve só os não arquivados, mais recente primeiro; buscar e editar
  funcionam; empresa A não busca nem lista cliente da empresa B;
- a extensão de `tests/isolamento/vazamento.test.ts` prova que o Cliente da
  empresa B é invisível pela mesma política de isolamento do resto do
  domínio;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (91 testes,
  7 arquivos) verdes.

**Sem terceiro passe.** As quatro lacunas/divergência viraram decisão do
fundador ou apontamento para a tarefa 5, não código novo nesta tarefa — não há
classe nova de achado para justificar rodar de novo.

**Próxima: tarefa 4 — A casca do app: barra de navegação e tela "Mais".**

---

## 09/08/2026 — tarefa 2: tipo de operação, e o furo do primeiro cliente fechado

Fecha a tarefa 2 do item 2. Toda empresa nova passa a nascer com os quatro
`TipoOperacao` (Frete ativo; Reboque, Guincho e Mudança inativos), criados na
**mesma transação** que cria a `Empresa` — o furo que o fundador descreveu ao
abrir a tarefa: sem isso, o primeiro cliente que assinar abriria o lançamento
de frete com o campo de tipo de operação vazio.

`src/lib/servicos/tipos-de-operacao.ts` guarda os quatro e a função que os
cria, recebendo o `tx` da mesma transação — não abre uma segunda. `cadastro.ts`
chama essa função logo depois de `tx.empresa.create`, dentro do `emTransacao`
que já existia. A migration preenche as empresas que já existiam antes da
tabela nascer, com `INSERT ... SELECT ... ON CONFLICT DO NOTHING`, como o plano
previa.

### O defeito achado ao escrever o teste, não em revisão

A chave estrangeira de `tipo_operacao` para `empresa` nasceu `ON DELETE
RESTRICT`, seguindo o padrão do resto do domínio. **Isso quebra a reversão de
cadastro incompleto.** `reverter_cadastro_incompleto` apaga a `Empresa` órfã
quando o passo 2 do cadastro (criar o `Usuario`) falha depois do passo 1 já ter
sido gravado — e agora toda `Empresa`, órfã ou não, nasce com quatro
`TipoOperacao` apontando para ela. Com `RESTRICT`, esse `DELETE` seria recusado
pelas próprias linhas que a tarefa acabou de criar, e a reversão — que existe
exatamente para o caso em que algo falha no meio — falharia ela mesma.

Não apareceu em leitura de código: apareceu ao estender `tests/cadastro.test.ts`
para que `criarEmpresa` (o helper que espelha o mecanismo real) também criasse
os quatro tipos, e o teste de reversão passou a semear o cenário de verdade.
Rodar a chamada real (`reverterCadastroIncompleto`) contra dados reais é o que
teria travado com um erro de chave estrangeira — a mesma lição do §3: teste que
mede o resultado, não só declara o mecanismo, é o que pega isto.

**Corrigido para `ON DELETE CASCADE`.** É seguro porque a guarda `NOT EXISTS
(... usuario ...)` dentro da função continua inteira — ela decide **se** a
Empresa pode ser apagada; o `CASCADE` só muda o que acontece com quem depende
dela depois que essa decisão já foi tomada.

> Esta seção descrevia aqui uma concessão nova a `fretigate_reversor`
> (`SELECT`/`DELETE` em `tipo_operacao`), com o motivo "o `CASCADE` é um
> `DELETE` de verdade, sujeito a privilégio". **Era suposição, não medição, e o
> `/revisar` pegou.** A história certa está na seção seguinte: medido, o
> `CASCADE` não precisa de concessão nenhuma, e a linha foi removida da
> migration antes do commit. Corrigido aqui em vez de apagado, porque apagar
> faria parecer que o erro nunca existiu — e o diário registra onde o trabalho
> parou, erro incluído.

A correção foi provada, não só declarada: `tests/cadastro.test.ts` confirma
**antes** da reversão que os quatro `TipoOperacao` da empresa órfã existem, e
**depois** que sumiram junto — e que os da outra empresa (a que tem dono de
verdade) continuam intactos, prova de que o `CASCADE` atingiu só quem devia.

### O `/revisar`, e o `GRANT` que eu tinha dado sem precisar

Rodado antes do commit, como manda o §2. Três divergências e duas lacunas —
todas do mesmo fio: eu tinha concedido `SELECT, DELETE` em `tipo_operacao` ao
papel `fretigate_reversor`, junto com a correção do `CASCADE`, achando que o
`CASCADE` precisava disso para funcionar. O revisor duvidou, com uma frase
exata: *"precisa ser medido, não deduzido"*.

**Medi, e ele estava certo.** Escrevi um teste que revoga o privilégio de
`fretigate_reversor` em `tipo_operacao`, semeia uma empresa órfã de verdade com
os quatro tipos, e chama `reverterCadastroIncompleto` sem nenhum grant novo.
**Passou.** A ação referencial do Postgres (`ON DELETE CASCADE`) roda por fora
do privilégio e da política de RLS do papel que disparou o `DELETE` na tabela
pai — não é "mais um `DELETE` comum" sujeito às mesmas regras, e por isso não
precisa de concessão nenhuma. Removido o `GRANT`; `fretigate_reversor` continua
com o alcance mínimo já documentado no `CLAUDE.md` §9 (`empresa` e `usuario`,
nada mais) — **sem precisar mudar aquela tabela**, porque a correção certa foi
não ter ampliado o papel, não atualizar a lista depois de ampliar.

Isso também resolveu, de graça, a segunda divergência: o comentário da migration
de 07/08 que diz "este papel não enxerga nenhuma outra tabela do produto"
continua verdadeiro, porque o `GRANT` que o desmentiria nunca ficou.

**A terceira divergência exigiu decisão de verdade, não só medição.** O
`CASCADE` apaga fisicamente linhas de `tipo_operacao` — uma tabela de domínio,
com `arquivado_em` — e o `CLAUDE.md` §7 fecha a exceção de "nada é apagado"
dizendo que nenhuma outra tabela a ganha "sem passar pela mesma pergunta:
alguém chegou a ver isto?". A exceção original cobria só `Empresa`. Respondida
a pergunta para `TipoOperacao`: os quatro nascem **na mesma transação** que a
`Empresa`, então uma empresa que nunca existiu de verdade também nunca teve
tipo visto por ninguém — não existe "Frete" que alguém tenha visto para uma
empresa que ninguém viu. A exceção do §7 foi **estendida**, com essa resposta
escrita, não só o `CASCADE` deixado quieto no schema.

**A lacuna do `id` do backfill foi documentada, não corrigida** — o Postgres
deste projeto (17.6) não tem gerador de uuid v7 nativo nem por extensão
(conferido: só `uuid-ossp` e `pgcrypto`, até v4/v5), e escrever um gerador de
v7 em SQL para 4 linhas por empresa, uma vez, seria mais código que o problema
pede. Sem custo real: nada lê `id` de `TipoOperacao` esperando ordem
cronológica — quem faz isso é `ordem` (exibição) e `criado_em` (tempo), os dois
certos.

### O que ficou provado rodando

- os quatro nascem certos — nome, slug, `ativo` e `ordem` — e só "Frete" ativo;
- a reversão de cadastro incompleto continua funcionando com `TipoOperacao` no
  meio, e some junto quando a empresa órfã é apagada — **sem nenhum privilégio
  novo** para o papel que reverte, medido com o grant revogado de propósito;
- empresa A não enxerga o `TipoOperacao` da empresa B, mesma política de
  isolamento do resto do domínio;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (74 testes,
  6 arquivos) verdes, em execução limpa — duas rodadas no meio do caminho
  falharam por conexão esgotada, causada pelos próprios scripts manuais desta
  sessão de investigação, não pelo código; confirmado ao repetir limpo.

**Sem terceiro passe.** Os cinco achados são a mesma classe já vista na tarefa
1 — afirmação de mecanismo de segurança sem medir, e regra escrita imprecisa
demais para o caso real. O critério do §2 é a classe, não a quantidade: corrige
e commita.

**Próxima: tarefa 3 — Cliente: dados, documento e o prazo herdado.**

---

## 09/08/2026 — tarefa 1: os 5.570 municípios, a porta única e a seed que atualiza

Fecha a tarefa 1 do item 2. A tabela `municipio` existe, está carregada com os
**5.570 municípios**, e `resolverMunicipio` é a porta única por onde texto vira
município — é nela que a medição dos 10% do item 3 vai se apoiar.

### A fonte dos dados: duas, oficiais, cruzadas

O plano aprovado não dizia de onde viriam os dados com coordenada. Resolvido
com **duas fontes do IBGE**, cada uma no que ela é autoridade:

| Fonte | Decide | Por quê |
|---|---|---|
| Localidades do Brasil 2022 (arquivo geográfico) | **coordenada da sede** | a sede é a praça central, para onde o caminhão vai; o centro geométrico de um município grande cai no mato |
| API de Localidades do IBGE | **nome e UF** | o arquivo geográfico é fotografia de 2022 e envelhece no nome |

O cruzamento achou **uma** divergência: `5203500` era "Bom Jesus" no arquivo
geográfico e é **"Bom Jesus de Goiás"** na API. A API venceu. Nome errado é
município que o usuário digita e não encontra.

**Fernando de Noronha (2605459) fica de fora**, declarado como exceção
**nomeada** no gerador: o IBGE o classifica como distrito estadual, não
município — é por isso que a conta oficial é 5.570 e a API devolve 5.571. É
ilha, sem estrada. Qualquer *outro* código sem sede **interrompe a geração**:
exceção que vale para um código conhecido é decisão; exceção que vale para "o
que não bater" é buraco.

Tudo em `prisma/seed/PROCEDENCIA.md`, com endereço, data, licença e método.

### Três desvios do plano aprovado, autorizados pelo fundador

1. **`importFileExtension = "ts"`** no gerador do Prisma. A seed roda no Node
   puro, fora do empacotador, e sem isso o Node não carrega o cliente gerado.
   A alternativa era instalar mais uma ferramenta; esta linha faz o mesmo com
   **zero dependência nova**. Conferido: lint, tipos, build e a suíte passam.
2. **`prisma/seed/gerar-municipios.mjs` é comitado.** O plano previa só o
   arquivo de dados e a procedência. Procedência que afirma um cruzamento que
   ninguém consegue refazer é promessa, não procedência.
3. **A conferência da ordem virou parte da migration** (ver abaixo).

### As duas correções pedidas pelo fundador, e o que elas mudaram

**A seed ATUALIZA, não pula.** `createMany({ skipDuplicates: true })` sozinho
nunca propaga correção do IBGE — e a divergência do "Bom Jesus" já provava que
correção existe. A seed agora lê o que está no banco, compara, insere os novos,
**atualiza só as linhas que mudaram de verdade** e relata cada uma. Custo
medido: uma consulta a mais, ~1s.

Três guardas, e as três estão testadas na máquina, não supostas:

- **teto de 100 alterações.** Acima dele a seed **não grava nada**, lista o que
  mudaria e exige `-- --forcar`. A conferência de formato recusa arquivo
  *malformado*, mas não recusa arquivo *válido e errado* — e o sintoma desse é
  sempre muitas linhas mudando de uma vez. Inserção não entra no teto: a
  primeira carga são 5.570, e inserir nunca apaga nada.
- **`arquivado_em` nunca é tocado.** Recarregar a fonte não ressuscita município
  que alguém arquivou.
- **município que sumiu da fonte é relatado, nunca apagado** (§7).

**A ordem da chave estrangeira.** A ligação `empresa.municipio_id` nasce na
migration, mas a tabela só recebe as 5.570 linhas quando a seed roda — ou seja,
a ligação é criada contra uma tabela **vazia**. Conferido no banco de
desenvolvimento: **0 empresas, 0 com `municipio_id`**. O projeto de teste não é
alcançável desta máquina (credencial só existe como secret do GitHub), então a
saída não foi "conferi, confia": **a migration confere sozinha**, com mensagem
que diz o que fazer, onde quer que ela rode — desenvolvimento, esteira e
produção quando existir.

### Um defeito encontrado no próprio código desta tarefa

`prisma.$transaction([...])` com muitas atualizações **estourou o tempo limite
padrão do Prisma** (5 s) contra o Supabase: 150 atualizações levaram 5,1 s e a
transação expirou no meio. Apareceu porque o teto foi testado de verdade, com
150 linhas estragadas de propósito — não apareceria em revisão de código. A
correção mantém a atomicidade (metade atualizada é pior que nenhuma) e passa a
declarar o tempo limite em função da quantidade.

### O que foi provado rodando, não lido

- carga: 5.570 no banco, 27 UFs, nenhuma coordenada nula, zerada ou fora do Brasil;
- rodar a seed de novo: **0 novos, 0 alterados**;
- duas linhas estragadas: corrigidas e **relatadas uma a uma**;
- 150 estragadas: **recusa, nada gravado, código de saída 1**; com `--forcar`, corrige;
- duas linhas arrancadas do arquivo: **recusa**, com a contagem declarada contra a trazida;
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm test` (71 testes) verdes.

### Decisões menores que ficam registradas

- **`Municipio` sem `empresa_id` entrou na lista de exceções** de
  `tests/isolamento/schema.test.ts`, com o motivo. A lista é conferida por
  igualdade exata.
- **A política é `USING (true) WITH CHECK (false)`** — as duas cláusulas do §9,
  sem exceção. O teste confere no **catálogo** (`pg_policies`), não no arquivo
  da migration: é o catálogo que recusa.
- **`latitude`/`longitude` são `Float`.** Não contradiz o §7, que proíbe
  dinheiro em decimal flutuante — coordenada nunca é somada nem comparada por
  igualdade contábil.
- **`normalizarParaBusca` usa `\p{Mn}`**, a categoria do Unicode, e não um
  intervalo de códigos escrito à mão: o outro jeito obrigaria a colar
  caracteres invisíveis dentro do código.
- **A seed não tem trava de banco**, ao contrário da suíte de testes — e é de
  propósito: ela **precisa** rodar em produção. O que a torna segura em
  qualquer banco é nunca apagar e nunca sobrescrever em massa sem autorização.
  Tudo isso está em `docs/especificacao.md` §6, não só aqui.

### O que o `/revisar` achou, e o que mudou por causa dele

Duas divergências e seis lacunas. Todas aceitas, uma com correção diferente da
proposta. As que merecem registro:

- **Citei o `CLAUDE.md` §5 para uma regra que não está lá.** O comentário da
  seed e o da esteira diziam "nunca roda em `postinstall` (`CLAUDE.md` §5)" —
  e `postinstall` não aparece no §5 nem em canto nenhum do `CLAUDE.md`. A regra
  mora em `docs/especificacao.md` §6. É a classe que o §13 nomeia: afirmação
  que engana justamente por parecer verificada.
- **O teto de 100 e o `--forcar` só existiam no diário.** O revisor apontou que
  **o diário não põe regra em vigor** — ele registra onde o trabalho parou. O
  comportamento inteiro da seed (atualiza em vez de pular, teto, `arquivado_em`
  intocado, sumiço relatado e não apagado) foi para `docs/especificacao.md` §6.
- **Dois números que eu tinha escolhido sozinho viraram decisão do fundador:**
  o mínimo de letras da busca e a quantidade de sugestões.
- **O revisor duvidou de uma frase correta do §9**, e a resposta foi corrigir a
  frase. Ver abaixo.

### As decisões que o fundador tomou em cima dos achados

- **Duas letras para começar a buscar**, com o motivo registrado: na maioria
  das vezes ninguém digita ali, porque os destinos já usados com aquele cliente
  aparecem como chips. Quem digita é o caso do destino novo — e com três letras
  existe um instante de "não aparece nada" que confunde justamente quem já saiu
  do caminho rápido.
- **Cinco sugestões, não oito.** Com o teclado aberto cabem umas cinco linhas
  acima dele; oito rola ou empurra conteúdo, e **lista que precisa rolar
  enquanto a pessoa digita é pior que digitar mais uma letra**. Construído com
  cinco; **fica pedido ao Design formalizar** em `docs/componentes.md`.
- **Nunca chutar município ambíguo, confirmado** — e com uma observação que
  faltava: a ambiguidade **se resolve sozinha no fluxo normal**, porque a lista
  de sugestões mostra a UF. Quem digita "Bom Jesus" escolhe entre "Bom
  Jesus/GO" e "Bom Jesus/PI". O não resolvido só sobra quando ninguém escolhe.
- **A medição do item 3 passa a separar dois motivos**, e isso mudou código:
  `resolverMunicipio` não devolve mais "o município ou nada", devolve
  **`resolvido`, `ambiguo` ou `nao_encontrado`**. "12% não resolvido" sozinho
  não diz o que consertar, e os dois casos pedem correções opostas — ambíguo é
  conserto de **tela** (a sugestão não chamou atenção); não encontrado é
  conserto de **dado ou da normalização**. Registrado em
  `docs/especificacao.md` §9.
- **O §9 do `CLAUDE.md` dizia que `postgres` "não roda no produto"**, o que é
  verdade no sentido pretendido e falso ao pé da letra — as migrations sempre
  rodaram com ele contra produção, e agora a seed também. Passou a dizer **"não
  atende pedido de usuário"**.

  E o princípio ficou registrado no §2, porque vale para além deste caso:
  **confusão de quem lê é evidência sobre o texto, não sobre o leitor.** Se
  quem leu só o documento ficou em dúvida, a frase está imprecisa mesmo estando
  correta — explicação não fica no documento, e a próxima pessoa tropeça no
  mesmo lugar.

### O segundo passe do `/revisar`, e a regra que ele corrigiu

O fundador pediu um passe extra, e o critério dele **refinou o §2**: o primeiro
passe tinha achado só lacunas do tipo "valor sem documento", mas
`resolverMunicipio` **mudou de contrato** por decisão dele — forma nova de
código, não correção da mesma classe. Vale um par de olhos que não viu essa
forma. Achou.

**Eu tinha escrito, em três lugares, uma afirmação falsa sobre uma proteção.** A
migration, a especificação §6 e o comentário do schema diziam que a proibição de
escrever em `municipio` ficava em "dois lugares" — a ausência do `GRANT` **e** a
política —, e que "qualquer escrita que chegasse aqui seria recusada pela
política". Conferido no banco: `postgres` tem `rolbypassrls = true`, é dono da
tabela, e `FORCE` não muda isso. **A seed só grava porque passa por cima da
política**, não porque ela permita. A frase era verdadeira para a aplicação e
falsa justamente para o único papel que escreve ali.

**A saída não foi um papel novo, e o fundador explicou por quê.** A recomendação
era criar um `fretigate_semeador` sem esse poder, por analogia com o
`fretigate_reversor`. **O precedente não se aplica:** o reversor roda **no
caminho de execução**, durante o pedido do usuário; a seed é **comando de
operação**, mesma classe da migration — e migration roda como `postgres` e
sempre vai rodar. A regra não estava sendo contornada; **ela nunca falou desse
caso**.

Então a solução precisa foi escrever a regra certa, aplicando o padrão que já
estava no §2:

> **Nenhuma conexão que atende pedido de usuário ignora RLS.** Comando de
> operação — migration e seed — roda como `postgres`, e é assim por desenho.

O que separa os dois casos é **quem chama**, e isso ficou escrito junto: o
reversor é disparado pelo usuário; migration e seed, por quem opera.

**A lacuna do alcance da seed fechou por regra, não por papel.** Nada impedia a
próxima seed de tocar tabela com dado de cliente. Um papel restrito fecharia só
para a seed e **moveria o problema**, porque as migrations continuam podendo
tudo. A regra entrou no §3: **seed só toca tabela de referência global**, e a
lista dessas tabelas **não é reescrita** — é a das exceções de
`tests/isolamento/schema.test.ts`, que já existe e é executada. Duas listas
divergem, e a que envelhece é sempre a que ninguém roda.

**As outras três**, todas aceitas: os dois números da busca saíram do diário
para a especificação §6 (mesma correção que o teto de 100 recebeu no primeiro
passe — o diário registra onde o trabalho parou, não põe regra em vigor); o
comentário do contraste no teste passou a dizer que ali `postgres` é **controle
do experimento**, não jeito certo de gravar; e ficou **decidido** que só entra
na conta dos 10% o frete que **tem texto** de origem ou destino — frete sem
destino nunca teve o que resolver, e contá-lo faria o indicador subir sozinho.

### Pendências novas

- **Produção precisa da seed rodada à mão** antes do primeiro uso, senão o
  campo de município nasce vazio para o cliente pagante e origem/destino de
  todo frete ficam como texto livre. Registrada no `CLAUDE.md` §14, com o que
  rodar, quando e o que acontece se esquecer.
- **Ao Design: formalizar as cinco sugestões** de município em
  `docs/componentes.md`. É valor de tela, e o dono daquele documento é o Design
  (§13). Não bloqueia — o número já está decidido.

**Próxima: tarefa 2 — Tipo de operação, e toda empresa nascendo com "Frete".**

---

## 09/08/2026 — item 2 começa: escopo do MVP corrigido, e o formulário de caminhão não existe

Plano do item 2 aprovado e commitado em **`docs/planos/item-2-cadastros.md`** —
é o primeiro plano a seguir a regra nova do `CLAUDE.md` §2, que nasceu neste
mesmo dia e pelo pior motivo: a **primeira versão do plano se perdeu inteira**
ao fechar a aba, porque só existia na conversa. Mesma classe de problema que
este diário existe para resolver.

### O escopo do MVP, corrigido pelo fundador

**São 10 itens a construir** (o item 1 já fechou): 2, 3, 4, 5, 6, 7, 8, 10, 11
e 13. **Despesas (item 11) entra** — é o item mais barato da ordem de
construção, e sem ele o card de Lucro nunca sai do estado de convite, deixando
a dashboard com dois dos quatro cards vazios.

**Item 9 é parcialmente MVP**, e isso ficou escrito para ninguém tratar o item
inteiro como adiado: **Enviar ordem no WhatsApp** e **Cobrar no WhatsApp**
entram, com texto padrão fixo; só a tela de editar os dois modelos sai. Os dois
textos passam pelo fundador antes de virar código, e moram num arquivo só, já
com as variáveis no formato final.

**Ficam para depois do lançamento:** 12, 14, 15, 16, 17.

**A importação (15) é adiada, não removida**, e isso tem consequência em tela:
ela segue desenhada no atalho do cartão escuro da dashboard, na linha de Mais e
no estado vazio de Meus fretes — onde é a **saída principal**. Os dois primeiros
simplesmente não nascem; o terceiro **precisa de convite novo** (lançar o
primeiro frete), senão vira estado vazio sem saída. Registrado em
`docs/especificacao.md` §9.

**A distinção entre os dois cards de convite**, para não reabrir: *Rodagem* no
estado de convite é aceitável porque depende de um **campo opcional que o
usuário preenche**; *Lucro* não era, porque dependia de uma **funcionalidade
que não existiria**.

O item 12 pode esperar porque **o dado não se perde**: origem e destino são
guardados como referência de município, e o valor do frete também — então
distância e R$/km são deriváveis retroativamente. A parte **irrecuperável** é
origem e destino resolverem para município de verdade; se ficarem como texto
livre, nada é derivável nem depois. Daí a medição dos **10%** (piso de 20
fretes, e o aviso mostrando *quais* textos não resolveram), que ficou escrita
no **item 3**, não no 2 — ela mede fretes, e fretes só existem no item 3.

### O formulário de caminhão não foi desenhado — o Design se enganou

O Design respondeu que quatro dos cinco pedidos já estavam feitos em rodadas
anteriores, e o formulário de Caminhões era um deles. **Não é.** Conferido no
protótipo, que é a origem dos dois documentos de tela:

| Tela do protótipo | Estados | Campos digitáveis | Salvar |
|---|---|---|---|
| `TelaClientes.dc.html` | lista · perfil · **formulário** | 3 | Salvar cliente |
| `TelaMotoristas.dc.html` | lista · perfil · **formulário** | 2 | Salvar motorista |
| `TelaCaminhoes.dc.html` | lista · perfil | **0** | **nenhum** |

O perfil do caminhão tem "Editar caminhão" e "Arquivar caminhão" no fim, e o
**Editar não leva a lugar nenhum**. A prova que encerra a discussão está escrita
dentro do próprio protótipo, na resposta ao toque
(`TelaCaminhoes.dc.html:353`):

> `editar: () => this.avisar('Editar caminhão — formulário ainda não desenhado.')`

Não é interpretação de documento, não é analogia entre telas: é o próprio Design
dizendo, no arquivo dele, que a tela não existe.

**De onde veio o engano** — duas linhas do `docs/componentes.md`, e a segunda é
a perigosa: o agrupamento "Cadastro / edição (cliente, **caminhão**,
motorista)", que junta os três por analogia; e a "Auditoria da regra de
posição", que lista "formulários de cliente/**caminhão**/motorista/despesa"
entre os **conferidos no DOM** — auditoria que não podia ter medido o que não
existe. `docs/navegacao.md` está certo nas duas linhas ("lista e perfil ✅",
"Formulário de caminhão ⬜"), e o "ano" que ele descreve nesse formulário não
existe em canto nenhum do protótipo.

Isso virou regra no `CLAUDE.md` §13: **o `componentes.md` não põe tela no
mundo** — quem decide se a tela existe é o protótipo, e o marcador ✅/⬜ do
`navegacao.md` acompanha ele.

**Consequência maior que uma tela faltando:** as **duas** portas de criar um
caminhão estão sem desenho (o formulário e a folha de cadastro rápido do
lançamento). Sem nenhuma das duas não existe caminho para cadastrar caminhão no
produto — trava o `veiculo_habitual` do motorista e trava a escolha de caminhão
no **item 3**. Por isso a tarefa de Caminhões desta rodada entrega **só a
tabela**.

### A quinta exportação do Design chegou no meio da tarefa — e mudou a regra

`docs/componentes.md` mudou sozinho enquanto a tarefa 0 era escrita. Conferida
antes de commitar, como as quatro anteriores.

**O que ela entregou de bom:** o **formulário de caminhão**, especificado —
"Cadastrar caminhão" / "Salvar alterações", desabilitado até ter **apelido ou
placa**, chips para TIPO, "Arquivar caminhão" no fim, e **"Sem campo de ano"**
escrito com todas as letras, batendo com a decisão tomada horas antes. Também
separou cadastro de cliente e de motorista em linhas próprias, **corrigiu a
própria auditoria** (registrando que "auditoria por analogia não é auditoria") e
trouxe regras de construção úteis: um acessor único por campo, um jeito único de
nomear o caminhão quando só há placa, e a distinção entre "nunca editado" e "o
usuário apagou".

**O que ela desfez: oito decisões já tomadas.** A lista fechada de telas sem
barra (com "Link expirado" e "Primeiro acesso" de volta, recusados por escrito
no dia anterior) · a margem provisória dos Termos no modo Ajustes (**terceira**
perda do mesmo parágrafo) · a numeração 11 duplicada de novo · o rótulo do botão
principal · a cor do "adicionar" (`#5C6660`, recusado explicitamente) · a
exceção do Pix, que voltou a bloquear · a distinção de "ação composta" na regra
de Nome · e o título "Falta a chave Pix da sua empresa".

**E ela contradiz a si mesma** — duas seções descrevendo o mesmo padrão, com o
rótulo do botão e a cor do "adicionar" em desacordo dentro do mesmo arquivo.

As oito foram **reaplicadas à mão**, exatamente como decididas em 07 e 08/08; as
duas contradições internas resolvidas pela decisão anterior, não por escolha de
quem escreve. O conteúdo genuinamente novo ficou, com as regras de construção
recolhidas numa seção própria ("Uma leitura só de cada campo") em vez da seção
11 duplicada. A tabela-resumo de gatilhos que a exportação trouxe foi
descartada: o que ela dizia contradizia as decisões que a seção 12 já carrega.

**Por isso a regra do §13 mudou.** O repositório passa a ser o dono de
`docs/componentes.md` e `docs/estilo.md`; o Design entrega **só as seções
novas**, e o fundador encaixa. Motivo: cinco exportações, cinco reversões das
mesmas decisões — e a quinta chegando contradizendo a si mesma é sinal de que a
fonte do Design já tem duas versões do mesmo conteúdo. **Reaplicar à mão trata o
sintoma; parar de sobrescrever trata a causa.**

**A tarefa 6 mudou de escopo por causa disso:** de "só a tabela" para
**Caminhões completo** — tabela, lista, perfil e formulário. O protótipo e o
marcador do `navegacao.md` ainda não acompanham, mas isso não bloqueia: quem
define o que a tela contém é o `componentes.md`, e **o protótipo é evidência
corroborante, nunca autoridade** (registrado no §13). O formulário é montado com
as peças da tarefa 5 — consistência por construção — e passa pelo
`/auditar-tela`.

### Pendências pedidas ao Design nesta rodada

- ~~**Formulário de caminhão**~~ — **entregue** na quinta exportação, já sem o
  campo `ano`.
- ~~**Correção das duas linhas da auditoria**~~ — **corrigida** pela própria
  exportação, com o motivo registrado.
- **Folha de cadastro rápido de caminhão** — a outra porta de criar caminhão,
  ainda `⬜`. Não bloqueia esta rodada: ela nasce dentro do lançamento de frete
  (item 3).
- **`Categoria da CNH` sai** da folha de cadastro rápido de motorista. Não
  alimenta cálculo, relatório, cobrança ou ordem, e essa folha existe para pedir
  o mínimo durante o lançamento, onde cada campo briga com os 30 segundos. Sem
  esse pedido, a próxima entrega o traz de volta.
- **O protótipo e o marcador `⬜` do `docs/navegacao.md`** precisam acompanhar o
  formulário de caminhão. Acerto de documentação — não bloqueia.
- **A partir de agora, só seções novas** — nunca o arquivo inteiro (§13).
- **Convite novo para o estado vazio de Meus fretes.** Com a importação adiada,
  a saída principal daquela tela sumiu, e o convite passa a ser **lançar o
  primeiro frete**. É o único dos três lugares que não se resolve apagando uma
  linha (ver `docs/especificacao.md` §9, "O que o corte da importação deixa em
  tela").

### Decisões de modelo que a tarefa 0 registrou

- **`ativo` sai de `Veiculo` e de `Motorista`** — arquivar é o único mecanismo.
  Dois mecanismos para "sumiu da lista" divergem em algum filtro, e hoje nenhuma
  tela tem botão de desligar. O `ativo` de `TipoOperacao` **fica**: ali não é
  estado de registro, é quais ramos do produto estão ligados.
- **`Empresa.prazo_padrao_dias` entra agora, com 15**, antes da tela que o edita
  (item 10). Exceção consciente ao "coluna sem tela que a preencha é peso
  morto": ela já tem **quem a leia** no item 2 — o cliente com prazo vazio
  precisa dizer de onde herda. O 15 já estava vigente no `componentes.md` e
  nunca tinha sido escrito na especificação.
- **A seed de municípios nunca roda em `postinstall`**, e grava pela conexão das
  migrations. `fretigate_app` fica só com `SELECT` em `municipio`.
- **`Municipio` é exceção declarada à regra do `id`** — a chave é o
  `codigo_ibge`. Ficou escrita junto da exceção que ela já tinha (`empresa_id`),
  porque as duas vêm da mesma natureza: não é dado do usuário, é tabela oficial
  de referência. Criar um `id` ao lado custaria mais que a exceção, e o custo
  não ficaria na tabela de município: **todo lugar que guarda "o município"** —
  cliente, empresa, origem e destino do frete — teria que escolher qual dos dois
  guardar, e uns guardariam um e outros o outro.
- **O (+) da barra fica ativo e abre o cadastro de cliente, provisoriamente.**
  Não inventa cor de desabilitado que documento nenhum define, e não muda a
  geometria da barra duas vezes (a folga de 138px é medida do topo do (+)).
  **No item 3 ele passa a abrir Lançar frete** — marcado como provisório no
  código também, porque provisório sem prazo escrito vira permanente.

### O que o `/revisar` achou nesta tarefa, e o que mudou por causa dele

Seis achados, todos aceitos. Três merecem registro:

- **Eu repeti, na seção `Veiculo`, o defeito que este commit existe para
  nomear:** justifiquei tirar o `ativo` dizendo "como o formulário desenhado
  oferece". O formulário não existe — o "Arquivar" está no **perfil**. Foi
  também o revisor que achou a frase do protótipo citada acima, que eu não tinha
  visto.
- **Declarar desvio no documento errado não põe desvio em vigor.** A exceção ao
  §9 estava escrita só na especificação, e quem manda é o `CLAUDE.md`. Ao voltar
  para escrevê-la no lugar certo, apareceu a saída que **não precisa de
  exceção**: `USING (true) WITH CHECK (false)` cumpre as duas cláusulas do §9 e
  é mais rígida que a versão com exceção. Virou padrão no §2 — *quando uma regra
  parece precisar de exceção, procure primeiro a solução mais precisa que não
  precisa dela*.
- **"~5.570" tinha virado 5.570 cravado, e condição de recusa da seed.**
  Município novo é criado por lei estadual: no dia em que o IBGE mudasse a
  conta, a seed pararia de carregar — o oposto do que ela protege. Passa a
  conferir contra a quantidade que o próprio arquivo declara, registrada na
  procedência junto da data do download.

Os outros três: os quatro ícones que faltam passam a ser **exportados para
`docs/icones/`** (nenhum documento autorizava tirá-los do protótipo direto), o
(+) desabilitado virou a pergunta que gerou a decisão acima, e os textos de
WhatsApp vão para `src/lib/servicos/mensagens.ts` — `src/lib/mensagens/` não
existe na estrutura de pastas do §6.

### Estado da árvore

A alteração do `docs/especificacao.md` que já estava sem commit (regras de
`documento` de Cliente e Motorista — formato e unicidade parcial por empresa)
entra neste mesmo commit: é documentação do item 2, escrita antes desta sessão.

`docs/componentes.md` entra **num commit próprio, antes deste** — a exportação
do Design com as oito restaurações, pela regra que ela mesma acabou de fazer
mudar.

---

## 08/08/2026 — exportação do Design conferida antes de commitar (a quarta com problema)

Enquanto a tarefa 10 fechava, `docs/componentes.md` e `docs/navegacao.md`
mudaram sozinhos — uma exportação do Design chegando por fora desta sessão.
Pelo `CLAUDE.md` §13 ela entra em commit próprio, antes de código de tarefa.
Antes de commitar, conferida com o mesmo rigor das três anteriores (regra de
posição revertida, login por WhatsApp de volta, prazo do link para 1 hora,
exceção de barra apagada) — porque, junto com aquelas, esta é a **quarta**.

### O que ela apagou, que tinha sido acrescentado à mão

- **O parágrafo de exceção da barra do `CLAUDE.md` §8**, em
  `docs/componentes.md`. Ele já vinha marcado, por escrito, como reaplicado à
  mão porque a exportação de 07/08/2026 não trazia: "(Esta nota não vem nas
  exportações do Design de 07/08/2026 — reaplicada aqui...)". Esta
  exportação apagou de novo — é a mesma perda de antes, pela segunda vez.
- **O parágrafo sobre Termos no modo Ajustes** (mesma vizinhança do anterior),
  que dizia que os dois modos de `/termos` usam a margem provisória do
  cadastro **enquanto Ajustes não existir**. Apagado, e o que entrou no lugar
  contradiz — ver abaixo.
- **A seção inteira "Lacunas registradas — tarefa 8, fatia 2"**, com duas
  coisas que só existiam ali: o detalhe de acessibilidade do `ChipEscolha`
  usado como aba (`role="radio"`, não `role="tab"`, pendente do Design
  desenhar aba de verdade — não sobrou em nenhum outro lugar do arquivo,
  conferido) e o registro de que a seção "Campo de texto" nunca veio em
  nenhuma exportação. **Conferido: a seção "Campo de texto" continua sem
  existir no arquivo** — a pendência foi apagada, o problema que ela
  rastreava não foi resolvido.

### O que contradiz decisão já registrada

- A seção nova "Barra de navegação: exceção fora de sessão" acrescenta
  **Link expirado** e **Primeiro acesso** à lista de telas sem barra. O
  `CLAUDE.md` §8 registra essa lista como **fechada**: "tela nova sem barra
  entra aqui só com decisão explícita, não por analogia." Nenhuma das duas
  entrou por decisão do fundador — e "Primeiro acesso" nem é claramente "fora
  de sessão" pela própria definição do §8: a pessoa já tem conta criada e
  login feito nesse ponto.
- A mesma seção afirma que **Termos vindo de Ajustes "ganha barra"** — direto
  contra o parágrafo que a própria exportação apagou (item acima) e contra o
  `CLAUDE.md` §8, que diz que nenhum dos dois modos de `/termos` tem barra de
  verdade **até Ajustes existir**.

### O que veio corrompido

- **`docs/navegacao.md`** — o título "## Regras de navegação" saiu partido: a
  pílula nova foi inserida no meio do texto do título, deixando "## Regras"
  como título e "de navegação" sobrando sozinho numa linha, sem sentido.
  Defeito mecânico, não de conteúdo — **corrigido à mão nesta sessão**,
  restaurando o título e mantendo o conteúdo novo.
- **`docs/componentes.md`** — colisão de numeração e duplicação de conteúdo.
  A seção nova entrou como **"## 11 — Folha de campo faltante"**, mas já
  existem, mais abaixo, **"## 11 — Cadastro rápido"** (conteúdo antigo,
  intocado) e **"## 12 — Folha do campo que falta"** — que descreve o
  **mesmo padrão** (folha curta ao tocar ação com campo faltante), com
  detalhes que não batem com a seção nova:
  - a seção 12 (antiga) diz que o botão principal usa **o nome da ação
    original** ("Cobrar no WhatsApp"); a seção 11 (nova) diz que o botão diz
    **para onde a ação segue** ("Salvar e cobrar", "Salvar e enviar ordem") —
    regras diferentes para a mesma peça;
  - a seção 12 lista três gatilhos, incluindo "Gerar relatório com Pix sem
    chave Pix"; a seção 11 lista dois gatilhos mais "campo vazio no perfil do
    cliente" e **não menciona o gatilho do Pix**.
  Duas seções, mesmo número, descrevendo a mesma coisa de dois jeitos que não
  concordam entre si. **Não corrigido** — não é defeito mecânico, é decisão
  de conteúdo (ver pendências abaixo).

### As três pendências, resolvidas pelo fundador (08/08/2026)

1. **Lista de telas sem barra**: recusada a ampliação. `docs/componentes.md`
   voltou aos sete itens já aceitos (os seis do `CLAUDE.md` §8 mais
   "Recuperação enviada", que já estava na lista antes desta exportação —
   ver `ffc8e1e`). "Link expirado" e "Primeiro acesso" saíram; nenhum dos
   dois entrou por decisão explícita do fundador, e o §8 proíbe ampliar por
   analogia.
2. **Termos no modo Ajustes**: mantida a decisão já registrada. O parágrafo
   apagado pela exportação foi reaplicado à mão em `docs/componentes.md`: os
   dois modos de `/termos` seguem usando a margem provisória do modo
   cadastro até Ajustes existir; o documento não volta a prometer barra que
   não existe.
3. **Seções 11/12 duplicadas**: unificadas em uma só, na posição 12 (a
   posição 11 pertence a "Cadastro rápido", conteúdo antigo e intocado). O
   conteúdo unificado ficou assim, por decisão do fundador:
   - o rótulo do botão principal diz **para onde a ação leva** ("Salvar e
     cobrar", "Salvar e enviar ordem", "Salvar e gerar relatório", "Salvar
     no cadastro") — repetir o nome da ação original passaria a impressão de
     que a primeira tentativa falhou. Isso não abre exceção na regra "uma
     ação, um nome" (`docs/componentes.md` "Regras"): a regra vale para a
     **mesma ação** em lugares diferentes, e "Salvar e cobrar" é **ação
     composta** — salva e continua outra —, não a mesma ação de "Cobrar no
     WhatsApp" com nome trocado. A regra ganhou essa distinção por escrito;
   - a lista de gatilhos ficou com os **quatro**, porque nenhuma das duas
     versões estava completa sozinha: Cobrar no WhatsApp sem telefone do
     cliente · Enviar ordem sem telefone do motorista · Gerar relatório
     **com cobrança marcada** sem chave Pix da empresa (relatório sem
     cobrança não pede Pix) · campo vazio tocável no perfil. O gatilho do
     Pix também é o único que **não bloqueia**: "Agora não" gera o
     relatório do mesmo jeito, sem a chave, com aviso curto do sistema —
     bloquear seria pior, o cliente ainda pode pagar por boleto ou
     transferência;
   - a cor do "adicionar" no perfil ficou em `#1B6B3A` como **texto**, não
     como fundo preenchido — a exclusividade do verde sólido (`docs/
     componentes.md` "Regras") é sobre fundo, não sobre cor de texto, e
     verde como texto já marca elemento tocável em outros lugares do
     inventário (pílula em linha, pílula de cabeçalho, chip selecionado).
     `#5C6660` foi descartado por ser a cor de desabilitado — o oposto
     semântico de um campo tocável.
   `docs/navegacao.md` ganhou o gatilho do Pix/relatório que faltava na
   frase equivalente da seção "Regras de navegação", pela mesma razão.

### Pendências pedidas ao Design (fonte), acumuladas — conferir a cada exportação nova

- O parágrafo de exceção da barra do `CLAUDE.md` §8 precisa **vir** na
  exportação, não ser reaplicado à mão a cada vez — já é a segunda perda
  desse parágrafo específico. O parágrafo de "Termos no modo Ajustes" é um
  parágrafo à parte, vizinho dele, e essa foi a primeira vez que ele se
  perdeu — os dois pedidos ao Design são independentes, não a mesma conta.
- A seção "Campo de texto" nunca veio em exportação nenhuma desde
  07/08/2026.
- O defeito mecânico de título partido (este, em `docs/navegacao.md`) —
  registrar para conferir se o próximo lote vem limpo ou repete o problema.
- A seção "Folha de campo faltante" perdeu o gatilho de "Gerar relatório
  sem chave Pix" ao ser reexportada — a fonte do Design precisa incluir os
  quatro gatilhos (telefone do cliente, telefone do motorista, Pix do
  relatório, campo vazio no perfil), senão a próxima exportação apaga de
  novo.

### O que não mudou de conteúdo, e por isso não entrou nas listas acima

A seção nova "Folha de campo faltante" em `docs/componentes.md`, fora a
colisão de número e a divergência de detalhe já registradas, e a linha nova
em `docs/navegacao.md` ("Folha de campo faltante não é tela...") — conteúdo
aditivo, sem contradição encontrada além do já listado.

---

## 08/08/2026 — tarefa 10 fechada: as duas correções de documento do item 1, e o item 1 concluído

**Fechada.** As duas pendências que a tarefa 10 herdou da fila do item 1 —
texto solto no `docs/navegacao.md` e um desvio não documentado no
`docs/especificacao.md` — foram conferidas, e as duas já estavam corrigidas,
resolvidas ao longo do próprio item 1 em vez de esperar por uma tarefa
dedicada:

- **`docs/navegacao.md`, tela `Entrar`** — não fala mais em código por
  WhatsApp; a linha diz "**E-mail e senha** → Primeiro acesso · Criar conta ·
  Esqueci a senha. O app nunca envia mensagem sozinho, então não há código
  por WhatsApp", sem `⚠️` (conferido: nenhum `⚠️` resta no arquivo inteiro).
  Veio pela segunda exportação do Design, na tarefa 8 fatia 2.
- **`docs/especificacao.md` §6, `Usuario`** — já registra por escrito que
  `senha_hash` não existe, com o motivo (Better Auth guarda o hash em
  `account`, provedor `credential`). O desvio apontado na tarefa 3 está
  documentado, não só corrigido no código.

Também conferido, fora da fila formal da tarefa 10 mas do mesmo tipo: nenhum
resíduo de "Nome da transportadora" sobra em `docs/navegacao.md`,
`docs/especificacao.md` ou `docs/componentes.md` — só o uso correto do termo
em contexto de marketing, previsto pelo próprio vocabulário do `CLAUDE.md` §8.

**A pendência do Storage (isolamento do `storage.objects`, balde privado, URL
assinada) continua em aberto** — ela nunca fez parte desta fila: o diário já a
registrava como pendência **fora do item 1**, porque depende do item 5
(upload) existir. Sem mudança aqui.

Com isso, **o item 1 da ordem de construção (`docs/especificacao.md` §9) está
concluído** — as dez tarefas fecharam.

### Próximo — item 2: cadastros

Cliente, veículo, motorista, tipo de operação e municípios — a base sobre a
qual o item 3 (lançamento de frete) se apoia.

**As duas bibliotecas já foram aprovadas pelo fundador** (08/08/2026, nada
instalado ainda): fonte dos municípios — `kelvins/municipios-brasileiros`
(MIT, derivado do IBGE, 5.570 registros com latitude/longitude do centro,
seed estática comitada, não dependência de runtime) — e validação de
CPF/CNPJ — pacote `cpf-cnpj-validator` (zero dependências, adaptador Zod,
já atualizado para o CNPJ alfanumérico da Receita).

**Duas exigências já registradas para a seed de municípios**, a valer quando
ela for escrita: (1) conferência na carga — contagem de 5.570, nenhuma
coordenada nula/zerada, todas dentro dos limites do Brasil, a seed recusa se
algo falhar em vez de carregar dado ruim; (2) procedência registrada no
repositório — de onde veio o arquivo, data do download, licença.

**A correção do CNPJ para o formato alfanumérico da Receita já fechou**,
commit `ffc8e1e`, 08/08/2026 — normalização, trava de unicidade reforçada
por `CHECK` no banco (`empresa_cnpj_formato`, testado em 7 casos) e
confirmação de que o CPF não muda. Ver entrada própria mais abaixo (a que
fechava a tarefa 10) para o detalhe original, e a entrada da exportação do
Design logo acima para o que ficou pendente antes do plano do item 2 poder
começar.

**Pendente com o Design, registrado antes de começar:** o formulário de
cadastro/edição de Caminhão ainda não foi desenhado. `docs/navegacao.md` tem
a linha "Caminhões — lista e perfil", e `docs/componentes.md` só cobre a linha
da lista (apelido · placa · tipo) e o padrão de lista compartilhado com
Clientes — ao contrário de Cliente, nenhum dos dois documentos tem a tela de
cadastro/edição do caminhão em si. Já pedido ao Design pelo fundador. Bloqueia
só a parte de `Veiculo` do item 2 — Cliente, Motorista, TipoOperacao e
Municipio seguem sem depender disto.

---

## 08/08/2026 — a esteira falhou por falta de `RESEND_API_KEY`, e por que só `BETTER_AUTH_SECRET` virou secret do GitHub

Primeira execução real do `ci.yml` (tarefa 9): as 25 verificações de
isolamento passaram, e `tests/cadastro.test.ts` nem chegou a rodar — parou ao
carregar, por falta de `RESEND_API_KEY`. **Falhou pelo motivo certo**: o
teste não manda e-mail, só precisa que o módulo carregue, mas
`src/lib/auth/email.ts` lança erro no carregamento se a variável faltar (a
mesma defesa que protege a publicação — ver "Ambientes" no `CLAUDE.md` §5).

Resolvido com cinco variáveis a mais no `.env` que a esteira monta:
`RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_RESPOSTA`, `BETTER_AUTH_SECRET` e
`NEXT_PUBLIC_APP_URL` — nenhuma delas precisa de valor real, porque nenhum
teste da suíte manda e-mail de verdade nem depende do domínio de produção.

**Por que só `BETTER_AUTH_SECRET` virou secret do GitHub, e as outras quatro
ficaram fixas no `ci.yml`:** o perigo funcional dos cinco é o mesmo — zero,
porque nenhum protege dado real no projeto de teste. A diferença é a *forma*
do valor. Endereço de e-mail e URL não parecem segredo para ninguém,
inclusive para um scanner automático. `BETTER_AUTH_SECRET` parece — é uma
string de alta entropia, do tipo que o scanner de segredo do próprio GitHub
(e qualquer ferramenta parecida) foi feito para achar. Deixar essa forma
fixa no repositório, mesmo inofensiva, teria dois custos: um alerta que
dispara sem motivo real, e o hábito de aprender a ignorar esse alerta
específico — que é exatamente o hábito que faz um alerta de verdade passar
despercebido depois. Mover um valor para secret custa um cadastro de um
minuto; o alerta falso ensinando a ignorar custa mais caro, e não tem como
desfazer depois de instalado. Decisão do fundador, 08/08/2026.

---

## 08/08/2026 — caractere especial em senha, terceira rodada: heredoc sem aspas no `ci.yml`

Ao escrever `.github/workflows/ci.yml` (tarefa 9), o passo que grava as três
URLs de conexão num `.env` usava `cat <<EOF > .env` sem aspas no delimitador.
Sem aspas, o shell interpreta `$` e crase dentro do heredoc — se qualquer
senha tivesse um desses caracteres, o `.env` sairia com um valor diferente da
credencial de verdade, ou pior, tentaria executar um comando embutido nela.
Achado pelo `/revisar`, não visto na escrita.

**Terceira vez que caractere especial em senha custa uma rodada neste
projeto:** os colchetes `[senha]` copiados do painel do Supabase (tarefa 2,
ver "Percalço no caminho, para não repetir" mais abaixo), a advertência que já
existe em `.env.example` ("a senha, se tiver caractere especial, precisa ir
codificada para URL"), e agora este heredoc. Corrigido para
`cat <<'EOF' > .env` — delimitador entre aspas simples desliga toda
interpretação do shell dentro do bloco, e o valor gravado passa a ser sempre o
literal que veio do secret.

---

## 08/08/2026 — preparação da tarefa 9: projeto de teste no Supabase, e a pegadinha da pausa

Antes do primeiro passo da tarefa 9 — a suíte de isolamento sai do banco de
desenvolvimento e passa a rodar contra um projeto próprio, só de teste, na
esteira do GitHub Actions — conferido na documentação do Supabase: **cabe no
plano gratuito**. O limite é 2 projetos ativos por organização, e o FretiGate
hoje usa 1. Sem custo novo.

**A pegadinha, registrada para não custar meia hora de investigação depois:**
projeto gratuito do Supabase pausa sozinho depois de **7 dias sem atividade
suficiente** — a própria documentação diz que poucas consultas por dia ao
longo da semana evitam a pausa. Chega aviso por e-mail uma semana antes, e
depois de pausado a restauração é **só manual, pelo painel do Supabase** —
não existe endpoint de API nem comando de CLI para isso, então a esteira não
se recupera sozinha.

Como a esteira roda a cada push, na prática isso só acontece se ficar **mais
de uma semana sem nenhum commit**. Quando acontecer: a esteira falha com erro
de conexão recusada, e esse erro **parece defeito no código ou na
migration** — não é. Primeiro lugar a olhar, antes de investigar qualquer
outra coisa: painel do Supabase → projeto de teste → botão de retomar o
projeto.

---

## 08/08/2026 — tarefa 8 (fatia 2): Entrar, Esqueci a senha, Redefinir senha, Termos

**Fechada** — fecha o ciclo de recuperação de senha por inteiro: o e-mail
chega, o link abre a tela certa, a senha é redefinida e a pessoa já entra com
ela. Três commits: duas exportações do Design chegaram no meio da tarefa, e
as duas tiveram que entrar sozinhas, antes do código (`CLAUDE.md` §13).

### O que entrou

- `src/app/(auth)/entrar/` — e-mail e senha, com a trava do Better Auth e a
  mensagem certa por tipo de erro.
- `src/app/(auth)/esqueci-a-senha/` + `src/components/auth/
  PedidoDeRecuperacao.tsx` — pedido do link e confirmação, reaproveitados
  também no reenvio a partir do link vencido.
- `src/app/(auth)/redefinir-senha/` — a tela que o link do e-mail abre.
  Campo único de senha, com revelar (Mostrar/Ocultar). Link vencido: bloco
  de alerta explicando que a conta e os fretes seguem intactos.
- `src/app/(auth)/termos/` — Termos e Política, texto marcado como rascunho,
  duas abas (reaproveitando `ChipEscolha` — sem componente de aba ainda).
- `src/lib/servicos/trava-de-redefinicao.ts` (limite de consulta ao código,
  por custo) · `src/components/ui/PilulaEmLinha.tsx` (peça 04 do inventário,
  primeira vez em uso) · `CampoTexto.tsx` ganhou a variação "revelar".
- Senha mínima passou a ser **6 caracteres**, fixada em `src/lib/auth/
  index.ts` — decisão nova desta tarefa, não existia antes.
- `Sair da conta` e sessão vencida agora vão para `/entrar` (antes iam para
  `/criar-conta`, porque `/entrar` ainda não existia).

### A decisão mais cara: o e-mail nunca sai do servidor

O plano original guardava o e-mail na própria URL do link de recuperação,
para o "mandar de novo" funcionar num toque só. O fundador travou: endereço
na URL vira registro de servidor e histórico de navegador, e o `CLAUDE.md`
§4 proíbe dado pessoal em log. Investigação, antes de escrever qualquer
código: o Better Auth guarda o código de recuperação numa tabela ligada ao
usuário, e ela não é apagada no instante em que vence — só como efeito
colateral de alguém consultar QUALQUER código, de qualquer pessoa. Ou seja,
o servidor geralmente ainda consegue descobrir a quem um código vencido
pertencia, contanto que a consulta não passe primeiro pela rota própria do
Better Auth (que apaga o código vencido antes de dar a chance de olhar).
Solução: `sendResetPassword` (`src/lib/auth/index.ts`) manda o link direto
para `/redefinir-senha?token=...`, nunca pela rota da biblioteca. A tela
resolve o e-mail no servidor (`src/lib/servicos/redefinicao-de-senha.ts`) e
só entrega para o navegador dentro dos próprios dados da página — nunca a
URL. Quando o servidor não consegue mais achar (código já usado, ou varrido
por outra consulta), a tela cai para pedir o e-mail de novo — o plano B que
o fundador já tinha aprovado para esse caso.

### Duas exportações do Design chegaram no meio, e as duas pararam a tarefa

A primeira substituiu `docs/navegacao.md` e `docs/componentes.md` por
inteiro. Trouxe conteúdo real para telas que eu tinha improvisado (nomes de
botão, o papel tipográfico "Corpo de texto fora de sessão") — e contradisse
duas decisões que a conversa tinha acabado de fechar: o nome do botão de
reenvio, e se a tela de confirmação tem alguma saída. O fundador resolveu na
hora: um campo de senha só (não "senha" + "repetir senha" — "quem erra
digitando erra duas vezes"), nome unificado em **"Mandar link novo"** em
toda parte, e as **2 horas** de validade do link mantidas — a exportação
mencionava 1 hora, mas prazo é regra de produto da tarefa 7, com motivo
registrado, e `componentes.md` manda no que a tela contém, não nisso.

A segunda exportação sincronizou essas decisões de volta nos dois documentos
— e trouxe "senha mínima: 6 caracteres" como se já fosse regra registrada.
Não era: conferido, não estava em `docs/especificacao.md` em lugar nenhum.
Perguntado, o fundador confirmou 6 como a regra real — primeira vez que ela
existe no produto, e entrou junto desta tarefa (`src/lib/auth/index.ts`,
`docs/especificacao.md`).

Cada exportação virou commit próprio, nunca junto do código que dependia
dela — CLAUDE.md §13, seguido as duas vezes.

### `/auditar-tela` e `/revisar`

`/auditar-tela` em Esqueci a senha, antes da primeira exportação chegar,
achou dois problemas: erro de campo ("E-mail inválido") solto embaixo do
botão em vez de preso ao próprio campo, e "Voltar pra entrada" sobrevivendo
à tela de confirmação, que a documentação da época não listava para lá. Os
dois corrigidos.

`/revisar` no fim achou, entre outros: peso de fonte errado nos parágrafos
de Termos (400 em vez de 600), a Política prometendo "remoção" de dado
(contradiz `CLAUDE.md` §7 — trocado por "exportação"), duas lacunas do
Design registradas só em comentário de código, nunca em `docs/`, e a
consulta de `/redefinir-senha` sem trava nenhuma (virou
`trava-de-redefinicao.ts` — por custo de rota sem limite, não por
adivinhação do código).

### Pendências, registradas nos documentos, não só aqui

- Duas lacunas do Design em `docs/componentes.md`: abas via `ChipEscolha`
  (sem componente de aba de verdade ainda) e a seção "Campo de texto", que
  nenhuma das duas exportações trouxe de volta.
- `CLAUDE.md` §14 ganhou um item somado ao bloqueio de lançamento já
  existente: tocar em "Termos de uso" no meio do cadastro navega para longe
  e perde o formulário preenchido. A correção certa é abrir os Termos por
  cima do formulário (folha/modal), não guardar rascunho — não construída
  nesta fatia.
- Bloqueio de lançamento (forma do aceite e redação dos Termos, sem revisão
  jurídica) continua de pé, sem mudança.

### Próxima

Tarefa 9 — travas de ESLint e SQL cru na integração contínua, mais duas
sub-tarefas já registradas: 9b (teste permanente da trava de banco) e 9c
(privilégio de execução de função para `anon`/`authenticated`, achado na
tarefa 8). Lista completa perto do fim deste diário, na entrada mais antiga
("Tarefas restantes do item 1").

---

## 07/08/2026 — tarefa 8 (fatia 1): tela Criar conta

**Fechada** — cadastro completo (Empresa + Usuário dono, na mesma operação),
testado pelo navegador de ponta a ponta e por suíte automatizada. Entrar,
Esqueci a senha e Termos ficam para a próxima fatia, como decidido no início
da tarefa.

### O que entrou

- `src/app/(auth)/criar-conta/` — a tela: campos, chips da pergunta de
  origem, aceite dos Termos por texto (não checkbox — ver abaixo).
- `src/lib/servicos/cadastro.ts` — o Server Action, em três passos (Empresa
  → Usuário → reversão se o segundo falhar), com `src/lib/servicos/
  trava-de-cadastro.ts` (rate limit próprio, 5/10min) e
  `src/lib/servicos/criar-usuario-dono.ts` (isolando o uso de
  `ctx.internalAdapter` do Better Auth) como arquivos à parte.
- `src/components/ui/` — primeiro commit da biblioteca de componentes:
  `Botao` (três variantes do inventário fechado), `CampoTexto`, `ChipEscolha`.
- `src/app/(app)/` — pouso mínimo pós-login (nome da empresa + Sair da
  conta), provisório até Primeiro acesso existir. Substitui
  `src/app/page.tsx` (a página de teste da instalação, que também saía
  nesta tarefa e não tinha saído na 7).
- `prisma/migrations/20260807090000_reverter_cadastro_incompleto` — a função
  que reverte um cadastro incompleto, e o papel `fretigate_reversor`.
- `tests/cadastro.test.ts` — 14 conferências: cadastro normal, e-mail
  duplicado, o contraste da reversão, a guarda da função, e que a reversão
  não depende de `postgres` ignorar RLS.

### A decisão mais cara: a Empresa órfã, e como revertê-la sem furar RLS

Empresa e Usuário nascem em duas conexões diferentes (`fretigate_app` e
`fretigate_auth`, sem transação em comum — ver o comentário em
`src/lib/db/index.ts`). Se a Empresa for criada e o Usuário falhar depois,
ela fica órfã. Decisão do fundador: apagar de verdade (não arquivar) — nunca
existiu usuário apontando pra ela, então nunca existiu de verdade no produto
(`CLAUDE.md` §7 ganhou essa exceção, com essa distinção).

A primeira versão da função que faz isso rodava como `postgres`
(`SECURITY DEFINER` sem trocar o dono), e `postgres` ignora RLS —
funcionava, mas contrariava a regra central do produto ("nenhuma conexão em
execução ignora RLS"). Bloqueio do fundador: redesenhada para rodar como um
papel novo, `fretigate_reversor` — sem `BYPASSRLS`, com `set_config` dentro
da própria função, então a política de RLS é satisfeita de verdade, não
ignorada. `CLAUDE.md` §9 ganhou a explicação completa.

### `/revisar` rodou três vezes — e a lição de cada uma

Não por a tarefa não terminar (a regra da seção 2 é sobre achado de classe
nova, e cada passe achou classe nova de verdade):
1º passe achou o desenho antigo da função (bloqueio) e o uso de
`ctx.internalAdapter` sem alternativa avaliada. 2º passe, depois da
correção, achou um `GRANT CREATE` esquecido (nunca revogado) e o `wdth`
que faltava no título. 3º passe achou comentário desatualizado em
`lib/db/index.ts` (dizia que a função "não olha `app.empresa_id`" — não é
mais verdade, depois do redesenho) e confirmou que uma seção inteira de
telas de desktop já existia em `docs/componentes.md` **antes** desta
tarefa, contrariando o `CLAUDE.md` §12 — não é desta tarefa, fica
registrado aqui para alguém notar.

### O checkbox que virou texto

O `/auditar-tela` pegou dois problemas no aceite dos Termos: o checkbox não
estava em nenhum documento, e o alvo de toque dele (16px) furava o mínimo de
48px. Virou texto acima do botão ("Ao criar conta, você aceita..."), com os
nomes dos documentos como link. Isso abriu uma pergunta maior — link dentro
de frase corrida nunca alcança 48px — resolvida com uma exceção nova no
`CLAUDE.md` §8: três condições (sublinhado, entrelinha ampliada, o mesmo
documento também pelos Ajustes), todas obrigatórias.

### Pendências, registradas nos documentos, não só aqui

- **Bloqueio de lançamento** (`CLAUDE.md` §14): a forma do aceite dos Termos
  e a redação deles não passaram por revisão jurídica. Não pode ir ao ar.
- **Prazo** (`CLAUDE.md` §14): `origem_cadastro` (atribuição por primeiro
  toque) fica nulo nesta fatia — precisa existir antes de ligar os anúncios.
- `/entrar` e `/termos` ainda não existem (próxima fatia) — os links da tela
  levam a 404 hoje.
- Estilo de campo de texto: foco e erro **saíram do "falta aprovar"** nesta
  tarefa (`docs/componentes.md`, conflitos 2 e 3, resolvidos). Espaçamento
  entre campos e a margem inferior de tela sem barra continuam sem token
  formal — registrados como lacuna em `docs/estilo.md`.

### Próxima

Tarefa 8, fatia 2: Entrar, Esqueci a senha (ciclo completo de recuperação) e
Termos.

---

## 07/08/2026 — incidente: checksum divergente na migration da trava de tentativas

Ao começar a tarefa 8, `prisma migrate dev --create-only` recusou rodar:
*"a migration `20260807074414_trava_de_tentativas` foi modificada depois de
aplicada"*, propondo resetar o banco de desenvolvimento inteiro — o que não
foi feito.

**Causa:** na própria tarefa 7, o comentário final de
`prisma/migrations/20260807074414_trava_de_tentativas/migration.sql` foi
reescrito depois que a migration já tinha sido aplicada — duas versões
anteriores desse comentário prometiam garantia maior do que o teste
realmente confere, e a correção veio depois do `prisma migrate dev` que
aplicou a migration. O arquivo commitado (o que está em `git log`) nunca
mudou depois disso; só o *checksum gravado no banco* no momento da aplicação
ficou preso à versão anterior do comentário.

**Verificado antes de mexer em qualquer coisa**, campo a campo, banco de
desenvolvimento contra o `.sql` commitado: colunas de `rate_limit` (tipo,
nulidade, default), chave primária, índice único de `key`, RLS ligado e
forçado, a política `rate_limit_autenticacao` (papel, `USING`/`WITH CHECK`),
e os `GRANT`s de `fretigate_auth` — tudo bate, e nenhum privilégio extra para
`anon`/`authenticated`. Para confirmar que o método de checksum era o mesmo
do Prisma, o sha256 dos outros seis arquivos de migration foi comparado ao
valor gravado em `_prisma_migrations` — os seis batem exatamente, só o
sétimo diverge. Ou seja: a estrutura do banco está correta; só o registro do
Prisma sobre *qual versão do arquivo* rodou estava desatualizado.

**Conserto:** `UPDATE _prisma_migrations SET checksum = ...` só naquela
linha, pelo sha256 do arquivo atual — sem tocar em nenhuma tabela ou dado do
produto. `prisma migrate status` voltou a dizer "Database schema is up to
date!" depois disso.

**A lição, para não repetir:** editar o `.sql` de uma migration **depois**
dela já ter sido aplicada — mesmo só o comentário, sem mudar nenhuma
instrução — quebra a conferência de integridade do Prisma. O arquivo vira
"fonte da verdade" para quem lê o código, mas o banco guarda a impressão
digital de quem *rodou* primeiro. Se o texto de uma migration já aplicada
precisar de correção, o caminho limpo é uma migration nova só com o
comentário certo, ou aceitar o descompasso e resolvê-lo assim — nunca editar
o arquivo já aplicado sem em seguida atualizar o registro no banco.

**Por que isso importa além de hoje:** um ambiente novo (outro banco de
desenvolvimento, produção) aplica as migrations do zero, direto do arquivo —
nesse caminho o descompasso nunca apareceria, porque não há "checksum
anterior" para comparar. O risco real era só neste banco, que já tinha a
tarefa 7 aplicada com o comentário antigo. Verificado, não suposto.

---

## 07/08/2026 — tarefa 7: Better Auth, `lib/auth` e a trava de tentativas

**Tarefa fechada**, com o e-mail real testado contra três caixas.

### O resultado medido

`POST /api/auth/request-password-reset` disparado de verdade para três
endereços que o fundador passou: um de teste de entrega, um Gmail e um
Outlook.

| Onde | Resultado |
|---|---|
| mail-tester.com | **10/10** — SPF, DKIM, DMARC e conteúdo corretos |
| Gmail | caixa de entrada |
| Outlook | **caixa de spam** |

O 10/10 descarta erro de configuração: SPF, DKIM, DMARC e conteúdo já estão
certos. O Outlook usa reputação própria de domínio, separada dessas
checagens, e julga pelo **histórico de envio** — que um domínio novo ainda não
tem. É o mesmo raciocínio já registrado para o DMARC em `p=none`: domínio novo
começa sem reputação, e isso não se resolve mudando configuração, só com
envio limpo e tempo. Decisão do fundador em 07/08/2026: fechar a tarefa 7
registrando o Outlook como limitação conhecida, não como pendência.

Três desdobramentos, também decididos nesta data:

1. **Critério novo para a tarefa 8.** A tela que confirma o pedido de
   recuperação de senha precisa trazer **"Não achou? Confira a caixa de
   spam."** — o mesmo vale onde quer que a confirmação de cadastro apareça
   (hoje é a pendência de e-mail não confirmado na dashboard, cujo rótulo e
   forma ainda são do Design — ver "Pendente com o Design" mais abaixo). Vai
   acontecer com cliente real nas primeiras semanas; sem essa linha, ele
   conclui que o produto está quebrado. Registrado também em
   `docs/componentes.md`, na linha da tela `Esqueci a senha`.
2. **Ponto de reteste: antes de ligar os anúncios**, não "depois de algumas
   semanas" — é o gatilho real, porque é o momento em que cliente de verdade
   passa a criar conta e pedir recuperação de senha. Repetir o teste de
   mail-tester.com e as duas caixas nesse momento. Se o Outlook ainda cair em
   spam ali, avaliar pedir orientação de aquecimento ao Resend.
3. **A empresa de teste "Transportes Conferencia de Email" foi apagada** do
   banco de desenvolvimento — resíduo de sessão anterior, um usuário sem
   conta nem sessão vinculada, sem valor em manter.

### O que entrou

`src/lib/auth/index.ts` — a configuração do Better Auth, ligada ao banco pelo
papel `fretigate_auth`. `sessao.ts` — `exigirSessao()` e `exigirDono()`.
`email.ts` — o envio pelo Resend. E `src/app/api/auth/[...all]/route.ts`, o
endereço por onde o navegador fala com a autenticação.

A partir daqui existe "estar logado": o `empresa_id` que alimenta o filtro do
§3 passa a sair da sessão, e não de um argumento que alguém lembra de passar.

### O ponto que podia furar o isolamento, e não furou

`empresa_id` e `papel` precisam existir na sessão, e o Better Auth expõe campos
extras com `input: true` por padrão — ou seja, **preenchíveis pelo cliente**.
Deixados assim, um cadastro conseguiria mandar o `empresa_id` de outra empresa
no formulário, que é exatamente a linha que o §3 proíbe.

Os quatro campos extras estão com `input: false`. Foi conferido por tipo, não
por leitura: uma sonda de compilação confirmou que `empresa_id` e `papel`
chegam tipados na sessão e que campo inexistente falha — se a inferência
estivesse caindo em `any`, um erro de digitação passaria calado.

### O cadastro genérico está fechado, de propósito

`disableSignUp: true`. Criar conta no FretiGate é criar uma **empresa** e o
usuário dono dela na mesma transação, e o papel da autenticação não enxerga
`empresa` — o endpoint genérico gravaria usuário sem empresa, que o banco
recusa. Rota que só sabe dar erro não fica aberta. A tela de criar conta é a
tarefa 8.

### A trava de tentativas — medida, não suposta

Tabela `rate_limit` nova, e ela nasceu isolada no mesmo commit: RLS ligado,
forçado, política nomeada para `fretigate_auth`, e a exceção registrada no
teste com o motivo. Ela não tem `empresa_id` porque a contagem acontece **antes
de existir sessão** — quem tenta adivinhar senha não está logado.

No banco e não em memória porque a Vercel roda várias instâncias: com contagem
em memória o limite de 5 viraria 5 vezes o número de instâncias, e em
desenvolvimento — uma instância só — o número bateria, escondendo o defeito.

**Sete tentativas de login seguidas: 401, 401, 401, 401, 401, 429, 429.** Trava
exatamente na sexta. E as linhas foram conferidas na tabela depois, com
contagem 5 na chave do login — a contagem está no banco, não na memória do
processo.

### O que foi provado do e-mail, e o que não foi

**Provado:**

| | |
|---|---|
| DNS do envio | SPF em `send.envio.fretigate.com` (`include:amazonses.com`), DKIM em `resend._domainkey.envio.fretigate.com`, retorno de bounce no `feedback-smtp.sa-east-1` |
| DMARC | existe no domínio raiz, `p=none`, e vale para o subdomínio por herança |
| Alinhamento | tanto SPF quanto DKIM alinham com `fretigate.com` — o DMARC passa por dois caminhos, não por um |
| A corrente do produto | `POST /api/auth/request-password-reset` responde 200 e roda o envio sem erro |
| O fornecedor | o módulo `email.ts` mandou de verdade e o Resend devolveu identificador — `Reply-To` saindo de `EMAIL_RESPOSTA`, nunca literal |

**Não provado, e é o que falta para fechar:** que a mensagem **chega à caixa de
entrada**. Domínio verificado e DNS certo provam que o caminho existe, não que
o filtro aceita — conteúdo e reputação também decidem, e o domínio é novo.

### Uma observação que não bloqueia

O DMARC está em `p=none`, que é só monitoramento: um filtro que reprove o
alinhamento não recebe instrução de rejeitar. Para domínio novo é o começo
correto, e não se sobe direto para `reject`. Fica anotado para revisitar depois
que os relatórios de `rua=` mostrarem algumas semanas de envio limpo.

### Fora da tarefa, feito no mesmo dia

O repositório foi para o GitHub — `fretigate/fretigate`, privado, conferido por
consulta anônima. O endereço do remoto estava certo e a **conta** é que estava
errada: a máquina tinha guardada a credencial de `ogestorflow`, e o GitHub
responde "não existe" para repositório privado de quem não tem acesso, o que
parece endereço errado. O remoto agora carrega a conta no endereço.

A identidade de commit foi fixada **só neste repositório** para o endereço
`noreply` da conta `fretigate`. Os 28 commits anteriores ficaram como estavam,
por decisão do fundador: um e-mail só fica verificado numa conta do GitHub por
vez, então adicionar o antigo à conta nova não funcionaria.

### O que o revisor pegou, e o que virou correção

Cinco divergências. Quatro aceitas, uma recusada pelo fundador.

**O e-mail sai em texto puro, sem HTML.** A primeira versão trazia dois cinzas
e três tamanhos de fonte que não existem em documento nenhum — valor fora do
sistema, §8. A decisão do fundador não foi escolher as cores certas: foi
**tirar o HTML**. Texto puro tem nota de spam melhor, e com domínio novo isso
pesa mais que estética. Por isso o `estilo.md` não ganha seção de e-mail — não
há o que estilizar.

**`rate_limit` ganhou `criado_em` e `atualizado_em`.** O §7 não tem ressalva. O
argumento de que o `lastRequest` já marca tempo era raciocínio contra regra
escrita, e abrir exceção enfraquece uma regra absoluta: quem for acrescentar
tabela depois acha a exceção antes de achar a regra. Como a migration ainda não
tinha sido commitada, ela foi **refeita inteira** em vez de empilhar uma
segunda — uma mudança lógica, uma migration.

**Um comentário meu prometia um teste que não existia.** Na migration estava
escrito que a ausência de privilégio de `anon` era "conferida pelo teste". Não
era: nenhum teste olhava privilégio. É o defeito exato do §3, item 4 — com a
frase, ninguém vai olhar. O fundador mandou **escrever o teste**, não apagar a
frase.

### O teste novo achou duas coisas antes de existir

`tests/isolamento/privilegios.test.ts` confere a camada **antes** do RLS: RLS
decide quais linhas um papel enxerga, privilégio decide se ele alcança a
tabela. O `schema.test.ts` só olhava a primeira.

Escrevê-lo obrigou a olhar o banco de verdade, e apareceram duas coisas que
ninguém sabia:

1. **O `REVOKE USAGE ON SCHEMA public` da migration anterior não teve efeito.**
   `has_schema_privilege('anon','public','USAGE')` continua verdadeiro, porque
   o schema `public` concede USAGE ao pseudo-papel `PUBLIC`, do qual todo mundo
   faz parte — revogar de `anon` não tira o que veio por ali. **Não é buraco:**
   USAGE no schema sem privilégio em tabela não alcança dado nenhum. Mas a
   migration dá a entender que revogou, e não revogou.

2. **Os privilégios padrão do `supabase_admin` ainda concedem tudo a `anon` e
   `authenticated` em tabela futura.** A migration anterior alterou o padrão do
   `postgres`, que é quem roda as migrations — por isso a `rate_limit` nasceu
   fechada, conferido. O padrão do `supabase_admin` continua aberto e só
   morderia se alguma tabela fosse criada por ele. É arma carregada guardada,
   não tiro dado.

O teste cobre o que importa hoje: nenhuma concessão a `anon`/`authenticated` em
tabela nenhuma, e o padrão do `postgres` não deixando a próxima nascer aberta.

**Foi testado contra si mesmo.** `GRANT SELECT ON rate_limit TO anon` e a suíte
reprovou por dois caminhos independentes: a verificação de privilégio e o
**contador de verificações**, que acusou que uma verificação não chegou a
rodar. Concessão removida, 32/32 de volta.

### O que fechou a tarefa 7

Os dois endereços passados pelo fundador — **Gmail e Outlook** (o provedor
brasileiro foi cortado: os principais hoje são pagos, e abrir conta só para
isso atrasa sem ganho) — e um endereço de **mail-tester.com**, testados juntos
em 07/08/2026. Resultado no topo deste arquivo.

### Segundo passe do revisor

Ele achou três coisas, e duas estavam no arquivo que eu tinha acabado de
escrever para atender o §3 — o que é o argumento inteiro a favor de um revisor
que não vê a conversa.

**O teste de privilégio tinha o defeito que ele existe para impedir.** A
verificação de "tabela futura" percorria uma lista sem guarda contra lista
vazia, com o contador incrementando fora do laço: zero linhas e ela fechava
4 de 4 tendo comparado nada. Guarda acrescentada.

**A `rate_limit` virou a quinta tabela do papel da autenticação, e dois lugares
ainda diziam quatro.** O fundador não mandou acrescentar a quinta à lista —
mandou **trocar a lista por regra**: o papel enxerga as tabelas que existem para
autenticar e não têm `empresa_id`. A lista é fotografia, a regra é o que manda,
e quem confere é o teste que lê o catálogo. Lista enumerada envelhece a cada
tabela nova, que foi exatamente o que acabou de acontecer.

**O comentário da migration prometia mais do que o teste confere.** Segunda vez
na mesma tarefa, duas linhas abaixo da primeira correção: dizia "toda tabela
futura" onde o teste olha só o padrão do `postgres`. Agora ele separa em voz
alta o que é conferido do que não é.

### O link de recuperação, decidido

**2 horas, fixado no código**, não herdado do padrão da biblioteca — o e-mail
diz o prazo ao cliente, e uma atualização da biblioteca não pode fazer essa
frase virar mentira sozinha. Duas e não uma porque a pessoa pode não abrir o
e-mail na hora.

**Uso único, confirmado no código da biblioteca:** ao redefinir a senha o token
é consumido e a linha some de `verification`. Não foi suposto pelo nome da
função — foi lido.

### Registrado para a tarefa 8

**A tarefa 8 não fecha com o e-mail chegando.** Ela fecha com o **ciclo
inteiro**: o e-mail chega, o link abre a tela, a senha é redefinida, e a pessoa
entra com a senha nova. Hoje o link de recuperação aponta para uma tela que não
existe — ele dá 404, e isso é esperado nesta altura.

**E fecha também com a tela de link expirado**, que precisa dizer que expirou e
oferecer **reenviar em um toque**, sem a pessoa digitar o e-mail de novo. Quem
chega nessa tela já perdeu a senha uma vez; obrigá-la a recomeçar do zero é o
segundo tapa seguido.

**Pendente com o Design:** o rótulo e a forma da pendência de e-mail não
confirmado, para `docs/componentes.md`. Não bloqueia — a dashboard é o item 8.

---

## 07/08/2026 — o revisor, e três regras ditadas pelo fundador

O `/revisar` entrou em uso: subagente que enxerga o diff e os documentos e
**nunca a conversa**, porque quem escreveu passou a sessão se convencendo de
que está certo. Ver `CLAUDE.md` §2, itens 7 a 9.

### Três regras novas no CLAUDE.md — **ditadas pelo fundador**

Registrado porque o revisor não tem como saber, olhando o diff, se uma regra
nova no `CLAUDE.md` foi decidida por quem manda ou redigida por quem escreve —
e o §2 diz que decisão de produto não se inventa. Foram ditadas:

1. **SQL cru só em `src/lib/db` e em `/tests`** (§3).
2. **Precedência entre documentos** — `componentes.md` manda no que a tela
   contém, `navegacao.md` em como se chega e para onde leva (§13).
3. **Contagem de verificações exige o mecanismo, não o formato** (§3, item 4).
4. **Quantas vezes rodar o revisor** — ele roda sobre o trabalho pronto, antes
   do commit; achado da mesma classe de um já resolvido se corrige e se commita
   sem novo passe, achado de classe nova pede outro passe (§2, item 7). Existe
   para o revisar não virar laço: toda correção é diff novo, e diff novo tem
   achado novo.

A ressalva das migrations de `/prisma` também é do fundador, e o argumento
dele está registrado porque muda como a regra se lê: **não é exceção, é
precisão**. A regra mira consulta crua na aplicação; arquivo de migration é
SQL por definição.

### O despacho do `Agent` foi verificado por execução

O revisor apontou duas vezes que não conseguia confirmar, lendo a árvore, se
`Agent` em `allowed-tools` é nome válido. Ele estava certo em apontar: **a
prova existia e não estava escrita.** O despacho rodou de verdade **duas vezes
em 07/08/2026**, com o revisor devolvendo achados nas duas.

A diferença para `effort` e `disallowedTools`, removidos no mesmo commit, é
exatamente essa: lá não havia evidência nenhuma; aqui havia medição, só não
estava registrada.

**Padrão a seguir daqui em diante:** quando o revisor apontar algo que está
verificado mas não documentado, **documente** — não descarte o achado. A
verificação que só existe na cabeça de quem rodou vira configuração não
verificada assim que a sessão fecha.

### A mutação plantada de propósito

Um token de cor fora da lista fechada do `estilo.md` foi plantado no
`globals.css` e o revisor **reprovou por três caminhos independentes**: cor
fora do sistema (§8), token sem consumidor (§6) e conceito inexistente nos
documentos (§2, item 5). Mutação removida em seguida. Mesmo raciocínio da
suíte de testes: revisor que nunca reprovou não provou nada.

---

## 07/08/2026 — tarefa 6: os testes de isolamento permanentes

`npm test` — **25 verificações, 2 arquivos**, rodando contra o banco de verdade
com os papéis de verdade. Vitest 4.1.

### Os dois testes

**`tests/isolamento/schema.test.ts` — a prova mecânica.** Percorre o **catálogo
do Postgres**, não o schema do Prisma: o schema diz o que queríamos, o catálogo
diz o que existe, e é no catálogo que a política vai ou não recusar. Para cada
tabela exige RLS ativado, **forçado** e pelo menos uma política. E exige que
toda tabela tenha `empresa_id` **ou** esteja numa lista de exceções conferida
por **igualdade exata** — nos dois sentidos, então tanto tabela nova sem
`empresa_id` quanto exceção que deixou de existir derrubam o teste.

É o §3 virado máquina: quem acrescentar tabela sem isolamento não passa daqui.

**`tests/isolamento/vazamento.test.ts` — a empresa A tentando alcançar a B.**
Roda pelo `lib/db`, com o papel `fretigate_app`. Cobre listar, buscar por id,
buscar **por e-mail com `findUnique`** — o caminho que mais escapa de revisão,
porque quem escreve acha que chave única dispensa filtro —, alterar, e gravar na
empresa alheia.

Os quatro requisitos do §3 estão lá: o contraste (o mesmo dado visto por
`postgres`, que ignora RLS), concorrência real compartilhando pool, os três
jeitos de não ter contexto, e a contagem de cobertura.

### A suíte foi testada contra si mesma

Suíte que nunca ficou vermelha não provou nada. Desliguei o RLS de `usuario` de
propósito e rodei de novo. **Três falhas, todas as certas:**

| Falhou | Camada que pegou |
|---|---|
| `usuario` tem RLS ativado e forçado | estrutural — o catálogo |
| o usuário da empresa B é invisível | comportamental — `findUnique` enxergou |
| gravar usuário na empresa B é recusado | comportamental — `WITH CHECK` aceitou |

As duas camadas pegaram **de forma independente**. RLS restaurado e conferido
(`rls=true forcado=true`), suíte de volta em 25/25.

### Um defeito do teste, achado pela mutação

A primeira versão usava 20 pedidos simultâneos no teste de concorrência. Com o
RLS quebrado, ele falhou com `Unable to start a transaction in the given time` —
**esgotamento do pool**, não vazamento. O pool do driver tem dez conexões; pedir
vinte transações ao mesmo tempo estoura a espera antes de qualquer consulta
rodar.

Passava por sorte de agendamento. Baixado para dez, com o motivo escrito no
código. É a mesma família dos outros erros de teste do dia: o teste medindo o
próprio estrago em vez do produto.

### Decisões

**Vitest**, com `fileParallelism: false`. Os testes semeiam empresas no mesmo
banco, e dois arquivos em paralelo disputariam linhas — o resultado dependeria
de agendamento, que é a pior espécie de teste intermitente: o que some quando
você vai olhar.

**`/tests` fora de `/src`**, registrado no `CLAUDE.md` §6. Não é código que vai
ao ar.

**Identificador próprio por execução**, derivado do relógio, para duas rodadas
simultâneas não colidirem.

### A trava de banco — commit `470fb4f`

A suíte não só semeia: ela **apaga**. O `afterAll` roda `DELETE` sem perguntar
nada. Hoje o estrago possível é zero, porque só existe o banco de
desenvolvimento. No dia em que existir produção, um `.env` apontado para o lugar
errado — ou uma variável herdada de outro terminal — faz `npm test` apagar dado
de cliente.

A trava roda antes de qualquer arquivo de teste ser carregado, que é o único
ponto que pega todos sem depender de alguém lembrar de chamar. **Falha
fechada:** não reconhecer o endereço também recusa. O erro fácil seria "achei um
identificador e ele não está na lista, então recuso" — isso aprovaria por
omissão tudo que não tem o formato esperado. A regra é recusar por não
reconhecer, nunca aprovar por não encontrar.

A lista de projetos permitidos fica **no repositório, não no `.env`**: se a
expectativa morasse no `.env`, o mesmo engano que troca o endereço trocaria a
expectativa junto, e a trava aprovaria o desastre.

**Conferido em cinco casos — à mão, uma vez só.** Isso não é prova permanente:
nada garante que a trava continue fechando amanhã, e ela é justamente o que
impede `npm test` apagar dado de cliente. Virou tarefa própria, a 9b.

### Ponto a revisitar

**Não existe banco de teste separado.** A suíte semeia e apaga no banco de
desenvolvimento. Funciona porque cada execução usa identificadores próprios e
limpa no fim, e agora a trava acima impede que isso aconteça no lugar errado —
mas continua frágil por natureza. Quando o custo justificar, um projeto Supabase
só para teste resolve.

### Próximo passo — tarefa 7

Better Auth e `lib/auth`: sessão, exigir sessão, exigir dono, e rate limit. Com
o bloqueio já registrado — **não fecha sem um e-mail de recuperação real
chegando à caixa de entrada**.

---

## 06/08/2026 — tarefa 5: `lib/db`, o filtro que não dá para esquecer

Os dois bloqueios do inventário estão **fechados** (abaixo), e a tarefa 5 está
pronta e provada.

### Os dois bloqueios, fechados

**Bloqueio 1 — tela Entrar.** O Design corrigiu na fonte. A tabela agora diz
campos **E-MAIL** e **SENHA**, principal **Entrar**, secundária **Criar conta**,
texto **Esqueci a senha** — e registra por escrito que *"o app nunca envia
mensagem sozinho, então não existe código por WhatsApp aqui"*. `Esqueci a senha`
virou link por e-mail. Bate com o schema da tarefa 3. **A tarefa 8 está
destravada.**

**Bloqueio 2 — os três valores.** Unificados, com o `estilo.md` prevalecendo:
respiro interno `11px` em cima e embaixo, elevação do (+) `17,5px`, e `100,5px`
do topo do (+) até a base. O `componentes.md` registra que estava arredondando.
Os dois documentos agora dizem a mesma coisa, conferido linha a linha.

### O que a tarefa 5 entrega

`src/lib/db/index.ts` — **`db(empresaId)`**. Toda operação vira
`$transaction([set_config, consulta])` sozinha. Quem escreve
`banco.empresa.findMany()` não passa filtro nenhum e mesmo assim só recebe a
própria empresa. É a frase do §3 — "tem que ser impossível esquecer" — em
código.

Também: **`emTransacao()`** para várias consultas atômicas entre si, e recusa de
`empresa_id` malformado antes de chegar ao banco, só para o erro aparecer
legível em vez de virar erro de conversão de tipo três camadas abaixo.

`src/lib/db/sem-filtro-de-empresa.ts` — a saída de emergência do Better Auth.
Nome longo e feio de propósito: tem que saltar aos olhos numa revisão. **Não é
um cliente com poderes de administrador** — conecta pelo `fretigate_auth`, que
não ignora RLS e não enxerga `empresa`.

### Provado — 14 de 14 verificações

Com as conexões reais dos dois papéis, não com `postgres`. O filtro saindo
sozinho em `findMany`, `findUnique`, `count` e `updateMany`; o contraste (o
mesmo código com a outra empresa devolve a outra empresa, e só ela); escrita na
empresa alheia recusada pelo banco; `emTransacao` filtrando as duas consultas;
`empresa_id` malformado recusado, inclusive um com tentativa de injeção; e a
saída de emergência achando usuário pelo e-mail sem contexto **e falhando ao
ler `empresa`**.

### O defeito que virou regra no `CLAUDE.md` §3

A primeira execução deste teste imprimiu **"VEREDITO: o lib/db filtra sozinho"
sem ter verificado nada**. Uma exceção estourou na primeira linha e foi engolida
por um `finally` com `process.exit`, que suprime o erro. O contador de falhas
ficou em zero e a última linha dizia que estava tudo certo.

Se eu olhasse só a última linha, teria fechado a tarefa 5 como aprovada com o
banco inalcançável. Foi o terceiro teste do dia a falhar por defeito próprio, e
o único que falhou **para o lado perigoso**.

Virou regra: **§3, item 4 — todo teste conta quantas verificações executou e
reprova se forem menos que o esperado.** Aplicada já neste teste, e ela pegou um
erro na primeira tentativa: eu tinha declarado 16 esperadas e existem 14. Errou
para o lado seguro, que é o certo.

### As duas pendências, decididas

**A tela `Criar conta` ganha o campo SEU NOME**, obrigatório, antes de SEU
TELEFONE. Primeiro nome basta. Nem preencher com o nome da transportadora, nem
tornar a coluna nula: é esse campo que distingue os dois usuários no registro de
"cobrado por" e na tela de Usuários. Registrado em `docs/especificacao.md` §6.

**Chegou corrigido por exportação**, com `SEU NOME` entre SENHA e SEU TELEFONE.

### Vocabulário: "empresa" dentro do produto, "transportadora" fora

Rótulo do cadastro passa a ser **NOME DA EMPRESA**. O princípio está no topo de
`docs/especificacao.md` e resumido no `CLAUDE.md` §8.

O motivo não é estética: o `tipo_operacao` já prevê guincho e reboque desde o
modelo de dados. **Rótulo é a amarra mais barata de criar e a mais cara de
tirar** — quando o primeiro guincheiro entrar, "Nome da transportadora" na tela
de cadastro diz a ele que o produto não é para ele, e nenhuma tabela precisava
mudar para isso acontecer. A entidade se chama `Empresa` no banco desde sempre;
a interface passa a dizer a mesma coisa.

**O schema não muda.** `nome_fantasia` já é neutro.

~~**Pendente, e vai junto com a correção da tarefa 10:** `docs/navegacao.md`
linha 50 ainda diz "Nome da transportadora". Não editei porque as linhas 49-51
desse arquivo **já estão** na fila da tarefa 10.~~ — **RESOLVIDO em
07/08/2026.** O rótulo foi corrigido separado do mecanismo: vocabulário errado
não é descrição vencida, e esperar a tarefa 10 deixaria o §8 sendo contrariado
por escolha. Ver a entrada de 07/08 no topo.

**Provedor de e-mail: RESOLVIDO no mesmo dia.** Resend, domínio
`fretigate.com` comprado, subdomínio `envio.fretigate.com` verificado,
remetente `contato@envio.fretigate.com`. `RESEND_API_KEY` e `EMAIL_REMETENTE`
no `.env`. Entrou no `CLAUDE.md` §5 (stack) e o Resend virou subprocessador
declarado no §11, que agora tem a tabela completa: Supabase, Vercel, Resend e o
fornecedor de IA ainda a decidir.

### 🔴 A tarefa 7 NÃO fecha sem envio conferido de verdade

Domínio verificado no painel do provedor prova que o DNS está certo — **não**
prova que a mensagem chega. Conteúdo, remetente e reputação também decidem, e
nada disso aparece no painel.

Então a tarefa 7 só é dada por pronta depois de **um e-mail de recuperação de
senha real chegar à caixa de entrada**, disparado pelo fluxo do produto e não
por um teste de API. Se cair em spam, a tarefa não está pronta, mesmo com todo
o código funcionando.

O motivo é o mesmo que está no §14: **recuperação que cai em spam é cliente
perdido em silêncio.** Ele não abre chamado, não reclama — some, e a métrica
some junto.

**Resolvido: `Reply-To` separado do remetente.** A mensagem sai de
`contato@envio.fretigate.com` e responde para `contato@fretigate.com`, no
domínio raiz, redirecionado pelo registrador para a caixa de quem lê. No Resend
não muda nada — o remetente continua sendo o do subdomínio verificado.

O endereço de resposta fica em **`EMAIL_RESPOSTA`**, variável de ambiente, nunca
literal no código: ele vai mudar quando houver caixa própria, e trocar endereço
de contato não pode exigir alterar código e publicar de novo.

**O plano B não foi preciso.** O redirecionamento está configurado na
**Cloudflare Email Routing**, com catch-all: `contato@fretigate.com` cai na
caixa do fundador. `EMAIL_RESPOSTA=contato@fretigate.com` já está no `.env`.

Com isso o risco que estava registrado aqui **fechou**: o endereço de contato é
do domínio do produto, não pessoal, e trocar para quem lê é mudar uma regra de
redirecionamento — não mexer em código nem em variável.

**A Cloudflare entrou na tabela de subprocessadores do `CLAUDE.md` §11.** Ela
passa a ver o conteúdo das respostas que chegam, e quem responde pedindo ajuda
costuma colar dado do próprio negócio na mensagem. Pela regra do próprio §11,
subprocessador novo entra na tabela **e** na política, no mesmo commit.

**O Google entrou junto na tabela.** A caixa que recebe o redirecionamento é
Gmail, e ela **armazena** o conteúdo, não só o vê passar. Se a Cloudflare entra
por ver de passagem, quem guarda entra com mais razão. **Essa dependência sai
quando existir caixa própria no domínio** — e é uma das razões para migrar.

**Catch-all fica como está, e a troca é ponto a revisitar.** O domínio é novo e
não está em lista de spam nenhuma; o problema de endereço curinga aparece
quando ele virar conhecido, e aí trocar por regras nominais (`contato@`,
`suporte@`) leva dois minutos. Por ora o ganho é maior: quem escrever para um
endereço que supôs existir não fica sem resposta.

**E o `MX` de recebimento fica no domínio raiz enquanto o `SPF`/`DKIM` de envio
fica no `envio.` — as duas coisas não se atrapalham.** Foi por isso que o envio
nasceu em subdomínio separado.

### Próximo passo — tarefa 6

Testes de isolamento permanentes: o que lê o próprio schema e o de vazamento
entre duas empresas. Agora com os quatro requisitos do §3 por escrito, incluindo
a contagem de verificações.

---

## 06/08/2026 — `docs/componentes.md` completo, e o que ele destravou

O Design preencheu a especificação de ícones, completou a tabela "Onde cada tela
usa o quê" com as 15 telas que faltavam, e a barra de navegação entrou como item
10 do inventário, com a folga de rolagem unificada num valor único.

### Destravou

**A tarefa 8 não está mais bloqueada** — era o bloqueio conhecido desde o começo
do item 1: `Entrar`, `Criar conta` e `Termos` não estavam na tabela, e o
`CLAUDE.md` §8 proíbe botão fora do inventário. Agora estão.

Duas correções que estavam na fila da **tarefa 10** já vieram resolvidas: as
duas seções numeradas 07 (agora 07 aviso do sistema, 08 FretiNews) e a tabela
final sem título próprio.

> **Decidido em 06/08/2026, e os dois viraram bloqueio formal.** O `estilo.md` e
> o `componentes.md` são **mantidos pelo Design e exportados**. Editar qualquer
> um dos dois à mão aqui é trabalho perdido: a próxima exportação reverte — foi
> exatamente o que aconteceu hoje, quando o `componentes.md` voltou sozinho a
> uma versão antiga. **As duas correções abaixo são pedidas na fonte do Design,
> não aplicadas neste repositório.**

### ✅ BLOQUEIO 1 (FECHADO) — a tela Entrar reintroduz uma decisão já derrubada

A tabela nova diz, para a tela `Entrar`:

> principal **Receber código no WhatsApp**, com estado carregando

Isso é login por código no WhatsApp, que **exige envio automático de mensagem
por API de WhatsApp** — item explicitamente proibido no `CLAUDE.md` §12. É a
mesma coisa que já tinha sido derrubada nesta sessão, quando `docs/navegacao.md`
linhas 49-51 descreviam telefone e código: a decisão registrada foi **login por
e-mail e senha**, e o schema da tarefa 3 foi construído em cima dela — `usuario`
tem `email` único, e o Better Auth guarda o hash em `account` com o provedor
`credential`.

**Decidido: o login continua e-mail e senha.** A API oficial de WhatsApp é
proibida pelo §12, e o schema da tarefa 3 já está no banco em cima dessa
decisão. **A tabela vai ser corrigida na fonte do Design.**

**Bloqueia a tarefa 8** até a correção chegar por exportação. As tarefas 5, 6, 7
e 9 não desenham tela e seguem sem depender disto.

### ✅ BLOQUEIO 2 (FECHADO) — três valores divergindo do `docs/estilo.md`

O `CLAUDE.md` §8 diz que valor sai de `docs/estilo.md`. O `componentes.md` novo
diz que as medidas dele foram tiradas do DOM, não estimadas. Nos três pontos
abaixo os dois documentos discordam:

| | `docs/estilo.md` | `docs/componentes.md` |
|---|---|---|
| Respiro interno da barra | `11px` em cima e embaixo (igual) | `12px` no topo, `11px` na base |
| Elevação do (+) | `17,5px` | `18px` |
| Topo do (+) até a base | `100,5px` | `101px` |

Os dois últimos são a mesma divergência se propagando (`26 + 57 + 17,5 = 100,5`
contra `26 + 57 + 18 = 101`).

O que **não** diverge, conferido: a folga de rolagem
(`max(138px, calc(env(safe-area-inset-bottom) + 132px))`), o aviso do sistema
(`max(112px, …)`), a área segura de 66px e a espessura de traço unificada em
1.8px. Os três valores antigos de folga (`132`, `142`, `150`) eram por tela
dentro do `componentes.md`; o `estilo.md` já tinha só o unificado.

Há também uma incoerência interna a resolver: o `componentes.md` chama o respiro
de "igualados de propósito" e em seguida dá dois números diferentes.

**Decidido: não editar o `estilo.md` aqui.** A correção é pedida na fonte do
Design, pelo mesmo motivo do bloqueio 1. O `componentes.md` foi medido no DOM,
então o provável é que o `estilo.md` tenha envelhecido — mas quem confirma isso
é o Design.

**Bloqueia qualquer tela que use a barra de navegação**, ou seja, praticamente
todas: enquanto os dois documentos discordarem, não há valor único de onde
tirar, e o §8 proíbe inventar. Não bloqueia as tarefas 5, 6, 7 e 9.

### O que mudou no que já estava escrito

- **`CLAUDE.md` §8** — a folga de rolagem passou a dizer que o valor é **único
  para todas as telas**, com o motivo (foi assim que nasceram os três valores
  que precisaram ser unificados). E ficou registrado que o salvar **sobe acima
  do teclado numérico** em vez de só "não ser coberto".
- **`/auditar-tela`** — atualizado para o inventário de dez itens numerados,
  para a tabela de telas agora completa (tela fora dela é lacuna, não licença),
  e para a seção nova "Auditoria da regra de posição", que traz requisitos
  extras por tela, como a ação principal do detalhe da cobrança ter que ficar
  visível sem rolar.

---

## 06/08/2026 — tarefa 4 (parte 2): papel da autenticação, e um buraco fechado

Migrations `20260806222818_papel_da_autenticacao` e
`20260806223138_fecha_acesso_pela_api_publica`.

### 🔴 O buraco encontrado no caminho

O Supabase concede, por **privilégio padrão**, todos os privilégios em toda
tabela nova de `public` aos papéis `anon`, `authenticated` e `service_role`.
`anon` é o papel da API REST pública, usada com a chave que **por desenho fica
no navegador**.

Tabela criada por migration do Prisma **não ganha RLS sozinha**. Resultado:
`session`, `account` e `verification` — token de sessão e hash de senha —
estavam alcançáveis por quem tivesse a chave pública do projeto.

Isso não foi procurado: apareceu ao listar quem tinha privilégio em cada tabela,
durante outra verificação. Vale como lição — **conferir o estado real do banco
encontra coisa que ler o próprio código nunca encontraria**.

Fechado em duas camadas, de propósito:

1. `REVOKE` nas tabelas que já existem, e `USAGE` no schema também.
2. `ALTER DEFAULT PRIVILEGES` para as que **ainda não existem** — sem isso, a
   próxima migration recriaria o buraco em silêncio, e o produto inteiro ainda
   está por ser escrito.
3. RLS `ENABLE` + `FORCE` também em `session`, `account` e `verification`, com
   política nomeada só para `fretigate_auth`.

`service_role` continua com privilégio. É o papel da chave secreta, que nunca
vai ao navegador, e tem `BYPASSRLS` de qualquer forma — quem tem essa chave já
tem o banco. Não é o mesmo risco.

### Os três papéis

| Papel | Enxerga | Não enxerga |
|---|---|---|
| `fretigate_app` | `empresa` e `usuario`, **só do contexto**, sem `DELETE` | `session`, `account`, `verification` |
| `fretigate_auth` | tabelas do Better Auth e `usuario` (qualquer empresa) | **nenhuma** tabela de domínio |
| `postgres` | tudo | — por isso **só migrations** |

`fretigate_auth` tem política **nomeada** em `usuario` em vez de `BYPASSRLS`,
porque no login não existe contexto de empresa: só se sabe de que empresa a
pessoa é depois de achá-la pelo e-mail. A diferença prática é auditoria — a
permissão aparece em `pg_policies` em vez de ser um atributo invisível que
desliga o motor para tudo.

### Provado

Papel por papel, em transação desfeita, tabela terminando com zero linhas: o
`app` não lê hash de senha nem sessão; o `auth` acha usuário pelo e-mail sem
contexto mas **não lê `empresa`** e não apaga usuário; e a política do `auth`
**não afrouxou nada** para o `app`, que continua enxergando um usuário e não
dois. O padrão de criar empresa foi provado nos três casos: sem contexto
recusa, com o contexto do id que vai nascer passa, com o contexto de outra
empresa recusa.

**O teste falhou duas vezes antes, e nas duas a culpa era dele.** Da segunda,
por não saber que no Postgres um comando que falha aborta a transação inteira —
todas as negações seguintes voltavam `25P02` em vez do código real, e o teste
reprovava coisa certa. Corrigido com ponto salvo por tentativa. Fica anotado
para a tarefa 6: **teste de negação precisa isolar cada tentativa**, senão mede
o próprio estrago.

### O que subiu para o `CLAUDE.md` §9

A armadilha de criar empresa com `WITH CHECK`, com o atalho errado escrito por
extenso, e a tabela dos três papéis. Não fica só aqui: quem construir a tarefa 8
lê o §9, não o diário.

---

## 06/08/2026 — tarefa 4: RLS, papel da aplicação e políticas

Migrations `20260806214555_rls_papel_da_aplicacao` e
`20260806214755_permite_assumir_o_papel_da_aplicacao`.

### 🔴 FALTA UM PASSO MANUAL, e sem ele nada disso vale

**A aplicação ainda conecta como `postgres`, e `postgres` tem
`rolbypassrls = true`.** Papel com esse atributo **ignora** política de RLS —
nem `ENABLE` nem `FORCE` mudam isso. Foi medido antes de escrever qualquer
política, e é a razão de existir um papel dedicado.

O papel `fretigate_app` já existe, com `NOBYPASSRLS`, e as políticas já
funcionam com ele (provado abaixo). Falta só ele ganhar senha e a aplicação
passar a usá-lo. **Isso não está no repositório de propósito: senha não entra
em migration versionada (§4).**

Dois passos, do fundador:

1. No editor de SQL do Supabase, com uma senha escolhida por ele:

   ```sql
   ALTER ROLE fretigate_app WITH LOGIN PASSWORD 'a-senha-escolhida';
   ```

2. No `.env`, trocar **só o usuário e a senha** de `DATABASE_URL` — host, porta
   e banco continuam iguais:

   ```
   postgresql://fretigate_app.ysldmzvszjxdgcbtaurh:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```

   `DIRECT_URL` **continua como `postgres`**: migration precisa criar tabela, e
   o papel da aplicação não pode ter esse poder.

Enquanto isso não acontecer, o banco está protegido no papel e desprotegido na
prática.

### O que a migration fez

**Papel `fretigate_app`** — `NOBYPASSRLS`, `NOLOGIN`, não é dono das tabelas.

**Privilégios deliberadamente estreitos:**

- `SELECT, INSERT, UPDATE` em `empresa` e `usuario`. **Sem `DELETE`** — o §7 diz
  que nada é apagado, e arquivar é `UPDATE`. Não conceder o privilégio
  transforma a regra em impossibilidade.
- **Nenhum privilégio** em `session`, `account` e `verification`. Elas guardam
  hash de senha e token, não têm `empresa_id`, e nenhuma política de empresa faz
  sentido nelas. Quem fala com elas é o Better Auth, por conexão separada — a
  saída de emergência da tarefa 5, restrita a `lib/auth`. Efeito: o papel da
  aplicação **não consegue ler hash de senha**, mesmo que alguém escreva a
  consulta.

**RLS `ENABLE` + `FORCE`** em `empresa` e `usuario`, com política de falha
fechada usando `nullif(current_setting('app.empresa_id', true), '')::uuid`, com
`USING` **e** `WITH CHECK`.

**`atualizado_em` ganhou valor padrão no banco.** Sem isso, todo `INSERT` em SQL
cru falhava com violação de não-nulo — o das migrations e o dos testes.

### Provado, não suposto

Tudo dentro de uma transação desfeita no fim; a tabela terminou com zero linhas.

| Verificação | Resultado |
|---|---|
| **O contraste** — como `postgres`, que ignora RLS | enxerga as **2** empresas. O vazamento existe sem a proteção |
| Com o papel da aplicação, contexto da empresa A | enxerga **1** empresa e **1** usuário, os próprios |
| Pedir a empresa B pelo id | **zero** linhas |
| Gravar usuário na empresa B (`WITH CHECK`) | recusado, `42501` |
| Alterar a empresa B | **zero** linhas afetadas |
| Contexto nulo | **zero** linhas |
| Contexto string vazia | **zero** linhas |
| Contexto inválido | erro `22P02` — fecha |
| `DELETE` na própria empresa | recusado, `42501` |
| Ler `account` com o papel da aplicação | recusado, `42501` |

O contraste é o item que dá sentido aos outros: sem ele não haveria como saber
se o teste mede alguma coisa (§3).

### Percalço

`postgres` não conseguia assumir `fretigate_app` com `SET ROLE` — sem isso, os
testes rodariam como `postgres` e passariam sempre, medindo nada. Resolvido pela
segunda migration. Migration aplicada não se edita, por isso são duas.

### Próximo passo — tarefa 5

`lib/db`: cliente escopado, extensão que injeta o filtro, `set_config` por
transação e a saída de emergência para `lib/auth`.

---

## 06/08/2026 — tarefa 3: schema de Empresa, Usuario e Better Auth

Migration `20260806212753_base_empresa_usuario_auth` aplicada. Seis tabelas no
banco: `empresa`, `usuario`, `session`, `account`, `verification` e o controle
do próprio Prisma.

### ⚠ As tabelas ainda NÃO têm RLS

`rls=off` em todas, conferido no catálogo do Postgres. **A proteção é a tarefa
4**, e o teste que a prova é a tarefa 6. Enquanto isso, o isolamento do
`CLAUDE.md` §3 não está garantido pelo banco.

É aceitável agora porque não existe dado nem código de aplicação lendo — as duas
tabelas estão com zero linhas, conferido. **Não deve ficar assim por dias, e
nenhum dado real entra antes da tarefa 4.** Se for parar, parar depois da 4, não
entre a 3 e a 4.

### Decisões tomadas nesta fatia

**`Usuario` é a tabela `user` do Better Auth**, com os campos em português. A
configuração da biblioteca (tarefa 7) faz o mapeamento por `user.fields`:
`name`→`nome`, `emailVerified`→`email_verificado`, `image`→`avatar_url`,
`createdAt`→`criado_em`, `updatedAt`→`atualizado_em`. O §7 pede domínio em
português, e usuário é domínio.

**`session`, `account` e `verification` ficam em inglês, campo por campo.** Não
são domínio, e renomear infraestrutura de biblioteca só cria atrito em toda
atualização. Os campos saíram de `@better-auth/core/dist/db/get-tables.mjs`,
lidos do pacote instalado — nenhum escrito de memória.

**Nome de tabela e coluna em minúsculo com underscore.** As políticas da tarefa
4 são SQL escrito à mão, e identificador em maiúsculo obrigaria aspas em toda
linha — que é onde o erro de digitação se esconde.

**`empresa_id` é `uuid`, não texto.** É a coluna que a política vai comparar com
`nullif(current_setting('app.empresa_id', true), '')::uuid` (§9). Conferido no
banco: `usuario.empresa_id -> uuid`.

**`usuario.id` é texto, não uuid.** Quem gera esse identificador é o Better
Auth, com o formato dele. Forçar uuid criaria dependência da configuração da
tarefa 7 para a migration da tarefa 3 funcionar.

**`termos_aceitos_em` e `termos_versao` são obrigatórios.** O aceite acontece no
cadastro, então não existe `Empresa` sem aceite. A regra fica no banco, não só
na tela.

### As duas pendências foram fechadas no mesmo dia

Migration `20260806213650_planos_status_e_cnpj_unico`. Os valores vieram do
fundador e estão em `docs/especificacao.md` §6.

- `plano` — `gratuito` | `pago`
- `periodicidade` — `mensal` | `anual`, nula no gratuito. **Campo novo**, que o
  §6 não previa: é preciso saber quem está no mensal para oferecer o anual e
  para a comissão do afiliado.
- `status_assinatura` — `ativa` | `inadimplente` | `vencida` | `encerrada`
- `cnpj` — único, nulo permitido

**Duas restrições no banco, não só no documento.** `empresa_plano_coerente`
(gratuito sempre ativa e sem periodicidade; pago sempre com periodicidade) e
`empresa_cnpj_key`. Escritas à mão na migration — o Prisma não modela `CHECK`.

**Decisão que o fundador delegou: empresa arquivada NÃO libera o CNPJ.** Índice
parcial por `arquivado_em` reabriria o buraco que a restrição existe para
fechar — bastaria arquivar e cadastrar de novo para zerar o plano gratuito.
Restrição simples também não tem significado que muda com o estado de outra
coluna. Quem volta desarquiva a linha que já existe.

### Conferido que as restrições recusam, não só que existem

Todos os casos, dentro de uma transação desfeita no fim — a tabela continua com
zero linhas. Gratuito com periodicidade, gratuito inadimplente, gratuito
vencida e pago sem periodicidade: recusados. CNPJ repetido: recusado. CNPJ da
empresa arquivada: recusado. Duas empresas sem CNPJ: aceitas.

**A primeira versão desse teste passou pelo motivo errado** — as recusas vinham
de um erro de digitação no próprio teste (`42703`, coluna inexistente), não das
restrições. Foi corrigido para exigir que a recusa venha da restrição
**esperada**, pelo nome. É exatamente o defeito que o `CLAUDE.md` §3 manda
evitar, e apareceu no mesmo dia em que a regra foi escrita.

### Achado para a tarefa 4

**`atualizado_em` não tem valor padrão no banco** — quem preenche é o Prisma, na
aplicação. Todo `INSERT` em SQL cru precisa informar a coluna, ou falha com
violação de não-nulo. Vale para as migrations e para os testes de isolamento.
Candidato a ganhar `@default(now())` junto do `@updatedAt` na tarefa 4.

### Fora desta fatia, de propósito

`Convite` (item 10), `Municipio` (item 2, por isso `municipio_id` fica sem
chave estrangeira), e os campos de `Empresa` que pertencem a itens posteriores
— `patio_*`, `prazo_padrao_dias`, `chave_pix`, `dados_bancarios`,
`modelo_mensagem_*`, `afiliado_id`. Coluna sem tela que a preencha é peso morto.

**A tabela `rateLimit` do Better Auth não entrou.** Ela só existe quando o rate
limit usa armazenamento em banco, que é a decisão da tarefa 7 (§4 exige rate
limit, e contador em memória não funciona em serverless). Entra lá, com RLS no
mesmo commit, conforme o §3.

### Conferência

Feita **direto no catálogo do Postgres**, não no que o Prisma reportou: tabelas,
colunas, tipos, o enum `papel_usuario` e a contagem de linhas.

**O MCP do Supabase não pôde ser usado** — continua em `Needs authentication`. A
autorização por `/mcp` ainda não foi concluída. A conferência foi feita por
consulta de leitura pela mesma conexão da aplicação.

### Próximo passo — tarefa 4

RLS: papel da aplicação sem `BYPASSRLS`, `ENABLE` e `FORCE ROW LEVEL SECURITY`,
e as políticas com `USING` e `WITH CHECK`, em SQL na migration. O requisito de
falha fechada está no `CLAUDE.md` §9.

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

> Este requisito **subiu para o `CLAUDE.md` §9**, junto das demais decisões de
> arquitetura, e as exigências da suíte de testes permanente subiram para o §3.
> A fonte da regra é o `CLAUDE.md`, que é lido em toda sessão. O que está aqui é
> só o registro de onde ela veio.

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
9b. **Teste permanente da trava de banco.** Hoje a trava foi conferida à mão,
    uma vez, em cinco casos — e verificação manual não roda de novo amanhã. Pelo
    mesmo argumento do `CLAUDE.md` §3 ("teste que prova hoje e não roda amanhã
    não protege contra a regressão de amanhã"), ela precisa de teste que rode
    junto com a suíte. O que se prova: endereço permitido passa, endereço
    desconhecido recusa, e **formato irreconhecível também recusa** — este
    último é o caso que separa falha fechada de falha aberta. Vai junto da
    tarefa 9 porque as duas são trava de infraestrutura, não de produto
9c. **Privilégio de execução de função, para `anon`/`authenticated`.**
    Achado na tarefa 8: o Postgres concede `EXECUTE` a `PUBLIC` por padrão em
    função nova (diferente de tabela, que já nasce fechada desde a migration
    `20260806223138_fecha_acesso_pela_api_publica`) — e `PUBLIC` alcança todo
    papel, `anon`/`authenticated` incluídos, mesmo com o `REVOKE` nomeado que
    essa migration já faz para os dois. `reverter_cadastro_incompleto`
    (tarefa 8) foi fechada na mão; a próxima função nasce aberta se alguém
    esquecer. Duas partes, as duas obrigatórias — mesmo padrão que já valeu
    para tabela, e pelo mesmo motivo: **prevenir sozinho** some quando
    alguém contorna ou esquece; **testar sozinho** só avisa depois do fato.
    - **Prevenir**: `ALTER DEFAULT PRIVILEGES ... REVOKE ALL ON FUNCTIONS
      FROM PUBLIC` (e, por clareza, de `anon`/`authenticated` também, mesmo
      que `PUBLIC` já cubra os dois) — função nova nasce fechada, do mesmo
      jeito que tabela nova já nasce.
    - **Detectar**: `tests/isolamento/privilegios.test.ts` passa a conferir
      `information_schema.routine_privileges` (função), não só
      `role_table_grants` (tabela) — mesma forma, mesmo contraste, mesma
      contagem de verificações.
9d. **`privilegios.test.ts` só confere ausência, nunca presença.** Achado
    no `/revisar` da tarefa 9c: as verificações de "tabela/função futura não
    nasce aberta" conferem que `anon`/`authenticated`/`PUBLIC` NÃO aparecem no
    privilégio padrão — nunca que `service_role` aparece, que é o que o
    `CLAUDE.md` §4 promete ("service_role continua com privilégio, decisão,
    não esquecimento"). Hoje isso só foi confirmado à mão, por consulta direta
    ao banco (`{postgres=X/postgres,service_role=X/postgres}`), não por teste
    que rode de novo amanhã. Vale para os dois — tabela (`padraoFuturo`) e
    função (`padraoFuturoFuncao`) — porque o buraco é o mesmo padrão nos dois
    lugares, não uma regressão desta tarefa. Adiado de propósito: mesma
    correção, um teste só, depois que alguém decidir a forma (provavelmente
    uma verificação extra dentro de cada `it` já existente, não um `it` novo).
10. ~~Correções nos documentos~~ — RESOLVIDO em 08/08/2026, ver entrada no
    topo deste arquivo. A pendência do Storage segue em aberto, fora do item
    1 (ver "Pendências fora do item 1" logo abaixo)

### Bloqueios conhecidos

~~**Tarefa 8 está travada pelo `docs/componentes.md`**~~ — **resolvido.** O
Design completou a tabela "Onde cada tela usa o quê" e a especificação de
ícones. Ver a entrada de 06/08/2026 no topo deste arquivo.

~~**A tarefa 8 continua bloqueada, mas por outro motivo:** a tabela nova descreve
a tela `Entrar` com **"Receber código no WhatsApp"**, que exige envio automático
por API de WhatsApp — proibido pelo `CLAUDE.md` §12, e contrário à decisão de
login por e-mail e senha em cima da qual a tarefa 3 já foi construída.~~ —
**RESOLVIDO em 06/08/2026.** O Design corrigiu na fonte: `docs/componentes.md`
descreve a tela `Entrar` com campos **E-MAIL** e **SENHA**, e registra por
escrito que o app nunca envia mensagem sozinho, então não existe código por
WhatsApp ali. Conferido linha a linha. **A tarefa 8 não tem mais bloqueio.**

Sobra só um resíduo de documento, já previsto: em `docs/navegacao.md`, a linha
da tela `Entrar` ainda cita "Código no WhatsApp". Está marcada com ⚠️ ali, e o
que ⚠️ significa é que a descrição não está em vigor. Não bloqueia nada — é
correção de texto, na tarefa 10. (Aqui havia um número de linha; saiu porque
número de linha envelhece calado — duas linhas acrescentadas no topo do arquivo
já o tinham deixado errado no mesmo commit.)

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
