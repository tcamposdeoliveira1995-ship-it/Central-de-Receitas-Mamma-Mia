// Cliente que fala com o Apps Script Web App publicado a partir de
// mamma-formula-appsscript/Code.gs. Enquanto a variável de ambiente não é
// configurada, isDemoMode fica true e as telas usam src/lib/seed.js.

const API_URL = process.env.NEXT_PUBLIC_SHEETS_API_URL;

export const isDemoMode = !API_URL;

export async function fetchAll() {
  const res = await fetch(API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar dados da planilha: " + res.status);
  return res.json();
}

// Content-Type "text/plain" de propósito: evita o preflight CORS (OPTIONS)
// que o Apps Script não trata. O Code.gs lê o corpo bruto com JSON.parse
// independente do content-type declarado.
export async function postAction(action, payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error("Falha ao enviar dados para a planilha: " + res.status);
  const data = await res.json();
  if (data && data.erro) throw new Error(data.erro);
  return data;
}
