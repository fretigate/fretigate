# CLAUDE.md — FretiGate

Lido automaticamente em toda sessão. É a fonte de verdade das decisões do
projeto. Se algo aqui conflitar com o que eu pedir no chat, me avise antes de
executar.

Versão de 06/08/2026. Substitui a anterior por inteiro.

---

## 1. O que é o FretiGate

SaaS de gestão para transportadoras de carga pequenas (4 a 10 veículos) no
Brasil. Venda 100% autoatendida, por tráfego pago direto ao checkout, sem
demonstração e sem vendedor.

**A dor:** o dono manda a ordem ao motorista pelo WhatsApp, o motorista executa
e responde com foto, e só dias depois ele senta e reconstrói tudo para lançar no
sistema. No caso real que originou o produto, ele paga mais de R$ 200/mês e
tinha 8 fretes do mês sem lançar.

**A tese do produto:** o frete nasce **no momento da ordem**, não depois da
execução. Se o registro existe quando ele já sabe tudo — cliente, carga, rota,
motorista e valor — o trabalho de reconstrução desaparece.

**A métrica que manda em tudo:**

> Lançar um frete, do celular, em **até 30 segundos**.

Qualquer decisão técnica ou de interface que aumente esse tempo está errada,
por mais elegante que seja.

---

## 2. Padrão de trabalho

Sou fundador e CEO. Eu decido e defino o produto. **Eu não escrevo código —
você escreve.** O padrão é o meu.

- Escolha técnica é a melhor disponível, não a padrão nem a popular.
- Toda decisão de arquitetura tem uma razão. "Geralmente se faz assim" não é razão.
- Segurança desde o primeiro commit.
- Performance é restrição de design, não etapa posterior.
- Se auditassem esse código para comprar a empresa, não teria nada para ter vergonha.

### Como executar

1. **Plano antes de código, sempre.** Descreva o que vai mexer e espere aprovação.
2. **Uma tarefa por vez.** Termine, teste, commite. Depois a próxima.
3. **Commit a cada tarefa que funciona.** Mensagem descritiva, em português.
4. **Não refatore o que não faz parte da tarefa.** Aponte e siga.
5. **Não invente decisão de produto.** Procure em `docs/`. Se não estiver lá,
   **pergunte**. Não escolha o mais provável.
6. **Nunca reescreva um arquivo inteiro** quando a mudança é pontual.

### Como me explicar as coisas

Não sou desenvolvedor. Traduza termo técnico. Ao propor algo, diga em uma frase
o que muda **para o usuário** ou **para o negócio**.

---

## 3. Regra inviolável: isolamento entre empresas

Todas as transportadoras dividem o mesmo banco. Se a empresa A enxergar um
registro da empresa B, o produto acaba — o setor é competitivo e a notícia corre.

- Toda tabela de domínio tem `empresa_id`. Sem exceção.
- **Nenhuma consulta ao banco sem filtro por `empresa_id`.**
- O filtro é aplicado na camada de acesso a dados, não em cada tela.
  Tem que ser **impossível esquecer**.
- `empresa_id` vem sempre da sessão autenticada no servidor. **Nunca** de URL,
  formulário, header ou body.
- Toda rota de API valida sessão antes de qualquer leitura ou escrita.
- Tabela ou endpoint novo já nasce com isolamento, no mesmo commit.

Na dúvida sobre como garantir isso num caso específico: **pare e pergunte**.

---

## 4. Segurança — baseline obrigatório

- Nenhum segredo no código ou no repositório. Só em variáveis de ambiente.
- Toda entrada validada no **servidor**, com schema.
- Senha com hash forte. Nunca reversível, nunca em log.
- Rate limit em login, recuperação de senha e toda rota que gere custo
  (importação com IA, geração de PDF, cálculo de distância).
- Log nunca contém dado pessoal, senha, token ou conteúdo de mensagem.
- Backup do banco configurado antes do primeiro cliente pagante.

### Upload de imagem (comprovante e logo)

O risco não é vírus — é arquivo que o navegador executa.

- **Reprocessar toda imagem no servidor**, gravando de novo em JPEG. Essa é a
  defesa principal: destrói qualquer conteúdo embutido no arquivo original.
- Aceitar **apenas JPEG, PNG, WEBP e HEIC**. HEIC é obrigatório: é o padrão do
  iPhone. **Nunca SVG** — é o único formato de imagem que executa script.
- **Validar pelo conteúdo do arquivo**, nunca pela extensão ou pelo tipo
  declarado pelo cliente.
- Rejeitar acima de **10 MB** e acima de um limite de dimensão **antes de abrir
  o arquivo** — imagem pequena pode expandir para gigabytes na memória.
- **Comprimir**: maior lado em 1600px, alvo de ~300 KB.
- **Remover metadados EXIF.** Isso é privacidade, não só segurança: foto de
  celular carrega coordenada de GPS do motorista.
- Nome de arquivo aleatório, nunca o do usuário.
- Guardar fora da pasta pública, servir por URL assinada com expiração, e com
  tipo de conteúdo fixo — nunca derivado do arquivo.

### Dados enviados a serviço de IA

A importação envia conteúdo de conversa de WhatsApp de terceiros para fora.
O fornecedor não pode treinar modelo com esse conteúdo, e isso precisa estar
declarado na política de privacidade junto com o nome do subprocessador.

---

## 5. Stack — fixado

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Banco | PostgreSQL |
| Acesso a dados | Prisma |
| Autenticação | Better Auth |
| Estilo | Tailwind |
| Hospedagem | Vercel |
| Arquivos | storage do provedor do banco, com URL assinada |

Se achar que alguma escolha está errada para o caso, **argumente antes**, não
troque no meio da tarefa.

---

## 6. Estrutura de pastas

```
/app
  /(auth)               login, cadastro, recuperação, aceitar convite
  /(app)                área logada
  /api                  endpoints
/lib
  /db                   cliente do banco + filtro de empresa
  /auth                 sessão e permissão
  /servicos             regras de negócio, por domínio
  /documentos           gerador de PDF (ver §9)
  /importacao           extração por IA, isolada do resto
  /utils
/components
  /ui                   componentes base — fonte única de verdade
  /<dominio>            componentes específicos
/prisma
/docs                   especificação, navegação, estilo, componentes, ícones
```

- Regra de negócio mora em `/lib/servicos`, nunca dentro de componente de tela.
- **Nada de arquivo "para depois".** Sem abstração especulativa, sem camada sem
  dois casos de uso reais.
- Se um arquivo passa de ~200 linhas ou junta coisas sem relação, separe.

---

## 7. Convenções

- **Domínio em português** (`Servico`, `Cliente`, `Veiculo`, `TituloReceber`).
  Preciso conseguir ler o schema.
- Código e variáveis internas em inglês. Sem acento em arquivo, tabela ou campo.
- Dinheiro em **centavos, inteiro**. Nunca decimal flutuante.
- Distância em **metros, inteiro**.
- Data e hora em UTC. Exibidas no fuso de Fortaleza.
- Toda tabela tem `criado_em` e `atualizado_em`.
- **Nada é apagado.** Exclusão é `arquivado_em` preenchido.

---

## 8. Regras de interface

Vieram de defeitos reais encontrados nos protótipos. São obrigatórias.

- **Componente existe uma vez.** Botão, linha de lista, campo e chip vivem em
  `/components/ui` e são reutilizados. **Proibido copiar componente.**
- **Nenhum valor fora do sistema.** Cor, altura, raio, tamanho e peso de fonte
  saem de `docs/estilo.md`. Se precisar de valor novo, **pergunte**.
- **Nenhum botão fora do inventário** de `docs/componentes.md`. Uma ação
  principal por tela. Uma ação, um nome, em todo lugar.
- **Nenhum texto vaza do seu campo.** Quebra em duas linhas ou corta com
  reticências, com a altura crescendo.
- **Nada encolhe para caber conteúdo.** A tela rola ou recolhe — nunca comprime
  altura definida.
- **Só a barra de navegação flutua.** Bloco de ações fica dentro do fluxo
  rolável, depois do resumo e antes de listas. Formulário tem o salvar no fim,
  rolando junto. Teclado numérico é sobreposição, nunca ocupa lugar no fluxo.
- **Toda tela rolável reserva folga no fim** para nada ficar sob a barra,
  medida a partir do topo do (+), que sobe acima da linha da barra.
- **Área segura** = a do dispositivo + 8px. Nenhum conteúdo sob a barra de
  status ou a ilha dinâmica.
- **Três superfícies, três significados** — nunca compartilham tratamento:
  clara = dado do usuário · escura = mensagem do sistema · lilás = comunicação
  da plataforma com o usuário (novidades, ofertas).
- **Estado carregando obrigatório** em todo botão que chama o servidor, com
  toque repetido ignorado. Sem isso, frete e cobrança duplicam.
- **Estado vazio é convite para agir**, nunca ilustração decorativa.
- **Número incompleto não é exibido.** Lucro sem despesa lançada e R$/km sem km
  preenchido mostram convite, não valor. Com dado parcial, exibir a cobertura.
- Alvo de toque mínimo 48px. Ação principal ao alcance do polegar.
- Interface clara, não escura — o app é usado no pátio, sob sol forte.
- Vocabulário do usuário: frete, cliente, caminhão, motorista, **relatório**.
  Nunca "registro", "entidade", "item", "transação", "extrato".

---

## 9. Decisões de arquitetura já tomadas

**Situação financeira é derivada, nunca armazenada.** Não existe campo
`faturado` ou `quitado` no frete. A situação sai dos títulos a receber. Se
alguém sugerir um campo desnormalizado "para consultar mais rápido", **recuse** —
duas fontes de verdade divergem e o cliente vê frete quitado com boleto aberto.

**`Servico`, não `Frete`.** A entidade central tem `tipo_operacao`, para
comportar guincho e reboque depois sem reescrever nada. Na interface do MVP
aparece como "Frete", porque é o único tipo ativo.

**Título a receber é entidade própria**, não flag no frete. Um frete pode gerar
mais de um título (adiantamento e saldo).

**Gerador de documento é genérico.** Recebe o tipo e os dados, com cabeçalho da
empresa fixo e corpo variando. Não escreva um gerador só para o relatório —
recibo, romaneio e proposta virão depois.

**Município é tabela, não texto.** Origem e destino guardam referência ao
município (base do IBGE, ~5.570 registros fixos no próprio banco) **e** o texto
original. Sem isso não existe comparação de rota entre empresas.

**Distância é calculada uma vez por par de municípios e guardada.** Nunca por
frete. Transportadora repete rota, então o cache resolve quase tudo depois das
primeiras semanas.

**Extração por IA é isolada em `/lib/importacao`.** Trocar de fornecedor tem que
ser trocar uma peça. O modelo ainda não está decidido (ver §13).

**Integração fiscal isolada**, quando entrar.

---

## 10. Preço, planos e limites

- **Plano único**, R$ 149/mês ou R$ 840/ano.
- **Acesso gratuito permanente**, limitado a **1 caminhão**.

| Limite | Gratuito | Pago |
|---|---|---|
| Caminhões | 1 | 5 |
| Usuários | 1 | 3 |
| Importações | 5 no total | 30 por mês |
| Clientes, fretes, motoristas, relatórios | ilimitado | ilimitado |
| Armazenamento | 2 GB por empresa (trava anti-abuso, não degrau de plano) |

Além da contagem, **limitar o tamanho de cada importação** — o custo vem do
tamanho do texto, não da quantidade de importações. Avisar na tela para colar
por partes quando exceder.

Cobrança por checkout de terceiro. **Não construir checkout próprio.**
Assinatura vencida bloqueia escrita, mantém leitura e exportação por 90 dias.

---

## 11. Dados e LGPD

- No cadastro, **uma única pergunta declarada**: "como você conheceu o
  FretiGate?" — com atribuição de origem por primeiro toque. Nenhum outro campo
  de pesquisa em nenhum lugar do produto.
- Todo o resto do conhecimento sobre o usuário vem do uso, não de formulário.
- Os dados dos clientes e motoristas da transportadora **são de terceiros**: a
  empresa é controladora, o FretiGate é operador. Uso próprio só de forma
  **agregada e anonimizada**, com isso declarado nos termos **desde o primeiro
  usuário** — não dá para pedir autorização retroativa.
- Termos e política de privacidade precisam existir antes do primeiro cliente e
  declarar os subprocessadores, incluindo o fornecedor de IA.

---

## 12. O que NÃO construir

Mesmo que pareça óbvio, mesmo que seja rápido. Se eu pedir, me lembre que está
fora do escopo antes de fazer.

- Emissão fiscal (CT-e, MDF-e, NF-e)
- Checkout próprio
- Entrada de dados por voz
- Acesso do motorista ao sistema: login, app ou upload de foto pelo motorista
- Envio automático de mensagem por API de WhatsApp
- Rastreamento por GPS
- Portal ou checkout para o cliente final da transportadora
- Antecipação de recebível
- Telemetria, manutenção, combustível, controle de pneu
- Tabela de preço por quilômetro e cálculo automático de valor do frete
- Importação de extrato bancário
- Seleção múltipla e ações em lote nas listas
- Recibo de pagamento
- Agendamento com calendário e calculadora de orçamento
- Filtro de data na dashboard
- Telas de desktop
- Multi-idioma, multi-moeda, tema configurável
- Qualquer tela específica de guincho ou reboque

O `tipo_operacao` existe no modelo de dados desde já, mas o **MVP entrega só a
experiência de transportadora de carga**.

---

## 13. Documentos do projeto

| Arquivo | O que tem |
|---|---|
| `docs/especificacao.md` | Entidades, campos, estados, regras de negócio, ordem de construção |
| `docs/navegacao.md` | Mapa de telas: de onde se chega, para onde leva |
| `docs/estilo.md` | Cores, tipografia, espaçamento, formas, alturas, seção Impresso |
| `docs/componentes.md` | Inventário fechado de botões e avisos, e onde cada tela usa o quê |
| `docs/icones/` | SVGs, um por ícone |

A paleta azul da primeira versão da Tela 1 foi descartada. Se aparecer qualquer
arquivo com `#2B62E8` como cor de ação, é resíduo — ignore.

---

## 14. Decisões ainda em aberto

Não invente resposta. Pergunte.

- **Modelo de IA da importação** — testar a extração com o material real do
  usuário antes de escolher. Decidir por acerto, não por preço: a diferença de
  custo entre os candidatos é inferior a 2% da receita por cliente.
- Gateway de pagamento
- Revisão do valor do plano anual — R$ 840 dá 53% de desconto sobre o mensal, o
  que pode sinalizar que o mensal é inflado. Recomendação em aberto: R$ 990.
- Valor à vista no Pix do plano anual
- Percentual e regra de comissão do afiliado
- Política de desconto
