import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastContainer } from "@/components/ui/toast-container";
import { OfflineManager } from "@/components/OfflineManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ColetaMax",
  description: "Sistema premium de logística e coletas",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const stored = JSON.parse(localStorage.getItem('coleta-theme-storage') || '{}');
            const theme = stored?.state?.theme || 'light';
            document.documentElement.classList.add(theme);
          } catch(e) {}
        `}} />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider>
            {children}
            <ToastContainer />
            <OfflineManager />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

