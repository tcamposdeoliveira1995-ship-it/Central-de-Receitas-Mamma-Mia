"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Beef, BookOpen, Calculator, Percent, Factory, Menu, X } from "lucide-react";
import { isDemoMode } from "@/lib/sheetsClient";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/materias-primas", label: "Matérias-Primas", icon: Beef },
  { href: "/receitas", label: "Receitas", icon: BookOpen },
  { href: "/cmv", label: "CMV", icon: Calculator },
  { href: "/rendimento", label: "Rendimento", icon: Percent },
  { href: "/producoes", label: "Produções", icon: Factory },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Barra superior — só aparece no celular */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-surface border-b border-line flex items-center justify-between px-4">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-lg text-foreground">Mamma</span>
          <span className="font-display text-lg text-gold italic">Formula</span>
        </div>
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="p-2 -mr-2 text-foreground"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Fundo escurecido atrás do menu, quando aberto no celular */}
      {aberto && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setAberto(false)}
        />
      )}

      <aside
        className={`
          w-64 shrink-0 border-r border-line bg-surface flex flex-col h-full
          fixed md:static inset-y-0 left-0 z-50
          transform transition-transform duration-200
          ${aberto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        <div className="px-6 py-6 border-b border-line flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl text-foreground">Mamma</span>
              <span className="font-display text-2xl text-gold italic">Formula</span>
            </div>
            <p className="text-xs text-muted mt-1 tracking-wide uppercase">Receitas · CMV · Produção</p>
          </div>
          <button onClick={() => setAberto(false)} className="md:hidden p-1 text-muted">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sage text-white"
                    : "text-foreground/80 hover:bg-sage-soft hover:text-foreground"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-line text-xs text-muted">
          {isDemoMode ? (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Modo demonstração
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage" />
              Conectado à planilha
            </div>
          )}
          <p className="mt-1">Mamma Mia Salgados</p>
        </div>
      </aside>
    </>
  );
}
