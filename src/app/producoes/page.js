"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatNumber } from "@/lib/calc";

export default function ProducoesPage() {
  const { producoes, receitas, adicionarProducao } = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);

  const nomeReceita = (id) => receitas.find((r) => r.id === id)?.nome || "—";

  const ordenadas = [...producoes].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 10</p>
          <h1 className="font-display text-3xl mt-1">Produções</h1>
          <p className="text-sm text-muted mt-1">Cada produção realizada, comparando o rendimento teórico com o real.</p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Registrar produção
        </button>
      </header>

      {mostrarForm && (
        <NovaProducaoForm
          receitas={receitas}
          onSalvar={async (dados) => {
            await adicionarProducao(dados);
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
              <th className="px-5 py-3 font-medium">Receita</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Lote</th>
              <th className="px-5 py-3 font-medium text-right">Teórico</th>
              <th className="px-5 py-3 font-medium text-right">Real</th>
              <th className="px-5 py-3 font-medium text-right">Peso (kg)</th>
              <th className="px-5 py-3 font-medium text-right">Diferença</th>
              <th className="px-5 py-3 font-medium text-right">Perda</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((p) => {
              const diff = (p.quantidade_real || 0) - (p.quantidade_teorica || 0);
              const positivo = diff >= 0;
              const perda = p.perda_percentual ?? (p.quantidade_teorica > 0 ? -(diff / p.quantidade_teorica) * 100 : 0);
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{p.receita_nome || nomeReceita(p.receita_id)}</td>
                  <td className="px-5 py-3 text-muted">{new Date(p.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-3 font-mono-num text-muted">{p.lote}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(p.quantidade_teorica, 0)}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(p.quantidade_real, 0)}</td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">
                    {p.peso_massa_real ? `${formatNumber(p.peso_massa_real, 3)} kg` : "—"}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono-num font-medium ${positivo ? "text-sage" : "text-brick"}`}>
                    {positivo ? "+" : ""}{formatNumber(diff, 0)}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono-num font-medium ${perda <= 0 ? "text-sage" : "text-brick"}`}>
                    {perda > 0 ? "+" : ""}{formatNumber(perda, 1)}%
                  </td>
                </tr>
              );
            })}
            {ordenadas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted text-sm">
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

function NovaProducaoForm({ receitas, onSalvar, onCancelar }) {
  const [receitaId, setReceitaId] = useState(receitas[0]?.id || "");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [lote, setLote] = useState("");
  const [quantidadeReal, setQuantidadeReal] = useState("");
  const [sobrescreverTeorica, setSobrescreverTeorica] = useState(false);
  const [quantidadeTeorica, setQuantidadeTeorica] = useState("");
  const [pesoUnitario, setPesoUnitario] = useState(() => receitas[0]?.peso_unitario || "");

  const receita = receitas.find((r) => r.id === receitaId);
  const teoricaDaReceita = receita?.rendimento?.quantidade_produzida || 0;

  function num(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function selecionarReceita(id) {
    setReceitaId(id);
    const r = receitas.find((rr) => rr.id === id);
    setPesoUnitario(r?.peso_unitario || "");
  }

  const pesoMassaReal = num(quantidadeReal) * num(pesoUnitario);

  async function salvar() {
    const real = parseFloat(String(quantidadeReal).replace(",", "."));
    if (!receitaId || !real) return;

    const dados = {
      receita_id: receitaId,
      data,
      lote,
      quantidade_real: real,
      peso_unitario_kg: num(pesoUnitario),
      peso_massa_real: pesoMassaReal,
    };
    if (sobrescreverTeorica && quantidadeTeorica !== "") {
      dados.quantidade_teorica = parseFloat(String(quantidadeTeorica).replace(",", "."));
    }

    await onSalvar(dados);
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Receita">
          <select
            value={receitaId}
            onChange={(e) => selecionarReceita(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          >
            {receitas.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Data">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Lote">
          <input
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder="Ex: L-2907"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Quantidade real produzida">
          <input
            value={quantidadeReal}
            onChange={(e) => setQuantidadeReal(e.target.value)}
            placeholder="Ex: 2690"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Peso unitário (kg por salgado)">
          <input
            value={pesoUnitario}
            onChange={(e) => setPesoUnitario(e.target.value)}
            placeholder="Ex: 0,030"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
      </div>

      <div className="mt-3">
        <p className="text-xs text-muted">
          Peso unitário pré-preenchido a partir do cadastro da receita — pode ajustar livremente pra esse lote.
        </p>
        <div className="mt-2 bg-gold-soft/40 rounded-md px-3 py-2 inline-block">
          <span className="text-xs text-muted mr-2">Peso em massa desse lote:</span>
          <span className="font-mono-num font-medium text-sage">{formatNumber(pesoMassaReal, 3)} kg</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <p className="text-xs text-muted">
          Quantidade teórica: {teoricaDaReceita > 0 ? formatNumber(teoricaDaReceita, 0) : "não cadastrada nessa receita"}
          {" "}(vem do rendimento da ficha técnica).
        </p>
        <label className="text-xs text-muted flex items-center gap-1.5 mt-2">
          <input
            type="checkbox"
            checked={sobrescreverTeorica}
            onChange={(e) => setSobrescreverTeorica(e.target.checked)}
          />
          Usar um valor teórico diferente pra esse lote
        </label>
        {sobrescreverTeorica && (
          <input
            value={quantidadeTeorica}
            onChange={(e) => setQuantidadeTeorica(e.target.value)}
            placeholder="Quantidade teórica pra esse lote"
            className="w-full mt-2 px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={salvar} className="text-xs px-3 py-1.5 bg-sage text-white rounded-md hover:opacity-90">
          Salvar produção
        </button>
        <button onClick={onCancelar} className="text-xs px-3 py-1.5 border border-line rounded-md">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
