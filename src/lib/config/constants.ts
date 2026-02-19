// Rate Limiting
export const RATE_LIMIT = {
  STANDARD: {
    REQUESTS: 10,
    WINDOW: "10 s",
    WINDOW_MS: 10000,
  },
  AI: {
    REQUESTS: 3,
    WINDOW: "60 s",
    WINDOW_MS: 60000,
  },
} as const;

// API Timeouts
export const TIMEOUT = {
  DELETE: 10000, // 10s
  CREATE_UPDATE: 15000, // 15s
  AI_GENERATE: 30000, // 30s
} as const;

// Data Validation
export const VALIDATION = {
  MAX_AMOUNT: 999999999999,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NAME_LENGTH: 100,
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  MONTH_REGEX: /^\d{4}-\d{2}$/,
  UUID_REGEX:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// Cache TTL
export const CACHE_TTL = {
  IDEMPOTENCY: 24 * 60 * 60, // 24 hours in seconds
  AI_SUMMARY: 7 * 24 * 60 * 60, // 7 days in seconds
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;
