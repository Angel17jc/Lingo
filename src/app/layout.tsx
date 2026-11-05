import type { Metadata } from "next";
import "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lingo",
  description: "Tu próximo espacio para traducir entre idiomas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
