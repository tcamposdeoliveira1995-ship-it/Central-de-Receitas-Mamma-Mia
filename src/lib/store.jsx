"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { isDemoMode, fetchAll, postAction } from "./sheetsClient";
import * as seed from "./seed";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [categorias, setCategorias] = useState(seed.categorias);
  const [fornecedores, setFornecedores] = useState(seed.fornecedores);
  const [materiasPrimas, setMateriasPrimas] = useState(seed.materiasPrimas);
  const [receitas, setReceitas] = useState(seed.receitas);
  const [producoes, setProducoes] = useState(seed.producoes);
  const [loading, setLoading] = useState(!isDemoMode);

  // Carrega da planilha (via Apps Script) quando a URL estiver configurada.
  useEffect(() => {
    if (isDemoMode) return;
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      const dados = await fetchAll();
      if (cancelado) return;
      if (dados.categorias) setCategorias(dados.categorias);
      if (dados.fornecedores) setFornecedores(dados.fornecedores);
      if (dados.materiasPrimas) setMateriasPrimas(dados.materiasPrimas);
      if (dados.receitas) setReceitas(dados.receitas);
      if (dados.producoes) setProducoes(dados.producoes);
      setLoading(false);
    }

    carregar().catch((err) => {
      console.error("Erro ao carregar da planilha, usando dados de demonstração:", err);
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  const materiasPrimasById = useMemo(() => {
    const map = {};
    for (const mp of materiasPrimas) map[mp.id] = mp;
    return map;
  }, [materiasPrimas]);

  const atualizarPrecoMateriaPrima = useCallback(async (id, novoPreco) => {
    const dataHoje = new Date().toISOString().slice(0, 10);

    if (!isDemoMode) {
      const atualizado = await postAction("updatePrecoMateriaPrima", { id, novoPreco });
      setMateriasPrimas((prev) =>
        prev.map((mp) =>
          mp.id === id
            ? {
                ...mp,
                ...atualizado,
                historico: [...(mp.historico || []), { data: dataHoje, preco: novoPreco }],
              }
            : mp
        )
      );
      return;
    }

    // Modo demonstração: recalcula localmente.
    setMateriasPrimas((prev) =>
      prev.map((mp) => {
        if (mp.id !== id) return mp;
        const historico = [...(mp.historico || []), { data: dataHoje, preco: novoPreco }];
        const precos = historico.map((h) => h.preco);
        return {
          ...mp,
          preco_atual: novoPreco,
          preco_minimo: Math.min(...precos),
          preco_maximo: Math.max(...precos),
          preco_medio: precos.reduce((a, b) => a + b, 0) / precos.length,
          ultima_compra: dataHoje,
          historico,
        };
      })
    );
  }, []);

  const adicionarMateriaPrima = useCallback(async (nova) => {
    if (!isDemoMode) {
      const criada = await postAction("addMateriaPrima", nova);
      const item = { historico: [], ...criada };
      setMateriasPrimas((prev) => [...prev, item]);
      return item;
    }
    const item = { id: `mp-${Date.now()}`, historico: [], ...nova };
    setMateriasPrimas((prev) => [...prev, item]);
    return item;
  }, []);

  const adicionarReceita = useCallback(async (nova) => {
    if (!isDemoMode) {
      const criada = await postAction("addReceita", nova);
      const item = { itens: [], status: "ativa", versao_atual: 1, ...criada };
      setReceitas((prev) => [...prev, item]);
      return item;
    }
    const item = { id: `rec-${Date.now()}`, itens: [], status: "ativa", versao_atual: 1, ...nova };
    setReceitas((prev) => [...prev, item]);
    return item;
  }, []);

  const atualizarItensReceita = useCallback(async (receitaId, itens) => {
    if (!isDemoMode) {
      await postAction("updateItensReceita", { receita_id: receitaId, itens });
    }
    setReceitas((prev) => prev.map((r) => (r.id === receitaId ? { ...r, itens } : r)));
  }, []);

  const value = {
    loading,
    categorias,
    fornecedores,
    materiasPrimas,
    materiasPrimasById,
    receitas,
    producoes,
    atualizarPrecoMateriaPrima,
    adicionarMateriaPrima,
    adicionarReceita,
    atualizarItensReceita,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
