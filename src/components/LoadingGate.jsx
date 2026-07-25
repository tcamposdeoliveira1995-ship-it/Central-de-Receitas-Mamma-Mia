"use client";

import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";

export default function LoadingGate({ children }) {
  const { loading } = useStore();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-[70vh] text-sm text-muted">
        <Loader2 size={22} className="animate-spin text-gold" />
        Carregando dados da planilha...
      </div>
    );
  }

  return children;
}
