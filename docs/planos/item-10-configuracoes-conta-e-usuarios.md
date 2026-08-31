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
- Tabela nova `Convite`: `email` · `nome` · `papel` (`PapelUsuario`, reaproveita
  o enum de `Usuario`) · `token String @unique` · `status` (`pendente` |
  `aceito` | `cancelado`, default `pendente`) · `enviado_em` · `aceito_em` ·
  `empresa_id` (isolamento, mesma política de toda tabela de domínio) ·
  `criado_em` · `atualizado_em` · `arquivado_em` (padrão de toda tabela, §7 —
  mesmo sem uso previsto hoje, já que `status: cancelado` cobre o
  "não apagar" na prática).
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
  `removerAcesso` (arquiva o `Usuario` — o dono não pode remover a si
  mesmo), `convidarUsuario` (cria `Convite`), `reenviarConvite` (token e
  `enviado_em` novos), `cancelarConvite`, `aceitarConvite` (token válido +
  senha → cria `Usuario`, marca `aceito_em`).

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

Sem limite de quantidade de convites — o limite de assentos (1 grátis/3
pago, `CLAUDE.md` §10) é do item 13; esta tarefa não implementa nenhuma
trava de plano.

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
