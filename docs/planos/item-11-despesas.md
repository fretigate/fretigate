# Plano — item 11: Despesas

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 10 fechou no commit `f0c7cc5`. Por decisão do fundador, 01/09/2026, o
item 11 entra antes do item 13 (assinatura) — é o mais barato dos que restam
(lista, formulário e filtros, sem integração e sem decisão em aberto,
`docs/especificacao.md` §9, "O que é MVP") e fecha duas pendências que já
existem no produto:

- A pastilha **Lucro** da dashboard, presa no estado de convite desde o item
  8 (`docs/planos/item-8-dashboard.md`, "Lucro no mês — depende de `Despesa`
  (item 11), que não existe no schema").
- `/despesas`, construído no item 8 como tela provisória — só o estado vazio
  que explica por que o Lucro não tem número (`src/app/(app)/despesas/
  page.tsx`, comentário: "Esperado até o item 11 da ordem de construção
  substituir esta tela").

`docs/especificacao.md` §4.8 e a entidade `Despesa` (§6, linha 1216) já
definem o essencial: `data · categoria · valor · descricao · veiculo_id ·
servico_id`; cadastro curto (chips Hoje/Ontem/Outra data para a data, nunca
digitação — decisão registrada desde a primeira sessão); só `valor` e `data`
obrigatórios; entrada por "Mais" e pelo card de Lucro em estado de convite.
`docs/componentes.md` (linhas 409, 477-479) e `docs/navegacao.md` (linha 47)
já têm a tela desenhada; o protótipo (`referencia/.../TelaDespesas.dc.html`)
é evidência corroborante, nunca autoridade (`CLAUDE.md` §13).

## Três decisões do fundador, 01/09/2026

**1. Vínculo só a caminhão nesta tarefa — `servico_id` nasce no schema, sem
tela.** A especificação lista os dois vínculos (`veiculo_id` e
`servico_id`), mas o Design (protótipo e os dois documentos de tela)
desenhou só caminhão, e os dois concordam entre si. O critério é o mesmo que
já cortou "dados bancários" (`CLAUDE.md` §14) — campo sem leitor — só que
mais forte aqui: o vínculo a caminhão **tem** consumidor (custo por
veículo), o vínculo a frete não alimenta nada hoje (nenhuma tela mostra
"quanto custou este frete", e o Lucro é do período, não por frete).
Diferença do precedente de dados bancários: ali o campo não chegou a ser
criado; aqui a coluna `servico_id` **entra na migration desta tarefa**,
porque a especificação já a lista desde a definição da entidade — só a tela
de escolher um frete fica de fora. Sem conferência de posse contra a
empresa no serviço (`CLAUDE.md` §3) enquanto nenhum caminho gravar o campo —
mesmo padrão já registrado para `titulo_receber.relatorio_id` antes da
Tarefa 4 do item 7. Lacuna registrada abaixo, com o gatilho: ganha tela
quando existir quem leia (candidato natural: lucro por frete, fora do MVP).
Pedido ao Design: perguntar, não corrigir — a especificação promete os dois
vínculos e o desenho tem um; o Design diz se o segundo foi esquecido ou
descartado.

**2. Categoria — texto livre no banco, chip fechado na interface, as sete do
protótipo.** Mesmo padrão de `Recebimento.forma` (`docs/especificacao.md`
§9: "texto livre, sem inventário fechado no banco"). Lista, na ordem
(Diesel primeiro, de propósito — é o gasto mais frequente):
**Diesel · Manutenção · Motorista · Pedágio · Pneu · Documento · Outro**.
"Outro" revela campo de texto livre, mesmo mecanismo já construído em
`FolhaDeRecebimento.tsx` (o texto digitado é o que grava, nunca a palavra
"Outro") — sem isso, a pessoa escolheria a categoria errada só para fechar,
e o dado ficaria pior que se não existisse. Texto livre no banco também
significa que uma categoria nova (ex.: "Seguro") não exige migration — só
chip novo na interface.

**3. R$/km líquido de despesa fica fora do item 11 — e não é fase 2, é
decisão de produto em aberto.** O protótipo tem a frase "vincular a um
caminhão faz a despesa entrar no R$/km dele", que a especificação não
confirma: hoje R$/km é receita por quilômetro (valor do frete ÷ km, `CLAUDE.md`
§7, `resumoDoCaminhao`). Descontar despesa ali trocaria o **significado** do
número (receita → margem) sem trocar o rótulo — o dono olharia "R$ 2,45/km"
achando que é o que recebe, quando seria o que sobra. Fica registrado como
decisão em aberto (não como fase 2), com três saídas possíveis: R$/km
continua receita e custo por km vira número próprio; R$/km passa a ser
margem e o rótulo muda junto; ou os dois lado a lado. Decide-se com dado
real de uso, não agora. `veiculo_id` desta tarefa é só vínculo informativo —
não altera `resumoDoCaminhao`. Pedido ao Design: a frase do protótipo
promete um comportamento que o produto não tem — ou sai, ou vira pedido
explícito.

## O que é reaproveitado sem alteração

| Peça | De onde |
|---|---|
| Chips Hoje/Ontem/Outra data + calendário | `FolhaDeCalendario.tsx` (mesmo uso de `FolhaDeRecebimento.tsx`) |
| "Outro" com campo de texto livre | Mesmo mecanismo de `FolhaDeRecebimento.tsx` (forma de pagamento) |
| Teclado numérico sobreposto para o valor | `TecladoNumerico.tsx` |
| Escolher o caminhão do vínculo | `FolhaDeBusca.tsx` (mesmo componente do Lançamento de frete) |
| Filtro de Período (Este mês/Mês passado/Todas as despesas) | `FolhaDePeriodo.tsx`, `resolverPeriodoDaUrl` (`src/lib/utils/periodo.ts`) — sem estender: 3 janelas, mesmas de Fretes/Cobranças, não as 4 do protótipo (a especificação não trava um conjunto específico) |
| Teto de 50 sem período escolhido | `resolverLimiteDaLista` (`src/lib/utils/periodo.ts`) |
| Filtro de Categoria dinâmico | `FolhaDeBusca.tsx`, itens = categorias distintas já lançadas (mesma técnica do chip "Cliente" em `ListaFretes.tsx`, `clientesUnicos`) — cobre categoria digitada via "Outro" sem lista fixa perder nada. **O componente já tem `CampoBusca` embutido** (mesmo motivo de existir em "Cliente": lista que cresce com o uso) — se alguém digitar muitas categorias diferentes em "Outro", a busca já resolve, sem trabalho extra nesta tarefa |
| Conferência de posse do vínculo contra a empresa | `buscarCaminhao` (mesmo padrão de `Motorista.veiculo_habitual_id`, `src/lib/servicos/motoristas.ts`) |
| "Arquivar X" em texto, no fim do formulário | Mesmo padrão de cliente/motorista/caminhão — já previsto em `docs/componentes.md` linha 409 ("formulários de cliente, motorista e despesa: salvar no fim, arquivar em texto abaixo") |
| Envelope de sessão | `comoUsuario` (`CLAUDE.md` §9) — dono e operador têm o mesmo acesso a Despesas (não é tela de Ajustes) |

## O que fica de fora, e por quê

| Onde | O que falta | Motivo |
|---|---|---|
| `Despesa.servico_id` | Tela de vínculo a frete | Decisão 1 — sem consumidor hoje; coluna existe, sem UI |
| `resumoDoCaminhao` / R$/km | Descontar despesa vinculada | Decisão 3 — trocaria o significado do número sem avisar; decisão de produto em aberto |
| Ícone da linha "Despesas" em Mais | `docs/icones/` não tem um | Nenhum dos ícones existentes (`docs/icones/`) foi feito para despesa; inferência da construção (reaproveita um já existente, texto registrado no código) até o Design decidir um |
| Trava de data futura em `Despesa.data` | — | Proposta: **trava, mesmo padrão de `Recebimento.data`** ("nunca é futura") — despesa é fato que já aconteceu, mesma natureza de um recebimento, e destrava uma pastilha de Lucro inflada por lançamento adiantado. Decisão da construção, registrada aqui para o fundador corrigir se discordar |

---

## As tarefas

### Tarefa 1 — Fundamentos: schema, migration, serviço

**Migration** (escrita à mão — mesmo motivo já documentado nas migrations
recentes: o banco de sombra do `prisma migrate dev` quebra em
`storage.buckets`, que só existe no projeto Supabase de verdade).

```prisma
model Despesa {
  id String @id @default(uuid(7)) @db.Uuid

  data DateTime @db.Timestamptz(6)

  /// Texto livre — sem inventário fechado no banco (mesmo padrão de
  /// Recebimento.forma). A lista fechada (Diesel · Manutenção · Motorista ·
  /// Pedágio · Pneu · Documento · Outro) é da interface.
  categoria String?

  /// Centavos, inteiro (CLAUDE.md §7). Único campo junto de `data`
  /// obrigatório para salvar (docs/especificacao.md §4.8).
  valor Int

  descricao String?

  /// Vínculo informativo a um caminhão desta empresa — conferido contra a
  /// empresa no serviço antes de gravar (CLAUDE.md §3: o Postgres não
  /// aplica RLS na checagem de FK). Não altera resumoDoCaminhao/R$-por-km
  /// (decisão do fundador, 01/09/2026 — ver docs/planos/item-11-despesas.md).
  veiculo_id String?  @db.Uuid
  veiculo    Veiculo? @relation(fields: [veiculo_id], references: [id], onDelete: Restrict)

  /// Vínculo a um frete — coluna existe desde esta migration (já prevista
  /// em docs/especificacao.md §6), SEM tela para gravá-la ainda e SEM
  /// conferência de posse no serviço (mesmo padrão de
  /// titulo_receber.relatorio_id antes da Tarefa 4 do item 7): nenhum
  /// caminho grava este campo hoje. Requisito explícito para quem
  /// construir a tela de vínculo a frete depois.
  servico_id String?  @db.Uuid
  servico    Servico? @relation(fields: [servico_id], references: [id], onDelete: Restrict)

  empresa_id String  @db.Uuid
  empresa    Empresa @relation(fields: [empresa_id], references: [id], onDelete: Restrict)

  criado_em     DateTime  @default(now()) @db.Timestamptz(6)
  atualizado_em DateTime  @default(now()) @updatedAt @db.Timestamptz(6)
  /// §7 — nada é apagado. Preenchido = arquivado.
  arquivado_em DateTime? @db.Timestamptz(6)

  @@index([empresa_id])
  @@map("despesa")
}
```

RLS: `ENABLE`/`FORCE ROW LEVEL SECURITY`, política `despesa_isolamento`
(`USING`/`WITH CHECK` idênticos, `empresa_id = contexto` — mesma forma de
toda tabela de domínio, `CLAUDE.md` §9). `GRANT SELECT, INSERT, UPDATE ON
"despesa" TO "fretigate_app"` — sem `DELETE` (nada é apagado; arquivar é
`UPDATE`).

**Serviço** — novo `src/lib/servicos/despesas.ts`, mesmo formato de
`caminhoes.ts`/`motoristas.ts`:

- `listarDespesas(empresaId, { periodo, categoria })` — `arquivado_em: null`,
  ordenado por `data` desc, filtro de período (`Periodo | null`) e categoria
  opcionais.
- `buscarDespesa(empresaId, id)`.
- `criarDespesa` / `editarDespesa(empresaId, dados)` — `normalizarEntrada`
  confere `valor > 0`; quando `veiculo_id` vier preenchido, chama
  `buscarCaminhao(empresaId, veiculo_id)` e recusa se não achar (mesmo
  padrão de `Motorista.veiculo_habitual_id`) — **teste próprio** para essa
  conferência (`CLAUDE.md` §3).
- `arquivarDespesa(empresaId, id)`.
- `somaDespesasDoMes(empresaId, hoje)` — vive em `src/lib/servicos/
  dashboard.ts` (não aqui), ao lado de `resumoDoMes`/`resumoDeRodagemDoMes`:
  mesma janela de mês (`limitesDoMes`, já privada naquele arquivo), mesmo
  motivo — a agregação por mês para a empresa inteira já mora lá.

**`src/lib/utils/despesa.ts`** (novo, sem `db` — importável por componente
cliente, mesmo motivo de `TIPOS_VEICULO` em `caminhao.ts`):
`CATEGORIAS_DESPESA = ["Diesel", "Manutenção", "Motorista", "Pedágio",
"Pneu", "Documento", "Outro"] as const`.

**Testes** (`tests/servicos/despesas.test.ts` ou junto de um arquivo
existente — decisão de implementação):
- CRUD básico, `arquivado_em` filtrando fora da lista e da soma.
- `valor` obrigatório > 0; `data` obrigatória.
- `veiculo_id` de outra empresa é recusado (o contraste que prova a
  conferência de posse — `CLAUDE.md` §3).
- `veiculo_id` de caminhão arquivado continua aceito (mesmo motivo do
  precedente em `motoristas.ts`: vínculo existente não pode sumir).
- `somaDespesasDoMes`: despesa fora do mês não entra; despesa arquivada não
  entra; soma cruza a virada do mês em fuso de Fortaleza (mesmo cuidado já
  presente nos testes de `resumoDoMes`).

**Testes de isolamento** — `tests/isolamento/schema.test.ts`:
acrescenta `despesa: [politicaDeIsolamento("despesa", "empresa_id")]` a
`POLITICAS_ESPERADAS`. `tests/isolamento/vazamento.test.ts`: acrescenta
`despesa` a `TABELAS_DO_LACO` (contraste com e sem contexto — a leitura
dinâmica de `Object.keys` já ajusta a contagem mínima, `CLAUDE.md` §3, "a
contagem de verificações"), e inclui a tabela na ordem de limpeza do fim do
arquivo (antes de `veiculo`/`servico`, pela FK).

### Tarefa 2 — Telas: lista, cadastro/edição, entradas no fluxo

**Lista** (`src/app/(app)/despesas/page.tsx` + `ListaDespesas.tsx`,
substitui o stub) — `docs/componentes.md` linha 477: sem principal, pílula
de cabeçalho **+ Nova**, chips de Período e Categoria. Total no topo
(`docs/especificacao.md` §4.8: "com total no topo") — mesmo texto
contextual já usado em `ListaFretes.tsx` (`N despesas · R$ X`, ajustando
para "50 mais recentes" quando cortado sem filtro, mesmo padrão). Linhas
agrupadas por dia (mesmo componente de agrupamento de `ListaFretes.tsx`).
Estado vazio: principal **Lançar a primeira despesa**, texto explicando que
o Lucro depende dela (`docs/componentes.md` linha 479, `docs/navegacao.md`
linha 47).

**Cadastro/edição** (`src/app/(app)/despesas/nova/page.tsx` +
`src/app/(app)/despesas/[id]/page.tsx`, sem perfil intermediário — a linha
da lista abre direto no formulário, `docs/navegacao.md` linha 47: "Linha →
edição"). `docs/componentes.md` linha 478: principal **Salvar despesa**,
teclado numérico próprio para o valor, chips de categoria e de vínculo.

- Valor: `CampoTocavel` + `TecladoNumerico` (mesmo padrão de
  `FolhaDeRecebimento`).
- Data: chips Hoje/Ontem/Outra data (mesmo componente de calendário —
  **trava contra o futuro**, ver "O que fica de fora").
- Categoria: `ChipEscolha` com `CATEGORIAS_DESPESA`, "Outro" revela
  `CampoTexto` (mesmo mecanismo de `FolhaDeRecebimento`).
- Descrição: `CampoTexto`, opcional.
- Vínculo: pílula tocável abrindo `FolhaDeBusca` com os caminhões da
  empresa (`listarCaminhoes`) + opção "Sem vínculo".
- **Arquivar despesa**, texto destrutiva no fim, só na edição — rótulo
  corrigido em relação ao protótipo (que usa "Excluir"): "nada é apagado"
  (`CLAUDE.md` §7), mesmo padrão de "Arquivar caminhão"/"Arquivar cliente".

**Server Actions** (`src/app/(app)/despesas/acoes.ts`) — schema `zod`,
envelope `comoUsuario`, mesmo formato de `caminhoes/acoes.ts`.

**Entradas no fluxo:**
- `src/app/(app)/mais/page.tsx` — nova linha "Despesas" (seção Ferramentas
  ou Cadastros — a decidir na construção; ícone reaproveitado de um
  existente, registrado como pedido ao Design).
- `src/app/(app)/page.tsx` — a pastilha Lucro deixa `convite` fixo: usa
  `somaDespesasDoMes` (Tarefa 1) junto de `resumoDoMes.faturamentoCentavos`
  já existente. **Convite só quando não houver despesa lançada no mês**
  (`CLAUDE.md` §8, regra 10 — mesmo critério já usado em Rodagem: cobertura
  zero, não frete zero). **A armadilha a evitar, nomeada pelo fundador**: com
  faturamento > 0 e zero despesa lançada, a conta `faturamento − 0` dá um
  número que parece lucro real e não é — é a mesma armadilha do R$/km sem
  km. O gatilho do convite é a **existência** de despesa no mês (contagem,
  não o valor da soma), nunca `despesasCentavos === 0` tratado como "sem
  despesa" — os dois coincidem hoje porque `valor > 0` é obrigatório em toda
  despesa, mas o convite decide pela ausência de lançamento, não pela conta.
  Caso de teste explícito: faturamento > 0, zero despesa no mês → convite;
  a partir da primeira despesa lançada (qualquer valor) → número real, ainda
  que pequeno. Valor = faturamento − despesas do mês; apoio = "a conta" por
  extenso (`docs/especificacao.md` §4.6: "com a conta como apoio") — texto
  proposto **"R$ X de faturamento − R$ Y de despesas"**, pendente de
  confirmação do Design (mesmo tratamento já dado a outros textos exatos do
  item 8).

**Testes:** este item não tem suíte de tela/componente (mesma decisão já
registrada no item 7/8, `CLAUDE.md` §14) — verificação manual no navegador:
lançar despesa, ver a lista, editar, arquivar, conferir que a pastilha Lucro
sai do convite e mostra o valor certo.

---

## Lacunas registradas, não corrigidas agora

- **Vínculo a frete** (`Despesa.servico_id`) — coluna existe, sem tela.
  Ganha tela quando existir quem leia (candidato: lucro por frete, fora do
  MVP). Pergunta ao Design registrada acima.
- **R$/km líquido de despesa** — decisão de produto em aberto, não fase 2.
  As três saídas possíveis estão listadas acima; decide-se com dado real de
  uso. Pergunta ao Design registrada acima (a frase do protótipo promete
  comportamento que o produto não tem).
- **Ícone da linha "Despesas" em Mais** — nenhum ícone existente foi feito
  para isso; pedido ao Design.
- **Trava de data futura em `Despesa.data`** — decisão da construção
  (mesmo padrão de `Recebimento.data`), confirmada pelo fundador na
  aprovação do plano.
- **Prejuízo (lucro negativo) sem tratamento visual definido** — achado do
  `/revisar`: com despesa maior que o faturamento, a pastilha "Lucro no mês"
  mostra `formatarCentavos` de um número negativo ("R$ -X,XX", o sinal
  depois de "R$", sem cor de alerta). Nenhum documento define sinal, rótulo
  ou cor para prejuízo — `docs/estilo.md` só nomeia `#B3401A` para
  "vencido", outro domínio. O número está certo (medido em
  `tests/dashboard.test.ts`, "despesa maior que o faturamento"); só o
  tratamento visual fica em aberto. Pedido ao Design.
- **`Voltar` de Despesas fixo em `/mais`, embora existam duas origens**
  (Mais e o card de Lucro da dashboard, `docs/navegacao.md` linha 47) —
  achado do `/revisar`: "Regras de navegação" define Voltar como "leva de
  volta à origem", sem cobrir o caso de duas origens diferentes. Mesma
  lacuna que já existe em outras telas com mais de uma origem (ex.:
  Relatório — montagem); não é peculiar desta tarefa. `/mais` escolhido por
  ser a origem mais estável (Despesas passa a viver ali permanentemente;
  a pastilha Lucro é um atalho a mais, não o lar da tela).
