import { json } from "@sveltejs/kit";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown, context?: string) {
  // Log to console (in production, send to Sentry/LogRocket)
  console.error(`[ERROR${context ? ` - ${context}` : ""}]:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Return user-friendly error response
  if (error instanceof AppError) {
    return json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  if (error instanceof Error) {
    // Don't expose internal errors to users
    if (error.name === "AbortError") {
      return json({ error: "Request timeout" }, { status: 408 });
    }

    if (error.message.includes("JWT") || error.message.includes("token")) {
      return json({ error: "Authentication failed" }, { status: 401 });
    }

    if (
      error.message.includes("duplicate") ||
      error.message.includes("unique")
    ) {
      return json({ error: "Resource already exists" }, { status: 409 });
    }
  }

  // Generic error
  return json({ error: "An unexpected error occurred" }, { status: 500 });
}

export function logError(error: unknown, context?: string) {
  console.error(`[ERROR${context ? ` - ${context}` : ""}]:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}
