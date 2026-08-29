import { createClient } from '@supabase/supabase-js';

// Essas duas variáveis vêm do seu projeto Supabase:
// Settings > API > Project URL / anon public key
// No Netlify, configure em Site settings > Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);