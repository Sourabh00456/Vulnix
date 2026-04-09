import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "Forensic Intelligence | Cybersecurity Dashboard",
  description: "Production-ready cybersecurity scanning SaaS MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" precedence="default"/>
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-background text-on-surface selection:bg-primary-container selection:text-white`}
      >
        <Header />
        <Sidebar />
        <main className="lg:ml-64 pt-24 px-6 pb-12">
            {children}
        </main>
        
        {/* FAB */}
        <button className="fixed bottom-8 right-8 w-16 h-16 hero-gradient rounded-full shadow-[0_8px_30px_rgba(212,56,13,0.3)] flex items-center justify-center group active:scale-90 transition-all z-50">
            <span className="material-symbols-outlined text-white text-3xl group-hover:rotate-90 transition-transform">add</span>
        </button>
        <Analytics />
      </body>
    </html>
  );
}
