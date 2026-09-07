# Corrige a desambiguação de município ausente na Origem do frete

Tarefa própria, achada testando a publicação em produção (07/09/2026) — não
estava na ordem de construção. Decisão do fundador: plano antes de código.

## Contexto

`resolverMunicipio` já roda para os dois campos no salvar — `origem_texto` e
`destino_texto`, os dois, sempre (`src/lib/servicos/servicos.ts`,
`normalizarEntrada`). Isso não muda nesta tarefa; já está certo.

O que falta é só visual, mas o efeito é real: a busca ao vivo que mostra
"Município reconhecido" — a lista de sugestões que aparece enquanto a pessoa
digita, com a pílula que já inclui a UF — existe **só para o Destino**
(`TelaLancarFrete.tsx`, o `useEffect` que chama `buscarMunicipiosAction`
escuta apenas `destinoTexto`, nunca `origemTexto`).

**A diferença entre os dois campos, e por que ela importa:**

- Quando o texto digitado casa com **exatamente um** município,
  `resolverMunicipio` resolve sozinho, no Origem igual no Destino — sem
  problema nenhum, visível ou não.
- Quando o texto é **ambíguo** ("Bom Jesus", que existe em cinco estados) ou
  **não encontrado** (erro de digitação, apelido local), `resolverMunicipio`
  devolve `situacao: "ambiguo"`/`"nao_encontrado"` e `*_municipio_id` fica
  nulo. No Destino, a pessoa via a lista de sugestões, não escolheu nenhuma,
  e pelo menos tinha a chance. **No Origem, essa chance nunca existiu** — o
  frete salva normalmente, sem aviso nenhum, e `origem_municipio_id` fica
  nulo sem que ninguém tenha como perceber.

Isso é pior do que nunca resolver: falha em silêncio, só nos casos
ambíguos — a pessoa não vê diferença nenhuma entre um frete que resolveu e um
que não resolveu.

**O que se perde com `origem_municipio_id` nulo, nomeado no item 2
(`docs/especificacao.md`, dado irrecuperável):** sem os dois lados do par
origem/destino, não existe cálculo de distância (`DistanciaRota`, item 9), e
sem distância não existe R$/km nem a sugestão de valor da fase 2 — nem depois,
porque o texto original não fica marcado como "precisa resolver de novo", só
fica com o campo vazio.

**O erro se propaga sozinho.** `origemPadraoDoLancamento`
(`src/lib/servicos/servicos.ts:454`) pré-preenche a Origem do próximo frete
com `origem_texto` do último — sempre **texto solto**, nunca o município
resolvido (`buscarUltimoServico` seleciona só `origem_texto`,
`servicos.ts:440-444`; e mesmo que selecionasse `origem_municipio_id`, não
haveria o que herdar quando ele já é nulo). Uma origem ambígua que ficou sem
município no primeiro frete vira o texto padrão do segundo, que falha do
mesmo jeito, que vira o padrão do terceiro — a falha não fica presa a um
frete, ela contamina todos os seguintes até alguém digitar algo diferente por
conta própria. **Corrigir a UI já corrige a propagação**: quando a pessoa
escolhe uma sugestão (`"Nome/UF"`), é esse texto — já desambiguado — que vira
o padrão do próximo frete, e `resolverMunicipio` reconhece o sufixo de UF.
Não precisa mexer em `origemPadraoDoLancamento`.

**A medição dos 10% já existe para pegar exatamente isso, e não está rodando
em lugar nenhum.** `scripts/medir-municipios.mts`
(`medirResolucaoDeMunicipios`) já separa `ambiguo` de `nao_encontrado`, **por
campo** — origem e destino contados à parte. É a ferramenta certa para
acompanhar se a ambiguidade cai depois desta correção. Conferido antes de
escrever este plano: não existe gatilho automático nenhum —
`.github/workflows/ci.yml` só dispara em `push`/`pull_request`, não há
`schedule:` em workflow nenhum, nem tarefa agendada configurada. É comando
manual, só roda quando alguém lembra (`npm run medir:municipios --
--empresa=<id>`). Não é lacuna desta tarefa — é lacuna de operação, do
fundador decidir se vale automatizar.

**Confirmação de produção — medida, não suposta.** Consulta rodada pelo
fundador no SQL Editor do projeto de produção (nome real da tabela é
`servico`, minúsculo — `@@map("servico")`, não o nome do model do Prisma):

```sql
SELECT
  count(*) FILTER (WHERE origem_texto IS NOT NULL) AS origem_com_texto,
  count(*) FILTER (WHERE origem_texto IS NOT NULL AND origem_municipio_id IS NULL) AS origem_nao_resolvida,
  count(*) FILTER (WHERE destino_texto IS NOT NULL) AS destino_com_texto,
  count(*) FILTER (WHERE destino_texto IS NOT NULL AND destino_municipio_id IS NULL) AS destino_nao_resolvida
FROM servico
WHERE arquivado_em IS NULL;
```

Resultado: **1 origem com texto, 0 não resolvidas; 1 destino com texto, 0 não
resolvidas.** É exatamente o frete de teste desta sessão
("Transportadora Teste Publicacao") — a origem digitada foi "Fortaleza", sem
UF, e resolveu sozinha porque casa com exatamente um município. Nenhum dado
de cliente real existe em produção ainda, e não há fretes com origem ambígua
para reabrir — a pergunta sobre remediar dado existente não se aplica hoje.
Fica só como o procedimento a seguir se aparecer depois: não é migração
automática (ninguém pode chutar qual opção ambígua é a certa), é alguém
abrindo o frete e escolhendo, uma vez que a tela passar a mostrar onde
escolher.

## O que muda

**Tarefa 1 — extrai a busca de município para reutilizar.** Hoje só o
Destino usa; com o Origem precisando da mesma coisa, são dois casos de uso
reais, não abstração especulativa (`CLAUDE.md` §6). Um hook
(`useSugestaoDeMunicipio(texto: string)`, ou nome equivalente) encapsula o
debounce de 200ms e a chamada a `buscarMunicipiosAction` — usado duas vezes,
uma vez por campo, cada um com seu próprio estado de sugestões (Origem e
Destino podem estar sendo digitados/sugeridos ao mesmo tempo, não dá para
compartilhar uma lista só).

**Tarefa 2 — aplica ao campo Origem.** O bloco "Município reconhecido"
(pílulas com `nome/UF`) passa a aparecer também abaixo do campo Origem,
espelhando o Destino — a pílula escolhida grava em `setOrigemTexto`, não em
`setDestinoTexto`. Mesmo componente (`TelaLancarFrete.tsx`), usado tanto em
`/fretes/novo` quanto em `/fretes/[id]/editar` (o mesmo arquivo atende os
dois — conferido, não é preciso tocar em `editar/page.tsx`).

**Cronômetro dos 26 segundos — portão de saída, não fecha sem medir.** Esta é
a tela medida em 14/08/2026 (`docs/diario.md`), 26 segundos, contra a meta de
30 do `CLAUDE.md` §1. Acrescentar uma lista de sugestões a mais campo (mesmo
que só apareça quando o texto for ambíguo) é a primeira mudança nessa tela
desde a medição — remedir no celular, do jeito que o item 3 original mediu,
antes de considerar a tarefa fechada.

## O que NÃO muda

- `resolverMunicipio`, a normalização (`separarUf`, `normalizarParaBusca`) e
  o salvar (`normalizarEntrada`) — já corretos para os dois campos, a falha
  nunca esteve aqui.
- `origemPadraoDoLancamento` — continua herdando texto solto de propósito;
  corrigir a UI já resolve a propagação (ver "Contexto" acima), sem precisar
  mudar essa função.
- A automação da medição dos 10% — achado, registrado como pendência de
  operação, não parte da construção desta tarefa.

## Teste novo

Hoje só existe teste para a resolução em si (`resolverMunicipio`) e para a
medição (`medirResolucaoDeMunicipios`) — nenhum cobre que o Destino mostra
sugestão e o Origem não, porque não existe suíte de tela/componente no
projeto (lacuna já registrada em `CLAUDE.md` §14, "Entradas de navegação não
têm cobertura automatizada"). Sem mudar esse precedente aqui — verificação
desta tarefa é manual, no navegador e no celular (cronômetro incluído), não
uma suíte nova.
