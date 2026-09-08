import type { Metadata, Viewport } from "next";
import { Archivo, Azeret_Mono } from "next/font/google";
import "./globals.css";

// docs/estilo.md § Tipografia: Archivo variável (wdth 75..125, wght 400..800)
// em toda a interface. O eixo `wdth` é usado pelo número-herói e pelos
// títulos, então precisa ser pedido explicitamente.
const archivo = Archivo({
  variable: "--fonte-interface",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Azeret Mono só na placa do caminhão — nunca em preço, nome ou corpo de texto.
const azeretMono = Azeret_Mono({
  variable: "--fonte-placa",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FretiGate",
  description: "Gestão de fretes para transportadoras.",
  // Ícones provisórios — ver o comentário em `src/app/manifest.ts`.
  icons: {
    icon: "/favicon.ico",
    apple: "/icones/apple-touch-icon.png",
  },
  // `capable: true` é o que tira a barra de endereço no iOS quando o app
  // está instalado (`display: "standalone"` do manifesto só faz isso no
  // Android) — sem esta tag, o app abre dentro do Safari normal mesmo
  // depois de "Adicionar à Tela de Início". Nesta versão do Next.js,
  // `appleWebApp.capable` só gera a tag padrão `mobile-web-app-capable`
  // (confirmado lendo `node_modules/next/dist/lib/metadata/metadata.js`) —
  // o Safari só passou a aceitar essa tag genérica a partir do iOS 17.4;
  // em versões anteriores, quem decide é só a tag com prefixo `apple-`, que
  // esta versão do Next não emite mais sozinha. `other` abaixo adiciona ela
  // à mão, para não depender da versão do iOS de quem instalar.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    title: "FretiGate",
    statusBarStyle: "default",
  },
};

// O app é usado no celular, no pátio. `maximumScale` fica livre de propósito:
// travar o zoom impede quem precisa aumentar o texto de conseguir ler.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${azeretMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
