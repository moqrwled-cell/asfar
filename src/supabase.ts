import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ckmixtcxuoxzfnoktlpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbWl4dGN4dW94emZub2t0bHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTA3NTgsImV4cCI6MjA5ODE2Njc1OH0.0xbKR8KLG2uj74BjieK6UwqPKkOfmW-4R6_iNlNLNWg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
