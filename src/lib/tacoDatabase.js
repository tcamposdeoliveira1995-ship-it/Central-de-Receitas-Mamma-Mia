// Base de dados nutricional de hortifruti (Tabela TACO — Tabela Brasileira
// de Composição de Alimentos, NEPA/UNICAMP), usada para preencher
// automaticamente a nutricional de matérias-primas in natura (verduras,
// legumes, temperos) quando a fonte escolhida é "Tabela TACO", em vez do
// rótulo de um fornecedor específico.
//
// Valores por 100g de parte crua/in natura, conferidos na Tabela TACO
// (4ª edição, NEPA/UNICAMP) em agosto/2026. "Gorduras saturadas" não consta
// nas fontes consultadas para a maioria dos itens — ficou em branco, não
// estimado, para não arriscar declarar valor errado.
//
// Se faltar algum ingrediente que a Mamma Mia usa, é só adicionar um novo
// item aqui seguindo o mesmo formato.

export const tacoDatabase = [
  {
    id: "taco-tomate",
    nome: "Tomate, cru",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 15,
      carboidratos_g: 3.1,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.1,
      gorduras_totais_g: 0.2,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 1.2,
      sodio_mg: 1,
    },
  },
  {
    id: "taco-cebola",
    nome: "Cebola, crua",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 39,
      carboidratos_g: 8.9,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.7,
      gorduras_totais_g: 0.1,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 2.2,
      sodio_mg: 1,
    },
  },
  {
    id: "taco-alho",
    nome: "Alho, cru",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 113,
      carboidratos_g: 23.9,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 7.0,
      gorduras_totais_g: 0.2,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 4.3,
      sodio_mg: 5,
    },
  },
  {
    id: "taco-alface-lisa",
    nome: "Alface, lisa, crua",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 14,
      carboidratos_g: 2.4,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.7,
      gorduras_totais_g: 0.1,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 2.3,
      sodio_mg: 4,
    },
  },
  {
    id: "taco-cenoura",
    nome: "Cenoura, crua",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 34,
      carboidratos_g: 7.7,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.3,
      gorduras_totais_g: 0.2,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 3.2,
      sodio_mg: 3,
    },
  },
  {
    id: "taco-brocolis",
    nome: "Brócolis, cru",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 25,
      carboidratos_g: 4.0,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 3.6,
      gorduras_totais_g: 0.3,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 2.9,
      sodio_mg: 3,
    },
  },
  {
    id: "taco-batata-inglesa",
    nome: "Batata, inglesa, crua",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 64,
      carboidratos_g: 14.7,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.8,
      gorduras_totais_g: 0.1,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 1.2,
      sodio_mg: 4,
    },
  },
  {
    id: "taco-repolho-branco",
    nome: "Repolho, branco, cru",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 17,
      carboidratos_g: 3.9,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 0.9,
      gorduras_totais_g: 0.1,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 1.9,
      sodio_mg: 2,
    },
  },
  {
    id: "taco-pimentao-verde",
    nome: "Pimentão, verde, cru",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 21,
      carboidratos_g: 4.9,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.1,
      gorduras_totais_g: 0.2,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 2.6,
      sodio_mg: 0,
    },
  },
  {
    id: "taco-espinafre",
    nome: "Espinafre, cru",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 16,
      carboidratos_g: 2.6,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 2.0,
      gorduras_totais_g: 0.2,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 2.1,
      sodio_mg: 23,
    },
  },
  {
    id: "taco-abobrinha",
    nome: "Abobrinha, italiana, crua",
    porcao_referencia_gramas: 100,
    valores: {
      energia_kcal: 19,
      carboidratos_g: 4.3,
      acucares_totais_g: "",
      acucares_adicionados_g: 0,
      proteinas_g: 1.1,
      gorduras_totais_g: 0.1,
      gorduras_saturadas_g: "",
      gorduras_trans_g: 0,
      fibra_alimentar_g: 1.4,
      sodio_mg: 0,
    },
  },
];

// Valores Diários de Referência (RDC 429/2020, Anvisa — dieta de 2.000kcal),
// usados para calcular o %VD de cada linha da tabela nutricional. Nutrientes
// sem VD estabelecido pela Anvisa (açúcares totais/adicionados, gorduras
// trans) ficam de fora — o rótulo oficial mostraria "**" nesses casos.
const VD_REFERENCIA_ANVISA = {
  "Valor energético (kcal)": 2000,
  "Carboidratos (g)": 300,
  "Proteínas (g)": 75,
  "Gorduras totais (g)": 55,
  "Gorduras saturadas (g)": 22,
  "Fibra alimentar (g)": 25,
  "Sódio (mg)": 2000,
};

function calcularVD(nutriente, valor) {
  const referencia = VD_REFERENCIA_ANVISA[nutriente];
  if (!referencia || valor === "" || valor === null || valor === undefined) return "";
  const percentual = (Number(valor) / referencia) * 100;
  if (!isFinite(percentual)) return "";
  return String(Math.round(percentual * 10) / 10);
}

// Converte um item da tacoDatabase para o formato de linhas usado no
// formulário de Nutricional do Fornecedor (mesmas 10 linhas padrão,
// já com %VD calculado pela referência oficial da Anvisa).
export function tabelaNutricionalDoItemTaco(item) {
  const v = item.valores;
  const linhas = [
    ["Valor energético (kcal)", v.energia_kcal],
    ["Carboidratos (g)", v.carboidratos_g],
    ["Açúcares totais (g)", v.acucares_totais_g],
    ["Açúcares adicionados (g)", v.acucares_adicionados_g],
    ["Proteínas (g)", v.proteinas_g],
    ["Gorduras totais (g)", v.gorduras_totais_g],
    ["Gorduras saturadas (g)", v.gorduras_saturadas_g],
    ["Gorduras trans (g)", v.gorduras_trans_g],
    ["Fibra alimentar (g)", v.fibra_alimentar_g],
    ["Sódio (mg)", v.sodio_mg],
  ];
  return linhas.map(([nutriente, valor]) => ({
    nutriente,
    qtd_comparativa: valor,
    porcao: valor,
    vd_percentual: calcularVD(nutriente, valor),
  }));
}
