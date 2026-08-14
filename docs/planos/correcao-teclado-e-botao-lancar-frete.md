# Plano — teclado escondendo o valor e botão "Salvar frete" apertado no canto

**Aprovado pelo fundador em 13/08/2026, com três condições antes da
construção — todas resolvidas abaixo.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada
em `docs/diario.md`.

## Contexto

Achado registrado em `docs/diario.md` (12/08/2026): testando no celular, o
fundador viu que o teclado numérico sobreposto de Lançar frete cobre a tela
quase inteira — o valor grande no cabeçalho escuro (o único lugar que hoje
mostra o valor sendo digitado) fica escondido atrás do teclado, e digitar o
valor vira digitar às cegas.

Segunda captura de tela (13/08/2026) mostrou um segundo problema, no mesmo
fluxo: o botão verde "Salvar frete" mostra o rótulo colado na borda esquerda
e o valor colado na borda direita, sem respiro nenhum — os dois "no canto do
botão". Causa: `Botao` (`src/components/ui/Botao.tsx`) nunca aplica padding
lateral em botão de largura total (`docs/componentes.md` "01 — Principal":
"padding lateral 24, só se largura automática") — regra pensada para texto
único centralizado, que não precisa de respiro extra. O botão de Lançar
frete é o único do produto inteiro que põe **dois** textos nas pontas
(`flex-1 text-left` de um lado, o valor do outro — `TelaLancarFrete.tsx:431-434`),
e por isso é o único que esbarra na borda.

## As três condições do fundador, resolvidas

### 1 — Esconder a barra de navegação com o teclado aberto: não vale a pena

Medido na geometria do código (`globals.css`, `BarraDeNavegacao.tsx`,
`TelaLancarFrete.tsx`): a barra é `position: fixed`, ancorada a
`var(--ancora-barra)` do fundo da tela, e **paira dentro de uma faixa que o
rodapé já reserva para ela** — `paddingBottom: var(--ancora-rodape-acoes)`
(`≈160px` num aparelho com área segura, `132px` no mínimo), que existe
justamente para o "Salvar frete" nunca ficar coberto por ela
(`CLAUDE.md` §8).

Essa faixa é reservada **independente da barra estar visível ou não** — ela
é um espaço em branco no layout, não algo que a barra "ocupa" só enquanto
aparece. Escondê-la sem mais nada muda zero pixel de espaço disponível: o
teclado e o botão continuam exatamente do mesmo tamanho, na mesma posição.

Pra ganhar espaço de verdade, a faixa reservada teria que **encolher**
enquanto o teclado está aberto (não há barra pra proteger naquele instante).
Isso tornaria a folga do rodapé **dependente de um estado dentro da mesma
tela** — e o `CLAUDE.md` §8 já fecha essa porta: "Folga própria de uma tela
é defeito, mesmo que pareça melhor ali", com uma lista fechada de exceções
que só cobre telas **inteiras** sem barra, nunca um estado temporário dentro
de uma tela que tem barra. Abrir essa exceção é possível, mas é uma decisão
de regra nova, não um ajuste de tela.

Como o problema real (o valor escondido) é resolvido pelo item 3 abaixo, sem
precisar de nenhum pixel a mais — **recomendo deixar a barra como está**:
ganho zero em esconder só ela, custo de abrir uma exceção nova na regra pra
esconder ela **e** encolher a folga. Registrado aqui para não se perguntar de
novo sem essa conta feita.

### 2 — O respiro do botão vira responsabilidade do componente `Botao`

`Botao.tsx` ganha uma prop nova, `distribuido?: boolean` (padrão `false`,
então nenhum botão existente muda). Quando `true`, aplica o padding lateral
já documentado para a variante — `24` (principal) ou `22` (secundária),
`docs/componentes.md` "01"/"02" — **dentro do componente**, não na tela que
o chama. `TelaLancarFrete.tsx` passa `distribuido` no "Salvar frete" em vez
de uma classe de padding solta na instância.

Isso resolve o pedido do fundador: o próximo botão de largura total com
conteúdo nas duas pontas (rótulo + valor, rótulo + contagem, o que for) só
precisa passar `distribuido` — o valor certo vem do componente, não depende
de alguém lembrar de replicar uma classe.

**Isso não substitui avisar o Design** (`CLAUDE.md` §13): a regra escrita em
`docs/componentes.md` ("padding lateral 24, só se largura automática") foi
pensada para texto único centralizado e não previu botão de largura total
com conteúdo nas duas pontas — o componente já resolve isso reaproveitando o
mesmo valor `24`/`22` já documentado (não é valor novo), mas o texto da
regra em si continua sem cobrir esse caso. Fica pendente pedir ao Design
para escrever a frase que cobre este caso — anotado na entrada do diário
desta tarefa, como toda correção de estado feita no repositório.

### 3 — O valor em dois lugares: a regra passa a ser garantida no código, não por coincidência de geometria

A captura do fundador mostrou uma fatia do valor grande do cabeçalho ainda
visível, cortada, por cima do teclado — ou seja, hoje os dois **quase**
nunca aparecem juntos, por coincidência de tamanho de tela, não por
garantia. Isso muda: enquanto `tecladoAberto` for `true`, a linha do valor
grande no cabeçalho escuro **para de renderizar** (só o "Hoje · trocar"
continua). O valor só existe visível em um lugar de cada vez — cabeçalho
quando o teclado está fechado, teclado quando está aberto — **por código,
não por sobreposição aproximada**. Comentário no código e uma linha no
diário registram essa decisão, para não parecer, depois, uma duplicata que
"dá pra tirar".

## O que muda

1. **O valor passa a aparecer dentro do próprio teclado, não só no
   cabeçalho.** Em `TecladoNumerico.tsx`, a linha que hoje mostra só o
   rótulo "Valor do frete" + "Pronto" passa a mostrar o valor sendo
   digitado no lugar do rótulo (`R$ 0,00` → atualiza a cada tecla), no
   mesmo estilo de valor já usado nas outras linhas da tela
   (`text-nome-recolhida font-bold`). "Pronto" continua no mesmo lugar.

2. **O cabeçalho para de mostrar o valor grande enquanto o teclado está
   aberto** (item 3 acima) — condição `!tecladoAberto` em
   `TelaLancarFrete.tsx`, com comentário explicando o porquê.

3. **`Botao` ganha a prop `distribuido`** (item 2 acima), e "Salvar frete"
   passa a usá-la em vez de padding solto na instância.

4. **Barra de navegação: sem mudança** (item 1 acima) — registrado o motivo
   de não mexer, para a pergunta não voltar sem essa conta.

## O que NÃO muda

- O cabeçalho escuro continua sendo o que abre o teclado ao tocar — só o
  número grande some enquanto o teclado está aberto (item 2 da lista acima).
- Nenhuma mudança de posição do teclado ou do botão "Salvar frete" (a regra
  já vigente — teclado sobreposto, salvar sobe acima dele — continua igual).
- A barra de navegação continua exatamente como está.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`, `npm test`.
2. No celular: abrir Lançar frete, tocar no valor, digitar alguns dígitos —
   confirmar que o valor aparece dentro do teclado, atualizando a cada
   toque, sem precisar fechar o teclado para ver o que foi digitado, e que
   o valor grande do cabeçalho não aparece mais (nem cortado) enquanto o
   teclado está aberto.
3. Conferir visualmente que "Salvar frete" e o valor no botão não tocam
   mais a borda.
4. Confirmar que todo outro botão do produto (sem `distribuido`) continua
   idêntico — a prop nova não muda nada por padrão.
5. `/revisar` antes do commit.

## Pendência para depois do commit

- **Pedir ao Design** para estender a regra de padding lateral de
  `docs/componentes.md` ("01 — Principal" / "02 — Secundária") ao caso de
  botão de largura total com conteúdo distribuído nas duas pontas — hoje ela
  só cobre texto único centralizado. O componente já implementa o valor
  (`24`/`22`, reaproveitado, não inventado); falta a frase da regra.

## Arquivos

- `src/components/ui/Botao.tsx`
- `src/components/ui/TecladoNumerico.tsx`
- `src/app/(app)/fretes/novo/TelaLancarFrete.tsx`
