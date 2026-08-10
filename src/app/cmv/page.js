"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularCMV, formatBRL } from "@/lib/calc";
import { TIPOS_RECEITA, LABEL_TIPO_RECEITA } from "@/lib/tiposReceita";

const COLUNAS = [
  { chave: "nome", label: "Receita", alinhamento: "left" },
  { chave: "papel", label: "Tipo", alinhamento: "left" },
  { chave: "custoIngredientes", label: "Ingredientes", alinhamento: "right" },
  { chave: "custoTotal", label: "Custo total", alinhamento: "right" },
  { chave: "quantidadeProducao", label: "Produção", alinhamento: "right" },
  { chave: "cmvUnitario", label: "CMV unitário", alinhamento: "right" },
  { chave: "qtdProdutos", label: "Produtos/SKUs", alinhamento: "right" },
];

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function valorOrdenavel(linha, campo) {
  switch (campo) {
    case "nome":
      return normalizarTexto(linha.nome);
    case "papel":
      return normalizarTexto(LABEL_TIPO_RECEITA[linha.papel] || linha.papel || "");
    case "custoIngredientes":
      return linha.cmv.custoIngredientes;
    case "custoTotal":
      return linha.cmv.custoTotal;
    case "quantidadeProducao":
      return linha.quantidadeProducao;
    case "cmvUnitario":
      return linha.cmv.cmvUnitario;
    case "qtdProdutos":
      return linha.qtdProdutos;
    default:
      return 0;
  }
}

function exportarCSV(linhas) {
  const cabecalho = [
    "Receita",
    "Tipo",
    "Ingredientes",
    "Custo total",
    "Produção",
    "CMV unitário",
    "Produtos/SKUs",
  ];

  const escapar = (valor) => `"${String(valor).replace(/"/g, '""')}"`;

  const linhasCSV = linhas.map((r) =>
    [
      r.nome,
      LABEL_TIPO_RECEITA[r.papel] || r.papel || "",
      r.cmv.custoIngredientes.toFixed(2).replace(".", ","),
      r.cmv.custoTotal.toFixed(2).replace(".", ","),
      `${r.quantidadeProducao} ${r.unidadeProducao}`,
      r.cmv.cmvUnitario.toFixed(2).replace(".", ","),
      r.qtdProdutos > 0 ? r.qtdProdutos : "",
    ]
      .map(escapar)
      .join(";")
  );

  const csv = [cabecalho.map(escapar).join(";"), ...linhasCSV].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dataHoje = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `cmv-${dataHoje}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CMVPage() {
  const { receitas, materiasPrimasById, receitasById } = useStore();
  const [tipoFiltro, setTipoFiltro] = useState(""); // "" = todos os tipos
  const [busca, setBusca] = useState("");
  const [somenteSemSku, setSomenteSemSku] = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: "cmvUnitario", direcao: "desc" });

  const linhasTodas = useMemo(
    () =>
      receitas.map((r) => {
        const quantidadeProducao = r.rendimento?.quantidade_produzida || 1;
        const cmv = calcularCMV({
          itens: r.itens || [],
          embalagemCusto: r.embalagem_custo || 0,
          quantidadeProducao,
          materiasPrimasById,
          receitasById,
        });
        const qtdProdutos = (r.produtos || []).length;
        const unidadeProducao = r.rendimento?.unidade_nome || "un";
        return { ...r, cmv, quantidadeProducao, qtdProdutos, unidadeProducao };
      }),
    [receitas, materiasPrimasById, receitasById]
  );

  // % do maior custo é sempre relativo ao maior CMV unitário do conjunto
  // filtrado por tipo — mantém o mesmo comportamento de antes, antes de
  // aplicar busca/filtro "sem SKU" (que são mais pra achar itens específicos).
  const linhasPorTipo = useMemo(
    () => linhasTodas.filter((r) => !tipoFiltro || r.papel === tipoFiltro),
    [linhasTodas, tipoFiltro]
  );

  const maiorCusto = useMemo(
    () => linhasPorTipo.reduce((maior, r) => (r.cmv.cmvUnitario > (maior?.cmv.cmvUnitario || 0) ? r : maior), null),
    [linhasPorTipo]
  );

  const linhas = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);
    const filtradas = linhasPorTipo.filter((r) => {
      if (somenteSemSku && r.qtdProdutos > 0) return false;
      if (buscaNormalizada && !normalizarTexto(r.nome).includes(buscaNormalizada)) return false;
      return true;
    });

    const { campo, direcao } = ordenacao;
    const sinal = direcao === "asc" ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const va = valorOrdenavel(a, campo);
      const vb = valorOrdenavel(b, campo);
      if (va < vb) return -1 * sinal;
      if (va > vb) return 1 * sinal;
      return 0;
    });
  }, [linhasPorTipo, busca, somenteSemSku, ordenacao]);

  function alternarOrdenacao(campo) {
    setOrdenacao((atual) => {
      if (atual.campo !== campo) return { campo, direcao: "desc" };
      return { campo, direcao: atual.direcao === "desc" ? "asc" : "desc" };
    });
  }

  function IconeOrdenacao({ campo }) {
    if (ordenacao.campo !== campo) return <ArrowUpDown size={12} className="text-muted/50" />;
    return ordenacao.direcao === "asc" ? <ArrowUp size={12} className="text-gold" /> : <ArrowDown size={12} className="text-gold" />;
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 5</p>
        <h1 className="font-display text-3xl mt-1">CMV</h1>
        <p className="text-sm text-muted mt-1">
          Toda alteração em uma matéria-prima recalcula automaticamente o CMV de todas as receitas que a utilizam.
          Este CMV é só de ingredientes + embalagem — a mão de obra (MOD) varia por Produto/SKU e fica registrada
          em cada produto, dentro de Receitas.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wide text-muted mr-1">Tipo:</span>
        <button
          type="button"
          onClick={() => setTipoFiltro("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            tipoFiltro === ""
              ? "border-sage bg-sage-soft text-sage"
              : "border-line text-muted hover:bg-gold-soft/30"
          }`}
        >
          Todos
        </button>
        {TIPOS_RECEITA.map((tipo) => {
          const selecionado = tipoFiltro === tipo.value;
          return (
            <button
              key={tipo.value}
              type="button"
              onClick={() => setTipoFiltro(selecionado ? "" : tipo.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                selecionado
                  ? "border-sage bg-sage-soft text-sage"
                  : "border-line text-muted hover:bg-gold-soft/30"
              }`}
            >
              <tipo.icone size={14} className={selecionado ? "text-sage" : "text-muted"} />
              {tipo.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar receita por nome..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-line text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <button
          type="button"
          onClick={() => setSomenteSemSku((v) => !v)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            somenteSemSku
              ? "border-sage bg-sage-soft text-sage"
              : "border-line text-muted hover:bg-gold-soft/30"
          }`}
        >
          Sem SKU vinculado
        </button>

        <button
          type="button"
          onClick={() => exportarCSV(linhas)}
          disabled={linhas.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-medium text-muted hover:bg-gold-soft/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
              {COLUNAS.map((coluna) => (
                <th key={coluna.chave} className={`px-5 py-3 font-medium ${coluna.alinhamento === "right" ? "text-right" : ""}`}>
                  <button
                    type="button"
                    onClick={() => alternarOrdenacao(coluna.chave)}
                    className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
                      coluna.alinhamento === "right" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {coluna.label}
                    <IconeOrdenacao campo={coluna.chave} />
                  </button>
                </th>
              ))}
              <th className="px-5 py-3 font-medium text-right">% do maior custo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r) => {
              const percentual = maiorCusto ? (r.cmv.cmvUnitario / maiorCusto.cmv.cmvUnitario) * 100 : 0;
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{r.nome}</td>
                  <td className="px-5 py-3">
                    {r.papel ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold-soft text-foreground/80">
                        {LABEL_TIPO_RECEITA[r.papel] || r.papel}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatBRL(r.cmv.custoIngredientes)}</td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium">{formatBRL(r.cmv.custoTotal)}</td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">{r.quantidadeProducao} {r.unidadeProducao}</td>
                  <td className="px-5 py-3 text-right font-mono-num text-gold font-semibold">
                    {formatBRL(r.cmv.cmvUnitario)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">
                    {r.qtdProdutos > 0 ? r.qtdProdutos : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="w-full h-1.5 bg-gold-soft rounded-full overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${percentual}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted text-sm">
                  {busca || somenteSemSku
                    ? "Nenhuma receita encontrada com esses filtros."
                    : tipoFiltro
                    ? "Nenhuma receita desse tipo ainda."
                    : "Cadastre receitas e ingredientes para ver o CMV."}
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
