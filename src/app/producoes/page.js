"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatNumber, formatBRL } from "@/lib/calc";

function gerarLinhaId() {
  return `linha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProducoesPage() {
  const { producoes, receitas, funcionarios, adicionarProducao } = useStore();
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
          funcionarios={funcionarios}
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
              <th className="px-5 py-3 font-medium text-right">MOD real (HHT)</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((p) => {
              const diff = (p.quantidade_real || 0) - (p.quantidade_teorica || 0);
              const positivo = diff >= 0;
              const perda = p.perda_percentual ?? (p.quantidade_teorica > 0 ? -(diff / p.quantidade_teorica) * 100 : 0);
              const mod = p.mod || { itens: [], custo_total: 0 };
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
                  <td className="px-5 py-3 text-right">
                    {mod.custo_total > 0 ? (
                      <>
                        <span className="font-mono-num font-medium text-gold">{formatBRL(mod.custo_total)}</span>
                        <p className="text-xs text-muted mt-0.5">
                          {mod.itens.map((i) => `${i.funcao_nome || "—"} (${formatNumber(i.tempo_minutos_real, 0)} min · ${i.quantidade_pessoas}p)`).join(" + ")}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ordenadas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-muted text-sm">
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

function NovaProducaoForm({ receitas, funcionarios, onSalvar, onCancelar }) {
  const [receitaId, setReceitaId] = useState(receitas[0]?.id || "");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [lote, setLote] = useState("");
  const [quantidadeReal, setQuantidadeReal] = useState("");
  const [sobrescreverTeorica, setSobrescreverTeorica] = useState(false);
  const [quantidadeTeorica, setQuantidadeTeorica] = useState("");
  const [pesoUnitario, setPesoUnitario] = useState(() => receitas[0]?.peso_unitario || "");

  const receita = receitas.find((r) => r.id === receitaId);
  const teoricaDaReceita = receita?.rendimento?.quantidade_produzida || 0;

  // MOD real — pré-preenche a LISTA de funções com a mesma quantidade de
  // pessoas estimada na receita (se tiver), mas o tempo real de cada linha
  // fica em branco pra ser preenchido de verdade nesse lote.
  const [modItens, setModItens] = useState(() =>
    (receita?.mod?.itens || []).map((i) => ({
      linha_id: gerarLinhaId(),
      funcao_id: i.funcao_id,
      quantidade_pessoas: i.quantidade_pessoas,
      tempo_minutos_real: "",
    }))
  );

  function num(v) {
    const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function selecionarReceita(id) {
    setReceitaId(id);
    const r = receitas.find((rr) => rr.id === id);
    setPesoUnitario(r?.peso_unitario || "");
    setModItens(
      (r?.mod?.itens || []).map((i) => ({
        linha_id: gerarLinhaId(),
        funcao_id: i.funcao_id,
        quantidade_pessoas: i.quantidade_pessoas,
        tempo_minutos_real: "",
      }))
    );
  }

  function adicionarLinhaMOD() {
    setModItens((prev) => [...prev, { linha_id: gerarLinhaId(), funcao_id: "", quantidade_pessoas: 1, tempo_minutos_real: "" }]);
  }

  function alterarLinhaMOD(linhaId, campo, valor) {
    setModItens((prev) => prev.map((i) => (i.linha_id === linhaId ? { ...i, [campo]: valor } : i)));
  }

  function removerLinhaMOD(linhaId) {
    setModItens((prev) => prev.filter((i) => i.linha_id !== linhaId));
  }

  const funcionariosAtivos = funcionarios.filter((f) => (f.status || "ativo") === "ativo");
  const custoModPreviewTotal = modItens.reduce((soma, item) => {
    const custoHora = funcionarios.find((f) => f.id === item.funcao_id)?.custo_hora || 0;
    return soma + custoHora * num(item.quantidade_pessoas) * (num(item.tempo_minutos_real) / 60);
  }, 0);

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
      mod_itens: modItens.map((i) => ({
        funcao_id: i.funcao_id,
        quantidade_pessoas: num(i.quantidade_pessoas),
        tempo_minutos_real: num(i.tempo_minutos_real),
      })),
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

      <div className="mt-3 pt-3 border-t border-line">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-muted">Mão de obra real (HHT do lote)</p>
          {funcionariosAtivos.length > 0 && (
            <button
              type="button"
              onClick={adicionarLinhaMOD}
              className="text-xs flex items-center gap-1 text-sage hover:underline"
            >
              <Plus size={13} /> Adicionar função
            </button>
          )}
        </div>
        {funcionariosAtivos.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma função cadastrada em Funcionários ainda.</p>
        ) : modItens.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma função adicionada ainda. Clique em "Adicionar função" acima.</p>
        ) : (
          <>
            <div className="space-y-2">
              {modItens.map((item) => (
                <div key={item.linha_id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                  <Campo label="Função responsável">
                    <select
                      value={item.funcao_id}
                      onChange={(e) => alterarLinhaMOD(item.linha_id, "funcao_id", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
                    >
                      <option value="">Selecione...</option>
                      {funcionariosAtivos.map((f) => (
                        <option key={f.id} value={f.id}>{f.funcao}</option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Quantidade de pessoas">
                    <input
                      value={item.quantidade_pessoas}
                      onChange={(e) => alterarLinhaMOD(item.linha_id, "quantidade_pessoas", e.target.value)}
                      placeholder="Ex: 1"
                      className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                    />
                  </Campo>
                  <Campo label="Tempo real (minutos)">
                    <input
                      value={item.tempo_minutos_real}
                      onChange={(e) => alterarLinhaMOD(item.linha_id, "tempo_minutos_real", e.target.value)}
                      placeholder="Ex: 480"
                      className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                    />
                  </Campo>
                  <button
                    type="button"
                    onClick={() => removerLinhaMOD(item.linha_id)}
                    className="text-muted hover:text-brick pb-2.5"
                    aria-label="Remover"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted">
              Custo MOD real desse lote: <span className="font-mono-num font-medium text-gold">{formatBRL(custoModPreviewTotal)}</span>
            </div>
          </>
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
