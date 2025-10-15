import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  // If user is authenticated, redirect to dashboard
  if (locals.user) {
    throw redirect(302, '/dashboard');
  }
  
  return {};
}
