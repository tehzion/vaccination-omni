
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Key is missing. Check your .env file.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

// Helper type for our Database if we want to manually type some query returns
// In a real scenario, we'd use Supabase CLI to generate these types
export type Tables = {
    settings: any;
    projects: any;
    check_ins: any;
    client_accounts: any;
    inventory: any;
};
