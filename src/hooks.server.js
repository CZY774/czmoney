import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handle({ event, resolve }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const token = event.cookies.get('sb-access-token');
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    event.locals.user = user;
  }
  
  return resolve(event);
}
