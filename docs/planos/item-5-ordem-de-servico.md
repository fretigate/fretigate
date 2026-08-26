# Plano — item 5: Ordem de serviço: enviar ordem, finalizar, comprovante

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 4 (lista e detalhe do frete) fechou no commit `6e74c03`. O detalhe do
frete existe e lê `Servico`/`TituloReceber` de verdade, mas nasceu **sem
principal** (`docs/planos/item-4-lista-e-detalhe-do-frete.md`, "O que fica de
fora"): as três ações que este item constrói — Enviar ordem, Marcar como
finalizado, anexar comprovante — dependem de backend que ainda não existe.

`prisma/schema.prisma` já tem os três campos que este item preenche
(`status_operacional`, `ordem_enviada_em`, `comprovante_url`), nulos desde o
item 3 por decisão registrada no comentário do model — não é migration nova,
é preencher o que já está lá.

Este item também resolve duas pendências deixadas de propósito no item 4,
por decisão do fundador (`docs/especificacao.md` §9, "Três exigências..."
item 3, 22/08/2026): **"telefone tocável"** no Perfil do Cliente e no Perfil
do Motorista, adiado para resolver com o mesmo mecanismo do item 5 em vez de
decidir duas vezes.

É a tese do produto (`CLAUDE.md` §1): o frete nasce na ordem, e a ordem
precisa chegar ao motorista de verdade.

---

## Decisões tomadas nesta rodada (23/08/2026), antes de escrever código

Registradas aqui porque `CLAUDE.md` §2 pede: decisão de produto vem do
fundador, não do mais provável.

1. **DDI do link do WhatsApp fixo em 55, nunca perguntado.** Produto é só
   Brasil (`CLAUDE.md` §1, sem multi-país no MVP, `CLAUDE.md` §12). Se um
   dia houver motorista com número estrangeiro, é campo próprio a decidir
   então — não construído por precaução hoje.
2. **Telefone salvo mas inválido usa a mesma folha do campo que falta**
   (`docs/componentes.md` §12), não um bloqueio seco. Diferença só no
   título e no estado inicial do campo:
   - Ausente: título "Falta o telefone de {nome}", campo vazio.
   - Inválido: título "O telefone de {nome} não parece válido", campo
     pré-preenchido com o valor salvo, erro já visível, para corrigir em
     vez de digitar do zero.

   O botão principal nomeia para onde a ação segue ("Salvar e enviar
   ordem" aqui — a folha nasce genérica o bastante para "Salvar e cobrar"
   no item 6 reaproveitar sem refazer).
3. **Confirmação de envio pelo padrão "Enviei" / "Ainda não" ao voltar do
   WhatsApp** — não o toque isolado gravando na hora. Sem isso, tocar em
   "Enviar ordem" e desistir registraria como enviada, e a futura pendência
   da dashboard ("fretes sem ordem enviada") mentiria. É o mesmo padrão já
   previsto para "Cobrar no WhatsApp" (`docs/componentes.md` linha 402,
   item 6, ainda não construído) — nasce aqui, o item 6 reaproveita.
4. **Sem motorista no frete, o botão principal vira "Escolher motorista"**
   (leva a Editar frete), em vez de manter o rótulo "Enviar ordem no
   WhatsApp" apontando para uma tela que não envia nada — a mesma
   inconsistência de rótulo que a linha Telefone do detalhe já evita hoje.
   A alternativa (a folha do campo que falta também cobrir "falta
   motorista") foi avaliada e recusada pelo fundador por custo: viraria uma
   folha de escolha (reaproveitando `FolhaDeBusca`), com gravação própria e
   risco de encadear com a folha de telefone (motorista escolhido pode
   também não ter telefone válido) — três complicações por uma economia
   de rótulo.
5. **Texto padrão da ordem, aprovado pelo fundador** (ver Tarefa 2 para a
   regra de montagem e o formulário completo com as variáveis).
   `{caminhao}` entrou na lista de variáveis de
   `docs/especificacao.md` §9 (não existia antes) — commitado junto deste
   plano.

---

## O que fica de fora desta vez

- **Faturar frete · Ver relatório · Marcar recebido · Cobrar no WhatsApp**
  — itens 6 e 7. O detalhe do frete continua sem esses botões até lá,
  mesma regra geral do item 4 ("botão cuja ação de fundo não existe não
  entra desabilitado, só não é construído agora").
- **Tela de editar o modelo de mensagem da ordem** — item 9, decidido MVP
  parcial (`docs/especificacao.md` §9): entra só o texto fixo.
- **Contagem "fretes em andamento sem ordem enviada" na dashboard**
  (`docs/especificacao.md` §4.6) — a dashboard (item 8) continua
  provisória (`src/app/(app)/page.tsx`, "Pouso mínimo pós-login"). Construir
  a consulta agora, sem nenhuma tela para consumi-la, seria o arquivo "para
  depois" que `CLAUDE.md` §6 proíbe. Quando o item 8 chegar, a consulta é
  direta sobre os dois campos que este item já deixa prontos:
  `status_operacional = 'em_andamento' AND ordem_enviada_em IS NULL`.
- **Cancelar frete.** `status_operacional` tem o valor `cancelado` no
  schema, mas nenhum documento define quem dispara essa transição nem em
  qual item — uma entrada do diário de 20/08/2026 supôs "item 5 (cancelar
  frete)" de passagem, mas `docs/especificacao.md` §9 nomeia o item 5 como
  "enviar ordem, finalizar, comprovante", sem "cancelar". Fica registrado
  aqui para não repetir a suposição: **cancelar frete não tem item
  definido ainda**, e este plano não o constrói. `marcarServicoFinalizado`
  (Tarefa 3) só faz a transição `em_andamento → finalizado`.
- **DDI configurável, número estrangeiro** — decisão 1 acima.

---

## Tarefa 1 — Telefone: normalização, validação, folha do campo que falta

Backend + um componente reutilizável, sem tocar o detalhe do frete ainda —
mesmo raciocínio de item 3/item 4 Tarefa 1: separar o que carrega risco de
regra (validação) do que é só encaixe de tela.

**`src/lib/utils/telefone.ts`** (função pura, sem banco — mesmo padrão de
`caminhao.ts`: precisa ser segura para um componente `"use client"` importar
sem puxar `pg` para o navegador):

- `normalizarTelefone(bruto: string): { ok: true; digitos: string } | { ok: false; erro: string }`
  — implementa a regra já escrita em `docs/componentes.md` §12 ao pé da
  letra: só dígitos, 10 ou 11 de comprimento, DDD (dois primeiros dígitos)
  ≥ 11. As três mensagens de erro são as três já definidas ali ("Faltam
  dígitos...", "Número comprido demais...", "Esse DDD não existe.") — não
  inventar uma quarta.
- `linkWhatsapp(digitos: string, texto: string): string` — monta
  `https://wa.me/55{digitos}?text={texto codificado}`. DDI fixo (decisão 1).

**`FolhaDeTelefone`** (`src/components/ui/`, sobre `FolhaInferior` — primeiro
consumidor real de verdade da "Folha do campo que falta" descrita em
`docs/componentes.md` §12, que hoje só existe em documento). Props: nome de
quem falta, valor atual (vazio ou o salvo-mas-inválido), rótulo do botão
principal, e o que fazer ao salvar. Título e estado inicial seguem a decisão
2 acima. Validação **enquanto digita**, começando depois do primeiro dígito
(§12) — nunca com o campo vazio lido como erro.

**Gravação:** a folha chama o `editarCliente`/`editarMotorista` que já
existem (`src/lib/servicos/clientes.ts`, `motoristas.ts`) — só o campo
telefone muda, o resto do registro segue como está. Nenhuma ação nova de
"salvar telefone solto": reaproveita a validação de posse por empresa que
esses dois caminhos já fazem.

**Liga os dois "telefone tocável" pendentes** (Perfil do Cliente, Perfil do
Motorista — `src/app/(app)/clientes/[id]/page.tsx` linha ~31,
`motoristas/[id]/page.tsx`): telefone válido vira link de verdade
(`linkWhatsapp`, sem texto pronto — é só "chamar", não "enviar ordem", que é
Tarefa 2); telefone ausente ou inválido abre `FolhaDeTelefone` com "Salvar"
como rótulo do botão (sem ação de continuação, porque aqui não há nada para
"seguir" além de salvar).

**Testes:** `tests/telefone.test.ts` — função pura, cobre as bordas do §12:
9 dígitos (faltam), 10 e 11 (válidos), 12 (comprido demais), DDD 10 (menor
que 11, inválido), string vazia, string com letras.

---

## Tarefa 2 — `mensagens.ts` e "Enviar ordem no WhatsApp" no detalhe do frete

**`src/lib/servicos/mensagens.ts`** (`CLAUDE.md` §6 — regra de negócio mora
em `/lib/servicos`; `docs/especificacao.md` §9 exigência 2 — arquivo único
para os textos, já com as variáveis no formato final).

Template aprovado pelo fundador:

```
{empresa}
Frete de {diaSemana}, {dataPorExtenso}

Origem: {origem}
Destino: {destino}
Carga: {carga}
Caminhão: {caminhao}

Manda uma foto do embarque quando carregar.
```

Regra de montagem, exigida pelo fundador e verificada no caso mínimo abaixo:

- As quatro linhas do meio (Origem/Destino/Carga/Caminhão) só entram se o
  campo correspondente tiver valor — rótulo e linha desaparecem juntos,
  nunca uma linha vazia ou "Carga: —".
- Nunca duas quebras de linha em branco seguidas: os três blocos (cabeçalho
  · campos presentes · frase final) se juntam com exatamente uma linha em
  branco entre blocos não vazios: se o bloco do meio ficar sem nenhuma
  linha, o resultado é cabeçalho, uma linha em branco, frase final — nunca
  duas em branco.
- Nunca mostra valor do frete nem nome do cliente (`docs/especificacao.md`
  §4.2 e decisão do fundador nesta rodada — "o motorista não precisa saber
  para quem é").
- "Manda uma foto do embarque quando carregar." é fixo, sempre presente —
  é a frase que faz o comprovante (Tarefa 5) existir de verdade.

**Caso mínimo — verificação obrigatória desta tarefa** (pedido explícito do
fundador): um frete só com origem e destino (sem carga, sem caminhão
escolhido) precisa produzir

```
{empresa}
Frete de segunda, 25 de agosto

Origem: Sobral/CE
Destino: Fortaleza/CE

Manda uma foto do embarque quando carregar.
```

`montarMensagemOrdem(dados): string` recebe os campos já resolvidos (nunca
formata dentro da função de montagem — separação já usada no resto do
produto entre serviço e exibição).

**Formatador novo:** `formatarDiaDaSemanaEData(data: Date): string` em
`src/lib/utils/data-fortaleza.ts` (extensão do arquivo existente, não
arquivo novo) — "segunda, 25 de agosto", português, fuso de Fortaleza. Não é
o mesmo formatador já usado no detalhe do frete (`formatarDataPorExtenso`,
local em `fretes/[id]/page.tsx`, sem dia da semana e com ano) — são
formatos diferentes para leitores diferentes (o dono lendo a tela, o
motorista lendo a mensagem).

**No detalhe do frete** (`src/app/(app)/fretes/[id]/page.tsx`), a principal
passa a mudar com o estado do frete (só a fatia "em andamento" deste item —
"finalizado sem cobrança" e "já faturado" continuam sem botão, itens 6/7):

- Sem `motorista_id` → **"Escolher motorista"**, `href` para
  `/fretes/{id}/editar` (decisão 4).
- Com motorista, telefone ausente ou inválido → **"Enviar ordem no
  WhatsApp"** abre `FolhaDeTelefone` (Tarefa 1) em vez de navegar, rótulo
  do botão da folha "Salvar e enviar ordem" — ao salvar, segue
  automaticamente para o link do WhatsApp.
- Com motorista e telefone válido → **"Enviar ordem no WhatsApp"** é o link
  de verdade (`linkWhatsapp` com o texto de `montarMensagemOrdem`).

**Correção de contradição, achada antes de codar (23/08/2026).** A versão
anterior deste plano também mandava a secundária "Marcar como finalizado"
aparecer "sempre visível junto da principal, nesta fatia" — mas a ação de
fundo (`marcarServicoFinalizado`) só nasce na Tarefa 3, e esta mesma tela já
registra a regra geral: botão cuja ação de fundo não existe não entra, nem
desabilitado (`src/app/(app)/fretes/[id]/page.tsx`, mesmo precedente do
perfil do caminhão). As duas frases juntas eram contraditórias — a
contradição passou pelo fundador ao aprovar o plano. Decisão do fundador, ao
ser achada: **a regra vence.** A secundária não entra na Tarefa 2; nasce na
Tarefa 3,
junto da ação que a sustenta. Motivo, não só processo: botão que não faz
nada é pior que botão ausente — a pessoa toca, nada acontece, conclui que
quebrou. Foi o mesmo raciocínio que já tinha tirado "Faturar frete" e
"Cobrar no WhatsApp" desta tela.

**Confirmação de envio** (decisão 3): ao voltar de um link externo, o
navegador dispara `visibilitychange`. Um componente novo (estende
`AvisoDoSistema` — já é a superfície certa, escura, "mensagem do sistema",
`CLAUDE.md` §8) escuta esse retorno **só depois de o link do WhatsApp ter
sido tocado** (não em qualquer troca de aba) e pergunta "Enviei" / "Ainda
não". "Enviei" chama `marcarOrdemEnviadaAction`, que grava
`ordem_enviada_em = now()` no servidor; "Ainda não" só fecha o aviso, nada
muda no banco.

**Backend:** `marcarOrdemEnviada(empresaId, servicoId)` em
`src/lib/servicos/servicos.ts` — confere posse (mesmo padrão de
`buscarServico`), grava o timestamp. Idempotente: tocar "Enviei" de novo
(reabrindo o aviso por engano) só atualiza o mesmo timestamp, não é erro.

**Testes:** `tests/mensagens.test.ts` — a regra de montagem inteira,
**incluindo o caso mínimo como caso nomeado, não só um exemplo entre
outros**. `tests/servicos.test.ts` (soma) — `marcarOrdemEnviada` confere
isolamento (não grava em serviço de outra empresa).

---

## Tarefa 3 — Marcar como finalizado

A mais simples das cinco — um `UPDATE` guardado por estado.

`marcarServicoFinalizado(empresaId, servicoId)` em `servicos.ts`: exige que
o serviço esteja `em_andamento` (recusa se já `finalizado` ou `cancelado` —
mensagem de erro própria, não genérica) e grava `status_operacional =
'finalizado'`. Sem confirmação extra na tela — nenhum documento pede uma, e
o botão já segue a regra geral de estado carregando + toque repetido
ignorado (`CLAUDE.md` §8).

**A secundária aparece sempre que o frete estiver `em_andamento` — não
depende de `ordem_enviada_em`.** Decisão do fundador, ao corrigir a
contradição da Tarefa 2 (acima): "sempre visível" descrevia comportamento,
não momento de construir. Marcar como finalizado e enviar a ordem são ações
independentes — dá para finalizar um frete que nunca teve ordem enviada
(motorista combinado por telefone, por exemplo). A secundária nasce nesta
Tarefa 3, ao lado da principal (Escolher motorista / Enviar ordem no
WhatsApp) qualquer que seja o estado dela.

Ao finalizar, o detalhe perde a secundária e a tela volta a ficar sem
principal (finalizado sem cobrança é item 6) — mesmo padrão "botão sem ação
de fundo não aparece" do item 4.

**Testes:** `tests/servicos.test.ts` — transição válida, recusa a partir de
`finalizado` e de `cancelado`, isolamento (não finaliza serviço de outra
empresa).

---

## Tarefa 4 — Isolamento do Storage

A pendência aberta desde o item 1 (`docs/diario.md`, 08/08/2026: "balde
privado, caminho não é autorização, URL assinada gerada no servidor depois
de conferir a posse, RLS em `storage.objects` com falha fechada"). Sem UI —
só a fundação, pela mesma razão de item 3/4 Tarefa 1: infraestrutura de
risco isolada e testada antes de qualquer tela usá-la.

**Balde privado** `comprovantes`, criado nos dois projetos Supabase que já
existem (`ysldmzvszjxdgcbtaurh` desenvolvimento, `qutzsvrkaqvpluqxbhmp`
teste — `CLAUDE.md` §5, "Ambientes"). Produção nasce junto quando o projeto
de produção existir (§14, pendência já registrada).

**A garantia real não é o caminho do arquivo, é a checagem no servidor.**
Todo acesso passa por código do produto: o upload usa a chave
`service_role` (nunca exposta ao navegador, mesma classificação de
`CLAUDE.md` §4, "Os papéis embutidos do Supabase"), e a leitura é sempre
uma URL assinada com expiração curta, gerada depois de conferir
`Servico.empresa_id === sessão.empresaId`. **RLS em `storage.objects`
nega `anon`/`authenticated` por padrão** (mesma filosofia de "os papéis
embutidos" — `CLAUDE.md` §4): é defesa em profundidade, não a fronteira
real, porque `service_role` ignora RLS por atributo, igual às outras
tabelas.

Nome de arquivo: `{empresaId}/{uuid aleatório}.jpg` — a extensão é sempre
`.jpg` porque tudo é reprocessado em JPEG (Tarefa 5); o prefixo por empresa
é só organização, nunca a proteção.

**Dependência de execução, não de decisão:** criar o balde e as políticas
nos dois projetos exige acesso ao Supabase (dashboard ou o MCP já
disponível nesta sessão) — não uma escolha de produto, só um passo a
executar dentro da tarefa.

**Testes, extensão de `tests/isolamento/`:**
1. **Privilégio** (`tests/isolamento/privilegios.test.ts` ou arquivo
   próprio `storage.test.ts`) — `anon`/`authenticated` sem nenhum acesso a
   `storage.objects`, mesmo padrão de conferência por catálogo já usado
   para tabela e função.
2. **O contraste** (`CLAUDE.md` §3) — a função que gera a URL assinada,
   chamada com a sessão da empresa A e um `servicoId` da empresa B, recusa;
   a mesma chamada **sem** a checagem de posse (código temporário só para
   provar que o teste mede alguma coisa) teria gerado a URL — é o mesmo
   raciocínio do contraste de RLS, aplicado à checagem de aplicação em vez
   de política de banco, porque aqui é a aplicação que faz a fronteira.

---

## Tarefa 5 — Upload do comprovante

**Bibliotecas novas** (`package.json`): `@supabase/supabase-js` (cliente
oficial, usa a chave `service_role` no servidor para gravar no balde e
gerar URL assinada — Tarefa 4), `sharp` (reprocessamento de imagem — já
suportado nativamente na Vercel, é o que o `next/image` usa por baixo) e
uma biblioteca de detecção de tipo por conteúdo (`file-type`) para validar
por *magic bytes*, nunca por extensão ou tipo declarado (`CLAUDE.md` §4).

**Pipeline no servidor**, nesta ordem — cada passo é a defesa de uma frase
específica do `CLAUDE.md` §4 ("Upload de imagem"):

1. Rejeita acima de 10 MB **pelo tamanho declarado do corpo**, antes de ler
   o arquivo inteiro para memória.
2. Sniff por conteúdo (`file-type` sobre os primeiros bytes) — só aceita
   JPEG, PNG, WEBP, HEIC e HEIF (`CLAUDE.md` §4, HEIF acrescentado
   25/08/2026 — mesmo formato de contêiner que HEIC, rótulo diferente).
   Qualquer outra coisa (SVG incluso, mesmo que alguém troque a extensão) é
   recusada aqui, antes de qualquer decodificação.
3. JPEG/PNG/WEBP abrem com `sharp`, limite de dimensão de entrada
   configurado na própria instância (`limitInputPixels`). HEIC/HEIF NÃO
   passam pelo `sharp` para decodificar — o binário pré-compilado não
   decodifica HEIC de iPhone de verdade (medido, `CLAUDE.md` §4) — vão por
   `libheif-js` (WASM) em duas etapas, com a mesma checagem de dimensão
   ANTES de alocar os pixels (ver o comentário de `decodificarHeic`,
   `src/lib/servicos/comprovantes.ts`). Em ambos os casos: imagem pequena
   que expande para gigabytes na decodificação nunca chega a alocar tudo
   isso.
4. Redimensiona (maior lado em 1600px, mantendo proporção), recodifica em
   JPEG mirando ~300 KB (qualidade inicial fixa; se o resultado passar de
   um teto, reduz a qualidade em um segundo passo — nunca abaixo de um piso
   que ficaria feio). **Metadados EXIF somem neste passo por padrão** — o
   código nunca chama a opção que os preservaria.
5. Nome aleatório (`uuidv7`), grava no balde `comprovantes` (Tarefa 4).
6. `comprovante_url` no `Servico` guarda o **caminho** dentro do balde, não
   uma URL — a URL assinada é gerada a cada leitura, com expiração curta
   (mesma razão de "caminho não é autorização").

**Risco técnico validado (25/08/2026).** Medido, não suposto: o binário
pré-compilado do `sharp` NÃO decodifica HEIC de iPhone (só AVIF —
`CLAUDE.md` §4, comentário de `src/lib/servicos/comprovantes.ts`). Caminho
alternativo, decidido dentro da tarefa (a exigência "aceitar HEIC" já
estava decidida, só a forma de cumprir era técnica): `libheif-js` (WASM)
direto, sem passar pelo `sharp` para decodificar. **Testado com uma foto
HEIC real de iPhone**, fornecida pelo fundador: `3024×4032`, "Alta
Eficiência", decodificou certo, saiu `1200×1600`/153 KB/sem EXIF, e a
orientação conferida visualmente saiu correta — a foto não entrou no
repositório (imagem pessoal de terceiro, apagada depois de conferir).

**Tela — pílula em linha para anexar comprovante** (`docs/componentes.md`
linha 398 e linha 358, "detalhe do frete: campos → comprovante → ações,
sem lista depois" — a posição já está definida, só o desenho de dentro da
pílula não). **Lacuna registrada para o Design**, mesmo padrão de outras
lacunas deste projeto: não existe hoje em `docs/estilo.md`/`componentes.md`
o desenho de um seletor de foto (câmera/galeria) nem de uma miniatura de
comprovante já anexado — primeiro upload do produto. Construído com o mais
próximo que já existe (`PilulaEmLinha`, input de arquivo nativo por trás)
até o Design responder.

**Testes:** `tests/comprovante.test.ts` (ou dentro de `servicos.test.ts`) —
rejeita arquivo acima de 10 MB, rejeita tipo não permitido por conteúdo
(inclusive um SVG disfarçado de `.jpg`), confirma que o resultado final é
sempre JPEG sem EXIF, confirma isolamento (não grava `comprovante_url` em
serviço de outra empresa).

---

## Tarefa 6 — `server-only` em `src/lib/db/index.ts` e `src/lib/auth/index.ts`

**Ampliada na execução, 25/08/2026, decisão do fundador ao revisar o primeiro
passe do `/revisar`** — as duas linhas abaixo eram só a versão original desta
tarefa; ficam registradas aqui para não sobreviver só na conversa e no diário
(`docs/diario.md`, mesma data):

1. **Terceiro arquivo protegido**: `src/lib/db/sem-filtro-de-empresa.ts` (a
   "saída de emergência" do login, guarda `AUTH_DATABASE_URL`, único caminho
   por fora do filtro de empresa) também ganhou `import "server-only"`. O
   revisor apontou que a versão original chamava os outros dois de "os dois
   arquivos mais sensíveis do projeto" sem explicar por que este ficava de
   fora — e a proteção que ele tinha (trava de `eslint.config.mjs`, que não
   roda mais em `next build` desde o Next 16) é exatamente o tipo de
   proteção acidental que esta tarefa existe para substituir.
2. **Teste automatizado permanente**: `tests/protecao-server-only.test.ts`,
   cobrindo **por nome** (nunca por varredura, para um arquivo sensível novo
   sem proteção não passar despercebido) os três arquivos acima **mais
   `src/lib/servicos/comprovantes.ts`** — protegido desde a Tarefa 4, e o que
   guarda a chave que ignora o isolamento (`SUPABASE_SERVICE_ROLE_KEY`).
   Duas camadas: presença da linha em cada arquivo, e o efeito real (`node
   --import tsx`, com e sem a condição `react-server`, contra uma fixture de
   contraste sem o import). A regra que impede a lista de envelhecer — todo
   arquivo que receber `server-only` entra nela, no mesmo commit — fica
   escrita dentro do próprio teste, não só aqui. Substitui a frase abaixo
   ("não há teste automatizado permanente ... como foi na Tarefa 4"), que
   valia só para a versão original.

Acrescentada em 25/08/2026, decisão do fundador, ao aprovar a Tarefa 4: achado
durante aquela tarefa, fora do escopo dela, registrado para não se perder.

**O achado.** A Tarefa 4 adicionou `import "server-only"` a
`src/lib/servicos/comprovantes.ts` — se esse arquivo (ou algo que o importe)
for arrastado para o pacote que roda no navegador, o build do Next.js quebra
antes de publicar, em vez da chave `service_role` (que ignora RLS) ou o erro
de variável faltando aparecerem em produção. `src/lib/db/index.ts` (a conexão
com o banco) e `src/lib/auth/index.ts` (o segredo que assina sessão) não têm
essa mesma proteção. Hoje, se um deles fosse puxado por engano para o
navegador, o build ainda quebraria — mas por acidente, porque a biblioteca de
terceiro `pg` não roda em navegador, não porque existe uma trava pensada para
isso. Palavras do fundador, ao aprovar: "isso não é proteção, é sorte de
dependência: se ela mudar, ou se algum caminho não passar por ela, a trava
some sem ninguém notar." São os dois arquivos mais sensíveis do projeto.

**O que fazer.** `import "server-only"` no topo dos dois arquivos — mesma
linha, mesmo lugar de `comprovantes.ts`. Confirmar que `server-only` já
resolve no Vitest sem esforço extra: o alias em `vitest.config.mts` (Tarefa
4) aponta o pacote inteiro para `tests/stubs/server-only.ts`, então cobre
qualquer arquivo que o importe, não só `comprovantes.ts`.

**A prova, mesma técnica da Tarefa 4, para os dois arquivos**: criar
Client Component + rota temporários importando o arquivo do lado errado,
`npm run build`, confirmar que quebra apontando para o arquivo certo, apagar
os arquivos de teste depois. Não há teste automatizado permanente para isso
no projeto ainda — é verificação manual, feita e descartada, como foi na
Tarefa 4.

**Quando.** Depois da Tarefa 5, antes de o item 5 fechar — decisão do
fundador, "para não interromper o item 5 no meio".

---

## O que precisa chegar ao Design

- **Miniatura do comprovante anexado** — construída (`AnexarComprovante.tsx`)
  com o que já existia: `PilulaEmLinha` + `<img>` em `h-180`, `object-cover`
  (recorta a imagem). Três decisões sem desenho em `docs/estilo.md`/
  `componentes.md`, achado do `/revisar` na Tarefa 5 (25/08/2026), decisão do
  fundador ao revisar: **180px é provisório** — não existe altura de imagem
  na folha de estilo, o valor é do Design; se a miniatura deve **recortar ou
  mostrar a foto inteira**; se deve **abrir em tamanho cheio** ao tocar. As
  três resolvem juntas, na mesma resposta do Design. O rótulo da pílula
  ("Anexar comprovante" / "Trocar comprovante") também não está no
  inventário (`docs/componentes.md`, tabela "Onde cada tela usa o quê",
  linha do Detalhe do frete — só diz "pílula em linha para anexar
  comprovante", sem os dois estados) — mesma pendência. **Os textos de aviso também
  ficam fora do inventário** — lista completa em `docs/componentes.md`
  (seção "Aviso do sistema", "Lacuna — textos de aviso do upload de
  comprovante"), não repetida aqui de propósito: duas listas do mesmo
  conjunto de textos divergem cedo ou tarde, e a que ninguém confere
  primeiro é sempre a que envelhece (`CLAUDE.md` §3).
- **`FolhaDeTelefone`** (Tarefa 1) — mede contra a "Folha do campo que
  falta" já descrita em `docs/componentes.md` §12, mas é a primeira vez que
  o documento sai do papel; qualquer ajuste visual encontrado na construção
  volta como correção de estado, não decisão nova.
- **Etiqueta de "cancelado"** — pendência já registrada no item 4
  (`docs/especificacao.md` §7), sem mudança aqui; citada só para lembrar
  que continua aberta.
- **Quatro bordas registradas (quarto e quinto/sexto `/revisar`,
  25/08/2026), sem correção — não ocorrem no uso normal:**
  1. O detalhe do frete pode ter até três `AvisoDoSistema` independentes
     (ordem enviada, marcar finalizado, anexar comprovante), todos na
     mesma âncora fixa. Se dois aparecerem ao mesmo tempo, hoje eles se
     sobrepõem — cada um dispara por uma ação distinta da pessoa, então
     na prática exige tocar duas ações quase juntas. Sem desenho para
     "dois avisos ao mesmo tempo" em documento nenhum.
  2. Sessão vencida NO MEIO do envio (não ao abrir a tela) devolve 401,
     que `AnexarComprovante.tsx` mostra como aviso comum — a pessoa fica
     na tela, sem ser levada para Entrar. Mesmo comportamento não-escrito
     das outras ações de servidor desta tela (`AcaoOrdemDeServico`,
     `BotaoMarcarFinalizado`); não é regressão desta tarefa, mas também
     nunca foi decidido em documento.
  3. **Frete arquivado com comprovante** — achado do quinto `/revisar`.
     `page.tsx` não pede a URL assinada de um frete arquivado (evita o
     erro de servidor — ver acima), então a miniatura some e a pílula
     volta a dizer "Anexar comprovante", mesmo já havendo um gravado. A
     ação, se tocada, sempre recusa com "Frete não encontrado." (mesma
     regra de posse de qualquer escrita em frete arquivado) — não quebra
     a tela, só oferece um botão que nunca funciona ali. Sem documento
     que diga o que o detalhe de um frete arquivado deveria mostrar sobre
     comprovante.
  4. **Falha ao assinar a URL do storage — mesmo sintoma do item 3, sem
     estar arquivado.** Achado do sexto `/revisar`: `gerarUrlComprovante`
     devolve `null` numa falha do storage (nunca relança — ver acima),
     e `null` é o MESMO valor de "este frete nunca teve comprovante". Um
     frete normal, com comprovante de verdade, mostraria "Anexar
     comprovante" (não "Trocar") durante a falha, e um novo envio nessa
     janela sobrescreveria `comprovante_url` sem apagar o objeto anterior
     (§7) — o comprovante antigo fica órfão, não perdido, mas sem
     nenhuma tela mostrando que ele existia. Sem documento que distinga
     "sem comprovante" de "comprovante que não carregou desta vez".
- **"Para o dono salvar a foto" (`docs/especificacao.md` §4.2) é persona,
  não papel — decidido.** Achado do quinto `/revisar`, respondido pelo
  fundador ao aprovar a tarefa (25/08/2026): a rota de upload
  (`src/app/api/fretes/[id]/comprovante/route.ts`) usa `exigirSessao()`
  (qualquer papel), de propósito — **não** `exigirDono()`. O motorista não
  usa o produto (`CLAUDE.md` §12), então quem anexa é sempre quem opera —
  dono ou segundo usuário —, mesma lógica de lançar frete e enviar ordem,
  nenhum dos quais exige dono. "Para o dono" em `docs/especificacao.md`
  §4.2 é a persona do produto (o dono da transportadora, em contraste com
  o motorista), não o papel técnico `Usuario.papel = 'dono'`.

## Verificação obrigatória, resumida

- Caso mínimo da mensagem (Tarefa 2, citado ali) — teste nomeado, não
  exemplo solto.
- Isolamento do Storage: contraste com e sem a checagem de posse (Tarefa
  4) e privilégio de `anon`/`authenticated` (mesmo padrão de
  `tests/isolamento/`).
- HEIC real de iPhone antes de fechar a Tarefa 5 — **feito, 25/08/2026**
  (ver "Risco técnico validado" acima).
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` locais
  verdes a cada tarefa — mesma régua das anteriores. Esteira confirmada via
  `/onde-paramos`, não suposta (`CLAUDE.md` §2, "suíte verde ≠ esteira
  verde").
