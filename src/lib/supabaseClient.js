import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Enquanto as variáveis de ambiente não são configuradas (veja .env.example),
// isDemoMode fica true e as telas usam os dados de exemplo em src/lib/seed.js.
export const isDemoMode = !url || !key;

export const supabase = isDemoMode
  ? null
  : createClient(url, key);
