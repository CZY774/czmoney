import { createClient } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function load({ cookies }) {
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken) {
    throw redirect(302, '/auth/login');
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      throw redirect(302, '/auth/login');
    }

    return {
      user: {
        id: user.id,
        email: user.email
      }
    };
  } catch (error) {
    throw redirect(302, '/auth/login');
  }
}
