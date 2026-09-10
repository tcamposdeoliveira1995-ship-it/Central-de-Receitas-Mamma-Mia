/**
 * MAMMA FORMULA — Backend em Google Sheets + Apps Script
 * ---------------------------------------------------------
 * 1) Cole este código em script.google.com (Novo projeto), OU no projeto já
 *    vinculado à planilha "Mamma Formula - Dados" se você já tinha uma
 *    versão mais simples publicada.
 * 2) Rode a função `setup` uma vez (menu Executar > setup). Isso cria a
 *    planilha "Mamma Formula - Dados" (se ainda não existir) com todas as
 *    abas e dados de exemplo — OU, se a planilha já existe, apenas adiciona
 *    as abas/colunas novas que essa versão precisa, SEM apagar nada que já
 *    está lá. É seguro rodar de novo mesmo com dados reais na planilha.
 * 3) Implante como Web App (Implantar > Nova implantação > App da Web):
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 4) Copie a URL do Web App gerada — ela vai em NEXT_PUBLIC_SHEETS_API_URL
 *    no ambiente do Next.js (.env.local ou nas variáveis de ambiente do
 *    Vercel).
 *
 * IMPORTANTE: sempre que o código aqui for atualizado com abas/colunas
 * novas, rode `setup` de novo antes de usar o sistema — senão as abas
 * novas não existem ainda na planilha e as ações que dependem delas falham.
 */

const NOME_PLANILHA = "Mamma Formula - Dados";

const ABAS = {
  Categorias: ["id", "nome", "tipo"],
  Fornecedores: ["id", "nome"],
  Setores: ["id", "nome", "status"],
  Funcionarios: ["id", "funcao", "salario_mensal", "carga_horaria_semanal", "quantidade_funcionarios", "status", "custo_hora"],
  MateriasPrimas: [
    "id", "codigo", "nome", "categoria_id", "fornecedor_principal_id",
    "unidade", "preco_atual", "preco_medio", "preco_minimo", "preco_maximo",
    "ultima_compra", "status",
    // ── colunas novas (apensadas no fim, não mexem nas de cima) ──
    "nutricional_json", "tabela_nutricional_json",
  ],
  HistoricoPrecos: ["id", "materia_prima_id", "data", "preco"],
  Apresentacoes: ["id", "materia_prima_id", "nome", "unidade", "peso_referencia", "e_padrao"],
  RendimentosMP: [
    "id", "materia_prima_id", "apresentacao_id", "data", "peso_bruto", "peso_liquido", "peso_cozido",
    "tipo_coccao", "preco_compra_kg", "e_padrao", "custo_real_kg_liquido", "custo_real_kg_cozido",
  ],
  LotesMateriaPrima: [
    "id", "materia_prima_id", "lote", "fornecedor", "data_recebimento",
    "quantidade_recebida", "quantidade_disponivel", "validade", "status",
  ],
  Receitas: [
    "id", "codigo", "nome", "categoria_id", "linha", "empresa",
    "peso_unitario", "tempo_preparo", "temperatura", "validade", "status",
    "versao_atual", "embalagem_custo",
    "rend_peso_ingredientes", "rend_peso_final", "rend_peso_unitario", "rend_quantidade_produzida",
    // ── colunas novas ──
    "rend_unidade_nome", "papel", "rota_producao", "modo_preparo",
    "nutricional_json", "tabela_nutricional_json",
  ],
  ReceitaItens: [
    "id", "receita_id", "materia_prima_id", "nome", "quantidade", "unidade",
    // ── colunas novas ──
    "tipo", "apresentacao_id", "usa_custo_cozido", "observacao",
  ],
  ReceitaMOD: ["id", "receita_id", "setor_id", "funcao_id", "quantidade_pessoas", "tempo_minutos"],
  ReceitaPDFs: ["id", "receita_id", "nome_arquivo", "url", "data", "drive_file_id"],
  Producoes: [
    "id", "receita_id", "data", "lote", "quantidade_teorica", "quantidade_real",
    // ── colunas novas ──
    "peso_unitario_kg", "peso_massa_real", "perda_percentual",
  ],
  ProducaoMOD: ["id", "producao_id", "setor_id", "funcao_id", "quantidade_pessoas", "tempo_minutos_real"],
  Coccoes: [
    "id", "receita_id", "data", "unidade_setor", "responsavel", "lote_materia_prima", "equipamento", "numero_producao",
    "peso_recipiente_vazio_cru", "peso_recipiente_mais_cru", "peso_liquido_cru", "ingredientes_adicionados_json",
    "peso_total_antes_coccao", "peso_recipiente_vazio_cozido", "peso_recipiente_mais_cozido", "peso_liquido_cozido",
    "rendimento_carne_percentual", "perda_carne_kg", "perda_carne_percentual",
    "rendimento_preparacao_percentual", "perda_preparacao_kg", "perda_preparacao_percentual",
    "meta_proteina_min", "meta_proteina_max", "meta_preparacao_min", "meta_preparacao_max",
    "materia_prima_custo_id", "custo_kg_proteina", "custo_perda_proteina",
    "hora_inicio", "hora_fim", "tempo_total_minutos", "temperatura_media",
  ],
  RecheiosFrios: [
    "id", "nome_recheio", "data", "numero_producao", "itens_json",
    "peso_bruto_total", "perda_total_kg", "peso_liquido_total_kg", "perda_percentual_total",
  ],
  Produtos: [
    "id", "receita_id", "codigo", "nome_produto", "tipo_embalagem", "codigo_barras", "ncm", "cest",
    "departamento", "secao", "categoria", "peso_liquido", "peso_bruto", "validade_dias", "status", "rota_producao",
    "info_nutricional_json", "tabela_nutricional_json",
  ],
  ProdutoComposicao: ["id", "produto_id", "receita_id", "quantidade", "observacao"],
  ProdutoMOD: ["id", "produto_id", "setor_id", "funcao_id", "quantidade_pessoas", "tempo_minutos"],
};

const SEMANAS_POR_MES = 52 / 12;

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
    // Só escreve a linha 1 (cabeçalho) — nunca toca nas linhas de dados.
    // Colunas novas aparecem em branco nas linhas já existentes até serem
    // preenchidas pelo uso normal do sistema.
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

  inserirLinhas_(ss, "Categorias", [
    { id: "cat-laticinios", nome: "Laticínios", tipo: "materia_prima" },
    { id: "cat-farinaceos", nome: "Farináceos", tipo: "materia_prima" },
    { id: "cat-carnes", nome: "Carnes", tipo: "materia_prima" },
    { id: "cat-embalagem", nome: "Embalagens", tipo: "materia_prima" },
    { id: "cat-assados", nome: "Assados", tipo: "receita" },
    { id: "cat-fritos", nome: "Fritos", tipo: "receita" },
  ]);

  inserirLinhas_(ss, "Fornecedores", [
    { id: "forn-alfa", nome: "Laticínios Alfa" },
    { id: "forn-moinho", nome: "Moinho Bom Trigo" },
    { id: "forn-boi", nome: "Frigorífico Boi Forte" },
  ]);

  inserirLinhas_(ss, "MateriasPrimas", [
    { id: "mp-0015", codigo: "MP00015", nome: "Queijo Mussarela", categoria_id: "cat-laticinios", fornecedor_principal_id: "forn-alfa", unidade: "kg", preco_atual: 42.8, preco_medio: 41.0, preco_minimo: 39.2, preco_maximo: 42.8, ultima_compra: "2026-06-02", status: "ativo" },
    { id: "mp-0022", codigo: "MP00022", nome: "Leite Integral", categoria_id: "cat-laticinios", fornecedor_principal_id: "forn-alfa", unidade: "L", preco_atual: 5.6, preco_medio: 5.4, preco_minimo: 5.1, preco_maximo: 5.6, ultima_compra: "2026-06-01", status: "ativo" },
    { id: "mp-0031", codigo: "MP00031", nome: "Farinha de Trigo", categoria_id: "cat-farinaceos", fornecedor_principal_id: "forn-moinho", unidade: "kg", preco_atual: 6.2, preco_medio: 6.0, preco_minimo: 5.8, preco_maximo: 6.2, ultima_compra: "2026-05-28", status: "ativo" },
    { id: "mp-0044", codigo: "MP00044", nome: "Óleo de Soja", categoria_id: "cat-farinaceos", fornecedor_principal_id: "forn-moinho", unidade: "L", preco_atual: 8.9, preco_medio: 8.7, preco_minimo: 8.3, preco_maximo: 8.9, ultima_compra: "2026-06-05", status: "ativo" },
  ]);

  inserirLinhas_(ss, "HistoricoPrecos", [
    { id: "hp-1", materia_prima_id: "mp-0015", data: "01/05", preco: 39.2 },
    { id: "hp-2", materia_prima_id: "mp-0015", data: "08/05", preco: 40.15 },
    { id: "hp-3", materia_prima_id: "mp-0015", data: "20/05", preco: 41.8 },
    { id: "hp-4", materia_prima_id: "mp-0015", data: "02/06", preco: 42.8 },
    { id: "hp-5", materia_prima_id: "mp-0022", data: "01/05", preco: 5.1 },
    { id: "hp-6", materia_prima_id: "mp-0022", data: "20/05", preco: 5.4 },
    { id: "hp-7", materia_prima_id: "mp-0022", data: "01/06", preco: 5.6 },
  ]);

  inserirLinhas_(ss, "Receitas", [
    {
      id: "rec-paodequeijo", codigo: "REC0001", nome: "Pão de Queijo Tradicional", categoria_id: "cat-assados",
      linha: "Congelados", empresa: "YUKA Alimentos", peso_unitario: 0.03, tempo_preparo: "35 min",
      temperatura: "180°C", validade: "180 dias (congelado)", status: "ativa", versao_atual: 4, embalagem_custo: 180,
      rend_peso_ingredientes: 56, rend_peso_final: 52.3, rend_peso_unitario: 0.019, rend_quantidade_produzida: 2750,
      rend_unidade_nome: "un", papel: "massa",
    },
  ]);

  inserirLinhas_(ss, "ReceitaItens", [
    { id: "ri-1", receita_id: "rec-paodequeijo", materia_prima_id: "mp-0015", nome: "Queijo Mussarela", quantidade: 18, unidade: "kg", tipo: "materia_prima" },
    { id: "ri-2", receita_id: "rec-paodequeijo", materia_prima_id: "mp-0022", nome: "Leite Integral", quantidade: 14, unidade: "L", tipo: "materia_prima" },
    { id: "ri-3", receita_id: "rec-paodequeijo", materia_prima_id: "mp-0031", nome: "Farinha de Trigo", quantidade: 20, unidade: "kg", tipo: "materia_prima" },
    { id: "ri-4", receita_id: "rec-paodequeijo", materia_prima_id: "mp-0044", nome: "Óleo de Soja", quantidade: 4, unidade: "L", tipo: "materia_prima" },
  ]);

  inserirLinhas_(ss, "Producoes", [
    { id: "prod-1", receita_id: "rec-paodequeijo", data: "2026-07-18", lote: "L-2607", quantidade_teorica: 2750, quantidade_real: 2690 },
    { id: "prod-2", receita_id: "rec-paodequeijo", data: "2026-07-11", lote: "L-2611", quantidade_teorica: 2750, quantidade_real: 2810 },
  ]);
}

// ── HELPERS DE PLANILHA ──────────────────────────────────────────

function planilha_() {
  const arquivos = DriveApp.getFilesByName(NOME_PLANILHA);
  if (!arquivos.hasNext()) throw new Error("Rode setup() primeiro.");
  return SpreadsheetApp.open(arquivos.next());
}

function abaObrigatoria_(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba) {
    throw new Error(
      'Aba "' + nome + '" não existe na planilha. Rode a função setup() de novo no editor do Apps Script pra criá-la.'
    );
  }
  return aba;
}

function linha_(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  return aba.getDataRange().getValues();
}

// Lê uma aba inteira como lista de objetos {coluna: valor}, usando a linha 1
// como cabeçalho. Devolve [] se a aba ainda não existe (ex: código novo
// rodando antes de re-executar setup()) em vez de quebrar a leitura inteira.
function abaComoObjetos_(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  const valores = aba.getDataRange().getValues();
  if (valores.length === 0) return [];
  const cabecalho = valores[0];
  return valores.slice(1).map((linha) => {
    const obj = {};
    cabecalho.forEach((chave, i) => (obj[chave] = linha[i]));
    return obj;
  });
}

// Lê TODAS as abas de uma vez só, num único request HTTP pra API do Sheets
// (Sheets.Spreadsheets.Values.batchGet), em vez de uma chamada SpreadsheetApp
// por aba — no doGet original, isso significava ~20 chamadas sequenciais
// (cada uma com sua própria latência de rede/serviço), o que ficou lento
// demais com a planilha real e chegava a estourar o tempo de execução do
// Apps Script (a chamada nunca voltava pro navegador). Um batchGet só é
// UM request, então o tempo não cresce com o número de abas.
//
// Precisa do serviço avançado "Google Sheets API" habilitado no projeto
// (menu Serviços > + > Google Sheets API). Se não estiver habilitado (ou
// falhar por qualquer motivo), cai automaticamente no jeito aba-por-aba de
// antes — mais lento, mas sempre funciona, então nunca quebra por causa
// dessa otimização.
function lerTodasAsAbasEmLote_(ss) {
  const nomesAbas = Object.keys(ABAS);
  try {
    const resposta = Sheets.Spreadsheets.Values.batchGet(ss.getId(), { ranges: nomesAbas });
    const lote = {};
    (resposta.valueRanges || []).forEach((intervalo, i) => {
      lote[nomesAbas[i]] = intervalo.values || [];
    });
    return lote;
  } catch (erro) {
    const lote = {};
    nomesAbas.forEach((nome) => {
      const aba = ss.getSheetByName(nome);
      lote[nome] = aba ? aba.getDataRange().getValues() : [];
    });
    return lote;
  }
}

// Mesma lógica de abaComoObjetos_, mas lendo de um lote já carregado em
// memória (ver lerTodasAsAbasEmLote_) em vez de fazer uma chamada nova à
// planilha — usado só no doGet, que precisa de todas as abas de uma vez.
function abaComoObjetosDoLote_(lote, nomeAba) {
  const valores = lote[nomeAba] || [];
  if (valores.length === 0) return [];
  const cabecalho = valores[0];
  return valores.slice(1).map((linha) => {
    const obj = {};
    cabecalho.forEach((chave, i) => (obj[chave] = linha[i]));
    return obj;
  });
}

// Insere UMA linha nova a partir de um objeto {coluna: valor} — a ordem das
// células é montada dinamicamente a partir do cabeçalho real da aba, então
// nunca desalinha mesmo que ABAS ganhe colunas novas no meio do caminho.
// Campos não informados entram como "".
function inserirLinha_(ss, nomeAba, valoresPorCampo) {
  inserirLinhas_(ss, nomeAba, [valoresPorCampo]);
}

function inserirLinhas_(ss, nomeAba, lista) {
  if (!lista || !lista.length) return;
  const aba = abaObrigatoria_(ss, nomeAba);
  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const linhas = lista.map((valoresPorCampo) =>
    cabecalho.map((campo) => (valoresPorCampo[campo] === undefined ? "" : valoresPorCampo[campo]))
  );
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
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

// Atualiza só os campos presentes em `dadosParciais`, casando pelo NOME da
// coluna (não pela posição) — assim é seguro chamar com um objeto que só
// tem parte dos campos da aba.
function atualizarCamposPorId_(ss, nomeAba, id, dadosParciais) {
  const aba = abaObrigatoria_(ss, nomeAba);
  const linhaIdx = encontrarLinhaPorId_(aba, id);
  if (linhaIdx === -1) throw new Error("Registro não encontrado em " + nomeAba + ": " + id);
  const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  Object.keys(dadosParciais).forEach((chave) => {
    const col = cabecalho.indexOf(chave);
    if (col === -1) return;
    aba.getRange(linhaIdx, col + 1).setValue(dadosParciais[chave]);
  });
}

function excluirLinhaPorId_(ss, nomeAba, id) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return;
  const linhaIdx = encontrarLinhaPorId_(aba, id);
  if (linhaIdx !== -1) aba.deleteRow(linhaIdx);
}

function excluirLinhasPorCampo_(ss, nomeAba, nomeCampo, valor) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return;
  const valores = aba.getDataRange().getValues();
  const cabecalho = valores[0];
  const col = cabecalho.indexOf(nomeCampo);
  if (col === -1) return;
  for (let i = valores.length - 1; i >= 1; i--) {
    if (valores[i][col] === valor) aba.deleteRow(i + 1);
  }
}

// Substitui TODAS as linhas-filhas de um pai (ex: todos os ingredientes de
// uma receita) por uma lista nova — apaga as antigas e insere as novas.
// `montarCampos(item)` devolve um objeto {coluna: valor} por item.
function substituirFilhos_(ss, nomeAba, campoPai, valorPai, itens, montarCampos) {
  excluirLinhasPorCampo_(ss, nomeAba, campoPai, valorPai);
  inserirLinhas_(ss, nomeAba, (itens || []).map(montarCampos));
}

function parseJSON_(texto, padrao) {
  if (!texto) return padrao;
  try {
    return JSON.parse(texto);
  } catch (erro) {
    return padrao;
  }
}

// Custo/hora de uma função (cargo) — mesma fórmula usada no modo demonstração
// do frontend (src/lib/store.jsx), pra nunca ficar dessincronizado.
function calcularCustoHora_(salarioMensal, cargaHorariaSemanal) {
  const carga = Number(cargaHorariaSemanal) || 0;
  if (!carga) return 0;
  const horasMensais = carga * SEMANAS_POR_MES;
  if (!horasMensais) return 0;
  return (Number(salarioMensal) || 0) / horasMensais;
}

// Monta a lista de MOD (setor + função + pessoas + tempo) com os nomes
// já resolvidos e o custo calculado — usada tanto pra Receita/Produto
// (tempo estimado) quanto pra Produção (tempo real), via os nomes de
// campo (chaveTempo/chaveCusto) que mudam entre os dois casos.
function montarMOD_(itensRaw, chaveTempo, chaveCusto, funcionarios, setores) {
  return (itensRaw || []).map((item) => {
    const funcionario = funcionarios.find((f) => f.id === item.funcao_id);
    const setor = setores.find((s) => s.id === item.setor_id);
    const custoHora = funcionario ? Number(funcionario.custo_hora) || 0 : 0;
    const tempo = Number(item[chaveTempo]) || 0;
    const quantidadePessoas = Number(item.quantidade_pessoas) || 0;
    const custo = custoHora * quantidadePessoas * (tempo / 60);
    const linha = {
      setor_id: item.setor_id || "",
      setor_nome: setor ? setor.nome : "",
      funcao_id: item.funcao_id || "",
      funcao_nome: funcionario ? funcionario.funcao : "",
      quantidade_pessoas: quantidadePessoas,
    };
    linha[chaveTempo] = tempo;
    linha[chaveCusto] = custo;
    return linha;
  });
}

// Converte a quantidade de um item de receita pra gramas — usado só no
// cálculo nutricional (calcularNutricionalReceita_). Cobre massa (kg/g) e
// trata volume (L/ml) como equivalente a peso, igual ao frontend
// (src/lib/calc.js). Itens em "un" só convertem se a apresentação
// escolhida tiver peso de referência cadastrado.
function converterParaGramas_(item, apresentacoesRaw) {
  const u = (item.unidade || "").toString().toLowerCase();
  const quantidade = Number(item.quantidade) || 0;
  if (u === "kg" || u === "l") return quantidade * 1000;
  if (u === "g" || u === "ml") return quantidade;
  if (u === "un" && item.apresentacao_id) {
    const apresentacao = apresentacoesRaw.find((a) => a.id === item.apresentacao_id);
    if (apresentacao && apresentacao.peso_referencia) {
      const unidadeApr = (apresentacao.unidade || "").toString().toLowerCase();
      const pesoGramasPorUnidade = unidadeApr === "kg" ? apresentacao.peso_referencia * 1000 : apresentacao.peso_referencia;
      return quantidade * pesoGramasPorUnidade;
    }
  }
  return null;
}

function montarProdutoCompleto_(p, composicaoRaw, produtoModRaw, funcionarios, setores) {
  const composicao = composicaoRaw
    .filter((c) => c.produto_id === p.id)
    .map((c) => ({ receita_id: c.receita_id, quantidade: c.quantidade, observacao: c.observacao || "" }));
  const modItens = montarMOD_(produtoModRaw.filter((m) => m.produto_id === p.id), "tempo_minutos", "custo_estimado", funcionarios, setores);
  const custoTotalMod = modItens.reduce((soma, i) => soma + (i.custo_estimado || 0), 0);
  return {
    id: p.id,
    receita_id: p.receita_id || "",
    codigo: p.codigo,
    nome_produto: p.nome_produto,
    tipo_embalagem: p.tipo_embalagem,
    codigo_barras: p.codigo_barras,
    ncm: p.ncm,
    cest: p.cest,
    departamento: p.departamento,
    secao: p.secao,
    categoria: p.categoria,
    peso_liquido: p.peso_liquido,
    peso_bruto: p.peso_bruto,
    validade_dias: p.validade_dias,
    status: p.status,
    rota_producao: p.rota_producao || "",
    composicao: composicao,
    mod: { itens: modItens, custo_total: custoTotalMod },
    info_nutricional: parseJSON_(p.info_nutricional_json, null),
    tabela_nutricional: parseJSON_(p.tabela_nutricional_json, []),
  };
}

// ── API: LEITURA (GET) ───────────────────────────────────────────

function doGet(e) {
  try {
    const ss = planilha_();
    const lote = lerTodasAsAbasEmLote_(ss);
    const aba = (nome) => abaComoObjetosDoLote_(lote, nome);

    const categorias = aba("Categorias");
    const fornecedores = aba("Fornecedores");
    const setores = aba("Setores");
    const funcionarios = aba("Funcionarios");
    const materiasPrimasRaw = aba("MateriasPrimas");
    const historico = aba("HistoricoPrecos");
    const apresentacoes = aba("Apresentacoes");
    const rendimentosMP = aba("RendimentosMP");
    const lotes = aba("LotesMateriaPrima");
    const receitasRaw = aba("Receitas");
    const itensRaw = aba("ReceitaItens");
    const receitaModRaw = aba("ReceitaMOD");
    const receitaPdfs = aba("ReceitaPDFs");
    const producoesRaw = aba("Producoes");
    const producaoModRaw = aba("ProducaoMOD");
    const coccoesRaw = aba("Coccoes");
    const recheiosRaw = aba("RecheiosFrios");
    const produtosRaw = aba("Produtos");
    const composicaoRaw = aba("ProdutoComposicao");
    const produtoModRaw = aba("ProdutoMOD");

    const materiasPrimas = materiasPrimasRaw.map((mp) => ({
      id: mp.id,
      codigo: mp.codigo,
      nome: mp.nome,
      categoria_id: mp.categoria_id,
      fornecedor_principal_id: mp.fornecedor_principal_id,
      unidade: mp.unidade,
      preco_atual: mp.preco_atual,
      preco_medio: mp.preco_medio,
      preco_minimo: mp.preco_minimo,
      preco_maximo: mp.preco_maximo,
      ultima_compra: mp.ultima_compra,
      status: mp.status,
      historico: historico.filter((h) => h.materia_prima_id === mp.id).map((h) => ({ data: h.data, preco: h.preco })),
      apresentacoes: apresentacoes.filter((a) => a.materia_prima_id === mp.id),
      rendimentos: rendimentosMP.filter((r) => r.materia_prima_id === mp.id),
      lotes: lotes.filter((l) => l.materia_prima_id === mp.id),
      nutricional: parseJSON_(mp.nutricional_json, null),
      tabela_nutricional: parseJSON_(mp.tabela_nutricional_json, []),
    }));

    const produtosCompletos = produtosRaw.map((p) => montarProdutoCompleto_(p, composicaoRaw, produtoModRaw, funcionarios, setores));

    const receitas = receitasRaw.map((r) => {
      const itens = itensRaw
        .filter((i) => i.receita_id === r.id)
        .map((i) => ({
          tipo: i.tipo || "materia_prima",
          materia_prima_id: i.materia_prima_id,
          nome: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade,
          apresentacao_id: i.apresentacao_id || "",
          usa_custo_cozido: !!i.usa_custo_cozido,
          observacao: i.observacao || "",
        }));
      const modItens = montarMOD_(receitaModRaw.filter((m) => m.receita_id === r.id), "tempo_minutos", "custo_estimado", funcionarios, setores);
      const custoTotalMod = modItens.reduce((soma, i) => soma + (i.custo_estimado || 0), 0);
      const pdfs = receitaPdfs
        .filter((p) => p.receita_id === r.id)
        .map((p) => ({ nome_arquivo: p.nome_arquivo, url: p.url, data: p.data }));

      return {
        id: r.id,
        codigo: r.codigo,
        nome: r.nome,
        categoria_id: r.categoria_id,
        papel: r.papel || "",
        linha: r.linha,
        empresa: r.empresa,
        peso_unitario: r.peso_unitario,
        tempo_preparo: r.tempo_preparo,
        temperatura: r.temperatura,
        validade: r.validade,
        status: r.status,
        versao_atual: r.versao_atual,
        embalagem_custo: r.embalagem_custo,
        rota_producao: r.rota_producao || "",
        modo_preparo: r.modo_preparo || "",
        itens: itens,
        rendimento: {
          peso_ingredientes: r.rend_peso_ingredientes,
          peso_final: r.rend_peso_final,
          peso_unitario: r.rend_peso_unitario,
          quantidade_produzida: r.rend_quantidade_produzida,
          unidade_nome: r.rend_unidade_nome || "un",
        },
        mod: { itens: modItens, custo_total: custoTotalMod },
        pdfs: pdfs,
        nutricional: parseJSON_(r.nutricional_json, null),
        tabela_nutricional: parseJSON_(r.tabela_nutricional_json, []),
        produtos: produtosCompletos.filter((p) => p.receita_id === r.id),
      };
    });

    const producoes = producoesRaw.map((p) => {
      const modItens = montarMOD_(producaoModRaw.filter((m) => m.producao_id === p.id), "tempo_minutos_real", "custo_real", funcionarios, setores);
      const custoTotalMod = modItens.reduce((soma, i) => soma + (i.custo_real || 0), 0);
      return {
        id: p.id,
        receita_id: p.receita_id,
        data: p.data,
        lote: p.lote,
        quantidade_teorica: p.quantidade_teorica,
        quantidade_real: p.quantidade_real,
        peso_unitario_kg: p.peso_unitario_kg,
        peso_massa_real: p.peso_massa_real,
        perda_percentual: p.perda_percentual,
        mod: { itens: modItens, custo_total: custoTotalMod },
      };
    });

    const coccoes = coccoesRaw.map((c) => {
      const copia = Object.assign({}, c);
      copia.ingredientes_adicionados = parseJSON_(c.ingredientes_adicionados_json, []);
      delete copia.ingredientes_adicionados_json;
      return copia;
    });

    const recheiosFrios = recheiosRaw.map((r) => {
      const copia = Object.assign({}, r);
      copia.itens = parseJSON_(r.itens_json, []);
      delete copia.itens_json;
      return copia;
    });

    const payload = {
      categorias: categorias,
      fornecedores: fornecedores,
      setores: setores,
      funcionarios: funcionarios,
      materiasPrimas: materiasPrimas,
      receitas: receitas,
      produtos: produtosCompletos,
      producoes: producoes,
      coccoes: coccoes,
      recheiosFrios: recheiosFrios,
    };
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({ erro: String((erro && erro.message) || erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── API: ESCRITA (POST) ──────────────────────────────────────────

function doPost(e) {
  try {
    const corpo = JSON.parse(e.postData.contents);
    const acao = corpo.action;
    const dados = corpo.payload;
    const ss = planilha_();
    let resultado;

    switch (acao) {
      // Matérias-primas
      case "addMateriaPrima":
        resultado = addMateriaPrima_(ss, dados);
        break;
      case "updatePrecoMateriaPrima":
        resultado = updatePrecoMateriaPrima_(ss, dados);
        break;
      case "addApresentacao":
        resultado = addApresentacao_(ss, dados);
        break;
      case "addRendimentoMP":
        resultado = addRendimentoMP_(ss, dados);
        break;
      case "addLoteMateriaPrima":
        resultado = addLoteMateriaPrima_(ss, dados);
        break;
      case "salvarNutricionalMateriaPrima":
        resultado = salvarNutricionalMateriaPrima_(ss, dados);
        break;

      // Receitas
      case "addReceita":
        resultado = addReceita_(ss, dados);
        break;
      case "deleteReceita":
        resultado = deleteReceita_(ss, dados);
        break;
      case "updateItensReceita":
        resultado = updateItensReceita_(ss, dados);
        break;
      case "uploadFichaPDF":
        resultado = uploadFichaPDF_(ss, dados);
        break;
      case "updateRendimentoReceita":
        resultado = updateRendimentoReceita_(ss, dados);
        break;
      case "updateDetalhesReceita":
        resultado = updateDetalhesReceita_(ss, dados);
        break;
      case "updateRotaProducaoReceita":
        resultado = updateRotaProducaoReceita_(ss, dados);
        break;
      case "updateModReceita":
        resultado = updateModReceita_(ss, dados);
        break;
      case "calcularNutricionalReceita":
        resultado = calcularNutricionalReceita_(ss, dados);
        break;
      case "salvarVDReceita":
        resultado = salvarVDReceita_(ss, dados);
        break;

      // Produções
      case "addProducao":
        resultado = addProducao_(ss, dados);
        break;
      case "updateModProducao":
        resultado = updateModProducao_(ss, dados);
        break;

      // Rendimento de Cocção / Recheio Frio
      case "addCoccao":
        resultado = addCoccao_(ss, dados);
        break;
      case "addRecheioFrio":
        resultado = addRecheioFrio_(ss, dados);
        break;

      // Produtos (SKUs) — usado tanto na tela de Receitas quanto na de Produtos
      case "addProduto":
        resultado = addProduto_(ss, dados);
        break;
      case "updateProduto":
        resultado = updateProduto_(ss, dados);
        break;
      case "deleteProduto":
        resultado = deleteProduto_(ss, dados);
        break;
      case "updateComposicaoProduto":
        resultado = updateComposicaoProduto_(ss, dados);
        break;
      case "updateModProduto":
        resultado = updateModProduto_(ss, dados);
        break;
      case "salvarInfoNutricional":
        resultado = salvarInfoNutricional_(ss, dados);
        break;

      // Setores
      case "addSetor":
        resultado = addSetor_(ss, dados);
        break;
      case "updateSetor":
        resultado = updateSetor_(ss, dados);
        break;
      case "deleteSetor":
        resultado = deleteSetor_(ss, dados);
        break;

      // Funcionários
      case "addFuncionario":
        resultado = addFuncionario_(ss, dados);
        break;
      case "updateFuncionario":
        resultado = updateFuncionario_(ss, dados);
        break;
      case "deleteFuncionario":
        resultado = deleteFuncionario_(ss, dados);
        break;

      default:
        return ContentService.createTextOutput(JSON.stringify({ erro: "Ação desconhecida: " + acao }))
          .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({ erro: String((erro && erro.message) || erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── MATÉRIAS-PRIMAS ────────────────────────────────────────────────

function addMateriaPrima_(ss, dados) {
  const id = proximoId_("mp");
  const dataHoje = new Date().toISOString().slice(0, 10);
  const preco = Number(dados.preco_atual) || 0;
  inserirLinha_(ss, "MateriasPrimas", {
    id: id,
    codigo: dados.codigo || "",
    nome: dados.nome || "",
    categoria_id: dados.categoria_id || "",
    fornecedor_principal_id: dados.fornecedor_principal_id || "",
    unidade: dados.unidade || "un",
    preco_atual: preco,
    preco_medio: preco,
    preco_minimo: preco,
    preco_maximo: preco,
    ultima_compra: dataHoje,
    status: dados.status || "ativo",
  });
  return Object.assign({ id: id }, dados);
}

function updatePrecoMateriaPrima_(ss, dados) {
  const id = dados.id;
  const novoPreco = dados.novoPreco;
  const dataHoje = new Date().toISOString().slice(0, 10);

  inserirLinha_(ss, "HistoricoPrecos", { id: proximoId_("hp"), materia_prima_id: id, data: dataHoje, preco: novoPreco });

  const historico = abaComoObjetos_(ss, "HistoricoPrecos").filter((h) => h.materia_prima_id === id);
  const precos = historico.map((h) => Number(h.preco) || 0);
  const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length;
  const precoMin = Math.min.apply(null, precos);
  const precoMax = Math.max.apply(null, precos);

  atualizarCamposPorId_(ss, "MateriasPrimas", id, {
    preco_atual: novoPreco,
    preco_medio: precoMedio,
    preco_minimo: precoMin,
    preco_maximo: precoMax,
    ultima_compra: dataHoje,
  });

  return { id: id, preco_atual: novoPreco, preco_medio: precoMedio, preco_minimo: precoMin, preco_maximo: precoMax, ultima_compra: dataHoje };
}

function addApresentacao_(ss, dados) {
  const id = proximoId_("apr");
  if (dados.e_padrao) desmarcarPadrao_(ss, "Apresentacoes", "materia_prima_id", dados.materia_prima_id);
  inserirLinha_(ss, "Apresentacoes", {
    id: id,
    materia_prima_id: dados.materia_prima_id,
    nome: dados.nome || "",
    unidade: dados.unidade || "un",
    peso_referencia: dados.peso_referencia || 0,
    e_padrao: !!dados.e_padrao,
  });
  return Object.assign({ id: id }, dados);
}

function desmarcarPadrao_(ss, nomeAba, campoFiltro, valorFiltro) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return;
  const valores = aba.getDataRange().getValues();
  const cabecalho = valores[0];
  const colFiltro = cabecalho.indexOf(campoFiltro);
  const colPadrao = cabecalho.indexOf("e_padrao");
  if (colFiltro === -1 || colPadrao === -1) return;
  for (let i = 1; i < valores.length; i++) {
    if (valores[i][colFiltro] === valorFiltro && valores[i][colPadrao] === true) {
      aba.getRange(i + 1, colPadrao + 1).setValue(false);
    }
  }
}

function addRendimentoMP_(ss, dados) {
  const id = proximoId_("rmp");
  const pesoBruto = Number(dados.peso_bruto) || 0;
  const pesoLiquido = Number(dados.peso_liquido) || 0;
  const pesoCozido = Number(dados.peso_cozido) || 0;
  const precoCompraKg = Number(dados.preco_compra_kg) || 0;
  const custoRealKgLiquido = pesoLiquido > 0 ? (precoCompraKg * pesoBruto) / pesoLiquido : 0;
  const custoRealKgCozido = pesoCozido > 0 ? (precoCompraKg * pesoBruto) / pesoCozido : 0;
  const dataHoje = new Date().toISOString().slice(0, 10);

  if (dados.e_padrao) desmarcarPadrao_(ss, "RendimentosMP", "apresentacao_id", dados.apresentacao_id);

  inserirLinha_(ss, "RendimentosMP", {
    id: id,
    materia_prima_id: dados.materia_prima_id,
    apresentacao_id: dados.apresentacao_id,
    data: dataHoje,
    peso_bruto: pesoBruto,
    peso_liquido: pesoLiquido,
    peso_cozido: pesoCozido,
    tipo_coccao: dados.tipo_coccao || "N/A",
    preco_compra_kg: precoCompraKg,
    e_padrao: !!dados.e_padrao,
    custo_real_kg_liquido: custoRealKgLiquido,
    custo_real_kg_cozido: custoRealKgCozido,
  });

  return {
    id: id, materia_prima_id: dados.materia_prima_id, apresentacao_id: dados.apresentacao_id, data: dataHoje,
    peso_bruto: pesoBruto, peso_liquido: pesoLiquido, peso_cozido: pesoCozido, tipo_coccao: dados.tipo_coccao || "N/A",
    preco_compra_kg: precoCompraKg, e_padrao: !!dados.e_padrao,
    custo_real_kg_liquido: custoRealKgLiquido, custo_real_kg_cozido: custoRealKgCozido,
  };
}

function addLoteMateriaPrima_(ss, dados) {
  const id = proximoId_("lotemp");
  const dataHoje = new Date().toISOString().slice(0, 10);
  const quantidadeRecebida = Number(dados.quantidade_recebida) || 0;
  inserirLinha_(ss, "LotesMateriaPrima", {
    id: id,
    materia_prima_id: dados.materia_prima_id,
    lote: dados.lote || "",
    fornecedor: dados.fornecedor || "",
    data_recebimento: dataHoje,
    quantidade_recebida: quantidadeRecebida,
    quantidade_disponivel: quantidadeRecebida,
    validade: dados.validade || "",
    status: "ativo",
  });
  return {
    id: id, materia_prima_id: dados.materia_prima_id, lote: dados.lote || "", fornecedor: dados.fornecedor || "",
    data_recebimento: dataHoje, quantidade_recebida: quantidadeRecebida, quantidade_disponivel: quantidadeRecebida,
    validade: dados.validade || "", status: "ativo",
  };
}

function salvarNutricionalMateriaPrima_(ss, dados) {
  const nutricional = {
    fornecedor_id: dados.fornecedor_id || "",
    ingredientes_texto: dados.ingredientes_texto || "",
    alergicos_texto: dados.alergicos_texto || "",
    porcao_referencia_gramas: dados.porcao_referencia_gramas || 0,
    fonte_nutricional: dados.fonte_nutricional || "manual",
    taco_item_id: dados.taco_item_id || "",
  };
  atualizarCamposPorId_(ss, "MateriasPrimas", dados.materia_prima_id, {
    nutricional_json: JSON.stringify(nutricional),
    tabela_nutricional_json: JSON.stringify(dados.tabela || []),
  });
  return { materia_prima_id: dados.materia_prima_id, nutricional: nutricional, tabela_nutricional: dados.tabela || [] };
}

// ── RECEITAS ───────────────────────────────────────────────────────

function addReceita_(ss, dados) {
  const id = proximoId_("rec");
  inserirLinha_(ss, "Receitas", {
    id: id,
    codigo: dados.codigo || "",
    nome: dados.nome || "",
    categoria_id: dados.categoria_id || "",
    papel: dados.papel || "",
    linha: dados.linha || "",
    empresa: dados.empresa || "",
    peso_unitario: dados.peso_unitario || 0,
    tempo_preparo: dados.tempo_preparo || "",
    temperatura: dados.temperatura || "",
    validade: dados.validade || "",
    status: dados.status || "ativa",
    versao_atual: 1,
    embalagem_custo: dados.embalagem_custo || 0,
    rend_peso_ingredientes: 0,
    rend_peso_final: 0,
    rend_peso_unitario: 0,
    rend_quantidade_produzida: 0,
    rend_unidade_nome: "un",
  });
  return Object.assign({ id: id, itens: [] }, dados);
}

function deleteReceita_(ss, dados) {
  excluirLinhaPorId_(ss, "Receitas", dados.id);
  excluirLinhasPorCampo_(ss, "ReceitaItens", "receita_id", dados.id);
  excluirLinhasPorCampo_(ss, "ReceitaMOD", "receita_id", dados.id);
  excluirLinhasPorCampo_(ss, "ReceitaPDFs", "receita_id", dados.id);
  return { id: dados.id };
}

function updateItensReceita_(ss, dados) {
  const receitaId = dados.receita_id;
  substituirFilhos_(ss, "ReceitaItens", "receita_id", receitaId, dados.itens, (item) => ({
    id: proximoId_("ri"),
    receita_id: receitaId,
    materia_prima_id: item.materia_prima_id || "",
    nome: item.nome || "",
    quantidade: item.quantidade || 0,
    unidade: item.unidade || "",
    tipo: item.tipo || "materia_prima",
    apresentacao_id: item.apresentacao_id || "",
    usa_custo_cozido: !!item.usa_custo_cozido,
    observacao: item.observacao || "",
  }));
  return { receita_id: receitaId, itens: dados.itens };
}

function uploadFichaPDF_(ss, dados) {
  const bytes = Utilities.base64Decode(dados.base64);
  const blob = Utilities.newBlob(bytes, MimeType.PDF, dados.nome_arquivo || "ficha-tecnica.pdf");
  const pasta = pastaFichasPdf_();
  const arquivo = pasta.createFile(blob);
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = arquivo.getUrl();
  const dataHoje = new Date().toISOString().slice(0, 10);
  const id = proximoId_("pdf");
  inserirLinha_(ss, "ReceitaPDFs", {
    id: id,
    receita_id: dados.receita_id,
    nome_arquivo: dados.nome_arquivo || "",
    url: url,
    data: dataHoje,
    drive_file_id: arquivo.getId(),
  });
  return { url: url, id: id, nome_arquivo: dados.nome_arquivo || "", data: dataHoje };
}

function pastaFichasPdf_() {
  const nomePasta = "Mamma Formula - Fichas Técnicas";
  const pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) return pastas.next();
  return DriveApp.createFolder(nomePasta);
}

function updateRendimentoReceita_(ss, dados) {
  atualizarCamposPorId_(ss, "Receitas", dados.receita_id, {
    rend_peso_ingredientes: dados.peso_ingredientes || 0,
    rend_peso_final: dados.peso_final || 0,
    rend_peso_unitario: dados.peso_unitario || 0,
    rend_quantidade_produzida: dados.quantidade_produzida || 0,
    rend_unidade_nome: dados.unidade_nome || "un",
  });
  return { receita_id: dados.receita_id };
}

function updateDetalhesReceita_(ss, dados) {
  const receitaId = dados.receita_id;
  const detalhes = {};
  Object.keys(dados).forEach((chave) => {
    if (chave !== "receita_id") detalhes[chave] = dados[chave];
  });
  atualizarCamposPorId_(ss, "Receitas", receitaId, detalhes);
  return Object.assign({ receita_id: receitaId }, detalhes);
}

function updateRotaProducaoReceita_(ss, dados) {
  atualizarCamposPorId_(ss, "Receitas", dados.receita_id, { rota_producao: dados.rota_producao || "" });
  return { receita_id: dados.receita_id, rota_producao: dados.rota_producao || "" };
}

function updateModReceita_(ss, dados) {
  const receitaId = dados.receita_id;
  substituirFilhos_(ss, "ReceitaMOD", "receita_id", receitaId, dados.itens, (item) => ({
    id: proximoId_("modrec"),
    receita_id: receitaId,
    setor_id: item.setor_id || "",
    funcao_id: item.funcao_id || "",
    quantidade_pessoas: item.quantidade_pessoas || 0,
    tempo_minutos: item.tempo_minutos || 0,
  }));
  return { receita_id: receitaId };
}

// Calcula a tabela nutricional da receita a partir das matérias-primas (ou
// sub-receitas) usadas, ponderando pela quantidade de cada uma. Bloqueia
// (ok:false) se faltar nutricional cadastrada em algum ingrediente — não dá
// pra "inventar" o valor que falta.
function calcularNutricionalReceita_(ss, dados) {
  const receitaId = dados.receita_id;
  const receitasRaw = abaComoObjetos_(ss, "Receitas");
  const receita = receitasRaw.find((r) => r.id === receitaId);
  if (!receita) return { ok: false, erro: "Receita não encontrada." };

  const itensRaw = abaComoObjetos_(ss, "ReceitaItens").filter((i) => i.receita_id === receitaId);
  const materiasPrimasRaw = abaComoObjetos_(ss, "MateriasPrimas");
  const apresentacoesRaw = abaComoObjetos_(ss, "Apresentacoes");

  const faltando = [];
  const somaPorNutriente = {};
  let pesoTotalGramas = 0;

  itensRaw.forEach((item) => {
    let tabelaNutricional = [];
    let nomeItem = item.nome || item.materia_prima_id;

    if (item.tipo === "receita") {
      const subReceita = receitasRaw.find((r) => r.id === item.materia_prima_id);
      nomeItem = subReceita ? subReceita.nome : nomeItem;
      tabelaNutricional = subReceita ? parseJSON_(subReceita.tabela_nutricional_json, []) : [];
    } else {
      const mp = materiasPrimasRaw.find((m) => m.id === item.materia_prima_id);
      nomeItem = mp ? mp.nome : nomeItem;
      tabelaNutricional = mp ? parseJSON_(mp.tabela_nutricional_json, []) : [];
    }

    if (!tabelaNutricional || tabelaNutricional.length === 0) {
      faltando.push(nomeItem);
      return;
    }

    const pesoGramas = converterParaGramas_(item, apresentacoesRaw);
    if (pesoGramas === null) {
      faltando.push(nomeItem + " (unidade não conversível pra peso)");
      return;
    }
    pesoTotalGramas += pesoGramas;

    tabelaNutricional.forEach((linha) => {
      const chave = (linha.nutriente || "").toString().trim();
      if (!chave) return;
      const valorPor100g = Number(linha.qtd_comparativa) || 0;
      somaPorNutriente[chave] = (somaPorNutriente[chave] || 0) + (pesoGramas / 100) * valorPor100g;
    });
  });

  if (faltando.length > 0) {
    return { ok: false, erro: "Faltam dados nutricionais de: " + faltando.join(", ") };
  }

  // Usa o peso final da receita (mais fiel — já reflete a perda de água do
  // preparo) quando o Rendimento já foi cadastrado; senão cai pro peso bruto
  // somado dos ingredientes.
  const pesoFinalKg = Number(receita.rend_peso_final) || 0;
  const pesoBaseGramas = pesoFinalKg > 0 ? pesoFinalKg * 1000 : pesoTotalGramas;
  const porcaoRef = Number(dados.porcao_referencia_gramas) || 0;

  const tabela = Object.keys(somaPorNutriente).map((nutriente) => {
    const totalAbsoluto = somaPorNutriente[nutriente];
    const por100g = pesoBaseGramas > 0 ? (totalAbsoluto / pesoBaseGramas) * 100 : 0;
    const porPorcao = porcaoRef > 0 ? (por100g / 100) * porcaoRef : 0;
    return {
      nutriente: nutriente,
      qtd_comparativa: Number(por100g.toFixed(2)),
      porcao: Number(porPorcao.toFixed(2)),
      vd_percentual: "",
    };
  });

  const dataCalculo = new Date().toISOString().slice(0, 10);
  const nutricional = {
    data_calculo: dataCalculo,
    peso_base_gramas: pesoBaseGramas,
    porcao_referencia_gramas: porcaoRef,
    status: "ok",
  };

  atualizarCamposPorId_(ss, "Receitas", receitaId, {
    nutricional_json: JSON.stringify(nutricional),
    tabela_nutricional_json: JSON.stringify(tabela),
  });

  return {
    ok: true,
    data_calculo: dataCalculo,
    peso_base_gramas: pesoBaseGramas,
    porcao_referencia_gramas: porcaoRef,
    tabela: tabela,
  };
}

// Atualiza só o %VD das linhas já calculadas (não recalcula qtd./porção).
// `vd`: [{ nutriente, vd_percentual }]
function salvarVDReceita_(ss, dados) {
  const receitasRaw = abaComoObjetos_(ss, "Receitas");
  const receita = receitasRaw.find((r) => r.id === dados.receita_id);
  if (!receita) return { ok: false, erro: "Receita não encontrada." };

  const tabelaAtual = parseJSON_(receita.tabela_nutricional_json, []);
  const vdPorNutriente = {};
  (dados.vd || []).forEach((v) => {
    vdPorNutriente[v.nutriente] = v.vd_percentual;
  });

  const tabelaNova = tabelaAtual.map((linha) =>
    Object.prototype.hasOwnProperty.call(vdPorNutriente, linha.nutriente)
      ? Object.assign({}, linha, { vd_percentual: vdPorNutriente[linha.nutriente] })
      : linha
  );

  atualizarCamposPorId_(ss, "Receitas", dados.receita_id, { tabela_nutricional_json: JSON.stringify(tabelaNova) });
  return { ok: true, tabela: tabelaNova };
}

// ── PRODUÇÕES ────────────────────────────────────────────────────

function addProducao_(ss, dados) {
  const id = proximoId_("prod");
  const quantidadeTeorica = Number(dados.quantidade_teorica) || 0;
  const quantidadeReal = Number(dados.quantidade_real) || 0;
  const perdaPercentual = quantidadeTeorica > 0 ? ((quantidadeTeorica - quantidadeReal) / quantidadeTeorica) * 100 : 0;
  const dataProducao = dados.data || new Date().toISOString().slice(0, 10);

  inserirLinha_(ss, "Producoes", {
    id: id,
    receita_id: dados.receita_id,
    data: dataProducao,
    lote: dados.lote || "",
    quantidade_teorica: quantidadeTeorica,
    quantidade_real: quantidadeReal,
    peso_unitario_kg: Number(dados.peso_unitario_kg) || 0,
    peso_massa_real: Number(dados.peso_massa_real) || 0,
    perda_percentual: perdaPercentual,
  });

  const modItensEntrada = dados.mod_itens || [];
  inserirLinhas_(
    ss,
    "ProducaoMOD",
    modItensEntrada.map((item) => ({
      id: proximoId_("modprod"),
      producao_id: id,
      setor_id: item.setor_id || "",
      funcao_id: item.funcao_id || "",
      quantidade_pessoas: item.quantidade_pessoas || 0,
      tempo_minutos_real: item.tempo_minutos_real || 0,
    }))
  );

  const funcionarios = abaComoObjetos_(ss, "Funcionarios");
  const setores = abaComoObjetos_(ss, "Setores");
  const modItens = montarMOD_(modItensEntrada, "tempo_minutos_real", "custo_real", funcionarios, setores);
  const custoTotalMod = modItens.reduce((soma, i) => soma + (i.custo_real || 0), 0);

  return {
    id: id,
    receita_id: dados.receita_id,
    data: dataProducao,
    lote: dados.lote || "",
    quantidade_teorica: quantidadeTeorica,
    quantidade_real: quantidadeReal,
    peso_unitario_kg: Number(dados.peso_unitario_kg) || 0,
    peso_massa_real: Number(dados.peso_massa_real) || 0,
    perda_percentual: perdaPercentual,
    mod: { itens: modItens, custo_total: custoTotalMod },
  };
}

function updateModProducao_(ss, dados) {
  const producaoId = dados.producao_id;
  substituirFilhos_(ss, "ProducaoMOD", "producao_id", producaoId, dados.itens, (item) => ({
    id: proximoId_("modprod"),
    producao_id: producaoId,
    setor_id: item.setor_id || "",
    funcao_id: item.funcao_id || "",
    quantidade_pessoas: item.quantidade_pessoas || 0,
    tempo_minutos_real: item.tempo_minutos_real || 0,
  }));
  return { producao_id: producaoId };
}

// ── RENDIMENTO DE COCÇÃO / RECHEIO FRIO ───────────────────────────

function addCoccao_(ss, dados) {
  const id = proximoId_("coccao");
  function ouVazio(v) {
    return v === null || v === undefined ? "" : v;
  }
  inserirLinha_(ss, "Coccoes", {
    id: id,
    receita_id: dados.receita_id || "",
    data: dados.data || "",
    unidade_setor: dados.unidade_setor || "",
    responsavel: dados.responsavel || "",
    lote_materia_prima: dados.lote_materia_prima || "",
    equipamento: dados.equipamento || "",
    numero_producao: dados.numero_producao || "",
    peso_recipiente_vazio_cru: dados.peso_recipiente_vazio_cru || 0,
    peso_recipiente_mais_cru: dados.peso_recipiente_mais_cru || 0,
    peso_liquido_cru: dados.peso_liquido_cru || 0,
    ingredientes_adicionados_json: JSON.stringify(dados.ingredientes_adicionados || []),
    peso_total_antes_coccao: dados.peso_total_antes_coccao || 0,
    peso_recipiente_vazio_cozido: dados.peso_recipiente_vazio_cozido || 0,
    peso_recipiente_mais_cozido: dados.peso_recipiente_mais_cozido || 0,
    peso_liquido_cozido: dados.peso_liquido_cozido || 0,
    rendimento_carne_percentual: dados.rendimento_carne_percentual || 0,
    perda_carne_kg: dados.perda_carne_kg || 0,
    perda_carne_percentual: dados.perda_carne_percentual || 0,
    rendimento_preparacao_percentual: dados.rendimento_preparacao_percentual || 0,
    perda_preparacao_kg: dados.perda_preparacao_kg || 0,
    perda_preparacao_percentual: dados.perda_preparacao_percentual || 0,
    meta_proteina_min: ouVazio(dados.meta_proteina_min),
    meta_proteina_max: ouVazio(dados.meta_proteina_max),
    meta_preparacao_min: ouVazio(dados.meta_preparacao_min),
    meta_preparacao_max: ouVazio(dados.meta_preparacao_max),
    materia_prima_custo_id: dados.materia_prima_custo_id || "",
    custo_kg_proteina: dados.custo_kg_proteina || 0,
    custo_perda_proteina: dados.custo_perda_proteina || 0,
    hora_inicio: dados.hora_inicio || "",
    hora_fim: dados.hora_fim || "",
    tempo_total_minutos: dados.tempo_total_minutos || 0,
    temperatura_media: ouVazio(dados.temperatura_media),
  });
  return Object.assign({ id: id }, dados);
}

function addRecheioFrio_(ss, dados) {
  const id = proximoId_("recheio");
  inserirLinha_(ss, "RecheiosFrios", {
    id: id,
    nome_recheio: dados.nome_recheio || "",
    data: dados.data || "",
    numero_producao: dados.numero_producao || "",
    itens_json: JSON.stringify(dados.itens || []),
    peso_bruto_total: dados.peso_bruto_total || 0,
    perda_total_kg: dados.perda_total_kg || 0,
    peso_liquido_total_kg: dados.peso_liquido_total_kg || 0,
    perda_percentual_total: dados.perda_percentual_total || 0,
  });
  return Object.assign({ id: id }, dados);
}

// ── PRODUTOS (SKUs) ────────────────────────────────────────────────
// Usado tanto pela tela de Receitas (SKU vinculado a uma receita) quanto
// pela tela de Produtos (composição a partir de uma ou mais receitas) — os
// dois fluxos do frontend chamam as mesmas ações ("addProduto",
// "updateProduto", "deleteProduto"), só mudando se receita_id vem
// preenchido ou vazio.

function addProduto_(ss, dados) {
  const id = proximoId_("produto");
  inserirLinha_(ss, "Produtos", {
    id: id,
    receita_id: dados.receita_id || "",
    codigo: dados.codigo || "",
    nome_produto: dados.nome_produto || "",
    tipo_embalagem: dados.tipo_embalagem || "PCT",
    codigo_barras: dados.codigo_barras || "",
    ncm: dados.ncm || "",
    cest: dados.cest || "",
    departamento: dados.departamento || "",
    secao: dados.secao || "",
    categoria: dados.categoria || "",
    peso_liquido: dados.peso_liquido || 0,
    peso_bruto: dados.peso_bruto || 0,
    validade_dias: dados.validade_dias || "",
    status: dados.status || "rascunho",
    rota_producao: dados.rota_producao || "",
  });
  return Object.assign({ id: id }, dados);
}

function updateProduto_(ss, dados) {
  const id = dados.id;
  const resto = {};
  Object.keys(dados).forEach((chave) => {
    if (chave !== "id") resto[chave] = dados[chave];
  });
  atualizarCamposPorId_(ss, "Produtos", id, resto);
  return Object.assign({ id: id }, resto);
}

function deleteProduto_(ss, dados) {
  excluirLinhaPorId_(ss, "Produtos", dados.id);
  excluirLinhasPorCampo_(ss, "ProdutoComposicao", "produto_id", dados.id);
  excluirLinhasPorCampo_(ss, "ProdutoMOD", "produto_id", dados.id);
  return { id: dados.id };
}

function updateComposicaoProduto_(ss, dados) {
  const produtoId = dados.produto_id;
  substituirFilhos_(ss, "ProdutoComposicao", "produto_id", produtoId, dados.itens, (item) => ({
    id: proximoId_("comp"),
    produto_id: produtoId,
    receita_id: item.receita_id || "",
    quantidade: item.quantidade || 0,
    observacao: item.observacao || "",
  }));
  return { produto_id: produtoId, itens: dados.itens };
}

function updateModProduto_(ss, dados) {
  const produtoId = dados.produto_id;
  substituirFilhos_(ss, "ProdutoMOD", "produto_id", produtoId, dados.itens, (item) => ({
    id: proximoId_("modproduto"),
    produto_id: produtoId,
    setor_id: item.setor_id || "",
    funcao_id: item.funcao_id || "",
    quantidade_pessoas: item.quantidade_pessoas || 0,
    tempo_minutos: item.tempo_minutos || 0,
  }));
  return { produto_id: produtoId };
}

function salvarInfoNutricional_(ss, dados) {
  const infoNutricional = {
    apelido: dados.apelido || "",
    ingredientes_texto: dados.ingredientes_texto || "",
    alergicos_texto: dados.alergicos_texto || "",
    porcao_gramas: dados.porcao_gramas || 0,
    medida_caseira: dados.medida_caseira || "",
  };
  atualizarCamposPorId_(ss, "Produtos", dados.produto_id, {
    info_nutricional_json: JSON.stringify(infoNutricional),
    tabela_nutricional_json: JSON.stringify(dados.tabela || []),
  });
  return { produto_id: dados.produto_id, info_nutricional: infoNutricional, tabela_nutricional: dados.tabela || [] };
}

// ── SETORES ────────────────────────────────────────────────────────

function addSetor_(ss, dados) {
  const id = proximoId_("setor");
  inserirLinha_(ss, "Setores", { id: id, nome: dados.nome || "", status: dados.status || "ativo" });
  return { id: id, nome: dados.nome || "", status: dados.status || "ativo" };
}

function updateSetor_(ss, dados) {
  const id = dados.id;
  const resto = { nome: dados.nome, status: dados.status };
  atualizarCamposPorId_(ss, "Setores", id, resto);
  return Object.assign({ id: id }, resto);
}

function deleteSetor_(ss, dados) {
  excluirLinhaPorId_(ss, "Setores", dados.id);
  return { id: dados.id };
}

// ── FUNCIONÁRIOS ────────────────────────────────────────────────────

function addFuncionario_(ss, dados) {
  const id = proximoId_("func");
  const custoHora = calcularCustoHora_(dados.salario_mensal, dados.carga_horaria_semanal);
  inserirLinha_(ss, "Funcionarios", {
    id: id,
    funcao: dados.funcao || "",
    salario_mensal: dados.salario_mensal || 0,
    carga_horaria_semanal: dados.carga_horaria_semanal || 0,
    quantidade_funcionarios: dados.quantidade_funcionarios || 1,
    status: dados.status || "ativo",
    custo_hora: custoHora,
  });
  return Object.assign({ id: id, custo_hora: custoHora }, dados);
}

function updateFuncionario_(ss, dados) {
  const id = dados.id;
  const custoHora = calcularCustoHora_(dados.salario_mensal, dados.carga_horaria_semanal);
  const resto = {
    funcao: dados.funcao,
    salario_mensal: dados.salario_mensal,
    carga_horaria_semanal: dados.carga_horaria_semanal,
    quantidade_funcionarios: dados.quantidade_funcionarios,
    status: dados.status,
    custo_hora: custoHora,
  };
  atualizarCamposPorId_(ss, "Funcionarios", id, resto);
  return Object.assign({ id: id }, resto);
}

function deleteFuncionario_(ss, dados) {
  excluirLinhaPorId_(ss, "Funcionarios", dados.id);
  return { id: dados.id };
}
