// src/utils.ts
import { UUIDSchema } from './oqseValidation';

export type UUID = string;

/**
 * Validates whether a given string is a valid UUID (v4 or v7).
 */
export function isValidUUID(id: string): boolean {
  // Pod kapotou používáme náš jednotný zdroj pravdy - Zod
  return UUIDSchema.safeParse(id).success;
}

/**
 * Generates a new UUIDv7 (time-ordered).
 * Note: Currently uses crypto.randomUUID() as fallback.
 */
export function generateUUID(): UUID {
  // TODO: Implement proper UUIDv7 generation as per spec
  return crypto.randomUUID();
}