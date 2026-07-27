"use client";

import { useMemo, useState } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularCMV, calcularRendimento, pesoTotalIngredientes, formatBRL, formatNumber } from "@/lib/calc";

export default function RendimentoPage() {
  const { receitas, materiasPrimasById, receitasById, atualizarRendimentoReceita } = useStore();
  const [receitaId, setReceitaId] = useState(receitas[0]?.id ?? "");
  const receita = receitas.find((r) => r.id === receitaId);

  const [pesos, setPesos] = useState(() => ({
    pesoIngredientes: receita?.rendimento?.peso_ingredientes || 0,
    pesoFinal: receita?.rendimento?.peso_final || 0,
    pesoUnitario: receita?.rendimento?.peso_unitario || 0,
  }));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function selecionarReceita(id) {
    const r = receitas.find((x) => x.id === id);
    setReceitaId(id);
    setPesos({
      pesoIngredientes: r?.rendimento?.peso_ingredientes || 0,
      pesoFinal: r?.rendimento?.peso_final || 0,
      pesoUnitario: r?.rendimento?.peso_unitario || 0,
    });
    setSalvo(false);
  }

  const cmv = useMemo(() => {
    if (!receita) return { custoTotal: 0 };
    return calcularCMV({
      itens: receita.itens || [],
      embalagemCusto: receita.embalagem_custo || 0,
      quantidadeProducao: 1, // custo total, não unitário
      materiasPrimasById,
      receitasById,
    });
  }, [receita, materiasPrimasById, receitasById]);

  const pesoCalculado = useMemo(() => {
    if (!receita) return { total: 0, itensNaoConvertidos: [] };
    return pesoTotalIngredientes(receita.itens || [], materiasPrimasById, receitasById);
  }, [receita, materiasPrimasById, receitasById]);

  const resultado = calcularRendimento({
    pesoIngredientes: pesos.pesoIngredientes,
    pesoFinal: pesos.pesoFinal,
    pesoUnitario: pesos.pesoUnitario,
    custoTotal: cmv.custoTotal,
  });

  function set(field, value) {
    setPesos((p) => ({ ...p, [field]: parseFloat(value) || 0 }));
    setSalvo(false);
  }

  async function salvar() {
    if (!receita) return;
    setSalvando(true);
    try {
      await atualizarRendimentoReceita(receita.id, {
        peso_ingredientes: pesos.pesoIngredientes,
        peso_final: pesos.pesoFinal,
        peso_unitario: pesos.pesoUnitario,
        quantidade_produzida: resultado.quantidadeProduzida,
      });
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 6</p>
        <h1 className="font-display text-3xl mt-1">Rendimento</h1>
        <p className="text-sm text-muted mt-1">
          Esses pesos definem o peso final da receita — que é a base usada quando ela é aproveitada como
          ingrediente de outra receita (ex: uma massa dentro de um salgado).
        </p>
      </header>

      <label className="text-xs text-muted block mb-4">
        Receita
        <select
          value={receitaId}
          onChange={(e) => selecionarReceita(e.target.value)}
          className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-72"
        >
          {receitas.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
      </label>

      {receita && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-line rounded-lg p-5">
              <h2 className="font-display text-lg mb-4">Entrada — pesos (kg)</h2>
              <div className="space-y-3">
                <div>
                  <Campo label="Peso dos ingredientes" value={pesos.pesoIngredientes} onChange={(v) => set("pesoIngredientes", v)} />
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      Soma calculada da receita: <span className="font-mono-num font-medium">{formatNumber(pesoCalculado.total, 3)} kg</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => set("pesoIngredientes", pesoCalculado.total)}
                      className="text-sage hover:underline"
                    >
                      Usar esse valor
                    </button>
                  </div>
                  {pesoCalculado.itensNaoConvertidos.length > 0 && (
                    <p className="text-xs text-brick mt-1">
                      Não entraram na soma (unidade não conversível pra peso): {pesoCalculado.itensNaoConvertidos.join(", ")}.
                    </p>
                  )}
                </div>
                <Campo label="Peso final (pronto)" value={pesos.pesoFinal} onChange={(v) => set("pesoFinal", v)} />
                <p className="text-xs text-muted -mt-1.5">
                  Peça pesada de verdade depois de assar/fritar/processar — o sistema não calcula isso sozinho.
                </p>
                <Campo label="Peso unitário (por unidade)" value={pesos.pesoUnitario} onChange={(v) => set("pesoUnitario", v)} step="0.001" />
              </div>
            </div>

            <div className="bg-surface border border-line rounded-lg p-5">
              <h2 className="font-display text-lg mb-4">Sistema calcula</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Resultado label="Rendimento" value={`${formatNumber(resultado.rendimentoPercentual, 1)}%`} tone="sage" />
                <Resultado label="Perda" value={`${formatNumber(resultado.perdaKg, 2)} kg`} tone="brick" />
                <Resultado label="Perda %" value={`${formatNumber(resultado.perdaPercentual, 1)}%`} tone="brick" />
                <Resultado label="Qtde produzida" value={formatNumber(resultado.quantidadeProduzida, 0)} tone="gold" />
                <Resultado label="CMV por kg" value={formatBRL(resultado.cmvPorKg)} />
                <Resultado label="CMV unitário" value={formatBRL(resultado.cmvUnitario)} tone="gold" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar rendimento
            </button>
            {salvo && (
              <span className="text-sm text-sage flex items-center gap-1">
                <Check size={14} /> Salvo — já pode ser usada como ingrediente de outra receita
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, step = "0.01" }) {
  return (
    <label className="text-xs text-muted block">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm font-mono-num"
      />
    </label>
  );
}

function Resultado({ label, value, tone = "default" }) {
  const toneClass = { default: "text-foreground", sage: "text-sage", gold: "text-gold", brick: "text-brick" }[tone];
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-mono-num font-semibold text-lg mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}
