"use client";

import { useMemo } from "react";
import { BookOpen, Beef, Factory, Calculator, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularCMV, formatBRL } from "@/lib/calc";
import StatCard from "@/components/StatCard";

export default function DashboardPage() {
  const { receitas, materiasPrimas, materiasPrimasById, receitasById, producoes } = useStore();

  const cmvPorReceita = useMemo(
    () =>
      receitas.map((r) => {
        const cmv = calcularCMV({
          itens: r.itens || [],
          embalagemCusto: r.embalagem_custo || 0,
          quantidadeProducao: r.rendimento?.quantidade_produzida || 1,
          materiasPrimasById,
          receitasById,
        });
        return { ...r, cmv };
      }),
    [receitas, materiasPrimasById, receitasById]
  );

  const cmvMedio = cmvPorReceita.length
    ? cmvPorReceita.reduce((sum, r) => sum + r.cmv.cmvUnitario, 0) / cmvPorReceita.length
    : 0;

  const maisCara = [...cmvPorReceita].sort((a, b) => b.cmv.cmvUnitario - a.cmv.cmvUnitario)[0];
  const maisLucrativa = [...cmvPorReceita].sort((a, b) => a.cmv.cmvUnitario - b.cmv.cmvUnitario)[0];
  const aguardandoRevisao = receitas.filter((r) => r.status === "aguardando_revisao").length;

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Visão executiva</p>
        <h1 className="font-display text-3xl mt-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Receitas ativas" value={receitas.length} icon={BookOpen} />
        <StatCard label="Matérias-primas" value={materiasPrimas.length} icon={Beef} />
        <StatCard label="Produções no mês" value={producoes.length} icon={Factory} />
        <StatCard label="CMV médio" value={formatBRL(cmvMedio)} icon={Calculator} tone="gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Receita mais lucrativa"
          value={maisLucrativa ? maisLucrativa.nome : "—"}
          sub={maisLucrativa ? `CMV unitário ${formatBRL(maisLucrativa.cmv.cmvUnitario)}` : ""}
          icon={TrendingUp}
          tone="sage"
        />
        <StatCard
          label="Receita mais cara"
          value={maisCara ? maisCara.nome : "—"}
          sub={maisCara ? `CMV unitário ${formatBRL(maisCara.cmv.cmvUnitario)}` : ""}
          icon={TrendingDown}
          tone="brick"
        />
        <StatCard
          label="Aguardando revisão"
          value={aguardandoRevisao}
          sub="receitas pendentes"
          icon={AlertTriangle}
        />
      </div>

      <section className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-lg">CMV por receita</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              <th className="px-5 py-3 font-medium">Receita</th>
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-5 py-3 font-medium text-right">Custo total</th>
              <th className="px-5 py-3 font-medium text-right">CMV unitário</th>
            </tr>
          </thead>
          <tbody>
            {cmvPorReceita.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">{r.nome}</td>
                <td className="px-5 py-3 text-muted">{r.empresa || "—"}</td>
                <td className="px-5 py-3 text-right font-mono-num">{formatBRL(r.cmv.custoTotal)}</td>
                <td className="px-5 py-3 text-right font-mono-num text-gold font-medium">
                  {formatBRL(r.cmv.cmvUnitario)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
