"use client";

import { useState } from "react";
import { Plus, X, Loader2, Snowflake } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatNumber } from "@/lib/calc";

function gerarLinhaId() {
  return `emb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RecheioFrioPage() {
  const { recheiosFrios, adicionarRecheioFrio } = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);

  const ordenados = [...recheiosFrios].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 12</p>
          <h1 className="font-display text-3xl mt-1">Recheio Frio — Embutidos</h1>
          <p className="text-sm text-muted mt-1">
            Cada recheio combina um ou mais embutidos (presunto, mussarela...) num resultado único — peso líquido e perda das pontas cortadas.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Registrar recheio
        </button>
      </header>

      {mostrarForm && (
        <NovoRecheioForm
          onSalvar={async (dados) => {
            await adicionarRecheioFrio(dados);
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
                <th className="px-5 py-3 font-medium">Recheio</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Embutidos usados</th>
                <th className="px-5 py-3 font-medium text-right">Peso bruto</th>
                <th className="px-5 py-3 font-medium text-right">Perda</th>
                <th className="px-5 py-3 font-medium text-right">Peso líquido</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium">{r.nome_recheio}</td>
                  <td className="px-5 py-3 text-muted">{new Date(r.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {(r.itens || []).map((i) => i.nome).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(r.peso_bruto_total, 3)} kg</td>
                  <td className="px-5 py-3 text-right font-mono-num text-brick">
                    {formatNumber(r.perda_total_kg, 3)} kg ({formatNumber(r.perda_percentual_total, 1)}%)
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium text-sage">
                    {formatNumber(r.peso_liquido_total_kg, 3)} kg
                  </td>
                </tr>
              ))}
              {ordenados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted text-sm">
                    Nenhum recheio registrado ainda.
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

function NovoRecheioForm({ onSalvar, onCancelar }) {
  const [nomeRecheio, setNomeRecheio] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [numeroProducao, setNumeroProducao] = useState("");
  const [itens, setItens] = useState([
    { linha_id: gerarLinhaId(), nome: "", pesoPeca: "", quantidadePecas: "", quantidadePontas: "", perdaPorPonta: "0,200" },
  ]);
  const [salvando, setSalvando] = useState(false);

  function num(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function calcularItem(item) {
    const pesoBruto = num(item.pesoPeca) * num(item.quantidadePecas);
    const perda = num(item.quantidadePontas) * num(item.perdaPorPonta);
    const pesoLiquido = Math.max(0, pesoBruto - perda);
    return { pesoBruto, perda, pesoLiquido };
  }

  const itensCalculados = itens.map((item) => ({ ...item, ...calcularItem(item) }));
  const pesoBrutoTotal = itensCalculados.reduce((acc, i) => acc + i.pesoBruto, 0);
  const perdaTotal = itensCalculados.reduce((acc, i) => acc + i.perda, 0);
  const pesoLiquidoTotal = itensCalculados.reduce((acc, i) => acc + i.pesoLiquido, 0);
  const perdaPercentualTotal = pesoBrutoTotal > 0 ? (perdaTotal / pesoBrutoTotal) * 100 : 0;

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      { linha_id: gerarLinhaId(), nome: "", pesoPeca: "", quantidadePecas: "", quantidadePontas: "", perdaPorPonta: "0,200" },
    ]);
  }

  function alterarItem(linhaId, campo, valor) {
    setItens((prev) => prev.map((i) => (i.linha_id === linhaId ? { ...i, [campo]: valor } : i)));
  }

  function removerItem(linhaId) {
    setItens((prev) => (prev.length > 1 ? prev.filter((i) => i.linha_id !== linhaId) : prev));
  }

  async function salvar() {
    const itensValidos = itensCalculados.filter((i) => i.nome.trim() && i.pesoPeca && i.quantidadePecas);
    if (!nomeRecheio.trim() || itensValidos.length === 0) return;
    setSalvando(true);
    try {
      await onSalvar({
        nome_recheio: nomeRecheio,
        data,
        numero_producao: numeroProducao,
        itens: itensValidos.map((i) => ({
          nome: i.nome,
          peso_peca_kg: num(i.pesoPeca),
          quantidade_pecas: num(i.quantidadePecas),
          peso_bruto_kg: i.pesoBruto,
          quantidade_pontas: Math.round(num(i.quantidadePontas)),
          perda_por_ponta_kg: num(i.perdaPorPonta),
          perda_kg: i.perda,
          peso_liquido_kg: i.pesoLiquido,
        })),
        peso_bruto_total: pesoBrutoTotal,
        perda_total_kg: perdaTotal,
        peso_liquido_total_kg: pesoLiquidoTotal,
        perda_percentual_total: perdaPercentualTotal,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Nome do recheio">
          <input
            value={nomeRecheio}
            onChange={(e) => setNomeRecheio(e.target.value)}
            placeholder="Ex: Recheio Italianinho"
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
        <Campo label="Número da produção / lote">
          <input
            value={numeroProducao}
            onChange={(e) => setNumeroProducao(e.target.value)}
            placeholder="Ex: L-2907"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
      </div>

      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">Embutidos usados nesse recheio</p>
      <div className="space-y-3">
        {itensCalculados.map((item) => (
          <div key={item.linha_id} className="border border-line rounded-lg p-3">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
              <Campo label="Embutido">
                <input
                  value={item.nome}
                  onChange={(e) => alterarItem(item.linha_id, "nome", e.target.value)}
                  placeholder="Ex: Apresuntado"
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
                />
              </Campo>
              <Campo label="Peso da peça (kg)">
                <input
                  value={item.pesoPeca}
                  onChange={(e) => alterarItem(item.linha_id, "pesoPeca", e.target.value)}
                  placeholder="Ex: 3,710"
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                />
              </Campo>
              <Campo label="Peças usadas">
                <input
                  value={item.quantidadePecas}
                  onChange={(e) => alterarItem(item.linha_id, "quantidadePecas", e.target.value)}
                  placeholder="Ex: 2,5"
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                />
              </Campo>
              <Campo label="Pontas cortadas">
                <input
                  value={item.quantidadePontas}
                  onChange={(e) => alterarItem(item.linha_id, "quantidadePontas", e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                />
              </Campo>
              <Campo label="Perda/ponta (kg)">
                <div className="flex items-center gap-1.5">
                  <input
                    value={item.perdaPorPonta}
                    onChange={(e) => alterarItem(item.linha_id, "perdaPorPonta", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                  />
                  <button onClick={() => removerItem(item.linha_id)} className="text-muted hover:text-brick shrink-0">
                    <X size={14} />
                  </button>
                </div>
              </Campo>
            </div>
            <p className="text-xs text-muted mt-2">
              peso bruto: <span className="font-mono-num font-medium">{formatNumber(item.pesoBruto, 3)} kg</span>
              {" · "}perda: <span className="font-mono-num font-medium text-brick">{formatNumber(item.perda, 3)} kg</span>
              {" · "}líquido: <span className="font-mono-num font-medium text-sage">{formatNumber(item.pesoLiquido, 3)} kg</span>
            </p>
          </div>
        ))}
        <button
          type="button"
          onClick={adicionarItem}
          className="text-xs flex items-center gap-1 text-sage hover:underline"
        >
          <Plus size={12} /> Adicionar outro embutido a esse recheio
        </button>
      </div>

      <div className="mt-5 bg-sage-soft/40 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Snowflake size={16} className="text-sage" />
          <p className="text-xs uppercase tracking-wide text-muted">Rendimento do recheio (combinado)</p>
        </div>
        <div className="flex items-baseline gap-6 flex-wrap">
          <div>
            <p className="text-xs text-muted">Peso bruto total</p>
            <span className="font-mono-num font-medium">{formatNumber(pesoBrutoTotal, 3)} kg</span>
          </div>
          <div>
            <p className="text-xs text-muted">Perda total</p>
            <span className="font-mono-num font-medium text-brick">
              {formatNumber(perdaTotal, 3)} kg ({formatNumber(perdaPercentualTotal, 1)}%)
            </span>
          </div>
          <div>
            <p className="text-xs text-muted">Peso líquido do recheio</p>
            <span className="font-display text-xl text-sage">{formatNumber(pesoLiquidoTotal, 3)} kg</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={salvar}
          disabled={salvando}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-sage text-white rounded-md hover:opacity-90 disabled:opacity-60"
        >
          {salvando && <Loader2 size={13} className="animate-spin" />}
          Salvar recheio
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
