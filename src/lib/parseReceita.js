// Reconhece o texto colado/extraído do PDF (tabela de ingredientes) e separa em
// { nome, quantidade, unidade } — sem IA, só reconhecimento de padrão.
// Formato esperado (uma linha por ingrediente, colunas separadas por TAB):
//
//   Açúcar        2.700 KG
//   Sal           500 G
//   Farinha de trigo  25 KG

const UNIDADES_CONHECIDAS = ["kg", "g", "l", "ml", "un", "caixa", "pacote", "fardo"];

export function parseTextoReceita(texto) {
  const linhas = (texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const itens = [];

  for (const linha of linhas) {
    let partes = linha.split("\t").map((p) => p.trim()).filter(Boolean);
    if (partes.length < 2) {
      partes = linha.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    }
    if (partes.length < 2) continue;

    const nome = partes[0];
    const resto = partes.slice(1).join(" ");

    // Ignora a linha de cabeçalho ("Ingredientes" / "Quantidade para...")
    if (/^ingredient/i.test(nome) || /quantidade/i.test(resto)) continue;

    const match = resto.match(/([\d.,]+)\s*([a-zA-Zçãéíóú%]+)?/i);
    if (!match) continue;

    const quantidade = parseNumeroPtBR(match[1]);
    if (quantidade === null) continue;

    const unidade = normalizarUnidade(match[2] || "");

    itens.push({ nome, quantidade, unidade });
  }

  return itens;
}

// Quantidades de ficha técnica raramente usam separador de milhar (não faz
// sentido "2.700 kg" de açúcar num lote de 25kg de farinha) — então o ponto
// é tratado como separador decimal por padrão. Só vira separador de milhar
// quando a vírgula também aparece (aí sim é claramente o padrão pt-BR:
// "1.234,5" -> 1234.5).
function parseNumeroPtBR(str) {
  let s = str.trim();
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function normalizarUnidade(unidadeBruta) {
  const chave = unidadeBruta.toLowerCase().trim();
  if (UNIDADES_CONHECIDAS.includes(chave)) return chave;
  if (chave === "kilo" || chave === "kilos") return "kg";
  if (chave === "litro" || chave === "litros") return "l";
  if (chave === "grama" || chave === "gramas") return "g";
  return chave || "un";
}

// Compara nomes ignorando maiúsculas/acentos pra casar com Matérias-Primas
// já cadastradas.
function normalizarNome(nome) {
  return (nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function encontrarMateriaPrimaPorNome(nome, materiasPrimas) {
  const alvo = normalizarNome(nome);
  if (!alvo) return null;
  return (
    materiasPrimas.find((mp) => normalizarNome(mp.nome) === alvo) ||
    materiasPrimas.find((mp) => {
      const nomeMp = normalizarNome(mp.nome);
      return nomeMp.includes(alvo) || alvo.includes(nomeMp);
    }) ||
    null
  );
}
