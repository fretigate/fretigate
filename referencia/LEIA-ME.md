# referencia/ — material de consulta

**Nada aqui roda.** Não é código do produto, não é compilado, não vai para o ar
e não é importado por nenhum arquivo de `src/`. É material para olhar e copiar
valor de dentro, com a mão.

O código do FretiGate vive inteiro em `src/`. A configuração vive na raiz.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `marca/` | Os arquivos da marca — a **origem**, não o que o app carrega. Os `.psd` são o arquivo de trabalho e ficam fora do controle de versão. `_old/` é a marca antiga, também fora. |
| `Design/Manual de Marca/` | As pranchas do manual, em imagem. |
| `Design/Marca nas telas de autenticacao.html` | O documento que definiu a marca no topo das telas de fora de sessão (14/08/2026). É a **origem dos 140px**, e traz o próprio aviso do Design de que os valores são aproximação não confirmada. É um bundle de 380 KB, do tipo que o `.gitignore` normalmente ignora — fica versionado porque, ao contrário dos bundles do protótipo, **não existe fonte mais leve dele**: a política ali é "versiona o fonte, ignora o gerado", e aqui o bundle é o fonte. Sai quando o Design confirmar os valores. |
| `Design/Protótipo clicável de fretes/` | O protótipo que originou o produto. Cada tela é um `.dc.html`. |

## Por que continua no repositório

Porque as decisões de interface saíram daqui, e conferir o protótipo é mais
rápido e mais confiável do que lembrar. O protótipo é a origem de
`docs/estilo.md` e de `docs/componentes.md`.

## O que NÃO fazer com isso

- **Não corrija os protótipos.** O JSX e o JS deles são de ferramenta de
  design, com React global e `ReactDOM.render`. Estão errados para um projeto
  Next.js e estão certos para o que são. O `eslint.config.mjs` ignora esta
  pasta inteira de propósito.
- **Não copie código daqui para `src/`.** O que atravessa é o valor — a cor, a
  altura, o raio — e ele atravessa por `docs/estilo.md`, que é a fonte única de
  verdade (`CLAUDE.md` §8).
- **Não trate isto como especificação.** A especificação está em `docs/`. Onde
  os dois divergirem, `docs/` manda e o protótipo é resíduo.

## A marca é a única coisa daqui que tem cópia no produto

`public/marca/fretigate.png` é cópia de `marca/LOGOMARCA colorida sem
fundo.png`, feita em 14/08/2026 para a marca no topo das telas de fora de
sessão. **Cópia, e não import daqui**, justamente para a primeira frase deste
arquivo continuar verdadeira: nada desta pasta é importado por `src/`, e
`referencia/` não é dependência de build.

O preço disso é que as duas podem divergir: **trocar a marca é trocar as
duas**, esta e a de `public/`. Editar só esta não muda tela nenhuma.
