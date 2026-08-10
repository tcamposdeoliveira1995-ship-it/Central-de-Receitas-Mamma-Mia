"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ChevronRight, Trash2, Save, Check, Loader2, Layers, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { custoPorKgReceita, formatBRL } from "@/lib/calc";

const TIPOS_EMBALAGEM = ["PCT", "CX", "UN", "KG"];

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function produtoVazio() {
  return {
    codigo: "",
    nome_produto: "",
    tipo_embalagem: "PCT",
    codigo_barras: "",
    ncm: "",
    cest: "",
    departamento: "",
    secao: "",
    categoria: "",
    peso_liquido: "",
    peso_bruto: "",
    validade_dias: "",
    status: "rascunho",
  };
}

export default function ProdutosPage() {
  const { produtos, criarProduto } = useStore();
  const [selecionadoId, setSelecionadoId] = useState(produtos[0]?.id ?? null);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState(produtoVazio());
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const selecionado = produtos.find((p) => p.id === selecionadoId);

  const produtosFiltrados = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);
    return [...produtos]
      .filter(
        (p) =>
          !buscaNormalizada ||
          normalizarTexto(p.nome_produto).includes(buscaNormalizada) ||
          normalizarTexto(p.codigo).includes(buscaNormalizada)
      )
      .sort((a, b) => (a.nome_produto || "").localeCompare(b.nome_produto || "", "pt-BR", { sensitivity: "base" }));
  }, [produtos, busca]);

  async function salvarNovoProduto() {
    if (!novo.codigo.trim() || !novo.nome_produto.trim()) return;
    setSalvandoNovo(true);
    try {
      const criado = await criarProduto(novo);
      setSelecionadoId(criado.id);
      setNovo(produtoVazio());
      setCriando(false);
    } finally {
      setSalvandoNovo(false);
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 7</p>
          <h1 className="font-display text-3xl mt-1">Produtos</h1>
          <p className="text-sm text-muted mt-1">
            Produto final independente das receitas — pode combinar mais de uma (ex: massa + recheio),
            cada uma com sua quantidade em kg. O CMV vem da soma dessa composição.
          </p>
        </div>
        <button
          onClick={() => setCriando((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Novo produto
        </button>
      </header>

      {criando && (
        <div className="bg-surface border border-line rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Código
            <input
              value={novo.codigo}
              onChange={(e) => setNovo((n) => ({ ...n, codigo: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-32"
              placeholder="Ex: 1223"
            />
          </label>
          <label className="text-xs text-muted">
            Nome do produto
            <input
              value={novo.nome_produto}
              onChange={(e) => setNovo((n) => ({ ...n, nome_produto: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-64"
              placeholder="Ex: (A) BAURU 160G"
            />
          </label>
          <label className="text-xs text-muted">
            Embalagem
            <select
              value={novo.tipo_embalagem}
              onChange={(e) => setNovo((n) => ({ ...n, tipo_embalagem: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm"
            >
              {TIPOS_EMBALAGEM.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <button
            onClick={salvarNovoProduto}
            disabled={salvandoNovo}
            className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {salvandoNovo ? "Criando..." : "Criar"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <div className="p-3 border-b border-line relative">
            <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-line text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <ul>
            {produtosFiltrados.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelecionadoId(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left border-b border-line last:border-0 hover:bg-gold-soft/30 ${
                    selecionadoId === p.id ? "bg-gold-soft/50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{p.nome_produto || "(sem nome)"}</p>
                    <p className="text-xs text-muted font-mono-num">{p.codigo}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>
              </li>
            ))}
            {produtosFiltrados.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted">
                {busca ? "Nenhum produto encontrado com essa busca." : "Nenhum produto cadastrado ainda."}
              </li>
            )}
          </ul>
        </div>

        <div className="lg:col-span-2">
          {selecionado ? (
            <ProdutoDetalhe produto={selecionado} />
          ) : (
            <div className="bg-surface border border-line rounded-lg p-8 text-center text-sm text-muted">
              Selecione ou crie um produto.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProdutoDetalhe({ produto }) {
  const { atualizarDadosProduto, removerProduto } = useStore();
  const [campos, setCampos] = useState(() => ({ ...produtoVazio(), ...produto }));
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvoDados, setSalvoDados] = useState(false);

  // Sincroniza quando troca de produto selecionado
  useMemo(() => {
    setCampos({ ...produtoVazio(), ...produto });
    setSalvoDados(false);
  }, [produto.id]);

  function set(campo, valor) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setSalvoDados(false);
  }

  async function salvarDados() {
    setSalvandoDados(true);
    try {
      await atualizarDadosProduto(produto.id, {
        ...campos,
        peso_liquido: parseFloat(campos.peso_liquido) || 0,
        peso_bruto: parseFloat(campos.peso_bruto) || 0,
      });
      setSalvoDados(true);
    } finally {
      setSalvandoDados(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir o produto "${produto.nome_produto}"? Essa ação não pode ser desfeita.`)) return;
    await removerProduto(produto.id);
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line rounded-lg p-5">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono-num text-muted">{produto.codigo}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="font-display text-2xl">{produto.nome_produto || "(sem nome)"}</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-sage-soft text-sage font-medium capitalize">
                {(produto.status || "rascunho").replace("_", " ")}
              </span>
            </div>
          </div>
          <button
            onClick={excluir}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line text-brick hover:bg-brick/5"
          >
            <Trash2 size={13} /> Excluir produto
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <Campo label="Código" value={campos.codigo} onChange={(v) => set("codigo", v)} />
          <Campo label="Nome do produto" value={campos.nome_produto} onChange={(v) => set("nome_produto", v)} className="col-span-2 sm:col-span-1" />
          <CampoSelect label="Embalagem" value={campos.tipo_embalagem} onChange={(v) => set("tipo_embalagem", v)} opcoes={TIPOS_EMBALAGEM} />
          <Campo label="Código de barras (EAN)" value={campos.codigo_barras} onChange={(v) => set("codigo_barras", v)} />
          <Campo label="NCM" value={campos.ncm} onChange={(v) => set("ncm", v)} />
          <Campo label="CEST" value={campos.cest} onChange={(v) => set("cest", v)} />
          <Campo label="Departamento" value={campos.departamento} onChange={(v) => set("departamento", v)} />
          <Campo label="Seção" value={campos.secao} onChange={(v) => set("secao", v)} />
          <Campo label="Categoria" value={campos.categoria} onChange={(v) => set("categoria", v)} />
          <Campo label="Peso líquido (g)" value={campos.peso_liquido} onChange={(v) => set("peso_liquido", v)} tipo="number" />
          <Campo label="Peso bruto (g)" value={campos.peso_bruto} onChange={(v) => set("peso_bruto", v)} tipo="number" />
          <Campo label="Validade (dias)" value={campos.validade_dias} onChange={(v) => set("validade_dias", v)} tipo="number" />
          <CampoSelect label="Status" value={campos.status} onChange={(v) => set("status", v)} opcoes={["rascunho", "ativo"]} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={salvarDados}
            disabled={salvandoDados}
            className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {salvandoDados ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar dados
          </button>
          {salvoDados && (
            <span className="text-sm text-sage flex items-center gap-1">
              <Check size={14} /> Salvo
            </span>
          )}
        </div>
      </div>

      <Composicao produto={produto} />
    </div>
  );
}

function Composicao({ produto }) {
  const { receitas, receitasById, materiasPrimasById, atualizarComposicaoProduto } = useStore();
  const [itens, setItens] = useState(() => produto.composicao || []);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useMemo(() => {
    setItens(produto.composicao || []);
    setSalvo(false);
  }, [produto.id]);

  const receitasOrdenadas = useMemo(
    () => [...receitas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [receitas]
  );

  const linhasComCusto = useMemo(
    () =>
      itens.map((item) => {
        const receita = receitasById[item.receita_id];
        const custoPorKg = receita ? custoPorKgReceita(receita, receitasById, materiasPrimasById) : 0;
        const quantidade = parseFloat(item.quantidade) || 0;
        return { ...item, receita, custoPorKg, custoLinha: custoPorKg * quantidade };
      }),
    [itens, receitasById, materiasPrimasById]
  );

  const cmvTotal = linhasComCusto.reduce((soma, l) => soma + l.custoLinha, 0);

  function adicionarLinha() {
    setItens((prev) => [...prev, { receita_id: receitasOrdenadas[0]?.id || "", quantidade: 0, observacao: "" }]);
    setSalvo(false);
  }

  function alterarLinha(idx, campo, valor) {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)));
    setSalvo(false);
  }

  function removerLinha(idx) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
    setSalvo(false);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarComposicaoProduto(
        produto.id,
        itens.map((i) => ({ ...i, quantidade: parseFloat(i.quantidade) || 0 }))
      );
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers size={16} className="text-gold" />
          Composição (receitas usadas nesse produto)
        </div>
        <button
          type="button"
          onClick={adicionarLinha}
          className="flex items-center gap-1.5 text-xs bg-sage-soft text-sage px-3 py-1.5 rounded-md hover:opacity-90"
        >
          <Plus size={13} /> Adicionar receita
        </button>
      </div>

      {linhasComCusto.length === 0 && (
        <p className="text-sm text-muted py-4 text-center">
          Nenhuma receita adicionada ainda. Clique em "Adicionar receita".
        </p>
      )}

      {linhasComCusto.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="py-2 font-medium">Receita</th>
                <th className="py-2 font-medium text-right">Quantidade (kg)</th>
                <th className="py-2 font-medium text-right">Custo/kg</th>
                <th className="py-2 font-medium text-right">Custo da linha</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {linhasComCusto.map((linha, idx) => (
                <tr key={idx} className="border-b border-line last:border-0">
                  <td className="py-2 pr-2">
                    <select
                      value={linha.receita_id}
                      onChange={(e) => alterarLinha(idx, "receita_id", e.target.value)}
                      className="px-2 py-1.5 rounded-md border border-line text-sm w-full"
                    >
                      {receitasOrdenadas.map((r) => (
                        <option key={r.id} value={r.id}>{r.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={linha.quantidade}
                      onChange={(e) => alterarLinha(idx, "quantidade", e.target.value)}
                      className="px-2 py-1.5 rounded-md border border-line text-sm w-24 text-right font-mono-num"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right font-mono-num text-muted">
                    {linha.receita ? `${formatBRL(linha.custoPorKg)}/kg` : "—"}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono-num font-medium">{formatBRL(linha.custoLinha)}</td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => removerLinha(idx)} className="text-muted hover:text-brick p-1">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">CMV do produto</span>
          <span className="font-display text-xl font-mono-num text-gold">{formatBRL(cmvTotal)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar composição
          </button>
          {salvo && (
            <span className="text-sm text-sage flex items-center gap-1">
              <Check size={14} /> Salvo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, tipo = "text", className = "" }) {
  return (
    <label className={`text-xs text-muted block ${className}`}>
      {label}
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm"
      />
    </label>
  );
}

function CampoSelect({ label, value, onChange, opcoes }) {
  return (
    <label className="text-xs text-muted block">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm capitalize"
      >
        {opcoes.map((o) => (
          <option key={o} value={o} className="capitalize">{o}</option>
        ))}
      </select>
    </label>
  );
}
