# Auditoria de segurança — Tarefa 4: varredura de segredo vira mecanismo na esteira

Plano da tarefa 4 de quatro, saídas da auditoria de 15/08/2026. Escrito antes
de qualquer linha de código, conforme `CLAUDE.md` §2.

---

## 1. O defeito, em uma frase

Hoje, não commitar senha de banco ou chave de API depende de alguém lembrar de
olhar antes do commit — disciplina, não mecanismo. Nada na esteira confere.

---

## 2. A ferramenta, e por que não as outras

Três caminhos considerados antes de escolher:

- **GitHub Advanced Security** (varredura nativa do GitHub) — pago para
  repositório privado. Descartado.
- **`gitleaks-action`** (o pacote pronto, mantido pelos próprios autores do
  gitleaks) — descartado: amarra a esteira ao comportamento e à política de
  licenciamento de uma Action de terceiro, fora do nosso controle.
- **gitleaks, binário próprio** — escolhido. Baixado direto do GitHub Releases,
  versão fixa (**8.30.1**, não "latest" — a mesma razão de fixar
  `node-version: 24`: reprodutível, sem trocar de comportamento sozinho), com o
  checksum SHA-256 conferido contra o arquivo `_checksums.txt` publicado pelo
  próprio projeto antes de executar qualquer coisa que ele contenha.

---

## 3. O achado medido que mudou o desenho

Antes de aceitar a configuração padrão do gitleaks, testei contra o formato
exato do segredo mais sensível deste projeto: a URL de conexão do banco
(`DATABASE_URL` / `DIRECT_URL` / `AUTH_DATABASE_URL`, as três que o `CLAUDE.md`
§5 trata como apontando para banco de verdade).

**A configuração padrão não pega isso.** Testes feitos num repositório
descartável, comparando os dois casos:

| Caso plantado | Config padrão do gitleaks |
|---|---|
| `BETTER_AUTH_SECRET=8f3ac9e21b4d7c6a...` (chave solta, alta entropia) | **Pega** — regra `generic-api-key` |
| `AUTH_DATABASE_URL="postgres://usuario:xK9mQ2vP7wZ4nR8t...@host:5432/postgres"` (senha real embutida na URL) | **Não pega** — nenhuma regra padrão cobre `protocolo://usuario:senha@host`, só formatos específicos de fornecedor (Slack, GitHub, AWS etc.) |

A regra padrão exige que o valor apareça como token isolado (`chave = "valor"`);
uma URL de conexão tem `:`, `/`, `@` no meio, e isso já basta para escapar da
regra genérica.

**Correção: uma regra própria**, em `.gitleaks.toml` na raiz do repositório
(caminho que o gitleaks lê sozinho, sem precisar de flag na esteira), somada à
configuração padrão (`useDefault = true`, mantém as regras de fornecedor
específicas ligadas). A regra cobre qualquer `protocolo://usuario:senha@host` —
não só `postgres://`, para não precisar de outra rodada de auditoria no dia em
que entrar Redis ou outro serviço com string de conexão parecida.

---

## 4. A exceção de placeholder — texto exato, nunca padrão

`docs/diario.md` e `tests/guarda-de-banco.test.ts` já escrevem exemplo de URL
de conexão com a palavra `senha`/`SENHA` no lugar da senha, como placeholder —
varri o histórico real (80 commits) com a regra da seção 3 e são as quatro
únicas ocorrências que disparariam sem uma exceção.

**A exceção não pode ser "contém a palavra senha".** Isso abriria buraco: uma
senha real que por acaso contivesse esse texto por dentro (`xSenhaZ9mQ2vP...`)
passaria despercebida — o próprio problema que a tarefa existe para fechar,
só que escondido atrás da exceção em vez de atrás da falta de regra.

A exceção certa é **por igualdade exata do campo inteiro da senha**, nunca por
conter a palavra em algum lugar. A regra em `.gitleaks.toml` captura o trecho
entre `:` e `@` como o campo da senha; o `allowlist` da regra compara esse
campo contra uma lista fechada de literais (`senha`, `SENHA`, `sua-senha`,
`SUA-SENHA`, `password`, `PASSWORD`) — só passa se o campo inteiro for
**exatamente** um desses textos, do primeiro ao último caractere, nunca se
contiver um deles.

**Medido, os dois lados do contraste**, no mesmo repositório descartável:

| Caso plantado | Campo da senha | Resultado |
|---|---|---|
| `postgres://postgres:senha@host/db` | `senha` (igual, exato) | Isento — é o placeholder de verdade |
| `postgres://postgres:xSenhaZ9mQ2vP7wZ4nR8tL3jH6yF1cB5@host/db` | `xSenhaZ9mQ2vP7wZ4nR8tL3jH6yF1cB5` (contém "Senha", não é igual) | **Reprova** — é o disfarce que a exceção por conteúdo abriria, e esta não abre |

A lista de literais fica escrita no próprio `.gitleaks.toml`, com comentário
apontando para este parágrafo — a mesma forma de exceção fechada que o
`CLAUDE.md` já usa em outros lugares (§3, tabela de referência global; §6,
`comoDono`): lista pequena, exata, e quem quiser adicionar um literal novo
sabe que está alterando uma trava de segurança, não só documentação.

---

## 5. Falha de infraestrutura reprova, nunca passa em silêncio

O pedido do fundador: se o download do gitleaks falhar, a esteira **para**,
não segue em frente sem ter varrido nada. É a mesma classe de defeito que o
`CLAUDE.md` §3 já registra sobre teste de isolamento — "teste que não distingue
'passou' de 'não rodou' é pior que teste nenhum, porque dá confiança falsa".

Três pontos que, sem cuidado, deixariam isso acontecer, e a defesa de cada um:

1. **`curl` sem `-f` não falha em erro HTTP.** Por padrão, se o GitHub
   devolvesse um 404 ou 403 (arquivo movido, rate limit, etc.), `curl -sSLO`
   grava o corpo do erro no arquivo e **sai com código 0** — "sucesso" do
   ponto de vista do shell, embora o arquivo baixado seja lixo. A flag `-f`
   ("fail") faz o curl sair com erro nesse caso. As duas chamadas de `curl`
   (o binário e o `_checksums.txt`) levam `-f`.
2. **O passo inteiro roda com `set -euo pipefail` explícito**, no topo do
   bloco `run:` — não por confiar no padrão do executor da esteira (que já é
   `bash -eo pipefail` no Linux, mas isso não fica escrito em lugar nenhum do
   `ci.yml`), e sim pelo mesmo motivo do `WITH CHECK` explícito do `CLAUDE.md`
   §9: a garantia certa é a que está escrita, não a que se supõe que o
   ambiente já dá de graça. Com isso, qualquer comando do bloco que falhe —
   `curl`, `sha256sum -c`, `tar` — interrompe o passo na hora, e o passo
   falhando falha o job inteiro.
3. **O checksum é conferido antes de extrair ou executar qualquer coisa**
   (`sha256sum --ignore-missing -c gitleaks_8.30.1_checksums.txt`, medido:
   `--ignore-missing` é necessário porque só baixamos o arquivo Linux, não os
   dez pacotes de todas as plataformas que o `_checksums.txt` lista). Download
   incompleto, corrompido ou adulterado — de qualquer causa, não só ataque —
   reprova aqui, antes de rodar um binário não conferido.

Resultado: download com problema = passo vermelho = esteira para. Não existe
caminho em que "não consegui baixar a ferramenta" vire "varredura aprovada".

---

## 6. Custo do histórico inteiro, e quando reavaliar

A varredura roda contra o **histórico git inteiro** a cada execução da
esteira — não só o que mudou no push atual. Mais simples e mais completo que
calcular o intervalo exato de commits novos (sem caso especial para primeiro
push de uma branch, force-push, squash), e o custo, medido, não suposto:

> 80 commits, ~3,9 MB de conteúdo versionado, escaneados em **0,75 a 1,03
> segundos**.

Isso exige `fetch-depth: 0` no passo de checkout do `ci.yml` — o padrão do
GitHub Actions é profundidade 1 (só o commit mais recente), o que deixaria o
gitleaks enxergar um único commit por execução, não o histórico.

**Quando reavaliar:** o número de commits só cresce, e o custo de escanear
tudo cresce junto. Não é uma decisão para tomar agora, por antecipação — seguindo
o mesmo padrão do `CLAUDE.md` §9 sobre a distância geodésica ("só quando a
imprecisão aparecer no uso real"). O sinal para revisitar é a esteira ficar
sensivelmente mais lenta **por causa deste passo especificamente** (visível no
tempo de cada passo no log do GitHub Actions), não um número de commits
escolhido de antemão. Quando acontecer, a troca é para escanear só o
intervalo de commits do push/PR atual (`git log` com o intervalo do evento),
não para abandonar o histórico completo como verificação periódica.

---

## 7. Onde entra na esteira, e a saída no log

Dois passos novos em `.github/workflows/ci.yml`, logo após o checkout — antes
de `setup-node`/`npm ci`, porque a varredura não depende de nenhuma
dependência instalada, e um segredo encontrado torna o resto da esteira sem
sentido:

1. **Baixar e conferir o gitleaks** — os dois `curl -f`, o `sha256sum -c`, o
   `tar` de extração, `chmod +x`. Tudo com `set -euo pipefail` (§5).
2. **Varredura de segredo** — `./gitleaks detect --source . --redact`.
   `--redact` garante que, se um segredo de verdade for encontrado, o valor
   **nunca aparece em texto puro no log da esteira** — só arquivo, linha e
   commit. O log da esteira é mais duradouro e mais visível que o próprio
   repositório; imprimir o segredo ali seria trocar um vazamento por outro.

O passo de checkout ganha `fetch-depth: 0` (§6).

---

## 8. O que este plano NÃO faz

- Não mexe no histórico do git. Se algum dia a varredura achar um segredo real
  já commitado, a resposta (rotacionar a credencial, e decidir se vale reescrever
  histórico) é decisão do fundador na hora — este mecanismo só garante que
  ninguém deixa de notar.
- Não vira hook de pre-commit local. O pedido da auditoria foi "varredura de
  segredo na esteira" — escopo é CI, não a máquina de quem programa.
- Não toca nas tarefas 1, 2 e 3 da auditoria, já concluídas.

---

## 9. Arquivos que a tarefa toca

| Arquivo | O que muda |
|---|---|
| `.github/workflows/ci.yml` | `fetch-depth: 0` no checkout; dois passos novos (baixar+conferir, varrer) |
| `.gitleaks.toml` (novo) | configuração padrão ligada + regra própria de URL com credencial + exceção fechada de placeholder |
| `CLAUDE.md` §4 | registra o mecanismo e o achado da seção 3 |
| `docs/diario.md` | entrada da tarefa, apontando para este plano (§2) |

Nenhuma migration. Nenhuma decisão de tela.

---

## 10. Como eu sei que terminou

1. `.gitleaks.toml` existe, com a regra de URL-com-credencial e a lista fechada
   de placeholder (§4).
2. Os dois passos novos existem no `ci.yml`, na ordem certa, com `-f` nos dois
   `curl`, `set -euo pipefail` e checksum conferido antes de qualquer execução
   (§5).
3. `fetch-depth: 0` no checkout.
4. Rodado contra o repositório real: sem alarme falso nas quatro ocorrências
   de placeholder já existentes, e as demais regras (padrão + própria)
   continuam ativas.
5. O contraste dos dois lados da exceção (§4) fica reproduzido e registrado no
   diário: placeholder exato passa, disfarce com o texto embutido reprova.
6. Push real na esteira (branch de teste) confirmando que o passo roda e passa
   verde no repositório de verdade — não só localmente.
7. `/revisar` rodado, achados trazidos item a item, e commit só depois da sua
   aprovação.
