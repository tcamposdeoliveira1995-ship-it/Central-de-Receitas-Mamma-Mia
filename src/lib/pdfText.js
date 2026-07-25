"use client";

// Extrai o texto de um PDF no navegador (sem OCR, sem IA — só lê o texto
// que já existe no PDF, como o Canva exporta). Reconstrói linhas a partir
// da posição de cada trecho de texto: agrupa por altura (Y) e ordena por
// posição horizontal (X), inserindo TAB quando o espaço entre dois trechos
// é grande o suficiente pra sugerir uma quebra de coluna de tabela.

let pdfjsLibPromise = null;

async function carregarPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/build/pdf.mjs").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
      return mod;
    });
  }
  return pdfjsLibPromise;
}

export async function extrairTextoPDF(file) {
  const pdfjsLib = await carregarPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const todasAsLinhas = [];
  for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina++) {
    const pagina = await pdf.getPage(numeroPagina);
    const conteudo = await pagina.getTextContent();
    todasAsLinhas.push(...reconstruirLinhas(conteudo.items));
  }
  return todasAsLinhas.join("\n");
}

function reconstruirLinhas(items) {
  const TOLERANCIA_Y = 3; // pt — trechos com Y parecido são considerados a mesma linha
  const GAP_COLUNA = 18; // pt — espaço horizontal a partir do qual viramos coluna (TAB)

  const linhas = []; // [{ y, itens: [...] }]
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const y = item.transform[5];
    let linha = linhas.find((l) => Math.abs(l.y - y) <= TOLERANCIA_Y);
    if (!linha) {
      linha = { y, itens: [] };
      linhas.push(linha);
    }
    linha.itens.push(item);
  }

  linhas.sort((a, b) => b.y - a.y); // topo para baixo

  return linhas.map((linha) => {
    const itensOrdenados = linha.itens.sort((a, b) => a.transform[4] - b.transform[4]);
    let texto = "";
    let fimAnterior = null;
    for (const item of itensOrdenados) {
      const inicio = item.transform[4];
      if (fimAnterior !== null) {
        const espaco = inicio - fimAnterior;
        texto += espaco > GAP_COLUNA ? "\t" : espaco > 1 ? " " : "";
      }
      texto += item.str;
      fimAnterior = inicio + (item.width || item.str.length * 5);
    }
    return texto.trim();
  }).filter(Boolean);
}

export function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result;
      // resultado vem como "data:application/pdf;base64,XXXX" — pega só o base64
      const base64 = String(resultado).split(",")[1] || "";
      resolve(base64);
    };
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    leitor.readAsDataURL(file);
  });
}
