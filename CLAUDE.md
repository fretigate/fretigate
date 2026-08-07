# CLAUDE.md — FretiGate

Lido automaticamente em toda sessão. É a fonte de verdade das decisões do
projeto. Se algo aqui conflitar com o que eu pedir no chat, me avise antes de
executar.

Versão de 06/08/2026. Substitui a anterior por inteiro.

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

Se achar que alguma escolha está errada para o caso, **argumente antes**, não
troque no meio da tarefa.

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
- Se um arquivo passa de ~200 linhas ou junta coisas sem relação, separe.
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
- **Toda tela rolável reserva folga no fim** para nada ficar sob a barra,
  medida a partir do topo do (+), que sobe acima da linha da barra. O valor é
  **único para todas as telas**. Folga própria de uma tela é defeito, mesmo que
  pareça melhor ali — foi assim que nasceram os três valores diferentes que
  precisaram ser unificados depois.
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

**Nenhuma conexão em execução ignora RLS.** São três papéis, e a separação é
parte do desenho:

| Papel | Para quê | Enxerga |
|---|---|---|
| `fretigate_app` | todo o domínio | só a empresa do contexto. Sem `DELETE` — arquivar é `UPDATE` (§7) |
| `fretigate_auth` | só o Better Auth | `session`, `account`, `verification` e `usuario`. **Nada** de domínio |
| `postgres` | **só migrations** | tudo — por isso não roda no produto |

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
  de pesquisa em nenhum lugar do produto.
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
- Telas de desktop
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

A paleta azul da primeira versão da Tela 1 foi descartada. Se aparecer qualquer
arquivo com `#2B62E8` como cor de ação, é resíduo — ignore.

---

## 14. Decisões ainda em aberto

Não invente resposta. Pergunte.

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
