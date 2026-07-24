"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Beef, BookOpen, Calculator, Percent, Factory } from "lucide-react";
import { isDemoMode } from "@/lib/supabaseClient";

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

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-surface flex flex-col h-full">
      <div className="px-6 py-6 border-b border-line">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl text-foreground">Mamma</span>
          <span className="font-display text-2xl text-gold italic">Formula</span>
        </div>
        <p className="text-xs text-muted mt-1 tracking-wide uppercase">Receitas · CMV · Produção</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
            Conectado ao Supabase
          </div>
        )}
        <p className="mt-1">Mamma Mia Salgados</p>
      </div>
    </aside>
  );
}
