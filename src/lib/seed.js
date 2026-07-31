// Dados de demonstração — usados apenas enquanto a planilha não está
// conectada (ver src/lib/sheetsClient.js). Assim que a variável
// NEXT_PUBLIC_SHEETS_API_URL for configurada (URL do Apps Script Web App
// gerado a partir de mamma-formula-appsscript/Code.gs), o sistema passa a
// ler direto da planilha "Mamma Formula - Dados".

export const categorias = [
  { id: "cat-laticinios", nome: "Laticínios", tipo: "materia_prima" },
  { id: "cat-farinaceos", nome: "Farináceos", tipo: "materia_prima" },
  { id: "cat-carnes", nome: "Carnes", tipo: "materia_prima" },
  { id: "cat-embalagem", nome: "Embalagens", tipo: "materia_prima" },
  { id: "cat-assados", nome: "Assados", tipo: "receita" },
  { id: "cat-fritos", nome: "Fritos", tipo: "receita" },
];

export const fornecedores = [
  { id: "forn-alfa", nome: "Laticínios Alfa" },
  { id: "forn-moinho", nome: "Moinho Bom Trigo" },
  { id: "forn-boi", nome: "Frigorífico Boi Forte" },
];

export const materiasPrimas = [
  {
    id: "mp-0015",
    codigo: "MP00015",
    nome: "Queijo Mussarela",
    categoria_id: "cat-laticinios",
    fornecedor_principal_id: "forn-alfa",
    unidade: "kg",
    preco_atual: 42.8,
    preco_medio: 41.0,
    preco_minimo: 39.2,
    preco_maximo: 42.8,
    ultima_compra: "2026-06-02",
    status: "ativo",
    historico: [
      { data: "01/05", preco: 39.2 },
      { data: "08/05", preco: 40.15 },
      { data: "20/05", preco: 41.8 },
      { data: "02/06", preco: 42.8 },
    ],
  },
  {
    id: "mp-0022",
    codigo: "MP00022",
    nome: "Leite Integral",
    categoria_id: "cat-laticinios",
    fornecedor_principal_id: "forn-alfa",
    unidade: "L",
    preco_atual: 5.6,
    preco_medio: 5.4,
    preco_minimo: 5.1,
    preco_maximo: 5.6,
    ultima_compra: "2026-06-01",
    status: "ativo",
    historico: [
      { data: "01/05", preco: 5.1 },
      { data: "20/05", preco: 5.4 },
      { data: "01/06", preco: 5.6 },
    ],
  },
  {
    id: "mp-0031",
    codigo: "MP00031",
    nome: "Farinha de Trigo",
    categoria_id: "cat-farinaceos",
    fornecedor_principal_id: "forn-moinho",
    unidade: "kg",
    preco_atual: 6.2,
    preco_medio: 6.0,
    preco_minimo: 5.8,
    preco_maximo: 6.2,
    ultima_compra: "2026-05-28",
    status: "ativo",
    historico: [
      { data: "01/05", preco: 5.8 },
      { data: "28/05", preco: 6.2 },
    ],
  },
  {
    id: "mp-0044",
    codigo: "MP00044",
    nome: "Óleo de Soja",
    categoria_id: "cat-farinaceos",
    fornecedor_principal_id: "forn-moinho",
    unidade: "L",
    preco_atual: 8.9,
    preco_medio: 8.7,
    preco_minimo: 8.3,
    preco_maximo: 8.9,
    ultima_compra: "2026-06-05",
    status: "ativo",
    historico: [
      { data: "01/05", preco: 8.3 },
      { data: "05/06", preco: 8.9 },
    ],
  },
];

export const receitas = [
  {
    id: "rec-paodequeijo",
    codigo: "REC0001",
    nome: "Pão de Queijo Tradicional",
    categoria_id: "cat-assados",
    linha: "Congelados",
    empresa: "YUKA Alimentos",
    peso_unitario: 0.03,
    tempo_preparo: "35 min",
    temperatura: "180°C",
    validade: "180 dias (congelado)",
    status: "ativa",
    versao_atual: 4,
    itens: [
      { materia_prima_id: "mp-0015", nome: "Queijo Mussarela", quantidade: 18, unidade: "kg" },
      { materia_prima_id: "mp-0022", nome: "Leite Integral", quantidade: 14, unidade: "L" },
      { materia_prima_id: "mp-0031", nome: "Farinha de Trigo", quantidade: 20, unidade: "kg" },
      { materia_prima_id: "mp-0044", nome: "Óleo de Soja", quantidade: 4, unidade: "L" },
    ],
    embalagem_custo: 180,
    rendimento: {
      peso_ingredientes: 56,
      peso_final: 52.3,
      peso_unitario: 0.019,
      quantidade_produzida: 2750,
    },
  },
];

// Módulo de Rendimento de Cocção — sem dados de exemplo por enquanto.
export const coccoes = [];

// Módulo de Recheio Frio (embutidos) — sem dados de exemplo por enquanto.
export const recheiosFrios = [];

export const producoes = [
  {
    id: "prod-1",
    receita_id: "rec-paodequeijo",
    data: "2026-07-18",
    lote: "L-2607",
    quantidade_teorica: 2750,
    quantidade_real: 2690,
  },
  {
    id: "prod-2",
    receita_id: "rec-paodequeijo",
    data: "2026-07-11",
    lote: "L-2611",
    quantidade_teorica: 2750,
    quantidade_real: 2810,
  },
];
