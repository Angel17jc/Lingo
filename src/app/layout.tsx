import type { Metadata } from "next";
import "@/lib/env";
import { messages } from "@/lib/messages";
import "./globals.css";

export const metadata: Metadata = {
  title: messages.meta.title,
  description: messages.meta.description,
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
