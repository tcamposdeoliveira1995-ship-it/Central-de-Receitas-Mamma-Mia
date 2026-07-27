"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { isDemoMode, fetchAll, postAction } from "./sheetsClient";
import { arquivoParaBase64 } from "./pdfText";
import * as seed from "./seed";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [categorias, setCategorias] = useState(isDemoMode ? seed.categorias : []);
  const [fornecedores, setFornecedores] = useState(isDemoMode ? seed.fornecedores : []);
  const [materiasPrimas, setMateriasPrimas] = useState(isDemoMode ? seed.materiasPrimas : []);
  const [receitas, setReceitas] = useState(isDemoMode ? seed.receitas : []);
  const [producoes, setProducoes] = useState(isDemoMode ? seed.producoes : []);
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

  const receitasById = useMemo(() => {
    const map = {};
    for (const r of receitas) map[r.id] = r;
    return map;
  }, [receitas]);

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
      const item = { historico: [], apresentacoes: [], rendimentos: [], ...criada };
      setMateriasPrimas((prev) => [...prev, item]);
      return item;
    }
    const item = { id: `mp-${Date.now()}`, historico: [], apresentacoes: [], rendimentos: [], ...nova };
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

  const enviarFichaPdf = useCallback(async (receitaId, arquivo) => {
    const dataHoje = new Date().toISOString().slice(0, 10);

    if (!isDemoMode) {
      const base64 = await arquivoParaBase64(arquivo);
      const resultado = await postAction("uploadFichaPDF", {
        receita_id: receitaId,
        nome_arquivo: arquivo.name,
        base64,
      });
      setReceitas((prev) =>
        prev.map((r) =>
          r.id === receitaId
            ? { ...r, pdfs: [...(r.pdfs || []), { nome_arquivo: arquivo.name, url: resultado.url, data: dataHoje }] }
            : r
        )
      );
      return resultado;
    }

    // Modo demonstração: gera um link local só pra essa sessão (não persiste).
    const url = URL.createObjectURL(arquivo);
    setReceitas((prev) =>
      prev.map((r) =>
        r.id === receitaId ? { ...r, pdfs: [...(r.pdfs || []), { nome_arquivo: arquivo.name, url, data: dataHoje }] } : r
      )
    );
    return { url };
  }, []);

  const atualizarRendimentoReceita = useCallback(async (receitaId, rendimento) => {
    if (!isDemoMode) {
      await postAction("updateRendimentoReceita", { receita_id: receitaId, ...rendimento });
    }
    setReceitas((prev) =>
      prev.map((r) => (r.id === receitaId ? { ...r, rendimento: { ...r.rendimento, ...rendimento } } : r))
    );
  }, []);

  // ── APRESENTAÇÃO DA MATÉRIA-PRIMA ──────────────────────────────

  const adicionarApresentacao = useCallback(async (materiaPrimaId, dados) => {
    const payload = { materia_prima_id: materiaPrimaId, ...dados };
    let criada;
    if (!isDemoMode) {
      criada = await postAction("addApresentacao", payload);
    } else {
      criada = { id: `ap-${Date.now()}`, ...payload, ativo: dados.ativo !== false };
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) => {
        if (mp.id !== materiaPrimaId) return mp;
        const atuais = criada.e_padrao
          ? (mp.apresentacoes || []).map((a) => ({ ...a, e_padrao: false }))
          : mp.apresentacoes || [];
        return { ...mp, apresentacoes: [...atuais, criada] };
      })
    );
    return criada;
  }, []);

  const atualizarApresentacao = useCallback(async (materiaPrimaId, id, dados) => {
    if (!isDemoMode) {
      await postAction("updateApresentacao", { id, ...dados });
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) =>
        mp.id !== materiaPrimaId
          ? mp
          : {
              ...mp,
              apresentacoes: (mp.apresentacoes || []).map((a) => (a.id === id ? { ...a, ...dados } : a)),
            }
      )
    );
  }, []);

  const definirApresentacaoPadrao = useCallback(async (materiaPrimaId, id) => {
    if (!isDemoMode) {
      await postAction("setApresentacaoPadrao", { id });
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) =>
        mp.id !== materiaPrimaId
          ? mp
          : {
              ...mp,
              apresentacoes: (mp.apresentacoes || []).map((a) => ({ ...a, e_padrao: a.id === id })),
            }
      )
    );
  }, []);

  const removerApresentacao = useCallback(async (materiaPrimaId, id) => {
    if (!isDemoMode) {
      await postAction("deleteApresentacao", { id });
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) =>
        mp.id !== materiaPrimaId
          ? mp
          : { ...mp, apresentacoes: (mp.apresentacoes || []).filter((a) => a.id !== id) }
      )
    );
  }, []);

  // ── RENDIMENTO (FATOR DE CORREÇÃO / COCÇÃO) ────────────────────

  const adicionarRendimento = useCallback(async (materiaPrimaId, dados) => {
    const payload = { materia_prima_id: materiaPrimaId, ...dados };
    let criado;
    if (!isDemoMode) {
      criado = await postAction("addRendimento", payload);
    } else {
      const pesoLiquido = Number(dados.peso_liquido) || 0;
      const pesoBruto = Number(dados.peso_bruto) || 0;
      const pesoPosCoccao = Number(dados.peso_pos_coccao) || 0;
      const precoCompraKgBruto = Number(dados.preco_compra_kg_bruto) || 0;
      const fator_correcao = pesoLiquido > 0 ? pesoBruto / pesoLiquido : 0;
      const fator_coccao =
        dados.tipo_coccao && dados.tipo_coccao !== "N/A" && pesoLiquido > 0 ? pesoPosCoccao / pesoLiquido : 1;
      const custo_real_kg_liquido = precoCompraKgBruto * fator_correcao;
      const custo_real_kg_cozido = fator_coccao > 0 ? custo_real_kg_liquido / fator_coccao : custo_real_kg_liquido;
      const quantidadeUnidades = Number(dados.quantidade_unidades) || 0;
      const peso_unidade_liquido = quantidadeUnidades > 0 ? pesoLiquido / quantidadeUnidades : 0;
      const peso_unidade_cozido =
        quantidadeUnidades > 0 && dados.tipo_coccao && dados.tipo_coccao !== "N/A"
          ? pesoPosCoccao / quantidadeUnidades
          : peso_unidade_liquido;
      criado = {
        id: `rd-${Date.now()}`,
        ...payload,
        fator_correcao: Number(fator_correcao.toFixed(4)),
        fator_coccao: Number(fator_coccao.toFixed(4)),
        custo_real_kg_liquido: Number(custo_real_kg_liquido.toFixed(2)),
        custo_real_kg_cozido: Number(custo_real_kg_cozido.toFixed(2)),
        peso_unidade_liquido: Number(peso_unidade_liquido.toFixed(6)),
        peso_unidade_cozido: Number(peso_unidade_cozido.toFixed(6)),
      };
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) => {
        if (mp.id !== materiaPrimaId) return mp;
        const atuais = criado.e_padrao
          ? (mp.rendimentos || []).map((r) =>
              r.apresentacao_id === criado.apresentacao_id ? { ...r, e_padrao: false } : r
            )
          : mp.rendimentos || [];
        return { ...mp, rendimentos: [...atuais, criado] };
      })
    );
    return criado;
  }, []);

  const atualizarRendimento = useCallback(async (materiaPrimaId, id, dados) => {
    let atualizado;
    if (!isDemoMode) {
      atualizado = await postAction("updateRendimento", { id, ...dados });
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) =>
        mp.id !== materiaPrimaId
          ? mp
          : {
              ...mp,
              rendimentos: (mp.rendimentos || []).map((r) =>
                r.id === id ? { ...r, ...dados, ...(atualizado || {}) } : r
              ),
            }
      )
    );
  }, []);

  const definirRendimentoPadrao = useCallback(async (materiaPrimaId, id) => {
    if (!isDemoMode) {
      await postAction("setRendimentoPadrao", { id });
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) => {
        if (mp.id !== materiaPrimaId) return mp;
        const alvo = (mp.rendimentos || []).find((r) => r.id === id);
        if (!alvo) return mp;
        return {
          ...mp,
          rendimentos: (mp.rendimentos || []).map((r) =>
            r.apresentacao_id === alvo.apresentacao_id ? { ...r, e_padrao: r.id === id } : r
          ),
        };
      })
    );
  }, []);

  const removerRendimento = useCallback(async (materiaPrimaId, id) => {
    if (!isDemoMode) {
      await postAction("deleteRendimento", { id });
    }
    setMateriasPrimas((prev) =>
      prev.map((mp) =>
        mp.id !== materiaPrimaId ? mp : { ...mp, rendimentos: (mp.rendimentos || []).filter((r) => r.id !== id) }
      )
    );
  }, []);

  const value = {
    loading,
    categorias,
    fornecedores,
    materiasPrimas,
    materiasPrimasById,
    receitas,
    receitasById,
    producoes,
    atualizarPrecoMateriaPrima,
    adicionarMateriaPrima,
    adicionarReceita,
    atualizarItensReceita,
    enviarFichaPdf,
    atualizarRendimentoReceita,
    adicionarApresentacao,
    atualizarApresentacao,
    definirApresentacaoPadrao,
    removerApresentacao,
    adicionarRendimento,
    atualizarRendimento,
    definirRendimentoPadrao,
    removerRendimento,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
