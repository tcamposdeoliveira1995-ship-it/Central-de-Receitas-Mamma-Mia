// Funções de cálculo puras — o coração do Módulo 5 (CMV) e Módulo 6 (Rendimento)

export function custoIngredientes(itens, materiasPrimasById) {
  return itens.reduce((total, item) => {
    const mp = materiasPrimasById[item.materia_prima_id];
    const precoUnitario = mp ? mp.preco_atual : 0;
    return total + item.quantidade * precoUnitario;
  }, 0);
}

export function calcularCMV({ itens, embalagemCusto = 0, quantidadeProducao = 1, materiasPrimasById }) {
  const totalIngredientes = custoIngredientes(itens, materiasPrimasById);
  const totalGeral = totalIngredientes + embalagemCusto;
  const cmvUnitario = quantidadeProducao > 0 ? totalGeral / quantidadeProducao : 0;
  return {
    custoIngredientes: totalIngredientes,
    custoEmbalagem: embalagemCusto,
    custoTotal: totalGeral,
    cmvUnitario,
  };
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
