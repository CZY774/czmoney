import { z } from "zod";
import { VALIDATION } from "$lib/config/constants";

// Server-side: Simple but effective sanitization
export function sanitizeHTML(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/data:/gi, "")
    .trim();
}

// Transaction validation schema
export const transactionSchema = z.object({
  txn_date: z.string().regex(VALIDATION.DATE_REGEX),
  category_id: z.string().uuid().or(z.literal("")).optional(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().int().max(VALIDATION.MAX_AMOUNT),
  description: z.string().max(VALIDATION.MAX_DESCRIPTION_LENGTH).optional(),
});

// AI summary validation
export const aiSummarySchema = z.object({
  month: z.string().regex(VALIDATION.MONTH_REGEX),
});

// Profile update validation
export const profileSchema = z.object({
  full_name: z.string().max(VALIDATION.MAX_NAME_LENGTH).optional(),
  monthly_income: z
    .number()
    .int()
    .nonnegative()
    .max(VALIDATION.MAX_AMOUNT)
    .optional(),
  savings_target: z
    .number()
    .int()
    .nonnegative()
    .max(VALIDATION.MAX_AMOUNT)
    .optional(),
});

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  const validated = schema.parse(data);

  // Sanitize string fields
  if (typeof validated === "object" && validated !== null) {
    for (const [key, value] of Object.entries(validated)) {
      if (typeof value === "string") {
        (validated as Record<string, unknown>)[key] = sanitizeHTML(value);
      }
    }
  }

  return validated;
}
