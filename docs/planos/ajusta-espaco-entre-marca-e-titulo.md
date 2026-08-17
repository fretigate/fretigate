# Plano — ajusta o espaço entre a marca e o título nas telas de fora de sessão

**Aprovado pelo fundador em 16/08/2026**, com a ressalva de que a
reconferência no celular com teclado aberto é **portão** — condição para
commitar, não verificação posterior. Commitado antes de a construção começar,
conforme o `CLAUDE.md` §2.

## Contexto

O Design mandou um documento novo revisando `referencia/Design/Marca nas
telas de autenticacao.html` — mesmo arquivo, conteúdo atualizado. Ele muda um
dos três valores provisórios da tarefa anterior (14/08/2026, ver
`docs/planos/marca-nas-telas-de-fora-de-sessao.md`): a distância entre a
marca e o título deixa de reaproveitar "entre seções verticais" (24px) e
ganha medida própria.

Medido no navegador (não no texto do documento — ver a contradição abaixo):

| Tela | Distância marca → título hoje | Nova |
|---|---|---|
| Entrar | 24px | **140px** |
| Criar conta | 24px | **140px** |
| Esqueci a senha | 24px | **140px** |
| Redefinir senha | 24px | **140px** |
| Termos (modo cadastro) | 24px | **16px** |

Os outros dois valores do conjunto — largura da marca (140px) e respiro do
topo (66px) — **não mudam**.

## A contradição do documento, e o que o fundador decidiu

O texto do documento diz que os 140px valem "nas cinco telas — inclusive
Termos". Medido pixel a pixel dentro do próprio arquivo, a tela de Termos do
mockup mostra 16px entre a marca e "Termos e privacidade", não 140px. Eu medi
e trouxe a divergência em vez de escolher por conta própria (`CLAUDE.md` §2,
"confusão de quem lê é evidência sobre o texto").

**Decisão do fundador (16/08/2026):** vale o que o desenho mostra, não o que
o texto afirma. Termos mantém o espaço menor, diferente das outras quatro. A
correção na fonte fica pendente do Design — entra na lista "o que foi pedido
ao Design" do diário desta tarefa, para não se repetir na próxima entrega.

## O que muda

1. **`referencia/Design/Marca nas telas de autenticacao.html`** — substituído
   pelo arquivo novo. É cópia do documento que o fundador anexou, mesma
   função de fonte dos números que o arquivo já tinha.

2. **`src/components/auth/Marca.tsx`** — ganha uma variante. Continua sendo
   um componente só (`CLAUDE.md` §8, proibido copiar componente): a folga
   abaixo da marca passa a ser escolhida por uma prop, não fixa.

   - `<Marca />` (padrão) — `mb-140`, usado em Entrar, Criar conta, Esqueci a
     senha e Redefinir senha.
   - `<Marca compacta />` — `mb-16`, usado só em Termos no modo cadastro.

   Nenhuma página muda a própria margem — o valor continua existindo num
   lugar só, mesma razão da tarefa anterior.

3. **`src/app/(auth)/termos/page.tsx`** — a única linha que troca
   `<Marca />` por `<Marca compacta />`, dentro do `deCadastro ? ... : null`
   que já existe.

4. **`docs/estilo.md`** — o parágrafo que hoje diz "os 24px têm lastro na
   escala de espaçamento" fica errado e é reescrito. Os dois novos valores
   entram como lacuna, mesmo tratamento que a largura de 140px já tem:

   - **140px** (as quatro telas) não está na escala de espaçamento
     (4·6·7·8·9·10·12·14·16·18·20·22·24·26·40) — lacuna nova.
   - **16px** (Termos) está na escala como número, mas não é o valor de
     nenhuma categoria nomeada da seção Espaçamento — registrado como lacuna
     também, e com a nota da contradição do documento.

5. **Comentário de `src/components/auth/Marca.tsx`** — reescrito para
   descrever as duas variantes e a origem de cada valor, no lugar do texto
   atual que só existiu para os 24px.

`docs/componentes.md` não muda: as linhas da tabela já dizem só "marca no
topo (provisória)", sem número — o número vive em `docs/estilo.md`.

## O portão do teclado — condição para commitar, não checagem depois

116px a mais de conteúdo no topo é o tipo de mudança que pode empurrar campo
em foco ou botão para debaixo do teclado — a mesma classe de defeito já
corrigida uma vez no teclado numérico (`CLAUDE.md` §8: "o salvar sobe junto,
acima do teclado, nunca fica coberto"). Criar conta é a tela mais exposta:
cinco campos, o texto do aceite dos Termos e o botão.

**Teste, nas quatro telas que mudam para 140px, com o proxy de teclado já
usado na tarefa anterior** (viewport 375×400, o mesmo encolhimento que um
teclado aberto causa na área visível):

- campo em foco continua visível;
- botão principal continua alcançável rolando;
- nada **encolhe** para caber (`CLAUDE.md` §8) — botão ainda 60px, campos
  ainda 56–60px.

**Se apertar em qualquer tela, a construção para ali.** Não ajusto o valor
por conta própria — devolvo ao fundador qual tela e quantos pixels faltam,
para ele levar ao Design. Só depois de as quatro passarem no proxy é que o
resultado entra no relatório para commitar, com números, não "parece que
coube".

## Verificação

Servidor de desenvolvimento (`.claude/launch.json`, `dev`, porta 3000), no
navegador embutido.

1. **Celular, viewport 375×812** — as cinco telas: `/entrar`, `/criar-conta`,
   `/esqueci-a-senha`, `/redefinir-senha`, `/termos?de=cadastro`. Medir com
   `getBoundingClientRect()`: distância marca→título 140px nas quatro, 16px
   em Termos.
2. **O portão do teclado** (acima) — nas quatro telas de 140px.
3. **`/termos` sem `?de=cadastro`** — marca continua sem aparecer (nada
   muda aqui, é regressão a evitar).
4. **Sem salto de layout** — recarregar e confirmar que o título não pula.
5. `npm run lint`, `npx tsc --noEmit`, `npm test`.
6. `/revisar` antes do commit.

## Arquivos

- `referencia/Design/Marca nas telas de autenticacao.html` (substituído)
- `src/components/auth/Marca.tsx`
- `src/app/(auth)/termos/page.tsx`
- `docs/estilo.md`
