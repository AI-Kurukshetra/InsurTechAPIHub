import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ensureInsurancePlansBootstrap } from "@/lib/supabase/bootstrap";
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
  title: "InsurTech API Hub",
  description: "Insurance data and benefits connectivity platform MVP.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureInsurancePlansBootstrap();

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-neutral-950 font-sans text-neutral-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
