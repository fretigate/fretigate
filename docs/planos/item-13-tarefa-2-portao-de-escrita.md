# Plano — Tarefa 2 do item 13: o portão de escrita para assinatura vencida

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto e por que esta tarefa existe antes das telas

`CLAUDE.md` §10 promete: "Assinatura vencida bloqueia escrita, mantém
leitura e exportação por 90 dias." Nenhuma Tarefa do plano original do
item 13 (`docs/planos/item-13-assinatura.md`) constrói esse mecanismo — foi
achado ao conferir a cobertura dos quatro estados de `StatusAssinatura`
para a Tarefa das quatro telas de assinatura (`docs/planos/
item-13-tarefa-3-telas-de-assinatura.md`).

**Decisão do fundador: o portão vem antes das telas, como tarefa própria —
não depois, e não junto.** Duas razões, nas palavras dele: "as quatro telas
são interface; o portão é mecanismo que toca toda ação do produto —
misturar faz o commit contar duas histórias." E a ordem importa porque "a
tela de Assinatura vencida existe pra explicar por que a pessoa não
consegue escrever — se o portão não existir, ela explica algo que não
acontece, e não dá pra testar de verdade." Com o portão primeiro, a Tarefa
3 nasce podendo ser exercitada de ponta a ponta: bloqueia → cai na tela →
entende.

**Renumeração**: esta é a nova Tarefa 2 do item 13. A antiga Tarefa 2 (as
quatro telas) virou Tarefa 3. A antiga Tarefa 3 (limites do plano
gratuito) vira Tarefa 4. `docs/planos/item-13-assinatura.md` é atualizado
junto deste plano para refletir isso.

## Decisões já tomadas pelo fundador, nesta sessão — não reabrir por analogia

1. **Mecanismo: Opção A — inverte o padrão.** `comoUsuario`/`comoDono`
   passam a checar `status_assinatura` por padrão e bloquear escrita sob
   `vencida`/`encerrada`; um envelope irmão, só para leitura, é a exceção
   nomeada. Motivo do fundador: "o padrão precisa ser seguro, e a exceção
   precisa ser declarada... é a mesma forma do `db()`, que fez o filtro de
   empresa deixar de depender de quem escreve a consulta: falha fechada,
   não aberta." Rejeitada a Opção B (envelope extra só para escrita,
   aplicado ação por ação) pelo motivo oposto: uma ação nova esquecida
   ficaria sem bloqueio, em silêncio — "lembrança já falhou aqui várias
   vezes".
2. **A lista de exceções (ações de leitura) é conferida por igualdade
   exata, nos dois sentidos — mesmo padrão de `EXCECOES` em
   `tests/protecao-de-acoes.test.ts`.** Nunca "contém"; cada entrada
   precisa aparecer na lista **e** ser vista de verdade pelo código, para
   ninguém acrescentar por analogia nem esquecer de tirar uma que sumiu.
3. **`gerarRelatorioAction` é escrita — bloqueada sob `vencida`.** Grava
   `Relatorio`/`RelatorioServico`, consome `proximo_numero_relatorio`
   (irreversível), e pode criar título novo se a cobrança estiver marcada
   — "gerar cobrança nova com assinatura vencida é o produto trabalhando
   de graça, e criar dívida em nome de quem não está pagando por ele." A
   distinção do fundador, que vale registrar para não reabrir em outro
   caso: **produzir documento novo é escrita, mesmo quando o resultado
   parece um arquivo; acessar documento já produzido é leitura.**
4. **Conferido, a pedido do fundador: existe caminho de ver um relatório já
   gerado sem passar pela geração — a pessoa não perde acesso ao que já
   era dela.** `src/app/(app)/relatorio/[id]/page.tsx` (Documento A4) é
   **Server Component**, não Server Action: chama `exigirSessao()`
   diretamente, nunca `gerarRelatorioAction`, e nunca passa por
   `comoUsuario`/`comoDono`. O mesmo vale para **toda leitura do produto**
   — dashboard, listas, perfis, detalhe de frete/cobrança — porque são
   páginas (Server Components), não ações de servidor. **O portão desta
   tarefa não alcança nenhuma delas, e não precisa alcançar**: elas já
   ficam de fora do mecanismo, pelo desenho que o produto já tinha antes
   desta tarefa existir.

## O que "leitura", "exportação" e "pagar de novo" significam aqui, medido — não suposto

O fundador exigiu que as três continuem funcionando sob `vencida`. Cada uma
foi conferida contra o código real, não assumida:

- **Leitura**: dashboard, listas (Fretes, Cobranças, Clientes, Caminhões,
  Motoristas), perfis, detalhe de frete/cobrança, Documento A4 — todas
  Server Components com `exigirSessao()` direto, **fora** do alcance de
  `comoUsuario`/`comoDono`. Continuam funcionando sem qualquer mudança
  desta tarefa.
- **Exportação**: hoje, na prática, é "ver o Documento A4 de um relatório
  já gerado" (mesmo caso acima) e "baixar o PDF" (`urlPdf`, gerado por
  `gerarUrlRelatorio` — leitura de storage, nunca grava nada). Nenhuma das
  duas passa pelo portão.
- **Pagar de novo**: acontece inteiramente fora do produto — o link de
  checkout da Kiwify (externo, sem ação de servidor nossa) e o webhook
  (`api/webhooks/kiwify/route.ts`, rota de API chamada pela Kiwify, nunca
  por uma sessão de usuário, e já fora do alcance de `comoUsuario`/
  `comoDono` por natureza). **Nenhum código muda para isto continuar
  funcionando** — já funciona, por construção, hoje.

**Conclusão que isso sustenta:** o portão só precisa mesmo alcançar as
Server Actions de escrita — leitura, exportação de PDF já gerado e
pagamento continuam de fora por já não passarem pelo envelope. A única
coisa nova que precisa de exceção explícita são as **Server Actions que
fazem leitura mas hoje passam pelo mesmo envelope das de escrita**, porque
existem dentro de um fluxo de formulário (autocomplete, sugestão) — ver a
lista fechada abaixo.

## As três exceções — a lista inteira, hoje

Conferido em todo `src/app` (mesma varredura de `tests/protecao-de-acoes.test.ts`,
por arquivo com `"use server"`): só três exportações são leitura pura
disfarçada de ação de servidor, todas em `src/app/(app)/fretes/acoes.ts`:

| Ação | Por que é leitura |
|---|---|
| `buscarSugestaoDeValorAction` | só lê o último valor do trecho, nunca grava |
| `listarDestinosDoClienteAction` | só lista destinos já usados, nunca grava |
| `buscarMunicipiosAction` | busca de autocompletar, nunca grava |

Nenhuma ação com `comoDono` é leitura hoje — todas as seis (`atualizarConfiguracoesAction`,
`criarConviteAction`, `reenviarConviteAction`, `cancelarConviteAction`,
`removerAcessoAction`, `atualizarContaDaEmpresaAction`) gravam. **Não
construo `comoDonoLeitura` nesta tarefa** — seria camada sem nenhum caso de
uso real hoje (`CLAUDE.md` §6, "nada de arquivo para depois"). Nasce
quando a primeira ação de leitura de dono aparecer — provavelmente
`exportarDadosAction`, no dia em que o mecanismo de exportação do
`CLAUDE.md` §14 existir.

## Mecanismo — desenho concreto

`src/lib/auth/acao.ts` ganha uma consulta antes de chamar a ação
embrulhada, só para `comoUsuario` (não para o novo `comoUsuarioLeitura`):

```
comoUsuario(acao):
  sessao = exigirSessao()
  status = buscarStatusAssinatura(sessao.empresaId)   // consulta leve, só a coluna
  se status é "vencida" ou "encerrada":
     bloqueia (ver "O que a tela vê", abaixo)
  senão:
     acao(sessao, ...args)

comoUsuarioLeitura(acao):
  sessao = exigirSessao()
  acao(sessao, ...args)                                 // igual ao comoUsuario de hoje
```

Mesmo desenho para `comoDono` (sem `comoDonoLeitura`, por ora — seção
acima).

**Por que não em `sessao.ts`/`sessao-por-cabecalho.ts`.** O comentário do
próprio arquivo (`src/lib/auth/sessao.ts`) já avisa: "se algum dia alguém
acrescentar lógica aqui... este arquivo volta a ser o lugar onde o problema
se esconde" — é o motivo pelo qual a lógica de sessão saiu de lá na
auditoria 3. O portão é uma camada por cima da sessão (precisa saber quem
é E se pode escrever), não uma mudança em como a sessão é resolvida — mora
em `acao.ts`, ao lado do envelope que ele estende.

**`buscarStatusAssinatura`** — função nova, pequena, em
`src/lib/servicos/empresas.ts` (ao lado de `buscarEmpresa`), lendo só a
coluna `status_assinatura` — não a empresa inteira, já que roda em toda
chamada de escrita.

## O que a tela vê quando bloqueado

Proposta para aprovação, não decisão fechada: quando `comoUsuario`/
`comoDono` bloqueiam, a ação chama `redirect("/assinatura-vencida")` —
mesmo mecanismo que `criarServicoAction`/`arquivarServicoAction` já usam
para navegar ao final. Funciona sem mudar o contrato de retorno de nenhuma
ação (o `redirect` do Next.js interrompe a função lançando um sinal
especial, capturado pelo próprio framework, nunca por quem chamou a
ação) — inclusive para uma ação que hoje devolve `ResultadoRapido`/
`ResultadoSimples` em vez de navegar.

**Decidido pelo fundador: constrói com o `redirect`, registra a aspereza
como candidato a melhoria — não agora.** O caso concreto é real: uma ação
disparada de dentro de uma folha (cadastro rápido de cliente/caminhão/
motorista, dentro de Lançar frete) tira a pessoa da tela inteira — ela
estava lançando frete, e some tudo. Um caminho mais suave existe, mas
"depende de saber como o erro chega até a tela — e cada ação trata isso
diferente hoje. Resolver bem é trabalho próprio," não desta tarefa.
**Assinatura vencida não é caminho comum, e a pessoa precisa mesmo ser
tirada de onde estava** — a aspereza é aceitável para um caminho raro, não
para o caminho comum do produto. Fica registrado aqui, com o caso
concreto nomeado, para quando alguém quiser suavizar: qualquer solução
melhor precisa primeiro decidir um jeito uniforme de uma ação sinalizar
"bloqueado" para quem a chamou — hoje cada ação devolve um tipo de
resultado diferente (`redirect` embutido, `ResultadoRapido`,
`ResultadoSimples`), e não existe um canal comum para carregar "isto
falhou por assinatura vencida" sem navegar.

## Testes — mesma exigência de rigor do `CLAUDE.md` §3

Isolamento entre empresas e dinheiro são "rigor total" (`CLAUDE.md` §2);
este mecanismo protege dinheiro (impede que uma empresa que não paga
continue produzindo cobrança), então a mesma vara mede aqui:

1. **O contraste** — prova de que o bloqueio existe de verdade: uma ação
   de escrita chamada com `status_assinatura = "vencida"` precisa falhar
   (ou redirecionar), e a mesma ação com `"ativa"` precisa funcionar. Sem
   os dois lados, um teste que só confere o caminho feliz não prova nada
   (mesmo raciocínio do §3 aplicado aqui, não só a RLS).
2. **Os quatro estados, não só dois** — `ativa` e `inadimplente` passam;
   `vencida` e `encerrada` bloqueiam. `inadimplente` é o caso mais fácil
   de errar por engano (é fácil pensar "atrasado, bloqueia" — o schema diz
   o contrário: "acesso continua liberado, com aviso").
3. **A lista de exceções, por igualdade exata** — mesmo padrão de
   `tests/protecao-de-acoes.test.ts`: as três (e só as três) ações
   marcadas `comoUsuarioLeitura` continuam funcionando sob `vencida`;
   qualquer ação fora da lista, sob `vencida`, bloqueia.
4. **Contagem de verificações** — o teste falha se rodar menos checagens
   que o esperado, não só se alguma falhar (`CLAUDE.md` §3, item 4).

Arquivo novo, `tests/bloqueio-de-escrita.test.ts` — não estende
`tests/sessao-e-papel.test.ts` (que testa papel, não assinatura; são
garantias diferentes, mesmo padrão de arquivo próprio já usado para
`tests/protecao-de-acoes.test.ts` versus `tests/sessao-e-papel.test.ts`).

## Fora do escopo desta tarefa

- As quatro telas de assinatura (Tarefa 3, `docs/planos/
  item-13-tarefa-3-telas-de-assinatura.md`) — o portão só cria o mecanismo
  que bloqueia; a tela que explica isso para quem foi bloqueado nasce lá.
- O mecanismo que avança `vencida` → `encerrada` depois de 90 dias (lacuna
  já registrada na Tarefa 3, segue de fora daqui também).
- Um canal comum para uma ação sinalizar "bloqueado por assinatura" sem
  navegar — candidato a melhoria, registrado na seção acima, não pedido
  ainda.
- `comoDonoLeitura` — nasce só quando o primeiro caso de uso real
  aparecer.

## Decisão do fundador — pronto para construir

`redirect("/assinatura-vencida")` aprovado como o comportamento de
bloqueio desta tarefa, aspereza conhecida incluída (seção "O que a tela vê
quando bloqueado", acima). Nada bloqueia o início da construção.
