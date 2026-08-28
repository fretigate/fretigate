# Procedência das fontes auto-hospedadas

De onde vieram os três arquivos desta pasta, por que existem, e como refazer
o download — mesmo padrão de `scripts/seed/PROCEDENCIA.md`.

**Baixados em 28/08/2026**, item 7 Tarefa 2 (`docs/planos/item-7-relatorio.md`).
O gerador de PDF (`src/lib/documentos/gerador.ts`) roda dentro de um
Chromium isolado (Puppeteer), sem acesso à internet no momento da geração —
carregar fonte por `<link>` do Google Fonts, como o resto do app faz via
`next/font/google`, faria a geração depender da rede estar de pé
(`docs/planos/item-7-relatorio.md`, "A medição que veio antes deste plano").

## Os três arquivos

| Arquivo | Fonte | Endereço original |
|---|---|---|
| `archivo-variavel.woff2` | Archivo, variável (`wght` 100–900, `wdth` 62,5–125%), subconjunto **latin** | `https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLg.woff2` |
| `azeret-mono-variavel.woff2` | Azeret Mono, variável (`wght` 100–900), subconjunto **latin** | `https://fonts.gstatic.com/s/azeretmono/v21/3XFuErsiyJsY9O_Gepph-HHhZfk.woff2` |
| `inter-simbolos.woff2` | Inter, só os glifos U+2192 e U+2713 (ver abaixo) | subconjunto próprio, gerado a partir de `https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf` |

O subconjunto **latin** (não **latin-ext**, não **vietnamese**) cobre
`U+0000-00FF` mais pontuação geral (`U+2000-206F`) — todo acento do
português (ã, õ, ç, á, é...), `º`, `·`, `–`, `—`, `…` e `›` estão dentro
dele. Medido arquivo a arquivo com `fontTools`, não suposto.

## O achado real, e por que existe um terceiro arquivo

A medição do plano encontrou, testando os glifos que o código usa de
verdade: **o arquivo do Archivo não contém `→` (U+2192, usado por
`formatarRota`) nem `✓` (U+2713, usado só em rótulo de botão, fora do
relatório).** Não é ausência do subconjunto — é ausência do **glifo no
arquivo da fonte**, medido com `fontTools.ttLib`:

```python
from fontTools.ttLib import TTFont
f = TTFont('archivo-variavel.woff2')
cmap = f.getBestCmap()
0x2192 in cmap  # False
0x2713 in cmap  # False
```

O mesmo teste no Azeret Mono, no Roboto e no Noto Sans (candidatos óbvios de
fallback) também deu `False` para pelo menos um dos dois. **Inter tem os
dois** — único candidato testado que cobre ambos no mesmo arquivo:

```python
TTFont('inter.ttf').getBestCmap()  # 0x2192 → True, 0x2713 → True
```

`inter-simbolos.woff2` é Inter **subconjuntado para exatamente esses dois
códigos de caractere** — não a fonte inteira. Gerado com:

```
python3 -m fontTools.subset inter.ttf --unicodes=2192,2713 \
  --output-file=inter-simbolos.woff2 --flavor=woff2 --no-hinting \
  --desubroutinize --layout-features=''
```

(resultado: 736 bytes). O CSS do gerador (`gerador.ts`) declara uma segunda
face para a família `"Archivo"`, com `unicode-range: U+2192, U+2713`
apontando para este arquivo — o navegador (e o Chromium do Puppeteer)
escolhe a face certa por código de caractere automaticamente; o resto do
texto continua na face do Archivo de verdade.

## Licença

As três fontes são **SIL Open Font License 1.1** (Archivo, Azeret Mono e
Inter, todas distribuídas pelo Google Fonts sob essa licença) — permite uso
comercial, modificação (inclusive subconjuntar, como feito acima) e
redistribuição embutida em documento gerado, sem royalty. Nenhuma exige
atribuição visível no documento final.

## Ao atualizar

Reprovar contra os mesmos dois glifos (`→`, `✓`) sempre que trocar a versão
do Archivo — não há garantia de que uma versão futura os traga; a ausência
de hoje foi medida, não é característica permanente conhecida da família.
`tests/documentos/gerador.test.ts` confere a cobertura de glifo dos três
arquivos desta pasta a cada execução, exatamente para pegar isso se um dia
alguém trocar o arquivo sem reconferir.
