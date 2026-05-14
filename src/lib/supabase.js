import { createClient } from '@supabase/supabase-js';

// === SUPABASE DATABASE ONLY ===
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

// Mantenemos al cliente únicamente para interactuar con las tablas (CRUD)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
