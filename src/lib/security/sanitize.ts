import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

// Sanitize HTML/XSS
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Transaction validation schema
export const transactionSchema = z.object({
  txn_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().optional(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().int().max(999999999999),
  description: z.string().max(500).optional(),
});

// AI summary validation
export const aiSummarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

// Profile update validation
export const profileSchema = z.object({
  full_name: z.string().max(100).optional(),
  monthly_income: z.number().int().nonnegative().max(999999999999).optional(),
  savings_target: z.number().int().nonnegative().max(999999999999).optional(),
});

export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const validated = schema.parse(data);
  
  // Sanitize string fields
  if (typeof validated === "object" && validated !== null) {
    for (const [key, value] of Object.entries(validated)) {
      if (typeof value === "string") {
        (validated as any)[key] = sanitizeHTML(value);
      }
    }
  }
  
  return validated;
}
