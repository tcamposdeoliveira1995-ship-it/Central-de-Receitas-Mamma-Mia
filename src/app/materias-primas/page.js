"use client";

import { useMemo, useState } from "react";
import { Search, Plus, TrendingUp, TrendingDown, Star, Tag, Scale, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/calc";

export default function MateriasPrimasPage() {
  const {
    materiasPrimas,
    categorias,
    fornecedores,
    atualizarPrecoMateriaPrima,
    adicionarMateriaPrima,
    adicionarApresentacao,
    definirApresentacaoPadrao,
    removerApresentacao,
    adicionarRendimento,
    definirRendimentoPadrao,
    removerRendimento,
  } = useStore();
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const [novoPreco, setNovoPreco] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  // A matéria-prima selecionada é buscada de novo na lista viva a cada render,
  // pra sempre refletir apresentações/rendimentos recém-adicionados (o objeto
  // capturado em setSelecionada(mp) fica parado no tempo).
  const selecionadaAtual = selecionada
    ? materiasPrimas.find((mp) => mp.id === selecionada.id) || selecionada
    : null;

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
          {!selecionadaAtual ? (
            <p className="text-sm text-muted">Selecione uma matéria-prima para ver o histórico de preços.</p>
          ) : (
            <div>
              <p className="text-xs font-mono-num text-muted">{selecionadaAtual.codigo}</p>
              <h3 className="font-display text-xl mt-0.5">{selecionadaAtual.nome}</h3>
              <p className="text-sm text-muted mt-0.5">{fornecedorNome(selecionadaAtual.fornecedor_principal_id)}</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-3xl font-mono-num">{formatBRL(selecionadaAtual.preco_atual)}</span>
                <span className="text-xs text-muted">/ {selecionadaAtual.unidade}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="flex items-center gap-1.5 text-sage">
                  <TrendingDown size={14} /> Mín. {formatBRL(selecionadaAtual.preco_minimo)}
                </div>
                <div className="flex items-center gap-1.5 text-brick">
                  <TrendingUp size={14} /> Máx. {formatBRL(selecionadaAtual.preco_maximo)}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Histórico</p>
                <HistoricoSparkline historico={selecionadaAtual.historico || []} />
                <ul className="mt-2 space-y-1">
                  {(selecionadaAtual.historico || []).map((h, i) => (
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
                    onClick={() => salvarPreco(selecionadaAtual)}
                    className="px-3 py-2 bg-gold text-white text-sm rounded-md hover:opacity-90"
                  >
                    Salvar
                  </button>
                </div>
                <p className="text-xs text-muted mt-2">
                  Atualizar aqui recalcula o CMV de todas as receitas que usam este ingrediente.
                </p>
              </div>

              <ApresentacoesSecao
                mp={selecionadaAtual}
                onAdicionar={(dados) => adicionarApresentacao(selecionadaAtual.id, dados)}
                onDefinirPadrao={(id) => definirApresentacaoPadrao(selecionadaAtual.id, id)}
                onRemover={(id) => removerApresentacao(selecionadaAtual.id, id)}
              />

              <RendimentosSecao
                mp={selecionadaAtual}
                onAdicionar={(dados) => adicionarRendimento(selecionadaAtual.id, dados)}
                onDefinirPadrao={(id) => definirRendimentoPadrao(selecionadaAtual.id, id)}
                onRemover={(id) => removerRendimento(selecionadaAtual.id, id)}
              />
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

// ── APRESENTAÇÃO DA MATÉRIA-PRIMA ────────────────────────────────

const UNIDADES_APRESENTACAO = ["g", "kg", "ml", "un"];

function ApresentacoesSecao({ mp, onAdicionar, onDefinirPadrao, onRemover }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const apresentacoes = mp.apresentacoes || [];

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted flex items-center gap-1.5">
          <Tag size={13} /> Apresentações (forma de uso)
        </p>
        <button onClick={() => setMostrarForm((v) => !v)} className="text-xs text-sage hover:underline flex items-center gap-1">
          <Plus size={12} /> Nova
        </button>
      </div>

      {apresentacoes.length === 0 && !mostrarForm && (
        <p className="text-xs text-muted">
          Nenhuma apresentação cadastrada ainda — ex: Fatia, Ralado, Triturado.
        </p>
      )}

      <ul className="space-y-1.5">
        {apresentacoes.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm bg-background/60 rounded-md px-2.5 py-1.5">
            <span className="flex items-center gap-1.5">
              <button
                onClick={() => !a.e_padrao && onDefinirPadrao(a.id)}
                title={a.e_padrao ? "Padrão desta matéria-prima" : "Definir como padrão"}
                className={a.e_padrao ? "text-gold" : "text-muted hover:text-gold"}
              >
                <Star size={13} fill={a.e_padrao ? "currentColor" : "none"} />
              </button>
              {a.forma}
              {a.peso_referencia ? (
                <span className="text-xs text-muted font-mono-num">
                  ({a.peso_referencia}
                  {a.unidade}/un)
                </span>
              ) : null}
            </span>
            <button onClick={() => onRemover(a.id)} className="text-muted hover:text-brick">
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      {mostrarForm && (
        <NovaApresentacaoForm
          onSalvar={(dados) => {
            onAdicionar(dados);
            setMostrarForm(false);
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}
    </div>
  );
}

function NovaApresentacaoForm({ onSalvar, onCancelar }) {
  const [forma, setForma] = useState("");
  const [unidade, setUnidade] = useState("g");
  const [pesoReferencia, setPesoReferencia] = useState("");
  const [custoEspecifico, setCustoEspecifico] = useState("");
  const [ehPadrao, setEhPadrao] = useState(false);

  function salvar() {
    if (!forma.trim()) return;
    onSalvar({
      forma: forma.trim(),
      unidade,
      peso_referencia: pesoReferencia ? parseFloat(pesoReferencia.replace(",", ".")) : "",
      custo_especifico: custoEspecifico ? parseFloat(custoEspecifico.replace(",", ".")) : "",
      e_padrao: ehPadrao,
      ativo: true,
    });
  }

  return (
    <div className="mt-3 bg-background/60 rounded-md p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Forma/corte">
          <input value={forma} onChange={(e) => setForma(e.target.value)} placeholder="Fatia, Ralado..." className="input" />
        </Campo>
        <Campo label="Unidade">
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="input">
            {UNIDADES_APRESENTACAO.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Peso de 1 unidade (opcional)">
          <input value={pesoReferencia} onChange={(e) => setPesoReferencia(e.target.value)} placeholder="Ex: 20" className="input" />
        </Campo>
        <Campo label="Custo específico (opcional)">
          <input value={custoEspecifico} onChange={(e) => setCustoEspecifico(e.target.value)} placeholder="R$" className="input" />
        </Campo>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input type="checkbox" checked={ehPadrao} onChange={(e) => setEhPadrao(e.target.checked)} />
        Definir como apresentação padrão
      </label>
      <div className="flex gap-2">
        <button onClick={salvar} className="px-3 py-1.5 bg-sage text-white text-xs rounded-md hover:opacity-90">
          Salvar
        </button>
        <button onClick={onCancelar} className="px-3 py-1.5 border border-line text-xs rounded-md hover:bg-background">
          Cancelar
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.4rem 0.6rem;
          border-radius: 0.375rem;
          border: 1px solid var(--line);
          font-size: 0.8125rem;
        }
      `}</style>
    </div>
  );
}

// ── RENDIMENTO (FATOR DE CORREÇÃO / COCÇÃO) ──────────────────────

const TIPOS_COCCAO = ["N/A", "Assado", "Cozido", "Frito", "Grelhado"];

function RendimentosSecao({ mp, onAdicionar, onDefinirPadrao, onRemover }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const apresentacoes = mp.apresentacoes || [];
  const rendimentos = mp.rendimentos || [];

  const nomeApresentacao = (id) => apresentacoes.find((a) => a.id === id)?.forma || "—";

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted flex items-center gap-1.5">
          <Scale size={13} /> Rendimento (fator de correção/cocção)
        </p>
        {apresentacoes.length > 0 && (
          <button onClick={() => setMostrarForm((v) => !v)} className="text-xs text-sage hover:underline flex items-center gap-1">
            <Plus size={12} /> Novo teste
          </button>
        )}
      </div>

      {apresentacoes.length === 0 && (
        <p className="text-xs text-muted">Cadastre ao menos uma Apresentação acima antes de testar o rendimento.</p>
      )}

      {apresentacoes.length > 0 && rendimentos.length === 0 && !mostrarForm && (
        <p className="text-xs text-muted">Nenhum teste de rendimento cadastrado ainda.</p>
      )}

      <ul className="space-y-2">
        {rendimentos.map((r) => (
          <li key={r.id} className="text-sm bg-background/60 rounded-md px-2.5 py-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <button
                  onClick={() => !r.e_padrao && onDefinirPadrao(r.id)}
                  title={r.e_padrao ? "Padrão para esta apresentação" : "Definir como padrão"}
                  className={r.e_padrao ? "text-gold" : "text-muted hover:text-gold"}
                >
                  <Star size={13} fill={r.e_padrao ? "currentColor" : "none"} />
                </button>
                {nomeApresentacao(r.apresentacao_id)}
              </span>
              <button onClick={() => onRemover(r.id)} className="text-muted hover:text-brick">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted font-mono-num">
              <span>FC: {r.fator_correcao}</span>
              <span>FCoc: {r.fator_coccao} ({r.tipo_coccao})</span>
              <span>Custo/kg líquido: {formatBRL(r.custo_real_kg_liquido)}</span>
              <span>Custo/kg cozido: {formatBRL(r.custo_real_kg_cozido)}</span>
              {!!r.quantidade_unidades && (
                <>
                  <span>Peso/unidade líquido: {formatNumeroG_(r.peso_unidade_liquido)}</span>
                  <span>Peso/unidade cozido: {formatNumeroG_(r.peso_unidade_cozido)}</span>
                </>
              )}
            </div>
            {r.observacoes && <p className="text-xs text-muted mt-1">{r.observacoes}</p>}
            {!!r.quantidade_unidades && r.peso_unidade_cozido > 0 && (
              <CalculadoraKgParaUnidades pesoUnidadeKg={r.peso_unidade_cozido} rotulo={nomeApresentacao(r.apresentacao_id)} />
            )}
          </li>
        ))}
      </ul>

      {mostrarForm && (
        <NovoRendimentoForm
          apresentacoes={apresentacoes}
          onSalvar={(dados) => {
            onAdicionar(dados);
            setMostrarForm(false);
          }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}
    </div>
  );
}

function formatNumeroG_(pesoKg) {
  if (!pesoKg) return "—";
  return pesoKg < 1 ? `${(pesoKg * 1000).toFixed(1)}g` : `${pesoKg.toFixed(3)}kg`;
}

function CalculadoraKgParaUnidades({ pesoUnidadeKg, rotulo }) {
  const [pesoTotal, setPesoTotal] = useState("");
  const total = parseFloat(String(pesoTotal).replace(",", ".")) || 0;
  const unidades = pesoUnidadeKg > 0 ? total / pesoUnidadeKg : 0;

  return (
    <div className="mt-2 flex items-center gap-2 text-xs bg-surface rounded-md px-2 py-1.5 border border-line">
      <span className="text-muted whitespace-nowrap">Eu fiz</span>
      <input
        value={pesoTotal}
        onChange={(e) => setPesoTotal(e.target.value)}
        placeholder="Ex: 6"
        className="w-16 px-1.5 py-0.5 border border-line rounded text-xs font-mono-num"
      />
      <span className="text-muted whitespace-nowrap">kg de {rotulo} =</span>
      <span className="font-mono-num font-medium text-sage">
        {total > 0 ? Math.round(unidades) : "—"} un
      </span>
    </div>
  );
}

function NovoRendimentoForm({ apresentacoes, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    apresentacao_id: apresentacoes[0]?.id || "",
    peso_bruto: "",
    peso_liquido: "",
    tipo_coccao: "N/A",
    peso_pos_coccao: "",
    preco_compra_kg_bruto: "",
    quantidade_unidades: "",
    responsavel_teste: "",
    observacoes: "",
    e_padrao: false,
  });
  const [precoPorUnidade, setPrecoPorUnidade] = useState("");

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function numero(v) {
    return parseFloat(String(v).replace(",", ".")) || 0;
  }

  function salvar() {
    if (!form.apresentacao_id || !form.peso_liquido) return;
    onSalvar({
      ...form,
      peso_bruto: numero(form.peso_bruto),
      peso_liquido: numero(form.peso_liquido),
      peso_pos_coccao: numero(form.peso_pos_coccao),
      preco_compra_kg_bruto: numero(form.preco_compra_kg_bruto),
      quantidade_unidades: numero(form.quantidade_unidades),
    });
  }

  return (
    <div className="mt-3 bg-background/60 rounded-md p-3 space-y-2">
      <Campo label="Apresentação">
        <select value={form.apresentacao_id} onChange={(e) => set("apresentacao_id", e.target.value)} className="input">
          {apresentacoes.map((a) => (
            <option key={a.id} value={a.id}>{a.forma}</option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Peso bruto (kg, como comprado)">
          <input value={form.peso_bruto} onChange={(e) => set("peso_bruto", e.target.value)} placeholder="Ex: 10" className="input" />
        </Campo>
        <Campo label="Peso líquido (kg, após limpeza)">
          <input value={form.peso_liquido} onChange={(e) => set("peso_liquido", e.target.value)} placeholder="Ex: 9,5" className="input" />
        </Campo>
        <Campo label="Tipo de cocção">
          <select value={form.tipo_coccao} onChange={(e) => set("tipo_coccao", e.target.value)} className="input">
            {TIPOS_COCCAO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Peso pós-cocção (kg)">
          <input
            value={form.peso_pos_coccao}
            onChange={(e) => set("peso_pos_coccao", e.target.value)}
            placeholder={form.tipo_coccao === "N/A" ? "não se aplica" : "Ex: 9,0"}
            disabled={form.tipo_coccao === "N/A"}
            className="input disabled:opacity-50"
          />
        </Campo>
        <Campo label="Preço de compra (R$/kg bruto)">
          <input
            value={form.preco_compra_kg_bruto}
            onChange={(e) => set("preco_compra_kg_bruto", e.target.value)}
            placeholder="R$"
            className="input"
          />
        </Campo>
        <Campo label="ou: preço por unidade comprada (R$)">
          <input
            value={precoPorUnidade}
            onChange={(e) => {
              const valor = e.target.value;
              setPrecoPorUnidade(valor);
              const pesoBrutoKg = numero(form.peso_bruto);
              if (pesoBrutoKg > 0 && valor !== "") {
                set("preco_compra_kg_bruto", (numero(valor) / pesoBrutoKg).toFixed(4));
              }
            }}
            placeholder="Ex: 0,67 (calcula o R$/kg sozinho)"
            disabled={!numero(form.peso_bruto)}
            className="input disabled:opacity-50"
          />
          {!numero(form.peso_bruto) && (
            <p className="text-[11px] text-muted mt-0.5">preenche o peso bruto primeiro</p>
          )}
          {numero(form.peso_bruto) > 0 && precoPorUnidade !== "" && (
            <p className="text-[11px] text-sage mt-0.5">
              = R$ {(numero(precoPorUnidade) / numero(form.peso_bruto)).toFixed(2)}/kg
            </p>
          )}
        </Campo>
        <Campo label="Responsável pelo teste">
          <input value={form.responsavel_teste} onChange={(e) => set("responsavel_teste", e.target.value)} className="input" />
        </Campo>
        <Campo label="Quantas unidades foram pesadas nesse teste?">
          <input
            value={form.quantidade_unidades}
            onChange={(e) => set("quantidade_unidades", e.target.value)}
            placeholder="Ex: 1 (deixa em branco se não vende por unidade)"
            className="input"
          />
        </Campo>
      </div>
      <Campo label="Observações">
        <input value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Ex: perda de osso e pele" className="input" />
      </Campo>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input type="checkbox" checked={form.e_padrao} onChange={(e) => set("e_padrao", e.target.checked)} />
        Definir como rendimento padrão desta apresentação
      </label>
      <div className="flex gap-2">
        <button onClick={salvar} className="px-3 py-1.5 bg-sage text-white text-xs rounded-md hover:opacity-90">
          Salvar
        </button>
        <button onClick={onCancelar} className="px-3 py-1.5 border border-line text-xs rounded-md hover:bg-background">
          Cancelar
        </button>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.4rem 0.6rem;
          border-radius: 0.375rem;
          border: 1px solid var(--line);
          font-size: 0.8125rem;
        }
      `}</style>
    </div>
  );
}
