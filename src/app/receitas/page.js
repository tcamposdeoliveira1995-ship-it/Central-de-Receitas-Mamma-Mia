"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { calcularCMV, formatBRL, formatNumber } from "@/lib/calc";

export default function ReceitasPage() {
  const { receitas, adicionarReceita } = useStore();
  const [selecionadaId, setSelecionadaId] = useState(receitas[0]?.id ?? null);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [empresaNova, setEmpresaNova] = useState("YUKA Alimentos");

  const selecionada = receitas.find((r) => r.id === selecionadaId);

  async function criarReceita() {
    if (!nomeNova.trim()) return;
    const codigo = `REC${String(receitas.length + 1).padStart(4, "0")}`;
    const nova = await adicionarReceita({ codigo, nome: nomeNova, empresa: empresaNova, itens: [] });
    setSelecionadaId(nova.id);
    setNomeNova("");
    setCriando(false);
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Módulo 2</p>
          <h1 className="font-display text-3xl mt-1">Receitas</h1>
        </div>
        <button
          onClick={() => setCriando((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-sage text-white px-4 py-2 rounded-md hover:opacity-90"
        >
          <Plus size={16} /> Nova receita
        </button>
      </header>

      {criando && (
        <div className="bg-surface border border-line rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Nome da receita
            <input
              value={nomeNova}
              onChange={(e) => setNomeNova(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm w-64"
              placeholder="Ex: Coxinha de Frango"
            />
          </label>
          <label className="text-xs text-muted">
            Empresa
            <select
              value={empresaNova}
              onChange={(e) => setEmpresaNova(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-md border border-line text-sm"
            >
              <option>YUKA Alimentos</option>
              <option>TC Distribuidora</option>
            </select>
          </label>
          <button onClick={criarReceita} className="px-4 py-2 bg-sage text-white text-sm rounded-md hover:opacity-90">
            Criar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <ul>
            {receitas.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelecionadaId(r.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left border-b border-line last:border-0 hover:bg-gold-soft/30 ${
                    selecionadaId === r.id ? "bg-gold-soft/50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{r.nome}</p>
                    <p className="text-xs text-muted font-mono-num">{r.codigo} · v{r.versao_atual || 1}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>
              </li>
            ))}
            {receitas.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nenhuma receita cadastrada.</li>}
          </ul>
        </div>

        <div className="lg:col-span-2">
          {selecionada ? (
            <ReceitaDetalhe receita={selecionada} />
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

function ReceitaDetalhe({ receita }) {
  const { materiasPrimas, materiasPrimasById, atualizarItensReceita } = useStore();
  const [itens, setItens] = useState(receita.itens || []);
  const [busca, setBusca] = useState("");

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return [];
    return materiasPrimas
      .filter((mp) => mp.nome.toLowerCase().includes(busca.toLowerCase()))
      .slice(0, 6);
  }, [busca, materiasPrimas]);

  // Sincroniza quando troca de receita selecionada
  useMemo(() => {
    setItens(receita.itens || []);
  }, [receita.id]);

  function adicionarIngrediente(mp) {
    if (itens.some((i) => i.materia_prima_id === mp.id)) {
      setBusca("");
      return;
    }
    const novosItens = [...itens, { materia_prima_id: mp.id, nome: mp.nome, quantidade: 1, unidade: mp.unidade }];
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
    setBusca("");
  }

  function alterarQuantidade(materiaPrimaId, quantidade) {
    const novosItens = itens.map((i) => (i.materia_prima_id === materiaPrimaId ? { ...i, quantidade } : i));
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
  }

  function removerIngrediente(materiaPrimaId) {
    const novosItens = itens.filter((i) => i.materia_prima_id !== materiaPrimaId);
    setItens(novosItens);
    atualizarItensReceita(receita.id, novosItens);
  }

  const quantidadeProducao = receita.rendimento?.quantidade_produzida || 1;
  const cmv = calcularCMV({
    itens,
    embalagemCusto: receita.embalagem_custo || 0,
    quantidadeProducao,
    materiasPrimasById,
  });

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-mono-num text-muted">{receita.codigo}</p>
          <h2 className="font-display text-2xl mt-0.5">{receita.nome}</h2>
          <p className="text-sm text-muted mt-0.5">{receita.empresa}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-sage-soft text-sage font-medium capitalize">
          {(receita.status || "ativa").replace("_", " ")}
        </span>
      </div>

      <div className="relative mt-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar ingrediente para adicionar..."
          className="w-full pl-9 pr-3 py-2.5 rounded-md border border-line text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        {resultadosBusca.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-md shadow-lg overflow-hidden">
            {resultadosBusca.map((mp) => (
              <li key={mp.id}>
                <button
                  onClick={() => adicionarIngrediente(mp)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gold-soft/40 flex justify-between"
                >
                  <span>{mp.nome}</span>
                  <span className="text-muted font-mono-num">{formatBRL(mp.preco_atual)}/{mp.unidade}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <table className="w-full text-sm mt-4">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
            <th className="py-2 font-medium">Ingrediente</th>
            <th className="py-2 font-medium">Qtde</th>
            <th className="py-2 font-medium">Unid.</th>
            <th className="py-2 font-medium text-right">Valor unit.</th>
            <th className="py-2 font-medium text-right">Valor</th>
            <th className="py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const mp = materiasPrimasById[item.materia_prima_id];
            const valorUnitario = mp?.preco_atual || 0;
            return (
              <tr key={item.materia_prima_id} className="border-b border-line last:border-0">
                <td className="py-2">{item.nome || mp?.nome}</td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => alterarQuantidade(item.materia_prima_id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-line rounded-md font-mono-num"
                  />
                </td>
                <td className="py-2 text-muted">{item.unidade}</td>
                <td className="py-2 text-right font-mono-num">{formatBRL(valorUnitario)}</td>
                <td className="py-2 text-right font-mono-num font-medium">{formatBRL(item.quantidade * valorUnitario)}</td>
                <td className="py-2 text-right">
                  <button onClick={() => removerIngrediente(item.materia_prima_id)} className="text-muted hover:text-brick">
                    <X size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
          {itens.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-muted text-sm">
                Nenhum ingrediente ainda — pesquise acima para adicionar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-5 pt-4 border-t border-line grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Ingredientes</p>
          <p className="font-mono-num font-medium mt-0.5">{formatBRL(cmv.custoIngredientes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Embalagem</p>
          <p className="font-mono-num font-medium mt-0.5">{formatBRL(cmv.custoEmbalagem)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Total</p>
          <p className="font-mono-num font-semibold mt-0.5 text-gold">{formatBRL(cmv.custoTotal)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">CMV unitário</span>
        <span className="font-display text-xl font-mono-num text-sage">{formatBRL(cmv.cmvUnitario)}</span>
        <span className="text-xs text-muted">(produção prevista: {formatNumber(quantidadeProducao, 0)} un)</span>
      </div>
    </div>
  );
}
