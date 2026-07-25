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
          <main className="flex-1 min-h-screen overflow-y-auto">
            <div className="max-w-6xl mx-auto px-8 py-8">
              <LoadingGate>{children}</LoadingGate>
            </div>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
