# Plano — link externo: janela sem vínculo e segundo toque no app instalado

Aprovado pelo fundador em 19/09/2026. Texto do botão de `/planos` e do
convite escolhidos por ele (ver "Textos").

## Contexto

**Sintoma (fundador, iPhone, app instalado, 19/09/2026):** o botão "Assinar"
de `/planos` abre uma página em branco, sem endereço. Não chega na Kiwify.

**Hipótese dele:** o link só existe depois que o servidor responde, então a
abertura roda depois do `await` e o iOS já não a trata como toque — o mesmo
formato do convite (`CLAUDE.md` §14, "Convite por WhatsApp não entrega
direto no app instalado do iPhone").

**O que foi verificado (nada disto é suposição):**

- O botão **tem** o formato do convite: link gerado no servidor (token de uso
  único, `SolicitacaoUpgrade`, `src/app/(app)/planos/acoes.ts`) — de
  propósito, porque um link pronto de antemão exigiria o `empresa_id` na URL
  (`CLAUDE.md` §3). E usa **a mesma peça**, `prepararJanelaExterna`
  (`src/lib/utils/link-externo.ts`), que também é usada por
  `FormularioConvite.tsx` e `ListaUsuarios.tsx` ("Reenviar"). Ela já
  prepara a janela **antes** do `await` — a hipótese "roda depois do
  `await`" não descreve o código.
- Nos logs de produção da Vercel, no teste do fundador: `GET /planos` 200 e,
  23 segundos depois, `POST /planos` 200 — a ação que gera o link rodou.
  A falha é no navegador, depois do servidor responder. Os dois endereços de
  checkout da Kiwify respondem 200.
- **Defeito medido** (Chrome de computador, clique real, com página de teste
  de duas origens — não no site em produção, onde não foi possível logar):
  `window.open("", "_blank", "noopener,noreferrer")`
  (`link-externo.ts`, linha do `prepararJanelaExterna`) **devolve sempre
  `null`** e ainda assim abre uma aba `about:blank`. Sem o `noopener`
  devolve a janela. Como o código só redireciona quando recebe a janela,
  a aba fica em branco, sem endereço, para sempre. Vale para **todo**
  navegador que não seja o app instalado, e para os três chamadores.
- **Qual caminho o iPhone do fundador tomou não foi medido.** O app tem
  `apple-mobile-web-app-capable` (`src/app/layout.tsx`), então o iPhone
  provavelmente foi reconhecido como instalado — e nesse caminho o código
  nem chama `window.open`, então o defeito medido provavelmente **não é o
  que o fundador viu**. Correção registrada por ele mesmo: a evidência pende
  para o app instalado, e se a página em branco continuar no iPhone depois
  deste conserto, é outra coisa e se investiga de novo, **sem partir da
  suposição de que foi resolvido**.

## O que o `noopener` protege — medido — e o que custa cortá-lo à mão

**Protege contra a página de fora sequestrar a aba do app.** Por padrão, uma
janela aberta por `window.open` recebe uma ligação de volta com quem a
abriu (`window.opener`) e pode redirecioná-la. Medido no mesmo teste de duas
origens: sem `noopener` e sem cortar nada, um site de origem diferente
mandou a aba do app para uma página "SEQUESTRADO". **A proteção se aplica
aqui**: o Kiwify é site de terceiro numa tela de pagamento, e o WhatsApp
também.

**Como se mantém a proteção sem perder a janela:** `janela.opener = null`
logo depois de abrir, antes de navegar. Medido: o site de fora enxergou
`window.opener` nulo e o ataque ficou impossível; a aba do app ficou
intacta. Mantém o toque único no navegador comum.

**O que se perde, registrado por decisão do fundador (nenhum dos dois o
preocupa aqui — o Kiwify já sabe de onde vem o pagamento):**

1. **A origem chega ao destino.** O `noreferrer` deixa de valer nesse
   caminho: o destino recebe o domínio de origem (medido: só
   `http://127.0.0.1:8765/`, sem caminho nem parâmetros).
2. **O isolamento interno do navegador que o `noopener` também dá** (a nova
   aba num grupo de contexto separado). **Não medido.**

**Só o Chrome de computador foi medido.** No Safari do iPhone é esperado
funcionar igual, mas não foi medido — por isso o corte tem uma **guarda de
falha fechada**: se, depois de `janela.opener = null`, `janela.opener`
ainda não for `null`, a janela é fechada e o caminho cai no segundo toque
(abaixo), em vez de navegar para um site de terceiro com a ligação viva.

## Desenho

**Mecanismo — `prepararJanelaExterna` (`src/lib/utils/link-externo.ts`):**

- **Navegador comum:** abre a janela **sem `noopener`**, corta o vínculo
  (`opener = null`, com a guarda acima), e redireciona depois que o
  servidor responde. Um toque só, sem mudança visível.
- **App instalado:** não navega sozinho depois do servidor — devolve
  "precisa de toque", e o chamador mostra o segundo toque com o link já
  pronto.
- **Navegador bloqueou a janela** (`window.open` devolveu `null` de
  verdade): também cai no segundo toque. **Não estava no desenho aprovado
  em conversa** — incluído porque o resultado hoje é o mesmo silêncio que
  motivou o plano (o chamador recebe `null`, pula o redirecionamento e o
  usuário não vê nada), e o convite ainda navega para a lista como se
  tivesse dado certo. Registrado aqui para o fundador contestar.
- O retorno deixa de poder ser `null`: `prepararJanelaExterna()` sempre
  devolve um objeto; `redirecionarPara(url)` devolve `"navegou"` ou
  `"precisa-de-toque"`. Os três chamadores perdem os `if (janela)`.

**Segundo toque — um componente só, não três cópias (`CLAUDE.md` §2,
terceiro padrão):** `src/components/ui/BotaoContinuarExterno.tsx`, um
`Botao` principal com `href` (o inventário já aceita link com a aparência de
botão — `docs/componentes.md` 01, `src/components/ui/Botao.tsx`) e:

- `destino="navegador"` (pagamento): `target="_blank"` com `rel="noopener
  noreferrer"` — no app instalado o iOS entrega ao Safari de verdade, com
  barra de endereço, o que numa tela de pagar é o desejável, e o motivo
  original de navegar na mesma janela (preservar o estado do app ao voltar
  do WhatsApp, `link-externo.ts`, 12/09/2026) não se aplica.
- `destino="whatsapp"`: no app instalado, **mesma janela** (decisão de
  12/09/2026, mantida — o sistema entrega o link `wa.me` ao aplicativo do
  WhatsApp e o app do FretiGate continua onde estava); fora dele,
  `target="_blank"`.

O toque no botão é um toque real, com o link já pronto e síncrono — é o que
o iOS aceita entregar direto ao aplicativo, e a saída que
`CLAUDE.md` §14 já tinha identificado para o convite.

**Os três chamadores:**

- `/planos` (`TelaPlanos.tsx`): no app instalado, depois que o servidor
  responde, os dois botões "Assinar" dão lugar ao segundo toque. **Provisório**
  (ver "O que vai ao Design"): como trocar de plano depois do link gerado não
  está desenhado — hoje se sai da tela e se volta.
- Convite novo (`FormularioConvite.tsx`): no app instalado, o formulário
  **não sai da tela** depois de criar o convite (senão o segundo toque
  some), e **os campos deixam de aparecer** — sem isso, um segundo envio
  criaria um convite duplicado com o mesmo formulário. Fica a prévia da
  mensagem e o segundo toque.
- Reenviar convite (`ListaUsuarios.tsx`): o segundo toque aparece num bloco
  abaixo da lista, não dentro da linha (uma linha de lista não comporta um
  botão principal de 60px).

## Textos (escolha do fundador)

- **Planos:** "Continuar: anual, R$ 1.164,00" / "Continuar: mensal,
  R$ 197,00". Escolhido por ele porque o segundo toque vem depois de uma
  pausa — o servidor respondeu, a tela mudou — e repetir o plano e o valor
  faz o botão parecer confirmação do que a pessoa escolheu, não uma decisão
  nova. **Um desvio do texto aprovado em conversa** ("R$ 1.164", sem
  centavos): o valor sai do mesmo `formatarCentavos` do cartão da tela, que
  escreve "R$ 1.164,00" — mostrar o mesmo valor de dois jeitos na mesma
  tela quebra a própria razão da escolha (a amarra é ser idêntico ao que
  está na tela). Fica para o fundador contestar.
- **Convite (novo e reenviar):** "Continuar no WhatsApp".
- Alternativas descartadas, para não serem reabertas por analogia: "Continuar
  para o pagamento" (perde a amarra do plano), "Seguir para o pagamento",
  "Abrir o pagamento" (soa a ação nova), "Concluir assinatura" (promete que
  acaba ali, e o pagamento ainda vem depois).

## Comentários falsos, corrigidos junto

Os dois afirmam comportamento medido como falso:

- `link-externo.ts`: "Devolve `null` só no caminho de navegador comum,
  quando o navegador bloqueou a aba" — com `noopener` devolvia `null`
  **sempre**.
- `TelaPlanos.tsx` (cabeçalho): "a janela abre EM BRANCO, síncrona com o
  toque, ... só depois ela é redirecionada" — no navegador comum nunca era
  redirecionada.

Os comentários equivalentes de `FormularioConvite.tsx` e `ListaUsuarios.tsx`
recebem a mesma varredura (`CLAUDE.md` §2, "texto que está certo só por
coincidência de estado envelhece calado"), e o item do convite em
`CLAUDE.md` §14 passa de "saída identificada, não construída" para
"construída, aguardando teste no iPhone".

## O que vai ao Design

O segundo toque muda o que três telas contêm. Construído **provisório**,
com a variante que já existe (`Botao` principal com `href`), sem valor novo
de `docs/estilo.md`:

1. O botão "Continuar: anual, R$ …" / "Continuar no WhatsApp" — entra no
   inventário de `docs/componentes.md`? Com que nome?
2. `/planos`: o que acontece com os botões "Assinar" depois do link gerado, e
   como trocar de plano sem sair da tela.
3. Convite novo: a tela pós-criação (hoje: prévia + botão, sem campos, sem
   nenhum texto novo).
4. Reenviar: onde o segundo toque aparece (hoje: bloco abaixo da lista).

Entra na lista "o que foi pedido ao Design" do diário desta tarefa
(`CLAUDE.md` §13).

## Verificação — e o que só o fundador consegue medir

- **Navegador comum (Chrome de computador):** o caminho da janela sem
  `noopener` + `opener = null` é medido de novo, depois de construído, com o
  código real do mecanismo (não com a página de teste): a aba abre,
  navega para uma origem de fora, `window.opener` é nulo lá, e o app não é
  sequestrado.
- **App instalado (iPhone):** **não dá para medir sem o aparelho**, e o
  projeto não tem suíte de tela (`CLAUDE.md` §14, "Entradas de navegação não
  têm cobertura automatizada"). Nenhum dos três é declarado corrigido para o
  app instalado antes de o fundador testar no iPhone — mesmo critério da
  correção de 12/09/2026. **Se a página em branco continuar lá, é outra
  coisa**, e se investiga de novo sem presumir que este conserto a resolveu.
- Antes de commitar o código: `npx tsc --noEmit`, `npm run lint`, `/revisar`.

## Fora do escopo

- Trocar `abrirLinkExterno` (usado por Cobrar no WhatsApp, Enviar ordem,
  Ver relatório, "Ver o que ela recebe"): ele já não usa handle de janela,
  não tem o defeito medido, e não foi pedido.
- O botão "Voltar" de `/planos` apontar para `/mais` sem existir a pílula
  que leva para lá (já registrado no diário de 18/09/2026).
- `gerarLinkDeCheckoutAction` engolir o erro sem registrar em log (o
  `catch` devolve a mensagem genérica e não deixa rastro) — visto ao ler o
  arquivo; fica como achado, não corrigido aqui.
