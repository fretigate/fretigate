# Plano curto: duas consultas repetidas, já diagnosticadas

Causa e conserto já decididos (achados anteriores, confirmados com número
real de produção em 12/09/2026 — `docs/diario.md`). Este plano define como
tirar a repetição sem abrir uma exceção na regra de segurança que a
primeira delas protege.

## 1. Tipo de operação buscado duas vezes ao salvar frete (~30ms)

`criarServicoAction`/`editarServicoAction` (`src/app/(app)/fretes/acoes.ts`)
buscam o tipo ativo via `buscarTipoOperacaoAtivo(empresaId)` antes de
chamar o serviço — essa busca já passa por `db(empresaId)`, então o id
devolvido **já está** provado pertencer à empresa (RLS não deixaria vir de
outra). Mesmo assim, `criarServico`/`editarServicoComProtecaoDeTitulo`
(`src/lib/servicos/servicos.ts`, `titulos.ts`) buscam de novo por dentro
(`buscarTipoOperacao`, rotulado `(2a-vez)`) — é a conferência que o
`CLAUDE.md` §3 exige ("toda referência... precisa de conferência no
serviço, de que o alvo pertence à mesma empresa"), então **não pode
simplesmente sumir**: outro chamador, no futuro, pode não ter essa garantia
de antemão.

**Conserto:** `DadosServico.tipo_operacao_id` vira **opcional**.
`fretes/acoes.ts` deixa de buscar o tipo ativo antes de chamar o serviço —
simplesmente não envia `tipo_operacao_id`. Dentro de `normalizarEntrada`
(`servicos.ts`), quando o campo vem preenchido, valida como sempre
(`buscarTipoOperacao`); quando vem ausente, resolve **e** valida na mesma
consulta (`buscarTipoOperacaoAtivo`, que só devolve tipo ativo e não
arquivado da própria empresa — `db(empresaId)`). A garantia do §3 continua
incondicional, e passa a ser satisfeita numa consulta só, não duas —
diferente de um desenho que aceitasse do chamador um valor "já validado":
a validação de verdade sempre roda dentro do serviço, nunca é responsabilidade
de quem chama provar antes.

## 2. Soma do mês atual, três vezes (~102–469ms por chamada, de produção)

`resumoDoMes`, `resumoDeLucroDoMes` e `faturamentoPorMes` (`src/lib/
servicos/dashboard.ts`) cada uma chama `somaDoMes` para o **mês corrente**
com o mesmo filtro exato (mesma empresa, `arquivado_em: null`,
`status_operacional != cancelado`, mesma janela `[gte, lt)`) — já
identificado no próprio código (`faturamentoPorMes-atual(3a-vez)`, rótulo
existente). Produção mediu o custo de duas das três chamadas isoladamente
(`resumoDoMes-atual`: 102–469ms, 4 amostras; `resumoDeLucroDoMes-atual`:
418ms, 1 amostra — `vercel logs`, janela de ~1h32min, 12/09/2026); a
terceira roda a mesma consulta e não foi observada na janela de log
puxada, sem razão para custar diferente.

**Conserto:** `page.tsx` calcula a soma do mês atual **uma vez**
(`iniciarSomaDoMesAtual`, dispara a consulta na hora que é chamada) e passa
o resultado para as três funções. O valor compartilhado carrega a empresa
e o mês a que pertence (`SomaDoMesAtual { empresaId, primeiroDiaDoMes,
promessa }`), e cada função confere os dois (`somaMesAtualValida`) antes de
reaproveitar — dinheiro não pode depender de um chamador futuro passar o
valor certo sem nada que force a checagem; se a empresa ou o mês não
baterem, a função ignora o valor recebido e calcula a própria soma, do
jeito que já faz hoje. `resumoDoMes` ainda calcula o mês **anterior** por
conta própria — só o atual é compartilhado. `faturamentoPorMes` usa o
valor recebido só para o último elemento do array (o mês corrente); os
outros cinco meses continuam com consulta própria, sem redundância.

## O que não muda

Nenhuma das duas consultas sai da segurança nem da regra de negócio — os
dois consertos só evitam pedir ao banco algo que o mesmo pedido já sabe.
O comportamento observável (o que a tela mostra, o que a validação recusa)
não muda — só menos idas ao banco.

## Lacuna registrada, não corrigida agora

`normalizarEntrada` decide pelo caminho "resolver o ativo" com
`if (dados.tipo_operacao_id)` — uma string vazia cai no mesmo ramo que
"campo ausente", e resolveria o tipo ativo em vez de recusar. Hoje nenhum
chamador manda string vazia (`fretes/acoes.ts` simplesmente omite o campo
quando não escolhe um id), então o caso não é alcançável pela interface —
`CLAUDE.md` §2, item 7, categoria "registra como lacuna e segue". Se um
chamador novo um dia mandar string vazia de propósito (por exemplo, um
formulário que limpa o campo em vez de omiti-lo), esta função trataria
como "não informado" em vez de recusar — vale reexaminar nesse momento.

## Depois de construído

Medir de novo com a mesma instrumentação (`docs/diario.md`) para confirmar
a queda: ~30ms a menos por frete salvo, ~204–938ms a menos por
carregamento de dashboard (duas das três chamadas de `somaDoMes[atual]`
eliminadas — faixa derivada do custo por chamada medido acima,
102–469ms).
