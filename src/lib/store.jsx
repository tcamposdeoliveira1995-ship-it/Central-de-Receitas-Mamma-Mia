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
  const [setores, setSetores] = useState(isDemoMode ? (seed.setores || []) : []);
  const [funcionarios, setFuncionarios] = useState(isDemoMode ? (seed.funcionarios || []) : []);
  const [materiasPrimas, setMateriasPrimas] = useState(isDemoMode ? seed.materiasPrimas : []);
  const [receitas, setReceitas] = useState(isDemoMode ? seed.receitas : []);
  const [produtos, setProdutos] = useState(isDemoMode ? (seed.produtos || []) : []);
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
      if (dados.setores) setSetores(dados.setores);
      if (dados.funcionarios) setFuncionarios(dados.funcionarios);
      if (dados.materiasPrimas) setMateriasPrimas(dados.materiasPrimas);
      if (dados.receitas) setReceitas(dados.receitas);
      if (dados.produtos) setProdutos(dados.produtos);
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

  const setoresById = useMemo(() => {
    const map = {};
    for (const s of setores) map[s.id] = s;
    return map;
  }, [setores]);

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

  const adicionarLoteMateriaPrima = useCallback(async (materiaPrimaId, dados) => {
    if (!isDemoMode) {
      const criado = await postAction("addLoteMateriaPrima", { materia_prima_id: materiaPrimaId, ...dados });
      setMateriasPrimas((prev) =>
        prev.map((mp) => (mp.id === materiaPrimaId ? { ...mp, lotes: [...(mp.lotes || []), criado] } : mp))
      );
      return criado;
    }
    const criado = {
      id: `lotemp-${Date.now()}`,
      materia_prima_id: materiaPrimaId,
      data_recebimento: new Date().toISOString().slice(0, 10),
      quantidade_disponivel: dados.quantidade_recebida || 0,
      status: "ativo",
      ...dados,
    };
    setMateriasPrimas((prev) =>
      prev.map((mp) => (mp.id === materiaPrimaId ? { ...mp, lotes: [...(mp.lotes || []), criado] } : mp))
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
        mod: { itens: [], custo_total: 0 },
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
      mod: { itens: [], custo_total: 0 },
      ...nova,
    };
    setReceitas((prev) => [...prev, item]);
    return item;
  }, []);

  const excluirReceita = useCallback(async (receitaId) => {
    setReceitas((prev) => prev.filter((r) => r.id !== receitaId));
    if (!isDemoMode) {
      await postAction("deleteReceita", { id: receitaId });
    }
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

  // Linha de produção (Setor) da receita — usada só pelo painel mobile pra
  // filtrar quais receitas aparecem depois de escolher a Empresa. Reaproveita
  // a mesma aba/cadastro de Setores do MOD/HHT, só guarda o id escolhido.
  const atualizarRotaProducaoReceita = useCallback(
    async (receitaId, rotaProducao) => {
      setReceitas((prev) => prev.map((r) => (r.id === receitaId ? { ...r, rota_producao: rotaProducao } : r)));
      if (!isDemoMode) {
        await enfileirar(`rota:${receitaId}`, () =>
          postAction("updateRotaProducaoReceita", { receita_id: receitaId, rota_producao: rotaProducao })
        );
      }
    },
    [enfileirar]
  );

  // ── MOD/HHT ESTIMADO DA RECEITA (lista de funções) ────────────────
  // Recebe itens: [{ setor_id, funcao_id, quantidade_pessoas, tempo_minutos }]
  // — pode ter mais de uma função/setor (ex: Auxiliar na Expedição + Assistente
  // na Produção). Substitui a lista inteira, igual atualizarItensReceita faz
  // com os ingredientes.
  const montarListaMOD = useCallback(
    (itens, chaveTempo, chaveCusto) =>
      (itens || []).map((item) => {
        const custoHora = funcionariosById[item.funcao_id]?.custo_hora || 0;
        const tempo = item[chaveTempo] || 0;
        const custo = calcularCustoMOD(custoHora, item.quantidade_pessoas, tempo);
        return {
          setor_id: item.setor_id || "",
          setor_nome: setoresById[item.setor_id]?.nome || "",
          funcao_id: item.funcao_id || "",
          funcao_nome: funcionariosById[item.funcao_id]?.funcao || "",
          quantidade_pessoas: item.quantidade_pessoas || 0,
          [chaveTempo]: tempo,
          [chaveCusto]: custo,
        };
      }),
    [funcionariosById, setoresById]
  );

  const atualizarMODReceita = useCallback(
    async (receitaId, itens) => {
      const itensCalculados = montarListaMOD(itens, "tempo_minutos", "custo_estimado");
      const custoTotal = itensCalculados.reduce((soma, i) => soma + (i.custo_estimado || 0), 0);
      const mod = { itens: itensCalculados, custo_total: custoTotal };
      setReceitas((prev) => prev.map((r) => (r.id === receitaId ? { ...r, mod } : r)));

      if (!isDemoMode) {
        await enfileirar(`mod:${receitaId}`, () =>
          postAction("updateModReceita", {
            receita_id: receitaId,
            itens: (itens || []).map((i) => ({
              setor_id: i.setor_id || "",
              funcao_id: i.funcao_id || "",
              quantidade_pessoas: i.quantidade_pessoas || 0,
              tempo_minutos: i.tempo_minutos || 0,
            })),
          })
        );
      }
    },
    [enfileirar, montarListaMOD]
  );

  // Mesma lógica pro MOD real de uma produção já existente (fora do momento
  // de criação — ex: editar depois de registrada).
  const atualizarMODProducao = useCallback(
    async (producaoId, itens) => {
      const itensCalculados = montarListaMOD(itens, "tempo_minutos_real", "custo_real");
      const custoTotal = itensCalculados.reduce((soma, i) => soma + (i.custo_real || 0), 0);
      const mod = { itens: itensCalculados, custo_total: custoTotal };
      setProducoes((prev) => prev.map((p) => (p.id === producaoId ? { ...p, mod } : p)));

      if (!isDemoMode) {
        await enfileirar(`modproducao:${producaoId}`, () =>
          postAction("updateModProducao", {
            producao_id: producaoId,
            itens: (itens || []).map((i) => ({
              setor_id: i.setor_id || "",
              funcao_id: i.funcao_id || "",
              quantidade_pessoas: i.quantidade_pessoas || 0,
              tempo_minutos_real: i.tempo_minutos_real || 0,
            })),
          })
        );
      }
    },
    [enfileirar, montarListaMOD]
  );

  // Se quantidade_teorica não vier, usa o rendimento cadastrado da receita
  // (rendimento.quantidade_produzida), pra não precisar digitar de novo toda vez.
  // dados.mod_itens: [{ funcao_id, quantidade_pessoas, tempo_minutos_real }].
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
      const itensMOD = montarListaMOD(dados.mod_itens, "tempo_minutos_real", "custo_real");
      const custoTotalMOD = itensMOD.reduce((soma, i) => soma + (i.custo_real || 0), 0);
      const criada = {
        id: `prod-${Date.now()}`,
        ...payload,
        perda_percentual: perda,
        mod: { itens: itensMOD, custo_total: custoTotalMOD },
      };
      setProducoes((prev) => [...prev, criada]);
      return criada;
    },
    [receitasById, montarListaMOD]
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
      mod: { itens: [], custo_total: 0 },
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

  // ── MÓDULO PRODUTOS (composição a partir de receitas) ──────────────
  // Diferente de adicionarProduto/atualizarProduto/excluirProduto acima
  // (que dependem de uma receita_id fixa, usados na tela de Receitas), estes
  // operam sobre a lista `produtos` no nível raiz — o Produto aqui não
  // pertence a nenhuma receita específica; ele é composto por uma ou mais
  // receitas (ver atualizarComposicaoProduto), na tela própria de Produtos.
  const criarProduto = useCallback(async (dados) => {
    if (!isDemoMode) {
      const criado = await postAction("addProduto", { receita_id: "", ...dados });
      setProdutos((prev) => [...prev, { ...criado, composicao: [] }]);
      return criado;
    }
    const criado = {
      id: `prod-${Date.now()}`,
      receita_id: "",
      composicao: [],
      info_nutricional: null,
      tabela_nutricional: [],
      mod: { itens: [], custo_total: 0 },
      ...dados,
    };
    setProdutos((prev) => [...prev, criado]);
    return criado;
  }, []);

  const atualizarDadosProduto = useCallback(
    async (produtoId, dados) => {
      setProdutos((prev) => prev.map((p) => (p.id === produtoId ? { ...p, ...dados } : p)));
      if (!isDemoMode) {
        await enfileirar(`produtoPadrao:${produtoId}`, () =>
          postAction("updateProduto", { id: produtoId, receita_id: "", ...dados })
        );
      }
    },
    [enfileirar]
  );

  const removerProduto = useCallback(async (produtoId) => {
    setProdutos((prev) => prev.filter((p) => p.id !== produtoId));
    if (!isDemoMode) {
      await postAction("deleteProduto", { id: produtoId });
    }
  }, []);

  // Substitui a composição inteira de um produto — itens: [{ receita_id,
  // quantidade (kg), observacao }]. O CMV do produto é derivado disso no
  // próprio componente da tela (soma de quantidade × custo por kg de cada
  // receita), não fica guardado aqui.
  const atualizarComposicaoProduto = useCallback(
    async (produtoId, itens) => {
      setProdutos((prev) => prev.map((p) => (p.id === produtoId ? { ...p, composicao: itens } : p)));
      if (!isDemoMode) {
        await enfileirar(`composicaoProduto:${produtoId}`, () =>
          postAction("updateComposicaoProduto", {
            produto_id: produtoId,
            itens: (itens || []).map((i) => ({
              receita_id: i.receita_id,
              quantidade: i.quantidade || 0,
              observacao: i.observacao || "",
            })),
          })
        );
      }
    },
    [enfileirar]
  );

  // ── MOD/HHT ESTIMADA DO PRODUTO/SKU ────────────────────────────────
  // Cada Produto tem sua própria lista de MOD (Setor + Função + Pessoas +
  // Tempo) — diferente da Receita, porque produtos da mesma receita podem
  // passar por processos diferentes (ex: um vai ao forno, outro não). O
  // custo ainda é dividido por unidade (rendimento da receita), não fechado
  // por pacote.
  const atualizarMODProduto = useCallback(
    async (receitaId, produtoId, itens) => {
      const itensCalculados = montarListaMOD(itens, "tempo_minutos", "custo_estimado");
      const custoTotal = itensCalculados.reduce((soma, i) => soma + (i.custo_estimado || 0), 0);
      const mod = { itens: itensCalculados, custo_total: custoTotal };
      setReceitas((prev) =>
        prev.map((r) =>
          r.id === receitaId
            ? { ...r, produtos: (r.produtos || []).map((p) => (p.id === produtoId ? { ...p, mod } : p)) }
            : r
        )
      );

      if (!isDemoMode) {
        await enfileirar(`modproduto:${produtoId}`, () =>
          postAction("updateModProduto", {
            produto_id: produtoId,
            itens: (itens || []).map((i) => ({
              setor_id: i.setor_id || "",
              funcao_id: i.funcao_id || "",
              quantidade_pessoas: i.quantidade_pessoas || 0,
              tempo_minutos: i.tempo_minutos || 0,
            })),
          })
        );
      }
    },
    [enfileirar, montarListaMOD]
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
        // "manual" (rótulo do fornecedor, digitado à mão) ou "taco" (preenchido
        // automaticamente a partir da Tabela TACO — ver src/lib/tacoDatabase.js)
        fonte_nutricional: dados.fonte_nutricional || "manual",
        taco_item_id: dados.taco_item_id || "",
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

  // ── NUTRICIONAL CALCULADA DA RECEITA (recheio / receita interna) ──
  // Diferente das outras funções daqui: NÃO atualiza o estado local antes de
  // chamar o backend, porque o cálculo pode ser bloqueado (faltar nutricional
  // de algum ingrediente) — só aplica na tela quando o backend confirma "ok".
  const calcularNutricionalReceita = useCallback(async (receitaId, porcaoReferenciaGramas) => {
    if (!isDemoMode) {
      const resultado = await postAction("calcularNutricionalReceita", {
        receita_id: receitaId,
        porcao_referencia_gramas: porcaoReferenciaGramas || 0,
      });
      if (resultado && resultado.ok) {
        setReceitas((prev) =>
          prev.map((r) =>
            r.id === receitaId
              ? {
                  ...r,
                  nutricional: {
                    data_calculo: resultado.data_calculo,
                    peso_base_gramas: resultado.peso_base_gramas,
                    porcao_referencia_gramas: resultado.porcao_referencia_gramas,
                    status: "ok",
                  },
                  tabela_nutricional: resultado.tabela || [],
                }
              : r
          )
        );
      }
      return resultado;
    }

    // Modo demonstração: as matérias-primas de exemplo não têm nutricional
    // cadastrada, então não dá pra calcular de verdade — avisa igual o backend faria.
    return { ok: false, erro: "Cálculo nutricional não disponível no modo demonstração." };
  }, []);

  // Atualiza só o %VD das linhas já calculadas (não recalcula qtd./porção).
  const salvarVDReceita = useCallback(async (receitaId, vd) => {
    if (!isDemoMode) {
      const resultado = await postAction("salvarVDReceita", { receita_id: receitaId, vd });
      if (resultado && resultado.ok) {
        setReceitas((prev) =>
          prev.map((r) => (r.id === receitaId ? { ...r, tabela_nutricional: resultado.tabela || [] } : r))
        );
      }
      return resultado;
    }
    return { ok: false, erro: "Não disponível no modo demonstração." };
  }, []);

  // ── SETORES (etapa do processo: Produção, Forno/Congelamento, Expedição etc.) ──
  // Cadastro livre — usado pra classificar cada linha de MOD por onde no
  // processo aquele trabalho acontece.

  const adicionarSetor = useCallback(async (dados) => {
    if (!isDemoMode) {
      const criado = await postAction("addSetor", dados);
      setSetores((prev) => [...prev, criado]);
      return criado;
    }
    const criado = { id: `setor-${Date.now()}`, status: "ativo", ...dados };
    setSetores((prev) => [...prev, criado]);
    return criado;
  }, []);

  const atualizarSetor = useCallback(async (id, dados) => {
    setSetores((prev) => prev.map((s) => (s.id === id ? { ...s, ...dados } : s)));
    if (!isDemoMode) {
      await postAction("updateSetor", { id, ...dados });
    }
  }, []);

  const excluirSetor = useCallback(async (id) => {
    setSetores((prev) => prev.filter((s) => s.id !== id));
    if (!isDemoMode) {
      await postAction("deleteSetor", { id });
    }
  }, []);

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
    setores,
    setoresById,
    funcionarios,
    funcionariosById,
    materiasPrimas,
    materiasPrimasById,
    receitas,
    receitasById,
    produtos,
    producoes,
    coccoes,
    recheiosFrios,
    atualizarPrecoMateriaPrima,
    adicionarMateriaPrima,
    adicionarApresentacao,
    adicionarRendimentoMP,
    adicionarLoteMateriaPrima,
    adicionarReceita,
    excluirReceita,
    atualizarItensReceita,
    enviarFichaPdf,
    atualizarRendimentoReceita,
    atualizarDetalhesReceita,
    atualizarRotaProducaoReceita,
    atualizarMODReceita,
    atualizarMODProducao,
    adicionarProducao,
    adicionarCoccao,
    adicionarRecheioFrio,
    adicionarProduto,
    atualizarProduto,
    excluirProduto,
    atualizarMODProduto,
    salvarInfoNutricional,
    salvarNutricionalMateriaPrima,
    calcularNutricionalReceita,
    salvarVDReceita,
    adicionarSetor,
    atualizarSetor,
    excluirSetor,
    adicionarFuncionario,
    atualizarFuncionario,
    excluirFuncionario,
    criarProduto,
    atualizarDadosProduto,
    removerProduto,
    atualizarComposicaoProduto,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
