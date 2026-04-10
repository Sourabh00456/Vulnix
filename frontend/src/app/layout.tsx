import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "Vulnix | Security Scanning Platform",
  description: "Continuous threat monitoring and vulnerability scanning SaaS. Detect misconfigurations, exposed ports, and web vulnerabilities in real-time.",
  keywords: "security scanning, vulnerability scanner, SSRF protection, penetration testing, SaaS",
  openGraph: {
    title: "Vulnix | Security Scanning Platform",
    description: "Continuous threat monitoring and vulnerability scanning.",
    type: "website",
  }
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
        
        <Toaster theme="dark" position="bottom-right" richColors />
        {/* FAB */}
        <button className="fixed bottom-8 right-8 w-16 h-16 bg-primary rounded-full shadow-[0_8px_30px_rgba(124,106,247,0.4)] flex items-center justify-center group active:scale-90 transition-all z-50 pulse-glow">
            <span className="material-symbols-outlined text-white text-3xl group-hover:rotate-90 transition-transform">add</span>
        </button>
      </body>
    </html>
  );
}
