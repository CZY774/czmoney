export const VALIDATION = {
  AMOUNT: {
    MIN: 0.01,
    MAX: 999_999_999.99,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  DATE: {
    MIN_YEAR: 2000,
    MAX_YEAR: new Date().getFullYear() + 1,
  },
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const RATE_LIMITS = {
  DEFAULT: {
    REQUESTS: 10,
    WINDOW: "10 s",
  },
  AI: {
    REQUESTS: 3,
    WINDOW: "1 m",
  },
};

export const TIMEOUTS = {
  DELETE: 10000,
  CREATE_UPDATE: 15000,
  AI_GENERATE: 30000,
};

export const CACHE_TTL = {
  CATEGORIES: 3600,
  PROFILES: 3600,
  IDEMPOTENCY: 86400,
};
