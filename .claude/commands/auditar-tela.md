---
description: Confere uma tela contra o inventário de componentes e a folha de estilo
argument-hint: <nome da tela — ex.: Entrar, Meus fretes, Cobranças>
allowed-tools: Read, Grep, Glob
---

Audite a tela **$1** contra os documentos do projeto. Responda **só com a lista
de divergências**.

## Antes de auditar

Ache o código da tela em `src/app/`. Inclua o que ela usa: componentes de
`src/components/`, e o `layout.tsx` que a envolve — regra de área segura e de
folga no fim mora lá, e a divergência costuma estar no layout, não na página.

Se a tela **não existir ainda**, responda só isso, em uma linha, e pare.

Leia `docs/componentes.md` e `docs/estilo.md` **agora**, na íntegra. Não audite
de memória: os valores mudam e a memória não avisa quando está velha.

## O que procurar

**1. Valor fora do sistema** — `CLAUDE.md` §8: cor, altura, raio, tamanho e peso
de fonte saem de `docs/estilo.md`. Sinalize:
- cor literal (`#…`, `rgb(`) que não seja um token do sistema;
- pixel cru em altura, raio ou fonte onde a folha de estilo define um valor;
- classe de espaçamento fora da escala. **Cuidado:** aqui `--spacing: 1px`, então
  `p-16` é 16px. Não confunda com o padrão do Tailwind.

**2. Botão fora do inventário** — `docs/componentes.md` tem inventário
**fechado**: seis variantes, mais o aviso do sistema, a família FretiNews, os
ícones e a barra. Sinalize botão que não seja uma delas, e **nome de ação fora
do vocabulário** ("Relatório" sozinho onde a regra manda "Gerar relatório" ou
"Ver relatório"). Confira também a seção "Onde cada tela usa o quê" — se a tela
estiver lá, o que ela usa tem que bater.

**3. Mais de uma ação principal** — uma por tela, e é a que avança o dinheiro ou
o estado. Tela de consulta (dashboard, listas) **não tem** principal: o (+) da
barra é chrome global. Duas verdes sólidas na mesma tela é sempre divergência.

**4. Regras de layout do §8:**
- só a barra de navegação flutua — bloco de ações vai dentro do fluxo rolável,
  depois do resumo e antes de listas; formulário salva no fim;
- nenhum texto vaza do campo: quebra em duas linhas ou corta com reticências,
  com a altura crescendo;
- nada encolhe para caber conteúdo — a tela rola ou recolhe;
- toda tela rolável reserva folga no fim, medida do topo do (+);
- área segura = a do dispositivo + 8px;
- três superfícies, três significados: clara = dado do usuário, escura =
  mensagem do sistema, lilás = plataforma. Nunca compartilham tratamento;
- estado carregando em todo botão que chama o servidor, com toque repetido
  ignorado;
- estado vazio é convite para agir;
- número incompleto não é exibido — lucro sem despesa e R$/km sem km mostram
  convite, não valor;
- alvo de toque mínimo 48px;
- vocabulário do usuário: frete, cliente, caminhão, motorista, relatório. Nunca
  "registro", "entidade", "item", "transação", "extrato".

## Formato da resposta

Uma linha por divergência, agrupada pelos quatro títulos acima. Cada linha:

`arquivo:linha — o que está lá → o que o documento manda (documento §seção)`

Regras da resposta:
- **Só divergências.** Nada do que está certo. Sem resumo, sem introdução, sem
  parabéns, sem "no geral está bom".
- Se não houver nenhuma, responda uma linha só: `Sem divergências.`
- **Não corrija nada.** Auditoria aponta; a correção é outra tarefa, e é do
  fundador decidir se entra.
- Se um documento **não definir** o caso, isso não é divergência — é lacuna.
  Liste em bloco separado no fim, sob `Lacuna no documento:`, porque a resposta
  certa aí é perguntar, não inventar valor (`CLAUDE.md` §8).
