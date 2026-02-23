import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

// Create a singleton Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      supabaseUrl,
      publicAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    );
  }
  return supabaseClient;
}
