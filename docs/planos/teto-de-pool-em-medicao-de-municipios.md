# Plano — teto de pool em `medirResolucaoDeMunicipios`, código de produto

Pedido do fundador: `src/lib/servicos/medicao-municipios.ts:98` tem o mesmo
formato que derrubou a esteira (`Promise.all` sem teto sobre
`resolverMunicipio`), mas em **código de produto**, não teste — usado por
`scripts/medir-municipios.mts`, rodado sob demanda contra uma empresa real.
Uma transportadora com muitos textos de origem/destino distintos e não
resolvidos estoura o pool do banco que a ferramenta apontar (desenvolvimento
ou, um dia, produção), do mesmo jeito que o teste estourava o de teste.

## A diferença desta chamada para a de `criarServico`

`resolverMunicipio` sozinho faz **uma** consulta (`db(empresaId).municipio.
findMany`, `src/lib/servicos/municipios.ts:164`) — não duas, porque não
passa por `normalizarEntrada`. O fator aqui é **um**, não dois — mesmo fator
do precedente original (`tests/isolamento/vazamento.test.ts`, dez chamadas
de uma conexão cada). O teto seguro é **dez**, não cinco.

## O que muda

`medirResolucaoDeMunicipios` (linha 98) passa a resolver `textosUnicos` em
blocos de dez, sequenciais entre si, em vez de todos de uma vez. Comentário
citando a conta (uma conexão por chamada, pool de dez, precedente por nome)
no mesmo formato já usado nos testes.

Nenhuma mudança de contrato: a função continua recebendo `empresaId` e
devolvendo o mesmo `ResultadoMedicao`. `tests/medicao-municipios.test.ts` e
`tests/regressao-resolucao-municipios.test.ts` (que chamam esta função)
continuam passando sem alteração — nenhum dos dois tem hoje mais de dez
textos únicos não resolvidos de uma vez.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`.
2. `npm test` local — os dois arquivos que chamam esta função, mais a
   suíte inteira.
3. Push de verificação numa branch de teste, PR, esteira real confirmando
   antes do commit final.
4. `/revisar` antes do commit.

## Arquivos

- `src/lib/servicos/medicao-municipios.ts`
- `docs/diario.md`
