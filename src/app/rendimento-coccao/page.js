"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatNumber, formatBRL } from "@/lib/calc";

// Identificador local só pra chave do React nas linhas de ingrediente
// adicionado durante a cocção — não precisa persistir.
function gerarLinhaId() {
  return `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// "dentro" (verde) dentro da faixa; "atencao" (amarelo) perto da faixa (até
// 15% da largura da faixa fora dela); "fora" (vermelho) além disso.
// Retorna null se a meta não foi preenchida (sem faixa pra comparar).
function classificarMeta(valor, min, max) {
  if (min === "" || max === "" || min === null || max === null) return null;
  if (valor >= min && valor <= max) return "dentro";
  const margem = (max - min) * 0.15;
  if (valor >= min - margem && valor <= max + margem) return "atencao";
  return "fora";
}

const CORES_STATUS = {
  dentro: { texto: "text-sage", fundo: "bg-sage-soft", label: "Dentro da meta" },
  atencao: { texto: "text-gold", fundo: "bg-gold-soft", label: "Atenção" },
  fora: { texto: "text-brick", fundo: "bg-brick-soft", label: "Fora da meta" },
};

function BarraProgresso({ percentual, status }) {
  const cor = status === "dentro" ? "bg-sage" : status === "fora" ? "bg-brick" : status === "atencao" ? "bg-gold" : "bg-muted";
  const largura = Math.max(0, Math.min(100, percentual));
  return (
    <div className="w-full h-2 bg-line rounded-full overflow-hidden mt-2">
      <div className={`h-full ${cor}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

export default function RendimentoCoccaoPage() {
  const { coccoes, receitas, adicionarCoccao } = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);

  const nomeReceita = (id) => receitas.find((r) => r.id === id)?.nome || "—";
  const ordenadas = [...coccoes].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 11</p>
          <h1 className="font-display text-3xl mt-1">Rendimento de Cocção</h1>
          <p className="text-sm text-muted mt-1">
            Peso antes e depois da cocção, com cálculo automático de rendimento, perda e custo por lote.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Registrar cocção
        </button>
      </header>

      {mostrarForm && (
        <NovaCoccaoForm
          receitas={receitas}
          onSalvar={async (dados) => {
            await adicionarCoccao(dados);
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
                <th className="px-5 py-3 font-medium text-right">Peso cru</th>
                <th className="px-5 py-3 font-medium text-right">Peso cozido</th>
                <th className="px-5 py-3 font-medium text-right">Rend. proteína</th>
                <th className="px-5 py-3 font-medium text-right">Perda</th>
                <th className="px-5 py-3 font-medium text-right">Custo da perda</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">{c.receita_nome || nomeReceita(c.receita_id)}</td>
                  <td className="px-5 py-3 text-muted">{new Date(c.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-5 py-3 font-mono-num text-muted">{c.numero_producao || "—"}</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(c.peso_liquido_cru, 3)} kg</td>
                  <td className="px-5 py-3 text-right font-mono-num">{formatNumber(c.peso_liquido_cozido, 3)} kg</td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium text-sage">
                    {formatNumber(c.rendimento_carne_percentual, 1)}%
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium text-brick">
                    {formatNumber(c.perda_carne_kg, 3)} kg
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num text-muted">
                    {c.custo_perda_proteina > 0 ? formatBRL(c.custo_perda_proteina) : "—"}
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted text-sm">
                    Nenhuma cocção registrada ainda.
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

function NovaCoccaoForm({ receitas, onSalvar, onCancelar }) {
  const { materiasPrimasById } = useStore();
  const [receitaId, setReceitaId] = useState(receitas[0]?.id || "");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [unidadeSetor, setUnidadeSetor] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [loteMateriaPrima, setLoteMateriaPrima] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [numeroProducao, setNumeroProducao] = useState("");

  const [pesoRecipienteVazioCru, setPesoRecipienteVazioCru] = useState("");
  const [pesoRecipienteMaisCru, setPesoRecipienteMaisCru] = useState("");
  const [pesoRecipienteVazioCozido, setPesoRecipienteVazioCozido] = useState("");
  const [pesoRecipienteMaisCozido, setPesoRecipienteVazioMaisCozido] = useState("");

  const [ingredientes, setIngredientes] = useState([]);

  const [metaProteinaMin, setMetaProteinaMin] = useState("");
  const [metaProteinaMax, setMetaProteinaMax] = useState("");
  const [metaPreparacaoMin, setMetaPreparacaoMin] = useState("");
  const [metaPreparacaoMax, setMetaPreparacaoMax] = useState("");

  const [materiaPrimaCustoId, setMateriaPrimaCustoId] = useState("");

  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [temperaturaMedia, setTemperaturaMedia] = useState("");

  const [salvando, setSalvando] = useState(false);

  const receita = receitas.find((r) => r.id === receitaId);
  const ingredientesDaReceita = (receita?.itens || []).filter((i) => i.tipo !== "receita");

  function num(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  const pesoLiquidoCru = Math.max(0, num(pesoRecipienteMaisCru) - num(pesoRecipienteVazioCru));
  const somaIngredientes = ingredientes.reduce((acc, i) => acc + num(i.peso), 0);
  const pesoTotalAntes = pesoLiquidoCru + somaIngredientes;
  const pesoLiquidoCozido = Math.max(0, num(pesoRecipienteMaisCozido) - num(pesoRecipienteVazioCozido));

  const rendimentoCarne = pesoLiquidoCru > 0 ? (pesoLiquidoCozido / pesoLiquidoCru) * 100 : 0;
  const perdaCarneKg = pesoLiquidoCru - pesoLiquidoCozido;
  const perdaCarnePercentual = pesoLiquidoCru > 0 ? (perdaCarneKg / pesoLiquidoCru) * 100 : 0;

  const rendimentoPreparacao = pesoTotalAntes > 0 ? (pesoLiquidoCozido / pesoTotalAntes) * 100 : 0;
  const perdaPreparacaoKg = pesoTotalAntes - pesoLiquidoCozido;
  const perdaPreparacaoPercentual = pesoTotalAntes > 0 ? (perdaPreparacaoKg / pesoTotalAntes) * 100 : 0;

  const statusProteina = classificarMeta(rendimentoCarne, metaProteinaMin === "" ? "" : num(metaProteinaMin), metaProteinaMax === "" ? "" : num(metaProteinaMax));
  const statusPreparacao = classificarMeta(rendimentoPreparacao, metaPreparacaoMin === "" ? "" : num(metaPreparacaoMin), metaPreparacaoMax === "" ? "" : num(metaPreparacaoMax));

  const mpCusto = materiaPrimaCustoId ? materiasPrimasById[materiaPrimaCustoId] : null;
  const custoKgProteina = mpCusto?.preco_atual || 0;
  const custoPerdaProteina = perdaCarneKg > 0 ? perdaCarneKg * custoKgProteina : 0;

  let tempoTotalMinutos = 0;
  if (horaInicio && horaFim) {
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFim.split(":").map(Number);
    tempoTotalMinutos = h2 * 60 + m2 - (h1 * 60 + m1);
    if (tempoTotalMinutos < 0) tempoTotalMinutos += 24 * 60; // cocção que passou da meia-noite
  }

  function adicionarLinhaIngrediente() {
    setIngredientes((prev) => [...prev, { linha_id: gerarLinhaId(), nome: "", peso: "" }]);
  }

  function alterarIngrediente(linhaId, campo, valor) {
    setIngredientes((prev) => prev.map((i) => (i.linha_id === linhaId ? { ...i, [campo]: valor } : i)));
  }

  function removerIngrediente(linhaId) {
    setIngredientes((prev) => prev.filter((i) => i.linha_id !== linhaId));
  }

  async function salvar() {
    if (!receitaId || !pesoRecipienteMaisCru || !pesoRecipienteMaisCozido) return;
    setSalvando(true);
    try {
      await onSalvar({
        receita_id: receitaId,
        data,
        unidade_setor: unidadeSetor,
        responsavel,
        lote_materia_prima: loteMateriaPrima,
        equipamento,
        numero_producao: numeroProducao,
        peso_recipiente_vazio_cru: num(pesoRecipienteVazioCru),
        peso_recipiente_mais_cru: num(pesoRecipienteMaisCru),
        peso_liquido_cru: pesoLiquidoCru,
        ingredientes_adicionados: ingredientes
          .filter((i) => i.nome.trim())
          .map((i) => ({ nome: i.nome, peso: num(i.peso) })),
        peso_total_antes_coccao: pesoTotalAntes,
        peso_recipiente_vazio_cozido: num(pesoRecipienteVazioCozido),
        peso_recipiente_mais_cozido: num(pesoRecipienteMaisCozido),
        peso_liquido_cozido: pesoLiquidoCozido,
        rendimento_carne_percentual: rendimentoCarne,
        perda_carne_kg: perdaCarneKg,
        perda_carne_percentual: perdaCarnePercentual,
        rendimento_preparacao_percentual: rendimentoPreparacao,
        perda_preparacao_kg: perdaPreparacaoKg,
        perda_preparacao_percentual: perdaPreparacaoPercentual,
        meta_proteina_min: metaProteinaMin === "" ? null : num(metaProteinaMin),
        meta_proteina_max: metaProteinaMax === "" ? null : num(metaProteinaMax),
        meta_preparacao_min: metaPreparacaoMin === "" ? null : num(metaPreparacaoMin),
        meta_preparacao_max: metaPreparacaoMax === "" ? null : num(metaPreparacaoMax),
        materia_prima_custo_id: materiaPrimaCustoId || null,
        custo_kg_proteina: custoKgProteina,
        custo_perda_proteina: custoPerdaProteina,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        tempo_total_minutos: tempoTotalMinutos,
        temperatura_media: temperaturaMedia === "" ? null : num(temperaturaMedia),
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 mb-4">
      {/* 1. Identificação do processo */}
      <p className="text-xs uppercase tracking-wide text-muted mb-2">Identificação</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Receita">
          <select
            value={receitaId}
            onChange={(e) => setReceitaId(e.target.value)}
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
        <Campo label="Número da produção / batelada">
          <input
            value={numeroProducao}
            onChange={(e) => setNumeroProducao(e.target.value)}
            placeholder="Ex: L-2907"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Unidade ou setor">
          <input
            value={unidadeSetor}
            onChange={(e) => setUnidadeSetor(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Responsável">
          <input
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Equipamento utilizado">
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
        <Campo label="Lote da matéria-prima">
          <input
            value={loteMateriaPrima}
            onChange={(e) => setLoteMateriaPrima(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
          />
        </Campo>
      </div>

      {/* Tempo e temperatura */}
      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">Tempo e temperatura</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Campo label="Início">
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Fim">
          <input
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Tempo total (calculado)">
          <div className="px-2 py-1.5 rounded-md bg-gold-soft/40 text-sm font-mono-num font-medium">
            {horaInicio && horaFim ? `${tempoTotalMinutos} min` : "—"}
          </div>
        </Campo>
        <Campo label="Temperatura média da panela (°C)">
          <input
            value={temperaturaMedia}
            onChange={(e) => setTemperaturaMedia(e.target.value)}
            placeholder="Ex: 92"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
      </div>

      {/* 2. Pesagem antes da cocção */}
      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">Pesagem antes da cocção</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Peso do recipiente vazio (kg)">
          <input
            value={pesoRecipienteVazioCru}
            onChange={(e) => setPesoRecipienteVazioCru(e.target.value)}
            placeholder="Ex: 5,200"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Peso recipiente + produto cru (kg)">
          <input
            value={pesoRecipienteMaisCru}
            onChange={(e) => setPesoRecipienteMaisCru(e.target.value)}
            placeholder="Ex: 45,200"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Peso líquido cru (calculado)">
          <div className="px-2 py-1.5 rounded-md bg-gold-soft/40 text-sm font-mono-num font-medium">
            {formatNumber(pesoLiquidoCru, 3)} kg
          </div>
        </Campo>
      </div>

      {/* 3. Ingredientes adicionados */}
      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">Ingredientes adicionados</p>
      <div className="space-y-2">
        {ingredientes.map((ing) => (
          <div key={ing.linha_id} className="flex items-center gap-2">
            <input
              value={ing.nome}
              onChange={(e) => alterarIngrediente(ing.linha_id, "nome", e.target.value)}
              placeholder="Ex: Água, cebola, temperos..."
              className="flex-1 px-2 py-1.5 rounded-md border border-line text-sm"
            />
            <input
              value={ing.peso}
              onChange={(e) => alterarIngrediente(ing.linha_id, "peso", e.target.value)}
              placeholder="Peso (kg)"
              className="w-32 px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
            />
            <button onClick={() => removerIngrediente(ing.linha_id)} className="text-muted hover:text-brick">
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={adicionarLinhaIngrediente}
          className="text-xs flex items-center gap-1 text-sage hover:underline"
        >
          <Plus size={12} /> Adicionar ingrediente
        </button>
        {ingredientes.length > 0 && (
          <div className="text-xs text-muted pt-1 space-y-0.5">
            <p>Proteína: <span className="font-mono-num font-medium">{formatNumber(pesoLiquidoCru, 3)} kg</span></p>
            <p>Ingredientes: <span className="font-mono-num font-medium">{formatNumber(somaIngredientes, 3)} kg</span></p>
            <p>Peso total da preparação: <span className="font-mono-num font-medium">{formatNumber(pesoTotalAntes, 3)} kg</span></p>
          </div>
        )}
      </div>

      {/* 4. Pesagem depois da cocção */}
      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">Pesagem depois da cocção</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Peso do recipiente vazio (kg)">
          <input
            value={pesoRecipienteVazioCozido}
            onChange={(e) => setPesoRecipienteVazioCozido(e.target.value)}
            placeholder="Ex: 5,200"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Peso recipiente + produto cozido (kg)">
          <input
            value={pesoRecipienteMaisCozido}
            onChange={(e) => setPesoRecipienteVazioMaisCozido(e.target.value)}
            placeholder="Ex: 37,200"
            className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num"
          />
        </Campo>
        <Campo label="Peso líquido cozido (calculado)">
          <div className="px-2 py-1.5 rounded-md bg-gold-soft/40 text-sm font-mono-num font-medium">
            {formatNumber(pesoLiquidoCozido, 3)} kg
          </div>
        </Campo>
      </div>

      {/* Meta de rendimento */}
      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">🎯 Meta de rendimento (opcional, pra esse lote)</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Campo label="Proteína — mínimo %">
          <input value={metaProteinaMin} onChange={(e) => setMetaProteinaMin(e.target.value)} placeholder="Ex: 93" className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num" />
        </Campo>
        <Campo label="Proteína — máximo %">
          <input value={metaProteinaMax} onChange={(e) => setMetaProteinaMax(e.target.value)} placeholder="Ex: 96" className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num" />
        </Campo>
        <Campo label="Preparação — mínimo %">
          <input value={metaPreparacaoMin} onChange={(e) => setMetaPreparacaoMin(e.target.value)} placeholder="Ex: 60" className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num" />
        </Campo>
        <Campo label="Preparação — máximo %">
          <input value={metaPreparacaoMax} onChange={(e) => setMetaPreparacaoMax(e.target.value)} placeholder="Ex: 65" className="w-full px-2 py-1.5 rounded-md border border-line text-sm font-mono-num" />
        </Campo>
      </div>

      {/* Custo da perda */}
      <p className="text-xs uppercase tracking-wide text-muted mt-5 mb-2">💰 Custo da perda (opcional)</p>
      <Campo label="Matéria-prima usada como referência de preço" className="sm:max-w-sm">
        <select
          value={materiaPrimaCustoId}
          onChange={(e) => setMateriaPrimaCustoId(e.target.value)}
          className="w-full px-2 py-1.5 rounded-md border border-line text-sm"
        >
          <option value="">Não calcular custo</option>
          {ingredientesDaReceita.map((i) => (
            <option key={i.materia_prima_id} value={i.materia_prima_id}>{i.nome}</option>
          ))}
        </select>
      </Campo>

      {/* 5. Indicadores automáticos */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`rounded-lg p-4 ${statusProteina ? CORES_STATUS[statusProteina].fundo : "bg-sage-soft/40"}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted">🟢 Rendimento da Proteína</p>
            {statusProteina && (
              <span className={`text-xs font-medium ${CORES_STATUS[statusProteina].texto}`}>
                {CORES_STATUS[statusProteina].label}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap mt-1">
            <span className="font-display text-xl text-sage">{formatNumber(rendimentoCarne, 1)}%</span>
            <span className="text-xs text-muted">
              perda: {formatNumber(perdaCarneKg, 3)} kg ({formatNumber(perdaCarnePercentual, 1)}%)
            </span>
          </div>
          {custoPerdaProteina > 0 && (
            <p className="text-xs text-brick mt-1">💰 custo da perda: {formatBRL(custoPerdaProteina)}</p>
          )}
          <BarraProgresso percentual={rendimentoCarne} status={statusProteina} />
        </div>
        <div className={`rounded-lg p-4 ${statusPreparacao ? CORES_STATUS[statusPreparacao].fundo : "bg-gold-soft/40"}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted">🟡 Rendimento da Preparação</p>
            {statusPreparacao && (
              <span className={`text-xs font-medium ${CORES_STATUS[statusPreparacao].texto}`}>
                {CORES_STATUS[statusPreparacao].label}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap mt-1">
            <span className="font-display text-xl text-foreground">{formatNumber(rendimentoPreparacao, 1)}%</span>
          </div>
          <p className="text-xs text-muted mt-1">
            peso inicial: {formatNumber(pesoTotalAntes, 3)} kg · peso final: {formatNumber(pesoLiquidoCozido, 3)} kg · perda total: {formatNumber(perdaPreparacaoKg, 3)} kg
          </p>
          <BarraProgresso percentual={rendimentoPreparacao} status={statusPreparacao} />
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={salvar}
          disabled={salvando}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-sage text-white rounded-md hover:opacity-90 disabled:opacity-60"
        >
          {salvando && <Loader2 size={13} className="animate-spin" />}
          Salvar cocção
        </button>
        <button onClick={onCancelar} disabled={salvando} className="text-xs px-3 py-1.5 border border-line rounded-md">
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
