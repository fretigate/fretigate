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
