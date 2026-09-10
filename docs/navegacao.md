# FretiGate — mapa de navegação

Todas as telas do MVP: de onde se chega e para onde leva. ✅ desenhada · ⬜ não desenhada.

Gerado da prancheta `Mapa de navegação e Clientes.dc.html` (opção 7a). O protótipo navegável é `Protótipo FretiGate.dc.html`.

## Estrutura da barra

A barra é global: aparece em toda tela de nível 1 e continua visível nas telas de detalhe. O **(+)** abre Lançar frete de qualquer lugar. Nenhuma tela de nível 1 tem ação principal própria — só as de detalhe e de formulário têm.


## Nível 1 — destinos da barra

| Tela | Chega de | Leva para |
|---|---|---|
| Início (dashboard) ✅ | Abrir o app · barra · voltar de qualquer detalhe | Pastilha A receber → Cobranças · Pastilha Vencido → Cobranças filtrado · Pastilha Lucro → Despesas (estado vazio, item 11 não construído) · ⚠️ Pastilha Rodagem → não-tocável, sem destino ainda (pedido ao Design) · Pendência de fretes em andamento → Fretes sem filtro · Pendência de faturar → Fretes filtrado · Pendência de cobrança → Cobranças · Pendência de relatório → Relatório preenchido · Atalho Gerar relatório → Relatório · Barra → mês filtrado em Fretes · Marca da empresa → Conta da empresa, só para o dono (item 10, Tarefa 2 — resolvido; não-tocável para o operador, `/conta` exige o dono) · ⚠️ Atalho Importar fretes não nasce — corte já registrado (`docs/especificacao.md`, "O que o corte da importação deixa em tela") |
| Fretes ✅ | Barra · pendência da dashboard · barra do gráfico de 6 meses da dashboard (filtrado naquele mês) · "ver todos" do perfil do cliente | Linha → Detalhe do frete · ⚠️ Nome do cliente na linha → Perfil do cliente (não construído — medido e revertido na Tarefa 2 do item 4: o alvo de toque do nome ficava abaixo do mínimo de 48px do `CLAUDE.md` §8 dentro do cartão de 78px; ver "O que precisa chegar ao Design" em `docs/planos/item-4-lista-e-detalhe-do-frete.md`) · Deslizar → folha de recebimento · Chips → folhas de filtro |
| (+) Lançar frete ✅ | Barra, de qualquer tela · **Lançar frete para/com este cliente/caminhão/motorista** dos três perfis (item 4, Tarefa 6) — pílula em linha no perfil de cliente e caminhão, botão principal no perfil de motorista (`docs/componentes.md` linha 411) — chegando com o campo correspondente já preenchido | Salvar → Fretes com o aviso do sistema · Linha recolhida → folha de busca (cliente, caminhão, motorista, origem, destino, carga) |
| Cobranças ✅ | Barra · pastilhas e pendências da dashboard · perfil do cliente | Linha → Detalhe da cobrança (item 6, Tarefa 4) · ⚠️ Nome do cliente na linha → Perfil do cliente (não construído — mesma medida de Fretes acima, mesmo componente `LinhaDeLista`: o alvo de toque do nome não cabe junto do alvo da linha no cartão de 78px) · Cobrar no WhatsApp → conversa + cartão de retorno · Deslizar → folha de recebimento · Estado vazio → Relatório |
| Mais ✅ | Barra | Cartão de identidade → Conta, só para o dono (operador vê o mesmo cartão, sem link — `/conta` exige dono) · CADASTROS: Clientes · Caminhões · Motoristas · FERRAMENTAS: Relatório do cliente · Despesas (item 11, 01/09/2026) · Importar fretes · AJUSTES: Novidades · Configurações · Conta, também só para o dono · Sair da conta · ⚠️ seção AJUSTES nasceu no item 10, Tarefa 2 só com "Conta"; "Configurações" entrou na Tarefa 3 (01/09/2026) — "Novidades" segue de fora, tela ainda não agendada · ⚠️ "Importar fretes" segue listado aqui mas ainda não tem linha construída em Mais (`src/app/(app)/mais/page.tsx`) — lacuna pré-existente, fora do escopo do item 11 |


## Nível 2 — detalhes e fluxos

| Tela | Chega de | Leva para |
|---|---|---|
| Detalhe do frete ✅ | Linha em Fretes · histórico do perfil do cliente | Sem motorista → Escolher motorista → Editar frete · Com motorista, telefone ausente/inválido → Enviar ordem no WhatsApp abre a Folha do campo que falta → conversa · Com motorista e telefone válido → Enviar ordem no WhatsApp → conversa direto, com aviso Enviei/Ainda não ao voltar (resolvido na Tarefa 2 do item 5, 23/08/2026) · Faturar frete · Marcar recebido · Editar frete → Editar frete · Arquivar · Ver relatório → Documento |
| Editar frete ✅ | Editar frete no detalhe (item 4, Tarefa 4) | Salvar alterações → volta para o detalhe do frete · com título ativo, Cliente e valor ficam travados (sem aviso "Já recebi", que é só da criação) |
| Detalhe da cobrança ✅ | Linha em Cobranças | Marcar recebido / Receber o resto → folha de recebimento · Fretes incluídos → Detalhe do frete (item 6, Tarefa 4) · Cobrar no WhatsApp → conversa · Ver relatório → Documento · Estornar cobrança → folha de confirmação → volta para Cobranças (item 6, Tarefa 6, 27/08/2026) |
| Relatório — montagem ✅ | Atalho e pendência da dashboard · estado vazio de Cobranças · perfil do cliente · Mais | Gerar relatório → Documento A4 |
| Documento A4 ✅ | Gerar relatório · Ver relatório (frete ou cobrança) | Compartilhar no WhatsApp · Baixar PDF · Imprimir |
| Modelo de cobrança ✅ | Mais | Salvar modelo → volta para Mais |


## Mais — cadastros

| Tela | Chega de | Leva para |
|---|---|---|
| Clientes — lista ✅ | Mais · folha de busca de cliente ("ver todos") | Linha → Perfil do cliente · + Novo → Cadastro |
| Perfil do cliente ✅ | Lista de clientes | Gerar relatório → Relatório — montagem, cliente pré-selecionado (item 7, Tarefa 4, 29/08/2026) · Editar cliente → Edição · ⚠️ Cobrar no WhatsApp → conversa (não construído — escopo ainda não aberto, diferente de "Cobrar no WhatsApp" na lista/detalhe da cobrança, esse sim construído no item 6) · Frete do histórico → Detalhe do frete · Ver todos → Fretes filtrado · **Já rodado (número do resumo) → Fretes filtrado por este cliente e pelo mesmo período — caminho novo da Tarefa 6 do item 4, 22/08/2026** · **A receber / Vencido (números do resumo) → Cobranças filtrado por este cliente, sem período — caminho novo da Tarefa 7 do item 6, 27/08/2026** · Telefone tocável → conversa (resolvido na Tarefa 1 do item 5, 23/08/2026) |
| Cadastro / edição de cliente ✅ | + Novo na lista · Editar no perfil · "+ Cadastrar" na folha de busca do lançamento | Salvar → volta para a lista (ou para o perfil, na edição) · Arquivar cliente |
| Caminhões — lista e perfil ✅ | Mais · folha de busca de caminhão | Mesmo padrão de Clientes: perfil com placa, apelido, tipo, resumo de km/R$ por km no período, histórico de fretes · Lançar frete com este caminhão → Lançar frete pré-selecionado — caminho novo da Tarefa 6 do item 4, 22/08/2026 |
| Motoristas — lista, perfil, cadastro ✅ | Mais · folha de busca de motorista | Linha → Perfil · Editar no cabeçalho → Formulário · resumo de fretes/valor transportado no período, histórico de fretes (Tarefa 6 do item 4, 22/08/2026) · Telefone tocável → conversa (resolvido na Tarefa 1 do item 5, 23/08/2026) · Lançar frete com este motorista → Lançar frete pré-selecionado — caminho novo da Tarefa 6 do item 4, 22/08/2026 · Estado vazio com convite |
| Importar fretes ✅ | Mais · estado vazio de Fretes · primeiro acesso · ⚠️ não mais pelo atalho da dashboard, cortado (item 8; ver "O que o corte da importação deixa em tela" em `docs/especificacao.md`) | Colar texto ou mandar foto → processando → revisão (linha desmarcável, valor editável na hora) → resultado → Fretes. Nada reconhecido → orientação do que tentar |
| Configurações ✅ | Mais › Ajustes | OPERAÇÃO: pátio, prazo padrão, numeração do relatório — construído no item 10, Tarefa 3 (01/09/2026). **Sem seção MENSAGENS ainda** — Modelo de cobrança/Modelo de ordem de serviço não têm tela de edição construída (item 9, MVP parcial); entra quando essas telas nascerem |
| Conta da empresa ✅ | Mais › Ajustes · marca da empresa no cartão da dashboard, tocável só para o dono (item 10, Tarefa 2 — resolvido, ver linha 16) | Logo (ou iniciais), razão social, CNPJ, endereço, telefone, e-mail, Pix · prévia do cabeçalho do relatório · **Usuários** (link ativo desde o item 10, Tarefa 4, 01/09/2026) · Termos · Sair da conta. **Minha assinatura ainda sem link** — entra quando a tela de assinatura (item 13) existir; "dados bancários" ficou de fora (sem consumidor, `CLAUDE.md` §14) |
| Despesas — lista e cadastro ✅ | Mais · card de Lucro da dashboard no estado de convite | Linha → edição · + Nova → cadastro (valor e data obrigatórios, vínculo opcional a caminhão) · Estado vazio explica que o Lucro depende dela |
| Cadastro rápido — cliente ⬜ | Lançar frete › folha de busca › + Novo | Nome (obrigatório) + telefone + prazo → volta ao lançamento com o cliente já escolhido |
| Cadastro rápido — caminhão ⬜ | Lançar frete › folha de busca › + Novo | Apelido (obrigatório) + placa + tipo → volta ao lançamento |
| Cadastro rápido — motorista ⬜ | Lançar frete › folha de busca › + Novo | Nome (obrigatório) + telefone + CNH → volta ao lançamento |
| Folha do campo que falta ✅ (telefone tocável no perfil, Tarefa 1 do item 5 · telefone ausente/inválido ao Enviar ordem no detalhe do frete, Tarefa 2 do item 5, 23/08/2026 · telefone do cliente e chave Pix da empresa ao Cobrar no WhatsApp, Tarefa 5 do item 6, 27/08/2026 — a chave Pix do relatório ainda não) | Qualquer ação que precise de campo não preenchido | Um campo só → salva e **continua a ação** quando existe ação para continuar; no gatilho de perfil (Tarefa 1) só salva, sem ação de continuação; nos gatilhos de Enviar ordem e Cobrar no WhatsApp salva e segue para a conversa · Agora não cancela, com aviso do sistema dizendo o porquê — exceto na chave Pix ao cobrar, que segue sem ela |
| Formulário de caminhão ✅ | Caminhões › + Novo · perfil › Editar | Apelido + placa + tipo (chip) → volta ao perfil · Arquivar em texto no fim. Sem campo de ano |
| Modelo de ordem de serviço ✅ (tela de edição ainda não construída — item 9 é MVP parcial, `docs/especificacao.md` §9) | Configurações › Mensagens, quando essa seção existir | Chips {empresa} {origem} {destino} {carga} {caminhao} {data} — sem {valor}, sem {cliente} (decisão do fundador, Tarefa 2 do item 5, 23/08/2026: "o motorista não precisa saber para quem é"). Lista corrigida no segundo `/revisar` da mesma tarefa — a anterior citava {motorista} e {cliente}, que o texto de verdade (`src/lib/servicos/mensagens.ts`) nunca usa |
| Novidades — lista e detalhe ✅ | Mais › Ajustes · cartão FRETINEWS dispensado na dashboard | Linha → Detalhe da mensagem · no máximo uma ação por mensagem |
| Entrar ✅ | Abrir o app sem sessão · Sair da conta | **E-mail e senha** → Primeiro acesso · Criar conta · Esqueci a senha. O app nunca envia mensagem sozinho, então não há código por WhatsApp |
| Criar conta ✅ | Entrar | Nome da empresa + **e-mail** + **senha** + **seu nome** (obrigatório, distingue os dois usuários) + telefone (contato, não login) + a única pergunta de pesquisa do produto → Primeiro acesso |
| Redefinir senha ✅ | Link do e-mail de recuperação. Na demonstração, por "Abrir o link" em Recuperação enviada | Salvar senha e entrar → dashboard. Sem voltar: quem chega pelo link não tem tela anterior |
| Link expirado ✅ | Link do e-mail depois de 2 horas. Na demonstração, por "Abrir depois de 2 horas" em Recuperação enviada | Mandar link novo → Recuperação enviada · Voltar pra entrada |
| Recuperação enviada ✅ | Esqueci a senha, depois de mandar | Mandar link novo (reenviar) · Usar outro e-mail → Esqueci a senha · Voltar pra entrada |
| Esqueci a senha ✅ | Entrar | E-mail da conta → link de recuperação por e-mail |
| Usuários — lista, convite, detalhe ✅ | Conta da empresa › Usuários | COM ACESSO + CONVITE ENVIADO (aguardando, reenviar, cancelar) · Linha → Detalhe · + Convidar → nome, WhatsApp, prévia da mensagem → abre a conversa · Detalhe → Remover acesso, **só para o dono**; o acesso do dono não é removível. **É a única tela de convidar** — o estado duplicado que existia em Entrar foi removido |
| Aceitar convite ✅ | Link do WhatsApp, fora do app. Na demonstração, por "Ver o que ela recebe" no convite pendente | Marca da empresa + o que a pessoa vai poder fazer → Entrar na conta (ela cria a senha dela) · Não conheço essa empresa. Sem barra de navegação: quem abre ainda não está dentro do app |
| Termos de uso e privacidade ✅ | Criar conta · Conta da empresa | Duas abas no mesmo documento. Vindo do cadastro, termina em "Li e aceito"; vindo de Ajustes, é só leitura |
| Planos ✅ | Mais (plano gratuito) · limite do gratuito · assinatura | Anual R$ 1.164 em destaque, 12x de R$ 97,00, economia de R$ 1.200 · Mensal R$ 197 — dois eventos de naturezas diferentes em 03/09/2026, não confundir: **correção de estado** (R$ 990 nunca foi decisão, era recomendação do fundador na conversa que gerou esta tela — o valor decidido já era R$ 840, planejamento do item 13); depois, **decisão de preço do fundador**, direto no painel da Kiwify — R$ 197/R$ 1.164, o valor atual (`CLAUDE.md` §10). Avisar o Design para a próxima exportação trazer o valor certo |
| Minha assinatura ✅ | Conta da empresa | Plano, próxima cobrança, cartão, acessos · Trocar de plano → Planos |
| Limite do gratuito ✅ | Tentar cadastrar o segundo caminhão | Ver os planos → Planos · Depois → volta sem bloquear nada do que já existe. Operador vê "fale com o dono" no lugar de "Ver os planos" |
| Assinatura vencida ✅ | Cobrança recusada | Leitura e exportação seguem · dono vê o caminho de exportação por e-mail · operador vê "fale com o dono". **Sem "Atualizar o cartão"/"Baixar meus relatórios" por enquanto** — pendente de link/mecanismo, item 13 Tarefa 3 parcial (09/09/2026) |
| Primeiro acesso ✅ | Criar conta · Entrar pela primeira vez | Duas opções em pé de igualdade: Trazer os fretes que já fiz → Importar · Começar do zero → Lançar frete |
| Guia de progresso ✅ | Topo da dashboard, depois do primeiro acesso | No máximo 3 itens · cada um sai ao ser cumprido · o bloco desaparece ao completar |


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

- **Folha de campo faltante** não é tela: é sobreposição sobre a tela em que a pessoa já está. Não entra no mapa como destino, e o botão do sistema volta para a mesma tela. Dispara em Cobranças (cobrar sem telefone), detalhe do frete (enviar ordem sem telefone do motorista), Relatório (gerar com cobrança sem chave Pix da empresa) e perfil do cliente (tocar em campo vazio). **Telefone tocável no perfil do cliente e do motorista** (`FolhaDeTelefone`, Tarefa 1 do item 5, 23/08/2026) é o primeiro gatilho de verdade construído: telefone ausente ou salvo mas inválido abre a folha em vez de navegar ao formulário; válido vira link de verdade para o WhatsApp.
- A **barra** é global: aparece em toda tela de nível 1 e continua visível nas telas de detalhe. Flutua sobre o conteúdo — é a única coisa que flutua.
- O **(+)** abre Lançar frete de qualquer lugar. Não existe botão flutuante separado de novo frete.
- Nenhuma tela de nível 1 tem ação principal própria. Só detalhes e formulários têm.
- Todo conteúdo rolável termina com folga suficiente para o último item passar acima da barra.
- **Voltar** existe em toda tela de nível 2, no canto superior esquerdo, e leva de volta à origem.
- ~~O nome do cliente em qualquer linha de frete ou de cobrança abre o perfil dele~~ — **medido e revertido em Fretes** (item 4): o alvo de toque do nome fica abaixo de 48px dentro do cartão de 78px de `LinhaDeLista`, e dois alvos de toque nesse espaço faz o dedo errar. **Cobranças (item 6, Tarefa 4) decidiu sem remedir** — é o mesmo componente `LinhaDeLista`, com o mesmo cartão de 78px, então a conclusão de Fretes vale sem precisar de nova medição; a linha nunca chegou a ter esse link para reverter. Ver as linhas ⚠️ de Fretes e Cobranças, acima. O caminho para o perfil do cliente continua existindo por Mais → Clientes.
