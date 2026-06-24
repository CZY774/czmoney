import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const version = process.env.npm_package_version || "1.1.7";
const buildTime =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  version;

export const GET: RequestHandler = async () => {
  return json({
    version,
    buildTime,
  });
};
