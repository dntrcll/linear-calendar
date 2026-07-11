import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'timeline-auth',
    flowType: 'pkce',
    // Override the default navigatorLock. Its AbortController throws
    // "AbortError: signal is aborted without reason" when session-lock
    // acquisition is contended (concurrent getSession / auth-state checks).
    // Running the callback directly avoids the abort; localStorage still
    // persists the session across tabs.
    lock: async (_name, _acquireTimeout, fn) => fn()
  }
});