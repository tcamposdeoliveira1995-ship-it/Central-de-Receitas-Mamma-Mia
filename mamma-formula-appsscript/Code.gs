/**
 * MAMMA FORMULA — Backend em Google Sheets + Apps Script
 * ---------------------------------------------------------
 * 1) Cole este código em script.google.com (Novo projeto).
 * 2) Rode a função `setup` uma única vez (menu Executar > setup).
 *    Isso cria uma planilha nova chamada "Mamma Formula - Dados"
 *    com todas as abas e dados de exemplo.
 * 3) Implante como Web App (Implantar > Nova implantação > App da Web):
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 4) Copie a URL do Web App gerada — ela vai no .env.local do Next.js.
 */

const NOME_PLANILHA = "Mamma Formula - Dados";

const ABAS = {
  Categorias: ["id", "nome", "tipo"],
  Fornecedores: ["id", "nome"],
  MateriasPrimas: [
    "id", "codigo", "nome", "categoria_id", "fornecedor_principal_id",
    "unidade", "preco_atual", "preco_medio", "preco_minimo", "preco_maximo",
    "ultima_compra", "status",
  ],
  HistoricoPrecos: ["id", "materia_prima_id", "data", "preco"],
  Receitas: [
    "id", "codigo", "nome", "categoria_id", "linha", "empresa",
    "peso_unitario", "tempo_preparo", "temperatura", "validade", "status",
    "versao_atual", "embalagem_custo",
    "rend_peso_ingredientes", "rend_peso_final", "rend_peso_unitario", "rend_quantidade_produzida",
  ],
  ReceitaItens: ["id", "receita_id", "materia_prima_id", "nome", "quantidade", "unidade"],
  Producoes: ["id", "receita_id", "data", "lote", "quantidade_teorica", "quantidade_real"],
};

// ── SETUP ─────────────────────────────────────────────────────────

function setup() {
  let ss;
  const arquivos = DriveApp.getFilesByName(NOME_PLANILHA);
  if (arquivos.hasNext()) {
    ss = SpreadsheetApp.open(arquivos.next());
  } else {
    ss = SpreadsheetApp.create(NOME_PLANILHA);
  }

  Object.keys(ABAS).forEach((nomeAba) => {
    let aba = ss.getSheetByName(nomeAba);
    if (!aba) aba = ss.insertSheet(nomeAba);
    const cabecalho = ABAS[nomeAba];
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    aba.setFrozenRows(1);
  });

  // Remove a aba padrão "Página1"/"Sheet1" se ainda existir vazia.
  const padrao = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
  if (padrao && ss.getSheets().length > 1) ss.deleteSheet(padrao);

  semear(ss);

  Logger.log("Planilha pronta: " + ss.getUrl());
  return ss.getUrl();
}

function semear(ss) {
  if (linha_(ss, "Categorias").length > 1) return; // já tem dados, não duplica

  escrever_(ss, "Categorias", [
    ["cat-laticinios", "Laticínios", "materia_prima"],
    ["cat-farinaceos", "Farináceos", "materia_prima"],
    ["cat-carnes", "Carnes", "materia_prima"],
    ["cat-embalagem", "Embalagens", "materia_prima"],
    ["cat-assados", "Assados", "receita"],
    ["cat-fritos", "Fritos", "receita"],
  ]);

  escrever_(ss, "Fornecedores", [
    ["forn-alfa", "Laticínios Alfa"],
    ["forn-moinho", "Moinho Bom Trigo"],
    ["forn-boi", "Frigorífico Boi Forte"],
  ]);

  escrever_(ss, "MateriasPrimas", [
    ["mp-0015", "MP00015", "Queijo Mussarela", "cat-laticinios", "forn-alfa", "kg", 42.8, 41.0, 39.2, 42.8, "2026-06-02", "ativo"],
    ["mp-0022", "MP00022", "Leite Integral", "cat-laticinios", "forn-alfa", "L", 5.6, 5.4, 5.1, 5.6, "2026-06-01", "ativo"],
    ["mp-0031", "MP00031", "Farinha de Trigo", "cat-farinaceos", "forn-moinho", "kg", 6.2, 6.0, 5.8, 6.2, "2026-05-28", "ativo"],
    ["mp-0044", "MP00044", "Óleo de Soja", "cat-farinaceos", "forn-moinho", "L", 8.9, 8.7, 8.3, 8.9, "2026-06-05", "ativo"],
  ]);

  escrever_(ss, "HistoricoPrecos", [
    ["hp-1", "mp-0015", "01/05", 39.2],
    ["hp-2", "mp-0015", "08/05", 40.15],
    ["hp-3", "mp-0015", "20/05", 41.8],
    ["hp-4", "mp-0015", "02/06", 42.8],
    ["hp-5", "mp-0022", "01/05", 5.1],
    ["hp-6", "mp-0022", "20/05", 5.4],
    ["hp-7", "mp-0022", "01/06", 5.6],
  ]);

  escrever_(ss, "Receitas", [
    ["rec-paodequeijo", "REC0001", "Pão de Queijo Tradicional", "cat-assados", "Congelados", "YUKA Alimentos", 0.03, "35 min", "180°C", "180 dias (congelado)", "ativa", 4, 180, 56, 52.3, 0.019, 2750],
  ]);

  escrever_(ss, "ReceitaItens", [
    ["ri-1", "rec-paodequeijo", "mp-0015", "Queijo Mussarela", 18, "kg"],
    ["ri-2", "rec-paodequeijo", "mp-0022", "Leite Integral", 14, "L"],
    ["ri-3", "rec-paodequeijo", "mp-0031", "Farinha de Trigo", 20, "kg"],
    ["ri-4", "rec-paodequeijo", "mp-0044", "Óleo de Soja", 4, "L"],
  ]);

  escrever_(ss, "Producoes", [
    ["prod-1", "rec-paodequeijo", "2026-07-18", "L-2607", 2750, 2690],
    ["prod-2", "rec-paodequeijo", "2026-07-11", "L-2611", 2750, 2810],
  ]);
}

// ── HELPERS DE PLANILHA ──────────────────────────────────────────

function planilha_() {
  const arquivos = DriveApp.getFilesByName(NOME_PLANILHA);
  if (!arquivos.hasNext()) throw new Error("Rode setup() primeiro.");
  return SpreadsheetApp.open(arquivos.next());
}

function linha_(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  return aba.getDataRange().getValues();
}

function escrever_(ss, nomeAba, linhas) {
  const aba = ss.getSheetByName(nomeAba);
  if (!linhas.length) return;
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
}

function abaComoObjetos_(ss, nomeAba) {
  const valores = linha_(ss, nomeAba);
  const cabecalho = valores[0];
  return valores.slice(1).map((linha) => {
    const obj = {};
    cabecalho.forEach((chave, i) => (obj[chave] = linha[i]));
    return obj;
  });
}

function proximoId_(prefixo) {
  return prefixo + "-" + Utilities.getUuid().slice(0, 8);
}

function encontrarLinhaPorId_(aba, id) {
  const valores = aba.getDataRange().getValues();
  for (let i = 1; i < valores.length; i++) {
    if (valores[i][0] === id) return i + 1; // +1 porque getRange é 1-based
  }
  return -1;
}

// ── API: LEITURA (GET) ───────────────────────────────────────────

function doGet(e) {
  const ss = planilha_();

  const categorias = abaComoObjetos_(ss, "Categorias");
  const fornecedores = abaComoObjetos_(ss, "Fornecedores");
  const materiasPrimasRaw = abaComoObjetos_(ss, "MateriasPrimas");
  const historico = abaComoObjetos_(ss, "HistoricoPrecos");
  const receitasRaw = abaComoObjetos_(ss, "Receitas");
  const itensRaw = abaComoObjetos_(ss, "ReceitaItens");
  const producoes = abaComoObjetos_(ss, "Producoes");

  const materiasPrimas = materiasPrimasRaw.map((mp) => ({
    ...mp,
    historico: historico
      .filter((h) => h.materia_prima_id === mp.id)
      .map((h) => ({ data: h.data, preco: h.preco })),
  }));

  const receitas = receitasRaw.map((r) => ({
    ...r,
    itens: itensRaw
      .filter((i) => i.receita_id === r.id)
      .map((i) => ({
        materia_prima_id: i.materia_prima_id,
        nome: i.nome,
        quantidade: i.quantidade,
        unidade: i.unidade,
      })),
    embalagem_custo: r.embalagem_custo,
    rendimento: {
      peso_ingredientes: r.rend_peso_ingredientes,
      peso_final: r.rend_peso_final,
      peso_unitario: r.rend_peso_unitario,
      quantidade_produzida: r.rend_quantidade_produzida,
    },
  }));

  const payload = { categorias, fornecedores, materiasPrimas, receitas, producoes };
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

// ── API: ESCRITA (POST) ──────────────────────────────────────────

function doPost(e) {
  const corpo = JSON.parse(e.postData.contents);
  const acao = corpo.action;
  const ss = planilha_();
  let resultado;

  switch (acao) {
    case "addMateriaPrima":
      resultado = addMateriaPrima_(ss, corpo.payload);
      break;
    case "updatePrecoMateriaPrima":
      resultado = updatePrecoMateriaPrima_(ss, corpo.payload);
      break;
    case "addReceita":
      resultado = addReceita_(ss, corpo.payload);
      break;
    case "updateItensReceita":
      resultado = updateItensReceita_(ss, corpo.payload);
      break;
    default:
      return ContentService.createTextOutput(JSON.stringify({ erro: "Ação desconhecida: " + acao }))
        .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}

function addMateriaPrima_(ss, dados) {
  const id = proximoId_("mp");
  const linha = [
    id, dados.codigo || "", dados.nome, dados.categoria_id || "", dados.fornecedor_principal_id || "",
    dados.unidade || "un", dados.preco_atual || 0, dados.preco_atual || 0, dados.preco_atual || 0, dados.preco_atual || 0,
    new Date().toISOString().slice(0, 10), dados.status || "ativo",
  ];
  escrever_(ss, "MateriasPrimas", [linha]);
  return { id, ...dados };
}

function updatePrecoMateriaPrima_(ss, dados) {
  const { id, novoPreco } = dados;
  const dataHoje = new Date().toISOString().slice(0, 10);

  escrever_(ss, "HistoricoPrecos", [[proximoId_("hp"), id, dataHoje, novoPreco]]);

  const historico = abaComoObjetos_(ss, "HistoricoPrecos").filter((h) => h.materia_prima_id === id);
  const precos = historico.map((h) => h.preco);
  const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length;
  const precoMin = Math.min(...precos);
  const precoMax = Math.max(...precos);

  const aba = ss.getSheetByName("MateriasPrimas");
  const linhaIdx = encontrarLinhaPorId_(aba, id);
  if (linhaIdx === -1) throw new Error("Matéria-prima não encontrada: " + id);

  // Colunas: preco_atual(7) preco_medio(8) preco_minimo(9) preco_maximo(10) ultima_compra(11)
  aba.getRange(linhaIdx, 7, 1, 5).setValues([[novoPreco, precoMedio, precoMin, precoMax, dataHoje]]);

  return { id, preco_atual: novoPreco, preco_medio: precoMedio, preco_minimo: precoMin, preco_maximo: precoMax, ultima_compra: dataHoje };
}

function addReceita_(ss, dados) {
  const id = proximoId_("rec");
  const linha = [
    id, dados.codigo || "", dados.nome, dados.categoria_id || "", dados.linha || "", dados.empresa || "",
    dados.peso_unitario || 0, dados.tempo_preparo || "", dados.temperatura || "", dados.validade || "",
    dados.status || "ativa", 1, dados.embalagem_custo || 0,
    0, 0, 0, 0,
  ];
  escrever_(ss, "Receitas", [linha]);
  return { id, ...dados, itens: [] };
}

function updateItensReceita_(ss, dados) {
  const { receita_id, itens } = dados;
  const aba = ss.getSheetByName("ReceitaItens");
  const valores = aba.getDataRange().getValues();

  // Remove linhas antigas dessa receita (de baixo pra cima pra não bagunçar os índices).
  for (let i = valores.length - 1; i >= 1; i--) {
    if (valores[i][1] === receita_id) aba.deleteRow(i + 1);
  }

  const linhas = itens.map((item) => [
    proximoId_("ri"), receita_id, item.materia_prima_id, item.nome || "", item.quantidade, item.unidade,
  ]);
  if (linhas.length) escrever_(ss, "ReceitaItens", linhas);

  return { receita_id, itens };
}
