import "./globals.css";
import Sidebar from "@/components/Sidebar";
import LoadingGate from "@/components/LoadingGate";
import { StoreProvider } from "@/lib/store";

export const metadata = {
  title: "Mamma Formula",
  description: "Sistema de Gestão de Receitas, CMV e Produção — Mamma Mia Salgados",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex bg-background text-foreground">
        <StoreProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-y-auto pt-14 md:pt-0">
            <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
              <LoadingGate>{children}</LoadingGate>
            </div>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
