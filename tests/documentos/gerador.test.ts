import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openSync, type Font } from "fontkit";
import { montarHtmlRelatorio, imprimirPdf, type DadosDocumentoRelatorio } from "@/lib/documentos/gerador";
import { abrirNavegador } from "@/lib/documentos/navegador";
import { escaparHtml } from "@/lib/utils/html";

/**
 * O gerador de PDF do relatório — item 7, Tarefa 2
 * (`docs/planos/item-7-relatorio.md`). Função pura (`montarHtmlRelatorio`) e
 * cobertura de glifo das fontes rodam em qualquer ambiente; os testes que
 * abrem um Chromium de verdade (`@sparticuz/chromium`) pulam no Windows —
 * ver o comentário de `abrirNavegador` (`src/lib/documentos/navegador.ts`) e
 * `CLAUDE.md` §14.
 */

const FONTES_DIR = join(process.cwd(), "src/lib/documentos/fontes");

/** Os três arquivos de `fontes/` são sempre fonte única, nunca coleção `.ttc` — o cast é seguro. */
function abrirFonte(nomeDoArquivo: string): Font {
  return openSync(join(FONTES_DIR, nomeDoArquivo)) as Font;
}

// `it.skipIf` deixa o teste visivelmente "pulado" no relatório do Vitest —
// nunca reportado como "passou" (CLAUDE.md §3, item 4: a diferença entre
// "passou" e "não rodou" precisa ser visível). Por isso a contagem de
// verificações também é condicional: exigir o total de um ambiente que não
// tem como rodar o Chromium seria a mesma classe de falso-positivo ao
// contrário.
const RODA_CHROMIUM = process.platform !== "win32";

let conferencias = 0;
const CONFERENCIAS_ESPERADAS = 30 + (RODA_CHROMIUM ? 4 : 0);

const DADOS_SEM_COBRANCA: DadosDocumentoRelatorio = {
  numero: "0142",
  emissao: "28 de agosto de 2026",
  empresa: {
    nome: "AP Transportes Rodoviários Ltda",
    linhaDados: "CNPJ 12.345.678/0001-90 · Av. Dom José, 1240 — Centro, Sobral/CE",
    linhaContato: "(88) 99612-4400 · financeiro@aptransportes.com.br",
    logoUrl: null,
  },
  notaDeRodape:
    "Documento emitido por AP Transportes Rodoviários Ltda · confira os valores e fale com a gente em caso de divergência.",
  corpo: {
    cliente: "Agro Vale Verde Ltda",
    clienteDocumento: "CNPJ 08.771.203/0001-44 · Sobral/CE",
    periodo: "1 a 31 de julho de 2026",
    linhas: [
      { data: "02/07", rota: "Sobral → Fortaleza/CE", carga: "Ração ensacada", valor: "420,00" },
      { data: "05/07", rota: "Sobral → Teresina/PI", carga: "Milho a granel", valor: "520,00" },
    ],
    total: "940,00",
    cobranca: null,
  },
};

const DADOS_COM_COBRANCA: DadosDocumentoRelatorio = {
  ...DADOS_SEM_COBRANCA,
  corpo: {
    ...DADOS_SEM_COBRANCA.corpo,
    cobranca: { vencimento: "20/08/2026", chavePix: "12.345.678/0001-90" },
  },
};

describe("montarHtmlRelatorio — marcação e fontes embutidas", () => {
  it("a rota sai com a seta (→) tal como formatarRota produz", () => {
    const html = montarHtmlRelatorio(DADOS_SEM_COBRANCA);
    expect(html).toContain("Sobral → Fortaleza/CE");
    conferencias++;
  });

  it("as três fontes vêm embutidas como data: URI — nunca por rede", () => {
    const html = montarHtmlRelatorio(DADOS_SEM_COBRANCA);
    const ocorrencias = html.match(/data:font\/woff2;base64,/g) ?? [];
    expect(ocorrencias.length).toBe(3);
    conferencias++;

    expect(html).not.toMatch(/https?:\/\//);
    conferencias++;
  });

  it("a face de fallback cobre exatamente os dois glifos que faltam no Archivo", () => {
    const html = montarHtmlRelatorio(DADOS_SEM_COBRANCA);
    expect(html).toContain("unicode-range: U+2192, U+2713");
    conferencias++;
  });

  it("a contagem diz 'serviço(s)', nunca 'frete(s)' — vocabulário formal do documento impresso (CLAUDE.md §8, exceção nomeada, 28/08/2026)", () => {
    const umServico = montarHtmlRelatorio({
      ...DADOS_SEM_COBRANCA,
      corpo: { ...DADOS_SEM_COBRANCA.corpo, linhas: [DADOS_SEM_COBRANCA.corpo.linhas[0]] },
    });
    expect(umServico).toContain("1 serviço");
    conferencias++;
    expect(umServico).not.toContain("frete");
    conferencias++;

    const doisServicos = montarHtmlRelatorio(DADOS_SEM_COBRANCA);
    expect(doisServicos).toContain("2 serviços");
    conferencias++;
  });

  it("o número do documento ('Nº …') sai em Azeret Mono, não Archivo — mesma regra da placa (docs/estilo.md § Impresso, 28/08/2026)", () => {
    const html = montarHtmlRelatorio(DADOS_SEM_COBRANCA);
    const trechoDoNumero = html.slice(html.indexOf("Nº 0142") - 200, html.indexOf("Nº 0142"));
    expect(trechoDoNumero).toContain("Azeret Mono");
    conferencias++;
  });

  it("sem cobrança, o documento termina no total — sem vencimento nem Pix", () => {
    const html = montarHtmlRelatorio(DADOS_SEM_COBRANCA);
    expect(html).not.toContain("VENCIMENTO");
    conferencias++;
    expect(html).not.toContain("PAGAMENTO VIA PIX");
    conferencias++;
  });

  it("com cobrança, mostra vencimento e a chave Pix crua — sem tipo de chave nem dado bancário inventado", () => {
    const html = montarHtmlRelatorio(DADOS_COM_COBRANCA);
    expect(html).toContain("20/08/2026");
    conferencias++;
    expect(html).toContain("12.345.678/0001-90");
    conferencias++;
    // `Empresa.chave_pix` não tem subtipo nem dado bancário (CLAUDE.md §7) —
    // o protótipo (referencia/) mostra os dois, mas nenhum tem campo no
    // schema (`corpoRelatorio.ts`, comentário no topo do arquivo).
    expect(html).not.toContain("Chave CNPJ");
    conferencias++;
    expect(html).not.toContain("Banco");
    conferencias++;
  });

  it("com cobrança mas sem chave Pix (item 7, Tarefa 3) — mostra vencimento, some só a coluna do Pix", () => {
    const html = montarHtmlRelatorio({
      ...DADOS_SEM_COBRANCA,
      corpo: {
        ...DADOS_SEM_COBRANCA.corpo,
        cobranca: { vencimento: "20/08/2026", chavePix: null },
      },
    });
    expect(html).toContain("VENCIMENTO");
    conferencias++;
    expect(html).toContain("20/08/2026");
    conferencias++;
    expect(html).not.toContain("PAGAMENTO VIA PIX");
    conferencias++;
  });
});

describe("escaparHtml — todo campo de usuário sai seguro dentro do molde (achado do fundador, 28/08/2026)", () => {
  // O molde monta HTML por template string, não por JSX — quem escapa texto
  // de criança de graça é o React; aqui é `escaparHtml`, à mão, em cada
  // campo. Sem cobertura de teste, um campo esquecido só apareceria o dia em
  // que um nome de cliente de verdade tivesse `<`/`"`/`&` — tarde demais,
  // porque o PDF já foi para o cliente.
  const PAYLOAD = `<script>alert(1)</script>"'&`;

  it("nome da empresa, nome do cliente e nota de rodapé nunca entram como marcação crua", () => {
    const dados: DadosDocumentoRelatorio = {
      ...DADOS_SEM_COBRANCA,
      empresa: { ...DADOS_SEM_COBRANCA.empresa, nome: PAYLOAD },
      notaDeRodape: PAYLOAD,
      corpo: { ...DADOS_SEM_COBRANCA.corpo, cliente: PAYLOAD },
    };
    const html = montarHtmlRelatorio(dados);

    expect(html).not.toContain("<script>alert(1)</script>");
    conferencias++;

    // Não basta o script sumir — o texto escapado precisa estar lá, senão o
    // teste passaria com o campo silenciosamente descartado, não escapado.
    expect(html).toContain(escaparHtml(PAYLOAD));
    conferencias++;
  });

  it("rota, carga e chave Pix — os campos de texto mais livre do produto — também escapam", () => {
    const dados: DadosDocumentoRelatorio = {
      ...DADOS_COM_COBRANCA,
      corpo: {
        ...DADOS_COM_COBRANCA.corpo,
        linhas: [{ data: "01/01", rota: PAYLOAD, carga: PAYLOAD, valor: "1,00" }],
        cobranca: { vencimento: "01/01/2027", chavePix: PAYLOAD },
      },
    };
    const html = montarHtmlRelatorio(dados);

    expect(html).not.toContain("<script>alert(1)</script>");
    conferencias++;
    expect(html.match(/<script>alert\(1\)<\/script>/g)).toBeNull();
    conferencias++;
  });

  it("a URL da logo não deixa fechar o atributo src e injetar outro atributo", () => {
    const payloadDeAtributo = `x" onerror="alert(1)`;
    const dados: DadosDocumentoRelatorio = {
      ...DADOS_SEM_COBRANCA,
      empresa: { ...DADOS_SEM_COBRANCA.empresa, logoUrl: payloadDeAtributo },
    };
    const html = montarHtmlRelatorio(dados);

    expect(html).not.toContain(payloadDeAtributo);
    conferencias++;
    expect(html).toContain(escaparHtml(payloadDeAtributo));
    conferencias++;
  });
});

describe("cobertura de glifo das fontes auto-hospedadas — fontes/PROCEDENCIA.md, medido não suposto", () => {
  it("o Archivo NÃO tem → nem ✓ — é o achado real que justifica a face de fallback (contraste)", () => {
    const archivo = abrirFonte("archivo-variavel.woff2");
    expect(archivo.hasGlyphForCodePoint(0x2192)).toBe(false);
    conferencias++;
    expect(archivo.hasGlyphForCodePoint(0x2713)).toBe(false);
    conferencias++;
  });

  it("o Inter subconjuntado (fallback) TEM os dois glifos — prova que a face de fallback funciona", () => {
    const inter = abrirFonte("inter-simbolos.woff2");
    expect(inter.hasGlyphForCodePoint(0x2192)).toBe(true);
    conferencias++;
    expect(inter.hasGlyphForCodePoint(0x2713)).toBe(true);
    conferencias++;
  });

  it("Archivo e Azeret Mono cobrem os acentos do português e a pontuação que o documento usa", () => {
    const pontosDeCodigoNecessarios = [
      0x00e3, // ã
      0x00f5, // õ
      0x00e7, // ç
      0x00e1, // á
      0x00e9, // é
      0x00ba, // º
      0x00b7, // ·
      0x2013, // –
      0x2014, // —
      0x2026, // …
      0x203a, // ›
    ];

    for (const nomeArquivo of ["archivo-variavel.woff2", "azeret-mono-variavel.woff2"]) {
      const fonte = abrirFonte(nomeArquivo);
      for (const ponto of pontosDeCodigoNecessarios) {
        expect(fonte.hasGlyphForCodePoint(ponto)).toBe(true);
      }
      conferencias++;
    }
  });

  it("o subconjunto do Inter é mesmo mínimo — só os dois glifos, não a fonte inteira", () => {
    // Prova o "explicitamente" de fontes/PROCEDENCIA.md: nunca embutir uma
    // família inteira para resolver dois caracteres — o arquivo deve
    // continuar pequeno (poucos KB), não os ~300KB da fonte completa.
    const bytes = readFileSync(join(FONTES_DIR, "inter-simbolos.woff2"));
    expect(bytes.byteLength).toBeLessThan(5_000);
    conferencias++;
  });
});

describe("PDF de verdade — pula no Windows (@sparticuz/chromium só empacota Linux)", () => {
  it.skipIf(!RODA_CHROMIUM)("sai um PDF válido, de tamanho razoável", async () => {
    const pdf = await imprimirPdf(montarHtmlRelatorio(DADOS_COM_COBRANCA));
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    conferencias++;
    expect(pdf.byteLength).toBeGreaterThan(1_000);
    conferencias++;
  });

  it.skipIf(!RODA_CHROMIUM)(
    "não faz nenhuma requisição de rede — as fontes embutidas bastam, nunca Google Fonts",
    async () => {
      const navegador = await abrirNavegador();
      try {
        const pagina = await navegador.newPage();
        const pedidos: string[] = [];
        pagina.on("request", (r) => pedidos.push(r.url()));
        await pagina.setContent(montarHtmlRelatorio(DADOS_COM_COBRANCA), { waitUntil: "load" });
        // O próprio `page.setContent` conta como um "pedido" de documento
        // (`about:blank`/`data:`, sem rede real) — o que importa é nenhum
        // pedido para `http`/`https`, que é onde uma regressão para Google
        // Fonts apareceria.
        expect(pedidos.some((url) => url.startsWith("http"))).toBe(false);
      } finally {
        await navegador.close();
      }
      conferencias++;
    },
  );

  it.skipIf(!RODA_CHROMIUM)(
    "o tempo de geração fica dentro do que a medição encontrou (não regride pra rede)",
    async () => {
      const inicio = performance.now();
      await imprimirPdf(montarHtmlRelatorio(DADOS_COM_COBRANCA));
      const duracaoMs = performance.now() - inicio;
      // A medição real (docs/planos/item-7-relatorio.md) achou ≈2,9s "frio"
      // na Vercel — a margem aqui é generosa de propósito (ambiente de CI é
      // mais lento e variável que produção), só para pegar uma regressão
      // grosseira (voltar a buscar fonte por rede acrescentaria segundos a
      // mais, ou travaria esperando um `networkidle` que nunca resolve).
      expect(duracaoMs).toBeLessThan(15_000);
      conferencias++;
    },
  );
});

describe("cobertura", () => {
  it("rodou todas as verificações previstas para este ambiente", () => {
    expect(conferencias).toBe(CONFERENCIAS_ESPERADAS);
  });
});
