import type { Metadata } from "next";
import { Suspense } from "react";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth";

// Display font - editorial, expressive
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="en" className={`dark ${instrumentSerif.variable}`}>
      <head>
        {/* Satoshi font from Fontshare */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
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
