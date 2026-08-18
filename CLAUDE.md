# CLAUDE.md — FretiGate

Lido automaticamente em toda sessão. É a fonte de verdade das decisões do
projeto. Se algo aqui conflitar com o que eu pedir no chat, me avise antes de
executar.

Versão de 07/08/2026. Substitui a anterior por inteiro.

---

## 1. O que é o FretiGate

SaaS de gestão para transportadoras de carga pequenas (4 a 10 veículos) no
Brasil. Venda 100% autoatendida, por tráfego pago direto ao checkout, sem
demonstração e sem vendedor.

**A dor:** o dono manda a ordem ao motorista pelo WhatsApp, o motorista executa
e responde com foto, e só dias depois ele senta e reconstrói tudo para lançar no
sistema. No caso real que originou o produto, ele paga mais de R$ 200/mês e
tinha 8 fretes do mês sem lançar.

**A tese do produto:** o frete nasce **no momento da ordem**, não depois da
execução. Se o registro existe quando ele já sabe tudo — cliente, carga, rota,
motorista e valor — o trabalho de reconstrução desaparece.

**A métrica que manda em tudo:**

> Lançar um frete, do celular, em **até 30 segundos**.

Qualquer decisão técnica ou de interface que aumente esse tempo está errada,
por mais elegante que seja.

---

## 2. Padrão de trabalho

Sou fundador e CEO. Eu decido e defino o produto. **Eu não escrevo código —
você escreve.** O padrão é o meu.

- Escolha técnica é a melhor disponível, não a padrão nem a popular.
- Toda decisão de arquitetura tem uma razão. "Geralmente se faz assim" não é razão.
- Segurança desde o primeiro commit.
- Performance é restrição de design, não etapa posterior.
- **Quando uma regra parece precisar de exceção, procure primeiro a solução mais
  precisa que não precisa dela.** Exceção enfraquece a regra; solução mais
  precisa a fortalece. Registrado em 09/08/2026, na terceira vez que o padrão
  apareceu: a política de `municipio` ia pedir exceção ao §9 por ser `FOR
  SELECT` (que não aceita `WITH CHECK`), e a saída certa era
  `USING (true) WITH CHECK (false)` — cumpre o §9 ao pé da letra **e** é mais
  rígida que a versão com exceção.
- **Confusão de quem lê é evidência sobre o texto, não sobre o leitor.** Se
  quem leu só o documento ficou em dúvida, a frase está imprecisa — mesmo
  estando correta, e mesmo que a dúvida se resolva explicando. Explicação não
  fica no documento; a próxima pessoa tropeça no mesmo lugar. Registrado em
  09/08/2026: o §9 dizia que o papel `postgres` "não roda no produto", o que é
  verdade no sentido pretendido (não atende pedido de usuário) e falso ao pé da
  letra (as migrations sempre rodaram com ele contra produção). A revisão
  levantou a dúvida, a resposta foi corrigir a frase, não defendê-la.
- **Correção que não foi pedida precisa do mesmo cuidado que a que foi.**
  Um "já que estou aqui, deixo mais resistente" é uma decisão de produto
  como qualquer outra, e erra como qualquer outra — só que sem ninguém ter
  pedido para conferir. Registrado em 12/08/2026: corrigindo o login pelo
  celular, um "reforço de robustez" (aceitar `error.status === 401` além
  do código exato, para resistir a resposta sem JSON válido) criou um erro
  novo — a mesma rota devolve 401 também para uma falha de sessão do
  servidor com senha **certa**, que passaria a ser rotulada "senha
  incorreta", pior que a mensagem genérica que a correção queria
  melhorar. O `/revisar` achou; revertido para o código exato.
- Se auditassem esse código para comprar a empresa, não teria nada para ter vergonha.

### Como executar

1. **Plano antes de código, sempre.** Descreva o que vai mexer e espere aprovação.

   **Plano aprovado é commitado antes de a construção começar.** Arquivo
   próprio em `docs/planos/`, com uma linha no diário apontando para ele — o
   diário registra **onde o trabalho parou**, e um plano inteiro dentro dele
   afogaria essa função.

   Está escrito porque aconteceu: em 09/08/2026 um plano aprovado do item 2 se
   perdeu inteiro ao fechar a aba, porque só existia na conversa. É a mesma
   classe de problema que o diário e a especificação existem para resolver —
   decisão que só vive na conversa não sobrevive à conversa. Refazer custou uma
   sessão e a numeração das tarefas nem bateu com a aprovada.
2. **Uma tarefa por vez.** Termine, teste, commite. Depois a próxima.
3. **Commit a cada tarefa que funciona.** Mensagem descritiva, em português.
4. **Não refatore o que não faz parte da tarefa.** Aponte e siga.
5. **Não invente decisão de produto.** Procure em `docs/`. Se não estiver lá,
   **pergunte**. Não escolha o mais provável.
6. **Nunca reescreva um arquivo inteiro** quando a mudança é pontual.
7. **Ao fim de cada tarefa, rode `/revisar`** — antes de pedir o commit, nunca
   durante a construção. Ele despacha o subagente `revisor`, que enxerga só o
   diff e os documentos, **nunca a conversa**: quem escreveu passou a sessão se
   convencendo de que está certo, e um revisor que lesse esse raciocínio
   concordaria com ele, porque teria pensado igual. Ele julga o resultado, não
   o argumento.

   Ele responde em duas listas — **divergência** (contradiz regra escrita, com
   a regra citada) e **lacuna** (o documento não define o caso) — e **não
   corrige nada**: não tem ferramenta de escrita, então isso é impossível para
   ele, não pedido educado. Me traga os achados item a item, dizendo o que você
   aceita e o que discorda e por quê. O que fazer com cada um é decisão minha.

   **Quantas vezes rodar, para isso não virar laço.** Rodar de novo a cada
   achado nunca termina: toda correção é diff novo, e diff novo tem achado
   novo. Então o último passe **não** cobre a correção que veio depois dele —
   isso é aceito de propósito, e o critério para aceitar é a **classe** dos
   achados, nunca a quantidade:

   - **Mesma classe dos já resolvidos** — corrija e commite, **sem novo passe**.
     O revisor já provou que enxerga aquela classe; repetir só confirma o que
     está confirmado.
   - **Classe nova** — rode de novo. Ele achou um tipo de defeito que ninguém
     tinha olhado ainda, e o que veio junto dessa correção não foi visto por
     ninguém.

   Um passe extra é barato; um laço de passes é a tarefa que não fecha.
8. **Nunca commite sem eu aprovar.** Mostre o que vai entrar e espere o meu ok.
9. **Ao fechar uma tarefa, feche a sessão junto.** Depois do commit aprovado,
   termine a resposta com uma linha só, avisando que é hora de eu dar `/clear`
   e dizendo **qual comando mandar ao reabrir**. Exemplo:

   > Tarefa 6 commitada. Dê `/clear` agora e mande `/onde-paramos` ao reabrir.

   O motivo é meu, não seu: conversa longa fica cara e imprecisa, e a próxima
   tarefa começa melhor lendo o diário do que arrastando o histórico da
   anterior. Sem esse aviso eu continuo digitando na mesma sessão e não
   percebo.

### Como me explicar as coisas

Não sou desenvolvedor. Traduza termo técnico. Ao propor algo, diga em uma frase
o que muda **para o usuário** ou **para o negócio**.

---

## 3. Regra inviolável: isolamento entre empresas

Todas as transportadoras dividem o mesmo banco. Se a empresa A enxergar um
registro da empresa B, o produto acaba — o setor é competitivo e a notícia corre.

- Toda tabela de domínio tem `empresa_id`. Sem exceção.
- **Nenhuma consulta ao banco sem filtro por `empresa_id`.**
- O filtro é aplicado na camada de acesso a dados, não em cada tela.
  Tem que ser **impossível esquecer**.
- `empresa_id` vem sempre da sessão autenticada no servidor. **Nunca** de URL,
  formulário, header ou body.
- Toda rota de API valida sessão antes de qualquer leitura ou escrita.
- Tabela ou endpoint novo já nasce com isolamento, no mesmo commit.
- **SQL cru só em `src/lib/db` e em `/tests`. Em nenhum outro lugar.** É onde a
  camada de acesso a dados é construída e onde os testes falam com o banco de
  verdade. SQL escrito em qualquer outro arquivo passa por fora do filtro de
  empresa sem que ninguém precise desligar nada — é o vazamento mais barato de
  criar e o mais difícil de enxergar em revisão. As migrations de `/prisma` não
  entram nessa conta: são o SQL do próprio banco, não código do produto.
- **Seed só toca tabela de referência global** — as que não têm `empresa_id`.
  Uma seed abre a própria conexão, com a credencial das migrations, e por isso
  passa por fora da camada de acesso a dados. Isso vale para dado oficial igual
  para todas as empresas (município) e **nunca** para dado de cliente: uma seed
  escrevendo em `cliente` ou `servico` gravaria sem contexto de empresa nenhum.

  **A lista dessas tabelas já existe, e é uma só** — as exceções declaradas em
  `tests/isolamento/schema.test.ts`, conferidas por igualdade exata. Não se
  escreve uma segunda lista aqui: duas listas divergem, e a que envelhece é
  sempre a que ninguém executa.

  Escrito como **regra**, e não resolvido com um papel restrito só para a seed,
  porque o mesmo alcance já existe nas migrations — elas podem tudo e sempre
  poderão. Fechar só para a seed moveria o problema em vez de fechá-lo
  (decisão de 09/08/2026).

- **O Postgres não aplica RLS ao verificar chave estrangeira.** Toda
  referência de uma tabela de domínio para outra — frete apontando para
  cliente, caminhão e motorista; título apontando para frete; motorista
  apontando para o caminhão habitual — tem o mesmo furo: um `INSERT`/`UPDATE`
  gravando o identificador de uma linha de **outra** empresa nesse campo passa
  pelo banco sem erro, porque a checagem de integridade referencial não
  participa da política de isolamento. **Toda referência desse tipo precisa
  de conferência no serviço, de que o alvo pertence à mesma empresa, antes de
  gravar — e de um teste próprio.** As camadas de isolamento do §3 (RLS,
  contraste, concorrência) não cobrem integridade referencial; é uma garantia
  separada. Achado na tarefa 7 do item 2 (11/08/2026), com `Motorista.
  veiculo_habitual_id`.

- **Toda migration que cria função fecha aquela função na hora, com `REVOKE
  EXECUTE` direto na função — nunca por `ALTER DEFAULT PRIVILEGES`.** Não
  existe proteção genérica para função futura: no Postgres, função nova nasce
  executável por todo mundo (`PUBLIC`), sempre, e `ALTER DEFAULT PRIVILEGES
  ... ON FUNCTIONS ... FROM PUBLIC` **não tira isso** — medido, não deduzido,
  na tarefa 1 do item 3 (11/08/2026): seis variações do comando testadas
  (com e sem concessão prévia a outro papel, com e sem `FOR ROLE`, direto no
  schema `public` e num schema criado do zero), e em nenhuma delas uma
  função criada depois deixou de responder a `anon`/`authenticated` — inclusive
  no banco de desenvolvimento real, não só num banco recriado do zero. A
  única proteção que funciona, medida do mesmo jeito, é `REVOKE EXECUTE ON
  FUNCTION <nome>() FROM PUBLIC`, direto na função, na mesma migration que a
  cria — é o que já protegia `reverter_cadastro_incompleto` desde a tarefa 8,
  e o motivo pelo qual ela nunca esteve exposta. A migration
  `20260808052831_fecha_execucao_de_funcao_para_public`, que tentava fechar
  por `ALTER DEFAULT PRIVILEGES`, nunca funcionou — foi removida (não só
  corrigido o comentário) pela migration
  `20260811120000_remove_default_privileges_de_funcao_que_nao_funciona`,
  porque migration aplicada não se edita e um comando que parece proteger e
  não protege é pior do que não ter nenhum. Quem mede se uma função nova foi
  esquecida é `tests/isolamento/privilegios.test.ts` — sobre as funções que
  **existem**, não sobre uma hipotética, pelo motivo escrito no arquivo.

Na dúvida sobre como garantir isso num caso específico: **pare e pergunte**.

### Como o isolamento é provado

A regra acima vira boa intenção se nada a medir. A suíte de testes permanente
precisa incluir estas três coisas. Nenhuma é opcional, e nenhuma pode ser
substituída pelas outras.

1. **O contraste.** Um caso que demonstra o vazamento **com a proteção
   desligada**. Sem ele não há como saber se o teste está medindo alguma coisa:
   um teste de isolamento que passaria de qualquer jeito não prova nada, e é o
   modo mais comum de ter cobertura no papel e nenhuma na prática.
2. **Concorrência real.** Pedidos simultâneos compartilhando conexão do pool,
   com zero leituras cruzadas. Isolamento que só funciona com um pedido por vez
   não é isolamento — em produção nunca é um por vez.
3. **Os três jeitos de não ter contexto.** A política negando com nulo, com
   string vazia e com valor inválido (ver §9).

4. **Contagem de verificações.** Todo teste conta quantas verificações
   executou e **reprova se esse número for menor que o esperado**. Não basta
   nenhuma ter falhado: se rodaram menos do que deviam, o teste falhou.

   **Teste que não distingue "passou" de "não rodou" é pior que teste nenhum,
   porque dá confiança falsa.** Sem ele, alguém desconfia e vai olhar; com ele,
   ninguém olha.

   > Isto está escrito porque aconteceu. Um teste de isolamento imprimiu
   > aprovação **sem ter verificado nada**: uma exceção estourou na primeira
   > linha e foi engolida por um `finally` com `process.exit`, que suprime o
   > erro. Todas as verificações foram puladas, o contador de falhas ficou em
   > zero, e a última linha dizia que estava tudo certo.

   **O que se exige é o mecanismo, não o formato.** O teste precisa ter uma
   verificação que reprova quando rodaram menos do que o esperado. Como ela se
   chama, onde fica no arquivo e com qual função é escrita não importa, e não
   existe nome obrigatório. Cobrar um formato específico transformaria uma
   garantia real em ritual de nomenclatura.

Isso vale para sempre, não para a primeira vez. Teste que prova o isolamento
hoje e não roda amanhã não protege contra a regressão de amanhã.

---

## 4. Segurança — baseline obrigatório

- Nenhum segredo no código ou no repositório. Só em variáveis de ambiente.

  **Isso é mecanismo, não só disciplina** (tarefa 4 da auditoria, 18/08/2026):
  a esteira roda `gitleaks` contra o histórico git inteiro antes de qualquer
  outro passo, e falha o build se achar um — confirmado numa execução real
  da esteira do GitHub (PR de teste, 18/08/2026): o passo passou. A
  configuração padrão da ferramenta **não pega** o
  segredo mais provável deste projeto — uma URL de conexão com senha
  embutida (`DATABASE_URL`/`DIRECT_URL`/`AUTH_DATABASE_URL`), medido, não
  suposto: ela exige um token isolado, e `protocolo://usuario:senha@host`
  escapa por causa do `:`, `/`, `@` no meio. `.gitleaks.toml` soma uma regra
  própria para esse formato. A exceção para o placeholder `senha`/`SENHA` já
  usado em documentação e teste é por **igualdade exata do campo da senha
  isolado** — a regra usa `secretGroup` para capturar só esse campo, e a
  exceção compara só contra ele (`^senha$`/`^SENHA$`), nunca por "contém a
  palavra" em lugar nenhum do texto ao redor. Comparar contra o achado
  inteiro (URL completa) foi tentado primeiro e continha dois furos
  medidos: um dentro do próprio campo da senha, outro através de um "@"
  posterior na URL (query string) disfarçando uma senha real — os dois
  fechados isolando o campo antes de comparar, não só restringindo o
  formato aceito.

  **Duas listas fechadas, mesmo cuidado nas duas.** `.gitleaks.toml` decide o
  que a regra ignora **em geral** (um literal exato de placeholder, válido
  para sempre). `.gitleaksignore` decide o que um **achado específico, já
  visto e explicado**, não precisa repetir (por commit, arquivo, regra e
  linha — nunca um padrão). Acrescentar linha em qualquer um dos dois é
  alterar uma trava de segurança, não só documentação: exige achado real e
  motivo escrito, nunca item especulativo "para o caso de precisar". Ver
  `docs/planos/auditoria-4-varredura-de-segredo.md`.

  **A entrada do `.gitleaksignore` envelhece com o commit, não com o
  achado.** A impressão digital é `commit:arquivo:regra:linha` — se aquele
  commit for reescrito por qualquer motivo (rebase, squash, qualquer
  reescrita de histórico), o hash muda e a entrada para de bater. **O
  sintoma: a esteira fica vermelha num achado antigo, que não mudou uma
  vírgula** — lê como segredo novo, mas é impressão digital desatualizada.
  A correção não é reabrir a investigação: é gerar a impressão nova
  (`gitleaks detect -v`, ler o `Fingerprint:` do achado) e trocar a linha
  velha pela nova, com o mesmo motivo já escrito ao lado.
- Toda entrada validada no **servidor**, com schema.
- Senha com hash forte. Nunca reversível, nunca em log.
- Rate limit em login, recuperação de senha e toda rota que gere custo
  (importação com IA, geração de PDF, cálculo de distância).
- Log nunca contém dado pessoal, senha, token ou conteúdo de mensagem.
- Backup do banco configurado antes do primeiro cliente pagante.

### Os papéis embutidos do Supabase

Eles ficam **como o Supabase os entrega**. Revogamos apenas `anon` e
`authenticated` — são os dois que a internet alcança, porque são os papéis da
API REST pública, usada com a chave que **por desenho** fica no navegador.

`service_role` continua com privilégio, e isso é decisão, não esquecimento: é a
chave secreta, que nunca vai ao navegador. Vazar essa chave já seria incidente
por conta própria, e revogá-la aqui não mudaria isso.

**`PUBLIC` não é um papel entre outros — é concedido implicitamente para todo
mundo**, e por isso função nova nasce executável por `PUBLIC` por padrão
(tabela não; ver §3). A tarefa 9c tentou fechar isso por `ALTER DEFAULT
PRIVILEGES`, achando que valeria para toda função futura; a tarefa 1 do item 3
(11/08/2026) mediu que esse comando **nunca fechou nada**, e removeu a
migration que tentava (§3). A proteção real é outra, e não depende de
`PUBLIC` ter sido fechado por padrão: `service_role` tem uma concessão
**própria e nomeada**, dada pelo próprio Supabase, separada de `PUBLIC`
(confirmado no catálogo do banco), e cada função do produto fecha `PUBLIC`
na hora, com `REVOKE EXECUTE` direto nela mesma (§3). Nenhuma das duas
depende do privilégio padrão do schema.

Quem confere é `tests/isolamento/privilegios.test.ts`. Para tabela, ele
confere `anon`/`authenticated` também na tabela **futura** — o padrão do
Postgres para tabela nasce fechado, então isso é uma regressão real de medir.
Para função não existe equivalente: função futura nasce sempre aberta, medido
(§3), então o teste confere `anon`, `authenticated` e `PUBLIC` em **toda
função que existe** — é aí que uma função esquecida aparece.

### Upload de imagem (comprovante e logo)

O risco não é vírus — é arquivo que o navegador executa.

- **Reprocessar toda imagem no servidor**, gravando de novo em JPEG. Essa é a
  defesa principal: destrói qualquer conteúdo embutido no arquivo original.
- Aceitar **apenas JPEG, PNG, WEBP e HEIC**. HEIC é obrigatório: é o padrão do
  iPhone. **Nunca SVG** — é o único formato de imagem que executa script.
- **Validar pelo conteúdo do arquivo**, nunca pela extensão ou pelo tipo
  declarado pelo cliente.
- Rejeitar acima de **10 MB** e acima de um limite de dimensão **antes de abrir
  o arquivo** — imagem pequena pode expandir para gigabytes na memória.
- **Comprimir**: maior lado em 1600px, alvo de ~300 KB.
- **Remover metadados EXIF.** Isso é privacidade, não só segurança: foto de
  celular carrega coordenada de GPS do motorista.
- Nome de arquivo aleatório, nunca o do usuário.
- Guardar fora da pasta pública, servir por URL assinada com expiração, e com
  tipo de conteúdo fixo — nunca derivado do arquivo.

### Dados enviados a serviço de IA

A importação envia conteúdo de conversa de WhatsApp de terceiros para fora.
O fornecedor não pode treinar modelo com esse conteúdo, e isso precisa estar
declarado na política de privacidade junto com o nome do subprocessador.

---

## 5. Stack — fixado

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Banco | PostgreSQL |
| Acesso a dados | Prisma |
| Autenticação | Better Auth |
| Estilo | Tailwind |
| Hospedagem | Vercel |
| Arquivos | storage do provedor do banco, com URL assinada |
| E-mail transacional | Resend, enviando por `envio.fretigate.com` |
| Integração contínua | GitHub Actions |

Se achar que alguma escolha está errada para o caso, **argumente antes**, não
troque no meio da tarefa.

### Ambientes

Stack é tecnologia; isto aqui é **ambiente** — quais instâncias existem, para
que serve cada uma, e que variável precisa existir em cada lugar. Não é a
mesma coisa, mas fica aqui por não ter seção própria e por variar junto da
stack de banco e de e-mail.

#### Projetos Supabase

| Projeto Supabase | Para quê | Quem usa |
|---|---|---|
| `ysldmzvszjxdgcbtaurh` | Desenvolvimento | máquina de quem programa, `.env` local |
| `qutzsvrkaqvpluqxbhmp` | Teste automatizado | esteira de CI (GitHub Actions), `tests/isolamento/*` |
| *(a criar)* | Produção | Vercel — precisa existir **antes** do primeiro cliente pagante, não junto com ele: a venda é autoatendida, sem demonstração (§1), e o §4 já exige backup configurado antes do primeiro pagante |

Os dois primeiros estão na lista de projetos permitidos em
`tests/guarda-de-banco.ts` — é o que impede a suíte de rodar (e apagar linha)
em qualquer outro banco, produção incluída, no dia em que produção existir.
Nenhum dos dois recebe dado real de cliente: o de teste é semeado e apagado
pelos próprios testes a cada execução (ver §3, "Concorrência real").

#### Variáveis de ambiente, por lugar

Todo módulo que precisa de uma variável obrigatória **falha alto, no
carregamento** (`src/lib/auth/index.ts`, `src/lib/auth/email.ts`): se ela não
estiver definida, o módulo lança um erro explicando qual falta e por quê, antes
de qualquer rota responder. Isso não é acidente nem falta de tratamento de
erro — é a defesa querida. Foi assim que a esteira encontrou a falta de
`RESEND_API_KEY` (08/08/2026): o teste nem manda e-mail, só carrega o módulo, e
mesmo assim a falta apareceu, porque é isso que a checagem faz.

**Isso NÃO garante que a publicação na Vercel para com uma variável faltando.**
`src/app/api/auth/[...all]/route.ts` é rota de API, e o resto de quem importa
`@/lib/auth` (`servicos/`, `acoes.ts`) é Server Action — nenhum dos dois é
avaliado durante `next build`, só quando um pedido de verdade chega. O mais
provável: a publicação **termina com sucesso**, e o erro só aparece no
**primeiro pedido real** que tocar login ou sessão — o que, na prática, é quase
todo pedido, mas é falha **no ar**, não falha **ao publicar**. Ver a pendência
"CONFERIR ANTES DE PUBLICAR" no §14.

| Variável | Minha máquina (`.env`) | Esteira (CI) | Publicação (Vercel) |
|---|---|---|---|
| `DATABASE_URL`, `AUTH_DATABASE_URL`, `DIRECT_URL` | projeto de desenvolvimento | **secret do GitHub** — projeto de teste (configurado, tarefa 9) | **variável de ambiente da Vercel** — projeto de produção, ainda não existe |
| `RESEND_API_KEY` | chave real do Resend | **valor fixo, escrito direto em `ci.yml`, não é segredo** — nenhum teste manda e-mail de verdade, só o módulo precisa carregar | **variável de ambiente da Vercel** — chave real, senão recuperação de senha não sai |
| `EMAIL_REMETENTE`, `EMAIL_RESPOSTA` | endereços reais (`envio.fretigate.com` / `fretigate.com`) | **valor fixo em `ci.yml`, não é segredo** — endereços diferentes, mesmo padrão do valor real, só fake | **variável de ambiente da Vercel** — endereços reais |
| `BETTER_AUTH_SECRET` | gerado uma vez, só desta máquina | **secret do GitHub** (`BETTER_AUTH_SECRET_CI`) — não protege sessão real (o projeto de teste não tem cliente nenhum), mas é a **única** das cinco com forma de segredo, e forma de segredo versionada aciona scanner mesmo sem risco funcional (`docs/diario.md`, 08/08/2026) | **variável de ambiente da Vercel**, gerada **uma vez, só para produção** — nunca a mesma de desenvolvimento (`.env.example`, bloco "Autenticação (Better Auth)": "UM POR AMBIENTE... se fossem o mesmo, um cookie assinado na máquina de quem programa valeria em produção") |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | **valor fixo em `ci.yml`** (`http://localhost:3000`) — não é segredo, e nenhum e-mail sai de verdade para usar esse endereço | **variável de ambiente da Vercel** — domínio real de produção |

**Por que quatro das cinco de e-mail/autenticação podem ser valor fixo na
esteira, e as três do banco não:** as três do banco apontam para um banco de
verdade — errar o projeto ali significa rodar `DELETE` ou `migrate deploy` no
lugar errado (`tests/guarda-de-banco.ts`, `CLAUDE.md` §3). As quatro fixas só
precisam existir para o módulo carregar sem lançar: nenhum teste da suíte
chama `enviarEmail` (`tests/cadastro.test.ts` usa o adaptador interno do
Better Auth direto, sem passar pelas rotas que mandam e-mail). Colocar uma
chave de verdade do Resend no GitHub para isso seria segredo sem necessidade
— e-mail saindo a cada execução da esteira, sem nenhum teste que precise
disso. `BETTER_AUTH_SECRET` é a exceção nesse grupo: mesmo sem risco
funcional, é secret do GitHub, não valor fixo — o motivo é a forma do valor,
não o que ele protege.

---

## 6. Estrutura de pastas

**Todo o código do produto mora em `/src`.** A raiz guarda só configuração,
documentação e material de consulta.

```
/src
  /app
    /(auth)             login, cadastro, recuperação, aceitar convite
    /(app)              área logada
    /api                endpoints
  /lib
    /db                 cliente do banco + filtro de empresa
    /auth               sessão e permissão
    /servicos           regras de negócio, por domínio
    /documentos         gerador de PDF (ver §9)
    /importacao         extração por IA, isolada do resto
    /utils
  /components
    /ui                 componentes base — fonte única de verdade
    /<dominio>          componentes específicos
/prisma
/scripts                ferramenta de operação, rodada por um humano — nunca
                        parte do produto publicado (ver abaixo)
  /seed                 municípios do IBGE
/tests
  /isolamento           a prova do §3 — fala com o banco de verdade
/docs                   especificação, navegação, estilo, componentes, ícones
/referencia             marca e protótipo — material de consulta, nada roda
/public                 arquivos estáticos — fica na raiz, nunca dentro de /src
```

**`/tests` fica fora de `/src` de propósito:** não é código que vai ao ar. E os
testes de isolamento falam com o **banco de verdade**, com os papéis de verdade
— contra um dobrê, provariam que o dobrê funciona.

**`/scripts` fica fora de `/src` pelo mesmo motivo, mais um.** Não é código
que atende pedido de usuário — é comando de terminal, rodado por um humano
que já escolheu o banco e a empresa na hora de chamar (`--empresa=<id>` no
comando de medição, `DIRECT_URL` na seed). `CLAUDE.md` §3 ("`empresa_id` vem
sempre da sessão autenticada") vale para o que responde requisição; uma
ferramenta operacional é o próprio operador escolhendo, não uma sessão. Cada
um só passa por `db()` quando lê dado de cliente (a medição de município lê
`Servico`); a seed nunca passa, porque grava `municipio`, que não tem
`empresa_id`. Acrescentado em 14/08/2026, junto da medição de município do
item 3 — antes disso só a seed existia, direto em `/prisma`, e o precedente
não tinha nome próprio.

- Regra de negócio mora em `/src/lib/servicos`, nunca dentro de componente de
  tela.
- **Nada de arquivo "para depois".** Sem abstração especulativa, sem camada sem
  dois casos de uso reais.

  **Exceção declarada: `comoDono` (`src/lib/auth/acao.ts`, tarefa 3 da
  auditoria, 18/08/2026), que nasce sem nenhuma ação de dono chamando.** Não é
  a mesma coisa que abstração especulativa — abstração especulativa é a que
  ninguém sabe se funciona. `comoDono` é a **metade de um mecanismo que só
  existe em par** com `comoUsuario`: se só `comoUsuario` existisse, o teste
  estrutural (`tests/protecao-de-acoes.test.ts`) não teria como distinguir
  ação comum de ação de dono, e a lista de exceção do teste viraria, na
  prática, a lista de ações de dono escrita à mão — exatamente o problema que
  este desenho existe para evitar. E `comoDono` nasce **medido**, não
  suposto: `tests/sessao-e-papel.test.ts` prova com login real que ele barra
  operador e deixa dono passar, antes de qualquer tela usá-lo. Fica pronto
  para o item 10. Decisão do fundador — não reabrir por analogia com esta
  regra sem reler este parágrafo.
- **O teste é "junta coisas sem relação", não linha contada.** ~200 linhas é
  sinal para ir olhar, não limite — arquivo comprido com um assunto só não
  precisa separar por causa do número. Regra corrigida em 07/08/2026, depois
  de `src/lib/servicos/cadastro.ts` passar de 200 linhas com um fluxo linear
  só (validação → criar Empresa → criar Usuário → reverter se falhar → login)
  e não ter nada de sobra para tirar: rate limit e criação de usuário já
  moram em arquivo próprio. Picar mais teria só espalhado uma sequência que
  se lê de cima a baixo por vários arquivos. Fica registrado para ninguém
  reabrir essa discussão achando que é um limite a cumprir.
- **`@/` aponta para `/src`.** `@/lib/db` é `/src/lib/db`.

### O que fica na raiz, e por quê

O Next.js só reconhece `/src/app` **se não existir `/app` na raiz**. Se as duas
existirem, ele usa a da raiz e ignora a de `/src` **sem avisar** — você editaria
arquivo que não está no ar. Pasta `app` na raiz é erro, nunca alternativa.

Estes precisam estar na raiz porque a ferramenta os procura lá, e não em outro
lugar: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`,
`next-env.d.ts` (reescrito a cada `next dev`), `.env*`, `eslint.config.mjs`,
`postcss.config.mjs`, `.gitignore` e a pasta `/public`.

Caminho de código citado em arquivo de configuração é caminho que envelhece
calado. Ao mover pasta, conferir `tsconfig.json` (`paths`), `.gitignore`
(caminhos que começam com `/` são presos à raiz) e `eslint.config.mjs`
(`globalIgnores`).

---

## 7. Convenções

- **Domínio em português** (`Servico`, `Cliente`, `Veiculo`, `TituloReceber`).
  Preciso conseguir ler o schema.
- Código e variáveis internas em inglês. Sem acento em arquivo, tabela ou campo.
- Dinheiro em **centavos, inteiro**. Nunca decimal flutuante.
- Distância em **metros, inteiro**.
- Data e hora em UTC. Exibidas no fuso de Fortaleza.
- Toda tabela tem `criado_em` e `atualizado_em`.
- **Nada é apagado.** Exclusão é `arquivado_em` preenchido.

  **Exceção declarada** (tarefa 8, 07/08/2026): esta regra protege dado que
  passou a existir de verdade no produto — algo que alguém chegou a ver ou
  usar. Uma `Empresa` criada no meio de um cadastro que não terminou, sem
  nenhum `Usuario` vinculado a ela, nunca existiu de verdade: nenhuma sessão
  aponta pra ela, ninguém a viu. Apagar essa linha é **reverter um cadastro
  incompleto**, não excluir um registro — por isso é `DELETE` de verdade, não
  `arquivado_em`. A garantia de que isso nunca alcança uma empresa com
  usuário vinculado não fica só no código da aplicação: vive na função de
  banco `reverter_cadastro_incompleto` (`src/lib/servicos/cadastro.ts` é quem
  chama), cuja guarda `NOT EXISTS (... usuario ...)` está escrita dentro da
  própria função. Nenhuma outra tabela ganha essa exceção sem passar pela
  mesma pergunta: "alguém chegou a ver isto?"

  **A exceção se estende a `TipoOperacao`** (tarefa 2 do item 2, 09/08/2026),
  pela mesma pergunta e a mesma resposta: os quatro `TipoOperacao` de uma
  `Empresa` nascem **na mesma transação** que a `Empresa`, então uma `Empresa`
  que nunca existiu de verdade também nunca teve tipo visto ou usado por
  ninguém — não existe "Frete" que alguém tenha chegado a ver para uma empresa
  que ninguém viu. A chave estrangeira é `ON DELETE CASCADE`, não `RESTRICT`
  como o resto do domínio: apagar a `Empresa` órfã apaga os quatro junto, pelo
  próprio Postgres, sem passo à parte na função. A garantia de nunca alcançar
  uma empresa com usuário continua **inteira** dentro de
  `reverter_cadastro_incompleto` — o `CASCADE` só decide o que acontece
  **depois** que aquela guarda já decidiu que a empresa pode ser apagada.
  Nenhuma outra tabela ganha esta exceção por analogia com `TipoOperacao`, pela
  mesma razão que a original não se estende por analogia: cada uma responde
  sozinha "alguém chegou a ver isto?".

  **Condição, não observação:** esta exceção — a original e a de
  `TipoOperacao` — só vale **enquanto `reverter_cadastro_incompleto` for o
  único caminho que apaga uma `Empresa`**. Se um dia existir encerramento de
  conta pelo usuário, o `CASCADE` de `TipoOperacao` passaria a apagar tipos que
  **foram vistos e usados** — e a exceção deixaria de valer **sem que nada
  avisasse**, porque o `CASCADE` continuaria funcionando exatamente igual, só
  que agora apagando o errado. Quem construir esse caminho **reexamina esta
  exceção antes de escrever o `DELETE`** — não a herda por já estar aprovada
  para o outro caso.

---

## 8. Regras de interface

Vieram de defeitos reais encontrados nos protótipos. São obrigatórias.

- **Componente existe uma vez.** Botão, linha de lista, campo e chip vivem em
  `/src/components/ui` e são reutilizados. **Proibido copiar componente.**
- **Nenhum valor fora do sistema.** Cor, altura, raio, tamanho e peso de fonte
  saem de `docs/estilo.md`. Se precisar de valor novo, **pergunte**.
- **Nenhum botão fora do inventário** de `docs/componentes.md`. Uma ação
  principal por tela. Uma ação, um nome, em todo lugar.
- **Nenhum texto vaza do seu campo.** Quebra em duas linhas ou corta com
  reticências, com a altura crescendo.
- **Nada encolhe para caber conteúdo.** A tela rola ou recolhe — nunca comprime
  altura definida.
- **Só a barra de navegação flutua.** Bloco de ações fica dentro do fluxo
  rolável, depois do resumo e antes de listas. Formulário tem o salvar no fim,
  rolando junto. Teclado numérico é sobreposição, nunca ocupa lugar no fluxo —
  e o salvar **sobe junto, acima do teclado**, nunca fica coberto.
- **Toda tela com barra de navegação reserva folga no fim** para nada ficar
  sob a barra, medida a partir do topo do (+), que sobe acima da linha da
  barra. O valor é **único para todas as telas que têm barra**. Folga própria
  de uma tela é defeito, mesmo que pareça melhor ali — foi assim que nasceram
  os três valores diferentes que precisaram ser unificados depois.

  **Exceção, e é isto — nenhuma outra**: telas sem barra de navegação não
  reservam essa folga, porque não existe barra para não ficar embaixo dela.
  São as telas de fora de sessão — **Entrar, Criar conta, Esqueci a senha,
  Redefinir senha, Termos e privacidade (no modo vindo do cadastro) e
  Aceitar convite** — que usam margem inferior padrão. Lista fechada, para não
  virar exceção decidida caso a caso: tela nova sem barra entra aqui só com
  decisão explícita, não por analogia.

  **Redefinir senha e Termos (modo cadastro) entraram em 07/08/2026, tarefa 8
  fatia 2, por decisão explícita do fundador** — mesma razão das quatro
  originais: são telas de fora de sessão, sem app shell nenhum para reservar
  folga contra.

  **Termos no modo Ajustes é caso à parte, não coberto por esta lista.** A
  regra final é: aquele modo é dentro da sessão, então ganha barra — mas
  Ajustes ainda não existe, e sem Ajustes não existe barra nenhuma para
  reservar folga contra. Até Ajustes nascer, os dois modos de `/termos`
  usam a mesma margem provisória do modo cadastro, por não ter escolha —
  **não é o valor final do modo Ajustes**, é o que sobra enquanto a barra não
  existe. Corrigir quando Ajustes for construído.
- **Área segura** = a do dispositivo + 8px. Nenhum conteúdo sob a barra de
  status ou a ilha dinâmica.
- **Três superfícies, três significados** — nunca compartilham tratamento:
  clara = dado do usuário · escura = mensagem do sistema · lilás = comunicação
  da plataforma com o usuário (novidades, ofertas).
- **Estado carregando obrigatório** em todo botão que chama o servidor, com
  toque repetido ignorado. Sem isso, frete e cobrança duplicam.
- **Estado vazio oferece a ação que destrava a tela.** Quando a ação ainda não
  existe, o convite é dizer o que falta para ela existir — nunca um botão que
  não leva a lugar nenhum, e nunca ilustração decorativa.

  Reescrito em 10/08/2026: a versão anterior ("Estado vazio é convite para
  agir, nunca ilustração decorativa") gerou dúvida pela quarta vez — agora nas
  telas provisórias de Fretes e Cobranças (tarefa 4), que não têm ação real
  para oferecer (Lançar frete e Faturar frete ainda não existem), e um botão
  sem destino seria o mesmo defeito ao contrário. A regra larga não previa
  esse caso; esta cobre os dois sem precisar de exceção.
- **Número incompleto não é exibido.** Lucro sem despesa lançada e R$/km sem km
  preenchido mostram convite, não valor. Com dado parcial, exibir a cobertura.
- Alvo de toque mínimo 48px. Ação principal ao alcance do polegar.

  **Exceção — link dentro de frase corrida** (decidida em 07/08/2026, tarefa
  8). O mínimo de 48px vale para **controle isolado** — botão, chip, ícone
  tocável. Um link dentro de texto normal ("Termos de uso", numa frase) não
  consegue os 48px sem virar bloco próprio, e isso não é a exceção certa: a
  saída é três condições, todas obrigatórias —
  1. **sublinhado** — o link se anuncia por forma, não só por cor;
  2. **espaçamento entre linhas ampliado** — o parágrafo ganha respiro para o
     dedo não acertar a linha errada;
  3. **o mesmo documento acessível também pelos Ajustes**, sem depender de
     tocar o link dentro do texto corrido — quem errar o toque tem outro
     caminho.

  Sem as três, é a mesma falha do alvo pequeno com roupa nova.
- Interface clara, não escura — o app é usado no pátio, sob sol forte.
- Vocabulário do usuário: frete, cliente, caminhão, motorista, **relatório**.
  Nunca "registro", "entidade", "item", "transação", "extrato".
- **Dentro do produto é "empresa", nunca "transportadora".** "Transportadora" é
  palavra de marketing, e só lá. O `tipo_operacao` já prevê guincho e reboque
  (§9): rótulo preso a um ramo é a amarra mais barata de criar e a mais cara de
  tirar. Ver o Vocabulário no topo de `docs/especificacao.md`.

---

## 9. Decisões de arquitetura já tomadas

**Situação financeira é derivada, nunca armazenada.** Não existe campo
`faturado` ou `quitado` no frete. A situação sai dos títulos a receber. Se
alguém sugerir um campo desnormalizado "para consultar mais rápido", **recuse** —
duas fontes de verdade divergem e o cliente vê frete quitado com boleto aberto.

**`Servico`, não `Frete`.** A entidade central tem `tipo_operacao`, para
comportar guincho e reboque depois sem reescrever nada. Na interface do MVP
aparece como "Frete", porque é o único tipo ativo.

**Título a receber é entidade própria**, não flag no frete. Um frete pode gerar
mais de um título (adiantamento e saldo).

**Gerador de documento é genérico.** Recebe o tipo e os dados, com cabeçalho da
empresa fixo e corpo variando. Não escreva um gerador só para o relatório —
recibo, romaneio e proposta virão depois.

**Município é tabela, não texto.** Origem e destino guardam referência ao
município (base do IBGE, ~5.570 registros fixos no próprio banco) **e** o texto
original. Sem isso não existe comparação de rota entre empresas.

**Distância é calculada uma vez por par de municípios e guardada.** Nunca por
frete. Transportadora repete rota, então o cache resolve quase tudo depois das
primeiras semanas.

A distância é estimada por cálculo geodésico entre os centros dos municípios,
com fator de correção rodoviário — sem API externa, sem custo por consulta. O
erro esperado é da ordem de 15%, aceitável porque o km serve à análise de R$/km
e nunca ao faturamento, e o campo é editável pelo usuário. A origem do número
fica isolada atrás de uma única função, para trocar por API de rotas depois sem
mexer em mais nada. O valor continua sendo calculado uma vez por par de
municípios e guardado em `DistanciaRota`.

A tabela fixa de 20 municípios do Ceará que aparece em `docs/navegacao.md` é
dado de protótipo, não a solução de produção. A base real é a do IBGE, com os
~5.570 municípios, conforme a decisão de município acima.

**A política de RLS falha fechada.** O contexto de empresa chega ao banco por
`set_config('app.empresa_id', $1, true)`, uma vez por transação. A política
**não pode confiar** que esse contexto exista ou seja válido. Os três casos
negam, sem exceção:

- **nulo** — contexto nunca definido.
- **string vazia** — este é o estado real, e o mais comum. No Postgres, uma
  variável personalizada como `app.empresa_id`, depois de usada uma vez na
  sessão, **não deixa de existir: ela volta a valer `''`**. Toda conexão
  reaproveitada do pool chega assim. Medido, não suposto.
- **valor inválido** — texto que não é um identificador.

A forma: `nullif(current_setting('app.empresa_id', true), '')::uuid`. O `nullif`
existe por causa do segundo caso; sem ele, `''::uuid` levantaria erro. Erro
também fecha, mas o que se quer é zero linhas.

**Nunca** entra na política um `OR current_setting(...) IS NULL`. É a alteração
de uma linha que transforma falha fechada em falha aberta, e é exatamente o
atalho que alguém faz para "consertar" um teste que está devolvendo vazio.

Toda política tem `USING` **e** `WITH CHECK`, os dois explícitos — nunca um
deles deixado para o Postgres deduzir. O que as duas cláusulas compartilham
não é serem iguais; é serem **escritas**.

**Política de isolamento** (as tabelas de domínio, comparando `empresa_id`/`id`
com o contexto de empresa) leva o **mesmo texto** nas duas: quem pode ler é
quem pode gravar, e é sempre a própria empresa.

**A política de `municipio` é a exceção assimétrica, de propósito — e continua
sendo, mesmo com a exigência acima.** `USING (true) WITH CHECK (false)`: todo
mundo lê, ninguém grava (§2, sobre esta mesma política: "cumpre o §9 ao pé da
letra **e** é mais rígida"). As duas cláusulas aqui são diferentes por
desenho, não por omissão — a exigência é que as duas estejam escritas, não que
digam a mesma coisa.

**O perigo que esta regra evita não é a ausência do `WITH CHECK` isolada — é o
`USING` não filtrar.** Medido em 15/08/2026, com as duas tentativas: uma
política `ALL` com `USING (empresa_id = contexto)` e **sem** `WITH CHECK`
recusou um `INSERT` gravando `empresa_id` de outra empresa — o Postgres deriva
o `WITH CHECK` do `USING` quando ele falta, para política `ALL`. Já uma
política com `USING (true)` sem `WITH CHECK` **aceitou** o mesmo `INSERT`: o
perigo real é o `USING` aberto, não o `WITH CHECK` implícito.

**Mesmo assim, o `WITH CHECK` explícito continua exigido em toda política — por
convenção do projeto, não por necessidade técnica.** Depender da derivação
implícita deixa uma migration futura escrever uma política só com `USING`,
certa por sorte porque o `USING` também estava certo, sem que nada distinga
esse caso do perigoso por leitura. Explícito é conferível — é o que
`tests/isolamento/schema.test.ts` lê, campo a campo, para cada tabela contra o
que está declarado para ela; implícito é suposição sobre o que o Postgres faz
por trás, e é exatamente o tipo de suposição que este arquivo pede para medir,
não deduzir.

**Criar uma empresa exige definir o contexto ANTES de inserir.** Como a política
de `empresa` tem `WITH CHECK (id = ...)`, o `INSERT` só passa se o contexto já
apontar para o identificador que está sendo criado. A ordem, tudo na mesma
transação:

1. gerar o `uuid` na aplicação;
2. `set_config('app.empresa_id', <esse uuid>, true)`;
3. inserir a empresa com esse `id`.

Não é contorno: quem cria a empresa já sabe qual é, e o banco confirma que a
linha gravada é a da empresa do contexto. Vale para o cadastro e para qualquer
semente de teste.

> **O atalho errado, que é o motivo desta regra existir.** Ao ver o `INSERT`
> recusado, a correção tentadora é afrouxar a política com
> `OR current_setting(...) IS NULL`. Isso faria **toda** conexão sem contexto
> enxergar e gravar em **qualquer** empresa — falha aberta, no produto inteiro,
> para sempre, por causa de uma linha. Se o `INSERT` de empresa foi recusado,
> **falta o `set_config`**, não sobra política.

**Nenhuma conexão que atende pedido de usuário ignora RLS.** Comando de
operação — migration e seed — roda como `postgres`, e é assim **por desenho**,
não por descuido.

A frase antes dizia "nenhuma conexão **em execução**", o que era verdade no
sentido pretendido e falso ao pé da letra: as migrations sempre rodaram como
`postgres`, que ignora RLS por atributo, e sempre vão rodar. Corrigida em
09/08/2026, quando a seed de municípios (tarefa 1 do item 2) tornou a
imprecisão visível — a revisão perguntou se a seed contradizia esta regra, e a
resposta certa foi escrever a regra que sempre valeu, não abrir exceção para
ela. É o padrão do §2: procurar a solução precisa antes da exceção.

**O que separa os dois casos é quem chama.** O `fretigate_reversor` existe
porque `reverter_cadastro_incompleto` roda **durante o pedido do usuário**, a
cada cadastro que falha na metade — caminho de execução. Migration e seed são
chamadas **por quem opera**, ao publicar. A distinção não é de risco percebido,
é de quem dispara.

São quatro papéis, e a separação é parte do desenho:

| Papel | Para quê | Enxerga |
|---|---|---|
| `fretigate_app` | todo o domínio | só a empresa do contexto. Sem `DELETE` — arquivar é `UPDATE` (§7) |
| `fretigate_auth` | só o Better Auth | as tabelas que existem para autenticar e não têm `empresa_id` (ver abaixo). **Nada** de domínio |
| `fretigate_reversor` | só reverter cadastro incompleto (tarefa 8) | `DELETE`/`SELECT` em `empresa`, `SELECT` em `usuario` — nomeados, nunca `BYPASSRLS`. Dono de `reverter_cadastro_incompleto`, chamada por `fretigate_app` via `SECURITY DEFINER` |
| `postgres` | **só migrations e comando de operação** (a seed de municípios) | tudo — por isso **não atende pedido de usuário** |

**Por que `fretigate_reversor` existe, e não a função rodando como
`postgres`.** A primeira versão de `reverter_cadastro_incompleto` era
`SECURITY DEFINER` sem trocar o dono — rodava como `postgres`, que tem
`rolbypassrls = true`, então o `DELETE` ignorava RLS por completo, não porque
alguma política permitisse. Uma função **em execução** (chamada a cada
cadastro que falha na metade) não pode se apoiar nisso: é o mesmo problema do
`OR current_setting(...) IS NULL`, só que escondido atrás de um dono em vez
de uma cláusula. A correção: a função chama `set_config('app.empresa_id',
...)` antes do `DELETE`, e roda como um papel sem `BYPASSRLS` — a política
`empresa_isolamento` passa a ser **satisfeita de verdade**, não ignorada.
`tests/cadastro.test.ts` confere o dono e o `rolbypassrls`, não só o
resultado — sem essa verificação, a regressão para "dono = postgres" passaria
despercebida porque o resultado observável é idêntico.

**O que `fretigate_auth` alcança é regra, não lista.** Ele enxerga as tabelas
que existem para autenticar e que **não têm `empresa_id`**, porque são
consultadas antes de existir empresa. Hoje são cinco: `session`, `account`,
`verification`, `usuario` e `rate_limit`. **A lista é fotografia; quem manda é
a regra, e quem confere é o teste que lê o catálogo.**

Está escrito assim porque a lista enumerada envelhece a cada tabela nova, e foi
exatamente o que aconteceu: a `rate_limit` entrou e as quatro enumeradas viraram
mentira no mesmo commit, aqui e no comentário do
`src/lib/db/sem-filtro-de-empresa.ts`.

`fretigate_auth` precisa de política própria em `usuario` porque, no login, não
existe contexto de empresa: só se sabe de que empresa a pessoa é depois de
achá-la pelo e-mail. Essa permissão é uma **política nomeada**, visível em
`pg_policies` — nunca `BYPASSRLS`, que é atributo invisível e desliga o motor
para todas as tabelas de uma vez.

**Toda ação de servidor usa o envelope `comoUsuario`/`comoDono`, nunca
verificação escrita à mão.** (`src/lib/auth/acao.ts`, tarefa 3 da auditoria de
segurança, 18/08/2026). Antes, cada ação escrevia `const sessao = await
exigirSessao();` na primeira linha — funcionava porque não existia outro jeito
de conseguir `empresaId`, mas nada garantia que a linha continuasse ali numa
ação nova, e nada distinguia uma ação que devesse exigir o dono
(`exigirDono()`) de uma que exige só sessão comum. O envelope entrega `sessao`
como primeiro parâmetro da ação: não tem como esquecer a verificação porque
não existe verificação para escrever à mão. A escolha do envelope **é** a
declaração de "esta ação exige dono" — não existe lista separada.

A lógica de verdade (achar a sessão pelo cabeçalho, checar `arquivado_em`,
checar o papel) mora em `src/lib/auth/sessao-por-cabecalho.ts`, que recebe o
`Headers` como argumento comum em vez de chamar `next/headers` diretamente —
só para poder ser testada com um cookie de sessão real
(`tests/sessao-e-papel.test.ts`), já que `next/headers` só funciona dentro de
um pedido de verdade, nunca dentro do Vitest. **Não fabrica sessão nenhuma:**
continua exigindo um cookie válido; só muda de onde o `Headers` vem.
`src/lib/auth/sessao.ts` (`exigirSessao`, `exigirDono`, `sessaoAtual` — a API
que o resto do produto importa, inalterada) vira casca de uma linha por
função, sempre com o cabeçalho do pedido real — e só pode ficar assim: lógica
nova ali reabriria o mesmo problema que motivou a mudança.

A importação de `sessao-por-cabecalho` é travada por `eslint.config.mjs`, só
para `src/lib/auth` — mesmo mecanismo que já tranca
`bancoSemFiltroDeEmpresa` (tarefa 2 da auditoria). `tests/` fica fora do
escopo da regra, pelo mesmo motivo que `/tests` já pode SQL cru (§3).
`tests/protecao-de-acoes.test.ts` lê o código-fonte de toda ação de servidor
(varredura, não lista de arquivo à mão) e confere que cada exportação usa um
dos dois envelopes, com só duas exceções aprovadas — `sairDaConta` (sessão
pode já ter vencido) e `criarConta` (cria a empresa; sessão não existe
ainda) —, cada uma conferida por igualdade exata nos dois sentidos.

**Limitação conhecida, aceita — igual às duas de `sem-filtro-de-empresa`
(tarefa 2): ação com a diretiva `"use server"` dentro do corpo da função
(inline, não no topo do arquivo) passa despercebida pelas duas travas.** Nem
`tests/protecao-de-acoes.test.ts` (que só varre arquivo com a diretiva na
primeira linha) nem `eslint.config.mjs` alcançam essa forma. Hoje não existe
nenhuma no produto. Quem escrever a primeira ação inline está, por isso,
**fora da proteção deste mecanismo** — precisa aplicar `comoUsuario`/`comoDono`
por decisão própria, porque nada vai avisar se esquecer.

**Extração por IA é isolada em `/src/lib/importacao`.** Trocar de fornecedor tem
que ser trocar uma peça. O modelo ainda não está decidido (ver §14).

**Integração fiscal isolada**, quando entrar.

---

## 10. Preço, planos e limites

- **Plano único**, R$ 149/mês ou R$ 840/ano.
- **Acesso gratuito permanente**, limitado a **1 caminhão**.

| Limite | Gratuito | Pago |
|---|---|---|
| Caminhões | 1 | 5 |
| Usuários | 1 | 3 |
| Importações | 5 no total | 30 por mês |
| Clientes, fretes, motoristas, relatórios | ilimitado | ilimitado |
| Armazenamento | 2 GB por empresa (trava anti-abuso, não degrau de plano) |

Além da contagem, **limitar o tamanho de cada importação** — o custo vem do
tamanho do texto, não da quantidade de importações. Avisar na tela para colar
por partes quando exceder.

Cobrança por checkout de terceiro. **Não construir checkout próprio.**
Assinatura vencida bloqueia escrita, mantém leitura e exportação por 90 dias.

---

## 11. Dados e LGPD

- No cadastro, **uma única pergunta declarada**: "como você conheceu o
  FretiGate?" — com atribuição de origem por primeiro toque. Nenhum outro campo
  de pesquisa em nenhum lugar do produto. A pergunta está construída (tarefa
  8); a atribuição por primeiro toque ainda não — ver o prazo no §14.
- Todo o resto do conhecimento sobre o usuário vem do uso, não de formulário.
- Os dados dos clientes e motoristas da transportadora **são de terceiros**: a
  empresa é controladora, o FretiGate é operador. Uso próprio só de forma
  **agregada e anonimizada**, com isso declarado nos termos **desde o primeiro
  usuário** — não dá para pedir autorização retroativa.
- Termos e política de privacidade precisam existir antes do primeiro cliente e
  declarar os subprocessadores, incluindo o fornecedor de IA.

### Subprocessadores declarados

A lista tem que estar na política de privacidade **antes do primeiro usuário** —
declarar depois não conserta, porque não se pede autorização retroativa.

| Subprocessador | O que ele enxerga | Por quê |
|---|---|---|
| **Supabase** | todo o banco e os arquivos | banco de dados e armazenamento |
| **Vercel** | o tráfego da aplicação | hospedagem |
| **Resend** | nome e e-mail de quem recebe a mensagem | e-mail transacional: recuperação de senha, verificação de e-mail e convite de usuário |
| **Cloudflare** | o conteúdo das respostas que chegam em `contato@`, **de passagem** | redirecionamento do e-mail de contato. Quem responde pedindo ajuda costuma colar dado do próprio negócio na mensagem |
| **Google** | o conteúdo dessas mesmas respostas, **armazenado** | a caixa que recebe o redirecionamento é Gmail. Quem guarda entra com mais razão que quem só vê passar — **sai desta tabela quando existir caixa própria no domínio**, e essa é uma das razões para migrar |
| **fornecedor de IA** *(a decidir — §14)* | o conteúdo da conversa colada na importação | extração dos fretes |

O do e-mail e o da IA são os que mais pesam: os dois enxergam **dado de
terceiro**, do qual a transportadora é controladora e o FretiGate é operador.
Subprocessador novo entra nesta tabela **e** na política, no mesmo commit.

**GitHub fica de fora desta tabela** (guarda credencial do projeto de teste do
Supabase e roda a suíte automatizada — §5, "Ambientes"), e a condição é esta:
**o projeto de teste nunca recebe dado real de cliente**, só dado sintético que
os próprios testes semeiam e apagam a cada execução. No dia em que isso deixar
de valer — banco de teste populado com cópia de dado real, por exemplo — a
resposta muda, e o GitHub entra na tabela.

---

## 12. O que NÃO construir

Mesmo que pareça óbvio, mesmo que seja rápido. Se eu pedir, me lembre que está
fora do escopo antes de fazer.

- Emissão fiscal (CT-e, MDF-e, NF-e)
- Checkout próprio
- Entrada de dados por voz
- Acesso do motorista ao sistema: login, app ou upload de foto pelo motorista
- Envio automático de mensagem por API de WhatsApp
- Rastreamento por GPS
- Portal ou checkout para o cliente final da transportadora
- Antecipação de recebível
- Telemetria, manutenção, combustível, controle de pneu
- Tabela de preço por quilômetro e cálculo automático de valor do frete
- Importação de extrato bancário
- Seleção múltipla e ações em lote nas listas
- Recibo de pagamento
- Agendamento com calendário e calculadora de orçamento
- Filtro de data na dashboard
- **O desktop está sendo desenhado, mas não é construído no MVP.**
  `docs/componentes.md` já tem a barra lateral do desktop e telas equivalentes
  documentadas — é desenho aprovado pelo Design, registrado com antecedência.
  Nenhuma linha de código de desktop entra antes do celular estar pronto e a
  decisão de construí-lo ser tomada explicitamente (decisão de 07/08/2026).
- Multi-idioma, multi-moeda, tema configurável
- Qualquer tela específica de guincho ou reboque

O `tipo_operacao` existe no modelo de dados desde já, mas o **MVP entrega só a
experiência de transportadora de carga**.

---

## 13. Documentos do projeto

| Arquivo | O que tem |
|---|---|
| `docs/especificacao.md` | Entidades, campos, estados, regras de negócio, ordem de construção |
| `docs/navegacao.md` | Mapa de telas: de onde se chega, para onde leva |
| `docs/estilo.md` | Cores, tipografia, espaçamento, formas, alturas, seção Impresso |
| `docs/componentes.md` | Inventário fechado de botões e avisos, e onde cada tela usa o quê |
| `docs/icones/` | SVGs, um por ícone |
| `docs/planos/` | Um arquivo por plano aprovado, commitado antes da construção (§2) |

**Quando dois documentos descrevem a mesma tela, quem vence é o dono do
escopo.** `docs/componentes.md` manda no que a tela **contém** — campos,
botões, avisos, rótulos. `docs/navegacao.md` manda em **como se chega até ela e
para onde ela leva**. Dentro do escopo do outro, cada um é descrição de apoio, e
descrição de apoio não decide nada: envelhece calada e induz a erro, que foi
exatamente o que aconteceu com as três telas de entrada.

A precedência resolve desacordo **entre documentos**. Ela nunca põe em vigor o
que este arquivo proíbe: linha de `docs/navegacao.md` marcada com ⚠️ é
descrição vencida por definição, e "código no WhatsApp" continua proibido pelo
§12 esteja escrito onde estiver.

**A precisão que fecha a regra, e é onde ela quase falhou:** a
`docs/especificacao.md` decide **quais campos existem** na entidade; o
`docs/componentes.md` decide **como o campo é apresentado**. Campo desenhado
que não existe na entidade é **proposta, não decisão** — pare e pergunte, nunca
crie a coluna por analogia. Registrado em 09/08/2026, quando "Categoria da CNH"
(motorista) e "Ano" (caminhão) apareceram só em documento de tela e teriam
virado coluna sem ninguém decidir. **Campo que ninguém usa fica meio preenchido
para sempre**, e o dia que alguém construir algo em cima descobre que metade
dos registros está vazia.

**O protótipo em `referencia/` é evidência corroborante, nunca autoridade.**
Quem define o que a tela contém é o `docs/componentes.md`, pela precedência
acima — o próprio `referencia/LEIA-ME.md` diz que nada ali roda e que é material
de consulta. Mas evidência corroborante resolve discussão: em 09/08/2026 o
Design afirmou que o formulário de caminhão já estava desenhado, e o protótipo
respondia, ao toque em Editar, *"Editar caminhão — formulário ainda não
desenhado"* (`TelaCaminhoes.dc.html`). Encerrou o assunto sem debate.

**Afirmação de medição sobre coisa que não existe é o pior tipo de erro de
documento: engana justamente por dizer que foi medida.** Foi o caso das duas
linhas do `docs/componentes.md` que listavam o formulário de caminhão entre os
"conferidos no DOM" — auditoria escrita por analogia entre as três telas de
cadastro, não por medição de cada uma. **Auditoria por analogia não é
auditoria:** cada linha vale só para a tela que foi de fato aberta e medida.

A paleta azul da primeira versão da Tela 1 foi descartada. Se aparecer qualquer
arquivo com `#2B62E8` como cor de ação, é resíduo — ignore.

**O repositório é o dono de `docs/componentes.md`, `docs/estilo.md` e
`docs/navegacao.md`.** O Design **não exporta mais o arquivo inteiro**: ele
entrega **só as seções novas**, e o fundador encaixa. Nada de sobrescrever.

**`docs/navegacao.md` entrou nesta regra em 10/08/2026, tarefa 6.** Ele também
nasce de material do Design ("Gerado da prancheta...", no topo do arquivo) — o
nome do arquivo não é o critério certo para decidir quem é dono; o critério é
**o que muda**:

- **Estado** — marcar tela como feita (⬜ → ✅), sincronizar com decisão já
  registrada em outro lugar (especificação, diário), corrigir contradição
  entre documentos. Isso é do **repositório**, em qualquer um dos três
  arquivos.
- **Desenho** — o que uma tela contém, como se chega e para onde leva, medida
  ou tratamento visual novo. Isso continua sendo do **Design**, e chega por
  diff de seção, nunca editado direto.

**Editar o lado do repositório não substitui avisar o Design.** A fonte dele
segue sem a mudança até alguém contar — é o mesmo problema da regra original,
só que na direção contrária. Toda correção de estado feita aqui entra também
na lista de "o que foi pedido ao Design" do diário daquela tarefa.

**Por que a regra mudou (09/08/2026).** A anterior mandava a exportação entrar
em commit próprio, antes do código — e falhou pelo mesmo motivo cinco vezes:
**cinco exportações, cinco reversões das mesmas decisões**, sempre reaplicadas à
mão. Só a quinta desfez oito, entre elas a lista fechada de telas sem barra
(recusada por escrito no dia anterior), a margem provisória dos Termos no modo
Ajustes (terceira perda do mesmo parágrafo), a exceção do Pix e a cor do
"adicionar".

E a quinta chegou **contradizendo a si mesma** — duas seções descrevendo o mesmo
padrão com o rótulo do botão e a cor do "adicionar" em desacordo, dentro do
mesmo arquivo. Isso é sinal de que a fonte do Design já tem duas versões do
mesmo conteúdo. Reaplicar à mão trata o sintoma; parar de sobrescrever trata a
causa.

**Se mesmo assim chegar um arquivo inteiro por fora**, o procedimento é o de
sempre: **conferir contra as decisões registradas antes de commitar** — diário,
especificação e este arquivo —, restaurar o que ela desfez, e registrar no
diário o que veio de novo, o que foi restaurado e o que foi pedido ao Design.
Nunca commitar exportação sem conferir: quatro das cinco tinham problema.

---

## 14. Decisões ainda em aberto

Não invente resposta. Pergunte.

- **Revisão jurídica dos Termos e da Política de Privacidade — pendente, sem
  bloqueio de lançamento.** Publicados em 18/08/2026, decisão do fundador,
  com a forma de aceite atual (texto acima do botão Criar conta, sem caixa
  de marcação) e a redação atual — incluindo o parágrafo de uso agregado e
  anonimizado dos dados para melhorar o produto e produzir informação de
  mercado, que entrou nesta data porque a LGPD não se aplica
  retroativamente: dado coletado sem essa cláusula não pode passar a ser
  usado assim depois. `termos_versao` grava a data de publicação da versão
  aceita (`src/lib/servicos/cadastro.ts`). A revisão jurídica de tudo o mais
  — retenção, direitos de titulares terceiros, transferência internacional,
  alteração dos termos, limitação de responsabilidade — fica para depois do
  primeiro cliente pagante, porque essas cláusulas valem do aceite em diante
  e uma versão futura não retroage sobre quem já aceitou esta.

  **Pendência somada, registrada em 07/08/2026 (tarefa 8, fatia 2):** hoje,
  tocar em "Termos de uso" ou "Política de privacidade" no meio do cadastro
  navega para `/termos` e volta para um `/criar-conta` **zerado** — tudo que
  já tinha sido digitado se perde. Contradiz o que o próprio formulário
  promete no caso de erro do servidor ("o que você já preencheu continua
  aqui"). Guardar rascunho do formulário resolveria pela metade; a correção
  que elimina o problema de vez é os Termos abrirem **por cima** do
  formulário (folha ou modal), sem navegar para longe dele. Não construído
  ainda — muda junto da próxima revisão da tela de Termos, seja ela
  motivada pela revisão jurídica ou por outro pedido.
- **PENDÊNCIA COM PRAZO LEGAL — exportação, cancelamento, retenção e
  oposição ao uso agregado prometidos nos Termos ainda não têm mecanismo
  automático.** O texto publicado em 18/08/2026 promete quatro coisas:
  exportação dos dados a qualquer momento; cancelamento da assinatura a
  qualquer momento; leitura e exportação mantidas por 90 dias depois de a
  assinatura **vencer** (`CLAUDE.md` §10 — vencimento por pagamento que
  falhou, **não** cancelamento por vontade própria; o prazo para quem
  cancela por conta própria ainda não foi decidido — ver bullet próprio mais
  abaixo, na lista de decisões em aberto); e a empresa poder pedir que seus dados
  deixem de ser usados no uso agregado e anonimizado da Política de
  Privacidade. Nenhuma das quatro tem endpoint ou fluxo no produto hoje —
  até existirem, são cumpridas à mão, por quem responder o e-mail de
  contato. A exportação é a mais urgente de lembrar: diferente das outras
  três, tem prazo legal de resposta ao titular sob a LGPD.
- **PRAZO — `origem_cadastro` (atribuição de origem por primeiro toque).**
  O cadastro (tarefa 8) grava só `origem_declarada` (a resposta da pergunta
  tocável); `origem_cadastro` fica nulo, porque capturar UTM/referrer é um
  mecanismo à parte que ninguém construiu ainda. **Precisa existir antes de
  ligar os anúncios** — o mesmo marco já usado para o reteste do e-mail
  transacional (§ tarefa 7 no diário). Decidido em 07/08/2026.
- **CONFERIR ANTES DE PUBLICAR — variáveis de ambiente na Vercel.** Achado na
  tarefa 9 (08/08/2026): nada verifica, hoje, que as oito variáveis da tabela
  em "Ambientes" (§5) estão configuradas na Vercel antes da primeira
  publicação. E o jeito como isso falha importa: `src/lib/auth/index.ts` e
  `src/lib/auth/email.ts` lançam erro **no carregamento do módulo**, mas
  nenhuma rota que os importa é avaliada durante `next build` (são rota de
  API e Server Actions, não página estática) — então a publicação **termina
  com sucesso** mesmo faltando uma variável, e o erro só aparece no
  **primeiro pedido real** que tocar login ou sessão. Sem conferência
  manual antes de publicar, isso apareceria com cliente pagante já usando o
  produto, não durante o deploy.

  **O sintoma exato, se `NEXT_PUBLIC_APP_URL` estiver errado ou faltando**
  (achado do fundador, 12/08/2026, testando login pelo celular): **login
  que não entra, com mensagem genérica ("Não deu para entrar agora"),
  mesmo com e-mail e senha corretos.** A causa é o `better-auth` recusando
  a origem da requisição (`INVALID_ORIGIN`, 403) antes mesmo de conferir a
  credencial — `trustedOrigins` (`src/lib/auth/index.ts`) usa
  `NEXT_PUBLIC_APP_URL` como a única origem confiável em produção. Sem
  este parágrafo, o sintoma lê como senha errada, e é fácil perder horas
  no lugar errado — foi o que aconteceu na primeira vez.
- **CONFERIR ANTES DE PUBLICAR — a seed de municípios em produção.** Achado na
  tarefa 1 do item 2 (09/08/2026).

  **O que rodar:** `npm run seed:municipios`, com as variáveis de banco
  apontando para produção.

  **Quando:** depois de `prisma migrate deploy` e **antes do primeiro uso** —
  ou seja, antes do primeiro cliente entrar, não junto com ele. É a mesma
  ordem que a esteira já usa.

  **Se esquecer:** a publicação **termina com sucesso** e nada falha. A tabela
  fica vazia, e o defeito aparece como **campo de município que não sugere
  nada** — origem e destino de todo frete ficam como texto livre, sem resolver
  para município nenhum. Quem descobre é o cliente pagante, não quem publicou.
  E é dado que não se recupera depois: a especificação §9 registra que o
  irrecuperável é justamente origem e destino não resolverem para município de
  verdade.

  **Por que não é automático:** os 5.570 municípios entram por comando de mão,
  **nunca** por `postinstall` — a Vercel roda `npm install` a cada publicação,
  e um `postinstall` tentaria falar com o banco durante o build
  (`docs/especificacao.md` §6). O comando é idempotente: rodar de novo sem
  mudança na fonte não escreve nada.
- **ATENÇÃO AO RODAR — `medir:municipios` precisa de instalação completa.**
  Achado na tarefa 4 do item 3 (14/08/2026). Diferente da seed acima, **não é
  passo de publicação**: nada quebra se este comando nunca rodar, é
  ferramenta de investigação sob demanda (`npm run medir:municipios --
  --empresa=<id>`), rodada da máquina de quem opera, com as variáveis de
  banco apontando para o ambiente que se quer medir.

  **O sintoma, se rodado depois de uma instalação só de produção** (`npm
  install --omit=dev` ou equivalente): falha, e a mensagem não diz o motivo
  real. O comando usa `tsx` (`package.json`, `devDependencies`) para resolver
  o atalho `@/` fora do Next.js — medido, não suposto, antes de decidir
  instalar essa dependência (`scripts/medir-municipios.mts`). Sem `tsx`
  instalado, o erro é sobre módulo não encontrado, não "faltam as
  dependências de desenvolvimento" — fácil de ler como o comando quebrado,
  quando falta só a instalação completa.
- **Modelo de IA da importação** — testar a extração com o material real do
  usuário antes de escolher. Decidir por acerto, não por preço: a diferença de
  custo entre os candidatos é inferior a 2% da receita por cliente.
- ~~Provedor de e-mail transacional~~ · ~~domínio próprio autenticado~~ —
  **RESOLVIDOS em 06/08/2026.** Resend, domínio `fretigate.com` com envio por
  `envio.fretigate.com` verificado. Ver §5 e §11. Continua valendo o motivo:
  **recuperação que cai em spam é cliente perdido em silêncio** — ele não
  reclama, some. Por isso a tarefa 7 não fecha sem envio conferido de verdade.

- Gateway de pagamento
- **Prazo de retenção de leitura/exportação depois de cancelamento
  voluntário** — os 90 dias do §10 valem para assinatura **vencida**
  (pagamento que falhou), não para cancelamento por vontade própria. O texto
  dos Termos promete retenção "por um período" depois do cancelamento, sem
  dizer quanto — esse prazo ainda não foi decidido. Achado ao revisar a
  publicação dos Termos em 18/08/2026.
- Revisão do valor do plano anual — R$ 840 dá 53% de desconto sobre o mensal, o
  que pode sinalizar que o mensal é inflado. Recomendação em aberto: R$ 990.
- Valor à vista no Pix do plano anual
- Percentual e regra de comissão do afiliado
- Política de desconto
- **Trocar a estimativa geodésica por API de rotas** — só quando a imprecisão
  aparecer no uso real. Se acontecer, decidir o fornecedor e medir o custo por
  par novo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
