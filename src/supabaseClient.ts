// @ts-ignore
import { createClient } from '@supabase/supabase-js';

// Usiamo un controllo per evitare che l'app crashi se le variabili mancano
const url = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(url, key);