import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query";
import { IntlProvider } from "@/contexts/IntlContext";
import StoreProvider from "@/lib/store/StoreProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visual Editor 2D",
  description: "Editor visual 2D con herramientas de dibujo y IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <QueryProvider>
            <IntlProvider>
              {children}
            </IntlProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
