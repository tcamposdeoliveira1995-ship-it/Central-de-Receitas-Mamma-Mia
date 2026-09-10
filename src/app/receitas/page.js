"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Save,
  Check,
  Loader2,
  X,
  Upload,
  FileText,
  Download,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { useStore } from "@/lib/store";
import {
  calcularCMV,
  custoEfetivoIngrediente,
  converterQuantidade,
  custoPorKgReceita,
  formatBRL,
  formatNumber,
} from "@/lib/calc";
import { parseTextoReceita, encontrarMateriaPrimaPorNome } from "@/lib/parseReceita";
import { extrairTextoPDF } from "@/lib/pdfText";
import { FichaReceitaPDF } from "@/lib/pdfReceita";
import { TIPOS_RECEITA } from "@/lib/tiposReceita";

const UNIDADES = ["kg", "g", "L", "ml", "un", "caixa", "pacote", "fardo"];

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function gerarLinhaId() {
  return `linha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function receitaVazia(categorias) {
  return {
    codigo: "",
    nome: "",
    papel: TIPOS_RECEITA[0].value,
    categoria_id: categorias.find((c) => c.tipo === "receita")?.id || categorias[0]?.id || "",
    linha: "",
    empresa: "",
  };
}

export default function ReceitasPage() {
  const { receitas, categorias, adicionarReceita } = useStore();
  const [tipoFiltro, setTipoFiltro] = useState(""); // "" = todos os tipos
  const [busca, setBusca] = useState("");
  const [selecionadaId, setSelecionadaId] = useState(receitas[0]?.id ?? null);
  const [criando, setCriando] = useState(false);
  const [nova, setNova] = useState(() => receitaVazia(categorias));
  const [salvandoNova, setSalvandoNova] = useState(false);
  const [listaRecolhida, setListaRecolhida] = useState(false);

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
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
  }, [receitas, tipoFiltro, busca]);

  const selecionada = receitas.find((r) => r.id === selecionadaId);
  const indiceAtual = receitasFiltradas.findIndex((r) => r.id === selecionadaId);
  const temAnterior = indiceAtual > 0;
  const temProximo = indiceAtual !== -1 && indiceAtual < receitasFiltradas.length - 1;

  function irParaAnterior() {
    if (!temAnterior) return;
    setSelecionadaId(receitasFiltradas[indiceAtual - 1].id);
  }

  function irParaProximo() {
    if (!temProximo) return;
    setSelecionadaId(receitasFiltradas[indiceAtual + 1].id);
  }

  async function salvarNovaReceita() {
    if (!nova.codigo.trim() || !nova.nome.trim()) return;
    setSalvandoNova(true);
    try {
      const criada = await adicionarReceita({
        codigo: nova.codigo.trim(),
        nome: nova.nome.trim(),
        papel: nova.papel,
        categoria_id: nova.categoria_id,
        linha: nova.linha.trim(),
        empresa: nova.empresa.trim(),
      });
      setSelecionadaId(criada.id);
      setNova(receitaVazia(categorias));
      setCriando(false);
    } finally {
      setSalvandoNova(false);
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 4</p>
          <h1 className="font-display text-3xl mt-1">Central de Receitas</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Ficha técnica de cada receita: ingredientes, custo (CMV), mão de obra estimada e o PDF pra produção.
          </p>
        </div>
        <button
          onClick={() => setCriando((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 shrink-0"
        >
          <Plus size={16} /> Nova receita
        </button>
      </header>

      {criando && (
        <div className="bg-surface border border-line rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Código
            <input
              value={nova.codigo}
              onChange={(e) => setNova((n) => ({ ...n, codigo: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-32"
              placeholder="Ex: REC0002"
            />
          </label>
          <label className="text-xs text-muted">
            Nome da receita
            <input
              value={nova.nome}
              onChange={(e) => setNova((n) => ({ ...n, nome: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-64"
              placeholder="Ex: Coxinha de Frango"
            />
          </label>
          <label className="text-xs text-muted">
            Tipo
            <select
              value={nova.papel}
              onChange={(e) => setNova((n) => ({ ...n, papel: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm"
            >
              {TIPOS_RECEITA.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Categoria
            <select
              value={nova.categoria_id}
              onChange={(e) => setNova((n) => ({ ...n, categoria_id: e.target.value }))}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <button
            onClick={salvarNovaReceita}
            disabled={salvandoNova}
            className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {salvandoNova ? "Criando..." : "Criar"}
          </button>
        </div>
      )}

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

      <div className={`grid grid-cols-1 gap-4 ${listaRecolhida ? "lg:grid-cols-[3rem_1fr]" : "lg:grid-cols-3"}`}>
        {listaRecolhida ? (
          <button
            onClick={() => setListaRecolhida(false)}
            title="Mostrar listagem de receitas"
            className="hidden lg:flex flex-col items-center justify-center gap-2 bg-surface border border-line rounded-lg py-4 text-muted hover:text-ink hover:bg-gold-soft/30"
          >
            <ChevronsRight size={16} />
            <span className="text-[10px] uppercase tracking-wide [writing-mode:vertical-rl]">
              Receitas ({receitasFiltradas.length})
            </span>
          </button>
        ) : (
          <div className="bg-surface border border-line rounded-lg overflow-hidden">
            <div className="p-3 border-b border-line flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou código..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border border-line text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
              <button
                onClick={() => setListaRecolhida(true)}
                title="Recolher listagem"
                className="hidden lg:flex p-2 rounded-md border border-line text-muted hover:text-ink hover:bg-gold-soft/30 shrink-0"
              >
                <ChevronsLeft size={14} />
              </button>
            </div>
            <ul>
              {receitasFiltradas.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelecionadaId(r.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left border-b border-line last:border-0 hover:bg-gold-soft/30 ${
                      selecionadaId === r.id ? "bg-gold-soft/50" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">{r.nome || "(sem nome)"}</p>
                      <p className="text-xs text-muted font-mono-num">{r.codigo}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted" />
                  </button>
                </li>
              ))}
              {receitasFiltradas.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-muted">
                  {busca || tipoFiltro
                    ? "Nenhuma receita encontrada com esses filtros."
                    : "Nenhuma receita cadastrada ainda."}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className={listaRecolhida ? "" : "lg:col-span-2 space-y-4"}>
          {selecionada ? (
            <ReceitaDetalhe
              receita={selecionada}
              onAnterior={irParaAnterior}
              onProximo={irParaProximo}
              temAnterior={temAnterior}
              temProximo={temProximo}
              posicaoAtual={indiceAtual + 1}
              totalReceitas={receitasFiltradas.length}
              onExcluida={() => setSelecionadaId(null)}
            />
          ) : (
            <div className="bg-surface border border-line rounded-lg p-8 text-center text-sm text-muted">
              Selecione ou crie uma receita.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceitaDetalhe({
  receita,
  onAnterior,
  onProximo,
  temAnterior,
  temProximo,
  posicaoAtual,
  totalReceitas,
  onExcluida,
}) {
  const { categorias, setores, excluirReceita } = useStore();

  async function excluir() {
    if (!confirm(`Excluir a receita "${receita.nome}"? Essa ação não pode ser desfeita.`)) return;
    await excluirReceita(receita.id);
    onExcluida?.();
  }

  return (
    <div className="space-y-4">
      {typeof totalReceitas === "number" && totalReceitas > 0 && (
        <div className="flex items-center justify-between gap-3 bg-surface border border-line rounded-lg px-3 py-2">
          <button
            onClick={onAnterior}
            disabled={!temAnterior}
            title="Receita anterior"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-line text-muted hover:text-ink hover:bg-gold-soft/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="text-xs text-muted font-mono-num whitespace-nowrap">
            {posicaoAtual} de {totalReceitas}
          </span>
          <button
            onClick={onProximo}
            disabled={!temProximo}
            title="Próxima receita"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-line text-muted hover:text-ink hover:bg-gold-soft/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Próximo <ChevronRight size={14} />
          </button>
        </div>
      )}

      <InfoCard key={`info-${receita.id}`} receita={receita} categorias={categorias} setores={setores} onExcluir={excluir} />
      <IngredientesCard key={`itens-${receita.id}`} receita={receita} />
      <MODCard key={`mod-${receita.id}`} receita={receita} />
      <FichaTecnicaCard key={`ficha-${receita.id}`} receita={receita} />
    </div>
  );
}

function camposIniciais(receita) {
  return {
    nome: receita.nome || "",
    codigo: receita.codigo || "",
    papel: receita.papel || TIPOS_RECEITA[0].value,
    categoria_id: receita.categoria_id || "",
    linha: receita.linha || "",
    empresa: receita.empresa || "",
    tempo_preparo: receita.tempo_preparo || "",
    temperatura: receita.temperatura || "",
    validade: receita.validade || "",
    status: receita.status || "ativa",
    modo_preparo: receita.modo_preparo || "",
    rota_producao: receita.rota_producao || "",
  };
}

function InfoCard({ receita, categorias, setores, onExcluir }) {
  const { atualizarDetalhesReceita, atualizarRotaProducaoReceita } = useStore();
  const [campos, setCampos] = useState(() => camposIniciais(receita));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function set(campo, valor) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setSalvo(false);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const { rota_producao, ...detalhes } = campos;
      await atualizarDetalhesReceita(receita.id, detalhes);
      if (rota_producao !== (receita.rota_producao || "")) {
        await atualizarRotaProducaoReceita(receita.id, rota_producao);
      }
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-xs font-mono-num text-muted">{receita.codigo}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="font-display text-2xl">{receita.nome || "(sem nome)"}</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sage-soft text-sage font-medium capitalize">
              {(receita.status || "ativa").replace("_", " ")}
            </span>
          </div>
        </div>
        <button
          onClick={onExcluir}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line text-brick hover:bg-brick/5"
        >
          <Trash2 size={13} /> Excluir receita
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted mb-2">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_RECEITA.map((tipo) => {
            const ativo = campos.papel === tipo.value;
            return (
              <button
                key={tipo.value}
                type="button"
                onClick={() => set("papel", tipo.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  ativo ? "border-sage bg-sage-soft text-sage" : "border-line text-muted hover:bg-gold-soft/30"
                }`}
              >
                <tipo.icone size={14} className={ativo ? "text-sage" : "text-muted"} />
                {tipo.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <Campo label="Nome" value={campos.nome} onChange={(v) => set("nome", v)} className="col-span-2 sm:col-span-1" />
        <Campo label="Código" value={campos.codigo} onChange={(v) => set("codigo", v)} />
        <CampoSelect
          label="Categoria"
          value={campos.categoria_id}
          onChange={(v) => set("categoria_id", v)}
          opcoes={categorias.map((c) => ({ value: c.id, label: c.nome }))}
        />
        <Campo label="Linha" value={campos.linha} onChange={(v) => set("linha", v)} />
        <Campo label="Empresa" value={campos.empresa} onChange={(v) => set("empresa", v)} />
        <Campo label="Tempo de preparo" value={campos.tempo_preparo} onChange={(v) => set("tempo_preparo", v)} placeholder="Ex: 35 min" />
        <Campo label="Temperatura" value={campos.temperatura} onChange={(v) => set("temperatura", v)} placeholder="Ex: 180°C" />
        <Campo label="Validade" value={campos.validade} onChange={(v) => set("validade", v)} placeholder="Ex: 180 dias (congelado)" />
        <CampoSelect
          label="Status"
          value={campos.status}
          onChange={(v) => set("status", v)}
          opcoes={[{ value: "ativa", label: "Ativa" }, { value: "inativa", label: "Inativa" }]}
        />
        <label className="text-xs text-muted block col-span-2">
          Linha de produção
          <select
            value={campos.rota_producao || ""}
            onChange={(e) => set("rota_producao", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm"
          >
            <option value="">Nenhuma</option>
            {(setores || [])
              .filter((s) => s.status !== "inativo")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label className="text-xs text-muted block mt-3">
        Modo de preparo (aparece no PDF da ficha técnica)
        <textarea
          value={campos.modo_preparo}
          onChange={(e) => set("modo_preparo", e.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm resize-y"
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
        >
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Salvar dados
        </button>
        {salvo && (
          <span className="text-sm text-sage flex items-center gap-1">
            <Check size={14} /> Salvo
          </span>
        )}
      </div>
    </div>
  );
}

function IngredientesCard({ receita }) {
  const {
    materiasPrimas,
    materiasPrimasById,
    receitas,
    receitasById,
    atualizarItensReceita,
    atualizarDetalhesReceita,
  } = useStore();
  const [itens, setItens] = useState(() => receita.itens || []);
  const [embalagemCusto, setEmbalagemCusto] = useState(() => receita.embalagem_custo || 0);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [importAberto, setImportAberto] = useState(false);

  const subReceitasDisponiveis = useMemo(
    () => receitas.filter((r) => r.id !== receita.id),
    [receitas, receita.id]
  );

  function alterarItem(idx, campo, valor) {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)));
    setSalvo(false);
  }

  function trocarTipoItem(idx, tipo) {
    setItens((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              tipo,
              materia_prima_id: "",
              quantidade: item.quantidade || 0,
              unidade: tipo === "receita" ? "kg" : item.unidade || "kg",
              observacao: item.observacao || "",
            }
          : item
      )
    );
    setSalvo(false);
  }

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      { tipo: "materia_prima", materia_prima_id: "", quantidade: 0, unidade: "kg", apresentacao_id: "", observacao: "" },
    ]);
    setSalvo(false);
  }

  function removerItem(idx) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
    setSalvo(false);
  }

  function adicionarImportados(encontrados) {
    setItens((prev) => [
      ...prev,
      ...encontrados.map((e) => ({
        tipo: "materia_prima",
        materia_prima_id: e.materiaPrima.id,
        quantidade: e.quantidade,
        unidade: e.unidade,
        apresentacao_id: "",
        observacao: "",
      })),
    ]);
    setSalvo(false);
    setImportAberto(false);
  }

  const cmv = useMemo(
    () =>
      calcularCMV({
        itens,
        embalagemCusto: parseFloat(embalagemCusto) || 0,
        quantidadeProducao: receita.rendimento?.quantidade_produzida || 1,
        materiasPrimasById,
        receitasById,
      }),
    [itens, embalagemCusto, receita.rendimento, materiasPrimasById, receitasById]
  );

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarItensReceita(receita.id, itens);
      if ((parseFloat(embalagemCusto) || 0) !== (receita.embalagem_custo || 0)) {
        await atualizarDetalhesReceita(receita.id, { embalagem_custo: parseFloat(embalagemCusto) || 0 });
      }
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h3 className="font-display text-lg">Ingredientes</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportAberto((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-line hover:bg-gold-soft/30"
          >
            <Upload size={13} /> Importar da ficha (PDF/texto)
          </button>
          <button
            type="button"
            onClick={adicionarItem}
            className="flex items-center gap-1.5 text-xs bg-sage-soft text-sage px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Plus size={13} /> Adicionar ingrediente
          </button>
        </div>
      </div>

      {importAberto && (
        <ImportarIngredientes
          materiasPrimas={materiasPrimas}
          onImportar={adicionarImportados}
          onFechar={() => setImportAberto(false)}
        />
      )}

      {itens.length === 0 && (
        <p className="text-sm text-muted py-4 text-center">Nenhum ingrediente ainda. Clique em &quot;Adicionar ingrediente&quot;.</p>
      )}

      {itens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="py-2 pr-2 font-medium">Ingrediente</th>
                <th className="py-2 pr-2 font-medium">Apres.</th>
                <th className="py-2 pr-2 font-medium text-right">Quantidade</th>
                <th className="py-2 pr-2 font-medium">Unidade</th>
                <th className="py-2 pr-2 font-medium text-right">Custo</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => (
                <LinhaIngrediente
                  key={idx}
                  item={item}
                  materiasPrimas={materiasPrimas}
                  subReceitas={subReceitasDisponiveis}
                  materiasPrimasById={materiasPrimasById}
                  receitasById={receitasById}
                  onAlterar={(campo, valor) => alterarItem(idx, campo, valor)}
                  onTrocarTipo={(tipo) => trocarTipoItem(idx, tipo)}
                  onRemover={() => removerItem(idx)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-line">
        <Campo
          label="Custo de embalagem (R$, total do lote)"
          tipo="number"
          value={embalagemCusto}
          onChange={(v) => {
            setEmbalagemCusto(v);
            setSalvo(false);
          }}
          className="w-56"
        />
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Custo total</p>
            <p className="font-mono-num font-semibold text-lg">{formatBRL(cmv.custoTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">CMV unitário</p>
            <p className="font-mono-num font-semibold text-lg text-gold">{formatBRL(cmv.cmvUnitario)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
        >
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Salvar ingredientes
        </button>
        {salvo && (
          <span className="text-sm text-sage flex items-center gap-1">
            <Check size={14} /> Salvo — CMV recalculado
          </span>
        )}
      </div>
    </div>
  );
}

function LinhaIngrediente({
  item,
  materiasPrimas,
  subReceitas,
  materiasPrimasById,
  receitasById,
  onAlterar,
  onTrocarTipo,
  onRemover,
}) {
  const ehSubReceita = item.tipo === "receita";
  const mp = !ehSubReceita ? materiasPrimasById[item.materia_prima_id] : null;
  const apresentacoes = mp?.apresentacoes || [];

  let custoLinha = 0;
  if (ehSubReceita) {
    const sub = receitasById[item.materia_prima_id];
    custoLinha = sub
      ? custoPorKgReceita(sub, receitasById, materiasPrimasById) * (parseFloat(item.quantidade) || 0)
      : 0;
  } else if (mp) {
    const { valorUnitario, unidadePreco } = custoEfetivoIngrediente(item, mp);
    const quantidadeConv = converterQuantidade(parseFloat(item.quantidade) || 0, item.unidade, unidadePreco);
    custoLinha = quantidadeConv * valorUnitario;
  }

  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="py-2 pr-2">
        <div className="flex gap-1 mb-1">
          <button
            type="button"
            onClick={() => onTrocarTipo("materia_prima")}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              !ehSubReceita ? "border-sage bg-sage-soft text-sage" : "border-line text-muted"
            }`}
          >
            Matéria-prima
          </button>
          <button
            type="button"
            onClick={() => onTrocarTipo("receita")}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              ehSubReceita ? "border-sage bg-sage-soft text-sage" : "border-line text-muted"
            }`}
          >
            Sub-receita
          </button>
        </div>
        <select
          value={item.materia_prima_id || ""}
          onChange={(e) => onAlterar("materia_prima_id", e.target.value)}
          className="px-2 py-1.5 rounded-md border border-line text-sm w-full min-w-[10rem]"
        >
          <option value="">Selecione...</option>
          {(ehSubReceita ? subReceitas : materiasPrimas).map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {ehSubReceita ? opcao.nome : `${opcao.nome} (${opcao.codigo})`}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2">
        {!ehSubReceita && apresentacoes.length > 0 ? (
          <>
            <select
              value={item.apresentacao_id || ""}
              onChange={(e) => onAlterar("apresentacao_id", e.target.value)}
              className="px-2 py-1.5 rounded-md border border-line text-sm w-full min-w-[8rem]"
            >
              <option value="">Padrão (preço de compra)</option>
              {apresentacoes.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
            {item.apresentacao_id && (
              <label className="text-[10px] text-muted flex items-center gap-1 mt-1">
                <input
                  type="checkbox"
                  checked={!!item.usa_custo_cozido}
                  onChange={(e) => onAlterar("usa_custo_cozido", e.target.checked)}
                />
                usar custo cozido
              </label>
            )}
          </>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="py-2 pr-2 text-right">
        <input
          type="number"
          step="0.001"
          value={item.quantidade}
          onChange={(e) => onAlterar("quantidade", parseFloat(e.target.value) || 0)}
          className="px-2 py-1.5 rounded-md border border-line text-sm w-24 text-right font-mono-num"
        />
      </td>
      <td className="py-2 pr-2">
        <select
          value={item.unidade || "kg"}
          onChange={(e) => onAlterar("unidade", e.target.value)}
          disabled={ehSubReceita}
          className="px-2 py-1.5 rounded-md border border-line text-sm w-20 disabled:opacity-60"
        >
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2 text-right font-mono-num text-muted whitespace-nowrap">{formatBRL(custoLinha)}</td>
      <td className="py-2 text-right">
        <button type="button" onClick={onRemover} className="text-muted hover:text-brick p-1">
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}

function ImportarIngredientes({ materiasPrimas, onImportar, onFechar }) {
  const [texto, setTexto] = useState("");
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [erro, setErro] = useState("");
  const [reconhecidos, setReconhecidos] = useState([]);

  function processar(conteudo) {
    const parsed = parseTextoReceita(conteudo);
    const comMatch = parsed.map((item) => ({
      ...item,
      materiaPrima: encontrarMateriaPrimaPorNome(item.nome, materiasPrimas),
    }));
    setReconhecidos(comMatch);
  }

  async function handleArquivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro("");
    setLendoArquivo(true);
    try {
      let conteudo;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        conteudo = await extrairTextoPDF(file);
      } else {
        conteudo = await file.text();
      }
      setTexto(conteudo);
      processar(conteudo);
    } catch (err) {
      console.error(err);
      setErro("Não consegui ler esse arquivo. Tenta colar o texto da tabela de ingredientes diretamente.");
    } finally {
      setLendoArquivo(false);
    }
  }

  const encontrados = reconhecidos.filter((r) => r.materiaPrima);
  const naoEncontrados = reconhecidos.filter((r) => !r.materiaPrima);

  return (
    <div className="border border-line rounded-lg p-4 mb-4 bg-gold-soft/10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <FileText size={15} className="text-gold" /> Importar ingredientes de um PDF ou texto colado
        </p>
        <button onClick={onFechar} className="text-muted hover:text-brick">
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-muted mb-3">
        Envie o PDF da ficha técnica antiga (ou cole a tabela de ingredientes) — o sistema reconhece nome, quantidade
        e unidade de cada linha e tenta casar com uma matéria-prima já cadastrada pelo nome.
      </p>

      <input type="file" accept=".pdf,.txt,.csv" onChange={handleArquivo} disabled={lendoArquivo} className="text-sm mb-2" />

      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          processar(e.target.value);
        }}
        rows={5}
        placeholder={"Cole aqui, uma linha por ingrediente:\nAçúcar\t2,700\tKG\nSal\t500\tG"}
        className="w-full px-3 py-2 rounded-md border border-line text-xs font-mono-num resize-y"
      />

      {erro && <p className="text-xs text-brick mt-2">{erro}</p>}

      {reconhecidos.length > 0 && (
        <div className="mt-3 text-xs">
          <p className="text-muted mb-2">
            {reconhecidos.length} linha(s) reconhecida(s) — {encontrados.length} casada(s) com matéria-prima cadastrada,{" "}
            {naoEncontrados.length} não encontrada(s) (não serão importadas automaticamente).
          </p>
          <div className="border border-line rounded-md max-h-48 overflow-y-auto">
            {reconhecidos.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 border-b border-line last:border-0">
                <span>{r.nome} — {formatNumber(r.quantidade, 3)} {r.unidade}</span>
                {r.materiaPrima ? (
                  <span className="text-sage">→ {r.materiaPrima.nome}</span>
                ) : (
                  <span className="text-brick">não encontrada</span>
                )}
              </div>
            ))}
          </div>
          {encontrados.length > 0 && (
            <button
              onClick={() => onImportar(encontrados)}
              className="mt-3 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              Adicionar {encontrados.length} ingrediente{encontrados.length === 1 ? "" : "s"} reconhecido
              {encontrados.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MODCard({ receita }) {
  const { funcionarios, setores, atualizarMODReceita } = useStore();
  const [itens, setItens] = useState(() =>
    (receita.mod?.itens || []).map((i) => ({
      linha_id: gerarLinhaId(),
      setor_id: i.setor_id || "",
      funcao_id: i.funcao_id || "",
      quantidade_pessoas: i.quantidade_pessoas || 1,
      tempo_minutos: i.tempo_minutos || "",
    }))
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const funcionariosAtivos = funcionarios.filter((f) => (f.status || "ativo") === "ativo");
  const setoresAtivos = (setores || []).filter((s) => (s.status || "ativo") === "ativo");

  function adicionarLinha() {
    setItens((prev) => [
      ...prev,
      { linha_id: gerarLinhaId(), setor_id: "", funcao_id: "", quantidade_pessoas: 1, tempo_minutos: "" },
    ]);
    setSalvo(false);
  }

  function alterarLinha(linhaId, campo, valor) {
    setItens((prev) => prev.map((i) => (i.linha_id === linhaId ? { ...i, [campo]: valor } : i)));
    setSalvo(false);
  }

  function removerLinha(linhaId) {
    setItens((prev) => prev.filter((i) => i.linha_id !== linhaId));
    setSalvo(false);
  }

  const custoPreview = itens.reduce((soma, item) => {
    const custoHora = funcionarios.find((f) => f.id === item.funcao_id)?.custo_hora || 0;
    return soma + custoHora * (parseFloat(item.quantidade_pessoas) || 0) * ((parseFloat(item.tempo_minutos) || 0) / 60);
  }, 0);

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarMODReceita(
        receita.id,
        itens.map((i) => ({
          setor_id: i.setor_id,
          funcao_id: i.funcao_id,
          quantidade_pessoas: parseFloat(i.quantidade_pessoas) || 0,
          tempo_minutos: parseFloat(i.tempo_minutos) || 0,
        }))
      );
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="font-display text-lg">Mão de obra estimada (MOD/HHT)</h3>
          <p className="text-xs text-muted mt-0.5">Tempo previsto por função — usado como referência ao registrar a produção real.</p>
        </div>
        {funcionariosAtivos.length > 0 && (
          <button
            type="button"
            onClick={adicionarLinha}
            className="flex items-center gap-1.5 text-xs bg-sage-soft text-sage px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Plus size={13} /> Adicionar função
          </button>
        )}
      </div>

      {funcionariosAtivos.length === 0 ? (
        <p className="text-xs text-muted">Nenhuma função cadastrada em Funcionários ainda.</p>
      ) : itens.length === 0 ? (
        <p className="text-xs text-muted">Nenhuma função adicionada ainda.</p>
      ) : (
        <div className="space-y-2">
          {itens.map((item) => (
            <div key={item.linha_id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_0.8fr_0.9fr_auto] gap-2 items-end">
              <Campo2 label="Setor">
                <select
                  value={item.setor_id}
                  onChange={(e) => alterarLinha(item.linha_id, "setor_id", e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
                >
                  <option value="">Selecione...</option>
                  {setoresAtivos.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </Campo2>
              <Campo2 label="Função responsável">
                <select
                  value={item.funcao_id}
                  onChange={(e) => alterarLinha(item.linha_id, "funcao_id", e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
                >
                  <option value="">Selecione...</option>
                  {funcionariosAtivos.map((f) => (
                    <option key={f.id} value={f.id}>{f.funcao}</option>
                  ))}
                </select>
              </Campo2>
              <Campo2 label="Qtde. pessoas">
                <input
                  value={item.quantidade_pessoas}
                  onChange={(e) => alterarLinha(item.linha_id, "quantidade_pessoas", e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                />
              </Campo2>
              <Campo2 label="Tempo estimado (min)">
                <input
                  value={item.tempo_minutos}
                  onChange={(e) => alterarLinha(item.linha_id, "tempo_minutos", e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
                />
              </Campo2>
              <button
                type="button"
                onClick={() => removerLinha(item.linha_id)}
                className="text-muted hover:text-brick pb-2.5"
                aria-label="Remover"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-muted">
          Custo MOD estimado: <span className="font-mono-num font-medium text-gold">{formatBRL(custoPreview)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar MOD
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

function FichaTecnicaCard({ receita }) {
  const { materiasPrimasById, receitasById, enviarFichaPdf } = useStore();
  const [gerando, setGerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function baixarPdf() {
    setGerando(true);
    setErro("");
    try {
      const quantidadeProducao = receita.rendimento?.quantidade_produzida || 1;
      const linhas = (receita.itens || []).map((item) => {
        if (item.tipo === "receita") {
          const sub = receitasById[item.materia_prima_id];
          const custoPorKg = sub ? custoPorKgReceita(sub, receitasById, materiasPrimasById) : 0;
          return {
            nome: sub?.nome || "Sub-receita",
            apresentacao: "—",
            observacao: item.observacao || "",
            quantidade: item.quantidade,
            unidade: item.unidade,
            valorUnitario: custoPorKg,
            unidadePreco: "kg",
            valorTotal: custoPorKg * (parseFloat(item.quantidade) || 0),
          };
        }
        const mp = materiasPrimasById[item.materia_prima_id];
        const { valorUnitario, unidadePreco } = custoEfetivoIngrediente(item, mp);
        const quantidadeConv = converterQuantidade(parseFloat(item.quantidade) || 0, item.unidade, unidadePreco);
        return {
          nome: mp?.nome || "—",
          apresentacao: (mp?.apresentacoes || []).find((a) => a.id === item.apresentacao_id)?.nome || "—",
          observacao: item.observacao || "",
          quantidade: item.quantidade,
          unidade: item.unidade,
          valorUnitario,
          unidadePreco,
          valorTotal: quantidadeConv * valorUnitario,
        };
      });
      const cmv = calcularCMV({
        itens: receita.itens || [],
        embalagemCusto: receita.embalagem_custo || 0,
        quantidadeProducao,
        materiasPrimasById,
        receitasById,
      });
      const blob = await pdf(
        <FichaReceitaPDF receita={receita} itens={linhas} cmv={cmv} quantidadeProducao={quantidadeProducao} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ficha-tecnica-${receita.codigo || receita.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErro("Não consegui gerar o PDF dessa receita.");
    } finally {
      setGerando(false);
    }
  }

  async function anexarPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    setErro("");
    try {
      await enviarFichaPdf(receita.id, file);
    } catch (err) {
      console.error(err);
      setErro("Não consegui anexar esse PDF.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h3 className="font-display text-lg mb-3">Ficha técnica</h3>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={baixarPdf}
          disabled={gerando}
          className="flex items-center gap-1.5 text-sm bg-gold text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-60"
        >
          {gerando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Baixar ficha técnica (PDF)
        </button>

        <label className="flex items-center gap-1.5 text-sm border border-line px-4 py-2 rounded-md hover:bg-gold-soft/30 cursor-pointer">
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          Anexar PDF pronto
          <input type="file" accept=".pdf" onChange={anexarPdf} disabled={enviando} className="hidden" />
        </label>
      </div>

      {erro && <p className="text-xs text-brick mt-2">{erro}</p>}

      {(receita.pdfs || []).length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {receita.pdfs.map((p, i) => (
            <li key={i} className="flex items-center justify-between text-xs border border-line rounded-md px-3 py-2">
              <a href={p.url} target="_blank" rel="noreferrer" className="text-sage hover:underline flex items-center gap-1.5">
                <FileText size={13} /> {p.nome_arquivo}
              </a>
              <span className="text-muted">{p.data}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, tipo = "text", placeholder = "", className = "" }) {
  return (
    <label className={`text-xs text-muted block ${className}`}>
      {label}
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
        className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm"
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Campo2({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
