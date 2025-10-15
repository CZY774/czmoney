import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function load({ cookies, url }) {
  const accessToken = cookies.get('sb-access-token');
  
  let user = null;
  if (accessToken) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);
      if (authUser) {
        user = {
          id: authUser.id,
          email: authUser.email
        };
      }
    } catch (error) {
      // Invalid token, clear cookies
      cookies.delete('sb-access-token', { path: '/' });
      cookies.delete('sb-refresh-token', { path: '/' });
    }
  }

  return {
    user,
    url: url.pathname
  };
}
