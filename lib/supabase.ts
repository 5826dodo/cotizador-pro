import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// El error suele dar porque falta la palabra 'export' aquí abajo:
export const supabase = createClient(supabaseUrl, supabaseKey);
