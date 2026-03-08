import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

// AGGIUNGI QUESTI PER IL DEBUG:
console.log("URL caricato:", url);
console.log("Key caricata:", key ? "Presente (nascosta)" : "MANCANTE");

export const supabase = createClient(url || '', key || '');