"use client";

import { useMemo, useState } from "react";
import { Search, Layers, Package, Beef } from "lucide-react";
import { useStore } from "@/lib/store";
import { TIPOS_RECEITA, LABEL_TIPO_RECEITA } from "@/lib/tiposReceita";

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Constrói a árvore "pra frente a partir daqui": tudo que usa essa receita,
// direta ou indiretamente, até chegar nos Produtos finais (folhas). Mistura
// dois tipos de aresta — receita usada como sub-receita de outra receita
// (ReceitaItens) e receita usada na composição de um Produto — e por isso
// devolve nós de dois tipos ("receita" e "produto"). Set de visitados evita
// loop infinito se alguma receita acabar se referenciando indiretamente.
function construirArvore(receitaId, receitas, produtos, visitados = new Set()) {
  if (visitados.has(receitaId)) return [];
  const novosVisitados = new Set(visitados);
  novosVisitados.add(receitaId);

  const filhosReceitas = receitas
    .filter((r) => (r.itens || []).some((i) => i.tipo === "receita" && i.materia_prima_id === receitaId))
    .map((r) => ({
      tipo: "receita",
      chave: r.id,
      receita: r,
      filhos: construirArvore(r.id, receitas, produtos, novosVisitados),
    }));

  const filhosProdutos = produtos
    .filter((p) => (p.composicao || []).some((c) => c.receita_id === receitaId))
    .map((p) => ({ tipo: "produto", chave: p.id, produto: p, filhos: [] }));

  return [...filhosReceitas, ...filhosProdutos];
}

function contarNos(nos) {
  return nos.reduce(
    (soma, no) => {
      const proprio = no.tipo === "produto" ? { receitas: 0, produtos: 1 } : { receitas: 1, produtos: 0 };
      const dosFilhos = contarNos(no.filhos);
      return { receitas: soma.receitas + proprio.receitas + dosFilhos.receitas, produtos: soma.produtos + proprio.produtos + dosFilhos.produtos };
    },
    { receitas: 0, produtos: 0 }
  );
}

export default function MapaPage() {
  const { receitas, produtos } = useStore();
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [raizId, setRaizId] = useState(receitas[0]?.id ?? "");

  const receitasFiltradas = useMemo(() => {
    const buscaNormalizada = normalizarTexto(busca);
    return [...receitas]
      .filter((r) => !tipoFiltro || r.papel === tipoFiltro)
      .filter(
        (r) =>
          !buscaNormalizada ||
          normalizarTexto(r.nome).includes(buscaNormalizada) ||
          normalizarTexto(r.codigo).includes(buscaNormalizada)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  }, [receitas, tipoFiltro, busca]);

  const raiz = receitas.find((r) => r.id === raizId);

  const arvore = useMemo(() => {
    if (!raiz) return [];
    return construirArvore(raiz.id, receitas, produtos);
  }, [raiz, receitas, produtos]);

  const contagem = useMemo(() => contarNos(arvore), [arvore]);

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 8</p>
        <h1 className="font-display text-3xl mt-1">Mapa</h1>
        <p className="text-sm text-muted mt-1">
          Só visualização — escolha uma receita e veja tudo que depende dela, até chegar nos produtos finais.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wide text-muted mr-1">Tipo:</span>
        <button
          type="button"
          onClick={() => setTipoFiltro("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            tipoFiltro === "" ? "border-sage bg-sage-soft text-sage" : "border-line text-muted hover:bg-gold-soft/30"
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
                selecionado ? "border-sage bg-sage-soft text-sage" : "border-line text-muted hover:bg-gold-soft/30"
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
            placeholder="Buscar por nome ou código..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-line text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <label className="text-xs text-muted flex items-center gap-2">
          Receita
          <select
            value={raizId}
            onChange={(e) => setRaizId(e.target.value)}
            className="px-3 py-2 rounded-md border border-line text-sm w-72"
            disabled={receitasFiltradas.length === 0}
          >
            {receitasFiltradas.length === 0 && <option value="">Nenhuma receita com esse filtro</option>}
            {receitasFiltradas.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {!raiz && (
        <div className="bg-surface border border-line rounded-lg p-8 text-center text-sm text-muted">
          Selecione uma receita pra ver o mapa.
        </div>
      )}

      {raiz && (
        <div className="bg-surface border border-line rounded-lg p-6">
          <p className="text-xs text-muted mb-5">
            {arvore.length === 0
              ? "Essa receita ainda não é usada em nenhuma outra receita nem em produto algum."
              : `Alcança ${contagem.receitas} receita${contagem.receitas === 1 ? "" : "s"} e ${contagem.produtos} produto${contagem.produtos === 1 ? "" : "s"} a partir daqui.`}
          </p>
          <div className="overflow-x-auto pb-2">
            <NoMapa no={{ tipo: "receita", receita: raiz, filhos: arvore }} raiz />
          </div>
        </div>
      )}
    </div>
  );
}

function NoMapa({ no, raiz = false }) {
  const filhos = no.filhos || [];
  const ehProduto = no.tipo === "produto";
  const nome = ehProduto ? no.produto.nome_produto : no.receita.nome;
  const codigo = ehProduto ? no.produto.codigo : no.receita.codigo;

  return (
    <div className="flex items-start">
      <div
        className={`shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm whitespace-nowrap ${
          ehProduto
            ? "bg-gold text-white border-gold"
            : raiz
            ? "bg-foreground text-white border-foreground"
            : "bg-sage-soft border-sage text-sage"
        }`}
      >
        {ehProduto ? <Package size={14} /> : raiz ? <Beef size={14} /> : <Layers size={14} />}
        <span className="font-medium">{nome || "(sem nome)"}</span>
        <span className={`text-xs font-mono-num ${ehProduto || raiz ? "opacity-80" : "text-muted"}`}>{codigo}</span>
      </div>

      {filhos.length > 0 && (
        <div className="flex flex-col ml-6 border-l border-line pl-6 gap-3">
          {filhos.map((f) => (
            <NoMapa key={f.chave} no={f} />
          ))}
        </div>
      )}
    </div>
  );
}
