# Plano — item 10: Configurações, conta da empresa e usuários

Commitado antes da construção começar, conforme `CLAUDE.md` §2.

## Contexto

Item 8 (dashboard) fechou no commit `765ed02`. Oito dos dez itens do MVP
prontos — faltam este e Despesas (item 11) e Assinatura (item 13).

Três dívidas específicas motivaram a ordem: a marca da empresa na dashboard
nasceu não-tocável esperando esta tela (item 8); a chave Pix só nasce pela
"folha do campo que falta", disparada na hora de cobrar (item 6); a origem
do frete usa a origem do último frete lançado porque o pátio ainda não tem
onde ser cadastrado (item 3). As três se resolvem aqui.

Duas colunas de `Empresa` já existem no schema esperando esta tela
(`prazo_padrao_dias`, `chave_pix`) — ninguém as edita ainda. A tabela
`Convite` só existe no papel, em `docs/especificacao.md` §6.

## Decisões do fundador, 31/08/2026

**1. Conta da empresa, Configurações e Usuários são do dono — `comoDono`,
não `comoUsuario`.** As três mexem em identidade e regra financeira da
empresa: a chave Pix que recebe dinheiro, o CNPJ do documento fiscal, o
prazo que define quando toda cobrança vence, quem tem acesso ao sistema.
`docs/especificacao.md` §4.9 foi corrigido para refletir isso — o texto
antigo dizia que Dono e Operador tinham "o mesmo acesso... a cadastros" sem
nomear estas três telas como exceção; agora nomeia. **É a primeira vez que
`comoDono` roda de verdade** — construído no item de segurança
(`src/lib/auth/acao.ts`), nunca exercitado em tela real até esta tarefa.

**2. Origem do frete: último frete manda; pátio só é o padrão quando não há
frete anterior.** Quem sai sempre do mesmo pátio já vê o pátio ali de
qualquer jeito, porque foi de lá que o último frete saiu — os dois só
divergem quando a rota anterior começou em outro lugar (uma carreta que foi
entregar fora e volta carregando de lá), e nesse caso é o último frete que
aponta pra onde a carga realmente está. Pátio como padrão fixo obrigaria
reescrever a origem toda vez que a empresa sai da base. `docs/especificacao.md`
§4.1 corrigido.

**3. `dados_bancarios` fica fora.** Sai da lista de campos de Conta da
empresa — nenhum lugar do produto lê essa coluna hoje (a mensagem de
cobrança e o rodapé do A4 só têm `chave_pix`). Mesmo critério que já cortou
"ano do caminhão" e "categoria da CNH": campo sem leitor fica meio
preenchido pra sempre. Dado sensível pesa mais aqui — guardar agência e
conta sem ninguém ler é responsabilidade sem função. Registrado como
lacuna em `CLAUDE.md` §14, com o gatilho: entra quando existir quem leia,
provavelmente o mesmo rodapé do A4 que mostraria Pix.

**4. Logo: limite próprio, menor que o do comprovante.** A logo embute como
`data:` URI dentro do PDF que vai para o WhatsApp do cliente — diferente do
comprovante, que só existe no storage e nunca é embutido em outro arquivo.
Lado máximo **480px** (a maior exibição do produto é 56px, em Conta e no
convite; 480px é generoso e ainda compacto) e alvo de **~80 KB** (contra
300 KB do comprovante — a logo é um gráfico simples, não uma foto).

**5. Numeração do relatório só aumenta.** `atualizarConfiguracoes` recusa
gravar `proximo_numero_relatorio` abaixo do valor atual — baixar o número
faria dois relatórios nascerem com o mesmo `numero` (contador que
`criarRelatorio` incrementa, `docs/planos/item-7-relatorio.md`, Tarefa 1).
Mensagem amigável nomeando o número atual, nunca o erro do banco.

**6. Convite sempre cria `papel: "operador"`.** O formulário que o Design
desenhou (`docs/componentes.md`, "Usuários — convite") só pede nome e
WhatsApp — nenhum seletor de papel. Quem convida nunca cria um segundo
dono; só o dono original tem esse papel. Se um dia isso mudar, é decisão
nova, não inferida por analogia com esta.

**7. `salvarChavePixAction` (a folha do campo que falta, item 6) não muda.**
Continua `comoUsuario` — é a saída de emergência para quem está tentando
cobrar e não tem tempo de esperar o dono preencher a Conta. As duas coisas
coexistem por design: a tela completa (Tarefa 2, dono) e o atalho pontual
(item 6, qualquer papel) escrevem no mesmo campo, com portas diferentes
para motivos diferentes.

**8. `aceitarConvite` acha o `Convite` pelo token através de uma função
`SECURITY DEFINER` dedicada, dona de um papel novo (`fretigate_convite`) —
achado do `/revisar` na própria Tarefa 1, decisão do fundador, 31/08/2026.**
`Convite` é tabela de domínio, e `fretigate_auth` (`src/lib/db/
sem-filtro-de-empresa.ts`) nunca pode alcançar tabela de domínio — mas
achar o convite pelo token acontece antes de saber a empresa, mesma
situação do login por e-mail. Três caminhos foram medidos: reaproveitar o
mecanismo do Better Auth (não serve — `verification` nunca precisa devolver
uma empresa, e `aceitarConvite` precisa); `Convite` entrar no conjunto de
autenticação (funcionaria, mas quebraria a garantia escrita de
`fretigate_auth` nunca alcançar domínio); e a função dedicada, escolhida —
mesmo padrão de `fretigate_reversor`, mas com uma política de leitura ampla
presa dentro da função, devolvendo só os campos mínimos. **A função só
recusa token que não existe; convite vencido, já aceito ou cancelado é
regra do serviço (`src/lib/servicos/usuarios.ts`), nunca da função.**
Decisão completa, com os três caminhos comparados, em `CLAUDE.md` §9 (tabela
de papéis) — não repetida aqui.

**9. `Convite` guarda `telefone`, não `email` — achado do `/revisar` na
própria Tarefa 1, decisão do fundador, 31/08/2026.** O formulário que o
Design desenhou (decisão 6, acima) pede nome e WhatsApp, nunca e-mail — e o
convite é sempre por WhatsApp (`docs/especificacao.md`, "convite de usuário
não manda e-mail"). O e-mail da conta nasce só quando a pessoa aceita — ela
digita o próprio e-mail em `(auth)/aceitar-convite`, junto da senha —, nunca
antes. `aceitarConvite` mudou de `(token, senha)` para `(token, {email,
senha})`.

## Correções de documento aplicadas junto deste plano

- `docs/especificacao.md` §4.9 — "Convite por e-mail ou WhatsApp" corrigido
  para "Convite por WhatsApp": a tela desenhada nunca teve opção de e-mail.
- `docs/especificacao.md` §"E-mail transacional" — "três momentos" corrigido
  para "dois" (recuperação de senha, verificação de e-mail); "convite de
  usuário" removido da lista, com a explicação de por quê.
- `docs/especificacao.md` §4.9 — "chave Pix e dados bancários" separado;
  `dados_bancarios` vira lacuna (decisão 3 acima).
- `docs/especificacao.md` §4.1 — origem do frete corrigida (decisão 2 acima).
- `docs/especificacao.md` §4.9 — papéis: Configurações e Conta da empresa
  nomeadas explicitamente como exclusivas do dono (decisão 1 acima).
- `docs/especificacao.md` §6, entidade `Convite` — campo trocado de `email`
  para `telefone` (decisão 9 acima).
- `docs/especificacao.md` §6, entidade `Empresa` — "`patio_*` ... ninguém lê
  ainda" corrigido: a coluna já tem leitor e lugar de preencher desde esta
  tarefa (mesmo tratamento que `chave_pix` já tinha recebido).
- `CLAUDE.md` §9 — quinto papel (`fretigate_convite`) na tabela, com a
  decisão dos três caminhos comparados (decisão 8 acima).

## O que fica de fora, e por quê

| Onde | O que falta | Motivo |
|---|---|---|
| Conta da empresa | Campo "dados bancários" | Sem consumidor — decisão 3 |
| Conta da empresa | Linha "Minha assinatura" | Item 13, ainda não construído — mesmo tratamento da marca não-tocável do item 8 |
| Configurações | Seção MENSAGENS (editar modelos) | Fora do MVP, decisão de 09/08/2026 (`docs/especificacao.md` §9) |
| Usuários — convite | Seletor de papel | Formulário do Design não tem; convite sempre cria operador — decisão 6 |
| `salvarChavePixAction` (item 6) | Nenhuma mudança | Atalho pontual, papel diferente da tela nova — decisão 7 |

---

## As tarefas

### Tarefa 1 — Fundamentos: schema e serviços

Migration:
- `Empresa` ganha `patio_endereco String?` e `patio_municipio_id Int?` (FK
  para `Municipio`, mesmo padrão de `municipio_id`).
- Tabela nova `Convite`: `telefone` · `nome` · `papel` (`PapelUsuario`,
  reaproveita o enum de `Usuario`) · `token String @unique` · `status`
  (`pendente` | `aceito` | `cancelado`, default `pendente`) · `enviado_em` ·
  `aceito_em` · `empresa_id` (isolamento, mesma política de toda tabela de
  domínio) · `criado_em` · `atualizado_em` · `arquivado_em` (padrão de toda
  tabela, §7 — mesmo sem uso previsto hoje, já que `status: cancelado` cobre
  o "não apagar" na prática). **`telefone`, não `email`** — decisão 9,
  abaixo, achado do `/revisar` na própria tarefa: o convite é sempre por
  WhatsApp, nunca e-mail.
- Token: gerado com `crypto.randomBytes`, longo o bastante para não ser
  adivinhável (é uma credencial de uso único que cria conta) — não reaproveita
  o código de 24 caracteres do Better Auth, que vive na tabela `verification`
  dele e não tem porta de saída para uma tabela nossa.
- Isolamento de `Convite`: contraste, concorrência, os três jeitos de vazio
  (`CLAUDE.md` §3) — mesma suíte que toda tabela nova precisa.

Serviços:
- `src/lib/servicos/empresas.ts` ganha `buscarEmpresa` (leitura completa) e
  `atualizarContaDaEmpresa` (razão social, CNPJ, endereço, telefone, e-mail,
  chave Pix, logo — generaliza o que `salvarChavePix` já faz para um campo
  só; `salvarChavePix` continua existindo, é quem `salvarChavePixAction`
  chama) e `atualizarConfiguracoes` (pátio, prazo padrão, numeração do
  relatório — com o piso da decisão 5).
- `src/lib/servicos/usuarios.ts` (novo): `listarUsuarios`, `buscarUsuario`,
  `removerAcesso` (arquiva o `Usuario` — **o acesso do dono não pode ser
  removido**, checado pelo `papel` do alvo, não por "o chamador não remove a
  si mesmo" — achado do segundo `/revisar` na própria tarefa, ver
  `docs/componentes.md`, "Usuários — detalhe"), `convidarUsuario` (cria
  `Convite`), `reenviarConvite` (token e `enviado_em` novos),
  `cancelarConvite`, `aceitarConvite` (token válido + **e-mail** (decisão 9)
  + senha → cria `Usuario`, marca `aceito_em`, reivindicando o convite
  atomicamente antes de criar a conta — achado do segundo `/revisar`).

**Testes:** serviço para cada função nova, contra o banco de desenvolvimento.
Isolamento de `Convite` na suíte permanente (`tests/isolamento/`).

### Tarefa 2 — Conta da empresa: dados, logo e as três pendências que fecham

Tela `/conta`: razão social, CNPJ, endereço, telefone, e-mail, chave Pix,
logo — principal **Salvar dados**, `comoDono`. Prévia do cabeçalho do
relatório (reaproveita o que `moldeDocumentoA4` já sabe montar). Linhas para
Usuários (→ `/conta/usuarios`) e Termos; sem linha de Minha assinatura ainda
(item 13).

Upload de logo — mesmo pipeline de `comprovantes.ts` (sniff por conteúdo,
HEIC/HEIF, remoção de EXIF, nome aleatório, URL assinada), com os limites
próprios da decisão 4. Vale extrair o miolo de reprocessamento para uma
função compartilhada — é o segundo caso de uso real de imagem do produto,
não abstração especulativa. Novo balde `logos`. Rota de API própria
(`/api/conta/logo`) com `exigirDono()` escrito à mão — mesma lacuna já
registrada em `CLAUDE.md` §9 sobre rota de API não ter a trava automática
que Server Action tem.

Fecha a pendência do item 7: `moldeDocumentoA4`/o gerador passam a buscar os
bytes da logo e embutir como `data:` URI antes de chamar o Chromium (mesmo
padrão das fontes) — sem isso, `<img src>` apontando para uma URL assinada
não carregaria, porque o Chromium do gerador roda sem rede.

Fecha a pendência do item 8: a marca da empresa no cartão escuro da
dashboard vira tocável, leva a `/conta`.

Fecha a pendência do §8 sobre a margem provisória de Termos no modo
Ajustes: `/termos` acessado a partir de `/conta` passa a ter barra de
navegação de verdade e a folga de rolagem padrão — porque agora existe uma
tela dentro da sessão para reservar essa folga contra.

"Mais" ganha a seção AJUSTES (Configurações, Conta), visível só quando
`sessao.papel === "dono"` — decisão 1.

**Testes:** serviço para `atualizarContaDaEmpresa` e para o pipeline de
logo (reaproveitando os casos já cobertos em `comprovantes.test.ts`: tipo
recusado, tamanho, HEIC). Sem suíte de tela (mesma decisão dos itens 7/8) —
verificação manual no navegador.

### Tarefa 3 — Configurações: pátio, prazo padrão, numeração do relatório

Tela `/configuracoes`: endereço do pátio com busca de município (reaproveita
`resolverMunicipio`/`src/lib/servicos/municipios.ts`), prazo padrão de
vencimento, próximo número do relatório (com o piso da decisão 5) —
`comoDono`. Sem seção MENSAGENS.

`fretes/novo/page.tsx` passa a aplicar a decisão 2: `origemTexto` continua
vindo do último frete quando existe um; só cai para o pátio cadastrado
quando `buscarUltimoServico` devolve vazio.

**Testes:** serviço para `atualizarConfiguracoes` (piso da numeração,
gravação de pátio/prazo) e para a nova regra de pré-preenchimento da
origem (com e sem frete anterior).

### Tarefa 4 — Usuários: convite por WhatsApp, remoção pelo dono

`/conta/usuarios` — lista (com acesso + convite pendente: aguardando,
reenviar, cancelar). `/conta/usuarios/novo` — nome, prévia da mensagem,
"Mandar convite no WhatsApp" abre a conversa com o link de aceite (mesmo
padrão de link com mensagem pronta já usado em Cobrar no WhatsApp/Enviar
ordem). `/conta/usuarios/[id]` — detalhe, "Remover acesso" (destrutivo, o
próprio dono não aparece removível). Todas as ações `comoDono`.

`(auth)/aceitar-convite` — pública, token na URL: marca da empresa + o que a
pessoa vai poder fazer, campo de senha, cria a conta e entra. Token inválido
ou já usado tem tela própria (mesmo padrão de "Link expirado" da recuperação
de senha).

**Pendência aberta pela decisão 9: a tela também precisa de um campo de
e-mail**, já que `aceitarConvite` (Tarefa 1) passou a exigi-lo como entrada
— o convite guarda só `telefone`, nunca e-mail. Nem `docs/componentes.md`
("Aceitar convite") nem `docs/navegacao.md` mostram esse campo hoje; fica
registrado como lacuna, resolver quando esta tarefa for construída.

Sem limite de quantidade de convites — o limite de assentos (1 grátis/3
pago, `CLAUDE.md` §10) é do item 13; esta tarefa não implementa nenhuma
trava de plano.

**Requisito desta tarefa, achado do `/revisar` na Tarefa 1: `aceitarConvite`
precisa de rate limit.** `CLAUDE.md` §4 exige "rate limit em... toda rota
que gere custo" e a rota é pública, por token, mesma família de
`/redefinir-senha` (que já tem trava, `src/lib/auth/index.ts`,
`customRules`). O token é longo (32 bytes aleatórios, `base64url`) — força
bruta não é o risco —, mas é rota pública consultando o banco a cada
chamada, e a regra já vale para as outras. Não existe rota nenhuma antes
desta tarefa (`aceitarConvite`, o serviço, não tem onde pendurar uma
trava), então fica registrado como requisito explícito daqui, mesmo padrão
de `docs/diario.md`/`CLAUDE.md` §14 para requisito de rota que só nasce
numa tarefa futura.

**Testes:** serviço para `convidarUsuario`/`reenviarConvite`/
`cancelarConvite`/`removerAcesso`/`aceitarConvite` (token vencido/inválido,
dono não removível, papel sempre operador). `tests/sessao-e-papel.test.ts`
ganha o primeiro caso real de `comoDono` barrando operador numa ação de
produto, não só na função de auth isolada.

---

## Lacunas registradas, não corrigidas agora

- **`dados_bancarios`** — decisão 3, também em `CLAUDE.md` §14.
- **"Minha assinatura" sem link** — entra quando o item 13 construir a tela.
- **Seletor de papel no convite** — decisão 6; se um dia a empresa precisar
  de um segundo dono, é decisão nova.
- **Rota de API do logo sem trava automática** — mesma lacuna já registrada
  para `comprovante`, `CLAUDE.md` §9.
- **`prazoPadraoDias` sem faixa de validação** — achado do `/revisar` na
  Tarefa 1: `atualizarConfiguracoes` aceita zero ou negativo, o que
  produziria vencimento no passado em toda cobrança que herdar o prazo da
  empresa. Nenhum documento define um limite hoje. Registrado, não
  corrigido — a Tarefa 3 (tela) é o lugar natural de decidir a faixa junto
  do campo.
- **Convites duplicados para o mesmo telefone, ou convite para quem já tem
  conta na empresa** — achado do `/revisar` na Tarefa 1: `convidarUsuario`
  não confere nenhum dos dois casos; a recusa por e-mail já em uso só
  aparece no aceite (`aceitarConvite`). Decisão de produto em aberto — se
  deve barrar, avisar, ou deixar como está.
- **`atualizarContaDaEmpresa` deixa esvaziar um CNPJ já preenchido** —
  achado do segundo `/revisar`: `cnpj: ""`/`null` grava nulo e libera o
  CNPJ (`@unique`) para outra conta usar. `docs/especificacao.md` fecha o
  caminho do arquivamento ("empresa arquivada não libera o CNPJ"), mas não
  diz se a própria tela de edição pode esvaziar o campo. Decisão de produto
  em aberto.
- **`patioMunicipioId` inválido sobe o erro cru de chave estrangeira** —
  achado do segundo `/revisar`: a Tarefa 3 resolve o município por busca
  (`resolverMunicipio`), então um id inválido não deveria acontecer no uso
  normal, mas nada garante isso na função. Nenhum documento define a
  mensagem para esse caso.
- **`email` da Conta da empresa sem validação de formato** — achado do
  segundo `/revisar`: `atualizarContaDaEmpresa` grava texto livre, diferente
  de `aceitarConvite` (que valida com `z.email()`). O e-mail sai no
  cabeçalho do relatório A4, para o cliente do cliente. Nenhum documento
  define se deve ser validado.
- **Numeração do relatório não aparece em `docs/componentes.md`/
  `docs/especificacao.md` como campo da tela Configurações** — achado do
  segundo `/revisar`: `atualizarConfiguracoes` já grava o campo (decisão 5),
  mas quem manda no que a tela contém é `docs/componentes.md` (`CLAUDE.md`
  §13), e ele não lista esse campo nem o rótulo dele. A Tarefa 3 precisa
  dessa decisão do Design antes de construir a tela.
- **`(auth)/aceitar-convite` precisa de campo de e-mail, e nenhum documento
  o define** — achado do terceiro `/revisar`: `docs/componentes.md`
  ("Aceitar convite") e `docs/navegacao.md` descrevem a tela sem esse campo
  — a decisão 9 (e-mail entra só no aceite) nasceu depois do desenho.
  Registrado também no corpo da Tarefa 4, acima.
- **Convite não tem prazo de validade próprio** — achado do terceiro
  `/revisar`: o token vale para sempre até ser usado ou cancelado à mão,
  diferente do link de recuperação de senha (2 horas, `docs/componentes.md`).
  Nenhum documento decide se o convite deveria vencer sozinho.
- **`arquivado_em` de `Convite` não é conferido por `localizar_convite_por_token`
  nem por `aceitarConvite`** — achado do terceiro `/revisar`: hoje nada
  arquiva um convite (`status: cancelado` cobre o caso na prática), então é
  inofensivo; mas se algo um dia arquivar uma linha, ela continuaria
  aceitável pelo token. Registrado para quando essa lacuna deixar de ser
  hipotética (mesmo critério do `CLAUDE.md` §2 sobre estado novo).

### Tarefa 2 — achados do `/revisar`, registrados

- **Textos novos de Conta da empresa sem lastro em documento** — "Adicionar
  logo"/"Trocar logo" (pílula em linha, mesmo tratamento de "Anexar
  comprovante"), as mensagens de `logo.ts`/`route.ts` ("Envie uma imagem em
  JPEG, PNG, WEBP ou HEIC.", "Só o dono da empresa pode trocar a logo.",
  "Muitos envios seguidos por aqui..."), e os seis placeholders de
  `FormularioContaDaEmpresa.tsx`. `docs/componentes.md:486` não lista o
  botão de logo entre o inventário de "Conta da empresa". Mesmo padrão de
  inferência-pendente-do-Design já usado nas tarefas anteriores.
- **Ícone da linha "Termos" em Conta da empresa é provisório, desenhado
  inline** — não existe arquivo em `docs/icones/` para ele (comentário no
  código, `conta/page.tsx`). Rótulo da linha ("Termos e privacidade", ajustado
  para bater com o `<h1>` da própria tela de Termos) também não está fixado
  em nenhum documento — `docs/componentes.md:486` só diz "Termos".
- **A caixa branca da prévia do cabeçalho (`bg-white`, `rounded-campo`,
  `p-16`) não tem tratamento definido pelo Design** — `docs/estilo.md`
  registra só a escala (`0.4`) como lacuna; a tabela de Cores marca
  `#FFFFFF` como "exclusivo do impresso", e esta é a primeira miniatura de
  documento dentro de uma tela comum (fora de "Documento A4"). Círculo de
  56px de `UploadLogo.tsx` também usa `text-[16px]` sem essa combinação
  (56px/16px) estar na tabela de Tipografia.
- **`logoComoDataUri(caminho)` baixa qualquer caminho do balde `logos` com
  `service_role`, sem conferir a que empresa o prefixo pertence** —
  diferente de `gerarUrlComprovante`, que confere posse antes de assinar.
  Hoje é inalcançável por entrada não confiável: o único chamador
  (`relatorios.ts`) sempre passa `Empresa.logo_url`, já lido por
  `db(empresaId)` — a função nunca recebe `caminho` de fora do servidor.
  Registrado para o dia em que um segundo chamador aparecer.
- **Rota `src/app/api/conta/logo/route.ts` sem teste próprio** — mesmo
  limite estrutural de `comprovante/route.ts` (nunca teve um: rota de API
  não é testável direto no Vitest do mesmo jeito que Server Action, por
  causa de `next/headers()`). `exigirDono()`/a trava foram conferidos
  manualmente contra o servidor de verdade nesta tarefa (pedido HTTP real,
  200 autenticado como dono), não por suíte automatizada.
- ~~"Trocar a logo da empresa" (20 por 5 minutos) reaproveita o número do
  comprovante, ainda sem confirmação do fundador~~ — **confirmado pelo
  fundador, 01/09/2026** (mesmo perfil de custo do comprovante). A mensagem
  da trava foi ajustada por pedido dele: reforça que a logo atual não mudou,
  não só "espere" — logo é trocada raramente, então quem esbarra nesta
  trava provavelmente está tentando de novo por algo ter dado errado, não
  por uso normal.

---

## Tarefa 3 — decisões finais antes de construir, 01/09/2026

Duas lacunas que a própria Tarefa 1 já tinha registrado como "decisão do
Design/fundador, ainda não tomada" — resolvidas agora, antes de escrever
qualquer linha da tela, por pedido explícito (`CLAUDE.md` §2: não escolher
o mais provável).

**1. Faixa do prazo padrão de vencimento: 0 a 90 dias, inclusive.**
Zero é válido — pagamento à vista, comum em frete de carga, a cobrança nasce
vencendo hoje e isso está certo. Negativo nunca — não existe combinar prazo
para trás; o efeito seria cobrança nascendo vencida sem ninguém ter pedido.
90 como teto porque acima disso é quase certamente engano de dígito (300 no
lugar de 30) — prazo real de transportadora fica entre 0 e 60 na prática.
`atualizarConfiguracoes` (`src/lib/servicos/empresas.ts`) ganha a validação,
recusando fora da faixa com mensagem nomeando os dois limites — nunca
"valor inválido" sozinho, a pessoa precisa saber qual número serve. Mesmo
padrão de mensagem amigável já usado na numeração (decisão 5, acima).

**A tela precisa deixar explícito que este prazo vale para quem não tem
prazo próprio** — pedido do fundador: o valor atual (15) é herdado por todo
cliente sem prazo cadastrado; baixar para zero muda o vencimento de toda
cobrança futura desses clientes, não só "daqui pra frente" de um cliente
específico. Texto de apoio sob o campo, não só o rótulo.

**2. Campo do pátio: texto livre, resolvido no servidor — mesmo padrão do
campo Origem do lançamento de frete, não o de Destino.** Levantado antes de
decidir: a tela de lançar frete já tem DOIS padrões diferentes para texto de
cidade — Destino sugere município em pílulas enquanto a pessoa digita;
Origem é campo de texto puro, resolvido silenciosamente no servidor
(`resolverMunicipio`, dentro de `normalizarEntrada`) só no momento de
salvar, sem nunca bloquear o salvar se não resolver. Como o pátio existe
para **alimentar exatamente o campo Origem** (fallback quando não há frete
anterior), ele usa o mesmo padrão de Origem — sem sugestão em pílulas.
Evita inventar uma terceira forma de campo de cidade sem necessidade
(`CLAUDE.md` §6, nada de abstração/variante nova sem dois casos reais que
peçam por ela).

**Fecha a lacuna "`patioMunicipioId` inválido sobe o erro cru de FK"
(registrada na Tarefa 1) por construção, não por validação adicional.**
`DadosConfiguracoes.patioMunicipioId` deixa de ser entrada direta de fora —
`atualizarConfiguracoes` passa a chamar `resolverMunicipio` internamente
quando `patioEndereco` é fornecido, e só grava um `patio_municipio_id` que
veio dessa resolução (nunca um id que o chamador tenha fornecido). Mesmo
princípio de `empresa_id` vir sempre de um lugar controlado, nunca de input
externo (`CLAUDE.md` §3) — aqui aplicado ao município, que é a mesma classe
de "referência que o Postgres não valida contra outra empresa nem contra
existência real" se vier direto do formulário. Resolução `ambigua` ou
`nao_encontrada`: o texto grava do mesmo jeito (`patio_endereco`), e
`patio_municipio_id` fica como estava antes — mesma regra de nunca bloquear
o salvar que o frete já usa.

**3. Numeração do relatório — campo editável, pré-preenchido com o valor
atual.** Rótulo proposto: "Próximo relatório será Nº ___", pré-preenchido
com `proximo_numero_relatorio`. Editável e salvo junto dos outros campos da
tela (mesmo "Salvar" único, sem ação separada) — a regra de nunca baixar já
está pronta no serviço (decisão 5), a tela só precisa mostrar a mensagem de
erro dele quando a gravação recusar. Fica registrado aqui como proposta de
construção, não pergunta bloqueante — copy é o mais barato de ajustar depois
se não bater com o gosto do fundador ao ver a tela pronta.

**4. `fretes/novo/page.tsx` — fallback para o pátio, regra corrigida pelo
fundador: "origem do último frete QUE TIVER origem; pátio quando não houver
nenhuma".** Não é só "sem frete anterior" — um frete antigo pode ter sido
lançado sem origem preenchida, e nesse caso o campo nasceria vazio tendo o
pátio disponível. `cliente_id`/`veiculo_id`/`motorista_id` continuam vindo
do frete **mais recente de todos** (`buscarUltimoServico`, sem mudança) —
só a origem passa a olhar para trás até achar uma preenchida, o que pode
ser um frete diferente do mais recente.

Serviço novo, `buscarUltimaOrigemPreenchida(empresaId)`
(`src/lib/servicos/servicos.ts`): `findFirst` por `origem_texto: { not: "" }`,
`orderBy: criado_em desc`. Roda **em paralelo** com `buscarUltimoServico` e
`buscarEmpresa`, no mesmo `Promise.all` que já busca os outros dados da
tela — não é uma segunda ida ao banco em série (que atrasaria a tela toda
vez, não só no caso raro), é mais uma consulta concorrente com as que já
existem. `origemTexto` final: a origem preenchida achada, senão
`empresa.patio_endereco`, senão `""` — três níveis, não dois.

**5. A métrica de 30s (`CLAUDE.md` §1) — como remedir.** O registro de
14/08/2026 (26s) foi cronômetro manual do fundador, no celular, contra o
app rodando — não existe script nem teste automatizado para isso
(`docs/diario.md`, mesma entrada). Esta tarefa não adiciona nenhuma tela
nem toque obrigatório ao fluxo de lançar frete — o fallback do pátio só
muda **qual texto já vem preenchido**, nunca um passo novo.

**Pedido do fundador, mantido mesmo com a leitura acima confirmada:**
remedir depois de pronta, porque é a primeira mexida na tela desde a
medição, e a fonte do texto pré-preenchido mudar pode afetar **quantas
vezes ele corrige o campo** — o cronômetro mede o fluxo inteiro, não só se
apareceu um toque a mais; um valor pré-preenchido errado com mais frequência
custa tempo mesmo sem adicionar etapa nenhuma. Registrado como pedido,
**não bloqueia o fechamento da tarefa** — quem mede é ele, no aparelho
dele, depois que a tela estiver no ar.

**Testes:** validação de faixa do prazo (dentro, nos dois limites, abaixo,
acima); `atualizarConfiguracoes` resolvendo `patioMunicipioId` via
`resolverMunicipio` (resolvido, ambíguo, não encontrado — os três casos
salvam o texto, só o primeiro grava o município); fallback de origem em
`fretes/novo` com e sem frete anterior, com e sem pátio cadastrado (três
casos, não dois).

**Lacuna encontrada na construção, não corrigida agora — o rótulo
"Endereço do pátio" pode induzir a digitar algo que nunca resolve.**
`resolverMunicipio` (`src/lib/servicos/municipios.ts`) separa só a UF do
fim do texto e casa o resto por **igualdade exata** com o nome de um
município — funciona para "Sobral", "Sobral/CE", "Fortaleza (CE)", nunca
para um endereço de rua de verdade ("Av. do Pátio, 456 - Sobral/CE"), que
normaliza para uma string que não bate com nenhum `nome_normalizado`. É o
mesmo motivo já registrado para `Cliente.endereco` (Explorado nesta mesma
tarefa): `resolverMunicipio` é o mecanismo certo para texto curto de
cidade, não para endereço completo. **Nunca quebra nada** — resolução que
falha grava o texto e deixa `patio_municipio_id` nulo, mesma regra de
sempre —, mas se o dono digitar o endereço de rua completo (o que o rótulo
"Endereço do pátio", herdado de `docs/especificacao.md` §4.9, convida a
fazer), o município nunca resolve, e todo o propósito de
`patio_municipio_id` (comparação de rota entre empresas, `CLAUDE.md` §9)
fica sem dado. Rótulo e placeholder já pedem algo mais curto ("De onde a
frota sai"), mas não é garantia. Registrado para o fundador decidir se
ajusta o texto do campo — não é bloqueio, porque nada quebra hoje.
