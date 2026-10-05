// Reconhece o texto colado/extraído do PDF (tabela de ingredientes) e separa em
// { nome, quantidade, unidade } — sem IA, só reconhecimento de padrão.
//
// Aceita duas formas de escrever cada linha:
//
// 1) Nome primeiro (como uma ficha técnica/tabela de PDF exporta, colunas
//    separadas por TAB ou por 2+ espaços):
//
//      Açúcar        2.700 KG
//      Sal           500 G
//      Farinha de trigo  25 KG
//
// 2) Quantidade primeiro (como as pessoas normalmente digitam uma lista à
//    mão, com ou sem "de" entre a unidade e o nome):
//
//      39 kls de carne moída
//      07 litros água
//      150 sal
//
// As duas são tentadas em toda linha — isso cobre tanto quem cola uma
// tabela de PDF quanto quem cola uma lista escrita à mão.

const UNIDADES_CONHECIDAS = ["kg", "g", "l", "ml", "un", "caixa", "pacote", "fardo"];

export function parseTextoReceita(texto) {
  const linhas = (texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const itens = [];

  for (const linha of linhas) {
    if (/^ingredient/i.test(linha) || /^quantidade/i.test(linha)) continue; // cabeçalho

    const item = parseLinhaQuantidadePrimeiro(linha) || parseLinhaNomePrimeiro(linha);
    if (item) itens.push(item);
  }

  return itens;
}

// "39 kls de carne moída" / "07 litros água" / "7,800 kl de pimentão
// vermelho." — quantidade e unidade vêm ANTES do nome. O "de"/"d'" entre a
// unidade e o nome é opcional. Só casa quando o token logo após o número é
// mesmo uma unidade reconhecida — assim não confunde uma linha tipo
// "2 potes de requeijão" (onde "potes" não é unidade válida) com esse
// formato, e ela cai pro parser de "nome primeiro" (que vai ignorá-la, por
// não ter como separar nome de quantidade com segurança).
function parseLinhaQuantidadePrimeiro(linha) {
  const match = linha.match(/^([\d.,]+)\s*([a-zA-Zçãéíóúâêô]+)\.?\s+(?:de\s+|d['’]\s*)?(.+?)\.?\s*$/iu);
  if (!match) return null;

  const unidade = normalizarUnidade(match[2]);
  if (!UNIDADES_CONHECIDAS.includes(unidade)) return null;

  const quantidade = parseNumeroPtBR(match[1]);
  if (quantidade === null) return null;

  const nome = match[3].trim();
  if (!nome) return null;

  return { nome: capitalizarPrimeiraLetra(nome), quantidade, unidade };
}

// Formato de tabela (PDF/planilha exportada): nome primeiro, quantidade e
// unidade depois, colunas separadas por TAB ou por 2+ espaços.
function parseLinhaNomePrimeiro(linha) {
  let partes = linha.split("\t").map((p) => p.trim()).filter(Boolean);
  if (partes.length < 2) {
    partes = linha.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  }
  if (partes.length < 2) return null;

  const nome = partes[0];
  const resto = partes.slice(1).join(" ");

  // Ignora a linha de cabeçalho ("Ingredientes" / "Quantidade para...")
  if (/^ingredient/i.test(nome) || /quantidade/i.test(resto)) return null;

  const match = resto.match(/([\d.,]+)\s*([a-zA-Zçãéíóú%]+)?/i);
  if (!match) return null;

  const quantidade = parseNumeroPtBR(match[1]);
  if (quantidade === null) return null;

  const unidade = normalizarUnidade(match[2] || "");

  return { nome, quantidade, unidade };
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
  if (chave === "kilo" || chave === "kilos" || chave === "kl" || chave === "kls" || chave === "kgs") return "kg";
  if (chave === "litro" || chave === "litros") return "l";
  if (chave === "grama" || chave === "gramas" || chave === "gr" || chave === "grs") return "g";
  if (chave === "mls") return "ml";
  return chave || "un";
}

function capitalizarPrimeiraLetra(texto) {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Compara nomes ignorando maiúsculas/acentos pra casar com Matérias-Primas
// já cadastradas.
function normalizarNome(nome) {
  return (nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
