// Cálculo dos selos de rotulagem nutricional frontal (a "lupa" preta) exigidos
// pela Anvisa em RDC 429/2020 e IN 75/2020: "ALTO EM AÇÚCAR ADICIONADO",
// "ALTO EM GORDURA SATURADA" e "ALTO EM SÓDIO".
//
// Os limites abaixo valem para alimentos SÓLIDOS, calculados sobre os 100g
// (a coluna "Qtd. comparativa" da tabela nutricional, que já é sempre por
// 100g/100ml independente do tamanho da porção). Alimentos líquidos têm
// limites diferentes (por 100ml) — como os produtos da Mamma Mia hoje são
// todos sólidos, só o limite de sólido está implementado por enquanto.
//
// Isso é um cálculo de apoio pra QA identificar rapidamente quando um produto
// bate o limite legal — a arte final do selo (formato exato da lupa, posição
// na embalagem, tamanho mínimo etc.) deve ser conferida com o regulamento
// antes de ir pra impressão.

const LIMITES_SOLIDO = {
  acucar_adicionado: { limite: 15, unidade: "g", texto: "ALTO EM AÇÚCAR ADICIONADO" },
  gordura_saturada: { limite: 6, unidade: "g", texto: "ALTO EM GORDURA SATURADA" },
  sodio: { limite: 600, unidade: "mg", texto: "ALTO EM SÓDIO" },
};

function encontrarValor(tabela, termos) {
  const linha = (tabela || []).find((n) => {
    const nome = (n.nutriente || "").toLowerCase();
    return termos.every((t) => nome.includes(t));
  });
  if (!linha) return null;
  const valor = parseFloat(linha.qtd_comparativa);
  return Number.isFinite(valor) ? valor : null;
}

// Recebe a tabela nutricional do produto (array de
// { nutriente, qtd_comparativa, porcao, vd_percentual }) e devolve os
// selos que esse produto deve exibir, já com o valor encontrado e o limite
// legal usado na comparação.
export function calcularAlertasRotulagem(tabelaNutricional) {
  const acucar = encontrarValor(tabelaNutricional, ["açúcar", "adicionado"]) ??
    encontrarValor(tabelaNutricional, ["acucar", "adicionado"]);
  const gordura = encontrarValor(tabelaNutricional, ["gordura", "saturada"]);
  const sodio = encontrarValor(tabelaNutricional, ["sódio"]) ?? encontrarValor(tabelaNutricional, ["sodio"]);

  const candidatos = [
    { tipo: "acucar_adicionado", valor: acucar },
    { tipo: "gordura_saturada", valor: gordura },
    { tipo: "sodio", valor: sodio },
  ];

  return candidatos
    .filter((c) => c.valor !== null && c.valor >= LIMITES_SOLIDO[c.tipo].limite)
    .map((c) => ({
      tipo: c.tipo,
      texto: LIMITES_SOLIDO[c.tipo].texto,
      valor: c.valor,
      limite: LIMITES_SOLIDO[c.tipo].limite,
      unidade: LIMITES_SOLIDO[c.tipo].unidade,
    }));
}
