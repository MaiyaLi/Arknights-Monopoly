import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nvzwwjutrvygriiqmtqa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52end3anV0cnZ5Z3JpaXFtdHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTI2NTEsImV4cCI6MjA5MTQyODY1MX0.8qfXj_UqnGIPa3GkVoySCyhS49m84teAzLFkEkCO1IM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
