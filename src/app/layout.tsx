import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Fontes do site (texto + títulos)
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const space = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Arena Storm – Game Center em Tianguá-CE",
  description:
    "PCs gamer, PlayStation 5, simulador de corrida e realidade virtual em Tianguá-CE. Reserve pelo WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${space.variable} antialiased`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
