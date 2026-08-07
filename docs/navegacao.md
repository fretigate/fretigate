# FretiGate — mapa de navegação

Todas as telas do MVP: de onde se chega e para onde leva. ✅ desenhada · ⬜ não desenhada · ⚠️ o que está escrito aqui foi superado por outra decisão, e a linha ainda não foi reescrita.

O ⚠️ nunca substitui os outros dois: uma tela desenhada continua ✅ mesmo com a descrição vencida, porque quem lê precisa saber as duas coisas.

Gerado da prancheta `Mapa de navegação e Clientes.dc.html` (opção 7a). O protótipo navegável é `Protótipo FretiGate.dc.html`.

## Estrutura da barra

A barra é global: aparece em toda tela de nível 1 e continua visível nas telas de detalhe. O **(+)** abre Lançar frete de qualquer lugar. Nenhuma tela de nível 1 tem ação principal própria — só as de detalhe e de formulário têm.


## Nível 1 — destinos da barra

| Tela | Chega de | Leva para |
|---|---|---|
| Início (dashboard) ✅ | Abrir o app · barra · voltar de qualquer detalhe | Pastilha A receber → Cobranças · Pastilha Vencido → Cobranças filtrado · Pendência de faturar → Fretes filtrado · Pendência de cobrança → Cobranças · Pendência de relatório → Relatório preenchido · Atalho Gerar relatório → Relatório · Atalho Importar fretes → Importar · Marca da empresa → Conta |
| Fretes ✅ | Barra · pendência da dashboard · "ver todos" do perfil do cliente | Linha → Detalhe do frete · Nome do cliente na linha → Perfil do cliente · Deslizar → marca recebido na hora · Chips → folhas de filtro |
| (+) Lançar frete ✅ | Barra, de qualquer tela | Salvar → Fretes com o aviso do sistema · Linha recolhida → folha de busca (cliente, caminhão, motorista, origem, destino, carga) |
| Cobranças ✅ | Barra · pastilhas e pendências da dashboard · perfil do cliente | Linha → Detalhe da cobrança · Nome do cliente → Perfil do cliente · Cobrar no WhatsApp → conversa + cartão de retorno · Deslizar → folha de recebimento · Estado vazio → Relatório |
| Mais ✅ | Barra | Cartão de identidade → Conta · CADASTROS: Clientes · Caminhões · Motoristas · FERRAMENTAS: Relatório · Importar fretes · AJUSTES: Novidades · Configurações · Conta · Sair da conta |


## Nível 2 — detalhes e fluxos

| Tela | Chega de | Leva para |
|---|---|---|
| Detalhe do frete ✅ | Linha em Fretes · histórico do perfil do cliente | Faturar frete · Marcar recebido · Editar frete → Lançar frete preenchido · Arquivar · Ver relatório → Documento |
| Detalhe da cobrança ✅ | Linha em Cobranças | Marcar recebido / Receber o resto → folha de recebimento · Cobrar no WhatsApp → conversa · Ver relatório → Documento |
| Relatório — montagem ✅ | Atalho e pendência da dashboard · estado vazio de Cobranças · perfil do cliente | Gerar relatório → Documento A4 |
| Documento A4 ✅ | Gerar relatório · Ver relatório (frete ou cobrança) | Compartilhar no WhatsApp · Baixar PDF · Imprimir |
| Modelo de cobrança ✅ | Mais | Salvar modelo → volta para Mais |


## Mais — cadastros

| Tela | Chega de | Leva para |
|---|---|---|
| Clientes — lista ✅ | Mais · folha de busca de cliente ("ver todos") | Linha → Perfil do cliente · + Novo → Cadastro |
| Perfil do cliente ✅ | Lista de clientes · **nome do cliente em qualquer linha de frete ou de cobrança** | Gerar relatório → Relatório preenchido · Editar cliente → Edição · Cobrar no WhatsApp → conversa · Frete do histórico → Detalhe do frete · Ver todos → Fretes filtrado |
| Cadastro / edição de cliente ✅ | + Novo na lista · Editar no perfil · "+ Cadastrar" na folha de busca do lançamento | Salvar → volta para a lista (ou para o perfil, na edição) · Arquivar cliente |
| Caminhões — lista e perfil ✅ | Mais · folha de busca de caminhão | Mesmo padrão de Clientes: perfil com placa, apelido, tipo, histórico de fretes |
| Motoristas — lista, perfil, cadastro ✅ | Mais · folha de busca de motorista | Linha → Perfil · Editar no cabeçalho → Formulário · Telefone tocável → conversa · Lançar frete com ele → Lançar frete · Estado vazio com convite |
| Importar fretes ✅ | Mais · atalho da dashboard · estado vazio de Fretes · primeiro acesso | Colar texto ou mandar foto → processando → revisão (linha desmarcável, valor editável na hora) → resultado → Fretes. Nada reconhecido → orientação do que tentar |
| Configurações ✅ | Mais | OPERAÇÃO: pátio, prazo padrão, numeração do relatório · MENSAGENS: Modelo de cobrança · Modelo de ordem de serviço |
| Conta da empresa ✅ | Mais · marca da empresa no cartão da dashboard | Logo (ou iniciais), razão social, CNPJ, endereço, telefone, e-mail, Pix e banco · prévia do cabeçalho do relatório · Minha assinatura · Sair da conta |
| Despesas — lista e cadastro ✅ | Mais · card de Lucro da dashboard no estado de convite | Linha → edição · + Nova → cadastro (valor e data obrigatórios, vínculo opcional a caminhão) · Estado vazio explica que o Lucro depende dela |
| Modelo de ordem de serviço ✅ | Configurações › Mensagens | Chips {motorista} {cliente} {carga} {origem} {destino} {data} — sem {valor} |
| Novidades — lista e detalhe ✅ | Mais › Ajustes · cartão FRETINEWS dispensado na dashboard | Linha → Detalhe da mensagem · no máximo uma ação por mensagem |
| Entrar ✅ ⚠️ **SUPERADO — ver nota** | Abrir o app sem sessão · Sair da conta | Código no WhatsApp → Primeiro acesso · Criar conta · Esqueci a senha |
| Criar conta ✅ ⚠️ **SUPERADO — ver nota** | Entrar | Nome da empresa + telefone + a única pergunta de pesquisa do produto → Primeiro acesso |
| Pouso pós-login 🚧 **PROVISÓRIO, não é Primeiro acesso** | Criar conta (destino de hoje, em vez de Primeiro acesso — que ainda não existe) · Sair da conta | Nome da empresa · Sair da conta. Registrado em `src/app/(app)/page.tsx`. Sai quando Primeiro acesso for construído (`docs/especificacao.md` §9, ordem de construção) |
| Esqueci a senha ✅ ⚠️ **SUPERADO — ver nota** | Entrar | CNPJ → mostra em qual telefone a conta está |
| Usuários — lista, convite, detalhe ✅ | Conta da empresa › Usuários | COM ACESSO + CONVITE ENVIADO (aguardando, reenviar, cancelar) · Linha → Detalhe · + Convidar → nome, WhatsApp, prévia da mensagem → abre a conversa · Detalhe → Remover acesso, **só para o dono**; o acesso do dono não é removível. **É a única tela de convidar** — o estado duplicado que existia em Entrar foi removido |
| Aceitar convite ✅ | Link do WhatsApp, fora do app. Na demonstração, por "Ver o que ela recebe" no convite pendente | Marca da empresa + o que a pessoa vai poder fazer → Entrar na conta · Não conheço essa empresa. Sem barra de navegação: quem abre ainda não está dentro do app |
| Termos de uso e privacidade ✅ | Criar conta · Conta da empresa | Duas abas no mesmo documento. Vindo do cadastro, termina em "Li e aceito"; vindo de Ajustes, é só leitura |
| Planos ✅ | Mais (plano gratuito) · limite do gratuito · assinatura | Anual R$ 990 em destaque, 12x de R$ 82,50, economia de R$ 798 · Mensal R$ 149 |
| Minha assinatura ✅ | Conta da empresa | Plano, próxima cobrança, cartão, acessos · Trocar de plano → Planos |
| Limite do gratuito ✅ | Tentar cadastrar o segundo caminhão | Ver os planos → Planos · Continuar com um caminhão → volta sem bloquear nada do que já existe |
| Assinatura vencida ✅ | Cobrança recusada | Leitura e exportação seguem · Atualizar o cartão · Baixar meus relatórios |
| Primeiro acesso ✅ | Criar conta · Entrar pela primeira vez | Duas opções em pé de igualdade: Trazer os fretes que já fiz → Importar · Começar do zero → Lançar frete |
| Guia de progresso ✅ | Topo da dashboard, depois do primeiro acesso | No máximo 3 itens · cada um sai ao ser cumprido · o bloco desaparece ao completar |

> ⚠️ **Nota — as três telas de entrada estão superadas.** O texto acima descreve
> entrada por telefone e código no WhatsApp, e recuperação por CNPJ. **Não é mais
> assim.** A decisão em vigor é **e-mail e senha**, com recuperação por link no
> e-mail: envio automático por WhatsApp é proibido pelo `CLAUDE.md` §12, e o
> schema da tarefa 3 já foi construído sobre e-mail e senha. Quem manda no que
> essas três telas **contêm** é `docs/componentes.md` (telas `Entrar`, `Criar
> conta` e `Esqueci a senha`), que já está correto — ver a precedência no
> `CLAUDE.md` §13.
>
> O trecho fica como está de propósito — **a reescrita é da tarefa 10**. A nota
> existe porque esta linha já induziu a erro uma vez, fazendo um resumo de
> retomada anunciar um bloqueio que não existia mais.
>
> Duas coisas **não** esperaram a tarefa 10, porque nenhuma delas é descrição
> vencida: o nome da tela virou `Esqueci a senha`, que é como ela se chama no
> `docs/componentes.md` (§8 — uma ação, um nome, em todo lugar), e "nome da
> transportadora" virou "nome da empresa" (§8 — dentro do produto é sempre
> empresa). O que sobra para a tarefa 10 é o **mecanismo**: telefone, código no
> WhatsApp e CNPJ.


## Dados que hoje não têm onde ser preenchidos

| Item | Situação |
|---|---|
| Prazo de pagamento do cliente | Usado no vencimento calculado do Relatório e da cobrança. **Resolvido** — entra no cadastro de cliente (7d) e aparece no perfil. |
| Telefone do cliente | Usado por "Cobrar no WhatsApp" em Cobranças e no perfil. **Resolvido** — entra no cadastro, segundo campo, antes até do documento. |
| Dados da empresa e Pix | Usados no cabeçalho e no rodapé do A4. **Resolvido** — Conta da empresa. |
| Endereço padrão do pátio | Pré-preenche a origem no lançamento. **Resolvido** — Configurações › Operação. |
| Numeração do relatório | O A4 mostra "Nº 0142". **Resolvido** — Configurações › Operação. |
| Distância entre municípios | Pré-preenche o KM quando origem e destino são reconhecidos. Hoje é uma tabela fixa de 20 municípios do Ceará e vizinhos. **Em aberto** — de onde vem essa tabela em produção (base própria, API de rotas) não foi decidido. |

---

## Regras de navegação

- A **barra** é global: aparece em toda tela de nível 1 e continua visível nas telas de detalhe. Flutua sobre o conteúdo — é a única coisa que flutua.
- O **(+)** abre Lançar frete de qualquer lugar. Não existe botão flutuante separado de novo frete.
- Nenhuma tela de nível 1 tem ação principal própria. Só detalhes e formulários têm.
- Todo conteúdo rolável termina com folga suficiente para o último item passar acima da barra.
- **Voltar** existe em toda tela de nível 2, no canto superior esquerdo, e leva de volta à origem.
- O **nome do cliente** em qualquer linha de frete ou de cobrança abre o perfil dele.
