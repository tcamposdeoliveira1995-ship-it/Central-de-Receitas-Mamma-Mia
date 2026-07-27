// Funções de cálculo puras — o coração do Módulo 5 (CMV) e Módulo 6 (Rendimento)
//
// Um item de receita pode ser:
//   { tipo: "materia_prima", materia_prima_id, quantidade, unidade }
//   { tipo: "receita", materia_prima_id: <id da sub-receita>, quantidade (kg), unidade: "kg" }
// Itens antigos sem `tipo` são tratados como matéria-prima (compatibilidade).

// O preço de uma matéria-prima é sempre por `mp.unidade` (ex: R$/kg). Se o
// ingrediente da receita foi lançado numa unidade diferente mas da mesma
// família (ex: 500 g numa matéria-prima precificada por kg), convertemos
// antes de multiplicar — senão 500 g vira "500 kg" no cálculo, inflando o
// custo em até 1000x. Entre famílias diferentes (ex: kg e L) não dá pra
// converter sem densidade, então mantemos a quantidade como está.
function familiaUnidade(unidade) {
  const u = (unidade || "").toLowerCase();
  if (u === "kg" || u === "g") return "massa";
  if (u === "l" || u === "ml") return "volume";
  return "contagem";
}

export function converterQuantidade(quantidade, deUnidade, paraUnidade) {
  const de = (deUnidade || "").toLowerCase();
  const para = (paraUnidade || "").toLowerCase();
  if (!de || !para || de === para) return quantidade;
  if (familiaUnidade(de) !== familiaUnidade(para)) return quantidade;

  if (familiaUnidade(de) === "massa") {
    const emGramas = de === "kg" ? quantidade * 1000 : quantidade;
    return para === "kg" ? emGramas / 1000 : emGramas;
  }
  if (familiaUnidade(de) === "volume") {
    const emMl = de === "l" ? quantidade * 1000 : quantidade;
    return para === "l" ? emMl / 1000 : emMl;
  }
  return quantidade;
}

// Quando um item de receita aponta pra uma Apresentação (ex: "Frango — Cubos")
// que tem um Rendimento cadastrado, usamos o custo real por kg líquido daquele
// rendimento (já embutindo a perda de limpeza) em vez do preço de compra bruto
// da matéria-prima. Prioriza o rendimento marcado como padrão para aquela
// apresentação; se não houver um marcado, usa o primeiro encontrado.
export function custoEfetivoIngrediente(item, mp) {
  if (!mp) return { valorUnitario: 0, unidadePreco: item?.unidade, viaRendimento: false };

  if (item?.apresentacao_id) {
    const rendimentos = (mp.rendimentos || []).filter((r) => r.apresentacao_id === item.apresentacao_id);
    const rendimento = rendimentos.find((r) => r.e_padrao) || rendimentos[0];
    if (rendimento && rendimento.custo_real_kg_liquido) {
      return { valorUnitario: rendimento.custo_real_kg_liquido, unidadePreco: "kg", viaRendimento: true };
    }
  }

  return { valorUnitario: mp.preco_atual, unidadePreco: mp.unidade, viaRendimento: false };
}

export function custoIngredientes(itens, materiasPrimasById, receitasById = {}, visitados = new Set()) {
  return itens.reduce((total, item) => {
    if (item.tipo === "receita") {
      const subReceita = receitasById[item.materia_prima_id];
      if (!subReceita) return total;
      const custoPorKg = custoPorKgReceita(subReceita, receitasById, materiasPrimasById, visitados);
      return total + item.quantidade * custoPorKg;
    }
    const mp = materiasPrimasById[item.materia_prima_id];
    if (!mp) return total;
    const { valorUnitario, unidadePreco } = custoEfetivoIngrediente(item, mp);
    const quantidadeNaUnidadeDoPreco = converterQuantidade(item.quantidade, item.unidade, unidadePreco);
    return total + quantidadeNaUnidadeDoPreco * valorUnitario;
  }, 0);
}

export function calcularCMV({ itens, embalagemCusto = 0, quantidadeProducao = 1, materiasPrimasById, receitasById = {}, visitados }) {
  const totalIngredientes = custoIngredientes(itens, materiasPrimasById, receitasById, visitados || new Set());
  const totalGeral = totalIngredientes + embalagemCusto;
  const cmvUnitario = quantidadeProducao > 0 ? totalGeral / quantidadeProducao : 0;
  return {
    custoIngredientes: totalIngredientes,
    custoEmbalagem: embalagemCusto,
    custoTotal: totalGeral,
    cmvUnitario,
  };
}

// Custo por kg de uma receita quando ela é usada como ingrediente de outra
// (ex: "Massa de Óleo" dentro de "Coxinha"). Usa o peso final cadastrado no
// Módulo 6 (Rendimento) como base. `visitados` evita loop infinito caso
// duas receitas acabem se referenciando uma à outra.
export function custoPorKgReceita(receita, receitasById, materiasPrimasById, visitados = new Set()) {
  if (!receita || visitados.has(receita.id)) return 0;
  const proximosVisitados = new Set(visitados);
  proximosVisitados.add(receita.id);

  const cmv = calcularCMV({
    itens: receita.itens || [],
    embalagemCusto: receita.embalagem_custo || 0,
    quantidadeProducao: 1, // queremos o custo total, não o unitário
    materiasPrimasById,
    receitasById,
    visitados: proximosVisitados,
  });

  const pesoFinal = receita.rendimento?.peso_final || 0;
  return pesoFinal > 0 ? cmv.custoTotal / pesoFinal : 0;
}

export function calcularRendimento({ pesoIngredientes, pesoFinal, pesoUnitario, custoTotal }) {
  const rendimentoPercentual = pesoIngredientes > 0 ? (pesoFinal / pesoIngredientes) * 100 : 0;
  const perdaKg = Math.max(pesoIngredientes - pesoFinal, 0);
  const perdaPercentual = pesoIngredientes > 0 ? (perdaKg / pesoIngredientes) * 100 : 0;
  const quantidadeProduzida = pesoUnitario > 0 ? Math.floor(pesoFinal / pesoUnitario) : 0;
  const cmvPorKg = pesoFinal > 0 ? custoTotal / pesoFinal : 0;
  const cmvUnitario = quantidadeProduzida > 0 ? custoTotal / quantidadeProduzida : 0;
  return {
    rendimentoPercentual,
    perdaKg,
    perdaPercentual,
    quantidadeProduzida,
    cmvPorKg,
    cmvUnitario,
  };
}

export function formatBRL(value) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value, decimals = 2) {
  return (value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
