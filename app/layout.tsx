import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe DJ",
  description: "AI music curator - describe a vibe, hear it immediately",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans">
        <main className="flex min-h-screen flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
