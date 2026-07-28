"use client";

import { useStore } from "@/lib/store";
import { formatNumber } from "@/lib/calc";

export default function ProducoesPage() {
  const { producoes, receitas } = useStore();

  const nomeReceita = (id) => receitas.find((r) => r.id === id)?.nome || "—";

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 10</p>
        <h1 className="font-display text-3xl mt-1">Produções</h1>
        <p className="text-sm text-muted mt-1">Cada produção realizada, comparando o rendimento teórico com o real.</p>
      </header>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              <th className="px-5 py-3 font-medium">Receita</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Lote</th>
              <th className="px-5 py-3 font-medium text-right">Teórico</th>
              <th className="px-5 py-3 font-medium text-right">Real</th>
              <th className="px-5 py-3 font-medium text-right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {producoes.map((p) => {
              const diff = (p.quantidade_real || 0) - (p.quantidade_teorica || 0);
              const positivo = diff >= 0;
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{nomeReceita(p.receita_id)}</td>
                  <td className="px-5 py-3 text-muted">{new Date(p.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-3 font-mono-num text-muted">{p.lote}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(p.quantidade_teorica, 0)}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(p.quantidade_real, 0)}</td>
                  <td className={`px-5 py-3 text-right font-mono-num font-medium ${positivo ? "text-sage" : "text-brick"}`}>
                    {positivo ? "+" : ""}{formatNumber(diff, 0)}
                  </td>
                </tr>
              );
            })}
            {producoes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted text-sm">
                  Nenhuma produção registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
