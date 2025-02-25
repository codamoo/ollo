'use client';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a proxy that shows a user-friendly error
    return new Proxy({} as any, {
      get() {
        throw new Error('Please click the "Connect to Supabase" button in the top right to set up your database connection.');
      },
    });
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
    },
  });
}

export const supabase = getSupabaseClient();