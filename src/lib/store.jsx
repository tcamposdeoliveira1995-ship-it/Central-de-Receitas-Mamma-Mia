"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { isDemoMode, fetchAll, postAction } from "./sheetsClient";
import { arquivoParaBase64 } from "./pdfText";
import * as seed from "./seed";

const StoreContext = createContext(null);

// Usado só no modo demonstração, pra espelhar o mesmo cálculo que o Code.gs
// faz no backend real (salário mensal + carga horária semanal → custo/hora).
const SEMANAS_POR_MES = 52 / 12;

function calcularCustoHora(salarioMensal, cargaHorariaSemanal) {
  if (!cargaHorariaSemanal || cargaHorariaSemanal <= 0) return 0;
  const horasMensais = cargaHorariaSemanal * SEMANAS_POR_MES;
  if (!horasMensais) return 0;
  return (salarioMensal || 0) / horasMensais;
}

function calcularCustoMOD(custoHora, quantidadePessoas, tempoMinutos) {
  return (custoHora || 0) * (quantidadePessoas || 0) * ((tempoMinutos || 0) / 60);
}

export function StoreProvider({ children }) {
  const [categorias, setCategorias] = useState(isDemoMode ? seed.categorias : []);
  const [fornecedores, setFornecedores] = useState(isDemoMode ? seed.fornecedores : []);
  const [funcionarios, setFuncionarios] = useState(isDemoMode ? (seed.funcionarios || []) : []);
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
      if (dados.funcionarios) setFuncionarios(dados.funcionarios);
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

  const funcionariosById = useMemo(() => {
    const map = {};
    for (const f of funcionarios) map[f.id] = f;
    return map;
  }, [funcionarios]);

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
      const item = {
        itens: [],
        status: "ativa",
        versao_atual: 1,
        mod: { funcao_id: "", quantidade_pessoas: 0, tempo_minutos: 0, custo_estimado: 0 },
        ...criada,
      };
      setReceitas((prev) => [...prev, item]);
      return item;
    }
    const item = {
      id: `rec-${Date.now()}`,
      itens: [],
      status: "ativa",
      versao_atual: 1,
      mod: { funcao_id: "", quantidade_pessoas: 0, tempo_minutos: 0, custo_estimado: 0 },
      ...nova,
    };
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

  // ── MOD/HHT ESTIMADO DA RECEITA ───────────────────────────────────
  // Recebe { funcao_id, quantidade_pessoas, tempo_minutos } e calcula/congela
  // o custo estimado usando o custo/hora daquela função.
  const atualizarMODReceita = useCallback(
    async (receitaId, dadosMOD) => {
      const custoHora = funcionariosById[dadosMOD.funcao_id]?.custo_hora || 0;
      const custoEstimado = calcularCustoMOD(custoHora, dadosMOD.quantidade_pessoas, dadosMOD.tempo_minutos);
      const mod = {
        funcao_id: dadosMOD.funcao_id || "",
        funcao_nome: funcionariosById[dadosMOD.funcao_id]?.funcao || "",
        quantidade_pessoas: dadosMOD.quantidade_pessoas || 0,
        tempo_minutos: dadosMOD.tempo_minutos || 0,
        custo_estimado: custoEstimado,
      };
      setReceitas((prev) => prev.map((r) => (r.id === receitaId ? { ...r, mod } : r)));

      if (!isDemoMode) {
        await enfileirar(`mod:${receitaId}`, () =>
          postAction("updateMODReceita", {
            receita_id: receitaId,
            mod_funcao_id: dadosMOD.funcao_id || "",
            mod_quantidade_pessoas: dadosMOD.quantidade_pessoas || 0,
            mod_tempo_minutos: dadosMOD.tempo_minutos || 0,
          })
        );
      }
    },
    [enfileirar, funcionariosById]
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
      const custoHora = funcionariosById[dados.mod_funcao_id]?.custo_hora || 0;
      const custoRealMOD = calcularCustoMOD(custoHora, dados.mod_quantidade_pessoas, dados.mod_tempo_minutos_real);
      const criada = {
        id: `prod-${Date.now()}`,
        ...payload,
        perda_percentual: perda,
        mod_custo_real: custoRealMOD,
      };
      setProducoes((prev) => [...prev, criada]);
      return criada;
    },
    [receitasById, funcionariosById]
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

  // ── PRODUTOS (SKUs de uma receita) ────────────────────────────────
  // Uma receita pode ter vários produtos/códigos (ex: cru e assado do
  // mesmo hambúrguer), cada um com seus dados de sistema (código, EAN,
  // NCM, CEST, departamento/seção/categoria, peso, validade).

  const adicionarProduto = useCallback(async (receitaId, dados) => {
    if (!isDemoMode) {
      const criado = await postAction("addProduto", { receita_id: receitaId, ...dados });
      setReceitas((prev) =>
        prev.map((r) => (r.id === receitaId ? { ...r, produtos: [...(r.produtos || []), criado] } : r))
      );
      return criado;
    }
    const criado = {
      id: `prod-${Date.now()}`,
      receita_id: receitaId,
      info_nutricional: null,
      tabela_nutricional: [],
      ...dados,
    };
    setReceitas((prev) =>
      prev.map((r) => (r.id === receitaId ? { ...r, produtos: [...(r.produtos || []), criado] } : r))
    );
    return criado;
  }, []);

  const atualizarProduto = useCallback(
    async (receitaId, produtoId, dados) => {
      setReceitas((prev) =>
        prev.map((r) =>
          r.id === receitaId
            ? { ...r, produtos: (r.produtos || []).map((p) => (p.id === produtoId ? { ...p, ...dados } : p)) }
            : r
        )
      );
      if (!isDemoMode) {
        await enfileirar(`produto:${produtoId}`, () =>
          postAction("updateProduto", { id: produtoId, receita_id: receitaId, ...dados })
        );
      }
    },
    [enfileirar]
  );

  const excluirProduto = useCallback(
    async (receitaId, produtoId) => {
      setReceitas((prev) =>
        prev.map((r) =>
          r.id === receitaId ? { ...r, produtos: (r.produtos || []).filter((p) => p.id !== produtoId) } : r
        )
      );
      if (!isDemoMode) {
        await postAction("deleteProduto", { id: produtoId });
      }
    },
    []
  );

  // Salva ingredientes/alérgicos + a tabela nutricional inteira de um produto
  // (a tabela é sempre substituída por completo, não editada linha a linha).
  const salvarInfoNutricional = useCallback(
    async (receitaId, produtoId, dados) => {
      const infoNutricional = {
        apelido: dados.apelido || "",
        ingredientes_texto: dados.ingredientes_texto || "",
        alergicos_texto: dados.alergicos_texto || "",
        porcao_gramas: dados.porcao_gramas || 0,
        medida_caseira: dados.medida_caseira || "",
      };
      setReceitas((prev) =>
        prev.map((r) =>
          r.id === receitaId
            ? {
                ...r,
                produtos: (r.produtos || []).map((p) =>
                  p.id === produtoId
                    ? { ...p, info_nutricional: infoNutricional, tabela_nutricional: dados.tabela || [] }
                    : p
                ),
              }
            : r
        )
      );
      if (!isDemoMode) {
        await enfileirar(`nutricional:${produtoId}`, () =>
          postAction("salvarInfoNutricional", { produto_id: produtoId, ...dados })
        );
      }
    },
    [enfileirar]
  );

  // ── NUTRICIONAL DA MATÉRIA-PRIMA (rótulo do fornecedor) ──────────

  const salvarNutricionalMateriaPrima = useCallback(
    async (materiaPrimaId, dados) => {
      const nutricional = {
        fornecedor_id: dados.fornecedor_id || "",
        ingredientes_texto: dados.ingredientes_texto || "",
        alergicos_texto: dados.alergicos_texto || "",
        porcao_referencia_gramas: dados.porcao_referencia_gramas || 0,
      };
      setMateriasPrimas((prev) =>
        prev.map((mp) =>
          mp.id === materiaPrimaId
            ? { ...mp, nutricional, tabela_nutricional: dados.tabela || [] }
            : mp
        )
      );
      if (!isDemoMode) {
        await enfileirar(`mpnutricional:${materiaPrimaId}`, () =>
          postAction("salvarNutricionalMateriaPrima", { materia_prima_id: materiaPrimaId, ...dados })
        );
      }
    },
    [enfileirar]
  );

  // ── FUNCIONÁRIOS / FUNÇÕES (base do MOD/HHT) ──────────────────────
  // Cada registro é uma "função" (cargo): salário, carga horária semanal e
  // quantidade de funcionários naquela função. O custo/hora é calculado e
  // aplicado igual pra todos os que exercem a mesma função.

  const adicionarFuncionario = useCallback(async (dados) => {
    if (!isDemoMode) {
      const criado = await postAction("addFuncionario", dados);
      setFuncionarios((prev) => [...prev, criado]);
      return criado;
    }
    const custoHora = calcularCustoHora(dados.salario_mensal, dados.carga_horaria_semanal);
    const criado = {
      id: `func-${Date.now()}`,
      status: "ativo",
      quantidade_funcionarios: 1,
      ...dados,
      custo_hora: custoHora,
    };
    setFuncionarios((prev) => [...prev, criado]);
    return criado;
  }, []);

  const atualizarFuncionario = useCallback(async (id, dados) => {
    const custoHora = calcularCustoHora(dados.salario_mensal, dados.carga_horaria_semanal);
    setFuncionarios((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...dados, custo_hora: custoHora } : f))
    );
    if (!isDemoMode) {
      await postAction("updateFuncionario", { id, ...dados });
    }
  }, []);

  const excluirFuncionario = useCallback(async (id) => {
    setFuncionarios((prev) => prev.filter((f) => f.id !== id));
    if (!isDemoMode) {
      await postAction("deleteFuncionario", { id });
    }
  }, []);

  const value = {
    loading,
    categorias,
    fornecedores,
    funcionarios,
    funcionariosById,
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
    atualizarMODReceita,
    adicionarProducao,
    adicionarCoccao,
    adicionarRecheioFrio,
    adicionarProduto,
    atualizarProduto,
    excluirProduto,
    salvarInfoNutricional,
    salvarNutricionalMateriaPrima,
    adicionarFuncionario,
    atualizarFuncionario,
    excluirFuncionario,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
