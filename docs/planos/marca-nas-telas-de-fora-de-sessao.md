# Plano — a marca do FretiGate no topo das telas de fora de sessão

**Aprovado pelo fundador em 14/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2. Este arquivo é o plano de registro: se a
construção divergir dele, quem manda é o fundador, e a divergência é anotada
em `docs/diario.md`.

## Contexto

As cinco telas de fora de sessão — Entrar, Criar conta, Esqueci a senha,
Redefinir senha e Termos (vindo do cadastro) — abrem hoje direto no título.
Quem chega por anúncio não vê de quem é o produto **no momento em que está
decidindo confiar nele**, e a venda é 100% autoatendida, sem vendedor e sem
demonstração (`CLAUDE.md` §1): não existe outro momento para a marca se
apresentar.

A marca entra no topo, centralizada, e o conteúdo desce por causa dela.

**Isto é decisão de tela, e o dono é o Design (`CLAUDE.md` §13.)** O que entra
agora é construção **provisória**, com os valores do documento que o fundador
anexou — documento que se marca a si mesmo como *"Provisório — aproximação:
os três valores abaixo ainda não foram confirmados"*. O fundador vai pedir a
confirmação ao Design em paralelo. Nada aqui inventa valor.

## Os três valores, e de onde cada um vem

| Valor | Número | Origem | Situação |
|---|---|---|---|
| Largura da marca | 140px | documento do Design | **provisório** — não existe em `docs/estilo.md` |
| Marca → título | 24px | documento do Design | está na escala de espaçamento (`docs/estilo.md` § Espaçamento) e dentro de "entre seções verticais: 22–26px" |
| Respiro do topo | 66px, sem mudança | `docs/estilo.md` § Área segura — valor único em toda tela | confirmado pelo fundador em 14/08/2026 |

A altura sai da proporção do arquivo (1920×394 ≈ 4,87:1): 140px de largura dá
≈28,7px de altura. O título desce ≈53px no total.

**O único valor sem lastro na folha de estilo é a largura de 140px.** Não é
inventado — vem do documento do Design —, mas também não é decisão fechada.
Entra registrado como lacuna, no mesmo formato do precedente que já existe na
folha ("Lacuna aberta — 'margem inferior padrão' ainda não é um valor formal
desta folha").

## As duas conferências que o fundador pediu

**Fundo claro: serve, sem variante.** Os arquivos de `referencia/marca/` foram
medidos pixel a pixel. A variante "colorida" é `#0C311B` (verde escuro) +
`#1B6B3A` (verde rodovia, exatamente o token `--color-acao`) sobre
transparente — contraste de sobra sobre o papel `#FAF8F4`. A variante branca é
a de fundo escuro e não se aplica a nenhuma das cinco telas. Confirmado pelo
fundador em 14/08/2026, junto da resposta de que a marca já está verde e nada
nos arquivos muda.

`#0C311B` **não existe** em `docs/estilo.md` nem em `globals.css`. Isso **não**
viola o §8 ("nenhum valor fora do sistema") porque a marca entra como
**imagem**, não como cor escrita em CSS — nenhum hex novo passa a existir no
código. No dia em que a marca virar SVG inline, aí sim o `#0C311B` precisa ser
formalizado antes.

**Teclado.** É a mesma classe do defeito já corrigido uma vez no teclado
numérico (`CLAUDE.md` §8: "o salvar sobe junto, acima do teclado, nunca fica
coberto"), mas o desenho destas telas é outro: não há rodapé fixo, o botão rola
junto com o conteúdo e a rolagem é a do documento. Com ≈53px a mais no topo a
página fica mais alta e rola mais. O que precisa ser provado é que nada
**encolhe** para caber (§8) e que campo em foco e botão continuam alcançáveis
— ver Verificação.

## O que muda

1. **`public/marca/fretigate.png`** — `public/` não existe no projeto ainda; é
   criada agora. O arquivo é cópia de
   `referencia/marca/LOGOMARCA colorida sem fundo.png` (PNG 1920×394), com nome
   sem espaço e sem acento (`CLAUDE.md` §7).

   **Por que cópia, e não importar direto de `referencia/`:** o
   `referencia/LEIA-ME.md` abre dizendo *"Nada aqui roda… não é importado por
   nenhum arquivo de `src/`"*. Importar de lá faria `referencia/` virar
   dependência de build e quebraria essa regra. Copiar para `public/` mantém a
   regra intacta — é a solução mais precisa, que não precisa de exceção
   (`CLAUDE.md` §2).

2. **`referencia/LEIA-ME.md`** — a linha da tabela diz hoje "os `.png` são os
   que o app usa", o que passa a ser impreciso: `referencia/marca/` é a
   **origem**, `public/marca/` é a cópia que o app carrega. Sem essa correção,
   a próxima pessoa edita o arquivo errado e não entende por que a tela não
   mudou.

3. **`src/components/auth/Marca.tsx`** — componente novo, existe uma vez e é
   usado nas cinco telas (`CLAUDE.md` §8: proibido copiar componente). Fica em
   `components/auth/` porque é onde os usos reais estão (`PedidoDeRecuperacao.
   tsx` já mora lá) — sem abstração especulativa (§6).

   - `next/image` com `width={1920} height={394}`, classe `w-[140px] h-auto`,
     `sizes="140px"` e `priority`. As dimensões intrínsecas evitam salto de
     layout quando a imagem chega; `priority` evita o piscar, porque a marca
     está acima da dobra na primeira tela que a pessoa vê. **É o primeiro uso
     de `next/image` no projeto** — não há precedente para seguir, e o
     comentário do arquivo registra isso.
   - `alt="FretiGate"` — é a marca, não decoração.
   - Centralização por `flex justify-center` no invólucro.
   - A folga de 24px até o título vive no **próprio componente** (`mb-24`), não
     em cada página. A convenção existente das telas de auth põe a folga no
     elemento seguinte (`mt-24`, em sete lugares), mas aqui pôr no componente é
     o que garante que as cinco telas não divirjam: o valor existe num lugar só.

4. **As cinco telas ganham uma linha cada** — `<Marca />` como primeiro filho
   do `<main>`, antes do `<h1>`:

   - `src/app/(auth)/entrar/page.tsx`
   - `src/app/(auth)/criar-conta/page.tsx`
   - `src/app/(auth)/esqueci-a-senha/page.tsx`
   - `src/app/(auth)/redefinir-senha/page.tsx` — dentro do componente local
     `Pagina`, que já é a casca comum das três saídas dessa rota; uma inserção
     cobre link válido, link expirado e trava de consulta
   - `src/app/(auth)/termos/page.tsx` — **condicional a `deCadastro`**. O modo
     Ajustes é dentro da sessão e não está no pedido nem na lista do Design

   O `pt-[var(--area-segura-topo)]` do `<main>` **não muda** em nenhuma das
   cinco, e nenhuma outra classe é tocada. Nada é refatorado de passagem
   (`CLAUDE.md` §2, regra 4) — em particular, **não** se cria um
   `(auth)/layout.tsx` para acabar com a duplicação das cinco cascas, mesmo
   sendo tentador: é refatoração fora da tarefa.

5. **`docs/estilo.md`** — bloco "Lacuna aberta", no mesmo formato do que já
   existe para a margem inferior padrão: a marca no topo das telas de fora de
   sessão usa 140px de largura, valor vindo do documento do Design marcado como
   provisório, que **não é um valor formal desta folha**.

6. **`docs/componentes.md`** — as cinco linhas da tabela "Onde cada tela usa o
   quê" ganham a marca, marcada como provisória e pendente do Design. Isso é
   necessário, não cosmético: a tabela é declarada completa para essas telas, e
   o `/auditar-tela` classifica como divergência tipo 2 "o que aparecer a mais"
   — sem a linha, a própria mudança reprova na auditoria.

7. **`docs/navegacao.md`** — sem mudança. Marca não é navegação.

## O que o documento do Design traz e **não** entra

O mockup desenha, além da marca, um `<h1>` de `28px/800` e um subtítulo *"Use o
e-mail e a senha da sua conta FretiGate."*. Hoje o título é `text-titulo-tela`
(20px/700, `docs/estilo.md` § Tipografia) e não existe subtítulo nenhum em
`docs/componentes.md`. **Nenhum dos dois entra** — não foi pedido, e mudar o
título contradiz a folha de estilo. Vai para a lista de perguntas ao Design.

## O que falta o Design definir

Vai no diário, na lista "o que foi pedido ao Design" (`CLAUDE.md` §13):

- largura definitiva da marca (140px é aproximação);
- distância da marca até o título (24px é aproximação);
- respiro do topo confirmado (66px, a área segura, é o que está construído);
- se o título passa a 28px/800, como o mockup desenha;
- se entra o subtítulo que o mockup desenha;
- se sai uma versão SVG da marca — hoje só existe PNG raster e PSD.

## Verificação

Servidor de desenvolvimento (`.claude/launch.json`, configuração `dev`, porta
3000), no navegador embutido.

1. **Celular primeiro** — viewport 375×812. Capturar as cinco telas:
   `/entrar`, `/criar-conta`, `/esqueci-a-senha`, `/redefinir-senha` com token
   inválido (estado de link expirado) e `/termos?de=cadastro`. Em cada uma:
   marca centralizada, começando nos 66px, título 24px abaixo, nada cortado.
2. **`/termos` sem `?de=cadastro`** — a marca **não** aparece.
3. **Contraste sobre o papel** — a marca colorida sobre `#FAF8F4`, sem halo
   branco nem borda (o PNG é sem fundo).
4. **Medida real, não olhômetro** — `getBoundingClientRect()` da imagem e do
   `<h1>` em Criar conta: largura ≈140px, topo da marca em 66px, distância
   marca→título 24px.
5. **Teclado, em Criar conta** (a tela com mais campos). O teclado do celular
   não existe no navegador embutido; o proxy é encolher a viewport para 375×400,
   que é o que um teclado aberto faz com a área visível. Com o campo final em
   foco, provar que (a) o campo em foco fica visível, (b) o botão "Criar conta"
   continua alcançável rolando, (c) nada encolheu para caber — botão ainda 60px,
   campos ainda 56–60px. **É proxy, não prova de celular de verdade**: a
   conferência final no aparelho é do fundador.
6. **Console e rede limpos** — sem erro no console; a imagem carrega com 200 e
   o Next serve versão redimensionada, não os 1920px inteiros.
7. **Sem salto de layout** — recarregar e confirmar que o título não pula
   quando a imagem chega.
8. `npm run lint`, `npx tsc --noEmit`, `npm test`.
9. `/auditar-tela` nas cinco telas alteradas.
10. `/revisar` antes do commit.

## Arquivos

- `public/marca/fretigate.png` (novo — `public/` criada agora)
- `src/components/auth/Marca.tsx` (novo)
- `src/app/(auth)/entrar/page.tsx`
- `src/app/(auth)/criar-conta/page.tsx`
- `src/app/(auth)/esqueci-a-senha/page.tsx`
- `src/app/(auth)/redefinir-senha/page.tsx`
- `src/app/(auth)/termos/page.tsx`
- `referencia/LEIA-ME.md`
- `docs/estilo.md`
- `docs/componentes.md`
