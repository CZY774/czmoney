import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const version = process.env.npm_package_version || "1.1.7";
  const buildTime = new Date().toISOString();

  return json({
    version,
    buildTime,
  });
};
