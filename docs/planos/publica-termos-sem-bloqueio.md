# Plano — publica os Termos e a Política de Privacidade, sem bloqueio de lançamento

**Aprovado pelo fundador em 18/08/2026.** Commitado antes de a construção
começar, conforme o `CLAUDE.md` §2.

## Contexto

Os Termos de uso e a Política de Privacidade estão em produção como rascunho
desde a tarefa 8 (07/08/2026), marcados como **BLOQUEIO DE LANÇAMENTO**
(`CLAUDE.md` §14): nem a forma do aceite nem a redação passaram por revisão
jurídica, e por isso nada pode ir ao ar — nem anúncio, nem cliente pagante —
antes de resolver isso.

O fundador decidiu publicar agora, com um acréscimo: um parágrafo novo na
Política de Privacidade, autorizando o uso agregado e anonimizado dos dados
lançados no sistema para melhorar o produto e produzir informações de
mercado (médias de valor por rota, volume por região). A revisão jurídica
deixa de bloquear o lançamento — vira pendência para depois do primeiro
cliente.

**Por que este parágrafo entra agora e o resto do texto legal espera:** ele é
o único ponto sem conserto depois. A LGPD não se aplica retroativamente —
dado coletado sem essa cláusula não pode passar a ser usado assim mais
tarde, nem anonimizado. Os demais pontos que a revisão jurídica ainda vai
cobrir (retenção, direitos de titulares terceiros, transferência
internacional, alteração dos termos, limitação de responsabilidade) valem do
aceite em diante, então podem esperar.

Decisões tomadas com o fundador nesta rodada:
- `termos_versao` passa a ser a **data de publicação** da versão do texto
  (`"2026-08-18"`), não um número sequencial — responde direto "quando essa
  versão passou a valer" sem precisar consultar outro lugar. Toda Empresa que
  aceitar esta versão grava a mesma data; `termos_aceitos_em` continua sendo
  o momento em que cada Empresa aceitou (os dois podem divergir).
- O aviso "Rascunho" sai da tela `/termos` e **nada entra no lugar** — se a
  decisão é publicar, este é o texto vigente, e um aviso de "isto pode não
  valer" na tela onde o cliente aceita é pior do que qualquer imprecisão do
  texto em si. A pendência de revisão jurídica continua registrada no
  `CLAUDE.md` §14 — ela some da tela, não do registro.

## O que muda

1. **Novo parágrafo na Política de Privacidade** —
   `src/app/(auth)/termos/ConteudoTermos.tsx`, array `PARAGRAFOS_PRIVACIDADE`:
   insere o parágrafo abaixo entre o parágrafo dos subprocessadores (hoje
   índice 1) e o parágrafo da exportação (hoje índice 2), texto exato do
   fundador:

   > O FretiGate usa os dados lançados no sistema para melhorar o produto e
   > para produzir informações agregadas sobre o setor de transporte de
   > cargas — como médias de valor por rota, volume por região e
   > comportamento de mercado. Esse uso é sempre agregado e anonimizado:
   > nenhum dado que identifique a empresa, seus clientes, motoristas ou
   > fretes individuais é exposto, compartilhado ou publicado. A empresa
   > pode pedir a exclusão dos seus dados desse uso pelo e-mail de contato
   > do FretiGate.

2. **Remove o aviso "Rascunho"** — mesmo arquivo: remove o bloco `<div>` que
   renderiza "Rascunho / Texto provisório, ainda sem revisão jurídica..."
   (linhas ~71-79) e o comentário JSX "Bloqueio de lançamento" que o precede
   (linhas ~69-70). Nada entra no lugar.

3. **`termos_versao` deixa de ser provisório** —
   `src/lib/servicos/cadastro.ts`:
   - Renomeia `VERSAO_TERMOS_PROVISORIA` para um nome que não sugira
     provisório (ex.: `VERSAO_TERMOS_PUBLICADA`).
   - Valor passa de `"provisoria-antes-da-tela-de-termos"` para
     `"2026-08-18"`.
   - Reescreve o comentário acima da constante: tira a moldura "BLOQUEIO DE
     LANÇAMENTO" (a tela e o texto já existem e foram publicados); explica
     que o valor é a data de publicação da versão aceita — igual para toda
     Empresa que aceitar esta versão —, distinta de `termos_aceitos_em`
     (quando cada Empresa aceitou); registra que uma versão futura (nova
     data) vale só a partir do próprio aceite dela — Empresas que já
     aceitaram esta não são reescritas retroativamente quando a próxima
     versão nascer.
   - Atualiza a atribuição em `Empresa.create` (`termos_versao: ...`) para o
     novo nome de constante.

4. **Atualiza `CLAUDE.md` §14** — bullet "BLOQUEIO DE LANÇAMENTO — forma do
   aceite dos Termos e a redação deles":
   - Remove a marcação de bloqueio; registra que o texto foi publicado em
     18/08/2026 com a forma de aceite atual (texto acima do botão, sem caixa
     de marcação) e a redação atual (com o parágrafo novo do item 1); a
     revisão jurídica dessas duas coisas vira pendência **sem bloqueio de
     lançamento**, para depois do primeiro cliente pagante.
   - Mantém o parágrafo já existente sobre `/termos` zerar o formulário de
     Criar conta ao navegar (reescrito sem o framing de "bloqueio") — segue
     pendente, muda quando a tela de Termos for revista.
   - Acrescenta bullet novo, registrando a pendência do pedido do fundador:
     o texto publicado promete exportação a qualquer momento, cancelamento
     a qualquer momento e leitura mantida por um período após o
     cancelamento — nenhuma das três tem mecanismo automático no produto
     hoje; até existirem, são cumpridas à mão. A exportação é a mais urgente
     de registrar: tem prazo legal de resposta (LGPD), diferente das outras
     duas.

5. **Atualiza `docs/especificacao.md`** (seção Empresa, parágrafo de
   `termos_aceitos_em`/`termos_versao`, linhas ~623-638): remove o "BLOQUEIO
   DE LANÇAMENTO" ali também, alinhado com o `CLAUDE.md` §14; documenta que
   `termos_versao` guarda a data de publicação da versão (igual para toda
   Empresa que aceitou aquela versão), e que uma versão futura vale só a
   partir do próprio aceite — não retroage sobre quem já aceitou a anterior.

6. **Nova entrada no `docs/diario.md`** (topo do arquivo, formato
   `## 18/08/2026 — ...`): registra o pedido do fundador, o parágrafo novo,
   por que ele não podia esperar a revisão jurídica (LGPD não retroage), a
   remoção do bloqueio e do aviso de rascunho, a nova versão e por que é a
   data de publicação, e as pendências registradas no `CLAUDE.md` §14
   (revisão jurídica futura + cumprimento manual de exportação/cancelamento/
   retenção). Fecha com "Próximo: tarefa 2 da auditoria" (regra do eslint
   contra cliente de banco fora de `src/lib/db`).

## Verificação

- `npm run lint`
- `npx tsc --noEmit`
- `npm test` — confirma que nada depende do valor antigo da constante (os
  seeds de outras suítes usam literais próprios, ex. `"teste"`, não a
  constante de `cadastro.ts`).
- Abrir `/termos` no preview do navegador, nos dois modos (`deCadastro`
  verdadeiro e falso): conferir que o parágrafo novo aparece na aba Política
  de privacidade, na posição certa, e que o aviso "Rascunho" não aparece
  mais em nenhum dos dois modos.
- Rodar `/revisar` antes de pedir o commit — compara o diff contra
  `CLAUDE.md` e a especificação, sem ver esta conversa.

## Arquivos

- `src/app/(auth)/termos/ConteudoTermos.tsx`
- `src/lib/servicos/cadastro.ts`
- `CLAUDE.md`
- `docs/especificacao.md`
- `docs/diario.md`
- `docs/planos/publica-termos-sem-bloqueio.md` (este arquivo, commitado antes
  da construção)
