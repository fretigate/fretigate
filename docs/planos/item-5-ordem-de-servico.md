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
- Secundária **"Marcar como finalizado"** sempre visível junto da
  principal, nesta fatia (a ação em si nasce na Tarefa 3 — aqui só o
  encaixe do botão, já ligado).

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
   JPEG, PNG, WEBP, HEIC. Qualquer outra coisa (SVG incluso, mesmo que
   alguém troque a extensão) é recusada aqui, antes de qualquer
   decodificação.
3. Abre com `sharp`, limite de dimensão de entrada configurado na própria
   instância (`limitInputPixels`) — imagem pequena que expande para
   gigabytes na decodificação nunca chega a alocar tudo isso.
4. Redimensiona (maior lado em 1600px, mantendo proporção), recodifica em
   JPEG mirando ~300 KB (qualidade inicial fixa; se o resultado passar de
   um teto, reduz a qualidade em um segundo passo — nunca abaixo de um piso
   que ficaria feio). **Metadados EXIF somem neste passo por padrão** — o
   código nunca chama a opção que os preservaria.
5. Nome aleatório (`uuidv7`), grava no balde `comprovantes` (Tarefa 4).
6. `comprovante_url` no `Servico` guarda o **caminho** dentro do balde, não
   uma URL — a URL assinada é gerada a cada leitura, com expiração curta
   (mesma razão de "caminho não é autorização").

**Risco técnico a validar, não decisão de produto:** suporte a HEIC
depende de como o `sharp` desta versão foi compilado (leitura de HEIF nem
sempre vem no binário padrão). **Antes de considerar esta tarefa pronta,
testar com uma foto HEIC real de iPhone** — é o formato padrão do
motorista/dono tirando foto no pátio (`CLAUDE.md` §4, "HEIC é
obrigatório"). Se o suporte não vier de fábrica, decidir o caminho
alternativo (biblioteca de conversão à parte) é ajuste de implementação
dentro da tarefa, não retorna ao fundador — a exigência ("aceitar HEIC")
já está decidida, só a forma de cumprir é técnica.

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

## O que precisa chegar ao Design

- **Seletor de foto (câmera/galeria) e miniatura do comprovante anexado**
  — Tarefa 5, sem desenho hoje em `docs/estilo.md`/`componentes.md`.
- **`FolhaDeTelefone`** (Tarefa 1) — mede contra a "Folha do campo que
  falta" já descrita em `docs/componentes.md` §12, mas é a primeira vez que
  o documento sai do papel; qualquer ajuste visual encontrado na construção
  volta como correção de estado, não decisão nova.
- **Etiqueta de "cancelado"** — pendência já registrada no item 4
  (`docs/especificacao.md` §7), sem mudança aqui; citada só para lembrar
  que continua aberta.

## Verificação obrigatória, resumida

- Caso mínimo da mensagem (Tarefa 2, citado ali) — teste nomeado, não
  exemplo solto.
- Isolamento do Storage: contraste com e sem a checagem de posse (Tarefa
  4) e privilégio de `anon`/`authenticated` (mesmo padrão de
  `tests/isolamento/`).
- HEIC real de iPhone antes de fechar a Tarefa 5.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` locais
  verdes a cada tarefa — mesma régua das anteriores. Esteira confirmada via
  `/onde-paramos`, não suposta (`CLAUDE.md` §2, "suíte verde ≠ esteira
  verde").
