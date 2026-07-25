"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { calcularCMV, formatBRL } from "@/lib/calc";

export default function CMVPage() {
  const { receitas, materiasPrimasById, receitasById } = useStore();

  const linhas = useMemo(
    () =>
      receitas
        .map((r) => {
          const quantidadeProducao = r.rendimento?.quantidade_produzida || 1;
          const cmv = calcularCMV({
            itens: r.itens || [],
            embalagemCusto: r.embalagem_custo || 0,
            quantidadeProducao,
            materiasPrimasById,
            receitasById,
          });
          return { ...r, cmv, quantidadeProducao };
        })
        .sort((a, b) => b.cmv.cmvUnitario - a.cmv.cmvUnitario),
    [receitas, materiasPrimasById, receitasById]
  );

  const maiorCusto = linhas[0];

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 5</p>
        <h1 className="font-display text-3xl mt-1">CMV</h1>
        <p className="text-sm text-muted mt-1">
          Toda alteração em uma matéria-prima recalcula automaticamente o CMV de todas as receitas que a utilizam.
        </p>
      </header>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              <th className="px-5 py-3 font-medium">Receita</th>
              <th className="px-5 py-3 font-medium text-right">Ingredientes</th>
              <th className="px-5 py-3 font-medium text-right">Embalagem</th>
              <th className="px-5 py-3 font-medium text-right">Custo total</th>
              <th className="px-5 py-3 font-medium text-right">Produção</th>
              <th className="px-5 py-3 font-medium text-right">CMV unitário</th>
              <th className="px-5 py-3 font-medium text-right">% do maior custo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r) => {
              const percentual = maiorCusto ? (r.cmv.cmvUnitario / maiorCusto.cmv.cmvUnitario) * 100 : 0;
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{r.nome}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatBRL(r.cmv.custoIngredientes)}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatBRL(r.cmv.custoEmbalagem)}</td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium">{formatBRL(r.cmv.custoTotal)}</td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">{r.quantidadeProducao} un</td>
                  <td className="px-5 py-3 text-right font-mono-num text-gold font-semibold">
                    {formatBRL(r.cmv.cmvUnitario)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="w-full h-1.5 bg-gold-soft rounded-full overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${percentual}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted text-sm">
                  Cadastre receitas e ingredientes para ver o CMV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
