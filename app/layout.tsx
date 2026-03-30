import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth";

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
          <Suspense fallback={null}>
            <AuthProvider>
              {children}
            </AuthProvider>
          </Suspense>
        </main>
      </body>
    </html>
  );
}
