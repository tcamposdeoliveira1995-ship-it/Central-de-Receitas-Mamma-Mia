"use client";

import { useMemo, useState } from "react";
import { Search, Plus, TrendingUp, TrendingDown, ChevronDown, ChevronRight as ChevronRightIcon, Flame } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatBRL, formatNumber } from "@/lib/calc";

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
          <div className="overflow-x-auto">
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

              <ApresentacoesPainel mp={selecionada} />
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

// Apresentações são "cortes/formas" de uma matéria-prima (ex: Frango — Peito,
// Frango — Coxa) e cada uma pode ter um ou mais testes de Rendimento (peso
// bruto → líquido → cozido), que calculam o custo real por kg útil — já
// embutindo a perda de limpeza/cocção, em vez do preço de compra bruto.
function ApresentacoesPainel({ mp }) {
  const { adicionarApresentacao, adicionarRendimentoMP } = useStore();
  const [criando, setCriando] = useState(false);
  const [nomeApr, setNomeApr] = useState("");
  const [pesoRefApr, setPesoRefApr] = useState("");
  const [expandidaId, setExpandidaId] = useState(null);

  const apresentacoes = mp.apresentacoes || [];

  async function criarApresentacao() {
    if (!nomeApr.trim()) return;
    const nova = await adicionarApresentacao(mp.id, {
      nome: nomeApr,
      unidade: "un",
      peso_referencia: parseFloat(pesoRefApr.replace(",", ".")) || 0,
      e_padrao: apresentacoes.length === 0,
    });
    setNomeApr("");
    setPesoRefApr("");
    setCriando(false);
    setExpandidaId(nova.id);
  }

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted">Apresentações e rendimento</p>
        <button onClick={() => setCriando((v) => !v)} className="text-xs text-sage hover:underline flex items-center gap-1">
          <Plus size={12} /> Nova apresentação
        </button>
      </div>
      <p className="text-xs text-muted mb-3">
        Cadastre cortes/formas (ex: "Peito", "Cubos") e teste o rendimento de limpeza/cocção — o CMV das receitas
        passa a usar o custo real por kg útil em vez do preço de compra bruto.
      </p>

      {criando && (
        <div className="border border-line rounded-md p-3 mb-3 space-y-2">
          <Campo label="Nome da apresentação">
            <input
              value={nomeApr}
              onChange={(e) => setNomeApr(e.target.value)}
              placeholder="Ex: Cubos, Peito, Filé"
              className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
            />
          </Campo>
          <Campo label="Peso de referência por unidade, em kg (opcional — só se essa mp for usada em receitas por 'un')">
            <input
              value={pesoRefApr}
              onChange={(e) => setPesoRefApr(e.target.value)}
              placeholder="Ex: 0,35"
              className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
            />
          </Campo>
          <div className="flex gap-2">
            <button onClick={criarApresentacao} className="text-xs px-3 py-1.5 bg-sage text-white rounded-md hover:opacity-90">
              Salvar
            </button>
            <button onClick={() => setCriando(false)} className="text-xs px-3 py-1.5 border border-line rounded-md">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {apresentacoes.length === 0 && !criando && (
        <p className="text-xs text-muted italic">Nenhuma apresentação cadastrada ainda.</p>
      )}

      <div className="space-y-2">
        {apresentacoes.map((apr) => (
          <ApresentacaoCard
            key={apr.id}
            mp={mp}
            apresentacao={apr}
            expandida={expandidaId === apr.id}
            onToggle={() => setExpandidaId((prev) => (prev === apr.id ? null : apr.id))}
            onAdicionarRendimento={(dados) => adicionarRendimentoMP(mp.id, { apresentacao_id: apr.id, ...dados })}
          />
        ))}
      </div>
    </div>
  );
}

function ApresentacaoCard({ mp, apresentacao, expandida, onToggle, onAdicionarRendimento }) {
  const rendimentos = (mp.rendimentos || []).filter((r) => r.apresentacao_id === apresentacao.id);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    peso_bruto: "",
    peso_liquido: "",
    peso_cozido: "",
    tipo_coccao: "N/A",
    preco_compra_kg: mp.preco_atual || 0,
    e_padrao: rendimentos.length === 0,
  });

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar() {
    const pesoBruto = parseFloat(String(form.peso_bruto).replace(",", "."));
    const pesoLiquido = parseFloat(String(form.peso_liquido).replace(",", "."));
    if (!pesoBruto || !pesoLiquido) return;
    await onAdicionarRendimento({
      peso_bruto: pesoBruto,
      peso_liquido: pesoLiquido,
      peso_cozido: parseFloat(String(form.peso_cozido).replace(",", ".")) || 0,
      tipo_coccao: form.tipo_coccao,
      preco_compra_kg: parseFloat(String(form.preco_compra_kg).replace(",", ".")) || 0,
      e_padrao: form.e_padrao,
    });
    setForm({ peso_bruto: "", peso_liquido: "", peso_cozido: "", tipo_coccao: "N/A", preco_compra_kg: mp.preco_atual || 0, e_padrao: false });
    setMostrarForm(false);
  }

  return (
    <div className="border border-line rounded-md overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gold-soft/20">
        <span className="flex items-center gap-1.5">
          {expandida ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
          {apresentacao.nome}
          {apresentacao.peso_referencia > 0 && (
            <span className="text-xs text-muted">({formatNumber(apresentacao.peso_referencia, 3)} kg/un)</span>
          )}
        </span>
        <span className="text-xs text-muted">{rendimentos.length} teste{rendimentos.length !== 1 ? "s" : ""}</span>
      </button>

      {expandida && (
        <div className="px-3 pb-3 border-t border-line">
          {rendimentos.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs py-2 border-b border-line last:border-0">
              <div className="text-muted">
                {r.data} · bruto {formatNumber(r.peso_bruto, 2)}kg → líquido {formatNumber(r.peso_liquido, 2)}kg
                {r.peso_cozido > 0 && <> → cozido {formatNumber(r.peso_cozido, 2)}kg ({r.tipo_coccao})</>}
                {r.e_padrao && <span className="ml-1.5 text-sage font-medium">· padrão</span>}
              </div>
              <div className="text-right font-mono-num">
                <div>líq. {formatBRL(r.custo_real_kg_liquido)}/kg</div>
                {r.custo_real_kg_cozido > 0 && (
                  <div className="text-brick flex items-center gap-1 justify-end">
                    <Flame size={11} /> cozido {formatBRL(r.custo_real_kg_cozido)}/kg
                  </div>
                )}
              </div>
            </div>
          ))}

          {mostrarForm ? (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Peso bruto (kg)">
                  <input value={form.peso_bruto} onChange={(e) => set("peso_bruto", e.target.value)} className="w-full px-2 py-1 border border-line rounded-md text-sm font-mono-num" />
                </Campo>
                <Campo label="Peso líquido/cru (kg)">
                  <input value={form.peso_liquido} onChange={(e) => set("peso_liquido", e.target.value)} className="w-full px-2 py-1 border border-line rounded-md text-sm font-mono-num" />
                </Campo>
                <Campo label="Peso cozido (kg, opcional)">
                  <input value={form.peso_cozido} onChange={(e) => set("peso_cozido", e.target.value)} className="w-full px-2 py-1 border border-line rounded-md text-sm font-mono-num" />
                </Campo>
                <Campo label="Tipo de cocção">
                  <select value={form.tipo_coccao} onChange={(e) => set("tipo_coccao", e.target.value)} className="w-full px-2 py-1 border border-line rounded-md text-sm">
                    {["N/A", "assado", "frito", "cozido", "grelhado"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Preço de compra usado (R$/kg)">
                  <input value={form.preco_compra_kg} onChange={(e) => set("preco_compra_kg", e.target.value)} className="w-full px-2 py-1 border border-line rounded-md text-sm font-mono-num" />
                </Campo>
                <label className="text-xs text-muted flex items-center gap-1.5 mt-4">
                  <input type="checkbox" checked={form.e_padrao} onChange={(e) => set("e_padrao", e.target.checked)} />
                  Usar como padrão
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={salvar} className="text-xs px-3 py-1.5 bg-sage text-white rounded-md hover:opacity-90">
                  Salvar teste
                </button>
                <button onClick={() => setMostrarForm(false)} className="text-xs px-3 py-1.5 border border-line rounded-md">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setMostrarForm(true)} className="text-xs text-sage hover:underline mt-2 flex items-center gap-1">
              <Plus size={12} /> Novo teste de rendimento
            </button>
          )}
        </div>
      )}
    </div>
  );
}
