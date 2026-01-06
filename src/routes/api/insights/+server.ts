import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  // Simplified insights - just return empty for now
  return json({ insights: [] });
};
