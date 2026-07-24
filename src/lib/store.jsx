"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase, isDemoMode } from "./supabaseClient";
import * as seed from "./seed";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [categorias, setCategorias] = useState(seed.categorias);
  const [fornecedores, setFornecedores] = useState(seed.fornecedores);
  const [materiasPrimas, setMateriasPrimas] = useState(seed.materiasPrimas);
  const [receitas, setReceitas] = useState(seed.receitas);
  const [producoes, setProducoes] = useState(seed.producoes);
  const [loading, setLoading] = useState(!isDemoMode);

  // Carrega do Supabase quando as credenciais estiverem configuradas.
  useEffect(() => {
    if (isDemoMode) return;
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      const [{ data: cat }, { data: forn }, { data: mps }, { data: recs }, { data: prods }] = await Promise.all([
        supabase.from("categorias").select("*"),
        supabase.from("fornecedores").select("*"),
        supabase.from("materias_primas").select("*"),
        supabase.from("receitas").select("*, receita_itens(*)"),
        supabase.from("producoes").select("*"),
      ]);
      if (cancelado) return;
      if (cat) setCategorias(cat);
      if (forn) setFornecedores(forn);
      if (mps) setMateriasPrimas(mps);
      if (recs) {
        setReceitas(
          recs.map((r) => ({
            ...r,
            itens: (r.receita_itens || []).map((i) => ({
              materia_prima_id: i.materia_prima_id,
              quantidade: Number(i.quantidade),
              unidade: i.unidade,
            })),
          }))
        );
      }
      if (prods) setProducoes(prods);
      setLoading(false);
    }

    carregar().catch((err) => {
      console.error("Erro ao carregar do Supabase, usando dados de demonstração:", err);
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

  const atualizarPrecoMateriaPrima = useCallback(
    async (id, novoPreco) => {
      const dataHoje = new Date().toISOString().slice(0, 10);

      if (!isDemoMode) {
        await supabase.from("historico_precos").insert({ materia_prima_id: id, preco: novoPreco, data: dataHoje });
        const { data: atualizado } = await supabase.from("materias_primas").select("*").eq("id", id).single();
        if (atualizado) {
          setMateriasPrimas((prev) => prev.map((mp) => (mp.id === id ? atualizado : mp)));
          return;
        }
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
    },
    []
  );

  const adicionarMateriaPrima = useCallback(async (nova) => {
    if (!isDemoMode) {
      const { data, error } = await supabase.from("materias_primas").insert(nova).select().single();
      if (!error && data) {
        setMateriasPrimas((prev) => [...prev, data]);
        return data;
      }
    }
    const item = { id: `mp-${Date.now()}`, historico: [], ...nova };
    setMateriasPrimas((prev) => [...prev, item]);
    return item;
  }, []);

  const adicionarReceita = useCallback(async (nova) => {
    const item = { id: `rec-${Date.now()}`, itens: [], status: "ativa", versao_atual: 1, ...nova };
    if (!isDemoMode) {
      const { itens, ...receitaSemItens } = item;
      const { data, error } = await supabase.from("receitas").insert(receitaSemItens).select().single();
      if (!error && data) {
        setReceitas((prev) => [...prev, { ...data, itens: [] }]);
        return data;
      }
    }
    setReceitas((prev) => [...prev, item]);
    return item;
  }, []);

  const atualizarItensReceita = useCallback(async (receitaId, itens) => {
    if (!isDemoMode) {
      await supabase.from("receita_itens").delete().eq("receita_id", receitaId);
      if (itens.length) {
        await supabase.from("receita_itens").insert(
          itens.map((i) => ({ receita_id: receitaId, materia_prima_id: i.materia_prima_id, quantidade: i.quantidade, unidade: i.unidade }))
        );
      }
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
