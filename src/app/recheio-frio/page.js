"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatNumber } from "@/lib/calc";

export default function RecheioFrioPage() {
  const { embutidosRecheio, adicionarEmbutidoRecheio } = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);

  const ordenados = [...embutidosRecheio].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 12</p>
          <h1 className="font-display text-3xl mt-1">Recheio Frio — Embutidos</h1>
          <p className="text-sm text-muted mt-1">
            Peso das peças de embutido usadas (presunto, mussarela...) com a perda das pontas cortadas.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Registrar uso
        </button>
      </header>

      {mostrarForm && (
        <NovoRegistroForm
          onSalvar={async (dados) => {
            await adicionarEmbutidoRecheio(dados);
            setMostrarForm(false);
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="px-5 py-3 font-medium">Embutido</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium text-right">Peças</th>
                <th className="px-5 py-3 font-medium text-right">Peso bruto</th>
                <th className="px-5 py-3 font-medium text-right">Pontas</th>
                <th className="px-5 py-3 font-medium text-right">Perda</th>
                <th className="px-5 py-3 font-medium text-right">Peso líquido</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{e.nome_embutido}</td>
                  <td className="px-5 py-3 text-muted">{new Date(e.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(e.quantidade_pecas, 2)}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(e.peso_bruto_total, 3)} kg</td>
                  <td className="px-5 py-3 text-right font-mono-num">{e.quantidade_pontas}</td>
                  <td className="px-5 py-3 text-right font-mono-num text-brick">
                    {formatNumber(e.perda_total_kg, 3)} kg ({formatNumber(e.perda_percentual, 1)}%)
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium text-sage">
                    {formatNumber(e.peso_liquido_kg, 3)} kg
                  </td>
                </tr>
              ))}
              {ordenados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted text-sm">
                    Nenhum registro ainda.
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

function NovoRegistroForm({ onSalvar, onCancelar }) {
  const [nomeEmbutido, setNomeEmbutido] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [pesoPeca, setPesoPeca] = useState("");
  const [quantidadePecas, setQuantidadePecas] = useState("");
  const [quantidadePontas, setQuantidadePontas] = useState("");
  const [perdaPorPonta, setPerdaPorPonta] = useState("0,200");

  const [salvando, setSalvando] = useState(false);

  function num(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const pesoBrutoTotal = num(pesoPeca) * num(quantidadePecas);
  const perdaTotalKg = num(quantidadePontas) * num(perdaPorPonta);
  const pesoLiquidoKg = Math.max(0, pesoBrutoTotal - perdaTotalKg);
  const perdaPercentual = pesoBrutoTotal > 0 ? (perdaTotalKg / pesoBrutoTotal) * 100 : 0;

  async function salvar() {
    if (!nomeEmbutido.trim() || !pesoPeca || !quantidadePecas) return;
    setSalvando(true);
    try {
      await onSalvar({
        nome_embutido: nomeEmbutido,
        data,
        peso_peca_kg: num(pesoPeca),
        quantidade_pecas: num(quantidadePecas),
        peso_bruto_total: pesoBrutoTotal,
        quantidade_pontas: Math.round(num(quantidadePontas)),
        perda_por_ponta_kg: num(perdaPorPonta),
        perda_total_kg: perdaTotalKg,
        peso_liquido_kg: pesoLiquidoKg,
        perda_percentual: perdaPercentual,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Embutido">
          <input
            value={nomeEmbutido}
            onChange={(e) => setNomeEmbutido(e.target.value)}
            placeholder="Ex: Apresuntado, Mussarela..."
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Data">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Peso de 1 peça inteira (kg)">
          <input
            value={pesoPeca}
            onChange={(e) => setPesoPeca(e.target.value)}
            placeholder="Ex: 3,710"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
      </div>

      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">Quantidade usada e perda</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Peças utilizadas (pode ser fracionado)">
          <input
            value={quantidadePecas}
            onChange={(e) => setQuantidadePecas(e.target.value)}
            placeholder="Ex: 2,5"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Pontas cortadas (quantidade)">
          <input
            value={quantidadePontas}
            onChange={(e) => setQuantidadePontas(e.target.value)}
            placeholder="Ex: 5"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Perda por ponta (kg)">
          <input
            value={perdaPorPonta}
            onChange={(e) => setPerdaPorPonta(e.target.value)}
            placeholder="Ex: 0,200"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gold-soft/40 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-1">Peso bruto total</p>
          <span className="font-display text-xl text-foreground">{formatNumber(pesoBrutoTotal, 3)} kg</span>
        </div>
        <div className="bg-brick-soft/40 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-1">Perda total</p>
          <span className="font-display text-xl text-brick">{formatNumber(perdaTotalKg, 3)} kg</span>
          <span className="text-xs text-muted ml-2">({formatNumber(perdaPercentual, 1)}%)</span>
        </div>
        <div className="bg-sage-soft/40 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-1">Peso líquido pro recheio</p>
          <span className="font-display text-xl text-sage">{formatNumber(pesoLiquidoKg, 3)} kg</span>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={salvar}
          disabled={salvando}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-sage text-white rounded-md hover:opacity-90 disabled:opacity-60"
        >
          {salvando && <Loader2 size={13} className="animate-spin" />}
          Salvar registro
        </button>
        <button onClick={onCancelar} disabled={salvando} className="text-xs px-3 py-1.5 border border-line rounded-md">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
