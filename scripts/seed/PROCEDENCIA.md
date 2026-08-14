# Procedência de `municipios.json`

De onde veio o arquivo, como foi montado, o que ficou de fora e por quê.

**Gerado em 09/08/2026** por `scripts/seed/gerar-municipios.mjs` (movido de
`prisma/seed/` em 14/08/2026, junto da medição de município do item 3 —
`CLAUDE.md` §6), que está comitado ao lado: o método aqui descrito é
executável, não uma afirmação sobre o passado. Um comando o refaz do zero:

```
node scripts/seed/gerar-municipios.mjs
```

**Resultado desta geração: 5.570 municípios, 27 UFs.**

---

## As duas fontes, e o que cada uma decide

São duas de propósito, e nenhuma das duas serve para o que é da outra.

### 1. Coordenada da sede — arquivo geográfico

| | |
|---|---|
| **Produto** | Localidades do Brasil — 2022 |
| **Endereço** | `https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_Brasil_shp.zip` |
| **Arquivo lido** | `BR_localidades_2022.dbf` (tabela de atributos do shapefile) |
| **Publicado em** | 14/11/2025 (data do arquivo dentro do zip) |
| **Baixado em** | 09/08/2026 |
| **O que traz** | 96.163 localidades de todo tipo; **5.570** com categoria `Cidade` |

**A coordenada é a da SEDE do município, não o centro geométrico do
território.** A sede é a praça central, para onde o caminhão efetivamente vai —
o centro geométrico de um município grande cai no meio do mato, e a diferença
entre os dois vira erro de quilometragem em toda rota.

**Capital aparece duas vezes** no arquivo (uma como sede municipal, outra como
capital estadual ou federal), com a **mesma** coordenada. A geração mantém a
primeira e **para**, sem escolher no chute, se as duas divergirem — repetição
idêntica é esperada, repetição divergente é a fonte se contradizendo.

### 2. Nome e UF — API de Localidades

| | |
|---|---|
| **Endereço** | `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado` |
| **Consultada em** | 09/08/2026 |
| **O que traz** | 5.571 municípios (ver "o que ficou de fora") |

**Por que o nome não vem do arquivo geográfico:** ele é uma fotografia de 2022 e
envelhece justamente no nome. Nesta geração, uma divergência:

| Código | No arquivo geográfico | Na API (vale este) |
|---|---|---|
| 5203500 | Bom Jesus | **Bom Jesus de Goiás** |

Nome errado é município que o usuário digita e não encontra. A API é o registro
vivo, então ela vence no nome e na UF; o arquivo geográfico vence na coordenada.

---

## O cruzamento, que é conferência e não conveniência

A geração **para e não escreve arquivo nenhum** se qualquer uma destas falhar:

1. **Todo município da API tem sede no arquivo geográfico** — menos as exclusões
   nomeadas abaixo. Um código a mais aqui significa município criado depois de
   2022: alguém precisa decidir de onde vem a coordenada dele, e isso não é
   decisão de script.
2. **Toda sede do arquivo geográfico ainda existe na API.** Município extinto
   não some do histórico (`CLAUDE.md` §7) — é decisão, não conserto automático.
3. **A mesma coordenada nas duas aparições da capital.**
4. **Cada registro passa na conferência de sanidade:** código inteiro plausível,
   nome não vazio, UF com duas letras, coordenada numérica, **não zerada** e
   dentro dos limites do Brasil (latitude −34 a 6, longitude −74 a −32).
5. **27 UFs.** Menos que isso é arquivo incompleto.

A mesma conferência é refeita pela seed antes de gravar
(`scripts/seed/municipios.mts`). É repetição de propósito: uma trava vale mais
nos dois lados do arquivo do que confiando que o outro lado conferiu.

---

## O que ficou de fora, e por quê

**Fernando de Noronha (código 2605459).** Aparece na API e **não tem sede** no
arquivo geográfico — o IBGE o classifica como **distrito estadual, não
município**. É por isso que a conta oficial do país é 5.570 e a API devolve
5.571. É ilha, sem ligação rodoviária, e nenhum caminhão chega lá.

Está declarado como exceção **nomeada** dentro do gerador: qualquer *outro*
código sem sede interrompe a geração. Exceção que vale para um código conhecido
é decisão; exceção que vale para "o que não bater" é buraco.

**Nada é apagado.** Se um município sumir da fonte, a seed **relata e não
remove** — arquivar é `arquivado_em` preenchido, e é decisão do fundador.

---

## Licença e uso

Dado público produzido pelo IBGE. A página de downloads do próprio instituto
declara, no topo do diretório: *"Todos os arquivos aqui disponíveis são
públicos."* O IBGE pede a **citação da fonte** no uso — atendida por este
arquivo e pela tela que exibe o dado.

Não há dado pessoal aqui: são nomes de municípios e coordenadas de sedes.

---

## Ao trocar o arquivo

**Trocar `municipios.json` é trocar este documento no mesmo commit.** A seed
confere a quantidade contra o número declarado **dentro do próprio arquivo**
(`procedencia.registros`), nunca contra 5.570 cravado no código: município novo
é criado por lei estadual, e um número fixo faria a seed **parar de carregar** no
dia em que a conta mudasse — o oposto do que ela existe para proteger.
