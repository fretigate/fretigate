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
- Se auditassem esse código para comprar a empresa, não teria nada para ter vergonha.

### Como executar

1. **Plano antes de código, sempre.** Descreva o que vai mexer e espere aprovação.
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

**Isso vale mesmo depois de fechar `EXECUTE` de função para `PUBLIC` (tarefa
9c).** `PUBLIC` não é um papel entre outros — é concedido implicitamente para
todo mundo, e por isso a tabela/função nasce aberta por padrão. `service_role`
não depende dessa concessão implícita: o próprio Supabase já dá a ele uma
concessão **própria e nomeada**, separada de `PUBLIC` (confirmado direto no
catálogo do banco: `{postgres=X/postgres,service_role=X/postgres}`, sem entrada
de `PUBLIC`, depois do `REVOKE ... FROM PUBLIC`). Por isso revogar de `PUBLIC`
nunca tira nada de `service_role`.

Quem confere é `tests/isolamento/privilegios.test.ts`, e ele confere o que esta
regra manda conferir: nenhuma concessão a `anon`, `authenticated` ou `PUBLIC`,
em nenhuma tabela ou função, hoje e nas que vierem (a parte de função e
`PUBLIC` entrou na tarefa 9c).

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

### Ambientes (projetos Supabase)

Stack é tecnologia; isto aqui é **ambiente** — quais instâncias existem e para
que serve cada uma. Não é a mesma coisa, mas fica aqui por não ter seção
própria e por variar junto da stack de banco.

| Projeto Supabase | Para quê | Quem usa |
|---|---|---|
| `ysldmzvszjxdgcbtaurh` | Desenvolvimento | máquina de quem programa, `.env` local |
| `qutzsvrkaqvpluqxbhmp` | Teste automatizado | esteira de CI (GitHub Actions), `tests/isolamento/*` |

Os dois estão na lista de projetos permitidos em `tests/guarda-de-banco.ts` —
é o que impede a suíte de rodar (e apagar linha) em qualquer outro banco,
produção incluída, no dia em que produção existir. Nenhum dos dois recebe dado
real de cliente: o de teste é semeado e apagado pelos próprios testes a cada
execução (ver §3, "Concorrência real").

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
/tests
  /isolamento           a prova do §3 — fala com o banco de verdade
/docs                   especificação, navegação, estilo, componentes, ícones
/referencia             marca e protótipo — material de consulta, nada roda
/public                 arquivos estáticos — fica na raiz, nunca dentro de /src
```

**`/tests` fica fora de `/src` de propósito:** não é código que vai ao ar. E os
testes de isolamento falam com o **banco de verdade**, com os papéis de verdade
— contra um dobrê, provariam que o dobrê funciona.

- Regra de negócio mora em `/src/lib/servicos`, nunca dentro de componente de
  tela.
- **Nada de arquivo "para depois".** Sem abstração especulativa, sem camada sem
  dois casos de uso reais.
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
- **Estado vazio é convite para agir**, nunca ilustração decorativa.
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

Toda política tem `USING` **e** `WITH CHECK`. Sem o segundo, a leitura fica
travada e a escrita não: um `INSERT` gravaria linha com o `empresa_id` de outra
empresa.

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

**Nenhuma conexão em execução ignora RLS.** São quatro papéis, e a separação
é parte do desenho:

| Papel | Para quê | Enxerga |
|---|---|---|
| `fretigate_app` | todo o domínio | só a empresa do contexto. Sem `DELETE` — arquivar é `UPDATE` (§7) |
| `fretigate_auth` | só o Better Auth | as tabelas que existem para autenticar e não têm `empresa_id` (ver abaixo). **Nada** de domínio |
| `fretigate_reversor` | só reverter cadastro incompleto (tarefa 8) | `DELETE`/`SELECT` em `empresa`, `SELECT` em `usuario` — nomeados, nunca `BYPASSRLS`. Dono de `reverter_cadastro_incompleto`, chamada por `fretigate_app` via `SECURITY DEFINER` |
| `postgres` | **só migrations** | tudo — por isso não roda no produto |

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

A paleta azul da primeira versão da Tela 1 foi descartada. Se aparecer qualquer
arquivo com `#2B62E8` como cor de ação, é resíduo — ignore.

**Exportação do Design por cima de `docs/estilo.md` ou `docs/componentes.md`
é commit à parte, antes de começar a tarefa.** Quando o fundador substitui um
desses dois arquivos por uma exportação do Claude Design, ele avisa, e o
commit dessa troca entra **sozinho**, com mensagem própria, antes de
qualquer código da tarefa que dependia da lacuna que a exportação
preencheu — nunca misturado no mesmo commit do código. Regra registrada em
07/08/2026 depois de confusão pela terceira vez: a paleta azul residual
acima, "código no WhatsApp" que voltou em `docs/navegacao.md` (§13), e uma
sessão que leu a especificação de campo de texto do Design sem saber que
estava sem commit.

---

## 14. Decisões ainda em aberto

Não invente resposta. Pergunte.

- **BLOQUEIO DE LANÇAMENTO — forma do aceite dos Termos e a redação deles.**
  A tela Criar conta (tarefa 8) grava `termos_aceitos_em`/`termos_versao` com
  aceite implícito (texto acima do botão, sem caixa de marcação) e uma versão
  provisória, porque nem a forma do aceite nem o texto dos Termos e da
  Política de Privacidade passaram por revisão jurídica ainda. Isso **não
  pode ir ao ar** — nem anúncio, nem cliente pagante — antes de resolver as
  duas coisas. Decidido em 07/08/2026.

  **Pendência somada, registrada em 07/08/2026 (tarefa 8, fatia 2):** hoje,
  tocar em "Termos de uso" ou "Política de privacidade" no meio do cadastro
  navega para `/termos` e volta para um `/criar-conta` **zerado** — tudo que
  já tinha sido digitado se perde. Contradiz o que o próprio formulário
  promete no caso de erro do servidor ("o que você já preencheu continua
  aqui"). Guardar rascunho do formulário resolveria pela metade; a correção
  que elimina o problema de vez é os Termos abrirem **por cima** do
  formulário (folha ou modal), sem navegar para longe dele. Não construído
  nesta fatia — fica registrado junto do bloqueio acima porque as duas coisas
  (redação/forma do aceite e a tela de Termos em si) mudam juntas quando a
  revisão jurídica acontecer.
- **PRAZO — `origem_cadastro` (atribuição de origem por primeiro toque).**
  O cadastro (tarefa 8) grava só `origem_declarada` (a resposta da pergunta
  tocável); `origem_cadastro` fica nulo, porque capturar UTM/referrer é um
  mecanismo à parte que ninguém construiu ainda. **Precisa existir antes de
  ligar os anúncios** — o mesmo marco já usado para o reteste do e-mail
  transacional (§ tarefa 7 no diário). Decidido em 07/08/2026.
- **Modelo de IA da importação** — testar a extração com o material real do
  usuário antes de escolher. Decidir por acerto, não por preço: a diferença de
  custo entre os candidatos é inferior a 2% da receita por cliente.
- ~~Provedor de e-mail transacional~~ · ~~domínio próprio autenticado~~ —
  **RESOLVIDOS em 06/08/2026.** Resend, domínio `fretigate.com` com envio por
  `envio.fretigate.com` verificado. Ver §5 e §11. Continua valendo o motivo:
  **recuperação que cai em spam é cliente perdido em silêncio** — ele não
  reclama, some. Por isso a tarefa 7 não fecha sem envio conferido de verdade.

- Gateway de pagamento
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
