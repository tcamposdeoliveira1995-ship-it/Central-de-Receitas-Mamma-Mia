"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ChevronRight, Trash2, Save, Check, Loader2, Layers, X, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
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

// Normaliza o CABEÇALHO da planilha só pra CASAR com um dos nomes conhecidos
// (maiúsculo, sem acento, sem espaço/underscore) — assim "COD_PRODUTO",
// "Cod Produto" e "codproduto" batem tudo igual, sem depender da grafia
// exata que o sistema da empresa exportar.
function normalizarCabecalho(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Cada campo do Produto aceita mais de um nome possível de coluna — cobre
// as variações mais comuns de export de ERP (com/sem underscore, abreviado).
const ALIASES_COLUNAS = {
  codigo: ["CODPRODUTO", "CODIGO", "COD"],
  nome_produto: ["DESCPRODUTO", "DESCRICAOPRODUTO", "DESCRICAO", "DESC"],
  departamento: ["DEPARTAMENTO", "DEPARTAMENT", "DEPTO"],
  secao: ["SECAO"],
  categoria: ["CATEGORIA"],
  ncm: ["NCM"],
  codigo_barras: ["CODBARRA", "CODBARRAS", "CODIGOBARRAS", "EAN", "CODIGODEBARRAS"],
  cest: ["CODCEST", "CEST"],
};

function mapearLinhaPlanilha(linhaObj) {
  const porChaveNormalizada = {};
  Object.keys(linhaObj).forEach((k) => {
    porChaveNormalizada[normalizarCabecalho(k)] = linhaObj[k];
  });

  function buscar(aliases) {
    for (const alias of aliases) {
      const valor = porChaveNormalizada[alias];
      if (valor !== undefined && valor !== null && String(valor).trim() !== "") return String(valor).trim();
    }
    return "";
  }

  return {
    codigo: buscar(ALIASES_COLUNAS.codigo),
    nome_produto: buscar(ALIASES_COLUNAS.nome_produto),
    tipo_embalagem: "PCT",
    codigo_barras: buscar(ALIASES_COLUNAS.codigo_barras),
    ncm: buscar(ALIASES_COLUNAS.ncm),
    cest: buscar(ALIASES_COLUNAS.cest),
    departamento: buscar(ALIASES_COLUNAS.departamento),
    secao: buscar(ALIASES_COLUNAS.secao),
    categoria: buscar(ALIASES_COLUNAS.categoria),
    peso_liquido: "",
    peso_bruto: "",
    validade_dias: "",
    status: "rascunho",
  };
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
  const [importando, setImportando] = useState(false);

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

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setImportando((v) => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-line hover:bg-gold-soft/30"
        >
          <FileSpreadsheet size={14} /> Importar planilha
        </button>
      </div>

      {importando && (
        <ImportarProdutosPlanilha produtosExistentes={produtos} onFechar={() => setImportando(false)} onImportado={(id) => setSelecionadoId(id)} />
      )}

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

function ImportarProdutosPlanilha({ produtosExistentes, onFechar, onImportado }) {
  const { criarProduto } = useStore();
  const [arquivo, setArquivo] = useState(null);
  const [linhasMapeadas, setLinhasMapeadas] = useState([]);
  const [erroLeitura, setErroLeitura] = useState("");
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);

  const codigosExistentes = useMemo(() => new Set(produtosExistentes.map((p) => p.codigo)), [produtosExistentes]);

  async function handleArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroLeitura("");
    setResultado(null);
    setArquivo(file);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const primeiraAba = workbook.SheetNames[0];
      const planilha = workbook.Sheets[primeiraAba];
      const linhasRaw = XLSX.utils.sheet_to_json(planilha, { defval: "", raw: false });
      const mapeadas = linhasRaw.map(mapearLinhaPlanilha).filter((l) => l.codigo && l.nome_produto);
      setLinhasMapeadas(mapeadas);
    } catch (err) {
      console.error(err);
      setErroLeitura("Não consegui ler esse arquivo. Confirma que é um .xlsx ou .csv exportado direto do sistema.");
      setLinhasMapeadas([]);
    }
  }

  const novas = linhasMapeadas.filter((l) => !codigosExistentes.has(l.codigo));
  const duplicadas = linhasMapeadas.filter((l) => codigosExistentes.has(l.codigo));

  async function importar() {
    setImportando(true);
    setProgresso(0);
    const falhas = [];
    let ultimoId = null;
    for (let i = 0; i < novas.length; i++) {
      try {
        const criado = await criarProduto(novas[i]);
        ultimoId = criado.id;
      } catch (err) {
        console.error(err);
        falhas.push(`${novas[i].codigo} — ${novas[i].nome_produto}`);
      }
      setProgresso(i + 1);
    }
    setImportando(false);
    setResultado({ criados: novas.length - falhas.length, duplicados: duplicadas.length, falhas });
    if (ultimoId) onImportado?.(ultimoId);
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Upload size={15} className="text-gold" /> Importar produtos de uma planilha
        </p>
        <button onClick={onFechar} className="text-muted hover:text-brick">
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-muted mb-3">
        Aceita .xlsx ou .csv. Reconhece automaticamente as colunas <span className="font-mono-num">COD_PRODUTO</span>,{" "}
        <span className="font-mono-num">DESC_PRODUTO</span>/<span className="font-mono-num">DESCRICAO</span>,{" "}
        <span className="font-mono-num">DEPARTAMENTO</span>, <span className="font-mono-num">SECAO</span>,{" "}
        <span className="font-mono-num">CATEGORIA</span>, <span className="font-mono-num">NCM</span>,{" "}
        <span className="font-mono-num">CODBARRA</span> e <span className="font-mono-num">CODCEST</span> — o resto
        das colunas (estoque, volume, fornecedor...) é ignorado. Cada produto entra como rascunho, pra completar
        peso e nutricional depois, um por um.
      </p>

      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleArquivo} disabled={importando} className="text-sm" />

      {erroLeitura && <p className="text-xs text-brick mt-2">{erroLeitura}</p>}

      {arquivo && !erroLeitura && !resultado && (
        <div className="mt-3">
          <p className="text-xs text-muted">
            {linhasMapeadas.length} produto(s) reconhecido(s) no arquivo — {novas.length} novo(s), {duplicadas.length}{" "}
            já existem (serão ignorados, pra não sobrescrever o que você já editou).
          </p>

          {novas.length > 0 && (
            <div className="overflow-x-auto mt-2 border border-line rounded-md max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gold-soft/30 sticky top-0">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-medium">Código</th>
                    <th className="px-2 py-1.5 font-medium">Nome</th>
                    <th className="px-2 py-1.5 font-medium">Departamento</th>
                    <th className="px-2 py-1.5 font-medium">NCM</th>
                  </tr>
                </thead>
                <tbody>
                  {novas.slice(0, 8).map((l, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-2 py-1 font-mono-num">{l.codigo}</td>
                      <td className="px-2 py-1">{l.nome_produto}</td>
                      <td className="px-2 py-1 text-muted">{l.departamento}</td>
                      <td className="px-2 py-1 text-muted font-mono-num">{l.ncm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {novas.length > 8 && <p className="text-[11px] text-muted px-2 py-1">+ {novas.length - 8} outro(s)...</p>}
            </div>
          )}

          {importando ? (
            <p className="text-xs text-sage mt-3 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Importando {progresso}/{novas.length}...
            </p>
          ) : (
            novas.length > 0 && (
              <button onClick={importar} className="mt-3 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90">
                Importar {novas.length} produto{novas.length === 1 ? "" : "s"}
              </button>
            )
          )}
        </div>
      )}

      {resultado && (
        <div className="mt-3 text-xs">
          <p className="text-sage">{resultado.criados} produto(s) importado(s) com sucesso.</p>
          {resultado.duplicados > 0 && (
            <p className="text-muted mt-1">{resultado.duplicados} ignorado(s) por já existir (código já cadastrado).</p>
          )}
          {resultado.falhas.length > 0 && (
            <p className="text-brick mt-1">Falha em {resultado.falhas.length}: {resultado.falhas.join(", ")}</p>
          )}
        </div>
      )}
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
