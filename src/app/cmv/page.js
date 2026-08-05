"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { calcularCMV, formatBRL } from "@/lib/calc";
import { TIPOS_RECEITA, LABEL_TIPO_RECEITA } from "@/lib/tiposReceita";

export default function CMVPage() {
  const { receitas, materiasPrimasById, receitasById } = useStore();
  const [tipoFiltro, setTipoFiltro] = useState(""); // "" = todos os tipos

  const linhasTodas = useMemo(
    () =>
      receitas.map((r) => {
        const quantidadeProducao = r.rendimento?.quantidade_produzida || 1;
        const cmv = calcularCMV({
          itens: r.itens || [],
          embalagemCusto: r.embalagem_custo || 0,
          quantidadeProducao,
          materiasPrimasById,
          receitasById,
        });
        const custoMOD = r.mod?.custo_total || 0;
        const custoTotalComMOD = cmv.custoTotal + custoMOD;
        const cmvUnitarioComMOD = cmv.cmvUnitario + (quantidadeProducao > 0 ? custoMOD / quantidadeProducao : 0);
        return { ...r, cmv, quantidadeProducao, custoMOD, custoTotalComMOD, cmvUnitarioComMOD };
      }),
    [receitas, materiasPrimasById, receitasById]
  );

  const linhas = useMemo(
    () =>
      linhasTodas
        .filter((r) => !tipoFiltro || r.papel === tipoFiltro)
        .sort((a, b) => b.cmvUnitarioComMOD - a.cmvUnitarioComMOD),
    [linhasTodas, tipoFiltro]
  );

  const maiorCusto = linhas[0];

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 5</p>
        <h1 className="font-display text-3xl mt-1">CMV</h1>
        <p className="text-sm text-muted mt-1">
          Toda alteração em uma matéria-prima recalcula automaticamente o CMV de todas as receitas que a utilizam.
          A coluna MOD usa o custo de mão de obra estimado, cadastrado na própria receita.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wide text-muted mr-1">Tipo:</span>
        <button
          type="button"
          onClick={() => setTipoFiltro("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            tipoFiltro === ""
              ? "border-sage bg-sage-soft text-sage"
              : "border-line text-muted hover:bg-gold-soft/30"
          }`}
        >
          Todos
        </button>
        {TIPOS_RECEITA.map((tipo) => {
          const selecionado = tipoFiltro === tipo.value;
          return (
            <button
              key={tipo.value}
              type="button"
              onClick={() => setTipoFiltro(selecionado ? "" : tipo.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                selecionado
                  ? "border-sage bg-sage-soft text-sage"
                  : "border-line text-muted hover:bg-gold-soft/30"
              }`}
            >
              <tipo.icone size={14} className={selecionado ? "text-sage" : "text-muted"} />
              {tipo.label}
            </button>
          );
        })}
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              <th className="px-5 py-3 font-medium">Receita</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium text-right">Ingredientes</th>
              <th className="px-5 py-3 font-medium text-right">Embalagem</th>
              <th className="px-5 py-3 font-medium text-right">MOD</th>
              <th className="px-5 py-3 font-medium text-right">Custo total (c/ MOD)</th>
              <th className="px-5 py-3 font-medium text-right">Produção</th>
              <th className="px-5 py-3 font-medium text-right">CMV unitário</th>
              <th className="px-5 py-3 font-medium text-right">CMV unitário (c/ MOD)</th>
              <th className="px-5 py-3 font-medium text-right">% do maior custo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r) => {
              const percentual = maiorCusto ? (r.cmvUnitarioComMOD / maiorCusto.cmvUnitarioComMOD) * 100 : 0;
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{r.nome}</td>
                  <td className="px-5 py-3">
                    {r.papel ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold-soft text-foreground/80">
                        {LABEL_TIPO_RECEITA[r.papel] || r.papel}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatBRL(r.cmv.custoIngredientes)}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatBRL(r.cmv.custoEmbalagem)}</td>
                  <td className="px-5 py-3 text-right font-mono-num">
                    {r.custoMOD > 0 ? formatBRL(r.custoMOD) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium">{formatBRL(r.custoTotalComMOD)}</td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">{r.quantidadeProducao} un</td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">
                    {formatBRL(r.cmv.cmvUnitario)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num text-gold font-semibold">
                    {formatBRL(r.cmvUnitarioComMOD)}
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
                <td colSpan={10} className="px-5 py-8 text-center text-muted text-sm">
                  {tipoFiltro
                    ? "Nenhuma receita desse tipo ainda."
                    : "Cadastre receitas e ingredientes para ver o CMV."}
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
