import type { MetadataRoute } from "next";

// Ícones provisórios (item 18, Tarefa 1): recorte do selo circular verde no
// rodapé de `referencia/Design/Manual de Marca/ChatGPT Image 5 de ago. de
// 2026, 05_08_48 (2).png` — o único tratamento do símbolo "FG" isolado (sem
// o texto "FretiGate" ao lado) já desenhado, com margem generosa ao redor.
// Pedido ao Design o símbolo em arquivo próprio (`docs/planos/
// pwa-instalavel-e-convite-de-instalacao.md`, "O que precisa chegar ao
// Design"); quando chegar, troca os arquivos em `public/icones/` e
// `public/favicon.ico`, sem mexer neste manifesto.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FretiGate",
    short_name: "FretiGate",
    // "Empresa", nunca "transportadora" — decisão do fundador, 07/09/2026
    // (`docs/especificacao.md`, Vocabulário, "A fronteira é o público, não
    // o arquivo de código"): este texto aparece no diálogo de instalação e
    // nas informações do app para quem **já é cliente**, diferente do
    // `<meta name="description">` da página (`src/app/layout.tsx`), que
    // continua "transportadoras" de propósito — fala com quem ainda não é
    // cliente. As duas divergem por desenho, não é inconsistência para
    // alinhar depois.
    description: "Gestão de fretes para empresas de frete.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#faf8f4",
    icons: [
      {
        src: "/icones/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icones/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icones/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
