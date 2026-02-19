import { z } from "zod";
import xss from "xss";
import { VALIDATION } from "$lib/config/constants";

// Proper XSS sanitization using xss library (serverless-friendly)
export function sanitizeHTML(input: string): string {
  return xss(input, {
    whiteList: {}, // Strip all HTML tags
    stripIgnoreTag: true, // Remove unknown tags
    stripIgnoreTagBody: ["script"], // Remove script content
  }).trim();
}

// Transaction validation schema with strict limits
export const transactionSchema = z.object({
  txn_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      return (
        year >= VALIDATION.DATE.MIN_YEAR && year <= VALIDATION.DATE.MAX_YEAR
      );
    }, "Date must be between 2000 and next year"),
  category_id: z.string().uuid().or(z.literal("")).optional(),
  type: z.enum(["income", "expense"]),
  amount: z
    .number()
    .min(VALIDATION.AMOUNT.MIN, "Amount must be at least 0.01")
    .max(VALIDATION.AMOUNT.MAX, "Amount exceeds maximum limit"),
  description: z
    .string()
    .max(VALIDATION.DESCRIPTION.MAX_LENGTH, "Description too long")
    .optional(),
});

// AI summary validation
export const aiSummarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  lookback: z.number().int().min(1).max(12).optional(),
  refresh: z.boolean().optional(),
});

// Profile update validation
export const profileSchema = z.object({
  full_name: z.string().max(100).optional(),
  monthly_income: z
    .number()
    .int()
    .nonnegative()
    .max(VALIDATION.AMOUNT.MAX)
    .optional(),
  savings_target: z
    .number()
    .int()
    .nonnegative()
    .max(VALIDATION.AMOUNT.MAX)
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
