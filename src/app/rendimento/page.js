"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Check, Loader2, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularCMV, calcularRendimento, pesoTotalIngredientes, formatBRL, formatNumber } from "@/lib/calc";
import { TIPOS_RECEITA, LABEL_TIPO_RECEITA } from "@/lib/tiposReceita";

// Atalhos de padronização de embalagem — clicar já preenche peso unitário
// (kg) e o nome da unidade de uma vez, pra não digitar toda vez e manter o
// mesmo padrão em todas as receitas do mesmo tipo.
const PRESETS_EMBALAGEM = [
  { label: "Proteína — pacote de 4kg", pesoUnitario: 4, unidadeNome: "pacote de 4kg" },
  { label: "Molho — pacote de 2kg", pesoUnitario: 2, unidadeNome: "pacote de 2kg" },
  { label: "Soja — pacote de 2kg", pesoUnitario: 2, unidadeNome: "pacote de 2kg" },
];

// Ignora acento/maiúscula pra busca por nome não depender de digitar
// exatamente igual (ex: "acem" acha "Acém").
function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function RendimentoPage() {
  const { receitas, materiasPrimasById, receitasById, atualizarRendimentoReceita } = useStore();
  const [tipoFiltro, setTipoFiltro] = useState(""); // "" = todos os tipos
  const [busca, setBusca] = useState("");
  const [receitaId, setReceitaId] = useState(receitas[0]?.id ?? "");
  const receita = receitas.find((r) => r.id === receitaId);

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

  const [pesos, setPesos] = useState(() => ({
    pesoIngredientes: receita?.rendimento?.peso_ingredientes || 0,
    pesoFinal: receita?.rendimento?.peso_final || 0,
    pesoUnitario: receita?.rendimento?.peso_unitario || 0,
    unidadeNome: receita?.rendimento?.unidade_nome || "un",
  }));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function selecionarReceita(id) {
    const r = receitas.find((x) => x.id === id);
    setReceitaId(id);
    setPesos({
      pesoIngredientes: r?.rendimento?.peso_ingredientes || 0,
      pesoFinal: r?.rendimento?.peso_final || 0,
      pesoUnitario: r?.rendimento?.peso_unitario || 0,
      unidadeNome: r?.rendimento?.unidade_nome || "un",
    });
    setSalvo(false);
  }

  // Se a receita selecionada sumiu da lista filtrada (mudou o tipo ou a
  // busca), seleciona a primeira da lista filtrada automaticamente — evita
  // ficar com uma receita "escondida" selecionada sem aparecer no filtro.
  useEffect(() => {
    if (receitasFiltradas.length === 0) return;
    if (receitasFiltradas.some((r) => r.id === receitaId)) return;
    selecionarReceita(receitasFiltradas[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitasFiltradas]);

  const cmv = useMemo(() => {
    if (!receita) return { custoTotal: 0 };
    return calcularCMV({
      itens: receita.itens || [],
      embalagemCusto: receita.embalagem_custo || 0,
      quantidadeProducao: 1, // custo total, não unitário
      materiasPrimasById,
      receitasById,
    });
  }, [receita, materiasPrimasById, receitasById]);

  const pesoCalculado = useMemo(() => {
    if (!receita) return { total: 0, itensNaoConvertidos: [] };
    return pesoTotalIngredientes(receita.itens || [], materiasPrimasById, receitasById);
  }, [receita, materiasPrimasById, receitasById]);

  const resultado = calcularRendimento({
    pesoIngredientes: pesos.pesoIngredientes,
    pesoFinal: pesos.pesoFinal,
    pesoUnitario: pesos.pesoUnitario,
    custoTotal: cmv.custoTotal,
  });

  function set(field, value) {
    setPesos((p) => ({ ...p, [field]: parseFloat(value) || 0 }));
    setSalvo(false);
  }

  function setUnidadeNome(value) {
    setPesos((p) => ({ ...p, unidadeNome: value }));
    setSalvo(false);
  }

  function aplicarPreset(preset) {
    setPesos((p) => ({ ...p, pesoUnitario: preset.pesoUnitario, unidadeNome: preset.unidadeNome }));
    setSalvo(false);
  }

  async function salvar() {
    if (!receita) return;
    setSalvando(true);
    try {
      await atualizarRendimentoReceita(receita.id, {
        peso_ingredientes: pesos.pesoIngredientes,
        peso_final: pesos.pesoFinal,
        peso_unitario: pesos.pesoUnitario,
        quantidade_produzida: resultado.quantidadeProduzida,
        unidade_nome: pesos.unidadeNome || "un",
      });
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 6</p>
        <h1 className="font-display text-3xl mt-1">Rendimento</h1>
        <p className="text-sm text-muted mt-1">
          Esses pesos definem o peso final da receita — que é a base usada quando ela é aproveitada como
          ingrediente de outra receita (ex: uma massa dentro de um salgado).
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
            placeholder="Buscar por nome ou código..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-line text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <label className="text-xs text-muted flex items-center gap-2">
          Receita
          <select
            value={receitaId}
            onChange={(e) => selecionarReceita(e.target.value)}
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

      {receita && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs uppercase tracking-wide text-muted mr-1">Padronizar embalagem:</span>
            {PRESETS_EMBALAGEM.map((preset) => {
              const ativo = pesos.pesoUnitario === preset.pesoUnitario && pesos.unidadeNome === preset.unidadeNome;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => aplicarPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    ativo
                      ? "border-sage bg-sage-soft text-sage"
                      : "border-line text-muted hover:bg-gold-soft/30"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-line rounded-lg p-5">
              <h2 className="font-display text-lg mb-4">Entrada — pesos (kg)</h2>
              <div className="space-y-3">
                <div>
                  <Campo label="Peso dos ingredientes" value={pesos.pesoIngredientes} onChange={(v) => set("pesoIngredientes", v)} />
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      Soma calculada da receita: <span className="font-mono-num font-medium">{formatNumber(pesoCalculado.total, 3)} kg</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => set("pesoIngredientes", pesoCalculado.total)}
                      className="text-sage hover:underline"
                    >
                      Usar esse valor
                    </button>
                  </div>
                  {pesoCalculado.itensNaoConvertidos.length > 0 && (
                    <p className="text-xs text-brick mt-1">
                      Não entraram na soma (unidade não conversível pra peso): {pesoCalculado.itensNaoConvertidos.join(", ")}.
                    </p>
                  )}
                </div>
                <Campo label="Peso final (pronto)" value={pesos.pesoFinal} onChange={(v) => set("pesoFinal", v)} />
                <p className="text-xs text-muted -mt-1.5">
                  Peça pesada de verdade depois de assar/fritar/processar — o sistema não calcula isso sozinho.
                </p>
                <Campo label="Peso unitário (por unidade)" value={pesos.pesoUnitario} onChange={(v) => set("pesoUnitario", v)} step="0.001" />
                <label className="text-xs text-muted block">
                  Nome da unidade produzida
                  <input
                    type="text"
                    value={pesos.unidadeNome}
                    onChange={(e) => setUnidadeNome(e.target.value)}
                    placeholder="Ex: un, pacote de 4kg, pacote de 2kg"
                    className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm"
                  />
                </label>
                <p className="text-xs text-muted -mt-1.5">
                  Só rótulo de exibição (aparece em vez de "un" nas telas de Receitas e CMV) — não muda o cálculo.
                </p>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-lg p-5">
              <h2 className="font-display text-lg mb-4">Sistema calcula</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Resultado label="Rendimento" value={`${formatNumber(resultado.rendimentoPercentual, 1)}%`} tone="sage" />
                <Resultado label="Perda" value={`${formatNumber(resultado.perdaKg, 2)} kg`} tone="brick" />
                <Resultado label="Perda %" value={`${formatNumber(resultado.perdaPercentual, 1)}%`} tone="brick" />
                <Resultado
                  label="Qtde produzida"
                  value={`${formatNumber(resultado.quantidadeProduzida, 0)} ${pesos.unidadeNome || "un"}`}
                  tone="gold"
                />
                <Resultado label="CMV por kg" value={formatBRL(resultado.cmvPorKg)} />
                <Resultado
                  label={`CMV por ${pesos.unidadeNome || "un"}`}
                  value={formatBRL(resultado.cmvUnitario)}
                  tone="gold"
                />
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
              Salvar rendimento
            </button>
            {salvo && (
              <span className="text-sm text-sage flex items-center gap-1">
                <Check size={14} /> Salvo — já pode ser usada como ingrediente de outra receita
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, step = "0.01" }) {
  return (
    <label className="text-xs text-muted block">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-line text-sm font-mono-num"
      />
    </label>
  );
}

function Resultado({ label, value, tone = "default" }) {
  const toneClass = { default: "text-foreground", sage: "text-sage", gold: "text-gold", brick: "text-brick" }[tone];
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-mono-num font-semibold text-lg mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}
