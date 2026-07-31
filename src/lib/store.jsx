"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  const [coccoes, setCoccoes] = useState(isDemoMode ? (seed.coccoes || []) : []);
  const [recheiosFrios, setRecheiosFrios] = useState(isDemoMode ? (seed.recheiosFrios || []) : []);
  const [loading, setLoading] = useState(!isDemoMode);

  // Fila de gravação por chave (ex: por receita) — garante que duas chamadas pra
  // salvar a MESMA coisa nunca rodem em paralelo. Sem isso, se duas gravações saem
  // quase juntas (ex: apagar um ingrediente logo depois de editar outro campo), a
  // que chega por último no servidor "vence" e pode desfazer a mudança mais recente,
  // mesmo sem nenhum erro aparecer — porque tecnicamente nenhuma das duas falhou.
  const filasRef = useRef({});
  const enfileirar = useCallback((chave, tarefa) => {
    const anterior = filasRef.current[chave] || Promise.resolve();
    const atual = anterior.then(tarefa, tarefa).catch((err) => {
      console.error(`Erro na fila de gravação (${chave}):`, err);
    });
    filasRef.current[chave] = atual;
    return atual;
  }, []);

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
      if (dados.coccoes) setCoccoes(dados.coccoes);
      if (dados.recheiosFrios) setRecheiosFrios(dados.recheiosFrios);
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

  const atualizarPrecoMateriaPrima = useCallback(
    async (id, novoPreco) => {
      const dataHoje = new Date().toISOString().slice(0, 10);

      if (!isDemoMode) {
        const atualizado = await enfileirar(`mp:${id}`, () =>
          postAction("updatePrecoMateriaPrima", { id, novoPreco })
        );
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
    },
    [enfileirar]
  );

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

  const adicionarApresentacao = useCallback(async (materiaPrimaId, dados) => {
    if (!isDemoMode) {
      const criada = await postAction("addApresentacao", { materia_prima_id: materiaPrimaId, ...dados });
      setMateriasPrimas((prev) =>
        prev.map((mp) =>
          mp.id === materiaPrimaId ? { ...mp, apresentacoes: [...(mp.apresentacoes || []), criada] } : mp
        )
      );
      return criada;
    }
    const criada = { id: `apr-${Date.now()}`, materia_prima_id: materiaPrimaId, ...dados };
    setMateriasPrimas((prev) =>
      prev.map((mp) => (mp.id === materiaPrimaId ? { ...mp, apresentacoes: [...(mp.apresentacoes || []), criada] } : mp))
    );
    return criada;
  }, []);

  const adicionarRendimentoMP = useCallback(async (materiaPrimaId, dados) => {
    if (!isDemoMode) {
      const criado = await postAction("addRendimentoMP", dados);
      setMateriasPrimas((prev) =>
        prev.map((mp) => (mp.id === materiaPrimaId ? { ...mp, rendimentos: [...(mp.rendimentos || []), criado] } : mp))
      );
      return criado;
    }
    const custoRealKgLiquido = dados.peso_liquido > 0 ? (dados.preco_compra_kg * dados.peso_bruto) / dados.peso_liquido : 0;
    const custoRealKgCozido = dados.peso_cozido > 0 ? (dados.preco_compra_kg * dados.peso_bruto) / dados.peso_cozido : 0;
    const criado = {
      id: `rmp-${Date.now()}`,
      data: new Date().toISOString().slice(0, 10),
      ...dados,
      custo_real_kg_liquido: custoRealKgLiquido,
      custo_real_kg_cozido: custoRealKgCozido,
    };
    setMateriasPrimas((prev) =>
      prev.map((mp) => (mp.id === materiaPrimaId ? { ...mp, rendimentos: [...(mp.rendimentos || []), criado] } : mp))
    );
    return criado;
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

  const atualizarItensReceita = useCallback(
    async (receitaId, itens) => {
      setReceitas((prev) => prev.map((r) => (r.id === receitaId ? { ...r, itens } : r)));
      if (!isDemoMode) {
        await enfileirar(`itens:${receitaId}`, () =>
          postAction("updateItensReceita", { receita_id: receitaId, itens })
        );
      }
    },
    [enfileirar]
  );

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

  const atualizarRendimentoReceita = useCallback(
    async (receitaId, rendimento) => {
      setReceitas((prev) =>
        prev.map((r) => (r.id === receitaId ? { ...r, rendimento: { ...r.rendimento, ...rendimento } } : r))
      );
      if (!isDemoMode) {
        await enfileirar(`rendimento:${receitaId}`, () =>
          postAction("updateRendimentoReceita", { receita_id: receitaId, ...rendimento })
        );
      }
    },
    [enfileirar]
  );

  const atualizarDetalhesReceita = useCallback(
    async (receitaId, detalhes) => {
      setReceitas((prev) => prev.map((r) => (r.id === receitaId ? { ...r, ...detalhes } : r)));
      if (!isDemoMode) {
        await enfileirar(`detalhes:${receitaId}`, () =>
          postAction("updateDetalhesReceita", { receita_id: receitaId, ...detalhes })
        );
      }
    },
    [enfileirar]
  );

  // Se quantidade_teorica não vier, usa o rendimento cadastrado da receita
  // (rendimento.quantidade_produzida), pra não precisar digitar de novo toda vez.
  const adicionarProducao = useCallback(
    async (dados) => {
      const receita = receitasById[dados.receita_id];
      const quantidadeTeorica =
        dados.quantidade_teorica ?? receita?.rendimento?.quantidade_produzida ?? 0;
      const payload = { ...dados, quantidade_teorica: quantidadeTeorica };

      if (!isDemoMode) {
        const criada = await postAction("addProducao", payload);
        setProducoes((prev) => [...prev, criada]);
        return criada;
      }

      const perda =
        quantidadeTeorica > 0
          ? ((quantidadeTeorica - dados.quantidade_real) / quantidadeTeorica) * 100
          : 0;
      const criada = {
        id: `prod-${Date.now()}`,
        ...payload,
        perda_percentual: perda,
      };
      setProducoes((prev) => [...prev, criada]);
      return criada;
    },
    [receitasById]
  );

  const adicionarCoccao = useCallback(async (dados) => {
    if (!isDemoMode) {
      const criada = await postAction("addCoccao", dados);
      setCoccoes((prev) => [...prev, criada]);
      return criada;
    }

    const criada = { id: `coccao-${Date.now()}`, ...dados };
    setCoccoes((prev) => [...prev, criada]);
    return criada;
  }, []);

  const adicionarRecheioFrio = useCallback(async (dados) => {
    if (!isDemoMode) {
      const criada = await postAction("addRecheioFrio", dados);
      setRecheiosFrios((prev) => [...prev, criada]);
      return criada;
    }

    const criada = { id: `recheio-${Date.now()}`, ...dados };
    setRecheiosFrios((prev) => [...prev, criada]);
    return criada;
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
    coccoes,
    recheiosFrios,
    atualizarPrecoMateriaPrima,
    adicionarMateriaPrima,
    adicionarApresentacao,
    adicionarRendimentoMP,
    adicionarReceita,
    atualizarItensReceita,
    enviarFichaPdf,
    atualizarRendimentoReceita,
    atualizarDetalhesReceita,
    adicionarProducao,
    adicionarCoccao,
    adicionarRecheioFrio,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
