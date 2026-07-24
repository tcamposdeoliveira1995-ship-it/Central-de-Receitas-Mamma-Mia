"use client";

import { useMemo, useState } from "react";
import { Search, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/calc";

export default function MateriasPrimasPage() {
  const { materiasPrimas, categorias, fornecedores, atualizarPrecoMateriaPrima, adicionarMateriaPrima } = useStore();
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const [novoPreco, setNovoPreco] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  const filtradas = useMemo(
    () =>
      materiasPrimas.filter((mp) =>
        [mp.nome, mp.codigo].join(" ").toLowerCase().includes(busca.toLowerCase())
      ),
    [materiasPrimas, busca]
  );

  const categoriaNome = (id) => categorias.find((c) => c.id === id)?.nome || "—";
  const fornecedorNome = (id) => fornecedores.find((f) => f.id === id)?.nome || "—";

  async function salvarPreco(mp) {
    const valor = parseFloat(novoPreco.replace(",", "."));
    if (!valor || valor <= 0) return;
    await atualizarPrecoMateriaPrima(mp.id, valor);
    setNovoPreco("");
    setSelecionada((prev) => (prev ? { ...prev, preco_atual: valor } : prev));
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 1</p>
          <h1 className="font-display text-3xl mt-1">Matérias-Primas</h1>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Nova matéria-prima
        </button>
      </header>

      {mostrarForm && (
        <NovaMateriaPrimaForm
          categorias={categorias}
          fornecedores={fornecedores}
          onSalvar={(dados) => {
            adicionarMateriaPrima(dados);
            setMostrarForm(false);
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="w-full pl-9 pr-3 py-2.5 rounded-md border border-line bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Unidade</th>
                <th className="px-4 py-3 font-medium text-right">Preço atual</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((mp) => (
                <tr
                  key={mp.id}
                  onClick={() => setSelecionada(mp)}
                  className={`border-b border-line last:border-0 cursor-pointer hover:bg-gold-soft/30 ${
                    selecionada?.id === mp.id ? "bg-gold-soft/50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono-num text-muted">{mp.codigo}</td>
                  <td className="px-4 py-3">{mp.nome}</td>
                  <td className="px-4 py-3 text-muted">{categoriaNome(mp.categoria_id)}</td>
                  <td className="px-4 py-3 text-muted">{mp.unidade}</td>
                  <td className="px-4 py-3 text-right font-mono-num font-medium">{formatBRL(mp.preco_atual)}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Nenhuma matéria-prima encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-surface border border-line rounded-lg p-5">
          {!selecionada ? (
            <p className="text-sm text-muted">Selecione uma matéria-prima para ver o histórico de preços.</p>
          ) : (
            <div>
              <p className="text-xs font-mono-num text-muted">{selecionada.codigo}</p>
              <h3 className="font-display text-xl mt-0.5">{selecionada.nome}</h3>
              <p className="text-sm text-muted mt-0.5">{fornecedorNome(selecionada.fornecedor_principal_id)}</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-3xl font-mono-num">{formatBRL(selecionada.preco_atual)}</span>
                <span className="text-xs text-muted">/ {selecionada.unidade}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="flex items-center gap-1.5 text-sage">
                  <TrendingDown size={14} /> Mín. {formatBRL(selecionada.preco_minimo)}
                </div>
                <div className="flex items-center gap-1.5 text-brick">
                  <TrendingUp size={14} /> Máx. {formatBRL(selecionada.preco_maximo)}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Histórico</p>
                <HistoricoSparkline historico={selecionada.historico || []} />
                <ul className="mt-2 space-y-1">
                  {(selecionada.historico || []).map((h, i) => (
                    <li key={i} className="flex justify-between text-xs text-muted">
                      <span>{h.data}</span>
                      <span className="font-mono-num">{formatBRL(h.preco)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-line">
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Atualizar preço (Compras)</p>
                <div className="flex gap-2">
                  <input
                    value={novoPreco}
                    onChange={(e) => setNovoPreco(e.target.value)}
                    placeholder="0,00"
                    className="flex-1 px-3 py-2 rounded-md border border-line text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-gold/40"
                  />
                  <button
                    onClick={() => salvarPreco(selecionada)}
                    className="px-3 py-2 bg-gold text-white text-sm rounded-md hover:opacity-90"
                  >
                    Salvar
                  </button>
                </div>
                <p className="text-xs text-muted mt-2">
                  Atualizar aqui recalcula o CMV de todas as receitas que usam este ingrediente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoricoSparkline({ historico }) {
  if (!historico.length) return null;
  const valores = historico.map((h) => h.preco);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;
  const pontos = historico
    .map((h, i) => {
      const x = (i / (historico.length - 1 || 1)) * 100;
      const y = 32 - ((h.preco - min) / range) * 28 - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 32" className="w-full h-10">
      <polyline points={pontos} fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NovaMateriaPrimaForm({ categorias, fornecedores, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    codigo: "",
    nome: "",
    categoria_id: categorias[0]?.id || "",
    fornecedor_principal_id: fornecedores[0]?.id || "",
    unidade: "kg",
    preco_atual: "",
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      <h3 className="font-display text-lg mb-3">Nova matéria-prima</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Campo label="Código">
          <input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} className="input" />
        </Campo>
        <Campo label="Nome" className="md:col-span-2">
          <input value={form.nome} onChange={(e) => set("nome", e.target.value)} className="input" />
        </Campo>
        <Campo label="Categoria">
          <select value={form.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} className="input">
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Fornecedor">
          <select value={form.fornecedor_principal_id} onChange={(e) => set("fornecedor_principal_id", e.target.value)} className="input">
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Unidade">
          <select value={form.unidade} onChange={(e) => set("unidade", e.target.value)} className="input">
            {["kg", "g", "L", "ml", "un", "caixa", "pacote", "fardo"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Preço atual (R$)">
          <input value={form.preco_atual} onChange={(e) => set("preco_atual", e.target.value)} className="input" />
        </Campo>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() =>
            onSalvar({ ...form, preco_atual: parseFloat(form.preco_atual.replace(",", ".")) || 0, status: "ativo" })
          }
          className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90"
        >
          Salvar
        </button>
        <button onClick={onCancelar} className="px-4 py-2 border border-line text-sm rounded-md hover:bg-background">
          Cancelar
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid var(--line);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Campo({ label, children, className = "" }) {
  return (
    <label className={`text-xs text-muted ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
