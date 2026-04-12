import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ClientShell from "@/components/ClientShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vulnix-six.vercel.app"),
  title: "Vulnix – AI Vulnerability Scanner",
  description:
    "Find vulnerabilities before attackers do. Vulnix combines Nmap, OWASP ZAP, and Gemini AI to continuously monitor your attack surface with actionable fixes.",
  keywords:
    "vulnerability scanner, AI security, Nmap, OWASP ZAP, penetration testing, SSRF protection, SaaS security",
  authors: [{ name: "Vulnix" }],
  openGraph: {
    title: "Vulnix – AI Vulnerability Scanner",
    description:
      "Find vulnerabilities before attackers do. Continuous attack surface monitoring powered by AI.",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Vulnix Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Vulnix – AI Vulnerability Scanner",
    description: "Continuous attack surface monitoring powered by Nmap, ZAP, and Gemini AI.",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
          // @ts-ignore — Next.js extended prop for stylesheet priority
          precedence="default"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-background text-on-surface selection:bg-primary/30 selection:text-white`}
        suppressHydrationWarning
      >
        <ClientShell>{children}</ClientShell>
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
