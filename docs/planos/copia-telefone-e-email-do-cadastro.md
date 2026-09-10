# Plano — telefone e e-mail do cadastro também viram contato da Empresa

**Escrito DEPOIS da construção, não antes — divergência do `CLAUDE.md` §2,
item 1, achada pelo `/revisar` e aceita pelo fundador.** A tarefa foi
conduzida turno a turno na conversa: o fundador viu o campo E-MAIL vazio na
tela Conta da empresa, pediu para investigar se era bug ou campo diferente,
e depois de eu confirmar que eram campos diferentes (mas só um dos dois
nascia copiado do cadastro, sem nenhuma decisão escrita para essa
assimetria), decidiu ali mesmo copiar os dois. Nenhum arquivo em
`docs/planos/` foi aberto antes de eu editar código — o mesmo buraco de
processo já registrado, pela segunda vez, em `docs/planos/
correcao-pool-esteira-vermelha.md` e `docs/planos/
teste-de-contraste-varredura-de-segredo.md`. Este arquivo existe para
documentar o que foi decidido, não para fingir que veio antes.

## Contexto

`Empresa.telefone` e `Empresa.email` (`prisma/schema.prisma`) são os campos
de contato editáveis em Conta da empresa (`docs/especificacao.md` §4.9) e
usados no cabeçalho do relatório PDF (§4.4). São diferentes do e-mail de
login (`Usuario.email`) — decisão já registrada em `docs/especificacao.md`,
seção "Cadastro": "o telefone é o contato para o cliente falar com a
empresa, não é login — login é e-mail e senha".

Ao conferir `src/lib/servicos/criar-empresa-e-dono.ts`, usado pelos dois
caminhos de entrada do produto (`cadastro.ts` e `pagamentos.ts`), o
`tx.empresa.create` gravava `telefone: dados.telefone` mas nunca `email:
dados.email` — o e-mail digitado no cadastro só virava login do Usuário
dono, nunca contato da Empresa. Essa assimetria não tinha nenhuma decisão
escrita explicando por que um campo do formulário era copiado e o outro
não — lia como esquecimento, não escolha.

## Decisão do fundador

Copiar os dois campos do formulário de cadastro para a Empresa — não só o
telefone. Motivo, nas palavras do fundador: "no caso comum quem cria a
conta é o dono da transportadora, e o contato dele é o contato dela." A
pessoa corrige em Conta da empresa se um dia forem diferentes (segundo
sócio, telefone comercial próprio etc.) — nascer preenchido erra a favor de
menos campo vazio no primeiro uso, não de um valor final e correto.

Vale para os dois caminhos de entrada (cadastro gratuito e a conta que
nasce de um pagamento, item 13), porque os dois já passam por
`criarEmpresaEDono` — bastou gravar o campo que a função já recebia e
descartava. Telefone continua nulo no Fluxo B (a tela de ativação de
assinatura não pergunta telefone).

## O que mudou

- `src/lib/servicos/criar-empresa-e-dono.ts` — `tx.empresa.create` passa a
  gravar `email: dados.email`, ao lado de `telefone: dados.telefone`.
  Comentário no tipo `DadosCriarEmpresaEDono` registra a decisão e o
  motivo, citando a seção "Cadastro" da especificação para a distinção
  telefone/login já existente.
- `docs/especificacao.md`, seção "Cadastro" — nova frase registrando que os
  dois campos também viram `Empresa.telefone`/`Empresa.email`, com a
  decisão e a exceção do Fluxo B.
- `tests/cadastro.test.ts` — novo teste chamando `criarEmpresaEDono`
  diretamente (a função de verdade, não a réplica de baixo nível que o
  resto do arquivo usa para os testes de reversão), confirmando que
  telefone **e** e-mail chegam na Empresa. Guarda contra a regressão: se
  algum dia um dos dois parar de ser copiado, este teste quebra.
- `tests/pagamentos.test.ts` — o teste existente de `ativarAssinatura`
  ganhou e-mail em caixa mista na entrada, provando que a normalização
  (minúsculo) sobrevive tanto no login quanto no `Empresa.email` — os dois
  vêm do mesmo `email` normalizado dentro de `ativarAssinatura`. Também
  confere que `telefone` continua nulo no Fluxo B.

Nenhuma migration foi necessária — os dois campos já existiam no schema
(`Empresa.telefone`, `Empresa.email`), ambos opcionais, desde antes desta
tarefa.

## Lacunas registradas, não corrigidas agora

1. **Empresas criadas antes de 10/09/2026 continuam com `Empresa.email`
   nulo — sem retropreenchimento.** A correção vale só para cadastro novo
   daqui pra frente. Decisão do fundador: deixar como está — o único
   registro anterior no ar é a conta de teste do próprio fundador em
   produção, sem dado de cliente real para migrar; um `UPDATE` retroativo
   contra risco zero não se justifica. Se aparecer uma conta real criada
   antes desta data com `email` nulo, o caso é resolvido individualmente,
   não por regra geral.
2. **Nenhuma tela avisa que o e-mail do cadastro vira contato comercial no
   cabeçalho do relatório.** Decisão do fundador: registrar como lacuna,
   não decidir a redação agora — copy de campo é do Design, que já tem
   lista acumulada. O motivo a registrar é concreto: o e-mail que a pessoa
   digita no cadastro/na ativação de assinatura vai para o cabeçalho do PDF
   que chega ao cliente do cliente (`docs/especificacao.md` §4.4,
   `src/lib/servicos/relatorios.ts:497-498`) — se a pessoa cadastrar um
   endereço pessoal achando que é só login, ele vira contato comercial sem
   ela saber. Nem `docs/componentes.md` (Cadastro/Entrar) nem a tela de
   ativação de assinatura preveem texto de apoio nesse campo hoje.

## Verificação

1. `npx vitest run tests/cadastro.test.ts tests/pagamentos.test.ts` local —
   25/25, duas vezes (antes e depois das correções do `/revisar`).
2. `/revisar`, dois passes:
   - Primeiro passe: três divergências (duas citações de seção erradas —
     `§4.9` em vez de `§4.4`/nenhuma seção sustentando a frase — e uma
     alegação imprecisa sobre "nenhuma decisão escrita"; a frase-fonte
     existia, só não decidia o que este diff decide) e uma lacuna de
     documentação de produto. Todas aceitas e corrigidas.
   - Segundo passe: sem divergências. Três lacunas (as duas acima, mais a
     ausência deste próprio plano) — nenhuma da categoria de rigor total
     (isolamento, dinheiro, dado irrecuperável), processo fecha aqui.

## Arquivos

- `src/lib/servicos/criar-empresa-e-dono.ts`
- `docs/especificacao.md`
- `tests/cadastro.test.ts`
- `tests/pagamentos.test.ts`
- Este arquivo, escrito depois — ver a nota no topo.
- `docs/diario.md`
