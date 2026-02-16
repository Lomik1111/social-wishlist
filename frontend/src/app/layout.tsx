import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Wishly — Социальный вишлист",
  description: "Создавайте списки желаний и делитесь ими с друзьями",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${jakarta.className} min-h-screen bg-[var(--color-surface)] text-[var(--color-text-primary)] antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
