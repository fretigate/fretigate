# Plano — cartão do topo de "Lançar frete" fica fixo durante a rolagem

**Aprovado pelo fundador em 13/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada
em `docs/diario.md`.

## Contexto

O fundador reportou, testando no celular, que o cartão escuro do topo de
"Lançar frete" (data + valor grande) fica **fixo na tela durante a
rolagem** — não some ao rolar para baixo nem reaparece ao rolar de volta,
como o resto do conteúdo (Motorista, Origem, Destino, Salvar frete).

**Investigação feita antes deste plano** (agente de busca + leitura direta
do código):

- **Não é regressão da tarefa de 13/08** (commit `0f746cf`, teclado
  mostrando o valor). Comparando `git show` desse commit com o commit que
  criou a tela (`2d7ae9c`, 12/08): a estrutura de layout é idêntica nos
  dois — o cartão já nascia fixo. `0f746cf` só mexeu em classes internas do
  cartão (esconder/mostrar o botão de valor) e no rótulo do teclado, nunca
  na estrutura de scroll.
- **A causa é estrutural**, em `TelaLancarFrete.tsx` (linhas 284–452): a
  tela usa um layout de três blocos —
  `<div h-dvh overflow-hidden>` → `cabeçalho (flex-none)` → `<form>` com
  `meio (overflow-y-auto)` + `rodapé (flex-none)`. O cartão está no bloco
  `flex-none` de cima, **fora** da área `overflow-y-auto`; só o meio
  (Cliente/Motorista/Origem/.../Salvar) rola.
- **O rodapé fixo (teclado numérico + "Salvar frete") é intencional e está
  documentado** — `docs/componentes.md` § Posição: "o teclado numérico é
  sobreposição, e nesse caso o salvar nunca fica coberto — ele sobe junto,
  acima do teclado." Isso não muda neste plano.
- **O cartão fixo não tem essa cobertura na regra.** A mesma seção diz, para
  formulários em geral: "o salvar fica no fim do formulário, rolando
  junto" — ou seja, o padrão do produto é a tela inteira rolar, com só o
  par teclado+salvar como exceção documentada. O cartão ficar fixo é uma
  segunda exceção que ninguém decidiu — nasceu junto com o layout de três
  blocos e nunca foi separada dele.

**Conclusão:** é lacuna/defeito na implementação, não decisão de produto a
reconsiderar. A correção é fazer o cartão rolar com o resto do conteúdo,
mantendo o rodapé (teclado + Salvar) fixo exatamente como está.

## O que muda

Em `src/app/(app)/fretes/novo/TelaLancarFrete.tsx`:

1. **O cartão escuro move para dentro do bloco rolável** (o que hoje tem
   `overflow-y-auto`), como primeiro item — em vez de ser um bloco
   `flex-none` irmão, antes do `<form>`. Ele passa a fazer parte do mesmo
   fluxo que Cliente/Caminhão/Motorista/Origem/Destino/Carga/Km.
   - O cartão ganha `mb-20` (valor já usado no próprio arquivo — `py-20`,
     `pb-20` — não é valor novo) para preservar a distância visual atual
     entre o cartão e a primeira linha, já que o `gap-6` do container serve
     ao espaçamento entre as linhas de campo, não ao espaço depois de um
     cartão.
2. **A área segura do topo (hoje `pt-66`, fixo) passa a usar
   `var(--area-segura-topo)`** (`globals.css:165`, já `66px`) no container
   rolável — é a mesma técnica que toda outra tela do produto já usa. Muda
   de dono porque a folga não pode mais viver no bloco fixo que deixa de
   existir sozinho; passa a viver no topo do próprio conteúdo rolável, como
   já é feito em todo o resto do produto.
3. **O rodapé (teclado numérico + "Salvar frete") não muda.** Continua
   `flex-none`, fora da área de rolagem — é a exceção já documentada, e é o
   que garante que o Salvar suba acima do teclado sem ser coberto.
4. **Nenhuma mudança em `TecladoNumerico.tsx` nem em `Botao.tsx`.**
5. O comentário no topo do arquivo, que hoje descreve "cabeçalho escuro
   fixo · meio rolável · rodapé fixo", é reescrito: a exceção documentada
   passa a ser só o rodapé (teclado + salvar).

## O que NÃO muda

- O rodapé com teclado numérico sobreposto e "Salvar frete" continua fixo,
  subindo acima do teclado — comportamento já correto e documentado.
- Nenhuma mudança de `docs/componentes.md` ou `docs/navegacao.md`: a regra
  escrita já cobria isto certo (só a exceção do teclado/salvar); o código é
  quem estava divergente.
- Nenhuma mudança de comportamento do teclado numérico mostrando o valor
  (tarefa de 13/08) — só verificar que continua funcionando.

## Ressalva do fundador, para observar no teste

Com o cartão rolando, tocar no valor grande pode ficar mais difícil se a
tela já estiver rolada para baixo — hoje ele está sempre à mão por estar
fixo, e é o campo mais tocado da tela. Não muda o plano, mas o teste no
celular (item 4 da verificação) precisa registrar se isso incomodou, porque
é o tipo de coisa que só aparece cronometrando o uso real.

## Verificação

1. `npm run lint`, `npx tsc --noEmit`, `npm test`.
2. No celular: abrir Lançar frete, rolar para baixo — confirmar que o
   cartão escuro sai de cena junto com o resto, e reaparece ao rolar de
   volta ao topo.
3. Confirmar que "Salvar frete" continua fixo no rodapé, sem rolar.
4. Tocar no valor grande do cartão para abrir o teclado numérico — deve
   funcionar normalmente (exige estar com o cartão visível, como qualquer
   outro campo do formulário exige estar visível para ser tocado). Digitar
   alguns dígitos e confirmar que o valor aparece dentro do teclado, como
   já corrigido em 13/08. Anotar se o cartão fora da vista, quando já
   rolado, incomodou no uso (ver ressalva acima).
5. Tocar em "Trocar" (data) com a tela rolada para baixo primeiro — rolar
   até o topo, tocar, confirmar que a folha de calendário abre normalmente.
6. Conferir visualmente a distância entre o cartão e a primeira linha
   (Cliente) — deve ficar igual à distância atual (antes da mudança).
7. `/revisar` antes do commit.

## Arquivos

- `src/app/(app)/fretes/novo/TelaLancarFrete.tsx` (único arquivo de código)
